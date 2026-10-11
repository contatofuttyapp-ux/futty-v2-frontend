// Futty v2.0 — Rodada 30J: "Em andamento" x "Terminado" nas telas e "Painel do time" no primeiro lugar do card "Seu time".
//
// A regra do estado do jogo é do motor (backend/utils/estadoDoJogo.js, testada em backend/tests/estado-do-jogo.test.js: início, +1h59, +2h, resultado antes
// de 2h, cancelado, fuso do time). Aqui a tela: lê o estado nos dois formatos (lista/Página do Jogo e Início), monta as duas listas do Início, deixa o
// "próximo jogo" e o "Sortear" no jogo que ainda não começou, e o card "Seu time" põe o Painel do time primeiro.
//
// Uso: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { estadoDoJogo, jogoEmAndamento, jogoTerminado, listasDoInicio } from '../../src/utils/estadoDoJogo.js';
import { destinoDoSortear } from '../../src/utils/seuTime.js';
import { STATUS_LABELS } from '../../src/utils/format.js';

const RAIZ = fileURLToPath(new URL('../../', import.meta.url));
const ler = (rel) => fs.readFileSync(path.join(RAIZ, rel), 'utf8').replace(/\r\n/g, '\n');
const semComentarios = (texto) => texto.replace(/\/\*[\s\S]*?\*\//g, '').split('\n').filter((l) => !/^\s*\/\//.test(l)).join('\n');

test('o estado é lido do motor nos dois formatos: `status` (lista de jogos e Página do Jogo) e `estado` (Início)', () => {
  for (const e of ['agendado', 'em_curso', 'terminado', 'cancelado']) {
    assert.equal(estadoDoJogo({ status: e }), e, `status ${e}`);
    assert.equal(estadoDoJogo({ estado: e, status: 'finished' }), e, `estado ${e}`);
  }
  // No Início o `status` é outro vocabulário (scheduled/drawn/finished) e o `estado` manda.
  assert.equal(estadoDoJogo({ estado: 'em_curso', status: 'finished' }), 'em_curso');
});

test('motor mais velho que a tela (Início sem `estado`): vale o `status` de sempre — começou ou acabou = terminado, cancelado = cancelado', () => {
  assert.equal(estadoDoJogo({ status: 'scheduled' }), 'agendado');
  assert.equal(estadoDoJogo({ status: 'drawn' }), 'agendado');
  assert.equal(estadoDoJogo({ status: 'finished' }), 'terminado');
  assert.equal(estadoDoJogo({ status: 'finished', cancelado: true }), 'cancelado');
  assert.equal(estadoDoJogo(null), 'agendado');
});

test('os rótulos: em_curso diz "Em andamento" e terminado diz "Terminado" (um texto só, o das telas todas)', () => {
  assert.equal(STATUS_LABELS.em_curso, 'Em andamento');
  assert.equal(STATUS_LABELS.terminado, 'Terminado');
  assert.equal(jogoEmAndamento({ estado: 'em_curso' }), true);
  assert.equal(jogoEmAndamento({ estado: 'terminado' }), false);
  assert.equal(jogoTerminado({ estado: 'terminado' }), true);
  assert.equal(jogoTerminado({ estado: 'cancelado' }), false, 'cancelado não é "Terminado"');
});

const em = (min) => new Date(Date.parse('2026-10-18T23:00:00Z') + min * 60000).toISOString();
const jogo = (id, minutos, extra = {}) => ({ id, team_id: 'T1', date: em(minutos), status: 'scheduled', estado: 'agendado', cancelado: false, ...extra });

test('Início: o jogo em andamento fica em "Próximos Jogos" e só vai para "Últimos Jogos" quando terminar', () => {
  const lista = [
    jogo('antigo', -60 * 24 * 7, { status: 'finished', estado: 'terminado' }),
    jogo('terminou', -60 * 24, { status: 'finished', estado: 'terminado' }),
    jogo('rolando', -30, { status: 'finished', estado: 'em_curso' }),
    jogo('proximo', 60 * 24 * 3, { status: 'drawn', estado: 'agendado' }),
  ];
  const { proximos, ultimos } = listasDoInicio(lista);
  assert.deepEqual(proximos.map((g) => g.id), ['rolando', 'proximo']);
  assert.deepEqual(ultimos.map((g) => g.id), ['terminou', 'antigo'], 'o mais recente primeiro');
  // O mesmo jogo, depois do resultado (ou das 2 horas): sai de cima e entra em "Últimos".
  const depois = lista.map((g) => (g.id === 'rolando' ? { ...g, estado: 'terminado' } : g));
  assert.deepEqual(listasDoInicio(depois).proximos.map((g) => g.id), ['proximo']);
  assert.deepEqual(listasDoInicio(depois).ultimos.map((g) => g.id), ['rolando', 'terminou', 'antigo']);
});

test('Início: "Últimos Jogos" tem no máximo 3, e cancelado não aparece em lista nenhuma', () => {
  const terminados = [4, 3, 2, 1].map((n) => jogo(`t${n}`, -60 * 24 * n, { status: 'finished', estado: 'terminado' }));
  const { proximos, ultimos } = listasDoInicio([...terminados, jogo('cancelado', -60 * 5, { status: 'finished', estado: 'cancelado', cancelado: true }), jogo('cancelado-futuro', 60 * 24, { estado: 'cancelado', cancelado: true })]);
  assert.deepEqual(ultimos.map((g) => g.id), ['t1', 't2', 't3']);
  assert.deepEqual(proximos, []);
});

test('Início: o "próximo jogo" (presença, RSVP, aviso de ausência) é o primeiro que AINDA NÃO COMEÇOU — o em andamento não conta', () => {
  const rolando = jogo('rolando', -30, { status: 'finished', estado: 'em_curso' });
  const proximo = jogo('proximo', 60 * 24, { estado: 'agendado' });
  assert.equal(listasDoInicio([rolando, proximo]).proximo.id, 'proximo');
  assert.equal(listasDoInicio([rolando]).proximo, null, 'só o jogo em andamento: não há próximo jogo');
  assert.equal(listasDoInicio([]).proximo, null);
  assert.deepEqual(listasDoInicio(null), { proximos: [], ultimos: [], proximo: null });
});

test('Início, motor mais velho (sem `estado`): as listas são as de sempre', () => {
  const lista = [
    { id: 'a', status: 'finished', cancelado: false },
    { id: 'b', status: 'finished', cancelado: true },
    { id: 'c', status: 'drawn', cancelado: false },
    { id: 'd', status: 'scheduled', cancelado: false },
  ];
  const { proximos, ultimos, proximo } = listasDoInicio(lista);
  assert.deepEqual(proximos.map((g) => g.id), ['c', 'd']);
  assert.deepEqual(ultimos.map((g) => g.id), ['a']);
  assert.equal(proximo.id, 'c');
});

test('"Sortear" continua levando ao próximo jogo que AINDA NÃO COMEÇOU: um jogo em andamento não conta', () => {
  const games = [
    { id: 'rolando', team_id: 'T1', date: em(-30), status: 'finished', estado: 'em_curso' },
    { id: 'proximo', team_id: 'T1', date: em(60 * 24 * 3), status: 'scheduled', estado: 'agendado' },
  ];
  assert.equal(destinoDoSortear('missa', 'T1', games), '/time/missa/jogo/proximo');
  assert.equal(destinoDoSortear('missa', 'T1', games.slice(0, 1)), '/time/missa/jogo/novo', 'só o jogo em andamento: vai para o Novo jogo');
});

test('a tela do Início usa as listas da regra (nada de conta própria), o GameCard mostra o selo e o NÃO MEXER fica: ranking, presença e o card "Quem ganhou?"', () => {
  const inicio = semComentarios(ler('src/pages/Inicio.jsx'));
  assert.match(inicio, /const \{ proximos: proximosJogos, ultimos: ultimosJogos, proximo: proximoJogo \} = listasDoInicio\(filtered\);/);
  assert.match(inicio, /const emAndamento = jogoEmAndamento\(game\);/);
  assert.match(inicio, /const isPast = game\.status === 'finished' && !emAndamento;/);
  assert.match(inicio, /badge badge--em-andamento hud-corners-s">\{STATUS_LABELS\.em_curso\}/);
  assert.match(inicio, /badge badge--encerrado hud-corners-s">\{STATUS_LABELS\.terminado\}/);
  // A presença segue no `status` de sempre: o RSVP é do primeiro jogo que não é "finished".
  assert.match(inicio, /\(dadosInicio\?\.convites\?\.games \|\| \[\]\)\.find\(\(g\) => g\.status !== 'finished'\)/);
  const avisos = semComentarios(ler('src/utils/avisosDoInicio.js'));
  assert.match(avisos, /jogo\.status === 'scheduled' && !jogo\.cancelado/, 'quem ainda deve resposta de presença: só o jogo marcado');
  assert.doesNotMatch(avisos + semComentarios(ler('src/utils/quemGanhou.js')) + semComentarios(ler('src/utils/seuTime.js')), /estadoDoJogo|em_curso/, 'presença, "Quem ganhou?" e "Sortear" não leem o estado novo');
});

test('Ajustes → Jogos: o jogo em andamento fica na lista de cima com o selo, e a linha é a do jogo que começou (com "Lançar resultado")', () => {
  const painel = ler('src/pages/AdminPanel.jsx');
  assert.match(painel, /if \(estadoDoJogo\(g\) === 'em_curso'\) return linhaDoJogoQueComecou\(g\);/);
  assert.match(painel, /\{passados\.map\(linhaDoJogoQueComecou\)\}/);
  assert.match(painel, /<BadgeStatus status="em_curso" \/>/);
  assert.match(painel, /data-lancar-resultado onClick=\{\(\) => setLancar\(g\)\}>Lançar resultado/);
  assert.match(semComentarios(ler('src/components/ListaDeJogos.jsx')), /export function BadgeStatus\(\{ status \}\)/);
});

test('card "Seu time": a ordem é Painel do time · Novo jogo · Sortear · Convidar, e o Painel continua levando à aba Ajustes', () => {
  const card = semComentarios(ler('src/components/CardSeuTime.jsx'));
  const atalhos = [...card.matchAll(/rotulo="([^"]+)"/g)].map((m) => m[1]);
  assert.deepEqual(atalhos, ['Painel do time', 'Novo jogo', 'Sortear', 'Convidar']);
  assert.match(card, /<Atalho para=\{`\$\{base\}\?aba=ajustes`\} Icone=\{Settings\} rotulo="Painel do time" \/>/);
  // A própria aba, no topo da página do time, não foi renomeada.
  assert.match(ler('src/pages/Equipa.jsx'), /\['ajustes', 'Ajustes'\]/);
});
