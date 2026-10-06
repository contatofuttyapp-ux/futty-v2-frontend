// Prova no navegador do Capgo (6-out, builds 35/17): o app avisa a camada nativa de que o bundle abriu (`notifyAppReady`) — SÓ no app nativo e
// logo no arranque. Sem o aviso o Capgo acha que o app travou (10 s por padrão) e DESFAZ toda atualização ao vivo, em silêncio; na web não existe
// camada nativa e o plugin nem pode ser baixado (peso do arranque). O app nativo é simulado do mesmo jeito que o Capacitor o reconhece
// (`window.androidBridge` no Android, `window.webkit.messageHandlers.bridge` no iOS — ver a prova da 29V); a ponte de mentira guarda cada chamada
// de plugin que o app faz. Roda o index.html de verdade (o main.jsx), com o motor de mentira; nada sai para a rede.
export const nome = 'Capgo (notifyAppReady só no app nativo e uma vez; a web nunca carrega o plugin)';

// O que a camada nativa injeta ANTES do JS do app (o Capacitor preserva o que já existe em window.Capacitor): a ponte que o faz reconhecer a
// plataforma, a lista de métodos de cada plugin (`PluginHeaders`) e a função que leva a chamada ao nativo (`nativePromise`) — aqui ela só a anota.
const PONTE_NATIVA = (plataforma) => {
  window.__ponte = [];
  if (plataforma === 'android') window.androidBridge = { postMessage() {} };
  else window.webkit = { messageHandlers: { bridge: { postMessage() {} } } };
  window.Capacitor = {
    PluginHeaders: [{ name: 'CapacitorUpdater', methods: [{ name: 'notifyAppReady', rtype: 'promise' }] }],
    nativePromise: (pluginId, methodName, options) => { window.__ponte.push(JSON.stringify({ pluginId, methodName, options })); return Promise.resolve({}); },
  };
};

async function abrir(navegador, base, plataforma) {
  // O service worker fica de fora: a prova mede o que o app pede, não o que um cache servia.
  const ctx = await navegador.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true, locale: 'pt-BR', timezoneId: 'America/Sao_Paulo', serviceWorkers: 'block' });
  if (plataforma !== 'site') await ctx.addInitScript(PONTE_NATIVA, plataforma);
  const page = await ctx.newPage();
  const erros = [];
  const pedidos = [];
  page.on('pageerror', (e) => erros.push(e.message));
  page.on('request', (r) => pedidos.push(r.url()));
  const origem = new URL(base).host;
  await page.route('**/*', (route) => {
    const u = new URL(route.request().url());
    if (u.pathname.startsWith('/api/')) return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    if (u.host === origem) return route.continue();
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });
  await page.goto(`${base}/`, { waitUntil: 'domcontentloaded' });
  // O React montou = o #root ganhou filhos. Se não montar, a prova diz isso em vez de cair numa exceção.
  const montou = await page.waitForFunction(() => (document.getElementById('root')?.children.length || 0) > 0, null, { timeout: 20000 }).then(() => true, () => false);
  await page.waitForTimeout(1500);
  const bruto = await page.evaluate(() => window.__ponte || []);
  const chamadas = bruto.map((m) => { try { return JSON.parse(m); } catch { return {}; } });
  return { ctx, erros, pedidos, chamadas, montou };
}

const ehAviso = (c) => c.pluginId === 'CapacitorUpdater' && c.methodName === 'notifyAppReady';
const pediuOPlugin = (pedidos) => pedidos.some((u) => /capacitor-updater|capgo/i.test(u));

export async function rodar({ navegador, base, t }) {
  // ── o site: o plugin não é nem baixado, e nada quebra ───────────────────────────────────────────────────────────────────────────
  {
    const { ctx, erros, pedidos, montou } = await abrir(navegador, base, 'site');
    t('site: o app monta (o #root ganha filhos)', montou, 'o #root ficou vazio em 20 s');
    t('site: nenhum pedido ao plugin do Capgo (a web nunca o carrega)', !pediuOPlugin(pedidos), pedidos.filter((u) => /capacitor-updater|capgo/i.test(u)).join(' | '));
    t('site: nenhuma exceção sobre o Capgo no arranque', !erros.some((e) => /capgo|updater|notifyAppReady/i.test(e)), erros.join(' | '));
    await ctx.close();
  }

  // ── o app nativo (Android e iOS): o aviso sai UMA vez, pela ponte, para o plugin certo ──────────────────────────────────────────
  for (const plataforma of ['android', 'ios']) {
    const { ctx, erros, pedidos, chamadas, montou } = await abrir(navegador, base, plataforma);
    const avisos = chamadas.filter(ehAviso);
    t(`${plataforma}: o app monta (o #root ganha filhos)`, montou, 'o #root ficou vazio em 20 s');
    t(`${plataforma}: o plugin do Capgo é carregado (import dinâmico, só no nativo)`, pediuOPlugin(pedidos), 'nenhum pedido ao plugin');
    t(`${plataforma}: notifyAppReady chega à camada nativa, uma vez só`, avisos.length === 1, `chamadas: ${avisos.length} (ponte viu ${chamadas.length} chamadas de plugin)`);
    t(`${plataforma}: nenhuma exceção sobre o Capgo no arranque`, !erros.some((e) => /capgo|updater|notifyAppReady/i.test(e)), erros.join(' | '));
    await ctx.close();
  }
}
