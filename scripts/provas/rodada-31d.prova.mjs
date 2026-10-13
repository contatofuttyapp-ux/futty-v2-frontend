// Prova no navegador da Rodada 31D — ajustes de tela, a 390 e a 360 px:
//   · a grade de uniformes da Figurinha sem o selo "pintar · 1 geração · ~45 s" (só a estrelinha de IA no tile);
//   · a confirmação nova ao tocar no uniforme ("Gerar figurinha com este uniforme?" / "Isso usa 1 geração. Você tem N gerações." / Gerar · Agora não);
//   · "Comprar mais gerações": o link solto saiu; o botão do cartão "Loja de figurinhas" embaixo de "Restam N gerações" é o caminho;
//   · o Ranking: o confete do pódio sai na 1ª vez e NÃO na segunda entrada na mesma posição (só quando a posição muda).
// Mesma bancada das provas da loja: o app de verdade num Chromium que se declara iOS, o motor de VERDADE por cima de banco falso
// (scripts/provas/_motor-loja.cjs), o SDK do RevenueCat e o canvas-confetti trocados por mentiras. Nada sai da máquina.
//
// Uso: npm run provar:navegador -- rodada-31d      (~2 min)
//      R31D_FOTOS=pasta  salva a foto de cada passo
import { spawn } from 'node:child_process';
import { mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const nome = 'Rodada 31D · grade sem selo, confirmação nova, "Comprar mais gerações" e confete do pódio só na mudança (motor de verdade, nada sai da máquina)';

const RAIZ = fileURLToPath(new URL('../../', import.meta.url));
const MOTOR = path.join(RAIZ, 'scripts', 'provas', '_motor-loja.cjs');
const BACKEND_AO_LADO = path.resolve(RAIZ, '..', 'backend', 'tests', '_appFalsa.js');
const REF = new URL((readFileSync(new URL('../../.env', import.meta.url), 'utf8').match(/^VITE_SUPABASE_URL=(.+)$/m)?.[1] || 'https://prova.supabase.co').trim()).hostname.split('.')[0];
const FOTOS = process.env.R31D_FOTOS || '';

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

// O canvas-confetti de mentira: cada disparo soma em window.__confete (e nada é desenhado).
const CONFETE_DE_MENTIRA = `window.__confete = window.__confete || 0;
export default function confetti() { window.__confete += 1; return Promise.resolve(); }
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
        if (/canvas-confetti/.test(url.pathname) && /\.js$/.test(url.pathname)) return await route.fulfill({ status: 200, contentType: 'text/javascript', body: CONFETE_DE_MENTIRA });
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
  if (FOTOS) mkdirSync(FOTOS, { recursive: true });
  const foto = async (page, rotulo, opcoes = {}) => { if (FOTOS) { await page.waitForTimeout(600); await page.screenshot({ path: path.join(FOTOS, `${rotulo}.png`), ...opcoes }); } };
  const pagina = async (cena, caminho, esperar) => {
    const page = await cena.ctx.newPage();
    page.on('pageerror', (e) => { if (!/plugin is not implemented/.test(e.message)) cena.estado.erros.push(e.message); });
    await page.goto(`${base}${caminho}`, { waitUntil: 'domcontentloaded' });
    await esperar(page);
    await page.waitForTimeout(1200);
    return page;
  };

  const { filho, dados } = await subirMotor({ LOJA_ABERTA: '', LOJA_CREDITOS: '1', LOJA_RANKING: '1' });
  const slug = dados.time.slug;
  try {
    for (const largura of [390, 360]) {
      const r = `${largura} px`;

      // ── Figurinha do Pedro: a loja está ligada para ele (testador) ──
      const pedro = await abrirContexto(navegador, base, dados, 'adm', largura);
      const fig = await pagina(pedro, '/figurinha', (p) => p.locator('.fig-seletor-tile').first().waitFor({ timeout: 40000 }));
      await fig.locator('[data-grade="uniformes"]').scrollIntoViewIfNeeded();
      const tiles = fig.locator('.fig-seletor-tile[data-estado="geravel"]');
      const nGeraveis = await tiles.count();
      t(`${r} · a grade tem uniformes para gerar (${nGeraveis})`, nGeraveis >= 1, `${nGeraveis}`);
      const textoDaGrade = await fig.locator('[data-grade="uniformes"]').innerText();
      t(`${r} · a grade NÃO tem o selo: nenhum "pintar", "1 geração" nem "45 s" nos tiles`, !/pintar|1 geração|45 ?s/i.test(textoDaGrade) && (await fig.locator('[data-selo="pintar"]').count()) === 0, textoDaGrade.replace(/\s+/g, ' '));
      t(`${r} · cada tile para gerar leva só a estrelinha de IA (sem texto)`, (await fig.locator('.fig-seletor-tile[data-estado="geravel"] [data-ia-estrela]').count()) === nGeraveis && (await fig.locator('[data-ia-estrela]').first().innerText()).trim() === '');
      await foto(fig, `1-grade-sem-selo-${largura}`);

      // ── A confirmação ao tocar no uniforme ──
      await tiles.first().click();
      const titulo = fig.locator('[data-confirmar-geracao]');
      await titulo.waitFor({ timeout: 10000 });
      const dialogo = fig.locator('.modal-card[role="dialog"]');
      const textoDialogo = (await dialogo.innerText()).replace(/\s+/g, ' ');
      t(`${r} · a confirmação: título "Gerar figurinha com este uniforme?"`, (await titulo.innerText()).trim() === 'Gerar figurinha com este uniforme?', await titulo.innerText());
      t(`${r} · a confirmação: "Isso usa 1 geração. Você tem 3 gerações."`, textoDialogo.includes('Isso usa 1 geração. Você tem 3 gerações.'), textoDialogo);
      const botoes = (await dialogo.locator('button').allInnerTexts()).map((x) => x.trim());
      t(`${r} · a confirmação: os botões são "Gerar" e "Agora não" (e nada de "~45 s")`, JSON.stringify(botoes) === JSON.stringify(['Gerar', 'Agora não']) && !/45/.test(textoDialogo), JSON.stringify(botoes));
      const caixa = await dialogo.evaluate((e) => { const b = e.getBoundingClientRect(); return { esq: b.left, dir: b.right, topo: b.top, base: b.bottom, w: window.innerWidth, h: window.innerHeight }; });
      t(`${r} · a confirmação cabe na tela`, caixa.esq >= 0 && caixa.dir <= caixa.w && caixa.topo >= 0 && caixa.base <= caixa.h, JSON.stringify(caixa));
      await foto(fig, `2-confirmacao-${largura}`);
      await dialogo.getByRole('button', { name: 'Agora não' }).click();
      await fig.locator('[data-confirmar-geracao]').waitFor({ state: 'detached', timeout: 5000 });
      t(`${r} · "Agora não" fecha a confirmação e nada é gerado`, true);

      // ── "Comprar mais gerações": o caminho é o botão do cartão "Loja de figurinhas" logo abaixo (o link solto saiu, para não repetir o botão) ──
      const link = fig.locator('[data-comprar-mais]');
      t(`${r} · loja ligada (o Pedro é testador): NÃO há o link solto "Comprar mais gerações →"`, (await link.count()) === 0);
      const botaoMinha = fig.locator('[data-cartao-loja] [data-loja-comprar="minha"]');
      const ordem = await fig.evaluate(() => {
        const restam = [...document.querySelectorAll('span')].find((e) => /^Restam \d+ gerações/.test(e.textContent.trim()));
        const b = document.querySelector('[data-cartao-loja] [data-loja-comprar="minha"]');
        return restam && b ? { restamTopo: restam.getBoundingClientRect().top, botaoTopo: b.getBoundingClientRect().top, restam: restam.textContent.trim(), texto: b.textContent.trim(), href: null } : null;
      });
      t(`${r} · o botão de comprar do cartão fica embaixo de "Restam 3 gerações" e diz "Comprar · …"`, !!ordem && ordem.botaoTopo > ordem.restamTopo && ordem.restam.startsWith('Restam 3 gerações') && /^Comprar · /.test(ordem.texto), JSON.stringify(ordem));
      await botaoMinha.scrollIntoViewIfNeeded();
      await foto(fig, `3-cartao-com-loja-${largura}`);
      t(`${r} · a Figurinha não rola para o lado`, !(await fig.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)));

      // ── O Ranking do Pedro: confete na 1ª vez, não na 2ª ──
      const rank = await pagina(pedro, `/time/${slug}/ranking`, (p) => p.getByText('Pedro').first().waitFor({ timeout: 40000 }));
      await rank.waitForTimeout(1500); // o confete sai 400 ms depois da lista
      const primeira = await rank.evaluate(() => window.__confete || 0);
      const guardada = await rank.evaluate((s) => localStorage.getItem(`futty_podio_celebrado:${s}`), slug);
      t(`${r} · Ranking, 1ª entrada no pódio: o confete sai (${primeira} disparo(s)) e a posição fica guardada (${guardada})`, primeira >= 1 && /^[123]$/.test(guardada || ''), `${primeira} · ${guardada}`);
      await foto(rank, `4-ranking-1a-entrada-${largura}`);
      await rank.close();

      const rank2 = await pagina(pedro, `/time/${slug}/ranking`, (p) => p.getByText('Pedro').first().waitFor({ timeout: 40000 }));
      await rank2.waitForTimeout(1800);
      const segunda = await rank2.evaluate(() => window.__confete || 0);
      t(`${r} · Ranking, 2ª entrada na MESMA posição: nenhum confete`, segunda === 0, `${segunda} disparo(s)`);
      await foto(rank2, `5-ranking-2a-entrada-${largura}`);
      // A posição mudou (como se ele tivesse sido o outro do pódio da última vez): celebra de novo e guarda a nova.
      const outra = guardada === '3' ? '2' : '3';
      await rank2.close();
      // a posição guardada passa a ser OUTRA, posta antes de o app abrir (como se a última festa tivesse sido noutra posição)
      await pedro.ctx.addInitScript(([s, v]) => { try { localStorage.setItem(`futty_podio_celebrado:${s}`, v); } catch { /* sem armazenamento */ } }, [slug, outra]);
      const rank3 = await pagina(pedro, `/time/${slug}/ranking`, (p) => p.getByText('Pedro').first().waitFor({ timeout: 40000 }));
      await rank3.waitForTimeout(1800);
      const carregouConfete = await rank3.evaluate(() => performance.getEntriesByType('resource').some((e) => /canvas-confetti/.test(e.name)));
      const terceira = await rank3.evaluate(() => window.__confete || 0);
      const nova = await rank3.evaluate((s) => localStorage.getItem(`futty_podio_celebrado:${s}`), slug);
      t(`${r} · Ranking, posição diferente da última celebrada: o confete volta e a posição nova fica guardada`, terceira >= 1 && nova === guardada, `${terceira} · ${nova} (esperava ${guardada}) · módulo do confete pedido: ${carregouConfete}`);
      await rank3.close();
      t(`${r} · sem erro de página (Pedro)`, pedro.estado.erros.length === 0, pedro.estado.erros.join(' | '));
      await pedro.ctx.close();

      // ── A Figurinha do Zé: loja FECHADA para ele — nada muda, nada de link ──
      const ze = await abrirContexto(navegador, base, dados, 'ze', largura);
      const vistas = [];
      ze.ctx.on('response', async (resp) => { if (/\/api\/(inicio|brilhantes\/estado)/.test(resp.url())) { try { const j = await resp.json(); vistas.push(`${new URL(resp.url()).pathname}=${j.loja_pronta ?? j.brilhante?.loja_pronta}`); } catch { /* sem json */ } } });
      const figDele = await pagina(ze, '/figurinha', (p) => p.locator('.fig-seletor-tile').first().waitFor({ timeout: 40000 }));
      await figDele.locator('[data-grade="uniformes"]').scrollIntoViewIfNeeded();
      const restamDele = await figDele.evaluate(() => [...document.querySelectorAll('span')].some((e) => /^Restam 2 gerações/.test(e.textContent.trim())));
      t(`${r} · loja fechada (Zé): "Restam 2 gerações" aparece e NÃO há link de compra`, restamDele && (await figDele.locator('[data-comprar-mais]').count()) === 0, `restam=${restamDele} link=${await figDele.locator('[data-comprar-mais]').count()} respostas=${vistas.join(',')}`);
      t(`${r} · loja fechada: a grade também sem selo`, !/pintar|1 geração|45 ?s/i.test(await figDele.locator('[data-grade="uniformes"]').innerText()));
      await foto(figDele, `6-sem-loja-${largura}`);
      t(`${r} · sem erro de página (Zé)`, ze.estado.erros.length === 0, ze.estado.erros.join(' | '));
      await ze.ctx.close();
    }
  } finally {
    const rede = await encerrarMotor(filho);
    t('o motor falso não tentou sair da máquina (rede fechada)', Array.isArray(rede) && rede.length === 0, JSON.stringify(rede));
  }
}
