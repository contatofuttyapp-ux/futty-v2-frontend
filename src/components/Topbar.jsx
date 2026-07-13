// Futty v2.0 — Barra de topo. Com `back`: chevron "← Voltar". Com `title` (sem back):
// só o título centrado. Com `hud`: wordmark dourado à esquerda + linha HUD (estilo
// circuito). Sem nenhum: logo F flat (fallback de marca). Linha gradiente por baixo.
import { Link } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import FuttyLogo from './FuttyLogo';

export default function Topbar({ title = null, back = null, hud = null }) {
  // Variante HUD: wordmark dourado à esquerda + linha dourada com degrau de 45°
  // colada à extremidade inferior da faixa preta.
  if (hud) {
    return (
      <div className="app-topbar-wrap">
        <header className="app-topbar app-topbar--hud">
          <span
            style={{
              fontFamily: "'Rajdhani', sans-serif",
              fontWeight: 700,
              fontSize: 15,
              letterSpacing: '0.14em',
              color: '#d4a017',
              whiteSpace: 'nowrap',
            }}
          >
            {hud}
          </span>
          {/* Linha delimitadora na extremidade inferior, com degrau de 45° após o texto.
              O SVG está sobreposto (absolute) — não faz a faixa crescer além de 44px. */}
          <svg
            width="100%"
            height="10"
            viewBox="0 0 400 10"
            preserveAspectRatio="none"
            aria-hidden="true"
            style={{ position: 'absolute', bottom: 0, left: 0, display: 'block' }}
          >
            <defs>
              <linearGradient id="hudline" x1="0" x2="1">
                <stop offset="0" stopColor="#d4a017" stopOpacity="0.9" />
                <stop offset="0.6" stopColor="#d4a017" stopOpacity="0.4" />
                <stop offset="1" stopColor="#d4a017" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d="M0 9 H128 L137 1 H400" stroke="url(#hudline)" strokeWidth="1.5" fill="none" />
          </svg>
        </header>
      </div>
    );
  }

  return (
    <div className="app-topbar-wrap">
      <header className="app-topbar">
        {back ? (
          <Link to={back} className="topbar-back" aria-label="Voltar">
            <ChevronLeft size={22} />
          </Link>
        ) : !title ? (
          <Link to="/home" aria-label="Início" style={{ display: 'flex', alignItems: 'center' }}>
            <FuttyLogo variant="flat" size={36} />
          </Link>
        ) : null}
        {title && <span className="topbar-title">{title}</span>}
      </header>
    </div>
  );
}
