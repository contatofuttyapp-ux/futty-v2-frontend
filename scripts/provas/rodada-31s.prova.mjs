// Prova no navegador da Rodada 31S — a confirmação do cadastro por e-mail pelo BOTÃO do e-mail: tocar em "Confirmar e entrar" abre o app (ou o
// site) em futtyapp.com.br/c/confirmar?token_hash=…&type=signup, e a sessão abre ali mesmo, sem pedir a senha de novo. O caminho inteiro, com o app
// de verdade num Chromium que se declara iPhone ou Android (o app da loja: a ponte de verdade do Capacitor por cima de um lado nativo de mentira,
// que entrega o link pelo appUrlOpen como o sistema entrega) ou navegador (celular e computador):
//   · app (iPhone e Android), com e sem convite: cadastro → "Confirme seu e-mail · Mandamos um link…" → o link chega ao app (aberto ou fechado no
//     meio) → onboarding → Início, ou o time com a pessoa na tabela team_members; pelo /c/confirmar e pelo /auth/confirmar;
//   · navegador, com e sem convite: o link no mesmo navegador do cadastro segue direto; em OUTRO navegador (o e-mail lido no computador) a conta
//     entra lá e a tela diz "E-mail confirmado. Volte ao app e toque em Entrar"; o app aberto percebe sozinho ao voltar; o app fechado abre o
//     Entrar com o e-mail preenchido;
//   · link vencido (com "Mandar outro e-mail"), link trocado por um mais novo, link já usado (com a conta aberta e num navegador sem pista),
//     link incompleto: cada um com a sua frase;
//   · Entrar com senha numa conta sem confirmar → e-mail novo e a tela de espera; "Já confirmei" antes e depois de confirmar;
//   · cadastro com e-mail que já tem conta; o link dos e-mails mandados antes (PKCE) continua.
//
// Como: o motor de VERDADE sobe num processo à parte sobre banco e Auth de mentira (scripts/provas/_motor-31s.cjs → backend/tests/_appFalsa.js). O
// Supabase do navegador é respondido aqui, imitando o de verdade: o cadastro "manda o e-mail" (o token_hash fica guardado aqui, como numa caixa de
// entrada), o /verify confere o token_hash, a validade (1 h) e se já foi usado, o reenvio troca o link e respeita os 60 s entre e-mails, o Entrar
// com senha recusa conta sem confirmar. Nada sai da máquina.
//
// Uso: npm run provar:navegador -- rodada-31s      (~4 min)
//      R31S_FOTOS=pasta  salva as fotos dos passos principais
import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { readFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const nome = 'Rodada 31S · cadastro por e-mail confirmado pelo botão do e-mail, que abre o app (iPhone, Android e site, com e sem convite; motor de verdade, banco falso)';

const RAIZ = fileURLToPath(new URL('../../', import.meta.url));
const MOTOR = path.join(RAIZ, 'scripts', 'provas', '_motor-31s.cjs');
const BACKEND_AO_LADO = path.resolve(RAIZ, '..', 'backend', 'tests', '_appFalsa.js');
const SUPABASE = new URL((readFileSync(new URL('../../.env', import.meta.url), 'utf8').match(/^VITE_SUPABASE_URL=(.+)$/m)?.[1] || 'https://prova.supabase.co').trim());
const PONTE_DO_CAPACITOR = readFileSync(path.join(RAIZ, 'node_modules', '@capacitor', 'ios', 'Capacitor', 'Capacitor', 'assets', 'native-bridge.js'), 'utf8');
const FOTOS = process.env.R31S_FOTOS || '';
const SENHA = 'segredo123';
const VALIDADE_MS = 3600000; // "Email OTP Expiration" do Supabase de mentira (o mesmo número que o app usa para a frase)
const ESPERA_MS = 60000; // 60 s entre e-mails para o mesmo endereço
const JA_TEM_CONTA = 'jogador.antigo@futtymock.com';
const SITE = 'https://futtyapp.com.br';

const UA_IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.7 Mobile/15E148 Safari/604.1';
const UA_ANDROID = 'Mozilla/5.0 (Linux; Android 14; SM-A146B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36';
const UA_PC = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';
const APARELHOS = {
  iphone: { userAgent: UA_IPHONE, viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  android: { userAgent: UA_ANDROID, viewport: { width: 360, height: 780 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  pc: { userAgent: UA_PC, viewport: { width: 1280, height: 800 } },
};

function subirMotor() {
  return new Promise((resolve, reject) => {
    const filho = spawn(process.execPath, [MOTOR], { stdio: ['pipe', 'pipe', 'pipe'], cwd: RAIZ });
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
/** Pergunta ao motor e espera a linha de resposta que começa com `{"<chave>"`. */
function perguntarAoMotor(filho, comando, chave, prazoMs = 8000) {
  return new Promise((resolve) => {
    let saida = '';
    const ouvir = (d) => {
      saida += d;
      const linha = saida.split('\n').find((l) => l.startsWith(`{"${chave}"`));
      if (linha) { clearTimeout(prazo); filho.stdout.off('data', ouvir); resolve(JSON.parse(linha)[chave]); }
    };
    const prazo = setTimeout(() => { filho.stdout.off('data', ouvir); resolve(null); }, prazoMs);
    filho.stdout.on('data', ouvir);
    try { filho.stdin.write(`${comando}\n`); } catch { clearTimeout(prazo); resolve(null); }
  });
}
async function encerrarMotor(filho) {
  const rede = await perguntarAoMotor(filho, 'fim', 'rede');
  try { filho.kill(); } catch { /* já saiu */ }
  return rede;
}

/** O lado nativo do app da loja (como na prova 31R): App (os links que o sistema entrega, o voltar ao primeiro plano) e Browser. */
function ladoNativo(plataforma) {
  const ouvintes = {};
  window.__chamadasNativas = [];
  const responder = (m, extra) => window.Capacitor.fromNative({ callbackId: m.callbackId, pluginId: m.pluginId, methodName: m.methodName, success: true, ...extra });
  const ponte = { postMessage(msg) {
    const m = typeof msg === 'string' ? JSON.parse(msg) : msg;
    window.__chamadasNativas.push(`${m.pluginId}.${m.methodName}`);
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
    PluginHeaders: [
      { name: 'App', methods: [metodo('addListener', 'callback'), metodo('removeListener'), metodo('removeAllListeners'), metodo('getLaunchUrl'), metodo('getState'), metodo('getInfo'), metodo('exitApp'), metodo('minimizeApp')] },
      { name: 'Browser', methods: [metodo('open'), metodo('close'), metodo('addListener', 'callback'), metodo('removeAllListeners')] },
    ],
  };
}

export async function rodar({ navegador, base, t }) {
  try { readFileSync(BACKEND_AO_LADO); } catch { t('o backend não está ao lado (FUTTY-V2/backend): a prova foi pulada', true); return; }
  const { filho, dados } = await subirMotor();
  const { slug } = dados.time;
  const linkDoConvite = `${SITE}/c/${slug}-${dados.convite.codigo}`;
  if (FOTOS) mkdirSync(FOTOS, { recursive: true });
  const foto = async (page, rotulo) => { if (FOTOS) { await page.waitForTimeout(400); await page.screenshot({ path: path.join(FOTOS, `${rotulo}.png`) }); } };
  const hostDoVite = new URL(base).host;
  const externos = [];

  // ── O Supabase de mentira (um só, como o de verdade): a "caixa de entrada" com o link de cada e-mail ─────────────────────────────────────────
  const caixa = {}; // email → { hash, enviadoEm, ultimoPedido, confirmado, envios }
  const pedidos = []; // { tipo, email, ... } — o que o app pediu ao Supabase
  const contaDoEmail = (email) => Object.keys(dados.pessoas).find((k) => dados.pessoas[k].email === email);
  const contaDoToken = (token) => Object.keys(dados.tokens).find((k) => dados.tokens[k] === token);
  // O cadastro do app é PKCE: o TokenHash do e-mail de verdade vem com o prefixo "pkce_" (o /verify com token_hash aceita igual).
  const mandarEmail = (email, agora = Date.now()) => {
    const a = caixa[email] || (caixa[email] = { confirmado: false, envios: 0 });
    Object.assign(a, { hash: `pkce_${randomBytes(28).toString('hex')}`, enviadoEm: agora, ultimoPedido: agora, envios: a.envios + 1 });
    return a;
  };
  /** O botão do e-mail mais recente desta pessoa (o href do "Confirmar e entrar"). */
  const linkDoEmail = (email, caminho = '/c/confirmar', hash = caixa[email].hash) => `${SITE}${caminho}?token_hash=${hash}&type=signup`;
  const usuarioDoAuth = (conta, identidades = true) => {
    const p = dados.pessoas[conta] || { id: '00000000-0000-4000-8000-0000000000ff', email: JA_TEM_CONTA };
    return {
      id: p.id, aud: 'authenticated', role: 'authenticated', email: p.email, app_metadata: { provider: 'email', providers: ['email'] }, user_metadata: {},
      identities: identidades ? [{ id: p.id, user_id: p.id, provider: 'email', identity_id: p.id }] : [],
      created_at: '2026-10-16T12:00:00Z', confirmation_sent_at: '2026-10-16T12:00:00Z', email_confirmed_at: caixa[p.email]?.confirmado ? '2026-10-16T12:05:00Z' : null,
    };
  };
  const sessaoDe = (conta) => ({ access_token: dados.tokens[conta], token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, refresh_token: `r-${conta}`, user: usuarioDoAuth(conta) });

  async function supabaseFalso(route, estado) {
    const req = route.request();
    const url = new URL(req.url());
    const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*', 'access-control-expose-headers': 'x-supabase-api-version', 'x-supabase-api-version': '2024-01-01' };
    const responder = (status, corpo) => route.fulfill({ status, headers: { ...cors, 'content-type': 'application/json' }, body: JSON.stringify(corpo) });
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
    let corpo = {};
    try { corpo = JSON.parse(req.postData() || '{}'); } catch { /* sem corpo */ }
    const agora = Date.now();
    const caminho = url.pathname.replace('/auth/v1', '');
    if (caminho === '/signup') {
      pedidos.push({ tipo: 'signup', email: corpo.email, redirect: url.searchParams.get('redirect_to'), pkce: !!corpo.code_challenge, nascimento: corpo.data?.birthdate || null });
      // E-mail que já tem conta confirmada: o Supabase não conta (devolve um usuário sem identidades) e não manda e-mail.
      if (corpo.email === JA_TEM_CONTA) return responder(200, usuarioDoAuth('ninguem', false));
      mandarEmail(corpo.email, agora);
      return responder(200, usuarioDoAuth(contaDoEmail(corpo.email)));
    }
    if (caminho === '/resend') {
      const a = caixa[corpo.email];
      pedidos.push({ tipo: 'resend', email: corpo.email, redirect: url.searchParams.get('redirect_to') });
      if (a && agora - a.ultimoPedido < ESPERA_MS) {
        const faltam = Math.ceil((ESPERA_MS - (agora - a.ultimoPedido)) / 1000);
        return responder(429, { code: 'over_email_send_rate_limit', message: `For security purposes, you can only request this after ${faltam} seconds.` });
      }
      mandarEmail(corpo.email, agora); // o link novo troca o antigo: o antigo deixa de valer
      return responder(200, {});
    }
    if (caminho === '/verify') {
      // O botão do e-mail: só o token_hash (o Supabase acha a conta por ele). Já usado, vencido ou trocado por um mais novo = a mesma recusa.
      const email = Object.keys(caixa).find((e) => caixa[e].hash && caixa[e].hash === corpo.token_hash);
      const a = email && caixa[email];
      pedidos.push({ tipo: 'verify', email: email || null, tokenHash: corpo.token_hash || null, token: corpo.token || null, type: corpo.type, ok: false });
      const vale = a && !a.confirmado && corpo.type === 'signup' && agora - a.enviadoEm < VALIDADE_MS;
      if (!vale) return responder(403, { code: 'otp_expired', message: 'Email link is invalid or has expired' });
      a.confirmado = true;
      pedidos.at(-1).ok = true;
      return responder(200, sessaoDe(contaDoEmail(email)));
    }
    if (caminho === '/token') {
      const grant = url.searchParams.get('grant_type');
      if (grant === 'password') {
        const a = caixa[corpo.email];
        const ok = !(a && !a.confirmado) && corpo.password === SENHA;
        pedidos.push({ tipo: 'password', email: corpo.email, ok });
        if (a && !a.confirmado) return responder(400, { code: 'email_not_confirmed', message: 'Email not confirmed' });
        if (corpo.password !== SENHA) return responder(400, { code: 'invalid_credentials', message: 'Invalid login credentials' });
        return responder(200, sessaoDe(contaDoEmail(corpo.email)));
      }
      if (grant === 'pkce') {
        // O link dos e-mails mandados antes: o Supabase já confirmou a conta e devolve o `code`, que o navegador troca pela sessão com o
        // code_verifier que o cadastro guardou NESTE navegador.
        pedidos.push({ tipo: 'pkce', verificador: !!corpo.code_verifier });
        if (!corpo.code_verifier) return responder(400, { code: 'bad_code_verifier', message: 'code verifier missing' });
        return responder(200, sessaoDe(estado.conta));
      }
      if (grant === 'refresh_token') return responder(200, sessaoDe(String(corpo.refresh_token || '').replace(/^r-/, '')));
    }
    if (caminho === '/user') {
      const conta = contaDoToken(String(req.headers().authorization || '').replace(/^Bearer /i, ''));
      return conta ? responder(200, usuarioDoAuth(conta)) : responder(401, { code: 'bad_jwt', message: 'invalid JWT' });
    }
    return route.fulfill({ status: 204, headers: cors, body: '' });
  }

  /** Um "aparelho": o navegador (nativo = null) ou o app da loja (nativo = 'ios' | 'android'), com armazenamento próprio. */
  async function abrir({ aparelho, nativo = null, conta }) {
    const ctx = await navegador.newContext({ ...APARELHOS[aparelho], locale: 'pt-BR', timezoneId: 'America/Sao_Paulo', serviceWorkers: 'block', reducedMotion: 'reduce' });
    const estado = { conta, erros: [] };
    if (nativo) {
      await ctx.addInitScript(ladoNativo, nativo === 'ios' ? 'ios' : 'android');
      await ctx.addInitScript({ content: PONTE_DO_CAPACITOR });
    }
    await ctx.addInitScript(() => { try { localStorage.setItem('futty_cookies', 'aceite'); } catch { /* sem armazenamento */ } });
    await ctx.route('**/*', async (route) => {
      const req = route.request();
      const url = new URL(req.url());
      try {
        if (url.pathname.startsWith('/api/')) return await aoMotor(route, dados.base);
        if (url.host === hostDoVite) return await route.continue();
        if (url.host === SUPABASE.host && url.pathname.startsWith('/auth/v1/')) return await supabaseFalso(route, estado);
        externos.push(`${req.method()} ${url.host}${url.pathname}`.slice(0, 120));
        return await route.fulfill({ status: 200, contentType: url.pathname.endsWith('.js') ? 'text/javascript' : 'application/json', body: url.pathname.endsWith('.js') ? '' : '{}' });
      } catch { return route.abort().catch(() => {}); }
    });
    await ctx.routeWebSocket((url) => url.host !== hostDoVite, (ws) => ws.close());
    const nova = async () => {
      const page = await ctx.newPage();
      page.on('pageerror', (e) => { if (!/not implemented|plugin/i.test(e.message)) estado.erros.push(e.message); });
      return page;
    };
    return { ctx, page: await nova(), nova, estado };
  }

  const membros = async () => (await perguntarAoMotor(filho, 'membros', 'membros')) || [];
  const naTabelaDoTime = async (conta) => (await membros()).includes(dados.pessoas[conta].id);
  const textoDe = (page) => page.evaluate(() => document.body.innerText.replace(/\s+/g, ' ').slice(0, 300)).catch(() => '');
  const semRolarDeLado = (page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);

  /** O sistema entrega o link ao app (universal link / app link): o mesmo evento que o iPhone e o Android mandam. */
  async function linkNoApp(page, url) {
    await page.waitForFunction(() => window.__ouvintesNativos?.('appUrlOpen') > 0, null, { timeout: 30000 });
    return page.evaluate((u) => window.__eventoNativo('appUrlOpen', { url: u }), url);
  }
  /** O link aberto no navegador (o e-mail lido nele): a página do site, de fora, numa aba nova do mesmo navegador. */
  async function linkNoNavegador(aparelho, url) {
    const page = await aparelho.nova();
    await page.goto(`${base}${new URL(url).pathname}${new URL(url).search}`, { waitUntil: 'domcontentloaded' });
    return page;
  }
  /** A tela que o link mostrou (fora o onboarding): o data-confirmar-email e as frases. */
  async function telaDoLink(page) {
    const tela = page.locator('[data-confirmar-email]');
    const veio = await tela.waitFor({ timeout: 20000 }).then(() => true, () => false);
    if (!veio) return { veio, texto: await textoDe(page) };
    return {
      veio,
      estado: await tela.getAttribute('data-confirmar-email'),
      titulo: (await page.locator('.auth-title').innerText()).replace(/\s+/g, ' '),
      frase: (await page.locator('[data-frase-do-link]').innerText()).replace(/\s+/g, ' '),
      busca: await page.evaluate(() => window.location.search),
    };
  }

  /** Preenche e envia o cadastro por e-mail (a tela já está em /register). */
  async function cadastrar(page, email) {
    await page.locator('input[placeholder="seu@email.com"]').waitFor({ timeout: 20000 });
    await page.locator('input[placeholder="seu@email.com"]').fill(email);
    await page.locator('input[placeholder="Mínimo 6 caracteres"]').fill(SENHA);
    await page.locator('input[placeholder="••••••••"]').fill(SENHA);
    const rolos = page.locator('[data-rolinhos] [role="listbox"]');
    for (let i = 0; i < 3; i += 1) await rolos.nth(i).locator('[aria-selected="true"]').click();
    await rolos.nth(2).focus();
    for (let i = 0; i < 8; i += 1) await page.keyboard.press('ArrowUp');
    await page.locator('input[type="checkbox"]').check();
    await page.locator('button[type="submit"]').click();
  }

  /** A tela de espera está de pé, para este e-mail? */
  async function telaDeEspera(page, email) {
    const tela = page.locator('[data-espera-do-email]');
    const apareceu = await tela.waitFor({ timeout: 20000 }).then(() => true, () => false);
    if (!apareceu) return { apareceu, texto: await textoDe(page) };
    const texto = (await page.locator('[data-texto-da-espera]').innerText()).replace(/\s+/g, ' ');
    return { apareceu, texto, doEmail: texto.startsWith(`Mandamos um link para ${email}. Toque em Confirmar no e-mail.`), semRolarDeLado: await semRolarDeLado(page) };
  }

  /** O cadastro do Futty (onboarding) até o fim: boas-vindas (do time, se veio de convite), foto depois, o nome, Entrar. */
  async function terminarCadastro(page, apelido) {
    await page.waitForURL(/\/onboarding/, { timeout: 30000 }).catch(async (e) => {
      throw new Error(`não chegou ao cadastro (${page.url()}): ${await textoDe(page)} — ${e.message.split('\n')[0]}`);
    });
    const vamos = page.getByRole('button', { name: 'Vamos lá' });
    const comecar = page.getByRole('button', { name: 'Começar' });
    await vamos.or(comecar).first().waitFor({ timeout: 20000 });
    const doTime = await vamos.isVisible().catch(() => false);
    await (doTime ? vamos : comecar).click();
    const depois = page.getByRole('button', { name: 'deixar para depois' });
    await depois.waitFor({ timeout: 20000 });
    await page.waitForTimeout(2300); // o "deixar para depois" só aceita toque depois de ~2 s
    await depois.click();
    await page.locator('input[placeholder="Ex.: Bruninho"]').fill(apelido);
    await page.getByRole('button', { name: 'Entrar', exact: true }).click();
    return doTime;
  }

  // A sessão nasceu do link (um /verify com o token_hash que deu certo) e não da senha.
  const peloLink = (email) => pedidos.some((p) => p.tipo === 'verify' && p.ok && p.email === email && p.tokenHash && !p.token)
    && !pedidos.some((p) => p.tipo === 'password' && p.ok && p.email === email);
  const bilhete = (page) => page.evaluate(() => localStorage.getItem('futty_cadastro_pendente'));
  const caminho = (page) => new URL(page.url()).pathname;

  try {
    // ── 1. APP (iPhone), SEM convite — o app fechado no meio; o link abre o app de novo ────────────────────────────────────────────────────────
    {
      const conta = 'appSem';
      const email = dados.pessoas[conta].email;
      const app = await abrir({ aparelho: 'iphone', nativo: 'ios', conta });
      await app.page.goto(`${base}/register`, { waitUntil: 'domcontentloaded' });
      await cadastrar(app.page, email);
      const tela = await telaDeEspera(app.page, email);
      t('app iPhone · sem convite · depois do cadastro: "Confirme seu e-mail · Mandamos um link para <e-mail>. Toque em Confirmar no e-mail."',
        tela.apareceu && tela.doEmail && (await app.page.locator('.auth-title').innerText()).replace(/\s+/g, ' ').toLowerCase() === 'confirme seu e-mail', tela.texto);
      t('app iPhone · sem convite · sem campo de código nenhum', (await app.page.locator('input#codigo, [autocomplete="one-time-code"]').count()) === 0);
      t('app iPhone · sem convite · nada rola para o lado (390 px)', tela.semRolarDeLado);
      const reenviar = app.page.locator('[data-reenviar-email]');
      t('app iPhone · sem convite · "Reenviar e-mail" começa esperando (60 s entre e-mails)', /^Reenviar e-mail em \d+s$/.test(await reenviar.innerText()) && await reenviar.isDisabled(), await reenviar.innerText());
      const abrirEmail = app.page.locator('[data-abrir-email]');
      t('app iPhone · sem convite · "Abrir o e-mail" abre o Mail do iPhone (domínio sem app próprio)', (await abrirEmail.innerText()) === 'Abrir o e-mail' && (await abrirEmail.getAttribute('data-caixa')) === 'message://');
      t('app iPhone · sem convite · e "Já confirmei"', (await app.page.locator('[data-ja-confirmei]').innerText()) === 'Já confirmei');
      const signup = pedidos.find((p) => p.tipo === 'signup' && p.email === email);
      t('app iPhone · sem convite · o cadastro leva a data de nascimento e o destino dos e-mails antigos', !!signup?.redirect?.endsWith('/onboarding') && signup.pkce && signup.nascimento, JSON.stringify(signup));
      await foto(app.page, '1-app-iphone-confirme-seu-email');

      // O sistema fechou o app (a pessoa foi ao Mail). Ela toca em "Confirmar e entrar": o iPhone abre o app pelo link (abertura a frio).
      await app.page.close();
      const page = await app.nova();
      await page.goto(`${base}/`, { waitUntil: 'domcontentloaded' });
      await linkNoApp(page, linkDoEmail(email));
      const doTime = await terminarCadastro(page, 'Lucas');
      t('app iPhone · sem convite · o link abre a sessão no app e segue para o "Começar" de sempre, sem pedir a senha', doTime === false && peloLink(email));
      await page.waitForURL(/\/home/, { timeout: 30000 }).catch(() => {});
      t('app iPhone · sem convite · termina no Início', caminho(page) === '/home', page.url());
      t('app iPhone · sem convite · e fora do time (não veio de convite)', !(await naTabelaDoTime(conta)));
      t('app iPhone · sem convite · o bilhete da espera some depois de confirmar', (await bilhete(page)) === null);
      t('app iPhone · sem convite · sem erro de página', app.estado.erros.length === 0, app.estado.erros.slice(0, 3).join(' | '));
      await app.ctx.close();
    }

    // ── 2. APP (iPhone), COM convite: o convite abre no app → Criar conta e entrar → o link chega com o app aberto → time ──────────────────────
    {
      const conta = 'appCom';
      const email = dados.pessoas[conta].email;
      const app = await abrir({ aparelho: 'iphone', nativo: 'ios', conta });
      await app.page.goto(`${base}/`, { waitUntil: 'domcontentloaded' });
      await linkNoApp(app.page, linkDoConvite);
      const criar = app.page.getByRole('button', { name: 'Criar conta e entrar' });
      await criar.waitFor({ timeout: 30000 });
      await criar.click();
      await cadastrar(app.page, email);
      const tela = await telaDeEspera(app.page, email);
      t('app iPhone · com convite · a tela de espera', tela.apareceu && tela.doEmail, tela.texto);
      await linkNoApp(app.page, linkDoEmail(email));
      const doTime = await terminarCadastro(app.page, 'Diego');
      t('app iPhone · com convite · o link abre o onboarding nas boas-vindas DO TIME, sem senha', doTime === true && peloLink(email));
      await app.page.waitForURL(new RegExp(`/time/${slug}`), { timeout: 30000 }).catch(() => {});
      t('app iPhone · com convite · termina dentro do time', new RegExp(`/time/${slug}$`).test(caminho(app.page)), app.page.url());
      t('app iPhone · com convite · a pessoa está na tabela team_members do time', await naTabelaDoTime(conta));
      await foto(app.page, '2-app-iphone-com-convite-no-time');
      t('app iPhone · com convite · sem erro de página', app.estado.erros.length === 0, app.estado.erros.slice(0, 3).join(' | '));
      await app.ctx.close();
    }

    // ── 3. APP (Android, 360 px), COM convite, pelo /c/confirmar ─────────────────────────────────────────────────────────────────────────────
    {
      const conta = 'androidCom';
      const email = dados.pessoas[conta].email;
      const app = await abrir({ aparelho: 'android', nativo: 'android', conta });
      await app.page.goto(`${base}/`, { waitUntil: 'domcontentloaded' });
      await linkNoApp(app.page, linkDoConvite);
      await app.page.getByRole('button', { name: 'Criar conta e entrar' }).click({ timeout: 30000 });
      await cadastrar(app.page, email);
      const tela = await telaDeEspera(app.page, email);
      t('app Android · com convite · a tela de espera em 360 px, sem rolar para o lado', tela.apareceu && tela.doEmail && tela.semRolarDeLado, tela.texto);
      t('app Android · "Abrir o e-mail" some quando não se sabe qual é o app de e-mail (domínio próprio)', (await app.page.locator('[data-abrir-email]').count()) === 0);
      await foto(app.page, '3-app-android-confirme-seu-email');
      await linkNoApp(app.page, linkDoEmail(email));
      const doTime = await terminarCadastro(app.page, 'Bruno');
      await app.page.waitForURL(new RegExp(`/time/${slug}`), { timeout: 30000 }).catch(() => {});
      t('app Android · com convite · boas-vindas do time e termina dentro dele, sem senha', doTime === true && new RegExp(`/time/${slug}$`).test(caminho(app.page)) && peloLink(email), app.page.url());
      t('app Android · com convite · a pessoa está na tabela team_members do time', await naTabelaDoTime(conta));
      t('app Android · com convite · sem erro de página', app.estado.erros.length === 0, app.estado.erros.slice(0, 3).join(' | '));
      await app.ctx.close();
    }

    // ── 4. APP (Android), SEM convite, pelo /auth/confirmar; depois o MESMO link de novo (já usado, com a conta aberta) ──────────────────────
    {
      const conta = 'androidSem';
      const email = dados.pessoas[conta].email;
      const app = await abrir({ aparelho: 'android', nativo: 'android', conta });
      await app.page.goto(`${base}/register`, { waitUntil: 'domcontentloaded' });
      await cadastrar(app.page, email);
      await telaDeEspera(app.page, email);
      const link = linkDoEmail(email, '/auth/confirmar');
      await linkNoApp(app.page, link);
      const doTime = await terminarCadastro(app.page, 'Rafael');
      await app.page.waitForURL(/\/home/, { timeout: 30000 }).catch(() => {});
      t('app Android · sem convite · /auth/confirmar faz o mesmo: sessão pelo link, "Começar", Início', doTime === false && caminho(app.page) === '/home' && peloLink(email), app.page.url());
      t('app Android · sem convite · fora do time', !(await naTabelaDoTime(conta)));

      // Tocou de novo no mesmo botão do e-mail, já com a conta aberta no app.
      await linkNoApp(app.page, link);
      const usado = await telaDoLink(app.page);
      t('link já usado · com a conta aberta: "Link já usado · Esse link já foi usado: seu e-mail já está confirmado."',
        usado.estado === 'usado' && usado.titulo.toLowerCase() === 'link já usado' && usado.frase === 'Esse link já foi usado: seu e-mail já está confirmado.', JSON.stringify(usado));
      await foto(app.page, '4-link-ja-usado-no-app');
      await app.page.getByRole('button', { name: 'Continuar' }).click();
      await app.page.waitForURL(/\/home/, { timeout: 20000 }).catch(() => {});
      t('link já usado · "Continuar" volta ao Início', caminho(app.page) === '/home', app.page.url());

      // O mesmo link usado, aberto num computador que não tem nada desta conta.
      const pc = await abrir({ aparelho: 'pc', conta });
      await pc.page.close();
      const page = await linkNoNavegador(pc, link);
      const semPista = await telaDoLink(page);
      t('link já usado · num navegador sem pista: "Esse link não vale mais · já foi usado ou passou de 1 hora…" e o botão Entrar',
        semPista.estado === 'usado-ou-vencido' && /já foi usado ou passou de 1 hora/.test(semPista.frase) && (await page.locator('[data-entrar]').count()) === 1, JSON.stringify(semPista));
      await foto(page, '5-link-ja-usado-sem-pista');
      t('app Android · sem convite · sem erro de página', app.estado.erros.length === 0 && pc.estado.erros.length === 0, [...app.estado.erros, ...pc.estado.erros].slice(0, 3).join(' | '));
      await app.ctx.close();
      await pc.ctx.close();
    }

    // ── 5. SITE (computador), SEM convite: o link aberto no mesmo navegador do cadastro segue direto ──────────────────────────────────────────
    {
      const conta = 'siteSem';
      const email = dados.pessoas[conta].email;
      const site = await abrir({ aparelho: 'pc', conta });
      await site.page.goto(`${base}/register`, { waitUntil: 'domcontentloaded' });
      await cadastrar(site.page, email);
      const tela = await telaDeEspera(site.page, email);
      t('site · sem convite · a mesma tela de espera no computador', tela.apareceu && tela.doEmail, tela.texto);
      await foto(site.page, '6-site-pc-confirme-seu-email');
      const aba = await linkNoNavegador(site, linkDoEmail(email));
      const doTime = await terminarCadastro(aba, 'Felipe');
      await aba.waitForURL(/\/home/, { timeout: 30000 }).catch(() => {});
      t('site · sem convite · o link no navegador do cadastro abre a sessão e segue: onboarding comum e Início, sem senha', doTime === false && caminho(aba) === '/home' && peloLink(email), aba.url());
      t('site · sem convite · sem erro de página', site.estado.erros.length === 0, site.estado.erros.slice(0, 3).join(' | '));
      await site.ctx.close();
    }

    // ── 6. SITE (celular Android, sem o app), COM convite: "Continuar pelo site" → cadastro → o link no mesmo navegador → team_members ─────────
    {
      const conta = 'siteCom';
      const email = dados.pessoas[conta].email;
      const site = await abrir({ aparelho: 'android', conta });
      await site.page.goto(`${base}/c/${slug}-${dados.convite.codigo}`, { waitUntil: 'domcontentloaded' });
      const peloSite = site.page.getByRole('button', { name: 'Continuar pelo site' }).or(site.page.getByRole('link', { name: 'Continuar pelo site' }));
      await peloSite.first().waitFor({ timeout: 40000 });
      await peloSite.first().click();
      await site.page.getByRole('button', { name: 'Criar conta e entrar' }).click();
      await cadastrar(site.page, email);
      const tela = await telaDeEspera(site.page, email);
      t('site · com convite · a tela de espera no navegador do celular (360 px, sem rolar para o lado)', tela.apareceu && tela.doEmail && tela.semRolarDeLado, tela.texto);
      const aba = await linkNoNavegador(site, linkDoEmail(email));
      const doTime = await terminarCadastro(aba, 'Caio');
      await aba.waitForURL(new RegExp(`/time/${slug}`), { timeout: 30000 }).catch(() => {});
      t('site · com convite · boas-vindas do time e termina dentro dele', doTime === true && new RegExp(`/time/${slug}$`).test(caminho(aba)) && peloLink(email), aba.url());
      t('site · com convite · a pessoa está na tabela team_members do time', await naTabelaDoTime(conta));
      t('site · com convite · sem erro de página', site.estado.erros.length === 0, site.estado.erros.slice(0, 3).join(' | '));
      await site.ctx.close();
    }

    // ── 7. Cadastro no APP (iPhone, com convite), e-mail lido no COMPUTADOR; o app continua aberto e percebe sozinho ao voltar ─────────────────
    {
      const conta = 'foraAberto';
      const email = dados.pessoas[conta].email;
      const app = await abrir({ aparelho: 'iphone', nativo: 'ios', conta });
      await app.page.goto(`${base}/`, { waitUntil: 'domcontentloaded' });
      await linkNoApp(app.page, linkDoConvite);
      await app.page.getByRole('button', { name: 'Criar conta e entrar' }).click({ timeout: 30000 });
      await cadastrar(app.page, email);
      await telaDeEspera(app.page, email);
      await app.page.waitForFunction(() => window.__ouvintesNativos?.('resume') > 0, null, { timeout: 15000 }).catch(() => {});
      t('fora · a tela de espera do app escuta o "voltar ao app" do sistema', (await app.page.evaluate(() => window.__ouvintesNativos('resume'))) > 0);
      // Voltou ao app ANTES de confirmar, várias vezes, e ficou parado na espera mais de 20 s: continua esperando — e NENHUM e-mail novo
      // (um e-mail a mais trocaria o link que a pessoa vai tocar por um mais novo).
      const hashDoCadastro = caixa[email].hash;
      for (let i = 0; i < 3; i += 1) {
        await app.page.evaluate(() => window.__eventoNativo('resume', {}));
        await app.page.waitForTimeout(700);
      }
      await app.page.evaluate(() => { document.dispatchEvent(new Event('visibilitychange')); window.dispatchEvent(new Event('focus')); });
      await app.page.waitForTimeout(21500); // um ciclo da checagem de 20 s
      const checagens = pedidos.filter((p) => p.tipo === 'password' && p.email === email);
      t('fora · voltar ao app antes de confirmar: continua na espera (o Supabase diz "falta confirmar")',
        (await app.page.locator('[data-espera-do-email]').count()) === 1 && checagens.length > 0 && checagens.every((p) => !p.ok));
      t(`fora · a checagem automática (${checagens.length} vezes: 3 voltas ao app, foco e o ciclo de 20 s) não mandou e-mail nenhum: o link do cadastro continua o que vale`,
        checagens.length >= 4 && caixa[email].envios === 1 && caixa[email].hash === hashDoCadastro && !pedidos.some((p) => p.tipo === 'resend' && p.email === email),
        JSON.stringify({ checagens: checagens.length, envios: caixa[email].envios, reenvios: pedidos.filter((p) => p.tipo === 'resend' && p.email === email).length }));

      const pc = await abrir({ aparelho: 'pc', conta });
      await pc.page.close();
      const aba = await linkNoNavegador(pc, linkDoEmail(email));
      const tela = await telaDoLink(aba);
      t('fora · no computador: "E-mail confirmado · Volte ao app e toque em Entrar."', tela.estado === 'confirmado-fora' && tela.titulo.toLowerCase() === 'e-mail confirmado' && tela.frase === 'Volte ao app e toque em Entrar.', JSON.stringify(tela));
      t('fora · no computador a conta também entrou (sessão aberta lá) e o token saiu da barra de endereço',
        tela.busca === '' && (await aba.evaluate(() => Object.keys(localStorage).some((k) => k.endsWith('-auth-token')))), JSON.stringify({ busca: tela.busca }));
      t('fora · no computador, "Continuar no site" para quem não tem o app', (await aba.locator('[data-continuar-no-site]').count()) === 1);
      await foto(aba, '7-pc-email-confirmado-volte-ao-app');

      // Voltou ao app: ele percebe sozinho e segue para as boas-vindas do time.
      await app.page.evaluate(() => window.__eventoNativo('resume', {}));
      const doTime = await terminarCadastro(app.page, 'Thiago');
      await app.page.waitForURL(new RegExp(`/time/${slug}`), { timeout: 30000 }).catch(() => {});
      t('fora · de volta ao app, ele segue sozinho: boas-vindas do time e dentro dele, sem digitar nada', doTime === true && new RegExp(`/time/${slug}$`).test(caminho(app.page)), app.page.url());
      t('fora · a pessoa está na tabela team_members do time', await naTabelaDoTime(conta));
      t('fora · sem erro de página', app.estado.erros.length === 0 && pc.estado.erros.length === 0, [...app.estado.erros, ...pc.estado.erros].slice(0, 3).join(' | '));
      await app.ctx.close();
      await pc.ctx.close();
    }

    // ── 8. Cadastro no APP (Android), o app FECHADO, e-mail lido no computador; reabre o app → Entrar com o e-mail preenchido ─────────────────
    {
      const conta = 'foraFechado';
      const email = dados.pessoas[conta].email;
      const app = await abrir({ aparelho: 'android', nativo: 'android', conta });
      await app.page.goto(`${base}/register`, { waitUntil: 'domcontentloaded' });
      await cadastrar(app.page, email);
      await telaDeEspera(app.page, email);
      await app.page.close();
      const pc = await abrir({ aparelho: 'pc', conta });
      await pc.page.close();
      const tela = await telaDoLink(await linkNoNavegador(pc, linkDoEmail(email)));
      t('fechado · no computador: "E-mail confirmado · Volte ao app e toque em Entrar."', tela.estado === 'confirmado-fora', JSON.stringify(tela));
      const page = await app.nova();
      await page.goto(`${base}/`, { waitUntil: 'domcontentloaded' });
      await page.getByRole('link', { name: /Já tenho conta/ }).click({ timeout: 30000 });
      await page.getByText('Bem-vindo de volta', { exact: false }).waitFor({ timeout: 20000 });
      const noCampo = await page.locator('input[placeholder="seu@email.com"]').inputValue();
      const aviso = await page.locator('[data-aviso-do-cadastro]').innerText().catch(() => '');
      t('fechado · o app reaberto, "Entrar": o e-mail já está no campo e o aviso "Confirmou o e-mail? Digite sua senha para entrar."',
        noCampo === email && aviso.startsWith('Confirmou o e-mail? Digite sua senha para entrar.'), JSON.stringify({ noCampo, aviso }));
      await foto(page, '8-app-android-entrar-com-email-preenchido');
      await page.locator('input[placeholder="••••••••"]').fill(SENHA);
      await page.locator('button[type="submit"]').click();
      const doTime = await terminarCadastro(page, 'Gustavo');
      await page.waitForURL(/\/home/, { timeout: 30000 }).catch(() => {});
      t('fechado · a senha entra direto no onboarding (a conta nasceu agora) e termina no Início', doTime === false && caminho(page) === '/home', page.url());
      t('fechado · sem erro de página', app.estado.erros.length === 0 && pc.estado.erros.length === 0, [...app.estado.erros, ...pc.estado.erros].slice(0, 3).join(' | '));
      await app.ctx.close();
      await pc.ctx.close();
    }

    // ── 9. Link VENCIDO (no app): a frase, "Mandar outro e-mail", o link antigo trocado, o link novo valendo ────────────────────────────────────
    {
      const conta = 'vencido';
      const email = dados.pessoas[conta].email;
      const app = await abrir({ aparelho: 'iphone', nativo: 'ios', conta });
      await app.page.goto(`${base}/register`, { waitUntil: 'domcontentloaded' });
      await cadastrar(app.page, email);
      await telaDeEspera(app.page, email);
      // Duas horas depois (o link vale 1 h) a pessoa toca no botão do e-mail.
      caixa[email].enviadoEm -= 2 * VALIDADE_MS;
      caixa[email].ultimoPedido -= 2 * VALIDADE_MS;
      await app.page.evaluate((ms) => {
        const b = JSON.parse(localStorage.getItem('futty_cadastro_pendente'));
        localStorage.setItem('futty_cadastro_pendente', JSON.stringify({ ...b, em: b.em - ms }));
      }, 2 * VALIDADE_MS);
      const antigo = linkDoEmail(email);
      await linkNoApp(app.page, antigo);
      const tela = await telaDoLink(app.page);
      t('link vencido · "Link vencido · Esse link valia por 1 hora. Peça outro e toque em "Confirmar e entrar" no e-mail novo."',
        tela.estado === 'vencido' && tela.titulo.toLowerCase() === 'link vencido' && tela.frase === 'Esse link valia por 1 hora. Peça outro e toque em "Confirmar e entrar" no e-mail novo.', JSON.stringify(tela));
      await foto(app.page, '9-link-vencido');
      const enviosAntes = caixa[email].envios;
      await app.page.locator('[data-mandar-outro]').click();
      const frase = await app.page.locator('[data-frase-do-reenvio]').innerText({ timeout: 10000 }).catch(() => '');
      t('link vencido · "Mandar outro e-mail" manda e avisa para onde', caixa[email].envios === enviosAntes + 1 && frase === `Mandamos outro e-mail para ${email}. Toque em "Confirmar e entrar" nele.`, frase);
      // O link antigo, de novo: agora ele foi trocado pelo novo (e o bilhete diz que o último e-mail é de agora).
      await linkNoApp(app.page, antigo);
      const trocado = await telaDoLink(app.page);
      t('link trocado · o do e-mail antigo depois do reenvio: "Link já usado · …foi trocado por um mais novo…"', trocado.estado === 'usado-ou-trocado' && /trocado por um mais novo/.test(trocado.frase), JSON.stringify(trocado));
      await linkNoApp(app.page, linkDoEmail(email));
      await terminarCadastro(app.page, 'Renato');
      await app.page.waitForURL(/\/home/, { timeout: 30000 }).catch(() => {});
      t('link vencido · o link do e-mail novo vale: dentro do app (Início)', caminho(app.page) === '/home' && peloLink(email), app.page.url());
      t('link vencido · sem erro de página', app.estado.erros.length === 0, app.estado.erros.slice(0, 3).join(' | '));
      await app.ctx.close();
    }

    // ── 10. Entrar com senha numa conta que nunca confirmou; "Já confirmei" antes e depois ─────────────────────────────────────────────────────
    {
      const conta = 'semConfirmar';
      const email = dados.pessoas[conta].email;
      mandarEmail(email, Date.now() - 10 * 60000); // cadastrou há 10 min em outro aparelho e não confirmou
      const antigo = caixa[email].hash;
      const site = await abrir({ aparelho: 'pc', conta });
      await site.page.goto(`${base}/login`, { waitUntil: 'domcontentloaded' });
      await site.page.locator('input[placeholder="seu@email.com"]').fill(email);
      await site.page.locator('input[placeholder="••••••••"]').fill(SENHA);
      await site.page.locator('button[type="submit"]').click();
      const tela = await telaDeEspera(site.page, email);
      const aviso = await site.page.getByText('Falta confirmar seu e-mail. Mandamos outro link.').count();
      t('Entrar · conta sem confirmar → link novo e a tela de espera ("Falta confirmar seu e-mail. Mandamos outro link."), sem o inglês do Supabase',
        tela.apareceu && tela.doEmail && aviso === 1 && caixa[email].hash !== antigo && (await site.page.getByText('Email not confirmed').count()) === 0, tela.texto);
      const enviosDoEntrar = caixa[email].envios;
      await site.page.locator('[data-ja-confirmei]').click();
      const nota = await site.page.locator('[data-nota-da-espera]').innerText({ timeout: 10000 }).catch(() => '');
      t('Entrar · "Já confirmei" antes de confirmar: "Ainda não vimos a confirmação…" e continua na espera', /^Ainda não vimos a confirmação/.test(nota) && (await site.page.locator('[data-espera-do-email]').count()) === 1, nota);
      t('Entrar · o "Já confirmei" não manda e-mail (só o Entrar com a senha digitada e o "Reenviar e-mail" mandam)', caixa[email].envios === enviosDoEntrar, `envios: ${enviosDoEntrar} → ${caixa[email].envios}`);
      await foto(site.page, '10-ja-confirmei-antes');
      const celular = await abrir({ aparelho: 'android', conta });
      await celular.page.close();
      const confirmou = await telaDoLink(await linkNoNavegador(celular, linkDoEmail(email)));
      t('Entrar · confirmou pelo celular (navegador): "E-mail confirmado"', confirmou.estado === 'confirmado-fora', JSON.stringify(confirmou));
      await site.page.locator('[data-ja-confirmei]').click();
      t('Entrar · "Já confirmei" depois: entra com a senha da memória e vai ao onboarding', await site.page.waitForURL(/\/onboarding/, { timeout: 20000 }).then(() => true, () => false), site.page.url());
      await site.ctx.close();
      await celular.ctx.close();
    }

    // ── 11. Cadastro com e-mail que já tem conta: frase clara, sem tela de espera ─────────────────────────────────────────────────────────────
    {
      const site = await abrir({ aparelho: 'pc', conta: null });
      await site.page.goto(`${base}/register`, { waitUntil: 'domcontentloaded' });
      await cadastrar(site.page, JA_TEM_CONTA);
      const frase = site.page.getByText('Esse e-mail já tem conta no Futty.', { exact: false });
      const viu = await frase.waitFor({ timeout: 15000 }).then(() => true, () => false);
      t('cadastro com e-mail que já tem conta → "Esse e-mail já tem conta no Futty…", sem esperar e-mail nenhum', viu && (await site.page.locator('[data-espera-do-email]').count()) === 0);
      await site.ctx.close();
    }

    // ── 12. Link incompleto (sem o token) ─────────────────────────────────────────────────────────────────────────────────────────────────────
    {
      const site = await abrir({ aparelho: 'android', conta: null });
      await site.page.goto(`${base}/c/confirmar`, { waitUntil: 'domcontentloaded' });
      const tela = await telaDoLink(site.page);
      t('link incompleto · "Link incompleto · …Abra de novo pelo botão…" (sem ir ao Supabase), sem rolar para o lado em 360 px',
        tela.estado === 'incompleto' && /Abra de novo pelo botão/.test(tela.frase) && await semRolarDeLado(site.page), JSON.stringify(tela));
      await site.ctx.close();
    }

    // ── 13. O link dos e-mails mandados antes (o do Supabase, PKCE) continua no site ──────────────────────────────────────────────────────────
    {
      const conta = 'linkAntigo';
      const email = dados.pessoas[conta].email;
      const site = await abrir({ aparelho: 'pc', conta });
      await site.page.goto(`${base}/register`, { waitUntil: 'domcontentloaded' });
      await cadastrar(site.page, email);
      await telaDeEspera(site.page, email);
      caixa[email].confirmado = true;
      await site.page.goto(`${base}/onboarding?code=codigo-do-link`, { waitUntil: 'domcontentloaded' });
      const comecar = await site.page.getByRole('button', { name: 'Começar' }).waitFor({ timeout: 30000 }).then(() => true, () => false);
      const troca = pedidos.find((p) => p.tipo === 'pkce');
      t('e-mail antigo · no site o link do Supabase troca o code pela sessão (com o verificador do cadastro) e abre o onboarding', comecar && troca?.verificador === true, JSON.stringify({ url: site.page.url(), troca }));
      await site.ctx.close();
    }

    const verificacoes = pedidos.filter((p) => p.tipo === 'verify');
    t(`todo /verify foi pelo token_hash do link, tipo 'signup', nunca por código (${verificacoes.length} conferências)`,
      verificacoes.length > 0 && verificacoes.every((p) => p.type === 'signup' && p.tokenHash && !p.token));
    t(`o resto foi respondido aqui, sem sair da máquina (${externos.length ? [...new Set(externos.map((x) => x.split(' ')[1].split('/')[0]))].join(', ') : 'nada'})`, true);
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
