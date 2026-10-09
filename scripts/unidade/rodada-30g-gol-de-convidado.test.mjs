// Futty v2.0 — Rodada 30G, item 3 (achado da 30F): o gol do convidado sem app, pelo nome, não pelo id vazio
// que colidia (dois convidados caíam no mesmo contador na lista de gols por jogador). O motor (backend) e a
// prova visual ficam fora deste arquivo; aqui as contas puras (resultadoDoJogo.js, chaveDoJogador) e a
// ligação no editor (ResultadoEditor.jsx).
//
// Uso: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chaveDoJogador } from '../../src/utils/seloDoSorteio.js';
import { corpoDoResultadoDoJogo, somaDeGolsPorTime } from '../../src/utils/resultadoDoJogo.js';

const RAIZ = fileURLToPath(new URL('../../', import.meta.url));
const ler = (rel) => fs.readFileSync(path.join(RAIZ, rel), 'utf8');

const membro = (id, nome) => ({ user_id: id, nome });
const convidado = (nome) => ({ user_id: null, convidado: true, nome });

test('chaveDoJogador: dois convidados diferentes têm chaves diferentes, mesmo os dois com user_id vazio', () => {
  assert.notEqual(chaveDoJogador(convidado('Beto')), chaveDoJogador(convidado('Caio')));
  assert.equal(chaveDoJogador(convidado('Beto')), chaveDoJogador(convidado(' beto ')), 'o mesmo convidado (nome com espaço/caixa diferente) é a mesma chave');
  assert.equal(chaveDoJogador(membro('a', 'Beto')), 'u:a', 'quem tem conta usa o id, não o nome (pode ter trocado de nome)');
});

test('corpoDoResultadoDoJogo: o gol do convidado vai por convidado_nome; dois convidados não se misturam no golsMap', () => {
  const jogadores = [membro('a', 'Magrão'), convidado('Beto'), convidado('Caio')];
  const golsMap = { [chaveDoJogador(membro('a'))]: 1, [chaveDoJogador(convidado('Beto'))]: 2, [chaveDoJogador(convidado('Caio'))]: 5 };
  const body = corpoDoResultadoDoJogo({ nivel: 3, vencedor: 'A', placarA: 1, placarB: 0, golsMap }, jogadores);
  assert.deepEqual(body.gols, [
    { user_id: 'a', convidado_nome: null, gols: 1 },
    { user_id: null, convidado_nome: 'Beto', gols: 2 },
    { user_id: null, convidado_nome: 'Caio', gols: 5 },
  ]);
});

test('corpoDoResultadoDoJogo: convidado sem gol marcado vai com 0, nunca herda a contagem de outro convidado', () => {
  const jogadores = [convidado('Beto'), convidado('Caio')];
  const body = corpoDoResultadoDoJogo({ nivel: 3, vencedor: 'A', golsMap: { [chaveDoJogador(convidado('Caio'))]: 3 } }, jogadores);
  assert.deepEqual(body.gols, [{ user_id: null, convidado_nome: 'Beto', gols: 0 }, { user_id: null, convidado_nome: 'Caio', gols: 3 }]);
});

test('somaDeGolsPorTime: soma pela chave (não pelo user_id cru) — continua certa com convidado na mistura', () => {
  const jogadores = [{ ...membro('a', 'Magrão'), timeIndex: 0 }, { ...convidado('Beto'), timeIndex: 0 }, { ...convidado('Caio'), timeIndex: 1 }];
  const golsMap = { [chaveDoJogador(membro('a'))]: 2, [chaveDoJogador(convidado('Beto'))]: 1, [chaveDoJogador(convidado('Caio'))]: 4 };
  assert.deepEqual(somaDeGolsPorTime(golsMap, jogadores), [3, 4]);
});

test('ResultadoEditor: o golsMap (estado, leitura e os dois botões) usa chaveDoJogador, não user_id cru', () => {
  const fonte = ler('src/components/ResultadoEditor.jsx');
  assert.match(fonte, /import \{ chaveDoJogador \} from '\.\.\/utils\/seloDoSorteio';/);
  assert.match(fonte, /\(gols \|\| \[\]\)\.forEach\(\(g\) => \{ m\[chaveDoJogador\(g\)\] = g\.gols \|\| 0; \}\);/, 'o estado inicial (vindo do backend) agrupa por chave');
  assert.match(fonte, /function setGol\(chave, delta\) \{/);
  assert.match(fonte, /const chave = chaveDoJogador\(j\);/, 'cada linha da lista calcula a própria chave');
  assert.match(fonte, /onClick=\{\(\) => setGol\(chave, -1\)\}/);
  assert.match(fonte, /\{golsMap\[chave\] \|\| 0\}/);
  assert.match(fonte, /onClick=\{\(\) => setGol\(chave, 1\)\}/);
  assert.doesNotMatch(fonte, /golsMap\[j\.user_id\]|setGol\(j\.user_id/, 'nenhum resto do esquema antigo, por user_id cru');
});
