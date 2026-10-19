// Prova no navegador da CSP DO SITE — a política de public/_headers, ligada em modo de BLOQUEIO, não barra nada que o site usa.
//
// No site ela vai em Content-Security-Policy-Report-Only (só avisa, e os avisos vão para POST /api/csp no motor); vira bloqueio de
// verdade só depois de uma semana sem aviso. Esta prova adianta a semana: faz o build de produção numa pasta temporária, serve-o num
// servidor local com a MESMA política em modo de bloqueio e abre as telas principais com o motor de verdade sobre banco falso. Toda
// violação (o evento securitypolicyviolation da página) reprova.
//
// Nunca contra produção: o build de produção aponta para os endereços de verdade, mas TODO pedido que sai do servidor local é pego no
// navegador (page.route) — o motor vai para o motor falso, os assets para a pasta do build, o resto volta vazio. Os avisos da política
// (report-uri / report-to) são tirados na prova: o navegador os mandaria por fora do page.route, direto ao motor de produção.
// O service worker fica bloqueado (os pedidos dele não passam pelo page.route); o worker-src dele é 'self'.
//
// Uso: npm run provar:navegador -- csp-do-site
import { spawn } from 'node:child_process';
import { createServer as criarServidorHttp } from 'node:http';
import { existsSync, mkdtempSync, readFileSync, rmSync, statSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';

export const nome = 'CSP do site · a política de public/_headers, em modo de bloqueio sobre o build de produção, não barra nada nas telas principais';

const RAIZ = fileURLToPath(new URL('../../', import.meta.url));
const MOTOR = path.join(RAIZ, 'scripts', 'provas', '_motor-31w.cjs');
const BACKEND_AO_LADO = path.resolve(RAIZ, '..', 'backend', 'tests', '_appFalsa.js');

const envDeProducao = Object.fromEntries(readFileSync(path.join(RAIZ, '.env.production'), 'utf8').split(/\r?\n/)
  .map((l) => l.match(/^(VITE_[A-Z_]+)=(.*)$/)).filter(Boolean).map((m) => [m[1], m[2].trim()]));
const ORIGEM_DO_MOTOR = new URL(envDeProducao.VITE_API_URL).origin;
const ORIGEM_DOS_ASSETS = new URL(envDeProducao.VITE_ASSETS_URL).origin;
const CHAVE_DA_SESSAO = `sb-${new URL(envDeProducao.VITE_SUPABASE_URL).hostname.split('.')[0]}-auth-token`;

/** Os cabeçalhos do bloco `/*` de public/_headers, com a CSP em modo de bloqueio e sem os destinos dos avisos. */
export function cabecalhosDoSite(texto) {
  const linhas = texto.split(/\r?\n/);
  const ini = linhas.findIndex((l) => l.trim() === '/*');
  const out = {};
  for (const l of linhas.slice(ini + 1)) {
    const m = l.match(/^\s+([A-Za-z-]+):\s*(.+)$/);
    if (!m) break;
    out[m[1]] = m[2];
  }
  const politica = out['Content-Security-Policy-Report-Only'];
  delete out['Content-Security-Policy-Report-Only'];
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

function subirMotor() {
  return new Promise((resolve, reject) => {
    const filho = spawn(process.execPath, [MOTOR], { stdio: ['pipe', 'pipe', 'pipe'], cwd: RAIZ });
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

const sessaoDe = (dados, quem) => JSON.stringify({
  access_token: dados.tokens[quem], refresh_token: 'prova', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 86400 * 30,
  user: { id: dados.pessoas[quem].id, aud: 'authenticated', email: 'prova@futty.test', app_metadata: {}, user_metadata: { onboarding_completo: true }, created_at: '2026-01-01T00:00:00Z' },
});
const CABECALHOS_QUE_NAO_VOLTAM = new Set(['content-encoding', 'content-length', 'transfer-encoding', 'connection', 'keep-alive']);
const CABECALHOS_QUE_NAO_VAO = ['host', 'origin', 'referer', 'if-none-match', 'if-modified-since', 'content-length', 'accept-encoding', 'connection'];
const PNG_1X1 = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64');

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

export async function rodar({ navegador, t }) {
  try { readFileSync(BACKEND_AO_LADO); } catch { t('o backend não está ao lado (FUTTY-V2/backend): a prova foi pulada', true); return; }
  const cabecalhos = cabecalhosDoSite(readFileSync(path.join(RAIZ, 'public', '_headers'), 'utf8'));
  const politica = cabecalhos['Content-Security-Policy'];
  t('a política do site tem script-src, object-src, base-uri, form-action e frame-ancestors', ['script-src', 'object-src', 'base-uri', 'form-action', 'frame-ancestors'].every((d) => politica.includes(`${d} `)), politica);

  const pasta = mkdtempSync(path.join(os.tmpdir(), 'futty-csp-'));
  let servidor = null;
  let filho = null;
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
    const motor = await subirMotor();
    filho = motor.filho;
    const { dados } = motor;
    const missa = dados.missa.slug;

    // Um post com link do YouTube na Resenha: a miniatura (img.youtube.com) e, ao tocar, o player (frame do www.youtube.com).
    const timeId = dados.missa.id;
    const post = await fetch(`${dados.base}/api/feed/posts`, { method: 'POST', headers: { authorization: `Bearer ${dados.tokens.chavo}`, 'content-type': 'application/json' },
      body: JSON.stringify({ team_id: timeId, body: 'O gol de ontem: https://www.youtube.com/watch?v=dQw4w9WgXcQ' }) });
    t('o post com o link do YouTube entrou na Resenha (motor falso)', post.status === 201 || post.status === 200, `status ${post.status}`);

    const TELAS = [
      { rotulo: 'entrada (sem sessão)', quem: null, rota: '/', esperar: 'body' },
      { rotulo: 'login', quem: null, rota: '/login', esperar: 'form, main' },
      // O confete (canvas-confetti) desenha num worker criado de um blob — o mundo da prova não tem campeonato para soltá-lo, então o gesto
      // faz o mesmo que ele: new Worker(URL.createObjectURL(new Blob([…]))).
      { rotulo: 'início (com o worker de blob do confete)', quem: 'chavo', rota: '/home', esperar: 'main', gesto: async (p) => { await p.evaluate(() => new Promise((ok) => { const w = new Worker(URL.createObjectURL(new Blob(['postMessage(1)'], { type: 'text/javascript' }))); w.onmessage = () => { w.terminate(); ok(); }; w.onerror = () => ok(); setTimeout(ok, 3000); })); } },
      { rotulo: 'figurinha', quem: 'chavo', rota: '/figurinha', esperar: 'main' },
      { rotulo: 'jogo terminado', quem: 'chavo', rota: `/time/${missa}/jogo/${dados.jogos.terminado}`, esperar: '.sorteio-team' },
      { rotulo: 'jogo futuro', quem: 'kim', rota: `/time/${missa}/jogo/${dados.jogos.futuro}`, esperar: 'main' },
      { rotulo: 'time', quem: 'chavo', rota: `/time/${missa}`, esperar: 'main' },
      { rotulo: 'ranking', quem: 'chavo', rota: `/time/${missa}/ranking`, esperar: '.rank-row' },
      { rotulo: 'resenha (com o player do YouTube aberto)', quem: 'chavo', rota: '/feed', esperar: 'main', gesto: async (p) => { await p.getByRole('button', { name: 'Reproduzir vídeo' }).first().click(); await p.locator('iframe[title="YouTube"]').waitFor({ timeout: 15000 }); } },
      { rotulo: 'perfil', quem: 'chavo', rota: '/perfil', esperar: 'main' },
      { rotulo: 'ajustes do time (admin)', quem: 'chavo', rota: `/admin/${missa}`, esperar: 'main' },
      { rotulo: 'radar de peladas', quem: 'chavo', rota: '/explorar', esperar: 'main' },
      { rotulo: 'planos', quem: 'chavo', rota: '/planos', esperar: 'main' },
    ];

    for (const tela of TELAS) {
      const ctx = await navegador.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true, locale: 'pt-BR', timezoneId: 'America/Sao_Paulo', serviceWorkers: 'block' });
      const deFora = [];
      await ctx.addInitScript(({ chave, sessao }) => {
        try { localStorage.setItem('futty_cookies', 'aceite'); if (sessao) localStorage.setItem(chave, sessao); } catch { /* sem armazenamento */ }
        window.__violacoes = [];
        document.addEventListener('securitypolicyviolation', (e) => { window.__violacoes.push(`${e.effectiveDirective} ${e.blockedURI || '(inline)'}${e.sourceFile ? ` @ ${e.sourceFile.split('/').pop()}:${e.lineNumber}` : ''}`); });
      }, { chave: CHAVE_DA_SESSAO, sessao: tela.quem ? sessaoDe(dados, tela.quem) : null });
      await ctx.route('**/*', async (route) => {
        const url = new URL(route.request().url());
        try {
          if (url.origin === base) return await route.continue();
          if (url.origin === ORIGEM_DO_MOTOR) return await aoMotor(route, dados.base);
          if (url.origin === ORIGEM_DOS_ASSETS) {
            const arq = arquivoDoBuild(pasta, url.pathname);
            return await route.fulfill(arq ? { status: 200, headers: { 'access-control-allow-origin': '*', 'content-type': tipoDe(arq) }, body: readFileSync(arq) } : { status: 404, body: '' });
          }
          if (url.hostname === 'img.youtube.com' || /\.(png|jpe?g|webp)$/i.test(url.pathname)) return await route.fulfill({ status: 200, contentType: 'image/png', body: PNG_1X1 });
          if (url.hostname === 'www.youtube.com') return await route.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>player</title>' });
          if (url.hostname === 'nominatim.openstreetmap.org') return await route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: '[]' });
          deFora.push(`${route.request().method()} ${url.host}${url.pathname}`);
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
        if (tela.gesto) await tela.gesto(page);
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(800);
        const violacoes = await page.evaluate(() => window.__violacoes);
        t(`${tela.rotulo}: nenhuma violação da CSP em modo de bloqueio`, violacoes.length === 0, [...new Set(violacoes)].slice(0, 4).join(' | '));
        t(`${tela.rotulo}: abre sem erro de página`, erros.length === 0, erros.slice(0, 2).join(' | '));
        if (deFora.length) console.log(`    ℹ ${tela.rotulo}: ${deFora.length} pedido(s) de fora respondidos vazios (nada saiu): ${[...new Set(deFora)].slice(0, 3).join(' | ')}`);
      } catch (e) {
        t(`${tela.rotulo}: a tela abriu`, false, e.message.split('\n')[0]);
      }
      await ctx.close();
    }
  } finally {
    if (filho) { try { filho.stdin.write('fim\n'); } catch { /* já saiu */ } setTimeout(() => { try { filho.kill(); } catch { /* já saiu */ } }, 3000).unref(); }
    if (servidor) servidor.close();
    rmSync(pasta, { recursive: true, force: true });
  }
}
