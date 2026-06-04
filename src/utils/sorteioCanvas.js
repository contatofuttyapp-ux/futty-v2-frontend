// Futty v2.0 — Arte PNG do sorteio (download/partilha).
// 1080px de largura, fundo #050810, uma linha por time (título + cartas 2:3).
// Usa avatarParaCor() — a MESMA fonte de avatares do slot e do resultado.
import { avatarParaCor, nomeJogador, iniciaisNome } from './avatar.js';

const W = 1080;
const BG = '#050810';
const PAD_X = 40;
const PAD_Y = 44;
const HEADER_H = 96;
const ROW_GAP = 52;
const TITLE_COL_W = 150;
const TITLE_GAP = 20;
const SLOT_GAP = 12;
const SLOT_RADIUS = 12;
const TITLE_FONT = 28;
const NAME_FONT = 18;

const COR_HEX = { verde: '#00e5a0', azul: '#3b82f6', vermelho: '#ef4444', preto: '#cccccc' };
const COR_FILL = { verde: '#0c3', azul: '#3b82f6', vermelho: '#ef4444', preto: '#1c1c20' };
const COR_RESERVAS = '#9ca3af';

function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

// Carrega uma imagem (crossOrigin) — devolve null se falhar.
function carregarImg(src) {
  return new Promise((resolve) => {
    if (!src) return resolve(null);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img.naturalWidth > 0 ? img : null);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

// ≤2 palavras → nome completo; ≥3 → primeira + última.
function nomeSlot(nomeCompleto) {
  const n = String(nomeCompleto ?? '').trim();
  if (!n) return '';
  const parts = n.split(/\s+/).filter(Boolean);
  return parts.length <= 2 ? n : `${parts[0]} ${parts[parts.length - 1]}`;
}

function elipsar(ctx, texto, maxW) {
  if (ctx.measureText(texto).width <= maxW) return texto;
  let s = texto;
  while (s.length > 1 && ctx.measureText(`${s}…`).width > maxW) s = s.slice(0, -1);
  return `${s}…`;
}

// Desenha o avatar dentro da carta: foto (cover, topo) ou cor sólida + iniciais.
function desenharAvatar(ctx, p, cor, x, y, w, h) {
  ctx.save();
  roundRect(ctx, x, y, w, h, SLOT_RADIUS - 2);
  ctx.clip();
  return (async () => {
    const url = avatarParaCor(p, cor);
    const ehGenerico = url.includes('/avatares/genericos/');
    const img = ehGenerico ? null : await carregarImg(url);
    if (img) {
      // cover com object-position top
      const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight);
      const sw = img.naturalWidth * scale;
      const sh = img.naturalHeight * scale;
      ctx.drawImage(img, x + (w - sw) / 2, y, sw, sh);
    } else {
      // avatar colorido na cor do time + iniciais (nunca animal)
      ctx.fillStyle = COR_FILL[cor] || '#1c1c20';
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = '#ffffff';
      ctx.font = `800 ${Math.round(w * 0.4)}px system-ui, Segoe UI, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(iniciaisNome(nomeJogador(p)), x + w / 2, y + h / 2);
    }
    ctx.restore();
  })();
}

function ehGoleiro(p) {
  return p?.goleiro === true || p?.is_goalkeeper === true || String(p?.posicao || '').toLowerCase() === 'goleiro';
}
function ehCabeca(p) {
  return p?.cabeca_chave === true || p?.is_key_player === true;
}

// Gera o canvas da arte do sorteio.
export async function gerarImagemSorteio(sorteio, meta = {}) {
  const times = Array.isArray(sorteio?.times) ? sorteio.times : [];
  const reservas = Array.isArray(sorteio?.reservas) ? sorteio.reservas : [];
  const nomeReservas = String(sorteio?.nome_grupo_reservas || 'RESERVAS').toUpperCase();

  const innerW = W - PAD_X * 2;
  const slotsAreaW = innerW - TITLE_COL_W - TITLE_GAP;

  // Métricas de cada linha (cartas 2:3 → altura = largura * 1.5).
  const colsDe = (n) => Math.min(7, Math.max(1, n || 1));
  const metr = (n) => {
    const cols = colsDe(n);
    const slotW = Math.floor((slotsAreaW - SLOT_GAP * (cols - 1)) / cols);
    const slotH = Math.round(slotW * 1.5);
    return { cols, slotW, slotH, rowH: TITLE_FONT + 18 + slotH + 8 + NAME_FONT + 6 };
  };

  const linhas = times.map((t, i) => ({
    kind: 'time',
    titulo: (t.nome || `Time ${String.fromCharCode(65 + i)}`).toUpperCase(),
    cor: t.cor_time || 'verde',
    jogadores: Array.isArray(t.jogadores) ? t.jogadores : [],
  }));
  const maxJog = Math.max(1, ...linhas.map((l) => l.jogadores.length), reservas.length);
  if (reservas.length) {
    linhas.push({ kind: 'reservas', titulo: nomeReservas, cor: 'preto', jogadores: reservas });
  }

  let bodyH = 0;
  const linhasM = linhas.map((l) => {
    const m = metr(l.kind === 'reservas' ? maxJog : l.jogadores.length);
    bodyH += m.rowH + ROW_GAP;
    return { ...l, ...m };
  });

  const H = PAD_Y + HEADER_H + ROW_GAP + bodyH + PAD_Y;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingQuality = 'high';
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, W, H);

  // Header: FUT + meta
  let y = PAD_Y;
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.font = `900 40px system-ui, Segoe UI, sans-serif`;
  const midY = y + HEADER_H / 2;
  ctx.fillText('FUT', PAD_X, midY);
  const metaLine = [meta.titulo, meta.dataLabel].filter(Boolean).join(' · ');
  ctx.textAlign = 'right';
  ctx.font = `700 22px system-ui, Segoe UI, sans-serif`;
  ctx.fillText(elipsar(ctx, metaLine, innerW - 160), W - PAD_X, midY);
  y += HEADER_H + ROW_GAP;

  // Linhas (times + reservas)
  for (const l of linhasM) {
    const edge = l.kind === 'reservas' ? COR_RESERVAS : COR_HEX[l.cor] || COR_HEX.verde;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.font = `900 ${TITLE_FONT}px system-ui, Segoe UI, sans-serif`;
    ctx.fillStyle = edge;
    ctx.fillText(l.titulo, PAD_X, y);

    const rowTop = y + TITLE_FONT + 18;
    const slotsLeft = PAD_X + TITLE_COL_W + TITLE_GAP;
    const n = l.jogadores.length;
    const rowSlotsW = n * l.slotW + (n - 1) * SLOT_GAP;
    let cx = slotsLeft + Math.max(0, (slotsAreaW - rowSlotsW) / 2);

    for (const p of l.jogadores) {
      // moldura
      ctx.strokeStyle = edge;
      ctx.lineWidth = 2;
      roundRect(ctx, cx, rowTop, l.slotW, l.slotH, SLOT_RADIUS);
      ctx.stroke();
      // avatar
      await desenharAvatar(ctx, p, l.kind === 'reservas' ? 'preto' : l.cor, cx + 2, rowTop + 2, l.slotW - 4, l.slotH - 4);
      // nome
      let fs = NAME_FONT;
      ctx.font = `800 ${fs}px system-ui, Segoe UI, sans-serif`;
      while (ctx.measureText(nomeSlot(nomeJogador(p))).width > l.slotW + 8 && fs > 8) {
        fs -= 1;
        ctx.font = `800 ${fs}px system-ui, Segoe UI, sans-serif`;
      }
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(elipsar(ctx, nomeSlot(nomeJogador(p)), l.slotW + 8), cx + l.slotW / 2, rowTop + l.slotH + 8);
      // etiqueta GR / C
      if (ehGoleiro(p) || ehCabeca(p)) {
        ctx.font = `800 13px system-ui, Segoe UI, sans-serif`;
        ctx.fillStyle = ehGoleiro(p) ? '#00e5a0' : '#a78bfa';
        ctx.fillText(ehGoleiro(p) ? 'GR' : 'C', cx + l.slotW / 2, rowTop + l.slotH + 8 + NAME_FONT + 2);
      }
      cx += l.slotW + SLOT_GAP;
    }
    y += l.rowH + ROW_GAP;
  }

  return canvas;
}
