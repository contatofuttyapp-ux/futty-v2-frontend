// Futty v2.0 — Rodada 29E: o que o mini sorteio do Onboarding sorteia (src/utils/miniSorteio.js). Puro.
//
// Uso: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CICLO_MS, FIGURINHAS, TEMPOS, TIMES, VAGAS_POR_TIME, agendaDoCiclo, ordemDoCiclo } from '../../src/utils/miniSorteio.js';

const NOMES = ['BRUNINHO', 'TIAGÃO', 'LÉO', 'PEDRÃO', 'RAFA', 'DUDU'];

test('figurinhas: as 6 do dono, nomes curtos em caixa alta, ids sem acento, arquivos em /onboarding/ (servidos do site)', () => {
  assert.deepEqual(FIGURINHAS.map((f) => f.nome).sort(), [...NOMES].sort());
  for (const f of FIGURINHAS) {
    assert.match(f.id, /^[a-z]+$/, `${f.id} tem de ser URL-safe`);
    assert.equal(f.arquivo, `/onboarding/${f.id}.webp`);
    assert.ok(f.nome.length <= 9 && f.nome === f.nome.toUpperCase());
  }
  assert.equal(FIGURINHAS.length, TIMES.length * VAGAS_POR_TIME, '6 figurinhas = 2 times × 3 vagas');
});

test('ordem do ciclo: uma permutação das 6, alternando A/B, cada time com as vagas 0..2', () => {
  for (let k = 0; k < 20; k += 1) {
    const ordem = ordemDoCiclo(k);
    assert.deepEqual(ordem.map((e) => e.id).sort(), FIGURINHAS.map((f) => f.id).sort(), `ciclo ${k}: faltou ou repetiu figurinha`);
    assert.deepEqual(ordem.map((e) => e.time), ['A', 'B', 'A', 'B', 'A', 'B'], `ciclo ${k}: a entrada alterna A/B`);
    for (const time of ['A', 'B']) {
      assert.deepEqual(ordem.filter((e) => e.time === time).map((e) => e.vaga), [0, 1, 2], `ciclo ${k}: as vagas do ${time}`);
    }
    assert.deepEqual(ordem.map((e) => e.ordem), [0, 1, 2, 3, 4, 5]);
  }
});

test('ordem do ciclo: o ciclo 0 é a natural (o que se vê sem JS); os seguintes embaralham, reproduzíveis e diferentes entre si', () => {
  assert.deepEqual(ordemDoCiclo(0).map((e) => e.id), FIGURINHAS.map((f) => f.id));
  const vistas = new Set();
  for (let k = 0; k < 8; k += 1) {
    const chave = ordemDoCiclo(k).map((e) => e.id).join(',');
    assert.equal(ordemDoCiclo(k).map((e) => e.id).join(','), chave, 'a mesma semente dá a mesma ordem');
    vistas.add(chave);
  }
  assert.equal(vistas.size, 8, 'oito ciclos seguidos, oito ordens diferentes');
});

test('agenda do ciclo: vazio 0,6 s → 6 entradas a cada 0,45 s → cheio depois do pop → segura 2,5 s → fade 0,4 s → ~7 s no total', () => {
  const a = agendaDoCiclo();
  assert.equal(a.entradas.length, 6);
  assert.equal(a.entradas[0], TEMPOS.vazioMs);
  for (let k = 1; k < 6; k += 1) assert.equal(a.entradas[k] - a.entradas[k - 1], TEMPOS.passoMs);
  assert.equal(a.cheioEm, a.entradas[5] + TEMPOS.popMs);
  assert.equal(a.saindoEm - a.cheioEm, TEMPOS.seguraMs);
  assert.equal(a.vazioEm - a.saindoEm, TEMPOS.fadeMs);
  assert.equal(a.fimEm, CICLO_MS);
  assert.ok(CICLO_MS >= 6500 && CICLO_MS <= 7500, `ciclo de ${CICLO_MS} ms`);
  assert.equal(TEMPOS.seguraMs, 2500);
  assert.equal(TEMPOS.passoMs, 450);
});
