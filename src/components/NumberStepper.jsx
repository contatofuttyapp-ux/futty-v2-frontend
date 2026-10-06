// Futty v2.0 — Selector numérico +/- (ex.: jogadores por time).
// Clampa entre min e max; o valor é sempre um número inteiro.
// `cor` pinta o seletor com uma cor de destaque (o Novo jogo usa o ROXO quando o número vale "só neste
// jogo"); sem `cor`, é o seletor de sempre.
const BTN = {
  width: 36,
  height: 36,
  borderRadius: '50%',
  background: '#111',
  border: '1px solid #222',
  color: '#fff',
  fontSize: 20,
  lineHeight: 1,
  cursor: 'pointer',
  display: 'grid',
  placeItems: 'center',
};

export default function NumberStepper({ value, onChange, min = 2, max = 11, cor = null }) {
  const n = Math.min(max, Math.max(min, Number(value) || min));
  const btn = cor ? { ...BTN, background: 'rgba(139,92,246,0.14)', border: `1.5px solid ${cor}`, color: cor } : BTN;
  return (
    <div data-stepper={cor ? 'destaque' : undefined} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <button type="button" className="stepper-btn" aria-label="Menos" style={btn} onClick={() => onChange(Math.max(min, n - 1))}>
        −
      </button>
      <span style={{ fontSize: 24, fontWeight: 900, color: cor || '#fff', minWidth: 32, textAlign: 'center' }}>{n}</span>
      <button type="button" className="stepper-btn" aria-label="Mais" style={btn} onClick={() => onChange(Math.min(max, n + 1))}>
        +
      </button>
    </div>
  );
}
