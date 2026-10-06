// Futty v2.0 — as contas da presença (RSVP) que o Início faz na tela — puras (sem React, sem rede), para
// testar no Node.
//
// O "Vou / Não vou" grava no RSVP do jogo. A tela mostra o resultado NA HORA (estado otimista) e, se o
// pedido falhar, volta ao que estava: tudo se resume a "qual é a resposta de agora" — `respostaAgora` — e o
// número de confirmados e o status do botão saem dela.

/** A resposta de presença de `meuId` no RSVP que o motor mandou: 'confirmado' | 'recusado' | null (ainda não respondeu). */
export function respostaNoRsvp(rsvp, meuId) {
  if (!rsvp || !meuId) return null;
  if (rsvp.confirmados?.some((u) => u.id === meuId)) return 'confirmado';
  if (rsvp.recusados?.some((u) => u.id === meuId)) return 'recusado';
  return null;
}

/**
 * Quantos confirmados a tela mostra, dado o que o motor contou e a resposta de AGORA da pessoa (que pode ser a otimista, ainda sem
 * resposta do pedido): parte do número do motor e soma/tira a diferença entre a resposta de agora e a que o motor conhecia.
 * Voltar à resposta de antes (o pedido falhou) devolve o número do motor. null quando não há RSVP.
 */
export function confirmadosComResposta(rsvp, meuId, respostaAgora) {
  if (!rsvp?.confirmados) return null;
  const conhecida = respostaNoRsvp(rsvp, meuId);
  const delta = (respostaAgora === 'confirmado' ? 1 : 0) - (conhecida === 'confirmado' ? 1 : 0);
  return Math.max(0, rsvp.confirmados.length + delta);
}

/** O status que o card do jogo usa ('going' | 'not_going' | null) para a resposta de presença. */
export function statusDoJogoPelaResposta(resposta) {
  return resposta === 'confirmado' ? 'going' : resposta === 'recusado' ? 'not_going' : null;
}
