// Futty v2.0 — Rodada 30E (item 2): a ordem da lista "Pessoas" do Gabinete (src/utils/ordenarPessoas.js).
// Mesma régua da lista de times (ordenar-times.test.mjs): ordem de dicionário PT-BR, sem maiúscula nem
// acento; o motor (routes/superadmin.js) garante a ordem TOTAL entre páginas — ver o teste de backend
// tests/super-users-ordem-alfabetica.test.js.
//
// Uso: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ordenarPessoas } from '../../src/utils/ordenarPessoas.js';

const RAIZ = fileURLToPath(new URL('../../', import.meta.url));
const ler = (rel) => fs.readFileSync(path.join(RAIZ, rel), 'utf8');

const P = (nome, extra = {}) => ({ id: nome, nome, ...extra });
const nomesDe = (lista) => lista.map((u) => u.nome);

// A mesma mistura do teste de times: maiúsculas e acentos não baralham a ordem.
const MISTURA = ['Zebra', 'gajos', 'Éden', 'Abacaxi', 'Gaviões', 'Edna', 'ábaco'];
const A_Z = ['Abacaxi', 'ábaco', 'Éden', 'Edna', 'gajos', 'Gaviões', 'Zebra'];

test('30E-2 · Pessoas sai em ordem de dicionário PT-BR: sem diferença de maiúscula nem de acento', () => {
  assert.deepEqual(nomesDe(ordenarPessoas(MISTURA.map((n) => P(n)))), A_Z);
  assert.notDeepEqual(MISTURA.slice().sort(), A_Z, 'prova que não é a ordem de código');
});

test('30E-2 · sem nome (null), vira string vazia na comparação e fica antes de A–Z (nunca quebra)', () => {
  assert.deepEqual(nomesDe(ordenarPessoas([P('Bruno'), { id: 'x', nome: null }, P('Ana')])), [null, 'Ana', 'Bruno']);
});

test('30E-2 · ordenar devolve uma cópia: a lista de entrada fica como veio; lista vazia ou ausente não quebra', () => {
  const entrada = [P('Beta'), P('Alfa')];
  ordenarPessoas(entrada);
  assert.deepEqual(nomesDe(entrada), ['Beta', 'Alfa']);
  assert.deepEqual(ordenarPessoas([]), []);
  assert.deepEqual(ordenarPessoas(undefined), []);
});

test('30E-2 · a aba Pessoas do Gabinete usa ordenarPessoas na lista que chega da página', () => {
  const tela = ler('src/pages/gabinete/PessoasTimes.jsx');
  assert.match(tela, /import \{ ordenarPessoas \} from '\.\.\/\.\.\/utils\/ordenarPessoas';/);
  assert.match(tela, /const users = useMemo\(\(\) => ordenarPessoas\(data\?\.users\), \[data\]\);/);
});
