// Prova no navegador da Rodada 31M — o convite aberto no NAVEGADOR do celular manda baixar o app.
//   O app de verdade (index.html) num Chromium que se declara iPhone (Safari) ou Android (Chrome), com o GET /api/convite/:token
//   respondido aqui (nenhum convite real é tocado; nada sai da máquina — as lojas respondem uma página de mentira). Confere:
//   · iPhone (390 px) e Android (360 px), link longo e curto: o primeiro e maior botão é "Baixar o Futty" e leva à loja do aparelho,
//     com a linha "Ao baixar, o link do convite fica copiado…", e "Continuar pelo site" vem abaixo, menor;
//   · "Continuar pelo site" devolve o fluxo de sempre ("Criar conta e entrar" → cadastro, "já tenho conta" → login);
//   · computador e o app da loja (a ponte nativa de mentira que o Capacitor lê): nada muda;
//   · já membro e convite expirado no celular: como sempre (a frase "abre direto no app, já no time" só vale para quem vai entrar).
//
// Uso: npm run provar:navegador -- rodada-31m      (~1 min)
//      R31M_FOTOS=pasta  salva a foto de cada tela
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { LINK_APP_STORE, LINK_PLAY_STORE } from '../../src/utils/lojaDoApp.js';

export const nome = 'Rodada 31M · convite no navegador do celular: "Baixar o Futty" na loja do aparelho, o site a um toque; computador e app sem mudança';

const RAIZ = fileURLToPath(new URL('../../', import.meta.url));
const FOTOS = process.env.R31M_FOTOS || '';
// O escudo de verdade do Domingueira, se a pasta do FUT estiver ao lado; sem ela, o convite sai sem logo (o nome em destaque).
const ARQUIVO_DO_LOGO = path.resolve(RAIZ, '..', '..', 'times', 'Domingueira', 'Logo Domingueira.png');
const LOGO = existsSync(ARQUIVO_DO_LOGO) ? readFileSync(ARQUIVO_DO_LOGO) : null;
const TIME = { nome: 'Domingueira FC', slug: 'domingueira-fc', cor: 'verde', logo_url: LOGO ? 'https://logo.invalid/domingueira.png' : null, cor_fundo: null };
const DOMINGO_18 = '2026-10-18T13:00:00Z'; // domingo, 10:00 em Brasília

const UA_IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.7 Mobile/15E148 Safari/604.1';
const UA_ANDROID = 'Mozilla/5.0 (Linux; Android 14; SM-A146B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36';
const APARELHOS = {
  iphone: { userAgent: UA_IPHONE, viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true },
  android: { userAgent: UA_ANDROID, viewport: { width: 360, height: 780 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true },
  computador: { viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1, isMobile: false, hasTouch: false },
};
// Rodada 31R: com a área de transferência (o caso do celular), a linha diz que o link fica copiado; sem ela, a frase de antes.
const FRASE = 'Ao baixar, o link do convite fica copiado. No app, é só colar no Início.';

/** A ponte nativa de mentira: o Capacitor lê a plataforma de webkit.messageHandlers.bridge (iPhone) — é o app da loja. */
function appDaLoja() {
  const ponte = { postMessage(msg) {
    const m = typeof msg === 'string' ? JSON.parse(msg) : msg;
    setTimeout(() => { try { window.Capacitor.fromNative({ callbackId: m.callbackId, pluginId: m.pluginId, methodName: m.methodName, save: false, success: true, data: {} }); } catch { /* sem ponte */ } }, 0);
  } };
  window.webkit = { messageHandlers: { bridge: ponte } };
}

const respostaDoConvite = (extra = {}) => ({
  valido: true, motivo: null, autenticado: false, jaMembro: false, convidadoPor: 'Bruninho',
  expires_at: new Date(Date.now() + 7 * 86400000).toISOString(), usos: 3,
  membros: 18, proximoJogo: DOMINGO_18, fuso: 'America/Sao_Paulo', cidade: null,
  team: TIME, ...extra,
});

export async function rodar({ navegador, base, t }) {
  if (FOTOS) mkdirSync(FOTOS, { recursive: true });
  const externos = [];
  const lojas = [];
  const erros = [];

  async function abrir({ aparelho, rota = '/convite/token-de-prova', resposta = respostaDoConvite(), nativo = false }) {
    const ctx = await navegador.newContext({ ...APARELHOS[aparelho], locale: 'pt-BR', timezoneId: 'America/Sao_Paulo', serviceWorkers: 'block', reducedMotion: 'reduce' });
    if (nativo) await ctx.addInitScript(appDaLoja);
    await ctx.addInitScript(() => { try { localStorage.setItem('futty_cookies', 'aceite'); } catch { /* sem armazenamento */ } });
    const hostDoVite = new URL(base).host;
    await ctx.route('**/*', async (route) => {
      const req = route.request();
      const url = new URL(req.url());
      try {
        if (url.pathname.startsWith('/api/')) {
          if (/^\/api\/convite\/[^/]+$/.test(url.pathname) && req.method() === 'GET') {
            return await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(resposta) });
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
    page.on('pageerror', (e) => { if (!/plugin is not implemented/.test(e.message)) erros.push(`${aparelho}${nativo ? ' (app)' : ''} ${rota}: ${e.message}`); });
    await page.goto(`${base}${rota}`, { waitUntil: 'domcontentloaded' });
    await page.locator('[data-convite]').waitFor({ timeout: 40000 });
    await page.waitForFunction(() => !/Validando convite/.test(document.body.innerText), null, { timeout: 20000 });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(400);
    return { ctx, page };
  }

  const foto = async (page, rotulo) => {
    if (!FOTOS) return;
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(FOTOS, `${rotulo}.png`) });
  };

  /** O que a tela mostra: o bloco do app, os botões visíveis (na ordem da tela) com caixa e letra, a linha, e o fluxo de sempre. */
  const ler = (page) => page.evaluate(() => {
    const caixa = (el) => { if (!el) return null; const b = el.getBoundingClientRect(); return { y: Math.round(b.top), h: Math.round(b.height), w: Math.round(b.width) }; };
    const visivel = (el) => { const b = el.getBoundingClientRect(); return b.width > 0 && b.height > 0; };
    const botoes = [...document.querySelectorAll('[data-convite] a.btn, [data-convite] button')].filter(visivel)
      .map((b) => ({ texto: b.innerText.trim(), tag: b.tagName, href: b.getAttribute('href'), fonte: parseFloat(getComputedStyle(b).fontSize), ...caixa(b) }));
    const depois = document.querySelector('.convite__depois');
    return {
      loja: document.querySelector('[data-baixar-app]')?.getAttribute('data-baixar-app') || null,
      botoes,
      depois: depois?.innerText.trim() || null,
      depoisY: caixa(depois)?.y ?? null,
      jaTenho: [...document.querySelectorAll('a.convite__ja-tenho')].map((a) => ({ texto: a.innerText.trim(), href: a.getAttribute('href') })),
      corpo: document.body.innerText.replace(/\s+/g, ' '),
      largura: window.innerWidth,
      rolavel: document.scrollingElement.scrollWidth,
      nativo: !!window.Capacitor?.isNativePlatform?.(),
    };
  });

  // ─── Celular no navegador: iPhone (App Store) e Android (Play Store), link longo e curto ─────────────────────────────────────
  const CELULARES = [
    { aparelho: 'iphone', rotulo: 'iPhone 390', loja: 'ios', link: LINK_APP_STORE, rota: '/convite/token-de-prova' },
    { aparelho: 'android', rotulo: 'Android 360', loja: 'android', link: LINK_PLAY_STORE, rota: '/c/k7m2p9qx' },
    { aparelho: 'iphone', rotulo: 'iPhone 390 (link curto)', loja: 'ios', link: LINK_APP_STORE, rota: '/c/k7m2p9qx', semFoto: true },
    { aparelho: 'android', rotulo: 'Android 360 (link longo)', loja: 'android', link: LINK_PLAY_STORE, rota: '/convite/token-de-prova', semFoto: true },
  ];
  for (const c of CELULARES) {
    const r0 = `${c.rotulo} ${c.rota}`;
    {
      const { ctx, page } = await abrir({ aparelho: c.aparelho, rota: c.rota });
      const r = await ler(page);
      const [primeiro, ...resto] = r.botoes;
      const site = r.botoes.find((b) => b.texto === 'Continuar pelo site');
      t(`${r0} · a tela sabe que é ${c.loja === 'ios' ? 'iPhone' : 'Android'} no navegador (e não o app)`, r.loja === c.loja && !r.nativo, JSON.stringify({ loja: r.loja, nativo: r.nativo }));
      t(`${r0} · o PRIMEIRO botão é "Baixar o Futty"`, primeiro?.texto === 'Baixar o Futty', JSON.stringify(r.botoes.map((b) => b.texto)));
      t(`${r0} · …e é o MAIOR (mais alto, mais largo e com a letra maior que os outros)`, !!primeiro && resto.every((b) => primeiro.h > b.h && primeiro.w >= b.w && primeiro.fonte > b.fonte), JSON.stringify(r.botoes));
      t(`${r0} · "Baixar o Futty" leva à ${c.loja === 'ios' ? 'App Store' : 'Play Store'} (${c.link})`, primeiro?.tag === 'A' && primeiro?.href === c.link, JSON.stringify(primeiro));
      t(`${r0} · a linha "${FRASE}"`, r.depois === FRASE, String(r.depois));
      t(`${r0} · "Continuar pelo site" vem abaixo da linha, menor`, !!site && r.depoisY != null && site.y > r.depoisY && r.depoisY > primeiro.y && site.h < primeiro.h && site.fonte < primeiro.fonte, JSON.stringify({ site, depoisY: r.depoisY }));
      t(`${r0} · os botões de sempre ficam para depois do "Continuar pelo site"`, !/Criar conta e entrar/.test(r.corpo) && r.jaTenho.length === 0, JSON.stringify({ jaTenho: r.jaTenho }));
      t(`${r0} · o time continua lá: "Bruninho te convidou para o Domingueira FC" e os fatos`, /Bruninho te convidou para o Domingueira FC/.test(r.corpo) && /18 jogadores/.test(r.corpo) && /Próximo jogo/.test(r.corpo), r.corpo.slice(0, 200));
      t(`${r0} · sem rolagem para o lado`, r.rolavel <= r.largura + 1, `${r.rolavel} × ${r.largura}`);
      if (!c.semFoto) await foto(page, `31m-${c.aparelho}-convite`);

      // "Continuar pelo site": o fluxo de sempre, no lugar do bloco do app.
      await page.locator('.convite__pelo-site').tap();
      await page.locator('.convite__cta', { hasText: 'Criar conta e entrar' }).waitFor({ timeout: 5000 });
      const s = await ler(page);
      t(`${r0} · "Continuar pelo site" → "Criar conta e entrar" e "já tenho conta" (o fluxo de sempre), sem o bloco do app`,
        s.loja === null && s.botoes[0]?.texto === 'Criar conta e entrar' && s.jaTenho.length === 1 && s.jaTenho[0].texto === 'já tenho conta' && s.jaTenho[0].href === '/login' && !/Baixar o Futty/.test(s.corpo),
        JSON.stringify({ loja: s.loja, botoes: s.botoes.map((b) => b.texto), jaTenho: s.jaTenho }));
      if (!c.semFoto) await foto(page, `31m-${c.aparelho}-pelo-site`);
      await page.locator('.convite__cta').tap();
      await page.waitForURL((u) => u.pathname === '/register', { timeout: 10000 }).catch(() => {});
      t(`${r0} · …e "Criar conta e entrar" segue para o cadastro, como hoje`, new URL(page.url()).pathname === '/register', page.url());
      await ctx.close();
    }
    {
      // O toque em "Baixar o Futty" abre a loja (aqui, a página de mentira dela).
      const { ctx, page } = await abrir({ aparelho: c.aparelho, rota: c.rota });
      const antes = lojas.length;
      await Promise.all([page.waitForURL((u) => u.href.startsWith(c.link), { timeout: 10000 }).catch(() => {}), page.locator('.convite__cta').tap()]);
      t(`${r0} · tocar em "Baixar o Futty" abre ${c.link}`, lojas.slice(antes).includes(c.link) && page.url() === c.link, JSON.stringify({ pedidos: lojas.slice(antes), url: page.url() }));
      await ctx.close();
    }
  }

  // ─── Onde nada muda ─────────────────────────────────────────────────────────────────────────────────────────────────────────
  const SEMPRE = [
    { rotulo: 'computador', aparelho: 'computador', foto: '31m-computador' },
    { rotulo: 'app da loja no iPhone', aparelho: 'iphone', nativo: true, foto: '31m-app-iphone' },
  ];
  for (const c of SEMPRE) {
    const { ctx, page } = await abrir({ aparelho: c.aparelho, nativo: c.nativo });
    const r = await ler(page);
    if (c.nativo) t(`${c.rotulo} · a página roda como o app (Capacitor.isNativePlatform)`, r.nativo, String(r.nativo));
    t(`${c.rotulo} · nada muda: sem "Baixar o Futty", o botão é "Criar conta e entrar" e há "já tenho conta"`,
      r.loja === null && !/Baixar o Futty|Continuar pelo site/.test(r.corpo) && r.botoes[0]?.texto === 'Criar conta e entrar' && r.jaTenho.length === 1,
      JSON.stringify({ loja: r.loja, botoes: r.botoes.map((b) => b.texto), jaTenho: r.jaTenho }));
    await foto(page, c.foto);
    await ctx.close();
  }

  // ─── No celular, os outros estados do convite ficam como sempre ─────────────────────────────────────────────────────────────
  {
    const { ctx, page } = await abrir({ aparelho: 'iphone', resposta: respostaDoConvite({ jaMembro: true, autenticado: true }) });
    const r = await ler(page);
    t('iPhone · já membro: "Ir para o time", sem o bloco do app', r.loja === null && r.botoes[0]?.texto === 'Ir para o time' && !/Baixar o Futty/.test(r.corpo), JSON.stringify(r.botoes.map((b) => b.texto)));
    await ctx.close();
  }
  {
    const { ctx, page } = await abrir({ aparelho: 'android', resposta: respostaDoConvite({ valido: false, motivo: 'expirado' }) });
    const r = await ler(page);
    t('Android · convite expirado: "Convite inválido" com as saídas de sempre, sem o bloco do app', r.loja === null && /Convite inválido/i.test(r.corpo) && /Este convite expirou/.test(r.corpo) && !/Baixar o Futty/.test(r.corpo), r.corpo.slice(0, 200));
    await ctx.close();
  }

  t('nenhum erro de página', erros.length === 0, erros.join(' | '));
  t('nada foi ao site, ao motor ou ao banco de verdade', !externos.some((e) => /futtyapp\.com\.br|run\.app|supabase\.co/.test(e)), JSON.stringify(externos));
}
