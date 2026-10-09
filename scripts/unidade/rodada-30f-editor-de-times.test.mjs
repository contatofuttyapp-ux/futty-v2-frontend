// Futty v2.0 — Rodada 30F, item 2: "Ajustar times" com convidados sem app.
//
// Achado: com 2 convidados ("Convidado Teste", "Convidado Dois") a tela mostrava "Convidado Dois" duas vezes e sumia com
// "Convidado Teste" (key={user_id} = null para todo convidado), e arrastar um convidado não movia ninguém (moverPara
// procurava por user_id). Agora cada jogador do editor tem uma chave estável (src/utils/editorDeTimes.js), usada no
// key, no arrasto e no mover. O comportamento no navegador (arrastar de verdade): scripts/provas/editor-de-times.prova.mjs.
//
// Uso: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chaveNoEditor, comChaves, moverJogador, semChave } from '../../src/utils/editorDeTimes.js';

const RAIZ = fileURLToPath(new URL('../../', import.meta.url));
const ler = (rel) => fs.readFileSync(path.join(RAIZ, rel), 'utf8');

const j = (id, nome) => ({ user_id: id, nome, rating: 3 });
const g = (nome) => ({ user_id: null, convidado: true, nome, rating: 3 });
const RESULTADO = {
  seed: 5,
  times: [{ nome: 'Time A', jogadores: [j('a', 'Magrão'), g('Convidado Teste')] }, { nome: 'Time B', jogadores: [j('b', 'Zé'), g('Convidado Dois')] }],
  reservas: [g('Convidado Três')],
};
const nomes = (e) => [...e.times.map((t) => t.jogadores.map((x) => x.nome)), e.reservas.map((x) => x.nome)];
const todasAsChaves = (e) => [...e.times.flatMap((t) => t.jogadores), ...e.reservas].map((x) => x._chave);

test('30F-2 · cada jogador tem uma chave só dele — convidados também (antes: todos null)', () => {
  const e = comChaves(RESULTADO);
  const chaves = todasAsChaves(e);
  assert.deepEqual(chaves, ['u:a', 'convidado:t0:1', 'u:b', 'convidado:t1:1', 'convidado:r:0']);
  assert.equal(new Set(chaves).size, chaves.length, 'nenhuma chave repetida → o React não duplica nem some com ninguém');
  assert.deepEqual(nomes(e), [['Magrão', 'Convidado Teste'], ['Zé', 'Convidado Dois'], ['Convidado Três']]);
  assert.equal(RESULTADO.times[0].jogadores[1]._chave, undefined, 'o resultado original não muda');
});

test('30F-2 · mover um convidado: só ele muda de lugar, o outro convidado fica', () => {
  const e = moverJogador(comChaves(RESULTADO), 'convidado:t0:1', 1);
  assert.deepEqual(nomes(e), [['Magrão'], ['Zé', 'Convidado Dois', 'Convidado Teste'], ['Convidado Três']]);
});

test('30F-2 · mover um jogador com conta e um convidado da reserva: nada duplica, nada some', () => {
  let e = comChaves(RESULTADO);
  e = moverJogador(e, 'u:a', 'reservas');
  e = moverJogador(e, 'convidado:r:0', 0);
  assert.deepEqual(nomes(e), [['Convidado Teste', 'Convidado Três'], ['Zé', 'Convidado Dois'], ['Magrão']]);
  const chaves = todasAsChaves(e);
  assert.equal(chaves.length, 5);
  assert.equal(new Set(chaves).size, 5);
});

test('30F-2 · a chave de um convidado acompanha ele depois de mover (pode ser movido de novo)', () => {
  let e = moverJogador(comChaves(RESULTADO), 'convidado:t1:1', 0);
  e = moverJogador(e, 'convidado:t1:1', 'reservas');
  assert.deepEqual(nomes(e), [['Magrão', 'Convidado Teste'], ['Zé'], ['Convidado Três', 'Convidado Dois']]);
});

test('30F-2 · chave desconhecida não mexe em nada; a chave sai antes de gravar', () => {
  const e = comChaves(RESULTADO);
  const igual = moverJogador(e, 'u:ninguem', 0);
  assert.ok(igual.times === e.times && igual.reservas === e.reservas, 'as mesmas listas, sem cópia');
  assert.deepEqual(semChave({ user_id: null, nome: 'Beto', _chave: 'convidado:t0:0' }), { user_id: null, nome: 'Beto' });
  assert.equal(chaveNoEditor(j('x', 'X'), 't0', 3), 'u:x');
});

test('30F-2 · o TimesEditor usa a chave no key, no arrasto e no mover — e guarda o convidado como convidado na reserva', () => {
  const ed = ler('src/components/TimesEditor.jsx');
  assert.match(ed, /const \[estado, setEstado\] = useState\(\(\) => comChaves\(resultadoInicial\)\);/);
  assert.match(ed, /setEstado\(\(e\) => moverJogador\(e, chave, destino\)\);/);
  assert.match(ed, /dragRef\.current = j\._chave;/);
  assert.match(ed, /<Jogador key=\{j\._chave\} j=\{j\} \/>/);
  assert.doesNotMatch(ed, /key=\{j\.user_id\}|dragRef\.current = j\.user_id/, 'nada mais identificado por user_id no arrasto');
  assert.match(ed, /jogadores: t\.jogadores\.map\(semChave\)/, 'a chave do editor não vai para o motor');
  assert.match(ed, /convidado: r\.convidado \|\| undefined/);
});
