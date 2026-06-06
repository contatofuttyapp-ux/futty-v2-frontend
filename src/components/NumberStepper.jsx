// Futty v2.0 — Selector numérico +/- (ex.: jogadores por time).
// Clampa entre min e max; o valor é sempre um número inteiro.
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

export default function NumberStepper({ value, onChange, min = 2, max = 11 }) {
  const n = Math.min(max, Math.max(min, Number(value) || min));
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <button type="button" className="stepper-btn" aria-label="Menos" style={BTN} onClick={() => onChange(Math.max(min, n - 1))}>
        −
      </button>
      <span style={{ fontSize: 24, fontWeight: 900, color: '#fff', minWidth: 32, textAlign: 'center' }}>{n}</span>
      <button type="button" className="stepper-btn" aria-label="Mais" style={BTN} onClick={() => onChange(Math.min(max, n + 1))}>
        +
      </button>
    </div>
  );
}
