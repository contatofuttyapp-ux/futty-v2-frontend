// Futty v2.0 — separa os jogos do time em "futuros" e "passados" (aba Jogos do admin).
// A API (`GET /api/teams/:slug/games`) devolve `data` DECRESCENTE —
// certo para "Passados" (o mais recente primeiro), errado para "Futuros" (mostraria o jogo mais
// DISTANTE no topo e o próximo por último). Aqui "Futuros" sai sempre crescente: o próximo jogo
// primeiro. "Passados" mantém a ordem que chegou (decrescente, o mais recente primeiro).
// O jogo que já começou e ainda está "em andamento" (o motor diz) fica em "Futuros", com o selo, e só desce para "Passados" quando terminar.
import { estadoDoJogo } from './estadoDoJogo';

/**
 * @param {Array<{data: string, status?: string}>} games
 * @param {number} agora Date.now() — injetado para o teste ser determinístico.
 * @returns {{ futuros: object[], passados: object[] }}
 */
export function separarFuturosPassados(games, agora) {
  const futuros = [];
  const passados = [];
  for (const g of games || []) {
    const quando = g.data ? new Date(g.data).getTime() : NaN;
    const estado = estadoDoJogo(g);
    // Cancelados futuros continuam em "Futuros" (a tela os mostra com visual distinto); o que já começou só fica lá enquanto está em andamento.
    const fut = !Number.isNaN(quando) && (quando > agora ? estado !== 'terminado' : estado === 'em_curso');
    (fut ? futuros : passados).push(g);
  }
  futuros.sort((a, b) => new Date(a.data) - new Date(b.data));
  return { futuros, passados };
}
