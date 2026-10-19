// Futty v2.0 — Rodada 30L, parte 2 (telas): os acabamentos do campeonato.
// O que a tela decide sozinha: o placar com pênaltis em todas as telas, o card do Início (em andamento, final, campeão, "Você é
// campeão!"), a linha do sorteio ("20 confirmados → 4 times de 5"), o nome padrão ao criar pelo sorteio — e que cada acabamento está
// ligado nas telas (as colunas, a marca só depois do 1º jogo, o aviso da final, o toast no topo, o post na Resenha).
//
// Uso: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { linhaDaFinalDoPost, placarComPenaltis, placarDaFinalDoPost } from '../../src/utils/campeonatoPlacar.js';
import { VOCE_E_CAMPEAO, textosDoCardDoCampeonato } from '../../src/utils/campeonatoInicio.js';
import { resumoDoSorteio } from '../../src/utils/sorteioResumo.js';
import { MAX_NOME_DO_CAMPEONATO, nomePadraoDoCampeonato } from '../../src/utils/campeonatoDoSorteio.js';
import { linhaDaFinal } from '../../src/utils/campeonatoCartao.js';
import { lerAppCss } from './_appCss.mjs';

const RAIZ = fileURLToPath(new URL('../../', import.meta.url));
const ler = (rel) => fs.readFileSync(path.join(RAIZ, rel), 'utf8').replace(/\r\n/g, '\n');
const semComentarios = (texto) => texto.replace(/\/\*[\s\S]*?\*\//g, '').split('\n').filter((l) => !/^\s*\/\//.test(l)).join('\n');

// ─── O placar com pênaltis ───────────────────────────────────────────────────────────────────────────────────────────────────

test('placar com pênaltis: "2 × 2 (pên.: Time Ouro)" — e só "3 × 2" quando o placar decidiu', () => {
  const nomes = { a: 'Time Roxo', b: 'Time Ouro' };
  const nomeDe = (id) => nomes[id];
  assert.equal(placarComPenaltis({ placar_a: 2, placar_b: 2, penaltis_vencedor_id: 'b' }, nomeDe), '2 × 2 (pên.: Time Ouro)');
  assert.equal(placarComPenaltis({ placar_a: 3, placar_b: 2, penaltis_vencedor_id: null }, nomeDe), '3 × 2');
  assert.equal(placarComPenaltis({ placar_a: null, placar_b: null }, nomeDe), '', 'sem placar lançado, nada');
  assert.equal(placarComPenaltis(null, nomeDe), '');
});

test('o post da Resenha e o cartão 9:16 falam o mesmo: a final numa linha, com os pênaltis', () => {
  const final = { a: { nome: 'Time Roxo', gols: 2 }, b: { nome: 'Time Ouro', gols: 2 }, penaltis: 'Time Ouro' };
  assert.equal(placarDaFinalDoPost(final), '2 × 2 (pên.: Time Ouro)');
  assert.equal(linhaDaFinalDoPost(final), 'Time Roxo 2 × 2 Time Ouro (pên.: Time Ouro)');
  assert.equal(linhaDaFinalDoPost({ ...final, penaltis: null }), 'Time Roxo 2 × 2 Time Ouro');
  assert.equal(linhaDaFinalDoPost(null), '');
  const campeonato = {
    formato: 'pontos_final', times: [{ id: 'r', nome: 'Time Roxo' }, { id: 'o', nome: 'Time Ouro' }],
    confrontos: [{ fase: 'grupos', ronda: 1 }, { fase: 'final', ronda: 2, jogado: true, time_a_id: 'r', time_b_id: 'o', placar_a: 2, placar_b: 2, penaltis_vencedor_id: 'o' }],
  };
  assert.equal(linhaDaFinal(campeonato), 'Final · Time Roxo 2 × 2 Time Ouro (pên.: Time Ouro)');
  assert.equal(linhaDaFinal({ formato: 'pontos', times: [], confrontos: [] }), '', 'pontos corridos não tem final');
  assert.equal(linhaDaFinal({ ...campeonato, confrontos: [{ fase: 'final', ronda: 2, jogado: false }] }), '', 'final por jogar não aparece');
});

// ─── O card do Início ────────────────────────────────────────────────────────────────────────────────────────────────────────

const andamento = (extra = {}) => ({
  id: 'c1', nome: 'Campeonato Domingueira FC', formato: 'pontos_final', estado: 'em_curso', fase: 'Fase de grupos', jogos_lancados: 3, jogos_total: 6,
  primeiros: [{ nome: 'Time Ouro', cor: '#d4a017', PTS: 6, pos: 1 }, { nome: 'Time Roxo', cor: '#8b5cf6', PTS: 1, pos: 2 }],
  final: null, campeao: null, voce_e_campeao: false, ...extra,
});

test('card do Início, em andamento: "Fase de grupos · 3 de 6 jogos" e os 2 primeiros', () => {
  const t = textosDoCardDoCampeonato(andamento());
  assert.equal(t.tipo, 'andamento');
  assert.equal(t.linha, 'Fase de grupos · 3 de 6 jogos');
  assert.deepEqual(t.primeiros.map((p) => [p.pos, p.nome, p.pontos]), [[1, 'Time Ouro', '6 pts'], [2, 'Time Roxo', '1 pt']]);
  assert.equal(t.destaque, null);
});

test('card do Início, recém-criado: 0 de 6 jogos e sem "primeiros" (a tabela zerada não tem primeiro)', () => {
  const t = textosDoCardDoCampeonato(andamento({ jogos_lancados: 0, primeiros: [] }));
  assert.equal(t.linha, 'Fase de grupos · 0 de 6 jogos');
  assert.deepEqual(t.primeiros, []);
});

test('card do Início, outros formatos dizem a fase deles', () => {
  assert.equal(textosDoCardDoCampeonato(andamento({ formato: 'mata', fase: 'Semifinais', jogos_lancados: 1, jogos_total: 3, primeiros: [] })).linha, 'Semifinais · 1 de 3 jogos');
  assert.equal(textosDoCardDoCampeonato(andamento({ formato: 'pontos', fase: 'Pontos corridos', jogos_total: 1, jogos_lancados: 0, primeiros: [] })).linha, 'Pontos corridos · 0 de 1 jogo');
});

test('card do Início, final definida: "Final: Time Roxo × Time Ouro"', () => {
  const t = textosDoCardDoCampeonato(andamento({ fase: 'Final', jogos_lancados: 6, final: { a: { nome: 'Time Roxo' }, b: { nome: 'Time Ouro' } } }));
  assert.equal(t.tipo, 'final');
  assert.equal(t.linha, 'Final: Time Roxo × Time Ouro');
});

test('card do Início, terminado: "Campeão: Time Ouro"; para quem é do time campeão, "Você é campeão!"', () => {
  const campeao = andamento({ estado: 'terminado', fase: 'Terminado', jogos_lancados: 6, campeao: { nome: 'Time Ouro', cor: '#d4a017' } });
  const outro = textosDoCardDoCampeonato(campeao);
  assert.deepEqual([outro.tipo, outro.linha, outro.destaque], ['campeao', 'Campeão: Time Ouro', null]);
  const voce = textosDoCardDoCampeonato({ ...campeao, voce_e_campeao: true });
  assert.deepEqual([voce.tipo, voce.linha, voce.destaque], ['voce-campeao', 'Campeão: Time Ouro', VOCE_E_CAMPEAO]);
  assert.equal(VOCE_E_CAMPEAO, 'Você é campeão!');
});

// ─── A linha do sorteio ──────────────────────────────────────────────────────────────────────────────────────────────────────

test('a conta do sorteio em frase: a regra de verdade (÷ por time; o que sobra vai para o banco de reservas; 2 a 4 times)', () => {
  assert.deepEqual(resumoDoSorteio(20, 5), { ok: true, texto: '20 confirmados → 4 times de 5' });
  assert.deepEqual(resumoDoSorteio(22, 5), { ok: true, texto: '22 confirmados → 4 times de 5, 2 ficam de reserva' });
  assert.deepEqual(resumoDoSorteio(21, 5), { ok: true, texto: '21 confirmados → 4 times de 5, 1 fica de reserva' });
  assert.deepEqual(resumoDoSorteio(10, 5), { ok: true, texto: '10 confirmados → 2 times de 5' });
  assert.deepEqual(resumoDoSorteio(1, 5), { ok: false, texto: '1 confirmado: faltam 9 jogadores para formar 2 times de 5.' });
  assert.deepEqual(resumoDoSorteio(9, 5), { ok: false, texto: '9 confirmados: faltam 1 jogador para formar 2 times de 5.' });
  assert.deepEqual(resumoDoSorteio(20, 3), { ok: false, texto: '20 confirmados com 3 por time dariam 6 times, e o máximo é 4: aumente os jogadores por time.' });
  assert.equal(resumoDoSorteio(30, 8).ok, false, 'mais de 28 jogadores o sorteio não faz');
  assert.match(resumoDoSorteio(30, 8).texto, /no máximo 28 jogadores/);
});

test('o nome que vem preenchido ao criar pelo sorteio: "Campeonato <time>", cabendo nos 60 caracteres', () => {
  assert.equal(nomePadraoDoCampeonato('Domingueira FC'), 'Campeonato Domingueira FC');
  assert.equal(nomePadraoDoCampeonato(''), 'Campeonato');
  assert.equal(nomePadraoDoCampeonato('x'.repeat(100)).length, MAX_NOME_DO_CAMPEONATO);
});

// ─── Cada acabamento está ligado nas telas ───────────────────────────────────────────────────────────────────────────────────

test('a tabela: colunas P J V E D GP:GC SG; a barra dourada da final vem do motor (`classificado`), a do líder só nos pontos corridos', () => {
  const vistas = semComentarios(ler('src/components/CampeonatoVistas.jsx'));
  assert.match(vistas, /<span>P<\/span><span>J<\/span><span>V<\/span><span>E<\/span><span>D<\/span><span>GP:GC<\/span><span>SG<\/span>/);
  const celulas = [...vistas.matchAll(/<span className="(p|c|gpgc)"[^>]*>/g)].map((m) => m[1]);
  assert.deepEqual(celulas.slice(0, 7), ['p', 'c', 'c', 'c', 'c', 'gpgc', 'c'], 'as células seguem a ordem do cabeçalho (P J V E D GP:GC SG)');
  assert.match(vistas, /const jogou = linhas\.some\(\(l\) => l\.J > 0\)/);
  assert.match(vistas, /if \(t\.classificado && !noEmpate\.has\(t\.id\)\) classes\.push\(pos === 1 \? 'camp-tab__r--lider' : 'camp-tab__r--final'\)/);
  assert.match(vistas, /else if \(jogou && pos === 1\) classes\.push\('camp-tab__r--lider'\)/);
  assert.match(lerAppCss(), /\.camp-tab__hd,\.camp-tab__r\{display:grid;grid-template-columns:16px 1fr 20px 18px 18px 18px 18px 40px 26px;/);
});

test('o empate de uma decisão não é recusado: a tela pergunta "Empatou. Quem venceu nos pênaltis?" (final e mata-mata)', () => {
  const vistas = semComentarios(ler('src/components/CampeonatoVistas.jsx'));
  assert.match(vistas, /Empatou\. Quem venceu nos pênaltis\?/);
  assert.match(vistas, /if \(eliminatoria && Number\(a\) === Number\(b\)\) \{ setPerguntando\(true\); return; \}/);
  assert.match(vistas, /<ResultadoEditor confronto=\{final\} onResultado=\{onResultado\} eliminatoria nomes=\{nomes\} \/>/, 'a final');
  assert.match(vistas, /<ResultadoEditor confronto=\{c\} onResultado=\{onResultado\} eliminatoria nomes=\{nomes\} \/>/, 'o mata-mata');
  assert.match(vistas, /\(pên\.: \{nomeDe\(final\.penaltis_vencedor_id\)\}\)/, 'a final mostra (pên.: X)');
  const pagina = semComentarios(ler('src/pages/Campeonato.jsx'));
  assert.match(pagina, /penaltis_vencedor_id: penaltisVencedorId/, 'e o vencedor vai no pedido');
});

test('a final definida: aviso "Final definida: 1º × 2º" e rolagem suave (só se a pessoa não mexeu)', () => {
  const pagina = semComentarios(ler('src/pages/Campeonato.jsx'));
  assert.match(pagina, /`Final definida: \$\{nome\(depois\.time_a_id\)\} × \$\{nome\(depois\.time_b_id\)\}`/);
  assert.match(pagina, /scrollIntoView\(\{ behavior: reduz \? 'auto' : 'smooth', block: 'center' \}\)/);
  assert.match(pagina, /\['pointerdown', 'touchstart', 'wheel', 'keydown'\]/, 'tocar, rolar ou digitar cancela a rolagem automática');
  assert.match(pagina, /if \(mexeu\) return;/);
});

test('"Temos campeão!" sobe para o topo (não cobre os botões de compartilhar)', () => {
  const pagina = semComentarios(ler('src/pages/Campeonato.jsx'));
  assert.match(pagina, /mensagem: jaTinhaCampeao \? 'Final corrigida\.' : 'Temos campeão!', posicao: 'topo'/);
  assert.match(pagina, /<Toast mensagem=\{toast\.mensagem\} tipo=\{toast\.tipo\} posicao=\{toast\.posicao\}/);
  assert.match(semComentarios(ler('src/components/Toast.jsx')), /posicao = 'meio'/);
  assert.match(ler('src/index.css'), /\.futty-toast--topo \{/);
});

test('o sorteio mostra marcado o número usado, e a conta em frase abaixo de "Jogadores por time"', () => {
  const jogo = semComentarios(ler('src/pages/Jogo.jsx'));
  assert.match(jogo, /className=\{`chip \$\{porTimeEfectivo === n \? 'chip--active' : ''\}`\}/);
  assert.doesNotMatch(jogo, /jogadoresPorTime === n/);
  assert.match(jogo, /data-resumo-do-sorteio/);
  assert.match(jogo, /resumoDoSorteio\(confirmados\.length \+ convidados\.length, porTimeEfectivo\)/);
});

test('criar pelo sorteio pede o nome (preenchido, editável) e a data do jogo vira subtítulo', () => {
  const peca = semComentarios(ler('src/components/CampeonatoDoSorteio.jsx'));
  assert.match(peca, /nomePadraoDoCampeonato\(nomeDoTime\)/);
  assert.match(peca, /game_id: gameId, formato, nome: nome\.trim\(\)/);
  assert.match(peca, /disabled=\{criando \|\| !nome\.trim\(\)\}/);
  for (const arq of ['src/pages/Campeonato.jsx', 'src/pages/CampeonatoPublico.jsx']) {
    assert.match(semComentarios(ler(arq)), /Do sorteio de \{formatarData\(camp\.origem_data/, `${arq}: o subtítulo`);
  }
});

test('o Início mostra o campeonato novo para todo o time, e a Resenha tem o post do campeão', () => {
  const inicio = semComentarios(ler('src/pages/Inicio.jsx'));
  assert.match(inicio, /dadosInicio\?\.campeonato_novo/);
  assert.match(inicio, /<CardCampeonatoInicio campeonato=\{campeonatoNovo\} slug=\{campSlugDoNovo\} \/>/);
  const feed = semComentarios(ler('src/pages/Feed.jsx'));
  assert.match(feed, /item\.conteudo\?\.tipo === 'campeao_campeonato'/);
  assert.match(feed, /<Reacoes targetType="post" targetId=\{p\.id\}/, 'reações como os outros posts');
  assert.match(feed, /<Comentarios parentType="post" parentId=\{p\.id\}/, 'comentários como os outros posts');
  assert.match(feed, /\/campeonato\/\$\{c\.campeonato_id\}/, 'tocar abre o campeonato');
  assert.match(feed, /<Trophy size=\{14\}/, 'o troféu é do lucide (emoji só como conteúdo)');
});
