// Futty v2.0 — Sistema de cores central.
// Hierarquia:
//  - neon  : APENAS tab ativa, CTA principal, média/rating, glow do top 3
//  - purple: botões secundários, badges, links, chips inativos
//  - white : texto principal
//  - grayLight : texto secundário, labels, ícones inativos
//  - grayDark  : bordas de cards, separadores
//  - bg    : fundo
export const COLORS = {
  neon: '#8b5cf6',
  purple: '#7c3aed',
  white: '#ffffff',
  grayLight: '#aaaaaa',
  grayDark: '#222222',
  bg: '#080808',
  bgElev: '#101012',
  warning: '#f59e0b',
  error: '#ef4444',
};

// Mesmos valores expostos como variáveis CSS (ver index.css).
export const CSS_VARS = {
  neon: 'var(--neon)',
  purple: 'var(--purple)',
  white: 'var(--text)',
  grayLight: 'var(--text-dim)',
  grayDark: 'var(--border)',
  bg: 'var(--bg)',
  bgElev: 'var(--bg-elev)',
  warning: 'var(--warning)',
  error: 'var(--danger)',
};

// Dourado do PlayerCard premium (frame, badge de nota).
export const gold = '#d4a017';
export const goldLight = '#f5e070';

export default COLORS;
