// Futty v2.0 — Comentários (PLACEHOLDER).
// A implementação completa (lista, threads, menções, anexos, denúncias)
// é feita na Parte 4. Este placeholder mantém a integração no feed estável.
export default function Comentarios({ parentType, parentId }) {
  return (
    <div
      data-parent={`${parentType}:${parentId}`}
      style={{ padding: '10px 0 2px', color: 'var(--text-dim)', fontSize: 13 }}
    >
      💬 Comentários em breve.
    </div>
  );
}
