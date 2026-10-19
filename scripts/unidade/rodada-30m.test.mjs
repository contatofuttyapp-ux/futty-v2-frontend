// Futty v2.0 — Rodada 30M (telas): os últimos ajustes do campeonato.
// O que a tela decide sozinha: o próximo jogo no card do Início (e só quando faz sentido), o título do post do campeão sem preposição — e
// que cada ajuste está ligado nas telas (a barra de "classificado" com a legenda, o pódio com chão e margem, o próximo jogo no topo da
// página do time e na pública).
//
// Uso: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { textosDoCardDoCampeonato, tituloDoPostDoCampeao } from '../../src/utils/campeonatoInicio.js';
import { lerAppCss } from './_appCss.mjs';

const RAIZ = fileURLToPath(new URL('../../', import.meta.url));
const ler = (rel) => fs.readFileSync(path.join(RAIZ, rel), 'utf8').replace(/\r\n/g, '\n');
const semComentarios = (texto) => texto.replace(/\/\*[\s\S]*?\*\//g, '').split('\n').filter((l) => !/^\s*\/\//.test(l)).join('\n');

const proximo = { a: { nome: 'Time Roxo', cor: '#8b5cf6' }, b: { nome: 'Time Prata', cor: '#aab4c8' } };
const andamento = (extra = {}) => ({
  id: 'c1', nome: 'Copa da Domingueira', formato: 'pontos_final', estado: 'em_curso', fase: 'Fase de grupos', jogos_lancados: 3, jogos_total: 6,
  primeiros: [], final: null, proximo, campeao: null, voce_e_campeao: false, ...extra,
});

// ─── O próximo jogo no card do Início ────────────────────────────────────────────────────────────────────────────────────────

test('card do Início em andamento: o próximo jogo vem junto (o primeiro ainda sem placar)', () => {
  assert.deepEqual(textosDoCardDoCampeonato(andamento()).proximo, proximo);
  assert.equal(textosDoCardDoCampeonato(andamento({ jogos_lancados: 0 })).proximo.a.nome, 'Time Roxo');
});

test('com a final definida o card já diz "Final: A × B" (é o próximo jogo): não repete; com o campeão não há mais jogo', () => {
  const final = textosDoCardDoCampeonato(andamento({ fase: 'Final', jogos_lancados: 6, final: { a: { nome: 'Time Ouro' }, b: { nome: 'Time Prata' } } }));
  assert.equal(final.linha, 'Final: Time Ouro × Time Prata');
  assert.equal(final.proximo, null);
  const campeao = textosDoCardDoCampeonato(andamento({ estado: 'terminado', proximo: null, campeao: { nome: 'Time Ouro', cor: '#d4a017' } }));
  assert.equal(campeao.proximo, null);
});

test('sem próximo jogo no resumo (campeonato antigo, formato sem jogo à vista): o card segue como era', () => {
  assert.equal(textosDoCardDoCampeonato(andamento({ proximo: undefined })).proximo, null);
  assert.equal(textosDoCardDoCampeonato(andamento({ proximo: null })).proximo, null);
});

// ─── O título do post do campeão ─────────────────────────────────────────────────────────────────────────────────────────────

test('título do post: "<Time> é campeão" · <campeonato> — sem preposição, serve para "Copa", "Taça" e "Liga"', () => {
  assert.deepEqual(tituloDoPostDoCampeao('Time Ouro', 'Copa da Domingueira'), { time: 'Time Ouro é campeão', campeonato: 'Copa da Domingueira' });
  assert.equal(tituloDoPostDoCampeao('Time Roxo', 'Taça Futty').time, 'Time Roxo é campeão');
});

test('a Resenha usa o título novo e a construção antiga ("campeão do <nome>") não existe mais nas telas', () => {
  const feed = semComentarios(ler('src/pages/Feed.jsx'));
  assert.match(feed, /tituloDoPostDoCampeao\(campeao\.nome, c\.campeonato_nome\)/);
  assert.match(feed, /\{titulo\.time\}/);
  for (const arquivo of ['src/pages/Feed.jsx', 'src/pages/Inicio.jsx', 'src/components/CardCampeonatoInicio.jsx', 'src/components/CampeonatoVistas.jsx', 'src/utils/campeonatoInicio.js', 'src/utils/campeonatoCartao.js']) {
    assert.doesNotMatch(semComentarios(ler(arquivo)), /campeão d[oa] /, `${arquivo} ainda tem "campeão do/da"`);
  }
});

// ─── Cada ajuste está ligado nas telas ───────────────────────────────────────────────────────────────────────────────────────

test('a tabela explica a barra dourada (legenda) quando há classificado, e só no formato com final', () => {
  const vistas = semComentarios(ler('src/components/CampeonatoVistas.jsx'));
  assert.match(vistas, /const haClassificado = comFinal && linhas\.some\(\(l\) => l\.classificado\)/);
  assert.match(vistas, /data-legenda-classificado>Barra dourada: classificado para a final\.</);
  assert.match(vistas, /data-classificado=\{comFinal && t\.classificado \? 'sim' : undefined\}/);
});

test('o pódio tem chão e respiro: os degraus apoiam numa linha e a margem de baixo os separa dos botões', () => {
  const css = lerAppCss();
  const podio = css.match(/\.camp-podio\{[^}]*\}/)[0];
  assert.match(podio, /margin:4px 0 22px/);
  assert.match(podio, /border-bottom:2px solid rgba\(255,255,255,0\.18\)/);
  assert.match(css, /\.camp-podio__step\{[^}]*border-bottom:none/, 'o degrau apoia no chão: a linha do chão é a borda de baixo dele');
});

test('o próximo jogo está no topo da página do time e da pública, e no card do Início', () => {
  assert.match(semComentarios(ler('src/pages/Campeonato.jsx')), /<CampeonatoProximoJogo proximo=\{camp\.proximo_jogo\} \/>/);
  assert.match(semComentarios(ler('src/pages/CampeonatoPublico.jsx')), /<CampeonatoProximoJogo proximo=\{camp\.proximo_jogo\} \/>/);
  const card = semComentarios(ler('src/components/CardCampeonatoInicio.jsx'));
  assert.match(card, /\{t\.proximo \? \(/);
  assert.match(card, /Próximo jogo:/);
  assert.match(semComentarios(ler('src/components/CampeonatoVistas.jsx')), /Próximo jogo:/);
});
