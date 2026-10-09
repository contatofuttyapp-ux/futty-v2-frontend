// Futty v2.0 — Rodada 30E, item 5: "sorteio justo" vira "sorteio de times" em todo texto público — as
// lojas já dizem "Sorteio de times", e o site (landing, meta tags, PWA) e a prévia de link (WhatsApp/
// Twitter) ainda diziam "justo". Travão de regressão: a varredura de `src/`, `index.html` e `public/` só
// pode achar a palavra "justo" dentro de comentário (os dois achados aqui são sobre encaixe de CSS/canvas,
// nada a ver com sorteio).
//
// Uso: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = fileURLToPath(new URL('../../', import.meta.url));
const ler = (rel) => fs.readFileSync(path.join(RAIZ, rel), 'utf8');

test('30E-5 · a landing, o mini sorteio, as meta tags e o manifesto dizem "sorteio de times"', () => {
  assert.match(ler('src/pages/LandingPage.jsx'), /Futty: sorteio de times, ranking e figurinha de colecionador para o seu futebol\./);
  assert.match(ler('src/components/MiniSorteio.jsx'), /SORTEIO&nbsp;DE&nbsp;TIMES&nbsp;· RANKING&nbsp;· FIGURINHA&nbsp;DE&nbsp;COLECIONADOR/);
  const html = ler('index.html');
  assert.match(html, /<meta name="description" content="Sorteio de times, ranking e figurinha de colecionador\." \/>/);
  assert.match(html, /<meta property="og:description" content="Sorteio de times, ranking e figurinha de colecionador\." \/>/);
  assert.match(ler('public/manifest.json'), /"description": "Sorteio de times, ranking e figurinha de colecionador\.",/);
  // A prévia de link do sorteio (WhatsApp/Twitter em /p/*, functions/_shared/previaDoLink.js) é a MESMA frase.
  assert.match(ler('functions/_shared/previaDoLink.js'), /descricao: 'Sorteio de times, ranking e figurinha de colecionador\.',/);
});

test('30E-5 · varredura: "justo" não aparece mais em src/, index.html nem public/, salvo em comentário histórico', () => {
  const achados = [];
  const EXCECOES = new Set([
    'src/pages/MeuPerfil.jsx', // "um elemento justo ao texto" — encaixe de CSS, não sorteio
    'src/utils/figurinhaCanvas.js', // "encaixe mais justo" — passo do canvas, não sorteio
  ]);
  const varrer = (dir) => {
    for (const nome of fs.readdirSync(path.join(RAIZ, dir))) {
      const rel = `${dir}/${nome}`;
      if (fs.statSync(path.join(RAIZ, rel)).isDirectory()) { varrer(rel); continue; }
      if (!/\.(jsx?|html|json)$/.test(nome)) continue;
      ler(rel).split('\n').forEach((linha, i) => {
        if (!/justo/i.test(linha)) return;
        if (EXCECOES.has(rel) && /^\s*\/\//.test(linha)) return; // só o comentário histórico passa
        achados.push(`${rel}:${i + 1}`);
      });
    }
  };
  varrer('src');
  if (fs.existsSync(path.join(RAIZ, 'index.html'))) {
    ler('index.html').split('\n').forEach((linha, i) => { if (/justo/i.test(linha)) achados.push(`index.html:${i + 1}`); });
  }
  varrer('public');
  assert.deepEqual(achados, []);
});
