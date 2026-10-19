// Futty v2.0 — Geração da figurinha (PNG via canvas). Card 2:3 (base 400×600) e
// versão Story 9:16 (1080×1920) para o Instagram. Tudo no cliente, sem servidor.
import { urlAsset, urlImagem, nomeJogador } from './avatar';
import { getFrameColor } from './frameColors';
import { registarFasesCromo } from '../lib/diagnostico';
import { adiantarFundo, desenharFundoAura, desenharFundoEpico, desenharFundoEstadio, desenharFundoGolden, desenharFundoNeutro, desenharFundoRoyal } from './figurinhaFundos';
import { canvasParaBlob, carregarImagem, cronometro } from './figurinhaImagens';
import { desenharUmSelo } from './figurinhaSelos';

// Quem manda a foto do cromo à frente é o
// context/PerfilContext.jsx, mal o perfil aparece (inclusive vindo do cache
// local, antes de qualquer rede) — com um `new Image()` na MESMA URL que o
// `construirCard` pede aqui em baixo (urlImagem(…, 512)). O adiantamento tem de
// viver lá, não aqui: importar este módulo no arranque para poupar um decode
// seria pôr o desenhador inteiro no caminho da primeira pintura.

// Desenha o card 2:3 num canvas próprio (largura×altura). `k` escala os valores
// fixos (fontes, badge, frame) para render nativo a qualquer resolução.

// ONDE o avatar fica dentro do card. Extraído do desenho
// para poder ser usado também pela PRÉVIA em DOM do Início (ver CromoInicio):
// os dois têm de pôr o jogador exactamente no mesmo sítio, senão a troca da
// prévia pelo cromo desenhado salta à vista. Uma conta só, um sítio só.
//
// Zoom ANCORADO AOS OLHOS: fixar o topo (dy = H*0.12) faria o olhar descer ao ampliar, porque
// dh cresce com avatarZoom. Por isso ancora-se o ponto dos olhos: dy = EYE_Y - dh*EYE_FRAC. Como dh
// já inclui o zoom, os olhos ficam sempre em EYE_Y e o corpo cresce à volta desse ponto.
// EYE_FRAC medido no avatar gerado (445x680, já com trim+extend): pupila esquerda
// a 20.9% e direita a 22.2% da altura do PNG (cabeça inclinada) → média 21.5%.
const EYE_FRAC = 0.215;

export function enquadrarAvatar({ W, H, nw, nh, avatarZoom = 1, ehQuadrado = false }) {
  // Retrato quadrado: o jogador DOMINA o retrato (box +20%: 0.80 → 0.96). O card
  // 2:3 fica nos 0.80 de sempre.
  const boxFrac = ehQuadrado ? 0.96 : 0.80;
  const scale = Math.min((W * boxFrac) / nw, (H * boxFrac) / nh) * avatarZoom;
  const dw = nw * scale;
  const dh = nh * scale;
  // Card 2:3: olhos no terço superior (0.30). Retrato QUADRADO: com o avatar maior
  // (box 0.96) o rosto sobe para 0.34 — dá presença ao jogador sem cortar a coroa.
  const EYE_Y = H * (ehQuadrado ? 0.34 : 0.30);
  return { dx: (W - dw) / 2, dy: EYE_Y - dh * EYE_FRAC, dw, dh };
}

// Onde a foto da figurinha COMUM fica dentro do card. É uma função (e não uma conta solta dentro do
// construirCard) porque a prévia em DOM do Início (PreviaCromo) tem de pôr a foto
// no MESMO sítio que o canvas põe, senão a troca da prévia pelo cromo desenhado salta à vista (medido:
// 47,9 px de desvio numa caixa de 184 px, porque a prévia usava a conta da Brilhante).
//
// A foto preenche o card inteiro (cover) e, quando sobra altura, fica alinhada ao TOPO: numa 2:3 com
// margem o que sobra é chão, não cabeça (a regra de sempre — a coroa nunca é comida). O recorte 2:3 do
// CropModal já é o enquadramento que a pessoa escolheu; num card 2:3 ele aparece inteiro, num quadrado
// aparece o quadrado do topo dele.
//
// Zoom (−/+) na Figurinha. O PISO é 1 = a foto cobre a moldura por completo (nunca faixa
// vazia, nunca a borda da foto à mostra); acima disso aproxima em torno do rosto — o centro na
// horizontal e o terço de cima na vertical, onde o CropModal pede o rosto — sem nunca descobrir a
// borda. Com zoom 1 a conta não muda: o enquadramento salvo continua a ser o de todas
// as telas (o Início e a prévia dele usam sempre 1).
const ANCORA_DO_ROSTO_Y = 1 / 3;
export function enquadrarFotoComum({ W, H, nw, nh, zoom = 1 }) {
  const escala = Math.max(W / nw, H / nh);
  const dw1 = nw * escala;
  const dh1 = nh * escala;
  const dx1 = (W - dw1) / 2;
  const dy1 = dh1 > H ? 0 : (H - dh1) / 2;
  const z = Math.max(1, Number(zoom) || 1);
  if (z === 1) return { dx: dx1, dy: dy1, dw: dw1, dh: dh1 };
  const dw = dw1 * z;
  const dh = dh1 * z;
  // O ponto da foto que estava sob a âncora continua sob ela; depois, trava para a foto seguir a cobrir.
  const ax = W / 2;
  const ay = H * ANCORA_DO_ROSTO_Y;
  const dentro = (v, min) => Math.min(0, Math.max(min, v));
  return {
    dx: dentro(ax - ((ax - dx1) / dw1) * dw, W - dw),
    dy: dentro(ay - ((ay - dy1) / dh1) * dh, H - dh),
    dw,
    dh,
  };
}

/**
 * O card mostra AGORA uma figurinha (IA)? Quem diz é o motor (`figurinha_ativa`, pela regra
 * única do nome do arquivo — backend/utils/figurinhaRegra.js). Decidir por foto_url ≠
 * avatar_url é errado: a foto do Google em avatar_url entrava no card como figurinha (seletor de fundos, zoom
 * abaixo da moldura, faixas vazias). A conta por foto_url ≠ avatar_url só vale para uma resposta guardada,
 * sem o campo, até o /api/me fresco chegar.
 */
export function mostraFigurinha(user) {
  if (typeof user?.figurinha_ativa === 'boolean') return user.figurinha_ativa;
  return !!user?.foto_url && !!user?.avatar_url && user.foto_url !== user.avatar_url;
}

/** O recorte octogonal do card, em percentagem — para o clip-path do CSS. */
export function octagonoCSS() {
  // cut = 32*k e k = W/400 → o corte é sempre 8% da LARGURA. Num quadrado é
  // igual nos dois eixos; no card 2:3 a fracção vertical é 8%·W/H.
  return 8;
}

async function construirCard({ largura = 400, altura = 600, jogador = {}, fundo = 'estadio', corFrame = 'dourado', fotoOverride = null, avatarZoom = 1, fotoZoom = 1, apenasAvatar = false, apenasMoldura = false, apenasPlacaNome = false, formato = 'card', selos = [], fundoGlints = 'pico', modo = 'brilhante', cron = null }) {
  const W = largura;
  const H = altura;
  const k = largura / 400;
  // 'quadrado' (600×600): retrato nativo SEM placa nem nome, para o Início. Toda a
  // restante geometria é comandada por W/H e pelo octógono (mesmo `cut` nos 4 cantos,
  // logo as diagonais ficam a 45° mesmo com H=W) — só muda o enquadramento do avatar
  // e o gradiente inferior. O 'card' 2:3 fica pixel-igual (nenhum ramo o toca).
  const ehQuadrado = formato === 'quadrado';
  // 'comum' (SPEC-FIGURINHA-3 §3) — a figurinha GRÁTIS: a foto da
  // pessoa COMO ELA É, com o fundo dela, a preencher o card inteiro (cover),
  // sem IA, sem recorte de fundo e sem os fundos da casa. Mesma moldura, mesma
  // placa, mesmo 2:3 da Brilhante — é o mesmo álbum, e essa é a razão de ser.
  // 'brilhante': avatar recortado a flutuar sobre o fundo escolhido, dentro do octógono.
  const ehComum = modo === 'comum';
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingQuality = 'high';

  // O fundo começa a descodificar já, para não esperar a vez depois do avatar.
  adiantarFundo(fundo);

  // Garante que a Rajdhani está carregada antes de medir/desenhar texto.
  if (document.fonts?.ready) {
    try { await document.fonts.ready; } catch { /* ignora */ }
  }
  cron?.marca('fontes');

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
  // Variante com inset POR-LADO. O `cut` é o mesmo nos quatro cantos, por
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
  // Na COMUM a base é a FOTO (foto_url), não o avatar: o avatar_url de quem não
  // tem Brilhante é a própria foto, mas quem TEM uma Brilhante e olha para o
  // card comum (o preview do bloco "Vire Brilhante") tem de ver a foto, não a arte.
  const origemImagem = ehComum ? (jogador?.foto_url || jogador?.avatar_url) : jogador?.avatar_url;
  const avatarUrl = fotoOverride || (origemImagem ? urlImagem(urlAsset(origemImagem), 512) : null);
  const ehAbsoluto = avatarUrl && /^https?:\/\//i.test(avatarUrl);
  const avatar = avatarUrl ? await carregarImagem(avatarUrl, ehAbsoluto) : null;
  cron?.marca('avatar:decodificar');

  // Geometria do NOME (fonte única): baseline + tamanho da fonte + topo da placa.
  // O corte do avatar deriva daqui, por isso descer o nome desce o palco inteiro.
  const nomeY = H - 42 * k; // baseline do nome
  const nomeFonte = 46 * k; // tamanho base da fonte do nome
  const placaTopo = nomeY - 42 * k; // topo da placa = linha de corte do avatar

  // Desenha o avatar real com enquadramento/zoom/posição fixos. Corte LIMPO (sem
  // fade) exactamente na linha onde a placa começa — a placa cobre a linha de corte.
  const desenharAvatar = () => {
    // COMUM: a foto preenche o card inteiro (object-fit: cover) e vai até à
    // borda — quem manda no recorte é o CropModal 2:3 do cadastro, não um
    // enquadramento nosso. Sem sombra (não há nada a flutuar: a foto É o
    // fundo) e sem inset (o frame desenha-se por cima, como numa moldura de
    // retrato de verdade). O clip octogonal do conteúdo já está ativo.
    if (ehComum) {
      // Alinhado ao TOPO quando a foto sobra em altura (enquadrarFotoComum, acima do construirCard);
      // o zoom só aproxima — nunca abaixo de cobrir a moldura.
      const { dx, dy, dw, dh } = enquadrarFotoComum({ W, H, nw: avatar.naturalWidth, nh: avatar.naturalHeight, zoom: fotoZoom });
      ctx.drawImage(avatar, dx, dy, dw, dh);
      return;
    }

    // A conta do enquadramento vive em enquadrarAvatar (topo do ficheiro): a
    // prévia em DOM do Início usa a MESMA, senão a troca saltava à vista.
    const { dx, dy, dw, dh } = enquadrarAvatar({
      W, H, nw: avatar.naturalWidth, nh: avatar.naturalHeight, avatarZoom, ehQuadrado,
    });

    // Clip OCTOGONAL: o avatar nunca é desenhado sobre o CORPO
    // dourado grosso do frame, em nenhum lado. Geometria medida do próprio frame:
    //   corpo grosso : path a 3.5*k, lineWidth 7*k  → ocupa [0, 7*k] de cada borda
    //   linha fina   : path a 8.5*k, lineWidth 1.2*k → ocupa [7.9*k, 9.1*k]
    // As LATERAIS não param na linha fina e vão até à borda interior do
    // corpo grosso (7*k) + 1*k de respiro = 8*k. A linha fina não é fronteira
    // lateral: o braço pode sobrepô-la na faixa [8, 9.1]*k (1.1*k). Topo e base ficam
    // nos 11.1*k — irrelevantes na prática (a 130% a cabeça está a y=84, com
    // 73px de folga, e a placa cobre a base).
    const insetTopo = 11.1 * k;
    const insetLado = 7 * k + 1 * k; // = 8*k
    // No card a placa cobre a base → o avatar pára nos 11.1*k inferiores. No quadrado
    // NÃO há placa: a base segue a regra 3.45 das laterais (8*k) — o avatar desce até
    // à linha grossa inferior e o frame desenha-se por cima, exactamente como faz nos
    // lados. Sem isto ficava uma faixa de fundo entre o peito e a moldura de baixo.
    const insetBaixo = ehQuadrado ? insetLado : insetTopo;
    ctx.save();
    octagonoLados(insetTopo, insetLado, insetBaixo, insetLado);
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
      // Fit-to-width (FASE 3.24 → FASE 3.55, 14-set): regra do dono — o nome do
      // jogador NUNCA é cortado, a letra encolhe até caber. O piso antigo (36*k)
      // ainda truncava nomes normais ("CHAVO, EL MATADOR" saía "…EL M…"). Medido
      // na fonte real (k=1, larguraMax=272): CHAVO, EL MATADOR cabe a 28,
      // WASHINGTON JUNIOR a 26, JOÃO PEDRO SILVA a 30 — por isso o piso desce
      // para 22*k, com passos de 1*k (encaixe mais justo que os 2*k antigos). A
      // reticência fica só como defesa TEÓRICA (só entraria com algo como 18
      // letras largas em maiúsculas, tipo "MMMMMMMMMMMMMMMMMM").
      let nomeUpper = String(nome).toUpperCase();
      const larguraMax = placaW - 24 * k; // largura da placa menos padding
      const fonteMin = 22 * k; // nome nunca corta
      // Letter-spacing acompanha a fonte (nunca fixo), com piso de 0.5*k para o
      // texto não colar nos tamanhos mínimos. Divide por nomeFonte (não pelo
      // número cru 46) para o k não entrar em dobro — nomeFonte já é 46*k.
      const lsPara = (f) => Math.max(0.5 * k, (3 * k) * (f / nomeFonte));
      let fonte = nomeFonte;
      const aplicarFonte = () => {
        ctx.font = `700 ${fonte}px 'Rajdhani', system-ui, sans-serif`;
        ctx.letterSpacing = `${lsPara(fonte)}px`;
      };
      aplicarFonte();
      while (ctx.measureText(nomeUpper).width > larguraMax && fonte > fonteMin) {
        fonte = Math.max(fonteMin, fonte - 1 * k);
        aplicarFonte();
      }
      // Defesa extra (teórica): nome tão largo que nem a 22*k cabe → reticências.
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

  // FRAME extraído para função: a camada de topo do preview também o pede,
  // para o preview ter a MESMA ordem de desenho do download
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

  // 4. GRADIENTE INFERIOR (depois do avatar). No card é suave (0.72) porque a placa
  // dá o contraste. No QUADRADO não há placa: um gradiente curto (0.84→H) e de alpha
  // moderada (0.55) só assenta o avatar na base, sem escurecer o peito.
  const desenharGradienteInferior = () => {
    if (ehQuadrado) {
      const gb = ctx.createLinearGradient(0, H * 0.84, 0, H);
      gb.addColorStop(0, 'rgba(0,0,0,0)');
      gb.addColorStop(1, 'rgba(0,0,0,0.55)');
      ctx.fillStyle = gb;
      ctx.fillRect(0, H * 0.84, W, H * 0.16);
    } else {
      const gb = ctx.createLinearGradient(0, H * 0.74, 0, H);
      gb.addColorStop(0, 'rgba(0,0,0,0)');
      gb.addColorStop(1, 'rgba(0,0,0,0.72)');
      ctx.fillStyle = gb;
      ctx.fillRect(0, H * 0.74, W, H * 0.26);
    }
  };

  // MODO CAMADA SÓ-AVATAR: canvas transparente, desenha só o avatar real.
  if (apenasAvatar) {
    if (avatar) desenharAvatar();
    // Na COMUM a foto cobre o card inteiro: o gradiente de baixo, que no PNG baixado vem
    // POR CIMA da foto, tem de vir nesta camada. Na camada do fundo ficaria escondido atrás da foto
    // e a prévia da Figurinha sairia mais clara que o card que a pessoa baixa e compartilha.
    if (ehComum && avatar) desenharGradienteInferior();
    ctx.restore();
    return canvas;
  }

  // SELOS DE HONRA — máx 2, canto sup. direito, sobre o frame. Hoisted:
  // desenha no card completo (download) E na camada apenasPlacaNome (topo do preview).
  function desenharSelos() {
    const lista = (selos || []).slice(0, 2);
    if (!lista.length || ehQuadrado) return;
    const w = W * 0.17;
    const h = w * 1.2;
    // Descolado do canto: ~dobro das margens (afasta da borda direita e desce do
    // topo), mas ainda na zona superior direita, contido, sem tocar o rosto.
    const mx = W * 0.085;
    const topM = H * 0.058;
    lista.forEach((s, i) => desenharUmSelo(ctx, W - mx - w / 2, topM + h / 2 + i * (h + h * 0.12), w, s.tier, s.label));
  }

  // MODO CAMADA SÓ-PLACA+NOME+FRAME: camada de TOPO do preview. Inclui o frame, para o braço (que chega
  // ao corpo grosso) ficar por baixo da linha fina, tal como no card único do download.
  if (apenasPlacaNome) {
    desenharPlacaNome();
    ctx.restore(); // sai do clip octogonal ANTES do frame, como no card completo
    desenharFrame();
    desenharSelos(); // selos no topo do preview
    return canvas;
  }

  // 1. FUNDO — na COMUM não há: a foto é o fundo (§3: "a foto como ela é, com
  // o fundo dela"). Só se pinta um preto por baixo, para o caso de a foto
  // falhar a carregar e as iniciais precisarem de contraste.
  if (ehComum) {
    ctx.fillStyle = '#0a0a12';
    ctx.fillRect(0, 0, W, H);
    cron?.marca('fundo:desenhar');
  } else if (fundo === 'preto') {
    // 'preto' (label "Neutro") partilha a base escura (#000 puro destoava do épico):
    // mesmo gradiente + vinheta, sem honeycomb/F/luz.
    desenharFundoNeutro(ctx, W, H);
    cron?.marca('fundo:desenhar');
  } else if (fundo === 'gradiente') {
    await desenharFundoEpico(ctx, W, H, { cron });
  } else if (fundo === 'aura') {
    // Aura da vitrine (glow selado replicado). Sem holofotes de estádio (o palco
    // selado não os tem) — guardado no passo 2.
    desenharFundoAura(ctx, W, H, ehQuadrado);
    cron?.marca('fundo:desenhar');
  } else if (fundo === 'golden' || fundo === 'royal') {
    // GOLDEN/ROYAL premium — chapa foil + poeira de cristal (atrás do avatar), MESMO
    // pipeline (desenharFundoPremium). No PREVIEW (apenasMoldura) do GOLDEN a chapa
    // entra SEM glints baked → a "mina" vive no overlay animado (z3); no card completo
    // (download) os glints saem NO PICO (frame mais rico).
    // ROYAL (dono): o app renderiza EXATAMENTE como a prancha
    // golden-variantes.png — chapa roxa + os 14 brilhos no pico, também na prévia. O
    // overlay vivo nunca existiu para o Royal, e a prévia entrava com a chapa nua (0 de
    // 14 brilhos, medido em scripts/prova-royal.mjs): a poeira é desenhada na
    // própria camada de fundo, atrás do jogador, como no download.
    const desenhar = fundo === 'golden' ? desenharFundoGolden : desenharFundoRoyal;
    const glintsDaCamada = apenasMoldura ? (fundo === 'royal' ? 'pico' : false) : fundoGlints;
    await desenhar(ctx, W, H, { glints: glintsDaCamada, cron });
  } else {
    await desenharFundoEstadio(ctx, W, H, { ehQuadrado, cron });
  }

  // 2. HOLOFOTES — só nos fundos de estádio; Aura e as chapas premium (Golden/Royal)
  // são luz própria (glow / foil), sem holofotes por cima. Na COMUM também não:
  // a luz da foto é a que estava lá quando a pessoa a tirou.
  if (!ehComum && fundo !== 'aura' && fundo !== 'golden' && fundo !== 'royal') {
    for (const cx of [W * 0.25, W * 0.75]) {
      const g = ctx.createRadialGradient(cx, 0, 0, cx, 0, W * 0.5);
      g.addColorStop(0, 'rgba(255,255,220,0.12)');
      g.addColorStop(1, 'rgba(255,255,220,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
    }
    cron?.marca('holofotes');
  }

  // 3. AVATAR — só no card completo. Na camada apenasMoldura é omitido (o jogador
  // é uma camada à parte por cima das partículas); as iniciais de fallback idem.
  if (apenasMoldura) {
    // moldura: sem avatar nem iniciais de fallback.
  } else if (avatar) {
    desenharAvatar();
    cron?.marca('avatar:desenhar');
  } else {
    // Sem foto: NÃO tapar o fundo escolhido (dourado/aura/épico…) com um retângulo
    // opaco — a Figurinha mostra o fundo premium por inteiro nesta situação; o
    // card do Início tem de bater certo (mesmo render/asset). Só as iniciais, com
    // sombra para legibilidade em qualquer fundo — sem pintar por cima dele.
    ctx.save();
    ctx.font = `bold ${72 * k}px Rajdhani, sans-serif`;
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0,0,0,0.55)';
    ctx.shadowBlur = 14 * k;
    ctx.fillText(nome.slice(0, 2).toUpperCase(), W / 2, H * 0.62);
    ctx.restore();
  }

  // 4. GRADIENTE INFERIOR (depois do avatar) — ver desenharGradienteInferior. Na camada de fundo
  // da prévia da COMUM ele não entra: vai com a foto (camada apenasAvatar), por cima dela.
  if (!(ehComum && apenasMoldura)) desenharGradienteInferior();

  // 4b + 5. PLACA + NOME — no card completo desenham-se aqui (depois do avatar,
  // antes do frame). No preview são a camada de topo (apenasPlacaNome), por isso
  // na moldura são omitidos aqui. No QUADRADO não há placa nem nome no PNG: o nome
  // vive em texto livre no Início, por baixo do cromo.
  if (!apenasMoldura && !ehQuadrado) {
    desenharPlacaNome();
    cron?.marca('texto');
  }

  // Fim do conteúdo recortado → remove o clip octogonal. O frame já é inset e as
  // faíscas ficam soltas por cima, sem recorte.
  ctx.restore();

  // 6. FRAME — no card completo desenha-se aqui (depois do avatar). Na camada `apenasMoldura` não: ele vive
  // na camada de topo do preview (apenasPlacaNome), para o preview e o download ficarem idênticos.
  if (!apenasMoldura) {
    desenharFrame();
    cron?.marca('moldura');
  }

  desenharSelos(); // selos de honra no card completo (download/partilha levam-nos)

  return canvas;
}

// Figurinha normal: card 2:3 a 400×600 → PNG completo (com jogador). Usado no
// Baixar/Compartilhar (uma imagem só). Com formato:'quadrado' devolve o RETRATO
// quadrado de até 600×600 (sem placa/nome) que o Início mostra — mesma moldura e fundos.
// O retrato QUADRADO é gerado no tamanho a que vai ser VISTO, não sempre a 600×600.
//
// O cromo do Início é um elemento de tela, e a sua largura vem do CSS
// (`.cromo-inicio`: 49% da largura da tela, teto de 236 px): num iPhone de 390 dá
// 191 px, num computador 236 px. A 600×600 fixos, o iPhone gerava ~10× mais pixéis
// do que mostra — e cada pixel a mais é rasterização e codificação de PNG.
//
// Tecto de 600 (o tamanho canónico de sempre — nunca se gera MAIOR do que o que
// já se desenhava) e piso de 300, para o cromo nunca sair mole se a medição da
// tela vier errada. O card 2:3 do download não entra aqui: ali o tamanho é o
// produto, não uma medida de tela.
const LADO_MAX_CROMO = 600;
const LADO_MIN_CROMO = 300;

function ladoDoCromo(larguraExibida) {
  if (!larguraExibida || !Number.isFinite(larguraExibida)) return LADO_MAX_CROMO;
  const dpr = typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1;
  const alvo = Math.round(larguraExibida * dpr);
  return Math.max(LADO_MIN_CROMO, Math.min(LADO_MAX_CROMO, alvo));
}

export async function gerarFigurinhaCanvas(opts = {}) {
  const quadrado = opts.formato === 'quadrado';
  const lado = quadrado ? ladoDoCromo(opts.larguraExibida) : 0;
  const dim = quadrado ? { largura: lado, altura: lado } : { largura: 400, altura: 600 };
  const cron = cronometro();
  const canvas = await construirCard({ ...opts, ...dim, cron });
  const blob = await canvasParaBlob(canvas);
  cron.marca('toBlob');
  registarFasesCromo(`${quadrado ? 'cromo' : 'figurinha'}/${opts.fundo || 'estadio'}`, cron.fases);
  return blob;
}

// Três camadas para o preview do studio, para o avatar inteiro não tapar nada:
//   fundoBlob   = fundo+holofotes+gradiente, SEM avatar/placa/nome E SEM FRAME
//   jogadorBlob = só o avatar (transparente) — vai por cima das partículas
//   placaBlob   = placa+nome+FRAME (transparente) — camada de topo, sempre visível
// Partículas entram entre fundo e jogador; placa+frame ficam acima do jogador.
// O frame sai do fundo e vai para o topo: o braço encosta ao corpo dourado e
// a linha fina desenha-se POR CIMA dele, exactamente como no card único do download.
// Ordem no preview: fundo (z2) → partículas (z3) → jogador (z4) → placa+frame (z5).
export async function gerarCamadasFigurinha(opts = {}) {
  const cron = cronometro();
  const [molduraCanvas, jogadorCanvas, placaCanvas] = await Promise.all([
    construirCard({ ...opts, largura: 400, altura: 600, apenasMoldura: true, cron }),
    construirCard({ ...opts, largura: 400, altura: 600, apenasAvatar: true }),
    construirCard({ ...opts, largura: 400, altura: 600, apenasPlacaNome: true }),
  ]);
  cron.marca('camadas');
  const [fundoBlob, jogadorBlob, placaBlob] = await Promise.all([
    canvasParaBlob(molduraCanvas),
    canvasParaBlob(jogadorCanvas),
    canvasParaBlob(placaCanvas),
  ]);
  cron.marca('toBlob');
  registarFasesCromo(`camadas/${opts.fundo || 'estadio'}`, cron.fases);
  return { fundoBlob, jogadorBlob, placaBlob };
}

// O que saiu deste arquivo continua exportado daqui: quem importa não muda.
export { AURA_ESCALA, AURA_OPACIDADE, desenharFundoAura, desenharFundoEpico, desenharFundoEstadio, desenharFundoGolden, desenharFundoNeutro, desenharFundoPremium, desenharFundoRoyal } from './figurinhaFundos';
