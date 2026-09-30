// Futty v2.0 — Rodada 29B (C): onde ficam as luzes de slot machine das boas-vindas (src/utils/luzesSlot.js).
//
// Uso: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { posicoesDasLuzes } from '../../src/utils/luzesSlot.js';

const CAIXA = { largura: 152, altura: 196 };

test('são 2·(colunas+linhas) luzes (24 no padrão) e todas caem dentro da caixa', () => {
  const p = posicoesDasLuzes(CAIXA);
  assert.equal(p.length, 24);
  for (const { x, y } of p) {
    assert.ok(x >= 0 && x <= CAIXA.largura && y >= 0 && y <= CAIXA.altura, `(${x}, ${y}) fora da caixa`);
  }
  assert.equal(posicoesDasLuzes({ ...CAIXA, colunas: 4, linhas: 6 }).length, 20);
});

test('ordem horária a partir do canto de cima à esquerda, e os quatro cantos sempre têm uma luz', () => {
  const margem = 5;
  const p = posicoesDasLuzes({ ...CAIXA, margem });
  const w = CAIXA.largura - 2 * margem;
  const h = CAIXA.altura - 2 * margem;
  assert.deepEqual(p[0], { x: margem, y: margem }, 'a 1ª luz é o canto de cima à esquerda');
  const tem = (x, y) => p.some((q) => q.x === x + margem && q.y === y + margem);
  assert.ok(tem(0, 0) && tem(w, 0) && tem(w, h) && tem(0, h), 'cantos');
  // lado de cima corre para a direita, o da direita para baixo, o de baixo para a esquerda, o da esquerda para cima
  assert.ok(p[1].x > p[0].x && p[1].y === p[0].y);
  assert.ok(p[5].x === margem + w && p[6].y > p[5].y);
  assert.ok(p[12].y === margem + h && p[13].x < p[12].x);
  assert.ok(p[17].x === margem && p[18].y < p[17].y);
});

test('espaçamento parelho em cada lado e nenhuma luz repetida (a corrida de luzes não "gagueja")', () => {
  const p = posicoesDasLuzes(CAIXA);
  assert.equal(new Set(p.map((q) => `${q.x},${q.y}`)).size, p.length);
  const passo = p[1].x - p[0].x; // lado de cima: 5 vãos iguais
  for (let k = 1; k < 5; k += 1) assert.ok(Math.abs(p[k].x - p[k - 1].x - passo) < 0.2);
});

test('número par de luzes: a paridade do índice (roxo/amarelo) fecha a volta sem dois iguais juntos', () => {
  assert.equal(posicoesDasLuzes(CAIXA).length % 2, 0);
  assert.equal(posicoesDasLuzes({ ...CAIXA, colunas: 6, linhas: 8 }).length % 2, 0);
});
