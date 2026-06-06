// Futty v2.0 — Mapa de cores do frame do jogador (fonte única).
// A chave é guardada em users.cor_frame e aplica-se no PlayerCard, Figurinha e Ranking.

export const FRAME_COLORS = {
  dourado: {
    stroke: '#d4a017',
    glow: 'rgba(212,160,23,',
    dot: '#f5e070',
  },
  verde: {
    stroke: '#00e5a0',
    glow: 'rgba(0,229,160,',
    dot: '#00ffb3',
  },
  roxo: {
    stroke: '#7c3aed',
    glow: 'rgba(124,58,237,',
    dot: '#a855f7',
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
