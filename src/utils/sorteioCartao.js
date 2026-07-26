// Futty v2.0 — Cartão de partilha 9:16 do sorteio (SPEC-SORTEIO §9: a via de
// imagem — o vídeo morreu). Um cartão por equipa: fundo da casa (aurora fake),
// kit do time (OURO/ROXO/PRATA/BRONZE), lista de jogadores, marca FUTTY.
// Canvas puro (1080×1920) → download PNG.
import { urlAsset } from './avatar';

const KITS = [
  { n: 'OURO', c: '#d4a017' },
  { n: 'ROXO', c: '#8b5cf6' },
  { n: 'PRATA', c: '#aab4c8' },
  { n: 'BRONZE', c: '#c2652e' },
];

export async function gerarCartao916(resultado, timeIndex, nomeEquipa) {
  const time = resultado?.times?.[timeIndex];
  if (!time) throw new Error('Time inexistente.');
  const kit = KITS[timeIndex % 4];

  const W = 1080;
  const H = 1920;
  const cv = document.createElement('canvas');
  cv.width = W;
  cv.height = H;
  const cx = cv.getContext('2d');

  // fundo da casa + aurora fake (dourado/roxo, screen simulado com alphas)
  const bg = cx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#0b0a12');
  bg.addColorStop(1, '#050810');
  cx.fillStyle = bg;
  cx.fillRect(0, 0, W, H);
  const blob = (x, y, r, cor, a) => {
    const g = cx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, cor.replace(')', `,${a})`).replace('rgb', 'rgba'));
    g.addColorStop(1, 'rgba(0,0,0,0)');
    cx.fillStyle = g;
    cx.fillRect(0, 0, W, H);
  };
  blob(120, 260, 700, 'rgb(212,160,23)', 0.20);
  blob(980, 900, 800, 'rgb(139,92,246)', 0.20);
  blob(300, 1700, 700, 'rgb(212,160,23)', 0.14);

  // marca no topo
  cx.textAlign = 'center';
  cx.fillStyle = '#f0c94a';
  cx.font = "800 92px Rajdhani, sans-serif";
  cx.fillText('FUTTY', W / 2, 170);
  cx.fillStyle = 'rgba(255,255,255,0.5)';
  cx.font = "600 40px Rajdhani, sans-serif";
  cx.fillText(nomeEquipa || 'SORTEIO', W / 2, 236);

  // header do time (kit da casa)
  cx.fillStyle = kit.c;
  cx.font = "800 110px Rajdhani, sans-serif";
  cx.shadowColor = kit.c;
  cx.shadowBlur = 40;
  cx.fillText(time.nome.toUpperCase(), W / 2, 420);
  cx.shadowBlur = 0;
  cx.fillStyle = 'rgba(255,255,255,0.45)';
  cx.font = "700 42px Rajdhani, sans-serif";
  cx.fillText(`kit ${kit.n.toLowerCase()}`, W / 2, 486);

  // linha 45° decorativa
  cx.strokeStyle = kit.c;
  cx.lineWidth = 3;
  cx.beginPath();
  cx.moveTo(120, 540);
  cx.lineTo(W - 160, 540);
  cx.lineTo(W - 120, 580);
  cx.stroke();

  // jogadores (cartões-vidro simples com chanfro)
  const jogs = time.jogadores || [];
  const y0 = 640;
  const rowH = Math.min(120, Math.floor((H - y0 - 380) / Math.max(jogs.length, 1)));
  cx.textAlign = 'left';
  jogs.forEach((j, i) => {
    const y = y0 + i * rowH;
    // cartão com cantos 45°
    cx.fillStyle = 'rgba(255,255,255,0.05)';
    cx.beginPath();
    const x1 = 120; const x2 = W - 120; const c = 16; const h = rowH - 18;
    cx.moveTo(x1 + c, y);
    cx.lineTo(x2 - c, y);
    cx.lineTo(x2, y + c);
    cx.lineTo(x2, y + h - c);
    cx.lineTo(x2 - c, y + h);
    cx.lineTo(x1 + c, y + h);
    cx.lineTo(x1, y + h - c);
    cx.lineTo(x1, y + c);
    cx.closePath();
    cx.fill();
    cx.strokeStyle = `${kit.c}66`;
    cx.lineWidth = 2;
    cx.stroke();
    // nome + marcas
    cx.fillStyle = '#fff';
    cx.font = "700 52px Rajdhani, sans-serif";
    const marcas = [j.goleiro ? 'GR' : null, j.cabeca_chave ? 'C' : null, j.convidado ? 'CONVIDADO' : null].filter(Boolean).join(' · ');
    cx.fillText(j.nome, 160, y + h / 2 + 18);
    if (marcas) {
      cx.textAlign = 'right';
      cx.fillStyle = kit.c;
      cx.font = "800 34px Rajdhani, sans-serif";
      cx.fillText(marcas, W - 160, y + h / 2 + 14);
      cx.textAlign = 'left';
    }
  });

  // rodapé: marca + CTA
  cx.textAlign = 'center';
  cx.fillStyle = 'rgba(255,255,255,0.35)';
  cx.font = "600 36px Rajdhani, sans-serif";
  cx.fillText('sorteado no Futty — cria o teu grupo', W / 2, H - 140);
  cx.fillStyle = '#f0c94a';
  cx.font = "800 44px Rajdhani, sans-serif";
  cx.fillText('futty.app', W / 2, H - 80);

  // download
  const blobPng = await new Promise((res) => cv.toBlob(res, 'image/png'));
  const url = URL.createObjectURL(blobPng);
  const a = document.createElement('a');
  a.href = url;
  a.download = `futty-sorteio-${(time.nome || 'time').toLowerCase().replace(/\s+/g, '-')}.png`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

// ═══════════════════════════════════════════════════════════════════════════════
// CARTAZ ESCALAÇÃO v4.1 — o cartaz ÚNICO com TODOS os times (transplante fiel do
// modelo aprovado da bancada, cartaz.html). É o que o botão "Guardar" da máquina
// entrega. Difere do gerarCartao916 (que é 1 imagem POR equipa, nos botões "9:16").
// LEI v4.1 (aprovado): título "ESCALAÇÃO" 3× (mesmo ouro do letreiro) · fundo escuro
// e desfocado (o roxo recua) · times empilhados, cada linha CENTRADA (a ímpar também)
// · espaçamento vertical FLUIDO (space-evenly: título+times+reservas num só bloco) ·
// reservas com rótulo e em CINZA-AÇO · FUTTY na base · SEM alavanca/raios/banner.
// LEI: RESERVA nunca veste cor de time.
// ═══════════════════════════════════════════════════════════════════════════════
const RES_COR = { c: '#8a90a0', g: 'rgba(138,144,160,.45)' }; // cinza-aço apagado (à espera, sem dono)

// silhueta-casa angulosa (MESMA geometria de SilhuetaJogador / CerimoniaSorteio) —
// placeholder de pessoa sem foto; tinge com a cor do contexto (LEI DA SILHUETA).
const SIL_HEAD = '40,12 56,12 64,20 64,36 56,44 40,44 32,36 32,20';
const SIL_BODY = 'M14 92 L14 70 L24 58 L40 52 L56 52 L72 58 L82 70 L82 92 Z';
function silhuetaURI(cor) {
  return `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 96 100'>`
    + `<defs><linearGradient id='sg' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='#15131d'/><stop offset='1' stop-color='#0a0810'/></linearGradient></defs>`
    + `<rect width='96' height='100' fill='url(#sg)'/>`
    + `<g stroke='${cor}' stroke-linejoin='miter'>`
    + `<g stroke-opacity='0.34' stroke-width='5' fill='none'><polygon points='${SIL_HEAD}'/><path d='${SIL_BODY}'/></g>`
    + `<g stroke-width='2.4' stroke-opacity='0.72' fill='${cor}' fill-opacity='0.15'><polygon points='${SIL_HEAD}'/><path d='${SIL_BODY}'/></g>`
    + `</g></svg>`,
  )}`;
}
function comAlfa(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}
function carregarImagem(src) {
  return new Promise((res) => {
    if (!src) { res(null); return; }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => res(img);
    img.onerror = () => res(null);
    img.src = src;
  });
}
// object-fit: cover dentro de (dx,dy,dw,dh); focoY = object-position vertical (0..1)
function desenharCover(cx, img, dx, dy, dw, dh, focoY = 0.08) {
  const ir = img.width / img.height; const dr = dw / dh;
  let sw; let sh; let sx; let sy;
  if (ir > dr) { sh = img.height; sw = sh * dr; sx = (img.width - sw) / 2; sy = 0; }
  else { sw = img.width; sh = sw / dr; sx = 0; sy = (img.height - sh) * focoY; }
  cx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
}
// caminho do chanfro (mesma proporção do .mcard .fr: x 8% / y 6%)
function chanfro(cx, x, y, w, h) {
  const cxp = w * 0.08; const cyp = h * 0.06;
  cx.beginPath();
  cx.moveTo(x + cxp, y); cx.lineTo(x + w - cxp, y); cx.lineTo(x + w, y + cyp);
  cx.lineTo(x + w, y + h - cyp); cx.lineTo(x + w - cxp, y + h); cx.lineTo(x + cxp, y + h);
  cx.lineTo(x, y + h - cyp); cx.lineTo(x, y + cyp); cx.closePath();
}

export async function gerarCartazEscalacao(resultado, opts = {}) {
  const times = resultado?.times || [];
  if (!times.length) throw new Error('Sem resultado para o cartaz.');
  const reservas = resultado?.reservas || [];
  const equipa = opts.equipa || 'Sorteio';
  const dataTxt = opts.data || '';
  const meta = [dataTxt, equipa].filter(Boolean).join(' · ');

  const W = 1080; const H = 1920;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const cx = cv.getContext('2d');

  // secções: times (kit da casa) + reserva (cinza-aço) se houver
  const secs = times.map((t, i) => ({ cor: { c: KITS[i % 4].c, g: comAlfa(KITS[i % 4].c, 0.55) }, nome: t.nome || `Time ${i + 1}`, jogs: t.jogadores || [], res: false }));
  if (reservas.length) secs.push({ cor: RES_COR, nome: 'Reserva', jogs: reservas, res: true });
  const nSec = secs.length;

  // layout adaptativo ao nº de secções (valores selados no modelo v4.1)
  const L = nSec <= 2 ? { cw: 224, hs: 42, nm: 24 }
    : nSec === 3 ? { cw: 168, hs: 36, nm: 20 }
      : { cw: 140, hs: 32, nm: 17 };
  const cardGap = 18; const rowGap = 16;
  const boxX = 64; const boxTop = 44; const boxRight = W - 64; const boxBottom = H - 118;
  const boxW = boxRight - boxX; const boxH = boxBottom - boxTop;
  const cardH = L.cw * (4 / 3);
  const maxPorLinha = Math.max(1, Math.floor((boxW + cardGap) / (L.cw + cardGap)));

  // distribui n cartões por linhas equilibradas (a última linha, ímpar, fica centrada)
  const linhasDe = (n) => {
    const nRows = Math.max(1, Math.ceil(n / maxPorLinha));
    const per = Math.ceil(n / nRows); const out = []; let rem = n;
    for (let r = 0; r < nRows; r += 1) { const c = Math.min(per, rem); out.push(c); rem -= c; }
    return out;
  };
  secs.forEach((s) => { s.linhas = linhasDe(s.jogs.length); s.h = L.hs + 18 + s.linhas.length * cardH + (s.linhas.length - 1) * rowGap; });

  // título "ESCALAÇÃO" (3×) + meta = 1º item do bloco distribuído
  const tituloH = 120 + 14 + 32;
  const itens = [{ tipo: 'titulo', h: tituloH }, ...secs.map((s) => ({ tipo: 'sec', h: s.h, sec: s }))];
  const totalH = itens.reduce((a, it) => a + it.h, 0);
  const espaco = Math.max(18, (boxH - totalH) / (itens.length + 1)); // space-evenly (com piso p/ times grandes)

  // — carrega TODAS as imagens (avatar real → urlAsset; sem foto → silhueta da cor) —
  const carregas = [];
  secs.forEach((s) => s.jogs.forEach((j) => {
    carregas.push((async () => {
      let img = j.avatar_url ? await carregarImagem(urlAsset(j.avatar_url)) : null;
      if (!img) img = await carregarImagem(silhuetaURI(s.res ? RES_COR.c : s.cor.c));
      j._img = img;
    })());
  }));
  try { await document.fonts.ready; } catch { /* SSR/priv */ }
  await Promise.all(carregas);

  // ── FUNDO v4.1: base escura + aurora MUITO desfocada (roxo recua) + vinheta ──
  cx.fillStyle = '#03040b'; cx.fillRect(0, 0, W, H);
  const nevoa = (x, y, r, cor, a) => {
    const g = cx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, comAlfa(cor, a)); g.addColorStop(1, comAlfa(cor, 0));
    cx.fillStyle = g; cx.fillRect(0, 0, W, H);
  };
  cx.globalCompositeOperation = 'screen';
  nevoa(270, 300, 620, '#7c53e0', 0.17); // roxo recuado
  nevoa(860, 1260, 680, '#d4a017', 0.17); // ouro
  nevoa(590, 1760, 540, '#5c30bf', 0.15);
  cx.globalCompositeOperation = 'source-over';
  const vinh = cx.createRadialGradient(W / 2, H * 0.46, 0, W / 2, H * 0.46, H * 0.62);
  vinh.addColorStop(0.34, 'rgba(2,2,7,0)'); vinh.addColorStop(1, 'rgba(2,2,7,0.68)');
  cx.fillStyle = vinh; cx.fillRect(0, 0, W, H);

  // ── um cartão (foto + placa de nome, chanfro + filete duplo na cor) ──
  const desenharCartao = (x, y, cor, nome, img) => {
    cx.save(); chanfro(cx, x, y, L.cw, cardH); cx.clip();
    cx.fillStyle = '#0b0b11'; cx.fillRect(x, y, L.cw, cardH);
    const fh = cardH * 0.78;
    if (img) desenharCover(cx, img, x, y, L.cw, fh, 0.08);
    const py = y + fh; const ph = cardH - fh;
    const pg = cx.createLinearGradient(0, py, 0, py + ph);
    pg.addColorStop(0, '#15121d'); pg.addColorStop(1, '#0a0810');
    cx.fillStyle = pg; cx.fillRect(x, py, L.cw, ph);
    cx.strokeStyle = comAlfa(cor.c, 0.7); cx.lineWidth = 1.5;
    cx.beginPath(); cx.moveTo(x, py + 0.75); cx.lineTo(x + L.cw, py + 0.75); cx.stroke();
    // nome (encolhe até caber; nunca quebra)
    let px = L.nm; const maxW = L.cw - 16;
    cx.font = `700 ${px}px Rajdhani, sans-serif`;
    while (cx.measureText(nome).width > maxW && px > 12) { px -= 1; cx.font = `700 ${px}px Rajdhani, sans-serif`; }
    cx.fillStyle = '#fff'; cx.textAlign = 'center'; cx.textBaseline = 'middle';
    cx.fillText(nome, x + L.cw / 2, py + ph / 2 + 1);
    cx.restore();
    // moldura (fora do clip) + glow; reserva com glow mais fraco
    cx.save();
    cx.shadowColor = cor.c; cx.shadowBlur = 18;
    chanfro(cx, x, y, L.cw, cardH); cx.strokeStyle = cor.c; cx.lineWidth = 3; cx.stroke();
    cx.restore();
    chanfro(cx, x + 5, y + 5, L.cw - 10, cardH - 10);
    cx.strokeStyle = comAlfa(cor.c, 0.55); cx.lineWidth = 1; cx.stroke();
  };

  // ── distribui o bloco (título + secções) verticalmente ──
  let y = boxTop + espaco;
  itens.forEach((it) => {
    if (it.tipo === 'titulo') {
      cx.textAlign = 'center'; cx.textBaseline = 'alphabetic';
      const grad = cx.createLinearGradient(0, y, 0, y + 120);
      grad.addColorStop(0, '#fff7d8'); grad.addColorStop(0.5, '#f5d060'); grad.addColorStop(1, '#c8940f');
      cx.save(); cx.shadowColor = 'rgba(245,224,112,0.45)'; cx.shadowBlur = 16;
      cx.fillStyle = grad; cx.font = '800 120px Rajdhani, sans-serif';
      cx.fillText('ESCALAÇÃO', W / 2, y + 100); cx.restore();
      if (meta) { cx.fillStyle = '#a99fc0'; cx.font = '600 26px Rajdhani, sans-serif'; cx.fillText(meta, W / 2, y + 100 + 40); }
    } else {
      const s = it.sec;
      cx.save();
      if (s.res) cx.globalAlpha = 0.72; // reserva recuada (à espera)
      const midT = y + L.hs * 0.5;
      // ponto + nome + linha
      cx.save(); cx.fillStyle = s.cor.c; cx.shadowColor = s.cor.g; cx.shadowBlur = 16;
      cx.beginPath(); cx.arc(boxX + 10, midT, 10, 0, Math.PI * 2); cx.fill(); cx.restore();
      cx.fillStyle = s.cor.c; cx.textAlign = 'left'; cx.textBaseline = 'middle';
      cx.font = `800 ${L.hs}px Rajdhani, sans-serif`;
      const nomeUp = s.nome.toUpperCase();
      cx.fillText(nomeUp, boxX + 32, midT);
      const lx0 = boxX + 32 + cx.measureText(nomeUp).width + 18;
      if (lx0 < boxRight) {
        const lg = cx.createLinearGradient(lx0, 0, boxRight, 0);
        lg.addColorStop(0, s.cor.c); lg.addColorStop(1, comAlfa(s.cor.c, 0));
        cx.strokeStyle = lg; cx.lineWidth = 2;
        cx.beginPath(); cx.moveTo(lx0, midT); cx.lineTo(boxRight, midT); cx.stroke();
      }
      // linhas de cartões (cada uma centrada)
      let ry = y + L.hs + 18; let idx = 0;
      s.linhas.forEach((count) => {
        const rowW = count * L.cw + (count - 1) * cardGap;
        let rx = boxX + (boxW - rowW) / 2;
        for (let k = 0; k < count; k += 1) {
          const j = s.jogs[idx]; idx += 1;
          desenharCartao(rx, ry, s.cor, (j.convidado ? '· ' : '') + (j.nome || '?'), j._img);
          rx += L.cw + cardGap;
        }
        ry += cardH + rowGap;
      });
      cx.restore();
    }
    y += it.h + espaco;
  });

  // ── BASE: marca FUTTY (sem alavanca/raios/banner) ──
  const logo = await carregarImagem('/futty-logo-flat.png');
  const by = H - 58;
  cx.textBaseline = 'middle';
  cx.font = '800 32px Rajdhani, sans-serif'; const wF = cx.measureText('Futty').width;
  cx.font = '600 22px Rajdhani, sans-serif'; const wT = cx.measureText('· futebol de quem joga').width;
  const totalW = 50 + 16 + wF + 16 + wT; let bx = (W - totalW) / 2;
  if (logo) { cx.drawImage(logo, bx, by - 25, 50, 50); }
  bx += 50 + 16;
  const bg2 = cx.createLinearGradient(0, by - 16, 0, by + 16);
  bg2.addColorStop(0, '#fff7d8'); bg2.addColorStop(0.5, '#f5d060'); bg2.addColorStop(1, '#c8940f');
  cx.fillStyle = bg2; cx.textAlign = 'left'; cx.font = '800 32px Rajdhani, sans-serif';
  cx.fillText('Futty', bx, by); bx += wF + 16;
  cx.fillStyle = '#7d7791'; cx.font = '600 22px Rajdhani, sans-serif';
  cx.fillText('· futebol de quem joga', bx, by);

  // ── saída: dataURL (proof) + download (default) ──
  const url = cv.toDataURL('image/png');
  if (opts.baixar !== false) {
    const a = document.createElement('a');
    a.href = url; a.download = `futty-escalacao-${equipa.toLowerCase().replace(/\s+/g, '-')}.png`;
    a.click();
  }
  return { url };
}
