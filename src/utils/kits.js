// Futty v2.0 — Kits de camisola (uniformes com identidade da marca).
// Fonte única usada pela Figurinha (tiles), PlayerCard (preview) e
// figurinhaCanvas (render). Um kit é identificado por id "kit-*"; as cores
// simples do uniforme continuam a ser hex.

export const KITS = [
  { id: 'kit-gold', label: 'Futty Gold', badge: '★', base: '#0d0d12', acento: '#d4a017', locked: false },
  { id: 'kit-purple', label: 'Futty Purple', badge: '★', base: '#0d0d12', acento: '#8b5cf6', locked: false },
  { id: 'kit-elite', label: 'Elite', badge: '👑', base: '#d4a017', acento: '#fff8dc', locked: true },
];

const KIT_MAP = Object.fromEntries(KITS.map((k) => [k.id, k]));

// Devolve o kit pelo id (ou null se for uma cor simples).
export function getKit(id) {
  return KIT_MAP[id] || null;
}

// Gradiente CSS do padrão do kit (base + 2 faixas finas de acento a 30% e 70%).
export function kitGradientCss(kit) {
  const { base, acento } = kit;
  return (
    `linear-gradient(180deg, ${base} 0%, ${base} 28%, ${acento} 30%, ${acento} 32%, ` +
    `${base} 32%, ${base} 68%, ${acento} 70%, ${acento} 72%, ${base} 72%, ${base} 100%)`
  );
}
