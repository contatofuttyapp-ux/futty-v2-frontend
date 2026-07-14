// Futty v2.0 — Protege rotas privadas: redireciona para /login se não autenticado
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import LoadingFutty from './LoadingFutty';

export default function AuthGuard({ children }) {
  const { session, loading } = useAuth();
  const location = useLocation();

  // FASE 3.58 — sem wrapper: o LoadingFutty é fixed e centra-se sozinho no viewport.
  if (loading) return <LoadingFutty />;

  if (!session) {
    // Guarda o destino para voltar após login
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}
