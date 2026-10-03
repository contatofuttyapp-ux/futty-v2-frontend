// Futty v2.0 — Rodada 29J, achado 120 (REGRESSÃO): a tela do sorteio dizia "ainda não foi
// realizado" sempre que `!resultado`, mesmo quando a causa era um ERRO da API (sessão caída,
// rede fora) e o sorteio estava intacto no banco (sorteio_realizado: true, times_resultado com
// os times completos). Este teste falha se esse estado voltar a se confundir com "nao_feito".
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { estadoSorteio } from '../../src/utils/estadoSorteio.js';

const RESULTADO_COMPLETO = { seed: 3303, times: [{ nome: 'Time A', jogadores: [] }, { nome: 'Time B', jogadores: [] }] };

test('sorteio_realizado true + times_resultado completo: carrega, SEM erro → "pronto" (NUNCA "ainda não foi realizado")', () => {
  const estado = estadoSorteio({ loading: false, error: '', resultado: RESULTADO_COMPLETO });
  assert.equal(estado, 'pronto');
  assert.notEqual(estado, 'nao_feito', 'achado 120: um sorteio feito não pode mostrar a mensagem de "ainda não foi realizado"');
});

test('erro da API (sessão caída, rede fora) com o sorteio intacto no banco → "erro", nunca "nao_feito"', () => {
  // A tela não tem o `resultado` em mãos porque a IDA falhou, não porque o sorteio não existe.
  const estado = estadoSorteio({ loading: false, error: 'Sua sessão terminou. Entre de novo.', resultado: null });
  assert.equal(estado, 'erro');
});

test('erro mesmo com `resultado` de uma leitura anterior ainda em memória → o erro da leitura atual manda', () => {
  const estado = estadoSorteio({ loading: false, error: 'Sem internet agora. Tente de novo.', resultado: RESULTADO_COMPLETO });
  assert.equal(estado, 'erro');
});

test('carregando manda sobre tudo (erro antigo, resultado antigo) — a primeira leitura ainda está no ar', () => {
  assert.equal(estadoSorteio({ loading: true, error: 'algo', resultado: RESULTADO_COMPLETO }), 'carregando');
  assert.equal(estadoSorteio({ loading: true, error: '', resultado: null }), 'carregando');
});

test('sem erro, sem resultado, não está carregando: o sorteio de verdade ainda não foi feito → "nao_feito"', () => {
  assert.equal(estadoSorteio({ loading: false, error: '', resultado: null }), 'nao_feito');
  assert.equal(estadoSorteio({ loading: false, error: '', resultado: undefined }), 'nao_feito');
});
