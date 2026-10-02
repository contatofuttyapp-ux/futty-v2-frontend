// Futty v2.0 — Rodada 29E2: o que o mini sorteio do Onboarding sorteia e quando (src/utils/miniSorteio.js). Puro.
//
// Uso: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CICLO_MS, FIGURINHAS, TEMPOS, TIMES, VAGAS_POR_TIME, agendaDoCiclo, ordemDoCiclo, tiraDoRolo } from '../../src/utils/miniSorteio.js';

const NOMES = ['BRUNINHO', 'TIAGÃO', 'LÉO', 'PEDRÃO', 'RAFA', 'DUDU'];
const IDS = FIGURINHAS.map((f) => f.id);

test('figurinhas: as 6 do dono, nomes curtos em caixa alta, ids sem acento, arquivos em /onboarding/ (servidos do site)', () => {
  assert.deepEqual(FIGURINHAS.map((f) => f.nome).sort(), [...NOMES].sort());
  for (const f of FIGURINHAS) {
    assert.match(f.id, /^[a-z]+$/, `${f.id} tem de ser URL-safe`);
    assert.equal(f.arquivo, `/onboarding/${f.id}.webp`);
    assert.ok(f.nome.length <= 9 && f.nome === f.nome.toUpperCase());
  }
  assert.equal(FIGURINHAS.length, TIMES.length * VAGAS_POR_TIME, '6 figurinhas = 2 times × 3 vagas');
});

test('ordem do ciclo (a ordem em que os rolos travam): uma permutação das 6, alternando A/B, cada time com as vagas 0..2', () => {
  for (let k = 0; k < 20; k += 1) {
    const ordem = ordemDoCiclo(k);
    assert.deepEqual(ordem.map((e) => e.id).sort(), [...IDS].sort(), `ciclo ${k}: faltou ou repetiu figurinha`);
    assert.deepEqual(ordem.map((e) => e.time), ['A', 'B', 'A', 'B', 'A', 'B'], `ciclo ${k}: os rolos travam alternando A/B`);
    for (const time of ['A', 'B']) {
      assert.deepEqual(ordem.filter((e) => e.time === time).map((e) => e.vaga), [0, 1, 2], `ciclo ${k}: as vagas do ${time}`);
    }
    assert.deepEqual(ordem.map((e) => e.ordem), [0, 1, 2, 3, 4, 5]);
  }
});

test('ordem do ciclo: o ciclo 0 é a natural (o que se vê sem JS); os seguintes embaralham, reproduzíveis e diferentes entre si', () => {
  assert.deepEqual(ordemDoCiclo(0).map((e) => e.id), IDS);
  const vistas = new Set();
  for (let k = 0; k < 8; k += 1) {
    const chave = ordemDoCiclo(k).map((e) => e.id).join(',');
    assert.equal(ordemDoCiclo(k).map((e) => e.id).join(','), chave, 'a mesma semente dá a mesma ordem');
    vistas.add(chave);
  }
  assert.equal(vistas.size, 8, 'oito ciclos seguidos, oito ordens diferentes');
});

test('a tira de cada rolo: as 6 figurinhas, fixa por rolo, e os 6 rolos não mostram a mesma sequência', () => {
  const tiras = Array.from({ length: 6 }, (_, i) => tiraDoRolo(i));
  for (const [i, tira] of tiras.entries()) {
    assert.deepEqual([...tira].sort(), [...IDS].sort(), `rolo ${i}: faltou ou repetiu figurinha`);
    assert.deepEqual(tiraDoRolo(i), tira, `rolo ${i}: a tira é a mesma em todos os ciclos`);
  }
  assert.equal(new Set(tiras.map((t) => t.join(','))).size, 6, 'seis rolos, seis tiras diferentes');
});

test('agenda: giram 0,8 s → um rolo desacelera a cada 0,5 s e trava 1 s depois → o 6º trava em 4,3 s → pulso 0,8 s → seguram 2,5 s → fade 0,4 s → ~8 s', () => {
  const a = agendaDoCiclo();
  assert.equal(a.desaceleram.length, 6);
  assert.equal(a.travam.length, 6);
  assert.equal(a.desaceleram[0], TEMPOS.giroMs, 'o 1º rolo começa a desacelerar em 0,8 s');
  for (let k = 1; k < 6; k += 1) assert.equal(a.desaceleram[k] - a.desaceleram[k - 1], TEMPOS.passoMs, 'um rolo a cada 0,5 s');
  for (let k = 0; k < 6; k += 1) assert.equal(a.travam[k] - a.desaceleram[k], TEMPOS.desaceleraMs, 'desacelera ~1 s antes de travar');
  assert.equal(a.travam[0], 1800);
  assert.equal(a.cheioEm, a.travam[5], 'cheio = o 6º travou');
  assert.equal(a.cheioEm, 4300);
  assert.equal(a.pulsoFimEm - a.cheioEm, TEMPOS.pulsoMs, 'o pulso das réguas dura 0,8 s, uma vez');
  assert.equal(a.saindoEm - a.cheioEm, TEMPOS.seguraMs, 'seguram 2,5 s');
  assert.equal(a.girandoEm - a.saindoEm, TEMPOS.fadeMs, 'fade 0,4 s');
  assert.equal(a.fimEm - a.girandoEm, TEMPOS.respiroMs, 'os rolos giram um respiro antes do próximo ciclo');
  assert.equal(a.fimEm, CICLO_MS);
  assert.ok(CICLO_MS >= 7500 && CICLO_MS <= 8500, `ciclo de ${CICLO_MS} ms (~8 s)`);
  assert.equal(TEMPOS.giroMs, 800);
  assert.equal(TEMPOS.passoMs, 500);
  assert.equal(TEMPOS.seguraMs, 2500);
  assert.equal(TEMPOS.fadeMs, 400);
  assert.ok(a.pulsoFimEm < a.saindoEm, 'o pulso acaba antes de os times soltarem');
});

test('agenda: cada rolo só desacelera depois de o anterior ter começado e os instantes são crescentes (nenhum timer fora de ordem)', () => {
  const a = agendaDoCiclo();
  const tudo = [...a.desaceleram, ...a.travam, a.pulsoFimEm, a.saindoEm, a.girandoEm, a.fimEm];
  for (let i = 1; i < a.desaceleram.length; i += 1) assert.ok(a.desaceleram[i] > a.desaceleram[i - 1]);
  for (let i = 1; i < a.travam.length; i += 1) assert.ok(a.travam[i] > a.travam[i - 1]);
  assert.ok(tudo.every((t) => Number.isInteger(t) && t > 0));
});
