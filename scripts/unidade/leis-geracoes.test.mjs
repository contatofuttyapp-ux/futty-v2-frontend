// Futty v2.0 — Rodada 29A (B): as leis das gerações no app (dono, 26-set, "nunca prejuízo"):
// o pacote do time dá 2 gerações por jogador e criar um time NÃO dá geração de graça.
// O motor tem o mesmo par de travas em backend/tests/direito-brilhante.test.js.
//
// Uso: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as planos from '../../src/lib/planos.js';

const fonte = (caminho) => readFileSync(new URL(`../../src/${caminho}`, import.meta.url), 'utf8');

test('o pacote do time dá 2 gerações por jogador (Minha Figurinha continua com 10)', () => {
  assert.equal(planos.PACOTE_GERACOES_POR_JOGADOR, 2);
  assert.equal(planos.MINHA_GERACOES, 10);
});

test('o presente do criador não existe mais no app', () => {
  assert.equal('PRESENTE_CRIADOR_GERACOES' in planos, false);
  const criar = fonte('pages/CriarEquipa.jsx');
  assert.ok(!/PRESENTE_CRIADOR|presente_brilhante|ganhouBrilhante|Você ganhou/.test(criar), 'CriarEquipa não promete geração de graça');
});

test('os Termos dizem 2 gerações por jogador', () => {
  const termos = fonte('pages/Termos.jsx');
  assert.match(termos, /2 gerações por jogador/);
  assert.doesNotMatch(termos, /[35] gerações por jogador/);
});
