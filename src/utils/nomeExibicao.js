// Futty v2.0 — Nome exibido de um usuário em qualquer lista do app.
// Regra única: nome de jogador → nome completo → "Jogador". NUNCA o e-mail.
export function nomeExibicao(perfil) {
  const jogador = String(perfil?.nome_jogador ?? '').trim();
  if (jogador) return jogador;
  const completo = String(perfil?.nome ?? '').trim();
  if (completo) return completo;
  return 'Jogador';
}
