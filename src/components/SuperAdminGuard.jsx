// Futty v2.0 — Protege /super: só super-admins. Invisível para os restantes
// (redireciona para /home sem dar pistas). Usa-se dentro do AuthGuard.
import { Navigate } from 'react-router-dom';
import { useApi } from '../hooks/useApi';

export default function SuperAdminGuard({ children }) {
  const { data: me, loading } = useApi('/api/me');

  if (loading) {
    return (
      <div style={{ minHeight: '100svh', display: 'grid', placeItems: 'center', color: 'var(--text-dim)' }}>
        Carregando…
      </div>
    );
  }

  if (me?.user?.is_super_admin !== true) {
    return <Navigate to="/home" replace />;
  }

  return children;
}
