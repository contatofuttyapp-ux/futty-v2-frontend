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
async function novoContexto(navegador, sessao, { amostrar = true } = {}) {
  const contexto = await navegador.newContext({
    ...IPHONE,
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
  // O Pedro tocou ~1,1 s depois de o Início pintar — antes do pré-aquecimento (1,5 s).
  await espera(900);
  await pagina.locator('.bottom-nav__tab--ranking').click();
  await pagina.waitForSelector('.rank-row', { timeout: 30000 });
  await espera(4500);
  const fora = await pagina.evaluate(() => window.__futtyRanking);
  const captura = arquivoCaptura(`ranking1-${comCache ? 'com-cache' : 'sem-cache'}`);
  await pagina.screenshot({ path: captura });
  const relatorio = await lerRelatorioDoApp(contexto, pagina);
  await contexto.close();

  const navRanking = relatorio?.navegacoes?.find((n) => /\/ranking$/.test(n.rota)) || null;
  const rel = (v) => (v == null || fora?.toque == null ? null : v - fora.toque);
  return {
    comCache,
    lento: LENTO,
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

  if (CENAS.includes('ranking1')) {
    const visitas = await cenaRanking1(navegador, sessao);
    saida.ranking1 = visitas;
    for (const v of visitas) {
      const d = v.diagnostico;
      console.log(`\n[iphone] 1ª visita ao Ranking ${v.comCache ? 'COM cache velho' : 'SEM cache'}${v.lento ? ' (lento)' : ''}`);
      console.log(`   Diagnóstico do app: pintura ${d?.msPintura} ms · dados ${d?.msDados} ms · esperou [${(d?.esperou || []).join(', ')}]${d?.marcas ? ` · marcas ${JSON.stringify(d.marcas)}` : ''}`);
      if (v.deFora) console.log(`   de fora (desde o toque): 1ª linha ${v.deFora.primeiraLinhaMs} ms · 1ª imagem ${v.deFora.primeiraImagemMs} ms · maior quadro ${v.deFora.maiorQuadro.ms} ms em ${v.deFora.maiorQuadro.emMs} ms`);
      if (v.deFora?.quadrosLongos?.length) console.log(`   quadros > 60 ms: ${v.deFora.quadrosLongos.map((q) => `${q.ms}@${q.emMs}`).join(', ')}`);
      console.log(`   chamadas: ${v.chamadas.join(' | ')}`);
      console.log(`   captura: ${v.captura}${v.erros.length ? ` · erros de JS: ${v.erros.join(' | ')}` : ''}`);
    }
  }

  const arquivo = path.join(PASTA, `${ETIQUETA}.json`);
  writeFileSync(arquivo, JSON.stringify(saida, null, 2));
  console.log(`\n[iphone] detalhes em ${path.relative(RAIZ, arquivo)}`);
} finally {
  await navegador.close();
}
