// Futty v2.0 — Rodada 29H (item 3): as contas dos rolinhos da data de nascimento (src/utils/dataRolinhos.js). A interação
// (rolar, tocar, o teto) é provada na cena rodada29h do ver-iphone; aqui, o que é conta.
//
// Uso: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MESES, ANO_MINIMO, anoMaximo, comporData, diasDoMes } from '../../src/utils/dataRolinhos.js';
import { nascimentoMaximo } from '../../src/utils/idade.js';

test('diasDoMes: 30/31 dias e fevereiro de ano bissexto (inclusive os séculos)', () => {
  assert.deepEqual([1, 3, 4, 6, 9, 11, 12].map((m) => diasDoMes(m, 2001)), [31, 31, 30, 30, 30, 30, 31]);
  assert.equal(diasDoMes(2, 2001), 28);
  assert.equal(diasDoMes(2, 2004), 29);
  assert.equal(diasDoMes(2, 1900), 28, '1900 não foi bissexto');
  assert.equal(diasDoMes(2, 2000), 29);
});

test('os 12 meses, em português, com o acento certo', () => {
  assert.equal(MESES.length, 12);
  assert.equal(MESES[2], 'março');
  assert.equal(MESES[11], 'dezembro');
});

test('anoMaximo: ano atual − 18; nenhum ano futuro (o mesmo teto do nascimentoMaximo)', () => {
  const hoje = new Date(Date.UTC(2026, 9, 2));
  assert.equal(anoMaximo(hoje), 2008);
  assert.equal(anoMaximo(hoje), Number(nascimentoMaximo(hoje).slice(0, 4)));
  assert.ok(anoMaximo() < new Date().getUTCFullYear(), 'sempre antes do ano atual');
  assert.ok(ANO_MINIMO < anoMaximo());
});

test('comporData: AAAA-MM-DD com zeros; o dia que não existe no mês cai no último', () => {
  assert.equal(comporData({ dia: 5, mes: 3, ano: 1990 }), '1990-03-05');
  assert.equal(comporData({ dia: 31, mes: 12, ano: 2008 }), '2008-12-31');
  assert.equal(comporData({ dia: 31, mes: 2, ano: 2001 }), '2001-02-28');
  assert.equal(comporData({ dia: 31, mes: 2, ano: 2000 }), '2000-02-29');
  assert.equal(comporData({ dia: 31, mes: 4, ano: 1995 }), '1995-04-30');
});
