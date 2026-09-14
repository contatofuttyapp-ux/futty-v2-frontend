#!/usr/bin/env node
// Futty v2.0 — Confere a integridade do grafo de chunks do build (build 10,
// achado real: um chunk referenciado deixou de existir no CDN depois de um
// deploy e o import dinâmico quebrava em produção, sem NADA no build local
// avisar disso). Lê dist/index.html, segue os imports — estáticos (import
// entre chunks) e dinâmicos (o mapa de preload do rolldown/vite,
// __vite__mapDeps) — e falha se algum .js/.css referenciado não existir
// dentro de dist/assets. Corre depois de `vite build`, antes de publicar.
//
// Uso: node scripts/verificar-dist.js  (chamado por `npm run build`)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.join(__dirname, '..', 'dist');
const ASSETS = path.join(DIST, 'assets');
const INDEX = path.join(DIST, 'index.html');

// Casa "./Nome-hash.js", "assets/Nome-hash.css" etc. — as duas formas que os
// chunks gerados usam entre si (relativa dentro de assets/, ou com o prefixo
// "assets/" no mapa de preload do dynamic import).
const RE_REF = /["'](?:\.\/|assets\/)([A-Za-z0-9_.-]+\.(?:js|css))["']/g;

function extrairRefs(conteudo) {
  const refs = new Set();
  let m;
  RE_REF.lastIndex = 0;
  while ((m = RE_REF.exec(conteudo))) refs.add(m[1]);
  return refs;
}

function main() {
  if (!fs.existsSync(INDEX)) {
    console.error(`[verificar-dist] ${INDEX} não existe — rode "vite build" primeiro.`);
    process.exit(2);
  }
  if (!fs.existsSync(ASSETS)) {
    console.error(`[verificar-dist] ${ASSETS} não existe — build incompleto.`);
    process.exit(2);
  }

  const html = fs.readFileSync(INDEX, 'utf8');
  // Entradas do index.html: <script type="module" src="/assets/x.js">,
  // <link rel="modulepreload" href="/assets/y.js">, <link rel="stylesheet" href="/assets/z.css">.
  const entradas = new Set();
  const reEntrada = /(?:src|href)="\/assets\/([A-Za-z0-9_.-]+\.(?:js|css))"/g;
  let m;
  while ((m = reEntrada.exec(html))) entradas.add(m[1]);

  if (entradas.size === 0) {
    console.error('[verificar-dist] nenhuma entrada /assets/*.js|css encontrada em index.html — algo mudou na forma do build.');
    process.exit(2);
  }

  const existentes = new Set(fs.readdirSync(ASSETS));
  const visitados = new Set();
  const faltando = new Map(); // arquivo faltando -> Set de quem referencia

  function visitar(nome, referenciadoPor) {
    if (!existentes.has(nome)) {
      if (!faltando.has(nome)) faltando.set(nome, new Set());
      faltando.get(nome).add(referenciadoPor);
      return; // não há o que ler
    }
    if (visitados.has(nome)) return;
    visitados.add(nome);
    if (!nome.endsWith('.js')) return; // .css não referencia mais nada (aqui)
    const conteudo = fs.readFileSync(path.join(ASSETS, nome), 'utf8');
    for (const ref of extrairRefs(conteudo)) visitar(ref, nome);
  }

  for (const nome of entradas) visitar(nome, 'dist/index.html');

  console.log(`[verificar-dist] ${visitados.size} chunk(s) seguido(s) a partir de ${entradas.size} entrada(s) em index.html.`);

  if (faltando.size > 0) {
    console.error(`\n[verificar-dist] ❌ ${faltando.size} referência(s) para arquivo(s) que NÃO existem em dist/assets:`);
    for (const [nome, refs] of faltando) {
      console.error(`   ${nome}  (referenciado por: ${[...refs].join(', ')})`);
    }
    console.error('\nO build ficaria com um import quebrado em produção — não publique assim.');
    process.exit(1);
  }

  console.log('[verificar-dist] ✅ grafo de chunks íntegro — nenhuma referência quebrada.');
}

main();
