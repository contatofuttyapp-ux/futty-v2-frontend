// Futty v2.0 — Rodada 29I (achado 85): erro de React em TODA carga de página — "Invalid DOM property `fetchpriority`. Did you
// mean `fetchPriority`?". O atributo estava em minúsculas em quatro <img>: o React descarta o que não conhece, então a prioridade de
// carregamento que a gente queria (a do cromo do Início, a da vitrine, a da foto grande da Resenha, a do onboarding) NUNCA valeu —
// e ainda sujava o console de todo mundo.
//
// Dois testes: (1) a prova de que, nesta versão do React, só `fetchPriority` passa limpo (e `fetchpriority` reclama); (2) a guarda
// que impede o erro de voltar — nenhum `fetchpriority` em minúsculas em src/.
//
// Uso: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';

const RAIZ = fileURLToPath(new URL('../../', import.meta.url));

/** Renderiza e devolve o HTML e o que o React escreveu no console (erros e avisos). */
function renderizar(elemento) {
  const avisos = [];
  const { error, warn } = console;
  console.error = (...a) => avisos.push(a.join(' '));
  console.warn = (...a) => avisos.push(a.join(' '));
  try {
    return { html: renderToString(elemento), avisos };
  } finally {
    console.error = error;
    console.warn = warn;
  }
}

test('<img fetchPriority="high"> renderiza o atributo e o console fica limpo; em minúsculas o React reclama e descarta', () => {
  const certo = renderizar(createElement('img', { src: '/a.png', alt: '', fetchPriority: 'high' }));
  assert.match(certo.html, /fetchPriority="high"/i, 'o atributo chegou ao HTML');
  assert.deepEqual(certo.avisos, [], `o console tem de ficar sem erro nenhum: ${certo.avisos.join(' | ')}`);

  const errado = renderizar(createElement('img', { src: '/a.png', alt: '', fetchpriority: 'high' }));
  assert.ok(errado.avisos.some((a) => /fetchpriority/i.test(a) && /fetchPriority/.test(a)), 'o erro da varredura: "Did you mean `fetchPriority`?"');
});

function arquivosDe(dir) {
  const saida = [];
  for (const nome of fs.readdirSync(dir)) {
    const caminho = path.join(dir, nome);
    if (fs.statSync(caminho).isDirectory()) saida.push(...arquivosDe(caminho));
    else if (/\.(jsx?|html|css)$/.test(nome)) saida.push(caminho);
  }
  return saida;
}

test('nenhum `fetchpriority` em minúsculas no JSX do app — sempre `fetchPriority`', () => {
  const erros = [];
  for (const arquivo of arquivosDe(path.join(RAIZ, 'src'))) {
    if (!/\.jsx$/.test(arquivo)) continue; // no HTML puro o atributo é minúsculo (e certo); o erro é só de JSX
    const texto = fs.readFileSync(arquivo, 'utf8');
    texto.split('\n').forEach((linha, i) => {
      if (/\bfetchpriority\s*=/.test(linha)) erros.push(`${path.relative(RAIZ, arquivo)}:${i + 1}`);
    });
  }
  assert.deepEqual(erros, [], `fetchpriority em minúsculas em JSX (o React descarta): ${erros.join(', ')}`);
});

test('as quatro imagens da varredura usam fetchPriority', () => {
  for (const arquivo of ['src/pages/Inicio.jsx', 'src/pages/JogadorPerfil.jsx', 'src/pages/Onboarding.jsx', 'src/components/Comentarios.jsx']) {
    assert.match(fs.readFileSync(path.join(RAIZ, arquivo), 'utf8'), /fetchPriority="high"/, arquivo);
  }
});
