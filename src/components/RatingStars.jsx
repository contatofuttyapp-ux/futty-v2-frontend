// Futty v2.0 — Estrelas da média (com preenchimento fracionário).
export default function RatingStars({ value = 0, size = 22 }) {
  const stars = [];
  for (let i = 1; i <= 5; i += 1) {
    const fill = Math.min(1, Math.max(0, value - (i - 1)));
    stars.push(
      <span key={i} style={{ position: 'relative', display: 'inline-block', fontSize: size, lineHeight: 1 }}>
        <span style={{ color: 'rgba(255,255,255,0.12)' }}>★</span>
        {fill > 0 && (
          <span
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              width: fill >= 1 ? '100%' : '50%',
              overflow: 'hidden',
              whiteSpace: 'nowrap',
              color: '#fbbf24',
              textShadow: '0 0 8px rgba(251,191,36,0.55)',
            }}
          >
            ★
          </span>
        )}
      </span>
    );
  }
  return <span style={{ display: 'inline-flex', gap: 4 }}>{stars}</span>;
}
