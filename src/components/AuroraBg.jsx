// Futty v2.0 — Fundo aurora (dourado + roxo): 4 blobs desfocados a derivar
// lentamente atrás de todo o conteúdo. CSS puro (ver index.css), GPU.
export default function AuroraBg() {
  return (
    <div className="aurora-wrapper" aria-hidden="true">
      <div className="aurora-blob" />
      <div className="aurora-blob" />
      <div className="aurora-blob" />
      <div className="aurora-blob" />
    </div>
  );
}
