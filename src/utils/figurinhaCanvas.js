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

// FASE 3.51 — BASE ESCURA partilhada: fonte de verdade única do gradiente vertical.
// O 'épico' constrói-se por cima dela; o 'neutro' é ela + vinheta, e nada mais. Antes
// o neutro era preto puro (#000) e destoava — agora os dois fundos partem do mesmo
// sítio e mudam só no que se lhes acrescenta.
function desenharBaseEscura(ctx, W, H) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#16161c');
  g.addColorStop(0.5, '#1d1d24');
  g.addColorStop(1, '#101014');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

// FASE 3.51 — VINHETA partilhada (elíptica, só nas margens), pelo mesmo motivo.
function desenharVinheta(ctx, W, H) {
  ctx.save();
  ctx.translate(W / 2, H * 0.45);
  ctx.scale(1, H / W);
  const vin = ctx.createRadialGradient(0, 0, 0, 0, 0, W * 0.62);
  vin.addColorStop(0, 'rgba(20,12,0,0)');
  vin.addColorStop(0.6, 'rgba(20,12,0,0)');
  vin.addColorStop(1, 'rgba(20,12,0,0.55)');
  ctx.fillStyle = vin;
  ctx.fillRect(-W, -H, W * 2, H * 2);
  ctx.restore();
}

// Fundo "Neutro" — a base partilhada + vinheta. Sem honeycomb, sem F, sem luz radial.
export function desenharFundoNeutro(ctx, W, H) {
  desenharBaseEscura(ctx, W, H);
  desenharVinheta(ctx, W, H);
}

// Fundo "Épico" — honeycomb alinhado ao ângulo do F + monograma como marca de água,
// placa 3D (pseudo-perspectiva), luz central e vinheta. EXPORTADO para o tile da UI
// renderizar o FUNDO REAL em miniatura (em vez de uma imitação em CSS/SVG).
// Ordem: base → [hexágonos + F, DESFOCADOS] → luz central → vinheta.
//
// `intensidade` multiplica SÓ o alpha das arestas do honeycomb. O card usa 1 (a
// discrição desenhada); o tile de 120×120 usa 3.0, senão o padrão desaparece na
// miniatura — a mesma geometria, legível à escala a que é vista.
export async function desenharFundoEpico(ctx, W, H, { intensidade = 1 } = {}) {
  const k = W / 400; // mesma convenção do card: os valores fixos escalam com a largura

  // a) Base: vertical muito escuro, quase monocromático (nítida).
  desenharBaseEscura(ctx, W, H);

  // b) PADRÃO num canvas OFFSCREEN → transferido com blur (só o padrão desfoca;
  //    base, luz e vinheta ficam nítidas). Seed FIXA → determinístico.
  const fLogo = await carregarImagem('/futty-logo-flat.png', false);
  // Offscreen 25% MAIOR que o card: a pseudo-perspectiva (skew) desloca as bordas
  // e, sem esta folga, ficariam faixas sem padrão nos limites do card.
  const off = document.createElement('canvas');
  const OW = Math.ceil(W * 1.25);
  const OH = Math.ceil(H * 1.25);
  off.width = OW;
  off.height = OH;
  const octx = off.getContext('2d');
  octx.lineWidth = 1 * k;
  let seed = 20240;
  const rnd = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  // Hexágonos "pointy-top": diagonal (vértice a vértice) = W*0.32 = 2R.
  const R = (W * 0.32) / 2;
  const passoX = Math.sqrt(3) * R;
  const passoY = 1.5 * R;
  // ROTAÇÃO: ANGULO_F = 14.52° — medido na haste principal do F de futty-logo-flat.png.
  const ANGULO_F = (14.52 * Math.PI) / 180;
  const alvoY = H / 3 - H / 2; // alinhamento fino ao terço superior
  octx.save();
  octx.translate(OW / 2, OH / 2);
  octx.rotate(ANGULO_F);
  octx.translate(0, alvoY + R);
  const M = Math.hypot(OW, OH) / 2 + 2 * R;
  for (let row = -Math.ceil(M / passoY); row * passoY <= M; row++) {
    for (let col = -Math.ceil(M / passoX); col * passoX <= M; col++) {
      const cx = col * passoX + (Math.abs(row % 2) ? passoX / 2 : 0);
      const cy = row * passoY;
      octx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (Math.PI / 3) * i - Math.PI / 2;
        const px = cx + R * Math.cos(a);
        const py = cy + R * Math.sin(a);
        if (i === 0) octx.moveTo(px, py);
        else octx.lineTo(px, py);
      }
      octx.closePath();
      // FASE 3.51 — as arestas passivas eram brancas (0.022); passaram a DOURADAS
      // (o dourado sobre esta base tem menos contraste que o branco, daí o alpha
      // subir). FASE 3.55 — mais dourado: 0.045 → 0.065 e 0.08 → 0.115. As "vivas"
      // são 12% das células. `intensidade` só existe para o tile (ver assinatura).
      const aPassiva = 0.065 * intensidade;
      const aViva = 0.115 * intensidade;
      octx.strokeStyle = rnd() < 0.12
        ? `rgba(212,160,23,${Math.min(aViva, 1)})`
        : `rgba(212,160,23,${Math.min(aPassiva, 1)})`;
      octx.stroke();
      // Monograma F: contra-rodado → haste PARALELA às linhas da grelha.
      if (fLogo && rnd() < 0.08) {
        const s = 2 * R * 0.6;
        octx.save();
        octx.translate(cx, cy);
        octx.rotate(-ANGULO_F);
        octx.globalAlpha = 0.03;
        octx.drawImage(fLogo, -s / 2, -s / 2, s, s);
        octx.restore();
      }
    }
  }
  octx.restore();
  // Transfere: blur + PSEUDO-PERSPECTIVA (canto sup-direito "para trás"), pivô no centro.
  ctx.save();
  ctx.filter = `blur(${1.2 * k}px)`;
  ctx.translate(W / 2, H / 2);
  // FASE C — pseudo-perspectiva mais assumida: skews b -0.06 → -0.085 e c 0.05 → 0.07
  // (~+40%). A ROTAÇÃO do padrão fica nos 14.52° do futty-logo-flat.png (fase 3.33) —
  // a fonte canónica. Medi fresco o F do kit fotografado e deu 15.52°, mas o Δ de 1° é
  // ruído: o logo no kit tem 51x61px, está impresso em tecido curvo e com sombra. Um
  // grau, num padrão com blur 1.2px e alpha 0.065, ninguém vê — e alinhar a marca pela
  // fotografia do produto em vez do vector seria ancorá-la no derivado.
  ctx.transform(1.02, -0.085, 0.07, 0.98, 0, 0);
  ctx.drawImage(off, -OW / 2, -OH / 2);
  ctx.restore();

  // c) Luz radial central suave atrás do peito/rosto.
  const luz = ctx.createRadialGradient(W / 2, H * 0.38, 0, W / 2, H * 0.38, H * 0.5);
  luz.addColorStop(0, 'rgba(255,255,255,0.05)');
  luz.addColorStop(0.55, 'rgba(255,255,255,0)');
  luz.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = luz;
  ctx.fillRect(0, 0, W, H);

  // d) Vinheta — a partilhada com o neutro (ver desenharVinheta).
  desenharVinheta(ctx, W, H);
}

// Desenha o card 2:3 num canvas próprio (largura×altura). `k` escala os valores
// fixos (fontes, badge, frame) para render nativo a qualquer resolução.
async function construirCard({ largura = 400, altura = 600, jogador = {}, fundo = 'estadio', corFrame = 'dourado', fotoOverride = null, avatarZoom = 1, apenasAvatar = false, apenasMoldura = false, apenasPlacaNome = false }) {
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
  // FASE 3.45 — Variante com inset POR-LADO. O `cut` é o mesmo nos quatro cantos, por
  // isso as diagonais continuam a 45° mesmo com insets diferentes (dx = dy = cut).
  const octagonoLados = (t, r, b, l) => {
    ctx.beginPath();
    ctx.moveTo(l + cut, t);
    ctx.lineTo(W - r - cut, t);
    ctx.lineTo(W - r, t + cut);
    ctx.lineTo(W - r, H - b - cut);
    ctx.lineTo(W - r - cut, H - b);
    ctx.lineTo(l + cut, H - b);
    ctx.lineTo(l, H - b - cut);
    ctx.lineTo(l, t + cut);
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
  const nomeFonte = 46 * k; // tamanho base da fonte do nome (FASE 3.36: era 52*k)
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
    // FASE 3.44 — Zoom ANCORADO AOS OLHOS. Antes fixava-se o topo (dy = H*0.12) e,
    // como dh cresce com avatarZoom, o olhar descia ao ampliar. Agora ancora-se o
    // ponto dos olhos: dy = EYE_Y - dh*EYE_FRAC. Como dh já inclui o zoom, os olhos
    // ficam sempre em EYE_Y e o corpo cresce à volta desse ponto.
    // EYE_FRAC medido no avatar gerado (445x680, já com trim+extend): pupila esquerda
    // a 20.9% e direita a 22.2% da altura do PNG (cabeça inclinada) → média 21.5%.
    // Confirma-se por retro-cálculo da 3.28: com dy=H*0.12 os olhos davam 29.2% do
    // card, o ~29% que essa fase mediu. (A 30% do PNG fica a BOCA, não os olhos.)
    const EYE_FRAC = 0.215;
    const EYE_Y = H * 0.30; // régua do terço superior da 3.28 (antes: 29.2% a 100%)
    const dy = EYE_Y - dh * EYE_FRAC;

    // FASE 3.26/3.45 — Clip OCTOGONAL: o avatar nunca é desenhado sobre o CORPO
    // dourado grosso do frame, em nenhum lado. Geometria medida do próprio frame:
    //   corpo grosso : path a 3.5*k, lineWidth 7*k  → ocupa [0, 7*k] de cada borda
    //   linha fina   : path a 8.5*k, lineWidth 1.2*k → ocupa [7.9*k, 9.1*k]
    // 3.45 — as LATERAIS deixam de parar na linha fina e vão até à borda interior do
    // corpo grosso (7*k) + 1*k de respiro = 8*k. A linha fina deixa de ser fronteira
    // lateral: o braço pode sobrepô-la na faixa [8, 9.1]*k (1.1*k). Topo e base ficam
    // nos 11.1*k da 3.26 — irrelevantes na prática (a 130% a cabeça está a y=84, com
    // 73px de folga, e a placa cobre a base).
    const insetTopo = 11.1 * k;
    const insetLado = 7 * k + 1 * k; // = 8*k
    ctx.save();
    octagonoLados(insetTopo, insetLado, insetTopo, insetLado);
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
      const fonteMin = 36 * k; // FASE 3.36: intervalo apertado (era 28*k)
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

  // FASE 3.46 — FRAME extraído para função. Antes vivia solto no fim (passo 6) e só
  // o card completo e a moldura o desenhavam; agora a camada de topo do preview
  // também o pede, para o preview ter a MESMA ordem de desenho do download
  // (frame por cima do avatar). Deve ser chamado SEMPRE depois do ctx.restore()
  // que remove o clip octogonal — o frame é inset e não quer recorte.
  const desenharFrame = () => {
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
  };

  // MODO CAMADA SÓ-AVATAR: canvas transparente, desenha só o avatar real.
  if (apenasAvatar) {
    if (avatar) desenharAvatar();
    ctx.restore();
    return canvas;
  }

  // MODO CAMADA SÓ-PLACA+NOME+FRAME: camada de TOPO do preview. FASE 3.46 — passa a
  // incluir o frame, para o braço (que agora chega ao corpo grosso) ficar por baixo
  // da linha fina, tal como no card único do download.
  if (apenasPlacaNome) {
    desenharPlacaNome();
    ctx.restore(); // sai do clip octogonal ANTES do frame, como no card completo
    desenharFrame();
    return canvas;
  }

  // 1. FUNDO
  if (fundo === 'preto') {
    // FASE 3.51 — 'preto' (label "Neutro") era #000 puro e destoava do épico. Passa a
    // partilhar a base escura: mesmo gradiente + vinheta, sem honeycomb/F/luz.
    desenharFundoNeutro(ctx, W, H);
  } else if (fundo === 'gradiente') {
    await desenharFundoEpico(ctx, W, H);
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
    desenharAvatar();
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

  // 6. FRAME — FASE 3.46: no card completo continua a desenhar-se aqui (depois do
  // avatar). Na camada `apenasMoldura` deixa de o ser: passou para a camada de topo
  // do preview (apenasPlacaNome), para o preview e o download ficarem idênticos.
  if (!apenasMoldura) desenharFrame();

  return canvas;
}

// Figurinha normal: card 2:3 a 400×600 → PNG completo (com jogador). Usado no
// Baixar/Compartilhar (uma imagem só).
export async function gerarFigurinhaCanvas(opts = {}) {
  const canvas = await construirCard({ ...opts, largura: 400, altura: 600 });
  return canvasParaBlob(canvas);
}

// Três camadas para o preview do studio, para o avatar inteiro não tapar nada:
//   fundoBlob   = fundo+holofotes+gradiente, SEM avatar/placa/nome E SEM FRAME
//   jogadorBlob = só o avatar (transparente) — vai por cima das partículas
//   placaBlob   = placa+nome+FRAME (transparente) — camada de topo, sempre visível
// Partículas entram entre fundo e jogador; placa+frame ficam acima do jogador.
// FASE 3.46 — o frame saiu do fundo para o topo: o braço encosta ao corpo dourado e
// a linha fina desenha-se POR CIMA dele, exactamente como no card único do download.
// Ordem no preview: fundo (z2) → partículas (z3) → jogador (z4) → placa+frame (z5).
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
