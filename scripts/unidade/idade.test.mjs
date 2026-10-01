// Futty v2.0 — RODADA 29G (1-out): a régua de idade do cadastro no app (src/utils/idade.js), agora 18 anos.
// A MESMA do motor (backend/utils/idade.js, com os mesmos casos em backend/tests/idade.test.js): o
// app avisa antes de criar a conta; o motor confere de novo e é quem decide.
//
// Uso: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dataDeNascimentoValida, idadeEm, menorQueIdadeMinima, nascimentoMaximo, IDADE_MINIMA, MSG_MENOR } from '../../src/utils/idade.js';

test('18 anos, com a frase da casa', () => {
  assert.equal(IDADE_MINIMA, 18);
  assert.equal(MSG_MENOR, 'O Futty é para maiores de 18 anos.');
});

test('faz 18 hoje entra, faz 18 amanhã não; 29/02', () => {
  const hoje = new Date(Date.UTC(2026, 8, 25));
  assert.equal(idadeEm('2008-09-25', hoje), 18);
  assert.equal(idadeEm('2008-09-26', hoje), 17);
  assert.equal(menorQueIdadeMinima('2008-09-25', hoje), false, 'faz 18 hoje: entra');
  assert.equal(menorQueIdadeMinima('2008-09-26', hoje), true, 'faz 18 amanhã: não entra');
  assert.equal(idadeEm('2008-02-29', new Date(Date.UTC(2026, 1, 28))), 17);
  assert.equal(idadeEm('2008-02-29', new Date(Date.UTC(2026, 2, 1))), 18);
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

test('nascimentoMaximo (o `max` do seletor): hoje − 18 anos; o ano mais alto é ano atual − 18', () => {
  assert.equal(nascimentoMaximo(new Date(Date.UTC(2026, 9, 1))), '2008-10-01');
  assert.equal(nascimentoMaximo(new Date(Date.UTC(2026, 11, 31))), '2008-12-31');
  assert.equal(nascimentoMaximo(new Date(Date.UTC(2027, 0, 1))), '2009-01-01');
  assert.equal(Number(nascimentoMaximo().slice(0, 4)), new Date().getUTCFullYear() - IDADE_MINIMA);
});

test('nascimentoMaximo: 29/02 de hoje cai em 28/02 quando o ano de destino não é bissexto', () => {
  assert.equal(nascimentoMaximo(new Date(Date.UTC(2028, 1, 29))), '2010-02-28'); // 2010 não é bissexto
  assert.equal(nascimentoMaximo(new Date(Date.UTC(2044, 1, 29))), '2026-02-28'); // 2026 não é bissexto
  assert.equal(nascimentoMaximo(new Date(Date.UTC(2032, 1, 29))), '2014-02-28'); // 2014 não é bissexto
});

test('nascimentoMaximo bate com a régua em todos os dias de 8 anos (inclui 29/02): o max entra, o dia seguinte não', () => {
  const dia = 86400000;
  const inicio = Date.UTC(2026, 0, 1);
  for (let i = 0; i < 366 * 8; i += 1) {
    const hoje = new Date(inicio + i * dia);
    const max = nascimentoMaximo(hoje);
    const seguinte = new Date(new Date(`${max}T00:00:00Z`).getTime() + dia).toISOString().slice(0, 10);
    assert.equal(idadeEm(max, hoje) >= IDADE_MINIMA, true, `${max} deveria entrar em ${hoje.toISOString().slice(0, 10)}`);
    assert.equal(idadeEm(seguinte, hoje) < IDADE_MINIMA, true, `${seguinte} NÃO deveria entrar em ${hoje.toISOString().slice(0, 10)}`);
  }
});
