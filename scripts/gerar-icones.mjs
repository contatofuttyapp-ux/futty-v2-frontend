#!/usr/bin/env node
// Futty v2.0 — Rodada 29W/29X: gera os ícones do app a partir das DUAS camadas do ícone adaptativo do Android, que são o "ouro vivo" que o dono
// escolheu em 23-set, sem anel em lugar nenhum (dono, 5-out):
//   · fundo  — a vinheta (#1a1826 no centro → #0b0a12 nos cantos), SEM o aro (android/.../mipmap-*/ic_launcher_background.png);
//   · frente — só o F ouro vivo com o brilho, transparente, dentro da zona segura (66/108) (android/.../mipmap-*/ic_launcher_foreground.png).
// O F é sempre o asset real: aqui só se compõe, redimensiona e recorta em círculo — nada é desenhado nem gerado. (O gen-icons.mjs antigo
// desenhava um F à mão; saiu na 29V. A 29V também usou o ícone antigo das lojas, F amarelo chapado sobre #050810; a 29W trocou a fonte.)
//
// A composição (fundo + frente, 108 dp inteiros) é o que vai para:
//   · public/icons/icon-512.png e icon-192.png   — o ícone do site ("any maskable"), do "adicionar à tela inicial", do apple-touch-icon e das
//     notificações: o F fica dentro do círculo central de 80% do lado, que é o que sobrevive a qualquer recorte. 29X: saem das camadas
//     renderizadas no TAMANHO CHEIO (1024 px, pela receita da bancada de 23-set) e reduzidas — não das de 432 px ampliadas, que deixavam a borda do F mole;
//   · android/.../mipmap-*/ic_launcher.png (quadrado) e ic_launcher_round.png (o mesmo recortado em círculo, sem anel) — os ícones antigos do
//     Android (anteriores ao 8), a partir das camadas de 432 px do repositório (que são só reduzir, nunca ampliar);
//   · as camadas do ldpi (81 px), que nasceram da arte antiga e não tinham quem as refizesse: reduzidas das do xxxhdpi;
//   · public/icons/badge-96.png — a silhueta do F (branca, fundo transparente) que o Android pede para a barra de status, tirada do
//     ic_launcher_monochrome. Não depende das camadas coloridas: sai igual a cada rodada.
// O ícone do iPhone (AppIcon-512@2x.png, com a moldura fina) é do backend (scripts/_bench/aplicar-icone.js --so-ios); o splash é do gerar-splash.mjs;
// o favicon.svg não é de ninguém aqui. NÃO são tocados por este script.
//
// A receita é a da bancada de 23-set (backend/scripts/_bench/testar-icone.js, variante 1 "ouro vivo", sem aro — a mesma função da variante 2 que o
// aplicar-icone.js usou para o iPhone, menos o aro). Ela roda no backend (processo filho; ver _camadas.mjs) e a conferência abaixo garante que o
// mestre de 1024 px, reduzido a 432, ainda é a camada que está no repositório: se alguém mudar a receita ou a camada, o script para.
//
// Uso (a partir de FUTTY-V2/frontend, com o backend ao lado e o npm install feito nos dois):  node scripts/gerar-icones.mjs
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { renderizarCamadas } from './_camadas.mjs';

const RAIZ = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const ICONES = path.join(RAIZ, 'public', 'icons');
const RES = path.join(RAIZ, 'android', 'app', 'src', 'main', 'res');
const CAMADAS = path.join(RES, 'mipmap-xxxhdpi'); // as camadas de maior resolução do repositório: 108 dp × 4 = 432 px
const LADO_CAMADAS = 432;

// Os tamanhos de ic_launcher*.png de cada densidade (48 dp × densidade).
const DENSIDADES = { ldpi: 36, mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 };
const ZONA_SEGURA = 0.4; // "maskable": o conteúdo cabe no círculo central de 80% do lado (raio = 40%)
const TOLERANCIA_DO_MESTRE = 8; // níveis (0–255) no pior pixel entre o mestre reduzido e a camada do repositório: a mesma receita, duas cópias do libvips
const TOLERANCIA_MEDIA = 0.3; // e na média (mudar a receita ou a camada daria dezenas de níveis nas bordas do F)

const lerCamada = async (nome) => {
  const arquivo = path.join(CAMADAS, nome);
  const meta = await sharp(arquivo).metadata();
  if (meta.width !== LADO_CAMADAS || meta.height !== LADO_CAMADAS) throw new Error(`${nome} tem de ser ${LADO_CAMADAS}×${LADO_CAMADAS} (é ${meta.width}×${meta.height})`);
  return sharp(arquivo).ensureAlpha().png().toBuffer();
};
const fundo = await lerCamada('ic_launcher_background.png');
const frente = await lerCamada('ic_launcher_foreground.png');

// Os mestres: as mesmas duas camadas, no tamanho cheio (1024 px), pela receita da bancada.
const mestre = renderizarCamadas();

// O mestre reduzido a 432 px é a camada que está no repositório? (a receita e o repositório continuam sendo a mesma arte)
for (const [nome, grande, camada] of [['fundo', mestre.fundo, fundo], ['frente', mestre.frente, frente]]) {
  const reduzido = await sharp(grande).resize(LADO_CAMADAS, LADO_CAMADAS, { kernel: 'lanczos3' }).ensureAlpha().raw().toBuffer();
  const doRepositorio = await sharp(camada).raw().toBuffer();
  let maior = 0;
  let soma = 0;
  for (let i = 0; i < reduzido.length; i += 4) {
    // o RGB de um pixel transparente não quer dizer nada (varia de uma versão do libvips para outra): compara com o alfa já aplicado
    const a = reduzido[i + 3];
    const b = doRepositorio[i + 3];
    maior = Math.max(maior, Math.abs(a - b));
    soma += Math.abs(a - b);
    for (let c = 0; c < 3; c += 1) {
      const d = Math.abs((reduzido[i + c] * a) / 255 - (doRepositorio[i + c] * b) / 255);
      maior = Math.max(maior, d);
      soma += d;
    }
  }
  maior = Math.round(maior);
  const media = soma / reduzido.length;
  if (maior > TOLERANCIA_DO_MESTRE || media > TOLERANCIA_MEDIA) throw new Error(`o mestre de 1024 px (${nome}) reduzido a ${LADO_CAMADAS} difere da camada do repositório: ${maior} níveis no pior pixel (limite ${TOLERANCIA_DO_MESTRE}), ${media.toFixed(3)} na média (limite ${TOLERANCIA_MEDIA}) — a receita da bancada ou a camada mudou`);
  console.log(`${nome}: o mestre de 1024 px, reduzido, é a camada do repositório (diferença: ${maior} níveis no pior pixel, ${media.toFixed(3)} na média, de 255)`);
}

// O fundo é só vinheta escura: se aparece um pixel claro, o aro dourado (ou outra arte) voltou para a camada.
{
  const { data, info } = await sharp(mestre.fundo).raw().toBuffer({ resolveWithObject: true });
  let maisClaro = 0;
  for (let i = 0; i < data.length; i += info.channels) maisClaro = Math.max(maisClaro, data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114);
  if (maisClaro > 40) throw new Error(`o fundo do ícone adaptativo tem um pixel claro (luz ${maisClaro.toFixed(0)}): o aro voltou? Só a vinheta escura é aceita aqui`);
  console.log(`fundo: só a vinheta escura (o pixel mais claro tem luz ${maisClaro.toFixed(0)} de 255; o aro dourado passaria de 150)`);
}

// A composição: o fundo com o F por cima, sem alfa. Num passo só (o composite do sharp corre depois do resto da pipeline).
const compor = async (base, topo) => sharp(await sharp(base).ensureAlpha().composite([{ input: topo }]).png().toBuffer()).removeAlpha().png().toBuffer();
const composicao = await compor(fundo, frente); // 432 px: dos ícones antigos do Android
const composicaoCheia = await compor(mestre.fundo, mestre.frente); // 1024 px: do ícone do site

// O F fica dentro da zona segura? Pixel de F (e do brilho) = claro sobre a vinheta escura; mede o mais distante do centro.
{
  const { data, info } = await sharp(composicaoCheia).raw().toBuffer({ resolveWithObject: true });
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
}

const gravar = (destino, buffer) => {
  writeFileSync(destino, buffer);
  console.log(`✓ ${path.relative(RAIZ, destino)} (${buffer.length} bytes)`);
};
// A composição não tem alfa e o redondo precisa do alfa do recorte: o redimensionamento é um passo e o recorte, outro (NÃO usar removeAlpha() depois
// do composite: o sharp o aplica no fim e apagaria o recorte).
const redimensionar = (lado) => sharp(composicao).resize(lado, lado, { kernel: 'lanczos3' });
const redimensionarCamada = (buffer, lado) => sharp(buffer).resize(lado, lado, { kernel: 'lanczos3' }).png({ compressionLevel: 9 }).toBuffer();

// 1) O ícone do site, do tamanho cheio (1024) reduzido — nunca das camadas de 432 ampliadas.
for (const lado of [512, 192]) {
  gravar(path.join(ICONES, `icon-${lado}.png`), await sharp(composicaoCheia).resize(lado, lado, { kernel: 'lanczos3' }).png({ compressionLevel: 9 }).toBuffer());
}

// 2) Os ícones antigos do Android: o quadrado e o círculo (sem anel — só o recorte do próprio quadrado).
for (const [densidade, lado] of Object.entries(DENSIDADES)) {
  const pasta = path.join(RES, `mipmap-${densidade}`);
  gravar(path.join(pasta, 'ic_launcher.png'), await redimensionar(lado).png({ compressionLevel: 9 }).toBuffer());
  const circulo = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${lado}" height="${lado}"><circle cx="${lado / 2}" cy="${lado / 2}" r="${lado / 2}" fill="#fff"/></svg>`);
  const redondo = await redimensionar(lado).ensureAlpha().composite([{ input: circulo, blend: 'dest-in' }]).png({ compressionLevel: 9 }).toBuffer();
  gravar(path.join(pasta, 'ic_launcher_round.png'), redondo);
}

// 3) As camadas do ldpi (108 dp × 0,75 = 81 px): não vieram da receita de 23-set (que vai de mdpi a xxxhdpi) e sobraram da arte antiga — o fundo
// branco chapado e um F amarelo com o escuro embutido. Aqui são as do xxxhdpi, só reduzidas.
const ldpi = path.join(RES, 'mipmap-ldpi');
gravar(path.join(ldpi, 'ic_launcher_background.png'), await redimensionarCamada(fundo, 81));
gravar(path.join(ldpi, 'ic_launcher_foreground.png'), await redimensionarCamada(frente, 81));

// 4) O "badge" das notificações: só a silhueta do F, branca, fundo transparente (o Android usa o alfa e pinta a cor dele).
const mono = sharp(path.join(CAMADAS, 'ic_launcher_monochrome.png'));
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
