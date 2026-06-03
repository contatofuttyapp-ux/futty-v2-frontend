// Futty v2.0 — Barra de topo das páginas internas
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Topbar() {
  const { user, signOut } = useAuth();

  return (
    <header className="app-topbar">
      <Link to="/home" className="app-brand" style={{ color: 'inherit' }}>
        Futty<span className="app-brand__dot">.</span>
      </Link>
      <div className="app-topbar__user">
        <span>{user?.email}</span>
        <button type="button" className="btn btn--ghost btn--sm" onClick={() => signOut()}>
          Sair
        </button>
      </div>
    </header>
  );
}
