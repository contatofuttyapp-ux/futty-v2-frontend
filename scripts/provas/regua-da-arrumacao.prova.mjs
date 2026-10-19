// Prova no navegador da RÉGUA DA ARRUMAÇÃO — "nada que o usuário vê mudou", medido e não opinado. As telas principais abertas lado a lado em dois
// servidores (as telas de agora e as de um commit de referência, num worktree), contra o MESMO motor de verdade sobre banco falso, a 390 e a 360 px:
//   · a foto da página inteira tem de ser igual pixel a pixel;
//   · a árvore da página (tags, texto e o estilo CALCULADO de cada elemento, com ::before e ::after) tem de ser igual — classe e style inline podem trocar,
//     o que a pessoa vê não.
// O relógio do navegador fica parado no mesmo instante nos dois lados, o sorteio de números (Math.random) é o mesmo e as animações ficam desligadas
// nos dois, para comparar a mesma coisa.
//
// Uso: npm run provar:navegador -- regua-da-arrumacao                        sem referência: só confere que cada tela abre sem erro e sem rolar para o lado
//      R31X_ANTES=<worktree do commit de referência, com node_modules ligado>   compara agora × referência
//      R31X_FOTOS=pasta                                                         salva as fotos dos dois lados (e as diferenças, quando houver)
// O motor é o da prova 31W (scripts/provas/_motor-31w.cjs → backend/tests/_appFalsa.js; o .env do backend nunca é lido).
import { spawn } from 'node:child_process';
import { readFileSync, mkdirSync, existsSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

export const nome = 'Régua da arrumação · as telas principais iguais pixel a pixel e no estilo calculado (agora × referência, 390 e 360 px; motor de verdade, banco falso)';

const RAIZ = fileURLToPath(new URL('../../', import.meta.url));
const MOTOR = path.join(RAIZ, 'scripts', 'provas', '_motor-31w.cjs');
const BACKEND_AO_LADO = path.resolve(RAIZ, '..', 'backend', 'tests', '_appFalsa.js');
const REF = new URL((readFileSync(new URL('../../.env', import.meta.url), 'utf8').match(/^VITE_SUPABASE_URL=(.+)$/m)?.[1] || 'https://prova.supabase.co').trim()).hostname.split('.')[0];
const ANTES = process.env.R31X_ANTES || '';
const FOTOS = process.env.R31X_FOTOS || '';
const SEM_ANIMACAO = '*, *::before, *::after { animation: none !important; transition: none !important; caret-color: transparent !important; }';

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

async function aoMotor(route, base) {
  const req = route.request();
  const url = new URL(req.url());
  const origem = req.headers().origin || '*';
  const cors = { 'access-control-allow-origin': origem, 'access-control-allow-credentials': 'true', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' };
  if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
  const cabecalhos = { ...req.headers() };
  for (const h of CABECALHOS_QUE_NAO_VAO) delete cabecalhos[h];
  const corpo = req.postDataBuffer();
  const r = await fetch(`${base}${url.pathname}${url.search}`, { method: req.method(), headers: cabecalhos, body: corpo && !['GET', 'HEAD'].includes(req.method()) ? corpo : undefined, redirect: 'manual' });
  const cabecalhosDaResposta = { ...cors };
  r.headers.forEach((v, k) => { if (!CABECALHOS_QUE_NAO_VOLTAM.has(k) && !k.startsWith('access-control-')) cabecalhosDaResposta[k] = v; });
  return route.fulfill({ status: r.status, headers: cabecalhosDaResposta, body: Buffer.from(await r.arrayBuffer()) });
}

async function abrirContexto(navegador, baseDoVite, dados, quem, largura, agora) {
  const ctx = await navegador.newContext({
    viewport: { width: largura, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'pt-BR', timezoneId: 'America/Sao_Paulo',
    serviceWorkers: 'block', reducedMotion: 'reduce',
  });
  const estado = { erros: [] };
  await ctx.addInitScript(({ chave, sessao, css }) => {
    try { localStorage.setItem('futty_cookies', 'aceite'); if (sessao) localStorage.setItem(chave, sessao); } catch { /* sem armazenamento */ }
    // O mesmo sorteio de números nos dois lados (as estrelas da aurora, o desfasamento das flutuações).
    let s = 20261019;
    Math.random = () => { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; };
    document.addEventListener('DOMContentLoaded', () => { const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st); });
  }, { chave: `sb-${REF}-auth-token`, sessao: sessaoDe(dados, quem), css: SEM_ANIMACAO });
  await ctx.clock.setFixedTime(agora);
  const origemDoVite = new URL(baseDoVite).host;
  await ctx.route('**/*', async (route) => {
    const url = new URL(route.request().url());
    try {
      if (url.pathname.startsWith('/api/')) return await aoMotor(route, dados.base);
      if (url.host === origemDoVite) return await route.continue();
      return await route.fulfill({ status: 200, contentType: url.pathname.endsWith('.js') ? 'text/javascript' : 'application/json', body: url.pathname.endsWith('.js') ? '' : '{}' });
    } catch { return route.abort().catch(() => {}); }
  });
  await ctx.routeWebSocket((url) => url.host !== origemDoVite, (ws) => ws.close());
  return { ctx, estado };
}

/** A árvore da página: para cada elemento visível do body, tag + texto próprio + estilo calculado (e o dos pseudo-elementos), com e sem as classes. */
function lerArvore() {
  const hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i += 1) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(16); };
  // Em ordem alfabética: a ordem em que o navegador lista as variáveis CSS muda com a ordem em que as folhas chegaram, o valor não.
  // A origem do servidor (a porta muda de um lado para o outro) vira "ORIGEM" nas URLs absolutas que o navegador resolve.
  const semOrigem = (s) => s.split(location.origin).join('ORIGEM');
  const estilo = (el, pseudo) => { const c = getComputedStyle(el, pseudo); const nomes = []; for (let i = 0; i < c.length; i += 1) nomes.push(c[i]); return semOrigem(nomes.sort().map((n) => `${n}:${c.getPropertyValue(n)};`).join('')); };
  const texto = (el) => [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join('').replace(/\s+/g, ' ').trim();
  const lista = [];
  const andar = (el, caminho) => {
    const tag = el.tagName.toLowerCase();
    if (tag === 'script' || tag === 'style' || tag === 'link' || tag === 'meta') return;
    const r = el.getBoundingClientRect();
    const visto = { caminho, tag, texto: texto(el), caixa: [r.x, r.y, r.width, r.height].map((n) => Math.round(n * 100) / 100).join(','),
      estilo: hash(estilo(el) + estilo(el, '::before') + estilo(el, '::after')), classes: el.getAttribute('class') || '', attrs: [...el.attributes].filter((a) => a.name !== 'class' && a.name !== 'style').map((a) => `${a.name}=${semOrigem(a.value)}`).join(' ') };
    lista.push(visto);
    [...el.children].forEach((f, i) => andar(f, `${caminho}>${f.tagName.toLowerCase()}[${i}]`));
  };
  andar(document.body, 'body');
  return lista;
}
function estiloDe(caminho) {
  const partes = caminho.split('>').slice(1).map((p) => Number(p.match(/\[(\d+)\]$/)[1]));
  let el = document.body;
  for (const i of partes) el = el?.children[i];
  if (!el) return null;
  const out = {};
  for (const pseudo of [null, '::before', '::after']) { const c = getComputedStyle(el, pseudo); for (let i = 0; i < c.length; i += 1) out[`${pseudo || ''}${c[i]}`] = c.getPropertyValue(c[i]).split(location.origin).join('ORIGEM'); }
  return out;
}

/** Quantos pixels diferem entre duas fotos PNG (comparadas num canvas do próprio navegador). */
async function pixelsDiferentes(page, a, b) {
  return page.evaluate(async ([pa, pb]) => {
    const carregar = (b64) => new Promise((ok, falha) => { const i = new Image(); i.onload = () => ok(i); i.onerror = falha; i.src = `data:image/png;base64,${b64}`; });
    const [ia, ib] = await Promise.all([carregar(pa), carregar(pb)]);
    if (ia.width !== ib.width || ia.height !== ib.height) return { tamanho: `${ia.width}×${ia.height} vs ${ib.width}×${ib.height}`, n: -1 };
    const ler = (img) => { const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; const x = c.getContext('2d'); x.drawImage(img, 0, 0); return x.getImageData(0, 0, c.width, c.height).data; };
    const da = ler(ia); const db = ler(ib);
    let n = 0;
    let primeiro = null;
    for (let i = 0; i < da.length; i += 4) {
      if (da[i] !== db[i] || da[i + 1] !== db[i + 1] || da[i + 2] !== db[i + 2] || da[i + 3] !== db[i + 3]) { n += 1; if (!primeiro) primeiro = { x: (i / 4) % ia.width, y: Math.floor(i / 4 / ia.width) }; }
    }
    return { n, primeiro };
  }, [a.toString('base64'), b.toString('base64')]);
}

export async function rodar({ navegador, base, t }) {
  try { readFileSync(BACKEND_AO_LADO); } catch { t('o backend não está ao lado (FUTTY-V2/backend): a prova foi pulada', true); return; }
  const { filho, dados } = await subirMotor();
  const missa = dados.missa.slug;
  const agora = new Date();
  if (FOTOS) mkdirSync(FOTOS, { recursive: true });
  // As telas e o estado de cada uma. `antes` (opcional) faz o gesto que abre um estado (um modal, um seletor) antes de medir.
  const TELAS = [
    { rotulo: 'inicio', quem: 'chavo', rota: '/home', esperar: 'main' },
    { rotulo: 'figurinha', quem: 'chavo', rota: '/figurinha', esperar: 'main' },
    { rotulo: 'jogo-terminado', quem: 'chavo', rota: `/time/${missa}/jogo/${dados.jogos.terminado}`, esperar: '.sorteio-team' },
    { rotulo: 'jogo-em-andamento', quem: 'chavo', rota: `/time/${missa}/jogo/${dados.jogos.emAndamento}`, esperar: '.sorteio-team' },
    { rotulo: 'jogo-futuro-membro', quem: 'kim', rota: `/time/${missa}/jogo/${dados.jogos.futuro}`, esperar: 'main' },
    { rotulo: 'time', quem: 'chavo', rota: `/time/${missa}`, esperar: 'main' },
    { rotulo: 'ranking', quem: 'chavo', rota: `/time/${missa}/ranking`, esperar: '.rank-row' },
    { rotulo: 'resenha', quem: 'chavo', rota: '/feed', esperar: 'main' },
    { rotulo: 'perfil', quem: 'chavo', rota: '/perfil', esperar: 'main' },
    { rotulo: 'admin', quem: 'chavo', rota: `/admin/${missa}`, esperar: 'main' },
  ];

  let antes = null;
  let baseAntes = null;
  if (ANTES && existsSync(path.join(ANTES, 'src', 'App.jsx'))) {
    antes = await createServer({ root: ANTES, configFile: path.join(ANTES, 'vite.config.js'), logLevel: 'silent', server: { host: '127.0.0.1', port: 0 } });
    await antes.listen();
    baseAntes = `http://127.0.0.1:${antes.httpServer.address().port}`;
  }

  const abrir = async (cena, baseDaTela, tela) => {
    const page = await cena.ctx.newPage();
    page.on('pageerror', (e) => cena.estado.erros.push(e.message));
    await page.goto(`${baseDaTela}${tela.rota}`, { waitUntil: 'networkidle', timeout: 180000 });
    await page.locator(tela.esperar).first().waitFor({ timeout: 60000 });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1200);
    return page;
  };

  try {
    // O Vite compila na primeira visita (e pode recarregar a página ao otimizar dependências): uma volta em cada servidor antes de medir.
    for (const b of [base, baseAntes].filter(Boolean)) {
      const aquece = await abrirContexto(navegador, b, dados, 'chavo', 390, agora);
      const p = await aquece.ctx.newPage();
      for (const tela of TELAS) await p.goto(`${b}${tela.rota}`, { waitUntil: 'networkidle', timeout: 180000 }).catch(() => {});
      await aquece.ctx.close();
    }

    for (const largura of [390, 360]) {
      for (const tela of TELAS) {
        const r = `${largura} px · ${tela.rotulo}`;
        const agoraCena = await abrirContexto(navegador, base, dados, tela.quem, largura, agora);
        const pa = await abrir(agoraCena, base, tela);
        const fotoA = await pa.screenshot({ fullPage: true });
        const arvoreA = await pa.evaluate(lerArvore);
        t(`${r}: abre sem erro de página e não rola para o lado`, agoraCena.estado.erros.length === 0 && !(await pa.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)), agoraCena.estado.erros.slice(0, 2).join(' | '));
        if (FOTOS) writeFileSync(path.join(FOTOS, `${tela.rotulo}-${largura}-agora.png`), fotoA);
        if (baseAntes) {
          const antesCena = await abrirContexto(navegador, baseAntes, dados, tela.quem, largura, agora);
          const pb = await abrir(antesCena, baseAntes, tela);
          const fotoB = await pb.screenshot({ fullPage: true });
          const arvoreB = await pb.evaluate(lerArvore);
          if (FOTOS) writeFileSync(path.join(FOTOS, `${tela.rotulo}-${largura}-referencia.png`), fotoB);
          const px = fotoA.equals(fotoB) ? { n: 0 } : await pixelsDiferentes(pa, fotoA, fotoB);
          t(`${r}: a foto é igual pixel a pixel à da referência`, px.n === 0, px.tamanho ? `tamanho ${px.tamanho}` : `${px.n} pixels diferentes, o primeiro em ${JSON.stringify(px.primeiro)}`);
          const chave = (e) => `${e.caminho}|${e.tag}|${e.texto}|${e.caixa}|${e.estilo}`;
          const difs = [];
          for (let i = 0; i < Math.max(arvoreA.length, arvoreB.length); i += 1) if (!arvoreA[i] || !arvoreB[i] || chave(arvoreA[i]) !== chave(arvoreB[i])) difs.push(i);
          let detalhe = '';
          if (difs.length) {
            const i = difs[0];
            const a = arvoreA[i];
            const b = arvoreB[i];
            detalhe = `${difs.length} elementos diferentes; o primeiro: agora ${a ? `${a.caminho} <${a.tag} class="${a.classes}"> "${a.texto.slice(0, 40)}" ${a.caixa}` : '(não existe)'} · referência ${b ? `${b.caminho} <${b.tag} class="${b.classes}"> "${b.texto.slice(0, 40)}" ${b.caixa}` : '(não existe)'}`;
            if (a && b && a.caminho === b.caminho && a.estilo !== b.estilo) {
              const [ea, eb] = [await pa.evaluate(estiloDe, a.caminho), await pb.evaluate(estiloDe, b.caminho)];
              detalhe += ` · estilo: ${Object.keys(ea || {}).filter((k) => ea[k] !== eb?.[k]).slice(0, 6).map((k) => `${k}: ${eb?.[k]} → ${ea[k]}`).join('; ')}`;
            }
          }
          t(`${r}: a árvore (${arvoreA.length} elementos) tem as mesmas tags, textos, caixas e estilo calculado da referência`, difs.length === 0, detalhe);
          const trocas = arvoreA.map((e, i) => [e, arvoreB[i]]).filter(([e, b]) => b && (e.classes !== b.classes || e.attrs !== b.attrs));
          if (trocas.length) {
            const [e, b] = trocas[0];
            console.log(`    · ${r}: ${trocas.length} elementos trocaram classe/atributo (o estilo calculado é que manda); o primeiro: <${e.tag}> class "${b.classes}" → "${e.classes}" · ${b.attrs.slice(0, 120)} → ${e.attrs.slice(0, 120)}`);
          }
          await antesCena.ctx.close();
        }
        await agoraCena.ctx.close();
      }
    }
  } finally {
    try { filho.stdin.write('fim\n'); } catch { /* já saiu */ }
    setTimeout(() => { try { filho.kill(); } catch { /* já saiu */ } }, 3000).unref();
    if (antes) await antes.close();
  }
}
