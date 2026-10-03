// Futty v2.0 — Rodada 29I: contas do painel do admin que ficam melhor puras (sem React, sem rede) para testar no Node.

/**
 * O ÚLTIMO jogo do time: o mais recente que já ACONTECEU — data no passado (achado 98). Jogo cancelado não conta (não houve jogo),
 * nem jogo sem data. Antes o painel também aceitava qualquer jogo já sorteado, e um jogo daqui a onze dias com o sorteio feito
 * aparecia como "ÚLTIMO JOGO — qua., 14 de out." num 3 de outubro.
 * `agora` só existe para o teste ser determinístico.
 */
export function ultimoJogoPassado(jogos, agora = Date.now()) {
  let ultimo = null;
  let ultimoMs = -Infinity;
  for (const g of jogos || []) {
    if (!g?.data || g.cancelado || g.status === 'cancelado') continue;
    const ms = new Date(g.data).getTime();
    if (!Number.isFinite(ms) || ms >= agora) continue; // futuro (ou agora mesmo) não é "último"
    if (ms > ultimoMs) { ultimo = g; ultimoMs = ms; }
  }
  return ultimo;
}

/**
 * O número de confirmados do PRÓXIMO jogo no painel do admin (achado 99): UM só, de uma fonte só. Com a presença (RSVP) aberta ou
 * fechada vale a resposta do RSVP — é o que o "Vou" grava e o que o admin acompanha; sem RSVP vale a contagem do próprio jogo.
 * Antes o painel mostrava os dois ("12 confirmados" em cima, "11" embaixo) para o mesmo jogo.
 */
export function confirmadosDoProximoJogo({ rsvp, jogo }) {
  const rsvpAtivo = !!rsvp && (rsvp.rsvp_aberto || rsvp.rsvp_fechado);
  if (rsvpAtivo) return { confirmados: rsvp.confirmados?.length ?? 0, fonte: 'rsvp' };
  return { confirmados: jogo?.confirmados ?? 0, fonte: 'jogo' };
}
