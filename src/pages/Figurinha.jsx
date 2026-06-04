// Futty v2.0 — Figurinha (placeholder)
import Topbar from '../components/Topbar';
import '../styles/app.css';

export default function Figurinha() {
  return (
    <div className="app-shell">
      <Topbar title="FIGURINHA" />
      <main className="app-main">
        <div className="empty-state">
          <div className="empty-state__emoji">🃏</div>
          <h2>Figurinha</h2>
          <p className="muted">Em breve.</p>
        </div>
      </main>
    </div>
  );
}
