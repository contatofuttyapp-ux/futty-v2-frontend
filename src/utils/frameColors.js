// Futty v2.0 — Mapa de cores do frame do jogador (fonte única).
// A chave é guardada em users.cor_frame e aplica-se no PlayerCard, Figurinha e Ranking.

export const FRAME_COLORS = {
  dourado: {
    stroke: '#d4a017',
    glow: 'rgba(212,160,23,',
    dot: '#f5e070',
  },
  verde: {
    stroke: '#8b5cf6',
    glow: 'rgba(139,92,246,',
    dot: '#a78bfa',
  },
  roxo: {
    stroke: '#8b5cf6',
    glow: 'rgba(139,92,246,',
    dot: '#a78bfa',
  },
  branco: {
    stroke: '#ffffff',
    glow: 'rgba(255,255,255,',
    dot: '#ffffff',
  },
};

export function getFrameColor(cor) {
  return FRAME_COLORS[cor] || FRAME_COLORS.dourado;
}
