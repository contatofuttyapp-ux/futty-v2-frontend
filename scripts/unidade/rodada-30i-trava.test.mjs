// Futty v2.0 — Rodada 30I, item 6: o resultado abre 5 minutos depois do início do jogo (no motor: backend/tests/trava-resultado.test.js). Aqui a mesma
// conta nas telas e o texto do editor fechado; o jogo histórico ("Jogo passado") segue sem trava.
//
// Uso: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ESPERA_DO_RESULTADO_MS, resultadoAbreEm, resultadoJaAbriu } from '../../src/utils/resultadoDoJogo.js';

const RAIZ = fileURLToPath(new URL('../../', import.meta.url));
const ler = (rel) => fs.readFileSync(path.join(RAIZ, rel), 'utf8').replace(/\r\n/g, '\n');
const semComentarios = (texto) => texto.replace(/\/\*[\s\S]*?\*\//g, '').split('\n').filter((l) => !/^\s*\/\//.test(l)).join('\n');
const MIN = 60000;

test('a espera é de 5 minutos (a mesma do motor); abre aos 5 minutos exatos, não antes', () => {
  assert.equal(ESPERA_DO_RESULTADO_MS, 5 * MIN);
  const inicio = Date.parse('2026-10-18T23:00:00Z');
  const jogo = { data: '2026-10-18T23:00:00Z' };
  assert.equal(resultadoAbreEm(jogo), inicio + 5 * MIN);
  assert.equal(resultadoJaAbriu(jogo, inicio - MIN), false);
  assert.equal(resultadoJaAbriu(jogo, inicio), false, 'no início ainda não abriu (antes abria)');
  assert.equal(resultadoJaAbriu(jogo, inicio + 5 * MIN - 1), false);
  assert.equal(resultadoJaAbriu(jogo, inicio + 5 * MIN), true);
});

test('jogo histórico não tem trava; jogo sem data não abre', () => {
  assert.equal(resultadoJaAbriu({ historico: true, data: '2999-01-01T00:00:00Z' }), true);
  assert.equal(resultadoJaAbriu({ historico: true }), true);
  assert.equal(resultadoJaAbriu({}), false);
  assert.equal(resultadoAbreEm({}), null);
  assert.equal(resultadoAbreEm(null), null);
});

test('o editor fechado diz a regra e a hora em que abre (no relógio do time); o Jogo passado (devolver) não tem trava', () => {
  const editor = ler('src/components/ResultadoEditor.jsx');
  assert.match(semComentarios(editor), /const podeSalvar = devolver \|\| resultadoJaAbriu\(game\);/);
  assert.match(editor, /O resultado abre 5 minutos depois do início do jogo\{resultadoAbreEm\(game\) \? `, às \$\{formatarHora\(new Date\(resultadoAbreEm\(game\)\)\.toISOString\(\), fuso\)\}` : ''\}\./);
  assert.doesNotMatch(editor, /jaComecouJogo|só pode ser registrado depois do início/, 'a conta antiga (no horário marcado) saiu');
  assert.match(semComentarios(ler('src/pages/Jogo.jsx')), /fuso=\{team\?\.fuso\}/);
  assert.match(semComentarios(ler('src/components/ResultadoModal.jsx')), /fuso=\{fuso\}/);
});
