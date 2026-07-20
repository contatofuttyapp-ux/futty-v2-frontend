// Futty v2.0 — Selo de honra (Vaga 11C) — forma A (postal denteado), base metálica
// por tier (ouro/prata/bronze), troféu da casa + faixa com o texto, varrimento de
// vidro (~6s; reduced-motion estático). Usado no olhinho da Figurinha e na vitrine.
const TROFEU = 'M13 9 L35 9 L31 25 L17 25 Z M13.5 11 L8 11 L8 17 L15 20 M34.5 11 L40 11 L40 17 L33 20 M24 25 L24 32 M17 40 L31 40 L28 32 L20 32 Z';

export default function SeloHonra({ tier = 'ouro', label = '', size = 64, title }) {
  const t = ['ouro', 'prata', 'bronze'].includes(tier) ? tier : 'ouro';
  return (
    <div className={`seloh seloh--${t}`} style={{ width: size }} title={title || label}>
      <div className="seloh__m" />
      <div className="seloh__rim" />
      <span className="seloh__t">
        <svg width={size * 0.56} height={size * 0.56} viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinejoin="miter" aria-hidden="true">
          <path d={TROFEU} />
        </svg>
      </span>
      <div className="seloh__f"><span style={{ fontSize: Math.max(7, size * 0.155) }}>{label}</span></div>
      <div className="seloh__sw" />
    </div>
  );
}
