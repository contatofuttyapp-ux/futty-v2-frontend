// Futty v2.0 — Layout: envolve o conteúdo e mostra a BottomNav nas rotas certas.
// Swipe lateral (react-swipeable) navega entre os tabs principais da BottomNav.
import { useLocation, useNavigate } from 'react-router-dom';
import { useSwipeable } from 'react-swipeable';
import { useTeams } from '../hooks/useTeam';
import BottomNav from './BottomNav';
import AuroraBg from './AuroraBg';

// Rotas onde a BottomNav NÃO aparece.
const HIDE_NAV_PATTERNS = [
  /^\/$/, // redirect inicial
  /^\/login/,
  /^\/register/,
  /^\/forgot-password/,
  /^\/convite\//,
  /^\/p\//, // vista pública do sorteio (fullscreen)
  /^\/criar-equipa/,
  /^\/equipa\/[^/]+\/jogo\//, // jogo/:id e jogo/novo
  /^\/equipa\/[^/]+\/jogador\//,
];

function shouldShowNav(pathname) {
  return !HIDE_NAV_PATTERNS.some((re) => re.test(pathname));
}

// Ordem dos tabs da BottomNav (mesma ordem visual) → usada no swipe lateral.
function tabActual(pathname, rankingTo) {
  const tabs = [
    { key: 'home', to: '/home', match: (p) => p === '/home' },
    { key: 'feed', to: '/feed', match: (p) => p.startsWith('/feed') },
    { key: 'ranking', to: rankingTo, match: (p) => /\/ranking$/.test(p) },
    { key: 'figurinha', to: '/figurinha', match: (p) => p.startsWith('/figurinha') },
    { key: 'perfil', to: '/perfil', match: (p) => p.startsWith('/perfil') },
  ];
  return { tabs, index: tabs.findIndex((t) => t.match(pathname)) };
}

// Verifica se o swipe começou dentro de um elemento com scroll horizontal
// (ex.: chips-row) — nesse caso não navega, deixa o utilizador fazer scroll.
function comecouEmScrollHorizontal(target) {
  let el = target;
  while (el && el !== document.body) {
    if (el.scrollWidth > el.clientWidth + 4) {
      const overflowX = window.getComputedStyle(el).overflowX;
      if (overflowX === 'auto' || overflowX === 'scroll') return true;
    }
    el = el.parentElement;
  }
  return false;
}

export default function Layout({ children }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { teams } = useTeams();
  const showNav = shouldShowNav(pathname);

  const urlSlug = pathname.match(/^\/equipa\/([^/]+)/)?.[1] || null;
  const slug = urlSlug || teams[0]?.slug || null;
  const rankingTo = slug ? `/equipa/${slug}/ranking` : '/home';

  function navegarParaTab(delta, evento) {
    if (comecouEmScrollHorizontal(evento?.event?.target)) return;
    const { tabs, index } = tabActual(pathname, rankingTo);
    if (index < 0) return; // não estamos num tab principal → ignora
    const novo = index + delta;
    if (novo < 0 || novo >= tabs.length) return; // com limites (não circular)
    navigate(tabs[novo].to);
  }

  const swipeHandlers = useSwipeable({
    onSwipedLeft: (e) => navegarParaTab(+1, e),
    onSwipedRight: (e) => navegarParaTab(-1, e),
    delta: 60,
    preventScrollOnSwipe: true,
    trackTouch: true,
    trackMouse: false,
  });

  // Só intercepta o swipe quando a BottomNav está visível (tabs principais).
  const swipeProps = showNav ? swipeHandlers : {};

  return (
    <div style={{ paddingBottom: showNav ? 70 : 0 }} {...swipeProps}>
      <AuroraBg />
      {children}
      {showNav && <BottomNav />}
    </div>
  );
}
