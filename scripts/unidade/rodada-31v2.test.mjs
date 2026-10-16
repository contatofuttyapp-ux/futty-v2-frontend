// Futty v2.0 — Rodada 31V-2: "Associar em todos os jogos do time" (textos e contas puras de src/utils/associarJogador.js) e as ligações do
// Gabinete (Excluir conta, só para quem pode sair, e o log de ações). A regra é do motor (backend/tests/associar-em-todos.test.js,
// excluir-conta-gabinete.test.js, suspender-varias-contas.test.js); o comportamento visual está em scripts/provas/rodada-31v2.prova.mjs.
//
// Uso: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  TEXTO_SO_NESTE, fraseDoFeitoEmTodos, nomeNorm, outrosJogosDoConvidado, perguntaEmTodos, textoBotaoEmTodos,
} from '../../src/utils/associarJogador.js';

const RAIZ = fileURLToPath(new URL('../../', import.meta.url));
const ler = (rel) => fs.readFileSync(path.join(RAIZ, rel), 'utf8');

test('31V-2 · a pergunta e os botões do "Associar em todos"', () => {
  assert.equal(perguntaEmTodos(1), 'Este nome aparece em mais 1 jogo deste time. Associar em todos?');
  assert.equal(perguntaEmTodos(3), 'Este nome aparece em mais 3 jogos deste time. Associar em todos?');
  assert.equal(textoBotaoEmTodos(3), 'Associar nos 4 jogos');
  assert.equal(TEXTO_SO_NESTE, 'Só neste jogo');
});

test('31V-2 · quantos outros jogos: lido do motor pelo nome, com a mesma régua de nome (sem espaço sobrando, sem maiúscula)', () => {
  const dados = { convidados: [{ nome: 'Eric Lopes', outros_jogos: 3 }, { nome: 'Igor', outros_jogos: 0 }] };
  assert.equal(outrosJogosDoConvidado(dados, ' eric lopes '), 3);
  assert.equal(outrosJogosDoConvidado(dados, 'Igor'), 0);
  assert.equal(outrosJogosDoConvidado(dados, 'Kim'), 0);
  assert.equal(outrosJogosDoConvidado(null, 'Kim'), 0);
  assert.equal(outrosJogosDoConvidado({ convidados: [{ nome: 'X', outros_jogos: 'lixo' }] }, 'x'), 0);
  assert.equal(nomeNorm('  Dodô '), 'dodô');
});

test('31V-2 · o aviso depois: quantos jogos ficaram com a conta e o que ficou de fora', () => {
  assert.equal(fraseDoFeitoEmTodos('Eric Lopes', 'Eric', { associados: 3, pulados: [] }), 'Pronto: o Eric Lopes agora é Eric em 4 jogos.');
  assert.equal(
    fraseDoFeitoEmTodos('Eric Lopes', 'Eric', { associados: 2, pulados: [{ motivo: 'Eric já está neste jogo; um jogador não ocupa duas vagas.' }] }),
    'Pronto: o Eric Lopes agora é Eric em 3 jogos. 1 jogo ficou de fora: Eric já está neste jogo; um jogador não ocupa duas vagas.',
  );
  assert.equal(
    fraseDoFeitoEmTodos('Gui', 'Guilherme', { associados: 0, pulados: [{ motivo: 'a' }, { motivo: 'b' }] }),
    'Pronto: o Gui agora é Guilherme em 1 jogo. 2 jogos ficaram de fora (Guilherme já estava neles ou já tinha gols lá).',
  );
});

test('31V-2 · a janela só pergunta "em todos" quando o nome aparece em outros jogos, e manda em_todos só quando o admin escolhe', () => {
  const tela = ler('src/components/AssociarJogador.jsx');
  assert.match(tela, /outros > 0 \?/);
  assert.match(tela, /data-em-todos/);
  assert.match(tela, /data-so-neste/);
  assert.match(tela, /\.\.\.\(emTodos \? \{ em_todos: true \} : \{\}\)/);
  assert.match(ler('src/pages/Jogo.jsx'), /emTodos \? fraseDoFeitoEmTodos\(/);
});

test('31V-2 · Gabinete: "Excluir" só para quem pode sair (o motivo no lugar), com a palavra EXCLUIR, e o log de ações embaixo', () => {
  const tela = ler('src/pages/gabinete/PessoasTimes.jsx');
  assert.match(tela, /\{!u\.protegida \? \(/);
  assert.match(tela, /data-protegida/);
  assert.match(tela, /Escreva EXCLUIR para confirmar/);
  assert.match(tela, /method: 'DELETE', body: JSON\.stringify\(\{ confirmar: 'EXCLUIR' \}\)/);
  assert.match(tela, /useApi\('\/api\/super\/acoes'\)/);
  assert.match(tela, /<UltimasAcoes versao=\{versaoDoLog\} \/>/);
});
