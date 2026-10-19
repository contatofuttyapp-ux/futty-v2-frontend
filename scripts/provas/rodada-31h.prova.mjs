// Prova no navegador da Rodada 31H — a loja ligada por plataforma, ponta a ponta:
//   o app de verdade num Chromium que se declara Android, iPhone ou web (a ponte nativa de mentira que o Capacitor lê), mandando o cabeçalho
//   X-Futty-Plataforma de verdade, contra o motor de VERDADE (scripts/provas/_motor-loja.cjs, banco falso) com PAGAMENTOS_PLATAFORMAS=android.
//   Para cada plataforma a prova confere o cabeçalho que saiu, o `loja_pronta` que o motor devolveu (/api/inicio e /api/brilhantes/estado) e o que a
//   Figurinha mostra ("Comprar · US$ 2,99" com a loja ligada; "Pedir a minha · 10 gerações" com ela fechada). Nada sai da máquina.
//
// Uso: npm run provar:navegador -- rodada-31h      (~2 min)
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const nome = 'Rodada 31H · a loja ligada por plataforma: a lista manda, sem a variável android e iPhone, vazia nenhuma, web nunca (motor de verdade, nada sai da máquina)';

const RAIZ = fileURLToPath(new URL('../../', import.meta.url));
const MOTOR = path.join(RAIZ, 'scripts', 'provas', '_motor-loja.cjs');
const BACKEND_AO_LADO = path.resolve(RAIZ, '..', 'backend', 'tests', '_appFalsa.js');
const REF = new URL((readFileSync(new URL('../../.env', import.meta.url), 'utf8').match(/^VITE_SUPABASE_URL=(.+)$/m)?.[1] || 'https://prova.supabase.co').trim()).hostname.split('.')[0];
const IMAGEM_DE_MENTIRA = readFileSync(path.join(RAIZ, 'public', 'avatares', 'exemplo-brilhante.webp'));

// O SDK do RevenueCat de mentira: as ofertas de sempre (Minha US$ 2,99 e Pacote US$ 12,99).
const SDK_DE_MENTIRA = `
const produto = (identifier, priceString, price) => ({ identifier, priceString, price, currencyCode: 'USD' });
const pacote = (identifier, p) => ({ identifier, packageType: 'CUSTOM', presentedOfferingContext: { offeringIdentifier: 'default', placementIdentifier: null, targetingContext: null }, product: p });
export const Purchases = {
  configure: async () => ({}),
  logIn: async () => ({ customerInfo: { nonSubscriptionTransactions: [] } }),
  logOut: async () => ({}),
  setAttributes: async () => ({}),
  restorePurchases: async () => ({ customerInfo: { nonSubscriptionTransactions: [] } }),
  getOfferings: async () => ({ current: { identifier: 'default', availablePackages: [
    pacote('minha', produto('futty_minha', 'US$ 2,99', 2.99)),
    pacote('pacote', produto('futty_pacote', 'US$ 12,99', 12.99)),
  ] }, all: {} }),
  getProducts: async () => ({ products: [] }),
  purchasePackage: async () => { throw Object.assign(new Error('recusada'), { code: '1', userCancelled: true }); },
  purchaseStoreProduct: async () => { throw Object.assign(new Error('recusada'), { code: '1', userCancelled: true }); },
};
export default Purchases;
`;

/** O "aparelho": o Capacitor lê a plataforma de androidBridge (Android) ou de webkit.messageHandlers.bridge (iPhone); na web não há ponte. */
function aparelhoDeMentira(plataforma) {
  if (plataforma === 'web') return;
  const ponte = { postMessage(msg) {
    const m = typeof msg === 'string' ? JSON.parse(msg) : msg;
    setTimeout(() => { try { window.Capacitor.fromNative({ callbackId: m.callbackId, pluginId: m.pluginId, methodName: m.methodName, save: false, success: true, data: {} }); } catch { /* sem ponte */ } }, 0);
  } };
  if (plataforma === 'android') window.androidBridge = ponte;
  else window.webkit = { messageHandlers: { bridge: ponte } };
}

function subirMotor(flags = {}) {
  return new Promise((resolve, reject) => {
    const filho = spawn(process.execPath, [MOTOR], { stdio: ['pipe', 'pipe', 'pipe'], cwd: RAIZ, env: { ...process.env, ...flags } });
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

async function aoMotor(route, base) {
  const req = route.request();
  const url = new URL(req.url());
  const cors = { 'access-control-allow-origin': req.headers().origin || '*', 'access-control-allow-credentials': 'true', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' };
  if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
  const cabecalhos = { ...req.headers() };
  for (const h of NAO_VAO) delete cabecalhos[h];
  const corpo = req.postDataBuffer();
  const r = await fetch(`${base}${url.pathname}${url.search}`, { method: req.method(), headers: cabecalhos, body: corpo && !['GET', 'HEAD'].includes(req.method()) ? corpo : undefined, redirect: 'manual' });
  const saida = { ...cors };
  r.headers.forEach((v, k) => { if (!NAO_VOLTAM.has(k) && !k.startsWith('access-control-')) saida[k] = v; });
  return route.fulfill({ status: r.status, headers: saida, body: Buffer.from(await r.arrayBuffer()) });
}

/** Um aparelho (Android, iPhone ou web) para uma pessoa; anota o cabeçalho de cada pedido ao motor e o `loja_pronta` de cada resposta. */
async function abrirAparelho(navegador, baseDoVite, dados, quem, plataforma) {
  const ctx = await navegador.newContext({
    viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'pt-BR', timezoneId: 'America/Sao_Paulo',
    serviceWorkers: 'block', reducedMotion: 'reduce',
  });
  const visto = { cabecalhos: new Set(), loja: {}, externos: [], erros: [] };
  await ctx.addInitScript(aparelhoDeMentira, plataforma);
  await ctx.addInitScript(({ chave, sessao }) => {
    try { localStorage.setItem('futty_cookies', 'aceite'); localStorage.setItem('futty_figurinha_estreia', '1'); localStorage.setItem(chave, sessao); } catch { /* sem armazenamento */ }
  }, { chave: `sb-${REF}-auth-token`, sessao: sessaoDe(dados, quem) });
  const origemDoVite = new URL(baseDoVite).host;
  await ctx.route('**/*', async (route) => {
    const url = new URL(route.request().url());
    try {
      if (url.pathname.startsWith('/api/')) {
        if (route.request().method() !== 'OPTIONS') visto.cabecalhos.add(route.request().headers()['x-futty-plataforma'] ?? '(nenhum)');
        return await aoMotor(route, dados.base);
      }
      if (url.host === origemDoVite) {
        if (/purchases-capacitor/.test(url.pathname) && /\.js$/.test(url.pathname)) return await route.fulfill({ status: 200, contentType: 'text/javascript', body: SDK_DE_MENTIRA });
        return await route.continue();
      }
      visto.externos.push(`${route.request().method()} ${url.host}${url.pathname}`.slice(0, 120));
      if (/\.(png|webp|jpe?g)$/.test(url.pathname) || url.pathname.includes('/storage/v1/')) return await route.fulfill({ status: 200, contentType: 'image/webp', body: IMAGEM_DE_MENTIRA });
      return await route.fulfill({ status: 200, contentType: url.pathname.endsWith('.js') ? 'text/javascript' : 'application/json', body: url.pathname.endsWith('.js') ? '' : '{}' });
    } catch { return route.abort().catch(() => {}); }
  });
  await ctx.routeWebSocket((url) => url.host !== origemDoVite, (ws) => ws.close());
  return { ctx, visto };
}

const texto = (page) => page.evaluate(() => document.body.innerText.replace(/\s+/g, ' '));

export async function rodar({ navegador, base, t }) {
  try { readFileSync(BACKEND_AO_LADO); } catch { t('o backend não está ao lado (FUTTY-V2/backend): a prova foi pulada', true); return; }

  /** Abre a Figurinha de `quem` na `plataforma` e devolve o que saiu e o que voltou. */
  async function caso(dados, quem, plataforma) {
    const { ctx, visto } = await abrirAparelho(navegador, base, dados, quem, plataforma);
    const page = await ctx.newPage();
    page.on('pageerror', (e) => { if (!/plugin is not implemented/.test(e.message)) visto.erros.push(e.message); });
    page.on('response', async (r) => {
      const caminho = new URL(r.url()).pathname;
      try {
        if (caminho === '/api/inicio') visto.loja.inicio = (await r.json()).brilhante?.loja_pronta;
        if (caminho === '/api/brilhantes/estado') visto.loja.estado = (await r.json()).loja_pronta;
      } catch { /* resposta sem corpo */ }
    });
    await page.goto(`${base}/figurinha`, { waitUntil: 'domcontentloaded' });
    await page.locator('[data-loja-produto="minha"], [data-loja-comprar="ver"]').first().waitFor({ timeout: 40000 });
    await page.waitForTimeout(1200);
    const botoes = await page.locator('[data-cartao-loja] button').evaluateAll((bs) => bs.map((b) => b.innerText.trim()));
    const tela = await texto(page);
    // o Início traz o mesmo loja_pronta (dentro de `brilhante`) no /api/inicio
    await page.goto(`${base}/home`, { waitUntil: 'domcontentloaded' });
    await page.locator('.games-label').first().waitFor({ timeout: 40000 });
    await page.waitForTimeout(800);
    await ctx.close();
    return { visto, botoes, tela };
  }

  // Nenhum dos mundos tem PAGAMENTOS_ATIVOS. O mundo "plataforma" tem PAGAMENTOS_PLATAFORMAS=android; o mundo "sem a variável" vale android e ios
  // (o padrão do motor); o mundo "lista vazia" não liga plataforma nenhuma. A conta não muda nada: o Pedro e o Zé valem o mesmo na mesma plataforma.
  const MUNDOS = [
    {
      id: 'plataforma-android',
      nome: 'PAGAMENTOS_PLATAFORMAS=android',
      flags: { LOJA_PLATAFORMAS: 'android' },
      casos: [
        { quem: 'adm', plataforma: 'android', cabecalho: 'android', loja: true, botao: 'Comprar · US$ 2,99' },
        { quem: 'ze', plataforma: 'android', cabecalho: 'android', loja: true, botao: 'Comprar · US$ 2,99' },
        { quem: 'adm', plataforma: 'ios', cabecalho: 'ios', loja: false, botao: 'Pedir a minha · 10 gerações' },
        { quem: 'adm', plataforma: 'web', cabecalho: 'web', loja: false, botao: 'Pedir a minha · 10 gerações' },
      ],
    },
    {
      id: 'sem-a-variavel',
      nome: 'sem PAGAMENTOS_PLATAFORMAS: android e ios',
      flags: { LOJA_SEM_A_VARIAVEL: '1' },
      casos: [
        { quem: 'adm', plataforma: 'ios', cabecalho: 'ios', loja: true, botao: 'Comprar · US$ 2,99' },
        { quem: 'ze', plataforma: 'android', cabecalho: 'android', loja: true, botao: 'Comprar · US$ 2,99' },
        { quem: 'ze', plataforma: 'web', cabecalho: 'web', loja: false, botao: 'Pedir a minha · 10 gerações' },
      ],
    },
    {
      id: 'lista-vazia',
      nome: 'PAGAMENTOS_PLATAFORMAS vazia: nenhuma',
      flags: { LOJA_PLATAFORMAS: '' },
      casos: [
        { quem: 'adm', plataforma: 'android', cabecalho: 'android', loja: false, botao: 'Pedir a minha · 10 gerações' },
        { quem: 'adm', plataforma: 'ios', cabecalho: 'ios', loja: false, botao: 'Pedir a minha · 10 gerações' },
      ],
    },
  ];

  for (const mundo of MUNDOS) {
    const { filho, dados } = await subirMotor(mundo.flags);
    try {
      for (const c of mundo.casos) {
        const r = `${mundo.id} · ${c.quem === 'adm' ? 'Pedro' : 'Zé'} no ${c.plataforma}`;
        const { visto, botoes, tela } = await caso(dados, c.quem, c.plataforma);
        t(`${r} · todo pedido ao motor leva X-Futty-Plataforma: ${c.cabecalho}`, visto.cabecalhos.size === 1 && visto.cabecalhos.has(c.cabecalho), JSON.stringify([...visto.cabecalhos]));
        t(`${r} · o motor diz loja_pronta=${c.loja} no /api/inicio`, visto.loja.inicio === c.loja, String(visto.loja.inicio));
        if (visto.loja.estado !== undefined) t(`${r} · …e no /api/brilhantes/estado`, visto.loja.estado === c.loja, String(visto.loja.estado));
        t(`${r} · a Figurinha mostra "${c.botao}"`, botoes.includes(c.botao), JSON.stringify(botoes));
        t(`${r} · ${c.loja ? 'sem' : 'com'} o pedido de ativação na tela`, c.loja ? !/Pedir a minha/.test(tela) : /Pedir a minha/.test(tela));
        t(`${r} · sem erro de página`, visto.erros.length === 0, visto.erros.join(' | '));
      }
    } finally {
      const rede = await encerrarMotor(filho);
      t(`mundo "${mundo.nome}" · o motor falso não tentou sair da máquina`, Array.isArray(rede) && rede.length === 0, JSON.stringify(rede));
    }
  }
}
