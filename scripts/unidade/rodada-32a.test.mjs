// Futty v2.0 — Rodada 32A: convidado com GOL e C, a lista guardada no jogo, a conta certa depois de associar e o aviso de quem não é
// do time. A parte pura das telas (a prova no navegador, com o motor de verdade, é rodada-32a.prova.mjs).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { confirmadosDoSorteio, associacoesAtivas, nomeJaNaLista, novoConvidado, MAX_NOME_CONVIDADO } from '../../src/utils/convidadosDoJogo.js';
import { ehForaDoTime, FRASE_FORA_DO_TIME } from '../../src/utils/foraDoTime.js';

const p = (id, confirmado = true) => ({ user_id: id, nome: id, confirmado });
const associacao = (userId, convidadoNome, desfeita = false) => ({ user_id: userId, convidado: { nome: convidadoNome }, em: '2026-10-22T23:00:00Z', ...(desfeita ? { desfeita_em: '2026-10-22T23:10:00Z' } : {}) });

test('confirmadosDoSorteio: sem a lista da presença, todos os confirmados (como antes)', () => {
  const players = [p('a'), p('b'), p('c', false)];
  assert.deepEqual(confirmadosDoSorteio(players, null, null).map((x) => x.user_id), ['a', 'b']);
});

test('confirmadosDoSorteio: pelo atalho da presença formal, os da lista MAIS quem o Associar ligou a uma vaga (o "5 confirmados" depois de recarregar)', () => {
  const players = ['p1', 'p2', 'p3', 'p4', 'p5', 'g1', 'g2', 'g3', 'g4', 'outro'].map((id) => p(id));
  const presenca = ['p1', 'p2', 'p3', 'p4', 'p5'];
  const tr = { registro: { associacoes: [associacao('g1', 'Gabriel Costa'), associacao('g2', 'Motta'), associacao('g3', 'Miguel'), associacao('g4', 'Marcos')] } };
  const ids = confirmadosDoSorteio(players, presenca, tr).map((x) => x.user_id);
  assert.deepEqual(ids, ['p1', 'p2', 'p3', 'p4', 'p5', 'g1', 'g2', 'g3', 'g4']);
  assert.ok(!ids.includes('outro'), 'quem não está na presença nem numa vaga continua fora');
});

test('confirmadosDoSorteio: associação desfeita não conta; conta associada que não está confirmada não entra', () => {
  const players = [p('p1'), p('g1'), p('g2', false)];
  const tr = { registro: { associacoes: [associacao('g1', 'Beto', true), associacao('g2', 'Caio')] } };
  assert.deepEqual(confirmadosDoSorteio(players, ['p1'], tr).map((x) => x.user_id), ['p1']);
  assert.deepEqual(associacoesAtivas(tr).map((a) => a.user_id), ['g2']);
  assert.deepEqual(associacoesAtivas(null), []);
});

test('a conta da Missa de Quinta: 9 confirmados + 6 convidados = 15 (não 19)', () => {
  // depois de associar 4 dos 10 convidados, o motor devolve 9 confirmados e a lista com 6
  const players = ['p1', 'p2', 'p3', 'p4', 'p5', 'g1', 'g2', 'g3', 'g4'].map((id) => p(id));
  const convidados = ['Eric Lopes', 'Wesley', 'Matheus Zanardi', 'Thiago', 'Rafa', 'Dudu'].map(novoConvidado);
  assert.equal(confirmadosDoSorteio(players, null, null).length + convidados.length, 15);
});

test('nomeJaNaLista: mesmo nome sem olhar maiúscula nem espaço; o próprio convidado editado não conta', () => {
  const lista = [novoConvidado('Wesley'), novoConvidado('Eric Lopes')];
  assert.match(nomeJaNaLista(lista, ' wesley '), /"wesley" já está na lista\. Use um sobrenome ou apelido para diferenciar\./);
  assert.equal(nomeJaNaLista(lista, 'Wesley', 0), null, 'editar o Wesley sem mudar o nome');
  assert.equal(nomeJaNaLista(lista, 'Matheus'), null);
  assert.equal(nomeJaNaLista(lista, '   '), null);
});

test('novoConvidado: sem marca, nome aparado e no teto da tela', () => {
  assert.deepEqual(novoConvidado('  Beto '), { nome: 'Beto', goleiro: false, cabeca_chave: false });
  assert.equal(novoConvidado('x'.repeat(40)).nome.length, MAX_NOME_CONVIDADO);
});

test('ehForaDoTime: o código novo; o 403 com a frase antiga do motor; nunca a falta de rede nem outro 403', () => {
  assert.equal(ehForaDoTime({ status: 403, code: 'FORA_DO_TIME', mensagem: FRASE_FORA_DO_TIME }), true);
  assert.equal(ehForaDoTime({ status: 403, code: null, mensagem: 'Não é membro deste time.' }), true);
  assert.equal(ehForaDoTime({ status: 403, code: null, mensagem: 'Você não é membro deste time.' }), true);
  assert.equal(ehForaDoTime({ status: null, code: 'SEM_REDE', mensagem: 'Sem conexão.' }), false);
  assert.equal(ehForaDoTime({ status: 403, code: null, mensagem: 'Só admins podem fazer o sorteio.' }), false);
  assert.equal(ehForaDoTime({ status: 500, code: 'ERRO_INTERNO', mensagem: 'x' }), false);
  assert.equal(ehForaDoTime(), false);
});

test('as telas do jogo, do time e do ranking escolhem o aviso pelo erro (nada de "Sem conexão" para quem não é do time)', () => {
  for (const arquivo of ['src/pages/Jogo.jsx', 'src/pages/Equipa.jsx', 'src/pages/Ranking.jsx']) {
    const fonte = readFileSync(new URL(`../../${arquivo}`, import.meta.url), 'utf8');
    assert.match(fonte, /ehForaDoTime\(/, arquivo);
    assert.match(fonte, /<ForaDoTime/, arquivo);
  }
  // o perfil de jogador de time alheio reconhece o 403 pelo código, não pela frase antiga ("não é membro"), que o motor não manda mais
  const perfil = readFileSync(new URL('../../src/pages/JogadorPerfil.jsx', import.meta.url), 'utf8');
  assert.match(perfil, /ehForaDoTime\(\{ status: errorStatus, code: errorCode, mensagem: error \}\) \? \(/);
  assert.doesNotMatch(perfil, /\/não é membro\/i\.test/);
  const ranking = readFileSync(new URL('../../src/pages/Ranking.jsx', import.meta.url), 'utf8');
  assert.ok(!/<EstadoErroRede onRepetir=\{reload\} \/>/.test(ranking), 'o Ranking não mostra mais o aviso de rede sem a frase do erro');
});

test('o Jogo manda a lista de convidados (com as marcas) no sorteio e grava pelo PUT; não guarda mais só na memória da tela', () => {
  const fonte = readFileSync(new URL('../../src/pages/Jogo.jsx', import.meta.url), 'utf8');
  assert.match(fonte, /\/api\/games\/\$\{id\}\/convidados`, \{ method: 'PUT'/);
  assert.match(fonte, /const body = \{ jogadoresPorTime: porTimeEfectivo, convidados \}/);
  assert.ok(!/useState\(\[\]\); \/\/ SPEC-SORTEIO §11: nomes sem app/.test(fonte));
});
