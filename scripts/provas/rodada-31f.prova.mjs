// Prova no navegador da Rodada 31F — o Pacote do time sempre à venda, a 390 e a 360 px, nos três casos: pacote ainda não ativo (cartão de sempre),
//   pacote já ativo ("Mais figurinhas pro seu time" + "Comprar para o time · preço", sem "Já é seu") e quem não é dono do time (uma linha, sem botão morto).
// Mesma bancada da 31E: o app de verdade num Chromium que se declara iOS, o motor de VERDADE por cima de banco falso (scripts/provas/_motor-loja.cjs) e o
// SDK do RevenueCat de mentira. Nada sai da máquina.
//
// Uso: npm run provar:navegador -- rodada-31f      (~2 min)
//      R31F_FOTOS=pasta  salva a foto de cada passo
import { spawn } from 'node:child_process';
import { mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const nome = 'Rodada 31F · Pacote do time sempre à venda: não ativo, ativo (presente) e não dono (motor de verdade, nada sai da máquina)';

const RAIZ = fileURLToPath(new URL('../../', import.meta.url));
const MOTOR = path.join(RAIZ, 'scripts', 'provas', '_motor-loja.cjs');
const BACKEND_AO_LADO = path.resolve(RAIZ, '..', 'backend', 'tests', '_appFalsa.js');
const REF = new URL((readFileSync(new URL('../../.env', import.meta.url), 'utf8').match(/^VITE_SUPABASE_URL=(.+)$/m)?.[1] || 'https://prova.supabase.co').trim()).hostname.split('.')[0];
const FOTOS = process.env.R31F_FOTOS || '';

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
  setAttributes: async (arg) => { window.__loja.push({ metodo: 'setAttributes', arg }); return {}; },
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

function subirMotor(flags = {}) {
  return new Promise((resolve, reject) => {
    const filho = spawn(process.execPath, [MOTOR], { stdio: ['pipe', 'pipe', 'pipe'], cwd: RAIZ, env: { ...process.env, LOJA_ABERTA: '1', ...flags } });
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

async function abrirContexto(navegador, baseDoVite, dados, quem, largura = 390) {
  const ctx = await navegador.newContext({
    viewport: { width: largura, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'pt-BR', timezoneId: 'America/Sao_Paulo',
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

/** O cartão do Pacote do time na tela de Planos: o texto, os botões e se a página rola para o lado. */
const lerCartaoDoPacote = (page) => page.evaluate(() => {
  const titulos = [...document.querySelectorAll('span')].filter((e) => /^(Pacote do time|Mais figurinhas pro seu time)$/.test(e.textContent.trim()));
  const titulo = titulos[0];
  if (!titulo) return { achou: false };
  const cartao = titulo.closest('.hud-corners');
  const c = getComputedStyle(cartao);
  return {
    achou: true,
    titulo: titulo.textContent.trim(),
    texto: cartao.innerText.replace(/\s+/g, ' '),
    botoes: [...cartao.querySelectorAll('button')].map((b) => ({ texto: b.innerText.trim(), habilitado: !b.disabled })),
    soODono: cartao.querySelector('[data-so-o-dono]')?.textContent.trim() || null,
    borda: c.borderTopWidth,
    lateral: document.documentElement.scrollWidth > window.innerWidth,
  };
});

export async function rodar({ navegador, base, t }) {
  try { readFileSync(BACKEND_AO_LADO); } catch { t('o backend não está ao lado (FUTTY-V2/backend): a prova foi pulada', true); return; }
  if (FOTOS) mkdirSync(FOTOS, { recursive: true });
  const foto = async (page, rotulo) => { if (FOTOS) { await page.waitForTimeout(600); await page.screenshot({ path: path.join(FOTOS, `${rotulo}.png`) }); } };
  const abrirPlanos = async (cena, caminho, esperar) => {
    const page = await cena.ctx.newPage();
    page.on('pageerror', (e) => { if (!/plugin is not implemented/.test(e.message)) cena.estado.erros.push(e.message); });
    await page.goto(`${base}${caminho}`, { waitUntil: 'domcontentloaded' });
    await page.getByText(esperar).first().waitFor({ timeout: 40000 });
    await page.waitForTimeout(1200);
    return page;
  };

  // ── Mundo A: o time do Pedro ainda NÃO tem o pacote ──
  {
    const { filho, dados } = await subirMotor({});
    try {
      for (const largura of [390, 360]) {
        const r = `${largura} px`;
        const pedro = await abrirContexto(navegador, base, dados, 'adm', largura);
        const page = await abrirPlanos(pedro, '/planos?destaque=pacote', /Comprar · US\$ 12,99/);
        const c = await lerCartaoDoPacote(page);
        t(`${r} · pacote não ativo: o cartão é o de sempre — "Pacote do time" e o botão "Comprar · US$ 12,99"`, c.titulo === 'Pacote do time' && c.botoes.length === 1 && c.botoes[0].texto === 'Comprar · US$ 12,99' && c.botoes[0].habilitado, JSON.stringify(c));
        t(`${r} · pacote não ativo: nada de "Já é seu", nada de "Presenteie"`, !/Já é seu|Presenteie|Não precisa comprar/.test(c.texto), c.texto);
        t(`${r} · pacote não ativo: a tela não rola para o lado`, !c.lateral);
        await foto(page, `A-nao-ativo-${largura}`);
        t(`${r} · sem erro de página (mundo A)`, pedro.estado.erros.length === 0, pedro.estado.erros.join(' | '));
        await pedro.ctx.close();
      }
    } finally {
      const rede = await encerrarMotor(filho);
      t('mundo A · o motor falso não tentou sair da máquina', Array.isArray(rede) && rede.length === 0, JSON.stringify(rede));
    }
  }

  // ── Mundo B: o time do Pedro JÁ tem o pacote (e o Pedro já gastou as 2 gerações dele) ──
  {
    const { filho, dados } = await subirMotor({ LOJA_PACOTE_ATIVO: '1', LOJA_PACOTE_ESGOTADO: '1' });
    try {
      for (const largura of [390, 360]) {
        const r = `${largura} px`;
        // O dono
        const pedro = await abrirContexto(navegador, base, dados, 'adm', largura);
        const page = await abrirPlanos(pedro, '/planos', /Comprar para o time · US\$ 12,99/);
        const c = await lerCartaoDoPacote(page);
        t(`${r} · pacote ativo: o título vira "Mais figurinhas pro seu time"`, c.titulo === 'Mais figurinhas pro seu time', c.titulo);
        t(`${r} · pacote ativo: a linha "Presenteie o time: +2 gerações para cada jogador."`, c.texto.includes('Presenteie o time: +2 gerações para cada jogador.'), c.texto);
        t(`${r} · pacote ativo: UM botão, "Comprar para o time · US$ 12,99", habilitado`, c.botoes.length === 1 && c.botoes[0].texto === 'Comprar para o time · US$ 12,99' && c.botoes[0].habilitado, JSON.stringify(c.botoes));
        t(`${r} · pacote ativo: sem selo "Já é seu" e sem "Não precisa comprar de novo" — na tela inteira`, !/Já é seu|Não precisa comprar de novo/.test(await texto(page)));
        t(`${r} · pacote ativo: o cartão não parece selecionado (borda fina)`, parseFloat(c.borda) < 2, c.borda);
        t(`${r} · pacote ativo: a tela não rola para o lado`, !c.lateral);
        await page.getByText('Comprar para o time · US$ 12,99').scrollIntoViewIfNeeded();
        await foto(page, `B-ativo-${largura}`);
        // O toque compra o PACOTE da oferta, em nome do time
        await page.getByRole('button', { name: /Comprar para o time · US\$ 12,99/ }).click();
        await page.locator('.futty-toast[role="alert"]').waitFor({ timeout: 15000 });
        const chamadas = await page.evaluate(() => window.__loja || []);
        const compra = chamadas.find((x) => x.metodo === 'purchasePackage');
        const atributo = chamadas.find((x) => x.metodo === 'setAttributes');
        t(`${r} · tocar compra o pacote da oferta (aPackage "pacote") e leva o time como atributo`, compra?.arg?.aPackage?.identifier === 'pacote' && compra?.arg?.aPackage?.product?.identifier === 'futty_pacote' && !!atributo?.arg?.team_id, JSON.stringify(chamadas.map((x) => [x.metodo, x.arg?.aPackage?.identifier || x.arg?.team_id])));
        await page.locator('.futty-toast button').first().click();

        // O convite na Figurinha (o Pedro já gastou as gerações dele)
        const fig = await pedro.ctx.newPage();
        fig.on('pageerror', (e) => { if (!/plugin is not implemented/.test(e.message)) pedro.estado.erros.push(e.message); });
        await fig.goto(`${base}/figurinha`, { waitUntil: 'domcontentloaded' });
        const convite = fig.locator('[data-convite-pacote="presente"]');
        await convite.waitFor({ timeout: 40000 }).catch(() => {});
        t(`${r} · na Figurinha o convite do pacote diz "Comprar para o time · US$ 12,99" (o time já tem o pacote)`, (await convite.count()) === 1 && (await convite.innerText()).trim() === 'Comprar para o time · US$ 12,99', (await convite.count()) ? await convite.innerText() : 'sem convite');
        if (await convite.count()) await convite.scrollIntoViewIfNeeded();
        await foto(fig, `B-convite-figurinha-${largura}`);
        t(`${r} · sem erro de página (dono)`, pedro.estado.erros.length === 0, pedro.estado.erros.join(' | '));
        await pedro.ctx.close();

        // Quem NÃO é dono do time
        const ze = await abrirContexto(navegador, base, dados, 'ze', largura);
        const paginaDele = await abrirPlanos(ze, '/planos', /O pacote é comprado pelo dono do time\./);
        const d = await lerCartaoDoPacote(paginaDele);
        t(`${r} · não dono: o cartão do pacote aparece, com a linha "O pacote é comprado pelo dono do time."`, d.achou && d.soODono === 'O pacote é comprado pelo dono do time.', JSON.stringify(d));
        t(`${r} · não dono: nenhum botão dentro do cartão do pacote (nada de botão morto)`, d.botoes.length === 0, JSON.stringify(d.botoes));
        const corpoDele = await texto(paginaDele);
        t(`${r} · não dono: sem o manto, e a Minha Figurinha segue com o botão`, !/Manto próprio/.test(corpoDele) && await paginaDele.getByRole('button', { name: /Comprar · US\$ 2,99/ }).isVisible());
        t(`${r} · não dono: a tela não rola para o lado`, !d.lateral);
        await paginaDele.getByText('O pacote é comprado pelo dono do time.').scrollIntoViewIfNeeded();
        await foto(paginaDele, `C-nao-dono-${largura}`);
        t(`${r} · sem erro de página (não dono)`, ze.estado.erros.length === 0, ze.estado.erros.join(' | '));
        await ze.ctx.close();
      }
    } finally {
      const rede = await encerrarMotor(filho);
      t('mundo B · o motor falso não tentou sair da máquina', Array.isArray(rede) && rede.length === 0, JSON.stringify(rede));
    }
  }
}
