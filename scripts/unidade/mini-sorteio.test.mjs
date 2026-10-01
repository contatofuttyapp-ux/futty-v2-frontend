// Futty v2.0 — Rodada 29D: o que o mini sorteio do Onboarding sorteia (src/utils/miniSorteio.js). Puro.
//
// Uso: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NOMES_FICTICIOS, TEMPOS, parDoCiclo, tiraDoRolo } from '../../src/utils/miniSorteio.js';

test('nomes fictícios: 8, curtos, em caixa alta, sem repetição', () => {
  assert.equal(NOMES_FICTICIOS.length, 8);
  assert.equal(new Set(NOMES_FICTICIOS).size, 8);
  for (const n of NOMES_FICTICIOS) {
    assert.ok(n.length <= 9, `${n} é comprido demais para o rolo`);
    assert.equal(n, n.toUpperCase());
  }
});

test('par do ciclo: dois nomes diferentes; em 4 ciclos todos aparecem; o 5º repete o 1º', () => {
  const vistos = new Set();
  for (let k = 0; k < 4; k += 1) {
    const { ouro, roxo } = parDoCiclo(k);
    assert.notEqual(ouro, roxo, `ciclo ${k}`);
    vistos.add(ouro).add(roxo);
  }
  assert.equal(vistos.size, 8);
  assert.deepEqual(parDoCiclo(4), parDoCiclo(0));
});

test('tira do rolo: todos os nomes, a começar onde se pede (os dois rolos não giram iguais)', () => {
  const ouro = tiraDoRolo(0);
  const roxo = tiraDoRolo(4);
  assert.deepEqual([...ouro].sort(), [...NOMES_FICTICIOS].sort());
  assert.deepEqual([...roxo].sort(), [...NOMES_FICTICIOS].sort());
  assert.equal(ouro[0], NOMES_FICTICIOS[0]);
  assert.equal(roxo[0], NOMES_FICTICIOS[4]);
  assert.notDeepEqual(ouro, roxo);
});

test('tempos: trava o ouro, depois o roxo, segura pelo menos 2 s e o ciclo dá ~6 s', () => {
  assert.ok(TEMPOS.travaOuroMs < TEMPOS.travaRoxoMs && TEMPOS.travaRoxoMs < TEMPOS.cicloMs);
  assert.ok(TEMPOS.cicloMs - TEMPOS.travaRoxoMs >= 2000, 'segura 2 s com o resultado');
  assert.ok(TEMPOS.cicloMs >= 5500 && TEMPOS.cicloMs <= 6500);
});
