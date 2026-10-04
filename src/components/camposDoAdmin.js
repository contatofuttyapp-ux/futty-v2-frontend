// Futty v2.0 — Rodada 29S, bloco B: os três estilos de campo dos formulários do admin (AdminPanel e ResultadoModal), numa fonte só — o
// ResultadoModal saiu do AdminPanel para components/ e os dois precisam dos mesmos campos.
// fontSize 16: abaixo disso o iPhone dá zoom ao focar (Rodada 8A, ver index.css).
export const inputStyle = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '10px 12px',
  borderRadius: 10,
  border: '1px solid #222222',
  background: '#0c0c0c',
  color: '#fff',
  fontSize: 16,
};
export const lbl = { fontSize: 12, color: 'var(--text-dim)' };
export const secLbl = { fontSize: 12, fontWeight: 800, letterSpacing: '0.08em', color: 'var(--text-dim)', textTransform: 'uppercase' };
