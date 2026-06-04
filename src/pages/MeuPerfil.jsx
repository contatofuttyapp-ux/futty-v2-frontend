// Futty v2.0 — O meu perfil (placeholder)
import Topbar from '../components/Topbar';
import '../styles/app.css';

export default function MeuPerfil() {
  return (
    <div className="app-shell">
      <Topbar />
      <main className="app-main">
        <div className="empty-state">
          <div className="empty-state__emoji">👤</div>
          <h2>O meu perfil</h2>
          <p className="muted">Em breve.</p>
        </div>
      </main>
    </div>
  );
}
