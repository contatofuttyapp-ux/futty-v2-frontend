// Futty v2.0 — Rodada 29B (C): onde ficam as "luzes de slot machine" em volta do mini card das boas-vindas.
// Puro (sem React): devolve os pontos, em ordem horária a partir do canto de cima à esquerda, sobre o retângulo da
// faixa — as duas pontas de cada lado incluídas, então os quatro cantos sempre têm uma luz. A animação (CSS) acende as
// luzes em sequência pela ordem deste vetor; cores alternadas (roxo/amarelo) saem da paridade do índice.

/**
 * @param {object} o
 * @param {number} o.largura  largura da caixa das luzes (px)
 * @param {number} o.altura   altura da caixa (px)
 * @param {number} [o.colunas] quantos vãos no lado de cima/baixo (luzes por lado horizontal = colunas)
 * @param {number} [o.linhas]  quantos vãos nos lados esquerdo/direito
 * @param {number} [o.margem]  folga entre a borda da caixa e a faixa (px)
 * @returns {{x:number, y:number}[]} 2·(colunas+linhas) pontos
 */
export function posicoesDasLuzes({ largura, altura, colunas = 5, linhas = 7, margem = 5 }) {
  const w = largura - 2 * margem;
  const h = altura - 2 * margem;
  const pontos = [];
  for (let k = 0; k < colunas; k += 1) pontos.push({ x: (k * w) / colunas, y: 0 });
  for (let k = 0; k < linhas; k += 1) pontos.push({ x: w, y: (k * h) / linhas });
  for (let k = 0; k < colunas; k += 1) pontos.push({ x: w - (k * w) / colunas, y: h });
  for (let k = 0; k < linhas; k += 1) pontos.push({ x: 0, y: h - (k * h) / linhas });
  return pontos.map((p) => ({ x: Math.round((p.x + margem) * 10) / 10, y: Math.round((p.y + margem) * 10) / 10 }));
}
