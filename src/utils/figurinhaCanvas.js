// Futty v2.0 — Geração da figurinha (PNG via canvas). Card 2:3 (base 400×600) e
// versão Story 9:16 (1080×1920) para o Instagram. Tudo no cliente, sem servidor.
import { urlAsset, nomeJogador, gradienteAvatar } from './avatar';
import { getFrameColor } from './frameColors';

// Carrega uma imagem; devolve null se falhar (evita tainting do canvas).
function carregarImagem(src, crossOrigin) {
  return new Promise((resolve) => {
    if (!src) return resolve(null);
    const img = new Image();
    if (crossOrigin) img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img.naturalWidth > 0 ? img : null);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function canvasParaBlob(canvas) {
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), 'image/png'));
}

// Desenha o card 2:3 num canvas próprio (largura×altura). `k` escala os valores
// fixos (fontes, badge, frame) para render nativo a qualquer resolução.
async function construirCard({ largura = 400, altura = 600, jogador = {}, fundo = 'estadio', corFrame = 'dourado', fotoOverride = null, avatarZoom = 1, incluirAvatar = true, apenasAvatar = false }) {
  const W = largura;
  const H = altura;
  const k = largura / 400;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingQuality = 'high';

  // Garante que a Rajdhani está carregada antes de medir/desenhar texto.
  if (document.fonts?.ready) {
    try { await document.fonts.ready; } catch { /* ignora */ }
  }

  // Octógono partilhado (fonte de verdade do recorte e do frame). m = inset.
  const cut = 32 * k;
  const octagono = (m = 0) => {
    ctx.beginPath();
    ctx.moveTo(m + cut, m);
    ctx.lineTo(W - m - cut, m);
    ctx.lineTo(W - m, m + cut);
    ctx.lineTo(W - m, H - m - cut);
    ctx.lineTo(W - m - cut, H - m);
    ctx.lineTo(m + cut, H - m);
    ctx.lineTo(m, H - m - cut);
    ctx.lineTo(m, m + cut);
    ctx.closePath();
  };

  // RECORTE OCTOGONAL do CONTEÚDO (num save/restore): fundo, avatar, nome e
  // gradientes ficam dentro do octógono → cantos TRANSPARENTES. O restore antes do
  // FRAME permite às faíscas serem desenhadas FORA do octógono, por cima.
  ctx.save();
  octagono(0);
  ctx.clip();

  // Avatar (carregado uma vez; usado tanto no card completo como na camada só-avatar).
  const nome = nomeJogador(jogador);
  const avatarUrl = fotoOverride || (jogador?.avatar_url ? urlAsset(jogador.avatar_url) : null);
  const ehAbsoluto = avatarUrl && /^https?:\/\//i.test(avatarUrl);
  const avatar = avatarUrl ? await carregarImagem(avatarUrl, ehAbsoluto) : null;

  // Desenha o avatar real com enquadramento/zoom/posição fixos + fade suave na base.
  const desenharAvatar = () => {
    const boxW = W * 0.80;
    const boxH = H * 0.80;
    const scale = Math.min(boxW / avatar.naturalWidth, boxH / avatar.naturalHeight) * avatarZoom;
    const dw = avatar.naturalWidth * scale;
    const dh = avatar.naturalHeight * scale;
    const dx = (W - dw) / 2;
    // Topo do avatar a 12% da altura — o corpo mostra-se mais.
    const dy = H * 0.12;

    // Limite do avatar (fonte única): clip de segurança + âncora do fade.
    // Definido pela GEOMETRIA DO NOME — o dissolve completa-se 6px ACIMA do topo
    // das maiúsculas, garantindo ZERO pixels do avatar sobre o texto. (O nome usa
    // baseline nomeY = H - 38*k e fonte 56*k.)
    const nomeTopo = (H - 38 * k) - 52 * k; // baseline − altura da fonte (52*k)
    const limiteAvatar = nomeTopo - 2 * k; // margem de respiro apertada (+corpo)

    // Fade na base num canvas OFFSCREEN (máscara destination-out). ANCORO o fade
    // à linha do limite (em coords do offscreen) — a imagem chega já transparente
    // ao limite e derrete no gradiente, em vez de cortar.
    const off = document.createElement('canvas');
    off.width = Math.ceil(dw);
    off.height = Math.ceil(dh);
    const offCtx = off.getContext('2d');
    offCtx.imageSmoothingQuality = 'high';
    offCtx.drawImage(avatar, 0, 0, dw, dh);
    // O fade chega a 0 alpha 10px ANTES da linha do clip → o clip nunca corta
    // pixels visíveis (a linha desaparece). Dissolve longo (64px) com ease-in.
    const fadeEnd = Math.min(dh, (limiteAvatar - dy) - 10 * k);
    const fadeStart = Math.max(0, fadeEnd - 64 * k);
    offCtx.globalCompositeOperation = 'destination-out';
    const fade = offCtx.createLinearGradient(0, fadeStart, 0, fadeEnd);
    fade.addColorStop(0, 'rgba(0,0,0,0)'); // opaco
    fade.addColorStop(0.5, 'rgba(0,0,0,0.35)'); // curva ease-in (não linear)
    fade.addColorStop(1, 'rgba(0,0,0,1)'); // totalmente transparente antes do corte
    offCtx.fillStyle = fade;
    // Preenche até à BASE do offscreen: abaixo de fadeEnd o gradiente fica no
    // último stop (alpha 1) → tudo o que está abaixo do fade é removido. Sem isto,
    // o corpo abaixo de fadeEnd ficaria opaco e o clip voltaria a cortar em linha.
    offCtx.fillRect(0, fadeStart, off.width, off.height - fadeStart);
    offCtx.globalCompositeOperation = 'source-over';

    // Clip no limite = guarda de segurança (zoom alto). O fade acontece antes e
    // já chega a 0 antes do limite, por isso o corte não é visível.
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, W, limiteAvatar);
    ctx.clip();
    ctx.shadowColor = 'rgba(0,0,0,0.9)';
    ctx.shadowBlur = 24 * k;
    ctx.shadowOffsetY = 4 * k;
    ctx.shadowOffsetX = 0;
    ctx.drawImage(off, dx, dy, dw, dh);
    ctx.restore();
  };

  // MODO CAMADA SÓ-AVATAR: canvas transparente, desenha só o avatar real.
  if (apenasAvatar) {
    if (avatar) desenharAvatar();
    ctx.restore();
    return canvas;
  }

  // 1. FUNDO
  if (fundo === 'preto') {
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, W, H);
  } else if (fundo === 'gradiente') {
    const g = ctx.createRadialGradient(W / 2, H * 0.45, 40 * k, W / 2, H * 0.45, H * 0.7);
    g.addColorStop(0, '#3d2f0a');
    g.addColorStop(0.55, '#141004');
    g.addColorStop(1, '#000000');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  } else {
    const bg = await carregarImagem('/stadium_bg.png', false);
    if (bg) {
      const scale = Math.max(W / bg.naturalWidth, H / bg.naturalHeight);
      const sw = bg.naturalWidth * scale;
      const sh = bg.naturalHeight * scale;
      ctx.drawImage(bg, (W - sw) / 2, (H - sh) / 2, sw, sh);
    } else {
      const g = ctx.createRadialGradient(W / 2, 0, 40 * k, W / 2, 0, H);
      g.addColorStop(0, '#1b2433');
      g.addColorStop(0.7, '#0a0d14');
      g.addColorStop(1, '#05070b');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
    }
  }

  // 2. HOLOFOTES
  for (const cx of [W * 0.25, W * 0.75]) {
    const g = ctx.createRadialGradient(cx, 0, 0, cx, 0, W * 0.5);
    g.addColorStop(0, 'rgba(255,255,220,0.12)');
    g.addColorStop(1, 'rgba(255,255,220,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }

  // 3. AVATAR — o avatar real só entra se incluirAvatar (na camada de fundo é
  // omitido, para o jogador ficar numa camada separada por cima das partículas).
  // As iniciais de fallback (sem avatar) ficam sempre na base.
  if (avatar) {
    if (incluirAvatar) desenharAvatar();
  } else {
    const { a, b } = gradienteAvatar(nome);
    const grd = ctx.createLinearGradient(0, H * 0.3, 0, H);
    grd.addColorStop(0, a);
    grd.addColorStop(1, b);
    ctx.fillStyle = grd;
    ctx.fillRect(0, H * 0.3, W, H * 0.7);
    ctx.font = `bold ${72 * k}px Rajdhani, sans-serif`;
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(nome.slice(0, 2).toUpperCase(), W / 2, H * 0.62);
  }

  // 4. GRADIENTE INFERIOR (depois do avatar → garante legibilidade do nome).
  // Reforçado (início H*0.74, stop 0.94) para compensar o corpo mais presente
  // atrás do nome, que agora desce até rente ao texto.
  const gb = ctx.createLinearGradient(0, H * 0.74, 0, H);
  gb.addColorStop(0, 'rgba(0,0,0,0)');
  gb.addColorStop(1, 'rgba(0,0,0,0.94)');
  ctx.fillStyle = gb;
  ctx.fillRect(0, H * 0.74, W, H * 0.26);

  // 5. NOME — sempre desenhado. Palco total, ocupa o espaço das antigas stats.
  {
    const nomeY = H - 38 * k;
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.font = `700 ${52 * k}px 'Rajdhani', system-ui, sans-serif`;
    ctx.letterSpacing = `${3 * k}px`;
    let nomeUpper = String(nome).toUpperCase();
    while (ctx.measureText(nomeUpper).width > W - 40 * k && nomeUpper.length > 3) nomeUpper = nomeUpper.slice(0, -1);
    // Contorno escuro duro para separar do fundo.
    ctx.lineWidth = 6 * k;
    ctx.strokeStyle = 'rgba(0,0,0,0.85)';
    ctx.lineJoin = 'round';
    ctx.strokeText(nomeUpper, W / 2, nomeY);
    // 1º passe: branco com glow dourado quente.
    ctx.shadowColor = 'rgba(212,160,23,0.85)';
    ctx.shadowBlur = 24 * k;
    ctx.shadowOffsetY = 0;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(nomeUpper, W / 2, nomeY);
    // 2º passe: shimmer dourado estático (branco→dourado→branco) sem sombra.
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    const tg = ctx.createLinearGradient(W * 0.2, 0, W * 0.8, 0);
    tg.addColorStop(0, '#ffffff');
    tg.addColorStop(0.5, '#f5e070');
    tg.addColorStop(1, '#ffffff');
    ctx.fillStyle = tg;
    ctx.fillText(nomeUpper, W / 2, nomeY);
    ctx.letterSpacing = '0px';
    ctx.restore();
  }

  // Fim do conteúdo recortado → remove o clip octogonal. O frame já é inset e as
  // faíscas ficam soltas por cima, sem recorte.
  ctx.restore();

  // 6. FRAME OCTOGONAL "linha dupla" — corpo dourado CONTÍNUO (7*k, gradiente) +
  // linha interna fina (1.2*k, #f5e070) que abre um travessão centrado em cada canto.
  const fc = getFrameColor(corFrame);
  const ehDourado = corFrame === 'dourado';
  const d = 3.5 * k; // inset do corpo (metade da largura do traço)

  // a) Corpo dourado contínuo (não mexer).
  octagono(d);
  ctx.lineJoin = 'miter';
  ctx.miterLimit = 10;
  if (ehDourado) {
    const fg = ctx.createLinearGradient(0, 0, W, H);
    fg.addColorStop(0, '#f7e08a');
    fg.addColorStop(0.3, '#c8940f');
    fg.addColorStop(0.55, '#f5d060');
    fg.addColorStop(0.8, '#8a6508');
    fg.addColorStop(1, '#e8c04a');
    ctx.strokeStyle = fg;
  } else {
    ctx.strokeStyle = fc.stroke;
  }
  ctx.lineWidth = 7 * k;
  ctx.stroke();

  // b) LINHA INTERNA FINA — 1.2*k, #f5e070. Contínua nos 4 lados; em CADA uma das 4
  // diagonais de corte abre um travessão (interrupção) de 8*k EXACTAMENTE centrado.
  // Por segmentos explícitos (sem setLineDash), com pontos por interpolação linear.
  const mi = 8.5 * k; // inset da linha interna (segunda linha do "duplo")
  const V = [
    [mi + cut, mi], // V0 topo-esq
    [W - mi - cut, mi], // V1 topo-dir
    [W - mi, mi + cut], // V2
    [W - mi, H - mi - cut], // V3
    [W - mi - cut, H - mi], // V4
    [mi + cut, H - mi], // V5
    [mi, H - mi - cut], // V6
    [mi, mi + cut], // V7
  ];
  // Arestas [i, j, ehDiagonal]: 4 lados rectos (contínuos) + 4 diagonais (com travessão).
  const arestas = [
    [0, 1, false], [1, 2, true], [2, 3, false], [3, 4, true],
    [4, 5, false], [5, 6, true], [6, 7, false], [7, 0, true],
  ];
  const lerp = (p, q, t) => [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t];
  const seg = (p, q) => { ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]); ctx.stroke(); };
  ctx.strokeStyle = '#f5e070';
  ctx.lineWidth = 1.2 * k;
  ctx.lineCap = 'butt';
  ctx.lineJoin = 'miter';
  for (const [i, j, diag] of arestas) {
    const P = V[i];
    const Q = V[j];
    if (!diag) { seg(P, Q); continue; }
    const L = Math.hypot(Q[0] - P[0], Q[1] - P[1]); // comprimento da diagonal (= cut*√2)
    const half = (4 * k) / L; // metade do travessão de 8*k, em t
    seg(P, lerp(P, Q, 0.5 - half));
    seg(lerp(P, Q, 0.5 + half), Q);
  }

  // Losangos dos cantos (quadrado rodado 45°): exterior + interior menor.
  const losOuter = ehDourado ? '#d4a017' : fc.stroke;
  const losInner = ehDourado ? '#f5e070' : fc.dot;
  // r = meia-diagonal = lado/√2 (lado 7*k exterior, 3.5*k interior).
  const rOut = (7 * k) / Math.SQRT2;
  const rIn = (3.5 * k) / Math.SQRT2;
  const losango = (cx, cy, r, cor) => {
    ctx.fillStyle = cor;
    ctx.beginPath();
    ctx.moveTo(cx, cy - r); // cima
    ctx.lineTo(cx + r, cy); // direita
    ctx.lineTo(cx, cy + r); // baixo
    ctx.lineTo(cx - r, cy); // esquerda
    ctx.closePath();
    ctx.fill();
  };
  for (const [cx, cy] of [[19 * k, 19 * k], [W - 19 * k, 19 * k], [19 * k, H - 19 * k], [W - 19 * k, H - 19 * k]]) {
    losango(cx, cy, rOut, losOuter);
    losango(cx, cy, rIn, losInner);
  }

  return canvas;
}

// Figurinha normal: card 2:3 a 400×600 → PNG completo (com jogador). Usado no
// Baixar/Compartilhar (uma imagem só).
export async function gerarFigurinhaCanvas(opts = {}) {
  const canvas = await construirCard({ ...opts, largura: 400, altura: 600 });
  return canvasParaBlob(canvas);
}

// Duas camadas para o preview do studio: o fundo (card completo SEM avatar) e o
// jogador (só o avatar transparente). Permite meter partículas ENTRE eles.
export async function gerarCamadasFigurinha(opts = {}) {
  const [fundoCanvas, jogadorCanvas] = await Promise.all([
    construirCard({ ...opts, largura: 400, altura: 600, incluirAvatar: false }),
    construirCard({ ...opts, largura: 400, altura: 600, apenasAvatar: true }),
  ]);
  const [fundoBlob, jogadorBlob] = await Promise.all([
    canvasParaBlob(fundoCanvas),
    canvasParaBlob(jogadorCanvas),
  ]);
  return { fundoBlob, jogadorBlob };
}
