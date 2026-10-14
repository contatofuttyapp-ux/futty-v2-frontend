// Prova no navegador da Rodada 31N — o link do convite com o nome do time e o link único de download.
//   O app de verdade (index.html) num Chromium que se declara iPhone, Android ou computador; com a ponte nativa de mentira, é o app da
//   loja. O GET /api/convite/:token é respondido aqui (anota o que a tela pediu) e as lojas respondem uma página de mentira: nada sai da
//   máquina. Confere:
//   · /c/domingueira-fc-<código> SEM o app (navegador do iPhone e do Android): abre o convite do Domingueira pedindo ao motor só o código,
//     com o "Baixar o Futty" da loja do aparelho;
//   · o mesmo link COM o app (iPhone e Android): o sistema entrega a URL ao app pelo evento appUrlOpen (a prova dispara o evento, como o
//     sistema faria) e o app abre o convite — sem o bloco de baixar, pedindo ao motor só o código;
//   · /c/<código> sozinho (os links já enviados) e /convite/<uuid> continuam iguais;
//   · /download no iPhone vai à App Store, no Android à Play Store; no computador e dentro do app, a página com o ícone, o slogan e as
//     duas lojas, sem a barra de baixo; /baixar e /app levam ao /download.
//
// Uso: npm run provar:navegador -- rodada-31n      (~1 min)
//      R31N_FOTOS=pasta  salva a foto de cada tela
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { LINK_APP_STORE, LINK_PLAY_STORE } from '../../src/utils/lojaDoApp.js';

export const nome = 'Rodada 31N · /c/<nome-do-time>-<código> com e sem o app (iPhone e Android) e o link único /download';

const RAIZ = fileURLToPath(new URL('../../', import.meta.url));
const FOTOS = process.env.R31N_FOTOS || '';
const ARQUIVO_DO_LOGO = path.resolve(RAIZ, '..', '..', 'times', 'Domingueira', 'Logo Domingueira.png');
const LOGO = existsSync(ARQUIVO_DO_LOGO) ? readFileSync(ARQUIVO_DO_LOGO) : null;
const TIME = { nome: 'Domingueira FC', slug: 'domingueira-fc', cor: 'verde', logo_url: LOGO ? 'https://logo.invalid/domingueira.png' : null, cor_fundo: null };
const CODIGO = 'epbgx5b3';
const LINK_NOVO = `/c/domingueira-fc-${CODIGO}`;
const UUID = '372f8e0d-5618-460d-b0ad-548e84de9581';

const UA_IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.7 Mobile/15E148 Safari/604.1';
const UA_ANDROID = 'Mozilla/5.0 (Linux; Android 14; SM-A146B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36';
const APARELHOS = {
  iphone: { userAgent: UA_IPHONE, viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true },
  android: { userAgent: UA_ANDROID, viewport: { width: 360, height: 780 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true },
  computador: { viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1, isMobile: false, hasTouch: false },
};

// A ponte JS que o app nativo injeta na WebView antes do site (a mesma do iPhone e do Android: decide pela plataforma).
const PONTE_DO_CAPACITOR = readFileSync(path.join(RAIZ, 'node_modules', '@capacitor', 'ios', 'Capacitor', 'Capacitor', 'assets', 'native-bridge.js'), 'utf8');

/**
 * O app da loja, como o celular o monta: o lado nativo de mentira (androidBridge no Android, webkit.messageHandlers.bridge no iPhone), a
 * lista de plugins nativos (`PluginHeaders`, só o App, que é o que entrega os links) e, depois, a ponte de verdade do Capacitor. Toda
 * chamada a plugin responde "ok", menos addListener: esse fica guardado, como no nativo, e `window.__eventoNativo(nome, dados)` responde
 * por ele — é o que o sistema faz quando um link do site abre o app (appUrlOpen).
 */
function ladoNativo(plataforma) {
  const ouvintes = {};
  const responder = (m, extra) => window.Capacitor.fromNative({ callbackId: m.callbackId, pluginId: m.pluginId, methodName: m.methodName, success: true, ...extra });
  const ponte = { postMessage(msg) {
    const m = typeof msg === 'string' ? JSON.parse(msg) : msg;
    if (m.methodName === 'addListener') { (ouvintes[m.options?.eventName] ||= []).push(m); return; }
    if (m.callbackId && m.callbackId !== '-1') setTimeout(() => { try { responder(m, { save: false, data: {} }); } catch { /* sem ponte */ } }, 0);
  } };
  window.__eventoNativo = (evento, dados) => {
    for (const m of ouvintes[evento] || []) responder(m, { save: true, data: dados });
    return (ouvintes[evento] || []).length;
  };
  window.__ouvintesNativos = (evento) => (ouvintes[evento] || []).length;
  if (plataforma === 'android') window.androidBridge = ponte;
  else window.webkit = { messageHandlers: { bridge: ponte } };
  const metodo = (name, rtype = 'promise') => ({ name, rtype });
  window.Capacitor = {
    Plugins: {},
    PluginHeaders: [{ name: 'App', methods: [metodo('addListener', 'callback'), metodo('removeListener'), metodo('removeAllListeners'), metodo('getLaunchUrl'), metodo('getState'), metodo('getInfo'), metodo('exitApp'), metodo('minimizeApp')] }],
  };
}

const respostaDoConvite = () => ({
  valido: true, motivo: null, autenticado: false, jaMembro: false, convidadoPor: 'Bruninho',
  expires_at: new Date(Date.now() + 7 * 86400000).toISOString(), usos: 3,
  membros: 18, proximoJogo: '2026-10-18T13:00:00Z', fuso: 'America/Sao_Paulo', cidade: null, team: TIME,
});

export async function rodar({ navegador, base, t }) {
  if (FOTOS) mkdirSync(FOTOS, { recursive: true });
  const externos = [];
  const lojas = [];
  const erros = [];

  async function abrir({ aparelho, nativo = null }) {
    const ctx = await navegador.newContext({ ...APARELHOS[aparelho], locale: 'pt-BR', timezoneId: 'America/Sao_Paulo', serviceWorkers: 'block', reducedMotion: 'reduce' });
    if (nativo) {
      await ctx.addInitScript(ladoNativo, nativo);
      await ctx.addInitScript({ content: PONTE_DO_CAPACITOR });
    }
    await ctx.addInitScript(() => { try { localStorage.setItem('futty_cookies', 'aceite'); } catch { /* sem armazenamento */ } });
    const pedidosDoConvite = [];
    const hostDoVite = new URL(base).host;
    await ctx.route('**/*', async (route) => {
      const req = route.request();
      const url = new URL(req.url());
      try {
        if (url.pathname.startsWith('/api/')) {
          if (/^\/api\/convite\/[^/]+$/.test(url.pathname) && req.method() === 'GET') {
            pedidosDoConvite.push(decodeURIComponent(url.pathname.slice('/api/convite/'.length)));
            return await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(respostaDoConvite()) });
          }
          return await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
        }
        if (url.host === hostDoVite) return await route.continue();
        if (url.hostname === 'logo.invalid' && LOGO) return await route.fulfill({ status: 200, contentType: 'image/png', body: LOGO });
        if (url.hostname === 'apps.apple.com' || url.hostname === 'play.google.com') {
          lojas.push(url.href);
          return await route.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><meta charset="utf-8"><title>loja</title><p>loja</p>' });
        }
        externos.push(`${req.method()} ${url.host}${url.pathname}`.slice(0, 120));
        return await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
      } catch { return route.abort().catch(() => {}); }
    });
    await ctx.routeWebSocket((url) => url.host !== hostDoVite, (ws) => ws.close());
    const page = await ctx.newPage();
    page.on('pageerror', (e) => { if (!/plugin is not implemented/.test(e.message)) erros.push(`${aparelho}${nativo ? ' (app)' : ''}: ${e.message}`); });
    return { ctx, page, pedidosDoConvite };
  }

  const esperarConvite = async (page) => {
    await page.locator('[data-convite]').waitFor({ timeout: 40000 });
    await page.waitForFunction(() => !/Validando convite/.test(document.body.innerText), null, { timeout: 20000 });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(400);
  };
  const foto = async (page, rotulo) => {
    if (!FOTOS) return;
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(FOTOS, `${rotulo}.png`) });
  };
  const ler = (page) => page.evaluate(() => ({
    caminho: location.pathname,
    nome: document.querySelector('.convite__nome')?.textContent.trim() || null,
    cta: document.querySelector('.convite__cta')?.textContent.trim() || null,
    href: document.querySelector('.convite__cta')?.getAttribute('href') || null,
    baixar: document.querySelector('[data-baixar-app]')?.getAttribute('data-baixar-app') || null,
    nativo: !!window.Capacitor?.isNativePlatform?.(),
  }));

  // ─── O link novo SEM o app: o navegador do celular abre o site ──────────────────────────────────────────────────────────────
  for (const [aparelho, loja, link] of [['iphone', 'ios', LINK_APP_STORE], ['android', 'android', LINK_PLAY_STORE]]) {
    const r0 = `${aparelho === 'iphone' ? 'iPhone' : 'Android'} sem o app · ${LINK_NOVO}`;
    const { ctx, page, pedidosDoConvite } = await abrir({ aparelho });
    await page.goto(`${base}${LINK_NOVO}`, { waitUntil: 'domcontentloaded' });
    await esperarConvite(page);
    const r = await ler(page);
    t(`${r0} · abre o convite do Domingueira FC`, r.nome === 'Domingueira FC' && r.caminho === LINK_NOVO, JSON.stringify(r));
    t(`${r0} · pede ao motor só o código (${CODIGO}), nunca o pedaço com o nome`, pedidosDoConvite.length > 0 && pedidosDoConvite.every((p) => p === CODIGO), JSON.stringify(pedidosDoConvite));
    t(`${r0} · o primeiro botão é "Baixar o Futty" na loja do aparelho`, r.cta === 'Baixar o Futty' && r.baixar === loja && r.href === link, JSON.stringify(r));
    await foto(page, `31n-convite-${aparelho}-sem-app`);
    await ctx.close();
  }

  // ─── O link novo COM o app: o sistema entrega a URL ao app (appUrlOpen) ─────────────────────────────────────────────────────
  for (const aparelho of ['iphone', 'android']) {
    const r0 = `${aparelho === 'iphone' ? 'iPhone' : 'Android'} com o app · https://futtyapp.com.br${LINK_NOVO}`;
    const { ctx, page, pedidosDoConvite } = await abrir({ aparelho, nativo: aparelho === 'iphone' ? 'ios' : 'android' });
    await page.goto(`${base}/`, { waitUntil: 'domcontentloaded' });
    // O ouvinte do appUrlOpen é registrado pelo DeepLinkListener assim que o app monta; espera ele existir antes do toque no link.
    const ouvindo = await page.waitForFunction(() => window.Capacitor?.isNativePlatform?.() && window.__ouvintesNativos?.('appUrlOpen') > 0, null, { timeout: 30000 }).then(() => true, () => false);
    await page.waitForTimeout(500);
    const quantos = await page.evaluate((url) => window.__eventoNativo('appUrlOpen', { url }), `https://futtyapp.com.br${LINK_NOVO}`);
    t(`${r0} · o app está ouvindo os links do site (appUrlOpen)`, ouvindo && quantos >= 1, String(quantos));
    await esperarConvite(page);
    const r = await ler(page);
    t(`${r0} · o app abre o convite do Domingueira FC no caminho do link`, r.nativo && r.nome === 'Domingueira FC' && r.caminho === LINK_NOVO, JSON.stringify(r));
    t(`${r0} · pede ao motor só o código (${CODIGO})`, pedidosDoConvite.length > 0 && pedidosDoConvite.every((p) => p === CODIGO), JSON.stringify(pedidosDoConvite));
    t(`${r0} · dentro do app não há "Baixar o Futty": o botão é "Criar conta e entrar"`, r.baixar === null && r.cta === 'Criar conta e entrar', JSON.stringify(r));
    await foto(page, `31n-convite-${aparelho}-com-app`);
    await ctx.close();
  }

  // ─── Os links de antes continuam iguais ─────────────────────────────────────────────────────────────────────────────────────
  for (const [rota, pedido] of [[`/c/${CODIGO}`, CODIGO], [`/convite/${UUID}`, UUID]]) {
    const { ctx, page, pedidosDoConvite } = await abrir({ aparelho: 'computador' });
    await page.goto(`${base}${rota}`, { waitUntil: 'domcontentloaded' });
    await esperarConvite(page);
    const r = await ler(page);
    t(`computador · ${rota} abre o mesmo convite e pede "${pedido}" ao motor`, r.nome === 'Domingueira FC' && r.cta === 'Criar conta e entrar' && pedidosDoConvite.every((p) => p === pedido) && pedidosDoConvite.length > 0, JSON.stringify({ r, pedidosDoConvite }));
    await ctx.close();
  }

  // ─── /download ──────────────────────────────────────────────────────────────────────────────────────────────────────────────
  for (const [aparelho, link] of [['iphone', LINK_APP_STORE], ['android', LINK_PLAY_STORE]]) {
    for (const rota of ['/download', '/baixar', '/app']) {
      const { ctx, page } = await abrir({ aparelho });
      const antes = lojas.length;
      await page.goto(`${base}${rota}`, { waitUntil: 'domcontentloaded' }).catch(() => {});
      // A URL da página, de 100 em 100 ms (uma espera de navegação acabaria no primeiro corte, se houvesse dois pedidos).
      for (let i = 0; i < 300 && page.url() !== link; i += 1) await page.waitForTimeout(100);
      const pedidos = lojas.slice(antes);
      t(`${aparelho === 'iphone' ? 'iPhone' : 'Android'} · ${rota} vai direto para ${link}, numa ida só`, page.url() === link && pedidos.length === 1 && pedidos[0] === link, JSON.stringify({ url: page.url(), lojas: pedidos }));
      await ctx.close();
    }
  }
  const lerDownload = (page) => page.evaluate(() => ({
    caminho: location.pathname,
    tipo: document.querySelector('[data-download]')?.getAttribute('data-download') || null,
    slogan: document.querySelector('.download__slogan')?.textContent.replace(/\s+/g, ' ').trim() || null,
    icone: !!document.querySelector('[data-download] .convite__marca svg, [data-download] .convite__marca img'),
    botoes: [...document.querySelectorAll('[data-download] a.btn')].map((a) => ({ texto: a.textContent.trim(), href: a.getAttribute('href') })),
    barra: !!document.querySelector('nav.bottom-nav, .bottom-nav'),
    rolavel: document.scrollingElement.scrollWidth,
    largura: innerWidth,
  }));
  const BOTOES = JSON.stringify([{ texto: 'App Store', href: LINK_APP_STORE }, { texto: 'Google Play', href: LINK_PLAY_STORE }]);
  for (const rota of ['/download', '/baixar', '/app']) {
    const { ctx, page } = await abrir({ aparelho: 'computador' });
    const antes = lojas.length;
    await page.goto(`${base}${rota}`, { waitUntil: 'domcontentloaded' });
    await page.locator('[data-download]').waitFor({ timeout: 30000 });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(400);
    const r = await lerDownload(page);
    t(`computador · ${rota} → /download: o ícone, "O seu time. A sua figurinha." e os botões App Store e Google Play`,
      r.caminho === '/download' && r.tipo === 'pagina' && r.icone && r.slogan === 'O seu time. A sua figurinha.' && JSON.stringify(r.botoes) === BOTOES && lojas.length === antes,
      JSON.stringify(r));
    t(`computador · ${rota} · sem a barra de baixo, sem rolagem para o lado`, !r.barra && r.rolavel <= r.largura + 1, JSON.stringify({ barra: r.barra, rolavel: r.rolavel }));
    if (rota === '/download') await foto(page, '31n-download-computador');
    await ctx.close();
  }
  {
    const { ctx, page } = await abrir({ aparelho: 'iphone', nativo: 'ios' });
    const antes = lojas.length;
    await page.goto(`${base}/download`, { waitUntil: 'domcontentloaded' });
    await page.locator('[data-download]').waitFor({ timeout: 30000 });
    await page.waitForTimeout(1200);
    const r = await lerDownload(page);
    t('app da loja no iPhone · /download não manda para a loja: mostra a página (e o link nunca cai dentro do app pelo sistema)', r.tipo === 'pagina' && lojas.length === antes && page.url().endsWith('/download'), JSON.stringify(r));
    await foto(page, '31n-download-app-iphone');
    await ctx.close();
  }

  t('nenhum erro de página', erros.length === 0, erros.join(' | '));
  t('nada foi ao site, ao motor ou ao banco de verdade', !externos.some((e) => /futtyapp\.com\.br|run\.app|supabase\.co/.test(e)), JSON.stringify(externos));
}
