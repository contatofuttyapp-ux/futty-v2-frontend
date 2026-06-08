// Futty v2.0 — Mapa de cores do frame do jogador (fonte única).
// A chave é guardada em users.cor_frame e aplica-se no PlayerCard, Figurinha e Ranking.

export const FRAME_COLORS = {
  dourado: { stroke: '#d4a017', glow: 'rgba(212,160,23,', dot: '#f5e070' },
  roxo: { stroke: '#8b5cf6', glow: 'rgba(139,92,246,', dot: '#a78bfa' },
  roxo_escuro: { stroke: '#6d28d9', glow: 'rgba(109,40,217,', dot: '#8b5cf6' },
  prata: { stroke: '#9ca3af', glow: 'rgba(156,163,175,', dot: '#d1d5db' },
  vermelho: { stroke: '#ef4444', glow: 'rgba(239,68,68,', dot: '#fca5a5' },
  verde: { stroke: '#10b981', glow: 'rgba(16,185,129,', dot: '#6ee7b7' },
  azul: { stroke: '#3b82f6', glow: 'rgba(59,130,246,', dot: '#93c5fd' },
  cinza: { stroke: '#4b5563', glow: 'rgba(75,85,99,', dot: '#9ca3af' },
  // Back-compat: chave antiga ainda guardada nalguns perfis.
  branco: { stroke: '#ffffff', glow: 'rgba(255,255,255,', dot: '#ffffff' },
};

export function getFrameColor(cor) {
  return FRAME_COLORS[cor] || FRAME_COLORS.dourado;
}
