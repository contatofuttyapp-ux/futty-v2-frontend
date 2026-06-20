// Futty v2.0 — Barra de navegação inferior (ícones SVG custom + animações por tab).
import { Link, useLocation } from 'react-router-dom';
import Icon from './Icon';
import { useTeams } from '../hooks/useTeam';
import { useApi } from '../hooks/useApi';

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
    { key: 'home', label: 'Início', icon: 'inicio', cls: 'nav-home', to: '/home', isActive: (p) => p === '/home' },
    { key: 'feed', label: 'Resenha', icon: 'resenha', cls: 'nav-resenha', to: '/feed', isActive: (p) => p.startsWith('/feed') },
    { key: 'ranking', label: 'Ranking', icon: 'ranking', cls: 'nav-ranking', to: rankingTo, isActive: (p) => /\/ranking$/.test(p), badge: hasPendingVotes },
    { key: 'figurinha', label: 'Figurinha', icon: 'figurinha', cls: 'nav-figurinha', to: '/figurinha', isActive: (p) => p.startsWith('/figurinha') },
    { key: 'perfil', label: 'Perfil', icon: 'perfil', cls: 'nav-perfil', to: '/perfil', isActive: (p) => p.startsWith('/perfil') },
  ];

  return (
    <nav className="bottom-nav" aria-label="Navegação principal" data-tour="bottom-nav">
      {tabs.map(({ key, label, icon, cls, to, isActive, badge }) => {
        const active = isActive(pathname);
        return (
          <Link key={key} to={to} className={`bottom-nav__tab bottom-nav__tab--${key} ${active ? 'bottom-nav__tab--active' : ''}`}>
            <span className="bottom-nav__icon">
              <span className={`bottom-nav__glyph ${active ? 'tab-shine' : ''}`}>
                <Icon name={icon} size={24} color="#d4a017" className={cls} style={{ opacity: active ? 1 : 0.3 }} />
              </span>
              {badge && <span className="bottom-nav__badge" aria-label="Votos pendentes" />}
            </span>
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
