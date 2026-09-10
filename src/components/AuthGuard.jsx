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
import FuttyLoader from './FuttyLoader';

function ContaSuspensa({ onSair }) {
  return (
    <div style={{ minHeight: '100dvh', background: '#050810', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20, padding: 24, textAlign: 'center' }}>
      <FuttyLoader size={110} label={null} />
      <h1 style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 24, fontWeight: 700, letterSpacing: '0.06em', color: '#fff', margin: 0 }}>
        Conta suspensa
      </h1>
      <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 14, maxWidth: 300, lineHeight: 1.5, margin: 0 }}>
        Sua conta está suspensa. Se você acha que é engano, fale conosco.
      </p>
      <div className="cta-gold-glow" style={{ display: 'flex', width: '100%', maxWidth: 260, marginTop: 4 }}>
        <button type="button" className="btn hud-corners cta-gold" style={{ width: '100%' }} onClick={onSair}>
          Sair
        </button>
      </div>
    </div>
  );
}

export default function AuthGuard({ children }) {
  const { session, loading, signOut } = useAuth();
  const location = useLocation();
  const { carregando: perfilCarregando, suspenso } = usePerfil();

  if (loading) return <LoadingFutty />;

  if (!session) {
    // Guarda o destino para voltar após login
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (perfilCarregando) return <LoadingFutty />; // a confirmar o estado da conta
  if (suspenso) return <ContaSuspensa onSair={() => signOut()} />;

  return children;
}
