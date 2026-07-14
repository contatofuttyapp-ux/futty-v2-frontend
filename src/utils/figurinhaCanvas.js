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
async function construirCard({ largura = 400, altura = 600, jogador = {}, fundo = 'estadio', corFrame = 'dourado', fotoOverride = null, avatarZoom = 1, incluirAvatar = true, apenasAvatar = false, apenasMoldura = false, apenasPlacaNome = false }) {
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

  // Geometria do NOME (fonte única): baseline + tamanho da fonte + topo da placa.
  // O corte do avatar deriva daqui, por isso descer o nome desce o palco inteiro.
  const nomeY = H - 42 * k; // baseline do nome
  const nomeFonte = 52 * k; // tamanho da fonte do nome
  const placaTopo = nomeY - 42 * k; // topo da placa = linha de corte do avatar

  // Desenha o avatar real com enquadramento/zoom/posição fixos. Corte LIMPO (sem
  // fade) exactamente na linha onde a placa começa — a placa cobre a linha de corte.
  const desenharAvatar = () => {
    const boxW = W * 0.80;
    const boxH = H * 0.80;
    const scale = Math.min(boxW / avatar.naturalWidth, boxH / avatar.naturalHeight) * avatarZoom;
    const dw = avatar.naturalWidth * scale;
    const dh = avatar.naturalHeight * scale;
    const dx = (W - dw) / 2;
    // Topo do avatar a 16% da altura — a cabeça ganha respiro sob o frame.
    const dy = H * 0.16;

    // FASE 3.22 — Clip de TOPO: nada do avatar é desenhado acima de `limiteTopo`,
    // seja qual for dy/boxW/zoom → a linha dourada fina do frame fica sempre limpa.
    // limiteTopo = inset do highlight interior no topo (8.5*k, ver passo 6) + metade
    // do seu lineWidth (1.2*k / 2 = 0.6*k) + 4*k de respiro. NÃO corta a base — a
    // placa do nome é que cobre a parte de baixo do avatar. Mesma regra em todos os
    // caminhos (preview E Baixar), por consistência.
    const limiteTopo = 8.5 * k + 0.6 * k + 4 * k; // = 13.1*k
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, limiteTopo, W, H - limiteTopo);
    ctx.clip();
    ctx.shadowColor = 'rgba(0,0,0,0.9)';
    ctx.shadowBlur = 24 * k;
    ctx.shadowOffsetY = 4 * k;
    ctx.shadowOffsetX = 0;
    ctx.drawImage(avatar, dx, dy, dw, dh);
    ctx.restore();
  };

  // Placa do nome + nome. Usada no card completo (Baixar) E, isolada com fundo
  // transparente, na camada `apenasPlacaNome` do preview de 3 camadas.
  const desenharPlacaNome = () => {
    // FONTE DE VERDADE da geometria da placa — usada para DESENHAR a placa E para
    // posicionar o texto (centrado nos dois eixos). Centro horizontal = W/2.
    const placaW = W * 0.74;
    const placaX = (W - placaW) / 2; // centrada em W/2
    const placaY = placaTopo;
    const placaH = nomeY + 12 * k - placaTopo; // = 54*k
    const pc = 8 * k; // corte a 45° dos cantos

    // 4b. PLACA DO NOME — banner com cantos a 45°, borda dourada fina.
    {
      ctx.beginPath();
      ctx.moveTo(placaX + pc, placaY);
      ctx.lineTo(placaX + placaW - pc, placaY);
      ctx.lineTo(placaX + placaW, placaY + pc);
      ctx.lineTo(placaX + placaW, placaY + placaH - pc);
      ctx.lineTo(placaX + placaW - pc, placaY + placaH);
      ctx.lineTo(placaX + pc, placaY + placaH);
      ctx.lineTo(placaX, placaY + placaH - pc);
      ctx.lineTo(placaX, placaY + pc);
      ctx.closePath();
      const pg = ctx.createLinearGradient(0, placaY, 0, placaY + placaH);
      pg.addColorStop(0, 'rgba(5,8,16,0.88)');
      pg.addColorStop(1, 'rgba(5,8,16,0.82)');
      ctx.fillStyle = pg;
      ctx.fill();
      ctx.lineWidth = 1 * k;
      ctx.lineJoin = 'miter';
      ctx.miterLimit = 10;
      ctx.strokeStyle = 'rgba(212,160,23,0.5)';
      ctx.stroke();
    }
    // 5. NOME — centrado nos DOIS eixos da placa. Horizontal: textAlign center em
    // W/2 (= placaX + placaW/2). Vertical: baseline 'middle' no centro óptico da
    // placa + correcção óptica p/ maiúsculas (o 'middle' pesa ligeiramente p/ baixo).
    {
      ctx.save();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      // Fit-to-width (FASE 3.24): começa em nomeFonte e reduz em passos de 2*k até
      // caber na largura da placa menos padding, ou atingir o mínimo de 28*k.
      let nomeUpper = String(nome).toUpperCase();
      const larguraMax = placaW - 24 * k; // largura da placa menos padding
      const fonteMin = 28 * k;
      const lsPara = (f) => (3 * k) * (f / nomeFonte); // 3*k na base, proporcional
      let fonte = nomeFonte;
      const aplicarFonte = () => {
        ctx.font = `700 ${fonte}px 'Rajdhani', system-ui, sans-serif`;
        ctx.letterSpacing = `${lsPara(fonte)}px`;
      };
      aplicarFonte();
      while (ctx.measureText(nomeUpper).width > larguraMax && fonte > fonteMin) {
        fonte = Math.max(fonteMin, fonte - 2 * k);
        aplicarFonte();
      }
      // Defesa extra: nome absurdamente longo que nem a 28*k cabe → reticências.
      if (ctx.measureText(nomeUpper).width > larguraMax) {
        while (nomeUpper.length > 1 && ctx.measureText(nomeUpper + '…').width > larguraMax) nomeUpper = nomeUpper.slice(0, -1);
        nomeUpper += '…';
      }
      // Centro vertical da placa + correcção óptica das maiúsculas. Com baseline
      // 'middle' o centro visual das caps fica ~acima do meto → desce-se por medição:
      // factor 0.105 iguala o espaço acima/abaixo (±0.3px) em GUI (52) e CHAVO (30).
      const textoY = placaY + placaH / 2 + fonte * 0.105;
      ctx.lineWidth = 6 * k;
      ctx.strokeStyle = 'rgba(0,0,0,0.85)';
      ctx.lineJoin = 'round';
      ctx.strokeText(nomeUpper, W / 2, textoY);
      ctx.shadowColor = 'rgba(212,160,23,0.85)';
      ctx.shadowBlur = 24 * k;
      ctx.shadowOffsetY = 0;
      ctx.fillStyle = '#ffffff';
      ctx.fillText(nomeUpper, W / 2, textoY);
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      const tg = ctx.createLinearGradient(W * 0.2, 0, W * 0.8, 0);
      tg.addColorStop(0, '#ffffff');
      tg.addColorStop(0.5, '#f5e070');
      tg.addColorStop(1, '#ffffff');
      ctx.fillStyle = tg;
      ctx.fillText(nomeUpper, W / 2, textoY);
      ctx.letterSpacing = '0px';
      ctx.restore();
    }
  };

  // MODO CAMADA SÓ-AVATAR: canvas transparente, desenha só o avatar real.
  if (apenasAvatar) {
    if (avatar) desenharAvatar();
    ctx.restore();
    return canvas;
  }

  // MODO CAMADA SÓ-PLACA+NOME: canvas transparente, só placa e nome (sem fundo,
  // sem avatar, sem frame) — a camada de topo do preview, sempre visível.
  if (apenasPlacaNome) {
    desenharPlacaNome();
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

  // 3. AVATAR — só no card completo. Na camada apenasMoldura é omitido (o jogador
  // é uma camada à parte por cima das partículas); as iniciais de fallback idem.
  if (apenasMoldura) {
    // moldura: sem avatar nem iniciais de fallback.
  } else if (avatar) {
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

  // 4. GRADIENTE INFERIOR (depois do avatar). Suavizado (stop 0.72) porque a placa
  // do nome passou a dar o contraste — este gradiente só ajuda a zona do dissolve
  // por cima da placa.
  const gb = ctx.createLinearGradient(0, H * 0.74, 0, H);
  gb.addColorStop(0, 'rgba(0,0,0,0)');
  gb.addColorStop(1, 'rgba(0,0,0,0.72)');
  ctx.fillStyle = gb;
  ctx.fillRect(0, H * 0.74, W, H * 0.26);

  // 4b + 5. PLACA + NOME — no card completo desenham-se aqui (depois do avatar,
  // antes do frame). No preview são a camada de topo (apenasPlacaNome), por isso
  // na moldura são omitidos aqui.
  if (!apenasMoldura) desenharPlacaNome();

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

// Três camadas para o preview do studio, para o avatar inteiro não tapar nada:
//   fundoBlob   = moldura (fundo+holofotes+gradiente+frame, SEM avatar/placa/nome)
//   jogadorBlob = só o avatar (transparente) — vai por cima das partículas
//   placaBlob   = só placa+nome (transparente) — camada de topo, sempre visível
// Partículas entram entre fundo e jogador; a placa fica acima do jogador.
export async function gerarCamadasFigurinha(opts = {}) {
  const [molduraCanvas, jogadorCanvas, placaCanvas] = await Promise.all([
    construirCard({ ...opts, largura: 400, altura: 600, apenasMoldura: true }),
    construirCard({ ...opts, largura: 400, altura: 600, apenasAvatar: true }),
    construirCard({ ...opts, largura: 400, altura: 600, apenasPlacaNome: true }),
  ]);
  const [fundoBlob, jogadorBlob, placaBlob] = await Promise.all([
    canvasParaBlob(molduraCanvas),
    canvasParaBlob(jogadorCanvas),
    canvasParaBlob(placaCanvas),
  ]);
  return { fundoBlob, jogadorBlob, placaBlob };
}
