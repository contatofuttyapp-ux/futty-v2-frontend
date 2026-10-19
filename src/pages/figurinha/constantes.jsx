// Futty v2.0 — Figurinha: os catálogos e constantes da tela (fundos, abas, partículas, glints, recorte, zoom) e a EstrelaIA.

// Chaves nomeadas (iguais às guardadas em users.cor_frame / fundo_figurinha).
// GATES (ordem do dono): Aura, Golden e Royal são PREMIUM (verdade no servidor, ver FUNDOS_PREMIUM em
// backend/routes/auth.js; o `premium: true` aqui é só o cadeado do desejo). Épico é GRÁTIS (ordem do
// dono) — não tem `premium`. LEI DA REGRA JUSTA: quem já tinha Aura equipado mantém — o gate só corre
// ao TROCAR (ver escolherFundo).
const FUNDOS = [
  // ORDEM (ordem do dono): Neutro, Épico, Estádio, Aura, Golden, Royal — os GRÁTIS primeiro (Neutro,
  // Épico, Estádio), os pagos depois (Aura, Golden, Royal). Só o SELETOR tem esta ordem: o fundo de
  // quem não escolheu continua a ser 'estadio' (useState abaixo e cromoFundo no Início).
  { k: 'preto', label: 'Neutro' },
  { k: 'gradiente', label: 'Épico' }, // chave interna 'gradiente' (estado), label Épico — GRÁTIS
  { k: 'estadio', label: 'Estádio' },
  { k: 'aura', label: 'Aura', premium: true }, // glow SELADO da vitrine como fundo do cromo
  // "Golden" e "Royal" são nomes de PRODUTO batizados pelo dono, não texto de interface — ficam em
  // inglês, como "Golden" fica no cadeado GOLDEN. A regra do PT-BR vale para o que o app DIZ, não para
  // o que o app BATIZA. Não reabrir sem o dono pedir.
  { k: 'golden', label: 'Golden', premium: true }, // 1º fundo PREMIUM (gated) — DEPOIS dos livres
  { k: 'royal', label: 'Royal', premium: true }, // par de luxo do Golden — chapa roxa da casa
];
// Background real de cada fundo (igual ao do PlayerCard) para os tiles.
const FUNDO_BG = {
  estadio: "url('/stadium_bg.webp') center / cover no-repeat, #1b2433",
  // 'gradiente' = Carta Épica. Chave interna mantida para não refactorizar estado.
  // Este valor é só o FALLBACK (base escura) até o render real do fundo ficar pronto
  // — o tile passa a mostrar o fundo verdadeiro em miniatura (ver `epicoTile`).
  gradiente: 'linear-gradient(180deg, #16161c 0%, #1d1d24 50%, #101014 100%)',
  // 'preto' (label "Neutro"): mesma base escura do épico, sem padrão. O tile é o gradiente liso,
  // condizente com o card real.
  preto: 'linear-gradient(180deg, #16161c 0%, #1d1d24 50%, #101014 100%)',
  // 'aura' — tile fiel ao glow do card: elipse dourada (mesmos stops) sobre o escuro da casa. O card real
  // desenha o glow com blur no canvas; aqui a elipse já é suave. Tamanho 140%×112% e alphas a 3/4, como
  // no canvas.
  aura: 'radial-gradient(ellipse 140% 112% at 50% 44%, rgba(212,160,23,0.7125) 0%, rgba(212,160,23,0.36) 40%, rgba(212,160,23,0.12) 64%, transparent 92%), linear-gradient(180deg, #0a0a12 0%, #070812 55%, #050609 100%)',
  // 'golden' — FALLBACK (foil dourado) até o render real da chapa ficar pronto (ver `goldenTile`).
  golden: 'linear-gradient(160deg, #b8860b 0%, #e6bd52 28%, #a9760f 54%, #dcab3a 76%, #855a0b 100%)',
  // 'royal' — FALLBACK (foil roxo) até o render real da chapa ficar pronto (ver `royalTile`).
  royal: 'linear-gradient(160deg, #4a2f8a 0%, #6f47c9 28%, #3d2670 54%, #5c3aa8 76%, #2a1a4d 100%)',
};
const TABS = [
  { k: 'fundo', label: 'Fundo' },
  { k: 'uniforme', label: 'Uniforme' },
];

// Os 5 uniformes (KIT_IMG + KITS_FIGURINHA) moram em utils/kitsFigurinha.js desde o P2: a escolha
// do uniforme do pacote do time (components/EscolherUniformeTime.jsx) usa o mesmo catálogo.

// Partículas de luz do fundo "estádio" (valores fixos por partícula → o
// movimento nunca sincroniza). left/size fixos, cores alternadas, dur/delay variados.
const FUTTY_PARTICULAS = [
  { left: 8, size: 3, cor: '#f5e070', dur: 7.5, delay: 0 },
  { left: 15, size: 2, cor: '#d4a017', dur: 9.2, delay: 2.4 },
  { left: 23, size: 4, cor: '#ffffff', dur: 6.3, delay: 5.1 },
  { left: 31, size: 2, cor: '#f5e070', dur: 10.4, delay: 1.2 },
  { left: 38, size: 3, cor: '#d4a017', dur: 8.1, delay: 6.7 },
  { left: 45, size: 2, cor: '#ffffff', dur: 6.9, delay: 3.3 },
  { left: 52, size: 4, cor: '#f5e070', dur: 9.8, delay: 0.6 },
  { left: 59, size: 3, cor: '#d4a017', dur: 7.2, delay: 4.5 },
  { left: 66, size: 2, cor: '#ffffff', dur: 11, delay: 7.8 },
  { left: 72, size: 3, cor: '#f5e070', dur: 6.6, delay: 2 },
  { left: 79, size: 4, cor: '#d4a017', dur: 8.7, delay: 5.9 },
  { left: 85, size: 2, cor: '#ffffff', dur: 10.1, delay: 1.7 },
  { left: 90, size: 3, cor: '#f5e070', dur: 7.9, delay: 4 },
  { left: 92, size: 2, cor: '#d4a017', dur: 9.5, delay: 6.2 },
];

// Glints do fundo GOLDEN no PREVIEW (a "mina encantada" viva). Mesmas posições do
// canvas (desenharFundoGolden) — [x%, y%, d(px), delay(s), dur(s)]. Densos fora do
// centro (o avatar tapa o meio). z3: entram ATRÁS do jogador (lei do brilho do cromo).
// No PNG de download o brilho é estático no pico (canvas); aqui vive.
const GOLDEN_GLINTS_UI = [
  { x: 10, y: 12, d: 3, dl: 0.0, dur: 7.6 }, { x: 23, y: 8, d: 2, dl: 4.1, dur: 8.3 },
  { x: 50, y: 6, d: 3, dl: 1.7, dur: 7.1 }, { x: 72, y: 9, d: 2, dl: 5.6, dur: 8.7 },
  { x: 89, y: 14, d: 4, dl: 2.6, dur: 7.9 }, { x: 7, y: 32, d: 3, dl: 6.3, dur: 9.0 },
  { x: 93, y: 37, d: 2, dl: 0.9, dur: 8.4 }, { x: 11, y: 55, d: 2, dl: 3.4, dur: 7.5 },
  { x: 91, y: 60, d: 3, dl: 5.1, dur: 8.9 }, { x: 14, y: 82, d: 3, dl: 1.2, dur: 7.4 },
  { x: 85, y: 85, d: 4, dl: 4.6, dur: 8.1 }, { x: 50, y: 91, d: 3, dl: 2.9, dur: 8.6 },
  { x: 31, y: 19, d: 2, dl: 6.9, dur: 7.8 }, { x: 70, y: 21, d: 3, dl: 3.8, dur: 8.2 },
];

// Recorte octogonal do card (cut/W = 32/400 = 8%; cut/H = 32/600 ≈ 5.3%). Usado
// nos overlays de card inteiro para os cantos coincidirem com o PNG octogonal.
const CLIP_OCTOGONO = 'polygon(8% 0, 92% 0, 100% 5.3%, 100% 94.7%, 92% 100%, 8% 100%, 0 94.7%, 0 5.3%)';
// Ordem do dono: a cabeça cortou nas duas tentativas com esta foto → o recado leva a escolher OUTRA
// foto. Tentar de novo com ela daria o mesmo. Título + corpo (30H): um erro não é a mesma frase que o
// resto da tela, por isso quebra no dois-pontos em vez de correr solta.
const RECADO_FOTO_RECUSADA = {
  titulo: 'Essa foto não deu certo',
  corpo: 'Escolha outra: de frente, com a cabeça e os ombros inteiros aparecendo, sem nada cortado nas bordas.',
};

// Limites do zoom do avatar. ZOOM_MIN subiu de 0.88 (80% exibido) para 0.99 (90%):
// o degrau de 80% deixou de existir. Qualquer valor abaixo é normalizado no arranque.
const ZOOM_MIN = 0.99;
const ZOOM_MAX = 1.43;
// Zoom do card com a FOTO: 1 = a foto cobre a moldura por completo (o piso — nunca faixa
// vazia nem borda à mostra, ver enquadrarFotoComum); cada toque aproxima 10%, até 40%.
const FOTO_ZOOM_MAX = 1.4;

// Estrela de 4 pontas custom (celebracao.svg) tingida por CSS mask. O padrão do
// app tinge SVGs pretos por filtro (components/Icon.jsx), mas esse só cobre 3
// cores fixas; a máscara permite QUALQUER cor exacta (branco/roxo/dourado).
function EstrelaIA({ size = 16, color = '#d4a017', style }) {
  return (
    <span
      aria-hidden="true"
      style={{
        display: 'inline-block',
        width: size,
        height: size,
        flex: 'none',
        backgroundColor: color,
        WebkitMaskImage: 'url(/icons/celebracao.svg)',
        maskImage: 'url(/icons/celebracao.svg)',
        WebkitMaskRepeat: 'no-repeat',
        maskRepeat: 'no-repeat',
        WebkitMaskPosition: 'center',
        maskPosition: 'center',
        WebkitMaskSize: 'contain',
        maskSize: 'contain',
        verticalAlign: 'middle',
        ...style,
      }}
    />
  );
}

export { CLIP_OCTOGONO, EstrelaIA, FOTO_ZOOM_MAX, FUNDOS, FUNDO_BG, FUTTY_PARTICULAS, GOLDEN_GLINTS_UI, RECADO_FOTO_RECUSADA, TABS, ZOOM_MAX, ZOOM_MIN };
