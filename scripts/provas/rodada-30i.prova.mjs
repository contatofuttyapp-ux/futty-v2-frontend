// Prova no navegador da Rodada 30I ("Quem ganhou?"): o que só um Chromium de verdade confirma, com as MESMAS fontes e o MESMO CSS do app.
//   · item 2: o empate vira post na Resenha — o bloco "Empate" com a frase "Ouro 2 × 2 Roxo", no lugar do time campeão, que não aparece.
// O motor é de mentira (/api/** respondido por page.route): nada sai para a rede.
import { readFileSync } from 'node:fs';

// A sessão também é de mentira: a chave do Supabase no localStorage (o mesmo truque da prova 29S-B).
const REF = new URL((readFileSync(new URL('../../.env', import.meta.url), 'utf8').match(/^VITE_SUPABASE_URL=(.+)$/m)?.[1] || 'https://prova.supabase.co').trim()).hostname.split('.')[0];
const SESSAO = JSON.stringify({
  access_token: 'prova', refresh_token: 'prova', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 86400 * 30,
  user: { id: 'U1', aud: 'authenticated', email: 'prova@futty.test', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' },
});

export const nome = 'Rodada 30I (Quem ganhou?: empate na Resenha)';

async function abrirCena(navegador, base, cena, { largura = 390, altura = 1400 } = {}) {
  const ctx = await navegador.newContext({ viewport: { width: largura, height: altura }, deviceScaleFactor: 1, isMobile: true, hasTouch: true, locale: 'pt-BR', timezoneId: 'America/Sao_Paulo' });
  await ctx.addInitScript(({ chave, sessao }) => {
    try { localStorage.setItem('futty_cookies', 'aceite'); localStorage.setItem(chave, sessao); } catch { /* sem storage */ }
  }, { chave: `sb-${REF}-auth-token`, sessao: SESSAO });
  const page = await ctx.newPage();
  const erros = [];
  page.on('pageerror', (e) => erros.push(e.message));
  const origem = new URL(base).host;
  await page.route('**/*', (route) => {
    const u = new URL(route.request().url());
    if (u.host === origem && !u.pathname.startsWith('/api/')) return route.continue();
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });
  await page.goto(`${base}/scripts/provas/rodada-30i.html#${cena}`, { waitUntil: 'domcontentloaded' });
  return { page, ctx, erros };
}

export async function rodar({ navegador, base, t }) {
  // ─── item 2: o empate na Resenha ───────────────────────────────────────────────────────────────────────────────────
  for (const largura of [390, 360]) {
    const { page, ctx, erros } = await abrirCena(navegador, base, 'empate', { largura });
    await page.locator('[data-c="com-placar"] .feed-card').waitFor({ timeout: 20000 });
    await page.waitForTimeout(400);
    const frase = (c) => page.locator(`[data-c="${c}"] [data-empate-frase]`).innerText();
    t(`${largura}px · o empate com placar diz "Ouro 2 × 2 Roxo"`, (await frase('com-placar')) === 'Ouro 2 × 2 Roxo', await frase('com-placar'));
    t(`${largura}px · sem placar a frase não inventa número ("Ouro × Roxo")`, (await frase('sem-placar')) === 'Ouro × Roxo', await frase('sem-placar'));
    t(`${largura}px · o bloco do empate se chama "Empate"`, /EMPATE/i.test(await page.locator('[data-c="com-placar"] [data-empate]').first().innerText()));
    t(`${largura}px · o empate não tem o bloco "Time campeão"`, (await page.locator('[data-c="com-placar"]').innerText()).toLowerCase().includes('time campeão') === false);
    t(`${largura}px · o jogo com campeão continua com "Time campeão" e sem bloco de empate`,
      /time campe/i.test(await page.locator('[data-c="campeao"]').innerText()) && (await page.locator('[data-c="campeao"] [data-empate]').count()) === 0);
    const sobra = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    t(`${largura}px · nada rola para o lado`, sobra <= 0, `sobra ${sobra}px`);
    const respira = await page.locator('[data-c="com-placar"] [data-empate]').evaluate((el) => !!el.closest('.feed-cromo-sway')?.parentElement?.classList.contains('feed-cromo-bob'));
    t(`${largura}px · o empate respira como o bloco do campeão (bob + sway)`, respira);
    if (largura === 390) await page.screenshot({ path: new URL('../capturas/30i-empate-390.png', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'), fullPage: true });
    t(`${largura}px · console sem erros`, erros.filter((e) => !/favicon|Failed to load resource/.test(e)).length === 0, erros.slice(0, 2).join(' | '));
    await ctx.close();
  }
}
