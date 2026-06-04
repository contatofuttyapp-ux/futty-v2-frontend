// Futty v2.0 — Avaliação por estrelas (1 a 5). readOnly mostra só a nota.
export default function Stars({ value = 0, onChange, readOnly = false, big = false }) {
  return (
    <span className={`stars ${big ? 'stars--lg' : ''}`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          className={`star ${value >= n ? 'star--on' : ''} ${readOnly ? 'star--ro' : ''}`}
          aria-label={`${n} estrela${n > 1 ? 's' : ''}`}
          disabled={readOnly}
          onClick={readOnly ? undefined : () => onChange(n)}
        >
          ★
        </button>
      ))}
    </span>
  );
}
