// Futty v2.0 — Que vídeo um link aponta (YouTube, TikTok, Instagram).

// ─── Vídeo por LINK (zero storage nosso) ────────────────────────────────────────
// Deteta o 1º URL de YouTube/TikTok/Instagram no corpo do post. YouTube = thumbnail
// + play (embed inline ao tocar); TikTok/Instagram = card de link (abre nova aba).
const RE_YOUTUBE = /https?:\/\/(?:www\.)?(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/i;
const RE_TIKTOK = /https?:\/\/(?:www\.|vm\.|vt\.)?tiktok\.com\/[^\s]+/i;
const RE_INSTAGRAM = /https?:\/\/(?:www\.)?instagram\.com\/(?:reel|reels|p|tv)\/[^\s?/#]+/i;

function detectarVideoLink(texto) {
  if (!texto) return null;
  const yt = texto.match(RE_YOUTUBE);
  if (yt) return { tipo: 'youtube', id: yt[1], url: yt[0] };
  const tk = texto.match(RE_TIKTOK);
  if (tk) return { tipo: 'tiktok', url: tk[0] };
  const ig = texto.match(RE_INSTAGRAM);
  if (ig) return { tipo: 'instagram', url: ig[0] };
  return null;
}

export { detectarVideoLink };
