// Futty v2.0 — Barra de navegação inferior (ícones SVG custom + animações por tab).
import { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import Icon from './Icon';
import { useApi } from '../hooks/useApi';
import { useSessao } from '../context/SessaoContext';
import { preaquecerAbas } from '../lib/preaquecerAbas';

export default function BottomNav() {
  const { pathname } = useLocation();
  const { teams, votacaoStatus } = useSessao();

  // VELOCIDADE 4: a barra aquece os próprios destinos. Cada aba vive num chunk
  // separado que, até agora, só começava a ser lido no toque — e o toque ficava
  // com cara de morto enquanto isso. Corre em ócio, depois da tela actual estar
  // desenhada, e só uma vez por sessão.
  useEffect(() => preaquecerAbas(), []);

  // Slug para o Ranking: o da rota atual ou a 1ª equipa do utilizador.
  const urlSlug = pathname.match(/^\/equipa\/([^/]+)/)?.[1] || null;
  const slug = urlSlug || teams[0]?.slug || null;
  // Sem time, /ranking (sem :slug): a própria tela do Ranking mostra o convite
  // a criar/entrar. Antes disto mandava para /home — mesma tela do Início, daí
  // parecer que a navegação não tinha efeito nenhum.
  const rankingTo = slug ? `/equipa/${slug}/ranking` : '/ranking';

  // Votos pendentes -> badge vermelho na tab Ranking. votacaoStatus do
  // SessaoContext já é da equipa PRINCIPAL (teams[0], 1x por sessão) — só
  // dispara pedido próprio quando a rota é de uma equipa DIFERENTE da
  // principal (urlSlug truthy e distinto), caso em que o valor do contexto
  // não serve.
  const usaVotacaoDoContexto = !urlSlug || urlSlug === teams[0]?.slug;
  const { data: votacaoPropria } = useApi(!usaVotacaoDoContexto && slug ? `/api/teams/${slug}/votacao-status` : null);
  const votacao = usaVotacaoDoContexto ? votacaoStatus : votacaoPropria;
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
