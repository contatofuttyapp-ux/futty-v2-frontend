// Futty v2.0 — Barra de navegação inferior (ícones SVG desenhados à mão).
import { Link, useLocation } from 'react-router-dom';
import { useTeams } from '../hooks/useTeam';
import { useApi } from '../hooks/useApi';

const svgProps = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2.5,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  width: 24,
  height: 24,
};

// Início — bola de futebol
function IconInicio() {
  return (
    <svg {...svgProps}>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 2 L12 6 M6 6 L9 9 M18 6 L15 9 M4 14 L8 13 M20 14 L16 13 M9 20 L10 16 M15 20 L14 16" />
      <polygon points="12,6 15,9 14,13 10,13 9,9" fill="none" />
    </svg>
  );
}

// Resenha — troféu
function IconResenha() {
  return (
    <svg {...svgProps}>
      <path d="M6 9H4a2 2 0 0 0 0 4h2" />
      <path d="M18 9h2a2 2 0 0 1 0 4h-2" />
      <path d="M6 4h12v10a6 6 0 0 1-12 0V4z" />
      <path d="M9 21h6" />
      <path d="M12 18v3" />
    </svg>
  );
}

// Ranking — estrela (gira + pulsa quando activa)
function IconRanking({ active }) {
  return (
    <svg {...svgProps} style={{ transformOrigin: 'center', animation: active ? 'starSpin 8s linear infinite, starPulse 2s ease-in-out infinite' : 'none' }}>
      <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
    </svg>
  );
}

// Figurinha — carta com canto dobrado
function IconFigurinha() {
  return (
    <svg {...svgProps}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14,2 14,8 20,8" />
      <circle cx="12" cy="14" r="3" />
    </svg>
  );
}

// Perfil — camisola de futebol
function IconPerfil() {
  return (
    <svg {...svgProps}>
      <path d="M3 6 L6 3 L9 6 L12 3 L15 6 L18 3 L21 6 L19 19 L5 19 Z" />
      <path d="M9 6 L9 10 M15 6 L15 10" />
    </svg>
  );
}

export default function BottomNav() {
  const { pathname } = useLocation();
  const { teams } = useTeams();

  // Slug para o Ranking: o da rota atual ou a 1ª equipa do utilizador.
  const urlSlug = pathname.match(/^\/equipa\/([^/]+)/)?.[1] || null;
  const slug = urlSlug || teams[0]?.slug || null;
  const rankingTo = slug ? `/equipa/${slug}/ranking` : '/home';

  // Votos pendentes -> badge vermelho na tab Ranking.
  const { data: votacao } = useApi(slug ? `/api/teams/${slug}/votacao-status` : null);
  const hasPendingVotes = !!votacao && (votacao.faltam > 0 || votacao.pedido_revotacao);

  const tabs = [
    { key: 'home', label: 'Início', Icon: IconInicio, to: '/home', isActive: (p) => p === '/home' },
    { key: 'feed', label: 'Resenha', Icon: IconResenha, to: '/feed', isActive: (p) => p.startsWith('/feed') },
    { key: 'ranking', label: 'Ranking', Icon: IconRanking, to: rankingTo, isActive: (p) => /\/ranking$/.test(p), badge: hasPendingVotes },
    { key: 'figurinha', label: 'Figurinha', Icon: IconFigurinha, to: '/figurinha', isActive: (p) => p.startsWith('/figurinha') },
    { key: 'perfil', label: 'Perfil', Icon: IconPerfil, to: '/perfil', isActive: (p) => p.startsWith('/perfil') },
  ];

  return (
    <nav className="bottom-nav" aria-label="Navegação principal">
      {tabs.map(({ key, label, Icon, to, isActive, badge }) => {
        const active = isActive(pathname);
        return (
          <Link key={key} to={to} className={`bottom-nav__tab ${active ? 'bottom-nav__tab--active' : ''}`}>
            {active && <span className="bottom-nav__indicator" />}
            <span className="bottom-nav__icon">
              <Icon active={active} />
              {badge && <span className="bottom-nav__badge" aria-label="Votos pendentes" />}
            </span>
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
