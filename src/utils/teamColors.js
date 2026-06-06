// Futty v2.0 — Cores das equipas (chave -> apresentação) + helpers de avatar.
export const TEAM_COLORS = {
  verde: { label: 'Verde', hex: '#8b5cf6', text: '#04140d' },
  azul: { label: 'Azul', hex: '#3b82f6', text: '#04101f' },
  vermelho: { label: 'Vermelho', hex: '#ef4444', text: '#1f0606' },
  preto: { label: 'Preto', hex: '#1c1c20', text: '#f5f5f7' },
};

export const COLOR_OPTIONS = Object.entries(TEAM_COLORS).map(([key, v]) => ({ key, ...v }));

/** Devolve a cor (hex/text/label) de uma chave; faz fallback para verde. */
export function colorOf(key) {
  return TEAM_COLORS[key] || TEAM_COLORS.verde;
}

/** Iniciais (até 2 letras) de um nome, para avatares. */
export function initials(name = '') {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || '')
    .join('');
}
