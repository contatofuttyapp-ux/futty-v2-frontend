// Futty v2.0 — Posição do jogador. Rodada 9 (decisão do dono, 16-set):
// GR/DEF/MEI/ATA saiu do app. Só existe goleiro ('GL') ou jogador de linha
// (null) — é isso que o sorteio usa. O motor já normaliza a leitura, então os
// DEF/MEI/ATA que ainda estão no banco nunca chegam aqui.
export const POSICOES = [{ k: 'GL', label: 'Goleiro' }];

export const LABEL_LINHA = 'Jogador de linha';

export function labelPosicao(k) {
  return POSICOES.find((p) => p.k === k)?.label || LABEL_LINHA;
}
