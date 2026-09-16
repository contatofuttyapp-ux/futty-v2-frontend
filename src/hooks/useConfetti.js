// Futty v2.0 — Celebrações premium com canvas-confetti.
//
// FLUIDEZ 2 (16-set) — a biblioteca passa a ser buscada SÓ quando há festa.
//
// O `import confetti from 'canvas-confetti'` no topo era estático, e o Ranking e
// o Início importam este arquivo. Resultado: 12 KB de confete entravam no chunk
// de cada uma dessas telas e o WebKit compilava-os na PRIMEIRA visita, antes de
// haver qualquer coisa na tela — para uma festa que quase nunca acontece (só
// quem está no top 3, só quando o campeonato acaba).
//
// Com `import()` dentro da função, o download e a compilação só acontecem no
// instante em que se vai mesmo disparar. E cada celebração é `async` sem que
// ninguém tenha de esperar por ela: nenhuma chamada usa o retorno — é festa,
// não é dado.
let confettiPromessa = null;

function pedirConfetti() {
  // Uma promessa só: duas festas seguidas (o top 3 dispara dois canhões) não
  // podem pedir o módulo duas vezes.
  if (!confettiPromessa) confettiPromessa = import('canvas-confetti').then((m) => m.default);
  return confettiPromessa;
}

// Falhar a buscar a biblioteca não pode partir a tela: sem confete, a vida segue.
async function confetti(opcoes) {
  try {
    (await pedirConfetti())(opcoes);
  } catch {
    /* sem festa desta vez */
  }
}

/** Aquece a biblioteca antes da festa — quem sabe que vai precisar chama cedo. */
export function prepararConfetti() {
  pedirConfetti().catch(() => {});
}

const FESTA = ['#d4a017', '#f5e070', '#8b5cf6', '#a78bfa', '#ffffff'];
const MOEDAS = ['#f5e070', '#f0c94a', '#d4a017', '#fff7d8', '#c8940f'];

// F) O PRÊMIO do sorteio (Rodada 14B) — chuva de moedas douradas a cair do topo
// da tela por `duracaoMs`. Redondas (a moeda vista de frente), a cambalear na
// queda; rajadas curtas em posições sorteadas para não virar cortina. Quem pede
// movimento reduzido não recebe moeda nenhuma (é a lei do item 1: só o flash).
export function celebrarPremioSorteio(duracaoMs = 2500) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const fim = Date.now() + duracaoMs;
  const rajada = () => {
    if (Date.now() >= fim) return;
    confetti({
      particleCount: 7,
      angle: 270,
      spread: 55,
      startVelocity: 22,
      gravity: 1.15,
      drift: (Math.random() - 0.5) * 0.8,
      ticks: 210,
      scalar: 0.95,
      shapes: ['circle'],
      colors: MOEDAS,
      origin: { x: 0.08 + Math.random() * 0.84, y: -0.06 },
    });
    setTimeout(rajada, 110);
  };
  rajada();
}

// A) Sorteio realizado — dois canhões laterais (dourado + roxo).
export function celebrarSorteio() {
  confetti({
    particleCount: 80,
    angle: 60,
    spread: 55,
    origin: { x: 0, y: 0.7 },
    colors: FESTA,
    gravity: 1.2,
    scalar: 0.9,
  });
  setTimeout(
    () =>
      confetti({
        particleCount: 80,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.7 },
        colors: FESTA,
        gravity: 1.2,
        scalar: 0.9,
      }),
    150
  );
}

// B) Rodada da cerveja 🍺 — explosão central.
export function celebrarCerveja(origem = { x: 0.5, y: 0.6 }) {
  confetti({
    particleCount: 120,
    spread: 80,
    origin: origem,
    colors: ['#f5a623', '#f5e070', '#d4a017', '#ffffff', '#8b5cf6'],
    startVelocity: 35,
    gravity: 1.0,
    scalar: 1.1,
    shapes: ['circle', 'square'],
  });
}

// D) Partilha de figurinha — explosão com a cor do frame escolhido.
export function celebrarPartilha(cor = '#d4a017') {
  confetti({
    particleCount: 80,
    spread: 60,
    origin: { y: 0.7 },
    colors: [cor, '#8b5cf6', '#ffffff'],
  });
}

// E) Cromo pronto (estreia da Figurinha) — o momento épico.
export function celebrarCromoPronto() {
  confetti({
    particleCount: 120,
    spread: 80,
    origin: { y: 0.5 },
    colors: ['#d4a017', '#8b5cf6', '#ffffff'],
    startVelocity: 40,
    scalar: 1.1,
  });
}

// C) Top 3 do ranking — intensidade/cor conforme a posição.
export function celebrarTop3(posicao = 1) {
  if (posicao === 1) {
    const ouro = { spread: 90, origin: { x: 0.5, y: 0.5 }, colors: ['#d4a017', '#f5e070', '#ffd700', '#ffffff'], scalar: 1.1, gravity: 1 };
    confetti({ ...ouro, particleCount: 150, startVelocity: 40 });
    setTimeout(() => confetti({ ...ouro, particleCount: 150, startVelocity: 45 }), 200);
  } else if (posicao === 2) {
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { x: 0.5, y: 0.55 },
      colors: ['#aaaaaa', '#dddddd', '#ffffff'],
      gravity: 1,
      scalar: 1,
    });
  } else if (posicao === 3) {
    confetti({
      particleCount: 50,
      spread: 60,
      origin: { x: 0.5, y: 0.55 },
      colors: ['#cd7f32', '#e8a96a', '#ffffff'],
      gravity: 1,
      scalar: 1,
    });
  }
}
