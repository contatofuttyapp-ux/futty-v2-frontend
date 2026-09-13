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

/** Uma chamada à API que terminou (com sucesso ou não). */
export function registarChamada({ rota, metodo = 'GET', status, ms, motorMs = null, edgeMs = null }) {
  guardar(chamadas, {
    rota,
    metodo,
    status,
    ms: Math.round(ms),
    motorMs: motorMs == null ? null : Math.round(motorMs),
    edgeMs: edgeMs == null ? null : Math.round(edgeMs),
    // O que sobra depois de tirar o motor é a conta da distância.
    redeMs: motorMs == null ? null : Math.max(0, Math.round(ms - motorMs)),
    em: new Date().toISOString(),
  });

  // Se há uma navegação recente aberta, esta chamada conta para o "dados
  // prontos" dela — a última a chegar é a que manda.
  if (navegacaoAberta && performance.now() - navegacaoAberta.t0 < JANELA_DA_NAVEGACAO_MS) {
    navegacaoAberta.msDados = Math.round(performance.now() - navegacaoAberta.t0);
  }
}

/** Mudança de rota — o relógio do "toque" parte aqui. */
export function marcarNavegacao(rota) {
  navegacaoAberta = { rota, t0: performance.now(), msDados: null, msPintura: null };
}

// Quantos loaders de ecrã estão montados agora. Sem isto, a medição de "primeira
// pintura" contava o instante em que o LOADER apareceu — que é rapidíssimo e não
// é o que a pessoa quer ver. Um diagnóstico que mede a coisa errada é pior do
// que não ter diagnóstico nenhum. Enquanto houver loader no ecrã, a tela real
// ainda não está lá, e o relógio continua a correr.
let loaders = 0;

export function loaderEntrou() {
  loaders += 1;
}

export function loaderSaiu() {
  loaders = Math.max(0, loaders - 1);
  if (loaders === 0) agendarPintura();
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
  if (loaders > 0) return; // ainda há loader — quem sair por último volta cá
  navegacaoAberta.msPintura = Math.round(performance.now() - navegacaoAberta.t0);
  guardar(navegacoes, {
    rota: navegacaoAberta.rota,
    msPintura: navegacaoAberta.msPintura,
    // Pode ficar null: telas que pintam sem pedir nada.
    msDados: navegacaoAberta.msDados,
    // Pintou ANTES de os dados chegarem = veio do cache local. É exactamente o
    // que a "Velocidade 3/4" foi buscar, e aqui vê-se se está a acontecer.
    doCache: navegacaoAberta.msDados != null && navegacaoAberta.msPintura < navegacaoAberta.msDados,
    em: new Date().toISOString(),
  });
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
    },
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
  navegacaoAberta = null;
}
