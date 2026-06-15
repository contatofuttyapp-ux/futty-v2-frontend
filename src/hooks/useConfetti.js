// Futty v2.0 — Celebrações premium com canvas-confetti.
import confetti from 'canvas-confetti';

const FESTA = ['#d4a017', '#f5e070', '#8b5cf6', '#a78bfa', '#ffffff'];

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
