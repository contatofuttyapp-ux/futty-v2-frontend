#!/usr/bin/env node
// Futty v2.0 — gera o splash (a abertura do app) com o "ouro vivo", e as fontes de reserva do
// @capacitor/assets (frontend/assets/).
//
// O splash é o F ouro vivo — a MESMA peça do ícone do iPhone (a receita da bancada:
// backend/scripts/_bench/testar-icone.js, renderizada pelo backend/scripts/_bench/renderizar-camadas.js;
// ver _camadas.mjs) — centrado sobre o fundo SÓLIDO #080808. Sem vinheta: #080808 é a mesma cor de
// colors.xml, de capacitor.config.json e da variável --bg do index.css, e é isso que faz o arranque não
// ter degrau da abertura para o app. O F é sempre o asset real: aqui só se compõe, redimensiona e recorta —
// nada é desenhado nem gerado.
//
// O F tem o MESMO tamanho físico do splash anterior: 928 px de altura no quadrado de 2732 px (34,0%). (A
// largura sai 3% maior, 784 contra 761 px: o F da receita é um pouco mais largo que o F chapado anterior.)
//
//   · iPhone — ios/App/App/Assets.xcassets/Splash.imageset: as seis imagens do Contents.json (1x/2x/3x,
//     claro e escuro), 2732×2732, recomprimidas em paleta de 256 cores (sem canal alfa). Claro e escuro são
//     a mesma imagem: o app é sempre escuro.
//   · Android abaixo do 12 — android/.../res/drawable[-<densidade>]/splash_logo.png: o F com fundo
//     transparente, em cada densidade (mdpi a xxxhdpi; e o drawable/ sem sufixo, que é o xhdpi). O Android
//     pega o da densidade do aparelho, então os cinco precisam trocar juntos. O F tem 117 dp de altura (o
//     mesmo do anterior, que era 96×117 dp) e vem com a margem do brilho; o drawable/splash.xml o centra
//     sobre @color/futtyFundo (#080808) sem escalar. Em paleta de 256 cores (com alfa), como o do iPhone.
//     O Android 12+ NÃO usa estes: usa o ic_launcher_foreground (windowSplashScreenAnimatedIcon), que já é
//     o ouro vivo.
//   · fontes de reserva — assets/splash.png e assets/splash-dark.png (o mesmo splash, sem paleta) e
//     assets/icon.png (cópia do ícone atual do iPhone, AppIcon-512@2x.png). Quem rodar
//     `npx @capacitor/assets` parte daqui; nada volta para a arte antiga.
//
// Uso (a partir de FUTTY-V2/frontend, com o backend ao lado e o npm install feito nos dois):
//   node scripts/gerar-splash.mjs
import { copyFileSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { renderizarCamadas } from './_camadas.mjs';

const RAIZ = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const IOS_SPLASH = path.join(RAIZ, 'ios', 'App', 'App', 'Assets.xcassets', 'Splash.imageset');
const IOS_ICONE = path.join(RAIZ, 'ios', 'App', 'App', 'Assets.xcassets', 'AppIcon.appiconset', 'AppIcon-512@2x.png');
const RES = path.join(RAIZ, 'android', 'app', 'src', 'main', 'res');
const ASSETS = path.join(RAIZ, 'assets');

const LADO = 2732; // o quadrado do splash do iPhone (1366 pt @2x)
const ALTURA_F = 928; // px: a altura do F no splash de antes (761×928 px, 34,0% do quadrado)
const ALTURA_F_DP = 117; // dp: a altura do F do splash_logo de antes (96×117 dp)
const FUNDO = 8; // #080808
// o splash_logo.png de cada densidade (a escala sobre o mdpi); o drawable/ sem sufixo é o xhdpi
const DENSIDADES = { 'drawable-mdpi': 1, 'drawable-hdpi': 1.5, 'drawable-xhdpi': 2, 'drawable-xxhdpi': 3, 'drawable-xxxhdpi': 4 };

const gravar = (destino, buffer) => {
  writeFileSync(destino, buffer);
  console.log(`✓ ${path.relative(RAIZ, destino)} (${buffer.length} bytes)`);
};

const { splashF } = renderizarCamadas({ splashAltura: ALTURA_F });
const { width: ladoF } = await sharp(splashF).metadata();
if ((LADO - ladoF) % 2) throw new Error(`o quadrado do F (${ladoF} px) não centra em ${LADO} px`);

// 1) A composição: o F com o brilho sobre #080808 sólido, no meio do quadrado de 2732 px.
const sobre = await sharp({ create: { width: LADO, height: LADO, channels: 3, background: { r: FUNDO, g: FUNDO, b: FUNDO } } })
  .composite([{ input: splashF, left: (LADO - ladoF) / 2, top: (LADO - ladoF) / 2 }])
  .removeAlpha().raw().toBuffer();
// O brilho só ACRESCENTA luz ao #080808; o arredondamento da composição deixava 1 nível a menos num canal em volta dele (8,8,7): nada fica abaixo do fundo.
for (let i = 0; i < sobre.length; i += 1) if (sobre[i] < FUNDO) sobre[i] = FUNDO;
const mestre = await sharp(sobre, { raw: { width: LADO, height: LADO, channels: 3 } }).png({ compressionLevel: 9 }).toBuffer();

// Conferências: a borda inteira é o #080808 sólido (sem degrau para o app) e o F tem o tamanho de antes, no centro.
{
  let fora = 0;
  for (let k = 0; k < LADO; k += 1) {
    for (const [x, y] of [[k, 0], [k, LADO - 1], [0, k], [LADO - 1, k]]) {
      const i = (y * LADO + x) * 3;
      if (sobre[i] !== FUNDO || sobre[i + 1] !== FUNDO || sobre[i + 2] !== FUNDO) fora += 1;
    }
  }
  if (fora) throw new Error(`${fora} pixels da borda do splash não são #080808: o brilho chegou à borda?`);
  let [x0, y0, x1, y1] = [LADO, LADO, -1, -1];
  for (let y = 0; y < LADO; y += 1) {
    for (let x = 0; x < LADO; x += 1) {
      if (sobre[(y * LADO + x) * 3] <= 120) continue; // o ouro (o brilho em volta é bem mais escuro)
      x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
    }
  }
  const [altura, largura, cx, cy] = [y1 - y0 + 1, x1 - x0 + 1, (x0 + x1 + 1) / 2, (y0 + y1 + 1) / 2];
  if (Math.abs(altura - ALTURA_F) > 2) throw new Error(`o F mede ${altura} px de altura, esperado ${ALTURA_F}`);
  if (Math.abs(cx - LADO / 2) > 1.5 || Math.abs(cy - LADO / 2) > 1.5) throw new Error(`o F não está no centro: (${cx}, ${cy})`);
  console.log(`splash: borda toda #080808; F ${largura}×${altura} px (de ${LADO}), centro (${cx}, ${cy})`);
}

// 2) iPhone: as seis imagens do Contents.json, em paleta (sem alfa, como estavam).
const paleta = await sharp(mestre).png({ palette: true, quality: 100, colours: 256, dither: 1.0, compressionLevel: 9 }).toBuffer();
{
  const meta = await sharp(paleta).metadata();
  if (!meta.paletteBitDepth) throw new Error('o splash do iPhone não saiu em paleta');
  const { data } = await sharp(paleta).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  for (const i of [0, (LADO * LADO - 1) * 3, (LADO * (LADO / 2)) * 3]) if (data[i] !== FUNDO || data[i + 1] !== FUNDO || data[i + 2] !== FUNDO) throw new Error('a paleta mexeu na cor do fundo (#080808)');
}
const contents = JSON.parse(readFileSync(path.join(IOS_SPLASH, 'Contents.json'), 'utf8'));
const arquivos = [...new Set(contents.images.map((i) => i.filename))];
if (arquivos.length !== 6) throw new Error(`o Contents.json do Splash.imageset tem ${arquivos.length} imagens (esperado 6: 1x/2x/3x, claro e escuro)`);
for (const nome of arquivos) gravar(path.join(IOS_SPLASH, nome), paleta);

// 3) Android abaixo do 12: o F com fundo transparente, o mesmo tamanho físico em cada densidade.
for (const [pasta, escala] of Object.entries(DENSIDADES)) {
  const lado = Math.round(ladoF * ((ALTURA_F_DP * escala) / ALTURA_F)); // o quadrado do F (com a margem do brilho) nesta densidade
  // em paleta (com alfa): a 2× de ampliação não se distingue do truecolor (erro médio 0,3 nível sobre o #080808) e pesa um quarto — regra do app leve
  const logo = await sharp(splashF).resize(lado, lado, { kernel: 'lanczos3' }).png({ palette: true, quality: 100, colours: 256, dither: 1.0, compressionLevel: 9 }).toBuffer();
  gravar(path.join(RES, pasta, 'splash_logo.png'), logo);
  if (pasta === 'drawable-xhdpi') gravar(path.join(RES, 'drawable', 'splash_logo.png'), logo);
}

// 4) As fontes de reserva do @capacitor/assets.
gravar(path.join(ASSETS, 'splash.png'), mestre);
gravar(path.join(ASSETS, 'splash-dark.png'), mestre);
copyFileSync(IOS_ICONE, path.join(ASSETS, 'icon.png'));
console.log(`✓ ${path.relative(RAIZ, path.join(ASSETS, 'icon.png'))} (cópia de AppIcon-512@2x.png, ${readFileSync(IOS_ICONE).length} bytes)`);
