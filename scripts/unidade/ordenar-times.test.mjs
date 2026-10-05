// Futty v2.0 — Rodada 29Y: a ordem da lista de times do Gabinete (src/utils/ordenarTimes.js).
// Trava: a ordem de dicionário PT-BR (sem maiúscula nem acento), o empate pelo nome, o clique que inverte e a escolha lembrada.
//
// Uso: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CRITERIOS, CRITERIO_PADRAO, CHAVE_LEMBRETE, ordenarTimes, proximoCriterio, colunaDoCriterio, sentidoDoCriterio,
  lerCriterioLembrado, guardarCriterio,
} from '../../src/utils/ordenarTimes.js';

const T = (nome, extra = {}) => ({ id: nome, nome, nr_membros: 0, created_at: '2026-01-01T00:00:00Z', suspensa: false, ...extra });
const nomesDe = (lista) => lista.map((t) => t.nome);

// Maiúsculas, acentos e a ordem de dicionário: "gajos" junto do G, "Éden" junto do E.
const MISTURA = ['Zebra', 'gajos', 'Éden', 'Abacaxi', 'Gaviões', 'Edna', 'ábaco'];
const A_Z = ['Abacaxi', 'ábaco', 'Éden', 'Edna', 'gajos', 'Gaviões', 'Zebra'];

test('Nome A–Z é ordem de dicionário PT-BR: sem diferença de maiúscula nem de acento', () => {
  assert.deepEqual(nomesDe(ordenarTimes(MISTURA.map((n) => T(n)))), A_Z);
  // Prova que não é a ordem de código: a de código põe "Zebra" antes de "gajos" e "Éden" no fim.
  assert.notDeepEqual(MISTURA.slice().sort(), A_Z);
});

test('números dentro do nome: "Time 2" vem antes de "Time 10"', () => {
  assert.deepEqual(nomesDe(ordenarTimes([T('Time 10'), T('Time 2'), T('Time 1')])), ['Time 1', 'Time 2', 'Time 10']);
});

test('Nome (Z–A) é a inversa exata do A–Z', () => {
  assert.deepEqual(nomesDe(ordenarTimes(MISTURA.map((n) => T(n)), 'nome_za')), A_Z.slice().reverse());
});

test('ordenar devolve uma cópia: a lista de entrada fica como veio', () => {
  const entrada = [T('Beta'), T('Alfa')];
  ordenarTimes(entrada);
  assert.deepEqual(nomesDe(entrada), ['Beta', 'Alfa']);
});

test('um critério desconhecido cai no Nome A–Z (e null/undefined viram lista vazia)', () => {
  assert.deepEqual(nomesDe(ordenarTimes(MISTURA.map((n) => T(n)), 'lixo')), A_Z);
  assert.deepEqual(ordenarTimes(undefined), []);
});

test('Mais membros e Menos membros; empate desempata pelo nome A–Z nas duas direções', () => {
  const lista = [T('Vila', { nr_membros: 12 }), T('Aço', { nr_membros: 12 }), T('Bola', { nr_membros: 3 }), T('Cruz', { nr_membros: 40 })];
  assert.deepEqual(nomesDe(ordenarTimes(lista, 'mais_membros')), ['Cruz', 'Aço', 'Vila', 'Bola']);
  assert.deepEqual(nomesDe(ordenarTimes(lista, 'menos_membros')), ['Bola', 'Aço', 'Vila', 'Cruz']);
});

test('Mais novos e Mais antigos pela data de criação; empate pelo nome', () => {
  const lista = [
    T('Bola', { created_at: '2026-03-01T10:00:00Z' }),
    T('Aço', { created_at: '2026-01-01T10:00:00Z' }),
    T('Cruz', { created_at: '2026-03-01T10:00:00Z' }),
  ];
  assert.deepEqual(nomesDe(ordenarTimes(lista, 'mais_novos')), ['Bola', 'Cruz', 'Aço']);
  assert.deepEqual(nomesDe(ordenarTimes(lista, 'mais_antigos')), ['Aço', 'Bola', 'Cruz']);
});

test('Suspensos primeiro e Ativos primeiro; empate pelo nome', () => {
  const lista = [T('Zeta'), T('Beta', { suspensa: true }), T('Alfa'), T('Gama', { suspensa: true })];
  assert.deepEqual(nomesDe(ordenarTimes(lista, 'suspensos_primeiro')), ['Beta', 'Gama', 'Alfa', 'Zeta']);
  assert.deepEqual(nomesDe(ordenarTimes(lista, 'ativos_primeiro')), ['Alfa', 'Zeta', 'Beta', 'Gama']);
});

test('os oito critérios: cada coluna tem o seu par, um ▲ (asc) e um ▼ (desc)', () => {
  assert.equal(CRITERIOS.length, 8);
  for (const coluna of ['nome', 'membros', 'criado', 'estado']) {
    assert.deepEqual(CRITERIOS.filter((c) => c.coluna === coluna).map((c) => c.sentido).sort(), ['asc', 'desc'], coluna);
  }
});

test('clicar no título: a 1ª vez vale o critério natural da coluna; a 2ª inverte; outra coluna recomeça pelo seu primeiro', () => {
  assert.equal(proximoCriterio('nome_az', 'nome'), 'nome_za');
  assert.equal(proximoCriterio('nome_za', 'nome'), 'nome_az');
  assert.equal(proximoCriterio('nome_az', 'membros'), 'mais_membros');
  assert.equal(proximoCriterio('mais_membros', 'membros'), 'menos_membros');
  assert.equal(proximoCriterio('menos_membros', 'membros'), 'mais_membros');
  assert.equal(proximoCriterio('mais_membros', 'criado'), 'mais_novos');
  assert.equal(proximoCriterio('mais_novos', 'criado'), 'mais_antigos');
  assert.equal(proximoCriterio('mais_antigos', 'estado'), 'suspensos_primeiro');
  assert.equal(proximoCriterio('suspensos_primeiro', 'estado'), 'ativos_primeiro');
  assert.equal(proximoCriterio('ativos_primeiro', 'nome'), 'nome_az');
});

test('coluna e sentido de cada critério (é o que pinta a seta ▲/▼); critério estranho lê como o padrão', () => {
  assert.equal(colunaDoCriterio('mais_membros'), 'membros');
  assert.equal(sentidoDoCriterio('nome_az'), 'asc');
  assert.equal(sentidoDoCriterio('nome_za'), 'desc');
  assert.equal(sentidoDoCriterio('suspensos_primeiro'), 'desc');
  assert.equal(colunaDoCriterio('lixo'), 'nome');
  assert.equal(sentidoDoCriterio(undefined), 'asc');
});

// ─── a escolha lembrada (localStorage, com try/catch) ─────────────────────────────────────────────────────────────────────────────
function armazenamentoFalso(dados = {}) {
  const m = new Map(Object.entries(dados));
  return { _m: m, getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => { m.set(k, String(v)); } };
}

// Troca o localStorage global só durante `fn`: o Node 24 não o tem ligado por padrão, e um teste não pode vazar o seu para os outros.
function comArmazenamento(falso, fn) {
  const antes = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  if (falso === undefined) {
    if (antes) delete globalThis.localStorage;
  } else {
    Object.defineProperty(globalThis, 'localStorage', { value: falso, configurable: true, writable: true });
  }
  try {
    return fn();
  } finally {
    if (antes) Object.defineProperty(globalThis, 'localStorage', antes);
    else delete globalThis.localStorage;
  }
}

test('a escolha fica lembrada no aparelho e volta igual na visita seguinte', () => {
  const aparelho = armazenamentoFalso();
  comArmazenamento(aparelho, () => {
    assert.equal(lerCriterioLembrado(), CRITERIO_PADRAO, 'primeira visita: Nome A–Z');
    guardarCriterio('menos_membros');
    assert.equal(aparelho._m.get(CHAVE_LEMBRETE), 'menos_membros');
    assert.equal(lerCriterioLembrado(), 'menos_membros');
  });
});

test('um valor estranho guardado no aparelho cai no Nome A–Z (inclusive "__proto__")', () => {
  for (const lixo of ['lixo', '__proto__', '']) {
    comArmazenamento(armazenamentoFalso({ [CHAVE_LEMBRETE]: lixo }), () => {
      assert.equal(lerCriterioLembrado(), CRITERIO_PADRAO, `"${lixo}"`);
    });
  }
});

test('sem armazenamento (bloqueado, modo privado ou inexistente): não quebra e vale o padrão nesta visita', () => {
  const bloqueado = {
    getItem() { throw new Error('SecurityError'); },
    setItem() { throw new Error('QuotaExceededError'); },
  };
  comArmazenamento(bloqueado, () => {
    assert.equal(lerCriterioLembrado(), CRITERIO_PADRAO);
    assert.doesNotThrow(() => guardarCriterio('mais_novos'));
  });
  comArmazenamento(undefined, () => {
    assert.equal(lerCriterioLembrado(), CRITERIO_PADRAO);
    assert.doesNotThrow(() => guardarCriterio('mais_novos'));
  });
});
