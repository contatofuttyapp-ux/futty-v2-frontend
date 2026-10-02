#!/usr/bin/env node
// Futty v2.0 — Rodada 29H (item 7): gera public/og/futty-1200x630-v1.png, a imagem de prévia do link (og:image) do site e do convite.
//
// A prévia do WhatsApp mostrava o F num círculo (o WhatsApp recortava o ícone pequeno). Agora a prévia é uma imagem de verdade,
// 1200×630: o ÍCONE DO APP — o F dourado dentro do quadrado de cantos arredondados, o mesmo das lojas e dos e-mails — centrado
// sobre o fundo da casa (#050810, com o halo dourado e o roxo da landing). Sai de resources/icon.png.
//
// O nome leva a versão (-v1): a imagem é servida com cache longo e os apps de mensagem guardam a prévia por muito tempo; ao
// trocar a arte, muda o nome (e o og:image do index.html) — ver o item 37 da Rodada 29.
//
// Uso (a partir de FUTTY-V2/frontend):  node scripts/gerar-og.mjs
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const RAIZ = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const ORIGEM = path.join(RAIZ, 'resources', 'icon.png');
const SAIDA = path.join(RAIZ, 'public', 'og', 'futty-1200x630-v1.png');
const L = 1200;
const A = 630;
const LADO = 400; // o ícone: 400 px num quadro de 630 de altura (63 %) — nada é cortado em nenhum recorte de prévia
const RAIO = Math.round(LADO * 0.224); // o canto do ícone do iOS
const TETO_BYTES = 200 * 1024;

const fundo = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${L}" height="${A}">
  <defs>
    <radialGradient id="ouro" cx="50%" cy="46%" r="38%"><stop offset="0" stop-color="#d4a017" stop-opacity="0.34"/><stop offset="1" stop-color="#d4a017" stop-opacity="0"/></radialGradient>
    <radialGradient id="roxo" cx="86%" cy="96%" r="46%"><stop offset="0" stop-color="#8b5cf6" stop-opacity="0.26"/><stop offset="1" stop-color="#8b5cf6" stop-opacity="0"/></radialGradient>
  </defs>
  <rect width="${L}" height="${A}" fill="#050810"/>
  <rect width="${L}" height="${A}" fill="url(#ouro)"/>
  <rect width="${L}" height="${A}" fill="url(#roxo)"/>
</svg>`);
const mascara = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${LADO}" height="${LADO}"><rect width="${LADO}" height="${LADO}" rx="${RAIO}" ry="${RAIO}" fill="#fff"/></svg>`);
const icone = await sharp(ORIGEM).resize(LADO, LADO, { fit: 'cover' }).ensureAlpha().composite([{ input: mascara, blend: 'dest-in' }]).png().toBuffer();

const cru = await sharp(fundo)
  .composite([{ input: icone, left: Math.round((L - LADO) / 2), top: Math.round((A - LADO) / 2) }])
  .png()
  .toBuffer();

// Cor cheia (sem paleta): os halos em degradê fazem faixas visíveis numa paleta de 256 cores. Cabe folgado no teto.
const melhor = await sharp(cru).png({ compressionLevel: 9, effort: 10 }).toBuffer();
console.log(`[og] cor cheia → ${(melhor.length / 1024).toFixed(1)} KB`);
if (melhor.length > TETO_BYTES) {
  console.error(`[og] passou de ${TETO_BYTES / 1024} KB — não gravei.`);
  process.exit(1);
}
mkdirSync(path.dirname(SAIDA), { recursive: true });
writeFileSync(SAIDA, melhor);
const m = await sharp(SAIDA).metadata();
console.log(`[og] ${path.relative(RAIZ, SAIDA)} · ${m.width}×${m.height} · ${(melhor.length / 1024).toFixed(1)} KB (teto ${TETO_BYTES / 1024} KB)`);
