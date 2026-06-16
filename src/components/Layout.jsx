// Futty v2.0 — Layout: envolve o conteúdo e mostra a BottomNav nas rotas certas.
import { useLocation } from 'react-router-dom';
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

export default function Layout({ children }) {
  const { pathname } = useLocation();
  const showNav = shouldShowNav(pathname);

  return (
    <div style={{ paddingBottom: showNav ? 70 : 0 }}>
      <AuroraBg />
      {children}
      {showNav && <BottomNav />}
    </div>
  );
}
