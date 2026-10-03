// Capturas de TODAS as telas do app em 390 px, contra o servidor LOCAL (nunca produção).
//
//   node scripts/capturar-telas.mjs [--url http://localhost:5173] [--time <slug>] [--so-publicas] [--saida <pasta>]
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

async function novoContexto(navegador, { estado = null, cookiesAceitos = true } = {}) {
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
  pagina.on('response', async (r) => {
    try {
      const u = new URL(r.url());
      if (r.request().method() === 'GET' && /\/api\/teams\/[^/]+\/games$/.test(u.pathname)) {
        for (const g of (await r.json())?.games || []) jogos.push(g);
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

    return {
      slug,
      userId,
      jogoSorteado: jogos.find((g) => g.sorteio_realizado) || null,
      jogoQualquer: jogos[0] || null,
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

const TELAS = [
  { arq: '01-landing', sessao: false, rota: () => '/', caminho: /^\/$/, extraMs: 1500 },
  { arq: '02-criar-conta', sessao: false, rota: () => '/register', caminho: /^\/register$/, seletor: 'input[type="email"]', permite: ['senha'] },
  { arq: '03-entrar', sessao: false, rota: () => '/login', caminho: /^\/login$/, seletor: 'input[type="email"]', permite: ['senha'] },
  { arq: '04-inicio', sessao: true, rota: () => '/home', caminho: /^\/home$/, seletor: '.games-label, .home-empty' },
  { arq: '05-time-aba-jogos', ...aba('jogos') },
  { arq: '06-time-aba-elenco', ...aba('elenco') },
  { arq: '07-time-aba-ajustes', ...aba('ajustes') },
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
  { arq: '18-explorar', sessao: true, rota: () => '/explorar', caminho: /^\/explorar$/, extraMs: 1500 },
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
];

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
  const contexto = await novoContexto(navegador, { estado: t.sessao ? estado : null, cookiesAceitos: t.cookies !== 'nao' });
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
