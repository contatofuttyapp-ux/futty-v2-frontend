#!/usr/bin/env node
// Futty v2.0 — LIMPEZA TOTAL (23-set): confere que o Gabinete abre sem erro
// nas 8 abas para um super-admin, contra o par isolado de bancada.
//
// Usa a conta DESCARTÁVEL "super" de backend/scripts/_bench/contas-varredura.js
// — não mexe na senha real de contatofuttyapp@gmail.com.
//
// Uso: node scripts/_bench/verificar-gabinete-abas.mjs --url http://localhost:4699
import { webkit } from 'playwright';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const opcao = (n, o = null) => {
  const i = process.argv.indexOf(`--${n}`);
  return i > 0 && process.argv[i + 1] ? process.argv[i + 1] : o;
};
const BASE = opcao('url', 'http://localhost:4699').replace(/\/+$/, '');
const ARQ_SESSOES = path.join(__dirname, '..', 'capturas', 'sessao-varredura.json');

const ABAS = ['visao', 'pessoas', 'brilhantes', 'dinheiro', 'anuncios', 'seguranca', 'registros', 'cobertura'];

const IPHONE = {
  viewport: { width: 390, height: 844 },
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
};

async function main() {
  const sessoes = JSON.parse(readFileSync(ARQ_SESSOES, 'utf8'));
  const navegador = await webkit.launch();
  const contexto = await navegador.newContext({
    ...IPHONE,
    storageState: { cookies: [], origins: [{ origin: BASE, localStorage: sessoes.super }] },
  });
  const pagina = await contexto.newPage();
  const erros = [];
  pagina.on('pageerror', (e) => erros.push(e.message));
  pagina.on('dialog', (d) => d.accept().catch(() => {}));

  const resultado = {};
  for (const aba of ABAS) {
    const antes = erros.length;
    const respostaResumo = pagina.waitForResponse(
      (r) => r.url().includes('/api/super/gabinete/resumo'),
      { timeout: 15000 },
    ).catch(() => null);
    await pagina.goto(`${BASE}/gabinete?aba=${aba}`, { waitUntil: 'domcontentloaded' });
    await respostaResumo; // 1ª visita do contexto carrega perfil + sessão antes do resumo — 2 s fixos não bastavam.
    await pagina.waitForTimeout(500);
    const texto = await pagina.locator('body').innerText().catch(() => '');
    const temErroJs = erros.length > antes;
    const pareceTelaDeErro = /erro ao carregar|algo deu errado/i.test(texto) && texto.length < 400;
    const ok = !temErroJs && !pareceTelaDeErro && texto.length > 100;
    resultado[aba] = { ok, chars: texto.length, jsErros: erros.slice(antes) };
    console.log(`[gabinete] ${aba.padEnd(12)} ${ok ? 'OK' : 'FALHA'}  (${texto.length} chars)${temErroJs ? '  JS: ' + erros.slice(antes).join(' | ') : ''}`);
  }

  await navegador.close();
  const falhas = Object.entries(resultado).filter(([, r]) => !r.ok);
  if (falhas.length) {
    console.error(`\n[gabinete] ${falhas.length} aba(s) com problema: ${falhas.map(([k]) => k).join(', ')}`);
    process.exit(1);
  }
  console.log('\n[gabinete] 8/8 abas OK, sem erro de JS.');
}

main().catch((e) => { console.error('[gabinete] ERRO:', e.message); process.exit(1); });
