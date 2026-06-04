// Futty v2.0 — Indicador de loading consistente em todas as páginas.
export default function Loading({ text = 'A carregar…' }) {
  return <p className="muted">{text}</p>;
}
