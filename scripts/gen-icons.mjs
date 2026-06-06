// Futty v2.0 — Gera os ícones PWA (icon-192.png, icon-512.png) sem dependências
// nativas: desenha um "F" dourado sobre fundo escuro num buffer RGBA e codifica
// PNG à mão (zlib do Node). Correr: `node scripts/gen-icons.mjs`.
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { Buffer } from 'node:buffer';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'icons');

const BG = [5, 8, 16]; // #050810
const GOLD = [212, 160, 23]; // #d4a017

// Tabela CRC-32 (PNG usa o polinómio 0xEDB88320).
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i += 1) crc = CRC_TABLE[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function encodePng(size, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  const stride = size * 4;
  const raw = Buffer.alloc((stride + 1) * size);
  for (let y = 0; y < size; y += 1) {
    raw[y * (stride + 1)] = 0; // filtro "none"
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}

function drawF(size) {
  const rgba = Buffer.alloc(size * size * 4);
  for (let i = 0; i < size * size; i += 1) {
    rgba[i * 4] = BG[0];
    rgba[i * 4 + 1] = BG[1];
    rgba[i * 4 + 2] = BG[2];
    rgba[i * 4 + 3] = 255;
  }
  const t = Math.round(size * 0.12); // espessura
  const h = Math.round(size * 0.56); // altura da letra
  const w = Math.round(size * 0.4); // largura (braço de cima)
  const x0 = Math.round((size - w) / 2);
  const y0 = Math.round((size - h) / 2);
  const midY = y0 + Math.round(h * 0.42);
  const midW = Math.round(w * 0.82);
  const rects = [
    [x0, y0, t, h], // haste vertical
    [x0, y0, w, t], // braço superior
    [x0, midY, midW, t], // braço do meio
  ];
  for (const [rx, ry, rw, rh] of rects) {
    for (let y = ry; y < ry + rh && y < size; y += 1) {
      for (let x = rx; x < rx + rw && x < size; x += 1) {
        const idx = (y * size + x) * 4;
        rgba[idx] = GOLD[0];
        rgba[idx + 1] = GOLD[1];
        rgba[idx + 2] = GOLD[2];
        rgba[idx + 3] = 255;
      }
    }
  }
  return rgba;
}

mkdirSync(OUT, { recursive: true });
for (const size of [192, 512]) {
  const png = encodePng(size, drawF(size));
  writeFileSync(join(OUT, `icon-${size}.png`), png);
  console.log(`✓ icon-${size}.png (${png.length} bytes)`);
}
