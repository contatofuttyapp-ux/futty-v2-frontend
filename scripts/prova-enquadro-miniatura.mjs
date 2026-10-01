#!/usr/bin/env node
// Futty v2.0 — Rodada 29B (bloco 3, E): a prova de que a PRÉVIA ao vivo do editor da miniatura é a miniatura que o motor entrega.
//
// O que faz: monta uma página mínima com o componente REAL (components/EnquadroMiniatura.jsx), abre-a num navegador de verdade,
// ARRASTA a imagem e APROXIMA (−/+), salva (o PUT é interceptado — nada vai a servidor nenhum) e compara, pixel a pixel, o que o
// editor mostrava com o que o motor (utils/derivadosMidia.js#gerarDerivado, o MESMO código do proxy /api/media) gera para o recorte
// salvo, sobre a imagem original de 800×1200. Como contraprova mede também o quadrado do topo (a regra de antes do recorte): se a
// diferença para ele não fosse bem maior, a comparação não provaria nada.
//
// Não toca em Supabase, em conta, em produção: o motor é apontado para uma porta morta e a imagem é sintética (sharp). Cria
// _tmp-enquadro.html, src/_tmp-enquadro.jsx e public/_tmp-enquadro-512.png na raiz do frontend e APAGA tudo ao sair.
//
// Uso: node scripts/prova-enquadro-miniatura.mjs [pasta-de-saída]   (precisa do ../backend com as dependências instaladas)
//      Deixa na pasta (padrão: tmp do sistema) o original, o editor ao vivo, o recorte do motor com e sem recorte e as páginas.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const RAIZ = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const BACK = path.join(RAIZ, '..', 'backend');
const SAIDA = process.argv[2] || path.join(os.tmpdir(), 'prova-enquadro-miniatura');
fs.mkdirSync(SAIDA, { recursive: true });

const req = createRequire(path.join(BACK, 'package.json'));
const sharp = req('sharp');
req('dotenv').config({ path: path.join(BACK, '.env'), quiet: true });
const { gerarDerivado } = req('./utils/derivadosMidia');

const PORTA = 5331; // fora das do Pedro (3001/4173/5173) e das da rodada (5229)
const BASE = `http://localhost:${PORTA}`;
const TEMPORARIOS = ['_tmp-enquadro.html', 'src/_tmp-enquadro.jsx', 'public/_tmp-enquadro-512.png'];
let servidor = null;
function limpar() {
  for (const f of TEMPORARIOS) fs.rmSync(path.join(RAIZ, f), { force: true });
  servidor?.kill();
}
process.on('exit', limpar);

// ── a imagem: 800×1200 com bastante detalhe (para a diferença de janela aparecer no pixel) ──────────────────────
const W = 800;
const H = 1200;
const raw = Buffer.alloc(W * H * 3);
let semente = 12345;
const aleatorio = () => { semente = (semente * 1664525 + 1013904223) % 4294967296; return semente / 4294967296; };
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  const i = (y * W + x) * 3;
  raw[i] = Math.floor(40 + (x / W) * 150 + ((x >> 5) & 1) * 30);
  raw[i + 1] = Math.floor(40 + (y / H) * 150 + ((y >> 5) & 1) * 30);
  raw[i + 2] = Math.floor(90 + ((x + y) % 97));
}
let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">`;
for (let k = 0; k < 40; k++) {
  svg += `<rect x="${Math.floor(aleatorio() * W)}" y="${Math.floor(aleatorio() * H)}" width="${30 + Math.floor(aleatorio() * 90)}" height="${30 + Math.floor(aleatorio() * 90)}" fill="rgb(${Math.floor(aleatorio() * 255)},${Math.floor(aleatorio() * 255)},${Math.floor(aleatorio() * 255)})" opacity="0.8"/>`;
}
svg += '<circle cx="400" cy="430" r="150" fill="#f2c9a0"/><circle cx="350" cy="400" r="18" fill="#222"/><circle cx="450" cy="400" r="18" fill="#222"/><path d="M340 490 Q400 540 460 490" stroke="#722" stroke-width="10" fill="none"/>';
svg += '<rect x="220" y="620" width="360" height="380" fill="#6b2fd1"/><text x="400" y="840" font-size="90" text-anchor="middle" fill="#f0c94a" font-family="sans-serif" font-weight="800">FUTTY</text></svg>';
const original = await sharp(raw, { raw: { width: W, height: H, channels: 3 } }).composite([{ input: Buffer.from(svg) }]).png().toBuffer();
// O editor baixa o derivado de 512 (urlImagem w=512, 2:3); o motor corta a janela no ORIGINAL — como em produção.
fs.writeFileSync(path.join(RAIZ, 'public', '_tmp-enquadro-512.png'), await sharp(original).resize({ width: 512 }).png().toBuffer());
fs.writeFileSync(path.join(SAIDA, 'original.png'), original);

fs.writeFileSync(path.join(RAIZ, '_tmp-enquadro.html'), '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head><body style="background:#0b0b10;margin:0;padding:16px"><div id="root"></div><script type="module" src="/src/_tmp-enquadro.jsx"></script></body></html>');
fs.writeFileSync(path.join(RAIZ, 'src', '_tmp-enquadro.jsx'), `import { createRoot } from 'react-dom/client';
import './index.css';
import './styles/app.css';
import EnquadroMiniatura from './components/EnquadroMiniatura';
window.__salvos = [];
createRoot(document.getElementById('root')).render(<div style={{ maxWidth: 420 }}><EnquadroMiniatura avatarUrl="${BASE}/_tmp-enquadro-512.png" onSalvo={(u, r) => window.__salvos.push([u, r])} /></div>);
`);

// O vite com o motor apontado para uma porta morta: nenhuma chamada sai daqui (e o PUT é interceptado abaixo).
servidor = spawn(process.execPath, [path.join(RAIZ, 'node_modules', 'vite', 'bin', 'vite.js'), '--port', String(PORTA), '--strictPort'], {
  cwd: RAIZ, stdio: 'ignore', env: { ...process.env, VITE_API_URL: 'http://127.0.0.1:9' },
});
for (let i = 0; i < 80; i++) {
  try { if ((await fetch(`${BASE}/_tmp-enquadro.html`)).ok) break; } catch { /* subindo */ }
  await new Promise((r) => setTimeout(r, 250));
}

const navegador = await chromium.launch();
const ctx = await navegador.newContext({ serviceWorkers: 'block', viewport: { width: 420, height: 800 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
const erros = [];
page.on('pageerror', (e) => erros.push(String(e)));
const salvos = [];
await page.route('**/api/me/avatar/enquadro', async (route) => {
  const corpo = route.request().postDataJSON();
  salvos.push({ metodo: route.request().method(), corpo });
  await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ recorte: corpo, avatar_url: `${BASE}/_tmp-enquadro-512.png?rc=salvo` }) });
});
await page.goto(`${BASE}/_tmp-enquadro.html`, { waitUntil: 'load' });
await page.getByRole('button', { name: 'Enquadrar' }).click();
const editor = page.getByRole('img', { name: /Área da miniatura/ });
await editor.waitFor();
await page.waitForFunction(() => {
  const i = document.querySelector('[aria-label^="Área da miniatura"] img');
  return i && i.style.width.endsWith('%') && i.naturalWidth > 0;
});
const caixa = await editor.boundingBox();
const cx = caixa.x + caixa.width / 2;
const cy = caixa.y + caixa.height / 2;

// Arrasta a imagem para cima e para a esquerda (a janela vai para baixo/direita), aproxima 2× e arrasta de novo.
await page.mouse.move(cx, cy); await page.mouse.down(); await page.mouse.move(cx - 30, cy - 50, { steps: 6 }); await page.mouse.up();
await page.getByRole('button', { name: 'Aproximar' }).click();
await page.getByRole('button', { name: 'Aproximar' }).click();
await page.mouse.move(cx, cy); await page.mouse.down(); await page.mouse.move(cx + 14, cy - 22, { steps: 6 }); await page.mouse.up();
await page.waitForTimeout(150);

// O que o editor mostra AGORA (o miolo da caixa, sem a borda de 2 px) e a página aberta.
const dentro = { x: caixa.x + 2, y: caixa.y + 2, width: caixa.width - 4, height: caixa.height - 4 };
const doEditor = await page.screenshot({ clip: dentro });
fs.writeFileSync(path.join(SAIDA, 'editor-ao-vivo.png'), doEditor);
await page.screenshot({ path: path.join(SAIDA, 'pagina-aberta.png') });

await page.getByRole('button', { name: 'Salvar miniatura' }).click();
await page.waitForFunction(() => window.__salvos.length === 1);
const recorte = salvos.find((s) => s.metodo === 'PUT').corpo;
console.log('recorte salvo (PUT):', JSON.stringify(recorte));
const chamadaDoApp = await page.evaluate(() => window.__salvos[0]);
await page.screenshot({ path: path.join(SAIDA, 'pagina-depois-de-salvar.png') });
await navegador.close();

// O que o PROXY entrega para esse recorte: o gerarDerivado do motor, sobre o original.
const lado = Math.round(dentro.width);
const pixels = (buf) => sharp(buf).resize(lado, lado, { fit: 'fill' }).removeAlpha().raw().toBuffer();
const diferencaMedia = (a, b) => { let s = 0; for (let i = 0; i < a.length; i++) s += Math.abs(a[i] - b[i]); return s / a.length; };
const doMotor = await gerarDerivado(original, 'image/png', { largura: 256, quadrado: true, recorte });
const doTopo = await gerarDerivado(original, 'image/png', { largura: 256, quadrado: true });
fs.writeFileSync(path.join(SAIDA, 'motor-com-recorte.webp'), doMotor.buf);
fs.writeFileSync(path.join(SAIDA, 'motor-sem-recorte.webp'), doTopo.buf);
const aoVivo = await pixels(doEditor);
const dIgual = diferencaMedia(aoVivo, await pixels(doMotor.buf));
const dTopo = diferencaMedia(aoVivo, await pixels(doTopo.buf));
console.log(`diferença média por canal (0–255): editor × motor COM recorte = ${dIgual.toFixed(2)} · editor × quadrado do topo = ${dTopo.toFixed(2)}`);
console.log('o app recebeu (avatar_url, restaurou):', JSON.stringify(chamadaDoApp));
console.log('erros de página:', erros.length, erros.slice(0, 3));

const ok = dIgual < 10 && dTopo > dIgual * 2 && erros.length === 0 && chamadaDoApp?.[1] === false;
console.log(ok ? 'OK — a prévia ao vivo é a miniatura do motor' : 'FALHOU');
process.exit(ok ? 0 : 1);
