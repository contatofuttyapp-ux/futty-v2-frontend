// Futty v2.0 — Barra de navegação inferior (estilo app nativo).
import { Link, useLocation } from 'react-router-dom';
import { Home, Newspaper, Star, CreditCard, User } from 'lucide-react';
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
  const hasPendingVotes = !!votacao?.game_id && votacao.faltam > 0;

  const tabs = [
    { key: 'home', label: 'Início', Icon: Home, to: '/home', isActive: (p) => p === '/home' },
    { key: 'feed', label: 'Resenha', Icon: Newspaper, to: '/feed', isActive: (p) => p.startsWith('/feed') },
    { key: 'ranking', label: 'Ranking', Icon: Star, to: rankingTo, isActive: (p) => /\/ranking$/.test(p), badge: hasPendingVotes },
    { key: 'figurinha', label: 'Figurinha', Icon: CreditCard, to: '/figurinha', isActive: (p) => p.startsWith('/figurinha') },
    { key: 'perfil', label: 'Perfil', Icon: User, to: '/perfil', isActive: (p) => p.startsWith('/perfil') },
  ];

  return (
    <nav className="bottom-nav" aria-label="Navegação principal">
      {tabs.map(({ key, label, Icon, to, isActive, badge }) => {
        const active = isActive(pathname);
        return (
          <Link key={key} to={to} className={`bottom-nav__tab ${active ? 'bottom-nav__tab--active' : ''}`}>
            {active && <span className="bottom-nav__indicator" />}
            <span className="bottom-nav__icon">
              <Icon size={22} strokeWidth={active ? 2.4 : 2} />
              {badge && <span className="bottom-nav__badge" aria-label="Votos pendentes" />}
            </span>
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
