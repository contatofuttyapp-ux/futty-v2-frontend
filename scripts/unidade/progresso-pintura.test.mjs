// Futty v2.0 — Rodada 29B (bloco 2, A): a barra de progresso HONESTA da pintura (src/utils/progressoPintura.js).
// Avança pelo tempo típico até 90%, segura em "finalizando…", nunca 100% antes da imagem, passa de 90 s → "tá demorando";
// e o que o app guarda para seguir uma pintura que saiu da tela.
//
// Uso: npm test
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  ETAPAS_PINTURA, LIMITE_DEMORA_S, TEXTO_DEMORANDO, TEXTO_FINALIZANDO, VALIDADE_GUARDADA_MS,
  gravarPinturaGuardada, lerPinturaGuardada, limparPinturaGuardada, progressoDaPintura, situacaoDaPintura,
} from '../../src/utils/progressoPintura.js';

// localStorage mínimo, só para o Node.
const mem = new Map();
globalThis.localStorage = {
  getItem: (k) => (mem.has(k) ? mem.get(k) : null),
  setItem: (k, v) => { mem.set(k, String(v)); },
  removeItem: (k) => { mem.delete(k); },
};
beforeEach(() => mem.clear());

const s = (segundos, extra = {}) => situacaoDaPintura({ decorridoMs: segundos * 1000, estimativaSegundos: 40, ...extra });

test('a barra avança pelo tempo estimado até 90% e segura ali — nunca passa, nunca chega a 100%', () => {
  assert.equal(progressoDaPintura({ decorridoMs: 0, estimativaSegundos: 40 }), 0);
  assert.equal(progressoDaPintura({ decorridoMs: 20000, estimativaSegundos: 40 }), 0.45);
  assert.equal(progressoDaPintura({ decorridoMs: 40000, estimativaSegundos: 40 }), 0.9);
  assert.equal(progressoDaPintura({ decorridoMs: 4000000, estimativaSegundos: 40 }), 0.9);
  assert.equal(progressoDaPintura({ decorridoMs: -5, estimativaSegundos: 40 }), 0);
  assert.equal(progressoDaPintura({ decorridoMs: 22500 }), 0.45, 'sem estimativa vale os 45 s de sempre');
  for (const seg of [0, 5, 20, 39, 40, 41, 90, 300, 3000]) assert.ok(s(seg).percentual <= 90, `${seg} s: ${s(seg).percentual}%`);
});

test('o texto: a etapa enquanto dentro do tempo, "finalizando…" depois dele, e o aviso de demora passados 90 s', () => {
  assert.equal(s(3, { etapa: 'preparando' }).rotulo, 'Preparando a foto…');
  assert.equal(s(15, { etapa: 'pintando' }).rotulo, 'Pintando o uniforme…');
  assert.equal(s(30, { etapa: 'acabamento' }).rotulo, 'Acabamento…');
  const fim = s(41, { etapa: 'pintando' });
  assert.equal(fim.rotulo, TEXTO_FINALIZANDO);
  assert.equal(fim.finalizando, true);
  assert.equal(fim.demorando, false);
  assert.equal(fim.percentual, 90, 'segura em 90%');

  const tarde = s(LIMITE_DEMORA_S, { etapa: 'pintando' });
  assert.equal(tarde.demorando, true);
  assert.equal(tarde.rotulo, TEXTO_DEMORANDO);
  assert.match(tarde.rotulo, /tá demorando mais que o normal, a gente te avisa quando ficar pronta/i);
  assert.equal(s(LIMITE_DEMORA_S - 1, { etapa: 'pintando' }).demorando, false, '89 s ainda não é demora');
  assert.equal(tarde.percentual, 90);
});

test('as etapas nomeadas, na ordem do pedido do dono, e qual está feita / atual / por vir', () => {
  assert.deepEqual(ETAPAS_PINTURA.map((e) => e.id), ['preparando', 'pintando', 'acabamento', 'pronta']);
  assert.deepEqual(ETAPAS_PINTURA.map((e) => e.rotulo), ['Preparando a foto', 'Pintando o uniforme', 'Acabamento', 'Pronta']);
  assert.deepEqual(s(10, { etapa: 'pintando' }).etapas.map((e) => e.estado), ['feita', 'atual', 'depois', 'depois']);
  assert.deepEqual(s(10, { etapa: 'preparando' }).etapas.map((e) => e.estado), ['atual', 'depois', 'depois', 'depois']);
  assert.deepEqual(s(10, { etapa: 'acabamento' }).etapas.map((e) => e.estado), ['feita', 'feita', 'atual', 'depois']);
  assert.equal(s(10, { etapa: 'inventada' }).etapa, 'preparando', 'etapa desconhecida cai na primeira');
  assert.equal(situacaoDaPintura().percentual, 0, 'sem nada, a barra está vazia');
});

// ── A pintura que o app segue ────────────────────────────────────────────────

test('guarda a pintura da MESMA pessoa e a devolve com o tempo que passou contando como pintura rolando', () => {
  const t0 = 1_000_000;
  gravarPinturaGuardada('ana', { jobId: 'job-1', kit: 'dark-gold', estreia: false, estimativaSegundos: 38, decorridoMs: 0 }, t0);
  const volta = lerPinturaGuardada('ana', t0 + 20000);
  assert.equal(volta.jobId, 'job-1');
  assert.equal(volta.kit, 'dark-gold');
  assert.equal(volta.estimativaSegundos, 38);
  assert.equal(volta.decorridoMs, 20000);
  assert.equal(volta.baseEm, t0 + 20000);
  assert.equal(volta.etapa, 'preparando');
  assert.equal(volta.estreia, false);
});

test('outra pessoa no mesmo aparelho, pintura velha demais e sessão sem id não recebem nada (e a velha é apagada)', () => {
  const t0 = 2_000_000;
  gravarPinturaGuardada('ana', { jobId: 'job-2', kit: 'dark-gold', estimativaSegundos: 40, decorridoMs: 0 }, t0);
  assert.equal(lerPinturaGuardada('beto', t0 + 1000), null);
  assert.equal(lerPinturaGuardada(null, t0 + 1000), null);
  assert.equal(lerPinturaGuardada('ana', t0 + VALIDADE_GUARDADA_MS + 1), null);
  assert.equal(mem.size, 0, 'a pintura vencida sai do aparelho');
});

test('limpar apaga; gravar sem jobId ou sem pessoa não grava; storage quebrado nunca derruba a tela', () => {
  gravarPinturaGuardada('ana', { jobId: 'job-3', estimativaSegundos: 40 });
  limparPinturaGuardada();
  assert.equal(lerPinturaGuardada('ana'), null);
  gravarPinturaGuardada('ana', {});
  gravarPinturaGuardada(null, { jobId: 'x' });
  assert.equal(mem.size, 0);

  const original = globalThis.localStorage;
  globalThis.localStorage = { getItem() { throw new Error('bloqueado'); }, setItem() { throw new Error('bloqueado'); }, removeItem() { throw new Error('bloqueado'); } };
  try {
    assert.doesNotThrow(() => gravarPinturaGuardada('ana', { jobId: 'y', estimativaSegundos: 40 }));
    assert.equal(lerPinturaGuardada('ana'), null);
    assert.doesNotThrow(() => limparPinturaGuardada());
  } finally {
    globalThis.localStorage = original;
  }
});
