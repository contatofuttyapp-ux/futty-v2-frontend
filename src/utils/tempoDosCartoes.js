// Futty v2.0 — O relógio dos cartões que entram em sequência (components/TimesEmCartoes.jsx): quando cada time começa
// e quando o último cartão termina de entrar — para o que vem depois (o selo) entrar logo em seguida, e não antes.

/** Quando o último cartão termina de entrar (s). Os parâmetros são os mesmos do TimesEmCartoes. */
export function duracaoDosCartoes({ times = [], reservas = [], atraso0 = 0, passo = 0.08, pausaEntreTimes = 0.2 }) {
  const jogadores = times.reduce((s, x) => s + (x.jogadores || []).length, 0) + reservas.length;
  const caixas = times.length + (reservas.length ? 1 : 0);
  return atraso0 + jogadores * passo + caixas * (pausaEntreTimes + passo) + 0.45;
}

/** O atraso de animação em CSS, em milissegundos inteiros (valor de máquina, não texto: nada de casa decimal). */
export function atrasoCss(segundos) {
  return `${Math.round(segundos * 1000)}ms`;
}
