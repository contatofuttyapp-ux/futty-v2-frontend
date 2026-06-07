// Futty v2.0 — Geração da figurinha (PNG via canvas), 400×600 (2:3).
// Replica o visual do PlayerCard. Tudo no cliente, sem servidor.
import { urlAsset, iniciaisNome, nomeJogador } from './avatar';
import { getFrameColor } from './frameColors';

const W = 400;
const H = 600;
const COR_HEX = { preto: '#1a1a1a', verde: '#8b5cf6', azul: '#3b82f6', vermelho: '#ef4444', amarelo: '#f59e0b', cinzento: '#888888' };

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

export async function gerarFigurinhaCanvas({ jogador = {}, stats = {}, fundo = 'estadio', corFrame = 'dourado', mostrarStats = true, mostrarNome = true }) {
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
    const g = ctx.createRadialGradient(W / 2, H * 0.45, 40, W / 2, H * 0.45, H * 0.7);
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
      const g = ctx.createRadialGradient(W / 2, 0, 40, W / 2, 0, H);
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

  // 3. AVATAR (ou iniciais)
  const nome = nomeJogador(jogador);
  const avatarUrl = jogador?.avatar_url ? urlAsset(jogador.avatar_url) : null;
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
    ctx.shadowBlur = 24;
    ctx.shadowOffsetY = 4;
    ctx.drawImage(avatar, (W - dw) / 2, H - boxH, dw, dh); // alinhado ao topo da área inferior
    ctx.restore();
  } else {
    const corBg = COR_HEX[jogador?.cor_preferida] || '#15151a';
    const cx = W / 2;
    const cy = H * 0.6;
    const r = W * 0.32;
    const g = ctx.createRadialGradient(cx, cy - 20, 10, cx, cy, r);
    g.addColorStop(0, corBg);
    g.addColorStop(1, 'rgba(0,0,0,0.2)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 90px system-ui, "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(iniciaisNome(nome), cx, cy);
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
    const nomeY = mostrarStats ? H - 54 : H - 32;
    ctx.save();
    ctx.shadowColor = 'rgba(139,92,246,0.5)';
    ctx.shadowBlur = 24;
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.font = '900 38px system-ui, "Segoe UI", sans-serif';
    let nomeUpper = String(nome).toUpperCase();
    while (ctx.measureText(nomeUpper).width > W - 40 && nomeUpper.length > 3) nomeUpper = nomeUpper.slice(0, -1);
    ctx.fillText(nomeUpper, W / 2, nomeY);
    ctx.restore();
  }

  // 6. STATS (opcional)
  if (mostrarStats) {
    ctx.font = '800 18px system-ui, "Segoe UI", sans-serif';
    ctx.textBaseline = 'alphabetic';
    const partes = [
      ['#d4a017', nota],
      ['rgba(255,255,255,0.45)', '·'],
      ['#ffffff', `${stats?.jogos ?? 0}J`],
      ['rgba(255,255,255,0.45)', '·'],
      ['#ffffff', `${stats?.gols ?? 0}G`],
    ];
    const gap = 8;
    const widths = partes.map(([, t]) => ctx.measureText(t).width);
    const total = widths.reduce((a, b) => a + b, 0) + gap * (partes.length - 1);
    let x = W / 2 - total / 2;
    const y = H - 26;
    ctx.textAlign = 'left';
    for (let i = 0; i < partes.length; i += 1) {
      ctx.fillStyle = partes[i][0];
      ctx.fillText(partes[i][1], x, y);
      x += widths[i] + gap;
    }
  }

  // 7. BADGE NOTA (canto sup. esq.)
  const bx = 14;
  const by = 14;
  const bw = 58;
  const bh = 44;
  const badgeCor = getFrameColor(corFrame).stroke;
  ctx.fillStyle = 'rgba(0,0,0,0.65)';
  roundRect(ctx, bx, by, bw, bh, 8);
  ctx.fill();
  ctx.strokeStyle = badgeCor;
  ctx.lineWidth = 1;
  roundRect(ctx, bx, by, bw, bh, 8);
  ctx.stroke();
  ctx.fillStyle = badgeCor;
  ctx.font = '900 26px system-ui, "Segoe UI", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(nota, bx + bw / 2, by + 18);
  ctx.fillStyle = '#9aa0aa';
  ctx.font = '800 9px system-ui, "Segoe UI", sans-serif';
  ctx.fillText('NOTA', bx + bw / 2, by + 34);

  // 8. FRAME COM CANTOS CORTADOS
  const cut = 28;
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
  ctx.lineWidth = 4;
  ctx.stroke();

  const dotOuter = ehDourado ? '#d4a017' : fc.stroke;
  const dotInner = ehDourado ? '#f5e070' : fc.dot;
  for (const [cx, cy] of [[16, 16], [W - 16, 16], [16, H - 16], [W - 16, H - 16]]) {
    ctx.fillStyle = dotOuter;
    ctx.beginPath();
    ctx.arc(cx, cy, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = dotInner;
    ctx.beginPath();
    ctx.arc(cx, cy, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }

  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), 'image/png'));
}
