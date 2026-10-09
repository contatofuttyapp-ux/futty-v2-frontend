// Futty v2.0 — Cartazes do sorteio (SPEC-SORTEIO §9: a via de imagem — o vídeo morreu).
// Duas saídas, MESMA identidade visual (peças partilhadas, não imitação):
//   gerarCartao916      — 1 imagem POR equipa (botões "9:16 · Time X").
//   gerarCartazEscalacao — o cartaz ÚNICO com TODOS os times (botão "Guardar" da máquina).
// Canvas puro (1080×1920) → PNG. A entrega é do utils/salvarImagem.js:
// na web baixa; no app abre a folha de compartilhar — o <a download> não faz nada
// dentro do WebView.
import { urlAsset, urlImagem } from './avatar';
import { avatarGenericoUrl } from './avatarGenerico';
import { salvarOuCompartilhar } from './salvarImagem';
import { nomeDoTimeNaTela } from './nomeDoTime';
import { CORES_DO_SELO } from './seloDoSorteio';
import { PONTO_CONVIDADO, TEXTO_SEM_O_APP, temConvidado } from './marcaConvidado';

const KITS = [
  { n: 'OURO', c: '#d4a017' },
  { n: 'ROXO', c: '#8b5cf6' },
  { n: 'PRATA', c: '#aab4c8' },
  { n: 'BRONZE', c: '#c2652e' },
];
const RES_COR = { c: '#8a90a0', g: 'rgba(138,144,160,.45)' }; // cinza-aço apagado (à espera, sem dono)

// silhueta-casa angulosa (MESMA geometria de SilhuetaJogador / CerimoniaSorteio) — era o
// placeholder de pessoa sem foto; no cartaz (Rodada 30A, dono 8-out) o placeholder passou a
// ser o AVATAR GENÉRICO da casa, com zoom 1,2 (ver carregarFotosDoTime/desenharCover) — esta
// silhueta fica como fallback se o genérico não carregar. Tinge com a cor do contexto.
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
// object-fit: cover dentro de (dx,dy,dw,dh); focoY = object-position vertical (0..1). 0 = do TOPO
// do recorte, como o CSS da cerimônia (object-position 50% 0%) e o canvas do cromo — um 0,08 como
// default deslocava a foto do que a pessoa enquadrou (e cada tela, um pouco diferente da outra).
// zoom > 1 = SÓ o avatar genérico (Rodada 30A): mesmo recorte de sempre, mas o DESTINO cresce a
// partir do topo-centro e recorta ao retângulo original — o mesmo efeito do `transform:scale()`
// do CSS na cerimônia (cabeça no lugar, crescendo para os lados e para baixo).
function desenharCover(cx, img, dx, dy, dw, dh, focoY = 0, zoom = 1) {
  const ir = img.width / img.height; const dr = dw / dh;
  let sw; let sh; let sx; let sy;
  if (ir > dr) { sh = img.height; sw = sh * dr; sx = (img.width - sw) / 2; sy = 0; }
  else { sw = img.width; sh = sw / dr; sx = 0; sy = (img.height - sh) * focoY; }
  if (zoom === 1) { cx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh); return; }
  const dw2 = dw * zoom; const dh2 = dh * zoom; const dx2 = dx - (dw2 - dw) / 2;
  cx.save();
  cx.beginPath(); cx.rect(dx, dy, dw, dh); cx.clip();
  cx.drawImage(img, sx, sy, sw, sh, dx2, dy, dw2, dh2);
  cx.restore();
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

// Quanto a linha de baixo (data · time) fica abaixo da linha de base do título — item 73: a cedilha do "ESCALAÇÃO" (120 px) desce
// ~27 px e a linha antiga (+40, corpo 26: o topo das letras em ~+21) passava por cima dela.
export const DESCE_META_ESCALACAO = 70;
export const DESCE_META_916 = 72;

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

// O SELO do sorteio no cartão — a mesma chapa da tela (components/SeloDoSorteio.jsx): SORTEADO (ouro), SORTEADO E
// AJUSTADO POR <nome> (roxo), MONTADO À MÃO POR <nome> (prata), canto a 45° em cima à esquerda e embaixo à direita. A
// imagem vai para o grupo: é nela que o selo mais precisa estar. Mede ANTES (o cartaz distribui o bloco pela altura)
// e desenha depois. A letra encolhe até caber; se nem no mínimo couber, quebra em duas linhas — o nome de quem fez o
// ajuste nunca é cortado. `detalhe` ("2º sorteio deste jogo") numa linha discreta embaixo.
function prepararSelo(cx, selo, W, { corpo = 30, minimo = 18, larguraMax = W - 160 } = {}) {
  if (!selo?.texto) return { altura: 0, desenhar: () => {} };
  const cor = CORES_DO_SELO[selo.tipo] || CORES_DO_SELO.sorteado;
  const texto = selo.texto.toUpperCase();
  const pad = 30;
  const fonte = (px) => {
    cx.font = `700 ${px}px Rajdhani, sans-serif`;
    if ('letterSpacing' in cx) cx.letterSpacing = `${Math.round(px * 0.14)}px`;
  };
  const largura = (linhas, px) => { fonte(px); return Math.max(...linhas.map((l) => cx.measureText(l).width)); };
  let linhas = [texto];
  let px = corpo;
  while (largura(linhas, px) + pad * 2 > larguraMax && px > minimo) px -= 1;
  if (largura(linhas, px) + pad * 2 > larguraMax) {
    // quebra no espaço mais perto do meio e recomeça do corpo cheio
    let corte = -1;
    for (let i = 0; i < texto.length; i += 1) if (texto[i] === ' ' && (corte < 0 || Math.abs(i - texto.length / 2) < Math.abs(corte - texto.length / 2))) corte = i;
    if (corte > 0) linhas = [texto.slice(0, corte), texto.slice(corte + 1)];
    px = corpo;
    while (largura(linhas, px) + pad * 2 > larguraMax && px > 12) px -= 1;
  }
  const entre = px * 1.22;
  const alturaChapa = Math.round(linhas.length * entre + px * 0.85);
  const larguraChapa = Math.min(larguraMax, Math.round(largura(linhas, px) + pad * 2));
  const pxDetalhe = Math.round(px * 0.72);
  const altura = alturaChapa + (selo.detalhe ? Math.round(pxDetalhe * 1.9) : 0);
  if ('letterSpacing' in cx) cx.letterSpacing = '0px';
  const desenhar = (y) => {
    const x = (W - larguraChapa) / 2;
    const c = Math.round(alturaChapa * 0.3);
    cx.save();
    cx.beginPath();
    cx.moveTo(x + c, y); cx.lineTo(x + larguraChapa, y); cx.lineTo(x + larguraChapa, y + alturaChapa - c);
    cx.lineTo(x + larguraChapa - c, y + alturaChapa); cx.lineTo(x, y + alturaChapa); cx.lineTo(x, y + c); cx.closePath();
    const g = cx.createLinearGradient(x, 0, x + larguraChapa, 0);
    g.addColorStop(0, cor.de); g.addColorStop(1, cor.ate);
    cx.fillStyle = g; cx.fill();
    fonte(px);
    cx.fillStyle = cor.texto; cx.textAlign = 'center'; cx.textBaseline = 'middle';
    linhas.forEach((l, i) => cx.fillText(l, W / 2, y + px * 0.42 + entre * (i + 0.5)));
    if (selo.detalhe) {
      fonte(pxDetalhe);
      cx.fillStyle = cor.detalhe;
      cx.fillText(selo.detalhe.toUpperCase(), W / 2, y + alturaChapa + pxDetalhe * 1.05);
    }
    if ('letterSpacing' in cx) cx.letterSpacing = '0px';
    cx.restore();
  };
  return { altura, desenhar };
}

// O ponto antes do nome do convidado (desenharCartaoJogador, acima) só se explica uma vez, no fim da seção que
// o tem — nenhuma outra explicação, nada quando não há convidado. Centrada, discreta, uma linha.
const ALTURA_NOTA_CONVIDADO = 26;
function desenharNotaConvidado(cx, W, y) {
  cx.save();
  cx.fillStyle = 'rgba(255,255,255,0.4)';
  cx.font = '600 18px Rajdhani, sans-serif';
  cx.textAlign = 'center'; cx.textBaseline = 'alphabetic';
  cx.fillText(TEXTO_SEM_O_APP, W / 2, y);
  cx.restore();
}

// Marca FUTTY na base — logo REAL (não texto) + wordmark. MESMO lockup do ESCALAÇÃO.
async function desenharLogoLockup(cx, W, H) {
  const logo = await carregarImagem('/futty-logo-flat.webp');
  const by = H - 58;
  cx.textBaseline = 'middle';
  cx.font = '800 32px Rajdhani, sans-serif'; const wF = cx.measureText('Futty').width;
  cx.font = '600 22px Rajdhani, sans-serif'; const wT = cx.measureText('· O seu time. A sua figurinha.').width;
  const totalW = 50 + 16 + wF + 16 + wT; let bx = (W - totalW) / 2;
  if (logo) cx.drawImage(logo, bx, by - 25, 50, 50);
  bx += 50 + 16;
  const bg2 = cx.createLinearGradient(0, by - 16, 0, by + 16);
  bg2.addColorStop(0, '#fff7d8'); bg2.addColorStop(0.5, '#f5d060'); bg2.addColorStop(1, '#c8940f');
  cx.fillStyle = bg2; cx.textAlign = 'left'; cx.font = '800 32px Rajdhani, sans-serif';
  cx.fillText('Futty', bx, by); bx += wF + 16;
  cx.fillStyle = '#7d7791'; cx.font = '600 22px Rajdhani, sans-serif';
  cx.fillText('· O seu time. A sua figurinha.', bx, by);
}

// Um cartão de jogador (foto/genérico/silhueta + placa de nome, chanfro + filete duplo na cor).
// `generico` = zoom 1,2 (Rodada 30A); foto real nunca o leva.
function desenharCartaoJogador(cx, x, y, w, h, cor, nome, img, generico = false) {
  cx.save(); chanfro(cx, x, y, w, h); cx.clip();
  cx.fillStyle = '#0b0b11'; cx.fillRect(x, y, w, h);
  const fh = h * 0.78;
  if (img) desenharCover(cx, img, x, y, w, fh, 0, generico ? 1.2 : 1);
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

// Carrega as imagens (foto real → urlAsset; sem foto → avatar genérico; se nem esse
// carregar, a silhueta da cor) de uma lista de jogadores, guardando em `j._img` e, para
// o cartaz saber se aplica o zoom 1,2, em `j._generico`.
async function carregarFotosDoTime(jogadores, cor) {
  await Promise.all(jogadores.map(async (j) => {
    let img = j.avatar_url ? await carregarImagem(urlImagem(urlAsset(j.avatar_url), 512)) : null;
    let generico = false;
    if (!img && !j.avatar_url) {
      img = await carregarImagem(avatarGenericoUrl(j.user_id || null, j.avatar_generico || null, j.nome || ''));
      generico = !!img;
    }
    if (!img) img = await carregarImagem(silhuetaURI(cor));
    j._img = img;
    j._generico = generico;
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
// `opts.selo` (utils/seloDoSorteio.js): o selo de como os times foram feitos, logo abaixo da linha da equipe.
export async function gerarCartao916(resultado, timeIndex, nomeEquipa, opts = {}) {
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
  // O nome é o MESMO da cerimônia e dos botões ("Time Ouro"), não o "Time A" do motor.
  const nomeDoTime = nomeDoTimeNaTela(time.nome, timeIndex);
  const baseline = desenharTituloGradiente(cx, nomeDoTime.toUpperCase(), W, y, 110);
  // A linha de baixo DESCE — colada no título, ela cobria a cedilha (Ç) e as descendentes do nome do time.
  // DESCE_META px abaixo da linha de base: livra a perna mais funda das letras do título (~0,22 do corpo).
  // Times montados à mão não foram sorteados: a linha diz "times", não "sorteio".
  const aMao = opts.selo?.tipo === 'manual';
  cx.fillStyle = '#a99fc0'; cx.textAlign = 'center'; cx.font = '600 30px Rajdhani, sans-serif';
  cx.fillText([nomeEquipa, aMao ? 'times' : 'sorteio'].filter(Boolean).join(' · ').toUpperCase(), W / 2, baseline + DESCE_META_916);
  const selo = prepararSelo(cx, opts.selo, W, { corpo: 30 });
  selo.desenhar(baseline + DESCE_META_916 + 30);

  // grelha de cartões (mesma lógica adaptativa do ESCALAÇÃO, para 1 time só).
  const boxX = 64; const boxTop = baseline + DESCE_META_916 + 66 + (selo.altura ? selo.altura + 20 : 0); const boxRight = W - 64; const boxBottom = H - 150;
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
      const marca = j.goleiro ? ' (GOL)' : j.cabeca_chave ? ' (C)' : '';
      desenharCartaoJogador(cx, rx, ry, L.cw, cardH, kit, (j.convidado ? PONTO_CONVIDADO : '') + (j.nome || '?') + marca, j._img, j._generico);
      rx += L.cw + cardGap;
    }
    ry += cardH + rowGap;
  });
  if (temConvidado(jogs)) {
    const yNota = ry - rowGap + 28;
    if (yNota < boxBottom + 40) desenharNotaConvidado(cx, W, yNota);
  }

  await desenharLogoLockup(cx, W, H);

  // Devolve a imagem; quem chama entrega (SorteioShow → salvarOuCompartilhar).
  const blob = await new Promise((res) => cv.toBlob(res, 'image/png'));
  if (!blob) throw new Error('Não deu para gerar o cartão. Tente de novo.');
  return { blob, nome: `futty-sorteio-${nomeDoTime.toLowerCase().replace(/\s+/g, '-')}.png` };
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
  const secs = times.map((t, i) => ({ cor: { c: KITS[i % 4].c, g: comAlfa(KITS[i % 4].c, 0.55) }, nome: nomeDoTimeNaTela(t.nome, i), jogs: t.jogadores || [], res: false }));
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

  secs.forEach((s) => {
    s.linhas = linhasDe(s.jogs.length, maxPorLinha);
    s.temConv = temConvidado(s.jogs);
    s.h = L.hs + 18 + s.linhas.length * cardH + (s.linhas.length - 1) * rowGap + (s.temConv ? ALTURA_NOTA_CONVIDADO : 0);
  });

  // título "ESCALAÇÃO" (3×) + meta = 1º item do bloco distribuído. Item 73: a meta (data · time) desce para baixo da cedilha do Ç.
  // O selo (opts.selo) vem logo abaixo da meta e entra na altura do título, para o space-evenly contar com ele. Medido
  // com a Rajdhani já carregada (com a letra de reserva a chapa sairia com outra largura).
  try { await document.fonts.ready; } catch { /* SSR/priv */ }
  const selo = prepararSelo(cx, opts.selo, W, { corpo: 28 });
  const tituloH = 120 + (DESCE_META_ESCALACAO - 26) + 32 + (selo.altura ? selo.altura + 22 : 0);
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
      if (meta) { cx.fillStyle = '#a99fc0'; cx.font = '600 26px Rajdhani, sans-serif'; cx.fillText(meta, W / 2, baseline + DESCE_META_ESCALACAO); }
      selo.desenhar(baseline + DESCE_META_ESCALACAO + 28);
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
          desenharCartaoJogador(cx, rx, ry, L.cw, cardH, s.cor, (j.convidado ? PONTO_CONVIDADO : '') + (j.nome || '?'), j._img, j._generico);
          rx += L.cw + cardGap;
        }
        ry += cardH + rowGap;
      });
      if (s.temConv) desenharNotaConvidado(cx, W, ry - rowGap + 24);
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
