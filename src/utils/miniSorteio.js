// Futty v2.0 — Rodada 29D: o que o mini sorteio do Onboarding (components/MiniSorteio.jsx) sorteia. Puro (sem React).
// Nomes FICTÍCIOS, curtos, de gente que não existe no app (dono: nunca nomes de gente real); os rolos giram, travam
// um a um em TIME OURO / TIME ROXO, seguram 2 s e recomeçam — ciclo de 6 s em loop.

export const NOMES_FICTICIOS = ['BRUNINHO', 'TIAGÃO', 'LÉO', 'PEDRÃO', 'NANDO', 'CAIO', 'RAFA', 'DUDU'];

export const TEMPOS = { travaOuroMs: 2400, travaRoxoMs: 3400, cicloMs: 6000 };

/** O par sorteado no ciclo k: dois nomes diferentes, e em 4 ciclos todos os 8 aparecem. */
export function parDoCiclo(k) {
  const n = NOMES_FICTICIOS.length;
  return { ouro: NOMES_FICTICIOS[(2 * k) % n], roxo: NOMES_FICTICIOS[(2 * k + 1) % n] };
}

/** A tira de um rolo: todos os nomes, a começar em `inicio` — os dois rolos partem de pontos diferentes para não girarem iguais. */
export function tiraDoRolo(inicio = 0) {
  const n = NOMES_FICTICIOS.length;
  return NOMES_FICTICIOS.map((_, i) => NOMES_FICTICIOS[(inicio + i) % n]);
}
