// Futty v2.0 — Define o document.title conforme a rota atual. Centralizado aqui
// (em vez de em cada página) para manter os títulos consistentes e num só sítio.
import { useEffect } from 'react';
import { useLocation, matchPath } from 'react-router-dom';

// Padrões mais específicos primeiro (o primeiro match ganha).
const TITULOS = [
  ['/login', 'Entrar'],
  ['/register', 'Criar conta'],
  ['/forgot-password', 'Recuperar senha'],
  ['/alterar-password', 'Alterar senha'],
  ['/home', 'Início'],
  ['/criar-equipa', 'Criar equipa'],
  ['/feed', 'Feed'],
  ['/figurinha', 'Figurinha'],
  ['/perfil', 'Perfil'],
  ['/planos', 'Planos'],
  ['/explorar', 'Explorar'],
  ['/super', 'Super-Admin'],
  ['/termos', 'Termos'],
  ['/privacidade', 'Privacidade'],
  ['/convite/:token', 'Convite'],
  ['/p/:slug/:gameId', 'Sorteio'],
  ['/equipa/:slug/jogos', 'Jogos'],
  ['/equipa/:slug/ranking', 'Ranking'],
  ['/equipa/:slug/campeonato', 'Campeonato'],
  ['/equipa/:slug/jogador/:userId', 'Jogador'],
  ['/equipa/:slug/jogo/novo', 'Novo jogo'],
  ['/equipa/:slug/jogo/:id', 'Jogo'],
  ['/admin/:slug', 'Admin'],
  ['/equipa/:slug', 'Equipa'],
];

export default function RouteTitle() {
  const { pathname } = useLocation();
  useEffect(() => {
    const achado = TITULOS.find(([padrao]) => matchPath(padrao, pathname));
    document.title = achado ? `Futty · ${achado[1]}` : 'Futty';
  }, [pathname]);
  return null;
}
