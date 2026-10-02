// Futty v2.0 — Rodada 29E2/29E3: o que o mini sorteio do Onboarding sorteia e quando (src/utils/miniSorteio.js). Puro.
// 29E3 (2-out, dono): 4 jogadores por time — 8 figurinhas, 8 rolos; LÉO virou GONÇALO (arquivo goncalo.webp).
//
// Uso: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CICLO_MS, FIGURINHAS, TEMPOS, TIMES, VAGAS_POR_TIME, agendaDoCiclo, ordemDoCiclo, tiraDoRolo } from '../../src/utils/miniSorteio.js';

const NOMES = ['BRUNINHO', 'TIAGÃO', 'GONÇALO', 'PEDRÃO', 'RAFA', 'DUDU', 'NANDO', 'CAIO'];
const IDS = FIGURINHAS.map((f) => f.id);
const N = 8;

test('figurinhas: as 8 do dono, nomes curtos em caixa alta, ids sem acento, arquivos em /onboarding/ (servidos do site)', () => {
  assert.deepEqual(FIGURINHAS.map((f) => f.nome).sort(), [...NOMES].sort());
  for (const f of FIGURINHAS) {
    assert.match(f.id, /^[a-z]+$/, `${f.id} tem de ser URL-safe`);
    assert.equal(f.arquivo, `/onboarding/${f.id}.webp`);
    assert.ok(f.nome.length <= 'BRUNINHO'.length && f.nome === f.nome.toUpperCase(), `${f.nome}: cabe na cartinha de 56 px como BRUNINHO cabe`);
  }
  assert.equal(FIGURINHAS.length, N);
  assert.equal(FIGURINHAS.length, TIMES.length * VAGAS_POR_TIME, '8 figurinhas = 2 times × 4 vagas');
  assert.equal(VAGAS_POR_TIME, 4, '4 jogadores por time (dono, 29E3)');
});

test('GONÇALO: o nome leva cedilha, o id e o arquivo não (goncalo.webp); LÉO/leo saiu', () => {
  const g = FIGURINHAS.find((f) => f.id === 'goncalo');
  assert.ok(g, 'existe a figurinha goncalo');
  assert.equal(g.nome, 'GONÇALO');
  assert.equal(g.arquivo, '/onboarding/goncalo.webp');
  assert.ok(!FIGURINHAS.some((f) => f.id === 'leo' || f.nome === 'LÉO'));
  assert.ok(FIGURINHAS.some((f) => f.id === 'nando' && f.nome === 'NANDO'));
  assert.ok(FIGURINHAS.some((f) => f.id === 'caio' && f.nome === 'CAIO'));
});

test('ordem do ciclo (a ordem em que os rolos travam): uma permutação das 8, alternando A/B, cada time com as vagas 0..3', () => {
  for (let k = 0; k < 20; k += 1) {
    const ordem = ordemDoCiclo(k);
    assert.deepEqual(ordem.map((e) => e.id).sort(), [...IDS].sort(), `ciclo ${k}: faltou ou repetiu figurinha`);
    assert.deepEqual(ordem.map((e) => e.time), ['A', 'B', 'A', 'B', 'A', 'B', 'A', 'B'], `ciclo ${k}: os rolos travam alternando A/B`);
    for (const time of ['A', 'B']) {
      assert.deepEqual(ordem.filter((e) => e.time === time).map((e) => e.vaga), [0, 1, 2, 3], `ciclo ${k}: as vagas do ${time}`);
    }
    assert.deepEqual(ordem.map((e) => e.ordem), [0, 1, 2, 3, 4, 5, 6, 7]);
  }
});

test('ordem do ciclo: o ciclo 0 é a natural (o que se vê sem JS: A = bruninho, gonçalo, rafa, nando · B = tiagão, pedrão, dudu, caio); os seguintes embaralham, reproduzíveis e diferentes entre si', () => {
  assert.deepEqual(ordemDoCiclo(0).map((e) => e.id), IDS);
  const natural = ordemDoCiclo(0);
  assert.deepEqual(natural.filter((e) => e.time === 'A').map((e) => e.id), ['bruninho', 'goncalo', 'rafa', 'nando']);
  assert.deepEqual(natural.filter((e) => e.time === 'B').map((e) => e.id), ['tiagao', 'pedrao', 'dudu', 'caio']);
  const vistas = new Set();
  for (let k = 0; k < 8; k += 1) {
    const chave = ordemDoCiclo(k).map((e) => e.id).join(',');
    assert.equal(ordemDoCiclo(k).map((e) => e.id).join(','), chave, 'a mesma semente dá a mesma ordem');
    vistas.add(chave);
  }
  assert.equal(vistas.size, 8, 'oito ciclos seguidos, oito ordens diferentes');
});

test('a tira de cada rolo: as 8 figurinhas, fixa por rolo, e os 8 rolos não mostram a mesma sequência', () => {
  const tiras = Array.from({ length: N }, (_, i) => tiraDoRolo(i));
  for (const [i, tira] of tiras.entries()) {
    assert.deepEqual([...tira].sort(), [...IDS].sort(), `rolo ${i}: faltou ou repetiu figurinha`);
    assert.deepEqual(tiraDoRolo(i), tira, `rolo ${i}: a tira é a mesma em todos os ciclos`);
  }
  assert.equal(new Set(tiras.map((t) => t.join(','))).size, N, 'oito rolos, oito tiras diferentes');
});

test('agenda (29H-B): giram 0,4 s → um rolo desacelera a cada 0,75 s e trava 1,5 s depois → o 8º trava em 7,15 s → pulso 0,8 s → seguram 2,5 s → fade 0,4 s → ~10,7 s', () => {
  const a = agendaDoCiclo();
  assert.equal(a.desaceleram.length, N);
  assert.equal(a.travam.length, N);
  assert.equal(a.desaceleram[0], TEMPOS.giroMs, 'o 1º rolo começa a desacelerar em 0,4 s');
  for (let k = 1; k < N; k += 1) assert.equal(a.desaceleram[k] - a.desaceleram[k - 1], TEMPOS.passoMs, 'um rolo a cada 0,75 s');
  for (let k = 0; k < N; k += 1) assert.equal(a.travam[k] - a.desaceleram[k], TEMPOS.desaceleraMs, 'desacelera 1,5 s antes de travar');
  assert.equal(a.travam[0], 1900);
  assert.equal(a.cheioEm, a.travam[N - 1], 'cheio = o 8º travou');
  assert.equal(a.cheioEm, 7150);
  assert.equal(a.pulsoFimEm - a.cheioEm, TEMPOS.pulsoMs, 'o pulso das réguas dura 0,8 s, uma vez');
  assert.equal(a.saindoEm - a.cheioEm, TEMPOS.seguraMs, 'seguram 2,5 s');
  assert.equal(a.girandoEm - a.saindoEm, TEMPOS.fadeMs, 'fade 0,4 s');
  assert.equal(a.fimEm - a.girandoEm, TEMPOS.respiroMs, 'os rolos giram um respiro antes do próximo ciclo');
  assert.equal(a.fimEm, CICLO_MS);
  assert.equal(CICLO_MS, 10650);
  assert.ok(CICLO_MS >= 10000 && CICLO_MS <= 11500, `ciclo de ${CICLO_MS} ms (~10,7 s)`);
  // A regra do dono (item 40) em números: giro inicial pela METADE do que era (800), revelação 1,5× (passo 500 → 750; a desaceleração
  // na mesma proporção, 1000 → 1500) e a comemoração igual (pulso 800, segura 2500).
  assert.equal(TEMPOS.giroMs, 400);
  assert.equal(TEMPOS.passoMs, 750);
  assert.equal(TEMPOS.desaceleraMs, 1500);
  assert.equal(TEMPOS.passoMs / 500, 1.5);
  assert.equal(TEMPOS.desaceleraMs / 1000, 1.5);
  assert.equal(TEMPOS.pulsoMs, 800);
  assert.equal(TEMPOS.seguraMs, 2500);
  assert.equal(TEMPOS.fadeMs, 400);
  assert.equal(TEMPOS.respiroMs, 600);
  assert.ok(a.pulsoFimEm < a.saindoEm, 'o pulso acaba antes de os times soltarem');
});

test('agenda: cada rolo só desacelera depois de o anterior ter começado e os instantes são crescentes (nenhum timer fora de ordem)', () => {
  const a = agendaDoCiclo();
  const tudo = [...a.desaceleram, ...a.travam, a.pulsoFimEm, a.saindoEm, a.girandoEm, a.fimEm];
  for (let i = 1; i < a.desaceleram.length; i += 1) assert.ok(a.desaceleram[i] > a.desaceleram[i - 1]);
  for (let i = 1; i < a.travam.length; i += 1) assert.ok(a.travam[i] > a.travam[i - 1]);
  assert.ok(tudo.every((t) => Number.isInteger(t) && t > 0));
});

test('versão da imagem (29H, item 37): com __VERSOES_ONBOARDING__ o arquivo leva ?v=<hash>; sem ela o caminho fica limpo', async () => {
  globalThis.__VERSOES_ONBOARDING__ = { bruninho: 'abcd1234', goncalo: '0f0f0f0f' };
  try {
    const m = await import('../../src/utils/miniSorteio.js?versionado');
    assert.equal(m.FIGURINHAS.find((f) => f.id === 'bruninho').arquivo, '/onboarding/bruninho.webp?v=abcd1234');
    assert.equal(m.FIGURINHAS.find((f) => f.id === 'goncalo').arquivo, '/onboarding/goncalo.webp?v=0f0f0f0f');
    assert.equal(m.FIGURINHAS.find((f) => f.id === 'rafa').arquivo, '/onboarding/rafa.webp', 'sem versão no mapa, o caminho fica limpo');
  } finally {
    delete globalThis.__VERSOES_ONBOARDING__;
  }
});
