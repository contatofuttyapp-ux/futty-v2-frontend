// Futty v2.0 — Gabinete, "Pessoas & times → Pessoas": a ordem da lista de contas (Rodada 30E, item 2).
// Pura (sem React, sem rede): a tela e o teste leem a mesma regra. O motor já manda a página em ordem
// alfabética (routes/superadmin.js, com 'id' de desempate); isto é só a colação exata do nome mostrado —
// acento e maiúscula não contam, como a lista de times (utils/ordenarTimes.js).
const colatorNome = new Intl.Collator('pt-BR', { sensitivity: 'base' });

/** Cópia de `users` em ordem alfabética pelo nome mostrado. A lista de entrada não muda. */
export function ordenarPessoas(users) {
  return [...(users || [])].sort((a, b) => colatorNome.compare(a?.nome || '', b?.nome || ''));
}
