// Prova no navegador da Rodada 31S — a confirmação do cadastro por e-mail com um CÓDIGO de 6 números, sem sair do app. O caminho inteiro, com o app de
// verdade num Chromium que se declara iPhone ou Android (o app da loja: a ponte de verdade do Capacitor por cima de um lado nativo de mentira) ou
// navegador (celular e computador):
//   · cadastro por e-mail → "Digite o código que mandamos para <e-mail>" → código certo → sessão aberta ali mesmo (sem senha de novo) → onboarding
//     → Início (sem convite) ou o time, com a pessoa na tabela team_members (com convite); no app e no site;
//   · código errado e código vencido, cada um com a sua frase; "Reenviar código" com espera e o código novo valendo;
//   · o app fechado no meio (a pessoa foi ler o e-mail): ao voltar, a tela do código continua lá;
//   · Entrar com senha numa conta sem confirmar → código novo e a tela do código;
//   · cadastro com e-mail que já tem conta: frase clara, sem esperar um código que nunca chega;
//   · o link antigo continua: o cadastro ainda manda o destino do link (PKCE + redirect_to); no site o link troca o `code` pela sessão como antes;
//     no app, quem confirmou pelo link entra com a senha.
//
// Como: o motor de VERDADE sobe num processo à parte sobre banco e Auth de mentira (scripts/provas/_motor-31s.cjs → backend/tests/_appFalsa.js). O
// Supabase do navegador é respondido aqui, imitando o de verdade: o cadastro "manda o e-mail" (o código fica guardado aqui, como numa caixa de
// entrada), o /verify confere código e validade (1 h), o reenvio respeita os 60 s entre e-mails, o Entrar com senha recusa conta sem confirmar.
// Nada sai da máquina.
//
// Uso: npm run provar:navegador -- rodada-31s      (~3 min)
//      R31S_FOTOS=pasta  salva as fotos dos passos principais
import { spawn } from 'node:child_process';
import { readFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const nome = 'Rodada 31S · cadastro por e-mail com código de 6 números, sem sair do app (app e site, com e sem convite; motor de verdade, banco falso)';

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

const UA_IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.7 Mobile/15E148 Safari/604.1';
const UA_ANDROID = 'Mozilla/5.0 (Linux; Android 14; SM-A146B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36';
const UA_PC = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';
const APARELHOS = {
  iphone: { userAgent: UA_IPHONE, viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  android: { userAgent: UA_ANDROID, viewport: { width: 360, height: 780 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  pc: { userAgent: UA_PC, viewport: { width: 1280, height: 800 } },
};

const FRASE_ERRADO = 'Código errado. Confira os 6 números do e-mail mais recente.';
const FRASE_VENCEU = 'Esse código venceu. Toque em "Reenviar código" para receber um novo.';

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

/** O lado nativo do app da loja (como na prova 31R): App (os links que o sistema entrega) e Browser. */
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
  const linkDoConvite = `https://futtyapp.com.br/c/${slug}-${dados.convite.codigo}`;
  if (FOTOS) mkdirSync(FOTOS, { recursive: true });
  const foto = async (page, rotulo) => { if (FOTOS) { await page.waitForTimeout(400); await page.screenshot({ path: path.join(FOTOS, `${rotulo}.png`) }); } };
  const hostDoVite = new URL(base).host;
  const externos = [];

  // ── O Supabase de mentira (um só, como o de verdade): a "caixa de entrada" com o código de cada e-mail ─────────────────────────────────────
  const caixa = {}; // email → { codigo, enviadoEm, ultimoPedido, confirmado, envios }
  const pedidos = []; // { tipo, email, ... } — o que o app pediu ao Supabase
  const novoCodigo = () => String(100000 + Math.floor(Math.random() * 900000));
  const contaDoEmail = (email) => Object.keys(dados.pessoas).find((k) => dados.pessoas[k].email === email);
  const contaDoToken = (token) => Object.keys(dados.tokens).find((k) => dados.tokens[k] === token);
  const mandarEmail = (email, agora = Date.now()) => {
    const a = caixa[email] || (caixa[email] = { confirmado: false, envios: 0 });
    Object.assign(a, { codigo: novoCodigo(), enviadoEm: agora, ultimoPedido: agora, envios: a.envios + 1 });
    return a;
  };
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
      mandarEmail(corpo.email, agora);
      return responder(200, {});
    }
    if (caminho === '/verify') {
      const a = caixa[corpo.email];
      pedidos.push({ tipo: 'verify', email: corpo.email, token: corpo.token, type: corpo.type });
      const vale = a && !a.confirmado && corpo.type === 'signup' && corpo.token === a.codigo && agora - a.enviadoEm < VALIDADE_MS;
      if (!vale) return responder(403, { code: 'otp_expired', message: 'Token has expired or is invalid' });
      a.confirmado = true;
      a.codigo = null;
      return responder(200, sessaoDe(contaDoEmail(corpo.email)));
    }
    if (caminho === '/token') {
      const grant = url.searchParams.get('grant_type');
      if (grant === 'password') {
        pedidos.push({ tipo: 'password', email: corpo.email });
        const a = caixa[corpo.email];
        if (a && !a.confirmado) return responder(400, { code: 'email_not_confirmed', message: 'Email not confirmed' });
        return responder(200, sessaoDe(contaDoEmail(corpo.email)));
      }
      if (grant === 'pkce') {
        // O link do e-mail (o antigo): o Supabase já confirmou a conta e devolve o `code`, que o navegador troca pela sessão com o code_verifier
        // que o cadastro guardou NESTE navegador.
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
    const page = await ctx.newPage();
    page.on('pageerror', (e) => { if (!/not implemented|plugin/i.test(e.message)) estado.erros.push(e.message); });
    return { ctx, page, estado };
  }

  const membros = async () => (await perguntarAoMotor(filho, 'membros', 'membros')) || [];
  const naTabelaDoTime = async (conta) => (await membros()).includes(dados.pessoas[conta].id);
  const irPara = (page, caminho) => page.evaluate((c) => { window.history.pushState({}, '', c); window.dispatchEvent(new PopStateEvent('popstate')); }, caminho);

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

  /** A tela do código está de pé, para este e-mail? */
  async function telaDoCodigo(page, email) {
    const tela = page.locator('[data-confirmar-codigo]');
    const apareceu = await tela.waitFor({ timeout: 20000 }).then(() => true, () => false);
    if (!apareceu) return { apareceu, texto: await page.evaluate(() => document.body.innerText.replace(/\s+/g, ' ').slice(0, 240)) };
    const texto = (await tela.innerText()).replace(/\s+/g, ' ');
    const largura = await page.evaluate(() => ({ doc: document.documentElement.scrollWidth, janela: window.innerWidth }));
    return { apareceu, texto, doEmail: texto.includes(`Digite o código que mandamos para ${email}.`), semRolarDeLado: largura.doc <= largura.janela, largura };
  }

  const digitar = (page, codigo) => page.locator('input#codigo').fill(codigo);
  const erroNaTela = async (page) => page.locator('[data-erro-do-codigo]').waitFor({ timeout: 10000 }).then(() => page.locator('[data-erro-do-codigo]').innerText(), () => null);

  /** O cadastro do Futty (onboarding) até o fim: boas-vindas (do time, se veio de convite), foto depois, o nome, Entrar. */
  async function terminarCadastro(page, apelido) {
    await page.waitForURL(/\/onboarding/, { timeout: 30000 }).catch(async (e) => {
      const tela = await page.evaluate(() => document.body.innerText.replace(/\s+/g, ' ').slice(0, 300)).catch(() => '');
      throw new Error(`não chegou ao cadastro (${page.url()}): ${tela} — ${e.message.split('\n')[0]}`);
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

  const semSenhaDeNovo = (email) => !pedidos.some((p) => p.tipo === 'password' && p.email === email);

  try {
    // ── 1. APP (iPhone), SEM convite — e o app fechado no meio, enquanto a pessoa lia o e-mail ───────────────────────────────────────────────
    {
      const conta = 'appSem';
      const email = dados.pessoas[conta].email;
      const app = await abrir({ aparelho: 'iphone', nativo: 'ios', conta });
      await app.page.goto(`${base}/register`, { waitUntil: 'domcontentloaded' });
      await cadastrar(app.page, email);
      const tela = await telaDoCodigo(app.page, email);
      t('app · sem convite · depois do cadastro, a tela "Digite o código que mandamos para <e-mail>" (no lugar do "Conta criada!")', tela.apareceu && tela.doEmail && (await app.page.getByText('Conta criada!').count()) === 0, tela.texto);
      t('app · sem convite · nada rola para o lado (390 px)', tela.semRolarDeLado, JSON.stringify(tela.largura));
      const reenviar = app.page.locator('[data-reenviar-codigo]');
      t('app · sem convite · "Reenviar código" começa esperando (60 s entre e-mails)', /Reenviar código em \d+s/.test(await reenviar.innerText()) && await reenviar.isDisabled(), await reenviar.innerText());
      const campo = app.page.locator('input#codigo');
      t('app · sem convite · o campo pede só números e aceita o preenchimento do teclado (one-time-code)', (await campo.getAttribute('inputmode')) === 'numeric' && (await campo.getAttribute('autocomplete')) === 'one-time-code');
      const signup = pedidos.find((p) => p.tipo === 'signup' && p.email === email);
      t('app · sem convite · o cadastro ainda leva o destino do link (o link antigo continua valendo) e a data de nascimento', !!signup?.redirect?.endsWith('/onboarding') && signup.pkce && signup.nascimento, JSON.stringify(signup));
      await foto(app.page, '1-app-iphone-tela-do-codigo');

      // O sistema fechou o app (a pessoa foi ao Mail). Abre de novo e toca em Entrar: a tela do código está lá.
      await app.page.close();
      const page = await app.ctx.newPage();
      page.on('pageerror', (e) => { if (!/not implemented|plugin/i.test(e.message)) app.estado.erros.push(e.message); });
      await page.goto(`${base}/login`, { waitUntil: 'domcontentloaded' });
      const devolta = await telaDoCodigo(page, email);
      t('app · sem convite · o app fechado no meio: ao voltar (Entrar), a tela do código continua, com o mesmo e-mail', devolta.apareceu && devolta.doEmail, devolta.texto);
      await digitar(page, caixa[email].codigo);
      const doTime = await terminarCadastro(page, 'Lucas');
      t('app · sem convite · código certo → sessão aberta e onboarding no "Começar" de sempre, sem pedir a senha de novo', doTime === false && semSenhaDeNovo(email));
      await page.waitForURL(/\/home/, { timeout: 30000 }).catch(() => {});
      t('app · sem convite · termina no Início', new URL(page.url()).pathname === '/home', page.url());
      t('app · sem convite · e fora do time (não veio de convite)', !(await naTabelaDoTime(conta)));
      t('app · sem convite · o bilhete do código some depois de confirmar', (await page.evaluate(() => localStorage.getItem('futty_cadastro_pendente'))) === null);
      t('app · sem convite · sem erro de página', app.estado.erros.length === 0, app.estado.erros.slice(0, 3).join(' | '));
      await app.ctx.close();
    }

    // ── 2. APP (iPhone), COM convite: o link abre no app → Criar conta e entrar → código → boas-vindas do time → team_members ─────────────────
    {
      const conta = 'appCom';
      const email = dados.pessoas[conta].email;
      const app = await abrir({ aparelho: 'iphone', nativo: 'ios', conta });
      await app.page.goto(`${base}/`, { waitUntil: 'domcontentloaded' });
      await app.page.waitForFunction(() => window.__ouvintesNativos?.('appUrlOpen') > 0, null, { timeout: 30000 });
      await app.page.evaluate((url) => window.__eventoNativo('appUrlOpen', { url }), linkDoConvite);
      const criar = app.page.getByRole('button', { name: 'Criar conta e entrar' });
      await criar.waitFor({ timeout: 30000 });
      await criar.click();
      await cadastrar(app.page, email);
      const tela = await telaDoCodigo(app.page, email);
      t('app · com convite · depois do cadastro, a tela do código', tela.apareceu && tela.doEmail, tela.texto);
      await digitar(app.page, caixa[email].codigo);
      const doTime = await terminarCadastro(app.page, 'Diego');
      t('app · com convite · código certo → o onboarding abre nas boas-vindas DO TIME', doTime === true);
      await app.page.waitForURL(new RegExp(`/time/${slug}`), { timeout: 30000 }).catch(() => {});
      t('app · com convite · termina dentro do time', new RegExp(`/time/${slug}$`).test(new URL(app.page.url()).pathname), app.page.url());
      t('app · com convite · a pessoa está na tabela team_members do time', await naTabelaDoTime(conta));
      t('app · com convite · sem pedir a senha de novo', semSenhaDeNovo(email));
      await foto(app.page, '2-app-iphone-com-convite-no-time');
      t('app · com convite · sem erro de página', app.estado.erros.length === 0, app.estado.erros.slice(0, 3).join(' | '));
      await app.ctx.close();
    }

    // ── 3. APP (Android, 360 px): código ERRADO, código VENCIDO, Reenviar, código novo ───────────────────────────────────────────────────────
    {
      const conta = 'erros';
      const email = dados.pessoas[conta].email;
      const app = await abrir({ aparelho: 'android', nativo: 'android', conta });
      await app.page.goto(`${base}/register`, { waitUntil: 'domcontentloaded' });
      await cadastrar(app.page, email);
      const tela = await telaDoCodigo(app.page, email);
      t('app Android · a tela do código em 360 px, sem rolar para o lado', tela.apareceu && tela.semRolarDeLado, JSON.stringify(tela.largura));
      const certo = caixa[email].codigo;
      const errado = certo === '111111' ? '222222' : '111111';
      await digitar(app.page, errado);
      const frase1 = await erroNaTela(app.page);
      t('app Android · código errado → "Código errado. Confira os 6 números do e-mail mais recente."', frase1 === FRASE_ERRADO, String(frase1));
      t('app Android · código errado → continua na tela do código, sem sessão', /\/register$/.test(new URL(app.page.url()).pathname) && !(await app.page.evaluate(() => Object.keys(localStorage).some((k) => k.endsWith('-auth-token')))));
      await foto(app.page, '3-app-android-codigo-errado');

      // Duas horas depois (o código vale 1 h): a pessoa volta ao app (reabre) e digita o código que tinha.
      caixa[email].enviadoEm -= 2 * VALIDADE_MS;
      caixa[email].ultimoPedido -= 2 * VALIDADE_MS;
      await app.page.evaluate((ms) => {
        const b = JSON.parse(localStorage.getItem('futty_cadastro_pendente'));
        localStorage.setItem('futty_cadastro_pendente', JSON.stringify({ ...b, em: b.em - ms }));
      }, 2 * VALIDADE_MS);
      await app.page.reload({ waitUntil: 'domcontentloaded' });
      await telaDoCodigo(app.page, email);
      await digitar(app.page, certo);
      const frase2 = await erroNaTela(app.page);
      t('app Android · código vencido → "Esse código venceu. Toque em "Reenviar código" para receber um novo."', frase2 === FRASE_VENCEU, String(frase2));
      await foto(app.page, '4-app-android-codigo-vencido');

      const reenviar = app.page.locator('[data-reenviar-codigo]');
      t('app Android · passado o minuto, "Reenviar código" está livre', (await reenviar.innerText()) === 'Reenviar código' && !(await reenviar.isDisabled()), await reenviar.innerText());
      const enviosAntes = caixa[email].envios;
      await reenviar.click();
      await app.page.getByText('Mandamos um código novo. Use o do e-mail mais recente.').waitFor({ timeout: 10000 }).catch(() => {});
      t('app Android · "Reenviar código" manda outro e-mail (com o destino do link) e avisa', caixa[email].envios === enviosAntes + 1 && (await app.page.getByText('Mandamos um código novo.', { exact: false }).count()) === 1
        && !!pedidos.filter((p) => p.tipo === 'resend' && p.email === email).at(-1)?.redirect?.endsWith('/onboarding'));
      t('app Android · e volta a esperar 60 s', /Reenviar código em \d+s/.test(await reenviar.innerText()) && await reenviar.isDisabled(), await reenviar.innerText());
      await foto(app.page, '5-app-android-codigo-reenviado');
      t('app Android · o código antigo não vale mais', certo !== caixa[email].codigo);
      await digitar(app.page, caixa[email].codigo);
      await terminarCadastro(app.page, 'Renato');
      await app.page.waitForURL(/\/home/, { timeout: 30000 }).catch(() => {});
      t('app Android · com o código novo, dentro do app (Início)', new URL(app.page.url()).pathname === '/home', app.page.url());
      t('app Android · sem erro de página', app.estado.erros.length === 0, app.estado.erros.slice(0, 3).join(' | '));
      await app.ctx.close();
    }

    // ── 4. SITE (computador), SEM convite: o mesmo fluxo; o código colado com espaço ─────────────────────────────────────────────────────────
    {
      const conta = 'siteSem';
      const email = dados.pessoas[conta].email;
      const site = await abrir({ aparelho: 'pc', conta });
      await site.page.goto(`${base}/register`, { waitUntil: 'domcontentloaded' });
      await cadastrar(site.page, email);
      const tela = await telaDoCodigo(site.page, email);
      t('site · sem convite · a mesma tela do código no navegador do computador', tela.apareceu && tela.doEmail, tela.texto);
      await foto(site.page, '6-site-pc-tela-do-codigo');
      const c = caixa[email].codigo;
      await digitar(site.page, `${c.slice(0, 3)} ${c.slice(3)}`);
      t('site · sem convite · o código colado com espaço ("123 456") vale', await site.page.waitForURL(/\/onboarding/, { timeout: 20000 }).then(() => true, () => false), site.page.url());
      const doTime = await terminarCadastro(site.page, 'Felipe');
      await site.page.waitForURL(/\/home/, { timeout: 30000 }).catch(() => {});
      t('site · sem convite · onboarding comum e Início, sem senha de novo', doTime === false && new URL(site.page.url()).pathname === '/home' && semSenhaDeNovo(email), site.page.url());
      t('site · sem convite · sem erro de página', site.estado.erros.length === 0, site.estado.erros.slice(0, 3).join(' | '));
      await site.ctx.close();
    }

    // ── 5. SITE (celular Android), COM convite: "Continuar pelo site" → Criar conta e entrar → código → team_members ──────────────────────────
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
      const tela = await telaDoCodigo(site.page, email);
      t('site · com convite · a tela do código no navegador do celular (360 px, sem rolar para o lado)', tela.apareceu && tela.doEmail && tela.semRolarDeLado, tela.texto);
      await digitar(site.page, caixa[email].codigo);
      const doTime = await terminarCadastro(site.page, 'Caio');
      await site.page.waitForURL(new RegExp(`/time/${slug}`), { timeout: 30000 }).catch(() => {});
      t('site · com convite · boas-vindas do time e termina dentro dele', doTime === true && new RegExp(`/time/${slug}$`).test(new URL(site.page.url()).pathname), site.page.url());
      t('site · com convite · a pessoa está na tabela team_members do time', await naTabelaDoTime(conta));
      t('site · com convite · sem erro de página', site.estado.erros.length === 0, site.estado.erros.slice(0, 3).join(' | '));
      await site.ctx.close();
    }

    // ── 6. Entrar com senha numa conta que nunca digitou o código (aparelho novo, sem bilhete) ──────────────────────────────────────────────
    {
      const conta = 'semConfirmar';
      const email = dados.pessoas[conta].email;
      mandarEmail(email, Date.now() - 10 * 60000); // cadastrou há 10 min em outro aparelho e não confirmou
      const antigo = caixa[email].codigo;
      const site = await abrir({ aparelho: 'pc', conta });
      await site.page.goto(`${base}/login`, { waitUntil: 'domcontentloaded' });
      await site.page.locator('input[placeholder="seu@email.com"]').fill(email);
      await site.page.locator('input[placeholder="••••••••"]').fill(SENHA);
      await site.page.locator('button[type="submit"]').click();
      const tela = await telaDoCodigo(site.page, email);
      const aviso = await site.page.getByText('Falta confirmar seu e-mail. Mandamos um código novo.').count();
      t('Entrar · conta sem confirmar → código novo e a tela do código (com "Falta confirmar seu e-mail"), sem o "Email not confirmed" em inglês',
        tela.apareceu && tela.doEmail && aviso === 1 && caixa[email].codigo !== antigo && (await site.page.getByText('Email not confirmed').count()) === 0, tela.texto);
      await foto(site.page, '7-entrar-conta-sem-confirmar');
      await digitar(site.page, caixa[email].codigo);
      t('Entrar · código certo → onboarding (a conta nasceu agora)', await site.page.waitForURL(/\/onboarding/, { timeout: 20000 }).then(() => true, () => false), site.page.url());
      await site.ctx.close();
    }

    // ── 7. Cadastro com e-mail que já tem conta: frase clara, sem tela de código ─────────────────────────────────────────────────────────────
    {
      const site = await abrir({ aparelho: 'pc', conta: null });
      await site.page.goto(`${base}/register`, { waitUntil: 'domcontentloaded' });
      await cadastrar(site.page, JA_TEM_CONTA);
      const frase = site.page.getByText('Esse e-mail já tem conta no Futty.', { exact: false });
      const viu = await frase.waitFor({ timeout: 15000 }).then(() => true, () => false);
      t('cadastro com e-mail que já tem conta → "Esse e-mail já tem conta no Futty…", sem esperar código', viu && (await site.page.locator('[data-confirmar-codigo]').count()) === 0);
      await site.ctx.close();
    }

    // ── 8. O link antigo continua: no site (mesmo navegador) e, no app, entrar com a senha depois do link ──────────────────────────────────
    {
      const conta = 'linkAntigo';
      const email = dados.pessoas[conta].email;
      const site = await abrir({ aparelho: 'pc', conta });
      await site.page.goto(`${base}/register`, { waitUntil: 'domcontentloaded' });
      await cadastrar(site.page, email);
      await telaDoCodigo(site.page, email);
      // A pessoa tocou no link de um e-mail antigo: o Supabase confirma e devolve o navegador para /onboarding?code=…
      caixa[email].confirmado = true;
      await site.page.goto(`${base}/onboarding?code=codigo-do-link`, { waitUntil: 'domcontentloaded' });
      const comecar = await site.page.getByRole('button', { name: 'Começar' }).waitFor({ timeout: 30000 }).then(() => true, () => false);
      const troca = pedidos.find((p) => p.tipo === 'pkce');
      t('link antigo · no site: o link troca o code pela sessão (com o verificador guardado no cadastro) e abre o onboarding', comecar && troca?.verificador === true, JSON.stringify({ url: site.page.url(), troca }));
      await site.ctx.close();
    }
    {
      const conta = 'linkNoApp';
      const email = dados.pessoas[conta].email;
      const app = await abrir({ aparelho: 'iphone', nativo: 'ios', conta });
      await app.page.goto(`${base}/register`, { waitUntil: 'domcontentloaded' });
      await cadastrar(app.page, email);
      await telaDoCodigo(app.page, email);
      caixa[email].confirmado = true; // confirmou pelo link de um e-mail antigo, no navegador
      await app.page.getByRole('button', { name: 'Entrar com a senha' }).click();
      await app.page.getByText('Bem-vindo de volta', { exact: false }).waitFor({ timeout: 20000 });
      const emailNoCampo = await app.page.locator('input[placeholder="seu@email.com"]').inputValue();
      await app.page.locator('input[placeholder="••••••••"]').fill(SENHA);
      await app.page.locator('button[type="submit"]').click();
      const chegou = await app.page.waitForURL(/\/onboarding/, { timeout: 30000 }).then(() => true, () => false);
      t('link antigo · no app: "Confirmou pelo link do e-mail? Entrar com a senha" leva ao Entrar com o e-mail preenchido, e a senha entra no onboarding',
        emailNoCampo === email && chegou, JSON.stringify({ emailNoCampo, url: app.page.url() }));
      await app.ctx.close();
    }

    const verificacoes = pedidos.filter((p) => p.tipo === 'verify');
    t(`todo código foi conferido como tipo 'signup' (${verificacoes.length} conferências)`, verificacoes.length > 0 && verificacoes.every((p) => p.type === 'signup'));
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
