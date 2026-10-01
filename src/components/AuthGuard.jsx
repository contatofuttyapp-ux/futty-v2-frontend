// Futty v2.0 — Protege rotas privadas: redireciona para /login se não autenticado.
// Também sela a conta SUSPENSA: se o PerfilContext (/api/me) devolver o código
// CONTA_SUSPENSA (gate em requireAuth), mostra um ecrã digno em vez do app — a
// conta não entra, sem apagar nada. A Super age sobre a plataforma, nunca o conteúdo.
// Achado 3/23: o perfil já vem do PerfilContext (carregado 1x por sessão) — este
// guard deixou de sondar /api/me por conta própria.
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { usePerfil } from '../context/PerfilContext';
import LoadingFutty from './LoadingFutty';
import ErrorPage from './ErrorPage';

export default function AuthGuard({ children }) {
  const { session, loading, signOut } = useAuth();
  const location = useLocation();
  const { carregando: perfilCarregando, suspenso } = usePerfil();

  if (loading) return <LoadingFutty motivo="sessao" />;

  if (!session) {
    // Guarda o destino para voltar após login
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (perfilCarregando) return <LoadingFutty motivo="sessao" />; // a confirmar o estado da conta
  // Rodada 29B (D.3): o layout é o do ErrorPage (a ContaSuspensa era uma cópia dele aqui).
  if (suspenso) {
    return (
      <ErrorPage
        titulo="Conta suspensa"
        mensagem="Sua conta está suspensa. Se você acha que é engano, fale conosco."
        larguraTexto={300}
        acao={{ rotulo: 'Sair', aoTocar: () => signOut() }}
      />
    );
  }

  return children;
}
