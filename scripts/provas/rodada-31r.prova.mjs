// Prova no navegador da Rodada 31R — o convite não pode se perder na instalação. O caminho inteiro, com o app de verdade num Chromium que se
// declara iPhone ou Android, por e-mail, Google e Apple:
//   · SEM o app instalado: o link do convite abre no navegador do celular, a pessoa toca em "Baixar o Futty" (o link do convite fica copiado),
//     instala, abre o app (outro armazenamento: o convite que o navegador guardou não está lá), cria a conta, termina o cadastro e cai no
//     Início sem time — o cartão "Recebeu um convite?" já vem com o link colado; "Entrar no time" a põe no time;
//   · COM o app instalado e sem sessão: o link abre no app (evento appUrlOpen), "Criar conta e entrar", a conta nasce, o cadastro abre nas
//     boas-vindas do time e termina dentro dele, sozinho;
//   · no fim de cada caminho: a pessoa está nos membros do time (pelo motor) e no Ranking, com "—" nos pontos.
// A causa (Rodada 31R): a página do convite guarda o convite no armazenamento do NAVEGADOR; o app instalado tem o seu próprio, vazio.
// Desde a 31U o motor guarda o convite aberto no celular e o app o acha sozinho (prova rodada-31u). Esta passou a ser a prova do PLANO B:
// o motor daqui está sem a tabela do convite pendente (migração 084 por aplicar, ou a rede mudou entre abrir o link e cadastrar) e o
// convite volta pelo link copiado e pelo cartão "Recebeu um convite?".
//
// Como: o motor de VERDADE sobe num processo à parte sobre banco e Auth de mentira (scripts/provas/_motor-31r.cjs → backend/tests/_appFalsa.js).
// O Supabase do navegador é respondido aqui (cadastro, o link do e-mail, a troca do código do Google, o token da Apple) com a sessão da conta
// da vez, que o motor de mentira aceita. O lado nativo é de mentira (a ponte de verdade do Capacitor por cima): o Browser do Google, a folha
// da Apple e os links que o sistema entrega ao app (appUrlOpen). A área de transferência é a do "sistema": uma só, para o navegador e o app.
// Nada sai da máquina.
//
// Uso: npm run provar:navegador -- rodada-31r      (~3 min)
//      R31R_FOTOS=pasta  salva as fotos dos passos principais
import { spawn } from 'node:child_process';
import { readFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const nome = 'Rodada 31R · o convite sobrevive a "link → loja → instalar → criar conta" (e-mail, Google e Apple; motor de verdade, banco falso)';

const RAIZ = fileURLToPath(new URL('../../', import.meta.url));
const MOTOR = path.join(RAIZ, 'scripts', 'provas', '_motor-31r.cjs');
const BACKEND_AO_LADO = path.resolve(RAIZ, '..', 'backend', 'tests', '_appFalsa.js');
const SUPABASE = new URL((readFileSync(new URL('../../.env', import.meta.url), 'utf8').match(/^VITE_SUPABASE_URL=(.+)$/m)?.[1] || 'https://prova.supabase.co').trim());
const PONTE_DO_CAPACITOR = readFileSync(path.join(RAIZ, 'node_modules', '@capacitor', 'ios', 'Capacitor', 'Capacitor', 'assets', 'native-bridge.js'), 'utf8');
const FOTOS = process.env.R31R_FOTOS || '';
const SENHA = 'segredo123';

const UA_IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.7 Mobile/15E148 Safari/604.1';
const UA_ANDROID = 'Mozilla/5.0 (Linux; Android 14; SM-A146B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36';
const APARELHOS = {
  iphone: { userAgent: UA_IPHONE, viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  android: { userAgent: UA_ANDROID, viewport: { width: 360, height: 780 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
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

/**
 * O lado nativo do app da loja (como na prova 31N), com os plugins que o caminho do convite usa: App (os links que o sistema entrega), Browser
 * (a aba do Google) e SignInWithApple (a folha da Apple). Toda chamada responde "ok"; a folha da Apple devolve um identityToken; addListener
 * fica guardado e `window.__eventoNativo(nome, dados)` responde por ele.
 */
function ladoNativo(plataforma) {
  const ouvintes = {};
  window.__chamadasNativas = [];
  const RESPOSTAS = { 'SignInWithApple.authorize': { response: { identityToken: 'token-da-apple', givenName: null, familyName: null, email: null } } };
  const responder = (m, extra) => window.Capacitor.fromNative({ callbackId: m.callbackId, pluginId: m.pluginId, methodName: m.methodName, success: true, ...extra });
  const ponte = { postMessage(msg) {
    const m = typeof msg === 'string' ? JSON.parse(msg) : msg;
    window.__chamadasNativas.push(`${m.pluginId}.${m.methodName}`);
    if (m.methodName === 'addListener') { (ouvintes[m.options?.eventName] ||= []).push(m); return; }
    if (m.callbackId && m.callbackId !== '-1') setTimeout(() => { try { responder(m, { save: false, data: RESPOSTAS[`${m.pluginId}.${m.methodName}`] || {} }); } catch { /* sem ponte */ } }, 0);
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
    ],
  };
}

/**
 * A área de transferência do "sistema": uma só para o navegador e o app (o celular é um só). `modo: 'toque'` imita o iPhone: ler sem um toque da
 * pessoa é recusado (NotAllowedError); 'livre' imita quem já deu permissão.
 */
function areaDeTransferencia(modo) {
  // "Dentro de um toque": só durante o próprio clique (o Chromium herdaria a ativação do toque da tela anterior; o iPhone não).
  let noToque = false;
  window.addEventListener('click', () => { noToque = true; setTimeout(() => { noToque = false; }, 0); }, true);
  const falsa = {
    writeText: (t) => window.__copiar(String(t)),
    readText: () => {
      if (modo === 'toque' && !noToque) return Promise.reject(new DOMException('Read permission denied.', 'NotAllowedError'));
      return window.__colar();
    },
  };
  Object.defineProperty(navigator, 'clipboard', { value: falsa, configurable: true });
}

const usuarioDoAuth = (pessoa, provedor) => ({
  id: pessoa.id, aud: 'authenticated', role: 'authenticated', email: pessoa.email, app_metadata: { provider: provedor, providers: [provedor] },
  user_metadata: {}, identities: [{ id: pessoa.id, user_id: pessoa.id, provider: provedor }], created_at: '2026-10-15T12:00:00Z', confirmation_sent_at: '2026-10-15T12:00:00Z',
});

export async function rodar({ navegador, base, t }) {
  try { readFileSync(BACKEND_AO_LADO); } catch { t('o backend não está ao lado (FUTTY-V2/backend): a prova foi pulada', true); return; }
  const { filho, dados } = await subirMotor();
  const { slug } = dados.time;
  const linkDoConvite = `https://futtyapp.com.br/c/${slug}-${dados.convite.codigo}`;
  if (FOTOS) mkdirSync(FOTOS, { recursive: true });
  const foto = async (page, rotulo) => { if (FOTOS) { await page.waitForTimeout(500); await page.screenshot({ path: path.join(FOTOS, `${rotulo}.png`) }); } };
  const hostDoVite = new URL(base).host;
  const externos = [];
  const sistema = { area: '' }; // a área de transferência do celular

  /** Um "aparelho": o navegador do celular (nativo = null) ou o app da loja (nativo = 'ios' | 'android'), com armazenamento próprio. */
  async function abrir({ aparelho, nativo = null, conta = null, provedor = 'email', modoColar = 'livre' }) {
    const ctx = await navegador.newContext({ ...APARELHOS[aparelho], locale: 'pt-BR', timezoneId: 'America/Sao_Paulo', serviceWorkers: 'block', reducedMotion: 'reduce' });
    const estado = { conta, provedor, grants: [], lojas: [], erros: [] };
    await ctx.exposeBinding('__copiar', (_f, texto) => { sistema.area = texto; });
    await ctx.exposeBinding('__colar', () => sistema.area);
    if (nativo) {
      await ctx.addInitScript(ladoNativo, nativo === 'ios' ? 'ios' : 'android');
      await ctx.addInitScript({ content: PONTE_DO_CAPACITOR });
    }
    await ctx.addInitScript(areaDeTransferencia, modoColar);
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
          if (url.pathname === '/auth/v1/signup') { estado.grants.push('signup'); return await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(user) }); }
          if (url.pathname === '/auth/v1/token' || url.pathname === '/auth/v1/verify') {
            estado.grants.push(url.pathname.endsWith('/verify') ? 'verify' : url.searchParams.get('grant_type'));
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

  const membrosDoTime = async () => {
    const r = await fetch(`${dados.base}/api/teams/${slug}`, { headers: { authorization: `Bearer ${dados.tokens.adm}` } });
    const j = await r.json().catch(() => null);
    return (j?.members || []).map((m) => m.user_id || m.users?.id || m.id);
  };
  const noTime = async (conta) => (await membrosDoTime()).includes(dados.pessoas[conta].id);

  /** As três formas de entrar, a partir da tela de cadastro (ou da página inicial) do app. */
  async function entrar(page, estado, forma) {
    if (forma === 'email') {
      if (!/\/register/.test(page.url())) await page.evaluate(() => { window.history.pushState({}, '', '/register'); window.dispatchEvent(new PopStateEvent('popstate')); });
      await page.locator('input[placeholder="seu@email.com"]').waitFor({ timeout: 20000 });
      await page.locator('input[placeholder="seu@email.com"]').fill(dados.pessoas[estado.conta].email);
      await page.locator('input[placeholder="Mínimo 6 caracteres"]').fill(SENHA);
      await page.locator('input[placeholder="••••••••"]').fill(SENHA);
      const rolos = page.locator('[data-rolinhos] [role="listbox"]');
      for (let i = 0; i < 3; i += 1) await rolos.nth(i).locator('[aria-selected="true"]').click();
      await rolos.nth(2).focus();
      for (let i = 0; i < 8; i += 1) await page.keyboard.press('ArrowUp');
      await page.locator('input[type="checkbox"]').check();
      await page.locator('button[type="submit"]').click();
      // A confirmação por e-mail está ligada: a conta nasce sem sessão e o botão do e-mail abre o app (o sistema entrega o link pelo
      // appUrlOpen) ou, no navegador, a página /c/confirmar (o caminho do link em si — vencido, já usado, outro aparelho — é a prova rodada-31s).
      await page.locator('[data-espera-do-email]').waitFor({ timeout: 20000 });
      const link = 'https://futtyapp.com.br/c/confirmar?token_hash=pkce_a3f9c1e07b5d42e98f61c0d3b7a2e5f4c9d8b1a0e6f3c2d5b4a7e8f9&type=signup';
      await page.evaluate((url) => {
        if (window.__eventoNativo) { window.__eventoNativo('appUrlOpen', { url }); return; }
        const u = new URL(url);
        window.history.pushState({}, '', u.pathname + u.search);
        window.dispatchEvent(new PopStateEvent('popstate'));
      }, link);
      return;
    }
    if (forma === 'google') {
      await page.getByRole('button', { name: /com Google/ }).first().click();
      // A aba do Google abriu (Browser.open); a pessoa escolhe a conta e o sistema devolve o app pelo esquema do app (appUrlOpen).
      await page.waitForFunction(() => window.__chamadasNativas?.includes('Browser.open'), null, { timeout: 15000 });
      await page.evaluate(() => window.__eventoNativo('appUrlOpen', { url: 'com.futty.app://auth/callback?code=codigo-do-google' }));
      return;
    }
    // Apple: a folha do sistema devolve o identityToken; a sessão nasce no Supabase.
    await page.getByRole('button', { name: /com a Apple/ }).first().click();
  }

  /** O cadastro do Futty (onboarding) até o fim: boas-vindas (do time, se o convite está no aparelho), foto depois, o nome, Entrar. */
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

  /** O Ranking do time, aberto no app: a linha da pessoa e os pontos dela. */
  async function linhaNoRanking(page, apelido) {
    await page.goto(`${base}/time/${slug}/ranking`, { waitUntil: 'domcontentloaded' });
    await page.locator('.rank-list .rank-row').first().waitFor({ timeout: 30000 });
    await page.waitForTimeout(800);
    return page.evaluate((a) => {
      const row = [...document.querySelectorAll('.rank-list .rank-row')].find((r) => r.querySelector('.rank-name')?.childNodes[0]?.textContent?.trim() === a);
      return row ? { pontos: row.querySelector('[data-pontos]')?.innerText.trim() } : { semLinha: [...document.querySelectorAll('.rank-list .rank-row .rank-name')].map((n) => n.innerText), url: location.pathname };
    }, apelido);
  }

  const CAMINHOS = [
    { forma: 'email', aparelho: 'iphone', nativo: 'ios', sem: 'lojaEmail', com: 'appEmail', apelidos: ['Miguel', 'Bruno'] },
    { forma: 'google', aparelho: 'android', nativo: 'android', sem: 'lojaGoogle', com: 'appGoogle', apelidos: ['Motta', 'Gabriel'] },
    { forma: 'apple', aparelho: 'iphone', nativo: 'ios', sem: 'lojaApple', com: 'appApple', apelidos: ['Marquinhos', 'Thiago'] },
  ];

  try {
    for (const c of CAMINHOS) {
      const rotulo = `${c.forma} (${c.aparelho})`;

      // ── SEM o app: o link abre no navegador do celular ─────────────────────────────────────────────────────────────────
      {
        sistema.area = '';
        const nav = await abrir({ aparelho: c.aparelho });
        await nav.page.goto(`${base}/c/${slug}-${dados.convite.codigo}`, { waitUntil: 'domcontentloaded' });
        const baixar = nav.page.getByRole('link', { name: 'Baixar o Futty' });
        await baixar.waitFor({ timeout: 40000 });
        const bilheteNoNavegador = await nav.page.evaluate(() => localStorage.getItem('futty_convite_pendente'));
        t(`sem app · ${rotulo} · o convite abre no navegador com "Baixar o Futty", e o NAVEGADOR guarda o convite`, !!bilheteNoNavegador, String(bilheteNoNavegador));
        await foto(nav.page, `${c.forma}-1-convite-no-navegador`);
        await baixar.click();
        await nav.page.waitForURL(/apps\.apple\.com|play\.google\.com/, { timeout: 15000 }).catch(() => {});
        t(`sem app · ${rotulo} · "Baixar o Futty" leva à loja e deixa o link do convite copiado`, nav.estado.lojas.length === 1 && sistema.area === linkDoConvite, JSON.stringify({ lojas: nav.estado.lojas, area: sistema.area }));
        await nav.ctx.close();

        // Instalou: o app abre pela primeira vez, com o armazenamento DELE (vazio).
        const app = await abrir({ aparelho: c.aparelho, nativo: c.nativo, conta: c.sem, provedor: c.forma, modoColar: c.nativo === 'ios' ? 'toque' : 'livre' });
        await app.page.goto(`${base}/`, { waitUntil: 'domcontentloaded' });
        await app.page.waitForFunction(() => window.__ouvintesNativos?.('appUrlOpen') > 0, null, { timeout: 30000 });
        const bilheteNoApp = await app.page.evaluate(() => localStorage.getItem('futty_convite_pendente'));
        t(`sem app · ${rotulo} · CAUSA: o app instalado não tem o convite que o navegador guardou`, bilheteNoApp === null, String(bilheteNoApp));
        await entrar(app.page, app.estado, c.forma);
        const doTime = await terminarCadastro(app.page, c.apelidos[0]);
        t(`sem app · ${rotulo} · o cadastro abre no "Começar" de sempre (o app não sabe do convite)`, doTime === false);
        await app.page.waitForURL(/\/home/, { timeout: 30000 });
        t(`sem app · ${rotulo} · terminou o cadastro e NÃO está no time (o sintoma de produção)`, !(await noTime(c.sem)));

        // O conserto: o Início de quem não tem time mostra o cartão do convite; o link copiado entra no campo.
        const cartao = app.page.locator('[data-cartao-convite]');
        const temCartao = await cartao.waitFor({ timeout: 20000 }).then(() => true, () => false);
        t(`sem app · ${rotulo} · o Início sem time mostra "Recebeu um convite?"`, temCartao);
        if (temCartao) {
          const campo = cartao.locator('[data-link-do-convite]');
          if (c.nativo === 'ios') {
            // iPhone: ler a área de transferência sem toque é recusado; "Colar" (um toque) preenche.
            t(`sem app · ${rotulo} · no iPhone o campo nasce vazio (ler sem toque é recusado) e há o botão "Colar"`, (await campo.inputValue()) === '' && (await cartao.getByRole('button', { name: 'Colar' }).count()) === 1, await campo.inputValue());
            await cartao.getByRole('button', { name: 'Colar' }).click();
          }
          await app.page.waitForFunction(() => document.querySelector('[data-cartao-convite] [data-link-do-convite]')?.value, null, { timeout: 5000 }).catch(() => {});
          t(`sem app · ${rotulo} · o link copiado entra no campo`, (await campo.inputValue()) === linkDoConvite, await campo.inputValue());
          await foto(app.page, `${c.forma}-2-cartao-do-convite`);
          await cartao.getByRole('button', { name: 'Entrar no time' }).click();
          await app.page.waitForURL(new RegExp(`/time/${slug}`), { timeout: 20000 }).catch(() => {});
          t(`sem app · ${rotulo} · "Entrar no time" leva ao time`, new RegExp(`/time/${slug}$`).test(new URL(app.page.url()).pathname), app.page.url());
        }
        t(`sem app · ${rotulo} · a pessoa está nos membros do time (motor)`, await noTime(c.sem));
        const linha = await linhaNoRanking(app.page, c.apelidos[0]).catch((e) => ({ erro: e.message.split('\n')[0] }));
        t(`sem app · ${rotulo} · e no Ranking, com "—" nos pontos`, linha?.pontos === '—', JSON.stringify(linha));
        if (FOTOS) await foto(app.page, `${c.forma}-3-ranking`);
        t(`sem app · ${rotulo} · sem erro de página`, app.estado.erros.length === 0, app.estado.erros.slice(0, 3).join(' | '));
        await app.ctx.close();
      }

      // ── COM o app instalado e sem sessão: o link abre no app ───────────────────────────────────────────────────────────
      {
        sistema.area = '';
        const app = await abrir({ aparelho: c.aparelho, nativo: c.nativo, conta: c.com, provedor: c.forma });
        await app.page.goto(`${base}/`, { waitUntil: 'domcontentloaded' });
        await app.page.waitForFunction(() => window.__ouvintesNativos?.('appUrlOpen') > 0, null, { timeout: 30000 });
        await app.page.evaluate((url) => window.__eventoNativo('appUrlOpen', { url }), linkDoConvite);
        const criar = app.page.getByRole('button', { name: 'Criar conta e entrar' });
        await criar.waitFor({ timeout: 30000 });
        t(`com app · ${rotulo} · o link abre o convite no app (sem "Baixar o Futty")`, (await app.page.getByText('Baixar o Futty').count()) === 0);
        await criar.click();
        await entrar(app.page, app.estado, c.forma);
        const doTime = await terminarCadastro(app.page, c.apelidos[1]);
        t(`com app · ${rotulo} · o cadastro abre nas boas-vindas do time`, doTime === true);
        await app.page.waitForURL(new RegExp(`/time/${slug}`), { timeout: 30000 }).catch(() => {});
        t(`com app · ${rotulo} · terminou o cadastro já dentro do time`, new RegExp(`/time/${slug}$`).test(new URL(app.page.url()).pathname), app.page.url());
        t(`com app · ${rotulo} · a pessoa está nos membros do time (motor)`, await noTime(c.com));
        const linha = await linhaNoRanking(app.page, c.apelidos[1]).catch((e) => ({ erro: e.message.split('\n')[0] }));
        t(`com app · ${rotulo} · e no Ranking, com "—" nos pontos`, linha?.pontos === '—', JSON.stringify(linha));
        t(`com app · ${rotulo} · a sessão nasceu pelo caminho da forma de entrar (${app.estado.grants.join(', ')})`,
          c.forma === 'email' ? app.estado.grants.includes('signup') && app.estado.grants.includes('verify') : c.forma === 'google' ? app.estado.grants.includes('pkce') : app.estado.grants.includes('id_token'));
        t(`com app · ${rotulo} · sem erro de página`, app.estado.erros.length === 0, app.estado.erros.slice(0, 3).join(' | '));
        await app.ctx.close();
      }
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
