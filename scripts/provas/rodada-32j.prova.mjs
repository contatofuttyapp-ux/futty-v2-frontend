// Prova no navegador da Rodada 32J — velocidade da Resenha, foto do campeão direto no card e o Início cheio. Motor de verdade, banco falso.
//   · A Resenha abre com 8 itens e traz o resto rolando (40 jogos + 8 posts no banco); fotos fora da tela não são pedidas na abertura,
//     e cada foto é pedida no tamanho em que aparece;
//   · o ms_util da tela /feed (a MESMA régua da telemetria do app: o envio que sai quando a tela fecha), num celular de mentira: CPU 4×
//     mais lenta e a rede de Lisboa até São Paulo (250 ms de ida e volta, 16 Mbps divididos entre todos os pedidos);
//   · o admin vê "Adicionar foto" no card do jogo sem foto (e "Trocar foto" no que tem), sobe a foto 4:3 e ela aparece; o jogador não vê;
//   · o Início cheio (aviso no topo + 4 times) a 390×844 tem o "Vou" do próximo jogo na primeira tela.
// Como: o motor de VERDADE sobe num processo à parte (scripts/provas/_motor-32j.cjs → backend/tests/_appFalsa.js; o .env do backend aponta
// para o banco de produção e aqui nunca é lido), com a distância até o banco simulada. As telas são o BUILD de produção (o Vite de
// desenvolvimento serve centenas de módulos soltos e mediria outra coisa), servido em 127.0.0.1. /api/** vai ao motor de mentira, o
// servidor das telas passa e QUALQUER outro endereço é respondido vazio: nada sai para a rede.
//
// Uso: npm run provar:navegador -- rodada-32j        (~4 min; o build entra na conta)
//      R32J_FOTOS=pasta  salva as fotos      R32J_SO=medir  só a medição do ms_util (para o antes/depois do relatório)
import { spawn } from 'node:child_process';
import { readFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build, preview } from 'vite';
import sharp from 'sharp';

export const nome = 'Rodada 32J · Resenha em páginas de 8 com fotos lazy no tamanho certo, foto do campeão no card (admin) e o Início cheio (motor de verdade, banco falso, build de produção)';

const RAIZ = fileURLToPath(new URL('../../', import.meta.url));
const MOTOR = path.join(RAIZ, 'scripts', 'provas', '_motor-32j.cjs');
const BACKEND_AO_LADO = path.resolve(RAIZ, '..', 'backend', 'tests', '_appFalsa.js');
const REF = new URL((readFileSync(new URL('../../.env', import.meta.url), 'utf8').match(/^VITE_SUPABASE_URL=(.+)$/m)?.[1] || 'https://prova.supabase.co').trim()).hostname.split('.')[0];
const FOTOS = process.env.R32J_FOTOS || '';
const SO = process.env.R32J_SO || '';

const APARELHOS = {
  390: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true },
  360: { viewport: { width: 360, height: 780 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true },
};
// O celular de Lisboa falando com São Paulo: cada pedido paga a ida e volta, e os bytes de TODOS dividem o mesmo rádio.
const REDE = { idaEVoltaMs: 250, bytesPorMs: 2000 };
const dormir = (ms) => new Promise((r) => { setTimeout(r, Math.max(0, ms)); });

function subirMotor() {
  return new Promise((resolve, reject) => {
    const filho = spawn(process.execPath, [MOTOR], { stdio: ['pipe', 'pipe', 'pipe'], cwd: RAIZ });
    let saida = '';
    let erro = '';
    const limite = setTimeout(() => { filho.kill(); reject(new Error(`o motor falso não ficou pronto em 180 s\n${erro.slice(-700)}`)); }, 180000);
    filho.stderr.on('data', (d) => { erro += d; });
    const aoLer = (d) => {
      saida += d;
      const linha = saida.split('\n').find((l) => l.startsWith('{"pronto"'));
      if (linha) { clearTimeout(limite); filho.stdout.off('data', aoLer); resolve({ filho, dados: JSON.parse(linha) }); }
    };
    filho.stdout.on('data', aoLer);
    filho.once('exit', (codigo) => { clearTimeout(limite); reject(new Error(`o motor falso saiu com ${codigo}\n${erro.slice(-900)}`)); });
  });
}
function falarComOMotor(filho, comando, chave) {
  return new Promise((resolve) => {
    let saida = '';
    const aoLer = (d) => {
      saida += d;
      const linha = saida.split('\n').find((l) => l.startsWith(`{"${chave}"`));
      if (linha) { filho.stdout.off('data', aoLer); resolve(JSON.parse(linha)[chave]); }
    };
    filho.stdout.on('data', aoLer);
    filho.stdin.write(`${comando}\n`);
  });
}
function encerrarMotor(filho) {
  return new Promise((resolve) => {
    let saida = '';
    const acabou = (rede) => { clearTimeout(limite); try { filho.kill(); } catch { /* já saiu */ } resolve(rede); };
    const limite = setTimeout(() => acabou(null), 8000);
    filho.stdout.on('data', (d) => {
      saida += d;
      const linha = saida.split('\n').find((l) => l.startsWith('{"rede"'));
      if (linha) acabou(JSON.parse(linha).rede);
    });
    filho.once('exit', () => acabou(null));
    try { filho.stdin.write('fim\n'); } catch { acabou(null); }
  });
}

/** O build de produção das telas numa pasta temporária, servido em 127.0.0.1. O VITE_API_URL é de mentira: todo /api é interceptado. */
async function subirTelas() {
  const pasta = mkdtempSync(path.join(os.tmpdir(), 'futty-32j-'));
  process.env.VITE_API_URL = 'http://127.0.0.1:9';
  await build({ root: RAIZ, logLevel: 'silent', mode: 'production', build: { outDir: pasta, emptyOutDir: true } });
  const servidor = await preview({ root: RAIZ, logLevel: 'silent', build: { outDir: pasta }, preview: { host: '127.0.0.1', port: 0, strictPort: false } });
  const endereco = servidor.httpServer.address();
  return { base: `http://127.0.0.1:${endereco.port}`, fechar: async () => { await new Promise((r) => { servidor.httpServer.close(r); }); rmSync(pasta, { recursive: true, force: true }); } };
}

const sessaoDe = (dados, quem, agora) => JSON.stringify({
  access_token: dados.tokens[quem], refresh_token: 'prova', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(agora / 1000) + 86400 * 30,
  user: { id: dados.pessoas[quem].id, aud: 'authenticated', email: dados.pessoas[quem].email, app_metadata: {}, user_metadata: { onboarding_completo: true }, created_at: '2026-01-01T00:00:00Z' },
});
const CABECALHOS_QUE_NAO_VOLTAM = new Set(['content-encoding', 'content-length', 'transfer-encoding', 'connection', 'keep-alive']);
const CABECALHOS_QUE_NAO_VAO = ['host', 'origin', 'referer', 'if-none-match', 'if-modified-since', 'content-length', 'accept-encoding', 'connection'];

async function abrir(navegador, baseDasTelas, dados, quem, { aparelho = 390, relogio, celular = false }) {
  const ctx = await navegador.newContext({ ...APARELHOS[aparelho], locale: 'pt-BR', timezoneId: 'America/Sao_Paulo', serviceWorkers: 'block', reducedMotion: 'reduce' });
  const estado = { externos: [], erros: [], midia: [], feeds: [], telemetria: [], uploads: 0 };
  await ctx.clock.install({ time: new Date(relogio) });
  await ctx.clock.resume();
  await ctx.addInitScript(({ chave, sessao, times }) => {
    try {
      localStorage.setItem('futty_cookies', 'aceite');
      localStorage.setItem(chave, sessao);
      for (const id of times) localStorage.setItem(`futty_onboarding_${id}`, '1');
    } catch { /* sem armazenamento */ }
  }, { chave: `sb-${REF}-auth-token`, sessao: sessaoDe(dados, quem, Date.parse(relogio)), times: Object.values(dados.times).map((t) => t.id) });
  const origemDasTelas = new URL(baseDasTelas).host;
  let canoLivreEm = 0;
  const comoNoCelular = async (bytes) => {
    if (!celular) return;
    await dormir(REDE.idaEVoltaMs);
    const agora = Date.now();
    canoLivreEm = Math.max(agora, canoLivreEm) + bytes / REDE.bytesPorMs;
    await dormir(canoLivreEm - agora);
  };
  await ctx.route('**/*', async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    try {
      if (url.pathname === '/api/telemetria') {
        try { estado.telemetria.push(JSON.parse(req.postData() || '{}')); } catch { /* corpo torto */ }
        return await route.fulfill({ status: 204, body: '' });
      }
      if (url.pathname.startsWith('/api/')) {
        if (url.pathname.startsWith('/api/media/')) estado.midia.push({ em: Date.now(), w: url.searchParams.get('w'), sq: url.searchParams.get('sq') === '1', token: url.pathname.split('/')[3] });
        if (url.pathname === '/api/feed') estado.feeds.push({ em: Date.now(), limite: url.searchParams.get('limite'), antes: url.searchParams.get('antes') });
        if (url.pathname === '/api/feed/upload') estado.uploads += 1;
        const cors = { 'access-control-allow-origin': req.headers().origin || '*', 'access-control-allow-credentials': 'true', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' };
        if (req.method() === 'OPTIONS') return await route.fulfill({ status: 204, headers: cors });
        const cabecalhos = { ...req.headers() };
        for (const h of CABECALHOS_QUE_NAO_VAO) delete cabecalhos[h];
        const corpo = req.postDataBuffer();
        const r = await fetch(`${dados.base}${url.pathname}${url.search}`, { method: req.method(), headers: cabecalhos, body: corpo && !['GET', 'HEAD'].includes(req.method()) ? corpo : undefined, redirect: 'manual' });
        const bytes = Buffer.from(await r.arrayBuffer());
        await comoNoCelular(bytes.length + 400);
        const saida = { ...cors };
        r.headers.forEach((v, k) => { if (!CABECALHOS_QUE_NAO_VOLTAM.has(k) && !k.startsWith('access-control-')) saida[k] = v; });
        return await route.fulfill({ status: r.status, headers: saida, body: bytes });
      }
      if (url.host === origemDasTelas) return await route.continue();
      estado.externos.push(`${req.method()} ${url.host}${url.pathname}`.slice(0, 120));
      return await route.fulfill({ status: 200, contentType: url.pathname.endsWith('.js') ? 'text/javascript' : 'application/json', body: url.pathname.endsWith('.js') ? '' : '{}' });
    } catch { return route.abort().catch(() => {}); }
  });
  await ctx.routeWebSocket((u) => u.host !== origemDasTelas, (ws) => ws.close());
  const page = await ctx.newPage();
  if (celular) {
    const cdp = await ctx.newCDPSession(page);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  }
  page.on('pageerror', (e) => estado.erros.push(e.message));
  page.on('dialog', (d) => d.dismiss().catch(() => {}));
  return { ctx, page, estado };
}

const mediana = (v) => { const o = [...v].sort((a, b) => a - b); return o[Math.floor(o.length / 2)]; };
const semRolagemLateral = (page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);

/**
 * Abre o Início, toca em Resenha na barra de baixo e volta: o app manda a telemetria da tela /feed ao fechá-la, com o ms_util (a pintura
 * sem loader, contada do toque). Devolve também o que foi pedido de mídia enquanto a Resenha estava aberta.
 */
async function medirResenha(navegador, baseDasTelas, dados, relogio, { esperaNoInicioMs = 2500 } = {}) {
  const { ctx, page, estado } = await abrir(navegador, baseDasTelas, dados, 'chavo', { relogio, celular: true });
  try {
    await page.goto(`${baseDasTelas}/home`, { waitUntil: 'domcontentloaded' });
    await page.locator('.bottom-nav__tab--feed').waitFor({ timeout: 60000 });
    // "calmo": o Início pinta e o pré-aquecimento do app (que pede a 1ª página da Resenha) corre por trás. "apressado": a pessoa toca na
    // Resenha logo que o Início aparece, com as fotos dele ainda descendo pelo mesmo rádio.
    await page.waitForTimeout(esperaNoInicioMs);
    const toque = Date.now();
    const midiaAntes = estado.midia.length;
    await page.locator('.bottom-nav__tab--feed').click();
    await page.locator('.feed-item').first().waitFor({ timeout: 60000 });
    await page.waitForTimeout(3000);
    const itens = await page.locator('.feed-item').count();
    const midiaNaAbertura = estado.midia.slice(midiaAntes).filter((m) => m.em >= toque);
    await page.locator('.bottom-nav__tab--home').click();
    for (let i = 0; i < 40 && !estado.telemetria.some((e) => e.tela === '/feed'); i += 1) await page.waitForTimeout(250);
    const envio = estado.telemetria.find((e) => e.tela === '/feed') || null;
    return { msUtil: envio?.ms_util ?? null, itens, fotos: midiaNaAbertura.filter((m) => !m.sq).length, avatares: midiaNaAbertura.filter((m) => m.sq).length, larguras: [...new Set(midiaNaAbertura.filter((m) => !m.sq).map((m) => m.w))], erros: estado.erros };
  } finally {
    await ctx.close().catch(() => {});
  }
}

export async function rodar({ navegador, t }) {
  try { readFileSync(BACKEND_AO_LADO); } catch { t('o backend não está ao lado (FUTTY-V2/backend): a prova foi pulada', true); return; }
  if (FOTOS) mkdirSync(FOTOS, { recursive: true });
  const foto = async (page, nomeDaFoto, opcoes = {}) => {
    if (!FOTOS) return;
    try { await page.screenshot({ path: path.join(FOTOS, `${nomeDaFoto}.png`), timeout: 15000, ...opcoes }); } catch (e) { t(`foto ${nomeDaFoto}`, false, e.message.split('\n')[0]); }
  };
  const telas = await subirTelas();
  const { filho, dados } = await subirMotor();
  const agora = async () => (await falarComOMotor(filho, 'estado', 'estado')).agora;
  try {
    // ════ B · o ms_util da Resenha num celular de mentira (3 vezes por cenário, a mediana) ═════════════════════════════════════════
    const resumos = {};
    for (const [cenario, esperaNoInicioMs] of [['calmo', 2500], ['apressado', 300]]) {
      const medidas = [];
      for (let i = 0; i < 3; i += 1) medidas.push(await medirResenha(navegador, telas.base, dados, await agora(), { esperaNoInicioMs }));
      const ms = medidas.map((m) => m.msUtil).filter((v) => v != null);
      const m0 = medidas[0];
      const resumo = { ms_util: medidas.map((m) => m.msUtil), mediana: ms.length ? mediana(ms) : null, itens: m0.itens, fotos_na_abertura: medidas.map((m) => m.fotos), avatares_na_abertura: medidas.map((m) => m.avatares), larguras: m0.larguras };
      resumos[cenario] = resumo;
      console.log(`  · ms_util da Resenha, ${cenario} (CPU 4×, 250 ms de ida e volta, 16 Mbps): ${resumo.ms_util.join(' · ')} → mediana ${resumo.mediana} ms · ${resumo.itens} itens desenhados · fotos pedidas na abertura ${resumo.fotos_na_abertura.join('/')} (w=${resumo.larguras.join(',')}) · avatares ${resumo.avatares_na_abertura.join('/')}`);
      t(`Resenha (${cenario}) · a telemetria da tela /feed saiu com o ms_util nas 3 medições (${resumo.ms_util.join(', ')} ms)`, ms.length === 3, JSON.stringify(medidas.map((m) => m.erros.slice(0, 2))));
      if (SO !== 'medir') t(`Resenha (${cenario}) · ms_util ≤ 1500 ms no celular de mentira (mediana ${resumo.mediana} ms)`, resumo.mediana != null && resumo.mediana <= 1500, String(resumo.mediana));
    }
    if (process.env.R32J_MEDICAO) writeFileSync(process.env.R32J_MEDICAO, `${JSON.stringify(resumos, null, 2)}\n`);
    if (SO === 'medir') return;

    // ════ B · a Resenha em páginas: abre com 8, fotos fora da tela não são pedidas, rolar traz o resto ═══════════════════════════
    {
      const { ctx, page, estado } = await abrir(navegador, telas.base, dados, 'chavo', { relogio: await agora() });
      await page.goto(`${telas.base}/feed`, { waitUntil: 'domcontentloaded' });
      await page.locator('.feed-item').first().waitFor({ timeout: 60000 });
      await page.waitForTimeout(1500);
      const naAbertura = await page.locator('.feed-item').count();
      const pedidosDoFeed = estado.feeds.filter((f) => !f.antes);
      t(`Resenha · abre com 8 itens (${naAbertura}) e pede a 1ª página com limite=8 (${pedidosDoFeed.map((f) => f.limite).join(',')}), sem pedir a 2ª antes de rolar`, naAbertura === 8 && pedidosDoFeed.length >= 1 && pedidosDoFeed.every((f) => f.limite === '8') && !estado.feeds.some((f) => f.antes));
      const fotosNaTela = await page.evaluate(() => [...document.querySelectorAll('img[data-perto]')].map((img) => ({ perto: img.dataset.perto === '1', topo: img.getBoundingClientRect().top })));
      const fotosPedidas = estado.midia.filter((m) => !m.sq).length;
      const longe = fotosNaTela.filter((f) => f.topo > 844 + 320);
      t(`Resenha · fotos fora da tela NÃO são pedidas na abertura: ${fotosPedidas} pedidas, ${fotosNaTela.filter((f) => f.perto).length} perto da tela, ${longe.length} longe e sem src`, longe.length > 0 && longe.every((f) => !f.perto) && fotosPedidas <= fotosNaTela.filter((f) => f.perto).length, JSON.stringify(fotosNaTela));
      t(`Resenha · cada foto é pedida no degrau da caixa (w=${[...new Set(estado.midia.filter((m) => !m.sq).map((m) => m.w))].join(',')}; avatares w=${[...new Set(estado.midia.filter((m) => m.sq).map((m) => m.w))].join(',')} quadrados)`, estado.midia.filter((m) => !m.sq).every((m) => m.w === '512') && estado.midia.filter((m) => m.sq).every((m) => m.w === '128'));
      await foto(page, '01-resenha-abre-com-8');
      // Rolar até o fim: o sentinela pede página a página, até acabar (40 jogos + 8 posts).
      let total = naAbertura;
      for (let i = 0; i < 40; i += 1) {
        await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
        await page.waitForTimeout(700);
        const agoraN = await page.locator('.feed-item').count();
        if (agoraN === total && i > 3 && !(await page.locator('text=Carregando…').count())) break;
        total = agoraN;
      }
      const esperado = dados.totalNaResenha.jogos + dados.totalNaResenha.posts;
      const paginas = estado.feeds.filter((f) => f.antes).length;
      t(`Resenha · rolando, "carregar mais" traz o resto: ${total} de ${esperado} itens, em ${paginas} páginas seguintes, sem botão`, total === esperado && paginas >= 5 && (await page.getByRole('button', { name: 'Ver mais antigos' }).count()) === 0);
      t('Resenha · nada rola para o lado e nenhum erro na página', await semRolagemLateral(page) && estado.erros.length === 0, estado.erros.join(' | '));
      await ctx.close().catch(() => {});
    }

    // ════ D · a foto do time campeão direto no card (só admin) ════════════════════════════════════════════════════════════════════
    {
      const { ctx, page, estado } = await abrir(navegador, telas.base, dados, 'chavo', { relogio: await agora() });
      await page.goto(`${telas.base}/feed`, { waitUntil: 'domcontentloaded' });
      const card = page.locator(`#feed-item-${dados.jogoSemFoto}`);
      await card.waitFor({ timeout: 60000 });
      const botao = card.locator('[data-foto-campeao-no-card] button');
      t('Foto do campeão · o admin vê "Adicionar foto" no card do jogo sem foto', (await botao.count()) === 1 && (await botao.innerText()).trim() === 'Adicionar foto');
      const comFoto = page.locator('.feed-item', { has: page.locator('img[data-perto]') }).filter({ has: page.locator('[data-foto-campeao-no-card]') }).first();
      t('Foto do campeão · e "Trocar foto" no card que já tem', (await comFoto.count()) === 1 && (await comFoto.locator('[data-foto-campeao-no-card] button').innerText()).trim() === 'Trocar foto');
      await card.scrollIntoViewIfNeeded();
      await foto(page, '02-card-adicionar-foto', { fullPage: false });
      // Uma foto de celular (retrato 1200×1600): o recorte 4:3 abre, "Confirmar" sobe e grava.
      const jpeg = await sharp({ create: { width: 1200, height: 1600, channels: 3, background: { r: 212, g: 160, b: 23 } } }).jpeg().toBuffer();
      await card.locator('[data-foto-campeao-no-card] input[type="file"]').setInputFiles({ name: 'campeao.jpg', mimeType: 'image/jpeg', buffer: jpeg });
      const confirmar = page.getByRole('button', { name: 'Confirmar' });
      await confirmar.waitFor({ timeout: 15000 });
      await foto(page, '03-recorte-4x3', { fullPage: false });
      await confirmar.click();
      try {
        await card.locator('img[data-perto="1"]').waitFor({ timeout: 20000 });
      } catch {
        throw new Error(`a foto não apareceu no card: uploads ${estado.uploads} · card: ${(await card.innerText()).replace(/\s+/g, ' ').slice(0, 200)} · erros: ${estado.erros.join(' | ')}`);
      }
      const src = await card.locator('img[data-perto="1"]').getAttribute('src');
      const motor = await falarComOMotor(filho, 'estado', 'estado');
      t('Foto do campeão · depois de salvar, a foto aparece no card (pelo proxy) e o botão vira "Trocar foto"', /\/api\/media\//.test(src || '') && (await botao.innerText()).trim() === 'Trocar foto' && estado.uploads === 1, `${src} · uploads ${estado.uploads}`);
      t('Foto do campeão · gravada no jogo (campeao_foto_url no banco, como endereço do Storage, não do proxy)', /\/storage\/v1\/object\/public\/resenha\//.test(motor.campeao_foto_url || ''), motor.campeao_foto_url);
      await card.scrollIntoViewIfNeeded();
      await foto(page, '04-card-com-a-foto', { fullPage: false });
      t('Foto do campeão · nenhum erro na página do admin', estado.erros.length === 0, estado.erros.join(' | '));
      await ctx.close().catch(() => {});

      const jogadora = await abrir(navegador, telas.base, dados, 'ana', { relogio: await agora() });
      await jogadora.page.goto(`${telas.base}/feed`, { waitUntil: 'domcontentloaded' });
      await jogadora.page.locator('.feed-item').first().waitFor({ timeout: 60000 });
      await jogadora.page.waitForTimeout(800);
      t('Foto do campeão · a jogadora comum não vê o botão em card nenhum', (await jogadora.page.locator('[data-foto-campeao-no-card]').count()) === 0 && (await jogadora.page.locator('.feed-item').count()) > 0);
      const r = await fetch(`${dados.base}/api/feed/games/${dados.jogoSemFoto}/resultado`, { method: 'PATCH', headers: { authorization: `Bearer ${dados.tokens.ana}`, 'content-type': 'application/json' }, body: JSON.stringify({ campeao_foto_url: null }) });
      t('Foto do campeão · e o motor recusa a jogadora (403) se ela tentar pelo pedido', r.status === 403, String(r.status));
      await jogadora.ctx.close().catch(() => {});
    }

    // ════ E · o Início cheio: aviso no topo + 4 times, e o "Vou" do próximo jogo na primeira tela ══════════════════════════════════
    for (const aparelho of [390, 360]) {
      const { ctx, page, estado } = await abrir(navegador, telas.base, dados, 'chavo', { relogio: await agora(), aparelho });
      await page.goto(`${telas.base}/home`, { waitUntil: 'domcontentloaded' });
      const vou = page.getByRole('button', { name: 'Vou', exact: true }).first();
      await vou.waitFor({ timeout: 60000 });
      await page.waitForTimeout(1200);
      const caixa = await vou.boundingBox();
      const barra = await page.locator('.bottom-nav').boundingBox();
      const alturaDaTela = APARELHOS[aparelho].viewport.height;
      const limite = Math.min(alturaDaTela, barra?.y ?? alturaDaTela);
      const avisos = await page.locator('[data-aviso]').count();
      const times = await page.locator('.chip').count();
      t(`Início cheio ${aparelho}px · com aviso no topo (${avisos}) e os 4 times (${times - 1} chips + Todos), o "Vou" do próximo jogo está na primeira tela (termina em ${Math.round((caixa?.y ?? 9999) + (caixa?.height ?? 0))} px, a barra de baixo começa em ${Math.round(limite)} px)`,
        avisos >= 1 && times >= 5 && caixa && caixa.y >= 0 && caixa.y + caixa.height <= limite);
      t(`Início cheio ${aparelho}px · nada rola para o lado e nenhum erro`, await semRolagemLateral(page) && estado.erros.length === 0, estado.erros.join(' | '));
      await foto(page, `05-inicio-cheio-${aparelho}`, { fullPage: false });
      await ctx.close().catch(() => {});
    }
  } finally {
    const rede = await encerrarMotor(filho);
    t('nada saiu do motor para a rede (o banco falso não deixa)', Array.isArray(rede) ? rede.length === 0 : true, JSON.stringify(rede));
    await telas.fechar().catch(() => {});
  }
}
