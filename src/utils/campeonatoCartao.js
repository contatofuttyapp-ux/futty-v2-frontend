// Futty v2.0 — Cartões 9:16 do campeonato (v2) — espelho da celebração aprovada.
// Canvas 1080×1920, fundo da casa, marca FUTTY. Troféu DA CASA (mesmo path do Icon)
// desenhado grande; escudos dos times; confete composto à mão (não aleatório feio).
// PNG entregue por utils/salvarImagem.js (Rodada 8A): baixa na web, folha de
// compartilhar no app. Dois cartões: campeão e pódio.
import { podioDe } from './campeonatoPodio';
import { salvarOuCompartilhar } from './salvarImagem';

// Path do troféu da casa (o mesmo de public/icons/trofeu.svg, viewBox 48×48).
const TROFEU = [
  'M13 9 L35 9 L31 25 L17 25 Z',
  'M13.5 11 L8 11 L8 17 L15 20',
  'M34.5 11 L40 11 L40 17 L33 20',
  'M24 25 L24 32',
  'M17 40 L31 40 L28 32 L20 32 Z',
];

function seeded(id) {
  const s = String(id || 'x');
  let h = 0;
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return () => { h = (h * 1103515245 + 12345) & 0x7fffffff; return h / 0x7fffffff; };
}

// O <a download> que vivia aqui não fazia nada dentro do app (WebView).
// Como antes, uma falha não sobe para a tela (os botões não têm aviso).
async function baixar(cv, nome) {
  const blob = await new Promise((resolve) => cv.toBlob(resolve, 'image/png'));
  if (!blob) return;
  try {
    await salvarOuCompartilhar(blob, nome, { titulo: 'Campeonato Futty' });
  } catch (e) {
    console.warn('[campeonatoCartao] não deu para entregar o cartão:', e?.message || e);
  }
}

function fundoCasa(cx, W, H) {
  const bg = cx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#100a1e');
  bg.addColorStop(1, '#050810');
  cx.fillStyle = bg;
  cx.fillRect(0, 0, W, H);
  const blob = (x, y, r, cor, a) => {
    const g = cx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, cor.replace('rgb', 'rgba').replace(')', `,${a})`));
    g.addColorStop(1, 'rgba(0,0,0,0)');
    cx.fillStyle = g;
    cx.fillRect(0, 0, W, H);
  };
  blob(540, 420, 780, 'rgb(139,92,246)', 0.32);
  blob(160, 1180, 720, 'rgb(212,160,23)', 0.18);
  blob(940, 1640, 720, 'rgb(139,92,246)', 0.16);
}

// Confete COMPOSTO à mão: ~22 tiras pequenas, opacity baixa, mais nas bordas/topo,
// centro (troféu+textos) livre. 70/30 ouro/roxo. PNG bonito parado.
function confeteComposto(cx, W, H, id, livreY = [0.18, 0.82]) {
  const rng = seeded(id);
  let postas = 0;
  let tent = 0;
  while (postas < 22 && tent < 400) {
    tent += 1;
    // enviesa p/ bordas (x) e topo (y)
    const x = rng() < 0.62 ? (rng() < 0.5 ? rng() * W * 0.24 : W - rng() * W * 0.24) : rng() * W;
    const y = Math.pow(rng(), 1.5) * H * 0.9;
    // deixa o centro (conteúdo) livre
    const noCentroX = x > W * 0.30 && x < W * 0.70;
    const noCentroY = y > H * livreY[0] && y < H * livreY[1];
    if (noCentroX && noCentroY) continue;
    const w = 9 + rng() * 8;
    const hh = 18 + rng() * 12;
    const roxa = rng() < 0.3;
    cx.save();
    cx.translate(x, y);
    cx.rotate((rng() - 0.5) * 1.3);
    cx.globalAlpha = 0.16 + rng() * 0.20;
    cx.fillStyle = roxa ? '#8b5cf6' : '#f0c94a';
    cx.fillRect(-w / 2, -hh / 2, w, hh);
    cx.restore();
    postas += 1;
  }
  cx.globalAlpha = 1;
}

// Troféu da casa desenhado grande, com glow suave por baixo.
function desenharTrofeu(cx, x, y, size, cor) {
  // glow suave por baixo
  cx.save();
  cx.fillStyle = 'rgba(212,160,23,0.30)';
  cx.filter = `blur(${Math.round(size * 0.12)}px)`;
  cx.beginPath();
  cx.arc(x, y, size * 0.5, 0, Math.PI * 2);
  cx.fill();
  cx.restore();
  // troféu (stroke)
  cx.save();
  cx.translate(x - size / 2, y - size / 2);
  cx.scale(size / 48, size / 48);
  cx.strokeStyle = cor;
  cx.lineJoin = 'miter';
  cx.lineCap = 'butt';
  cx.lineWidth = 1.9;
  TROFEU.forEach((d) => cx.stroke(new Path2D(d)));
  cx.restore();
}

// Escudo do time: octógono na cor do kit + inicial (fallback digno; era a "bolinha").
function desenharEscudo(cx, x, y, r, cor, nome) {
  const c = r * 0.42;
  const p = new Path2D();
  p.moveTo(x - r + c, y - r); p.lineTo(x + r - c, y - r); p.lineTo(x + r, y - r + c);
  p.lineTo(x + r, y + r - c); p.lineTo(x + r - c, y + r); p.lineTo(x - r + c, y + r);
  p.lineTo(x - r, y + r - c); p.lineTo(x - r, y - r + c); p.closePath();
  cx.save();
  cx.fillStyle = cor;
  cx.shadowColor = cor;
  cx.shadowBlur = r * 0.5;
  cx.fill(p);
  cx.shadowBlur = 0;
  cx.strokeStyle = 'rgba(255,255,255,0.55)';
  cx.lineWidth = Math.max(2, r * 0.06);
  cx.stroke(p);
  cx.fillStyle = 'rgba(10,8,4,0.82)';
  cx.font = `800 ${Math.round(r * 1.05)}px Rajdhani, sans-serif`;
  cx.textAlign = 'center';
  cx.textBaseline = 'middle';
  cx.fillText((nome || '?').trim().slice(0, 1).toUpperCase(), x, y + r * 0.06);
  cx.restore();
}

function elipsa(cx, txt, max) {
  if (cx.measureText(txt).width <= max) return txt;
  let t = txt;
  while (t.length > 1 && cx.measureText(`${t}…`).width > max) t = t.slice(0, -1);
  return `${t}…`;
}

// ===== CARTÃO DO CAMPEÃO =====
export function canvasCartaoCampeao(campeonato) {
  const camp = campeonato?.campeao;
  if (!camp) throw new Error('Sem campeão.');
  const W = 1080;
  const H = 1920;
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const cx = cv.getContext('2d');
  fundoCasa(cx, W, H);
  confeteComposto(cx, W, H, campeonato.id, [0.16, 0.86]);

  cx.textAlign = 'center';
  cx.textBaseline = 'alphabetic';
  // marca
  cx.fillStyle = '#f0c94a';
  cx.font = '800 96px Rajdhani, sans-serif';
  cx.fillText('FUTTY', W / 2, 190);
  // tier
  cx.fillStyle = 'rgba(201,182,255,0.95)';
  cx.font = '800 62px Rajdhani, sans-serif';
  cx.fillText('C A M P E Ã O', W / 2, 380);

  // troféu GRANDE (domina)
  desenharTrofeu(cx, W / 2, 760, 480, '#f0c94a');

  // escudo do time campeão
  desenharEscudo(cx, W / 2, 1120, 96, camp.cor, camp.nome);

  // nome do campeão — destaque real
  cx.fillStyle = camp.cor;
  cx.font = '800 150px Rajdhani, sans-serif';
  cx.shadowColor = camp.cor;
  cx.shadowBlur = 46;
  cx.fillText(elipsa(cx, camp.nome.toUpperCase(), W - 120), W / 2, 1400);
  cx.shadowBlur = 0;

  // campeonato
  cx.fillStyle = 'rgba(255,255,255,0.72)';
  cx.font = '600 50px Rajdhani, sans-serif';
  cx.fillText(elipsa(cx, campeonato.nome, W - 200), W / 2, 1500);

  // rodapé
  cx.fillStyle = 'rgba(255,255,255,0.42)';
  cx.font = '600 42px Rajdhani, sans-serif';
  cx.fillText('futty.app', W / 2, H - 96);
  return cv;
}

export async function gerarCartaoCampeao(campeonato) {
  const cv = canvasCartaoCampeao(campeonato);
  const camp = campeonato.campeao;
  await baixar(cv, `campeao-${camp.nome.toLowerCase().replace(/\s+/g, '-')}.png`);
}

// ===== CARTÃO DO PÓDIO =====
export function canvasCartaoPodio(campeonato) {
  const podio = podioDe(campeonato).filter((t) => t.times.length);
  if (podio.length < 3) throw new Error('Sem pódio.');
  const byPos = Object.fromEntries(podio.map((t) => [t.pos, t]));
  const W = 1080;
  const H = 1920;
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const cx = cv.getContext('2d');
  fundoCasa(cx, W, H);
  confeteComposto(cx, W, H, campeonato.id, [0.30, 0.92]);

  cx.textAlign = 'center';
  // CABEÇALHO DIGNO (v3): marca + troféu da casa + PÓDIO + campeonato — sem vazio.
  cx.fillStyle = '#f0c94a';
  cx.font = '800 92px Rajdhani, sans-serif';
  cx.fillText('FUTTY', W / 2, 180);
  desenharTrofeu(cx, W / 2, 420, 240, '#f0c94a');
  cx.fillStyle = 'rgba(201,182,255,0.95)';
  cx.font = '800 66px Rajdhani, sans-serif';
  cx.fillText('P Ó D I O', W / 2, 640);
  cx.fillStyle = 'rgba(255,255,255,0.8)';
  cx.font = '700 52px Rajdhani, sans-serif';
  cx.fillText(elipsa(cx, campeonato.nome, W - 180), W / 2, 720);

  const chao = 1740;
  const cols = [
    { t: byPos[2], x: W / 2 - 342, largura: 300, altura: 420, tier: '#aab4c8' },
    { t: byPos[1], x: W / 2, largura: 366, altura: 560, tier: '#f0c94a' },
    { t: byPos[3], x: W / 2 + 342, largura: 300, altura: 330, tier: '#c2652e' },
  ];
  cols.forEach(({ t, x, largura, altura, tier }) => {
    if (!t) return;
    const topo = chao - altura;
    const time = t.times[0];
    const p1 = t.pos === 1;
    // degrau
    cx.fillStyle = 'rgba(255,255,255,0.05)';
    cx.strokeStyle = tier;
    cx.lineWidth = p1 ? 8 : 5;
    if (p1) { cx.shadowColor = tier; cx.shadowBlur = 55; }
    cx.beginPath();
    cx.rect(x - largura / 2, topo, largura, altura);
    cx.fill();
    cx.stroke();
    cx.shadowBlur = 0;
    // número do lugar (base do degrau)
    cx.fillStyle = tier;
    cx.font = `800 ${p1 ? 150 : 110}px Rajdhani, sans-serif`;
    cx.textBaseline = 'alphabetic';
    cx.fillText(`${t.pos}º`, x, topo + (p1 ? 172 : 132));
    // ordem vertical ACIMA do degrau: escudo (topo) → respiro → nome → respiro → degrau
    const nomeFs = p1 ? 50 : 42;
    const nomeBaseline = topo - 34; // nome logo acima do degrau
    cx.fillStyle = '#fff';
    cx.textBaseline = 'alphabetic';
    cx.font = `800 ${nomeFs}px Rajdhani, sans-serif`;
    cx.fillText(elipsa(cx, time.nome, largura + 40), x, nomeBaseline);
    const er = p1 ? 78 : 60;
    const escudoCy = nomeBaseline - nomeFs - 28 - er; // respiro entre nome e escudo
    desenharEscudo(cx, x, escudoCy, er, time.cor, time.nome);
  });

  cx.fillStyle = 'rgba(255,255,255,0.42)';
  cx.font = '600 42px Rajdhani, sans-serif';
  cx.fillText('futty.app', W / 2, H - 96);
  return cv;
}

export async function gerarCartaoPodio(campeonato) {
  const cv = canvasCartaoPodio(campeonato);
  await baixar(cv, `podio-${campeonato.nome.toLowerCase().replace(/\s+/g, '-')}.png`);
}
