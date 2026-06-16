// Futty v2.0 — Barra de topo. Esquerda: marca "FUT." ou "← Voltar" (se back).
// Direita: título opcional. Linha gradiente por baixo.
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
        ) : (
          <Link to="/home" aria-label="Início" style={{ display: 'flex', alignItems: 'center' }}>
            <FuttyLogo variant="flat" size={32} />
          </Link>
        )}
        {title && <span className="topbar-title">{title}</span>}
      </header>
    </div>
  );
}
