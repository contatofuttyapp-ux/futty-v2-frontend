// Futty v2.0 — Rodada 30I, item 7: o card "Quem ganhou?" no Início, só para o admin do time. O motor entrega o card pronto (backend/tests/card-quem-ganhou.test.js);
// aqui a lista de avisos, a ordem na fila (acima de "colegas para avaliar") e o corpo da resposta. O que só o navegador confirma (a fila no Início inteiro, o
// toque, o card que some) está em scripts/provas/rodada-30i.prova.mjs.
//
// Uso: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { cardsQuemGanhou, corpoDaResposta, perguntaDoJogo } from '../../src/utils/quemGanhou.js';
import { ORDEM_DOS_AVISOS, LEMBRETES_SEM_PRAZO, proximoAviso } from '../../src/utils/avisosDoInicio.js';
import { CORES_DAS_POSICOES } from '../../src/utils/nomeDoTime.js';

const RAIZ = fileURLToPath(new URL('../../', import.meta.url));
const ler = (rel) => fs.readFileSync(path.join(RAIZ, rel), 'utf8').replace(/\r\n/g, '\n');
const semComentarios = (texto) => texto.replace(/\/\*[\s\S]*?\*\//g, '').split('\n').filter((l) => !/^\s*\/\//.test(l)).join('\n');

const seu = (slug, quemGanhou, extra = {}) => ({ team_id: `id-${slug}`, slug, nome: `Time ${slug}`, fuso: 'America/Sao_Paulo', pendencias: {}, quem_ganhou: quemGanhou, ...extra });
const card = (id, data, nomes = ['Time A', 'Time B'], local = 'Quadra do Zé') => ({ game_id: id, data, local, times: nomes.map((nome) => ({ nome })) });

test('cardsQuemGanhou: um card por time com jogo esperando resposta — nome e cor de cada time são os da cerimônia, por posição', () => {
  const [c] = cardsQuemGanhou([seu('missa', card('g1', '2026-10-18T22:00:00Z'))], [], [{ id: 'id-missa', cidade: 'Brasília - DF' }]);
  assert.deepEqual(c.times, [{ nome: 'Time Ouro', cor: '#d4a017' }, { nome: 'Time Roxo', cor: '#8b5cf6' }]);
  assert.deepEqual([c.game_id, c.slug, c.time_nome, c.fuso, c.cidade, c.local], ['g1', 'missa', 'Time missa', 'America/Sao_Paulo', 'Brasília - DF', 'Quadra do Zé']);
  assert.equal(CORES_DAS_POSICOES.length, 4, 'ouro, roxo, prata, bronze');
});

test('cardsQuemGanhou: com 3 ou 4 times, uma cor para cada (Prata, Bronze)', () => {
  const [c] = cardsQuemGanhou([seu('missa', card('g1', '2026-10-18T22:00:00Z', ['Time A', 'Time B', 'Time C', 'Time D']))]);
  assert.deepEqual(c.times.map((t) => t.nome), ['Time Ouro', 'Time Roxo', 'Time Prata', 'Time Bronze']);
  assert.deepEqual(c.times.map((t) => t.cor), ['#d4a017', '#8b5cf6', '#aab4c8', '#c2652e']);
});

test('cardsQuemGanhou: sem card (o time não tem jogo esperando), card sem 2 times ou lista vazia — nada na fila; respondidos somem na hora', () => {
  assert.deepEqual(cardsQuemGanhou([seu('a', null)]), []);
  assert.deepEqual(cardsQuemGanhou([seu('a', card('g1', '2026-10-18T22:00:00Z', ['Time A']))]), []);
  assert.deepEqual(cardsQuemGanhou([]), []);
  assert.deepEqual(cardsQuemGanhou(undefined), []);
  assert.deepEqual(cardsQuemGanhou([seu('a', card('g1', '2026-10-18T22:00:00Z'))], ['g1']), [], 'o que acabou de ser respondido sai sem esperar a próxima leitura');
  assert.deepEqual(cardsQuemGanhou([seu('a', card('g1', '2026-10-18T22:00:00Z'))], new Set(['g1'])), []);
});

test('cardsQuemGanhou: com mais de um time, o jogo que espera há mais tempo vem primeiro', () => {
  const lista = cardsQuemGanhou([seu('novo', card('g2', '2026-10-18T22:00:00Z')), seu('velho', card('g1', '2026-10-11T22:00:00Z'))]);
  assert.deepEqual(lista.map((c) => c.game_id), ['g1', 'g2']);
});

test('a pergunta: "Quem ganhou o jogo?" com 2 times (cabe empate); "Quem foi o campeão?" com 3 ou 4 (sem empate)', () => {
  assert.deepEqual(perguntaDoJogo(2), { titulo: 'Quem ganhou o jogo?', temEmpate: true });
  assert.deepEqual(perguntaDoJogo(3), { titulo: 'Quem foi o campeão?', temEmpate: false });
  assert.deepEqual(perguntaDoJogo(4), { titulo: 'Quem foi o campeão?', temEmpate: false });
});

test('corpoDaResposta: o índice do time é o campeão (0 é campeão); "empate" é o empate explícito', () => {
  assert.deepEqual(corpoDaResposta(0), { campeao_time_index: 0, empate: false });
  assert.deepEqual(corpoDaResposta(2), { campeao_time_index: 2, empate: false });
  assert.deepEqual(corpoDaResposta('empate'), { campeao_time_index: null, empate: true });
});

test('na fila de avisos "Quem ganhou?" fica acima de "colegas para avaliar" e abaixo do jogo sem resposta, do pedido e da resposta do pedido', () => {
  const i = (tipo) => ORDEM_DOS_AVISOS.indexOf(tipo);
  assert.ok(i('jogo') < i('quem-ganhou') && i('pedido') < i('quem-ganhou') && i('desfecho') < i('quem-ganhou'));
  assert.ok(i('quem-ganhou') < i('votacao'), 'prioridade alta: acima de "colegas para avaliar"');
  assert.ok(!LEMBRETES_SEM_PRAZO.includes('quem-ganhou'), 'não é lembrete: é um resultado por lançar, sem "Agora não" de 7 dias');
  const votacoes = [{ slug: 'missa' }];
  const q = [{ game_id: 'g1' }, { game_id: 'g2' }];
  assert.deepEqual(proximoAviso({ quemGanhou: q, votacoes }), { tipo: 'quem-ganhou', item: { game_id: 'g1' }, mais: 1 });
  assert.equal(proximoAviso({ jogos: [{ id: 'j' }], quemGanhou: q, votacoes }).tipo, 'jogo');
  assert.equal(proximoAviso({ quemGanhou: [], votacoes }).tipo, 'votacao', 'sem card, a votação volta a ser o aviso');
  assert.equal(proximoAviso({ quemGanhou: q, notificacoes: true, nascimento: true }).tipo, 'quem-ganhou');
});

test('o Início desenha o card pela fila (só o primeiro), responde, some com o card e recarrega', () => {
  const inicio = semComentarios(ler('src/pages/Inicio.jsx'));
  assert.match(inicio, /const cardsDoQuemGanhou = cardsQuemGanhou\(dadosInicio\?\.seu_time, quemGanhouRespondidos, teams\);/);
  assert.match(inicio, /quemGanhou: cardsDoQuemGanhou,/);
  assert.match(inicio, /\{aviso\?\.tipo === 'quem-ganhou' \? <AvisoQuemGanhou card=\{aviso\.item\} mais=\{aviso\.mais\} onResolvido=\{quemGanhouRespondido\} \/> : null\}/);
  assert.match(inicio, /async function quemGanhouRespondido\(card\) \{\s*setQuemGanhouRespondidos\(\(lista\) => \[\.\.\.lista, card\.game_id\]\);\s*await inicio\.reload\(\);\s*\}/);
});

test('o aviso: um toque no card abre a pergunta; "Finalizar" grava o campeão pelo MESMO pedido do editor; Empate só com 2 times; a hora leva a cidade', () => {
  const fonte = ler('src/components/AvisoQuemGanhou.jsx');
  const codigo = semComentarios(fonte);
  assert.match(codigo, /data-aviso="quem-ganhou"/);
  assert.match(codigo, /onClick=\{\(\) => setAberto\(true\)\}/, 'o card inteiro é o toque');
  assert.match(codigo, /apiFetch\(`\/api\/games\/\$\{card\.game_id\}\/resultado`, \{ method: 'PATCH', body: JSON\.stringify\(corpoDaResposta\(escolha\)\) \}\)/);
  assert.match(codigo, /\{temEmpate \? \(/, 'o botão Empate só existe quando a pergunta o aceita');
  assert.match(codigo, /Lançar gols e prêmios/, 'os gols e os prêmios continuam no editor do jogo');
  assert.match(codigo, /to=\{`\/time\/\$\{card\.slug\}\/jogo\/\$\{card\.game_id\}`\}/);
  assert.doesNotMatch(codigo, /formatarDataHora\([^)]*\)(?<!cidade: card\.cidade \}\))/, 'a hora do jogo sempre com a cidade (lei da hora)');
  // ícone da interface = lucide, nunca emoji
  assert.match(codigo, /from 'lucide-react'/);
  assert.doesNotMatch(codigo, /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u, 'sem emoji na interface');
});
