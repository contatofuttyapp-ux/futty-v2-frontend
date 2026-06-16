// Futty v2.0 — Helpers de apresentação do campeonato.

// Nome do campeão (ou "Empate"); null se não terminou.
export function nomeCampeao(c) {
  if (!c || c.estado !== 'terminado' || !c.campeao) return null;
  if (c.campeao === 'empate') return 'Empate';
  return c.campeao === 'A' ? c.time_a_nome : c.time_b_nome;
}

// Texto do resultado de uma jornada.
export function textoJornada(j, c) {
  if (j.placar_a != null && j.placar_b != null) {
    if (j.vencedor === 'empate') return `Empate ${j.placar_a}-${j.placar_b}`;
    return `${c.time_a_nome} ${j.placar_a} × ${j.placar_b} ${c.time_b_nome}`;
  }
  if (j.vencedor === 'empate') return 'Empate';
  return `${j.vencedor === 'A' ? c.time_a_nome : c.time_b_nome} venceu`;
}
