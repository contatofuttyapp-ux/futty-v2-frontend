// Futty v2.0 — O ritmo do trabalho em segundo plano (VELOCIDADE 8, 16-set).
//
// O PROBLEMA, medido: tudo o que o app faz "quando o aparelho estiver parado"
// usava requestIdleCallback. O Safari NÃO TEM requestIdleCallback — nem o do
// iPhone, nem o WebView do app da loja. Então caía sempre no setTimeout de
// reserva (1500 ms no pré-aquecimento de dados, 1200 ms no dos chunks das abas),
// que não é "parado": é "daqui a um bocado", olhe o aparelho para o que estiver
// a olhar. E daqui a um bocado é exactamente quando a pessoa está a tocar na
// tela pela primeira vez. Daí o "às vezes engasga".
//
// "Parado de verdade" aqui é uma coisa só: a 1ª tela já pintou E passaram N
// segundos sem um toque, uma rolagem ou uma tecla. Quem tem essa informação é o
// lib/diagnostico.js (é ele que marca a pintura e que já ouve os gestos para
// atribuir as travadas) — aqui só se lê.
//
// E há um caso especial: a PRIMEIRA abertura de uma versão nova. É a única em
// que o WebKit não tem cache de bytecode nenhum e tem de compilar tudo outra
// vez; é a abertura de que o Pedro se queixa. Nessa, tudo o que é adiantamento
// espera mais 5 s. A chave de versão é o nome do ficheiro de entrada, que leva
// o hash do conteúdo — muda sozinho a cada build, sem ninguém ter de se lembrar
// de bumpar nada.
import { aoGesto, aposPrimeiraPintura, ultimoGestoEm } from './diagnostico';

// Quanto tempo sem gesto conta como "parado". 3 s é o pedido do dono.
const PARADO_MS = 3000;
// Depois de um toque no meio do trabalho, pausa antes de continuar.
const PAUSA_APOS_GESTO_MS = 1500;
// O que a 1ª abertura de uma versão nova espera A MAIS.
const EXTRA_VERSAO_NOVA_MS = 5000;
const CHAVE_VERSAO = 'futty:versao-vista';

/** Nome do ficheiro de entrada (leva o hash do build). Serve de chave de versão. */
function versaoDoBuild() {
  if (typeof document === 'undefined') return 'sem-documento';
  const src = document.querySelector('script[type="module"][src]')?.getAttribute('src');
  // Em dev o src é /src/main.jsx (sem hash) — aí não há "versão nova" que
  // interesse, e tudo bem: o extra é para o app da loja.
  return src ? src.split('/').pop() : 'sem-entrada';
}

let ehVersaoNova = null;

/**
 * É a 1ª vez que este aparelho abre ESTE build? Lê e grava uma vez por sessão.
 * Falha de storage (modo privado) → trata como versão nova: esperar a mais é o
 * lado seguro do engano.
 */
export function primeiraAberturaDaVersao() {
  if (ehVersaoNova != null) return ehVersaoNova;
  const agora = versaoDoBuild();
  try {
    ehVersaoNova = localStorage.getItem(CHAVE_VERSAO) !== agora;
    localStorage.setItem(CHAVE_VERSAO, agora);
  } catch {
    ehVersaoNova = true;
  }
  return ehVersaoNova;
}

/**
 * Corre `fn` quando o aparelho estiver parado de verdade: 1ª pintura feita e
 * `paradoMs` sem toque/rolagem/tecla. Cada gesto REARMA a espera — se a pessoa
 * está a usar o app, isto simplesmente não corre, e é assim que tem de ser.
 *
 * @param {() => void} fn
 * @param {{ paradoMs?: number, contarVersaoNova?: boolean, aoAgendar?: (esperaMs: number) => void }} [opts]
 *   contarVersaoNova: na 1ª abertura de um build novo, espera mais 5 s.
 *   aoAgendar: recebe a espera calculada. Serve ao diagnóstico, para o relatório
 *   saber distinguir "não correu" de "está à espera, e isso é o esperado".
 * @returns {() => void} cancela o agendamento.
 */
export function quandoParado(fn, {
  paradoMs = PARADO_MS, contarVersaoNova = true, aoAgendar = null, esperaMaximaMs = null,
} = {}) {
  if (typeof window === 'undefined') {
    fn();
    return () => {};
  }
  let cancelado = false;
  let temporizador = null;
  let prazoMaximo = null;
  let largarGestos = null;

  const espera = paradoMs + (contarVersaoNova && primeiraAberturaDaVersao() ? EXTRA_VERSAO_NOVA_MS : 0);
  aoAgendar?.(espera);

  const cancelar = () => {
    cancelado = true;
    if (temporizador != null) window.clearTimeout(temporizador);
    if (prazoMaximo != null) window.clearTimeout(prazoMaximo);
    if (largarGestos) largarGestos();
  };

  const correr = () => {
    if (cancelado) return;
    cancelar();
    fn();
  };

  const armar = () => {
    if (cancelado) return;
    if (temporizador != null) window.clearTimeout(temporizador);
    temporizador = window.setTimeout(correr, espera);
  };

  aposPrimeiraPintura(() => {
    if (cancelado) return;
    largarGestos = aoGesto(armar); // cada gesto rearma a contagem do zero
    armar();
    // VELOCIDADE 9 (23-set) — o TETO.
    //
    // "Cada gesto rearma do zero" tinha um buraco que só um relatório de uso
    // real mostrava: quem está mesmo a usar o app nunca fica 3 s quieto, e
    // então isto NUNCA corria. O relatório do build 28 apanhou-o em flagrante —
    // `preaquecimento: "adiado (toques)"`, previsto para os 28,7 s de sessão,
    // com a pessoa a trocar de tela nove vezes em vinte segundos. Resultado: as
    // quatro abas pagavam o chunk no toque ("esperou: código", ~300 ms cada) e
    // os dados vinham todos do zero.
    //
    // Agora há um prazo: passado `esperaMaximaMs` desde a primeira pintura,
    // corre à mesma. O trabalho em si continua a ceder a vez entre passos
    // (`esperarSeOcupado`), por isso não volta o problema que a Velocidade 8
    // arrumou — cinco chunks em cima do primeiro toque. É a diferença entre
    // "só quando estiver parado" e "assim que der, sem atropelar".
    if (esperaMaximaMs != null) prazoMaximo = window.setTimeout(correr, esperaMaximaMs);
  });

  return cancelar;
}

// ─── Animações param quando ninguém está a ver (VELOCIDADE 8) ────────────────
// O fundo aurora (4 blobs com filter: blur(161px), a cada um 40-60% da tela, a
// derivar e a rodar para sempre) está montado no Layout, ou seja em TODAS as
// rotas. É a maior conta de desenho contínua do app — e continuava a correr com
// o app em segundo plano ou com a tela bloqueada, a gastar bateria a desenhar
// para ninguém.
//
// O CSS não sabe o que é document.hidden, por isso marca-se o <html> e o
// index.css trata do resto (`html[data-oculto]`). Para as DECORATIVAS, não só
// o fundo: escondido é escondido, nada do que pare pode mudar de aspeto.
//
// EXCEÇÃO (hotfix 23-set, tela preta após login com Google no Chrome) — as
// animações de ENTRADA DE CONTEÚDO (`.page-transition` e as outras listadas em
// index.css) já saem de baixo da pausa geral por seletor: `html[data-oculto]`
// nem chega a tocar-lhes. Não há no app um sítio a depender de `animationend`
// para AVANÇAR ESTADO (isso continua verdade) — mas há sítios cuja
// VISIBILIDADE dependia de a animação correr até ao fim, e essa é a diferença
// que este hotfix trata.
let vigiaLigada = false;

// As mesmas classes excluídas da pausa em index.css — mantidas aqui para a
// rede de segurança abaixo, não para decidir a pausa (isso é só CSS).
const SELETORES_ENTRADA_DE_CONTEUDO = '.page-transition, .inicio-reveal, .page-reveal, .fig-card-enter, .perfil-tile';

/** Liga a vigia de visibilidade. Chamada uma vez, no arranque. */
export function pararAnimacoesForaDeVista() {
  if (vigiaLigada || typeof document === 'undefined') return;
  vigiaLigada = true;
  const aplicar = () => {
    if (document.hidden) {
      document.documentElement.setAttribute('data-oculto', '');
      return;
    }
    document.documentElement.removeAttribute('data-oculto');
    // REDE DE SEGURANÇA (hotfix 23-set) — a exclusão em index.css já impede
    // estas animações de nascerem pausadas; isto é o cinto por cima do fio: se
    // por qualquer motivo uma ficou a meio (outra aba a pausar globalmente,
    // uma corrida rara), `.finish()` salta-a para o fim (opacity 1, o que a
    // animação tiver definido como estado final) assim que a página volta a
    // ficar visível — em vez de confiar que ela retoma sozinha.
    document.querySelectorAll(SELETORES_ENTRADA_DE_CONTEUDO).forEach((el) => {
      try {
        el.getAnimations().forEach((a) => a.finish());
      } catch {
        /* rede de segurança: um elemento a falhar não pode travar os outros */
      }
    });
  };
  document.addEventListener('visibilitychange', aplicar);
  aplicar();
}

/** Devolve a thread ao browser entre dois passos. Um setTimeout(0) é um quadro. */
export function respirar() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

/**
 * Se a pessoa mexeu na tela agora mesmo, espera. É o travão que se põe ENTRE os
 * passos de um trabalho longo: o `quandoParado` só decide quando começar, e um
 * aquecimento de 20 imagens dura bem mais do que o toque seguinte demora a
 * chegar.
 */
export async function esperarSeOcupado(pausaMs = PAUSA_APOS_GESTO_MS) {
  if (typeof performance === 'undefined') return;
  // Pode haver toques encavalitados — espera até se passar a pausa inteira
  // desde o ÚLTIMO deles.
  for (let voltas = 0; voltas < 60; voltas += 1) {
    const desde = performance.now() - ultimoGestoEm();
    if (desde >= pausaMs) return;
    await new Promise((resolve) => setTimeout(resolve, pausaMs - desde));
  }
}
