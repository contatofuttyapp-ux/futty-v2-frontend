// Futty v2.0 — Rodada 31D, item 3: o confete do pódio do Ranking só sai na PRIMEIRA vez e quando a posição no pódio MUDA (src/utils/podioCelebrado.js).
// A última posição celebrada fica por time no aparelho; sem armazenamento nada quebra. O comportamento na tela está em scripts/provas/rodada-31d.prova.mjs.
//
// Uso: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { deveCelebrar, esquecerPosicaoCelebrada, guardarPosicaoCelebrada, lerPosicaoCelebrada } from '../../src/utils/podioCelebrado.js';

function memoria() {
  const dados = new Map();
  globalThis.localStorage = { getItem: (k) => (dados.has(k) ? dados.get(k) : null), setItem: (k, v) => dados.set(k, String(v)), removeItem: (k) => dados.delete(k) };
  return dados;
}

test('31D · deveCelebrar: na 1ª vez (nada guardado) e quando a posição muda; na mesma posição, não; fora do pódio, nunca', () => {
  assert.equal(deveCelebrar(null, 1), true);
  assert.equal(deveCelebrar(null, 3), true);
  assert.equal(deveCelebrar(2, 2), false);
  assert.equal(deveCelebrar(2, 1), true);
  assert.equal(deveCelebrar(1, 3), true);
  assert.equal(deveCelebrar(null, 4), false);
  assert.equal(deveCelebrar(2, 0), false);
  assert.equal(deveCelebrar(2, undefined), false);
});

test('31D · a posição celebrada fica por TIME: guardar num time não afeta o outro', () => {
  memoria();
  assert.equal(lerPosicaoCelebrada('domingueira'), null);
  guardarPosicaoCelebrada('domingueira', 2);
  assert.equal(lerPosicaoCelebrada('domingueira'), 2);
  assert.equal(lerPosicaoCelebrada('racha-do-guara'), null);
  guardarPosicaoCelebrada('racha-do-guara', 1);
  assert.equal(lerPosicaoCelebrada('domingueira'), 2);
  esquecerPosicaoCelebrada('domingueira'); // saiu do pódio
  assert.equal(lerPosicaoCelebrada('domingueira'), null);
  assert.equal(lerPosicaoCelebrada('racha-do-guara'), 1);
});

test('31D · valor estragado no armazenamento vale como "nunca celebrou"', () => {
  const dados = memoria();
  for (const lixo of ['x', '0', '4', '2.5', '', '-1']) {
    dados.set('futty_podio_celebrado:t', lixo);
    assert.equal(lerPosicaoCelebrada('t'), null, `"${lixo}"`);
  }
});

test('31D · sem armazenamento (janela privada): ler, guardar e esquecer não lançam, e o confete sai como na primeira vez', () => {
  const quebrado = () => { throw new Error('SecurityError'); };
  globalThis.localStorage = { getItem: quebrado, setItem: quebrado, removeItem: quebrado };
  assert.equal(lerPosicaoCelebrada('t'), null);
  assert.doesNotThrow(() => guardarPosicaoCelebrada('t', 1));
  assert.doesNotThrow(() => esquecerPosicaoCelebrada('t'));
  assert.equal(deveCelebrar(lerPosicaoCelebrada('t'), 1), true);
  delete globalThis.localStorage;
  assert.equal(lerPosicaoCelebrada('t'), null, 'nem localStorage existe');
});

test('31D · o Ranking usa o util: avalia uma vez por abertura, guarda a posição celebrada e esquece quando sai do pódio', () => {
  const ranking = fs.readFileSync(new URL('../../src/pages/Ranking.jsx', import.meta.url), 'utf8');
  assert.match(ranking, /deveCelebrar\(lerPosicaoCelebrada\(slug\), eu\.posicao\)/);
  assert.match(ranking, /guardarPosicaoCelebrada\(slug, eu\.posicao\)/);
  assert.match(ranking, /esquecerPosicaoCelebrada\(slug\)/);
});
