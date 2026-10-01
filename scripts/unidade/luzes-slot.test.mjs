// Futty v2.0 — Rodada 29C: as lâmpadas das máquinas das boas-vindas (src/utils/luzesSlot.js) — a régua da deitada e
// o anel contínuo da quadrada, com a geometria da prova aprovada (lado 248, anéis em 8 e 19 px, passo 11).
//
// Uso: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { anelDeLuzes, reguaDeLuzes } from '../../src/utils/luzesSlot.js';

const LADO = 248;
const PASSO = 11;

test('régua: n lâmpadas com o i contínuo a partir de inicio (as quatro réguas partilham um contador)', () => {
  const cima = reguaDeLuzes({ n: 22 });
  assert.equal(cima.length, 22);
  assert.deepEqual(cima.map((l) => l.i), Array.from({ length: 22 }, (_, k) => k));
  const base = reguaDeLuzes({ n: 24, inicio: 44 });
  assert.equal(base.length, 24);
  assert.equal(base[0].i, 44);
  assert.equal(base[23].i, 67);
});

test('anel: 4·round((lado − 2·inset)/passo) lâmpadas, todas dentro da faixa do inset, e o i é a ordem do caminho', () => {
  for (const [inset, esperado] of [[8, 84], [19, 76]]) {
    const p = anelDeLuzes({ lado: LADO, inset, passo: PASSO });
    assert.equal(p.length, esperado, `inset ${inset}`);
    p.forEach((q, k) => {
      assert.equal(q.i, k);
      assert.ok(q.x >= inset && q.x <= LADO - inset && q.y >= inset && q.y <= LADO - inset, `(${q.x}, ${q.y}) fora da faixa`);
    });
  }
});

test('anel: ordem horária a partir do canto de cima à esquerda, e os quatro cantos sempre têm lâmpada', () => {
  const inset = 8;
  const p = anelDeLuzes({ lado: LADO, inset, passo: PASSO });
  const L = LADO - 2 * inset;
  const n = p.length / 4;
  assert.deepEqual({ x: p[0].x, y: p[0].y }, { x: inset, y: inset }, 'a 1ª lâmpada é o canto de cima à esquerda');
  const tem = (x, y) => p.some((q) => q.x === x + inset && q.y === y + inset);
  assert.ok(tem(0, 0) && tem(L, 0) && tem(L, L) && tem(0, L), 'cantos');
  // cima corre para a direita, direita para baixo, baixo para a esquerda, esquerda para cima
  for (let k = 1; k < n; k += 1) assert.ok(p[k].x > p[k - 1].x && p[k].y === inset, `cima ${k}`);
  for (let k = n + 1; k < 2 * n; k += 1) assert.ok(p[k].y > p[k - 1].y && p[k].x === inset + L, `direita ${k}`);
  for (let k = 2 * n + 1; k < 3 * n; k += 1) assert.ok(p[k].x < p[k - 1].x && p[k].y === inset + L, `baixo ${k}`);
  for (let k = 3 * n + 1; k < 4 * n; k += 1) assert.ok(p[k].y < p[k - 1].y && p[k].x === inset, `esquerda ${k}`);
});

test('anel: espaçamento parelho (~passo) e nenhuma lâmpada repetida — a onda não "gagueja" e fecha sem emenda', () => {
  const p = anelDeLuzes({ lado: LADO, inset: 19, passo: PASSO });
  assert.equal(new Set(p.map((q) => `${q.x},${q.y}`)).size, p.length);
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  for (let k = 1; k < p.length; k += 1) assert.ok(Math.abs(dist(p[k], p[k - 1]) - PASSO) < 0.6, `vão ${k}: ${dist(p[k], p[k - 1])}`);
  assert.ok(Math.abs(dist(p[p.length - 1], p[0]) - PASSO) < 0.6, 'a última lâmpada fecha o caminho sobre a primeira');
});

test('os dois anéis da prova não se tocam: o roxo (inset 19) fica inteiro dentro do dourado (inset 8)', () => {
  const dourado = anelDeLuzes({ lado: LADO, inset: 8, passo: PASSO });
  const roxo = anelDeLuzes({ lado: LADO, inset: 19, passo: PASSO });
  const minD = Math.min(...dourado.flatMap((a) => roxo.map((b) => Math.hypot(a.x - b.x, a.y - b.y))));
  assert.ok(minD >= 7, `lâmpadas a ${minD} px (diâmetro 7)`);
});
