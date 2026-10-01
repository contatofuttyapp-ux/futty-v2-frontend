// Futty v2.0 — P1-5: traduz o erro cru de um upload de foto numa mensagem que
// diz ao utilizador o que fazer (repetir por rede, ou trocar/cortar a foto).
// Usado no Onboarding e no Perfil, ao lado de um botão "tentar de novo".
export function mensagemUploadFoto(err) {
  // FOTO_FRACA (olheiro de entrada, 11-ago): foto pequena/corrompida/preta/estourada
  // — reprovada ANTES de guardar, sem gastar nada. Mensagem do backend já é a certa.
  if (err?.code === 'FOTO_FRACA') {
    return { texto: err.message, podeRepetir: true };
  }
  const m = String(err?.message || '').toLowerCase();
  // Falha de rede: o fetch rejeita antes de haver resposta. Pelo apiFetch chega com code 'SEM_REDE'
  // (Rodada 29G); as mensagens cruas do navegador seguem reconhecidas por quem não passa por ele.
  if (err?.code === 'SEM_REDE' || m.includes('failed to fetch') || m.includes('networkerror') || m.includes('load failed') || m.includes('sem ligação')) {
    return { texto: 'Sem conexão. Verifique a internet e tente de novo.', podeRepetir: true };
  }
  // Tamanho: o backend recusa acima de 5MB.
  if (m.includes('5mb') || m.includes('limite') || m.includes('grande') || m.includes('too large')) {
    return { texto: 'A imagem é grande demais (máx. 5MB). Escolha outra ou corte mais.', podeRepetir: false };
  }
  // Formato não suportado.
  if (m.includes('jpeg') || m.includes('png') || m.includes('webp') || m.includes('formato') || m.includes('suportad')) {
    return { texto: 'Formato não suportado: use JPEG, PNG ou WebP.', podeRepetir: false };
  }
  // Genérico: mantém a pista do backend se houver, mas em tom acionável.
  return { texto: 'Não deu para enviar a foto. Tente de novo.', podeRepetir: true };
}
