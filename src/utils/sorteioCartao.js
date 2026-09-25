// Futty v2.0 — Cartazes do sorteio (SPEC-SORTEIO §9: a via de imagem — o vídeo morreu).
// Duas saídas, MESMA identidade visual (peças partilhadas, não imitação):
//   gerarCartao916      — 1 imagem POR equipa (botões "9:16 · Time X").
//   gerarCartazEscalacao — o cartaz ÚNICO com TODOS os times (botão "Guardar" da máquina).
// Canvas puro (1080×1920) → PNG. A entrega é do utils/salvarImagem.js (Rodada 8A):
// na web baixa; no app abre a folha de compartilhar — o <a download> não faz nada
// dentro do WebView.
import { urlAsset, urlImagem } from './avatar';
import { salvarOuCompartilhar } from './salvarImagem';

const KITS = [
  { n: 'OURO', c: '#d4a017' },
  { n: 'ROXO', c: '#8b5cf6' },
  { n: 'PRATA', c: '#aab4c8' },
  { n: 'BRONZE', c: '#c2652e' },
];
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
// object-fit: cover dentro de (dx,dy,dw,dh); focoY = object-position vertical (0..1). RODADA 27: 0 = do TOPO
// do recorte, como o CSS da cerimônia (object-position 50% 0%) e o canvas do cromo — os 0,08 de antes
// deslocavam a foto do que a pessoa enquadrou (e cada tela, um pouco diferente da outra).
function desenharCover(cx, img, dx, dy, dw, dh, focoY = 0) {
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

// ── PEÇAS PARTILHADAS (a identidade do ESCALAÇÃO aprovado) ─────────────────────

// Fundo v4.1: base escura + aurora MUITO desfocada (screen) + vinheta.
function desenharFundoCasa(cx, W, H) {
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
}

// Título em gradiente dourado com sombra — MESMO tratamento do "ESCALAÇÃO".
function desenharTituloGradiente(cx, texto, W, y, tamanho = 120) {
  cx.textAlign = 'center'; cx.textBaseline = 'alphabetic';
  const grad = cx.createLinearGradient(0, y, 0, y + tamanho);
  grad.addColorStop(0, '#fff7d8'); grad.addColorStop(0.5, '#f5d060'); grad.addColorStop(1, '#c8940f');
  cx.save(); cx.shadowColor = 'rgba(245,224,112,0.45)'; cx.shadowBlur = 16;
  cx.fillStyle = grad; cx.font = `800 ${tamanho}px Rajdhani, sans-serif`;
  cx.fillText(texto, W / 2, y + tamanho * 0.83); cx.restore();
  return y + tamanho * 0.83;
}

// Marca FUTTY na base — logo REAL (não texto) + wordmark. MESMO lockup do ESCALAÇÃO.
async function desenharLogoLockup(cx, W, H) {
  const logo = await carregarImagem('/futty-logo-flat.webp');
  const by = H - 58;
  cx.textBaseline = 'middle';
  cx.font = '800 32px Rajdhani, sans-serif'; const wF = cx.measureText('Futty').width;
  cx.font = '600 22px Rajdhani, sans-serif'; const wT = cx.measureText('· futebol de quem joga').width;
  const totalW = 50 + 16 + wF + 16 + wT; let bx = (W - totalW) / 2;
  if (logo) cx.drawImage(logo, bx, by - 25, 50, 50);
  bx += 50 + 16;
  const bg2 = cx.createLinearGradient(0, by - 16, 0, by + 16);
  bg2.addColorStop(0, '#fff7d8'); bg2.addColorStop(0.5, '#f5d060'); bg2.addColorStop(1, '#c8940f');
  cx.fillStyle = bg2; cx.textAlign = 'left'; cx.font = '800 32px Rajdhani, sans-serif';
  cx.fillText('Futty', bx, by); bx += wF + 16;
  cx.fillStyle = '#7d7791'; cx.font = '600 22px Rajdhani, sans-serif';
  cx.fillText('· futebol de quem joga', bx, by);
}

// Um cartão de jogador (foto/silhueta + placa de nome, chanfro + filete duplo na cor).
function desenharCartaoJogador(cx, x, y, w, h, cor, nome, img) {
  cx.save(); chanfro(cx, x, y, w, h); cx.clip();
  cx.fillStyle = '#0b0b11'; cx.fillRect(x, y, w, h);
  const fh = h * 0.78;
  if (img) desenharCover(cx, img, x, y, w, fh, 0);
  const py = y + fh; const ph = h - fh;
  const pg = cx.createLinearGradient(0, py, 0, py + ph);
  pg.addColorStop(0, '#15121d'); pg.addColorStop(1, '#0a0810');
  cx.fillStyle = pg; cx.fillRect(x, py, w, ph);
  cx.strokeStyle = comAlfa(cor.c, 0.7); cx.lineWidth = 1.5;
  cx.beginPath(); cx.moveTo(x, py + 0.75); cx.lineTo(x + w, py + 0.75); cx.stroke();
  let px = Math.round(w * 0.14); const maxW = w - 16;
  cx.font = `700 ${px}px Rajdhani, sans-serif`;
  while (cx.measureText(nome).width > maxW && px > 12) { px -= 1; cx.font = `700 ${px}px Rajdhani, sans-serif`; }
  cx.fillStyle = '#fff'; cx.textAlign = 'center'; cx.textBaseline = 'middle';
  cx.fillText(nome, x + w / 2, py + ph / 2 + 1);
  cx.restore();
  cx.save();
  cx.shadowColor = cor.c; cx.shadowBlur = 18;
  chanfro(cx, x, y, w, h); cx.strokeStyle = cor.c; cx.lineWidth = 3; cx.stroke();
  cx.restore();
  chanfro(cx, x + 5, y + 5, w - 10, h - 10);
  cx.strokeStyle = comAlfa(cor.c, 0.55); cx.lineWidth = 1; cx.stroke();
}

// Carrega as imagens (foto real → urlAsset; sem foto → silhueta da cor) de uma lista
// de jogadores, guardando em `j._img`.
async function carregarFotosDoTime(jogadores, cor) {
  await Promise.all(jogadores.map(async (j) => {
    let img = j.avatar_url ? await carregarImagem(urlImagem(urlAsset(j.avatar_url), 512)) : null;
    if (!img) img = await carregarImagem(silhuetaURI(cor));
    j._img = img;
  }));
}

// Distribui n cartões por linhas equilibradas (a última linha, ímpar, fica centrada).
function linhasDe(n, maxPorLinha) {
  const nRows = Math.max(1, Math.ceil(n / maxPorLinha));
  const per = Math.ceil(n / nRows); const out = []; let rem = n;
  for (let r = 0; r < nRows; r += 1) { const c = Math.min(per, rem); out.push(c); rem -= c; }
  return out;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CARTÃO 9:16 — 1 imagem POR equipa (botões "9:16 · Time X"). Herda a IDENTIDADE do
// ESCALAÇÃO: mesmo fundo (aurora screen+vinheta), mesmo título em gradiente dourado,
// mesmos cartões de jogador (foto/silhueta + chanfro + glow), MESMA marca FUTTY (logo
// real, não texto). Difere do ESCALAÇÃO só no recorte: 1 time, não todos.
// ═══════════════════════════════════════════════════════════════════════════════
export async function gerarCartao916(resultado, timeIndex, nomeEquipa) {
  const time = resultado?.times?.[timeIndex];
  if (!time) throw new Error('Time inexistente.');
  const kit = { c: KITS[timeIndex % 4].c, g: comAlfa(KITS[timeIndex % 4].c, 0.55) };
  const jogs = time.jogadores || [];

  const W = 1080; const H = 1920;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const cx = cv.getContext('2d');

  await carregarFotosDoTime(jogs, kit.c);
  try { await document.fonts.ready; } catch { /* SSR/priv */ }

  desenharFundoCasa(cx, W, H);

  // título = o NOME DO TIME (o cartaz é sobre ESTE time), mesmo tratamento gradiente.
  let y = 96;
  const baseline = desenharTituloGradiente(cx, (time.nome || 'TIME').toUpperCase(), W, y, 110);
  cx.fillStyle = '#a99fc0'; cx.textAlign = 'center'; cx.font = '600 30px Rajdhani, sans-serif';
  cx.fillText([nomeEquipa, 'sorteio'].filter(Boolean).join(' · ').toUpperCase(), W / 2, baseline + 44);

  // grelha de cartões (mesma lógica adaptativa do ESCALAÇÃO, para 1 time só).
  const boxX = 64; const boxTop = baseline + 110; const boxRight = W - 64; const boxBottom = H - 150;
  const boxW = boxRight - boxX; const boxH = boxBottom - boxTop;
  const L = jogs.length <= 4 ? { cw: 240, hs: 44 } : jogs.length <= 8 ? { cw: 190, hs: 40 } : { cw: 150, hs: 34 };
  const cardGap = 20; const rowGap = 18;
  const cardH = L.cw * (4 / 3);
  const maxPorLinha = Math.max(1, Math.floor((boxW + cardGap) / (L.cw + cardGap)));
  const linhas = linhasDe(jogs.length, maxPorLinha);
  const totalH = linhas.length * cardH + (linhas.length - 1) * rowGap;
  let ry = boxTop + Math.max(0, (boxH - totalH) / 2);
  let idx = 0;
  linhas.forEach((count) => {
    const rowW = count * L.cw + (count - 1) * cardGap;
    let rx = boxX + (boxW - rowW) / 2;
    for (let k = 0; k < count; k += 1) {
      const j = jogs[idx]; idx += 1;
      const marca = j.goleiro ? ' (GR)' : j.cabeca_chave ? ' (C)' : '';
      desenharCartaoJogador(cx, rx, ry, L.cw, cardH, kit, (j.convidado ? '· ' : '') + (j.nome || '?') + marca, j._img);
      rx += L.cw + cardGap;
    }
    ry += cardH + rowGap;
  });

  await desenharLogoLockup(cx, W, H);

  // Devolve a imagem; quem chama entrega (SorteioShow → salvarOuCompartilhar).
  const blob = await new Promise((res) => cv.toBlob(res, 'image/png'));
  if (!blob) throw new Error('Não deu para gerar o cartão.');
  return { blob, nome: `futty-sorteio-${(time.nome || 'time').toLowerCase().replace(/\s+/g, '-')}.png` };
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

  secs.forEach((s) => { s.linhas = linhasDe(s.jogs.length, maxPorLinha); s.h = L.hs + 18 + s.linhas.length * cardH + (s.linhas.length - 1) * rowGap; });

  // título "ESCALAÇÃO" (3×) + meta = 1º item do bloco distribuído
  const tituloH = 120 + 14 + 32;
  const itens = [{ tipo: 'titulo', h: tituloH }, ...secs.map((s) => ({ tipo: 'sec', h: s.h, sec: s }))];
  const totalH = itens.reduce((a, it) => a + it.h, 0);
  const espaco = Math.max(18, (boxH - totalH) / (itens.length + 1)); // space-evenly (com piso p/ times grandes)

  // — carrega TODAS as imagens (avatar real → urlAsset; sem foto → silhueta da cor) —
  await Promise.all(secs.map((s) => carregarFotosDoTime(s.jogs, s.res ? RES_COR.c : s.cor.c)));
  try { await document.fonts.ready; } catch { /* SSR/priv */ }

  desenharFundoCasa(cx, W, H);

  // ── distribui o bloco (título + secções) verticalmente ──
  let y = boxTop + espaco;
  itens.forEach((it) => {
    if (it.tipo === 'titulo') {
      const baseline = desenharTituloGradiente(cx, 'ESCALAÇÃO', W, y, 120);
      if (meta) { cx.fillStyle = '#a99fc0'; cx.font = '600 26px Rajdhani, sans-serif'; cx.fillText(meta, W / 2, baseline + 40); }
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
          desenharCartaoJogador(cx, rx, ry, L.cw, cardH, s.cor, (j.convidado ? '· ' : '') + (j.nome || '?'), j._img);
          rx += L.cw + cardGap;
        }
        ry += cardH + rowGap;
      });
      cx.restore();
    }
    y += it.h + espaco;
  });

  await desenharLogoLockup(cx, W, H);

  // ── saída: dataURL (proof) + entrega (default): baixa na web, folha de
  //    compartilhar no app. `entrega` diz o que aconteceu ('cancelou' = a pessoa
  //    fechou a folha — quem chama não mostra "salvo").
  const url = cv.toDataURL('image/png');
  let entrega = null;
  if (opts.baixar !== false) {
    const blob = await new Promise((res) => cv.toBlob(res, 'image/png'));
    entrega = await salvarOuCompartilhar(blob, `futty-escalacao-${equipa.toLowerCase().replace(/\s+/g, '-')}.png`, { titulo: 'Escalação Futty' });
  }
  return { url, entrega };
}
