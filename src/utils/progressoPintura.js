// Futty v2.0 — Rodada 29B (bloco 2, A): a barra de progresso HONESTA da pintura da figurinha, e o que o app guarda
// para seguir uma pintura em segundo plano (sobrevive a sair da tela e a fechar o app). Puro, sem React e sem rede —
// testado no Node (scripts/unidade/progressoPintura.test.mjs). A conta do motor é a mesma (backend/utils/geracaoJobs.js).
//
// A regra da barra (pedido do dono, 30-set):
//   · avança pelo tempo típico (`estimativaSegundos` = mediana das últimas 50 pinturas, lida do motor) até 90%;
//   · depois segura em "finalizando…" até a imagem existir;
//   · NUNCA marca 100% antes de existir a imagem — a barra nem chega lá: quando a imagem chega, o card troca;
//   · passados 90 s: "tá demorando mais que o normal, a gente te avisa quando ficar pronta" (o tom do "Bola parada");
//   · etapas nomeadas: preparando a foto → pintando o uniforme → acabamento → pronta.

export const TETO_PROGRESSO = 0.9;
export const PADRAO_ESTIMATIVA_S = 45;
export const LIMITE_DEMORA_S = 90;
/** O app pergunta ao motor a cada 3 s, só com a aba visível (e na hora, ao voltar para ela). */
export const INTERVALO_CONSULTA_MS = 3000;
/** Ninguém espera uma pintura mais que isto: o motor desiste da fal aos 8 min. */
export const TETO_ACOMPANHAMENTO_MS = 10 * 60 * 1000;

export const ETAPAS_PINTURA = [
  { id: 'preparando', rotulo: 'Preparando a foto' },
  { id: 'pintando', rotulo: 'Pintando o uniforme' },
  { id: 'acabamento', rotulo: 'Acabamento' },
  { id: 'pronta', rotulo: 'Pronta' },
];

export const TEXTO_FINALIZANDO = 'Finalizando…';
export const TEXTO_DEMORANDO = 'Tá demorando mais que o normal, a gente te avisa quando ficar pronta';

/** 0 a 0,9 enquanto pinta (nunca 1). `estimativaSegundos` ausente vale os 45 s de sempre. */
export function progressoDaPintura({ decorridoMs, estimativaSegundos }) {
  const total = Math.max(1, (Number(estimativaSegundos) || PADRAO_ESTIMATIVA_S) * 1000);
  const fracao = Math.max(0, Number(decorridoMs) || 0) / total;
  return Math.min(TETO_PROGRESSO, fracao * TETO_PROGRESSO);
}

/**
 * Tudo o que a barra mostra, de uma vez: o que está cheio, o texto e em que etapa está.
 * `etapa` é a que o motor informou (preparando | pintando | acabamento); `decorridoMs` já soma o tempo local
 * desde a última consulta.
 */
export function situacaoDaPintura({ etapa = 'preparando', decorridoMs = 0, estimativaSegundos = PADRAO_ESTIMATIVA_S } = {}) {
  const estimativa = Number(estimativaSegundos) || PADRAO_ESTIMATIVA_S;
  const decorrido = Math.max(0, Number(decorridoMs) || 0);
  const progresso = progressoDaPintura({ decorridoMs: decorrido, estimativaSegundos: estimativa });
  const demorando = decorrido >= LIMITE_DEMORA_S * 1000;
  const finalizando = !demorando && decorrido >= estimativa * 1000;
  const indice = Math.max(0, ETAPAS_PINTURA.findIndex((e) => e.id === etapa));
  const rotuloDaEtapa = `${ETAPAS_PINTURA[indice].rotulo}…`;
  return {
    progresso,
    percentual: Math.min(90, Math.round(progresso * 100)),
    etapa: ETAPAS_PINTURA[indice].id,
    rotulo: demorando ? TEXTO_DEMORANDO : finalizando ? TEXTO_FINALIZANDO : rotuloDaEtapa,
    demorando,
    finalizando,
    etapas: ETAPAS_PINTURA.map((e, i) => ({ id: e.id, rotulo: e.rotulo, estado: i < indice ? 'feita' : i === indice ? 'atual' : 'depois' })),
  };
}

// ── A pintura que o app está seguindo ────────────────────────────────────────
// Guardada no aparelho (não na sessão): quem fecha o app e volta dali a pouco reencontra a pintura — pronta, ou ainda
// correndo. Só vale para a MESMA pessoa e por pouco tempo (uma pintura velha não é mais notícia).

const CHAVE = 'futty_pintura_em_curso';
export const VALIDADE_GUARDADA_MS = 15 * 60 * 1000;

/** { jobId, kit, estreia, estimativaSegundos, etapa, decorridoMs, baseEm } da pessoa, ou null. */
export function lerPinturaGuardada(userId, agora = Date.now()) {
  if (!userId) return null;
  try {
    const g = JSON.parse(localStorage.getItem(CHAVE) || 'null');
    if (!g || g.userId !== userId || !g.jobId) return null;
    if (agora - (Number(g.iniciadaEm) || 0) > VALIDADE_GUARDADA_MS) {
      localStorage.removeItem(CHAVE);
      return null;
    }
    // Volta "como estava": o tempo que o app ficou fechado conta como pintura rolando.
    return {
      jobId: g.jobId,
      kit: g.kit || null,
      estreia: !!g.estreia,
      estimativaSegundos: Number(g.estimativaSegundos) || PADRAO_ESTIMATIVA_S,
      etapa: 'preparando',
      decorridoMs: Math.max(0, agora - g.iniciadaEm),
      baseEm: agora,
    };
  } catch {
    return null;
  }
}

export function gravarPinturaGuardada(userId, pintura, agora = Date.now()) {
  if (!userId || !pintura?.jobId) return;
  try {
    localStorage.setItem(CHAVE, JSON.stringify({
      userId,
      jobId: pintura.jobId,
      kit: pintura.kit || null,
      estreia: !!pintura.estreia,
      estimativaSegundos: pintura.estimativaSegundos,
      iniciadaEm: agora - (Number(pintura.decorridoMs) || 0),
    }));
  } catch {
    /* modo privado: a pintura segue, só não sobrevive a fechar o app */
  }
}

export function limparPinturaGuardada() {
  try {
    localStorage.removeItem(CHAVE);
  } catch {
    /* idem */
  }
}
