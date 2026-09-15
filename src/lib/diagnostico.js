// Futty v2.0 — Caixa-preta do app (VELOCIDADE 4).
//
// Existe porque "está lento" não é um dado: sem números, arranjar velocidade é
// adivinhar. Isto regista, EM MEMÓRIA e só nesta sessão, o que cada chamada e
// cada navegação custaram — e separa as duas perguntas que se confundem sempre:
//
//   motor  — quanto o servidor levou a responder (header Server-Timing, posto
//            pelo backend em TODO pedido: `app;dur=…`). Se for grande, o
//            problema é uma consulta ao banco, não a distância.
//   rede   — total menos motor. É o que a distância cobra: Lisboa→São Paulo
//            são ~250 ms de ida e volta, e nenhum código nosso muda isso.
//
// Nada disto sai do aparelho sozinho: só quando a pessoa toca em "Enviar
// relatório" na tela de Diagnóstico. Nunca guarda corpo de pedido nem token —
// só rota, estado e tempos.
import { Capacitor } from '@capacitor/core';

const MAX = 50;

const chamadas = [];
const navegacoes = [];
const falhas = [];

// Navegação em curso: o relógio parte na mudança de rota (o "toque") e é lida
// pelas chamadas que partem a seguir e pela primeira pintura.
let navegacaoAberta = null;
// Depois disto, uma chamada já não pertence à navegação que a antecedeu (é
// polling, uma ação do utilizador, uma revalidação em fundo).
const JANELA_DA_NAVEGACAO_MS = 10000;

let infoApp = null; // { version, build } — preenchido uma vez, só no nativo.

function guardar(lista, registo) {
  lista.push(registo);
  if (lista.length > MAX) lista.shift();
}

/**
 * Lê o Server-Timing e devolve os tempos em ms. O backend manda `app;dur=12.3`
 * e, quando a chamada passa pela função da Cloudflare, vem também
 * `edge;dur=250.1` (o salto do edge até São Paulo).
 *
 * Cross-origin (app nativo) isto só é legível porque o backend põe
 * Server-Timing em exposedHeaders — sem isso o header chega e o JS não o vê.
 */
export function lerServerTiming(header) {
  if (!header) return { motorMs: null, edgeMs: null };
  const ler = (nome) => {
    const m = new RegExp(`(?:^|,)\\s*${nome};dur=([\\d.]+)`, 'i').exec(header);
    return m ? Number(m[1]) : null;
  };
  return { motorMs: ler('app'), edgeMs: ler('edge') };
}

/**
 * Uma chamada à API que terminou (com sucesso ou não). `segundoPlano`: veio do
 * pré-aquecimento, não da tela.
 */
export function registarChamada({ rota, metodo = 'GET', status, ms, motorMs = null, edgeMs = null, segundoPlano = false }) {
  guardar(chamadas, {
    rota,
    metodo,
    status,
    ms: Math.round(ms),
    motorMs: motorMs == null ? null : Math.round(motorMs),
    edgeMs: edgeMs == null ? null : Math.round(edgeMs),
    // O que sobra depois de tirar o motor é a conta da distância.
    redeMs: motorMs == null ? null : Math.max(0, Math.round(ms - motorMs)),
    segundoPlano,
    em: new Date().toISOString(),
  });

  if (metodo === 'GET' && !segundoPlano) marcarDadosDaTela();
}

/**
 * Chegaram dados PARA A TELA: contam para o "dados prontos" da navegação aberta
 * (a última a chegar é a que manda). Velocidade 7B: só leituras pedidas pela
 * própria tela — o pré-aquecimento e as escritas (impressão de anúncio, voto)
 * entravam aqui, e o Ranking aparecia com "dados em 436 ms" que nem eram dele.
 */
export function marcarDadosDaTela() {
  if (navegacaoAberta && performance.now() - navegacaoAberta.t0 < JANELA_DA_NAVEGACAO_MS) {
    navegacaoAberta.msDados = Math.round(performance.now() - navegacaoAberta.t0);
  }
}

/** Mudança de rota — o relógio do "toque" parte aqui. */
export function marcarNavegacao(rota) {
  navegacaoAberta = { rota, t0: performance.now(), msDados: null, msPintura: null, esperou: new Set(loadersAtivos.keys()) };
  // Largura: nem todo transbordo dispara resize — mede também 1 s e 3 s depois
  // de cada troca de tela, quando os dados e as imagens já assentaram.
  if (typeof window !== 'undefined') {
    window.setTimeout(medirLargura, 1000);
    window.setTimeout(medirLargura, 3000);
  }
}

// Loaders de ecrã montados agora, por motivo. Sem isto, a medição de "primeira
// pintura" contava o instante em que o LOADER apareceu — que é rapidíssimo e não
// é o que a pessoa quer ver. Enquanto houver loader no ecrã, a tela real ainda
// não está lá, e o relógio continua a correr.
//
// O motivo (Velocidade 7B) diz QUEM segurou a pintura: 'codigo' (o chunk da tela
// a carregar), 'sessao' (AuthGuard à espera da sessão/perfil) ou 'tela' (a
// própria tela sem dados). Fica gravado em cada navegação.
const loadersAtivos = new Map(); // motivo -> quantos

export function loaderEntrou(motivo = 'tela') {
  loadersAtivos.set(motivo, (loadersAtivos.get(motivo) || 0) + 1);
  if (navegacaoAberta && navegacaoAberta.msPintura == null) navegacaoAberta.esperou.add(motivo);
}

export function loaderSaiu(motivo = 'tela') {
  const resto = (loadersAtivos.get(motivo) || 0) - 1;
  if (resto > 0) loadersAtivos.set(motivo, resto);
  else loadersAtivos.delete(motivo);
  if (loadersAtivos.size === 0) agendarPintura();
}

/**
 * Agenda a marcação da pintura para depois do próximo desenho. Duplo
 * requestAnimationFrame: o primeiro ainda cai no frame por desenhar, o segundo
 * já corre com o desenho feito.
 */
export function agendarPintura() {
  if (typeof requestAnimationFrame === 'undefined') {
    marcarPintura();
    return;
  }
  requestAnimationFrame(() => requestAnimationFrame(() => marcarPintura()));
}

/** A rota nova desenhou-se de verdade (sem loader por cima). */
export function marcarPintura() {
  if (!navegacaoAberta || navegacaoAberta.msPintura != null) return;
  if (loadersAtivos.size > 0) return; // ainda há loader — quem sair por último volta cá
  navegacaoAberta.msPintura = Math.round(performance.now() - navegacaoAberta.t0);
  guardar(navegacoes, {
    rota: navegacaoAberta.rota,
    msPintura: navegacaoAberta.msPintura,
    // Pode ficar null: telas que pintam sem pedir nada.
    msDados: navegacaoAberta.msDados,
    // Que loaders a pintura esperou (vazio = nenhum).
    esperou: [...navegacaoAberta.esperou],
    // Pintou ANTES de os dados chegarem = veio do cache local. É exactamente o
    // que a "Velocidade 3/4" foi buscar, e aqui vê-se se está a acontecer.
    doCache: navegacaoAberta.msDados != null && navegacaoAberta.msPintura < navegacaoAberta.msDados,
    em: new Date().toISOString(),
  });
  medirLargura();
}

/**
 * Algo que devia ter aparecido e não apareceu (VELOCIDADE 5).
 *
 * Chamadas que falham já se veem pelo estado na lista de cima; isto é para o
 * que morre em silêncio — o cromo do Início que fica no placeholder para
 * sempre, por exemplo. Sem um registo destes, a única prova de que aconteceu é
 * a pessoa dizer "ficou desfocado", e isso não diz PORQUÊ.
 *
 * `area` diz onde ('cromo'), `causa` diz o quê ('timeout-indexeddb',
 * 'blob-nulo', 'erro'), `detalhe` é a mensagem do erro quando há uma. Nunca
 * leva dados do utilizador.
 */
// ─── Velocidade 6B (15-set) ──────────────────────────────────────────────────

let preaquecimento = null;

/** Regista o resultado do pré-aquecimento em segundo plano (uma vez por sessão). */
export function registarPreaquecimento({ itens, imagens, ms }) {
  preaquecimento = { itens, imagens, ms, em: new Date().toISOString() };
}

// Imagens do proxy: quantas, quanto tempo, e quantas vieram do cache do browser.
// `transferSize === 0` numa entrada de performance significa exatamente isso —
// o pedido existiu, mas não gastou rede. É o número que diz se a Velocidade 6B
// está a funcionar no aparelho de verdade.
const imagens = [];
let observadorImagens = null;

// Abaixo disto uma imagem não foi a São Paulo e voltou: veio do aparelho.
const IMAGEM_DO_CACHE_MS = 40;

function registarImagem(entrada) {
  // Velocidade 7B: o Safari (e qualquer navegador numa imagem de outra origem sem
  // Timing-Allow-Origin — o caso do app nativo) devolve TODOS os tamanhos a 0, e
  // "transferSize === 0" marcava 100% do cache. Sem tamanho nenhum visível, quem
  // decide é a duração.
  const temTamanhos = entrada.transferSize > 0 || entrada.encodedBodySize > 0 || entrada.decodedBodySize > 0;
  guardar(imagens, {
    ms: Math.round(entrada.duration),
    doCache: temTamanhos ? entrada.transferSize === 0 : entrada.duration < IMAGEM_DO_CACHE_MS,
    bytes: entrada.transferSize || 0,
  });
}

// ─── Largura da tela (Velocidade 7B) ─────────────────────────────────────────
// Para apanhar em campo o (b): se algo passar da largura da tela, o WebKit do
// iPhone alarga a viewport e encolhe a página inteira. Guarda a largura do
// aparelho, a maior viewport e a maior largura rolável vistas, e em que tela.
let largura = null;

function medirLargura() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  const viewport = Math.round(window.innerWidth);
  // Mede também POR DENTRO da guarda (overflow-x: clip em #root/[data-page]): a
  // página já não encolhe, mas o que passar da largura continua a aparecer aqui.
  const pagina = document.querySelector('[data-page] > *');
  const rolavel = Math.round(Math.max((document.scrollingElement || document.documentElement)?.scrollWidth || 0, pagina?.scrollWidth || 0));
  if (!largura) {
    largura = { aparelho: window.screen?.width ?? viewport, maiorViewport: viewport, maiorRolavel: rolavel, rota: window.location.pathname, em: null };
    return;
  }
  if (viewport > largura.maiorViewport || rolavel > largura.maiorRolavel) {
    largura.maiorViewport = Math.max(largura.maiorViewport, viewport);
    largura.maiorRolavel = Math.max(largura.maiorRolavel, rolavel);
    largura.rota = window.location.pathname;
    largura.em = new Date().toISOString();
  }
}

/** Liga a vigia da largura. Chamado uma vez, no arranque do app. */
export function vigiarLargura() {
  if (typeof window === 'undefined') return;
  medirLargura();
  window.addEventListener('resize', medirLargura, { passive: true });
  window.visualViewport?.addEventListener('resize', medirLargura, { passive: true });
}

/** Liga o observador de imagens. Chamado uma vez, no arranque do app. */
export function observarImagens() {
  if (observadorImagens || typeof PerformanceObserver === 'undefined') return;
  try {
    // As que já aconteceram antes de chegarmos aqui.
    if (typeof performance !== 'undefined' && performance.getEntriesByType) {
      for (const e of performance.getEntriesByType('resource')) {
        if (e.name.includes('/api/media/')) registarImagem(e);
      }
    }
    observadorImagens = new PerformanceObserver((lista) => {
      for (const e of lista.getEntries()) {
        if (e.name.includes('/api/media/')) registarImagem(e);
      }
    });
    observadorImagens.observe({ type: 'resource', buffered: true });
  } catch {
    /* navegador sem suporte — o resto do diagnóstico continua */
  }
}

export function registarFalha(area, causa, detalhe = null) {
  guardar(falhas, {
    area,
    causa,
    detalhe: detalhe == null ? null : String(detalhe).slice(0, 200),
    em: new Date().toISOString(),
  });
}

/** Guarda a versão/build do app (só existe no nativo). Chamado uma vez. */
export function definirInfoApp(info) {
  infoApp = info || null;
}

function aparelho() {
  const c = typeof navigator !== 'undefined' ? navigator.connection : null;
  return {
    plataforma: Capacitor.getPlatform(),
    nativo: Capacitor.isNativePlatform(),
    appVersao: infoApp?.version || null,
    appBuild: infoApp?.build || null,
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
    idioma: typeof navigator !== 'undefined' ? navigator.language : null,
    // Só o Chrome/Android costuma ter isto; no iOS vem vazio e tudo bem.
    ligacao: c ? { tipo: c.effectiveType || null, descidaMbps: c.downlink ?? null, rttMs: c.rtt ?? null, poupanca: !!c.saveData } : null,
    ecra: typeof window !== 'undefined' ? { largura: window.innerWidth, altura: window.innerHeight, dpr: window.devicePixelRatio } : null,
  };
}

function estatistica(valores) {
  const v = valores.filter((n) => typeof n === 'number' && Number.isFinite(n));
  if (!v.length) return null;
  const soma = v.reduce((a, b) => a + b, 0);
  return { n: v.length, media: Math.round(soma / v.length), pior: Math.max(...v) };
}

/** Tudo o que a tela de Diagnóstico mostra e o relatório envia. */
export function lerDiagnostico() {
  return {
    versaoRelatorio: 1,
    em: new Date().toISOString(),
    aparelho: aparelho(),
    resumo: {
      total: estatistica(chamadas.map((c) => c.ms)),
      motor: estatistica(chamadas.map((c) => c.motorMs)),
      rede: estatistica(chamadas.map((c) => c.redeMs)),
      pintura: estatistica(navegacoes.map((n) => n.msPintura)),
      // Quantas telas pintaram sem esperar pela rede.
      pinturasDoCache: navegacoes.filter((n) => n.doCache).length,
      navegacoes: navegacoes.length,
      falhas: falhas.length,
      // Velocidade 6B: "imagens: n, média ms, % do cache".
      imagens: imagens.length
        ? {
          n: imagens.length,
          mediaMs: Math.round(imagens.reduce((a, i) => a + i.ms, 0) / imagens.length),
          pctDoCache: Math.round((imagens.filter((i) => i.doCache).length / imagens.length) * 100),
          bytes: imagens.reduce((a, i) => a + i.bytes, 0),
        }
        : null,
      // Velocidade 7B: { aparelho, maiorViewport, maiorRolavel, rota, em } — se a
      // maior largura passar da do aparelho, a página encolheu em campo.
      largura,
    },
    preaquecimento,
    chamadas: [...chamadas],
    navegacoes: [...navegacoes],
    falhas: [...falhas],
  };
}

/** Zera a caixa-preta (botão "Limpar" na tela de Diagnóstico). */
export function limparDiagnostico() {
  chamadas.length = 0;
  navegacoes.length = 0;
  falhas.length = 0;
  imagens.length = 0;
  preaquecimento = null;
  navegacaoAberta = null;
  largura = null;
  medirLargura();
}
