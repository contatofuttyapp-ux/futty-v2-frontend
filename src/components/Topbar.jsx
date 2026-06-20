// Futty v2.0 — Barra de topo. Com `back`: chevron "← Voltar". Com `title` (sem back):
// só o título centrado. Sem ambos: wordmark (fallback de marca). Linha gradiente por baixo.
import { Link } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import FuttyLogo from './FuttyLogo';

export default function Topbar({ title = null, back = null }) {
  return (
    <div className="app-topbar-wrap">
      <header className="app-topbar">
        {back ? (
          <Link to={back} className="topbar-back" aria-label="Voltar">
            <ChevronLeft size={22} />
          </Link>
        ) : !title ? (
          <Link to="/home" aria-label="Início" style={{ display: 'flex', alignItems: 'center' }}>
            <FuttyLogo variant="wordmark" size={28} color="#8b5cf6" />
          </Link>
        ) : null}
        {title && <span className="topbar-title">{title}</span>}
      </header>
    </div>
  );
}
