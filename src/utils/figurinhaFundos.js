// Futty v2.0 — Os fundos da figurinha, desenhados no canvas: Neutro, Aura, Golden/Royal (premium), Estádio e Épico — e o
// adiantamento do asset do fundo. O card (figurinhaCanvas.js) e a tela da Figurinha (os tiles) desenham com estes.

import { respirar } from '../lib/ritmo';
import { canvasAuxiliar, carregarImagem } from './figurinhaImagens';

// Manda descodificar o asset do fundo ANTES de se esperar pelo avatar. Os dois
// ficheiros não se conhecem: em série custavam a soma (62 + 78 ms medidos), em
// paralelo custam o maior dos dois. Os fundos Neutro e Aura não têm asset.
function adiantarFundo(fundo) {
  if (fundo === 'preto' || fundo === 'aura') return;
  if (fundo === 'golden' || fundo === 'royal') carregarImagem(PALETAS_PREMIUM[fundo].chapa, false);
  else if (fundo === 'gradiente') carregarImagem('/futty-logo-flat.webp', false);
  else carregarImagem('/stadium_bg.webp', false);
}

// BASE ESCURA partilhada: fonte de verdade única do gradiente vertical.
// O 'épico' constrói-se por cima dela; o 'neutro' é ela + vinheta, e nada mais. O neutro em preto puro
// (#000) destoava — os dois fundos partem do mesmo sítio e mudam só no que se lhes acrescenta.
function desenharBaseEscura(ctx, W, H) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#16161c');
  g.addColorStop(0.5, '#1d1d24');
  g.addColorStop(1, '#101014');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

// VINHETA partilhada (elíptica, só nas margens), pelo mesmo motivo.
function desenharVinheta(ctx, W, H) {
  ctx.save();
  ctx.translate(W / 2, H * 0.45);
  ctx.scale(1, H / W);
  const vin = ctx.createRadialGradient(0, 0, 0, 0, 0, W * 0.62);
  vin.addColorStop(0, 'rgba(20,12,0,0)');
  vin.addColorStop(0.6, 'rgba(20,12,0,0)');
  vin.addColorStop(1, 'rgba(20,12,0,0.55)');
  ctx.fillStyle = vin;
  ctx.fillRect(-W, -H, W * 2, H * 2);
  ctx.restore();
}

// Fundo "Neutro" — a base partilhada + vinheta. Sem honeycomb, sem F, sem luz radial.
export function desenharFundoNeutro(ctx, W, H) {
  desenharBaseEscura(ctx, W, H);
  desenharVinheta(ctx, W, H);
}

// Fundo "Aura" — réplica FIEL do glow SELADO da vitrine (variante A, app.css .perfil-glow):
// base escura da casa + aura dourada elíptica ATRÁS do jogador. Valores COPIADOS do palco
// selado (330×470; glow box 300×344; ellipse 50%×48% @ 50%,45%; stops .55/.24/.07/0 @
// 0/34/56/78%; blur 46) e só reescalados ao 2:3 do cromo. NÃO toca no palco selado.
// O glow desfocado é PRÉ-DESENHADO, uma vez por sessão.
//
// Medido no WebKit: o `ctx.filter = blur(56px)` a transferir o glow para um card
// de 600×600 custava 785 ms de thread principal, numa fatia só. Era a fase mais
// cara de todo o canvas.
//
// A solução vem da natureza do próprio desenho: o glow é uma elipse de gradiente
// radial DESFOCADA — ou seja, uma mancha suave, sem um único detalhe fino. Uma
// imagem dessas desenhada a 160 px e ampliada para 600 é indistinguível da
// desenhada a 600, porque não há lá nada que a ampliação possa borrar. E o
// desfoque custa área × raio: a 160 px, com o raio na mesma proporção, sai por
// ~2% do que custava.
//
// Fica em cache por PROPORÇÃO (o card 2:3 e o retrato quadrado têm caixas de
// glow diferentes), não por tamanho: como tudo no desenho escala com W, a mesma
// mancha serve qualquer resolução.
//
// A aura do CARD sai no DOBRO do tamanho e com 25% MENOS opacidade. A caixa do glow dobra
// (AURA_ESCALA) e cada parada do degradê sai com 3/4 do alpha (AURA_OPACIDADE) — a elipse continua centrada
// no mesmo ponto, só cresce e suaviza. O palco selado da vitrine (.perfil-glow) NÃO muda: é a aura do CARD
// que o dono pediu.
export const AURA_ESCALA = 2;
export const AURA_OPACIDADE = 0.75;
const LARGURA_GLOW = 160;
const glowAuraCache = new Map();

function glowAura(razaoCaixa) {
  const chave = razaoCaixa.toFixed(4);
  const guardado = glowAuraCache.get(chave);
  if (guardado) return guardado;
  const gw = LARGURA_GLOW;
  const gh = Math.max(2, Math.round(gw * razaoCaixa));
  const raio = gw * (46 / 300); // o mesmo 46/330 do card, agora em fracção da caixa
  // O desfoque sangra para fora da caixa: sem esta folga o glow saía com as
  // bordas cortadas a direito, que é um defeito visível.
  const folga = Math.ceil(raio * 3);
  const c = canvasAuxiliar(gw + folga * 2, gh + folga * 2);
  const octx = c.getContext('2d');
  octx.filter = `blur(${raio}px)`;
  octx.save();
  octx.translate(folga + gw * 0.5, folga + gh * 0.45); // centro da elipse @ 50%,45% do box
  octx.scale(gw * 0.5, gh * 0.48);                      // raios 50%×48% do box
  // Glow ×2 (mesmo desenho, dobra opacity/spread): alphas dobrados (clamp) e stops empurrados para fora (mais
  // alcance). Base seladas: .55/.24/.07 @ 0/34/56/78. Os alphas (0,95 / 0,48 / 0,16) saem vezes
  // AURA_OPACIDADE (0,75) — o dobro do tamanho vem da caixa, em desenharFundoAura.
  const g = octx.createRadialGradient(0, 0, 0, 0, 0, 1);
  g.addColorStop(0, `rgba(212,160,23,${(0.95 * AURA_OPACIDADE).toFixed(4)})`);
  g.addColorStop(0.40, `rgba(212,160,23,${(0.48 * AURA_OPACIDADE).toFixed(4)})`);
  g.addColorStop(0.64, `rgba(212,160,23,${(0.16 * AURA_OPACIDADE).toFixed(4)})`);
  g.addColorStop(0.92, 'rgba(212,160,23,0)');
  octx.fillStyle = g;
  octx.beginPath(); octx.arc(0, 0, 1, 0, Math.PI * 2); octx.fill();
  octx.restore();
  const pronto = { canvas: c, folgaFrac: folga / gw };
  glowAuraCache.set(chave, pronto);
  return pronto;
}

export function desenharFundoAura(ctx, W, H, ehQuadrado = false) {
  // a) base escura da casa (#050810), gradiente vertical subtil.
  const base = ctx.createLinearGradient(0, 0, 0, H);
  base.addColorStop(0, '#0a0a12');
  base.addColorStop(0.55, '#070812');
  base.addColorStop(1, '#050609');
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, W, H);

  // b) glow do tamanho do "glow box" (300/330 × 344/470 do palco), já desfocado — e no DOBRO (AURA_ESCALA): a
  // mancha sangra além do card, de propósito; o que sobra é cortado pelo próprio canvas.
  const gw = Math.max(2, Math.round(W * (300 / 330) * AURA_ESCALA));
  const gh = Math.max(2, Math.round(H * (344 / 470) * AURA_ESCALA));
  const { canvas: pronto, folgaFrac } = glowAura(gh / gw);
  // c) o centro do box senta a 44% (translate(-50%,-50%) top:44% do glow selado).
  const cy = (ehQuadrado ? 0.42 : 0.44) * H;
  const folga = folgaFrac * gw;
  ctx.drawImage(pronto, W * 0.5 - gw / 2 - folga, cy - gh / 2 - folga, gw + folga * 2, gh + folga * 2);
}

// Fundos PREMIUM em chapa foil (GOLDEN, ROYAL, ...) — MESMO pipeline partilhado
// (desenharFundoPremium), só muda a chapa/paleta. "mina encantada" aprovada (v5):
// chapa foil + poeira de diamante/cristal. LEI DO BRILHO DO CROMO: os glints
// vivem SÓ aqui, na camada do fundo, por isso ficam SEMPRE atrás do avatar (o
// passo AVATAR é desenhado depois). No PNG estático (download) os glints saem no
// PICO (frame mais rico) — a animação da mina vive no preview (overlay CSS em
// Figurinha), nunca por cima do jogador.
// GLINTS: [xFrac, yFrac, r(px@400)] — densos fora do centro (o avatar tapa o meio).
// Mesmas 14 posições para todas as chapas premium (a "mina" é a mesma; só a cor muda).
const PREMIUM_GLINTS = [
  [0.10, 0.12, 3.4], [0.23, 0.08, 2.4], [0.50, 0.06, 3.2], [0.72, 0.09, 2.4], [0.89, 0.14, 4.2],
  [0.07, 0.32, 3.2], [0.93, 0.37, 2.4], [0.11, 0.55, 2.4], [0.91, 0.60, 3.2],
  [0.14, 0.82, 3.2], [0.85, 0.85, 4.2], [0.50, 0.91, 3.2], [0.31, 0.19, 2.4], [0.70, 0.21, 3.2],
];
const PREMIUM_GLINTS_DISCRETO = [PREMIUM_GLINTS[2], PREMIUM_GLINTS[7], PREMIUM_GLINTS[10]];
// O GOLDEN FICA O ATUAL, com as estrelas e os brilhos (dono). As variantes A/B da prancha (ouro fosco /
// ouro escuro, brilho só nas bordas) foram descartadas e saíram do app; o PNG em FUT/DESIGN fica só como
// registro.

// Paletas dos fundos premium: chapa (asset em /public), base de fallback (caso a
// chapa falhe a carregar — nunca fica buraco) e as 3 cores do glint (centro/halo/cauda).
const PALETAS_PREMIUM = {
  golden: { chapa: '/golden-plate.jpg', base0: '#2a1c05', base1: '#140d02', glintHi: '255,252,236', glintMid: '255,236,188', glintLo: '255,220,150' },
  royal: { chapa: '/royal-plate.webp', base0: '#1c1030', base1: '#0c0818', glintHi: '238,230,255', glintMid: '196,166,255', glintLo: '139,92,246' },
};

// Um glint de diamante/cristal NO PICO: ponto redondo com halo + micro-cruz de 4 raios.
function desenharGlintPico(ctx, cx, cy, r, k, pal) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  // ponto + halo
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 1.9);
  g.addColorStop(0, `rgba(${pal.glintHi},0.95)`);
  g.addColorStop(0.34, `rgba(${pal.glintMid},0.6)`);
  g.addColorStop(1, `rgba(${pal.glintLo},0)`);
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(cx, cy, r * 1.9, 0, Math.PI * 2); ctx.fill();
  // micro-cruz (raios ~2.6× o diâmetro): 4 raios com centro brilhante (sempre branco —
  // é o flash da luz, não a cor da chapa).
  const L = r * 2.6 * 2; // meia-envergadura × 2 = raios 2.6× diâmetro
  const w = Math.max(0.7 * k, r * 0.22);
  const gh = ctx.createLinearGradient(cx - L, cy, cx + L, cy);
  gh.addColorStop(0, 'rgba(255,255,250,0)'); gh.addColorStop(0.5, 'rgba(255,255,250,0.9)'); gh.addColorStop(1, 'rgba(255,255,250,0)');
  ctx.fillStyle = gh; ctx.fillRect(cx - L, cy - w / 2, L * 2, w);
  const gv = ctx.createLinearGradient(cx, cy - L, cx, cy + L);
  gv.addColorStop(0, 'rgba(255,255,250,0)'); gv.addColorStop(0.5, 'rgba(255,255,250,0.9)'); gv.addColorStop(1, 'rgba(255,255,250,0)');
  ctx.fillStyle = gv; ctx.fillRect(cx - w / 2, cy - L, w, L * 2);
  ctx.restore();
}

// Desenha a chapa premium (cor = 'golden' | 'royal') + poeira de cristal. `glints`:
//  - 'pico' (default) — os 14 pontos, no pico. Usado no card completo (download):
//    é um keepsake estático, merece o frame mais rico.
//  - 'discreto' — 3 pontos fixos (densidade de repouso, como um still da "mina"
//    viva do studio). Usado no cromo do Início: é um OBJECTO estático (nunca em
//    camadas, nunca animado — ver Inicio.jsx), mas não pode copiar o pico do
//    download nem a vitrine do tile; esta é a densidade "a chapa como fica no
//    card real", nem apagada nem em exibição de montra.
//  - 'vitrine' — os 14 pontos, boost de tamanho. SÓ o tile do seletor de fundos:
//    é montra a propósito (ordem do dono), pode exagerar mais que o card real.
//  - false — nenhum (camada de fundo do PREVIEW da Figurinha; a "mina" vive num
//    overlay CSS animado ali, 2-4 acesos de cada vez).
export async function desenharFundoPremium(ctx, W, H, cor, { glints = 'pico', cron = null } = {}) {
  const pal = PALETAS_PREMIUM[cor];
  const k = W / 400;
  // base escura por baixo, caso a chapa falhe a carregar (nunca fica buraco).
  const base = ctx.createLinearGradient(0, 0, 0, H);
  base.addColorStop(0, pal.base0); base.addColorStop(1, pal.base1);
  ctx.fillStyle = base; ctx.fillRect(0, 0, W, H);
  // a) chapa foil (cover).
  const chapa = await carregarImagem(pal.chapa, false);
  cron?.marca('fundo:decodificar');
  if (chapa) {
    const s = Math.max(W / chapa.naturalWidth, H / chapa.naturalHeight);
    const dw = chapa.naturalWidth * s, dh = chapa.naturalHeight * s;
    ctx.drawImage(chapa, (W - dw) / 2, (H - dh) / 2, dw, dh);
  }
  cron?.marca('fundo:desenhar');
  // b) poeira de cristal.
  if (glints) {
    const pontos = glints === 'discreto' ? PREMIUM_GLINTS_DISCRETO : PREMIUM_GLINTS;
    const boost = glints === 'vitrine' ? 1.7 : 1;
    for (const [xf, yf, r] of pontos) desenharGlintPico(ctx, xf * W, yf * H, r * k * boost, k, pal);
    cron?.marca('glints');
  }
}
// Wrappers finos — GOLDEN (1º fundo premium) e ROYAL (o par de luxo, roxo #8b5cf6 +
// prata fria) só passam a cor; o pipeline é o mesmo, código partilhado.
export const desenharFundoGolden = (ctx, W, H, opts) => desenharFundoPremium(ctx, W, H, 'golden', opts);
export const desenharFundoRoyal = (ctx, W, H, opts) => desenharFundoPremium(ctx, W, H, 'royal', opts);

// Fundo "Estádio" — a fotografia do estádio em cover. Extraído para função (era
// um `else` solto dentro do construirCard) para poder ser cronometrado como os
// outros e partilhar o mesmo cache de imagem.
export async function desenharFundoEstadio(ctx, W, H, { ehQuadrado = false, cron = null } = {}) {
  const k = W / 400;
  const bg = await carregarImagem('/stadium_bg.webp', false);
  cron?.marca('fundo:decodificar');
  if (bg) {
    const scale = Math.max(W / bg.naturalWidth, H / bg.naturalHeight);
    const sw = bg.naturalWidth * scale;
    const sh = bg.naturalHeight * scale;
    // O card 2:3 tem o MESMO rácio do stadium_bg (832×1248 = 2:3) → cover exacto,
    // sem excedente, refletores no topo visíveis. O QUADRADO gera 300px de excedente
    // vertical; centrar (0.5) cortava os refletores. Ancora ao topo (corta só 0.22 do
    // excedente em cima, 0.78 em baixo) para os DOIS refletores ficarem atrás/ao lado
    // da cabeça — a relva perdida em baixo fica tapada pelo corpo do jogador.
    // Para o card, biasTopo=0.5 e o excedente é 0 → −(sh−H)·0.5 = (H−sh)/2, idêntico.
    const biasTopo = ehQuadrado ? 0.22 : 0.5;
    ctx.drawImage(bg, (W - sw) / 2, -(sh - H) * biasTopo, sw, sh);
  } else {
    const g = ctx.createRadialGradient(W / 2, 0, 40 * k, W / 2, 0, H);
    g.addColorStop(0, '#1b2433');
    g.addColorStop(0.7, '#0a0d14');
    g.addColorStop(1, '#05070b');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }
  cron?.marca('fundo:desenhar');
}

// Fundo "Épico" — honeycomb alinhado ao ângulo do F + monograma como marca de água,
// placa 3D (pseudo-perspectiva), luz central e vinheta. EXPORTADO para o tile da UI
// renderizar o FUNDO REAL em miniatura (em vez de uma imitação em CSS/SVG).
// Ordem: base → [hexágonos + F, DESFOCADOS] → luz central → vinheta.
//
// `intensidade` multiplica SÓ o alpha das arestas do honeycomb. O card usa 1 (a
// discrição desenhada); o tile de 120×120 usa 3.0, senão o padrão desaparece na
// miniatura — a mesma geometria, legível à escala a que é vista.
// O padrão do Épico é construído UMA vez por tamanho.
//
// Medido no WebKit: `epico:blur` custava 725 ms no card e 659 ms no cromo — a
// fase mais cara depois do Aura. E era refeita a cada composição, apesar de o
// desenho ser DETERMINÍSTICO (seed fixa 20240): o mesmo tamanho dá sempre
// exactamente os mesmos pixéis.
//
// Duas peças: o desfoque é por faixas (ver desfocarPorFaixas — o
// mesmo resultado, em fatias de poucos ms) e a camada pronta fica em cache. A
// segunda figurinha com fundo Épico não desenha um hexágono sequer.
//
// Três entradas chegam: o cromo do Início, o card do download e o tile do
// seletor de fundos. Cada uma é um canvas com alpha, por isso não se deixa
// crescer sem conta.
const MAX_PADROES = 3;
const epicoPadraoCache = new Map();

async function padraoEpico(W, H, intensidade, cron) {
  const chave = `${Math.round(W)}|${Math.round(H)}|${intensidade}`;
  const guardado = epicoPadraoCache.get(chave);
  if (guardado) {
    cron?.marca('epico:cache');
    return guardado;
  }
  const k = W / 400;
  const fLogo = await carregarImagem('/futty-logo-flat.webp', false);
  cron?.marca('fundo:decodificar');
  // Offscreen 25% MAIOR que o card: a pseudo-perspectiva (skew) desloca as bordas
  // e, sem esta folga, ficariam faixas sem padrão nos limites do card.
  const OW = Math.ceil(W * 1.25);
  const OH = Math.ceil(H * 1.25);
  const off = canvasAuxiliar(OW, OH);
  const octx = off.getContext('2d');
  octx.lineWidth = 1 * k;
  let seed = 20240;
  const rnd = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  // Hexágonos "pointy-top": diagonal (vértice a vértice) = W*0.32 = 2R.
  const R = (W * 0.32) / 2;
  const passoX = Math.sqrt(3) * R;
  const passoY = 1.5 * R;
  // ROTAÇÃO: ANGULO_F = 14.52° — medido na haste principal do F de futty-logo-flat.png.
  const ANGULO_F = (14.52 * Math.PI) / 180;
  const alvoY = H / 3 - H / 2; // alinhamento fino ao terço superior
  octx.save();
  octx.translate(OW / 2, OH / 2);
  octx.rotate(ANGULO_F);
  octx.translate(0, alvoY + R);
  const M = Math.hypot(OW, OH) / 2 + 2 * R;
  // Este laço é o passo caro do Épico: milhares de `stroke()`. E o WebKit não os
  // desenha quando os pede — grava-os numa lista e rasteriza tudo de uma vez
  // quando alguém lhe pede os pixéis. Por isso respirar sozinho não chegava: o
  // laço ficava rápido e a conta inteira (367 ms, medidos) caía depois, na
  // transferência, numa fatia só.
  //
  // O `getImageData` de 1 pixel obriga a rasterizar o que está pendente. A cada
  // 4 linhas, isso paga o desenho daquelas 4 linhas ali mesmo, e o `respirar` a
  // seguir devolve a tela ao browser. Como o resultado fica em cache, isto
  // acontece UMA vez por tamanho, não a cada figurinha.
  const LINHAS_POR_FATIA = 4;
  let desdeORespiro = 0;
  let maiorFatia = 0;
  let fatiaAbriu = performance.now();
  for (let row = -Math.ceil(M / passoY); row * passoY <= M; row++) {
    desdeORespiro += 1;
    if (desdeORespiro >= LINHAS_POR_FATIA) {
      desdeORespiro = 0;
      octx.getImageData(0, 0, 1, 1);
      maiorFatia = Math.max(maiorFatia, performance.now() - fatiaAbriu);
      // O estado do contexto é do canvas, não da pilha de chamadas: o save/
      // translate/rotate feitos acima sobrevivem ao await.
      await respirar();
      fatiaAbriu = performance.now();
    }
    for (let col = -Math.ceil(M / passoX); col * passoX <= M; col++) {
      const cx = col * passoX + (Math.abs(row % 2) ? passoX / 2 : 0);
      const cy = row * passoY;
      octx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (Math.PI / 3) * i - Math.PI / 2;
        const px = cx + R * Math.cos(a);
        const py = cy + R * Math.sin(a);
        if (i === 0) octx.moveTo(px, py);
        else octx.lineTo(px, py);
      }
      octx.closePath();
      // Arestas passivas DOURADAS (o dourado sobre esta base tem menos contraste que o branco, daí o alpha
      // mais alto). As "vivas" são 12% das células. `intensidade` só existe para o tile (ver assinatura).
      const aPassiva = 0.065 * intensidade;
      const aViva = 0.115 * intensidade;
      octx.strokeStyle = rnd() < 0.12
        ? `rgba(212,160,23,${Math.min(aViva, 1)})`
        : `rgba(212,160,23,${Math.min(aPassiva, 1)})`;
      octx.stroke();
      // Monograma F: contra-rodado → haste PARALELA às linhas da grelha.
      if (fLogo && rnd() < 0.08) {
        const s = 2 * R * 0.6;
        octx.save();
        octx.translate(cx, cy);
        octx.rotate(-ANGULO_F);
        octx.globalAlpha = 0.03;
        octx.drawImage(fLogo, -s / 2, -s / 2, s, s);
        octx.restore();
      }
    }
  }
  octx.restore();
  octx.getImageData(0, 0, 1, 1); // fecha a última fatia antes de medir
  maiorFatia = Math.max(maiorFatia, performance.now() - fatiaAbriu);
  cron?.marca('epico:favos');
  cron?.anotar('epico:maiorFatia', maiorFatia);

  // Transfere para a camada final: blur + PSEUDO-PERSPECTIVA (canto sup-direito
  // "para trás"), pivô no centro. O desfoque fica numa chamada só — medido a
  // 1 ms no WebKit (ver a nota sobre o que é caro, no topo do ficheiro).
  const camada = canvasAuxiliar(W, H);
  const cctx = camada.getContext('2d');
  cctx.filter = `blur(${1.2 * k}px)`;
  cctx.translate(W / 2, H / 2);
  // Pseudo-perspectiva assumida: skews b = -0.085 e c = 0.07. A ROTAÇÃO do padrão fica nos 14.52° do
  // futty-logo-flat.png — a fonte canónica. Medi fresco o F do kit fotografado e deu 15.52°, mas o Δ de 1° é
  // ruído: o logo no kit tem 51x61px, está impresso em tecido curvo e com sombra. Um
  // grau, num padrão com blur 1.2px e alpha 0.065, ninguém vê — e alinhar a marca pela
  // fotografia do produto em vez do vector seria ancorá-la no derivado.
  cctx.transform(1.02, -0.085, 0.07, 0.98, 0, 0);
  cctx.drawImage(off, -OW / 2, -OH / 2);
  cron?.marca('epico:blur');

  if (epicoPadraoCache.size >= MAX_PADROES) {
    epicoPadraoCache.delete(epicoPadraoCache.keys().next().value);
  }
  epicoPadraoCache.set(chave, camada);
  return camada;
}

export async function desenharFundoEpico(ctx, W, H, { intensidade = 1, cron = null } = {}) {
  // a) Base: vertical muito escuro, quase monocromático (nítida).
  desenharBaseEscura(ctx, W, H);

  // b) PADRÃO desfocado (só ele desfoca; base, luz e vinheta ficam nítidas).
  ctx.drawImage(await padraoEpico(W, H, intensidade, cron), 0, 0);

  // c) Luz radial central suave atrás do peito/rosto.
  const luz = ctx.createRadialGradient(W / 2, H * 0.38, 0, W / 2, H * 0.38, H * 0.5);
  luz.addColorStop(0, 'rgba(255,255,255,0.05)');
  luz.addColorStop(0.55, 'rgba(255,255,255,0)');
  luz.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = luz;
  ctx.fillRect(0, 0, W, H);

  // d) Vinheta — a partilhada com o neutro (ver desenharVinheta).
  desenharVinheta(ctx, W, H);
  cron?.marca('fundo:desenhar');
}

export { adiantarFundo };
