// Futty v2.0 — Indicador de loading consistente em todas as páginas.
// FASE 3.42 — passa a usar o loader oficial (F a desenhar-se). A API mantém-se
// (`text`), por isso todos os call sites <Loading text="…" /> herdam a mudança.
import FuttyLoader from './FuttyLoader';

export default function Loading({ text = 'Carregando…' }) {
  return (
    <div style={{ display: 'grid', placeItems: 'center', padding: '32px 0' }}>
      <FuttyLoader label={text} />
    </div>
  );
}
