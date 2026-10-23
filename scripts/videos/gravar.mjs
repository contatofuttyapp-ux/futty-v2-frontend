// Futty v2.0 — Os vídeos de divulgação do app (insumo bruto para edição): o app DE VERDADE (Vite local, as telas reais) num
// iPhone de 390 × 844 a 3× (1170 × 2532), filmado QUADRO A QUADRO a 30 fps e montado em mp4 H.264 pelo ffmpeg. Sem áudio, sem
// cursor, sem barra de endereço (a captura só vê a página).
//
// Por que quadro a quadro: o screencast do Chromium sem tela não passa de ~3 quadros/s em 1170 × 2532. Aqui o relógio da página
// fica PARADO (page.clock: timers, requestAnimationFrame, Date) e as animações CSS/WAAPI ficam pausadas; a cada quadro o relógio
// anda 1/30 s, as animações andam o mesmo tanto e a tela é fotografada. O vídeo sai no ritmo real do app, sem quadro perdido,
// por mais que cada foto demore.
//
// NADA contra produção, nem leitura: o /api/** é o motor de mentira de _mundo-32b.mjs; os rostos, o escudo, os uniformes e os
// genéricos saem de arquivos locais (FUT/VIDEOS/_rostos, LOJA/demo-logos, backend/scripts/_bench/saida-generico); qualquer outro
// pedido para fora da máquina é respondido aqui mesmo, vazio, e contado.
//
// Uso (de FUTTY-V2/frontend):  FFMPEG=<ffmpeg com libx264> node scripts/videos/gravar.mjs [1 2 3 4]
// Saída: FUT/VIDEOS/NN-nome.mp4 + NN-nome.png (a tela final em 1170 × 2532).
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { ROTA_DOS_ROSTOS, SLUG, ID_DO_JOGO, EU, criarMundo } from './_mundo-32b.mjs';

const FRONTEND = fileURLToPath(new URL('../../', import.meta.url));
const FUT = fileURLToPath(new URL('../../../../', import.meta.url));
const SAIDA = join(FUT, 'VIDEOS');
const ROSTOS = join(SAIDA, '_rostos');
const LOGOS = join(FUT, 'LOJA', 'demo-logos');
const GENERICOS = join(FUT, 'FUTTY-V2', 'backend', 'scripts', '_bench', 'saida-generico');
// O splash nativo do iPhone (a imagem do LaunchScreen, 2732², scaleAspectFit sobre #080808): a abertura começa nele.
const SPLASH_IOS = join(FRONTEND, 'ios', 'App', 'App', 'Assets.xcassets', 'Splash.imageset', 'Default@3x~universal~anyany.png');
const FFMPEG = process.env.FFMPEG || 'ffmpeg';
const FPS = 30;
const L = 390;
const A = 844;
const ESCALA = 3;

const exigir = createRequire(join(FRONTEND, 'package.json'));
const { chromium } = exigir('playwright');
const sharp = exigir('sharp');
const { createServer } = await import(pathToFileURL(join(FRONTEND, 'node_modules/vite/dist/node/index.js')).href);

const REF = new URL((readFileSync(join(FRONTEND, '.env'), 'utf8').match(/^VITE_SUPABASE_URL=(.+)$/m)?.[1] || 'https://prova.supabase.co').trim()).hostname.split('.')[0];
const sessao = JSON.stringify({
  access_token: 'videos-32b', refresh_token: 'videos-32b', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 86400 * 30,
  user: { id: EU.id, aud: 'authenticated', email: 'bruninho@futty.test', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' },
});

const servidor = await createServer({ root: FRONTEND, logLevel: 'silent', server: { host: '127.0.0.1', port: 0 } });
await servidor.listen();
const base = `http://127.0.0.1:${servidor.httpServer.address().port}`;
const navegador = await chromium.launch();
const externos = new Map();
const espera = (ms) => new Promise((ok) => { setTimeout(ok, ms); });

/**
 * Um iPhone novo (contexto limpo), com a sessão do Bruninho, o relógio da página sob controle e a rede inteira respondida aqui.
 * `atrasos`: { 'GET /api/inicio': ms } — a resposta espera esse tempo NO RELÓGIO DO VÍDEO (só durante a filmagem).
 */
async function abrirIphone({ mundo, armazenado = {}, atrasos = {} } = {}) {
  const ctx = await navegador.newContext({
    viewport: { width: L, height: A }, deviceScaleFactor: ESCALA, isMobile: true, hasTouch: true, locale: 'pt-BR', timezoneId: 'America/Sao_Paulo',
    reducedMotion: 'no-preference', colorScheme: 'dark',
  });
  await ctx.addInitScript(({ chave, sessao: s, armazenado: extra }) => {
    try {
      if (sessionStorage.getItem('v32b-plantado')) return; // só no 1º carregamento: o app pode mudar o que plantamos
      sessionStorage.setItem('v32b-plantado', '1');
      localStorage.setItem('futty_cookies', 'aceite');
      localStorage.setItem(chave, s);
      for (const [k, v] of Object.entries(extra)) localStorage.setItem(k, v);
    } catch { /* about:blank não tem storage */ }
  }, { chave: `sb-${REF}-auth-token`, sessao, armazenado });
  const page = await ctx.newPage();
  await page.clock.install();
  const iphone = { ctx, page, erros: [], filmagem: null };
  page.on('pageerror', (e) => iphone.erros.push(e.message));
  const origem = new URL(base).host;
  await page.route('**/*', async (route) => {
    const req = route.request();
    const u = new URL(req.url());
    if (u.pathname.startsWith('/api/')) {
      const bruto = req.postData();
      let corpo = null;
      try { corpo = bruto ? JSON.parse(bruto) : null; } catch { corpo = { multipart: true }; }
      const atraso = atrasos[`${req.method()} ${u.pathname}`];
      const f = iphone.filmagem;
      if (atraso && f) { const alvo = f.virtual + atraso; while (iphone.filmagem === f && f.virtual < alvo) await espera(15); }
      const r = mundo.responder(u.pathname, req.method(), corpo);
      return route.fulfill({ status: r.status, contentType: 'application/json', body: JSON.stringify(r.json), headers: { 'access-control-allow-origin': '*' } });
    }
    const servir = (arquivo) => route.fulfill({ status: 200, contentType: 'image/png', body: readFileSync(arquivo), headers: { 'access-control-allow-origin': '*', 'cache-control': 'max-age=3600' } });
    if (u.host === origem && u.pathname.startsWith(ROTA_DOS_ROSTOS)) {
      // v32b-<rosto>-ai-dark-gold.png = a figurinha; v32b-<rosto>-foto-N.jpg = a foto crua (o NOME do arquivo é o que o app lê).
      const m = u.pathname.slice(ROTA_DOS_ROSTOS.length).match(/^v32b-([a-z]+)-(ai-dark-gold\.png|foto(?:-\d+)?\.jpg)$/);
      const arquivo = m && join(ROSTOS, m[2].startsWith('ai') ? `${m[1]}-ai.png` : `${m[1]}-foto.png`);
      if (arquivo && existsSync(arquivo)) return servir(arquivo);
      return route.fulfill({ status: 404, body: '' });
    }
    const logo = u.pathname.match(/^\/__demo-logos\/([\w-]+\.png)$/);
    if (u.host === origem && logo && existsSync(join(LOGOS, logo[1]))) return servir(join(LOGOS, logo[1]));
    if (u.host === origem) return route.continue();
    // Fora da máquina: nunca sai. Uniformes e genéricos da casa (bucket público `kits`) saem das cópias locais.
    const kit = u.pathname.match(/\/kits\/(kit\d-[a-z-]+\.png)$/);
    if (kit && existsSync(join(ROSTOS, 'kits', kit[1]))) return servir(join(ROSTOS, 'kits', kit[1]));
    const generico = u.pathname.match(/avatar-generico-(f-)?(\d)\.png$/);
    if (generico) {
      const arquivo = join(GENERICOS, `generico-${generico[1] ? 'f-' : ''}c${generico[2]}.png`);
      if (existsSync(arquivo)) return servir(arquivo);
    }
    const chave = `${u.host}${u.pathname.replace(/\/[0-9a-f-]{20,}.*/, '/…')}`;
    externos.set(chave, (externos.get(chave) || 0) + 1);
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{}', headers: { 'access-control-allow-origin': '*' } });
  });
  return iphone;
}

/** Espera o app assentar (relógio ainda correndo solto, antes da filmagem): fontes prontas, imagens à vista carregadas. */
async function assentar(page, minimo = 1000) {
  const inicio = Date.now();
  for (let i = 0; i < 60; i += 1) {
    await page.waitForTimeout(250);
    const pronto = await page.evaluate(async () => {
      await document.fonts.ready;
      return [...document.images].filter((im) => im.src && im.offsetParent !== null).every((im) => im.complete);
    });
    if (pronto && Date.now() - inicio >= minimo) return;
  }
}

// ── a filmagem quadro a quadro ───────────────────────────────────────────────────────────────────────────────────────────

/** Pausa toda animação que está rodando e avança as que a filmagem pausou. Roda na página, uma vez por quadro. */
function andarAnimacoes({ dt, primeira }) {
  const nossas = window.__v32b || (window.__v32b = new WeakSet());
  for (const a of document.getAnimations()) {
    if (a.playState === 'running') {
      // Nova desde o último quadro: o tempo de verdade que ela correu durante a foto anterior não conta.
      a.pause();
      if (!primeira && a.currentTime != null && a.currentTime > dt) a.currentTime = dt;
      nossas.add(a);
    } else if (a.playState === 'paused' && nossas.has(a)) {
      const fim = a.effect?.getComputedTiming().endTime;
      const t = (a.currentTime || 0) + dt * (a.playbackRate || 1);
      if (Number.isFinite(fim) && t >= fim && (a.playbackRate || 1) > 0) { nossas.delete(a); a.finish(); } else a.currentTime = t;
    }
  }
}

async function filmar(iphone, nome) {
  const { page } = iphone;
  const pasta = join(SAIDA, '_quadros', nome);
  rmSync(pasta, { recursive: true, force: true });
  mkdirSync(pasta, { recursive: true });
  await page.clock.pauseAt(Date.now() + 50);
  await page.evaluate(andarAnimacoes, { dt: 0, primeira: true });
  // A foto vai direto pelo protocolo do Chromium: o page.screenshot do Playwright faz preparos a cada chamada e leva ~10× mais.
  // Sem o preparo dele, o cursor de texto (que pisca) some por CSS, numa folha que acompanha cada página nova.
  const cdp = await page.context().newCDPSession(page);
  const semCursor = () => page.addStyleTag({ content: '*, *::before, *::after { caret-color: transparent !important; }' }).catch(() => {});
  page.on('load', semCursor);
  await semCursor();
  // No meio de uma navegação a página ainda não tem o que fotografar ("Unable to capture screenshot"): tenta de novo.
  const capturar = async () => {
    for (let tentativa = 1; ; tentativa += 1) {
      try {
        return Buffer.from((await cdp.send('Page.captureScreenshot', { format: 'jpeg', quality: 94 })).data, 'base64');
      } catch (e) {
        if (tentativa >= 100) throw e;
        await espera(50);
      }
    }
  };
  let n = 0;
  const arquivo = () => join(pasta, `q${String(n).padStart(6, '0')}.jpg`);
  const f = {
    pasta,
    page,
    virtual: 0,
    get quadros() { return n; },
    /** Um quadro: o relógio anda 1/30 s, as animações também, e a tela é fotografada. */
    async quadro() {
      const dt = Math.round(((n + 1) * 1000) / FPS) - Math.round((n * 1000) / FPS);
      await page.clock.runFor(dt);
      await page.evaluate(andarAnimacoes, { dt, primeira: false });
      f.virtual += dt;
      n += 1;
      writeFileSync(arquivo(), await capturar());
    },
    async passar(ms) { for (let k = Math.round((ms * FPS) / 1000); k > 0; k -= 1) await f.quadro(); },
    /** Filma até a condição (uma função que roda na página) dar verdadeiro; `max` em ms do vídeo. */
    async ate(cond, arg, { max = 30000, rotulo = 'a condição' } = {}) {
      const limite = f.virtual + max;
      while (!(await page.evaluate(cond, arg))) {
        if (f.virtual > limite) throw new Error(`${rotulo} não aconteceu em ${max / 1000} s de vídeo`);
        await f.quadro();
      }
    },
    /** Quadros prontos (o splash nativo): `vezes` cópias da mesma imagem. */
    async imagem(buffer, vezes = 1) {
      for (let k = 0; k < vezes; k += 1) { n += 1; writeFileSync(arquivo(), buffer); }
    },
    foto: capturar,
    async soltar() { page.off('load', semCursor); await cdp.detach().catch(() => {}); },
  };
  iphone.filmagem = f;
  return f;
}

/** Fecha a filmagem: a tela final em PNG, o mp4 montado dos quadros, o relógio solto de novo. */
const relatorio = [];
async function fechar(iphone, nome) {
  const f = iphone.filmagem;
  await iphone.page.screenshot({ path: join(SAIDA, `${nome}.png`), caret: 'hide', animations: 'allow' });
  iphone.filmagem = null;
  await f.soltar();
  await iphone.page.clock.resume().catch(() => {});
  const destino = join(SAIDA, `${nome}.mp4`);
  const r = spawnSync(FFMPEG, [
    '-y', '-hide_banner', '-loglevel', 'error', '-framerate', String(FPS), '-i', join(f.pasta, 'q%06d.jpg'),
    // A captura é JPEG de faixa cheia; o vídeo sai em BT.709 de faixa limitada, marcado, para o celular não lavar as cores.
    '-vf', `scale=${L * ESCALA}:${A * ESCALA}:flags=lanczos:in_range=full:out_range=tv:out_color_matrix=bt709,setsar=1`,
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '14', '-profile:v', 'high', '-pix_fmt', 'yuv420p',
    '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709', '-color_range', 'tv',
    '-r', String(FPS), '-movflags', '+faststart', '-an', destino,
  ], { encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`ffmpeg falhou: ${r.stderr || r.error}`);
  const info = { nome, quadros: f.quadros, duracao: f.quadros / FPS, erros: [...new Set(iphone.erros)] };
  relatorio.push(info);
  console.log(`   ✓ ${nome}.mp4  ${info.duracao.toFixed(1)} s · ${info.quadros} quadros a ${FPS} fps · ${nome}.png`);
  if (info.erros.length) console.log(`   (erros da página: ${info.erros.join(' | ')})`);
}

/** Começa a rolar a página até `ate` px em `ms` do relógio do vídeo (devagar nas pontas). Não espera: os quadros é que fazem andar. */
function rolar(page, { ate = null, ms = 8000, dentroDe = null } = {}) {
  return page.evaluate(({ ate: alvo, ms: duracao, dentroDe: seletor }) => {
    // `dentroDe`: rola o primeiro contêiner com rolagem própria dentro desse seletor (a máquina do sorteio rola por dentro).
    const rola = (e) => /(auto|scroll)/.test(getComputedStyle(e).overflowY) && e.scrollHeight > e.clientHeight + 1;
    const raiz = seletor && document.querySelector(seletor);
    const el = (raiz && [raiz, ...raiz.querySelectorAll('*')].find(rola)) || document.scrollingElement;
    const de = el.scrollTop;
    const para = alvo == null ? el.scrollHeight - el.clientHeight : alvo;
    const t0 = performance.now();
    const passo = (agora) => {
      const x = Math.min(1, (agora - t0) / duracao);
      const e = x < 0.5 ? 2 * x * x : 1 - ((-2 * x + 2) ** 2) / 2;
      el.scrollTop = de + (para - de) * e;
      if (x < 1) requestAnimationFrame(passo);
    };
    requestAnimationFrame(passo);
  }, { ate, ms, dentroDe });
}

// Toque de dedo: sem a espera de "elemento parado" do Playwright (com o relógio parado ela não teria como medir). Se o alvo está
// fora da faixa livre da tela (atrás da barra de baixo ou do topo), a página rola até ele com calma antes, como um dedo faria.
async function tocar(f, loc) {
  await loc.waitFor({ state: 'attached', timeout: 10000 });
  const { topo, alto, rolagem } = await loc.evaluate((el) => {
    const r = el.getBoundingClientRect();
    return { topo: r.top, alto: r.height, rolagem: document.scrollingElement.scrollTop };
  });
  if (topo < 90 || topo + alto > A - 110) {
    await rolar(f.page, { ate: Math.max(0, rolagem + topo + alto / 2 - A * 0.45), ms: 700 });
    await f.passar(800);
  }
  await loc.tap({ force: true, timeout: 10000 });
}

// ── 1 · Abertura ─────────────────────────────────────────────────────────────────────────────────────────────────────────
async function abertura() {
  const mundo = criarMundo({ base });
  // A Início espera o /api/inicio: 250 ms, uma rede boa de celular (mais que isso a tela fica um instante só com o fundo).
  const iphone = await abrirIphone({ mundo, atrasos: { 'GET /api/inicio': 250, 'GET /api/me': 250 } });
  const { page } = iphone;
  await page.setContent('<html style="background:#080808"><body style="margin:0;background:#080808"></body></html>');
  const f = await filmar(iphone, '01-abertura');
  // O splash nativo (o LaunchScreen do iPhone) vem antes do WebView: 1,2 s parado e 0,2 s de saída (launchFadeOutDuration).
  // A saída vai para o fundo #080808 do WebView: o F do carregamento do app entra depois, sem dois F sobrepostos.
  const splash = await splashNativo();
  await f.imagem(splash, Math.round(1.2 * FPS));
  for (let k = 1; k <= 6; k += 1) {
    const veu = await sharp({ create: { width: L * ESCALA, height: A * ESCALA, channels: 4, background: { r: 8, g: 8, b: 8, alpha: k / 6 } } }).png().toBuffer();
    await f.imagem(await sharp(splash).composite([{ input: veu }]).jpeg({ quality: 94 }).toBuffer());
  }
  await page.goto(`${base}/`, { waitUntil: 'commit' });
  await f.ate(() => !!document.querySelector('.bottom-nav') && [...document.querySelectorAll('img')].filter((i) => i.offsetParent).every((i) => i.complete) && /Domingueira FC/.test(document.body.innerText), null, { max: 15000, rotulo: 'a Início' });
  await f.passar(3500);
  await fechar(iphone, '01-abertura');
  await iphone.ctx.close();
  return mundo;
}

async function splashNativo() {
  const lado = L * ESCALA; // scaleAspectFit: o quadrado de 2732 cabe na largura
  const img = await sharp(SPLASH_IOS).resize(lado, lado).png().toBuffer();
  return sharp({ create: { width: L * ESCALA, height: A * ESCALA, channels: 3, background: '#080808' } })
    .composite([{ input: img, top: Math.round((A * ESCALA - lado) / 2), left: 0 }]).jpeg({ quality: 94 }).toBuffer();
}

// ── 2 · Ranking ──────────────────────────────────────────────────────────────────────────────────────────────────────────
async function ranking() {
  const mundo = criarMundo({ base });
  // A festa do pódio é para quando a pessoa CHEGA ao pódio; o Bruninho já estava em 2º (sem confete por cima da lista).
  const iphone = await abrirIphone({ mundo, armazenado: { [`futty_podio_celebrado:${SLUG}`]: '2' } });
  const { page } = iphone;
  await page.goto(`${base}/time/${SLUG}/ranking`);
  await page.locator('.rank-list .rank-row').nth(14).waitFor({ timeout: 30000 });
  await assentar(page, 2500);
  const f = await filmar(iphone, '02-ranking');
  await f.passar(2000);
  await rolar(page, { ms: 10000 });
  await f.passar(10000);
  await f.passar(1500);
  await fechar(iphone, '02-ranking');
  await iphone.ctx.close();
  return mundo;
}

// ── 3 · Sorteio ──────────────────────────────────────────────────────────────────────────────────────────────────────────
async function sorteio() {
  const mundo = criarMundo({ base });
  const iphone = await abrirIphone({ mundo });
  const { page } = iphone;
  await page.goto(`${base}/time/${SLUG}/jogo/${ID_DO_JOGO}`);
  const botao = page.locator('[data-escolha="sortear"]');
  await botao.waitFor({ timeout: 30000 });
  await assentar(page, 2000);
  // O começo mostra a conta do sorteio (15 confirmados, 5 por time) e o botão Sortear, perto do pé da tela.
  await botao.evaluate((el) => { const r = el.getBoundingClientRect(); window.scrollBy(0, r.bottom - window.innerHeight + 170); });
  await assentar(page, 800);
  const f = await filmar(iphone, '03-sorteio');
  await f.passar(1800);
  await tocar(f, botao);
  // O app não volta a rolagem ao topo ao trocar de tela: a cerimônia herdaria a rolagem do pé da página do jogo e abriria com o
  // topo da máquina cortado. No vídeo, a tela nova começa do topo (anotado no relatório como coisa do app).
  await f.ate(() => location.pathname.endsWith('/sorteio'), null, { max: 10000, rotulo: 'a tela do sorteio' });
  await page.evaluate(() => window.scrollTo(0, 0));
  await f.ate(() => !!document.querySelector('.smaq .saltar.on'), null, { max: 10000, rotulo: 'a cerimônia' });
  await f.ate(() => { const s = document.querySelector('.smaq .saltar'); return !!s && !s.classList.contains('on'); }, null, { max: 90000, rotulo: 'o fim da cerimônia' });
  await f.passar(2000);
  // Os três times não cabem na janela da máquina: ela rola por dentro (as setas ⌄ ao lado) até o fim do Time Prata.
  await rolar(page, { ms: 2500, dentroDe: '.smaq' });
  await f.passar(3000);
  await rolar(page, { ms: 3000 });
  await f.passar(3000);
  await f.passar(1500);
  await fechar(iphone, '03-sorteio');
  await iphone.ctx.close();
  return mundo;
}

// ── 4 · Figurinha ────────────────────────────────────────────────────────────────────────────────────────────────────────
async function figurinha() {
  const mundo = criarMundo({ base });
  const { perfil } = mundo;
  // O Bruninho ainda sem foto nem figurinha, com direito a gerar (Minha Figurinha: 10 gerações).
  Object.assign(perfil, { foto_url: null, avatar_url: null, figurinha_ativa: false, tem_figurinha: false, slots: [] });
  const foto = mundo.rostoDe(EU).replace('-ai-dark-gold.png', '-foto-1.jpg');
  const figura = mundo.rostoDe(EU);
  let restantes = 10;
  let consultas = 0;
  // A pintura de verdade leva ~45 s (a estimativa que o app mostra é a do motor sem histórico). Aqui o app pergunta de 3 em 3 s
  // (relógio do vídeo) e a 4ª pergunta já a encontra pronta: o vídeo não espera os 45 s.
  const ETAPAS = ['preparando', 'pintando', 'acabamento'];
  mundo.extras.rotas.push((caminho, metodo) => {
    if (metodo === 'GET' && caminho === '/api/brilhantes/estado') {
      return { status: 200, json: { direito: { fonte: 'credito', team_id: null, kit_id: null, restantes, total: restantes }, creditos: restantes, times: [], pedidos: [], loja_pronta: false } };
    }
    if (metodo === 'GET' && caminho === '/api/me/avatar/historico') return { status: 200, json: { items: [] } };
    if (metodo === 'POST' && caminho === '/api/me/avatar') {
      Object.assign(perfil, { foto_url: foto, avatar_url: foto, figurinha_ativa: false });
      return { status: 200, json: { foto_url: foto, avatar_url: foto, foto_original_url: foto, figurinha_ativa: false } };
    }
    if (metodo === 'PUT' && caminho === '/api/me/avatar/enquadro') return { status: 200, json: { recorte: null, avatar_url: perfil.avatar_url } };
    if (metodo === 'POST' && caminho === '/api/me/avatar/ai') return { status: 202, json: { jobId: 'pintura-32b', estimativaSegundos: 45 } };
    if (metodo === 'GET' && caminho === '/api/figurinha/job/pintura-32b') {
      consultas += 1;
      if (consultas <= ETAPAS.length) return { status: 200, json: { estado: 'em_andamento', etapa: ETAPAS[consultas - 1], decorridoSegundos: (consultas - 1) * 3, estimativaSegundos: 45 } };
      if (!perfil.figurinha_ativa) {
        Object.assign(perfil, { avatar_url: figura, figurinha_ativa: true, tem_figurinha: true, slots: ['dark-gold'] });
        restantes = 9;
      }
      return { status: 200, json: { estado: 'pronta', avatar_url: figura, kit: 'dark-gold', figurinha_ativa: true } };
    }
    return undefined;
  });
  const iphone = await abrirIphone({ mundo, armazenado: { futty_figurinha_estreia: '1' } });
  const { page } = iphone;
  await page.goto(`${base}/figurinha`);
  await page.locator('.fig-studio-card img.fig-aura').waitFor({ timeout: 30000 });
  await assentar(page, 2000);
  const f = await filmar(iphone, '04-figurinha');
  await f.passar(1200);
  // Adicionar foto → "Sua foto" → Escolher outra foto → a galeria (a foto comum do Bruninho) → recorte → Confirmar.
  await tocar(f, page.getByRole('button', { name: /Adicionar foto/i }).first());
  await f.passar(900);
  const escolha = page.waitForEvent('filechooser');
  await tocar(f, page.getByRole('button', { name: /Escolher outra foto/i }).first());
  await (await escolha).setFiles(join(ROSTOS, 'bruninho-foto.png'));
  await f.ate(() => !!document.querySelector('[data-crop-modal]'), null, { rotulo: 'o recorte' });
  await f.passar(1500);
  await tocar(f, page.getByRole('button', { name: 'Confirmar' }));
  await f.ate(() => !document.querySelector('[data-crop-modal]'), null, { rotulo: 'o fim do recorte' });
  // A foto comum no card: o "antes".
  await f.passar(2200);
  const tile = page.locator('button[aria-label="Ouro Escuro · gerar figurinha"]');
  if (await tile.count()) {
    // O uniforme: "Ouro Escuro · gerar figurinha" → "Gerar figurinha com este uniforme?" → Gerar.
    await tocar(f, tile.first());
    await f.passar(1300);
    await tocar(f, page.getByRole('button', { name: /^Gerar$/ }));
  } else {
    await tocar(f, page.locator('.fig-gerar').first());
  }
  await f.ate(() => !!document.querySelector('[data-pintura="barra"]'), null, { rotulo: 'a pintura' });
  await rolar(page, { ate: 0, ms: 600 });
  await f.ate(() => !document.querySelector('[data-pintura="barra"]') && !document.querySelector('[data-pintando-aviso]'), null, { max: 40000, rotulo: 'a figurinha pronta' });
  await f.passar(3000);
  await fechar(iphone, '04-figurinha');
  await iphone.ctx.close();
  return mundo;
}

const VIDEOS = { 1: abertura, 2: ranking, 3: sorteio, 4: figurinha };
const pedidos = process.argv.slice(2).map(Number).filter((n) => VIDEOS[n]);
let falhou = false;
try {
  // O 1º carregamento do Vite otimiza dependências e recarrega a página: aquece antes, fora da filmagem.
  {
    const { ctx, page } = await abrirIphone({ mundo: criarMundo({ base }) });
    await page.goto(`${base}/home`);
    await page.locator('text=Domingueira FC').first().waitFor({ timeout: 120000 });
    for (const rota of [`/time/${SLUG}/ranking`, `/time/${SLUG}/jogo/${ID_DO_JOGO}`, '/figurinha']) {
      await page.goto(`${base}${rota}`);
      await page.waitForTimeout(2500);
    }
    await ctx.close();
  }
  for (const n of (pedidos.length ? pedidos : [1, 2, 3, 4])) {
    console.log(`\n▸ vídeo ${n}`);
    try {
      const mundo = await VIDEOS[n]();
      if (mundo.desconhecidos.size) console.log(`   (rotas respondidas vazias: ${[...mundo.desconhecidos].join(', ')})`);
    } catch (e) {
      falhou = true;
      console.error(`  ✖ o vídeo ${n} falhou: ${e.message.split('\n')[0]}`);
    }
  }
} finally {
  await navegador.close();
  await servidor.close();
}
mkdirSync(join(SAIDA, '_quadros'), { recursive: true });
writeFileSync(join(SAIDA, '_quadros', 'resumo.json'), JSON.stringify({ relatorio, externos: [...externos] }, null, 2));
console.log(`\nPedidos que tentaram sair da máquina e foram respondidos aqui (nenhum saiu): ${[...externos.values()].reduce((a, b) => a + b, 0)}`);
for (const [k, v] of externos) console.log(`   ${v}× ${k}`);
process.exit(falhou ? 1 : 0);
