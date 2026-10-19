#!/usr/bin/env node
// Futty v2.0 — as capturas da revisão da Apple para os dois consumíveis (futty_minha e futty_pacote): a tela de compra do app, em PNG 1290×2796
// (iPhone 6,7": viewport 430×932 a 3x). Sai em FUT\LOJAS\revisao-futty_minha.png e revisao-futty_pacote.png.
//
// Tudo LOCAL, nada de produção: o app é o de verdade (Vite em 127.0.0.1) num Chromium que se declara iOS (`window.webkit.messageHandlers.bridge`, o que o
// Capacitor usa para saber a plataforma); o motor é o de verdade por cima de banco e Auth de mentira (scripts/provas/_motor-loja.cjs), com a loja aberta pela
// regra por plataforma — o Pedro pede como iPhone (a plataforma ligada) e PAGAMENTOS_ATIVOS fica desligado. O SDK do RevenueCat é trocado por uma mentira que devolve as
// ofertas (os mesmos dois produtos, com preço de real): a folha de compra da Apple não existe no navegador, e o que a Apple pede é a tela do app que leva à compra.
// Todo pedido do navegador passa por aqui: /api/** vai ao motor de mentira, o Vite das telas passa, e QUALQUER outro endereço (inclusive o Supabase de produção)
// é respondido vazio sem sair da máquina — e anotado.
//
// Uso: node scripts/capturar-revisao-loja.mjs [pasta-de-saida]     (padrão: ..\..\LOJAS)
import { spawn } from 'node:child_process';
import { mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import { chromium } from 'playwright';

const RAIZ = fileURLToPath(new URL('../', import.meta.url));
const SAIDA = path.resolve(process.argv[2] || path.join(RAIZ, '..', '..', 'LOJAS'));
const MOTOR = path.join(RAIZ, 'scripts', 'provas', '_motor-loja.cjs');
const REF = new URL((readFileSync(path.join(RAIZ, '.env'), 'utf8').match(/^VITE_SUPABASE_URL=(.+)$/m)?.[1] || 'https://prova.supabase.co').trim()).hostname.split('.')[0];

// O SDK do RevenueCat de mentira: as ofertas com os dois produtos que existem nas lojas, no preço do real.
const SDK_DE_MENTIRA = `
const produto = (identifier, priceString, price) => ({ identifier, priceString, price, currencyCode: 'BRL' });
export const Purchases = {
  configure: async () => ({}),
  logIn: async () => ({ customerInfo: { nonSubscriptionTransactions: [] } }),
  logOut: async () => ({}),
  setAttributes: async () => ({}),
  restorePurchases: async () => ({ customerInfo: { nonSubscriptionTransactions: [] } }),
  getOfferings: async () => ({ current: { identifier: 'default', availablePackages: [
    { identifier: 'minha', product: produto('futty_minha', 'R$ 9,90', 9.9) },
    { identifier: 'pacote', product: produto('futty_pacote', 'R$ 49,90', 49.9) },
  ] }, all: {} }),
  getProducts: async () => ({ products: [] }),
  purchaseStoreProduct: async () => { throw { userCancelled: true, code: '1' }; },
};
export default Purchases;
`;

// O "nativo" de mentira: toda chamada de plugin que o Capacitor manda à ponte iOS volta com sucesso e sem dados (o que nenhuma tela de compra espera).
function nativoDeMentira() {
  window.webkit = { messageHandlers: { bridge: { postMessage(msg) {
    const m = typeof msg === 'string' ? JSON.parse(msg) : msg;
    setTimeout(() => { try { window.Capacitor.fromNative({ callbackId: m.callbackId, pluginId: m.pluginId, methodName: m.methodName, save: false, success: true, data: {} }); } catch { /* sem ponte */ } }, 0);
  } } } };
}

function subirMotor() {
  return new Promise((resolve, reject) => {
    const filho = spawn(process.execPath, [MOTOR], { stdio: ['pipe', 'pipe', 'pipe'], cwd: RAIZ });
    let saida = '';
    let erro = '';
    const prazo = setTimeout(() => { filho.kill(); reject(new Error(`o motor falso não ficou pronto em 120 s\n${erro.slice(-700)}`)); }, 120000);
    filho.stderr.on('data', (d) => { erro += d; });
    filho.stdout.on('data', (d) => {
      saida += d;
      const linha = saida.split('\n').find((l) => l.startsWith('{"pronto"'));
      if (linha) { clearTimeout(prazo); resolve({ filho, dados: JSON.parse(linha) }); }
    });
    filho.once('exit', (codigo) => { clearTimeout(prazo); reject(new Error(`o motor falso saiu com ${codigo}\n${erro.slice(-900)}`)); });
  });
}
function encerrarMotor(filho) {
  return new Promise((resolve) => {
    let saida = '';
    const acabou = (rede) => { clearTimeout(prazo); try { filho.kill(); } catch { /* já saiu */ } resolve(rede); };
    const prazo = setTimeout(() => acabou(null), 8000);
    filho.stdout.on('data', (d) => {
      saida += d;
      const linha = saida.split('\n').find((l) => l.startsWith('{"rede"'));
      if (linha) acabou(JSON.parse(linha).rede);
    });
    filho.once('exit', () => acabou(null));
    try { filho.stdin.write('fim\n'); } catch { acabou(null); }
  });
}

const sessaoDe = (dados, quem) => JSON.stringify({
  access_token: dados.tokens[quem], refresh_token: 'prova', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 86400 * 30,
  user: { id: dados.pessoas[quem].id, aud: 'authenticated', email: 'prova@futty.test', app_metadata: {}, user_metadata: { onboarding_completo: true }, created_at: '2026-01-01T00:00:00Z' },
});
const NAO_VOLTAM = new Set(['content-encoding', 'content-length', 'transfer-encoding', 'connection', 'keep-alive']);
const NAO_VAO = ['host', 'origin', 'referer', 'if-none-match', 'if-modified-since', 'content-length', 'accept-encoding', 'connection'];

// O Pedro está no iPhone (a plataforma ligada no motor das provas); os outros, no Android (fora da lista).
const plataformaDe = (quem) => (quem === 'adm' ? 'ios' : 'android');

/** `plataforma`: o cabeçalho X-Futty-Plataforma que o motor recebe (a loja abre por plataforma). */
async function aoMotor(route, base, plataforma = null) {
  const req = route.request();
  const url = new URL(req.url());
  const cors = { 'access-control-allow-origin': req.headers().origin || '*', 'access-control-allow-credentials': 'true', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' };
  if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
  const cabecalhos = { ...req.headers() };
  for (const h of NAO_VAO) delete cabecalhos[h];
  if (plataforma) cabecalhos['x-futty-plataforma'] = plataforma;
  const corpo = req.postDataBuffer();
  const r = await fetch(`${base}${url.pathname}${url.search}`, { method: req.method(), headers: cabecalhos, body: corpo && !['GET', 'HEAD'].includes(req.method()) ? corpo : undefined, redirect: 'manual' });
  const saida = { ...cors };
  r.headers.forEach((v, k) => { if (!NAO_VOLTAM.has(k) && !k.startsWith('access-control-')) saida[k] = v; });
  return route.fulfill({ status: r.status, headers: saida, body: Buffer.from(await r.arrayBuffer()) });
}

async function abrirContexto(navegador, baseDoVite, dados, quem) {
  const ctx = await navegador.newContext({
    viewport: { width: 430, height: 932 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, locale: 'pt-BR', timezoneId: 'America/Sao_Paulo',
    serviceWorkers: 'block', reducedMotion: 'reduce',
  });
  const estado = { externos: [] };
  await ctx.addInitScript(nativoDeMentira);
  await ctx.addInitScript(({ chave, sessao }) => {
    try { localStorage.setItem('futty_cookies', 'aceite'); localStorage.setItem(chave, sessao); localStorage.setItem('futty_tour_visto', '1'); } catch { /* sem armazenamento */ }
  }, { chave: `sb-${REF}-auth-token`, sessao: sessaoDe(dados, quem) });
  const origemDoVite = new URL(baseDoVite).host;
  await ctx.route('**/*', async (route) => {
    const url = new URL(route.request().url());
    try {
      if (url.pathname.startsWith('/api/')) return await aoMotor(route, dados.base, plataformaDe(quem));
      if (url.host === origemDoVite) {
        if (/purchases-capacitor/.test(url.pathname) && /\.js$/.test(url.pathname)) return await route.fulfill({ status: 200, contentType: 'text/javascript', body: SDK_DE_MENTIRA });
        return await route.continue();
      }
      estado.externos.push(`${route.request().method()} ${url.host}${url.pathname}`.slice(0, 120));
      return await route.fulfill({ status: 200, contentType: url.pathname.endsWith('.js') ? 'text/javascript' : 'application/json', body: url.pathname.endsWith('.js') ? '' : '{}' });
    } catch { return route.abort().catch(() => {}); }
  });
  await ctx.routeWebSocket((url) => url.host !== origemDoVite, (ws) => ws.close());
  return { ctx, estado };
}

const texto = (page) => page.evaluate(() => document.body.innerText.replace(/\s+/g, ' '));

mkdirSync(SAIDA, { recursive: true });
const servidor = await createServer({ root: RAIZ, logLevel: 'silent', server: { host: '127.0.0.1', port: 0 } });
await servidor.listen();
const base = `http://127.0.0.1:${servidor.httpServer.address().port}`;
const navegador = await chromium.launch();
const { filho, dados } = await subirMotor();
let falhas = 0;
const confere = (ok, msg, detalhe = '') => { if (!ok) falhas += 1; console.log(`${ok ? '✔' : '✖'} ${msg}${ok ? '' : ` — ${detalhe}`}`); };

try {
  // 1) O Pedro (no iPhone): a loja abre e cada produto mostra "Comprar" com o preço da loja.
  const { ctx, estado } = await abrirContexto(navegador, base, dados, 'adm');
  const page = await ctx.newPage();
  const erros = [];
  // O nativo é de mentira: um plugin que o app pede ao iOS (App, Capgo…) e que a ponte falsa não implementa é esperado, não é defeito da tela.
  page.on('pageerror', (e) => { if (!/plugin is not implemented/.test(e.message)) erros.push(e.message); });
  const estadoDoMotor = await (await fetch(`${dados.base}/api/brilhantes/estado`, { headers: { authorization: `Bearer ${dados.tokens.adm}`, 'x-futty-plataforma': plataformaDe('adm') } })).json();
  confere(estadoDoMotor.loja_pronta === true, 'o motor abre a loja para o iPhone (PAGAMENTOS_ATIVOS desligado)');
  const doZe = await (await fetch(`${dados.base}/api/brilhantes/estado`, { headers: { authorization: `Bearer ${dados.tokens.ze}`, 'x-futty-plataforma': plataformaDe('ze') } })).json();
  confere(doZe.loja_pronta === false, 'e a mantém fechada no Android');

  for (const [produto, destaque, rotulo, preco] of [['futty_minha', 'minha', 'Minha Figurinha', 'R$ 9,90'], ['futty_pacote', 'pacote', 'Pacote do time', 'R$ 49,90']]) {
    await page.goto(`${base}/planos?destaque=${destaque}`, { waitUntil: 'domcontentloaded' });
    await page.getByText(`Comprar · ${preco}`, { exact: false }).first().waitFor({ timeout: 40000 });
    await page.waitForTimeout(1800); // o fade de entrada e a rolagem até o cartão
    const corpo = await texto(page);
    confere(corpo.includes(rotulo) && corpo.includes(`Comprar · ${preco}`), `${produto}: a tela mostra "${rotulo}" com "Comprar · ${preco}"`, corpo.slice(0, 300));
    const arquivo = path.join(SAIDA, `revisao-${produto}.png`);
    await page.screenshot({ path: arquivo }); // a janela inteira, 1290×2796
    console.log(`  → ${arquivo}`);
  }
  confere(erros.length === 0, 'sem erro de página', erros.slice(0, 3).join(' | '));
  const hosts = [...new Set(estado.externos.map((x) => x.split(' ')[1].split('/')[0]))];
  console.log(`  (endereços de fora respondidos vazios, sem sair da máquina: ${hosts.length ? hosts.join(', ') : 'nenhum'})`);
  await ctx.close();

  // 2) O Zé (no Android): a loja fica fechada — a tela cai no pedido de ativação, nunca no preço.
  const outro = await abrirContexto(navegador, base, dados, 'ze');
  const paginaDele = await outro.ctx.newPage();
  await paginaDele.goto(`${base}/planos`, { waitUntil: 'domcontentloaded' });
  await paginaDele.getByText(/Pedir a minha|Pedir ativação/i).first().waitFor({ timeout: 40000 }).catch(() => {});
  const corpoDele = await texto(paginaDele);
  confere(/Pedir a minha|Pedir ativação/i.test(corpoDele) && !/Comprar · R\$/.test(corpoDele), 'Zé no Android: a tela mostra o pedido de ativação ("Pedir a minha") e nenhum preço de compra', corpoDele.slice(0, 300));
  await outro.ctx.close();
} finally {
  const rede = await encerrarMotor(filho);
  confere(Array.isArray(rede) && rede.length === 0, 'o motor falso não tentou sair da máquina', JSON.stringify(rede));
  await navegador.close();
  await servidor.close();
}
process.exit(falhas ? 1 : 0);
