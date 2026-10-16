// Prova no navegador da Rodada 31U — quem entrou pelo link do time TEM de entrar no time, sem SQL; presença só depois do jogo; idade 13+.
//   · os 6 caminhos do convite (SEM o app: link no navegador → loja → app; COM o app: o link abre nele) × (e-mail, Google, Apple), cada um terminando
//     nos membros do time (motor) e no Ranking. Sem o app, quem acha o convite é o MOTOR (a página do convite o avisou; mesma rede e plataforma):
//     o cadastro abre nas boas-vindas do time, sem colar nada;
//   · a pessoa que abriu convites de DOIS times escolhe ("Qual time te convidou?");
//   · "Validando convite…" que trava (o pedido com a sessão nunca volta): a 2ª tentativa sai sozinha, sem a sessão; com as duas presas, aparece
//     "Tentar de novo", que funciona;
//   · Gabinete → "Contas sem time": a conta perdida aparece, "Pôr no time…" a põe no time (membros e Ranking);
//   · presença: quem só confirmou o jogo de daqui a 2 dias está com "—" no Ranking; passado o horário (relógio do motor adiantado), pontua;
//   · idade: 13 anos entra (e-mail e Google), 12 não (o cadastro por e-mail nem sai; pelo Google o motor apaga a conta e o login explica).
//
// Como: o motor de VERDADE num processo à parte sobre banco e Auth de mentira (scripts/provas/_motor-31u.cjs → backend/tests/_appFalsa.js). O
// Supabase do navegador é respondido aqui com a sessão da conta da vez. O lado nativo é de mentira (a ponte de verdade do Capacitor por cima).
// Nada sai da máquina. O caminho do PLANO B (motor sem a tabela 084: link copiado + cartão "Recebeu um convite?") é a prova rodada-31r.
//
// Uso: npm run provar:navegador -- rodada-31u      (~5 min)
//      R31U_FOTOS=pasta  salva as fotos dos passos principais
import { spawn } from 'node:child_process';
import { readFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const nome = 'Rodada 31U · convite à prova de falhas (6 caminhos + escolha + travado), Contas sem time, presença só depois do jogo, idade 13+ (motor de verdade, banco falso)';

const RAIZ = fileURLToPath(new URL('../../', import.meta.url));
const MOTOR = path.join(RAIZ, 'scripts', 'provas', '_motor-31u.cjs');
const BACKEND_AO_LADO = path.resolve(RAIZ, '..', 'backend', 'tests', '_appFalsa.js');
const SUPABASE = new URL((readFileSync(new URL('../../.env', import.meta.url), 'utf8').match(/^VITE_SUPABASE_URL=(.+)$/m)?.[1] || 'https://prova.supabase.co').trim());
const PONTE_DO_CAPACITOR = readFileSync(path.join(RAIZ, 'node_modules', '@capacitor', 'ios', 'Capacitor', 'Capacitor', 'assets', 'native-bridge.js'), 'utf8');
const FOTOS = process.env.R31U_FOTOS || '';
const SENHA = 'segredo123';
const MSG_MENOR = 'O Futty é para quem tem 13 anos ou mais.';
// R31U_SO=convite,escolha,travado,gabinete,idade,presenca roda só essas seções (para depurar).
const SO = String(process.env.R31U_SO || '').split(',').filter(Boolean);
const roda = (secao) => !SO.length || SO.includes(secao);

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
/** Manda um comando ao motor e espera a linha de JSON que começa com {"<chave>". */
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

// ─── O lado nativo e a área de transferência (as mesmas da prova 31R) ───────────────────────────────────────────────────────────
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
function areaDeTransferencia() {
  const falsa = { writeText: (t) => window.__copiar(String(t)), readText: () => window.__colar() };
  Object.defineProperty(navigator, 'clipboard', { value: falsa, configurable: true });
}

const usuarioDoAuth = (pessoa, provedor) => ({
  id: pessoa.id, aud: 'authenticated', role: 'authenticated', email: pessoa.email, app_metadata: { provider: provedor, providers: [provedor] },
  user_metadata: {}, identities: [{ id: pessoa.id, user_id: pessoa.id, provider: provedor }], created_at: '2026-10-16T12:00:00Z', confirmation_sent_at: '2026-10-16T12:00:00Z',
});

const dois = (n) => String(n).padStart(2, '0');
/** A data de quem faz `anos` anos HOJE (UTC, a régua do app e do motor), deslocada `dias`. */
function nascimento(anos, dias = 0) {
  const h = new Date();
  const d = new Date(Date.UTC(h.getUTCFullYear() - anos, h.getUTCMonth(), h.getUTCDate() + dias));
  return { dia: d.getUTCDate(), mes: d.getUTCMonth() + 1, ano: d.getUTCFullYear(), texto: `${d.getUTCFullYear()}-${dois(d.getUTCMonth() + 1)}-${dois(d.getUTCDate())}` };
}

export async function rodar({ navegador, base, t }) {
  try { readFileSync(BACKEND_AO_LADO); } catch { t('o backend não está ao lado (FUTTY-V2/backend): a prova foi pulada', true); return; }
  const { filho, dados } = await subirMotor();
  const { slug } = dados.time;
  const slug2 = dados.time2.slug;
  const linkDoConvite = `https://futtyapp.com.br/c/${slug}-${dados.convite.codigo}`;
  const linkDoConvite2 = `https://futtyapp.com.br/c/${slug2}-${dados.convite2.codigo}`;
  if (FOTOS) mkdirSync(FOTOS, { recursive: true });
  const foto = async (page, rotulo) => { if (FOTOS) { await page.waitForTimeout(500); await page.screenshot({ path: path.join(FOTOS, `${rotulo}.png`) }); } };
  const hostDoVite = new URL(base).host;
  const externos = [];
  const sistema = { area: '' };

  /**
   * Um "aparelho": o navegador do celular (nativo = null), o app da loja (nativo = 'ios' | 'android') ou o computador, com armazenamento próprio.
   * `segurar(url, req)` devolve true para um pedido ao motor que deve ficar sem resposta (o "Validando convite…" travado).
   */
  async function abrir({ aparelho, nativo = null, conta = null, provedor = 'email', segurar = null }) {
    const ctx = await navegador.newContext({ ...APARELHOS[aparelho], locale: 'pt-BR', timezoneId: 'America/Sao_Paulo', serviceWorkers: 'block', reducedMotion: 'reduce' });
    const estado = { conta, provedor, grants: [], lojas: [], erros: [], segurados: 0 };
    await ctx.exposeBinding('__copiar', (_f, texto) => { sistema.area = texto; });
    await ctx.exposeBinding('__colar', () => sistema.area);
    if (nativo) {
      await ctx.addInitScript(ladoNativo, nativo);
      await ctx.addInitScript({ content: PONTE_DO_CAPACITOR });
    }
    await ctx.addInitScript(areaDeTransferencia);
    await ctx.addInitScript(() => { try { localStorage.setItem('futty_cookies', 'aceite'); } catch { /* sem armazenamento */ } });
    await ctx.route('**/*', async (route) => {
      const req = route.request();
      const url = new URL(req.url());
      try {
        if (url.pathname.startsWith('/api/')) {
          if (segurar?.(url, req)) { estado.segurados += 1; return; } // nunca responde
          return await aoMotor(route, dados.base);
        }
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

  const doMotor = async (rota, quem = 'adm') => {
    const r = await fetch(`${dados.base}${rota}`, { headers: { authorization: `Bearer ${dados.tokens[quem]}` } });
    return r.json().catch(() => null);
  };
  const noTime = async (conta, s = slug) => ((await doMotor(`/api/teams/${s}`, s === slug ? 'adm' : 'm2'))?.members || []).map((m) => m.user_id || m.users?.id || m.id).includes(dados.pessoas[conta].id);
  const noRankingDoMotor = async (conta, s = slug) => ((await doMotor(`/api/teams/${s}/ranking`, s === slug ? 'adm' : 'm2'))?.ranking || []).find((r) => r.user_id === dados.pessoas[conta].id) || null;

  async function entrarPeloLogin(page, estado) {
    await page.goto(`${base}/login`, { waitUntil: 'domcontentloaded' });
    await page.locator('input[placeholder="seu@email.com"]').waitFor({ timeout: 30000 });
    await page.locator('input[placeholder="seu@email.com"]').fill(dados.pessoas[estado.conta].email);
    await page.locator('input[placeholder="••••••••"]').fill(SENHA);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL(/\/home/, { timeout: 30000 });
  }

  /** Escolhe a data nos rolinhos (ano, mês, dia) e espera o componente entregar a data inteira. */
  async function escolherData(page, data) {
    const grupo = page.locator('[data-rolinhos]').first();
    for (const [rolo, valor] of [['ano', data.ano], ['mes', data.mes], ['dia', data.dia]]) {
      const item = grupo.locator(`[data-rolo="${rolo}"] [data-valor="${valor}"]`);
      await item.scrollIntoViewIfNeeded();
      await item.click();
      await page.waitForFunction(([r, v]) => document.querySelector(`[data-rolinhos] [data-rolo="${r}"] [aria-selected="true"]`)?.dataset.valor === String(v), [rolo, valor], { timeout: 5000 }).catch(() => {});
    }
    await page.waitForFunction((texto) => document.querySelector('[data-rolinhos]')?.dataset.valorData === texto, data.texto, { timeout: 8000 });
  }

  /** As três formas de entrar, a partir da tela de cadastro (ou da página inicial) do app. */
  async function entrar(page, estado, forma) {
    if (forma === 'email') {
      if (!/\/register/.test(page.url())) await page.evaluate(() => { window.history.pushState({}, '', '/register'); window.dispatchEvent(new PopStateEvent('popstate')); });
      await page.locator('input[placeholder="seu@email.com"]').waitFor({ timeout: 20000 });
      await page.locator('input[placeholder="seu@email.com"]').fill(dados.pessoas[estado.conta].email);
      await page.locator('input[placeholder="Mínimo 6 caracteres"]').fill(SENHA);
      await page.locator('input[placeholder="••••••••"]').fill(SENHA);
      await escolherData(page, nascimento(30));
      await page.locator('input[type="checkbox"]').check();
      await page.locator('button[type="submit"]').click();
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
      await page.waitForFunction(() => window.__chamadasNativas?.includes('Browser.open'), null, { timeout: 15000 });
      await page.evaluate(() => window.__eventoNativo('appUrlOpen', { url: 'com.futty.app://auth/callback?code=codigo-do-google' }));
      return;
    }
    await page.getByRole('button', { name: /com a Apple/ }).first().click();
  }

  /** Até a 1ª tela do cadastro: devolve 'time' (boas-vindas do time), 'comecar', 'escolha' ou 'nascimento'. */
  async function primeiraTelaDoCadastro(page) {
    await page.waitForURL(/\/onboarding/, { timeout: 30000 }).catch(async (e) => {
      const tela = await page.evaluate(() => document.body.innerText.replace(/\s+/g, ' ').slice(0, 300)).catch(() => '');
      throw new Error(`não chegou ao cadastro (${page.url()}): ${tela} — ${e.message.split('\n')[0]}`);
    });
    const vamos = page.getByRole('button', { name: 'Vamos lá' });
    const comecar = page.getByRole('button', { name: 'Começar' });
    const escolha = page.locator('[data-escolha-do-convite]');
    await vamos.or(comecar).or(escolha).first().waitFor({ timeout: 25000 });
    if (await escolha.isVisible().catch(() => false)) return 'escolha';
    return (await vamos.isVisible().catch(() => false)) ? 'time' : 'comecar';
  }

  /** O cadastro do Futty até o fim a partir da 1ª tela: boas-vindas (do time ou "Começar"), foto depois, o nome, Entrar. */
  async function terminarCadastro(page, apelido) {
    const primeira = await primeiraTelaDoCadastro(page);
    if (primeira === 'escolha') return primeira;
    await page.getByRole('button', { name: primeira === 'time' ? 'Vamos lá' : 'Começar' }).click();
    const depois = page.getByRole('button', { name: 'deixar para depois' });
    await depois.waitFor({ timeout: 20000 });
    await page.waitForTimeout(2300); // o "deixar para depois" só aceita toque depois de ~2 s
    await depois.click();
    await page.locator('input[placeholder="Ex.: Bruninho"]').fill(apelido);
    await page.getByRole('button', { name: 'Entrar', exact: true }).click();
    return primeira;
  }

  /** O Ranking do time, aberto no app: a linha da pessoa e os pontos dela. */
  async function linhaNoRanking(page, apelido, s = slug) {
    await page.goto(`${base}/time/${s}/ranking`, { waitUntil: 'domcontentloaded' });
    await page.locator('.rank-list .rank-row').first().waitFor({ timeout: 30000 });
    await page.waitForTimeout(800);
    return page.evaluate((a) => {
      const row = [...document.querySelectorAll('.rank-list .rank-row')].find((r) => r.querySelector('.rank-name')?.childNodes[0]?.textContent?.trim() === a);
      return row ? { pontos: row.querySelector('[data-pontos]')?.innerText.trim() } : { semLinha: [...document.querySelectorAll('.rank-list .rank-row .rank-name')].map((n) => n.innerText), url: location.pathname };
    }, apelido);
  }

  const CAMINHOS = [
    { forma: 'email', aparelho: 'iphone', nativo: 'ios', sem: 'lojaEmail', com: 'appEmail', apelidos: ['Miguel', 'Bruno'] },
    { forma: 'google', aparelho: 'android', nativo: 'android', sem: 'lojaGoogle', com: 'appGoogle', apelidos: ['Motta', 'Caio'] },
    { forma: 'apple', aparelho: 'iphone', nativo: 'ios', sem: 'lojaApple', com: 'appApple', apelidos: ['Marquinhos', 'Thiago'] },
  ];

  try {
    // ════ 1 · Os 6 caminhos do convite ═════════════════════════════════════════════════════════════════════════════════════
    for (const c of roda('convite') ? CAMINHOS : []) {
      const rotulo = `${c.forma} (${c.aparelho})`;

      // ── SEM o app: o link abre no navegador do celular; o motor guarda o convite; o app (outro armazenamento) o acha ──────────
      {
        sistema.area = '';
        const nav = await abrir({ aparelho: c.aparelho });
        await nav.page.goto(`${base}/c/${slug}-${dados.convite.codigo}`, { waitUntil: 'domcontentloaded' });
        await nav.page.getByRole('link', { name: 'Baixar o Futty' }).waitFor({ timeout: 40000 });
        await nav.page.waitForTimeout(600);
        const pendentes = (await perguntar(filho, 'pendentes', 'pendentes')) || [];
        const meu = pendentes.find((l) => l.plataforma === c.nativo);
        t(`sem app · ${rotulo} · a página do convite avisou o motor: convite + plataforma ${c.nativo} + só o HASH da rede (nunca o IP)`,
          !!meu && /^[0-9a-f]{64}$/.test(meu.rede) && !JSON.stringify(pendentes).includes('127.0.0.1'), JSON.stringify(pendentes).slice(0, 300));
        await foto(nav.page, `${c.forma}-1-convite-no-navegador`);
        await nav.page.getByRole('link', { name: 'Baixar o Futty' }).click();
        await nav.page.waitForURL(/apps\.apple\.com|play\.google\.com/, { timeout: 15000 }).catch(() => {});
        await nav.ctx.close();

        const app = await abrir({ aparelho: c.aparelho, nativo: c.nativo, conta: c.sem, provedor: c.forma });
        await app.page.goto(`${base}/`, { waitUntil: 'domcontentloaded' });
        await app.page.waitForFunction(() => window.__ouvintesNativos?.('appUrlOpen') > 0, null, { timeout: 30000 });
        const bilheteNoApp = await app.page.evaluate(() => localStorage.getItem('futty_convite_pendente'));
        t(`sem app · ${rotulo} · o app instalado não tem o convite do navegador (armazenamentos separados)`, bilheteNoApp === null, String(bilheteNoApp));
        await entrar(app.page, app.estado, c.forma);
        const primeira = await terminarCadastro(app.page, c.apelidos[0]);
        t(`sem app · ${rotulo} · o cadastro abre nas boas-vindas DO TIME (o motor achou o convite), sem colar nada`, primeira === 'time', primeira);
        if (primeira === 'time') await foto(app.page, `${c.forma}-2-depois-do-cadastro`);
        await app.page.waitForURL(new RegExp(`/time/${slug}`), { timeout: 30000 }).catch(() => {});
        t(`sem app · ${rotulo} · terminou o cadastro já dentro do time`, new RegExp(`/time/${slug}$`).test(new URL(app.page.url()).pathname), app.page.url());
        t(`sem app · ${rotulo} · está nos membros do time (team_members, pelo motor)`, await noTime(c.sem));
        const linha = await linhaNoRanking(app.page, c.apelidos[0]).catch((e) => ({ erro: e.message.split('\n')[0] }));
        t(`sem app · ${rotulo} · e no Ranking, com "—" nos pontos`, linha?.pontos === '—', JSON.stringify(linha));
        if (c.forma === 'email') await foto(app.page, 'email-3-ranking');
        t(`sem app · ${rotulo} · sem erro de página`, app.estado.erros.length === 0, app.estado.erros.slice(0, 3).join(' | '));
        await app.ctx.close();
      }

      // ── COM o app instalado e sem sessão: o link abre no app ───────────────────────────────────────────────────────────────
      {
        const app = await abrir({ aparelho: c.aparelho, nativo: c.nativo, conta: c.com, provedor: c.forma });
        await app.page.goto(`${base}/`, { waitUntil: 'domcontentloaded' });
        await app.page.waitForFunction(() => window.__ouvintesNativos?.('appUrlOpen') > 0, null, { timeout: 30000 });
        await app.page.evaluate((url) => window.__eventoNativo('appUrlOpen', { url }), linkDoConvite);
        const criar = app.page.getByRole('button', { name: 'Criar conta e entrar' });
        await criar.waitFor({ timeout: 30000 });
        await criar.click();
        await entrar(app.page, app.estado, c.forma);
        const primeira = await terminarCadastro(app.page, c.apelidos[1]);
        t(`com app · ${rotulo} · o cadastro abre nas boas-vindas do time`, primeira === 'time', primeira);
        await app.page.waitForURL(new RegExp(`/time/${slug}`), { timeout: 30000 }).catch(() => {});
        t(`com app · ${rotulo} · terminou o cadastro já dentro do time`, new RegExp(`/time/${slug}$`).test(new URL(app.page.url()).pathname), app.page.url());
        t(`com app · ${rotulo} · está nos membros do time (motor)`, await noTime(c.com));
        const linha = await linhaNoRanking(app.page, c.apelidos[1]).catch((e) => ({ erro: e.message.split('\n')[0] }));
        t(`com app · ${rotulo} · e no Ranking, com "—" nos pontos`, linha?.pontos === '—', JSON.stringify(linha));
        t(`com app · ${rotulo} · sem erro de página`, app.estado.erros.length === 0, app.estado.erros.slice(0, 3).join(' | '));
        await app.ctx.close();
      }
    }

    // ════ 2 · Dois convites abertos no mesmo celular: a pessoa escolhe ═══════════════════════════════════════════════════════
    if (roda('escolha')) {
      const nav = await abrir({ aparelho: 'iphone' });
      for (const s of [`${slug}-${dados.convite.codigo}`, `${slug2}-${dados.convite2.codigo}`]) {
        await nav.page.goto(`${base}/c/${s}`, { waitUntil: 'domcontentloaded' });
        await nav.page.getByRole('link', { name: 'Baixar o Futty' }).waitFor({ timeout: 40000 });
        await nav.page.waitForTimeout(500);
      }
      await nav.ctx.close();
      const app = await abrir({ aparelho: 'iphone', nativo: 'ios', conta: 'escolha', provedor: 'email' });
      await app.page.goto(`${base}/`, { waitUntil: 'domcontentloaded' });
      await app.page.waitForFunction(() => window.__ouvintesNativos?.('appUrlOpen') > 0, null, { timeout: 30000 });
      await entrar(app.page, app.estado, 'email');
      const primeira = await primeiraTelaDoCadastro(app.page);
      const opcoes = await app.page.locator('[data-convite-opcao]').evaluateAll((els) => els.map((e) => e.getAttribute('data-convite-opcao')));
      t('dois convites · o cadastro pergunta "Qual time te convidou?" com os dois times', primeira === 'escolha' && opcoes.includes(slug) && opcoes.includes(slug2), JSON.stringify({ primeira, opcoes }));
      await foto(app.page, 'escolha-1-qual-time');
      await app.page.locator(`[data-entrar-no-convite="${slug2}"]`).click();
      const depois = await terminarCadastro(app.page, 'Diego');
      t('dois convites · escolheu a Pelada do Zé: as boas-vindas são as DELA', depois === 'time' && (await app.page.locator('body').innerText()).includes('Diego') === false, depois);
      await app.page.waitForURL(new RegExp(`/time/${slug2}`), { timeout: 30000 }).catch(() => {});
      t('dois convites · terminou dentro da Pelada do Zé (e não da Missa)', (await noTime('escolha', slug2)) && !(await noTime('escolha', slug)), app.page.url());
      const linha = await linhaNoRanking(app.page, 'Diego', slug2).catch((e) => ({ erro: e.message.split('\n')[0] }));
      t('dois convites · e no Ranking da Pelada do Zé', linha?.pontos === '—', JSON.stringify(linha));
      await app.ctx.close();
    }

    // ════ 3 · "Validando convite…" travado ═══════════════════════════════════════════════════════════════════════════════════
    if (roda('travado')) {
      // O Magrão (com conta, membro da Missa) abre no app o convite da Pelada do Zé; o pedido COM a sessão nunca volta.
      const ehValidacao = (url) => /^\/api\/convite\/[^/]+$/.test(url.pathname);
      const app = await abrir({ aparelho: 'iphone', nativo: 'ios', conta: 'm1', segurar: (url, req) => ehValidacao(url) && !!req.headers().authorization });
      await entrarPeloLogin(app.page, app.estado);
      await app.page.waitForFunction(() => window.__ouvintesNativos?.('appUrlOpen') > 0, null, { timeout: 30000 });
      await app.page.waitForTimeout(500);
      const t0 = Date.now();
      const ouvintes = await app.page.evaluate((url) => window.__eventoNativo('appUrlOpen', { url }), linkDoConvite2);
      if (!ouvintes) t('travado · o app tinha quem ouvisse o link (appUrlOpen)', false, String(ouvintes));
      const entrarNoTime = app.page.getByRole('button', { name: 'Entrar no time' });
      const abriu = await entrarNoTime.waitFor({ timeout: 25000 }).then(() => true, () => false);
      const segundos = (Date.now() - t0) / 1000;
      t(`travado · o pedido com a sessão ficou preso (${app.estado.segurados}) e a 2ª tentativa, sem a sessão, abriu o convite sozinha em ${segundos.toFixed(1)} s`,
        abriu && app.estado.segurados >= 1 && segundos < 15, await app.page.evaluate(() => document.body.innerText.slice(0, 200)));
      await foto(app.page, 'travado-1-abriu-na-2a-tentativa');
      if (abriu) {
        await entrarNoTime.click();
        await app.page.waitForURL(new RegExp(`/time/${slug2}`), { timeout: 20000 }).catch(() => {});
        t('travado · "Entrar no time" funciona e o Magrão está na Pelada do Zé (motor)', await noTime('m1', slug2), app.page.url());
      }
      await app.ctx.close();

      // As duas tentativas presas: "Tentar de novo" aparece; com a rede de volta, ele abre o convite.
      const preso = { ativo: true };
      const app2 = await abrir({ aparelho: 'android', segurar: (url) => preso.ativo && ehValidacao(url) });
      await app2.page.goto(`${base}/c/${slug2}-${dados.convite2.codigo}`, { waitUntil: 'domcontentloaded' });
      const tentar = app2.page.locator('[data-tentar-de-novo]');
      const apareceu = await tentar.waitFor({ timeout: 30000 }).then(() => true, () => false);
      t('travado · com as duas tentativas presas, a tela sai de "Validando convite…" e mostra "Tentar de novo"', apareceu,
        await app2.page.evaluate(() => document.body.innerText.slice(0, 200)));
      await foto(app2.page, 'travado-2-tentar-de-novo');
      preso.ativo = false;
      if (apareceu) await tentar.click();
      const voltou = await app2.page.getByRole('link', { name: 'Baixar o Futty' }).waitFor({ timeout: 20000 }).then(() => true, () => false);
      t('travado · "Tentar de novo" abre o convite', voltou);
      await app2.ctx.close();
    }

    // ════ 4 · Gabinete → "Contas sem time" ═════════════════════════════════════════════════════════════════════════════════
    if (roda('gabinete')) {
      t('contas sem time · antes: o Perdido não está em time nenhum', !(await noTime('perdido')));
      const gab = await abrir({ aparelho: 'computador', conta: 'adm' });
      await entrarPeloLogin(gab.page, gab.estado);
      await gab.page.goto(`${base}/gabinete?aba=sem-time`, { waitUntil: 'domcontentloaded' });
      await gab.page.locator('[data-contas-sem-time]').waitFor({ timeout: 30000 });
      const mostrar = gab.page.getByText(/Mostrar as \d+ de teste/);
      if (await mostrar.count()) await mostrar.click(); // na prova toda conta é @futtymock (de teste)
      const linha = gab.page.locator(`[data-conta-sem-time="${dados.pessoas.perdido.id}"]`);
      const naLista = await linha.waitFor({ timeout: 10000 }).then(() => true, () => false);
      const ninguemComTime = await gab.page.evaluate((ids) => ids.every((id) => !document.querySelector(`[data-conta-sem-time="${id}"]`)), [dados.pessoas.adm.id, dados.pessoas.m1.id, dados.pessoas.lojaEmail.id]);
      t('contas sem time · a lista mostra o Perdido (e não mostra quem já tem time)', naLista && ninguemComTime);
      await foto(gab.page, 'gabinete-1-contas-sem-time');
      await linha.locator('[data-por-no-time]').click();
      await linha.locator('[data-escolher-time]').selectOption({ label: dados.time.nome });
      await foto(gab.page, 'gabinete-2-por-no-time');
      await linha.locator('[data-por-no-time-confirmar]').click();
      const saiu = await linha.waitFor({ state: 'detached', timeout: 15000 }).then(() => true, () => false);
      t('contas sem time · "Pôr no time…" → Missa de Quinta → a conta sai da lista', saiu);
      t('contas sem time · o Perdido está nos membros da Missa (team_members, pelo motor)', await noTime('perdido'));
      const r = await noRankingDoMotor('perdido');
      t('contas sem time · e no Ranking da Missa', !!r, JSON.stringify(r));
      t('contas sem time · sem erro de página', gab.estado.erros.length === 0, gab.estado.erros.slice(0, 3).join(' | '));
      await gab.ctx.close();
      const proibido = await fetch(`${dados.base}/api/super/contas-sem-time`, { headers: { authorization: `Bearer ${dados.tokens.m1}` } });
      t('contas sem time · quem não é super-admin recebe 403', proibido.status === 403, String(proibido.status));
    }

    // ════ 5 · Idade: 13 entra, 12 não ════════════════════════════════════════════════════════════════════════════════════
    if (roda('idade')) {
      // Cadastro por e-mail no site: o teto do rolo de ano é ano atual − 13; 12 anos (faz 13 amanhã) mostra a frase da casa e nem chama o Supabase.
      const site = await abrir({ aparelho: 'iphone', conta: 'dozeEmail' });
      await site.page.goto(`${base}/register`, { waitUntil: 'domcontentloaded' });
      await site.page.locator('input[placeholder="seu@email.com"]').waitFor({ timeout: 30000 });
      const anoMaisAlto = await site.page.locator('[data-rolinhos] [data-rolo="ano"] [role="option"]').last().getAttribute('data-valor');
      t(`idade · o rolo de ano acaba em ano atual − 13 (${anoMaisAlto})`, Number(anoMaisAlto) === new Date().getUTCFullYear() - 13, anoMaisAlto);
      await site.page.locator('input[placeholder="seu@email.com"]').fill(dados.pessoas.dozeEmail.email);
      await site.page.locator('input[placeholder="Mínimo 6 caracteres"]').fill(SENHA);
      await site.page.locator('input[placeholder="••••••••"]').fill(SENHA);
      await escolherData(site.page, nascimento(13, 1));
      await site.page.locator('input[type="checkbox"]').check();
      await site.page.locator('button[type="submit"]').click();
      const erro = await site.page.locator('.auth-alert--error').innerText({ timeout: 10000 }).catch(() => '');
      t('idade · e-mail · 12 anos (faz 13 amanhã): a frase da casa e a conta não é criada', erro.trim() === MSG_MENOR && !site.estado.grants.includes('signup'), JSON.stringify({ erro, grants: site.estado.grants }));
      await foto(site.page, 'idade-1-doze-no-email');
      site.estado.conta = 'trezeEmail';
      await site.page.locator('input[placeholder="seu@email.com"]').fill(dados.pessoas.trezeEmail.email);
      await escolherData(site.page, nascimento(13));
      await site.page.locator('button[type="submit"]').click();
      const espera = await site.page.locator('[data-espera-do-email]').waitFor({ timeout: 20000 }).then(() => true, () => false);
      t('idade · e-mail · 13 anos hoje: a conta é criada (vai para a confirmação do e-mail)', espera && site.estado.grants.includes('signup'), JSON.stringify(site.estado.grants));
      await site.ctx.close();

      // Google (o cadastro pergunta a data): 13 segue para a foto; 12 o motor recusa, apaga a conta e o login explica.
      for (const [conta, anos, dias, passa] of [['treze', 13, 0, true], ['doze', 13, 1, false]]) {
        const app = await abrir({ aparelho: 'android', nativo: 'android', conta, provedor: 'google' });
        await app.page.goto(`${base}/`, { waitUntil: 'domcontentloaded' });
        await app.page.waitForFunction(() => window.__ouvintesNativos?.('appUrlOpen') > 0, null, { timeout: 30000 });
        await entrar(app.page, app.estado, 'google');
        // Neste Android já se abriram convites de outros times nas últimas 2 h (as seções de cima): o cadastro pode começar pela escolha.
        let primeira = await primeiraTelaDoCadastro(app.page);
        if (primeira === 'escolha') {
          await app.page.locator('[data-nenhum-convite]').click();
          primeira = 'comecar';
        }
        await app.page.getByRole('button', { name: primeira === 'time' ? 'Vamos lá' : 'Começar' }).click();
        await app.page.getByText('Quando você').waitFor({ timeout: 20000 });
        await escolherData(app.page, nascimento(anos, dias));
        await app.page.getByRole('button', { name: 'Continuar' }).click();
        if (passa) {
          const foto2 = await app.page.getByText('SUA FIGURINHA').waitFor({ timeout: 20000 }).then(() => true, () => false);
          t('idade · Google · 13 anos hoje: a data passa e o cadastro segue para a foto', foto2);
        } else {
          await app.page.waitForURL(/\/login/, { timeout: 20000 }).catch(() => {});
          const aviso = await app.page.locator('.auth-alert--error').innerText({ timeout: 10000 }).catch(() => '');
          const apagadas = (await perguntar(filho, 'apagadas', 'apagadas')) || [];
          t('idade · Google · 12 anos: o motor recusa, a conta é apagada e o login diz a frase da casa',
            aviso.trim() === MSG_MENOR && apagadas.includes(dados.pessoas.doze.id), JSON.stringify({ url: app.page.url(), aviso, apagadas }));
          await foto(app.page, 'idade-2-doze-no-google');
        }
        await app.ctx.close();
      }
    }

    // ════ 6 · Presença só depois do jogo (POR ÚLTIMO: adianta o relógio do motor) ══════════════════════════════════════════════
    if (roda('presenca')) {
      const antes = await noRankingDoMotor('m3');
      t('presença · o Gabriel só confirmou o jogo de daqui a 2 dias: 0 jogos no Ranking (motor)', antes?.presenca === 0, JSON.stringify(antes));
      const app = await abrir({ aparelho: 'iphone', conta: 'adm' });
      await entrarPeloLogin(app.page, app.estado);
      const l1 = await linhaNoRanking(app.page, 'Gabriel');
      t('presença · e "—" nos pontos na tela do Ranking (o jogo ainda não aconteceu)', l1?.pontos === '—', JSON.stringify(l1));
      await foto(app.page, 'presenca-1-antes-do-jogo');
      const avancou = await perguntar(filho, 'avancar', 'avancou');
      const depois = await noRankingDoMotor('m3');
      t('presença · passado o horário do jogo (relógio do motor + 3 dias): 1 jogo no Ranking (motor)', avancou === true && depois?.presenca === 1, JSON.stringify(depois));
      // Outro aparelho (sem o Ranking guardado: com o cache recente o app nem pede de novo, de propósito) abre o Ranking depois do jogo.
      await app.ctx.close();
      const app2 = await abrir({ aparelho: 'iphone', conta: 'adm' });
      await entrarPeloLogin(app2.page, app2.estado);
      const l2 = await linhaNoRanking(app2.page, 'Gabriel');
      t('presença · e a linha do Gabriel ganha pontos na tela', !!l2?.pontos && l2.pontos !== '—', JSON.stringify(l2));
      await foto(app2.page, 'presenca-2-depois-do-jogo');
      await app2.ctx.close();
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
