// Futty v2.0 — Os selos de honra desenhados no cromo (canto de cima à direita).

// Selos de honra — desenhados no cromo (top-right). Path do troféu da
// casa (= icons/trofeu.svg) + tiers metálicos. Forma A (postal denteado).
const SELO_TROFEU = ['M13 9 L35 9 L31 25 L17 25 Z', 'M13.5 11 L8 11 L8 17 L15 20', 'M34.5 11 L40 11 L40 17 L33 20', 'M24 25 L24 32', 'M17 40 L31 40 L28 32 L20 32 Z'];
const SELO_TIERS = {
  ouro: { m1: '#fff2cc', m2: '#f0c94a', m3: '#d4a017', m4: '#8a6a10', glow: 'rgba(212,160,23,0.7)', ink: '#3a2c08' },
  prata: { m1: '#f4f8fd', m2: '#cbd5e2', m3: '#aab4c8', m4: '#69717e', glow: 'rgba(180,190,210,0.6)', ink: '#333a45' },
  bronze: { m1: '#f3d0b0', m2: '#d98a52', m3: '#c2652e', m4: '#763a18', glow: 'rgba(210,120,60,0.55)', ink: '#3d1e0c' },
};

// Um selo (forma A postal denteado): octógono metálico + troféu da casa + faixa.
function desenharUmSelo(cx, x, y, w, tier, label) {
  const h = w * 1.2;
  const T = SELO_TIERS[tier] || SELO_TIERS.ouro;
  const c = w * 0.22;
  const l = x - w / 2; const r = x + w / 2; const tp = y - h / 2; const bt = y + h / 2;
  const p = new Path2D();
  p.moveTo(l + c, tp); p.lineTo(r - c, tp); p.lineTo(r, tp + c); p.lineTo(r, bt - c);
  p.lineTo(r - c, bt); p.lineTo(l + c, bt); p.lineTo(l, bt - c); p.lineTo(l, tp + c); p.closePath();
  const g = cx.createLinearGradient(l, tp, r, bt);
  g.addColorStop(0, T.m1); g.addColorStop(0.3, T.m2); g.addColorStop(0.55, T.m3); g.addColorStop(0.7, T.m2); g.addColorStop(1, T.m4);
  cx.save();
  cx.shadowColor = T.glow; cx.shadowBlur = w * 0.28;
  cx.fillStyle = g; cx.fill(p);
  cx.shadowBlur = 0;
  cx.strokeStyle = T.m1; cx.globalAlpha = 0.6; cx.lineWidth = Math.max(1, w * 0.035); cx.stroke(p); cx.globalAlpha = 1;
  cx.clip(p);
  // troféu da casa
  cx.save();
  const ts = w * 0.56;
  cx.translate(x - ts / 2, (y - h * 0.16) - ts / 2);
  cx.scale(ts / 48, ts / 48);
  cx.strokeStyle = T.ink; cx.lineJoin = 'miter'; cx.lineWidth = 2.2;
  SELO_TROFEU.forEach((d) => cx.stroke(new Path2D(d)));
  cx.restore();
  // faixa com o texto
  const ribH = h * 0.24; const ribY = y + h * 0.22;
  cx.fillStyle = 'rgba(14,9,3,0.92)';
  cx.fillRect(l + w * 0.05, ribY - ribH / 2, w - w * 0.10, ribH);
  cx.fillStyle = T.m1; cx.textAlign = 'center'; cx.textBaseline = 'middle';
  let fs = w * 0.19;
  cx.font = `800 ${fs}px Rajdhani, sans-serif`;
  const maxw = w - w * 0.16;
  while (cx.measureText(label).width > maxw && fs > w * 0.08) { fs -= 0.5; cx.font = `800 ${fs}px Rajdhani, sans-serif`; }
  cx.fillText(label, x, ribY);
  cx.restore();
}

export { desenharUmSelo };
