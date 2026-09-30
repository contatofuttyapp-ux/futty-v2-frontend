// Futty v2.0 — Rodada 29A (A): a confirmação de "Excluir minha conta" aceita o que o teclado do iPhone
// faz com a palavra (src/utils/confirmarExclusao.js). O motor continua exigindo 'EXCLUIR' exato.
//
// Uso: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CONFIRMACAO_EXCLUIR, confirmacaoExcluirValida, normalizarConfirmacao } from '../../src/utils/confirmarExclusao.js';

test('o que o motor recebe é sempre EXCLUIR em maiúsculas', () => {
  assert.equal(CONFIRMACAO_EXCLUIR, 'EXCLUIR');
});

test('maiúsculas, minúsculas, capitalizado e com espaço nas pontas valem', () => {
  for (const digitado of ['EXCLUIR', 'excluir', 'Excluir', 'Excluir ', ' excluir', '  ExClUiR  ', 'excluir\n']) {
    assert.equal(confirmacaoExcluirValida(digitado), true, JSON.stringify(digitado));
  }
});

test('acento e caracteres invisíveis do teclado não atrapalham', () => {
  assert.equal(confirmacaoExcluirValida('éxcluír'), true);
  assert.equal(confirmacaoExcluirValida('excluir​'), true);
  assert.equal(confirmacaoExcluirValida('EXCLUIR'.normalize('NFD')), true);
  assert.equal(normalizarConfirmacao('  Excluír '), 'EXCLUIR');
});

test('o que não é a palavra continua não valendo', () => {
  for (const digitado of ['', ' ', 'exclui', 'excluirr', 'excluir conta', 'ex cluir', 'EXCLUIR!', 'deletar', null, undefined]) {
    assert.equal(confirmacaoExcluirValida(digitado), false, JSON.stringify(digitado));
  }
});
