// Futty v2.0 — Resenha (placeholder, sem topbar)
import '../styles/app.css';

export default function Feed() {
  return (
    <div className="app-shell">
      <main className="app-main">
        <h1 className="app-page-title">Resenha</h1>
        <div className="empty-state" style={{ marginTop: 20 }}>
          <div className="empty-state__emoji">📰</div>
          <h2>Resenha</h2>
          <p className="muted">Em breve.</p>
        </div>
      </main>
    </div>
  );
}
