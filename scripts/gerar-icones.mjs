#!/usr/bin/env node
// Futty v2.0 — Rodada 29V: gera os ícones do app a partir de UMA fonte, o ícone das lojas (FUT\LOJA\icone-512.png:
// quadrado escuro com o F dourado, SEM anel). O F é sempre o asset real: aqui só se redimensiona, recorta em círculo e
// tira a silhueta — nada é desenhado nem gerado. (O gen-icons.mjs antigo desenhava um F à mão; saiu.)
//
//   · public/icons/icon-512.png e icon-192.png   — o ícone do site ("any maskable"), do "adicionar à tela inicial", do
//     apple-touch-icon e das notificações;
//   · android/.../mipmap-*/ic_launcher.png (quadrado) e ic_launcher_round.png (o mesmo recortado em círculo, sem anel) —
//     os ícones antigos do Android (anteriores ao 8). O ADAPTATIVO (background/foreground/monochrome) não é tocado aqui;
//   · public/icons/badge-96.png — a silhueta do F (branca, fundo transparente) que o Android pede para a barra de status,
//     tirada do ic_launcher_monochrome.
//
// Uso (a partir de FUTTY-V2/frontend):  node scripts/gerar-icones.mjs [caminho-da-fonte.png]
// Sem argumento usa ..\..\LOJA\icone-512.png e, se a pasta LOJA não existir (clone sem ela), o próprio public/icons/icon-512.png.
import { copyFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const RAIZ = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const ICONES = path.join(RAIZ, 'public', 'icons');
const RES = path.join(RAIZ, 'android', 'app', 'src', 'main', 'res');
const LOJA = path.resolve(RAIZ, '..', '..', 'LOJA', 'icone-512.png');
const FONTE = path.resolve(process.argv[2] || (existsSync(LOJA) ? LOJA : path.join(ICONES, 'icon-512.png')));

// Os tamanhos de ic_launcher*.png de cada densidade (48 dp × densidade).
const DENSIDADES = { ldpi: 36, mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 };
const ZONA_SEGURA = 0.4; // "maskable": o conteúdo cabe no círculo central de 80% do lado (raio = 40%)

const meta = await sharp(FONTE).metadata();
if (meta.width !== 512 || meta.height !== 512) throw new Error(`a fonte tem de ser 512×512 (esta é ${meta.width}×${meta.height}): ${FONTE}`);

// O F fica dentro da zona segura? Pixel de F = claro sobre o fundo escuro; mede o mais distante do centro.
const { data, info } = await sharp(FONTE).removeAlpha().raw().toBuffer({ resolveWithObject: true });
let raioMax = 0;
for (let y = 0; y < info.height; y += 1) {
  for (let x = 0; x < info.width; x += 1) {
    const i = (y * info.width + x) * 3;
    if (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114 < 60) continue;
    raioMax = Math.max(raioMax, Math.hypot(x + 0.5 - info.width / 2, y + 0.5 - info.height / 2) / info.width);
  }
}
if (raioMax > ZONA_SEGURA) throw new Error(`o F passa da zona segura do "maskable" (${(raioMax * 100).toFixed(1)}% > ${ZONA_SEGURA * 100}% do lado)`);
console.log(`F dentro da zona segura: o ponto mais distante do centro está a ${(raioMax * 100).toFixed(1)}% do lado (limite ${ZONA_SEGURA * 100}%)`);

const gravar = (destino, buffer) => {
  writeFileSync(destino, buffer);
  console.log(`✓ ${path.relative(RAIZ, destino)} (${buffer.length} bytes)`);
};
// (a fonte não tem alfa; NÃO usar removeAlpha() aqui: o sharp o aplica depois da composição e apagaria o recorte do redondo)
const redimensionar = (lado) => sharp(FONTE).resize(lado, lado, { kernel: 'lanczos3' });

// 1) O ícone do site. O 512 é a própria fonte, byte a byte.
const destino512 = path.join(ICONES, 'icon-512.png');
if (path.resolve(destino512) !== FONTE) {
  copyFileSync(FONTE, destino512);
  console.log(`✓ ${path.relative(RAIZ, destino512)} (cópia da fonte, ${readFileSync(destino512).length} bytes)`);
}
gravar(path.join(ICONES, 'icon-192.png'), await redimensionar(192).png({ compressionLevel: 9 }).toBuffer());

// 2) Os ícones antigos do Android: o quadrado e o círculo (sem anel — só o recorte do próprio quadrado).
for (const [densidade, lado] of Object.entries(DENSIDADES)) {
  const pasta = path.join(RES, `mipmap-${densidade}`);
  gravar(path.join(pasta, 'ic_launcher.png'), await redimensionar(lado).png({ compressionLevel: 9 }).toBuffer());
  const circulo = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${lado}" height="${lado}"><circle cx="${lado / 2}" cy="${lado / 2}" r="${lado / 2}" fill="#fff"/></svg>`);
  const redondo = await redimensionar(lado).ensureAlpha().composite([{ input: circulo, blend: 'dest-in' }]).png({ compressionLevel: 9 }).toBuffer();
  gravar(path.join(pasta, 'ic_launcher_round.png'), redondo);
}

// 3) O "badge" das notificações: só a silhueta do F, branca, fundo transparente (o Android usa o alfa e pinta a cor dele).
const mono = sharp(path.join(RES, 'mipmap-xxxhdpi', 'ic_launcher_monochrome.png'));
const { data: rgba, info: im } = await mono.clone().ensureAlpha().raw().toBuffer({ resolveWithObject: true });
let [x0, y0, x1, y1] = [im.width, im.height, -1, -1];
for (let y = 0; y < im.height; y += 1) {
  for (let x = 0; x < im.width; x += 1) {
    if (rgba[(y * im.width + x) * 4 + 3] < 16) continue;
    x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
  }
}
if (x1 < 0) throw new Error('o ic_launcher_monochrome está vazio');
const lado = Math.ceil(Math.max(x1 - x0 + 1, y1 - y0 + 1) * 1.12); // 6% de respiro de cada lado
const esquerda = Math.round((x0 + x1 + 1) / 2 - lado / 2);
const topo = Math.round((y0 + y1 + 1) / 2 - lado / 2);
if (esquerda < 0 || topo < 0 || esquerda + lado > im.width || topo + lado > im.height) throw new Error('o recorte do badge sai da imagem');
const recorte = await mono.clone().ensureAlpha().extract({ left: esquerda, top: topo, width: lado, height: lado }).resize(96, 96, { kernel: 'lanczos3' }).raw().toBuffer();
for (let i = 0; i < recorte.length; i += 4) { recorte[i] = 255; recorte[i + 1] = 255; recorte[i + 2] = 255; }
gravar(path.join(ICONES, 'badge-96.png'), await sharp(recorte, { raw: { width: 96, height: 96, channels: 4 } }).png({ compressionLevel: 9 }).toBuffer());
