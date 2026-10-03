// Futty v2.0 — Rodada 29I (achados 98 e 99): as contas do painel do admin (src/utils/jogosAdmin.js).
//
//   98. "ÚLTIMO JOGO" mostrava um jogo do FUTURO ("qua., 14 de out." num 3 de outubro): a conta aceitava qualquer jogo já sorteado.
//       O último jogo é o mais recente com data no PASSADO.
//   99. "PRÓXIMO JOGO" aparecia duas vezes na mesma tela, com contagens diferentes (12 em cima, 11 embaixo): um número só.
//
// Uso: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { ultimoJogoPassado, confirmadosDoProximoJogo } from '../../src/utils/jogosAdmin.js';

const AGORA = new Date('2026-10-03T15:00:00Z').getTime(); // 3 de outubro
const dia = (n) => new Date(AGORA + n * 86400000).toISOString();

test('o último jogo é o mais recente com data no PASSADO — nunca um jogo futuro, mesmo já sorteado (o achado 98)', () => {
  const jogos = [
    { id: 'velho', data: dia(-20), sorteio_realizado: true },
    { id: 'ontem', data: dia(-1), sorteio_realizado: true },
    { id: 'futuro-sorteado', data: dia(11), sorteio_realizado: true }, // "qua., 14 de out.": o que o painel mostrava
    { id: 'futuro', data: dia(3), sorteio_realizado: false },
  ];
  assert.equal(ultimoJogoPassado(jogos, AGORA).id, 'ontem');
  assert.equal(ultimoJogoPassado([...jogos].reverse(), AGORA).id, 'ontem', 'a ordem da lista não importa');
});

test('só jogos futuros (mesmo sorteados): não há último jogo', () => {
  assert.equal(ultimoJogoPassado([{ id: 'a', data: dia(11), sorteio_realizado: true }, { id: 'b', data: dia(2) }], AGORA), null);
  assert.equal(ultimoJogoPassado([], AGORA), null);
  assert.equal(ultimoJogoPassado(undefined, AGORA), null);
});

test('cancelado, sem data e data quebrada não são "o último jogo"', () => {
  const jogos = [
    { id: 'bom', data: dia(-8) },
    { id: 'cancelado', data: dia(-1), cancelado: true },
    { id: 'cancelado2', data: dia(-2), status: 'cancelado' },
    { id: 'sem-data', data: null },
    { id: 'quebrado', data: 'ontem à noite' },
  ];
  assert.equal(ultimoJogoPassado(jogos, AGORA).id, 'bom');
});

test('jogo marcado para agora mesmo ainda não é passado', () => {
  assert.equal(ultimoJogoPassado([{ id: 'agora', data: new Date(AGORA).toISOString() }], AGORA), null);
  assert.equal(ultimoJogoPassado([{ id: 'um-segundo', data: new Date(AGORA - 1000).toISOString() }], AGORA).id, 'um-segundo');
});

test('um número só no PRÓXIMO jogo: com a presença aberta vale o RSVP; sem ela, o do próprio jogo — nunca os dois', () => {
  const rsvp = { rsvp_aberto: true, rsvp_fechado: false, confirmados: new Array(12).fill({}) };
  const jogo = { confirmados: 11 };
  assert.deepEqual(confirmadosDoProximoJogo({ rsvp, jogo }), { confirmados: 12, fonte: 'rsvp' });
  assert.deepEqual(confirmadosDoProximoJogo({ rsvp: { ...rsvp, rsvp_aberto: false, rsvp_fechado: true }, jogo }), { confirmados: 12, fonte: 'rsvp' });
  assert.deepEqual(confirmadosDoProximoJogo({ rsvp: { rsvp_aberto: false, rsvp_fechado: false, confirmados: [] }, jogo }), { confirmados: 11, fonte: 'jogo' });
  assert.deepEqual(confirmadosDoProximoJogo({ rsvp: null, jogo }), { confirmados: 11, fonte: 'jogo' });
  assert.deepEqual(confirmadosDoProximoJogo({ rsvp: null, jogo: null }), { confirmados: 0, fonte: 'jogo' });
});

test('o painel tem UM bloco "Próximo jogo" e usa estas contas (não volta a duplicar nem a aceitar jogo futuro como último)', () => {
  const raiz = fileURLToPath(new URL('../../', import.meta.url));
  const painel = fs.readFileSync(`${raiz}src/pages/AdminPanel.jsx`, 'utf8');
  assert.equal((painel.match(/>\s*PRÓXIMO JOGO\s*</g) || []).length, 0, 'o bloco antigo, em caixa alta, saiu');
  assert.equal((painel.match(/cardDashLbl\}>Próximo jogo</g) || []).length, 1, 'um bloco só');
  assert.match(painel, /ultimoJogoPassado\(/);
  assert.match(painel, /confirmadosDoProximoJogo\(/);
  assert.doesNotMatch(painel, /g\.sorteio_realizado \|\| \(g\.data/, 'a conta antiga do "último jogo" (aceitava jogo futuro já sorteado) não pode voltar');
});
