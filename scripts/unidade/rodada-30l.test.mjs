// Futty v2.0 — Rodada 30L: o campeonato nasce do sorteio do jogo (sai o "sortear direto").
//
// A regra (quais jogos são oferecidos, o modo 'sorteio' recusado) é do motor (backend/tests/campeonato-do-sorteio-do-jogo.test.js).
// Aqui o que a tela decide: os textos da escolha "Criar campeonato", a linha de cada jogo oferecido e por onde a pessoa chega ao
// campeonato (a página dos campeonatos, o Painel → Jogos, o resultado do sorteio).
//
// Uso: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { A_MAO, ESCOLHA_O_JOGO, linhaDoSorteio, PELO_SORTEIO, SEM_JOGO_SORTEADO, TITULO_DA_ESCOLHA } from '../../src/utils/campeonatoDoSorteio.js';
import { lerPagina } from './_fonteDaPagina.mjs';

const RAIZ = fileURLToPath(new URL('../../', import.meta.url));
const ler = (rel) => fs.readFileSync(path.join(RAIZ, rel), 'utf8').replace(/\r\n/g, '\n');
const semComentarios = (texto) => texto.replace(/\/\*[\s\S]*?\*\//g, '').split('\n').filter((l) => !/^\s*\/\//.test(l)).join('\n');

test('os dois caminhos e a frase de quando não há jogo sorteado, como o Pedro pediu', () => {
  assert.equal(PELO_SORTEIO.titulo, 'Pelo sorteio de um jogo');
  assert.equal(A_MAO.titulo, 'Montar os times à mão');
  assert.equal(SEM_JOGO_SORTEADO, 'Marque um jogo, deixe o pessoal confirmar e sorteie. No resultado do sorteio aparece Criar campeonato.');
  assert.equal(TITULO_DA_ESCOLHA, 'De onde vêm os times?');
  // A VOZ: sem travessão no meio da frase, sem "por favor".
  for (const texto of [PELO_SORTEIO.descricao, A_MAO.descricao, SEM_JOGO_SORTEADO, ESCOLHA_O_JOGO, TITULO_DA_ESCOLHA]) {
    assert.doesNotMatch(texto, /—|–| - |por favor/i, texto);
  }
});

test('a linha do jogo oferecido: "4 times de 5", com o plural certo', () => {
  assert.equal(linhaDoSorteio({ n_times: 4, por_time: 5 }), '4 times de 5');
  assert.equal(linhaDoSorteio({ n_times: 2, por_time: 7 }), '2 times de 7');
  assert.equal(linhaDoSorteio({ n_times: 1, por_time: 3 }), '1 time de 3');
  assert.equal(linhaDoSorteio({ n_times: 3 }), '3 times', 'sem o tamanho, só a contagem');
});

test('o "sortear direto" saiu da tela de criar: nada de modo "sorteio", de cerimônia nem de "criar direto"', () => {
  const tela = semComentarios(ler('src/pages/Campeonato.jsx'));
  assert.doesNotMatch(tela, /modo: 'sorteio'/);
  assert.doesNotMatch(tela, /criar\('sorteio'\)/);
  assert.doesNotMatch(tela, /Sortear pela cerimônia/);
  assert.doesNotMatch(tela, /CerimoniaSorteio/, 'a página do campeonato não reproduz mais a cerimônia');
  assert.doesNotMatch(tela, /entra no sorteio/);
});

test('"Criar campeonato" (a página dos campeonatos) abre a escolha, e o manual é o passo a passo de sempre', () => {
  const tela = semComentarios(ler('src/pages/Campeonato.jsx'));
  assert.match(tela, /onClick=\{\(\) => setCriar\('escolha'\)\}>＋ Criar campeonato/);
  assert.match(tela, /<CriarCampeonato slug=\{slug\} team=\{team\}/);
  assert.match(tela, /aoMontarAMao=\{\(\) => setCriar\('manual'\)\}/);
  assert.match(tela, /params\.get\('novo'\) === 'manual'/, 'o Painel abre direto no manual com ?novo=manual');
  assert.match(tela, /modo: 'manual'/);
});

test('Painel → Jogos: "Criar campeonato" abre a mesma escolha (sem o formulário antigo de 2 times)', () => {
  const painel = semComentarios(lerPagina('AdminPanel'));
  assert.match(painel, /<CriarCampeonato\n\s+slug=\{slug\}/);
  assert.match(painel, /aoMontarAMao=\{\(\) => navigate\(`\/time\/\$\{slug\}\/campeonato\?novo=manual`\)\}/);
  assert.doesNotMatch(painel, /Nº de jornadas/, 'o formulário antigo (nome, jornadas, Time A × Time B) saiu daqui');
  assert.doesNotMatch(painel, /Nome do Time A/);
});

test('o resultado do sorteio oferece "Criar campeonato" a partir de 2 times (antes eram 3)', () => {
  const jogo = semComentarios(ler('src/pages/Jogo.jsx'));
  assert.match(jogo, /isAdmin && timesSorteio\.length >= 2 && confirmacao !== 'campeonato'/);
  assert.doesNotMatch(jogo, /timesSorteio\.length >= 3/);
  assert.match(jogo, /Criar campeonato com estes times/);
});

test('a escolha pelo sorteio pede a lista ao motor, oferece "Novo jogo" quando não há e usa a peça do formato', () => {
  const escolha = semComentarios(ler('src/components/CriarCampeonato.jsx'));
  assert.match(escolha, /\/campeonatos\/jogos-sorteados/);
  assert.match(escolha, /\/jogo\/novo/);
  assert.match(escolha, /<CampeonatoDoSorteio/);
  assert.match(escolha, /\{SEM_JOGO_SORTEADO\}/);
  const peca = semComentarios(ler('src/components/CampeonatoDoSorteio.jsx'));
  assert.match(peca, /\/campeonatos\/de-sorteio/);
  assert.match(peca, /game_id: gameId, formato/);
});
