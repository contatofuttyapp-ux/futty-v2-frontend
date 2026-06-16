// Futty v2.0 — Posições do jogador (abreviatura + nome em PT-BR).
export const POSICOES = [
  { k: 'GL', label: 'Goleiro' },
  { k: 'DEF', label: 'Defensor' },
  { k: 'MEI', label: 'Meia' },
  { k: 'ATA', label: 'Atacante' },
];

export function labelPosicao(k) {
  return POSICOES.find((p) => p.k === k)?.label || '';
}
