// Futty v2.0 — Rodada 29A (H): o logo do time na criação. Opcional, 2 MB, png/jpg/webp — o mesmo que o motor aceita
// em POST /api/teams/:slug/logo (a moderação e a verificação de imagem real acontecem lá, não aqui).
export const LOGO_TIPOS = ['image/png', 'image/jpeg', 'image/webp'];
export const LOGO_MAX_BYTES = 2 * 1024 * 1024;

/** Por que este arquivo não serve como logo (antes de subir), ou null se serve. */
export function motivoDoLogo(arquivo) {
  if (!arquivo) return null;
  if (!LOGO_TIPOS.includes(arquivo.type)) return 'Use uma imagem PNG, JPG ou WEBP.';
  if (arquivo.size > LOGO_MAX_BYTES) return 'O logo pode ter no máximo 2 MB.';
  return null;
}

/** O aviso do passo 4 quando o motor recusou o logo: o time já foi criado, o logo se troca no painel do time. */
export function avisoLogoRecusado(motivo) {
  const limpo = String(motivo || 'não deu para enviar agora').trim().replace(/[.!\s]+$/, '');
  return `Logo não aceito: ${limpo}. Você pode tentar outro no painel do time.`;
}
