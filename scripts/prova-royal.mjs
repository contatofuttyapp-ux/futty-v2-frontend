#!/usr/bin/env node
// Futty v2.0 — Rodada 29H-B, decisão do dono (2-out, noite): o fundo ROYAL do app tem de ser EXATAMENTE o da prancha
// FUT/DESIGN/golden-variantes.png (roxo com estrelas e brilhos). Esta prova compara os dois, lado a lado e em números:
//   • a referência — o card Royal recortado da própria prancha, e o MESMO render pelo pipeline real (gerarFigurinhaCanvas, 'pico');
//   • o app — a prévia da Figurinha com o Royal escolhido (conta de prova minhaFig; o PATCH do fundo é interceptado, nada vai ao banco);
//   • os números — a camada de fundo que a prévia usa (gerarCamadasFigurinha → fundoBlob) contra o fundo da prancha
//     (desenharFundoRoyal 'pico'), pixel a pixel na faixa entre a moldura e a placa, e a luz em cada um dos 14 brilhos.
// Antes da correção a prévia entrava SEM brilhos (a chapa nua: o overlay vivo só existia para o Golden); depois, os 14 no pico.
//
//   node scripts/prova-royal.mjs --url http://localhost:5233 --etiqueta antes
//   node scripts/prova-royal.mjs --url http://localhost:5233 --etiqueta depois --compor
// Só servidor LOCAL (CLAUDE.md, 25-set). Capturas em scripts/capturas/rodada-29h/ (fora do git); a prancha final vai para FUT/DESIGN.
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { webkit } from 'playwright';

const RAIZ = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const opcao = (nome, omissao) => { const i = args.indexOf(`--${nome}`); return i >= 0 && args[i + 1] ? args[i + 1] : omissao; };
const BASE = opcao('url', 'http://localhost:5233').replace(/\/+$/, '');
const ETIQUETA = opcao('etiqueta', 'antes');
if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(BASE)) throw new Error(`só servidor LOCAL (CLAUDE.md, 25-set); recebi ${BASE}`);
const DESIGN = path.resolve(RAIZ, '..', '..', 'DESIGN');
const PASTA = path.join(RAIZ, 'scripts', 'capturas', 'rodada-29h');
mkdirSync(PASTA, { recursive: true });
const PRANCHA = path.join(DESIGN, 'golden-variantes.png');
const BUSTO = path.resolve(RAIZ, '..', 'backend', 'scripts', '_bench', 'saida-modelos-jovens', 'j11-bruninho-br-recorte.png');
const SESSAO = path.join(RAIZ, 'scripts', 'capturas', 'sessao-rodada29b.json');
// As 14 posições da poeira de cristal (PREMIUM_GLINTS em figurinhaCanvas.js) — a prancha desenhou exatamente estas, no pico.
const GLINTS = [
  [0.10, 0.12], [0.23, 0.08], [0.50, 0.06], [0.72, 0.09], [0.89, 0.14],
  [0.07, 0.32], [0.93, 0.37], [0.11, 0.55], [0.91, 0.60],
  [0.14, 0.82], [0.85, 0.85], [0.50, 0.91], [0.31, 0.19], [0.70, 0.21],
];
const VAZIO = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

const fx = JSON.parse(readFileSync(SESSAO, 'utf8'));
const busto = `data:image/png;base64,${readFileSync(BUSTO).toString('base64')}`;

const navegador = await webkit.launch();
const resultado = { etiqueta: ETIQUETA };
try {
  const contexto = await navegador.newContext({
    viewport: { width: 430, height: 932 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, serviceWorkers: 'block',
    storageState: { cookies: [], origins: [{ origin: BASE, localStorage: fx.minhaFig }] },
  });
  const escritas = [];
  await contexto.route('**/api/**', async (route) => {
    const pedido = route.request();
    if (pedido.method() === 'GET' || pedido.method() === 'OPTIONS') return route.continue();
    escritas.push({ metodo: pedido.method(), rota: new URL(pedido.url()).pathname, corpo: (pedido.postData() || '').slice(0, 120) });
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) });
  });
  const pagina = await contexto.newPage();
  const erros = [];
  pagina.on('pageerror', (e) => erros.push(e.message));
  await pagina.goto(`${BASE}/figurinha`, { waitUntil: 'domcontentloaded' });
  await pagina.locator('button', { hasText: /^Aceitar$/ }).click({ timeout: 2500 }).catch(() => {});
  const card = pagina.locator('.fig-studio-card').first();
  await card.locator('img.fig-aura').waitFor({ timeout: 40000 });
  const srcAntes = await card.locator('img.fig-aura').getAttribute('src');
  // 1) o app: escolher o Royal na grade de fundos e esperar a prévia trocar de camada
  const tile = pagina.locator('.fig-seletor-tile', { hasText: /^Royal$/ }).first();
  await tile.waitFor({ timeout: 20000 });
  await tile.click();
  await pagina.waitForFunction((antes) => {
    const img = document.querySelector('.fig-studio-card img.fig-aura');
    return img && img.src !== antes && img.complete;
  }, srcAntes, { timeout: 20000 });
  await pagina.waitForTimeout(900);
  const patch = escritas.find((e) => e.metodo === 'PATCH' && e.rota === '/api/me');
  resultado.patchInterceptado = !!patch && /royal/.test(patch.corpo);
  const arqApp = path.join(PASTA, `r29hb-royal-${ETIQUETA}.png`);
  await card.screenshot({ path: arqApp, animations: 'disabled' });
  resultado.capturaApp = path.relative(RAIZ, arqApp);

  // 2) os números, na mesma página (o mesmo pipeline que a prévia acabou de usar)
  const numeros = await pagina.evaluate(async ({ glints, vazio, busto }) => {
    const m = await import('/src/utils/figurinhaCanvas.js');
    const W = 400, H = 600;
    const paraCanvas = async (blob) => { const b = await createImageBitmap(blob); const c = document.createElement('canvas'); c.width = b.width; c.height = b.height; c.getContext('2d').drawImage(b, 0, 0); return c; };
    // a prancha: o card inteiro pela MESMA chamada que a prancha fez (gerarFigurinhaCanvas, 'pico'), com um avatar transparente de
    // verdade (1×1 com alpha 0) para a faixa medida mostrar só o fundo como ele sai no card
    const cp = await paraCanvas(await m.gerarFigurinhaCanvas({ jogador: { id: 'prova', nome_jogador: 'ROYAL' }, fotoOverride: vazio, fundo: 'royal', corFrame: 'dourado', fundoGlints: 'pico', larguraExibida: null }));
    // o app: a camada de fundo da prévia (apenasMoldura), sem jogador — a que a Figurinha mostra por trás do jogador
    const { fundoBlob } = await m.gerarCamadasFigurinha({ jogador: { id: 'prova', nome_jogador: 'ROYAL' }, fotoOverride: vazio, fundo: 'royal', corFrame: 'dourado' });
    const ca = await paraCanvas(fundoBlob);
    const dp = cp.getContext('2d').getImageData(0, 0, W, H).data;
    const da = ca.getContext('2d').getImageData(0, 0, W, H).data;
    const lum = (d, x, y) => { const i = (y * W + x) * 4; return 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]; };
    // a luz em cada brilho: média 5×5 no centro, contra a chapa a 12 px de distância (o halo tem ~8 px)
    const brilhos = glints.map(([fx, fy]) => {
      const cx = Math.round(fx * W), cy = Math.round(fy * H);
      let c = 0, f = 0, n = 0;
      for (let dy = -2; dy <= 2; dy += 1) for (let dx = -2; dx <= 2; dx += 1) { c += lum(da, cx + dx, cy + dy); f += lum(da, Math.min(W - 1, Math.max(0, cx + 14 + dx)), cy + dy); n += 1; }
      return Math.round(c / n - f / n);
    });
    const brilhosPrancha = glints.map(([fx, fy]) => {
      const cx = Math.round(fx * W), cy = Math.round(fy * H);
      let c = 0, f = 0, n = 0;
      for (let dy = -2; dy <= 2; dy += 1) for (let dx = -2; dx <= 2; dx += 1) { c += lum(dp, cx + dx, cy + dy); f += lum(dp, Math.min(W - 1, Math.max(0, cx + 14 + dx)), cy + dy); n += 1; }
      return Math.round(c / n - f / n);
    });
    // pixel a pixel na faixa entre a moldura e a placa (12% das bordas laterais, do topo a 12%, até 70% da altura)
    let dif = 0, maxDif = 0, total = 0;
    for (let y = Math.round(H * 0.12); y < Math.round(H * 0.70); y += 1) {
      for (let x = Math.round(W * 0.12); x < Math.round(W * 0.88); x += 1) {
        const i = (y * W + x) * 4;
        const d = Math.max(Math.abs(dp[i] - da[i]), Math.abs(dp[i + 1] - da[i + 1]), Math.abs(dp[i + 2] - da[i + 2]));
        total += 1; if (d > 2) dif += 1; if (d > maxDif) maxDif = d;
      }
    }
    // a referência inteira, como a prancha a desenhou (mesmo busto, mesma chamada)
    const blob = await m.gerarFigurinhaCanvas({ jogador: { id: 'prancha', nome_jogador: 'BRUNINHO', avatar_url: busto }, fotoOverride: busto, fundo: 'royal', corFrame: 'dourado', fundoGlints: 'pico', larguraExibida: null });
    const cr = await paraCanvas(blob);
    return { brilhos, brilhosPrancha, pixelsDiferentes: dif, total, maxDif, referencia: cr.toDataURL('image/png') };
  }, { glints: GLINTS, vazio: VAZIO, busto });
  const arqRef = path.join(PASTA, 'r29hb-royal-referencia-pipeline.png');
  writeFileSync(arqRef, Buffer.from(numeros.referencia.split(',')[1], 'base64'));
  const acesos = numeros.brilhos.filter((v) => v >= 40).length;
  const acesosPrancha = numeros.brilhosPrancha.filter((v) => v >= 40).length;
  Object.assign(resultado, {
    brilhosAcesosNoApp: `${acesos}/14`, brilhosAcesosNaPrancha: `${acesosPrancha}/14`,
    luzPorBrilhoApp: numeros.brilhos, luzPorBrilhoPrancha: numeros.brilhosPrancha,
    pixelsDiferentes: `${numeros.pixelsDiferentes} de ${numeros.total} (dif. máx. ${numeros.maxDif})`,
    identicoAPrancha: numeros.pixelsDiferentes === 0,
    erros,
  });
  await contexto.close();
} finally {
  await navegador.close();
}
console.log(JSON.stringify(resultado, null, 1));

if (args.includes('--compor')) {
  // A prancha lado a lado: [Royal da prancha] [app ANTES] [app DEPOIS]
  const LARG = 400, ALT = 600, MARGEM = 36, LEG = 64;
  const recorte = await sharp(PRANCHA).extract({ left: 36, top: 90, width: 400, height: 600 }).png().toBuffer();
  const cartas = [{ rotulo: 'ROYAL na prancha (2-out)', png: recorte }];
  for (const et of ['antes', 'depois']) {
    const arq = path.join(PASTA, `r29hb-royal-${et}.png`);
    if (!existsSync(arq)) continue;
    cartas.push({ rotulo: `app · prévia da Figurinha · ${et.toUpperCase()}`, png: await sharp(arq).resize({ height: ALT }).png().toBuffer() });
  }
  const larguras = await Promise.all(cartas.map(async (c) => (await sharp(c.png).metadata()).width));
  const W = MARGEM + cartas.reduce((s, _, i) => s + larguras[i] + MARGEM, 0);
  const H = MARGEM + 54 + ALT + LEG + MARGEM + 22;
  let x = MARGEM; const posicoes = larguras.map((l) => { const p = x; x += l + MARGEM; return p; });
  const titulo = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <style>text{font-family:Rajdhani,Arial,sans-serif;font-weight:700}</style>
  <text x="${MARGEM}" y="42" font-size="30" fill="#c4a6ff">FUNDO ROYAL — A PRANCHA × O APP (Rodada 29H-B, decisão do dono, 2-out)</text>
  ${cartas.map((c, i) => `<text x="${posicoes[i] + larguras[i] / 2}" y="${MARGEM + 54 + ALT + 40}" font-size="24" fill="#e8e8ef" text-anchor="middle">${c.rotulo}</text>`).join('')}
  <text x="${MARGEM}" y="${H - 34}" font-size="16" fill="#8a8398">Antes: a prévia da Figurinha desenhava a chapa roxa SEM a poeira de cristal (o brilho vivo só existia para o Golden).</text>
  <text x="${MARGEM}" y="${H - 12}" font-size="16" fill="#8a8398">Depois: os 14 brilhos no pico, pixel a pixel como a prancha. Download e compartilhar já eram iguais. Capturas do WebKit em servidor local.</text>
</svg>`);
  const saida = path.join(PASTA, 'r29hb-royal-lado-a-lado.png');
  await sharp({ create: { width: W, height: H, channels: 4, background: '#0a0a12' } })
    .composite([{ input: titulo, left: 0, top: 0 }, ...cartas.map((c, i) => ({ input: c.png, left: posicoes[i], top: MARGEM + 54 }))])
    .png().toFile(saida);
  mkdirSync(DESIGN, { recursive: true });
  copyFileSync(saida, path.join(DESIGN, 'royal-lado-a-lado.png'));
  console.log(`[prova-royal] ${path.relative(RAIZ, saida)} (${W}×${H}) · cópia em ${path.relative(RAIZ, path.join(DESIGN, 'royal-lado-a-lado.png'))}`);
}
