// Futty v2.0 — O placar de um jogo do campeonato, num texto só para todas as telas (a final na página do time e na pública, o
// mata-mata, o cartão 9:16 e o post da Resenha). Puro (sem React).
//
// Empate numa final ou no mata-mata se decide nos pênaltis: o placar fica como foi digitado e o vencedor dos pênaltis vai ao lado.

/**
 * "2 × 2 (pên.: Time Ouro)" — ou só "3 × 2" quando o jogo foi decidido no placar. `nomeDe(id)` devolve o nome do time.
 * Sem placar lançado, devolve ''.
 */
export function placarComPenaltis(confronto, nomeDe) {
  if (!confronto || confronto.placar_a == null || confronto.placar_b == null) return '';
  const placar = `${confronto.placar_a} × ${confronto.placar_b}`;
  const vencedor = confronto.penaltis_vencedor_id ? nomeDe(confronto.penaltis_vencedor_id) : null;
  return vencedor ? `${placar} (pên.: ${vencedor})` : placar;
}

/** O mesmo texto a partir do que o post da Resenha guarda: { a: { nome, gols }, b: { nome, gols }, penaltis: nome | null }. */
export function placarDaFinalDoPost(final) {
  if (!final) return '';
  const placar = `${final.a.gols} × ${final.b.gols}`;
  return final.penaltis ? `${placar} (pên.: ${final.penaltis})` : placar;
}

/** "Time Ouro 2 × 2 Time Roxo (pên.: Time Ouro)" — a final inteira numa linha, a partir do que o post da Resenha guarda. */
export function linhaDaFinalDoPost(final) {
  if (!final) return '';
  const jogo = `${final.a.nome} ${final.a.gols} × ${final.b.gols} ${final.b.nome}`;
  return final.penaltis ? `${jogo} (pên.: ${final.penaltis})` : jogo;
}

/** O placar de um jogo eliminatório empatou? Aí a tela pergunta quem venceu nos pênaltis, em vez de gravar. */
export const empatouNoMataMata = (golsA, golsB) => golsA === golsB;
