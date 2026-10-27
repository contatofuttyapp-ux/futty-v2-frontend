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
import { escolhaParaOEditor, perguntaDoJogo } from '../../src/utils/quemGanhou.js';
import { TEXTOS } from '../../src/utils/jogoPassado.js';
import { lerPagina } from './_fonteDaPagina.mjs';

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
  const inicio = semComentarios(lerPagina('Inicio'));
  assert.match(inicio, /const \{ proximos: proximosJogos, ultimos: ultimosJogos, proximo: proximoJogo \} = listasDoInicio\(filtered\);/);
  assert.match(inicio, /const emAndamento = jogoEmAndamento\(game\);/);
  assert.match(inicio, /const isPast = game\.status === 'finished' && !emAndamento;/);
  assert.match(inicio, /badge badge--em-andamento hud-corners-s">\{STATUS_LABELS\.em_curso\}/);
  assert.match(inicio, /badge badge--encerrado hud-corners-s">\{STATUS_LABELS\.terminado\}/);
  // 32H: não há mais o cartão de presença à parte — a resposta mora no cartão de cada jogo.
  assert.doesNotMatch(inicio, /rsvpInfo|RSVPCard/);
  const avisos = semComentarios(ler('src/utils/avisosDoInicio.js'));
  assert.doesNotMatch(avisos + semComentarios(ler('src/utils/quemGanhou.js')) + semComentarios(ler('src/utils/seuTime.js')), /estadoDoJogo|em_curso/, 'presença, "Quem ganhou?" e "Sortear" não leem o estado novo');
});

test('Ajustes → Jogos: o jogo em andamento fica na lista de cima com o selo, e a linha é a do jogo que começou (com "Lançar resultado")', () => {
  const painel = lerPagina('AdminPanel');
  assert.match(painel, /if \(estadoDoJogo\(g\) === 'em_curso'\) return linhaDoJogoQueComecou\(g\);/);
  assert.match(painel, /\{passados\.map\(linhaDoJogoQueComecou\)\}/);
  assert.match(painel, /<BadgeStatus status="em_curso" \/>/);
  assert.match(painel, /data-lancar-resultado onClick=\{\(\) => setLancar\(g\)\}>Lançar resultado/);
  assert.match(semComentarios(ler('src/components/ListaDeJogos.jsx')), /export function BadgeStatus\(\{ status \}\)/);
});

test('card "Seu time": a ordem é Painel · Novo jogo · Sortear · Convidar, e o Painel continua levando à aba (?aba=ajustes)', () => {
  const card = semComentarios(ler('src/components/CardSeuTime.jsx'));
  const atalhos = [...card.matchAll(/rotulo="([^"]+)"/g)].map((m) => m[1]);
  assert.deepEqual(atalhos, ['Painel', 'Novo jogo', 'Sortear', 'Convidar']);
  assert.match(card, /<Atalho para=\{`\$\{base\}\?aba=ajustes`\} Icone=\{Settings\} rotulo="Painel" \/>/);
  assert.doesNotMatch(card, /textWrap|balance/, 'o rótulo cabe numa linha: nada de quebra equilibrada');
});

test('a aba do topo da página do time se chama "Painel" (com o selo ADMIN); a chave interna segue sendo ajustes', () => {
  const equipa = semComentarios(ler('src/pages/Equipa.jsx'));
  assert.match(equipa, /\['ajustes', 'Painel'\]/);
  assert.match(equipa, /data-aba=\{k\}/, 'o data-aba continua sendo a chave (ajustes), não o texto');
  assert.match(equipa, /\{k === 'ajustes' \? \(\s*<span data-selo-admin/, 'o selo ADMIN continua na aba do admin');
  assert.doesNotMatch(equipa, /\['ajustes', 'Ajustes'\]/);
  assert.match(ler('src/lib/rotasAntigas.js'), /ajustes/, 'o endereço ?aba=ajustes não mudou');
});

test('os textos que citam a aba dizem "Painel": Novo jogo e "Como terminou?" do Jogo passado; nenhuma tela escreve "Ajustes" para a pessoa', () => {
  assert.match(ler('src/pages/NovoJogo.jsx'), /O padrão muda no Painel do time\./);
  assert.equal(TEXTOS.semResultado, 'O jogo fica salvo com quem jogou, sem resultado. Dá para lançar depois, no Painel → Jogos.');
  const visiveis = [];
  const varrer = (dir) => {
    for (const e of fs.readdirSync(path.join(RAIZ, dir), { withFileTypes: true })) {
      const rel = `${dir}/${e.name}`;
      if (e.isDirectory()) varrer(rel);
      else if (/\.(jsx?|css)$/.test(e.name) && /\bAjustes\b/.test(semComentarios(ler(rel)))) visiveis.push(rel);
    }
  };
  varrer('src');
  assert.deepEqual(visiveis, [], 'a palavra "Ajustes" só sobrou em comentário');
});

test('Painel → Jogos: título e data nunca ficam esmagados — selo e botões descem juntos para uma segunda linha', () => {
  const painel = lerPagina('AdminPanel');
  const linha = painel.slice(painel.indexOf('function linhaDoJogoQueComecou'), painel.indexOf('function linhaDoJogoQueComecou') + 3200);
  assert.match(linha, /display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px 10px'/, 'a linha quebra quando não cabe');
  assert.match(linha, /flex: '1 1 150px', minWidth: 150/, 'o bloco do título e da data tem piso de 150 px');
  assert.match(linha, /data-linha-de-jogo-acoes style=\{\{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' \}\}/, 'selo e botões andam juntos');
  assert.match(linha, /\{emAndamento \? <BadgeStatus status="em_curso" \/> : semResultado \? null :/, 'o selo do "Em andamento" mora com os botões, não no título');
});

test('a pergunta do Início: título "Quem ganhou o jogo?", tocar só SELECIONA, "Finalizar" salva, o X fecha e "Agora não" saiu', () => {
  assert.equal(perguntaDoJogo(2).titulo, 'Quem ganhou o jogo?');
  assert.equal(perguntaDoJogo(3).titulo, 'Quem foi o campeão?');
  assert.equal(perguntaDoJogo(4).temEmpate, false);
  const aviso = semComentarios(ler('src/components/AvisoQuemGanhou.jsx'));
  assert.doesNotMatch(aviso, /Agora não/);
  assert.match(aviso, /onClick=\{\(\) => setEscolha\(i\)\}/, 'tocar no time só escolhe');
  assert.match(aviso, /onClick=\{\(\) => setEscolha\('empate'\)\}/, 'Empate também só escolhe');
  assert.match(aviso, /disabled=\{semEscolha \|\| busy\}/, '"Finalizar" fica apagado até haver escolha');
  assert.match(aviso, /onClick=\{finalizar\}/);
  assert.match(aviso, /aria-label="Fechar"/);
  assert.match(aviso, /<X size=\{22\}/, 'o X do canto');
  assert.match(aviso, /onClick=\{\(\) => !busy && onClose\(\)\}/, 'tocar fora também fecha');
  // O pedido só sai dentro de finalizar(): nenhum toque de escolha chama o motor.
  assert.equal((aviso.match(/apiFetch\(/g) || []).length, 1);
  assert.match(aviso, /async function finalizar\(\) \{[\s\S]*?apiFetch\(/);
  assert.match(ler('src/components/AvisoQuemGanhou.jsx'), /Toque para responder/, 'o card segue só abrindo a pergunta');
});

test('"Lançar gols e prêmios" leva a escolha junto para o editor do jogo (e ela não se perde)', () => {
  assert.deepEqual(escolhaParaOEditor(1), { campeaoIdx: 1, empate: false });
  assert.deepEqual(escolhaParaOEditor(0), { campeaoIdx: 0, empate: false }, 'o time 0 é um time');
  assert.deepEqual(escolhaParaOEditor('empate'), { campeaoIdx: null, empate: true });
  assert.equal(escolhaParaOEditor(null), null);
  assert.match(semComentarios(ler('src/components/AvisoQuemGanhou.jsx')), /state=\{\{ quemGanhou: escolhaParaOEditor\(escolha\) \}\}/);
  assert.match(semComentarios(ler('src/pages/Jogo.jsx')), /escolhaInicial=\{location\.state\?\.quemGanhou \|\| null\}/);
  const editor = semComentarios(ler('src/components/ResultadoEditor.jsx'));
  assert.match(editor, /escolhaInicial && doJogo\.campeaoIdx === null && !doJogo\.empate \? \{ \.\.\.doJogo, campeaoIdx: escolhaInicial\.campeaoIdx, empate: escolhaInicial\.empate \} : doJogo/, 'só vale em jogo ainda sem resultado: o que o motor guardou manda');
});
