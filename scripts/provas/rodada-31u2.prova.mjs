// Prova no navegador da Rodada 31U-2 — no Android o convite viaja na instalação pela Play Store (referrer) e o app entra no time por ele:
//   · a página do convite, num Android sem o app, manda à Play Store com "convite=<código>" no referrer; no iPhone e no /download, o endereço de
//     sempre; no computador, nem botão de loja;
//   · o app Android com o referrer "convite=<código>" (injetado aqui, como a Play o entregaria) abre o cadastro nas boas-vindas DO TIME e termina
//     dentro dele; na segunda abertura não consulta a Play de novo;
//   · referrer vazio, de quem instalou pela busca ou estranho: nada acontece (cadastro comum);
//   · referrer E convite pela rede (31U) ao mesmo tempo: vale o referrer;
//   · conta que já existia: sem time, o Início entra sozinho no time do referrer; com time, vai à página do convite;
//   · app da loja antigo (sem o plugin): o caminho da rede da 31U segue valendo, sem erro; iPhone: o plugin nunca é chamado.
//
// Como: o motor de VERDADE num processo à parte sobre banco e Auth de mentira (scripts/provas/_motor-31u2.cjs → backend/tests/_appFalsa.js). O
// Supabase do navegador é respondido aqui com a sessão da conta da vez; o lado nativo é de mentira (a ponte de verdade do Capacitor por cima), com o
// plugin ConviteDaLoja respondendo o referrer da vez. Nada sai da máquina.
//
// Uso: npm run provar:navegador -- rodada-31u2      (~2 min)
//      R31U2_FOTOS=pasta  salva as fotos dos passos principais
import { spawn } from 'node:child_process';
import { readFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const nome = 'Rodada 31U-2 · convite pelo referrer da Play Store (página do convite, 1ª abertura do app, prioridade sobre a rede, uma vez só)';

const RAIZ = fileURLToPath(new URL('../../', import.meta.url));
const MOTOR = path.join(RAIZ, 'scripts', 'provas', '_motor-31u2.cjs');
const BACKEND_AO_LADO = path.resolve(RAIZ, '..', 'backend', 'tests', '_appFalsa.js');
const SUPABASE = new URL((readFileSync(new URL('../../.env', import.meta.url), 'utf8').match(/^VITE_SUPABASE_URL=(.+)$/m)?.[1] || 'https://prova.supabase.co').trim());
const PONTE_DO_CAPACITOR = readFileSync(path.join(RAIZ, 'node_modules', '@capacitor', 'ios', 'Capacitor', 'Capacitor', 'assets', 'native-bridge.js'), 'utf8');
const FOTOS = process.env.R31U2_FOTOS || '';
const SENHA = 'segredo123';
const PLAY = 'https://play.google.com/store/apps/details?id=com.futty.app';
const APP_STORE = 'https://apps.apple.com/app/id6811681849';

const UA_IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.7 Mobile/15E148 Safari/604.1';
const UA_ANDROID = 'Mozilla/5.0 (Linux; Android 14; SM-A146B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36';
const APARELHOS = {
  iphone: { userAgent: UA_IPHONE, viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  android: { userAgent: UA_ANDROID, viewport: { width: 360, height: 780 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  computador: { viewport: { width: 1280, height: 860 } },
};

// ─── O motor num processo à parte ───────────────────────────────────────────────────────────────────────────────────────────────
function subirMotor() {
  return new Promise((resolve, reject) => {
    const filho = spawn(process.execPath, [MOTOR], { stdio: ['pipe', 'pipe', 'pipe'], cwd: RAIZ });
    let saida = '';
    let erro = '';
    const prazo = setTimeout(() => { filho.kill(); reject(new Error(`o motor falso não ficou pronto em 120 s\n${erro.slice(-700)}`)); }, 120000);
    filho.stderr.on('data', (d) => { erro += d; });
    const aoDado = (d) => {
      saida += d;
      const linha = saida.split('\n').find((l) => l.startsWith('{"pronto"'));
      if (linha) { clearTimeout(prazo); filho.stdout.off('data', aoDado); resolve({ filho, dados: JSON.parse(linha) }); }
    };
    filho.stdout.on('data', aoDado);
    filho.once('exit', (codigo) => { clearTimeout(prazo); reject(new Error(`o motor falso saiu com ${codigo}\n${erro.slice(-900)}`)); });
  });
}
function perguntar(filho, comando, chave) {
  return new Promise((resolve) => {
    let saida = '';
    const prazo = setTimeout(() => { filho.stdout.off('data', aoDado); resolve(null); }, 8000);
    function aoDado(d) {
      saida += d;
      const linha = saida.split('\n').find((l) => l.startsWith(`{"${chave}"`));
      if (linha) { clearTimeout(prazo); filho.stdout.off('data', aoDado); resolve(JSON.parse(linha)[chave]); }
    }
    filho.stdout.on('data', aoDado);
    try { filho.stdin.write(`${comando}\n`); } catch { clearTimeout(prazo); resolve(null); }
  });
}
async function encerrarMotor(filho) {
  const rede = await perguntar(filho, 'fim', 'rede');
  try { filho.kill(); } catch { /* já saiu */ }
  return rede;
}

// ─── O lado nativo: a ponte de mentira, com o plugin ConviteDaLoja devolvendo o referrer da vez (a mesma base da prova 31U) ──────────
function ladoNativo({ plataforma, referrer, comPlugin }) {
  const ouvintes = {};
  window.__chamadasNativas = [];
  const RESPOSTAS = {
    'SignInWithApple.authorize': { response: { identityToken: 'token-da-apple', givenName: null, familyName: null, email: null } },
    'ConviteDaLoja.lerReferrer': { referrer, suportado: true },
  };
  const responder = (m, extra) => window.Capacitor.fromNative({ callbackId: m.callbackId, pluginId: m.pluginId, methodName: m.methodName, success: true, ...extra });
  const ponte = { postMessage(msg) {
    const m = typeof msg === 'string' ? JSON.parse(msg) : msg;
    const nome = `${m.pluginId}.${m.methodName}`;
    window.__chamadasNativas.push(nome);
    if (m.pluginId === 'ConviteDaLoja') window.__nativo?.(nome); // contado fora da página: atravessa a recarga (a "segunda abertura")
    if (m.methodName === 'addListener') { (ouvintes[m.options?.eventName] ||= []).push(m); return; }
    if (m.callbackId && m.callbackId !== '-1') setTimeout(() => { try { responder(m, { save: false, data: RESPOSTAS[nome] || {} }); } catch { /* sem ponte */ } }, 0);
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
    PluginHeaders: [
      { name: 'App', methods: [metodo('addListener', 'callback'), metodo('removeListener'), metodo('removeAllListeners'), metodo('getLaunchUrl'), metodo('getState'), metodo('getInfo'), metodo('exitApp'), metodo('minimizeApp')] },
      { name: 'Browser', methods: [metodo('open'), metodo('close'), metodo('addListener', 'callback'), metodo('removeAllListeners')] },
      { name: 'SignInWithApple', methods: [metodo('authorize')] },
      ...(comPlugin ? [{ name: 'ConviteDaLoja', methods: [metodo('lerReferrer')] }] : []),
    ],
  };
}

const usuarioDoAuth = (pessoa, provedor) => ({
  id: pessoa.id, aud: 'authenticated', role: 'authenticated', email: pessoa.email, app_metadata: { provider: provedor, providers: [provedor] },
  user_metadata: {}, identities: [{ id: pessoa.id, user_id: pessoa.id, provider: provedor }], created_at: '2026-10-16T12:00:00Z', confirmation_sent_at: '2026-10-16T12:00:00Z',
});

export async function rodar({ navegador, base, t }) {
  try { readFileSync(BACKEND_AO_LADO); } catch { t('o backend não está ao lado (FUTTY-V2/backend): a prova foi pulada', true); return; }
  const { filho, dados } = await subirMotor();
  const { slug } = dados.time;
  const slug2 = dados.time2.slug;
  const codigo = dados.convite.codigo;
  const codigo2 = dados.convite2.codigo;
  if (FOTOS) mkdirSync(FOTOS, { recursive: true });
  const foto = async (page, rotulo) => { if (FOTOS) { await page.waitForTimeout(500); await page.screenshot({ path: path.join(FOTOS, `${rotulo}.png`) }); } };
  const hostDoVite = new URL(base).host;
  const externos = [];

  /** Um "aparelho": o navegador do celular (nativo = null), o app da loja (nativo = 'ios' | 'android') ou o computador, com armazenamento próprio. */
  async function abrir({ aparelho, nativo = null, conta = null, provedor = 'google', referrer = '', comPlugin = true }) {
    const ctx = await navegador.newContext({ ...APARELHOS[aparelho], locale: 'pt-BR', timezoneId: 'America/Sao_Paulo', serviceWorkers: 'block', reducedMotion: 'reduce' });
    const estado = { conta, provedor, lojas: [], erros: [], leiturasDaLoja: 0 };
    await ctx.exposeBinding('__nativo', () => { estado.leiturasDaLoja += 1; });
    if (nativo) {
      await ctx.addInitScript(ladoNativo, { plataforma: nativo, referrer, comPlugin });
      await ctx.addInitScript({ content: PONTE_DO_CAPACITOR });
    }
    await ctx.addInitScript(() => { try { localStorage.setItem('futty_cookies', 'aceite'); } catch { /* sem armazenamento */ } });
    await ctx.route('**/*', async (route) => {
      const req = route.request();
      const url = new URL(req.url());
      try {
        if (url.pathname.startsWith('/api/')) return await aoMotor(route, dados.base);
        if (url.host === hostDoVite) return await route.continue();
        if (url.host === SUPABASE.host && url.pathname.startsWith('/auth/v1/')) {
          const pessoa = dados.pessoas[estado.conta];
          if (!pessoa) return await route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ error: 'sem conta da vez' }) });
          const user = usuarioDoAuth(pessoa, estado.provedor);
          if (url.pathname === '/auth/v1/token') {
            const sessao = { access_token: dados.tokens[estado.conta], token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, refresh_token: `r-${estado.conta}`, user };
            return await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(sessao) });
          }
          if (url.pathname === '/auth/v1/user') return await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(user) });
          return await route.fulfill({ status: 204, body: '' });
        }
        if (url.hostname === 'apps.apple.com' || url.hostname === 'play.google.com') {
          estado.lojas.push(url.href);
          return await route.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><meta charset="utf-8"><title>loja</title><p>loja</p>' });
        }
        externos.push(`${req.method()} ${url.host}${url.pathname}`.slice(0, 120));
        return await route.fulfill({ status: 200, contentType: url.pathname.endsWith('.js') ? 'text/javascript' : 'application/json', body: url.pathname.endsWith('.js') ? '' : '{}' });
      } catch { return route.abort().catch(() => {}); }
    });
    await ctx.routeWebSocket((url) => url.host !== hostDoVite, (ws) => ws.close());
    const page = await ctx.newPage();
    page.on('pageerror', (e) => { if (!/not implemented|plugin/i.test(e.message)) estado.erros.push(e.message); });
    return { ctx, page, estado };
  }

  const doMotor = async (rota, quem) => {
    const r = await fetch(`${dados.base}${rota}`, { headers: { authorization: `Bearer ${dados.tokens[quem]}` } });
    return r.json().catch(() => null);
  };
  const noTime = async (conta, s = slug) => ((await doMotor(`/api/teams/${s}`, s === slug ? 'adm' : 'm2'))?.members || []).map((m) => m.user_id || m.users?.id || m.id).includes(dados.pessoas[conta].id);
  const marcaLida = (page) => page.evaluate(() => localStorage.getItem('futty_referrer_lido')).catch(() => null);

  /** O app abre (1ª abertura) e a pessoa entra pelo Google (Android) ou pela Apple (iPhone). */
  async function abrirEEntrar(app, forma) {
    await app.page.goto(`${base}/`, { waitUntil: 'domcontentloaded' });
    await app.page.waitForFunction(() => window.__ouvintesNativos?.('appUrlOpen') > 0, null, { timeout: 30000 });
    if (forma === 'google') {
      await app.page.getByRole('button', { name: /com Google/ }).first().click();
      await app.page.waitForFunction(() => window.__chamadasNativas?.includes('Browser.open'), null, { timeout: 15000 });
      await app.page.evaluate(() => window.__eventoNativo('appUrlOpen', { url: 'com.futty.app://auth/callback?code=codigo-do-google' }));
    } else {
      await app.page.getByRole('button', { name: /com a Apple/ }).first().click();
    }
  }
  async function entrarPeloLogin(page, estado) {
    await page.goto(`${base}/login`, { waitUntil: 'domcontentloaded' });
    await page.locator('input[placeholder="seu@email.com"]').waitFor({ timeout: 30000 });
    await page.locator('input[placeholder="seu@email.com"]').fill(dados.pessoas[estado.conta].email);
    await page.locator('input[placeholder="••••••••"]').fill(SENHA);
    await page.locator('button[type="submit"]').click();
  }
  /** Até a 1ª tela do cadastro: 'time' (boas-vindas do time), 'comecar' ou 'escolha'; e o texto da tela. */
  async function primeiraTelaDoCadastro(page) {
    await page.waitForURL(/\/onboarding/, { timeout: 30000 });
    const vamos = page.getByRole('button', { name: 'Vamos lá' });
    const comecar = page.getByRole('button', { name: 'Começar' });
    const escolha = page.locator('[data-escolha-do-convite]');
    await vamos.or(comecar).or(escolha).first().waitFor({ timeout: 25000 });
    const texto = await page.evaluate(() => document.body.innerText.replace(/\s+/g, ' '));
    if (await escolha.isVisible().catch(() => false)) return { tela: 'escolha', texto };
    return { tela: (await vamos.isVisible().catch(() => false)) ? 'time' : 'comecar', texto };
  }
  async function terminarCadastro(page, tela, apelido) {
    await page.getByRole('button', { name: tela === 'time' ? 'Vamos lá' : 'Começar' }).click();
    const depois = page.getByRole('button', { name: 'deixar para depois' });
    await depois.waitFor({ timeout: 20000 });
    await page.waitForTimeout(2300); // o "deixar para depois" só aceita toque depois de ~2 s
    await depois.click();
    await page.locator('input[placeholder="Ex.: Bruninho"]').fill(apelido);
    await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  }
  const caminho = (page) => new URL(page.url()).pathname;

  try {
    // ════ 1 · Referrer vazio, de quem instalou pela busca, estranho: nada acontece (ainda não há convite pela rede neste mundo) ═════════
    for (const [conta, referrer, rotulo] of [
      ['vazio', '', 'vazio'],
      ['organico', 'utm_source=google-play&utm_medium=organic', 'de quem instalou pela busca'],
      ['estranho', 'convite=../../api/super&x=<script>', 'estranho'],
    ]) {
      const app = await abrir({ aparelho: 'android', nativo: 'android', conta, referrer });
      await abrirEEntrar(app, 'google');
      const { tela } = await primeiraTelaDoCadastro(app.page);
      t(`referrer ${rotulo} · o cadastro é o comum ("Começar"), sem time e sem erro`, tela === 'comecar' && app.estado.erros.length === 0, JSON.stringify({ tela, erros: app.estado.erros.slice(0, 2) }));
      t(`referrer ${rotulo} · a Play foi consultada uma vez e o app marcou que já leu`, app.estado.leiturasDaLoja === 1 && (await marcaLida(app.page)) === '1', String(app.estado.leiturasDaLoja));
      await app.ctx.close();
    }

    // ════ 2 · Referrer "convite=<código>": boas-vindas do time → termina dentro dele; segunda abertura não repete ═══════════════════
    {
      const app = await abrir({ aparelho: 'android', nativo: 'android', conta: 'valido', referrer: `convite=${codigo}` });
      await abrirEEntrar(app, 'google');
      const { tela, texto } = await primeiraTelaDoCadastro(app.page);
      t('referrer válido · o cadastro abre nas boas-vindas da Missa de Quinta (sem rede, sem colar nada)', tela === 'time' && texto.includes('Missa de Quinta'), `${tela} · ${texto.slice(0, 160)}`);
      await foto(app.page, '2-boas-vindas-pelo-referrer');
      await terminarCadastro(app.page, tela, 'Miguel');
      await app.page.waitForURL(new RegExp(`/time/${slug}$`), { timeout: 30000 }).catch(() => {});
      t('referrer válido · terminou o cadastro já dentro do time', caminho(app.page) === `/time/${slug}`, app.page.url());
      t('referrer válido · está nos membros da Missa (team_members, pelo motor)', await noTime('valido'));
      await foto(app.page, '3-dentro-do-time');
      t('referrer válido · a Play foi consultada uma vez só', app.estado.leiturasDaLoja === 1, String(app.estado.leiturasDaLoja));
      // Segunda abertura: o app recomeça (mesmo aparelho, mesmo armazenamento); a Play devolveria o mesmo referrer, mas ninguém pergunta.
      await app.page.goto(`${base}/home`, { waitUntil: 'domcontentloaded' });
      await app.page.locator('.app-shell').first().waitFor({ timeout: 30000 }).catch(() => {});
      await app.page.waitForTimeout(3000);
      t('segunda abertura · a Play não é consultada de novo e nada leva a pessoa a convite nenhum',
        app.estado.leiturasDaLoja === 1 && !/\/(convite|c)\//.test(caminho(app.page)), JSON.stringify({ leituras: app.estado.leiturasDaLoja, url: app.page.url() }));
      t('referrer válido · sem erro de página', app.estado.erros.length === 0, app.estado.erros.slice(0, 3).join(' | '));
      await app.ctx.close();
    }

    // ════ 3 · Página do convite num Android sem o app: o botão da loja leva o referrer; e referrer + convite pela rede: vale o referrer ═══
    {
      const nav = await abrir({ aparelho: 'android' });
      await nav.page.goto(`${base}/c/${slug2}-${codigo2}`, { waitUntil: 'domcontentloaded' });
      const baixar = nav.page.getByRole('link', { name: 'Baixar o Futty' });
      await baixar.waitFor({ timeout: 40000 });
      const href = await baixar.getAttribute('href');
      t('site · Android · "Baixar o Futty" leva o código do convite no referrer da Play Store',
        href === `${PLAY}&referrer=convite%3D${codigo2}`, String(href));
      await foto(nav.page, '1-convite-no-android');
      await nav.page.waitForTimeout(600);
      await baixar.click();
      await nav.page.waitForURL(/play\.google\.com/, { timeout: 15000 }).catch(() => {});
      const naPlay = nav.estado.lojas.at(-1) ? new URL(nav.estado.lojas.at(-1)) : null;
      t('site · Android · o toque chega à Play com id=com.futty.app e referrer "convite=<código>"',
        naPlay?.searchParams.get('id') === 'com.futty.app' && naPlay?.searchParams.get('referrer') === `convite=${codigo2}`, String(naPlay));
      await nav.ctx.close();
      const pendentes = (await perguntar(filho, 'pendentes', 'pendentes')) || [];
      t('site · Android · e o convite da Pelada do Zé ficou também pela rede (31U)', pendentes.some((l) => l.plataforma === 'android'), JSON.stringify(pendentes).slice(0, 200));

      // Este Android tem agora, pela rede, o convite da Pelada do Zé; a Play entrega o da Missa. Vale o da Play.
      const app = await abrir({ aparelho: 'android', nativo: 'android', conta: 'ambos', referrer: `convite=${codigo}` });
      await abrirEEntrar(app, 'google');
      const { tela, texto } = await primeiraTelaDoCadastro(app.page);
      t('referrer + rede · o cadastro abre nas boas-vindas da Missa (o referrer), não na escolha nem na Pelada do Zé',
        tela === 'time' && texto.includes('Missa de Quinta') && !texto.includes('Pelada do Zé'), `${tela} · ${texto.slice(0, 160)}`);
      await terminarCadastro(app.page, tela, 'Bruno');
      await app.page.waitForURL(new RegExp(`/time/${slug}$`), { timeout: 30000 }).catch(() => {});
      t('referrer + rede · está na Missa e NÃO na Pelada do Zé (motor)', (await noTime('ambos')) && !(await noTime('ambos', slug2)), app.page.url());
      await app.ctx.close();
    }

    // ════ 4 · Conta que já existia, no app recém-instalado ═════════════════════════════════════════════════════════════════════════
    {
      // Sem time: o Início entra sozinho no time do referrer (e não no convite da rede, que também está lá).
      const app = await abrir({ aparelho: 'android', nativo: 'android', conta: 'perdido', provedor: 'email', referrer: `convite=${codigo}` });
      await entrarPeloLogin(app.page, app.estado);
      await app.page.waitForURL(new RegExp(`/time/${slug}`), { timeout: 30000 }).catch(() => {});
      t('conta sem time · o Início entra sozinho na Missa pelo referrer e abre o time', new RegExp(`^/time/${slug}`).test(caminho(app.page)) && (await noTime('perdido')) && !(await noTime('perdido', slug2)),
        app.page.url());
      await foto(app.page, '4-conta-sem-time-entrou');
      t('conta sem time · sem erro de página', app.estado.erros.length === 0, app.estado.erros.slice(0, 3).join(' | '));
      await app.ctx.close();

      // Com time (o Magrão, da Missa), instalou pelo convite da Pelada do Zé: vai à página desse convite, e "Entrar no time" funciona.
      const app2 = await abrir({ aparelho: 'android', nativo: 'android', conta: 'm1', provedor: 'email', referrer: `convite=${codigo2}` });
      await entrarPeloLogin(app2.page, app2.estado);
      const entrarNoTime = app2.page.getByRole('button', { name: 'Entrar no time' });
      const abriu = await entrarNoTime.waitFor({ timeout: 30000 }).then(() => true, () => false);
      t('conta com time · o Início leva à página do convite da Pelada do Zé', abriu && /\/convite\//.test(caminho(app2.page)) && (await app2.page.locator('body').innerText()).includes('Pelada do Zé'), app2.page.url());
      await foto(app2.page, '5-conta-com-time-no-convite');
      if (abriu) {
        await entrarNoTime.click();
        await app2.page.waitForURL(new RegExp(`/time/${slug2}`), { timeout: 20000 }).catch(() => {});
        t('conta com time · "Entrar no time" põe o Magrão na Pelada do Zé (motor)', await noTime('m1', slug2), app2.page.url());
      }
      await app2.ctx.close();
    }

    // ════ 5 · App da loja antigo (sem o plugin) e iPhone ═════════════════════════════════════════════════════════════════════════════
    {
      const app = await abrir({ aparelho: 'android', nativo: 'android', conta: 'antigo', referrer: `convite=${codigo}`, comPlugin: false });
      await abrirEEntrar(app, 'google');
      const { tela, texto } = await primeiraTelaDoCadastro(app.page);
      t('app antigo (sem o plugin) · o caminho da rede da 31U segue valendo: boas-vindas da Pelada do Zé, sem erro de página',
        tela === 'time' && texto.includes('Pelada do Zé') && app.estado.erros.length === 0, `${tela} · ${texto.slice(0, 120)} · ${app.estado.erros.slice(0, 2).join(' | ')}`);
      t('app antigo · marcou que já leu (o plugin nunca vai existir neste app)', (await marcaLida(app.page)) === '1');
      await app.ctx.close();

      const ios = await abrir({ aparelho: 'iphone', nativo: 'ios', conta: 'iphone', provedor: 'apple', referrer: `convite=${codigo}` });
      await abrirEEntrar(ios, 'apple');
      const primeira = await primeiraTelaDoCadastro(ios.page);
      t('iPhone · o plugin da Play nunca é chamado (nem existindo) e o cadastro é o comum', ios.estado.leiturasDaLoja === 0 && primeira.tela === 'comecar' && (await marcaLida(ios.page)) === null,
        JSON.stringify({ leituras: ios.estado.leiturasDaLoja, tela: primeira.tela }));
      await ios.ctx.close();
    }

    // ════ 6 · Site: iPhone, computador e /download sem referrer ══════════════════════════════════════════════════════════════════════
    {
      const ip = await abrir({ aparelho: 'iphone' });
      await ip.page.goto(`${base}/c/${slug}-${codigo}`, { waitUntil: 'domcontentloaded' });
      const baixar = ip.page.getByRole('link', { name: 'Baixar o Futty' });
      await baixar.waitFor({ timeout: 40000 });
      const href = await baixar.getAttribute('href');
      t('site · iPhone · "Baixar o Futty" é a App Store de sempre, sem referrer', href === APP_STORE, String(href));
      await ip.ctx.close();

      const pc = await abrir({ aparelho: 'computador' });
      await pc.page.goto(`${base}/c/${slug}-${codigo}`, { waitUntil: 'domcontentloaded' });
      await pc.page.getByRole('button', { name: 'Criar conta e entrar' }).waitFor({ timeout: 40000 });
      const lojasNaTela = await pc.page.locator('a[href*="play.google.com"], a[href*="apps.apple.com"]').count();
      t('site · computador · sem botão de loja (a tela de sempre)', lojasNaTela === 0, String(lojasNaTela));
      await pc.ctx.close();

      const dl = await abrir({ aparelho: 'android' });
      await dl.page.goto(`${base}/download`, { waitUntil: 'domcontentloaded' });
      await dl.page.waitForURL(/play\.google\.com/, { timeout: 30000 }).catch(() => {});
      const destino = dl.estado.lojas.at(-1) || '';
      t('site · /download no Android · vai à Play Store sem referrer (como estava)', destino === PLAY, destino);
      await dl.ctx.close();
    }

    t(`o resto (Supabase do navegador, lojas) foi respondido aqui, sem sair da máquina (${externos.length ? [...new Set(externos.map((x) => x.split(' ')[1].split('/')[0]))].join(', ') : 'nada'})`, true);
  } finally {
    const rede = await encerrarMotor(filho);
    t('o motor falso não tentou sair da máquina (rede fechada)', Array.isArray(rede) && rede.length === 0, `tentativas: ${JSON.stringify(rede)}`);
  }
}

const CABECALHOS_QUE_NAO_VOLTAM = new Set(['content-encoding', 'content-length', 'transfer-encoding', 'connection', 'keep-alive']);
const CABECALHOS_QUE_NAO_VAO = ['host', 'origin', 'referer', 'if-none-match', 'if-modified-since', 'content-length', 'accept-encoding', 'connection'];
async function aoMotor(route, baseDoMotor) {
  const req = route.request();
  const url = new URL(req.url());
  const origem = req.headers().origin || '*';
  const cors = { 'access-control-allow-origin': origem, 'access-control-allow-credentials': 'true', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' };
  if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
  const cabecalhos = { ...req.headers() };
  for (const h of CABECALHOS_QUE_NAO_VAO) delete cabecalhos[h];
  const corpo = req.postDataBuffer();
  const r = await fetch(`${baseDoMotor}${url.pathname}${url.search}`, { method: req.method(), headers: cabecalhos, body: corpo && !['GET', 'HEAD'].includes(req.method()) ? corpo : undefined, redirect: 'manual' });
  const cabecalhosDaResposta = { ...cors };
  r.headers.forEach((v, k) => { if (!CABECALHOS_QUE_NAO_VOLTAM.has(k) && !k.startsWith('access-control-')) cabecalhosDaResposta[k] = v; });
  return route.fulfill({ status: r.status, headers: cabecalhosDaResposta, body: Buffer.from(await r.arrayBuffer()) });
}
