// Futty v2.0 — Cartão de partilha 9:16 do sorteio (SPEC-SORTEIO §9: a via de
// imagem — o vídeo morreu). Um cartão por equipa: fundo da casa (aurora fake),
// kit do time (OURO/ROXO/PRATA/BRONZE), lista de jogadores, marca FUTTY.
// Canvas puro (1080×1920) → download PNG.
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
