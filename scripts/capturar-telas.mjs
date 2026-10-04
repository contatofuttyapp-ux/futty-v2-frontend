// Capturas de TODAS as telas do app em 390 px, contra o servidor LOCAL (nunca produção).
//
//   node scripts/capturar-telas.mjs [--url http://localhost:5173] [--time <slug>] [--so-publicas] [--so 11,12] [--saida <pasta>]
//
// Pré-requisitos (dois terminais, ou LIGAR-FUTTY.bat): backend em :3001 (`npm start`) e frontend em :5173 (`npm run dev`).
//
// Sessão — a credencial NUNCA vai no código nem em argumento. Ordem de preferência:
//   1. FUTTY_STORAGE_STATE=<arquivo.json> → estado de sessão do Playwright já salvo.
//   2. scripts/capturas/telas-390.storage.json (pasta no .gitignore), criado por `node scripts/entrar-google.mjs`: um navegador
//      visível, a pessoa entra com o Google à mão e a sessão é salva. Cada execução daqui renova e regrava esse arquivo, então ele
//      segue valendo de um dia para o outro (só pede o Google de novo se a sessão for revogada).
//   3. Último recurso: FUTTY_TESTE_EMAIL + FUTTY_TESTE_SENHA (formulário e-mail/senha; só serve a conta que TEM senha no Supabase).
//   A conta precisa ser admin de um time com jogo sorteado e super-admin (Gabinete).
//   Sem sessão nenhuma, as telas públicas saem e as privadas são LISTADAS COMO NÃO GERADAS — nunca uma tela de login com nome de outra.
//
// Garantias: qualquer pedido a produção (run.app, futtyapp.com.br, futty.pages.dev) é abortado e reprova a execução; toda escrita
// em /api é respondida sem chegar ao banco; cada imagem só entra na pasta final depois de passar nas verificações da tela.
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const opcao = (nome, omissao) => {
  const i = args.indexOf(`--${nome}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : omissao;
};

const BASE = opcao('url', 'http://localhost:5173').replace(/\/+$/, '');
const DESTINO = opcao('saida', 'C:\\Users\\phfer\\Desktop\\FUT\\DESIGN\\telas-390');
const PREPARO = path.join(RAIZ, 'scripts', 'capturas', 'telas-390-preparo');
const ESTADO_PROPRIO = path.join(RAIZ, 'scripts', 'capturas', 'telas-390.storage.json');
const ESTADO_LIDO = process.env.FUTTY_STORAGE_STATE || null;
const EMAIL = process.env.FUTTY_TESTE_EMAIL || '';
const SENHA = process.env.FUTTY_TESTE_SENHA || '';
const TIME_FIXO = opcao('time', process.env.FUTTY_TESTE_TIME || null);
const SO_PUBLICAS = args.includes('--so-publicas');
// --so 11,12 → só as telas cujo nome começa por esses números (as outras imagens ficam como estão).
const SO_ESTAS = (opcao('so', '') || '').split(',').map((s) => s.trim()).filter(Boolean);

const LARGURA = 390;
const ALTURA = 844;
const PRODUCAO = /(^|\.)run\.app$|(^|\.)futtyapp\.com\.br$|(^|\.)futty\.pages\.dev$/i;
const ROTA_404 = '/rota-que-nao-existe-390';

const espera = (ms) => new Promise((r) => setTimeout(r, ms));
const fatal = (msg) => { console.error(`\nERRO: ${msg}`); process.exit(2); };

if (!['localhost', '127.0.0.1', '[::1]'].includes(new URL(BASE).hostname)) {
  fatal(`--url ${BASE} não é local. Bancada e capturas rodam só contra localhost (regra da casa, 25-set).`);
}

function apiLocal() {
  try {
    const env = fs.readFileSync(path.join(RAIZ, '.env'), 'utf8');
    return (env.match(/^VITE_API_URL=(.+)$/m)?.[1] || 'http://localhost:3001').trim().replace(/\/+$/, '');
  } catch {
    return 'http://localhost:3001';
  }
}

async function status(url) {
  try {
    return (await fetch(url, { signal: AbortSignal.timeout(5000) })).status;
  } catch {
    return null;
  }
}

const tentativasProducao = [];
const escritasBloqueadas = [];
let midiasServidasLocalmente = 0;

async function novoContexto(navegador, { estado = null, cookiesAceitos = true, pushPendente = false } = {}) {
  const contexto = await navegador.newContext({
    viewport: { width: LARGURA, height: ALTURA },
    deviceScaleFactor: 1,
    isMobile: true,
    hasTouch: true,
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
    serviceWorkers: 'block',
    ...(estado ? { storageState: estado } : {}),
  });
  if (cookiesAceitos) {
    await contexto.addInitScript(() => { try { localStorage.setItem('futty_cookies', 'aceite'); } catch { /* sem storage */ } });
  }
  if (pushPendente) {
    // 29T: o Chromium sem tela nasce com a permissão de notificações NEGADA e o aviso "Ativar notificações" nunca entra na fila do Início. Aqui
    // ela fica como no navegador de quem ainda não decidiu ("default") — só leitura da permissão; nada é pedido nem gravado.
    await contexto.addInitScript(() => { try { Object.defineProperty(window.Notification, 'permission', { get: () => 'default', configurable: true }); } catch { /* sem Notification */ } });
  }
  await contexto.route('**/api/**', async (route) => {
    const pedido = route.request();
    if (['GET', 'HEAD', 'OPTIONS'].includes(pedido.method())) return route.continue();
    escritasBloqueadas.push(`${pedido.method()} ${new URL(pedido.url()).pathname}`);
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) });
  });
  await contexto.route((url) => PRODUCAO.test(url.hostname), async (route) => {
    const pedido = route.request();
    const u = new URL(pedido.url());
    // As fotos de post criadas pelo app em produção ficam GRAVADAS no banco (compartilhado) com o endereço da produção
    // (https://<cloud run>/api/media/<token>). O token vale no motor local (mesmo segredo): serve-se a foto por ele, e nada vai à produção.
    // Sem isto a foto do post aparece quebrada na captura — e foi o que a varredura de 3-out leu como "buraco de 400 px" (achado 141).
    if (pedido.method() === 'GET' && /^\/api\/media\//.test(u.pathname)) {
      try {
        const resposta = await fetch(`${apiLocal()}${u.pathname}${u.search}`);
        midiasServidasLocalmente += 1;
        return route.fulfill({
          status: resposta.status,
          headers: { 'content-type': resposta.headers.get('content-type') || 'image/webp', 'access-control-allow-origin': '*' },
          body: Buffer.from(await resposta.arrayBuffer()),
        });
      } catch { /* o motor local não respondeu: cai no aborto, que a execução reporta */ }
    }
    tentativasProducao.push(pedido.url());
    return route.abort();
  });
  return contexto;
}

async function abrir(contexto) {
  const pagina = await contexto.newPage();
  pagina.__pendentes = new Set();
  pagina.on('request', (r) => pagina.__pendentes.add(r));
  pagina.on('requestfinished', (r) => pagina.__pendentes.delete(r));
  pagina.on('requestfailed', (r) => pagina.__pendentes.delete(r));
  // 29T: o /api/inicio que a página recebeu, para a captura conferir que o estado é o que ela promete (pedido pendente, 4 times…).
  pagina.on('response', async (r) => {
    try { if (r.request().method() === 'GET' && new URL(r.url()).pathname === '/api/inicio') pagina.__inicio = await r.json(); } catch { /* sem corpo */ }
  });
  return pagina;
}

async function redeQuieta(pagina, { silencioMs = 700, maxMs = 15000 } = {}) {
  const inicio = Date.now();
  let desde = Date.now();
  while (Date.now() - inicio < maxMs) {
    if (pagina.__pendentes.size > 0) desde = Date.now();
    else if (Date.now() - desde >= silencioMs) return;
    await espera(100);
  }
}

async function ficarPronta(pagina, { seletor = null, dica = '', extraMs = 900 } = {}) {
  if (seletor) {
    await pagina.waitForSelector(seletor, { timeout: 30000 }).catch(() => {
      throw new Error(`não apareceu "${seletor}" em ${new URL(pagina.url()).pathname}${dica ? ` — ${dica}` : ''}`);
    });
  }
  await pagina.evaluate(() => (document.fonts ? document.fonts.ready : null));
  await redeQuieta(pagina);
  await espera(extraMs);
}

// ── Sessão ─────────────────────────────────────────────────────────────────────────────────────────────────────────
async function entrarPeloFormulario(navegador) {
  const contexto = await novoContexto(navegador);
  const pagina = await abrir(contexto);
  try {
    await pagina.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
    await pagina.waitForSelector('input[type="email"]', { timeout: 30000 });
    await pagina.fill('input[type="email"]', EMAIL);
    await pagina.fill('input[type="password"]', SENHA);
    await pagina.click('button[type="submit"]');
    // Sai da espera assim que a tela sai do /login OU mostra o aviso de erro do próprio formulário (a mensagem do Supabase).
    await pagina.waitForFunction(
      () => !/^\/login/.test(location.pathname) || !!document.querySelector('.auth-alert--error'),
      null,
      { timeout: 45000 },
    ).catch(() => {});
    const caminho = new URL(pagina.url()).pathname;
    if (/^\/login/.test(caminho)) {
      const aviso = await pagina.locator('.auth-alert--error').first().innerText().catch(() => '');
      throw new Error(`o formulário não deixou entrar — a tela diz: "${aviso.trim() || '(nenhuma mensagem; nada aconteceu em 45 s)'}"`);
    }
    if (/^\/onboarding/.test(caminho)) throw new Error('a conta de teste ainda está no onboarding; conclua-o uma vez à mão');
    await contexto.storageState({ path: ESTADO_PROPRIO });
  } finally {
    await contexto.close();
  }
  const guardado = JSON.parse(fs.readFileSync(ESTADO_PROPRIO, 'utf8'));
  const temSessao = (guardado.origins || []).some((o) => (o.localStorage || []).some((i) => /^sb-.+-auth-token$/.test(i.name)));
  if (!temSessao) throw new Error('entrou, mas o estado salvo não tem a sessão do Supabase');
  return ESTADO_PROPRIO;
}

// Regrava só a sessão do Supabase (não o resto do localStorage, que tem de nascer frio). O supabase-js renova o token ao carregar
// e o refresh token antigo morre na hora; sem regravar, a segunda execução entraria com um token já usado.
let sessaoRegravada = false;
async function guardarSessao(contexto) {
  const todo = await contexto.storageState();
  const origins = (todo.origins || [])
    .map((o) => ({ origin: o.origin, localStorage: (o.localStorage || []).filter((i) => /^sb-.+-auth-token$/.test(i.name)) }))
    .filter((o) => o.localStorage.length);
  if (!origins.length) throw new Error('a sessão sumiu do navegador (nenhum sb-…-auth-token)');
  fs.mkdirSync(path.dirname(ESTADO_PROPRIO), { recursive: true });
  fs.writeFileSync(ESTADO_PROPRIO, JSON.stringify({ cookies: [], origins }, null, 2));
}

async function descobrir(navegador, estado) {
  const contexto = await novoContexto(navegador, { estado });
  const pagina = await abrir(contexto);
  const jogos = [];
  // Rodada 29Q: a lista de times da conta e os jogos de cada um, para achar o Várzea FC (a captura 26 abre um jogo dele).
  const listaDeTimes = [];
  const jogosPorTime = new Map();
  pagina.on('response', async (r) => {
    try {
      const u = new URL(r.url());
      if (r.request().method() !== 'GET') return;
      const doTime = u.pathname.match(/^\/api\/teams\/([^/]+)\/games$/);
      if (doTime) {
        const lista = (await r.json())?.games || [];
        for (const g of lista) jogos.push(g);
        jogosPorTime.set(doTime[1], lista);
      } else if (u.pathname === '/api/teams') {
        const corpo = await r.json();
        for (const t of Array.isArray(corpo) ? corpo : corpo?.teams || []) listaDeTimes.push(t);
      }
    } catch { /* resposta sem corpo */ }
  });
  try {
    await pagina.goto(`${BASE}/home`, { waitUntil: 'domcontentloaded' });
    await ficarPronta(pagina, { seletor: '.games-label, .home-empty, .bottom-nav' });
    if (!/^\/home/.test(new URL(pagina.url()).pathname)) {
      throw new Error(`a sessão não vale: /home levou a ${new URL(pagina.url()).pathname} (entre de novo: node scripts/entrar-google.mjs)`);
    }
    let slug = TIME_FIXO;
    if (!slug) {
      const hrefs = await pagina.$$eval('a[href^="/time/"]', (as) => as.map((a) => a.getAttribute('href')));
      slug = hrefs.map((h) => h.match(/^\/time\/([^/?#]+)/)?.[1]).find((s) => s && s !== 'novo') || null;
    }
    if (!slug) throw new Error('a conta de teste não tem time (nenhum link /time/... na Início); use --time <slug> ou entre num time');

    await pagina.goto(`${BASE}/time/${slug}/jogos`, { waitUntil: 'domcontentloaded' });
    await ficarPronta(pagina);

    await pagina.goto(`${BASE}/perfil`, { waitUntil: 'domcontentloaded' });
    await ficarPronta(pagina, { seletor: 'a[href*="/jogador/"]', dica: 'o Perfil só mostra "Ver minha vitrine" para quem tem time' });
    const href = await pagina.$eval('a[href*="/jogador/"]', (a) => a.getAttribute('href'));
    const userId = href.match(/\/jogador\/([^/?#]+)/)?.[1] || null;

    // O Várzea FC (captura 26): só olha — acha o time na lista da conta e um jogo dele, de preferência ainda sem sorteio.
    let jogoVarzea = null;
    const varzea = listaDeTimes.find((t) => /v[áa]rzea fc/i.test(t?.nome || '') && t.slug);
    if (varzea) {
      if (!jogosPorTime.has(varzea.slug)) {
        await pagina.goto(`${BASE}/time/${varzea.slug}/jogos`, { waitUntil: 'domcontentloaded' });
        await ficarPronta(pagina);
      }
      const dele = jogosPorTime.get(varzea.slug) || [];
      const jogo = dele.find((g) => !g.sorteio_realizado) || dele[0] || null;
      if (jogo) jogoVarzea = { slug: varzea.slug, id: jogo.id };
    }

    return {
      slug,
      userId,
      jogoSorteado: jogos.find((g) => g.sorteio_realizado) || null,
      jogoQualquer: jogos[0] || null,
      jogoVarzea,
    };
  } finally {
    try { await guardarSessao(contexto); sessaoRegravada = true; } catch { /* sem sessão no navegador: não mexe no arquivo */ }
    await contexto.close();
  }
}

// ── Telas ──────────────────────────────────────────────────────────────────────────────────────────────────────────
// sessao: usa a sessão salva; cookies: 'nao' deixa a faixa de cookies aparecer; permite: textos/estados que, nesta tela, são o
// conteúdo esperado (login, 404). Tudo o resto que se parece com login, 404 ou "sem permissão" REPROVA a imagem.
const aba = (k) => ({
  sessao: true,
  rota: (d) => `/time/${d.slug}?aba=${k}`,
  caminho: new RegExp(`^/time/[^/]+\\?aba=${k}$`),
  seletor: `[role="tab"][data-aba="${k}"][aria-selected="true"]`,
  dica: k === 'ajustes' ? 'a aba Ajustes só existe para admin do time; use uma conta admin' : 'a aba não abriu',
});

async function medirFaixaDeCookies(pagina) {
  return pagina.evaluate(() => {
    const faixa = document.querySelector('[aria-label="Aviso de cookies"]');
    const barra = document.querySelector('.bottom-nav');
    if (!faixa || !barra) return null;
    const f = faixa.getBoundingClientRect();
    const b = barra.getBoundingClientRect();
    const botao = faixa.querySelector('button')?.getBoundingClientRect();
    return {
      faixaTopo: Math.round(f.top), faixaBase: Math.round(f.bottom), barraTopo: Math.round(b.top), alturaBarra: Math.round(b.height),
      baseDaFaixaMenosTopoDaBarra: Math.round(f.bottom - b.top),
      botaoAceitarEscondidoPx: botao ? Math.max(0, Math.round(botao.bottom - b.top)) : null,
    };
  });
}

const CAMPO_NOME_DO_TIME = 'input[placeholder="Ex.: Domingueira FC"]';

// Rodada 29T (achado 168): a lei da primeira tela do Início. UM aviso por vez no topo; o próximo jogo que pede resposta (Vou / Não vou) aparece em
// 390×844 sem rolar — no aviso do topo ou, sem aviso de jogo, no rótulo "Próximos jogos". Devolve a medida e reprova se a lei não vale.
async function exigirLeiDaPrimeiraTela(p) {
  const r = await p.evaluate(() => {
    const base = (el) => (el ? Math.round(el.getBoundingClientRect().bottom) : null);
    const rotulo = [...document.querySelectorAll('.games-label')].find((el) => /próximos jogos/i.test(el.textContent));
    const aviso = document.querySelector('[data-aviso]');
    const jogo = document.querySelector('[data-aviso="jogo"]');
    return {
      cartoes: document.querySelectorAll('[data-atalho-do-inicio]').length,
      chipsFora: document.querySelectorAll('.chips-row a').length,
      rotuloBase: base(rotulo),
      avisos: document.querySelectorAll('[data-aviso]').length,
      tipoDoAviso: aviso ? aviso.getAttribute('data-aviso') : null,
      avisoDoJogoBase: base(jogo),
      linhasDeTimes: document.querySelectorAll('[data-seus-times] [data-time-linha]').length,
    };
  });
  if (r.cartoes !== 2) throw new Error(`a Início mostra ${r.cartoes} cartões (esperado 2: Radar de peladas e Criar time)`);
  if (r.chipsFora) throw new Error('a fila de chips ainda tem links (o "Criar time" e o "Radar de peladas" saíram dela)');
  if (r.avisos > 1) throw new Error(`a Início mostra ${r.avisos} avisos no topo (é UM por vez)`);
  if (r.rotuloBase === null) throw new Error('não achei o rótulo "Próximos jogos" na Início');
  if (r.tipoDoAviso !== 'jogo') throw new Error(`o topo da Início não mostra o aviso do jogo (mostra: ${r.tipoDoAviso || 'nada'}); a conta precisa ter um jogo esperando Vou / Não vou`);
  if (r.avisoDoJogoBase > ALTURA) throw new Error(`o aviso do jogo termina em ${r.avisoDoJogoBase} px, abaixo da primeira tela (${ALTURA} px)`);
  console.log(`      aviso do jogo termina em ${r.avisoDoJogoBase} px de ${ALTURA}; "Próximos jogos" em ${r.rotuloBase} px`);
  return r;
}

const TELAS = [
  { arq: '01-landing', sessao: false, rota: () => '/', caminho: /^\/$/, extraMs: 1500 },
  { arq: '02-criar-conta', sessao: false, rota: () => '/register', caminho: /^\/register$/, seletor: 'input[type="email"]', permite: ['senha'] },
  { arq: '03-entrar', sessao: false, rota: () => '/login', caminho: /^\/login$/, seletor: 'input[type="email"]', permite: ['senha'] },
  {
    // Rodada 29T (achado 168): a LEI DA PRIMEIRA TELA mudou (troca a da 29L, achado 127). Em 390×844 o próximo jogo que pede resposta aparece sem rolar —
    // no aviso do topo ou na lista. O aviso do jogo (um aviso por vez) sobe para o topo, e é ele que esta captura mostra. Os cartões "Radar de peladas"
    // e "Criar time" continuam à vista (29Q). Se o jogo não couber a imagem NÃO sai.
    arq: '04-inicio', sessao: true, rota: () => '/home', caminho: /^\/home$/, seletor: '.games-label, .home-empty',
    depois: async (p) => { await exigirLeiDaPrimeiraTela(p); },
  },
  {
    // Rodada 29T (achado 168): o estado PESADO — pedido pendente + "Ativar notificações" na fila + 4 times em "Seus times". Antes (29Q) o rótulo
    // "Próximos jogos" ia a 973 px numa tela de 844; agora o aviso do jogo sobe para o topo, o "Seus times" mostra 2 linhas e o jogo tem de aparecer
    // na primeira tela. A permissão de notificações fica "default" (como em quem ainda não decidiu) para o aviso entrar na fila.
    arq: '04b-inicio-pesado', sessao: true, pushPendente: true, rota: () => '/home', caminho: /^\/home$/, seletor: '.games-label, .home-empty',
    depois: async (p) => {
      const inicio = p.__inicio;
      if (!inicio) throw new Error('não peguei o /api/inicio desta captura (o motor local está fora do ar?)');
      const pendentes = (inicio.pedidos?.pedidos || []).filter((x) => x.status === 'pending').length;
      const times = (inicio.seu_time || []).length;
      if (!pendentes) throw new Error('a conta não tem pedido de entrada pendente (o estado pesado precisa de um)');
      if (times < 4) throw new Error(`a conta administra ${times} time(s) (o estado pesado precisa de 4 em "Seus times")`);
      const permissao = await p.evaluate(() => (typeof Notification === 'undefined' ? 'sem' : Notification.permission));
      if (permissao !== 'default') throw new Error(`a permissão de notificações está "${permissao}" (o aviso "Ativar notificações" não entraria na fila)`);
      const r = await exigirLeiDaPrimeiraTela(p);
      if (r.linhasDeTimes !== 2) throw new Error(`o "Seus times" mostra ${r.linhasDeTimes} linhas (esperado 2, com "Ver todos")`);
      console.log(`      estado pesado: ${pendentes} pedido(s) pendente(s) + notificações na fila + ${times} times; "Próximos jogos" termina em ${r.rotuloBase} px (era 973 antes do aviso do topo)`);
    },
  },
  { arq: '05-time-aba-jogos', ...aba('jogos') },
  { arq: '06-time-aba-elenco', ...aba('elenco') },
  {
    // Rodada 29R (achado 150): o cartão "Nova temporada de notas" é o último dos Ajustes — fica abaixo da primeira tela, então a captura
    // rola até ele (sem isso a imagem regenerada não mostraria o que mudou). Só olha: nenhum toque no botão.
    arq: '07-time-aba-ajustes', ...aba('ajustes'),
    depois: async (p) => {
      await p.locator('[data-pedir-votar-de-novo]').waitFor({ timeout: 20000 });
      await p.locator('[data-pedir-votar-de-novo]').evaluate((el) => el.scrollIntoView({ block: 'center' }));
      await espera(600);
    },
  },
  {
    arq: '08-jogo', sessao: true, precisa: 'jogoQualquer', dica: 'o time não tem nenhum jogo',
    rota: (d) => `/time/${d.slug}/jogo/${d.jogoQualquer.id}`, caminho: /^\/time\/[^/]+\/jogo\/[^/?]+$/, seletor: 'main',
  },
  {
    arq: '09-presenca-aberta', sessao: true, rota: () => '/home', caminho: /^\/home$/,
    seletor: '.gcard__presence, .pbtn--go', dica: 'nenhum jogo com presença aberta (cartão Vou / Não vou) na Início',
    depois: async (p) => { await p.locator('.gcard__presence, .pbtn--go').first().scrollIntoViewIfNeeded(); await espera(500); },
  },
  {
    arq: '10-sorteio-cerimonia', sessao: true, precisa: 'jogoSorteado', dica: 'o time não tem jogo já sorteado', extraMs: 2500,
    rota: (d) => `/time/${d.slug}/jogo/${d.jogoSorteado.id}/sorteio`, caminho: /\/sorteio$/, seletor: '.smaq',
  },
  {
    arq: '11-sorteio-resultado', sessao: true, precisa: 'jogoSorteado', dica: 'o time não tem jogo já sorteado',
    rota: (d) => `/time/${d.slug}/jogo/${d.jogoSorteado.id}/sorteio`, caminho: /\/sorteio$/, seletor: '.smaq',
    // "» concluir já" pula a animação; a cerimônia acabou quando o .saltar perde a classe "on" (some) — a barra .sorteio-barra de antes já não existe.
    depois: async (p) => {
      await p.waitForSelector('.smaq .saltar.on', { timeout: 15000 }).catch(() => {}); // a cerimônia já está rodando (o "pular" só aparece então)
      const saltar = p.locator('.smaq .saltar button');
      if (await saltar.count()) await saltar.click({ force: true }).catch(() => {});
      await p.waitForFunction(() => { const s = document.querySelector('.smaq .saltar'); return !!s && !s.classList.contains('on'); }, null, { timeout: 30000 });
      await p.getByText('Compartilhar os times', { exact: false }).first().waitFor({ timeout: 10000 });
      await espera(1800);
    },
  },
  {
    arq: '12-sorteio-publico', sessao: false, precisa: 'jogoSorteado', dica: 'precisa do id de um jogo sorteado (descoberto com a sessão)',
    rota: (d) => `/p/${d.slug}/${d.jogoSorteado.id}`, caminho: /^\/p\/[^/]+\/[^/?]+$/, extraMs: 2000,
  },
  { arq: '13-figurinha', sessao: true, rota: () => '/figurinha', caminho: /^\/figurinha$/, extraMs: 1500 },
  { arq: '14-resenha', sessao: true, rota: () => '/feed', caminho: /^\/feed$/, extraMs: 1500 },
  { arq: '15-ranking', sessao: true, rota: (d) => `/time/${d.slug}/ranking`, caminho: /^\/time\/[^/]+\/ranking$/, extraMs: 1500 },
  {
    arq: '16-vitrine', sessao: true, rota: (d) => `/time/${d.slug}/jogador/${d.userId}`, caminho: /^\/time\/[^/]+\/jogador\/[^/?]+$/,
    seletor: '.perfil-glow, main', extraMs: 2000,
  },
  { arq: '17-perfil', sessao: true, rota: () => '/perfil', caminho: /^\/perfil$/ },
  {
    // Rodada 29T (achado 161): sem localização nem cidade escolhida a lista não promete "perto de você". A captura só olha: não toca na localização.
    arq: '18-explorar', sessao: true, rota: () => '/explorar', caminho: /^\/explorar$/, extraMs: 1500,
    depois: async (p) => {
      const texto = (await p.locator('main').innerText()).replace(/\s+/g, ' ');
      if (!/Peladas abertas a novos jogadores · \d+/i.test(texto)) throw new Error('o título da lista do Radar não é "Peladas abertas a novos jogadores · N"');
      if (/Times perto de você/i.test(texto)) throw new Error('o Radar ainda diz "Times perto de você" sem localização');
    },
  },
  { arq: '19-gabinete', sessao: true, rota: () => '/gabinete', caminho: /^\/gabinete$/, dica: 'o Gabinete só abre para super-admin; use uma conta super-admin', extraMs: 1500 },
  {
    arq: '20a-cookies-faixa-sobre-barra-sem-sessao', sessao: false, cookies: 'nao', rota: () => ROTA_404, caminho: /./,
    seletor: '[aria-label="Aviso de cookies"]', permite: ['404'], medirCookies: true,
  },
  {
    arq: '20b-cookies-faixa-sobre-barra-com-sessao', sessao: true, cookies: 'nao', rota: () => '/home', caminho: /^\/home$/,
    seletor: '[aria-label="Aviso de cookies"]', medirCookies: true,
  },
  {
    arq: '21-404-sem-sessao', sessao: false, rota: () => ROTA_404, caminho: /./, permite: ['404'],
    seletor: 'text=Página não encontrada',
  },
  {
    // Rodada 29O: o passo 2 do Criar time, sem título nem subtítulo. Só avança com nome e cidade (29P); não grava nada (o time nasce no passo 3).
    arq: '22-criar-time-passo-2', sessao: true, rota: () => '/criar-time', caminho: /^\/criar-time$/, seletor: CAMPO_NOME_DO_TIME,
    depois: async (p) => {
      await preencherPasso1(p);
      await p.getByRole('button', { name: 'Continuar' }).click();
      await p.getByText('Você também joga?').first().waitFor({ timeout: 10000 });
      await espera(700);
      exigirSemRolagem(await medirBotao(p, 'Continuar'), 'o passo 2', 'Continuar');
    },
  },
  {
    // Rodada 29P/29T: o passo 1 vazio — sem título, rótulos limpos, e o Continuar apagado enquanto não há nome e cidade.
    arq: '23-criar-time-passo-1', sessao: true, rota: () => '/criar-time', caminho: /^\/criar-time$/, seletor: CAMPO_NOME_DO_TIME,
    depois: async (p) => {
      await espera(500);
      // 29T (achado 166): o Continuar existe desde o começo, apagado, e só acende com nome e cidade.
      const continuar = p.getByRole('button', { name: 'Continuar' });
      if ((await continuar.count()) !== 1) throw new Error('o passo 1 vazio não mostra o "Continuar" (devia estar lá, apagado)');
      if (await continuar.isEnabled()) throw new Error('o "Continuar" do passo 1 vazio está aceso (devia estar apagado até haver nome e cidade)');
      exigirSemRolagem(await medirBotao(p, 'Continuar'), 'o passo 1 vazio', 'Continuar');
    },
  },
  {
    // Rodada 29P: o passo 1 com nome e cidade — o Continuar aparece e cabe na tela.
    arq: '23-criar-time-passo-1-preenchido', sessao: true, rota: () => '/criar-time', caminho: /^\/criar-time$/, seletor: CAMPO_NOME_DO_TIME,
    depois: async (p) => {
      await preencherPasso1(p);
      await espera(500);
      exigirSemRolagem(await medirBotao(p, 'Continuar'), 'o passo 1 preenchido', 'Continuar');
    },
  },
  {
    // Rodada 29P: o passo 3 sem subtítulo, com os textos do "Radar de peladas".
    arq: '24-criar-time-passo-3', sessao: true, rota: () => '/criar-time', caminho: /^\/criar-time$/, seletor: CAMPO_NOME_DO_TIME,
    depois: async (p) => {
      await preencherPasso1(p);
      await p.getByRole('button', { name: 'Continuar' }).click();
      await p.getByText('Você também joga?').first().waitFor({ timeout: 10000 });
      await p.getByRole('button', { name: 'Continuar' }).click();
      await p.getByText('Aceita novos membros?').first().waitFor({ timeout: 10000 });
      await espera(700);
      exigirSemRolagem(await medirBotao(p, 'Criar o time'), 'o passo 3', 'Criar o time');
    },
  },
  {
    // Rodada 29P: a FESTA (passo 4). O POST /api/teams é respondido AQUI, com um time de mentira: nada chega ao banco (o contexto
    // já bloqueia toda escrita em /api; esta rota da página responde antes dele, com o corpo que a festa precisa).
    arq: '25-criar-time-pronto', sessao: true, rota: () => '/criar-time', caminho: /^\/criar-time$/, seletor: CAMPO_NOME_DO_TIME,
    depois: async (p) => {
      await p.route('**/api/teams', (route) => (route.request().method() === 'POST'
        ? route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ team: { id: 'captura', slug: 'time-de-captura', nome: 'Time Teste' }, geo: { encontrada: true, nomeOficial: 'Brasília, DF' }, joga: true }) })
        : route.fallback()));
      await preencherPasso1(p);
      await p.getByRole('button', { name: 'Continuar' }).click();
      await p.getByText('Você também joga?').first().waitFor({ timeout: 10000 });
      await p.getByRole('button', { name: 'Continuar' }).click();
      await p.getByText('Aceita novos membros?').first().waitFor({ timeout: 10000 });
      // 29Q: o link do convite chega pronto. O POST do convite também é respondido AQUI, com um código de mentira (nada é gravado).
      await p.route('**/api/teams/*/convite', (route) => (route.request().method() === 'POST'
        ? route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ token: 'captura', codigo: 'CAPTURA' }) })
        : route.fallback()));
      await p.getByRole('button', { name: 'Criar o time' }).click();
      await p.getByText('Seu time está no ar!').first().waitFor({ timeout: 15000 });
      await p.locator('input[readonly]').waitFor({ timeout: 10000 }).catch(() => { throw new Error('a festa abriu sem o link do convite pronto'); });
      if (await p.getByRole('button', { name: 'Gerar link do convite' }).count()) throw new Error('a festa ainda mostra o botão "Gerar link do convite"');
      await espera(1200);
      exigirSemRolagem(await medirBotao(p, 'Ir para o time'), 'a festa', 'Ir para o time');
    },
  },
  {
    // Rodada 29Q: a caixa do convidado sem app num jogo do Várzea FC, só abrindo a tela: nenhum toque, nada digitado, nada gravado.
    arq: '26-jogo-convidado', sessao: true, precisa: 'jogoVarzea', dica: 'a conta não tem o Várzea FC com algum jogo (precisa ser admin dele)',
    rota: (d) => `/time/${d.jogoVarzea.slug}/jogo/${d.jogoVarzea.id}`, caminho: /^\/time\/[^/]+\/jogo\/[^/?]+$/, seletor: '[data-convidado-titulo]',
    depois: async (p) => {
      const titulo = p.locator('[data-convidado-titulo]');
      const texto = (await p.locator('main').innerText()).replace(/\s+/g, ' ');
      for (const esperado of ['Alguém sem o app vai jogar?', 'Escreva o nome: a pessoa entra no sorteio, mas não conta no ranking.']) {
        if (!texto.includes(esperado)) throw new Error(`a caixa do convidado não mostra "${esperado}"`);
      }
      if (!(await p.getByPlaceholder('Nome de quem vai jogar').count()) || !(await p.getByRole('button', { name: 'Adicionar', exact: true }).count())) throw new Error('a caixa não tem o campo "Nome de quem vai jogar" e o botão "Adicionar"');
      await titulo.evaluate((el) => el.scrollIntoView({ block: 'center' }));
      await espera(600);
    },
  },
  {
    // Rodada 29R (achado 147): a linha "presença ainda não aberta" do Missa de Quinta, tocada de verdade no Início, leva ao jogo certo e já
    // abre o "Abrir presença" dele. A captura para ali, com o campo do prazo aberto: NUNCA toca em "Confirmar" (abrir presença é gravar no
    // banco, e o banco é o de produção; o contexto já responde a qualquer escrita em /api sem chegar a ele, mas nem se tenta).
    arq: '27-presenca-direto', sessao: true, rota: () => '/home', caminho: /^\/time\/[^/]+\?aba=jogos$/,
    seletor: '[data-seu-time], [data-seus-times]', dica: 'o Início não mostrou o card "Seu time"/"Seus times" (a conta precisa ser admin de um time)',
    depois: async (p) => {
      const TIME = 'Missa de Quinta';
      const linhaDoTime = p.locator('[data-time-linha]', { hasText: TIME });
      const varios = (await linhaDoTime.count()) > 0; // "Seus times": a linha do time abre os atalhos ao toque
      if (varios) await linhaDoTime.locator('button[aria-expanded]').click();
      const alvo = (varios ? linhaDoTime : p.locator('[data-seu-time]', { hasText: TIME })).locator('[data-pendencia="presenca"]');
      if (!(await alvo.count())) throw new Error(`o ${TIME} não mostra "presença ainda não aberta" agora (a presença de algum jogo já foi aberta? crie ou escolha um jogo sem presença)`);
      const idDoJogo = new URL(await alvo.getAttribute('href'), BASE).searchParams.get('abrir-presenca');
      if (!idDoJogo) throw new Error('a linha de presença chegou sem ?abrir-presenca=<jogo> (o motor local está velho? feche e reabra o LIGAR-FUTTY.bat)');
      await alvo.click();
      const campo = p.locator(`[data-jogo="${idDoJogo}"] input[type="datetime-local"]`);
      await campo.waitFor({ timeout: 25000 }).catch(() => { throw new Error(`o "Abrir presença" do jogo ${idDoJogo} não abriu`); });
      await p.locator(`[data-jogo="${idDoJogo}"].jogo-destaque`).waitFor({ timeout: 5000 }).catch(() => { throw new Error('o cartão do jogo não ganhou o destaque'); });
      await espera(500);
      const dentro = await p.evaluate((id) => { const r = document.querySelector(`[data-jogo="${id}"]`).getBoundingClientRect(); return r.top >= 0 && r.bottom <= window.innerHeight; }, idDoJogo);
      if (!dentro) throw new Error('o cartão do jogo não está inteiro na tela (a rolagem até ele não chegou)');
    },
  },
  {
    // Rodada 29S-A (achados 151, 155, 156): o Marcar jogo no Várzea FC (NUNCA no Missa de Quinta, que é time de verdade). O "ingresso" se preenche com o
    // que a captura digita; NADA é gravado (o "Criar jogo" nem é tocado — e o contexto já responde a qualquer escrita em /api sem chegar ao banco).
    arq: '28-novo-jogo', sessao: true, precisa: 'jogoVarzea', dica: 'a conta não tem o Várzea FC (precisa ser admin dele)',
    rota: (d) => `/time/${d.jogoVarzea.slug}/jogo/novo`, caminho: /^\/time\/[^/]+\/jogo\/novo$/, seletor: '[data-ingresso]',
    depois: async (p) => { await preencherMarcarJogo(p); },
  },
  {
    // Rodada 29S-A (achado 156): o mesmo, com "mudar só neste jogo" tocado — o selo, o seletor e o bloco em ROXO, e o 6 por time no ingresso.
    arq: '29-novo-jogo-so-neste', sessao: true, precisa: 'jogoVarzea', dica: 'a conta não tem o Várzea FC (precisa ser admin dele)',
    rota: (d) => `/time/${d.jogoVarzea.slug}/jogo/novo`, caminho: /^\/time\/[^/]+\/jogo\/novo$/, seletor: '[data-ingresso]',
    depois: async (p) => {
      await preencherMarcarJogo(p);
      await p.locator('[data-mudar-so-neste]').click();
      await p.locator('[data-selo-so-neste]').waitFor({ timeout: 5000 });
      await p.locator('[data-stepper] [aria-label="Mais"]').click();
      await espera(400);
      if (!(await p.locator('[data-ingresso-so-neste]').count())) throw new Error('o ingresso não mostra o "por time · só neste jogo" em roxo');
      exigirSemRolagem(await medirBotao(p, 'Criar jogo'), 'o Marcar jogo com o seletor roxo', 'Criar jogo');
    },
  },
  {
    // Rodada 29S-A (achados 151 e 152): a pergunta "Como vão sair os times?" e os dois cartões, num jogo do Várzea FC ainda sem times. Só olha: não toca em
    // "Sortear" nem em "Montar à mão". Se o jogo achado já tem times, a captura sai com o estado COM times e o script diz isso.
    arq: '30-jogo-como-saem-os-times', sessao: true, precisa: 'jogoVarzea', dica: 'a conta não tem o Várzea FC com algum jogo (precisa ser admin dele)',
    rota: (d) => `/time/${d.jogoVarzea.slug}/jogo/${d.jogoVarzea.id}`, caminho: /^\/time\/[^/]+\/jogo\/[^/?]+$/, seletor: '[data-como-saem-os-times], [data-trocar-os-times]',
    depois: async (p) => {
      const semTimes = (await p.locator('[data-como-saem-os-times]').count()) > 0;
      if (!semTimes) {
        console.log('      ATENÇÃO: o jogo do Várzea FC que achei JÁ TEM TIMES; a imagem mostra o estado com times ("Trocar os times"), não os dois cartões');
        await p.locator('[data-trocar-os-times]').evaluate((el) => el.scrollIntoView({ block: 'center' }));
      } else {
        await p.locator('[data-como-saem-os-times]').evaluate((el) => el.scrollIntoView({ block: 'center' }));
        const caixas = await p.evaluate(() => ['sortear', 'a-mao'].map((k) => { const r = document.querySelector(`[data-escolha="${k}"]`).getBoundingClientRect(); return { x: r.x, y: Math.round(r.y), w: r.width, b: Math.round(r.bottom) }; }));
        if (Math.abs(caixas[0].y - caixas[1].y) > 2 || caixas[1].x < caixas[0].x + caixas[0].w || caixas[1].x + caixas[1].w > LARGURA || caixas[0].b > ALTURA) throw new Error(`os dois cartões não estão lado a lado e inteiros na tela: ${JSON.stringify(caixas)}`);
      }
      await espera(500);
    },
  },
];

// ── O Marcar jogo nas capturas (29S-A) ───────────────────────────────────────────────────────────────────────────────────────────
// Digita uma data (daqui a 10 dias, no relógio do time) e o local — só no formulário, nada vai ao banco — e confere que o ingresso acompanhou, que
// a hora nasceu em 20:00 e que o time é o Várzea FC. "Criar jogo" tem de caber na primeira tela; se não couber, encolhe o ingresso, nunca a letra.
async function preencherMarcarJogo(p) {
  const nomeDoTime = (await p.locator('[data-ingresso-time]').innerText()).trim();
  if (!/v[áa]rzea fc/i.test(nomeDoTime)) throw new Error(`o Marcar jogo abriu no time "${nomeDoTime}" (as capturas de administração são SÓ no Várzea FC)`);
  const dia = new Date(Date.now() + 10 * 86400000).toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });
  await p.locator('#data').fill(dia);
  await p.locator('#local').fill('Society Madalena — campo 2');
  await espera(400);
  const hora = await p.locator('#hora').inputValue();
  if (hora !== '20:00') throw new Error(`a hora nasceu em ${hora || 'vazio'} (esperado 20:00)`);
  const ingresso = await p.evaluate(() => ({ dia: document.querySelector('[data-ingresso-dia]').innerText.trim(), hora: document.querySelector('[data-ingresso-hora]').innerText.trim(), local: document.querySelector('[data-ingresso-local]').innerText.trim() }));
  if (ingresso.hora !== '20:00' || ingresso.local !== 'Society Madalena — campo 2' || !/\d/.test(ingresso.dia)) throw new Error(`o ingresso não acompanhou o que foi digitado: ${JSON.stringify(ingresso)}`);
  exigirSemRolagem(await medirBotao(p, 'Criar jogo'), 'o Marcar jogo', 'Criar jogo');
  console.log(`      ingresso: ${ingresso.dia} · ${ingresso.hora} · ${ingresso.local}`);
}

// ── O Criar time nas capturas (29O/29P) ────────────────────────────────────────────────────────────────────────────────────────
// Nome + cidade da lista ("Brasília, DF"): o passo 1 só libera o Continuar com os dois.
async function preencherPasso1(p) {
  await p.locator(CAMPO_NOME_DO_TIME).fill('Time Teste');
  const cidade = p.getByPlaceholder('Ex.: Brasília');
  await cidade.click();
  await cidade.fill('Brasíl');
  await p.locator('[data-sugestoes-cidade] button', { hasText: 'Brasília, DF' }).first().click({ timeout: 15000 });
  await espera(400);
}

async function medirBotao(p, rotulo) {
  return p.evaluate((r) => {
    const botao = [...document.querySelectorAll('button')].find((el) => el.textContent.trim() === r);
    return { rola: document.documentElement.scrollHeight > window.innerHeight + 1, fundo: botao ? Math.round(botao.getBoundingClientRect().bottom) : null };
  }, rotulo);
}

function exigirSemRolagem({ rola, fundo }, tela, rotulo) {
  if (rola || fundo === null || fundo > ALTURA) {
    throw new Error(`${tela} não cabe em ${ALTURA} px sem rolar (rola: ${rola}; "${rotulo}" termina em ${fundo} px)`);
  }
}

async function conferir(pagina, t) {
  const problemas = [];
  const url = new URL(pagina.url());
  if (!t.caminho.test(url.pathname + url.search)) problemas.push(`caminho ${url.pathname}${url.search} (esperado ${t.caminho})`);
  const e = await pagina.evaluate(() => ({
    senha: !!document.querySelector('input[type="password"]'),
    texto: document.body.innerText || '',
    largura: document.documentElement.scrollWidth,
  }));
  const permite = t.permite || [];
  if (e.senha && !permite.includes('senha')) problemas.push('formulário de login na tela');
  if (/Página não encontrada|Esta página não existe/.test(e.texto) && !permite.includes('404')) problemas.push('tela "Página não encontrada"');
  if (/Sem permissão/.test(e.texto)) problemas.push('tela "Sem permissão" (a conta não tem acesso a esta área)');
  if (!e.texto.trim()) problemas.push('página em branco');
  const avisos = e.largura > LARGURA ? [`rolagem horizontal: a página tem ${e.largura}px de largura`] : [];
  return { problemas, avisos };
}

function larguraDoPng(arquivo) {
  return fs.readFileSync(arquivo).readUInt32BE(16);
}

async function capturar(navegador, t, estado, dados) {
  const final = path.join(DESTINO, `${t.arq}.png`);
  const rascunho = path.join(PREPARO, `${t.arq}.png`);
  fs.rmSync(final, { force: true });
  fs.rmSync(rascunho, { force: true });
  const contexto = await novoContexto(navegador, { estado: t.sessao ? estado : null, cookiesAceitos: t.cookies !== 'nao', pushPendente: !!t.pushPendente });
  const pagina = await abrir(contexto);
  try {
    await pagina.goto(BASE + t.rota(dados), { waitUntil: 'domcontentloaded', timeout: 45000 });
    await ficarPronta(pagina, t);
    if (t.depois) await t.depois(pagina, dados);
    const { problemas, avisos } = await conferir(pagina, t);
    const medida = t.medirCookies ? await medirFaixaDeCookies(pagina) : null;
    if (t.medirCookies && !medida) problemas.push('a faixa de cookies ou a barra de navegação não apareceu');
    await pagina.screenshot({ path: rascunho, fullPage: false });
    if (larguraDoPng(rascunho) !== LARGURA) problemas.push(`imagem com ${larguraDoPng(rascunho)}px de largura`);
    if (problemas.length) return { arq: t.arq, ok: false, motivo: problemas.join('; '), avisos };
    fs.copyFileSync(rascunho, final);
    return { arq: t.arq, ok: true, bytes: fs.statSync(final).size, avisos, medida };
  } catch (erro) {
    return { arq: t.arq, ok: false, motivo: String(erro.message).split('\n')[0] };
  } finally {
    await contexto.close();
  }
}

async function main() {
  const api = apiLocal();
  const sBase = await status(BASE);
  if (sBase === null) fatal(`o frontend não responde em ${BASE}. Suba com: cd FUTTY-V2\\frontend ; npm run dev`);
  const sApi = await status(api);
  console.log(`frontend ${BASE} → HTTP ${sBase} | API ${api} → ${sApi === null ? 'FORA DO AR' : `HTTP ${sApi}`}`);

  fs.mkdirSync(DESTINO, { recursive: true });
  fs.mkdirSync(PREPARO, { recursive: true });
  const navegador = await chromium.launch({ headless: true });
  const resultados = [];
  try {
    let estado = null;
    let semSessao = null;
    let dados = null;
    if (SO_PUBLICAS) semSessao = 'execução com --so-publicas';
    else if (sApi === null) semSessao = `a API local (${api}) está fora do ar; suba com: cd FUTTY-V2\\backend ; npm start`;
    else {
      try {
        if (ESTADO_LIDO) estado = ESTADO_LIDO;
        else if (fs.existsSync(ESTADO_PROPRIO)) estado = ESTADO_PROPRIO;
        else if (EMAIL && SENHA) {
          console.log('sem sessão salva; tentando o formulário com a conta de FUTTY_TESTE_EMAIL…');
          estado = await entrarPeloFormulario(navegador);
        } else semSessao = 'sem sessão salva: rode  node scripts/entrar-google.mjs  (entra com o Google à mão e salva a sessão)';
        if (estado) {
          dados = await descobrir(navegador, estado);
          if (sessaoRegravada) estado = ESTADO_PROPRIO;
          console.log(`sessão ok | time: ${dados.slug} | jogo sorteado: ${dados.jogoSorteado ? 'sim' : 'NÃO'} | jogos: ${dados.jogoQualquer ? 'sim' : 'NÃO'}`);
        }
      } catch (erro) {
        estado = null;
        semSessao = `sessão: ${String(erro.message).split('\n').map((l) => l.trim()).filter(Boolean).slice(0, 2).join(' ')}`;
      }
    }

    for (const t of TELAS) {
      if (SO_ESTAS.length && !SO_ESTAS.some((n) => t.arq.startsWith(`${n}-`) || t.arq === n)) continue;
      const motivoAntes = (t.sessao && !estado && `NÃO GERADA — ${semSessao}`)
        || (t.precisa && !dados?.[t.precisa] && `NÃO GERADA — ${t.dica}`)
        || (t.arq === '12-sorteio-publico' && !dados && `NÃO GERADA — ${semSessao}`);
      if (motivoAntes) {
        fs.rmSync(path.join(DESTINO, `${t.arq}.png`), { force: true });
        resultados.push({ arq: t.arq, ok: false, motivo: motivoAntes });
        console.log(`  ✗ ${t.arq}: ${motivoAntes}`);
        continue;
      }
      const r = await capturar(navegador, t, estado, dados);
      resultados.push(r);
      console.log(r.ok ? `  ✓ ${t.arq}.png (${Math.round(r.bytes / 1024)} KB)` : `  ✗ ${t.arq}: ${r.motivo}`);
      for (const a of r.avisos || []) console.log(`      aviso: ${a}`);
      if (r.medida) console.log(`      faixa x barra: ${JSON.stringify(r.medida)}`);
    }
  } finally {
    await navegador.close();
  }

  const boas = resultados.filter((r) => r.ok);
  const ruins = resultados.filter((r) => !r.ok);
  console.log(`\n${boas.length} de ${resultados.length} imagens geradas em ${DESTINO}`);
  if (ruins.length) console.log(`NÃO geradas (${ruins.length}):\n${ruins.map((r) => `  - ${r.arq}: ${r.motivo}`).join('\n')}`);
  if (tentativasProducao.length) console.log(`\nREPROVADO: ${tentativasProducao.length} pedido(s) a produção foram abortados:\n${[...new Set(tentativasProducao)].slice(0, 10).join('\n')}`);
  if (midiasServidasLocalmente) console.log(`\n(${midiasServidasLocalmente} foto(s) gravadas com o endereço da produção foram servidas pelo motor local, sem sair da máquina)`);
  if (escritasBloqueadas.length) console.log(`\n(${escritasBloqueadas.length} escrita(s) em /api foram respondidas sem chegar ao banco: ${[...new Set(escritasBloqueadas)].join(', ')})`);
  process.exit(ruins.length || tentativasProducao.length ? 1 : 0);
}

main().catch((erro) => fatal(erro.stack || erro.message));
