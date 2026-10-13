// Futty v2.0 — as contas do cartão "Figurinhas pro time todo" do Início. Puro (sem React, sem rede): o teste roda no Node.
import { PACOTE_DE_PRESENTE, PACOTE_GERACOES_POR_JOGADOR, PACOTE_JOGADORES } from '../lib/planos.js';

/** O id do "fechar" deste cartão em utils/lembretes.js (7 dias, naquele aparelho). */
export const ID_PACOTE_NO_INICIO = 'pacote-no-inicio';

/** Os times em que a pessoa é dona (admin). Jogador comum devolve lista vazia — e não vê o cartão. */
export function timesDoDono(teams) {
  return (teams || []).filter((t) => t?.role === 'admin');
}

/** A linha do cartão. Com algum time ainda sem o pacote, o que ele dá; com todos já ativos, o presente (+gerações para cada jogador). */
export function linhaDoPacote(times) {
  const algumSemPacote = (times || []).some((t) => !t.brilhante_ativo);
  return algumSemPacote
    ? `${PACOTE_GERACOES_POR_JOGADOR} gerações para cada jogador, até ${PACOTE_JOGADORES}.`
    : PACOTE_DE_PRESENTE.resumo;
}
