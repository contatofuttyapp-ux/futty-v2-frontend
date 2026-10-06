// Futty v2.0 — a confirmação de "Excluir minha conta".
// No iPhone o teclado corrige "EXCLUIR" para "Excluir" (ou "excluir ", com espaço) e o botão, que só
// ligava com as 7 letras em maiúsculas, ficava cinza sem explicar — e a Apple exige exclusão fácil de
// concluir. Aqui a comparação é normalizada: sem espaço nas pontas, sem diferença de maiúsculas e sem
// acento. O motor (DELETE /api/me) continua exigindo `{ confirmacao: 'EXCLUIR' }` exato: o app manda
// sempre CONFIRMACAO_EXCLUIR, nunca o que a pessoa digitou.
export const CONFIRMACAO_EXCLUIR = 'EXCLUIR';

// \p{M} = marcas de acento soltas (depois do NFD); \p{Cf} = caracteres invisíveis (largura zero, BOM).
export function normalizarConfirmacao(texto) {
  return String(texto ?? '')
    .normalize('NFD')
    .replace(/[\p{M}\p{Cf}]/gu, '')
    .trim()
    .toUpperCase();
}

export function confirmacaoExcluirValida(texto) {
  return normalizarConfirmacao(texto) === CONFIRMACAO_EXCLUIR;
}
