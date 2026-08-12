// Futty v2.0 — Protege rotas privadas: redireciona para /login se não autenticado.
// Também sela a conta SUSPENSA: sonda /api/me e, se o servidor devolver o código
// CONTA_SUSPENSA (gate em requireAuth), mostra um ecrã digno em vez do app — a
// conta não entra, sem apagar nada. A Super age sobre a plataforma, nunca o conteúdo.
import { useEffect, useReducer } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { apiFetch } from '../lib/api';
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

// Cache do veredicto por access_token → só a 1ª rota protegida sonda; as navegações
// seguintes reutilizam (sem flash de loader nem sonda repetida). Token novo (refresh
// ~1h ou re-login) volta a verificar.
const _veredito = new Map();

export default function AuthGuard({ children }) {
  const { session, loading, signOut } = useAuth();
  const location = useLocation();
  const token = session?.access_token || null;
  const [, forcar] = useReducer((x) => x + 1, 0); // re-render quando a sonda resolve

  useEffect(() => {
    if (!token || _veredito.has(token)) return undefined; // já se sabe → sem sonda
    let ativo = true;
    apiFetch('/api/me')
      .then(() => { _veredito.set(token, false); if (ativo) forcar(); })
      .catch((err) => { _veredito.set(token, err?.code === 'CONTA_SUSPENSA'); if (ativo) forcar(); });
    return () => { ativo = false; };
  }, [token]);

  // Derivado (não em estado): null = ainda a sondar; true/false = veredicto cacheado.
  const suspenso = token && _veredito.has(token) ? _veredito.get(token) : null;

  if (loading) return <LoadingFutty />;

  if (!session) {
    // Guarda o destino para voltar após login
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (suspenso === null) return <LoadingFutty />; // a confirmar o estado da conta
  if (suspenso) return <ContaSuspensa onSair={() => signOut()} />;

  return children;
}
