// Futty v2.0 — Rodada 29N (achado 146, decisão do dono, 3-out): o card "Seus times" vai para LOGO ABAIXO do avatar.
//
// Ordem do Início: avisos (push, nascimento, pedidos, votação, figurinha) → avatar · nome · nota → Seus times → chips → Próximos Jogos.
// Decisão da Freaky, junto: a linha "● nome do time" sob o nome some quando o card aparece (o nome do time não sai duas vezes em 60 px).
// A medida na tela (avatar, nome, nota e o card cabem na primeira tela de 390 px) fica na captura 01-inicio.png (scripts/capturar-telas.mjs).
//
// Uso: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = fileURLToPath(new URL('../../', import.meta.url));
const ler = (rel) => fs.readFileSync(path.join(RAIZ, rel), 'utf8');
// O código sem os comentários: os comentários contam a história (e citam o card e os chips), a tela não.
const semComentarios = (texto) => texto.replace(/\/\*[\s\S]*?\*\//g, '').split('\n').filter((l) => !/^\s*\/\//.test(l)).join('\n');

test('29N · o card "Seus times" vem DEPOIS das stats do avatar e ANTES dos chips (e uma vez só)', () => {
  const inicio = semComentarios(ler('src/pages/Inicio.jsx'));
  const em = (trecho) => {
    const i = inicio.indexOf(trecho);
    assert.ok(i >= 0, `Inicio.jsx não tem ${trecho}`);
    return i;
  };
  const cromo = em('<CromoInicio ');
  const nome = em('<NomeCromo ');
  const stats = em('className="inicio-stats"');
  const card = em('<CardSeuTime ');
  const chips = em('className="chips-row"');
  assert.equal(inicio.split('<CardSeuTime ').length - 1, 1, 'um card só na página');
  assert.ok(cromo < nome && nome < stats, 'avatar → nome → nota, como sempre');
  assert.ok(stats < card, 'o card vem depois de .inicio-stats');
  assert.ok(card < chips, 'o card vem antes de .chips-row');
});

test('29N · os avisos (push, nascimento, figurinha) continuam ACIMA do avatar; o card não é mais a primeira coisa da página', () => {
  const inicio = semComentarios(ler('src/pages/Inicio.jsx'));
  const main = inicio.indexOf('<main className="app-main"');
  assert.ok(main >= 0);
  const card = inicio.indexOf('<CardSeuTime ');
  const cromo = inicio.indexOf('<CromoInicio ');
  for (const aviso of ['pushEstado === \'suportado\'', 'precisaDob ?', 'ctaFigurinha ?']) {
    const i = inicio.indexOf(aviso, main);
    assert.ok(i > main && i < cromo, `${aviso}: depois do <main> e antes do avatar`);
  }
  assert.ok(card > cromo, 'o card não abre mais a página');
});

test('29N · a linha "● nome do time" sob o nome só aparece quando NÃO há card (o card já diz o time)', () => {
  const inicio = semComentarios(ler('src/pages/Inicio.jsx'));
  assert.match(inicio, /\{teams\[0\] && !\(dadosInicio\?\.seu_time \|\| \[\]\)\.length \? \(/);
  assert.doesNotMatch(inicio, /\{teams\[0\] \? \(\s*<div style=\{\{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13/, 'a condição antiga (sempre que há time) saiu');
  // O texto continua sendo o nome do primeiro time, para quem não administra e não tem card.
  assert.match(inicio, /\{teams\[0\]\.nome\}/);
});

// ── 29N-B · o avatar segue a LARGURA da tela, não a altura ──────────────────────────────────────────────────────────────────────
test('29N-B · .cromo-inicio mede min(49vw, 236px) — nenhuma altura (dvh/vh) dentro, e nenhum outro seletor sobrescreve a largura', () => {
  const css = ler('src/styles/app.css').replace(/\/\*[\s\S]*?\*\//g, '');
  const regra = css.match(/\.cromo-inicio\s*\{([^}]*)\}/);
  assert.ok(regra, 'achou a regra .cromo-inicio');
  assert.match(regra[1], /width:\s*min\(49vw,\s*236px\);/);
  assert.doesNotMatch(regra[1], /d?vh/, 'a altura da tela (no Safari com as barras, 664 em vez de 844) encolhia o avatar para 97 px');
  const todas = [...css.matchAll(/(^|\})\s*([^{}]*\.cromo-inicio[^{}]*)\{([^}]*)\}/g)].filter((m) => /(^|[^-\w])width\s*:/.test(m[3]));
  assert.equal(todas.length, 1, 'só a regra principal define a largura do avatar do Início');
  // A Figurinha continua com a fórmula da altura (ali o card tem de caber sem rolar): a 29N-B não mexe nela.
  assert.match(css, /\.fig-studio-card\s*\{\s*width:\s*min\(78vw, calc\(\(100dvh - 477px/);
});
