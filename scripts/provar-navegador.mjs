#!/usr/bin/env node
// Futty v2.0 — as PROVAS NO NAVEGADOR (Rodada 29I): telas e gestos que só um Chromium de verdade confirma — o Voltar do sistema, o toque que
// cai no link e não no botão, o salto da cerimônia medido em milissegundos. Os testes de unidade (npm test) travam o texto e as contas; estas
// provam o COMPORTAMENTO, sem login e sem banco: cada prova monta a tela (ou o pedaço dela) numa página-bancada em scripts/provas/*.html,
// servida por um Vite que este script sobe sozinho, com a API de mentira (page.route) quando a tela fala com o motor.
//
// Nunca contra produção: tudo roda em 127.0.0.1 e nenhuma prova faz pedido de verdade ao motor.
//
// Uso: npm run provar:navegador            (todas)
//      npm run provar:navegador -- criar   (só as provas cujo nome contém "criar")
// Precisa do Chromium do Playwright (`npx playwright install chromium`, o mesmo do build:native).
import { readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createServer } from 'vite';
import { chromium } from 'playwright';

const RAIZ = fileURLToPath(new URL('../', import.meta.url));
const PASTA = path.join(RAIZ, 'scripts', 'provas');
const filtro = process.argv[2] || '';

const servidor = await createServer({ root: RAIZ, logLevel: 'silent', server: { host: '127.0.0.1', port: 0 } });
await servidor.listen();
const base = `http://127.0.0.1:${servidor.httpServer.address().port}`;

let navegador;
try {
  navegador = await chromium.launch();
} catch (e) {
  console.error(`[provas] o Chromium do Playwright não está instalado. Rode \`npx playwright install chromium\` e tente de novo.\n${e.message.split('\n')[0]}`);
  await servidor.close();
  process.exit(2);
}

let total = 0;
let falhas = 0;
for (const arquivo of readdirSync(PASTA).filter((f) => f.endsWith('.prova.mjs')).sort()) {
  if (filtro && !arquivo.includes(filtro)) continue;
  const { nome, rodar } = await import(pathToFileURL(path.join(PASTA, arquivo)).href);
  console.log(`\n▸ ${nome}`);
  const t = (verificacao, ok, detalhe = '') => {
    total += 1;
    if (!ok) falhas += 1;
    console.log(`  ${ok ? '✔' : '✖'} ${verificacao}${ok ? '' : ` — ${detalhe}`}`);
  };
  try {
    await rodar({ navegador, base, t });
  } catch (e) {
    t(`a prova "${nome}" terminou sem exceção`, false, e.message.split('\n')[0]);
  }
}

await navegador.close();
await servidor.close();
console.log(`\n${total - falhas}/${total} verificações ok${falhas ? ` · ${falhas} FALHARAM` : ''}`);
process.exit(falhas ? 1 : 0);
