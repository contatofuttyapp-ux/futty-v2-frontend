// Futty v2.0 — a régua de idade do cadastro no app (src/utils/idade.js): 13 anos (de 1-out a 16-out foi 18).
// A MESMA do motor (backend/utils/idade.js, com os mesmos casos em backend/tests/idade.test.js): o
// app avisa antes de criar a conta; o motor confere de novo e é quem decide.
//
// Uso: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dataDeNascimentoValida, ehRecusaPorIdade, idadeEm, menorQueIdadeMinima, nascimentoMaximo, IDADE_MINIMA, MSG_MENOR } from '../../src/utils/idade.js';

test('13 anos, com a frase da casa', () => {
  assert.equal(IDADE_MINIMA, 13);
  assert.equal(MSG_MENOR, 'O Futty é para quem tem 13 anos ou mais.');
});

test('faz 13 hoje entra, faz 13 amanhã não; 16 anos entra; 29/02', () => {
  const hoje = new Date(Date.UTC(2026, 9, 16));
  assert.equal(idadeEm('2013-10-16', hoje), 13);
  assert.equal(idadeEm('2013-10-17', hoje), 12);
  assert.equal(menorQueIdadeMinima('2013-10-16', hoje), false, 'faz 13 hoje: entra');
  assert.equal(menorQueIdadeMinima('2013-10-17', hoje), true, 'faz 13 amanhã: não entra');
  assert.equal(menorQueIdadeMinima('2010-01-01', hoje), false, '16 anos: entra (era barrado na régua de 18)');
  assert.equal(idadeEm('2012-02-29', new Date(Date.UTC(2025, 1, 28))), 12);
  assert.equal(idadeEm('2012-02-29', new Date(Date.UTC(2025, 2, 1))), 13);
});

test('a recusa do motor por idade: o código novo e o antigo (motor velho, régua de 18)', () => {
  assert.equal(ehRecusaPorIdade('MENOR_DE_IDADE'), true);
  assert.equal(ehRecusaPorIdade('MENOR_DE_18'), true);
  assert.equal(ehRecusaPorIdade('NASCIMENTO_JA_DEFINIDO'), false);
  assert.equal(ehRecusaPorIdade(undefined), false);
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

test('nascimentoMaximo (o `max` do seletor): hoje − 13 anos; o ano mais alto é ano atual − 13', () => {
  assert.equal(nascimentoMaximo(new Date(Date.UTC(2026, 9, 16))), '2013-10-16');
  assert.equal(nascimentoMaximo(new Date(Date.UTC(2026, 11, 31))), '2013-12-31');
  assert.equal(nascimentoMaximo(new Date(Date.UTC(2027, 0, 1))), '2014-01-01');
  assert.equal(Number(nascimentoMaximo().slice(0, 4)), new Date().getUTCFullYear() - IDADE_MINIMA);
});

test('nascimentoMaximo: 29/02 de hoje cai em 28/02 quando o ano de destino não é bissexto', () => {
  assert.equal(nascimentoMaximo(new Date(Date.UTC(2028, 1, 29))), '2015-02-28'); // 2015 não é bissexto
  assert.equal(nascimentoMaximo(new Date(Date.UTC(2032, 1, 29))), '2019-02-28'); // 2019 não é bissexto
  assert.equal(nascimentoMaximo(new Date(Date.UTC(2036, 1, 29))), '2023-02-28'); // 2023 não é bissexto
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
