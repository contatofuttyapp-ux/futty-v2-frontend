// Futty v2.0 — Barra de topo. Esquerda: marca "FUT" ou "← Voltar" (se back).
// Direita: título opcional. Linha gradiente verde→roxo por baixo.
import { Link } from 'react-router-dom';

export default function Topbar({ title = null, back = null }) {
  return (
    <div className="app-topbar-wrap">
      <header className="app-topbar">
        {back ? (
          <Link to={back} className="topbar-back">
            ← Voltar
          </Link>
        ) : (
          <Link to="/home" className="app-brand">
            FUT<span className="app-brand__dot">.</span>
          </Link>
        )}
        {title && <span className="topbar-title">{title}</span>}
      </header>
      <div className="app-topbar__line" />
    </div>
  );
}
