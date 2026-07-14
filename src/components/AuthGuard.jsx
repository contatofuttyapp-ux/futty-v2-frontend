// Futty v2.0 — Protege rotas privadas: redireciona para /login se não autenticado
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import FuttyLoader from './FuttyLoader';

export default function AuthGuard({ children }) {
  const { session, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div
        style={{
          minHeight: '100svh',
          display: 'grid',
          placeItems: 'center',
          color: 'var(--text-dim)',
        }}
      >
        <FuttyLoader />
      </div>
    );
  }

  if (!session) {
    // Guarda o destino para voltar após login
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}
