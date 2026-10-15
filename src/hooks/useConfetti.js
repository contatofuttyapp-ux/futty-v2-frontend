// Futty v2.0 — Celebrações premium com canvas-confetti.
//
// A biblioteca é buscada SÓ quando há festa.
//
// Um `import confetti from 'canvas-confetti'` estático no topo poria 12 KB de confete no chunk de
// cada tela que importa este arquivo (o Ranking e o Início) e o WebKit os compilaria na PRIMEIRA
// visita, antes de haver qualquer coisa na tela — para uma festa que quase nunca acontece (só
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

// Top 3 do ranking (e o campeonato terminado no Início) — intensidade/cor conforme a posição.
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
