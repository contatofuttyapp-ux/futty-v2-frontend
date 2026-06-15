// Futty v2.0 — Geração da figurinha (PNG via canvas). Card 2:3 (base 400×600) e
// versão Story 9:16 (1080×1920) para o Instagram. Tudo no cliente, sem servidor.
import { urlAsset, nomeJogador, iniciaisJogador, gradienteAvatar } from './avatar';
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

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function canvasParaBlob(canvas) {
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), 'image/png'));
}

// Desenha o card 2:3 num canvas próprio (largura×altura). `k` escala os valores
// fixos (fontes, badge, frame) para render nativo a qualquer resolução.
async function construirCard({ largura = 400, altura = 600, jogador = {}, stats = {}, fundo = 'estadio', corFrame = 'dourado', mostrarStats = true, mostrarNome = true, fotoOverride = null, corUniforme = null }) {
  const W = largura;
  const H = altura;
  const k = largura / 400;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingQuality = 'high';

  // 1. FUNDO
  if (fundo === 'preto') {
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, W, H);
  } else if (fundo === 'gradiente') {
    const g = ctx.createRadialGradient(W / 2, H * 0.45, 40 * k, W / 2, H * 0.45, H * 0.7);
    g.addColorStop(0, '#0c3a26');
    g.addColorStop(0.55, '#061410');
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

  // 3. AVATAR (ou iniciais). fotoOverride (preview local) tem prioridade.
  const nome = nomeJogador(jogador);
  const avatarUrl = fotoOverride || (jogador?.avatar_url ? urlAsset(jogador.avatar_url) : null);
  const ehAbsoluto = avatarUrl && /^https?:\/\//i.test(avatarUrl);
  const avatar = avatarUrl ? await carregarImagem(avatarUrl, ehAbsoluto) : null;
  if (avatar) {
    const boxW = W * 0.85;
    const boxH = H * 0.78;
    const scale = Math.min(boxW / avatar.naturalWidth, boxH / avatar.naturalHeight);
    const dw = avatar.naturalWidth * scale;
    const dh = avatar.naturalHeight * scale;
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.9)';
    ctx.shadowBlur = 24 * k;
    ctx.shadowOffsetY = 4 * k;
    ctx.drawImage(avatar, (W - dw) / 2, H - boxH, dw, dh); // alinhado ao topo da área inferior
    ctx.restore();
  } else {
    // Sem foto → avatar de iniciais: gradiente determinístico + iniciais.
    const { a, b } = gradienteAvatar(nome);
    const g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, a);
    g.addColorStop(1, b);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.font = `700 ${W * 0.45}px 'Rajdhani', system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 12 * k;
    ctx.shadowOffsetY = 2 * k;
    ctx.fillText(iniciaisJogador(nome), W / 2, H / 2);
    ctx.restore();
  }

  // 3b. UNIFORME (overlay suave de cor sobre a zona do avatar)
  if (corUniforme) {
    ctx.save();
    ctx.globalAlpha = 0.28;
    ctx.fillStyle = corUniforme;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  // 4. GRADIENTE INFERIOR
  const gb = ctx.createLinearGradient(0, H * 0.65, 0, H);
  gb.addColorStop(0, 'rgba(0,0,0,0)');
  gb.addColorStop(1, 'rgba(0,0,0,0.88)');
  ctx.fillStyle = gb;
  ctx.fillRect(0, H * 0.65, W, H * 0.35);

  const nota = Number.isFinite(stats?.nota) ? Number(stats.nota).toFixed(1) : '--';

  // 5. NOME (opcional)
  if (mostrarNome) {
    const nomeY = mostrarStats ? H - 54 * k : H - 32 * k;
    ctx.save();
    ctx.shadowColor = 'rgba(139,92,246,0.5)';
    ctx.shadowBlur = 24 * k;
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.font = `900 ${38 * k}px system-ui, "Segoe UI", sans-serif`;
    let nomeUpper = String(nome).toUpperCase();
    while (ctx.measureText(nomeUpper).width > W - 40 * k && nomeUpper.length > 3) nomeUpper = nomeUpper.slice(0, -1);
    ctx.fillText(nomeUpper, W / 2, nomeY);
    ctx.restore();
  }

  // 6. STATS (opcional)
  if (mostrarStats) {
    ctx.font = `800 ${18 * k}px system-ui, "Segoe UI", sans-serif`;
    ctx.textBaseline = 'alphabetic';
    const partes = [
      ['#d4a017', nota],
      ['rgba(255,255,255,0.45)', '·'],
      ['#ffffff', `${stats?.jogos ?? 0}J`],
      ['rgba(255,255,255,0.45)', '·'],
      ['#ffffff', `${stats?.gols ?? 0}G`],
    ];
    const gap = 8 * k;
    const widths = partes.map(([, t]) => ctx.measureText(t).width);
    const total = widths.reduce((a, b) => a + b, 0) + gap * (partes.length - 1);
    let x = W / 2 - total / 2;
    const y = H - 26 * k;
    ctx.textAlign = 'left';
    for (let i = 0; i < partes.length; i += 1) {
      ctx.fillStyle = partes[i][0];
      ctx.fillText(partes[i][1], x, y);
      x += widths[i] + gap;
    }
  }

  // 7. BADGE NOTA (canto sup. esq.)
  const bx = 14 * k;
  const by = 14 * k;
  const bw = 58 * k;
  const bh = 44 * k;
  const badgeCor = getFrameColor(corFrame).stroke;
  ctx.fillStyle = 'rgba(0,0,0,0.65)';
  roundRect(ctx, bx, by, bw, bh, 8 * k);
  ctx.fill();
  ctx.strokeStyle = badgeCor;
  ctx.lineWidth = 1 * k;
  roundRect(ctx, bx, by, bw, bh, 8 * k);
  ctx.stroke();
  ctx.fillStyle = badgeCor;
  ctx.font = `900 ${26 * k}px system-ui, "Segoe UI", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(nota, bx + bw / 2, by + 18 * k);
  ctx.fillStyle = '#9aa0aa';
  ctx.font = `800 ${9 * k}px system-ui, "Segoe UI", sans-serif`;
  ctx.fillText('NOTA', bx + bw / 2, by + 34 * k);

  // 8. FRAME COM CANTOS CORTADOS
  const cut = 28 * k;
  ctx.beginPath();
  ctx.moveTo(cut, 0);
  ctx.lineTo(0, cut);
  ctx.lineTo(0, H - cut);
  ctx.lineTo(cut, H);
  ctx.lineTo(W - cut, H);
  ctx.lineTo(W, H - cut);
  ctx.lineTo(W, cut);
  ctx.lineTo(W - cut, 0);
  ctx.closePath();
  const fc = getFrameColor(corFrame);
  const ehDourado = corFrame === 'dourado';
  if (ehDourado) {
    const fg = ctx.createLinearGradient(0, 0, W, H);
    fg.addColorStop(0, '#f0d060');
    fg.addColorStop(0.35, '#d4a017');
    fg.addColorStop(0.7, '#f5e070');
    fg.addColorStop(1, '#b8860b');
    ctx.strokeStyle = fg;
  } else {
    ctx.strokeStyle = fc.stroke;
  }
  ctx.lineWidth = 4 * k;
  ctx.stroke();

  const dotOuter = ehDourado ? '#d4a017' : fc.stroke;
  const dotInner = ehDourado ? '#f5e070' : fc.dot;
  for (const [cx, cy] of [[16 * k, 16 * k], [W - 16 * k, 16 * k], [16 * k, H - 16 * k], [W - 16 * k, H - 16 * k]]) {
    ctx.fillStyle = dotOuter;
    ctx.beginPath();
    ctx.arc(cx, cy, 5 * k, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = dotInner;
    ctx.beginPath();
    ctx.arc(cx, cy, 2.5 * k, 0, Math.PI * 2);
    ctx.fill();
  }

  return canvas;
}

// Figurinha normal: card 2:3 a 400×600 → PNG.
export async function gerarFigurinhaCanvas(opts = {}) {
  const canvas = await construirCard({ ...opts, largura: 400, altura: 600 });
  return canvasParaBlob(canvas);
}

// Versão 9:16 (1080×1920) para Instagram Stories. Opção B: #050810 + glow
// radial dourado/roxo; card 2:3 (720×1080) centrado, wordmark e futty.app.
export async function gerarFigurinhaCanvasStory(opts = {}) {
  const SW = 1080;
  const SH = 1920;
  const canvas = document.createElement('canvas');
  canvas.width = SW;
  canvas.height = SH;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingQuality = 'high';

  // Fundo base + glow radial dourado (topo) e roxo (fundo), opacidade baixa.
  ctx.fillStyle = '#050810';
  ctx.fillRect(0, 0, SW, SH);
  const gOuro = ctx.createRadialGradient(SW * 0.5, SH * 0.28, 0, SW * 0.5, SH * 0.28, SW * 0.95);
  gOuro.addColorStop(0, 'rgba(212,160,23,0.25)');
  gOuro.addColorStop(1, 'rgba(212,160,23,0)');
  ctx.fillStyle = gOuro;
  ctx.fillRect(0, 0, SW, SH);
  const gRoxo = ctx.createRadialGradient(SW * 0.5, SH * 0.74, 0, SW * 0.5, SH * 0.74, SW * 0.95);
  gRoxo.addColorStop(0, 'rgba(139,92,246,0.25)');
  gRoxo.addColorStop(1, 'rgba(139,92,246,0)');
  ctx.fillStyle = gRoxo;
  ctx.fillRect(0, 0, SW, SH);

  // Card 2:3 (720×1080), centrado horizontalmente, ~40px acima do centro.
  const cardW = 720;
  const cardH = 1080;
  const cx = (SW - cardW) / 2;
  const cy = (SH - cardH) / 2 - 40;
  const card = await construirCard({ ...opts, largura: cardW, altura: cardH });
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.6)';
  ctx.shadowBlur = 60;
  ctx.shadowOffsetY = 20;
  ctx.drawImage(card, cx, cy, cardW, cardH);
  ctx.restore();

  // Garante que a Rajdhani está carregada antes de desenhar texto.
  if (document.fonts?.ready) {
    try { await document.fonts.ready; } catch { /* ignora */ }
  }

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Wordmark "FUTTY" no topo.
  ctx.fillStyle = '#ffffff';
  ctx.font = "700 120px 'Rajdhani', system-ui, sans-serif";
  ctx.letterSpacing = '14px';
  ctx.fillText('FUTTY', SW / 2, 200);

  // "futty.app" em baixo, discreto.
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.font = "600 42px 'Rajdhani', system-ui, sans-serif";
  ctx.letterSpacing = '5px';
  ctx.fillText('futty.app', SW / 2, SH - 150);
  ctx.letterSpacing = '0px';

  return canvasParaBlob(canvas);
}
