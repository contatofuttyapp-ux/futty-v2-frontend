// Prova no navegador da CSP DO SITE — a política de public/_headers, que BLOQUEIA (Content-Security-Policy), não barra nada que o site usa.
//
// No site ela bloqueia de verdade e cada bloqueio vira aviso para POST /api/csp no motor (report-uri / report-to), que o escreve no log. Esta
// prova faz o build de produção numa pasta temporária, serve-o num servidor local com a MESMA política e abre as telas principais — e os gestos
// que puxam coisa de fora: o sorteio de verdade com a cerimônia e o som, o "Gerar" da Figurinha, a Loja, o Radar com a localização e a cidade
// fora da lista (nominatim), o player do YouTube da Resenha e o "Continuar com Google" — com o motor de verdade sobre banco falso. Toda
// violação (o evento securitypolicyviolation da página, guardado fora da página para sobreviver à saída para o Google) reprova.
//
// Nunca contra produção: o build de produção aponta para os endereços de verdade, mas TODO pedido que sai do servidor local é pego no
// navegador (page.route) — o motor vai para o motor falso, os assets para a pasta do build, o resto volta vazio. Os destinos do relatório
// (report-uri / report-to) são tirados na prova: o navegador mandaria os avisos por fora do page.route, direto ao motor de produção.
// O service worker fica bloqueado (os pedidos dele não passam pelo page.route); o worker-src dele é 'self'.
//
// Uso: npm run provar:navegador -- csp-do-site       (CSP_FASE=2: só os gestos do dono de time · CSP_FOTOS=pasta: print de cada gesto que falhar)
import { spawn } from 'node:child_process';
import { createServer as criarServidorHttp } from 'node:http';
import { existsSync, mkdtempSync, readFileSync, rmSync, statSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';

export const nome = 'CSP do site · a política de bloqueio de public/_headers, sobre o build de produção, não barra nada nas telas principais nem nos gestos que puxam coisa de fora';

const RAIZ = fileURLToPath(new URL('../../', import.meta.url));
const MOTOR_31W = path.join(RAIZ, 'scripts', 'provas', '_motor-31w.cjs');
const MOTOR_32D = path.join(RAIZ, 'scripts', 'provas', '_motor-32d.cjs');
const BACKEND_AO_LADO = path.resolve(RAIZ, '..', 'backend', 'tests', '_appFalsa.js');

const envDeProducao = Object.fromEntries(readFileSync(path.join(RAIZ, '.env.production'), 'utf8').split(/\r?\n/)
  .map((l) => l.match(/^(VITE_[A-Z_]+)=(.*)$/)).filter(Boolean).map((m) => [m[1], m[2].trim()]));
const ORIGEM_DO_MOTOR = new URL(envDeProducao.VITE_API_URL).origin;
const ORIGEM_DOS_ASSETS = new URL(envDeProducao.VITE_ASSETS_URL).origin;
const ORIGEM_DO_SUPABASE = new URL(envDeProducao.VITE_SUPABASE_URL).origin;
const CHAVE_DA_SESSAO = `sb-${new URL(envDeProducao.VITE_SUPABASE_URL).hostname.split('.')[0]}-auth-token`;

/** O bloco `/*` de public/_headers: { nome: valor }. */
function blocoGeral(texto) {
  const linhas = texto.split(/\r?\n/);
  const ini = linhas.findIndex((l) => l.trim() === '/*');
  const out = {};
  for (const l of linhas.slice(ini + 1)) {
    const m = l.match(/^\s+([A-Za-z-]+):\s*(.+)$/);
    if (!m) break;
    out[m[1]] = m[2];
  }
  return out;
}

/** Os cabeçalhos do bloco `/*` como o servidor local da prova os serve: a mesma CSP de bloqueio, sem os destinos dos avisos. */
export function cabecalhosDoSite(texto) {
  const out = blocoGeral(texto);
  const politica = out['Content-Security-Policy'];
  delete out['Reporting-Endpoints'];
  out['Content-Security-Policy'] = politica.split(';').map((d) => d.trim()).filter((d) => d && !/^report-(uri|to)\b/.test(d)).join('; ');
  return out;
}

const TIPOS = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.mp3': 'audio/mpeg', '.ico': 'image/x-icon', '.webmanifest': 'application/manifest+json' };
const tipoDe = (p) => TIPOS[path.extname(p).toLowerCase()] || 'application/octet-stream';
/** O arquivo do build para um caminho; o que não é arquivo (as rotas do app) cai no index.html, como no Pages. */
function arquivoDoBuild(pasta, caminho) {
  const p = path.join(pasta, decodeURIComponent(caminho));
  if (p.startsWith(pasta) && existsSync(p) && statSync(p).isFile()) return p;
  return path.extname(caminho) ? null : path.join(pasta, 'index.html');
}

function subirMotor(arquivo, env = {}) {
  return new Promise((resolve, reject) => {
    const filho = spawn(process.execPath, [arquivo], { stdio: ['pipe', 'pipe', 'pipe'], cwd: RAIZ, env: { ...process.env, ...env } });
    let resto = '';
    let erro = '';
    const prazo = setTimeout(() => { filho.kill(); reject(new Error(`o motor falso não ficou pronto em 120 s\n${erro.slice(-700)}`)); }, 120000);
    filho.stderr.on('data', (d) => { erro += d; });
    filho.stdout.on('data', (d) => {
      resto += d;
      const pronto = resto.split('\n').find((l) => l.startsWith('{"pronto"'));
      if (pronto) { clearTimeout(prazo); resolve({ filho, dados: JSON.parse(pronto) }); }
    });
    filho.once('exit', (codigo) => { clearTimeout(prazo); reject(new Error(`o motor falso saiu com ${codigo}\n${erro.slice(-900)}`)); });
  });
}
function encerrarMotor(filho) {
  if (!filho || filho.encerrando) return;
  filho.encerrando = true;
  filho.stdin.on('error', () => { /* o motor já saiu: nada a dizer a ele */ });
  try { filho.stdin.write('fim\n'); } catch { /* já saiu */ }
  setTimeout(() => { try { filho.kill(); } catch { /* já saiu */ } }, 3000).unref();
}

const sessaoDe = (dados, quem) => JSON.stringify({
  access_token: dados.tokens[quem], refresh_token: 'prova', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 86400 * 30,
  user: { id: dados.pessoas[quem].id, aud: 'authenticated', email: 'prova@futty.test', app_metadata: {}, user_metadata: { onboarding_completo: true }, created_at: '2026-01-01T00:00:00Z' },
});
const CABECALHOS_QUE_NAO_VOLTAM = new Set(['content-encoding', 'content-length', 'transfer-encoding', 'connection', 'keep-alive']);
const CABECALHOS_QUE_NAO_VAO = ['host', 'origin', 'referer', 'if-none-match', 'if-modified-since', 'content-length', 'accept-encoding', 'connection'];
const PNG_1X1 = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64');
const PNG_PRONTA = readFileSync(path.join(RAIZ, 'public', 'futty-logo-flat.png')); // PNG com transparência: faz de "figurinha pronta"

/** O pedido ao motor de produção vai ao motor falso; os endereços que ele devolve (o proxy de imagem) voltam com a origem de produção. */
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
  if (cabecalhosDaResposta.location) cabecalhosDaResposta.location = cabecalhosDaResposta.location.split(baseDoMotor).join(ORIGEM_DO_MOTOR);
  let bruto = Buffer.from(await r.arrayBuffer());
  if (/json|text/.test(r.headers.get('content-type') || '')) bruto = Buffer.from(bruto.toString('utf8').split(baseDoMotor).join(ORIGEM_DO_MOTOR));
  return route.fulfill({ status: r.status, headers: cabecalhosDaResposta, body: bruto });
}

// A pintura da Figurinha simulada (a fal nunca é chamada): o POST devolve o job, a consulta devolve "pronta" com a imagem no proxy do motor de
// produção — o endereço que a figurinha pronta tem no site.
const JOB = '5e1f0c1e-0000-4000-8000-0000000032d0';
const IMAGEM_PRONTA = `${ORIGEM_DO_MOTOR}/api/media/prova-32d-figurinha-pronta`;
// A foto do motor de produção é pedida pelo SITE (src/utils/avatar.js#pelaBorda: a borda da Cloudflare guarda): é por lá que ela tem de chegar.
const SITE = 'https://futtyapp.com.br';
const IMAGEM_PRONTA_PELA_BORDA = IMAGEM_PRONTA.replace(ORIGEM_DO_MOTOR, SITE);
const pinturaSimulada = (registro) => async (url, route) => {
  const metodo = route.request().method();
  const cors = { 'access-control-allow-origin': route.request().headers().origin || '*', 'access-control-allow-credentials': 'true' };
  if (url.origin === ORIGEM_DO_MOTOR && url.pathname === '/api/me/avatar/ai' && metodo === 'POST') {
    registro.push('POST /api/me/avatar/ai');
    await route.fulfill({ status: 202, contentType: 'application/json', headers: cors, body: JSON.stringify({ jobId: JOB, estimativaSegundos: 40 }) });
    return true;
  }
  if (url.origin === ORIGEM_DO_MOTOR && url.pathname === `/api/figurinha/job/${JOB}`) {
    registro.push('GET job');
    await route.fulfill({ status: 200, contentType: 'application/json', headers: cors, body: JSON.stringify({ estado: 'pronta', etapa: 'pronta', progresso: 1, estimativaSegundos: 40, decorridoSegundos: 38, avatar_url: IMAGEM_PRONTA, kit: 'dark-gold', figurinha_ativa: true }) });
    return true;
  }
  if (url.href.startsWith(IMAGEM_PRONTA_PELA_BORDA)) {
    registro.push('GET imagem pronta');
    await route.fulfill({ status: 200, contentType: 'image/png', headers: { 'access-control-allow-origin': '*' }, body: PNG_PRONTA });
    return true;
  }
  return false;
};

export async function rodar({ navegador, t }) {
  try { readFileSync(BACKEND_AO_LADO); } catch { t('o backend não está ao lado (FUTTY-V2/backend): a prova foi pulada', true); return; }
  const textoDoHeaders = readFileSync(path.join(RAIZ, 'public', '_headers'), 'utf8');
  const publicado = blocoGeral(textoDoHeaders);
  t('o site publica a CSP de BLOQUEIO (Content-Security-Policy) e nenhuma Report-Only', !!publicado['Content-Security-Policy'] && !/Content-Security-Policy-Report-Only:/.test(textoDoHeaders), Object.keys(publicado).join(', '));
  t('cada bloqueio continua indo para o motor: report-uri, report-to csp e Reporting-Endpoints apontam para POST /api/csp',
    publicado['Content-Security-Policy'].includes(`report-uri ${ORIGEM_DO_MOTOR}/api/csp`) && /report-to csp\b/.test(publicado['Content-Security-Policy']) && publicado['Reporting-Endpoints'] === `csp="${ORIGEM_DO_MOTOR}/api/csp"`,
    `${publicado['Reporting-Endpoints']}`);
  const cabecalhos = cabecalhosDoSite(textoDoHeaders);
  const politica = cabecalhos['Content-Security-Policy'];
  t('a política do site tem script-src, object-src, base-uri, form-action e frame-ancestors', ['script-src', 'object-src', 'base-uri', 'form-action', 'frame-ancestors'].every((d) => politica.includes(`${d} `)), politica);

  const pasta = mkdtempSync(path.join(os.tmpdir(), 'futty-csp-'));
  let servidor = null;
  const filhos = [];
  try {
    await build({ root: RAIZ, configFile: path.join(RAIZ, 'vite.config.js'), mode: 'production', logLevel: 'silent', build: { outDir: pasta, emptyOutDir: true } });
    servidor = criarServidorHttp((req, res) => {
      const caminho = new URL(req.url, 'http://x').pathname;
      const arq = arquivoDoBuild(pasta, caminho);
      if (!arq) { res.writeHead(404, cabecalhos).end(); return; }
      res.writeHead(200, { ...cabecalhos, 'Content-Type': tipoDe(arq) }).end(readFileSync(arq));
    });
    await new Promise((ok) => servidor.listen(0, '127.0.0.1', ok));
    const base = `http://127.0.0.1:${servidor.address().port}`;

    /** Abre uma tela com a política de bloqueio, faz o gesto e conta as violações (guardadas no Node: sobrevivem à página sair do site). */
    async function provarTela(dados, tela) {
      const ctx = await navegador.newContext({
        viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true, locale: 'pt-BR', timezoneId: 'America/Sao_Paulo', serviceWorkers: 'block',
        ...(tela.localizacao ? { geolocation: { latitude: -15.7939, longitude: -47.8828 }, permissions: ['geolocation'] } : {}),
      });
      const deFora = [];
      const violacoes = [];
      await ctx.exposeBinding('__violou', (_fonte, v) => { violacoes.push(v); });
      await ctx.addInitScript(({ chave, sessao, armazenar }) => {
        try {
          localStorage.setItem('futty_cookies', 'aceite');
          if (sessao) localStorage.setItem(chave, sessao);
          for (const [k, v] of Object.entries(armazenar)) localStorage.setItem(k, v);
        } catch { /* sem armazenamento */ }
        document.addEventListener('securitypolicyviolation', (e) => {
          window.__violou(`${e.effectiveDirective} ${e.blockedURI || '(inline)'}${e.sourceFile ? ` @ ${e.sourceFile.split('/').pop()}:${e.lineNumber}` : ''} [${e.disposition}]`);
        });
      }, { chave: CHAVE_DA_SESSAO, sessao: tela.quem ? sessaoDe(dados, tela.quem) : null, armazenar: tela.armazenar || {} });
      await ctx.route('**/*', async (route) => {
        const url = new URL(route.request().url());
        try {
          if (tela.mexer && await tela.mexer(url, route)) return undefined;
          if (url.origin === base) return await route.continue();
          if (url.origin === ORIGEM_DO_MOTOR) return await aoMotor(route, dados.base);
          // A mídia pelo site: a Pages Function a leva ao motor, como aqui.
          if (url.origin === SITE && url.pathname.startsWith('/api/media/')) return await aoMotor(route, dados.base);
          if (url.origin === ORIGEM_DOS_ASSETS) {
            const arq = arquivoDoBuild(pasta, url.pathname);
            return await route.fulfill(arq ? { status: 200, headers: { 'access-control-allow-origin': '*', 'content-type': tipoDe(arq) }, body: readFileSync(arq) } : { status: 404, body: '' });
          }
          if (url.hostname === 'img.youtube.com' || /\.(png|jpe?g|webp)$/i.test(url.pathname)) return await route.fulfill({ status: 200, contentType: 'image/png', body: PNG_1X1 });
          if (url.hostname === 'www.youtube.com') return await route.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>player</title>' });
          if (url.hostname === 'nominatim.openstreetmap.org') {
            return await route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify([{ lat: '-15.79', lon: '-47.88', display_name: 'Cidade da prova' }]) });
          }
          deFora.push(`${route.request().method()} ${url.host}${url.pathname}`);
          if (route.request().isNavigationRequest()) return await route.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>fora do site</title>' });
          return await route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: '{}' });
        } catch { return route.abort().catch(() => {}); }
      });
      await ctx.routeWebSocket(() => true, (ws) => ws.close());
      const page = await ctx.newPage();
      const erros = [];
      page.on('pageerror', (e) => erros.push(e.message));
      try {
        await page.goto(`${base}${tela.rota}`, { waitUntil: 'networkidle', timeout: 120000 });
        await page.locator(tela.esperar).first().waitFor({ timeout: 30000 });
        if (tela.gesto) await tela.gesto(page, deFora);
        await page.waitForLoadState('networkidle').catch(() => {});
        await page.waitForTimeout(800);
        // `esperadas`: as violações que a tela PROVOCA de propósito (o que a política tem de continuar barrando) — cada uma tem de aparecer.
        const esperadas = tela.esperadas || [];
        const inesperadas = violacoes.filter((v) => !esperadas.some((re) => re.test(v)));
        t(`${tela.rotulo}: nenhuma violação da CSP de bloqueio${esperadas.length ? ' além das provocadas' : ''}`, inesperadas.length === 0, [...new Set(inesperadas)].slice(0, 4).join(' | '));
        for (const re of esperadas) t(`${tela.rotulo}: a política barrou o que tinha de barrar (${re.source})`, violacoes.some((v) => re.test(v)), violacoes.join(' | ') || 'nenhuma violação');
        t(`${tela.rotulo}: abre sem erro de página`, erros.length === 0, erros.slice(0, 2).join(' | '));
        if (tela.depois) await tela.depois(page, deFora);
        if (deFora.length) console.log(`    ℹ ${tela.rotulo}: ${deFora.length} pedido(s) de fora respondidos aqui (nada saiu): ${[...new Set(deFora)].slice(0, 3).join(' | ')}`);
      } catch (e) {
        t(`${tela.rotulo}: a tela abriu e o gesto foi feito`, false, e.message.split('\n')[0]);
        if (process.env.CSP_FOTOS) await page.screenshot({ path: path.join(process.env.CSP_FOTOS, `falhou-${tela.rotulo.replace(/[^\w]+/g, '-').slice(0, 40)}.png`) }).catch(() => {});
      }
      await ctx.close();
    }

    // ── 1. As telas principais, no mundo da 31W (a Missa de Quinta com jogos terminado, em andamento e futuro) ── (CSP_FASE=2 pula para os gestos)
    if (process.env.CSP_FASE !== '2') {
      const motor = await subirMotor(MOTOR_31W);
      filhos.push(motor.filho);
      const { dados } = motor;
      const missa = dados.missa.slug;

      // Um post com link do YouTube na Resenha: a miniatura (img.youtube.com) e, ao tocar, o player (frame do www.youtube.com).
      const post = await fetch(`${dados.base}/api/feed/posts`, { method: 'POST', headers: { authorization: `Bearer ${dados.tokens.chavo}`, 'content-type': 'application/json' },
        body: JSON.stringify({ team_id: dados.missa.id, body: 'O gol de ontem: https://www.youtube.com/watch?v=dQw4w9WgXcQ' }) });
      t('o post com o link do YouTube entrou na Resenha (motor falso)', post.status === 201 || post.status === 200, `status ${post.status}`);

      const TELAS = [
        { rotulo: 'entrada (sem sessão)', quem: null, rota: '/', esperar: 'body' },
        // Na web o "Continuar com Google" leva a página inteira ao Supabase (/auth/v1/authorize) — navegação, que a CSP não governa; a prova
        // confere que o toque sai sem violação e que o destino é o de sempre. O "Continuar com a Apple" só existe no app do iPhone.
        {
          rotulo: 'login (e o toque em "Continuar com Google")', quem: null, rota: '/login', esperar: 'form, main',
          gesto: async (p) => {
            t('login na web: o botão da Apple não aparece (só existe no app do iPhone)', (await p.getByRole('button', { name: /Continuar com a Apple/ }).count()) === 0);
            await Promise.all([p.waitForURL((u) => u.href.startsWith(`${ORIGEM_DO_SUPABASE}/auth/v1/authorize`), { timeout: 20000 }), p.getByRole('button', { name: /Continuar com Google/ }).first().click()]);
          },
          depois: async (p) => t('"Continuar com Google" leva ao /auth/v1/authorize do Supabase, com o provedor google', /\/auth\/v1\/authorize\?.*provider=google/.test(p.url()), p.url().slice(0, 120)),
        },
        // O confete (canvas-confetti) desenha num worker criado de um blob — o mundo da prova não tem campeonato para soltá-lo, então o gesto
        // faz o mesmo que ele: new Worker(URL.createObjectURL(new Blob([…]))).
        { rotulo: 'início (com o worker de blob do confete)', quem: 'chavo', rota: '/home', esperar: 'main', gesto: async (p) => { await p.evaluate(() => new Promise((ok) => { const w = new Worker(URL.createObjectURL(new Blob(['postMessage(1)'], { type: 'text/javascript' }))); w.onmessage = () => { w.terminate(); ok(); }; w.onerror = () => ok(); setTimeout(ok, 3000); })); } },
        { rotulo: 'figurinha', quem: 'chavo', rota: '/figurinha', esperar: 'main' },
        { rotulo: 'jogo terminado', quem: 'chavo', rota: `/time/${missa}/jogo/${dados.jogos.terminado}`, esperar: '.sorteio-team' },
        // A cerimônia aberta pelo "Ver sorteio" (sem o gesto de quem sorteou): a máquina, os rolos com as artes do sorteio-assets e as fotos.
        { rotulo: 'cerimônia do sorteio (replay)', quem: 'chavo', rota: `/time/${missa}/jogo/${dados.jogos.emAndamento}/sorteio`, esperar: '.smaq', gesto: async (p) => { await p.waitForTimeout(6000); } },
        { rotulo: 'jogo futuro', quem: 'kim', rota: `/time/${missa}/jogo/${dados.jogos.futuro}`, esperar: 'main' },
        { rotulo: 'time', quem: 'chavo', rota: `/time/${missa}`, esperar: 'main' },
        { rotulo: 'ranking', quem: 'chavo', rota: `/time/${missa}/ranking`, esperar: '.rank-row' },
        { rotulo: 'resenha (com o player do YouTube aberto)', quem: 'chavo', rota: '/feed', esperar: 'main', gesto: async (p) => { await p.getByRole('button', { name: 'Reproduzir vídeo' }).first().click(); await p.locator('iframe[title="YouTube"]').waitFor({ timeout: 15000 }); } },
        { rotulo: 'perfil', quem: 'chavo', rota: '/perfil', esperar: 'main' },
        { rotulo: 'ajustes do time (admin)', quem: 'chavo', rota: `/admin/${missa}`, esperar: 'main' },
        // O Radar: "Usar minha localização" (a permissão do navegador) e uma cidade fora da lista, que o navegador pergunta ao nominatim.
        {
          rotulo: 'radar de peladas (localização + cidade fora da lista no nominatim)', quem: 'chavo', rota: '/explorar', esperar: 'main', localizacao: true,
          gesto: async (p, deFora) => {
            await p.getByRole('button', { name: /Usar minha localização/ }).click();
            await p.getByText('Localização ativa', { exact: true }).waitFor({ timeout: 10000 });
            await p.getByPlaceholder('Sua cidade (Brasil ou Portugal)').fill('Vila Inventada da Prova');
            const nominatim = p.waitForRequest((r) => r.url().startsWith('https://nominatim.openstreetmap.org/search'), { timeout: 10000 });
            await p.getByRole('button', { name: /Não está na lista\? Usar/ }).click();
            await nominatim;
            await p.getByText('Sua zona: Vila Inventada da Prova').waitFor({ timeout: 10000 });
            void deFora;
          },
        },
        { rotulo: 'planos', quem: 'chavo', rota: '/planos', esperar: 'main' },
        // Os scripts que OUTROS injetam (só acontece em produção: a Cloudflare põe o beacon no HTML; o navegador do Instagram põe o pcm.js).
        // Aqui a prova faz o papel deles na /download — a página do anúncio — e um terceiro script de uma origem qualquer, que a política
        // tem de continuar barrando. As respostas vêm daqui (nada sai da máquina).
        {
          rotulo: '/download com o beacon da Cloudflare e o pcm.js da Meta injetados (e um script estranho)', quem: null, rota: '/download', esperar: 'body',
          esperadas: [/^script-src-elem https:\/\/exemplo\.invalid\/intruso\.js .*\[enforce\]$/],
          mexer: async (url, route) => {
            const cors = { 'access-control-allow-origin': '*' };
            if (url.hostname === 'static.cloudflareinsights.com' || url.hostname === 'connect.facebook.net' || url.hostname === 'exemplo.invalid') {
              await route.fulfill({ status: 200, contentType: 'text/javascript', headers: cors, body: `(window.__rodou = window.__rodou || []).push(${JSON.stringify(url.hostname)});` });
              return true;
            }
            if (url.hostname === 'cloudflareinsights.com' || url.hostname === 'www.facebook.com') {
              await route.fulfill(/\/tr\b/.test(url.pathname) ? { status: 200, contentType: 'image/gif', headers: cors, body: PNG_1X1 } : { status: 204, headers: cors, body: '' });
              return true;
            }
            return false;
          },
          gesto: async (p) => {
            const r = await p.evaluate(async () => {
              const script = (src) => new Promise((ok) => { const s = document.createElement('script'); s.src = src; s.onload = () => ok('carregou'); s.onerror = () => ok('barrado'); document.head.appendChild(s); });
              const envio = (u) => fetch(u, { method: 'POST', mode: 'no-cors', body: '{}' }).then(() => 'foi', () => 'barrado');
              const pixel = (u) => new Promise((ok) => { const i = new Image(); i.onload = () => ok('carregou'); i.onerror = () => ok('barrado'); i.src = u; });
              return {
                beacon: await script('https://static.cloudflareinsights.com/beacon.min.js'),
                rum: await envio('https://cloudflareinsights.com/cdn-cgi/rum'),
                pcm: await script('https://connect.facebook.net/en_US/pcm.js'),
                metaEnvio: await envio('https://www.facebook.com/privacy_sandbox/pixel/register/trigger/'),
                metaPixel: await pixel('https://www.facebook.com/tr/?id=prova&ev=PageView'),
                intruso: await script('https://exemplo.invalid/intruso.js'),
                rodou: window.__rodou || [],
              };
            });
            t('…o beacon.min.js da Cloudflare roda e manda para cloudflareinsights.com/cdn-cgi/rum', r.beacon === 'carregou' && r.rum === 'foi' && r.rodou.includes('static.cloudflareinsights.com'), JSON.stringify(r));
            t('…o pcm.js da Meta roda e fala com www.facebook.com (envio e pixel)', r.pcm === 'carregou' && r.metaEnvio === 'foi' && r.metaPixel === 'carregou' && r.rodou.includes('connect.facebook.net'), JSON.stringify(r));
            t('…o script de uma origem qualquer (exemplo.invalid) continua barrado e não roda', r.intruso === 'barrado' && !r.rodou.includes('exemplo.invalid'), JSON.stringify(r));
          },
        },
      ];
      for (const tela of TELAS) await provarTela(dados, tela);
      encerrarMotor(motor.filho);
    }

    // ── 2. Os gestos de quem é dono de time e tem gerações, no mundo da 32D (jogo sem sorteio com 9 confirmados; o Pedro com foto e 3 gerações) ──
    {
      const motor = await subirMotor(MOTOR_32D, { M32D_CREDITOS: '1' });
      filhos.push(motor.filho);
      const { dados } = motor;
      const slug = dados.time.slug;
      const pintura = [];
      const TELAS = [
        // O "Sortear" de verdade: o motor sorteia, a página da cerimônia abre com o som (quem tocou em Sortear) — os efeitos vêm do site por fetch.
        {
          rotulo: 'jogo: "Sortear" e a cerimônia com som', quem: 'adm', rota: `/time/${slug}/jogo/${dados.jogos[0]}`, esperar: '[data-escolha="sortear"]',
          gesto: async (p) => {
            const sons = [];
            p.on('request', (r) => { if (/\/sons\//.test(r.url())) sons.push(r.url()); });
            await p.locator('[data-escolha="sortear"]').click();
            await p.locator('.smaq').waitFor({ timeout: 30000 });
            await p.waitForTimeout(9000);
            t('…a cerimônia buscou os efeitos de som no site (é o gesto de quem sorteou)', sons.length > 0, `${sons.length} pedido(s) de som`);
          },
        },
        // O "Gerar minha figurinha": a pintura é simulada (nunca a fal), a imagem pronta vem do proxy do motor, e o card é desenhado no canvas.
        {
          rotulo: 'figurinha: "Gerar minha figurinha" até a figurinha pronta', quem: 'adm', rota: '/figurinha', esperar: 'main',
          armazenar: { futty_figurinha_estreia: '1', futty_tour_done: '1' }, mexer: pinturaSimulada(pintura),
          gesto: async (p) => {
            // A 390 px o rótulo é o curto ("Gerar figurinha"); o longo ("Gerar minha figurinha") só cabe em tela larga.
            await p.getByRole('button', { name: /^Gerar (minha )?figurinha$/ }).first().click({ timeout: 30000 });
            const confirmar = p.getByRole('button', { name: /^Gerar$/ });
            if (await confirmar.count()) await confirmar.first().click();
            for (let i = 0; i < 60 && !pintura.includes('GET imagem pronta'); i += 1) await p.waitForTimeout(250);
            await p.waitForTimeout(2500);
            t('…a pintura (simulada) foi pedida, acompanhada e a imagem pronta carregou do proxy, pelo site (a borda)', ['POST /api/me/avatar/ai', 'GET job', 'GET imagem pronta'].every((x) => pintura.includes(x)), pintura.join(' · '));
          },
        },
        // A Loja: o botão do topo da Figurinha leva aos Planos. Na web o RevenueCat não existe (só no app da loja, que não recebe estes
        // cabeçalhos), então o que a página faz aqui é o "Pedir ativação".
        {
          rotulo: 'loja (botão "Loja" da Figurinha → Planos, pedir ativação)', quem: 'adm', rota: '/figurinha', esperar: '[data-botao-loja]',
          armazenar: { futty_figurinha_estreia: '1', futty_tour_done: '1' },
          gesto: async (p) => {
            await p.locator('[data-botao-loja]').click();
            await p.waitForURL(/\/planos/, { timeout: 15000 });
            await p.waitForTimeout(1500);
            // force: o botão pulsa sem parar, e o clique comum espera ele ficar parado.
            await p.getByRole('button', { name: 'Pedir a minha', exact: true }).click({ timeout: 15000, force: true });
            await p.waitForTimeout(1500);
          },
        },
      ];
      for (const tela of TELAS) await provarTela(dados, tela);
      encerrarMotor(motor.filho);
    }
  } finally {
    for (const f of filhos) encerrarMotor(f);
    if (servidor) servidor.close();
    rmSync(pasta, { recursive: true, force: true });
  }
}
