// Prova no navegador da Rodada 29V (5-out): a faixa de cookies é só do SITE. No app nativo (Capacitor) ela não aparece e nem registra os ouvintes de
// "fechar na primeira interação"; no site nada muda (aparece, "Aceitar" fecha, e a escolha fica lembrada). O app nativo é simulado do mesmo jeito
// que o Capacitor o reconhece (node_modules/@capacitor/core: `window.androidBridge` no Android, `window.webkit.messageHandlers.bridge` no iOS).
// Usa a mesma página-bancada da 29L (a montagem do App: Layout + faixa + 404); nada sai para a rede.
export const nome = 'Rodada 29V (a faixa de cookies só no site: aparece no navegador, não existe no app Android nem no iOS)';

const FAIXA = '[aria-label="Aviso de cookies"]';
const SEM_PONTE = () => {};
const PONTES = {
  site: SEM_PONTE,
  android: () => { window.androidBridge = { postMessage() {} }; },
  ios: () => { window.webkit = { messageHandlers: { bridge: { postMessage() {} } } }; },
};

async function abrir(navegador, base, plataforma) {
  const ctx = await navegador.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true, locale: 'pt-BR', timezoneId: 'America/Sao_Paulo' });
  await ctx.addInitScript(PONTES[plataforma]);
  const page = await ctx.newPage();
  const erros = [];
  page.on('pageerror', (e) => erros.push(e.message));
  const origem = new URL(base).host;
  await page.route('**/*', (route) => {
    const u = new URL(route.request().url());
    if (u.pathname.startsWith('/api/')) return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    if (u.host === origem) return route.continue();
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });
  await page.goto(`${base}/scripts/provas/rodada-29l.html`, { waitUntil: 'domcontentloaded' });
  await page.locator('[data-casa]').waitFor({ timeout: 20000 });
  await page.evaluate(() => { window.history.pushState({}, '', '/rota-que-nao-existe'); window.dispatchEvent(new PopStateEvent('popstate')); });
  await page.locator('.bottom-nav').waitFor({ timeout: 15000 }); // a página montou: a faixa já teria aparecido
  await page.waitForTimeout(500);
  return { ctx, page, erros };
}
const guardado = (page) => page.evaluate(() => { try { return localStorage.getItem('futty_cookies'); } catch { return 'sem-storage'; } });

export async function rodar({ navegador, base, t }) {
  // ── o site: nada muda ────────────────────────────────────────────────────────────────────────────────────────────────────────────
  {
    const { ctx, page, erros } = await abrir(navegador, base, 'site');
    t('site: a faixa de cookies aparece para quem chega', (await page.locator(FAIXA).count()) === 1);
    t('site: ela diz o que dizia (sessão + "Saiba mais" + "Aceitar")', await page.locator(FAIXA).evaluate((el) => /Cookies para manter sua sessão\./.test(el.innerText) && /Saiba mais/.test(el.innerText) && /Aceitar/.test(el.innerText)));
    await page.getByRole('button', { name: 'Aceitar' }).click();
    t('site: "Aceitar" fecha a faixa', (await page.locator(FAIXA).count()) === 0);
    t('site: e a escolha fica guardada ("aceite")', (await guardado(page)) === 'aceite');
    t('site: a faixa roda sem exceção', erros.length === 0, erros.slice(0, 2).join(' | '));
    await ctx.close();
  }
  {
    const { ctx, page } = await abrir(navegador, base, 'site');
    await page.keyboard.press('Tab');
    await page.waitForTimeout(150);
    t('site: a primeira interação (uma tecla) ainda fecha a faixa, como sempre', (await page.locator(FAIXA).count()) === 0 && (await guardado(page)) === 'aceite');
    await ctx.close();
  }

  // ── o app da loja: a faixa não existe ───────────────────────────────────────────────────────────────────────────────────────────────
  for (const plataforma of ['android', 'ios']) {
    const { ctx, page, erros } = await abrir(navegador, base, plataforma);
    const rotulo = plataforma === 'android' ? 'app Android' : 'app iOS';
    t(`${rotulo}: o Capacitor reconhece a plataforma (a simulação vale)`, await page.evaluate(() => !!(window.androidBridge || window.webkit?.messageHandlers?.bridge)));
    t(`${rotulo}: a faixa de cookies não aparece`, (await page.locator(FAIXA).count()) === 0);
    await page.mouse.move(100, 300);
    await page.touchscreen.tap(195, 300);
    await page.keyboard.press('Tab');
    await page.mouse.wheel(0, 200);
    await page.waitForTimeout(250);
    t(`${rotulo}: nem depois de tocar, rolar e apertar tecla (nada a fechar)`, (await page.locator(FAIXA).count()) === 0);
    t(`${rotulo}: e nada é gravado no aparelho (a faixa nem registrou os ouvintes de interação)`, (await guardado(page)) === null, String(await guardado(page)));
    t(`${rotulo}: a barra de navegação segue lá, sem nada por baixo`, (await page.locator('.bottom-nav').count()) === 1);
    t(`${rotulo}: roda sem exceção`, erros.length === 0, erros.slice(0, 2).join(' | '));
    await ctx.close();
  }
}
