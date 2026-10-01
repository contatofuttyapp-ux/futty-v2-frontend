// Futty v2.0 — Rodada 29C: as lâmpadas das duas máquinas das boas-vindas (components/BoasVindas.jsx), com a geometria
// da prova aprovada pelo dono (FUT/DESIGN/prova-boas-vindas-v2.html). Puro (sem React): só números. A animação é CSS e
// acende cada lâmpada pela ordem do `i` (animation-delay: calc(var(--i) * -.09s)) — é o `i` que faz a onda correr.

/**
 * Régua da máquina deitada: n lâmpadas numa fila. O `i` continua a partir de `inicio` porque, na prova, um contador só
 * atravessa as quatro réguas — a fila de baixo continua a contagem da de cima.
 * @param {{ n: number, inicio?: number }} o
 * @returns {{ i: number }[]}
 */
export function reguaDeLuzes({ n, inicio = 0 }) {
  return Array.from({ length: n }, (_, k) => ({ i: inicio + k }));
}

/**
 * Anel contínuo da máquina quadrada: um caminho fechado em sentido horário a partir do canto de cima à esquerda,
 * lâmpadas a ~`passo` px uma da outra e os quatro cantos sempre com lâmpada. O `i` segue a ordem do caminho, por isso
 * a onda dá a volta sem emenda. São 4·n lâmpadas, n = round((lado − 2·inset) / passo); x/y já incluem o inset.
 * @param {{ lado: number, inset: number, passo: number }} o
 * @returns {{ x: number, y: number, i: number }[]}
 */
export function anelDeLuzes({ lado, inset, passo }) {
  const L = lado - 2 * inset;
  const n = Math.round(L / passo);
  const pts = [];
  for (let k = 0; k < n; k += 1) pts.push({ x: (k * L) / n, y: 0 });
  for (let k = 0; k < n; k += 1) pts.push({ x: L, y: (k * L) / n });
  for (let k = 0; k < n; k += 1) pts.push({ x: L - (k * L) / n, y: L });
  for (let k = 0; k < n; k += 1) pts.push({ x: 0, y: L - (k * L) / n });
  return pts.map((p, i) => ({ x: Math.round((p.x + inset) * 100) / 100, y: Math.round((p.y + inset) * 100) / 100, i }));
}
