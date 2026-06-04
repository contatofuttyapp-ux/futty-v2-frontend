// Futty v2.0 — O meu perfil / configurações
import { useAuth } from '../hooks/useAuth';
import Topbar from '../components/Topbar';
import '../styles/app.css';

export default function MeuPerfil() {
  const { user, signOut } = useAuth();

  return (
    <div className="app-shell">
      <Topbar title="PERFIL" />
      <main className="app-main">
        <h1 className="app-page-title">O meu perfil</h1>
        <p className="app-page-sub">Conta e definições.</p>

        <div className="form-card" style={{ maxWidth: 480 }}>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Email</label>
            <div style={{ fontWeight: 600 }}>{user?.email || '—'}</div>
          </div>
        </div>

        <p className="muted" style={{ marginTop: 20, fontSize: 14 }}>
          Mais definições em breve.
        </p>

        <button
          type="button"
          className="btn btn--ghost"
          style={{ marginTop: 16 }}
          onClick={() => signOut()}
        >
          Terminar sessão
        </button>
      </main>
    </div>
  );
}
