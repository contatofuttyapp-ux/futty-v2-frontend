// Futty v2.0 — Cores dos times (chave -> apresentação) + helpers de avatar.
//
// Rodada 29I, bloco 3: a fonte das cores é a paleta fixa do escudo (utils/escudo.js, 12 cores, a mesma do motor). Este arquivo só
// apresenta cada chave guardada em teams.cor — inclusive a antiga 'verde', que sempre foi mostrada como ROXO (31-jul: o hex dela
// sempre foi #8b5cf6, o roxo da casa; o rótulo dizia "Verde" por herança e virou "Roxo"). A chave 'verde' NÃO muda no banco.
import { PALETA, chaveDaCor } from './escudo';

const TEXTO_ESCURO = new Set(['ouro', 'lima', 'ciano']);

export const TEAM_COLORS = Object.fromEntries(
  PALETA.map((c) => [c.chave, { label: c.nome, hex: c.hex, text: TEXTO_ESCURO.has(c.chave) ? '#111111' : '#f5f5f7' }]),
);

/** Devolve a cor (hex/text/label) de uma chave guardada; a antiga 'verde' é o roxo, e o desconhecido também. */
export function colorOf(key) {
  return TEAM_COLORS[chaveDaCor(key)];
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
