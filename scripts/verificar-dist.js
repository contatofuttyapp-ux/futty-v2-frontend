#!/usr/bin/env node
// Futty v2.0 — Confere a integridade do grafo de chunks do build (build 10,
// achado real: um chunk referenciado deixou de existir no CDN depois de um
// deploy e o import dinâmico quebrava em produção, sem NADA no build local
// avisar disso). Lê dist/index.html, segue os imports — estáticos (import
// entre chunks) e dinâmicos (o mapa de preload do rolldown/vite,
// __vite__mapDeps) — e falha se algum .js/.css referenciado não existir
// dentro de dist/assets. Corre depois de `vite build`, antes de publicar.
//
// VELOCIDADE 8 (16-set) — confere também o PESO DO ARRANQUE: a soma de tudo o
// que o index.html manda o browser buscar e compilar antes de a 1ª tela existir
// (o <script type=module> da entrada mais todos os <link rel=modulepreload>).
// Esse número é o que explica o "na primeira vez trava muito até fluir": na 1ª
// abertura depois de instalar/atualizar o WebKit compila tudo sem cache de
// bytecode. Estava em 592 KiB e passa a ter TETO, senão volta lá sozinho — foi
// exactamente assim que os 200 KB do supabase-js lá foram parar, arrastados por
// uma constante de 40 caracteres importada na raiz.
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

// Teto do arranque, em KiB. O pedido do dono foi "320 KB"; fica em KiB (327 680
// bytes) de propósito — a medição de hoje dá 319,9 kB decimais, e um teto
// decimal de 320 000 deixaria 139 bytes de folga: qualquer linha nova partia a
// build sem haver regressão nenhuma. Um teto serve para apanhar recaídas, não
// para tropeçar em ruído. Os dois números saem impressos.
const TETO_ARRANQUE_KIB = 320;

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

  if (!pesoDoArranque(html)) process.exit(1);
}

/**
 * Soma e imprime o JS do arranque: a entrada (<script type="module">) mais todos
 * os <link rel="modulepreload">. O CSS fica de fora — não se compila, e o que
 * dói na 1ª abertura é a compilação.
 *
 * @returns {boolean} false se passou do teto (o chamador falha a build).
 */
function pesoDoArranque(html) {
  const nomes = [];
  const reEntrada = /<script type="module"[^>]*src="\/assets\/([A-Za-z0-9_.-]+\.js)"/g;
  const rePreload = /<link rel="modulepreload"[^>]*href="\/assets\/([A-Za-z0-9_.-]+\.js)"/g;
  let m;
  while ((m = reEntrada.exec(html))) nomes.push(m[1]);
  while ((m = rePreload.exec(html))) nomes.push(m[1]);

  if (nomes.length === 0) {
    console.error('\n[verificar-dist] ❌ não achei o script de entrada nem modulepreload nenhum em index.html — algo mudou na forma do build.');
    return false;
  }

  const linhas = nomes.map((nome) => ({ nome, bytes: fs.statSync(path.join(ASSETS, nome)).size }));
  linhas.sort((a, b) => b.bytes - a.bytes);
  const total = linhas.reduce((s, l) => s + l.bytes, 0);
  const kib = total / 1024;

  console.log(`\n[verificar-dist] peso do arranque (entrada + modulepreload), ${linhas.length} chunk(s):`);
  for (const l of linhas) {
    console.log(`   ${String(Math.round(l.bytes / 1024)).padStart(4)} KiB  ${l.nome}`);
  }
  console.log(`   ${'—'.repeat(4)}`);
  console.log(`   ${kib.toFixed(1)} KiB (${(total / 1000).toFixed(1)} kB) · teto ${TETO_ARRANQUE_KIB} KiB`);

  if (kib > TETO_ARRANQUE_KIB) {
    console.error(`\n[verificar-dist] ❌ o arranque passou do teto: ${kib.toFixed(1)} KiB > ${TETO_ARRANQUE_KIB} KiB.`);
    console.error('É JS que o WebKit tem de compilar ANTES de a 1ª tela existir — e na 1ª abertura');
    console.error('depois de instalar/atualizar não há cache de bytecode nenhum para ajudar.');
    console.error('Procure um import ESTÁTICO novo a partir da raiz (main.jsx/App.jsx e o que eles');
    console.error('arrastam). Se a biblioteca só faz falta depois da 1ª pintura, ela entra por');
    console.error('import dinâmico — ver lib/supabaseAsync.js e lib/sentryTardio.js.');
    return false;
  }
  console.log('[verificar-dist] ✅ arranque dentro do teto.');
  return true;
}

main();
