// Futty v2.0 — Rodada 29J, achado 115: "Futuros" vinha de trás para frente (o jogo mais distante
// no topo, o próximo por último) porque a API devolve `data` decrescente e a tela não reordenava.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { separarFuturosPassados } from '../../src/utils/jogosFuturoPassado.js';

const AGORA = new Date('2026-10-03T12:00:00Z').getTime();
const jogo = (id, data, extra = {}) => ({ id, data, status: 'agendado', ...extra });

test('achado 115: "futuros" sai crescente (o PRÓXIMO jogo primeiro) mesmo chegando decrescente da API', () => {
  // A API devolve nesta ordem (decrescente): 13/10, 10/10, 8/10 — exatamente a reprodução do achado.
  const games = [jogo('a', '2026-10-13T20:00:00Z'), jogo('b', '2026-10-10T12:00:00Z'), jogo('c', '2026-10-08T23:00:00Z')];
  const { futuros } = separarFuturosPassados(games, AGORA);
  assert.deepEqual(futuros.map((g) => g.id), ['c', 'b', 'a'], 'qui. 8/10, sáb. 10/10, 13/10 — o próximo no topo');
});

test('"passados" mantém a ordem que chegou (decrescente: o mais recente primeiro)', () => {
  const games = [jogo('futuro', '2026-10-13T20:00:00Z'), jogo('recente', '2026-10-01T20:00:00Z'), jogo('antigo', '2026-09-20T20:00:00Z')];
  const { passados } = separarFuturosPassados(games, AGORA);
  assert.deepEqual(passados.map((g) => g.id), ['recente', 'antigo']);
});

test('cancelado no futuro continua em "futuros" (visual distinto, não sai da lista); terminado vai para "passados" mesmo com data futura', () => {
  const games = [
    jogo('cancelado-futuro', '2026-10-20T20:00:00Z', { status: 'cancelado' }),
    jogo('terminado-no-futuro', '2026-10-25T20:00:00Z', { status: 'terminado' }),
  ];
  const { futuros, passados } = separarFuturosPassados(games, AGORA);
  assert.deepEqual(futuros.map((g) => g.id), ['cancelado-futuro']);
  assert.deepEqual(passados.map((g) => g.id), ['terminado-no-futuro']);
});

test('sem jogos, ou sem `games` (null/undefined): as duas listas saem vazias, sem lançar', () => {
  assert.deepEqual(separarFuturosPassados([], AGORA), { futuros: [], passados: [] });
  assert.deepEqual(separarFuturosPassados(null, AGORA), { futuros: [], passados: [] });
  assert.deepEqual(separarFuturosPassados(undefined, AGORA), { futuros: [], passados: [] });
});
