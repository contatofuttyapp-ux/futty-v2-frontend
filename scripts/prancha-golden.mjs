#!/usr/bin/env node
// Futty v2.0 — Rodada 29H-B (item 57): a prancha do fundo GOLDEN para o dono escolher. Nada muda no app até o "aprovado".
//
// O dono achou o Golden exagerado e longe do Royal. Aqui saem DUAS variantes mais contidas, lado a lado com o Royal e com o Golden
// de hoje, cada card desenhado pelo PIPELINE REAL do canvas (src/utils/figurinhaCanvas.js, no WebKit, com o mesmo busto):
//   A · "ouro fosco": a chapa com 72% da saturação e 86% do brilho, vinheta escura nas bordas, glints só nas bordas (fundoGlints 'bordas');
//   B · "ouro escuro": 55% da saturação, 74% do brilho, matiz um pouco mais âmbar, vinheta mais fechada e um facho suave do topo (o
//       mesmo gesto do Royal), glints só nas bordas.
// As chapas das variantes são derivadas de public/golden-plate.jpg com o sharp (desaturar/escurecer/compor a vinheta) e ficam FORA do
// app, em FUT/DESIGN/golden-plate-A.jpg e -B.jpg — quando o dono escolher, a aprovada substitui o golden-plate.jpg (e a lista de
// glints vira 'bordas' no app). Durante a prancha, a chapa de cada variante é servida no lugar de /golden-plate.jpg (route do Playwright).
//
// Uso (de FUTTY-V2/frontend, com o vite dev de pé — o servidor LOCAL, nunca a produção):
//   node scripts/prancha-golden.mjs --url http://localhost:5233 [--saida ../../DESIGN/golden-variantes.png]
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { webkit } from 'playwright';

const RAIZ = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const opcao = (nome, omissao) => { const i = args.indexOf(`--${nome}`); return i >= 0 && args[i + 1] ? args[i + 1] : omissao; };
const BASE = opcao('url', 'http://localhost:5233').replace(/\/+$/, '');
const DESIGN = path.resolve(RAIZ, '..', '..', 'DESIGN');
const SAIDA = path.resolve(opcao('saida', path.join(DESIGN, 'golden-variantes.png')));
if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(BASE)) throw new Error(`só servidor LOCAL (CLAUDE.md, 25-set); recebi ${BASE}`);

const CHAPA = path.join(RAIZ, 'public', 'golden-plate.jpg');
// O busto: um modelo FICTÍCIO da bancada (nunca pessoa real), com fundo transparente como o birefnet entrega.
const BUSTO = path.resolve(RAIZ, '..', 'backend', 'scripts', '_bench', 'saida-modelos-jovens', 'j11-bruninho-br-recorte.png');

/** Uma vinheta: transparente no centro, escura nas bordas (alpha `borda` nos cantos). */
function vinheta(w, h, borda, raio = 0.78) {
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
    <defs><radialGradient id="v" cx="50%" cy="46%" r="${(raio * 100).toFixed(0)}%"><stop offset="0" stop-color="#000" stop-opacity="0"/><stop offset="0.55" stop-color="#000" stop-opacity="${(borda * 0.35).toFixed(3)}"/><stop offset="1" stop-color="#000" stop-opacity="${borda}"/></radialGradient></defs>
    <rect width="${w}" height="${h}" fill="url(#v)"/></svg>`);
}
/** O facho do topo (o gesto do Royal): um cone dourado suave descendo do centro do topo. */
function facho(w, h, alpha) {
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
    <defs><linearGradient id="f" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe6a0" stop-opacity="${alpha}"/><stop offset="0.6" stop-color="#ffe6a0" stop-opacity="${(alpha * 0.25).toFixed(3)}"/><stop offset="1" stop-color="#ffe6a0" stop-opacity="0"/></linearGradient></defs>
    <polygon points="${w * 0.36},0 ${w * 0.64},0 ${w * 0.9},${h} ${w * 0.1},${h}" fill="url(#f)"/></svg>`);
}

async function chapaVariante(qual) {
  const meta = await sharp(CHAPA).metadata();
  const { width: w, height: h } = meta;
  if (qual === 'A') {
    return sharp(CHAPA).modulate({ saturation: 0.72, brightness: 0.86 }).composite([{ input: vinheta(w, h, 0.62), blend: 'over' }]).jpeg({ quality: 90 }).toBuffer();
  }
  return sharp(CHAPA).modulate({ saturation: 0.55, brightness: 0.74, hue: -6 })
    .composite([{ input: vinheta(w, h, 0.80, 0.72), blend: 'over' }, { input: facho(w, h, 0.22), blend: 'screen' }])
    .jpeg({ quality: 90 }).toBuffer();
}

const RENDER = async ({ fundo, fundoGlints, busto }) => {
  const m = await import('/src/utils/figurinhaCanvas.js');
  if (document.fonts?.ready) { try { await document.fonts.ready; } catch { /* segue */ } }
  const jogador = { id: 'prancha', nome_jogador: 'BRUNINHO', avatar_url: busto };
  const blob = await m.gerarFigurinhaCanvas({ jogador, fotoOverride: busto, fundo, corFrame: 'dourado', fundoGlints, larguraExibida: null });
  const bmp = await createImageBitmap(blob);
  const c = document.createElement('canvas');
  c.width = bmp.width; c.height = bmp.height;
  c.getContext('2d').drawImage(bmp, 0, 0);
  return c.toDataURL('image/png');
};

mkdirSync(DESIGN, { recursive: true });
const chapaA = await chapaVariante('A');
const chapaB = await chapaVariante('B');
writeFileSync(path.join(DESIGN, 'golden-plate-A.jpg'), chapaA);
writeFileSync(path.join(DESIGN, 'golden-plate-B.jpg'), chapaB);
const busto = `data:image/png;base64,${readFileSync(BUSTO).toString('base64')}`;

const navegador = await webkit.launch();
const cards = [];
try {
  const contexto = await navegador.newContext({ viewport: { width: 600, height: 900 }, deviceScaleFactor: 2, serviceWorkers: 'block' });
  const pagina = await contexto.newPage();
  pagina.on('pageerror', (e) => console.error('[prancha] erro na página:', e.message));
  await pagina.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
  const casos = [
    { rotulo: 'ROYAL (referência)', fundo: 'royal', fundoGlints: 'pico', chapa: null },
    { rotulo: 'GOLDEN de hoje', fundo: 'golden', fundoGlints: 'pico', chapa: null },
    { rotulo: 'GOLDEN A · ouro fosco', fundo: 'golden', fundoGlints: 'bordas', chapa: chapaA },
    { rotulo: 'GOLDEN B · ouro escuro', fundo: 'golden', fundoGlints: 'bordas', chapa: chapaB },
  ];
  for (const caso of casos) {
    // A chapa da variante entra no lugar de /golden-plate.jpg; o cache de imagens do canvas é por URL, então cada caso leva um
    // sufixo que o route troca de volta — assim as três chapas douradas não se misturam dentro da mesma página.
    await pagina.evaluate((sufixo) => { window.__sufixoChapa = sufixo; }, caso.chapa ? caso.rotulo : '');
    if (caso.chapa) {
      await pagina.route('**/golden-plate.jpg*', (route) => route.fulfill({ status: 200, contentType: 'image/jpeg', body: caso.chapa, headers: { 'cache-control': 'no-store' } }));
    }
    const dataUrl = await pagina.evaluate(RENDER, { fundo: caso.fundo, fundoGlints: caso.fundoGlints, busto });
    cards.push({ ...caso, png: Buffer.from(dataUrl.split(',')[1], 'base64') });
    if (caso.chapa) await pagina.unroute('**/golden-plate.jpg*');
    // o cache de imagens do canvas guardou a chapa desta variante sob a URL de sempre: recarrega a página para o caso seguinte
    await pagina.reload({ waitUntil: 'domcontentloaded' });
  }
  await contexto.close();
} finally {
  await navegador.close();
}

// A prancha: 4 cards de 400×600 (desenhados a 400×600 pelo canvas), rótulo embaixo, fundo da casa.
const LARG = 400, ALT = 600, MARGEM = 36, LEG = 64;
const W = MARGEM * 2 + LARG * 4 + MARGEM * 3;
const H = MARGEM + 54 + ALT + LEG + MARGEM + 22;
const titulo = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <style>text{font-family:Rajdhani,Arial,sans-serif;font-weight:700}</style>
  <text x="${MARGEM}" y="42" font-size="30" fill="#f0c94a">FUNDO GOLDEN — VARIANTES PARA O DONO ESCOLHER (Rodada 29H-B, 2-out)</text>
  ${cards.map((c, i) => `<text x="${MARGEM + i * (LARG + MARGEM) + LARG / 2}" y="${MARGEM + 54 + ALT + 40}" font-size="24" fill="#e8e8ef" text-anchor="middle">${c.rotulo}</text>`).join('')}
  <text x="${MARGEM}" y="${H - 34}" font-size="16" fill="#8a8398">A: a chapa a 72% de saturação e 86% de brilho, vinheta escura nas bordas, brilhos só nas bordas · B: 55% de saturação, 74% de brilho, matiz mais âmbar, vinheta fechada e facho do topo, brilhos só nas bordas.</text>
  <text x="${MARGEM}" y="${H - 12}" font-size="16" fill="#8a8398">O Golden de hoje continua no app até o "aprovado" do dono. As chapas A e B estão ao lado (golden-plate-A.jpg / -B.jpg).</text>
</svg>`);
await sharp({ create: { width: W, height: H, channels: 4, background: '#0a0a12' } })
  .composite([
    { input: titulo, left: 0, top: 0 },
    ...(await Promise.all(cards.map(async (c, i) => ({ input: await sharp(c.png).resize(LARG, ALT).png().toBuffer(), left: MARGEM + i * (LARG + MARGEM), top: MARGEM + 54 })))),
  ])
  .png()
  .toFile(SAIDA);
console.log(`[prancha] ${path.relative(RAIZ, SAIDA)} (${W}×${H}) · chapas das variantes em ${path.relative(RAIZ, DESIGN)}/golden-plate-A.jpg e -B.jpg`);
