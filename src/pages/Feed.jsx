// Futty v2.0 — Resenha (placeholder)
import Topbar from '../components/Topbar';
import '../styles/app.css';

export default function Feed() {
  return (
    <div className="app-shell">
      <Topbar />
      <main className="app-main">
        <div className="empty-state">
          <div className="empty-state__emoji">📰</div>
          <h2>Resenha</h2>
          <p className="muted">Em breve.</p>
        </div>
      </main>
    </div>
  );
}
