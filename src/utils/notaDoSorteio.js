// Futty v2.0 — O número de cada jogador no sorteio (rating, rating_medio do time) na régua de 0 a 10, a mesma da nota em todo o app.
// É uma foto da nota daquele dia, gravada dentro do resultado. O motor marca o resultado novo com `escala_nota: 10`; o que foi gravado
// antes da marca está em estrelas (0,5 a 5) e aqui vira × 2 — sem mexer no que está guardado no banco.

const REGUA = 10;

/** Quanto multiplicar o número guardado neste resultado para ele ficar na régua de 0 a 10. */
function fatorDoSorteio(resultado) {
  return resultado?.escala_nota === REGUA ? 1 : 2;
}

/** O número de um jogador (ou a média de um time) deste resultado, na régua de 0 a 10. O que não é número passa como veio. */
export function notaNoSorteio(valor, resultado) {
  const n = typeof valor === 'number' ? valor : Number.NaN;
  if (!Number.isFinite(n)) return valor;
  return Math.round(n * fatorDoSorteio(resultado) * 100) / 100;
}

/** O resultado inteiro na régua de 0 a 10 (o editor dos times parte dele: o que ele salvar já sai na régua nova). */
export function sorteioNaReguaDe10(resultado) {
  if (!resultado || fatorDoSorteio(resultado) === 1) return resultado;
  const jogador = (j) => (j && typeof j.rating === 'number' ? { ...j, rating: notaNoSorteio(j.rating, resultado) } : j);
  return {
    ...resultado,
    escala_nota: REGUA,
    times: (resultado.times || []).map((t) => ({
      ...t,
      ...(typeof t.rating_medio === 'number' ? { rating_medio: notaNoSorteio(t.rating_medio, resultado) } : {}),
      jogadores: (t.jogadores || []).map(jogador),
    })),
    reservas: (resultado.reservas || []).map(jogador),
  };
}
