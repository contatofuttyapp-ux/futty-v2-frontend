#!/usr/bin/env node
// Futty v2.0 — O app como o iPhone o vê (Velocidade 7B, 15-set).
//
// Existe porque dois defeitos dos prints do Pedro (iPhone 15 Pro Max, iOS 18.7)
// NÃO aparecem no Chrome em 390 px:
//   (a) Ranking — avatares pequenos no canto da moldura em vez de a preencherem;
//   (b) Resenha — por ~1 s a página inteira encolhida a ~66% da tela, com um card
//       transbordando à direita (o WebKit alarga a viewport para caber um
//       elemento mais largo que a tela e depois volta).
// O Chrome não serve de prova para nenhum dos dois. Isto abre o app num WebKit
// de verdade (Playwright), com o tamanho, a densidade e o user agent do iPhone,
// e com o cache do app FRIO (contexto novo: sem IndexedDB, sem cache HTTP, sem
// service worker — só a sessão).
//
// Para cada tela: capturas em 0,3 s, 1 s e 3 s; a cada 100 ms durante 3 s, a
// largura da viewport vs a largura rolável do documento e o elemento que passa
// da borda direita (percorre o DOM inteiro); no fim, a geometria de cada avatar
// em moldura (a foto preenche a moldura ou não?). Também conta os pedidos /api
// do arranque frio em "/" (quantos saem antes de o /api/inicio responder).
//
// Rodada 8A (15-set) — cenas escolhidas com --cenas (vírgulas):
//   arranque, ranking, resenha   as de sempre (é o padrão sem --cenas)
//   campos    fonte de cada campo de texto (login, compositor, comentário) e a
//             escala da tela antes/depois de focar o comentário; captura com o
//             campo focado. ATENÇÃO: o WebKit do Playwright não tem o zoom de foco
//             do iOS (é do UIKit, não do motor) — a escala aqui não prova nada
//             sozinha; a prova é a fonte computada >= 16 px e o maximum-scale=1.
//   voto      abre o modal de votar numa linha de baixo do Ranking (rolada) e
//             mede o cartão contra a tela; não vota (Cancelar).
//   aviso     o aviso de ausência do Início: estado, botão, confirmação e faixa.
//             As escritas (PATCH .../membros/ausencia) são interceptadas aqui e
//             respondidas com 200 — nada chega ao banco. Também confere que, com
//             o RSVP aberto para o mesmo jogo, o aviso some.
//   ranking1  1ª visita ao Ranking pelo Início (toque na barra ~1 s depois da
//             pintura, antes do pré-aquecimento), sem cache e com cache velho;
//             lê o relatório do próprio Diagnóstico (POST interceptado) e mede de
//             fora os quadros e a 1ª linha/imagem. --lento: um laço ocupa ~3/4 da
//             thread principal (o WebKit não tem CPU 4x mais lenta).
// Rodada 9 (16-set) — cena nova:
//   fixos     percorre Jogo (com sorteio), sorteio, sorteio público, Planos e
//             landing; lista TODO `position: fixed` visível, rola a página e
//             mede outra vez. Quem se mexeu não estava preso à tela — e o
//             relatório aponta o ancestral culpado (transform, filter,
//             container-type…). Prova empírica, não teoria.
// Em campos, voto e aviso, TODA escrita à /api (POST/PATCH/PUT/DELETE) é
// interceptada e respondida com 200 — impressões de anúncio incluídas. Em
// ranking1 não: interceptar desliga o cache HTTP do WebKit e falsearia a medição
// (só o envio do relatório do Diagnóstico é interceptado, depois de medir).
//
// Uso (a partir de FUTTY-V2/frontend; precisa de `npx playwright install webkit`):
//   node scripts/ver-iphone.mjs                                   produção, etiqueta "antes"
//   node scripts/ver-iphone.mjs --url http://localhost:4179 --etiqueta depois
//   node scripts/ver-iphone.mjs --cenas campos,voto,aviso,ranking1 --etiqueta 8a-antes
//   node scripts/ver-iphone.mjs --time domingueira-fc-demo
//   node scripts/ver-iphone.mjs --sessao sessao.json --time vila-olimpica-fc-demo-vila
//     (sessão pronta de outra conta de TESTE, em vez do login da demo-loja:
//      [{ "name": "sb-<ref>-auth-token", "value": "<json da sessão>" }])
// Capturas e JSON em scripts/capturas/ (fora do git).
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';
import { webkit } from 'playwright';

const RAIZ = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const opcao = (nome, omissao) => {
  const i = args.indexOf(`--${nome}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : omissao;
};

const BASE = opcao('url', 'https://futtyapp.com.br').replace(/\/+$/, '');
const EMAIL = opcao('email', 'demo-loja@futtymock.com');
const ARQUIVO_SENHA = opcao('senha', path.join(RAIZ, '..', '..', 'LOJA', 'demo-senha.txt'));
// A conta demo-loja é membro (admin) só da domingueira-fc-demo: o ranking da
// vila-olimpica-fc-demo-vila devolveria "não é membro".
const TIME = opcao('time', 'domingueira-fc-demo');
const ETIQUETA = opcao('etiqueta', 'antes');
const ARQUIVO_SESSAO = opcao('sessao', null);
const CENAS = opcao('cenas', 'arranque,ranking,resenha').split(',').map((c) => c.trim()).filter(Boolean);
const LENTO = args.includes('--lento');
const PASTA = path.join(RAIZ, 'scripts', 'capturas');
const LARGURA_APARELHO = 430;
const AMOSTRAGEM_MS = 6000;

// iPhone 15 Pro Max: 430×932 pontos, 3x. A viewport é a tela inteira porque o
// app nativo (WKWebView) não tem barra de endereço por cima.
const IPHONE = {
  viewport: { width: 430, height: 932 },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
  userAgent:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.7 Mobile/15E148 Safari/604.1',
  locale: 'pt-BR',
};

const MARCAS_MS = [300, 1000, 3000];
const espera = (ms) => new Promise((r) => setTimeout(r, ms));
const arquivoCaptura = (nome) => path.join(PASTA, `${ETIQUETA}-${nome}.png`);

function lerSenha() {
  const bruto = readFileSync(ARQUIVO_SENHA, 'utf8');
  const linha = bruto.split(/\r?\n/).map((l) => l.trim()).filter(Boolean).pop() || '';
  return linha.includes(':') ? linha.split(':').pop().trim() : linha;
}

// ─── Roda DENTRO da página, antes de qualquer script do app ──────────────────
function amostrador({ larguraAparelho, duracaoMs }) {
  const t0 = performance.now();
  const amostras = [];
  window.__futtyAmostras = amostras;

  const descrever = (el) => {
    const cls = typeof el.className === 'string' ? el.className : el.getAttribute('class') || '';
    return `${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ''}${cls ? `.${cls.trim().split(/\s+/).slice(0, 2).join('.')}` : ''}`;
  };
  const caminho = (el) => {
    const partes = [];
    for (let n = el; n && n !== document.body && partes.length < 5; n = n.parentElement) partes.unshift(descrever(n));
    return partes.join(' > ');
  };
  // Um elemento só alarga a PÁGINA se nenhum ancestral o recorta ou rola.
  const recortado = (el) => {
    for (let n = el.parentElement; n && n !== document.body; n = n.parentElement) {
      if (getComputedStyle(n).overflowX !== 'visible') return true;
    }
    return false;
  };

  const maisLargo = () => {
    if (!document.body) return null;
    // A largura do APARELHO, não a innerWidth: quando algo transborda, o WebKit
    // alarga a própria viewport para caber — e aí nada "passa" da innerWidth.
    const vw = larguraAparelho;
    let pior = null;
    for (const el of document.body.getElementsByTagName('*')) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.right <= vw + 0.5) continue;
      if (pior && r.right <= pior.right) continue;
      if (getComputedStyle(el).position === 'fixed' || recortado(el)) continue;
      pior = { el, right: r.right, width: r.width };
    }
    if (!pior) return null;
    const e = pior.el;
    return {
      caminho: caminho(e),
      direita: Math.round(pior.right),
      largura: Math.round(pior.width),
      atributoWidth: e.getAttribute('width'),
      src: e.currentSrc ? e.currentSrc.replace(/^https?:\/\/[^/]+/, '').slice(0, 70) : null,
    };
  };

  const tique = () => {
    const se = document.scrollingElement;
    amostras.push({
      t: Math.round(performance.now() - t0),
      // Antes de o app montar, o WebKit ainda está na viewport padrão (980 px).
      montado: !!document.querySelector('[data-page]'),
      larguraViewport: window.innerWidth,
      larguraRolavel: se ? se.scrollWidth : null,
      escala: window.visualViewport ? Number(window.visualViewport.scale.toFixed(3)) : null,
      carregando: !!document.querySelector('[data-loading-futty]'),
      linhasRanking: document.querySelectorAll('.rank-row').length,
      maisLargo: maisLargo(),
    });
    if (performance.now() - t0 < duracaoMs) setTimeout(tique, 100);
  };
  tique();
}

// Geometria de cada avatar em moldura: a foto preenche a caixa ou fica pequena?
// Não basta o tamanho: no (a) a caixa do <img> tinha o tamanho certo mas estava
// DESLOCADA para baixo, com o resto cortado pelo overflow da moldura.
function geometriaAvatares() {
  return [...document.querySelectorAll('.avatar-frame__fill, .pavatar')].slice(0, 40).map((caixa) => {
    const img = caixa.querySelector('img');
    const rc = caixa.getBoundingClientRect();
    const base = { moldura: `${Math.round(rc.width)}x${Math.round(rc.height)}` };
    if (!img) return { ...base, img: null };
    const ri = img.getBoundingClientRect();
    return {
      ...base,
      img: `${Math.round(ri.width)}x${Math.round(ri.height)}`,
      desloc: `${Math.round(ri.left - rc.left)},${Math.round(ri.top - rc.top)}`,
      preenche: ri.width >= rc.width - 3 && ri.height >= rc.height - 3 && Math.abs(ri.top - rc.top) <= 2 && Math.abs(ri.left - rc.left) <= 2,
      natural: `${img.naturalWidth}x${img.naturalHeight}`,
      completa: img.complete,
      origem: img.currentSrc.includes('/api/media/') ? 'proxy' : img.currentSrc.includes('/kits/') ? 'kits' : img.currentSrc ? 'outra' : 'sem-src',
      loading: img.getAttribute('loading'),
      atributos: `${img.getAttribute('width') || '-'}x${img.getAttribute('height') || '-'}`,
    };
  });
}

// Rodada 8A: campos de texto visíveis e a fonte COMPUTADA de cada um. Abaixo de
// 16 px o iOS dá zoom ao focar (e não desfaz sozinho).
function camposDaTela() {
  const ignorar = new Set(['hidden', 'file', 'checkbox', 'radio', 'range', 'color', 'submit', 'button']);
  return [...document.querySelectorAll('input, textarea, select')]
    .filter((el) => !ignorar.has(el.type) && el.getClientRects().length > 0)
    .map((el) => ({
      campo: `${el.tagName.toLowerCase()}${el.type && el.tagName === 'INPUT' ? `[${el.type}]` : ''}${el.placeholder ? ` "${el.placeholder.slice(0, 32)}"` : ''}`,
      fontePx: parseFloat(getComputedStyle(el).fontSize),
    }));
}

// Rodada 8A: 1ª visita ao Ranking — observado de FORA do app. Quadros (gaps de
// requestAnimationFrame), 1ª linha do ranking no DOM, 1ª imagem de linha
// carregada e o toque na aba. Tudo em performance.now() da própria página, a
// mesma base do Diagnóstico do app.
function observadorRanking({ lento }) {
  // Como no WebView do iPhone, sem requestIdleCallback: o pré-aquecimento só sai
  // 1,5 s depois do /api/inicio. Com ele (o WebKit do Playwright tem), o
  // aquecimento chegava sempre antes do toque e a cena nunca via o Ranking
  // revalidar o cache velho — o caminho lento dos relatórios do iPhone.
  // (Atribuir, não `delete`: a função vive no Window.prototype.)
  window.requestIdleCallback = undefined;
  window.cancelIdleCallback = undefined;
  const reg = { quadros: [], maiorQuadro: { ms: 0, em: 0 }, primeiraLinha: null, primeiraImagem: null, toque: null };
  window.__futtyRanking = reg;
  let ultimo = performance.now();
  const laco = (agora) => {
    const gap = agora - ultimo;
    if (gap > reg.maiorQuadro.ms) reg.maiorQuadro = { ms: Math.round(gap), em: Math.round(ultimo) };
    if (gap > 60 && reg.quadros.length < 200) reg.quadros.push({ em: Math.round(ultimo), ms: Math.round(gap) });
    ultimo = agora;
    requestAnimationFrame(laco);
  };
  requestAnimationFrame(laco);
  new MutationObserver(() => {
    if (reg.primeiraLinha == null && document.querySelector('.rank-row')) reg.primeiraLinha = Math.round(performance.now());
  }).observe(document, { childList: true, subtree: true });
  document.addEventListener('load', (e) => {
    if (reg.primeiraImagem == null && e.target?.tagName === 'IMG' && e.target.closest?.('.rank-row')) reg.primeiraImagem = Math.round(performance.now());
  }, true);
  document.addEventListener('click', (e) => {
    if (e.target?.closest?.('.bottom-nav__tab--ranking')) reg.toque = Math.round(performance.now());
  }, true);
  if (lento) {
    // ~36 ms ocupados a cada 48 ms: sobra 1/4 da thread principal para o app.
    setInterval(() => {
      const fim = performance.now() + 36;
      while (performance.now() < fim) { /* trabalho */ }
    }, 48);
  }
}

// `amostrar: false` = cenas da Rodada 8A: sem o amostrador de largura e com o
// service worker BLOQUEADO — com ele ativo, o WebKit passa os pedidos da página
// pelo SW e o Playwright deixa de os ver: a interceção das escritas falhava em
// silêncio (medido no 1º "antes": o PATCH da ausência e o POST do Diagnóstico
// chegaram a produção). O app da loja também não usa o SW.
async function novoContexto(navegador, sessao, { amostrar = true, viewport = null, extra = {} } = {}) {
  const contexto = await navegador.newContext({
    ...IPHONE,
    ...(viewport ? { viewport } : {}),
    ...extra,
    ...(amostrar ? {} : { serviceWorkers: 'block' }),
    storageState: sessao ? { cookies: [], origins: [{ origin: BASE, localStorage: sessao }] } : undefined,
  });
  if (amostrar) await contexto.addInitScript(amostrador, { larguraAparelho: LARGURA_APARELHO, duracaoMs: AMOSTRAGEM_MS });
  return contexto;
}

// Rodada 8A: nas cenas novas nada escreve no banco. Toda escrita à /api é
// respondida aqui; `extra` devolve um corpo próprio para rotas específicas.
async function travarEscritas(contexto, extra = () => null) {
  const escritas = [];
  await contexto.route('**/api/**', async (route) => {
    const pedido = route.request();
    if (pedido.method() === 'GET' || pedido.method() === 'OPTIONS') return route.continue();
    const u = new URL(pedido.url());
    const corpo = pedido.postData();
    escritas.push({ metodo: pedido.method(), rota: u.pathname, corpo: corpo ? corpo.slice(0, 200) : null });
    const resposta = extra(u.pathname, pedido.method(), corpo) || { ok: true };
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(resposta) });
  });
  return escritas;
}

async function entrar(navegador) {
  const contexto = await navegador.newContext(IPHONE);
  const pagina = await contexto.newPage();
  await pagina.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
  await pagina.waitForSelector('input[type="email"]', { timeout: 30000 });
  // Rodada 8A: os campos do login também dão zoom no iPhone se a fonte for < 16 px.
  const camposLogin = await pagina.evaluate(camposDaTela);
  await pagina.fill('input[type="email"]', EMAIL);
  await pagina.fill('input[type="password"]', lerSenha());
  await pagina.click('button[type="submit"]');
  await pagina.waitForURL('**/home', { timeout: 45000 });
  // Só a sessão do Supabase segue para as telas: o resto do armazenamento é
  // exatamente o cache que tem de estar frio.
  const sessao = await pagina.evaluate(() =>
    Object.keys(localStorage)
      .filter((k) => /^sb-.+-auth-token$/.test(k))
      .map((name) => ({ name, value: localStorage.getItem(name) }))
  );
  await contexto.close();
  if (!sessao.length) throw new Error('entrou, mas não achou a sessão do Supabase no localStorage');
  return { sessao, camposLogin };
}

function registrarPedidos(pagina, t0Ref) {
  const pedidos = [];
  pagina.on('request', (r) => {
    const u = new URL(r.url());
    if (!u.pathname.startsWith('/api/') || u.pathname.startsWith('/api/media/') || r.method() === 'OPTIONS') return;
    pedidos.push({ rota: u.pathname, inicioMs: Date.now() - t0Ref.t0, fimMs: null });
  });
  pagina.on('requestfinished', (r) => {
    const u = new URL(r.url());
    const p = [...pedidos].reverse().find((x) => x.rota === u.pathname && x.fimMs == null);
    if (p) p.fimMs = Date.now() - t0Ref.t0;
  });
  return pedidos;
}

async function abrirTela(navegador, sessao, nome, rota) {
  const contexto = await novoContexto(navegador, sessao);
  const pagina = await contexto.newPage();
  const ref = { t0: Date.now() };
  const pedidos = registrarPedidos(pagina, ref);
  const erros = [];
  pagina.on('pageerror', (e) => erros.push(e.message));

  ref.t0 = Date.now();
  await pagina.goto(`${BASE}${rota}`, { waitUntil: 'commit' });
  const capturas = [];
  for (const ms of MARCAS_MS) {
    const falta = ms - (Date.now() - ref.t0);
    if (falta > 0) await espera(falta);
    const arquivo = path.join(PASTA, `${ETIQUETA}-${nome}-${String(ms).padStart(4, '0')}ms.png`);
    await pagina.screenshot({ path: arquivo });
    capturas.push({ ms, real: Date.now() - ref.t0, arquivo: path.relative(RAIZ, arquivo) });
  }
  await espera(Math.max(0, AMOSTRAGEM_MS + 300 - (Date.now() - ref.t0)));

  const amostras = await pagina.evaluate(() => window.__futtyAmostras || []);
  const avatares = await pagina.evaluate(geometriaAvatares);
  const urlFinal = pagina.url().replace(BASE, '');
  await contexto.close();
  return { nome, rota, urlFinal, capturas, amostras, avatares, pedidos, erros };
}

async function arranqueFrio(navegador, sessao) {
  const contexto = await novoContexto(navegador, sessao);
  const pagina = await contexto.newPage();
  const ref = { t0: Date.now() };
  const pedidos = registrarPedidos(pagina, ref);
  ref.t0 = Date.now();
  await pagina.goto(`${BASE}/`, { waitUntil: 'commit' });
  await espera(8000);
  const urlFinal = pagina.url().replace(BASE, '');
  await contexto.close();
  const inicio = pedidos.find((p) => p.rota === '/api/inicio');
  // "Arranque" = o que sai antes de o /api/inicio voltar. O que sai depois é o
  // pré-aquecimento das outras abas (lib/preaquecerDados.js), de propósito.
  const noArranque = pedidos.filter((p) => !inicio || inicio.fimMs == null || p.inicioMs <= inicio.fimMs);
  return { urlFinal, pedidos, noArranque: noArranque.map((p) => p.rota) };
}

function resumir(tela) {
  const montadas = tela.amostras.filter((a) => a.montado);
  const piorLargura = montadas.reduce((m, a) => Math.max(m, a.larguraRolavel || 0, a.larguraViewport || 0), 0);
  const largas = montadas.filter((a) => a.larguraRolavel > LARGURA_APARELHO + 1 || a.larguraViewport > LARGURA_APARELHO + 1 || (a.escala != null && a.escala < 0.99));
  const culpados = [...new Set(largas.map((a) => a.maisLargo && `${a.maisLargo.caminho} (direita ${a.maisLargo.direita}px, largura ${a.maisLargo.largura}px${a.maisLargo.atributoWidth ? `, width="${a.maisLargo.atributoWidth}"` : ''})`).filter(Boolean))];
  const comImg = tela.avatares.filter((a) => a.img);
  const pequenos = comImg.filter((a) => !a.preenche);
  return { piorLargura, msLargos: largas.map((a) => a.t), culpados, avatares: comImg.length, avataresPequenos: pequenos.length, exemplosPequenos: pequenos.slice(0, 4) };
}

// ─── Cena "campos": comentário focado ─────────────────────────────────────────
async function cenaCampos(navegador, sessao) {
  const contexto = await novoContexto(navegador, sessao, { amostrar: false });
  const escritas = await travarEscritas(contexto);
  const pagina = await contexto.newPage();
  await pagina.goto(`${BASE}/feed`, { waitUntil: 'domcontentloaded' });
  const viewportMeta = await pagina.evaluate(() => document.querySelector('meta[name="viewport"]')?.content || null);

  // Compositor da Resenha: expande (o textarea ganha foco sozinho) e fecha.
  const convite = pagina.locator('button', { hasText: /^Solte a resenha/ }).first();
  await convite.waitFor({ timeout: 30000 });
  await convite.tap();
  await pagina.waitForSelector('textarea[placeholder^="Escreva sua resenha"]', { timeout: 10000 });
  const camposCompositor = await pagina.evaluate(camposDaTela);
  await pagina.locator('button[aria-label="Fechar"]').first().tap();

  // Comentários do 1º post e foco no campo, com toque (hasTouch), como no aparelho.
  const abrir = pagina.locator('button', { hasText: /^(Comentar|Responder|Ver todos os \d+ comentários)$/ }).first();
  await abrir.waitFor({ timeout: 20000 });
  await abrir.tap();
  const campo = pagina.locator('textarea[placeholder^="Escreva um comentário"]').first();
  await campo.waitFor({ timeout: 20000 });
  await campo.scrollIntoViewIfNeeded();
  await espera(400);
  const escalaAntes = await pagina.evaluate(() => window.visualViewport?.scale ?? null);
  await campo.tap();
  await espera(900);
  const depoisFoco = await pagina.evaluate(() => {
    const el = document.activeElement;
    return {
      escala: window.visualViewport?.scale ?? null,
      focado: el ? `${el.tagName.toLowerCase()} "${(el.placeholder || '').slice(0, 30)}"` : null,
      fontePx: el ? parseFloat(getComputedStyle(el).fontSize) : null,
      larguraRolavel: document.scrollingElement?.scrollWidth ?? null,
    };
  });
  const camposComentario = await pagina.evaluate(camposDaTela);
  const captura = arquivoCaptura('comentario-focado');
  await pagina.screenshot({ path: captura });
  await contexto.close();
  return { viewportMeta, escalaAntes, depoisFoco, camposCompositor, camposComentario, captura: path.relative(RAIZ, captura), escritas };
}

// ─── Cena "voto": modal de votar numa linha rolada ────────────────────────────
async function cenaVoto(navegador, sessao) {
  const contexto = await novoContexto(navegador, sessao, { amostrar: false });
  const escritas = await travarEscritas(contexto);
  const pagina = await contexto.newPage();
  await pagina.goto(`${BASE}/equipa/${TIME}/ranking`, { waitUntil: 'domcontentloaded' });
  await pagina.waitForSelector('.rank-row', { timeout: 30000 });
  await espera(1500);
  const botoes = pagina.locator('.rank-row button', { hasText: /^(Votar|Alterar)$/ });
  const n = await botoes.count();
  if (!n) throw new Error('nenhum botão de votar no ranking');
  // A ÚLTIMA linha: é com a página rolada que o modal "fixo" dentro do
  // [data-page] se perde (centra-se na página inteira, não na tela).
  const alvo = botoes.nth(n - 1);
  await alvo.scrollIntoViewIfNeeded();
  await espera(300);
  await alvo.tap();
  await pagina.waitForSelector('[role="dialog"]', { state: 'attached', timeout: 10000 });
  await espera(700);
  const geometria = await pagina.evaluate(() => {
    const dialogo = document.querySelector('[role="dialog"]');
    const overlay = dialogo?.closest('.modal-overlay');
    const r = dialogo.getBoundingClientRect();
    const estrelas = [...dialogo.querySelectorAll('button[aria-label$="estrelas"]')].map((b) => b.parentElement.getBoundingClientRect());
    const fila = estrelas.length ? { esquerda: Math.round(Math.min(...estrelas.map((e) => e.left))), direita: Math.round(Math.max(...estrelas.map((e) => e.right))) } : null;
    return {
      tela: { largura: window.innerWidth, altura: window.innerHeight, rolagemY: Math.round(window.scrollY) },
      cartao: { x: Math.round(r.left), y: Math.round(r.top), largura: Math.round(r.width), altura: Math.round(r.height) },
      naTela: r.top >= 0 && r.left >= 0 && r.bottom <= window.innerHeight && r.right <= window.innerWidth,
      centradoY: Math.round(r.top + r.height / 2 - window.innerHeight / 2),
      overlayDentroDaPagina: !!document.querySelector('[data-page]')?.contains(overlay),
      overlayFilhoDoBody: overlay?.parentElement === document.body,
      estrelas: fila ? { ...fila, cabem: fila.esquerda >= r.left && fila.direita <= r.right } : null,
    };
  });
  const captura = arquivoCaptura('modal-voto');
  await pagina.screenshot({ path: captura });
  await pagina.locator('[role="dialog"] button', { hasText: /^Cancelar$/ }).click({ force: true }).catch(() => {});
  await contexto.close();
  return { botoes: n, geometria, captura: path.relative(RAIZ, captura), escritas };
}

// ─── Cena "aviso": aviso de ausência no Início ────────────────────────────────
async function blocoAviso(pagina) {
  return pagina.evaluate(() => {
    const rotulo = document.querySelector('.games-label');
    const zona = rotulo?.parentElement;
    if (!zona) return { achou: false };
    const botoes = [...zona.querySelectorAll('button')].map((b) => b.innerText.trim()).filter(Boolean);
    const texto = (zona.innerText || '').split('\n').map((s) => s.trim()).filter(Boolean).slice(0, 12);
    return { achou: true, botoes, texto, rsvpCard: /Confirme presença/.test(zona.innerText || '') };
  });
}

async function cenaAviso(navegador, sessao) {
  const contexto = await novoContexto(navegador, sessao, { amostrar: false });
  const escritas = await travarEscritas(contexto, (rota, _metodo, corpo) => {
    if (!rota.endsWith('/membros/ausencia')) return null;
    let ausente = false;
    try { ausente = !!JSON.parse(corpo || '{}').ausente; } catch { /* corpo inválido */ }
    return { ok: true, ausente };
  });
  const pagina = await contexto.newPage();
  const passos = [];
  const capturar = async (nome, descricao) => {
    const captura = arquivoCaptura(nome);
    await pagina.screenshot({ path: captura });
    passos.push({ passo: descricao, captura: path.relative(RAIZ, captura), bloco: await blocoAviso(pagina), dialogo: await pagina.evaluate(() => document.querySelector('[role="dialog"]')?.innerText?.replace(/\s+/g, ' ').trim() || null) });
  };
  const tocar = async (re) => {
    const b = pagina.locator('button', { hasText: re }).first();
    if (!(await b.count())) return false;
    await b.scrollIntoViewIfNeeded();
    await b.tap();
    await espera(900);
    return true;
  };

  await pagina.goto(`${BASE}/home`, { waitUntil: 'domcontentloaded' });
  await pagina.waitForSelector('.games-label', { timeout: 30000 });
  await espera(2500);
  await pagina.locator('.games-label').first().scrollIntoViewIfNeeded();
  await pagina.evaluate(() => window.scrollBy(0, -120));
  await espera(300);
  await capturar('aviso-1-estado', 'estado ao abrir');

  // Se a conta já está marcada como ausente, desfaz (interceptado) para chegar ao botão.
  if (await tocar(/^(Desfazer|Afinal vou)$/)) await capturar('aviso-2-botao', 'depois de desfazer (escrita interceptada)');
  // O botão: "Avisar que não vou" (novo) ou "Não vou ao próximo jogo" (antigo).
  if (await tocar(/^(Avisar que não vou|Não vou ao próximo jogo)$/)) {
    await capturar('aviso-3-toque', 'depois de tocar no botão');
    if (await pagina.locator('[role="dialog"] button', { hasText: /^Avisar$/ }).count()) {
      await pagina.locator('[role="dialog"] button', { hasText: /^Avisar$/ }).tap();
      await espera(700);
      await capturar('aviso-4-avisado', 'depois de confirmar (escrita interceptada)');
    }
  }

  // RSVP aberto para o MESMO jogo: o card já tem Vou / Não vou — o aviso some.
  // /api/inicio respondido com rsvp_aberto (só nesta página de teste).
  const contextoRsvp = await novoContexto(navegador, sessao, { amostrar: false });
  await travarEscritas(contextoRsvp);
  await contextoRsvp.route('**/api/inicio*', async (route) => {
    const resposta = await route.fetch();
    const json = await resposta.json();
    if (json?.rsvp) {
      json.rsvp.rsvp_aberto = true;
      json.rsvp.rsvp_fechado = false;
      json.rsvp.rsvp_prazo = new Date(Date.now() + 2 * 86400000).toISOString();
    }
    return route.fulfill({ response: resposta, json });
  });
  const paginaRsvp = await contextoRsvp.newPage();
  await paginaRsvp.goto(`${BASE}/home`, { waitUntil: 'domcontentloaded' });
  await paginaRsvp.waitForSelector('.games-label', { timeout: 30000 });
  await espera(2500);
  const comRsvp = await blocoAviso(paginaRsvp);
  await paginaRsvp.locator('.games-label').first().scrollIntoViewIfNeeded();
  const capturaRsvp = arquivoCaptura('aviso-5-rsvp-aberto');
  await paginaRsvp.screenshot({ path: capturaRsvp });
  await contextoRsvp.close();
  await contexto.close();
  return { passos, comRsvp: { ...comRsvp, captura: path.relative(RAIZ, capturaRsvp) }, escritas };
}

// ─── Cena "resenha": varredura estado a estado ────────────────────────────────
// Rodada 9, item 3. O Pedro no iPhone: "ao adicionar uma foto a tela aumenta e
// fica desproporcional". O WebKit faz isso quando ALGUMA coisa fica mais larga
// que a tela: ele alarga a viewport para caber e encolhe a página inteira. Aqui
// passa-se por cada estado da Resenha e mede-se, em cada um, a largura rolável,
// a escala da viewport, o elemento que passa da borda e as imagens sem travão.
//
// As fotos são sintéticas (geradas aqui, servidas por interceção) para as
// proporções serem exatas: 3:4 (retrato) e 16:9 (paisagem). Nada é publicado —
// toda escrita é interceptada, o upload devolve a URL falsa.
function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}
function pedacoPng(tipo, dados) {
  const t = Buffer.from(tipo, 'ascii');
  const tamanho = Buffer.alloc(4);
  tamanho.writeUInt32BE(dados.length);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([t, dados])));
  return Buffer.concat([tamanho, t, dados, crc]);
}
/** PNG sólido w×h (sem dependências): serve para dar proporção exata a um <img>. */
function pngSolido(w, h, [r, g, b]) {
  const bruto = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) {
    const off = y * (w * 3 + 1);
    bruto[off] = 0; // filtro "none"
    for (let x = 0; x < w; x++) {
      // Faixas: dá para ver de olho se a imagem foi esticada.
      const claro = (y >> 5) % 2 === 0;
      bruto[off + 1 + x * 3] = claro ? r : Math.round(r * 0.55);
      bruto[off + 2 + x * 3] = claro ? g : Math.round(g * 0.55);
      bruto[off + 3 + x * 3] = claro ? b : Math.round(b * 0.55);
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 2; // 8 bits, RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pedacoPng('IHDR', ihdr),
    pedacoPng('IDAT', deflateSync(bruto)),
    pedacoPng('IEND', Buffer.alloc(0)),
  ]);
}

const FOTO_RETRATO = 'https://futty-foto.invalid/retrato.png'; // 900×1200 (3:4)
const FOTO_PAISAGEM = 'https://futty-foto.invalid/paisagem.png'; // 1600×900 (16:9)
const PALAVRA_LONGA = 'Panegirico' + 'supercalifragilistico'.repeat(2) + 'desconcertante'; // 60+ letras sem espaço

// Vigia a largura da página DURANTE uma ação (o alargamento do WebKit pode ser
// só um instante: um retrato de 4032×3024 a entrar no DOM alarga, o layout
// acerta, e a captura a seguir já não vê nada. É esse instante que o Pedro vê).
function vigiarLargura(larguraAparelho) {
  const reg = { maxRolavel: 0, maxViewport: 0, minEscala: 9, amostras: 0, pior: null };
  window.__futtyLargura = reg;
  const tique = () => {
    const se = document.scrollingElement;
    const rol = se ? se.scrollWidth : 0;
    reg.amostras += 1;
    reg.maxViewport = Math.max(reg.maxViewport, window.innerWidth);
    if (window.visualViewport) reg.minEscala = Math.min(reg.minEscala, window.visualViewport.scale);
    if (rol > reg.maxRolavel) {
      reg.maxRolavel = rol;
      if (rol > larguraAparelho + 0.5 && document.body) {
        let pior = null;
        for (const el of document.body.getElementsByTagName('*')) {
          const r = el.getBoundingClientRect();
          if (r.width === 0 || r.right <= larguraAparelho + 0.5) continue;
          if (pior && r.right <= pior.right) continue;
          pior = { right: r.right, el };
        }
        if (pior) {
          const cls = typeof pior.el.className === 'string' ? pior.el.className : '';
          reg.pior = `${pior.el.tagName.toLowerCase()}${cls ? `.${cls.trim().split(/\s+/).slice(0, 2).join('.')}` : ''} direita ${Math.round(pior.right)}px`;
        }
      }
    }
    reg.temporizador = setTimeout(tique, 50);
  };
  tique();
}

// Roda DENTRO da página: tudo o que este item pede medir num estado.
function medidasDoEstado(larguraAparelho) {
  const descrever = (el) => {
    const cls = typeof el.className === 'string' ? el.className : el.getAttribute('class') || '';
    return `${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ''}${cls ? `.${cls.trim().split(/\s+/).slice(0, 2).join('.')}` : ''}`;
  };
  const caminho = (el) => {
    const partes = [];
    for (let n = el; n && n !== document.body && partes.length < 5; n = n.parentElement) partes.unshift(descrever(n));
    return partes.join(' > ');
  };
  const recortado = (el) => {
    for (let n = el.parentElement; n && n !== document.body; n = n.parentElement) {
      if (getComputedStyle(n).overflowX !== 'visible') return true;
    }
    return false;
  };
  // Quem passa da borda direita da TELA (não da innerWidth: quando algo
  // transborda, o WebKit alarga a própria viewport e nada mais "passa").
  const passamDaBorda = [];
  for (const el of document.body.getElementsByTagName('*')) {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.right <= larguraAparelho + 0.5) continue;
    const cs = getComputedStyle(el);
    if (cs.position === 'fixed' || recortado(el)) continue;
    passamDaBorda.push({ caminho: caminho(el), direita: Math.round(r.right), largura: Math.round(r.width) });
  }
  passamDaBorda.sort((a, b) => b.direita - a.direita);

  // Imagens sem travão: sem max-width que a prenda, sem height:auto ou sem
  // proporção reservada (o que faz a página saltar quando a foto chega).
  const imagens = [...document.images]
    .filter((img) => img.getClientRects().length > 0)
    .map((img) => {
      const cs = getComputedStyle(img);
      const r = img.getBoundingClientRect();
      // Larga demais: sem max-width E sem largura fixa — cresce com a foto.
      const podeCrescer = cs.maxWidth === 'none' && cs.width === 'auto';
      // Sem lugar reservado: altura livre, sem proporção e sem width/height no
      // atributo — é o que faz a página saltar quando a imagem finalmente chega.
      const temAtributos = !!(img.getAttribute('width') && img.getAttribute('height'));
      const semReserva = cs.height === 'auto' && cs.aspectRatio === 'auto' && !temAtributos;
      return {
        caminho: caminho(img),
        caixa: `${Math.round(r.width)}x${Math.round(r.height)}`,
        natural: `${img.naturalWidth}x${img.naturalHeight}`,
        maxWidth: cs.maxWidth, largura: cs.width, altura: cs.height, aspectRatio: cs.aspectRatio,
        atributos: `${img.getAttribute('width') || '-'}x${img.getAttribute('height') || '-'}`,
        ok: !podeCrescer && !semReserva,
        motivo: podeCrescer ? 'sem max-width e sem largura fixa' : semReserva ? 'sem altura reservada (salta quando chega)' : null,
        passaDaBorda: r.right > larguraAparelho + 0.5,
      };
    });

  const se = document.scrollingElement;
  return {
    larguraRolavel: se ? se.scrollWidth : null,
    larguraViewport: window.innerWidth,
    alturaViewport: window.innerHeight,
    escala: window.visualViewport ? Number(window.visualViewport.scale.toFixed(3)) : null,
    passamDaBorda: passamDaBorda.slice(0, 4),
    imagens: imagens.filter((i) => !i.ok || i.passaDaBorda),
    totalImagens: imagens.length,
  };
}

// Molda a resposta do feed: acrescenta no topo os posts que o item 3 pede
// (retrato, paisagem, vídeo, anúncio oficial, texto longo com palavra de 60
// letras) copiando a FORMA de um post real — nada de inventar campos.
function moldarFeed(json, { retrato, paisagem, palavra }) {
  // O /api/feed devolve { items: [...] } misturando jogos e posts (kind).
  const itens = json?.items || [];
  const base = itens.find((i) => i.kind === 'post');
  if (!base) return json;
  const agora = Date.now();
  const clone = (i, extra) => JSON.parse(JSON.stringify({
    ...base,
    created_at: new Date(agora - i * 1000).toISOString(),
    media: [], conteudo: null, tipo: 'post',
    ...extra,
  }));
  const novos = [
    clone(0, { id: 'varredura-retrato', body: 'Foto em retrato 3:4.', media: [{ url: retrato, media_type: 'image' }] }),
    clone(1, { id: 'varredura-paisagem', body: 'Foto em paisagem 16:9.', media: [{ url: paisagem, media_type: 'image' }] }),
    clone(2, { id: 'varredura-texto', body: `Texto comprido para a varredura. ${palavra} ${'palavra '.repeat(40)}`.trim() }),
    clone(3, { id: 'varredura-video', body: 'Vídeo por link. https://www.youtube.com/watch?v=dQw4w9WgXcQ' }),
    clone(4, { id: 'varredura-anuncio', tipo: 'anuncio', body: 'Comunicado oficial do time para a varredura.' }),
  ];
  return { ...json, items: [...novos, ...itens] };
}

async function cenaResenha(navegador, sessao, { largura, altura, rotulo }) {
  const retrato = pngSolido(900, 1200, [212, 160, 23]);
  const paisagem = pngSolido(1600, 900, [139, 92, 246]);
  // 12 MP: o tamanho que o iPhone 15 Pro Max grava numa foto normal.
  const fotoGrande = pngSolido(4032, 3024, [94, 234, 212]);

  const contexto = await novoContexto(navegador, sessao, { amostrar: false });
  // O upload devolve a foto sintética em vez de gravar no banco.
  await travarEscritas(contexto, (rota) => (rota.endsWith('/feed/upload') ? { url: FOTO_RETRATO, media_type: 'image' } : null));
  await contexto.route('**/futty-foto.invalid/**', (route) =>
    route.fulfill({ status: 200, contentType: 'image/png', body: route.request().url().includes('paisagem') ? paisagem : retrato }));
  // A conta demo não tem campanha ativa e o AdCard não renderiza sem uma. Serve-se
  // uma aqui (texto longo de propósito) para o estado "anúncio entre posts" existir.
  await contexto.route('**/api/ads?**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ad: { id: 'varredura-ad', texto: 'Chuteira nova com desconto para o time inteiro', sub: 'Patrocinador oficial da varredura do iPhone', cta: 'Ver oferta', link: 'https://exemplo.invalid' } }),
    }));
  let feedMoldado = 0;
  await contexto.route('**/api/feed*', async (route) => {
    if (route.request().method() !== 'GET') return route.fallback();
    const resposta = await route.fetch();
    const json = await resposta.json().catch(() => null);
    if (!json?.items) return route.fulfill({ response: resposta });
    feedMoldado += 1;
    return route.fulfill({ response: resposta, json: moldarFeed(json, { retrato: FOTO_RETRATO, paisagem: FOTO_PAISAGEM, palavra: PALAVRA_LONGA }) });
  });

  const pagina = await contexto.newPage();
  await pagina.setViewportSize({ width: largura, height: altura });
  const estados = [];
  const erros = [];
  pagina.on('pageerror', (e) => erros.push(e.message));

  const medir = async (nome, { rolarPara = null } = {}) => {
    if (rolarPara) await rolarPara();
    await espera(500);
    const m = await pagina.evaluate(medidasDoEstado, largura);
    const arquivo = path.join(PASTA, `${ETIQUETA}-resenha-${rotulo}-${nome}.png`);
    await pagina.screenshot({ path: arquivo });
    estados.push({ estado: nome, ...m, captura: path.relative(RAIZ, arquivo) });
    return m;
  };
  const tocar = async (seletor, { forca = false } = {}) => {
    const l = typeof seletor === 'string' ? pagina.locator(seletor).first() : seletor;
    if (!(await l.count())) return false;
    await l.scrollIntoViewIfNeeded().catch(() => {});
    const acao = forca ? l.click({ force: true, timeout: 8000 }) : l.tap({ timeout: 8000 });
    const ok = await acao.then(() => true, () => false);
    await espera(700);
    return ok;
  };
  // Um passo que falha não pode derrubar a varredura inteira: fica registado e
  // a medição continua nos outros estados.
  const passo = async (nome, fn) => {
    try { await fn(); } catch (e) { erros.push(`passo ${nome}: ${e.message.split('\n')[0]}`); }
  };

  await pagina.goto(`${BASE}/feed`, { waitUntil: 'domcontentloaded' });
  await pagina.waitForSelector('button:has-text("Solte a resenha")', { timeout: 30000 });
  await espera(2500);
  await medir('feed-topo');

  // ── Compositor: vazio → com texto → com foto (retrato e paisagem) ──────────
  await tocar(pagina.locator('button', { hasText: /^Solte a resenha/ }).first());
  await medir('compositor-vazio');
  const ta = pagina.locator('textarea[placeholder^="Escreva sua resenha"]').first();
  await ta.fill(`Resenha de teste com uma palavra sem espaços: ${PALAVRA_LONGA} — e mais texto para encher.`);
  await medir('compositor-texto');

  // Escolher foto → CropModal (portal). Retrato 3:4, paisagem 16:9 e uma foto
  // do tamanho que o iPhone tira mesmo (4032×3024, 12 MP) — é "adicionar uma
  // foto" de verdade, e é aí que o Pedro diz que a tela aumenta.
  for (const [nome, prop, buffer] of [['retrato', '3:4', retrato], ['paisagem', '16:9', paisagem], ['iphone12mp', '4:3', fotoGrande]]) {
    await pagina.evaluate(vigiarLargura, largura);
    await pagina.setInputFiles('input[type="file"]', { name: `${nome}.png`, mimeType: 'image/png', buffer });
    await pagina.waitForSelector('[role="dialog"][aria-label="Recortar imagem"]', { timeout: 30000 });
    await espera(1500);
    const vigia = await pagina.evaluate(() => {
      const r = window.__futtyLargura || {};
      clearTimeout(r.temporizador);
      return { maxRolavel: r.maxRolavel, maxViewport: r.maxViewport, minEscala: r.minEscala === 9 ? null : Number((r.minEscala || 0).toFixed(3)), amostras: r.amostras, pior: r.pior };
    });
    await tocar(pagina.locator('[role="dialog"] button', { hasText: new RegExp(`^${prop}$`) }).first(), { forca: true });
    const m = await medir(`crop-${nome}`);
    const geo = await pagina.evaluate(() => {
      const d = document.querySelector('[role="dialog"][aria-label="Recortar imagem"]');
      const r = d.getBoundingClientRect();
      const chips = [...d.querySelectorAll('button')].map((b) => b.getBoundingClientRect());
      const fila = chips.length ? { esquerda: Math.round(Math.min(...chips.map((c) => c.left))), direita: Math.round(Math.max(...chips.map((c) => c.right))) } : null;
      const rodape = d.lastElementChild?.getBoundingClientRect();
      return {
        cartao: `${Math.round(r.width)}x${Math.round(r.height)} em (${Math.round(r.left)}, ${Math.round(r.top)})`,
        cabeNaTela: r.width <= window.innerWidth + 0.5 && r.height <= window.innerHeight + 0.5,
        chips: fila,
        chipsCabem: fila ? fila.esquerda >= 0 && fila.direita <= window.innerWidth : null,
        rodapeAbaixoDaDobra: rodape ? Math.round(rodape.bottom - window.innerHeight) : null,
      };
    });
    estados[estados.length - 1].crop = geo;
    estados[estados.length - 1].vigia = vigia;
    if (m.passamDaBorda.length || geo.chipsCabem === false || vigia.maxRolavel > largura + 1) estados[estados.length - 1].suspeito = true;
    await tocar(pagina.locator('[role="dialog"] button', { hasText: /^Confirmar$/ }).first(), { forca: true });
    await espera(1200);
    await medir(`compositor-foto-${nome}`);
  }

  // ── Teclado aberto: a tela encolhe e o compositor tem de continuar visível ──
  await pagina.setViewportSize({ width: largura, height: 500 });
  await ta.tap().catch(() => {});
  await espera(600);
  const comTeclado = await medir('compositor-teclado');
  estados[estados.length - 1].teclado = await pagina.evaluate(() => {
    const t = document.querySelector('textarea[placeholder^="Escreva sua resenha"]');
    const nav = document.querySelector('.bottom-nav');
    const rt = t?.getBoundingClientRect();
    const rn = nav?.getBoundingClientRect();
    return {
      compositorVisivel: !!rt && rt.top < window.innerHeight && rt.bottom > 0,
      barraVisivel: !!rn && rn.top < window.innerHeight && rn.bottom <= window.innerHeight + 1,
      compositor: rt ? `${Math.round(rt.top)}→${Math.round(rt.bottom)}` : null,
      barra: rn ? `${Math.round(rn.top)}→${Math.round(rn.bottom)}` : null,
      altura: window.innerHeight,
    };
  });
  void comTeclado;
  await pagina.setViewportSize({ width: largura, height: altura });
  await espera(400);
  await tocar(pagina.locator('button[aria-label="Fechar"]').first(), { forca: true });

  // ── Posts: retrato, paisagem, texto longo, vídeo, anúncio oficial ─────────
  await passo('posts', async () => {
  for (const [nome, texto] of [
    ['post-retrato', 'Foto em retrato 3:4.'],
    ['post-paisagem', 'Foto em paisagem 16:9.'],
    ['post-texto-longo', 'Texto comprido para a varredura.'],
    ['post-video', 'Vídeo por link.'],
    ['post-anuncio', 'Comunicado oficial do time'],
  ]) {
    // Centra o CARD do post (não o div mais interno que contém o texto).
    await pagina.evaluate((t) => {
      const alvo = [...document.querySelectorAll('.feed-card')].find((c) => (c.innerText || '').includes(t));
      (alvo || document.body).scrollIntoView({ block: 'center' });
    }, texto).catch(() => {});
    await espera(700);
    await medir(nome);
  }
  });

  // ── Reações, comentários, campo de comentário focado ───────────────────────
  await passo('reacoes', async () => {
    await tocar(pagina.locator('button[aria-label="Reagir"]').first());
    await medir('reacoes-aberto');
    await pagina.keyboard.press('Escape').catch(() => {});
    await espera(300);
  });
  await passo('comentarios', async () => {
    // Um post REAL com comentários (os sintéticos da varredura não têm fio) —
    // "Ver todos os N comentários" só aparece em quem já tem 3 ou mais.
    const comFio = pagina.locator('button', { hasText: /^Ver todos os \d+ comentários$/ }).first();
    const verComentarios = (await comFio.count())
      ? comFio
      : pagina.locator('button', { hasText: /^(Comentar|Responder)$/ }).last();
    if (!(await tocar(verComentarios))) return;
    await espera(900);
    await medir('comentarios-abertos');
    const campo = pagina.locator('textarea[placeholder^="Escreva um comentário"]').first();
    if (await campo.count()) {
      await campo.scrollIntoViewIfNeeded();
      await campo.tap();
      await campo.fill(`Comentário com ${PALAVRA_LONGA} dentro.`);
      await medir('comentario-focado');
    }
    await tocar(pagina.locator('button[aria-label="Fechar"]').first(), { forca: true });
  });

  // ── Imagem em tela cheia ───────────────────────────────────────────────────
  await passo('imagem-tela-cheia', async () => {
    const foto = pagina.locator('button[style*="zoom-in"] img').first();
    if (!(await foto.count())) return;
    await foto.scrollIntoViewIfNeeded();
    await foto.click({ force: true });
    await espera(900);
    await medir('imagem-tela-cheia');
    // Fecha-se no clique do próprio overlay (não tem Escape nem botão).
    await pagina.locator('[role="dialog"][aria-label="Imagem"]').click({ position: { x: 8, y: 8 }, force: true, timeout: 8000 }).catch(() => {});
    await espera(500);
  });

  // ── Modal de denúncia ──────────────────────────────────────────────────────
  await passo('denuncia', async () => {
    if (!(await tocar(pagina.locator('button[aria-label="Opções"]').first()))) return;
    if (!(await tocar(pagina.locator('button', { hasText: /^Denunciar$/ }).first(), { forca: true }))) return;
    await espera(700);
    await medir('modal-denuncia');
    await tocar(pagina.locator('button', { hasText: /^(Cancelar|Fechar)$/ }).first(), { forca: true });
  });

  // ── Anúncio (AdCard) entre os posts ────────────────────────────────────────
  await passo('anuncio', async () => {
    const anuncio = pagina.locator('span', { hasText: /^Publicidade$/ }).first();
    if (!(await anuncio.count())) return;
    await anuncio.scrollIntoViewIfNeeded({ timeout: 8000 }).catch(() => {});
    await medir('anuncio-no-feed');
  });

  // ── Fim da lista (tudo pintado) ────────────────────────────────────────────
  await medir('feed-fundo', { rolarPara: () => pagina.evaluate(() => window.scrollTo(0, document.scrollingElement.scrollHeight)) });

  await contexto.close();
  return { rotulo, feedMoldado, tela: `${largura}x${altura}`, estados, erros };
}

// ─── Cena "fixos": position:fixed que não ancora na TELA ──────────────────────
// Rodada 9, item 4. O mesmo defeito do modal de votar: um `position: fixed`
// dentro do [data-page] pode ancorar na PÁGINA em vez da tela — basta um
// ancestral com transform, filter, backdrop-filter, perspective, will-change
// dessas, contain ou container-type. Aqui a prova é empírica, não teórica:
// mede-se cada elemento fixo, rola-se a página e mede-se outra vez. Quem se
// mexeu não estava preso à tela.
function medirFixos() {
  const descrever = (el) => {
    const cls = typeof el.className === 'string' ? el.className : el.getAttribute('class') || '';
    return `${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ''}${cls ? `.${cls.trim().split(/\s+/).slice(0, 2).join('.')}` : ''}`;
  };
  const caminho = (el) => {
    const partes = [];
    for (let n = el; n && n !== document.documentElement && partes.length < 4; n = n.parentElement) partes.unshift(descrever(n));
    return partes.join(' > ');
  };
  // Propriedades que fazem um elemento virar o "chão" do position:fixed dos filhos.
  const motivosDe = (cs) => {
    const m = [];
    if (cs.transform && cs.transform !== 'none') m.push(`transform: ${cs.transform}`);
    if (cs.filter && cs.filter !== 'none') m.push(`filter: ${cs.filter}`);
    if (cs.backdropFilter && cs.backdropFilter !== 'none') m.push(`backdrop-filter: ${cs.backdropFilter}`);
    if (cs.perspective && cs.perspective !== 'none') m.push(`perspective: ${cs.perspective}`);
    if (cs.willChange && /transform|filter|perspective/.test(cs.willChange)) m.push(`will-change: ${cs.willChange}`);
    if (cs.contain && /paint|layout|strict|content/.test(cs.contain)) m.push(`contain: ${cs.contain}`);
    if (cs.containerType && cs.containerType !== 'normal') m.push(`container-type: ${cs.containerType}`);
    if (cs.contentVisibility && cs.contentVisibility !== 'visible') m.push(`content-visibility: ${cs.contentVisibility}`);
    return m;
  };

  const pagina = document.querySelector('[data-page]');
  const lista = [...document.body.getElementsByTagName('*')]
    .filter((el) => getComputedStyle(el).position === 'fixed' && el.getClientRects().length > 0);
  window.__futtyFixos = lista;
  return lista.map((el) => {
    const r = el.getBoundingClientRect();
    let culpado = null;
    for (let n = el.parentElement; n && n !== document.documentElement; n = n.parentElement) {
      const m = motivosDe(getComputedStyle(n));
      if (m.length) { culpado = { elemento: descrever(n), motivos: m }; break; }
    }
    return {
      caminho: caminho(el),
      topo: Math.round(r.top), esquerda: Math.round(r.left),
      largura: Math.round(r.width), altura: Math.round(r.height),
      dentroDaPagina: !!pagina && pagina.contains(el),
      filhoDoBody: el.parentElement === document.body,
      culpado,
    };
  });
}

function remedirFixos() {
  return (window.__futtyFixos || []).map((el) => {
    const r = el.getBoundingClientRect();
    return { topo: Math.round(r.top), esquerda: Math.round(r.left) };
  });
}

// Mede uma tela: fixos antes e depois de rolar. Devolve quem se mexeu.
async function telaFixa(navegador, sessao, { nome, rota, comSessao = true, preparar = null, viewport = null }) {
  const contexto = await novoContexto(navegador, comSessao ? sessao : null, { amostrar: false });
  await travarEscritas(contexto);
  const pagina = await contexto.newPage();
  if (viewport) await pagina.setViewportSize(viewport);
  const erros = [];
  pagina.on('pageerror', (e) => erros.push(e.message));
  await pagina.goto(`${BASE}${rota}`, { waitUntil: 'domcontentloaded' });
  await pagina.waitForSelector('[data-page]', { timeout: 30000 }).catch(() => {});
  await espera(2200); // a animação de entrada (0,18 s) e os dados
  let nota = null;
  if (preparar) nota = await preparar(pagina).catch((e) => `preparar falhou: ${e.message}`);
  await espera(600);

  const antes = await pagina.evaluate(medirFixos);
  const capturaTopo = arquivoCaptura(`fixo-${nome}`);
  await pagina.screenshot({ path: capturaTopo });

  const rolou = await pagina.evaluate(() => {
    const se = document.scrollingElement;
    const alvo = Math.min(600, Math.max(0, se.scrollHeight - window.innerHeight));
    window.scrollTo(0, alvo);
    return Math.round(se.scrollTop);
  });
  await espera(500);
  const depois = await pagina.evaluate(remedirFixos);
  const capturaRolada = arquivoCaptura(`fixo-${nome}-rolado`);
  await pagina.screenshot({ path: capturaRolada });

  const fixos = antes.map((f, i) => {
    const d = depois[i] || {};
    const desvio = { topo: (d.topo ?? f.topo) - f.topo, esquerda: (d.esquerda ?? f.esquerda) - f.esquerda };
    return { ...f, depoisDeRolar: d, desvio, ancorado: Math.abs(desvio.topo) <= 1 && Math.abs(desvio.esquerda) <= 1 };
  });
  await contexto.close();
  return {
    nome, rota, rolou, nota, erros,
    tela: viewport || IPHONE.viewport,
    fixos,
    soltos: fixos.filter((f) => !f.ancorado),
    capturas: [path.relative(RAIZ, capturaTopo), path.relative(RAIZ, capturaRolada)],
  };
}

// O jogo com sorteio feito (o banner fixo de publicidade só aparece aí) e o
// gameId para a vista pública do sorteio. Lê a resposta que o próprio app pede.
async function acharJogoSorteado(navegador, sessao) {
  const contexto = await novoContexto(navegador, sessao, { amostrar: false });
  const pagina = await contexto.newPage();
  const jogos = [];
  pagina.on('response', async (resposta) => {
    if (!/\/api\/teams\/[^/]+\/games$/.test(new URL(resposta.url()).pathname)) return;
    const json = await resposta.json().catch(() => null);
    for (const g of json?.games || []) jogos.push(g);
  });
  await pagina.goto(`${BASE}/equipa/${TIME}/jogos`, { waitUntil: 'domcontentloaded' });
  await espera(4000);
  await contexto.close();
  const sorteado = jogos.find((g) => g.sorteio_realizado) || jogos[0] || null;
  return sorteado ? { id: sorteado.id, sorteioRealizado: !!sorteado.sorteio_realizado, total: jogos.length } : null;
}

async function cenaFixos(navegador, sessao) {
  const jogo = await acharJogoSorteado(navegador, sessao);
  const telas = [];

  if (jogo) {
    telas.push(await telaFixa(navegador, sessao, { nome: 'jogo', rota: `/equipa/${TIME}/jogo/${jogo.id}` }));
    telas.push(await telaFixa(navegador, sessao, {
      nome: 'sorteio',
      rota: `/equipa/${TIME}/jogo/${jogo.id}/sorteio`,
      // O termo de uso é um .modal-overlay renderizado dentro da própria tela.
      preparar: async (pagina) => {
        const b = pagina.locator('button', { hasText: /^(Baixar|Salvar)/ }).first();
        if (!(await b.count())) return 'sem botão de baixar (sorteio não realizado?)';
        await b.scrollIntoViewIfNeeded();
        await b.click({ force: true });
        await espera(700);
        return (await pagina.locator('[role="dialog"]').count()) ? 'termo aberto' : 'sem termo (já aceite)';
      },
    }));
    telas.push(await telaFixa(navegador, sessao, { nome: 'sorteio-publico', rota: `/p/${TIME}/${jogo.id}`, comSessao: false }));
  }
  telas.push(await telaFixa(navegador, sessao, { nome: 'planos', rota: '/planos' }));
  telas.push(await telaFixa(navegador, sessao, { nome: 'landing', rota: '/', comSessao: false }));
  return { jogo, telas };
}

// ─── Cena "ranking1": 1ª visita ao Ranking pelo Início ─────────────────────────
async function lerRelatorioDoApp(contexto, pagina) {
  // A interceção só entra AGORA, com a medição feita: qualquer route no contexto
  // desliga o cache HTTP do WebKit, e o iPhone do Pedro tinha as imagens em cache.
  const corpo = new Promise((resolve) => {
    contexto.route('**/api/diagnostico', (route) => {
      resolve(route.request().postData());
      return route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' });
    });
  });
  // Navegação do lado do cliente (a caixa-preta vive na memória da página).
  await pagina.evaluate(() => {
    window.history.pushState({}, '', '/diagnostico');
    window.dispatchEvent(new PopStateEvent('popstate'));
  });
  const enviar = pagina.locator('button', { hasText: /^Enviar relatório$/ });
  await enviar.waitFor({ timeout: 15000 });
  await enviar.click();
  const bruto = await Promise.race([corpo, espera(8000).then(() => null)]);
  return bruto ? JSON.parse(bruto) : null;
}

async function umaVisitaRanking(navegador, sessao, { comCache }) {
  const contexto = await novoContexto(navegador, sessao, { amostrar: false });
  await contexto.addInitScript(observadorRanking, { lento: LENTO });

  if (comCache) {
    // Uma visita antes grava o cache do ranking; depois ele é "envelhecido" para
    // 1 h (fora da janela de frescor de 30 s): a tela pinta do cache e revalida,
    // como no iPhone do Pedro, que já tinha visitado o Ranking noutros dias.
    const previa = await contexto.newPage();
    await previa.goto(`${BASE}/equipa/${TIME}/ranking`, { waitUntil: 'domcontentloaded' });
    await previa.waitForSelector('.rank-row', { timeout: 30000 });
    await espera(3000);
    await previa.evaluate(() => {
      for (const k of Object.keys(localStorage)) {
        if (!k.startsWith('futty_cache_v1:') || !k.includes(':ranking:')) continue;
        const v = JSON.parse(localStorage.getItem(k));
        v.em = Date.now() - 3600000;
        localStorage.setItem(k, JSON.stringify(v));
      }
    });
    await previa.close();
  }

  const pagina = await contexto.newPage();
  const erros = [];
  pagina.on('pageerror', (e) => erros.push(e.message));
  await pagina.goto(`${BASE}/home`, { waitUntil: 'domcontentloaded' });
  await pagina.waitForSelector('.bottom-nav__tab--ranking', { timeout: 30000 });
  await pagina.waitForSelector('.games-label, .home-empty', { timeout: 30000 });
  // Velocidade 8 (16-set): esperar que a aba já aponte para o TIME. O marcador
  // (.games-label) pode aparecer com `teams` ainda vazio, e nessa janela o href
  // da aba é "/ranking" (a rota sem slug, que mostra "crie o seu time"). Tocar
  // aí levava a cena para a tela errada e ela morria num timeout de 30 s à
  // espera de uma .rank-row que nunca ia existir — apanhado 3 vezes em 5 nesta
  // máquina, onde o backend, o servidor da build e o WebKit disputam a mesma
  // CPU. Não era defeito do app (confirmado à parte); era a bancada a medir
  // outra coisa. Teto de 5 s para não trocar um timeout por outro.
  await pagina
    .locator('.bottom-nav__tab--ranking[href*="/equipa/"]')
    .waitFor({ timeout: 5000 })
    .catch(() => {});
  // No relatório do build 18 o toque veio 214 ms depois de o /api/inicio voltar
  // (o Início já tinha pintado do cache) — antes do pré-aquecimento (1,5 s).
  // force: sem a espera de "elemento parado" do Playwright, que com quadros
  // lentos passava de 1 s e perdia a corrida para o aquecimento.
  await espera(200);
  await pagina.locator('.bottom-nav__tab--ranking').click({ force: true });
  await pagina.waitForSelector('.rank-row', { timeout: 30000 });
  await espera(4500);
  const fora = await pagina.evaluate(() => window.__futtyRanking);
  // Quando o pedido do ranking saiu, contado do toque (o que muda com a Rodada 8A:
  // com cache velho, só depois de a lista pintar).
  const pedidoRankingMs = await pagina.evaluate((toque) => {
    const e = performance.getEntriesByType('resource').find((x) => new URL(x.name).pathname.endsWith('/ranking') && x.startTime >= (toque || 0));
    return e ? Math.round(e.startTime - toque) : null;
  }, fora?.toque);
  const captura = arquivoCaptura(`ranking1-${comCache ? 'com-cache' : 'sem-cache'}`);
  await pagina.screenshot({ path: captura });
  const relatorio = await lerRelatorioDoApp(contexto, pagina);
  await contexto.close();

  const navRanking = relatorio?.navegacoes?.find((n) => /\/ranking$/.test(n.rota)) || null;
  const rel = (v) => (v == null || fora?.toque == null ? null : v - fora.toque);
  return {
    comCache,
    lento: LENTO,
    pedidoRankingMs,
    diagnostico: navRanking,
    deFora: fora && {
      primeiraLinhaMs: rel(fora.primeiraLinha),
      primeiraImagemMs: rel(fora.primeiraImagem),
      maiorQuadro: { ms: fora.maiorQuadro.ms, emMs: rel(fora.maiorQuadro.em) },
      quadrosLongos: fora.quadros.filter((q) => q.em >= fora.toque - 50).slice(0, 12).map((q) => ({ emMs: q.em - fora.toque, ms: q.ms })),
    },
    chamadas: (relatorio?.chamadas || []).map((c) => `${c.metodo} ${c.rota.replace(/[0-9a-f-]{36}/g, '<id>')} ${c.ms}ms${c.segundoPlano ? ' (2º plano)' : ''}`),
    captura: path.relative(RAIZ, captura),
    erros,
  };
}

async function cenaRanking1(navegador, sessao) {
  return [await umaVisitaRanking(navegador, sessao, { comCache: false }), await umaVisitaRanking(navegador, sessao, { comCache: true })];
}

// ─── Cena "rodada12a" (16-set): as provas dos itens 1 a 6 ─────────────────────
// Cada item tem um número que decide sozinho se passou, e uma captura ao lado
// para o Pedro confirmar a olho. Tudo com o service worker bloqueado e as
// escritas interceptadas — nada desta cena chega ao banco.

// Item 1 — o cromo do Início tem de entrar INTEIRO. O defeito era a moldura
// dourada a pintar sozinha, à espera de o avatar carregar. Isto amostra a área
// do cromo a cada 40 ms desde ANTES de o app montar; o número que conta é
// `molduraSolta`: amostras com a moldura no ecrã e nada dentro. Tem de ser 0.
function vigiarCromo() {
  const t0 = performance.now();
  const amostras = [];
  window.__futtyCromo = amostras;
  // VISÍVEL, não "existe no DOM". O código antigo já punha o <img> do avatar na
  // árvore desde o primeiro quadro, com opacity:0 até o onLoad o medir — medir a
  // presença dava "0 molduras soltas" também no build 21, que é exactamente o
  // defeito que esta rodada veio corrigir. Uma prova que não distingue o antes
  // do depois não prova nada (apanhado ao correr a etiqueta "antes").
  const visivel = (el) => {
    if (!el) return false;
    const cs = getComputedStyle(el);
    if (cs.opacity === '0' || cs.visibility === 'hidden' || cs.display === 'none') return false;
    const r = el.getBoundingClientRect();
    return r.width > 1 && r.height > 1;
  };
  const tique = () => {
    const moldura = document.querySelector('.cromo-previa');
    const avatar = document.querySelector('.cromo-previa__avatar');
    const silhueta = document.querySelector('.cromo-previa__silhueta');
    const temAvatar = visivel(avatar);
    const temSilhueta = visivel(silhueta);
    amostras.push({
      t: Math.round(performance.now() - t0),
      moldura: visivel(moldura),
      reserva: visivel(document.querySelector('.cromo-previa__reserva')),
      avatar: temAvatar,
      silhueta: temSilhueta,
      cromoFinal: visivel(document.querySelector('.fig-aura')),
      // O defeito: a moldura dourada no ecrã, e nada dentro dela.
      molduraSolta: visivel(moldura) && !temAvatar && !temSilhueta,
    });
    if (performance.now() - t0 < 6000) setTimeout(tique, 40);
  };
  tique();
}

async function provaCromo(navegador, sessao) {
  const contexto = await novoContexto(navegador, sessao, { amostrar: false });
  await travarEscritas(contexto);
  await contexto.addInitScript(vigiarCromo);
  const pagina = await contexto.newPage();
  const t0 = Date.now();
  await pagina.goto(`${BASE}/home`, { waitUntil: 'commit' });
  // As capturas que o item 1 pede: 100, 300 e 600 ms.
  const capturas = [];
  for (const ms of [100, 300, 600]) {
    const falta = ms - (Date.now() - t0);
    if (falta > 0) await espera(falta);
    const arquivo = arquivoCaptura(`cromo-${String(ms).padStart(4, '0')}ms`);
    await pagina.screenshot({ path: arquivo });
    capturas.push({ ms, real: Date.now() - t0, arquivo: path.relative(RAIZ, arquivo) });
  }
  // As três de cima contam do goto, e num arranque frio ainda apanham o F de
  // carregamento (a sessão e o perfil demoram mais do que 600 ms). Para se VER o
  // que esta rodada mudou, mais três ancoradas no instante em que a área do
  // cromo aparece: a primeira é o quadro em que ela nasce.
  await pagina.waitForSelector('.cromo-previa, .cromo-previa__reserva, .fig-aura', { timeout: 20000 }).catch(() => {});
  const t1 = Date.now();
  for (const ms of [0, 150, 400]) {
    const falta = ms - (Date.now() - t1);
    if (falta > 0) await espera(falta);
    const arquivo = arquivoCaptura(`cromo-apos-${String(ms).padStart(4, '0')}ms`);
    await pagina.screenshot({ path: arquivo });
    capturas.push({ ms, ancorada: true, real: Date.now() - t1, arquivo: path.relative(RAIZ, arquivo) });
  }
  await espera(Math.max(0, 6500 - (Date.now() - t0)));
  const amostras = await pagina.evaluate(() => window.__futtyCromo || []);
  await pagina.screenshot({ path: arquivoCaptura('cromo-final') });
  await contexto.close();

  const comMoldura = amostras.filter((a) => a.moldura);
  const soltas = amostras.filter((a) => a.molduraSolta);
  const primeira = (fn) => { const a = amostras.find(fn); return a ? a.t : null; };
  return {
    amostras: amostras.length,
    molduraSolta: soltas.length,
    msMolduraSolta: soltas.slice(0, 8).map((a) => a.t),
    primeiraReservaMs: primeira((a) => a.reserva),
    primeiraMolduraMs: primeira((a) => a.moldura),
    primeiroAvatarMs: primeira((a) => a.avatar),
    primeiraSilhuetaMs: primeira((a) => a.silhueta),
    primeiroCromoFinalMs: primeira((a) => a.cromoFinal),
    amostrasComMoldura: comMoldura.length,
    capturas,
  };
}

// Lê a animação COMPUTADA de um par wrapper/botão. Não basta a classe estar no
// DOM: uma regra por baixo, ou o prefers-reduced-motion, deixa-a sem efeito.
function medirPulso(seletor) {
  const botao = [...document.querySelectorAll('button')].find((b) => new RegExp(seletor, 'i').test((b.innerText || '').trim()));
  if (!botao) return null;
  const wrapper = botao.parentElement;
  const cs = getComputedStyle(botao);
  const cw = wrapper ? getComputedStyle(wrapper) : null;
  const r = botao.getBoundingClientRect();
  return {
    texto: botao.innerText.trim().slice(0, 30),
    classesBotao: botao.className,
    classesWrapper: wrapper?.className || null,
    animacaoBotao: cs.animationName,
    animacaoWrapper: cw?.animationName || null,
    pulsa: cs.animationName !== 'none' || (cw?.animationName || 'none') !== 'none',
    naTela: r.top >= 0 && r.bottom <= window.innerHeight && r.width > 0,
  };
}

// Itens 2, 3, 4 e 8 — a página do sorteio: o pulso do "Ver sorteio" na página do
// jogo, a barra de compartilhar e o slot 320×100 depois da cerimónia.
async function provaSorteio(navegador, sessao, jogo) {
  const contexto = await novoContexto(navegador, sessao, { amostrar: false });
  await travarEscritas(contexto);
  await contexto.addInitScript(`window.__medir = ${medirPulso.toString()}`);
  // A conta demo não tem campanha ativa e o AdCard não renderiza sem uma: serve-se
  // aqui a campanha de prévia, para o estado "slot preenchido" existir de facto.
  await contexto.route('**/api/ads?**', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ ad: { id: 'previa-12b', texto: 'Chuteira nova para o time inteiro', sub: 'Campanha de prévia da Rodada 12B', cta: 'Ver oferta', link: 'https://exemplo.invalid' } }),
  }));
  const pagina = await contexto.newPage();
  const erros = [];
  pagina.on('pageerror', (e) => erros.push(e.message));

  // ── Item 2: os botões da página do jogo ──
  await pagina.goto(`${BASE}/equipa/${TIME}/jogo/${jogo.id}`, { waitUntil: 'domcontentloaded' });
  await pagina.waitForSelector('main', { timeout: 30000 });
  await espera(2500);
  const botoesJogo = await pagina.evaluate(() => ({
    verSorteio: window.__medir('^ver sorteio$'),
    sortear: window.__medir('^sortear'),
  }));
  await pagina.screenshot({ path: arquivoCaptura('jogo-botoes') });

  // ── Itens 3, 4: a barra e o slot, antes e depois de a cerimónia acabar ──
  await pagina.goto(`${BASE}/equipa/${TIME}/jogo/${jogo.id}/sorteio`, { waitUntil: 'domcontentloaded' });
  await pagina.waitForSelector('.smaq', { timeout: 30000 });
  await espera(2500);
  const durante = await pagina.evaluate(() => ({
    barra: !!document.querySelector('.sorteio-barra'),
    anuncio: !!document.querySelector('[style*="aspect-ratio"]'),
    somVisivel: (() => { const b = document.querySelector('.somBtn'); if (!b) return null; const r = b.getBoundingClientRect(); return `${Math.round(r.width)}x${Math.round(r.height)}`; })(),
  }));
  await pagina.screenshot({ path: arquivoCaptura('sorteio-durante') });

  // "» concluir já" salta a animação; o fim é o mesmo (o finally da cerimónia).
  const saltar = pagina.locator('.saltar button');
  if (await saltar.count()) await saltar.click({ force: true }).catch(() => {});
  await pagina.waitForSelector('.sorteio-barra', { timeout: 25000 }).catch(() => {});
  await espera(1800);

  const depois = await pagina.evaluate(() => {
    const barra = document.querySelector('.sorteio-barra');
    const r = barra?.getBoundingClientRect();
    const botoes = barra ? [...barra.querySelectorAll('button')].map((b) => {
      const rb = b.getBoundingClientRect();
      return { texto: b.innerText.trim().slice(0, 24), naTela: rb.top >= 0 && rb.bottom <= window.innerHeight && rb.width > 0 };
    }) : [];
    // O slot IAB: a caixa com aspect-ratio 3.2 dentro do <main>. O WebKit
    // computa "3.2 / 1" e não "3.2" — comparar com a string crua não achava nada
    // e dava FALHA num slot que estava lá (apanhado na 1ª passagem desta cena).
    const slot = [...document.querySelectorAll('main div')].find((d) => /^3\.2(\s*\/\s*1)?$/.test(getComputedStyle(d).aspectRatio));
    const rs = slot?.getBoundingClientRect();
    const rotulo = slot?.parentElement?.firstElementChild;
    return {
      barra: !!barra,
      barraFixa: barra ? getComputedStyle(barra).position : null,
      // Presa à TELA: com a página rolada, o topo da barra tem de continuar a
      // bater com a altura da janela (é o teste da cena "fixos" da Rodada 9).
      barraCaixa: r ? { topo: Math.round(r.top), baixo: Math.round(r.bottom), altura: Math.round(r.height) } : null,
      barraNaTela: r ? r.bottom <= window.innerHeight + 1 && r.top >= 0 : null,
      botoes,
      slot: rs ? { largura: Math.round(rs.width), altura: Math.round(rs.height), proporcao: Number((rs.width / rs.height).toFixed(2)) } : null,
      rotuloSlot: rotulo?.innerText?.trim()?.slice(0, 20) || null,
      tela: { largura: window.innerWidth, altura: window.innerHeight },
    };
  });
  await pagina.screenshot({ path: arquivoCaptura('sorteio-barra-e-anuncio') });

  // A barra tem de continuar presa com a página rolada.
  await pagina.evaluate(() => window.scrollBy(0, 400));
  await espera(500);
  const rolado = await pagina.evaluate(() => {
    const r = document.querySelector('.sorteio-barra')?.getBoundingClientRect();
    return r ? { baixo: Math.round(r.bottom), altura: window.innerHeight, presa: Math.abs(r.bottom - window.innerHeight) <= 2 } : null;
  });
  await pagina.screenshot({ path: arquivoCaptura('sorteio-barra-rolada') });
  await contexto.close();
  return { botoesJogo, durante, depois, rolado, erros };
}

// Item 5 — o Ranking nunca mostra lista pela metade: as linhas que faltam ficam
// como esqueleto. O número que conta é `metade`: amostras em que o total de
// linhas desenhadas (reais + esqueletos) foi menor que o total do ranking.
function vigiarRanking() {
  const t0 = performance.now();
  const amostras = [];
  window.__futtyEsqueleto = amostras;
  const tique = () => {
    const reais = document.querySelectorAll('.rank-row').length;
    const esqueletos = document.querySelectorAll('.rank-row-esqueleto').length;
    if (reais || esqueletos) amostras.push({ t: Math.round(performance.now() - t0), reais, esqueletos, total: reais + esqueletos });
    if (performance.now() - t0 < 8000) setTimeout(tique, 40);
  };
  tique();
}

async function provaRanking(navegador, sessao) {
  const contexto = await novoContexto(navegador, sessao, { amostrar: false });
  await travarEscritas(contexto);
  await contexto.addInitScript(vigiarRanking);
  // O time demo tem 12 jogadores e o useListaProgressiva só divide a lista acima
  // de 15 — com 12, ela entra inteira à primeira e NUNCA há esqueleto nenhum
  // para medir (a 1ª passagem desta cena deu "0 esqueletos" e era isto, não um
  // defeito). A resposta é engordada aqui para 24 linhas, que é o tamanho em que
  // o defeito aparecia no iPhone do Pedro.
  let engordado = 0;
  await contexto.route('**/ranking', async (route) => {
    if (route.request().method() !== 'GET') return route.fallback();
    const resposta = await route.fetch();
    const json = await resposta.json().catch(() => null);
    const lista = json?.ranking;
    if (!Array.isArray(lista) || !lista.length) return route.fulfill({ response: resposta });
    const dobrado = [...lista, ...lista.map((p, i) => ({ ...p, user_id: `${p.user_id}-copia`, posicao: lista.length + i + 1 }))];
    engordado = dobrado.length;
    return route.fulfill({ response: resposta, json: { ...json, ranking: dobrado } });
  });
  const pagina = await contexto.newPage();
  await pagina.goto(`${BASE}/equipa/${TIME}/ranking`, { waitUntil: 'commit' });
  await pagina.waitForSelector('.rank-row, .rank-row-esqueleto', { timeout: 30000 });
  await pagina.screenshot({ path: arquivoCaptura('ranking-esqueleto-cedo') });
  // As alturas medem-se AGORA, com esqueletos ainda no ecrã: daqui a 8 s já são
  // todos linhas reais e não haveria com que comparar.
  const alturas = await pagina.evaluate(() => {
    const h = (el) => (el ? Math.round(el.getBoundingClientRect().height) : null);
    return {
      linhaReal: h(document.querySelector('.rank-row:not(.rank-row--hero)')),
      esqueleto: h(document.querySelector('.rank-row-esqueleto')),
    };
  });
  await espera(8200);
  const amostras = await pagina.evaluate(() => window.__futtyEsqueleto || []);
  await pagina.screenshot({ path: arquivoCaptura('ranking-completo') });
  await contexto.close();

  const finalTotal = amostras.length ? amostras[amostras.length - 1].total : 0;
  const comEsqueleto = amostras.filter((a) => a.esqueletos > 0);
  // "Pela metade": desenhou menos linhas do que a lista tem no fim.
  const metade = amostras.filter((a) => a.total < finalTotal);
  return {
    engordadoPara: engordado,
    amostras: amostras.length,
    totalFinal: finalTotal,
    amostrasComEsqueleto: comEsqueleto.length,
    maxEsqueletos: amostras.reduce((m, a) => Math.max(m, a.esqueletos), 0),
    listaPelaMetade: metade.length,
    msPelaMetade: metade.slice(0, 8).map((a) => `${a.t}ms:${a.total}/${finalTotal}`),
    primeirasAmostras: amostras.slice(0, 6),
    alturas,
  };
}

// Item 6 — a paleta do Vou / Não vou. Lê as cores COMPUTADAS (o que o olho vê),
// não as classes: é a única forma de provar que o verde e o vermelho saíram.
async function provaPresenca(navegador, sessao) {
  const contexto = await novoContexto(navegador, sessao, { amostrar: false });
  await travarEscritas(contexto);
  await contexto.addInitScript(`window.__medir = ${medirPulso.toString()}`);
  const pagina = await contexto.newPage();
  await pagina.goto(`${BASE}/home`, { waitUntil: 'domcontentloaded' });
  await pagina.waitForSelector('.games-label, .home-empty', { timeout: 30000 });
  await espera(3000);
  const presenca = await pagina.evaluate(() => {
    const ler = (el) => {
      if (!el) return null;
      const cs = getComputedStyle(el);
      return { texto: el.innerText.trim().slice(0, 12), cor: cs.color, fundo: cs.backgroundColor, borda: cs.borderColor, classes: el.className };
    };
    const rsvp = [...document.querySelectorAll('button')].filter((b) => /^(Vou|Não vou)$/.test((b.innerText || '').trim()));
    return {
      cardVou: ler(document.querySelector('.pbtn--go')),
      cardNao: ler(document.querySelector('.pbtn--no')),
      // O RSVPCard usa estilos em linha, não as classes .pbtn.
      rsvp: rsvp.filter((b) => !b.classList.contains('pbtn')).map(ler),
      verSorteio: window.__medir('^ver sorteio$'),
    };
  });
  const alvo = pagina.locator('.gcard__presence, .pbtn--go').first();
  if (await alvo.count()) await alvo.scrollIntoViewIfNeeded().catch(() => {});
  await espera(400);
  await pagina.screenshot({ path: arquivoCaptura('presenca-vou-nao-vou') });
  await contexto.close();
  return presenca;
}

async function cenaRodada12a(navegador, sessao) {
  const jogo = await acharJogoSorteado(navegador, sessao);
  const cromo = await provaCromo(navegador, sessao);
  const ranking = await provaRanking(navegador, sessao);
  const presenca = await provaPresenca(navegador, sessao);
  const sorteio = jogo ? await provaSorteio(navegador, sessao, jogo) : null;
  return { jogo, cromo, ranking, presenca, sorteio };
}

// ─── Cena "rodada12c" (16-set): publicidade nas 5 telas, vitrine e mudo ───────
// A campanha de prévia já está ligada de verdade no Gabinete (backend, 12B/12C),
// por isso aqui NÃO se serve anúncio nenhum por interceção: o que a cena mede é
// o que o app recebe da API real. As escritas continuam travadas.

/** Mede o slot de publicidade visível na tela (o AdCard, em qualquer variante). */
function medirAnuncio() {
  // A arte da campanha de prévia — é o que a pessoa vê, e mede o SLOT em si.
  // Medir pelo rótulo "Publicidade" media o wrapper: na variante 320×100 o
  // rótulo fica FORA da caixa, acima dela, e somava os seus 13 px à altura
  // (dava proporção 2.87 onde o slot é 3.2).
  const img = [...document.images].find((i) => (i.currentSrc || '').includes('/ads/'));
  if (!img) return null;
  const r = img.getBoundingClientRect();
  const rotulo = [...document.querySelectorAll('span, div')].some((el) => (el.textContent || '').trim().toLowerCase() === 'publicidade' && el.children.length === 0);
  return {
    largura: Math.round(r.width),
    altura: Math.round(r.height),
    proporcao: r.height ? Number((r.width / r.height).toFixed(2)) : null,
    naTela: r.top < window.innerHeight && r.bottom > 0 && r.width > 0,
    topo: Math.round(r.top),
    temRotulo: rotulo,
    src: img.currentSrc.replace(/^https?:\/\/[^/]+/, '').slice(0, 45),
  };
}

async function telaComAnuncio(navegador, sessao, { nome, rota, prepararFn = null }) {
  const contexto = await novoContexto(navegador, sessao, { amostrar: false });
  await travarEscritas(contexto);
  const pagina = await contexto.newPage();
  const erros = [];
  pagina.on('pageerror', (e) => erros.push(e.message));
  await pagina.goto(`${BASE}${rota}`, { waitUntil: 'domcontentloaded' });
  await pagina.waitForSelector('main, .smaq', { timeout: 30000 }).catch(() => {});
  if (prepararFn) await prepararFn(pagina).catch((e) => erros.push(`preparar: ${e.message}`));
  // Espera a ARTE da campanha entrar no DOM em vez de um tempo fixo: com 4,4 s
  // o Início ainda não a tinha (o anúncio vem dentro do /api/inicio) e a cena
  // dava "sem anúncio" numa tela que o tinha — apanhado na 1ª passagem.
  await pagina.waitForSelector('img[src*="/ads/"]', { timeout: 20000 }).catch(() => {});

  // Rola até o anúncio, se ele estiver abaixo da dobra (Figurinha e Ranking).
  const rolou = await pagina.evaluate(() => {
    const img = [...document.images].find((i) => (i.currentSrc || '').includes('/ads/'));
    if (!img) return false;
    img.scrollIntoView({ block: 'center' });
    return true;
  });
  await espera(900);
  const anuncio = await pagina.evaluate(medirAnuncio);
  const arquivo = arquivoCaptura(`ad-${nome}`);
  await pagina.screenshot({ path: arquivo });
  await contexto.close();
  return { nome, rota, anuncio, rolou, captura: path.relative(RAIZ, arquivo), erros };
}

/**
 * RODADA 14A — a linha do tempo do som da cerimônia.
 *
 * Ninguém ouve um teste automático, então a prova é outra: instrumenta o
 * `Audio.prototype.play` ANTES do app carregar e registra o que foi tocado,
 * quando e em que volume. Se o trem de tiques alterna as 3 variantes, se o clac
 * sai a cada jogador e se o jackpot sai uma vez só no fim, aparece aqui.
 */
async function cenaRodada14a(navegador, sessao) {
  const jogo = await acharJogoSorteado(navegador, sessao);
  if (!jogo) return { semJogo: true };

  const contexto = await novoContexto(navegador, sessao, { amostrar: false });
  await travarEscritas(contexto);
  await contexto.addInitScript(() => {
    // Quem só ABRE o resultado recebe a tela muda (lei do som) — para medir o
    // som é preciso ser alguém que escolheu ouvir neste aparelho.
    try { localStorage.setItem('futty_sorteio_som', '1'); } catch { /* ignore */ }
    const t0 = Date.now();
    window.__toques = [];
    const original = window.Audio.prototype.play;
    window.Audio.prototype.play = function instrumentado(...args) {
      try {
        window.__toques.push({
          som: String(this.src || '').split('/').pop(),
          vol: Math.round(this.volume * 100) / 100,
          t: Date.now() - t0,
        });
      } catch { /* ignore */ }
      return original.apply(this, args);
    };
  });

  const pagina = await contexto.newPage();
  await pagina.goto(`${BASE}/equipa/${TIME}/jogo/${jogo.id}/sorteio`, { waitUntil: 'domcontentloaded' });
  await pagina.waitForSelector('.smaq', { timeout: 30000 });
  // A cerimônia inteira: a barra do sorteio só aparece quando ela acaba.
  await pagina.waitForSelector('.sorteio-barra', { timeout: 90000 }).catch(() => {});
  await espera(1500);
  const toques = await pagina.evaluate(() => window.__toques || []);
  await contexto.close();

  const doTipo = (re) => toques.filter((x) => re.test(x.som));
  const tiques = doTipo(/^tique-/);
  const clacs = doTipo(/^clac/);
  const jackpots = doTipo(/^jackpot/);
  // Alternância: o trem tem de girar 1→2→3, nunca repetir a mesma variante em
  // seguida (era o que fazia soar máquina de escrever).
  let repetidos = 0;
  for (let i = 1; i < tiques.length; i += 1) if (tiques[i].som === tiques[i - 1].som) repetidos += 1;
  const espacos = tiques.slice(1).map((x, i) => x.t - tiques[i].t).filter((d) => d > 0 && d < 400);
  const medio = espacos.length ? Math.round(espacos.reduce((a, b) => a + b, 0) / espacos.length) : 0;

  return {
    jogo: jogo.id,
    total: toques.length,
    tiques: { n: tiques.length, variantes: [...new Set(tiques.map((x) => x.som))].sort(), repetidos, espacoMedio: medio, vol: tiques[0]?.vol ?? null },
    clacs: { n: clacs.length, vol: clacs[0]?.vol ?? null },
    jackpot: { n: jackpots.length, vol: jackpots[0]?.vol ?? null, t: jackpots[0]?.t ?? null },
    desconhecidos: [...new Set(toques.filter((x) => !/^(tique-|clac|jackpot)/.test(x.som)).map((x) => x.som))],
  };
}

/**
 * RODADA 14B — o fim do sorteio como prêmio, e UM caminho para compartilhar.
 *
 * Três passagens pela mesma página:
 *   A) quem SORTEOU (o euSorteei entra por history.state, exatamente como o
 *      Jogo.jsx o manda no navigate): 6 quadros a contar do instante do jackpot
 *      (a classe .premio entra no mesmo tick do jackpot.mp3) e o card com o
 *      botão que sobe aos 5,1 s;
 *   B) um sorteio 9x9 — o /api/games/:id é reescrito para 18 jogadores: o botão
 *      cai fora da tela e a pílula-guia tem de aparecer, rolar até ele e sumir;
 *   C) quem abre o resultado DEPOIS: o estado final, sem o pulso forte.
 */
function medirCompartilhar14b() {
  const btn = document.querySelector('.smaq .compartilhar__btn');
  const maq = document.querySelector('.smaq .maq');
  const base = {
    premio: !!maq?.classList.contains('premio'),
    calmo: !!maq?.classList.contains('premioCalmo'),
    barraFixa: !!document.querySelector('.sorteio-barra'),
    antigos: [...document.querySelectorAll('button')].filter((b) => /^(salvar|compartilhar|compartilhar times)$/i.test((b.innerText || '').trim())).length,
    molduras: document.querySelectorAll('.smaq .grupos .mmold').length,
  };
  if (!btn) return { ...base, achou: false };
  const r = btn.getBoundingClientRect(); const cs = getComputedStyle(btn); const wrap = btn.parentElement;
  return {
    ...base,
    achou: true,
    texto: btn.innerText.trim(),
    caixa: `${Math.round(r.width)}x${Math.round(r.height)}`,
    cor: cs.color, fundo: cs.backgroundColor, borda: cs.borderColor,
    pulsoForte: btn.classList.contains('pulse-active') && wrap.classList.contains('pulse-glow'),
    glow: wrap.classList.contains('cta-gold-glow'),
    visivel: r.top >= 0 && r.bottom <= window.innerHeight,
    topo: Math.round(r.top), fundoTela: window.innerHeight,
    timesLinha: [...document.querySelectorAll('.smaq .compartilhar__time')].map((b) => b.innerText.trim()),
  };
}
function medirPilula14b() {
  const p = document.querySelector('.smaqx-pilula');
  if (!p) return { achou: false };
  const b = p.querySelector('button') || p;
  const r = b.getBoundingClientRect(); const rp = p.getBoundingClientRect(); const cs = getComputedStyle(b);
  return {
    achou: true,
    texto: b.innerText.trim(),
    altura: Math.round(r.height),
    desvioDoCentro: Math.round((rp.left + rp.right) / 2 - window.innerWidth / 2),
    ateOFundo: Math.round(window.innerHeight - rp.bottom),
    cor: cs.color, fundo: cs.backgroundColor, borda: cs.borderColor,
  };
}

/**
 * Carimbos tirados DENTRO da página (vai por addInitScript): marca quando
 * .premio entra na máquina, quando vira .premioCalmo, quando o botão sobe e
 * quando o título e o flash existem. É o relógio que vale — o de fora anda
 * atrasado por cada captura.
 */
function carimbosR14b() {
  const m = (window.__r14b = {});
  const agora = () => Math.round(performance.now());
  new MutationObserver((lista) => {
    for (const mu of lista) {
      if (mu.type === 'childList') {
        for (const n of mu.addedNodes) if (n.nodeType === 1 && n.classList?.contains('smaqx-flash') && m.flash == null) m.flash = agora();
        continue;
      }
      const cl = mu.target.classList;
      if (cl.contains('maq')) {
        if (cl.contains('premio') && m.premio == null) m.premio = agora();
        if (cl.contains('premioCalmo') && m.calmo == null) m.calmo = agora();
      }
      if (cl.contains('compartilhar') && cl.contains('on') && m.botao == null) m.botao = agora();
      if (cl.contains('fimtxt') && cl.contains('on') && m.titulo == null) m.titulo = agora();
    }
  // `document`, não `documentElement`: o init script corre antes de haver <html>.
  }).observe(document, { subtree: true, childList: true, attributes: true, attributeFilter: ['class'] });
}

async function cenaRodada14b(navegador, sessao) {
  const jogo = await acharJogoSorteado(navegador, sessao);
  if (!jogo) return { semJogo: true };
  const ROTA = `/equipa/${TIME}/jogo/${jogo.id}/sorteio`;
  const erros = [];
  const saida = { jogo: jogo.id, erros };

  // ── A) quem sorteou: a sequência do prêmio e o card com o botão ──
  {
    const contexto = await novoContexto(navegador, sessao, { amostrar: false });
    await travarEscritas(contexto);
    // O React Router lê history.state.usr ao arrancar: semear aqui é o mesmo
    // que ter chegado pelo navigate(..., { state: { euSorteei: true } }).
    await contexto.addInitScript(() => {
      if (/\/sorteio$/.test(location.pathname)) history.replaceState({ usr: { euSorteei: true }, key: 'r14b', idx: 0 }, '');
    });
    await contexto.addInitScript(carimbosR14b);
    const pagina = await contexto.newPage();
    pagina.on('pageerror', (e) => erros.push(`A: ${e.message}`));
    await pagina.goto(`${BASE}${ROTA}`, { waitUntil: 'domcontentloaded' });
    await pagina.waitForSelector('.smaq .maq', { timeout: 30000 });
    await pagina.waitForSelector('.smaq .maq.premio', { timeout: 90000 });
    const t0 = Date.now();
    const noInstante = await pagina.evaluate(() => ({
      flash: !!document.querySelector('.smaqx-flash'),
      titulo: !!document.querySelector('.smaq .fimtxt.on'),
      veu: !!document.querySelector('.smaq .palcoStage.veuTotal'),
    }));
    const quadros = [];
    const alvos = [0, 250, 600, 1100, 1900, 3300];
    let meio = null;
    for (let i = 0; i < alvos.length; i += 1) {
      const falta = alvos[i] - (Date.now() - t0);
      if (falta > 0) await espera(falta);
      if (i === 2) {
        meio = await pagina.evaluate(() => {
          const raios = document.querySelector('.smaq .premioRaios'); const mq = document.querySelector('.smaq .mq');
          return {
            raiosOpacidade: raios ? getComputedStyle(raios).opacity : null,
            raiosAnimacao: raios ? getComputedStyle(raios).animationName : null,
            lampada: mq ? getComputedStyle(mq).animationName : null,
            moedas: !!document.querySelector('canvas'),
          };
        });
      }
      const ms = Date.now() - t0;
      const nome = `premio-${i + 1}-${String(ms).padStart(4, '0')}ms`;
      await pagina.screenshot({ path: arquivoCaptura(nome) });
      quadros.push({ ms, captura: `${ETIQUETA}-${nome}.png` });
    }
    await pagina.waitForSelector('.smaq .compartilhar.on', { timeout: 20000 }).catch(() => {});
    const botaoAosMs = Date.now() - t0;
    await espera(800);
    let botao = await pagina.evaluate(medirCompartilhar14b);
    await pagina.screenshot({ path: arquivoCaptura('card-botao') });
    let rolado = null;
    if (botao.achou && !botao.visivel) {
      await pagina.evaluate(() => document.querySelector('.smaq .compartilhar__btn')?.scrollIntoView({ block: 'center' }));
      await espera(700);
      botao = await pagina.evaluate(medirCompartilhar14b);
      await pagina.screenshot({ path: arquivoCaptura('card-botao-rolado') });
      rolado = `${ETIQUETA}-card-botao-rolado.png`;
    }
    const marcas = await pagina.evaluate(() => window.__r14b || {});
    await contexto.close();
    saida.premio = { noInstante, meio, quadros, botaoAosMs, marcas, botao, rolado };
  }

  // ── A2) o relógio limpo: a mesma cerimónia sem captura nenhuma. Cada quadro
  //    a 3x trava a página ~0,5-1 s e atrasa os temporizadores do prêmio; aqui
  //    só se lê o relógio da página — é o número que vale para "3,0 s" e "5,1 s".
  {
    const contexto = await novoContexto(navegador, sessao, { amostrar: false });
    await travarEscritas(contexto);
    await contexto.addInitScript(carimbosR14b);
    const pagina = await contexto.newPage();
    pagina.on('pageerror', (e) => erros.push(`A2: ${e.message}`));
    await pagina.goto(`${BASE}${ROTA}`, { waitUntil: 'domcontentloaded' });
    await pagina.waitForSelector('.smaq .maq', { timeout: 30000 });
    await pagina.waitForSelector('.smaq .compartilhar.on', { timeout: 90000 }).catch(() => {});
    saida.relogio = await pagina.evaluate(() => window.__r14b || {});
    await contexto.close();
  }

  // ── B) 9x9: o botão fora da tela e a pílula-guia ──
  // Em dois tamanhos: no 430×932 o bloco dos times de 18 jogadores ainda cabe
  // (o .gruposWrap rola por dentro a partir de 520 px) e o botão fica na tela —
  // a pílula NÃO deve aparecer; no 390×844 (iPhone 15/14/13, o tamanho mais
  // comum) o botão cai abaixo da dobra e a pílula tem de aparecer, rolar e sumir.
  const passagem9x9 = async (viewport, sufixo) => {
    const contexto = await novoContexto(navegador, sessao, { amostrar: false, viewport });
    await travarEscritas(contexto);
    await contexto.route('**/api/games/*', async (route) => {
      if (route.request().method() !== 'GET') return route.fallback();
      const resposta = await route.fetch();
      const json = await resposta.json().catch(() => null);
      const tr = json?.game?.times_resultado;
      if (!tr?.times?.length) return route.fulfill({ response: resposta });
      const base = tr.times.flatMap((t) => t.jogadores || []);
      const jog = (i) => {
        const j = base[i % base.length];
        return { ...j, id: `${j.id || 'j'}-${i}`, nome: i < base.length ? j.nome : `${j.nome} ${Math.floor(i / base.length) + 1}` };
      };
      const t1 = tr.times[1] || { ...tr.times[0], nome: 'Time B' };
      json.game.times_resultado = {
        ...tr,
        times: [
          { ...tr.times[0], jogadores: Array.from({ length: 9 }, (_, i) => jog(i)) },
          { ...t1, jogadores: Array.from({ length: 9 }, (_, i) => jog(9 + i)) },
        ],
        reservas: [],
      };
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(json) });
    });
    const pagina = await contexto.newPage();
    pagina.on('pageerror', (e) => erros.push(`B ${sufixo}: ${e.message}`));
    await pagina.goto(`${BASE}${ROTA}`, { waitUntil: 'domcontentloaded' });
    await pagina.waitForSelector('.smaq .maq', { timeout: 30000 });
    await pagina.waitForSelector('.smaq .compartilhar.on', { timeout: 150000 }).catch(() => {});
    await espera(1000);
    const antes = await pagina.evaluate(medirCompartilhar14b);
    const pilula = await pagina.evaluate(medirPilula14b);
    const captura = `9x9-${sufixo}-${pilula.achou ? 'pilula' : 'sem-pilula'}`;
    await pagina.screenshot({ path: arquivoCaptura(captura) });
    let depoisDoToque = null;
    if (pilula.achou) {
      await pagina.click('.smaqx-pilula button').catch((e) => erros.push(`B ${sufixo} toque: ${e.message}`));
      await espera(1100);
      depoisDoToque = { botao: await pagina.evaluate(medirCompartilhar14b), pilula: await pagina.evaluate(medirPilula14b) };
      await pagina.screenshot({ path: arquivoCaptura(`9x9-${sufixo}-rolou`) });
    }
    await contexto.close();
    return { tela: `${viewport.width}x${viewport.height}`, captura: `${ETIQUETA}-${captura}.png`, antes, pilula, depoisDoToque };
  };
  saida.nove = [
    await passagem9x9({ width: 430, height: 932 }, '430x932'),
    await passagem9x9({ width: 390, height: 844 }, '390x844'),
  ];

  // ── C) quem abre depois: o estado final ──
  {
    const contexto = await novoContexto(navegador, sessao, { amostrar: false });
    await travarEscritas(contexto);
    const pagina = await contexto.newPage();
    pagina.on('pageerror', (e) => erros.push(`C: ${e.message}`));
    await pagina.goto(`${BASE}${ROTA}`, { waitUntil: 'domcontentloaded' });
    await pagina.waitForSelector('.smaq .maq', { timeout: 30000 });
    await pagina.waitForSelector('.smaq .compartilhar.on', { timeout: 90000 }).catch(() => {});
    await espera(2500);
    const final = await pagina.evaluate(medirCompartilhar14b);
    const pilula = await pagina.evaluate(medirPilula14b);
    await pagina.screenshot({ path: arquivoCaptura('estado-final-depois') });
    await contexto.close();
    saida.depois = { final, pilula };
  }

  return saida;
}

/**
 * RODADA 16B — a luz do prêmio, segunda versão (17-set).
 * O dono reprovou no aparelho a chuva de moedas (canvas-confetti) e os raios
 * cônicos a girar atrás dos avatares. No lugar: 3 varreduras de brilho, pulsos
 * de glow nas bordas (retângulo + avatares) nos três ataques do jackpot e 10
 * pontos de brilho em cruz em posições fixas. Aqui:
 *   A) quem sorteou: 6 quadros a contar do instante do jackpot; a meio, a prova
 *      de que NADA gira no interior (nenhum elemento com rotação na matriz de
 *      transform nem animação de nome rotativo), nenhum <canvas> de moedas, e
 *      shine/glints/pulsos a correr; no fim, o estado calmo;
 *   B) quem abre depois: só o estado final (marquise suave, glow suave, botão
 *      com glow e sem pulso forte);
 *   C) movimento reduzido: flash + brilho suave, e mais nada a mexer.
 */
/** Carimbos do prêmio: quando .premio entrou e quando o WebKit pintou os frames seguintes. */
function carimbos16b() {
  const m = (window.__r16b = { frames: [] });
  const agora = () => Math.round(performance.now() * 10) / 10;
  new MutationObserver((lista) => {
    for (const mu of lista) {
      const cl = mu.target.classList;
      if (cl?.contains('maq') && cl.contains('premio') && m.premio == null) {
        m.premio = agora();
        const tique = () => requestAnimationFrame((ts) => { m.frames.push(Math.round(ts * 10) / 10); if (m.frames.length < 8) tique(); });
        tique();
      }
      if (cl?.contains('maq') && cl.contains('premioCalmo') && m.calmo == null) m.calmo = agora();
    }
  }).observe(document, { subtree: true, attributes: true, attributeFilter: ['class'] });
}
function medirLuz16b() {
  const q = (s) => document.querySelector(s);
  const qa = (s) => [...document.querySelectorAll(s)];
  const op = (el, pseudo) => (el ? Math.round(parseFloat(getComputedStyle(el, pseudo).opacity) * 100) / 100 : null);
  const an = (el, pseudo) => (el ? getComputedStyle(el, pseudo).animationName : null);
  const maq = q('.smaq .maq');
  // O relógio da própria luz: currentTime da animação do glow (0 = o 1º pulso).
  const animGlow = q('.smaq .premioGlow')?.getAnimations?.()[0];
  const relogioLuz = animGlow ? Math.round(animGlow.currentTime) : null;
  const c = window.__r16b || {};
  const carimbos = {
    desdeClasse: c.premio != null ? Math.round(performance.now() - c.premio) : null,
    primeiroFrame: c.frames?.[0] != null && c.premio != null ? Math.round(c.frames[0] - c.premio) : null,
    calmo: c.calmo != null && c.premio != null ? Math.round(c.calmo - c.premio) : null,
  };
  // "Nada gira dentro do retângulo": a varredura do shine é skewX (b = 0 na
  // matriz); qualquer rotação dá b ≠ 0. E nenhuma animação com nome rotativo.
  const girando = qa('.smaq .interior, .smaq .interior *').filter((el) => {
    const c = getComputedStyle(el);
    if (/gira|rot|spin/i.test(c.animationName)) return true;
    const m = c.transform.match(/^matrix\(([^)]+)\)/);
    return !!m && Math.abs(parseFloat(m[1].split(',')[1])) > 0.001;
  }).map((el) => String(el.getAttribute('class') || el.tagName).slice(0, 40));
  const glints = qa('.smaq .premioGlints i');
  const molds = qa('.smaq .grupos .mmold');
  const glow = q('.smaq .premioGlow');
  // A banda da varredura: onde está o centro dela (em % da largura do interior)
  // e se está DENTRO do retângulo neste instante — geometria, não captura.
  const ri = q('.smaq .interior')?.getBoundingClientRect();
  const banda = (el) => {
    const r = el.getBoundingClientRect();
    return {
      anim: an(el), op: op(el),
      centro: ri ? Math.round((((r.left + r.right) / 2 - ri.left) / ri.width) * 100) : null,
      dentro: !!ri && r.right > ri.left + 4 && r.left < ri.right - 4,
    };
  };
  return {
    premio: !!maq?.classList.contains('premio'),
    calmo: !!maq?.classList.contains('premioCalmo'),
    relogioLuz,
    carimbos,
    raios: !!q('.smaq .premioRaios'),
    canvas: !!q('canvas'),
    girando,
    shine: qa('.smaq .premioShine i').map(banda),
    glints: { n: glints.length, acesos: glints.filter((el) => op(el) > 0.05).length, anim: glints[0] ? an(glints[0]) : null },
    glow: { anim: an(glow), op: op(glow) },
    avatares: { n: molds.length, anim: molds[0] ? an(molds[0], '::after') : null, op: molds[0] ? op(molds[0], '::after') : null },
  };
}
async function cenaRodada16b(navegador, sessao) {
  const jogo = await acharJogoSorteado(navegador, sessao);
  if (!jogo) return { semJogo: true };
  const ROTA = `/equipa/${TIME}/jogo/${jogo.id}/sorteio`;
  const erros = [];
  const saida = { jogo: jogo.id, erros };

  // ── A) quem sorteou: 6 quadros do momento final, UM por cerimónia ──
  // Uma captura no WebKit trava a página 1-3 s (mesmo a 1x): seis capturas na
  // mesma cerimónia empurravam os últimos quadros para depois dos 3 s do prêmio.
  // Então cada quadro é uma cerimónia inteira (a seed repete a mesma) com uma
  // única captura no instante pedido, e as medidas de dentro da página vão
  // colhidas nesse mesmo instante, antes da captura. A última cerimónia segue
  // até ao fim para medir o estado calmo.
  //
  // O instante é do RELÓGIO DA LUZ (Animation.currentTime do pulso do glow),
  // não do relógio da classe: neste WebKit sem GPU cada frame com o véu
  // desfocado leva ~450 ms e o relógio da animação corre ~450 ms à frente do da
  // classe (o start time vem do frame anterior, já velho). No iPhone os dois
  // coincidem a um frame. O 1º quadro é o primeiro frame pintado depois de
  // .premio, seja lá que hora da luz for.
  const quadros = [];
  // Seis quadros a 1x (a sequência) e dois ampliados a 3x só da máquina (a meio
  // da 2ª varredura e durante a 3ª, com as cartas já reveladas). Os ampliados
  // pedem cerimónia própria: uma segunda captura na mesma cerimónia sairia
  // ~1,5 s atrasada. --quadros 1,4,7 corre só esses (iteração rápida).
  const TODOS = [{ luz: null }, { luz: 500 }, { luz: 950 }, { luz: 1500 }, { luz: 2200 }, { luz: 2750 }, { luz: 1300, zoom: true }, { luz: 2300, zoom: true }];
  const pedidos = opcao('quadros', '').split(',').map((s) => Number(s)).filter((n) => n >= 1 && n <= TODOS.length);
  const alvos = pedidos.length ? pedidos.map((n) => TODOS[n - 1]) : TODOS;
  let final = null; let botao = null; let marcas = null;
  for (let i = 0; i < alvos.length; i += 1) {
    const contexto = await novoContexto(navegador, sessao, { amostrar: false });
    await travarEscritas(contexto);
    await contexto.addInitScript(() => {
      if (/\/sorteio$/.test(location.pathname)) history.replaceState({ usr: { euSorteei: true }, key: 'r16b', idx: 0 }, '');
    });
    await contexto.addInitScript(carimbosR14b);
    await contexto.addInitScript(carimbos16b);
    const pagina = await contexto.newPage();
    pagina.on('pageerror', (e) => erros.push(`A${i + 1}: ${e.message}`));
    await pagina.goto(`${BASE}${ROTA}`, { waitUntil: 'domcontentloaded' });
    await pagina.waitForSelector('.smaq .maq', { timeout: 30000 });
    await pagina.waitForSelector('.smaq .maq.premio', { timeout: 90000 });
    const alvo = alvos[i];
    if (alvo.luz == null) {
      await pagina.evaluate(() => new Promise((r) => requestAnimationFrame(() => r())));
    } else {
      await pagina.waitForFunction((luzAlvo) => {
        const a = document.querySelector('.smaq .premioGlow')?.getAnimations?.()[0];
        return !!a && a.currentTime >= luzAlvo;
      }, alvo.luz, { polling: 40, timeout: 15000 }).catch(() => {});
    }
    const luz = await pagina.evaluate(medirLuz16b);
    const ms = luz.relogioLuz ?? 0;
    const k = TODOS.indexOf(alvo) + 1;
    const nome = alvo.zoom ? `premio-zoom-${k}-luz${String(ms).padStart(4, '0')}ms` : `premio-${k}-luz${String(ms).padStart(4, '0')}ms`;
    if (alvo.zoom) {
      const caixa = await pagina.evaluate(() => { const r = document.querySelector('.smaq .maq')?.getBoundingClientRect(); return r ? { x: r.left - 12, y: r.top - 12, width: r.width + 24, height: r.height + 24 } : null; });
      await pagina.screenshot({ path: arquivoCaptura(nome), ...(caixa ? { clip: caixa } : {}) });
    } else {
      await pagina.screenshot({ path: arquivoCaptura(nome), scale: 'css' });
    }
    quadros.push({ k, alvo: alvo.luz, zoom: !!alvo.zoom, ms, captura: `${ETIQUETA}-${nome}.png`, luz });
    if (i === alvos.length - 1) {
      await pagina.waitForSelector('.smaq .compartilhar.on', { timeout: 20000 }).catch(() => {});
      await espera(900);
      final = await pagina.evaluate(medirLuz16b);
      botao = await pagina.evaluate(medirCompartilhar14b);
      await pagina.screenshot({ path: arquivoCaptura('estado-final-quem-sorteou') });
      marcas = await pagina.evaluate(() => window.__r14b || {});
    }
    await contexto.close();
  }
  saida.premio = { quadros, final, botao, marcas };

  // ── B) quem abre depois: só o estado final ──
  {
    const contexto = await novoContexto(navegador, sessao, { amostrar: false });
    await travarEscritas(contexto);
    const pagina = await contexto.newPage();
    pagina.on('pageerror', (e) => erros.push(`B: ${e.message}`));
    await pagina.goto(`${BASE}${ROTA}`, { waitUntil: 'domcontentloaded' });
    await pagina.waitForSelector('.smaq .maq', { timeout: 30000 });
    await pagina.waitForSelector('.smaq .compartilhar.on', { timeout: 90000 }).catch(() => {});
    await espera(2500);
    const luz = await pagina.evaluate(medirLuz16b);
    const botao = await pagina.evaluate(medirCompartilhar14b);
    await pagina.screenshot({ path: arquivoCaptura('estado-final-depois') });
    await contexto.close();
    saida.depois = { luz, botao };
  }

  // ── C) movimento reduzido: flash + brilho suave, e nada mais ──
  {
    const contexto = await novoContexto(navegador, sessao, { amostrar: false, extra: { reducedMotion: 'reduce' } });
    await travarEscritas(contexto);
    const pagina = await contexto.newPage();
    pagina.on('pageerror', (e) => erros.push(`C: ${e.message}`));
    await pagina.goto(`${BASE}${ROTA}`, { waitUntil: 'domcontentloaded' });
    await pagina.waitForSelector('.smaq .maq', { timeout: 30000 });
    await pagina.waitForSelector('.smaq .compartilhar.on', { timeout: 30000 }).catch(() => {});
    await espera(1200);
    const luz = await pagina.evaluate(medirLuz16b);
    await pagina.screenshot({ path: arquivoCaptura('movimento-reduzido') });
    await contexto.close();
    saida.reduzido = luz;
  }

  return saida;
}

async function cenaRodada12c(navegador, sessao) {
  const jogo = await acharJogoSorteado(navegador, sessao);
  const telas = [];

  telas.push(await telaComAnuncio(navegador, sessao, { nome: 'inicio', rota: '/home' }));
  telas.push(await telaComAnuncio(navegador, sessao, { nome: 'resenha', rota: '/feed' }));
  telas.push(await telaComAnuncio(navegador, sessao, { nome: 'ranking', rota: `/equipa/${TIME}/ranking` }));
  telas.push(await telaComAnuncio(navegador, sessao, { nome: 'figurinha', rota: '/figurinha' }));
  if (jogo) {
    telas.push(await telaComAnuncio(navegador, sessao, {
      nome: 'sorteio',
      rota: `/equipa/${TIME}/jogo/${jogo.id}/sorteio`,
      // A cerimónia tem de ACABAR para o slot aparecer (Rodada 12A).
      prepararFn: async (pagina) => {
        const saltar = pagina.locator('.saltar button');
        if (await saltar.count()) await saltar.click({ force: true }).catch(() => {});
        await pagina.waitForSelector('.sorteio-barra', { timeout: 25000 }).catch(() => {});
        await espera(1500);
      },
    }));
  }

  // ── O botão de mudo durante a cerimónia (lei nova do som) ──
  let mudo = null;
  if (jogo) {
    const contexto = await novoContexto(navegador, sessao, { amostrar: false });
    await travarEscritas(contexto);
    const pagina = await contexto.newPage();
    await pagina.goto(`${BASE}/equipa/${TIME}/jogo/${jogo.id}/sorteio`, { waitUntil: 'domcontentloaded' });
    await pagina.waitForSelector('.smaq', { timeout: 30000 });
    await espera(2500); // a cerimónia está a correr: é ESTE o momento que a lei cobre
    mudo = await pagina.evaluate(() => {
      const b = document.querySelector('.somBtn');
      if (!b) return { achou: false };
      const r = b.getBoundingClientRect();
      const cs = getComputedStyle(b);
      return {
        achou: true,
        caixa: `${Math.round(r.width)}x${Math.round(r.height)}`,
        naTela: r.top >= 0 && r.left >= 0 && r.bottom <= window.innerHeight && r.right <= window.innerWidth,
        ligado: b.classList.contains('on'),
        titulo: b.getAttribute('title'),
        cor: cs.color,
        // Contraste contra o fundo próprio (o mudo tem de se LER durante a festa).
        fundo: cs.backgroundColor,
        rotulo: b.getAttribute('aria-label'),
      };
    });
    await pagina.screenshot({ path: arquivoCaptura('mudo-durante-cerimonia') });
    await contexto.close();
  }

  // ── O botão da vitrine no Perfil + o destino do cromo do Início ──
  const contexto = await novoContexto(navegador, sessao, { amostrar: false });
  await travarEscritas(contexto);
  const pagina = await contexto.newPage();
  await pagina.goto(`${BASE}/perfil`, { waitUntil: 'domcontentloaded' });
  await pagina.waitForSelector('main', { timeout: 30000 });
  await espera(3000);
  const vitrine = await pagina.evaluate(() => {
    const link = [...document.querySelectorAll('a')].find((a) => /vitrine/i.test(a.innerText || ''));
    if (!link) return { achou: false };
    const r = link.getBoundingClientRect();
    return {
      achou: true,
      texto: link.innerText.trim(),
      destino: link.getAttribute('href'),
      naTela: r.top >= 0 && r.bottom <= window.innerHeight && r.width > 0,
      caixa: `${Math.round(r.width)}x${Math.round(r.height)}`,
      dourado: getComputedStyle(link).borderColor,
    };
  });
  await pagina.screenshot({ path: arquivoCaptura('perfil-botao-vitrine') });

  // O cromo do Início tem de apontar para a mesma vitrine.
  await pagina.goto(`${BASE}/home`, { waitUntil: 'domcontentloaded' });
  await pagina.waitForSelector('.cromo-inicio', { timeout: 30000 }).catch(() => {});
  await espera(2500);
  const cromo = await pagina.evaluate(() => {
    const el = document.querySelector('.cromo-inicio');
    return el ? { destino: el.getAttribute('href'), rotulo: el.getAttribute('aria-label') } : { destino: null };
  });

  // E a vitrine em si: abre, mede o voltar e volta.
  let voltar = null;
  if (cromo.destino) {
    await pagina.locator('.cromo-inicio').click({ force: true }).catch(() => {});
    await espera(3000);
    const naVitrine = pagina.url().replace(BASE, '');
    await pagina.screenshot({ path: arquivoCaptura('vitrine-aberta') });
    const tipoBotao = await pagina.evaluate(() => {
      const b = document.querySelector('.topbar-back');
      return b ? b.tagName.toLowerCase() : null;
    });
    await pagina.locator('.topbar-back').click({ force: true }).catch(() => {});
    await espera(2000);
    voltar = { naVitrine, tipoBotao, voltouPara: pagina.url().replace(BASE, '') };
  }
  await contexto.close();

  return { jogo, telas, mudo, vitrine, cromo, voltar };
}

// ─── Cena "rodada13" (16-set): Vou verde, "Ver sorteio" com vida ─────────────
// Item 1 — a paleta de presença troca de novo: "Vou" perde o dourado e vira
// fantasma VERDE, gémeo do "Não vou" vermelho — nenhum dos dois pode sair
// dourado, que agora é só do "Ver sorteio"/"Sortear" (decisão do dono, build
// 22). Item 2 — "Ver sorteio" no card do Início ganha a receita cheia do
// .cta-gold: largura total do card, altura 46.
//
// Acha, na resposta REAL de /api/inicio, o primeiro jogo (em qualquer
// profundidade do payload — não se assume a forma exata) que passa no filtro,
// e aplica um patch nele: zera a presença (estado "nenhum" determinístico) ou
// força "sorteado" quando a conta demo não tiver nenhum jogo nesse estado.
// Sem isto a cena dependeria de sorte de dados. Nada disto grava no banco: é
// um patch na RESPOSTA que o browser recebe, e as escritas continuam travadas.
function acharEPatchear(json, filtro, patch) {
  let alvo = null;
  const visitar = (v) => {
    if (!v || typeof v !== 'object' || alvo) return;
    if (Array.isArray(v)) { for (const x of v) visitar(x); return; }
    if (!alvo && 'status' in v && 'user_status' in v && filtro(v)) { alvo = v.id; Object.assign(v, patch); return; }
    for (const k of Object.keys(v)) visitar(v[k]);
  };
  visitar(json);
  return alvo;
}

async function medirBotao(pagina, fonteRegex) {
  return pagina.evaluate((fonte) => {
    const re = new RegExp(fonte);
    const btn = [...document.querySelectorAll('button')].find((b) => re.test((b.innerText || '').trim()));
    if (!btn) return { achou: false };
    const cs = getComputedStyle(btn);
    const r = btn.getBoundingClientRect();
    const card = btn.closest('.gcard');
    const rc = card?.getBoundingClientRect();
    return {
      achou: true,
      texto: btn.innerText.trim(),
      cor: cs.color,
      fundo: cs.backgroundColor,
      borda: cs.borderColor,
      caixa: `${Math.round(r.width)}x${Math.round(r.height)}`,
      caixaCard: rc ? `${Math.round(rc.width)}x${Math.round(rc.height)}` : null,
    };
  }, fonteRegex);
}

async function cenaRodada13(navegador, sessao) {
  const erros = [];

  // ── Item 1: Vou / Não vou — nenhum, Vou, Não vou ──
  const contexto = await novoContexto(navegador, sessao, { amostrar: false });
  await travarEscritas(contexto);
  await contexto.route('**/api/inicio*', async (route) => {
    const resposta = await route.fetch();
    const json = await resposta.json().catch(() => null);
    if (!json) return route.fulfill({ response: resposta });
    acharEPatchear(json, (g) => g.status !== 'finished' && g.status !== 'drawn', { user_status: null });
    return route.fulfill({ response: resposta, json });
  });
  const pagina = await contexto.newPage();
  pagina.on('pageerror', (e) => erros.push(e.message));
  await pagina.goto(`${BASE}/home`, { waitUntil: 'domcontentloaded' });
  await pagina.waitForSelector('.games-label, .home-empty', { timeout: 30000 });
  await espera(3000);

  const presenca = {};
  const alvo = pagina.locator('.pbtn--go').first();
  if (await alvo.count()) {
    await alvo.scrollIntoViewIfNeeded().catch(() => {});
    await espera(300);
    presenca.nenhum = { go: await medirBotao(pagina, '^Vou$'), no: await medirBotao(pagina, '^Não vou$') };
    await pagina.screenshot({ path: arquivoCaptura('presenca-1-nenhum') });

    await pagina.locator('.pbtn--go').first().click({ force: true });
    await espera(500);
    presenca.vou = { go: await medirBotao(pagina, '^Vou$'), no: await medirBotao(pagina, '^Não vou$') };
    await pagina.screenshot({ path: arquivoCaptura('presenca-2-vou') });

    await pagina.locator('.pbtn--no').first().click({ force: true });
    await espera(500);
    presenca.naoVou = { go: await medirBotao(pagina, '^Vou$'), no: await medirBotao(pagina, '^Não vou$') };
    await pagina.screenshot({ path: arquivoCaptura('presenca-3-nao-vou') });
  } else {
    presenca.semCard = true;
  }
  await contexto.close();

  // ── Item 2: "Ver sorteio" no card do Início — dourado, largura total ──
  const contexto2 = await novoContexto(navegador, sessao, { amostrar: false });
  await travarEscritas(contexto2);
  await contexto2.route('**/api/inicio*', async (route) => {
    const resposta = await route.fetch();
    const json = await resposta.json().catch(() => null);
    if (!json) return route.fulfill({ response: resposta });
    acharEPatchear(json, () => true, { status: 'drawn' });
    return route.fulfill({ response: resposta, json });
  });
  const pagina2 = await contexto2.newPage();
  pagina2.on('pageerror', (e) => erros.push(e.message));
  await pagina2.goto(`${BASE}/home`, { waitUntil: 'domcontentloaded' });
  await pagina2.waitForSelector('.games-label, .home-empty', { timeout: 30000 });
  await espera(3000);
  const verSorteio = await medirBotao(pagina2, '^Ver sorteio$');
  const cardSorteado = pagina2.locator('.badge--sorteado').first();
  if (await cardSorteado.count()) await cardSorteado.scrollIntoViewIfNeeded().catch(() => {});
  await espera(300);
  await pagina2.screenshot({ path: arquivoCaptura('sorteado-ver-sorteio') });
  await contexto2.close();

  return { presenca, verSorteio, erros };
}

mkdirSync(PASTA, { recursive: true });
const navegador = await webkit.launch();
try {
  console.log(`[iphone] ${ETIQUETA} · ${BASE} · WebKit ${navegador.version()} · 430×932 @3x · cenas ${CENAS.join(',')}${LENTO ? ' · lento' : ''}`);
  const { sessao, camposLogin } = ARQUIVO_SESSAO
    ? { sessao: JSON.parse(readFileSync(ARQUIVO_SESSAO, 'utf8')), camposLogin: null }
    : await entrar(navegador);
  console.log(`[iphone] sessão ${ARQUIVO_SESSAO ? `de ${ARQUIVO_SESSAO}` : `de ${EMAIL}`} ok · time ${TIME}`);
  const saida = { etiqueta: ETIQUETA, base: BASE, webkit: navegador.version(), cenas: CENAS };

  if (CENAS.includes('arranque')) {
    const arranque = await arranqueFrio(navegador, sessao);
    saida.arranque = arranque;
    console.log(`[iphone] arranque frio em "/" → ${arranque.urlFinal}: ${arranque.noArranque.length} pedido(s) antes do /api/inicio voltar: ${arranque.noArranque.join(', ')}`);
    console.log(`         todos em 8 s: ${arranque.pedidos.map((p) => `${p.rota}@${p.inicioMs}`).join(', ')}`);
  }

  const telas = [];
  for (const [nome, rota] of [['ranking', `/equipa/${TIME}/ranking`], ['resenha', '/feed']]) {
    if (!CENAS.includes(nome)) continue;
    const tela = await abrirTela(navegador, sessao, nome, rota);
    telas.push(tela);
    const r = resumir(tela);
    console.log(`\n[iphone] ${nome} (${tela.urlFinal})`);
    console.log(`   largura máxima vista: ${r.piorLargura}px (aparelho ${LARGURA_APARELHO})${r.msLargos.length ? ` — mais larga que a tela em ${r.msLargos.join(', ')} ms` : ''}`);
    for (const c of r.culpados) console.log(`   passa da borda: ${c}`);
    console.log(`   avatares com foto: ${r.avatares}, sem preencher a moldura: ${r.avataresPequenos}`);
    for (const a of r.exemplosPequenos) console.log(`     moldura ${a.moldura} · img ${a.img} em ${a.desloc} · natural ${a.natural} · ${a.origem} · loading=${a.loading} · attrs ${a.atributos}`);
    for (const c of tela.capturas) console.log(`   captura ${c.ms} ms (real ${c.real}): ${c.arquivo}`);
    if (tela.erros.length) console.log(`   erros de JS: ${tela.erros.join(' | ')}`);
  }
  if (telas.length) saida.telas = telas;

  const pequenos = (lista) => (lista || []).filter((c) => c.fontePx < 16);
  if (CENAS.includes('campos')) {
    const c = await cenaCampos(navegador, sessao);
    saida.campos = { ...c, camposLogin };
    console.log(`\n[iphone] campos · viewport "${c.viewportMeta}"`);
    if (camposLogin) console.log(`   login: ${camposLogin.map((x) => `${x.campo} ${x.fontePx}px`).join(' | ')}`);
    console.log(`   compositor: ${c.camposCompositor.map((x) => `${x.campo} ${x.fontePx}px`).join(' | ')}`);
    console.log(`   comentário focado: ${c.depoisFoco.focado} · fonte ${c.depoisFoco.fontePx}px · escala ${c.escalaAntes} → ${c.depoisFoco.escala} · largura rolável ${c.depoisFoco.larguraRolavel}`);
    const abaixo = [...pequenos(camposLogin), ...pequenos(c.camposCompositor), ...pequenos(c.camposComentario)];
    console.log(`   campos abaixo de 16 px: ${abaixo.length ? abaixo.map((x) => `${x.campo} ${x.fontePx}px`).join(' | ') : 'nenhum'}`);
    console.log(`   captura: ${c.captura} · escritas interceptadas: ${c.escritas.length}`);
  }

  if (CENAS.includes('voto')) {
    const v = await cenaVoto(navegador, sessao);
    saida.voto = v;
    const g = v.geometria;
    console.log(`\n[iphone] voto · ${v.botoes} botões · tela ${g.tela.largura}x${g.tela.altura} rolada ${g.tela.rolagemY}px`);
    console.log(`   cartão em (${g.cartao.x}, ${g.cartao.y}) ${g.cartao.largura}x${g.cartao.altura} · inteiro na tela: ${g.naTela ? 'sim' : 'NÃO'} · desvio do centro vertical ${g.centradoY}px`);
    console.log(`   overlay dentro do [data-page]: ${g.overlayDentroDaPagina ? 'SIM' : 'não'} · filho direto do body: ${g.overlayFilhoDoBody ? 'sim' : 'não'} · estrelas ${g.estrelas ? `${g.estrelas.esquerda}–${g.estrelas.direita}px, cabem: ${g.estrelas.cabem ? 'sim' : 'NÃO'}` : '—'}`);
    console.log(`   captura: ${v.captura} · escritas interceptadas: ${v.escritas.length}`);
  }

  if (CENAS.includes('aviso')) {
    const a = await cenaAviso(navegador, sessao);
    saida.aviso = a;
    console.log('\n[iphone] aviso de ausência');
    for (const p of a.passos) console.log(`   ${p.passo}: botões [${p.bloco.botoes?.join(' · ')}]${p.dialogo ? ` · diálogo "${p.dialogo}"` : ''} → ${p.captura}`);
    console.log(`   com RSVP aberto: card ${a.comRsvp.rsvpCard ? 'sim' : 'não'} · botões [${a.comRsvp.botoes?.join(' · ')}] → ${a.comRsvp.captura}`);
    console.log(`   escritas interceptadas: ${a.escritas.map((e) => `${e.metodo} ${e.rota} ${e.corpo || ''}`).join(' | ') || 'nenhuma'}`);
  }

  if (CENAS.includes('resenha2')) {
    const varreduras = [];
    for (const [rotulo, largura, altura] of [['430', 430, 932], ['se', 375, 667]]) {
      const v = await cenaResenha(navegador, sessao, { largura, altura, rotulo });
      varreduras.push(v);
      console.log(`\n[iphone] varredura da Resenha · ${v.tela}`);
      console.log(`   feed moldado ${v.feedMoldado}x (posts sintéticos: retrato, paisagem, texto longo, vídeo, anúncio oficial)`);
      console.log('   estado                     rolável  escala  passa da borda / imagem sem travão');
      for (const e of v.estados) {
        const largo = e.larguraRolavel > largura + 1 || (e.escala != null && e.escala < 0.99);
        const culpa = e.passamDaBorda.length
          ? `${e.passamDaBorda[0].caminho} (direita ${e.passamDaBorda[0].direita}px)`
          : e.imagens.length ? `${e.imagens.length} img sem travão: ${e.imagens[0].caminho.split(' > ').pop()} ${e.imagens[0].caixa} (${e.imagens[0].motivo || 'passa da borda'})` : '—';
        console.log(`   ${e.estado.padEnd(26)} ${String(e.larguraRolavel).padEnd(8)} ${String(e.escala).padEnd(7)} ${largo ? 'LARGO ' : ''}${culpa}`);
        if (e.vigia) console.log(`       vigia durante a escolha da foto: máx rolável ${e.vigia.maxRolavel}px · máx viewport ${e.vigia.maxViewport}px · menor escala ${e.vigia.minEscala} · ${e.vigia.amostras} amostras${e.vigia.pior ? ` · pior: ${e.vigia.pior}` : ''}`);
        if (e.crop) console.log(`       crop: cartão ${e.crop.cartao} · cabe na tela ${e.crop.cabeNaTela ? 'sim' : 'NÃO'} · chips ${e.crop.chips?.esquerda}–${e.crop.chips?.direita} cabem ${e.crop.chipsCabem ? 'sim' : 'NÃO'} · rodapé ${e.crop.rodapeAbaixoDaDobra}px da dobra`);
        if (e.teclado) console.log(`       teclado: altura ${e.teclado.altura} · compositor ${e.teclado.compositor} visível ${e.teclado.compositorVisivel ? 'sim' : 'NÃO'} · barra ${e.teclado.barra} visível ${e.teclado.barraVisivel ? 'sim' : 'NÃO'}`);
      }
      if (v.erros.length) console.log(`   erros de JS: ${v.erros.join(' | ')}`);
    }
    saida.resenha2 = varreduras;
  }

  if (CENAS.includes('fixos')) {
    const f = await cenaFixos(navegador, sessao);
    saida.fixos = f;
    console.log(`\n[iphone] fixos · jogo ${f.jogo ? `${f.jogo.id} (sorteado: ${f.jogo.sorteioRealizado ? 'sim' : 'não'})` : 'nenhum encontrado'}`);
    for (const t of f.telas) {
      console.log(`   ${t.nome} (${t.rota}) · rolou ${t.rolou}px · ${t.fixos.length} fixo(s), ${t.soltos.length} solto(s)${t.nota ? ` · ${t.nota}` : ''}`);
      for (const s of t.soltos) {
        console.log(`     SOLTO ${s.caminho} em (${s.esquerda}, ${s.topo}) ${s.largura}x${s.altura} → desviou ${s.desvio.topo}px ao rolar`);
        console.log(`       culpado: ${s.culpado ? `${s.culpado.elemento} [${s.culpado.motivos.join('; ')}]` : 'não identificado'}`);
      }
      console.log(`     capturas: ${t.capturas.join(' · ')}${t.erros.length ? ` · erros: ${t.erros.join(' | ')}` : ''}`);
    }
  }

  if (CENAS.includes('ranking1')) {
    const visitas = await cenaRanking1(navegador, sessao);
    saida.ranking1 = visitas;
    for (const v of visitas) {
      const d = v.diagnostico;
      console.log(`\n[iphone] 1ª visita ao Ranking ${v.comCache ? 'COM cache velho' : 'SEM cache'}${v.lento ? ' (lento)' : ''}`);
      console.log(`   Diagnóstico do app: pintura ${d?.msPintura} ms · dados ${d?.msDados} ms · esperou [${(d?.esperou || []).join(', ')}]${d?.marcas ? ` · marcas ${JSON.stringify(d.marcas)}` : ''}`);
      console.log(`   pedido do ranking depois do toque: ${v.pedidoRankingMs == null ? 'nenhum' : `saiu em ${v.pedidoRankingMs} ms`}`);
      if (v.deFora) console.log(`   de fora (desde o toque): 1ª linha ${v.deFora.primeiraLinhaMs} ms · 1ª imagem ${v.deFora.primeiraImagemMs} ms · maior quadro ${v.deFora.maiorQuadro.ms} ms em ${v.deFora.maiorQuadro.emMs} ms`);
      if (v.deFora?.quadrosLongos?.length) console.log(`   quadros > 60 ms: ${v.deFora.quadrosLongos.map((q) => `${q.ms}@${q.emMs}`).join(', ')}`);
      console.log(`   chamadas: ${v.chamadas.join(' | ')}`);
      console.log(`   captura: ${v.captura}${v.erros.length ? ` · erros de JS: ${v.erros.join(' | ')}` : ''}`);
    }
  }

  if (CENAS.includes('rodada12a')) {
    const r = await cenaRodada12a(navegador, sessao);
    saida.rodada12a = r;
    const ok = (bom) => (bom ? 'OK' : 'FALHA');

    const c = r.cromo;
    console.log('\n[iphone] RODADA 12A · item 1 — cromo do Início inteiro num quadro');
    console.log(`   ${ok(c.molduraSolta === 0)} · moldura sem avatar nem silhueta: ${c.molduraSolta} de ${c.amostras} amostras${c.msMolduraSolta.length ? ` (aos ${c.msMolduraSolta.join(', ')} ms)` : ''}`);
    console.log(`   reserva aos ${c.primeiraReservaMs} ms · moldura aos ${c.primeiraMolduraMs} ms · avatar aos ${c.primeiroAvatarMs} ms · silhueta aos ${c.primeiraSilhuetaMs ?? '—'} ms · cromo final aos ${c.primeiroCromoFinalMs ?? '—'} ms`);
    for (const cap of c.capturas) console.log(`   captura ${cap.ancorada ? `${cap.ms} ms depois de o cromo aparecer` : `${cap.ms} ms do goto`} (real ${cap.real}): ${cap.arquivo}`);

    const k = r.ranking;
    console.log('\n[iphone] RODADA 12A · item 5 — Ranking sem buracos');
    const alturaBate = k.alturas.esqueleto != null && k.alturas.esqueleto === k.alturas.linhaReal;
    console.log(`   ${ok(k.listaPelaMetade === 0 && k.maxEsqueletos > 0)} · amostras com a lista pela metade: ${k.listaPelaMetade}${k.msPelaMetade.length ? ` (${k.msPelaMetade.join(', ')})` : ''}`);
    console.log(`   lista engordada para ${k.engordadoPara} · total final ${k.totalFinal} linhas · esqueletos vistos: até ${k.maxEsqueletos}, em ${k.amostrasComEsqueleto} amostras`);
    console.log(`   ${ok(alturaBate)} · altura: esqueleto ${k.alturas.esqueleto}px vs linha real ${k.alturas.linhaReal}px (têm de ser iguais, ou a lista salta)`);
    console.log(`   primeiras amostras: ${k.primeirasAmostras.map((a) => `${a.t}ms ${a.reais}+${a.esqueletos}`).join(' · ')}`);

    const p = r.presenca;
    console.log('\n[iphone] RODADA 12A · item 6 — paleta do Vou / Não vou (cores computadas)');
    for (const [rotulo, b] of [['card Vou', p.cardVou], ['card Não vou', p.cardNao], ...(p.rsvp || []).map((x, i) => [`rsvp ${i + 1}`, x])]) {
      if (b) console.log(`   ${rotulo.padEnd(13)} "${b.texto}" · cor ${b.cor} · fundo ${b.fundo} · borda ${b.borda}`);
    }
    console.log(`   "Ver sorteio" no Início: ${p.verSorteio ? `${ok(p.verSorteio.pulsa)} pulsa (botão ${p.verSorteio.animacaoBotao}, wrapper ${p.verSorteio.animacaoWrapper})` : 'não está nesta tela'}`);

    if (r.sorteio) {
      const s = r.sorteio;
      console.log('\n[iphone] RODADA 12A · item 2 — botões do jogo');
      // Com o jogo JÁ sorteado, o "Sortear novamente" tem de estar calado: o
      // destaque é do "Ver sorteio", e dois pulsos lado a lado não destacam
      // nenhum. O esperado depende do estado, não é sempre "pulsa".
      const jaSorteado = !!r.jogo?.sorteioRealizado;
      for (const [nome, b] of Object.entries(s.botoesJogo)) {
        if (!b) { console.log(`   ${nome.padEnd(11)} não está nesta tela`); continue; }
        const devePulsar = nome === 'verSorteio' ? true : !jaSorteado;
        console.log(`   ${nome.padEnd(11)} ${ok(b.pulsa === devePulsar)} "${b.texto}" · pulsa ${b.pulsa} (esperado ${devePulsar}${nome === 'sortear' && jaSorteado ? ', jogo já sorteado' : ''}) · botão ${b.animacaoBotao} · wrapper ${b.animacaoWrapper}`);
      }
      console.log('\n[iphone] RODADA 12A · itens 3, 4 e 8 — barra, anúncio e mudo');
      console.log(`   durante a cerimônia: barra ${s.durante.barra ? 'PRESENTE (devia estar ausente)' : 'ausente, OK'} · botão de mudo ${s.durante.somVisivel}`);
      console.log(`   ${ok(s.depois.barra && s.depois.barraNaTela)} · barra depois: ${s.depois.barraFixa} · caixa ${JSON.stringify(s.depois.barraCaixa)} · tela ${s.depois.tela.altura}px`);
      console.log(`   botões da barra: ${s.depois.botoes.map((b) => `"${b.texto}" ${b.naTela ? 'na tela' : 'FORA'}`).join(' · ') || 'nenhum'}`);
      console.log(`   ${ok(!!s.depois.slot)} · slot IAB: ${s.depois.slot ? `${s.depois.slot.largura}x${s.depois.slot.altura}px · proporção ${s.depois.slot.proporcao} (320x100 = 3.2)` : 'não renderizou'} · rótulo "${s.depois.rotuloSlot}"`);
      console.log(`   ${ok(s.rolado?.presa)} · com a página rolada, a barra continua presa: ${JSON.stringify(s.rolado)}`);
      if (s.erros.length) console.log(`   erros de JS: ${s.erros.join(' | ')}`);
    } else {
      console.log('\n[iphone] RODADA 12A · itens 2, 3, 4: sem jogo sorteado nesta conta — não medidos.');
    }
  }

  if (CENAS.includes('rodada12c')) {
    const r = await cenaRodada12c(navegador, sessao);
    saida.rodada12c = r;
    const ok = (bom) => (bom ? 'OK' : 'FALHA');

    console.log('\n[iphone] RODADA 12C · publicidade nas 5 telas (campanha real do Gabinete, sem interceção)');
    for (const t of r.telas) {
      const a = t.anuncio;
      console.log(`   ${t.nome.padEnd(10)} ${ok(!!a && a.naTela)} ${a ? `${a.largura}x${a.altura}px · proporção ${a.proporcao} · rótulo ${a.temRotulo ? 'sim' : 'NÃO'} · na tela ${a.naTela}` : 'sem anúncio na tela'}`);
      console.log(`   ${' '.repeat(10)} ${t.captura}${t.erros.length ? ` · erros: ${t.erros.join(' | ')}` : ''}`);
    }

    console.log('\n[iphone] RODADA 12C · botão de mudo durante a cerimônia (lei nova do som)');
    if (r.mudo?.achou) {
      console.log(`   ${ok(r.mudo.naTela)} caixa ${r.mudo.caixa} · na tela ${r.mudo.naTela} · ligado ${r.mudo.ligado} · "${r.mudo.titulo}"`);
      console.log(`   cor ${r.mudo.cor} sobre ${r.mudo.fundo} · aria-label "${r.mudo.rotulo}"`);
    } else {
      console.log('   FALHA · não achei o botão de som na cerimônia');
    }

    console.log('\n[iphone] RODADA 12C · vitrine do jogador');
    console.log(`   ${ok(r.vitrine.achou)} botão no Perfil: ${r.vitrine.achou ? `"${r.vitrine.texto}" → ${r.vitrine.destino} · ${r.vitrine.caixa} · borda ${r.vitrine.dourado}` : 'não achei'}`);
    console.log(`   ${ok(/\/jogador\//.test(r.cromo.destino || ''))} cromo do Início → ${r.cromo.destino} ("${r.cromo.rotulo}")`);
    if (r.voltar) {
      const voltouBem = r.voltar.voltouPara === '/home';
      console.log(`   ${ok(voltouBem)} voltar: abriu ${r.voltar.naVitrine} (botão <${r.voltar.tipoBotao}>) → voltou para ${r.voltar.voltouPara} (esperado /home, de onde se veio)`);
    }
  }

  if (CENAS.includes('rodada13')) {
    const r = await cenaRodada13(navegador, sessao);
    saida.rodada13 = r;
    const ok = (bom) => (bom ? 'OK' : 'FALHA');
    // As cores computadas do dourado antigo (--presenca-sim* de antes da
    // Rodada 13): borda/fundo #d4a017, texto #f0c94a, fundo escuro rgba(30,24,8).
    const DOURADO = /rgba?\(\s*212,\s*160,\s*23|rgba?\(\s*240,\s*201,\s*74|rgba?\(\s*30,\s*24,\s*8/;
    const semDourado = (b) => b?.achou && !DOURADO.test(b.cor) && !DOURADO.test(b.fundo) && !DOURADO.test(b.borda);

    console.log('\n[iphone] RODADA 13 · item 1 — "Vou" vira fantasma verde (nenhum / Vou / Não vou)');
    if (r.presenca.semCard) {
      console.log('   sem jogo com RSVP nesta conta — não medido.');
    } else {
      for (const [estado, p] of Object.entries(r.presenca)) {
        for (const [rotulo, b] of [['Vou', p.go], ['Não vou', p.no]]) {
          if (!b?.achou) { console.log(`   ${estado.padEnd(8)} ${rotulo.padEnd(8)} não achei o botão`); continue; }
          console.log(`   ${estado.padEnd(8)} ${ok(semDourado(b))} ${rotulo.padEnd(8)} cor ${b.cor} · fundo ${b.fundo} · borda ${b.borda}`);
        }
      }
    }

    console.log('\n[iphone] RODADA 13 · item 2 — "Ver sorteio" no card do Início (dourado, largura total)');
    const v = r.verSorteio;
    if (!v?.achou) {
      console.log('   sem jogo sorteado nesta conta — não medido.');
    } else {
      console.log(`   "${v.texto}" · botão ${v.caixa} (altura esperada 46px) · card ${v.caixaCard}`);
      console.log(`   cor ${v.cor} · fundo ${v.fundo} · borda ${v.borda}`);
    }
    if (r.erros.length) console.log(`   erros de JS: ${r.erros.join(' | ')}`);
  }

  if (CENAS.includes('rodada14a')) {
    const r = await cenaRodada14a(navegador, sessao);
    saida.rodada14a = r;
    const ok = (bom) => (bom ? 'OK' : 'FALHA');
    console.log('\n[iphone] RODADA 14A · som do sorteio (Audio.play instrumentado)');
    if (r.semJogo) {
      console.log('   sem jogo sorteado nesta conta — não medido.');
    } else {
      const t = r.tiques;
      console.log(`   ${ok(t.n > 0 && t.variantes.length === 3 && t.repetidos === 0)} tique: ${t.n} toques · variantes ${t.variantes.join(' ')} · repetidos em seguida ${t.repetidos} · ~${t.espacoMedio} ms entre tiques · vol ${t.vol}`);
      console.log(`   ${ok(r.clacs.n > 0)} clac: ${r.clacs.n} toques (um por jogador revelado) · vol ${r.clacs.vol}`);
      console.log(`   ${ok(r.jackpot.n === 1)} jackpot: ${r.jackpot.n} toque(s) · vol ${r.jackpot.vol} · aos ${r.jackpot.t} ms`);
      if (r.desconhecidos.length) console.log(`   FALHA · som fora do kit: ${r.desconhecidos.join(', ')}`);
    }
  }

  if (CENAS.includes('rodada14b')) {
    const r = await cenaRodada14b(navegador, sessao);
    saida.rodada14b = r;
    const ok = (bom) => (bom ? 'OK' : 'FALHA');
    console.log('\n[iphone] RODADA 14B · o fim do sorteio como prêmio');
    if (r.semJogo) {
      console.log('   sem jogo sorteado nesta conta — não medido.');
    } else {
      const p = r.premio;
      console.log(`   no instante do jackpot: flash ${p.noInstante.flash ? 'na tela' : 'já passou'} · título ${ok(p.noInstante.titulo)} · véu ${ok(p.noInstante.veu)}`);
      if (p.meio) console.log(`   a meio: raios opacidade ${p.meio.raiosOpacidade} (${p.meio.raiosAnimacao}) · lâmpada ${p.meio.lampada} · moedas ${ok(p.meio.moedas)}`);
      console.log(`   quadros (relógio da captura, ~1 s por quadro a 3x): ${p.quadros.map((q) => `${q.ms} ms`).join(' · ')}`);
      const mk = p.marcas || {};
      const dt = (k) => (mk[k] != null && mk.premio != null ? `${((mk[k] - mk.premio) / 1000).toFixed(2)} s` : '—');
      console.log(`   relógio da página durante as capturas (cada quadro trava a página): flash ${dt('flash')} · título ${dt('titulo')} · brilho suave ${dt('calmo')} · botão ${dt('botao')}`);
      const rl = r.relogio || {};
      const dl = (k) => (rl[k] != null && rl.premio != null ? (rl[k] - rl.premio) / 1000 : null);
      const perto = (v, alvo) => v != null && Math.abs(v - alvo) <= 0.15;
      const s = (v) => (v == null ? '—' : `${v.toFixed(2)} s`);
      console.log(`   ${ok(perto(dl('calmo'), 3.0) && perto(dl('botao'), 5.1))} relógio limpo (sem capturas), a contar do jackpot: flash ${s(dl('flash'))} · título ${s(dl('titulo'))} · brilho suave ${s(dl('calmo'))} (esperado 3,00) · botão ${s(dl('botao'))} (esperado 5,10)`);
      const b = p.botao;
      console.log(`   ${ok(b.achou && b.caixa.endsWith('x46') && b.pulsoForte && b.glow)} botão de quem sorteou: "${b.texto}" ${b.caixa} · pulso forte ${b.pulsoForte ? 'sim' : 'não'} · glow ${b.glow ? 'sim' : 'não'} · ${b.visivel ? 'na tela' : `fora da tela (topo ${b.topo}/${b.fundoTela})`}${p.rolado ? ' · rolado em ' + p.rolado : ''}`);
      console.log(`   cor ${b.cor} · fundo ${b.fundo} · borda ${b.borda} · linha dos times: ${b.timesLinha.join(' | ')}`);
      console.log(`   ${ok(!b.barraFixa && b.antigos === 0)} sem barra fixa (${b.barraFixa ? 'ainda existe' : 'saiu'}) · botões antigos Salvar/Compartilhar: ${b.antigos} · marquise ${b.calmo ? 'em brilho suave' : b.premio ? 'ainda em sequência' : 'sem prêmio'}`);

      for (const n of r.nove) {
        console.log(`   9x9 @ ${n.tela}: ${n.antes.molduras} molduras · botão ${n.antes.visivel ? `na tela (topo ${n.antes.topo}/${n.antes.fundoTela})` : `FORA da tela (topo ${n.antes.topo}/${n.antes.fundoTela})`} · ${n.captura}`);
        if (n.pilula.achou) {
          const pi = n.pilula;
          console.log(`      ${ok(!n.antes.visivel && pi.altura === 44 && Math.abs(pi.desvioDoCentro) <= 2)} pílula: "${pi.texto}" · ${pi.altura}px · desvio do centro ${pi.desvioDoCentro}px · ${pi.ateOFundo}px até o fundo · cor ${pi.cor} · borda ${pi.borda}`);
          const d = n.depoisDoToque;
          console.log(`      ${ok(d && d.botao.visivel && !d.pilula.achou)} tocou: botão ${d?.botao.visivel ? 'entrou na tela' : 'continua fora'} · pílula ${d?.pilula.achou ? 'ainda aí' : 'sumiu'}`);
        } else {
          console.log(`      ${ok(n.antes.visivel)} sem pílula ${n.antes.visivel ? '(o botão já estava na tela — certo)' : '(e o botão está fora da tela — ERRADO)'}`);
        }
      }

      const dp = r.depois;
      console.log(`   ${ok(dp.final.calmo && !dp.final.pulsoForte && dp.final.glow)} quem abre depois: marquise ${dp.final.calmo ? 'em brilho suave' : 'SEM brilho suave'} · pulso forte ${dp.final.pulsoForte ? 'SIM (errado)' : 'não'} · glow ${dp.final.glow ? 'sim' : 'não'} · pílula ${dp.pilula.achou ? 'na tela' : 'não'} (botão ${dp.final.visivel ? 'na tela' : 'fora'})`);
      if (r.erros.length) console.log(`   erros de JS: ${r.erros.join(' | ')}`);
    }
  }

  if (CENAS.includes('rodada16b')) {
    const r = await cenaRodada16b(navegador, sessao);
    saida.rodada16b = r;
    const ok = (bom) => (bom ? 'OK' : 'FALHA');
    console.log('\n[iphone] RODADA 16B · a luz do prêmio, segunda versão');
    if (r.semJogo) {
      console.log('   sem jogo sorteado nesta conta — não medido.');
    } else {
      const p = r.premio; const f = p.final;
      const nomes = (l) => l.shine.map((s) => s.anim).join('/');
      // Os reprovados têm de estar fora em TODOS os quadros — o pior deles manda.
      const pior = p.quadros.map((q) => q.luz).reduce((a, b) => (b.raios || b.canvas || b.girando.length ? b : a), p.quadros[0].luz);
      console.log(`   ${ok(!pior.raios && !pior.canvas && pior.girando.length === 0)} reprovados fora (nos 6 quadros): raios ${pior.raios ? 'AINDA NO DOM' : 'não existem'} · canvas de moedas ${pior.canvas ? 'AINDA APARECE' : 'não aparece'} · elementos a girar no interior: ${pior.girando.length}${pior.girando.length ? ` (${pior.girando.join(', ')})` : ''}`);
      // Durante o prêmio (quadros antes dos 3 s), as três luzes têm de estar a correr.
      const aCorrer = (l) => l.premio && l.shine.length === 3 && l.shine.every((s) => s.anim === 'premioShine')
        && l.glints.n >= 8 && l.glints.n <= 12 && l.glints.anim === 'premioGlint'
        && l.glow.anim === 'premioPulso3' && l.avatares.n > 0 && l.avatares.anim === 'premioPulso3';
      const noPremio = p.quadros.filter((q) => q.luz.premio);
      console.log(`   ${ok(noPremio.length >= Math.min(5, p.quadros.length) && noPremio.every((q) => aCorrer(q.luz)))} as três luzes a correr nos ${noPremio.length} quadros com .premio (shine premioShine ×3 · 10 glints premioGlint · glow e avatares premioPulso3)`);
      const comBanda = p.quadros.filter((q) => q.luz.shine.some((s) => s.dentro));
      console.log(`   ${ok(comBanda.length > 0)} a varredura atravessa o retângulo: banda dentro em ${comBanda.length} quadro(s) (${comBanda.map((q) => `${q.ms} ms: banda ${q.luz.shine.findIndex((s) => s.dentro) + 1} no centro ${q.luz.shine.find((s) => s.dentro)?.centro}%`).join(' · ') || '—'})`);
      for (const q of p.quadros) {
        const l = q.luz; const c = l.carimbos;
        const bandas = l.shine.map((s, j) => (s.dentro ? `${j + 1}@${s.centro}%` : null)).filter(Boolean).join(',') || 'fora';
        console.log(`      quadro ${q.k}${q.zoom ? ' (3x)' : ''} · luz aos ${q.ms} ms${q.alvo == null ? ' (1º frame pintado)' : ` (alvo ${q.alvo})`} · classe há ${c.desdeClasse} ms · 1º frame ${c.primeiroFrame >= 0 ? '+' : ''}${c.primeiroFrame} ms · ${l.premio ? 'premio' : l.calmo ? `premioCalmo (aos ${c.calmo} ms)` : 'sem estado'} · banda ${bandas} · glints acesos ${l.glints.acesos}/${l.glints.n} · glow ${l.glow.op} · avatares ${l.avatares.op} · ${q.captura}`);
      }
      // O temporizador dos 3 s conta do relógio da classe e as capturas a 3x
      // travam a página: aqui sai sempre um pouco acima de 3000 — o número
      // limpo é o da 14B (relógio sem capturas), que continua a valer.
      if (f.carimbos?.calmo != null) console.log(`   brilho suave (.premioCalmo) aos ${f.carimbos.calmo} ms da classe (3000 + o que as capturas travaram)`);
      const calmo = (l) => l.calmo && !l.premio && l.shine.every((s) => s.anim === 'none') && l.glints.acesos === 0
        && l.glow.op > 0.2 && l.glow.op < 0.6 && l.avatares.op > 0.1 && l.avatares.op < 0.5 && l.girando.length === 0;
      const resumo = (l) => `${l.calmo ? 'premioCalmo' : 'SEM premioCalmo'}${l.premio ? ' + premio (errado)' : ''} · shine ${nomes(l)} · glints acesos ${l.glints.acesos} · glow ${l.glow.op} · avatares ${l.avatares.op} · a girar ${l.girando.length}`;
      console.log(`   ${ok(calmo(f))} estado final de quem sorteou: ${resumo(f)} · botão pulso forte ${p.botao.pulsoForte ? 'sim' : 'não'} · glow ${p.botao.glow ? 'sim' : 'não'}`);
      const d = r.depois;
      console.log(`   ${ok(calmo(d.luz) && !d.botao.pulsoForte && d.botao.glow)} quem abre depois: ${resumo(d.luz)} · botão pulso forte ${d.botao.pulsoForte ? 'SIM (errado)' : 'não'} · glow ${d.botao.glow ? 'sim' : 'não'}`);
      const z = r.reduzido;
      console.log(`   ${ok(z.calmo && !z.premio && z.shine.every((s) => s.anim === 'none') && z.glints.acesos === 0 && z.girando.length === 0 && z.glow.op > 0.2)} movimento reduzido: ${resumo(z)}`);
      if (r.erros.length) console.log(`   erros de JS: ${r.erros.join(' | ')}`);
    }
  }

  const arquivo = path.join(PASTA, `${ETIQUETA}.json`);
  writeFileSync(arquivo, JSON.stringify(saida, null, 2));
  console.log(`\n[iphone] detalhes em ${path.relative(RAIZ, arquivo)}`);
} finally {
  await navegador.close();
}
