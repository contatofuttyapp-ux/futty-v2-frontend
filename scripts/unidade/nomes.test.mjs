// Futty v2.0 — Rodada 29I (achados 92 e 94): como o app escreve o nome de uma pessoa.
//
//   92. "Solte a resenha, Chavo,…" — a conta é "CHAVO, EL MATADOR" e o app cortava no primeiro espaço, deixando a vírgula colada.
//   94. O mesmo nome aparecia "CHAVO, EL MATADOR" no Início e "Chavo, el matador" na Resenha: uma forma só — o nome COMO A PESSOA
//       ESCREVEU, sem forçar maiúsculas em CSS.
//
// Uso: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { primeiroNome } from '../../src/utils/primeiroNome.js';
import { nomeExibicao } from '../../src/utils/nomeExibicao.js';

const RAIZ = fileURLToPath(new URL('../../', import.meta.url));
const ler = (rel) => fs.readFileSync(`${RAIZ}${rel}`, 'utf8');

test('primeiroNome: tira a pontuação do fim da primeira palavra (vírgula, ponto, ponto e vírgula, hífen) — o achado 92', () => {
  assert.equal(primeiroNome('CHAVO, EL MATADOR'), 'CHAVO');
  assert.equal(primeiroNome('Chavo, el matador'), 'Chavo');
  assert.equal(primeiroNome('Tonhão. O Craque'), 'Tonhão');
  assert.equal(primeiroNome('Rafa; o mago'), 'Rafa');
  assert.equal(primeiroNome('Rafa- o mago'), 'Rafa');
  assert.equal(primeiroNome('Rafa – o mago'), 'Rafa');
  assert.equal(primeiroNome('Fumaça,,, '), 'Fumaça');
});

test('primeiroNome: nome comum fica como está, com a caixa que a pessoa escreveu', () => {
  assert.equal(primeiroNome('Tonhão'), 'Tonhão');
  assert.equal(primeiroNome('  Canhotinha da Silva '), 'Canhotinha');
  assert.equal(primeiroNome('Magrão\tSilva'), 'Magrão');
  assert.equal(primeiroNome('João-Pedro Souza'), 'João-Pedro', 'hífen no MEIO da palavra é parte do nome');
  assert.equal(primeiroNome("D'Ávila Neto"), "D'Ávila");
  assert.equal(primeiroNome('Zé'), 'Zé');
});

test('primeiroNome: sem nome ou só pontuação não quebra', () => {
  assert.equal(primeiroNome(''), '');
  assert.equal(primeiroNome(null), '');
  assert.equal(primeiroNome(undefined), '');
  assert.equal(primeiroNome('   '), '');
  assert.equal(primeiroNome(',,,'), '');
  assert.equal(primeiroNome('- Rafa'), 'Rafa');
  assert.equal(primeiroNome(',Tonhão'), 'Tonhão');
});

test('a Resenha usa primeiroNome (não o corte no primeiro espaço) — "Solte a resenha, CHAVO…"', () => {
  const feed = ler('src/pages/Feed.jsx');
  assert.match(feed, /primeiroNome\(nomeExibicao\(user\)\)/);
  assert.doesNotMatch(feed, /split\(' '\)\[0\]/, 'o corte cru no espaço não pode voltar');
  const frase = `Solte a resenha, ${primeiroNome('CHAVO, EL MATADOR')}…`;
  assert.equal(frase, 'Solte a resenha, CHAVO…');
});

test('uma forma só: o nome como a pessoa escreveu — nenhuma tela força maiúsculas no nome do jogador (o achado 94)', () => {
  const inicio = ler('src/pages/Inicio.jsx');
  const m = inicio.match(/function NomeCromo[\s\S]*?\n}\n/);
  assert.ok(m, 'achou o NomeCromo (o nome do Início, sob o cromo)');
  assert.doesNotMatch(m[0], /textTransform/, 'o nome do Início saía "CHAVO, EL MATADOR" por CSS, e na Resenha "Chavo, el matador"');
  // Início e Resenha leem o nome pela mesma regra única
  assert.match(inicio, /nomeExibicao\(user\)/);
  assert.match(ler('src/pages/Feed.jsx'), /nomeExibicao\(user\)/);
  assert.equal(nomeExibicao({ nome_jogador: 'Chavo, el matador', nome: 'CHAVO' }), 'Chavo, el matador');
  assert.equal(nomeExibicao({ nome: 'Tonhão' }), 'Tonhão');
  assert.equal(nomeExibicao({}), 'Jogador');
});
