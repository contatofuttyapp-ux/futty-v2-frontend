#!/usr/bin/env node
// Futty v2.0 — Rodada 29B (G): gera public/email/icone-app-144.png, o ÍCONE DO APP para os e-mails do Supabase.
//
// O F solto (logo-144.png) dava ao Gmail uma cara de "qualquer remetente"; o ícone do app — o F dourado dentro do
// quadrado de cantos arredondados, como aparece no iPhone — é o que a pessoa reconhece. Sai de resources/icon.png (o
// mesmo ícone das lojas), reduzido a 144×144 com os cantos arredondados (raio de 22,4%, o do iOS) e transparentes,
// e em PNG de paleta para caber em ≤ 8 KB (o e-mail é carregado de fora, a cada abertura).
//
// A troca do logo-144.png por este nos 3 templates do Supabase é no painel (EMAILS-SUPABASE.md).
//
// Uso (a partir de FUTTY-V2/frontend):  node scripts/gerar-icone-email.mjs
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const RAIZ = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const ORIGEM = path.join(RAIZ, 'resources', 'icon.png');
const SAIDA = path.join(RAIZ, 'public', 'email', 'icone-app-144.png');
const LADO = 144;
const RAIO = Math.round(LADO * 0.224); // o canto do ícone do iOS
const TETO_BYTES = 8 * 1024;

const mascara = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${LADO}" height="${LADO}"><rect width="${LADO}" height="${LADO}" rx="${RAIO}" ry="${RAIO}" fill="#fff"/></svg>`);
const redondo = await sharp(ORIGEM).resize(LADO, LADO, { fit: 'cover' }).ensureAlpha().composite([{ input: mascara, blend: 'dest-in' }]).png().toBuffer();

// Da paleta mais rica para a mais pobre, até caber (o dourado com brilho gasta cores; 64 costuma bastar).
let melhor = null;
for (const cores of [128, 96, 64, 48, 32]) {
  const png = await sharp(redondo).png({ palette: true, colours: cores, quality: 92, compressionLevel: 9, effort: 10 }).toBuffer();
  melhor = png;
  console.log(`[icone-email] ${cores} cores → ${png.length} B`);
  if (png.length <= TETO_BYTES) break;
}
if (melhor.length > TETO_BYTES) {
  console.error(`[icone-email] passou de ${TETO_BYTES} B mesmo com 32 cores — não gravei.`);
  process.exit(1);
}
mkdirSync(path.dirname(SAIDA), { recursive: true });
writeFileSync(SAIDA, melhor);
const m = await sharp(SAIDA).metadata();
console.log(`[icone-email] ${path.relative(RAIZ, SAIDA)} · ${m.width}×${m.height} · ${melhor.length} B (teto ${TETO_BYTES} B) · raio ${RAIO} px · alpha ${m.hasAlpha ? 'sim' : 'não'}`);
