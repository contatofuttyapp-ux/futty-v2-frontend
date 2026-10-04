// Futty v2.0 — Rodada 29T (bloco A, achado 168): a fila dos avisos do topo do Início. UM aviso por vez, o mais importante primeiro:
//   1. jogo sem resposta (o próximo jogo com presença aberta e sem Vou / Não vou) — a pessoa abre o app para responder "vou ou não vou";
//   2. pedido de entrada pendente;
//   3. ativar notificações.
// Respondeu (ou fechou) → entra o próximo da fila. Mais de um do mesmo tipo → o mais próximo e um "+N" discreto.
// Puro (sem React, sem rede): o Início só desenha o que esta fila devolve, e o teste roda no Node.

/** O jogo ainda aceita resposta de presença? Marcado (nem sorteado, nem encerrado, nem cancelado). */
function presencaAberta(jogo) {
  return jogo.status === 'scheduled' && !jogo.cancelado;
}

/** Instante do jogo em ms; jogo sem data vai para o fim da fila. */
function quando(jogo) {
  const ms = jogo.date ? Date.parse(jogo.date) : NaN;
  return Number.isNaN(ms) ? Infinity : ms;
}

/**
 * Os jogos que pedem uma resposta da pessoa, do mais próximo para o mais distante.
 * Pede resposta: presença aberta, `user_status` vazio e a pessoa JOGA nesse time (nunca onde ela só organiza, `eu_jogo === false`).
 * Quem já avisou que não vai ao próximo jogo do time (`ausente_proximo`) já respondeu àquele jogo: ele não entra.
 * `games` precisa trazer `user_status` já com a resposta de agora (o Início troca pelo RSVP e pelo otimista antes de chamar).
 */
export function jogosQuePedemResposta(games = []) {
  const ordenados = [...games].sort((a, b) => quando(a) - quando(b));
  const jaViuProximoDoTime = new Set();
  const pedem = [];
  for (const jogo of ordenados) {
    if (jogo.status === 'finished') continue;
    const eOProximoDoTime = !jaViuProximoDoTime.has(jogo.team_id);
    jaViuProximoDoTime.add(jogo.team_id);
    if (!presencaAberta(jogo) || jogo.eu_jogo === false || jogo.user_status) continue;
    if (eOProximoDoTime && jogo.ausente_proximo) continue;
    pedem.push(jogo);
  }
  return pedem;
}

/**
 * O aviso que vai ao topo agora, ou null quando a fila está vazia.
 *   jogos         o que `jogosQuePedemResposta` devolveu
 *   pedidos       os pedidos de entrada pendentes (o mais recente primeiro, como o motor manda)
 *   notificacoes  true quando o aviso de "Ativar notificações" ainda vale (suportado e não fechado)
 * @returns {{ tipo: 'jogo'|'pedido'|'notificacoes', item: object|null, mais: number }|null} `mais` = quantos do mesmo tipo esperam na fila ("+N").
 */
export function proximoAviso({ jogos = [], pedidos = [], notificacoes = false } = {}) {
  if (jogos.length) return { tipo: 'jogo', item: jogos[0], mais: jogos.length - 1 };
  if (pedidos.length) return { tipo: 'pedido', item: pedidos[0], mais: pedidos.length - 1 };
  if (notificacoes) return { tipo: 'notificacoes', item: null, mais: 0 };
  return null;
}
