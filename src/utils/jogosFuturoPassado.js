// Futty v2.0 — separa os jogos do time em "futuros" e "passados" (aba Jogos do admin).
// A API (`GET /api/teams/:slug/games`) devolve `data` DECRESCENTE —
// certo para "Passados" (o mais recente primeiro), errado para "Futuros" (mostraria o jogo mais
// DISTANTE no topo e o próximo por último). Aqui "Futuros" sai sempre crescente: o próximo jogo
// primeiro. "Passados" mantém a ordem que chegou (decrescente, o mais recente primeiro).

/**
 * @param {Array<{data: string, status?: string}>} games
 * @param {number} agora Date.now() — injetado para o teste ser determinístico.
 * @returns {{ futuros: object[], passados: object[] }}
 */
export function separarFuturosPassados(games, agora) {
  const futuros = [];
  const passados = [];
  for (const g of games || []) {
    // Cancelados futuros continuam em "Futuros" (a tela os mostra com visual distinto).
    const fut = g.data && new Date(g.data).getTime() > agora && g.status !== 'terminado';
    (fut ? futuros : passados).push(g);
  }
  futuros.sort((a, b) => new Date(a.data) - new Date(b.data));
  return { futuros, passados };
}
