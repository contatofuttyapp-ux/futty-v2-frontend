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
// Uso (a partir de FUTTY-V2/frontend; precisa de `npx playwright install webkit`):
//   node scripts/ver-iphone.mjs                                   produção, etiqueta "antes"
//   node scripts/ver-iphone.mjs --url http://localhost:4173 --etiqueta depois
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

async function novoContexto(navegador, sessao) {
  const contexto = await navegador.newContext({
    ...IPHONE,
    storageState: sessao ? { cookies: [], origins: [{ origin: BASE, localStorage: sessao }] } : undefined,
  });
  await contexto.addInitScript(amostrador, { larguraAparelho: LARGURA_APARELHO, duracaoMs: AMOSTRAGEM_MS });
  return contexto;
}

async function entrar(navegador) {
  const contexto = await navegador.newContext(IPHONE);
  const pagina = await contexto.newPage();
  await pagina.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
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
  return sessao;
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

mkdirSync(PASTA, { recursive: true });
const navegador = await webkit.launch();
try {
  console.log(`[iphone] ${ETIQUETA} · ${BASE} · WebKit ${navegador.version()} · 430×932 @3x`);
  const sessao = ARQUIVO_SESSAO ? JSON.parse(readFileSync(ARQUIVO_SESSAO, 'utf8')) : await entrar(navegador);
  console.log(`[iphone] sessão ${ARQUIVO_SESSAO ? `de ${ARQUIVO_SESSAO}` : `de ${EMAIL}`} ok · time ${TIME}`);

  const arranque = await arranqueFrio(navegador, sessao);
  console.log(`[iphone] arranque frio em "/" → ${arranque.urlFinal}: ${arranque.noArranque.length} pedido(s) antes do /api/inicio voltar: ${arranque.noArranque.join(', ')}`);
  console.log(`         todos em 8 s: ${arranque.pedidos.map((p) => `${p.rota}@${p.inicioMs}`).join(', ')}`);

  const telas = [];
  for (const [nome, rota] of [['ranking', `/equipa/${TIME}/ranking`], ['resenha', '/feed']]) {
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

  const saida = path.join(PASTA, `${ETIQUETA}.json`);
  writeFileSync(saida, JSON.stringify({ etiqueta: ETIQUETA, base: BASE, webkit: navegador.version(), arranque, telas }, null, 2));
  console.log(`\n[iphone] detalhes em ${path.relative(RAIZ, saida)}`);
} finally {
  await navegador.close();
}
