// Futty v2.0 — Rodada 30F, item 1: "Chavo, el matador" ainda saía "Chavo, el matad…" no Início.
//
// A 29T mandou a letra descer até caber, mas media com scrollWidth: é inteiro e, com text-overflow: ellipsis, o Chrome o
// devolve igual ao clientWidth (360 === 360) com o texto a 360,45 px. O laço nunca entrava. Agora a medida é a do TEXTO
// em sub-pixel (Range.getBoundingClientRect), contra a caixa medida do mesmo jeito, com 1 px de folga.
// O comportamento (360 px, Rajdhani de verdade, nada sobrando para a reticência) é provado no navegador:
// scripts/provas/nome-do-inicio.prova.mjs (npm run provar:navegador -- nome-do-inicio). Aqui fica a trava do código — o
// jsdom não faz layout (mede tudo 0), então não serviria para provar meio pixel.
//
// Uso: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = fileURLToPath(new URL('../../', import.meta.url));
const ler = (rel) => fs.readFileSync(path.join(RAIZ, rel), 'utf8');
const semComentarios = (texto) => texto.replace(/\/\*[\s\S]*?\*\//g, '').split('\n').filter((l) => !/^\s*\/\//.test(l)).join('\n');

const inicio = ler('src/pages/Inicio.jsx');
const nomeCromo = semComentarios(inicio.slice(inicio.indexOf('export function NomeCromo'), inicio.indexOf('// ----- Card de jogo')));

test('30F-1 · o NomeCromo mede o texto em sub-pixel (Range), não com scrollWidth', () => {
  assert.match(nomeCromo, /const r = document\.createRange\(\);\s*r\.selectNodeContents\(el\);\s*return r\.getBoundingClientRect\(\)\.width;/);
  assert.doesNotMatch(nomeCromo, /scrollWidth/, 'scrollWidth é inteiro e cego ao meio pixel com reticência');
});

test('30F-1 · a caixa é medida do mesmo jeito (getBoundingClientRect) e com 1 px de folga', () => {
  assert.match(nomeCromo, /const cabe = el\.getBoundingClientRect\(\)\.width - 1;/);
  assert.match(nomeCromo, /if \(cabe <= 0\) return;/, 'fora da tela não mede (largura 0)');
  assert.match(nomeCromo, /while \(larguraDoTexto\(\) > cabe && f > PISO_NOME\)/);
});

test('30F-1 · continua reajustando quando a coluna muda e quando a Rajdhani chega', () => {
  assert.match(nomeCromo, /new ResizeObserver\(ajustar\)/);
  assert.match(nomeCromo, /document\.fonts\.ready\.then\(ajustar\)/);
});

test('30F-1 · a prova de navegador existe e mede "Chavo, el matador" em 360 px com a Rajdhani carregada', () => {
  const html = ler('scripts/provas/nome-do-inicio.html');
  assert.match(html, /@font-face \{ font-family: 'Rajdhani'; font-style: normal; font-weight: 700 800;/);
  assert.match(ler('scripts/provas/nome-do-inicio.jsx'), /const LARGURAS = \[360,/);
  assert.match(ler('scripts/provas/nome-do-inicio.jsx'), /dono: 'Chavo, el matador'/);
});
