// Prova no navegador da Rodada 31E — a compra que falha com "A loja não respondeu" e a tela que não deixava sair, a 390 px:
//   · a compra vai pelo PACOTE da oferta (purchasePackage, com o pacote como o getOfferings() o devolveu), nunca pelo produto solto;
//   · o aviso do erro tem UM botão, neutro, "Fechar" — nada de "Tentar de novo" dentro do aviso —, e ele fecha de verdade; tocar em Comprar
//     outra vez tenta de novo;
//   · o testador (e só ele) vê embaixo, em letra pequena, o code, o readableErrorCode e o underlyingErrorMessage; quem não é testador nada vê,
//     mesmo com a loja aberta para todos;
//   · o cartão do Pacote do time que o time já tem não parece "selecionado" e diz o porquê, em uma linha, no lugar do botão.
// Como: a mesma bancada das capturas da loja (scripts/capturar-revisao-loja.mjs) — o app de verdade num Chromium que se declara iOS, o motor de VERDADE por
// cima de banco e Auth de mentira (scripts/provas/_motor-loja.cjs), o SDK do RevenueCat trocado por uma mentira que RECUSA a compra com o erro que o
// iPhone deu (STORE_PROBLEM) no formato da ponte do Capacitor. Nada sai da máquina: /api/** vai ao motor de mentira e qualquer outro endereço (o
// Supabase de produção inclusive) é respondido vazio.
//
// Uso: npm run provar:navegador -- rodada-31e      (~1 min)
//      R31E_FOTOS=pasta  salva a foto de cada passo
import { spawn } from 'node:child_process';
import { mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const nome = 'Rodada 31E · compra que falha: Fechar neutro, detalhe só para o testador, cartão do pacote que o time já tem (motor de verdade, nada sai da máquina)';

const RAIZ = fileURLToPath(new URL('../../', import.meta.url));
const MOTOR = path.join(RAIZ, 'scripts', 'provas', '_motor-loja.cjs');
const BACKEND_AO_LADO = path.resolve(RAIZ, '..', 'backend', 'tests', '_appFalsa.js');
const REF = new URL((readFileSync(new URL('../../.env', import.meta.url), 'utf8').match(/^VITE_SUPABASE_URL=(.+)$/m)?.[1] || 'https://prova.supabase.co').trim()).hostname.split('.')[0];
const FOTOS = process.env.R31E_FOTOS || '';

// O SDK do RevenueCat de mentira: as ofertas de sempre, e a COMPRA recusa como o iPhone recusou (STORE_PROBLEM, no formato da ponte: code no erro, o resto em data).
// Cada chamada de compra fica em window.__loja, para a prova ver por qual caminho o app foi.
const SDK_DE_MENTIRA = `
const produto = (identifier, priceString, price) => ({ identifier, priceString, price, currencyCode: 'USD' });
const pacote = (identifier, p) => ({ identifier, packageType: 'CUSTOM', presentedOfferingContext: { offeringIdentifier: 'default', placementIdentifier: null, targetingContext: null }, product: p });
window.__loja = [];
const recusa = () => Object.assign(new Error('There was a problem with the App Store.'), {
  code: '2',
  data: { readableErrorCode: 'STORE_PROBLEM', underlyingErrorMessage: 'The operation couldn’t be completed. (SKErrorDomain error 0.)' },
});
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
  purchasePackage: async (arg) => { window.__loja.push({ metodo: 'purchasePackage', arg: JSON.parse(JSON.stringify(arg)) }); throw recusa(); },
  purchaseStoreProduct: async (arg) => { window.__loja.push({ metodo: 'purchaseStoreProduct', arg: JSON.parse(JSON.stringify(arg)) }); throw recusa(); },
};
export default Purchases;
`;

function nativoDeMentira() {
  window.webkit = { messageHandlers: { bridge: { postMessage(msg) {
    const m = typeof msg === 'string' ? JSON.parse(msg) : msg;
    setTimeout(() => { try { window.Capacitor.fromNative({ callbackId: m.callbackId, pluginId: m.pluginId, methodName: m.methodName, save: false, success: true, data: {} }); } catch { /* sem ponte */ } }, 0);
  } } } };
}

function subirMotor() {
  return new Promise((resolve, reject) => {
    const filho = spawn(process.execPath, [MOTOR], { stdio: ['pipe', 'pipe', 'pipe'], cwd: RAIZ, env: { ...process.env, LOJA_ABERTA: '1', LOJA_PACOTE_ATIVO: '1' } });
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

async function abrirContexto(navegador, baseDoVite, dados, quem) {
  const ctx = await navegador.newContext({
    viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'pt-BR', timezoneId: 'America/Sao_Paulo',
    serviceWorkers: 'block', reducedMotion: 'reduce',
  });
  const estado = { externos: [], erros: [] };
  await ctx.addInitScript(nativoDeMentira);
  await ctx.addInitScript(({ chave, sessao }) => {
    try { localStorage.setItem('futty_cookies', 'aceite'); localStorage.setItem(chave, sessao); } catch { /* sem armazenamento */ }
  }, { chave: `sb-${REF}-auth-token`, sessao: sessaoDe(dados, quem) });
  const origemDoVite = new URL(baseDoVite).host;
  await ctx.route('**/*', async (route) => {
    const url = new URL(route.request().url());
    try {
      if (url.pathname.startsWith('/api/')) return await aoMotor(route, dados.base);
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

export async function rodar({ navegador, base, t }) {
  try { readFileSync(BACKEND_AO_LADO); } catch { t('o backend não está ao lado (FUTTY-V2/backend): a prova foi pulada', true); return; }
  const { filho, dados } = await subirMotor();
  if (FOTOS) mkdirSync(FOTOS, { recursive: true });
  const foto = async (page, rotulo) => { if (FOTOS) { await page.waitForTimeout(600); await page.screenshot({ path: path.join(FOTOS, `${rotulo}.png`) }); } };
  const comprasFeitas = (page) => page.evaluate(() => window.__loja || []);

  try {
    // O motor: o Pedro é testador, o Zé não; a loja está aberta para todos.
    const lerEstado = async (quem) => (await fetch(`${dados.base}/api/brilhantes/estado`, { headers: { authorization: `Bearer ${dados.tokens[quem]}` } })).json();
    const doPedro = await lerEstado('adm');
    const doZe = await lerEstado('ze');
    t('o motor diz: loja aberta para os dois; testador_loja só para o Pedro', doPedro.loja_pronta === true && doZe.loja_pronta === true && doPedro.testador_loja === true && doZe.testador_loja === false, JSON.stringify({ p: [doPedro.loja_pronta, doPedro.testador_loja], z: [doZe.loja_pronta, doZe.testador_loja] }));

    // ── O testador: a compra falha ──
    const pedro = await abrirContexto(navegador, base, dados, 'adm');
    const page = await pedro.ctx.newPage();
    page.on('pageerror', (e) => { if (!/plugin is not implemented/.test(e.message)) pedro.estado.erros.push(e.message); });
    await page.goto(`${base}/planos?destaque=minha`, { waitUntil: 'domcontentloaded' });
    const botaoMinha = page.getByRole('button', { name: /Comprar · US\$ 2,99/ });
    await botaoMinha.waitFor({ timeout: 40000 });
    await page.waitForTimeout(1200);
    await botaoMinha.click();
    const aviso = page.locator('.futty-toast[role="alert"]');
    await aviso.waitFor({ timeout: 15000 });
    t('390 px · o aviso diz "A loja não respondeu. Tente de novo."', (await aviso.innerText()).includes('A loja não respondeu. Tente de novo.'), await aviso.innerText());

    const compras = await comprasFeitas(page);
    t('a compra foi pelo PACOTE da oferta (purchasePackage) e não pelo produto solto', compras.length === 1 && compras[0].metodo === 'purchasePackage', JSON.stringify(compras.map((c) => c.metodo)));
    t('o pacote vai inteiro: identifier "minha", presentedOfferingContext da oferta default e o produto futty_minha', compras[0]?.arg?.aPackage?.identifier === 'minha' && compras[0]?.arg?.aPackage?.presentedOfferingContext?.offeringIdentifier === 'default' && compras[0]?.arg?.aPackage?.product?.identifier === 'futty_minha', JSON.stringify(compras[0]?.arg));

    const detalhe = page.locator('[data-toast-detalhe]');
    t('o testador lê a linha pequena: code 2 · readableErrorCode STORE_PROBLEM · underlyingErrorMessage …', (await detalhe.count()) === 1 && /^code: 2 · readableErrorCode: STORE_PROBLEM · underlyingErrorMessage: The operation couldn’t be completed\. \(SKErrorDomain error 0\.\)$/.test((await detalhe.innerText()).trim()), await detalhe.count() ? await detalhe.innerText() : 'sem linha');
    const tamanho = await detalhe.evaluate((e) => parseFloat(getComputedStyle(e).fontSize));
    t('a linha é pequena (≤ 11 px) e fica abaixo da mensagem', tamanho <= 11 && await page.evaluate(() => { const a = document.querySelector('.futty-toast__texto').getBoundingClientRect(); const d = document.querySelector('[data-toast-detalhe]').getBoundingClientRect(); return d.top >= a.bottom - 1; }), `fonte ${tamanho}px`);

    const botoes = aviso.locator('button');
    t('o aviso tem UM botão só, "Fechar" — nenhum "Tentar de novo"', (await botoes.count()) === 1 && (await botoes.first().innerText()).trim() === 'Fechar' && !(await aviso.innerText()).includes('Tentar de novo'), await botoes.allInnerTexts().then((x) => x.join('|')));
    const estiloBotao = await botoes.first().evaluate((b) => { const c = getComputedStyle(b); return { classe: b.className, fundo: c.backgroundColor, texto: c.color }; });
    t('o botão é neutro (cinza translúcido, texto claro), não vermelho', /futty-toast__acao--neutra/.test(estiloBotao.classe) && estiloBotao.fundo === 'rgba(255, 255, 255, 0.1)', JSON.stringify(estiloBotao));
    const caixa = await aviso.evaluate((e) => { const b = e.getBoundingClientRect(); return { esq: b.left, dir: b.right, topo: b.top, base: b.bottom, largura: window.innerWidth, altura: window.innerHeight, lateral: document.documentElement.scrollWidth > window.innerWidth }; });
    t('o aviso cabe na tela e a página não rola para o lado', caixa.esq >= 0 && caixa.dir <= caixa.largura && caixa.topo >= 0 && caixa.base <= caixa.altura && !caixa.lateral, JSON.stringify(caixa));
    await foto(page, '1-erro-testador-390');

    // Tocar no texto não fecha (dá para selecionar e copiar); só o botão fecha.
    await aviso.locator('.futty-toast__texto').click();
    await page.waitForTimeout(400);
    t('tocar no texto do aviso não o fecha (o testador pode copiar a linha)', (await aviso.count()) === 1);
    await botoes.first().click();
    await page.waitForTimeout(500);
    t('"Fechar" fecha de verdade: o aviso some', (await page.locator('.futty-toast').count()) === 0);

    // A tela volta ao normal: "Comprar" de novo tenta outra vez (e erra outra vez, de propósito) — sem aviso preso.
    t('depois de fechar, "Comprar" está de pé e habilitado', await botaoMinha.isEnabled());
    await botaoMinha.click();
    await aviso.waitFor({ timeout: 15000 });
    t('tocar em Comprar outra vez tenta de novo (2ª compra pedida) e o aviso volta, ainda com um botão só', (await comprasFeitas(page)).length === 2 && (await aviso.locator('button').count()) === 1);
    await aviso.locator('button').first().click();
    await page.waitForTimeout(500);
    t('e fecha de novo', (await page.locator('.futty-toast').count()) === 0);

    // ── O cartão do Pacote do time que o time já tem ──
    await page.goto(`${base}/planos`, { waitUntil: 'domcontentloaded' });
    await page.locator('[data-ja-e-seu]').first().waitFor({ timeout: 40000 });
    await page.waitForTimeout(1200);
    const linha = page.locator('[data-ja-e-seu]').first();
    t('o cartão do Pacote do time (já ativo) diz o porquê, em uma linha, no lugar do botão', (await linha.innerText()).trim() === 'O pacote já está ativo no seu time. Não precisa comprar de novo.', await linha.innerText());
    const cartao = linha.locator('xpath=ancestor::div[contains(@class,"hud-corners")][1]/parent::div[contains(@class,"hud-corners")][1]').first();
    const info = await page.evaluate(() => {
      const l = document.querySelector('[data-ja-e-seu]');
      const card = l.closest('.hud-corners').parentElement.closest('.hud-corners') || l.closest('.hud-corners');
      const c = getComputedStyle(card);
      return { borda: c.borderTopWidth, sombra: c.boxShadow, botoes: [...card.querySelectorAll('button')].map((b) => b.innerText.trim()), selo: card.innerText.includes('Já é seu') };
    });
    void cartao;
    t('esse cartão não tem botão, tem o selo "Já é seu" e NÃO parece selecionado (borda fina, sem brilho)', info.botoes.length === 0 && info.selo && parseFloat(info.borda) < 2 && (info.sombra === 'none' || info.sombra === ''), JSON.stringify(info));
    t('o cartão da Minha Figurinha segue com o botão "Comprar · US$ 2,99"', await page.getByRole('button', { name: /Comprar · US\$ 2,99/ }).isVisible());
    t('a tela de Planos não rola para o lado', !(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)));
    await page.locator('[data-ja-e-seu]').first().scrollIntoViewIfNeeded();
    await foto(page, '2-pacote-ja-ativo-390');
    t('sem erro de página (testador) e nada saiu da máquina', pedro.estado.erros.length === 0, pedro.estado.erros.slice(0, 3).join(' | '));
    await pedro.ctx.close();

    // ── Quem NÃO é testador, com a loja aberta para todos: o mesmo aviso, sem a linha técnica ──
    const ze = await abrirContexto(navegador, base, dados, 'ze');
    const paginaDele = await ze.ctx.newPage();
    paginaDele.on('pageerror', (e) => { if (!/plugin is not implemented/.test(e.message)) ze.estado.erros.push(e.message); });
    await paginaDele.goto(`${base}/planos?destaque=minha`, { waitUntil: 'domcontentloaded' });
    const botaoDele = paginaDele.getByRole('button', { name: /Comprar · US\$ 2,99/ });
    await botaoDele.waitFor({ timeout: 40000 });
    await paginaDele.waitForTimeout(1200);
    await botaoDele.click();
    const avisoDele = paginaDele.locator('.futty-toast[role="alert"]');
    await avisoDele.waitFor({ timeout: 15000 });
    t('quem não é testador vê o mesmo recado e "Fechar", e NENHUMA linha técnica', (await avisoDele.innerText()).includes('A loja não respondeu. Tente de novo.') && (await paginaDele.locator('[data-toast-detalhe]').count()) === 0 && !(await avisoDele.innerText()).includes('STORE_PROBLEM') && (await avisoDele.locator('button').first().innerText()).trim() === 'Fechar');
    await foto(paginaDele, '3-erro-nao-testador-390');
    await avisoDele.locator('button').first().click();
    await paginaDele.waitForTimeout(500);
    t('e o "Fechar" dele também fecha', (await paginaDele.locator('.futty-toast').count()) === 0);
    t('sem erro de página (não testador)', ze.estado.erros.length === 0, ze.estado.erros.slice(0, 3).join(' | '));
    await ze.ctx.close();
  } finally {
    const rede = await encerrarMotor(filho);
    t('o motor falso não tentou sair da máquina (rede fechada)', Array.isArray(rede) && rede.length === 0, `tentativas: ${JSON.stringify(rede)}`);
  }
}
