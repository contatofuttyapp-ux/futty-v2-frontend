// Futty v2.0 — RODADA 28 (bloco C): a régua de idade do cadastro no app (src/utils/idade.js).
// A MESMA do motor (backend/utils/idade.js, com os mesmos casos em backend/tests/idade.test.js): o
// app avisa antes de criar a conta; o motor confere de novo e é quem decide.
//
// Uso: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dataDeNascimentoValida, idadeEm, menorQueIdadeMinima, IDADE_MINIMA, MSG_MENOR } from '../../src/utils/idade.js';

test('13 anos, com a frase da casa', () => {
  assert.equal(IDADE_MINIMA, 13);
  assert.equal(MSG_MENOR, 'O Futty é para maiores de 13 anos.');
});

test('aniversário de 13 hoje pode, véspera não; 29/02', () => {
  const hoje = new Date(Date.UTC(2026, 8, 25));
  assert.equal(idadeEm('2013-09-25', hoje), 13);
  assert.equal(idadeEm('2013-09-26', hoje), 12);
  assert.equal(menorQueIdadeMinima('2013-09-25', hoje), false);
  assert.equal(menorQueIdadeMinima('2013-09-26', hoje), true);
  assert.equal(idadeEm('2012-02-29', new Date(Date.UTC(2025, 1, 28))), 12);
  assert.equal(idadeEm('2012-02-29', new Date(Date.UTC(2025, 2, 1))), 13);
});

test('datas impossíveis, futuras e fora do formato não passam', () => {
  assert.equal(dataDeNascimentoValida('2026-02-30'), null);
  assert.equal(dataDeNascimentoValida('1899-12-31'), null);
  assert.equal(dataDeNascimentoValida('2999-01-01'), null);
  assert.equal(dataDeNascimentoValida('25/09/2000'), null);
  assert.equal(dataDeNascimentoValida(''), null);
  assert.equal(dataDeNascimentoValida('2000-09-25'), '2000-09-25');
  assert.equal(menorQueIdadeMinima('lixo'), false, 'data inválida não decide nada (quem barra é a validação)');
});
