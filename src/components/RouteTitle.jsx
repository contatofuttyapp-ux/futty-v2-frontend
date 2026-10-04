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
  ['/onboarding', 'Bem-vindo'],
  ['/home', 'Início'],
  ['/criar-time', 'Criar time'],
  ['/feed', 'Resenha'],
  ['/figurinha', 'Figurinha'],
  ['/perfil', 'Perfil'],
  ['/diagnostico', 'Diagnóstico'],
  ['/planos', 'Figurinhas'],
  ['/ranking', 'Ranking'],
  ['/explorar', 'Radar de peladas'],
  ['/super', 'Super-Admin'],
  ['/gabinete', 'Gabinete'],
  ['/termos', 'Termos'],
  ['/privacidade', 'Privacidade'],
  ['/convite/:token', 'Convite'],
  ['/c/:token', 'Convite'],
  ['/p/campeonato/:slug/:id', 'Campeonato'],
  ['/p/:slug/:gameId', 'Sorteio'],
  ['/time/:slug/jogos', 'Jogos'],
  ['/time/:slug/ranking', 'Ranking'],
  ['/time/:slug/campeonato/:id', 'Campeonato'],
  ['/time/:slug/campeonato', 'Campeonato'],
  ['/time/:slug/jogador/:userId', 'Jogador'],
  ['/time/:slug/jogo/novo', 'Novo jogo'],
  ['/time/:slug/jogo/passado', 'Jogo passado'],
  ['/time/:slug/jogo/:id', 'Jogo'],
  ['/admin/:slug', 'Admin'],
  ['/time/:slug', 'Time'],
];

export default function RouteTitle() {
  const { pathname } = useLocation();
  useEffect(() => {
    const achado = TITULOS.find(([padrao]) => matchPath(padrao, pathname));
    document.title = achado ? `Futty · ${achado[1]}` : 'Futty';
  }, [pathname]);
  return null;
}
