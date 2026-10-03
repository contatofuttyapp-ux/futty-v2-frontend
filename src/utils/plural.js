// Futty v2.0 — Plural simples PT-BR: plural(1, 'membro', 'membros') → 'membro'.
export function plural(n, singular, pluralForm) {
  return n === 1 ? singular : pluralForm;
}

/** A média como a tela a mostra: uma casa decimal, ou nenhuma quando fecha redonda. É ESTE número que decide o plural da legenda. */
export function arredondarMedia(n) {
  const v = Number(n);
  return Number.isFinite(v) ? Math.round(v * 10) / 10 : 0;
}

/** Uma média para a tela: sem casa decimal quando é inteira ("0", "12") e com uma, em vírgula, quando não é ("13,1"). */
export function formatarMedia(n) {
  const v = arredondarMedia(n);
  return Number.isInteger(v) ? String(v) : v.toFixed(1).replace('.', ',');
}

/** Rodada 29L (achado 136): o número e a palavra concordando — contar(1, 'jogo', 'jogos') → '1 jogo'; contar(0, …) → '0 jogos'. */
export function contar(n, singular, pluralForm) {
  return `${n} ${plural(Number(n), singular, pluralForm)}`;
}
