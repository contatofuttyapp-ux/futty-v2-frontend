// Futty v2.0 — Plural simples PT-BR: plural(1, 'membro', 'membros') → 'membro'.
export function plural(n, singular, pluralForm) {
  return n === 1 ? singular : pluralForm;
}
