// Futty v2.0 — Página de convite: aceitar entrada numa equipa
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { apiFetch } from '../lib/api';
import { useAuth } from '../hooks/useAuth';
import { colorOf, initials } from '../utils/teamColors';
import '../styles/app.css';

const MOTIVOS = {
  nao_encontrado: 'Este convite não existe.',
  expirado: 'Este convite expirou.',
  usado: 'Este convite já foi usado.',
};

export default function Convite() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { session, loading: authLoading } = useAuth();

  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    // Espera a sessão resolver para que o pedido vá autenticado (saber se já é membro)
    if (authLoading) return;
    let active = true;
    apiFetch(`/api/convite/${token}`)
      .then((data) => {
        if (active) setInfo(data);
      })
      .catch((err) => {
        if (active) setError(err.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [token, authLoading]);

  async function aceitar() {
    // Não autenticado → vai ao login e volta para este convite
    if (!session) {
      navigate('/login', { state: { from: { pathname: `/convite/${token}` } } });
      return;
    }
    setError('');
    setAccepting(true);
    try {
      const { team } = await apiFetch(`/api/convite/${token}/aceitar`, { method: 'POST' });
      navigate(`/equipa/${team.slug}`, { replace: true });
    } catch (err) {
      setError(err.message);
      setAccepting(false);
    }
  }

  const team = info?.team;
  const c = colorOf(team?.cor);

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="auth-card__inner">
          <div className="auth-brand">
            Futty<span className="auth-brand__dot">.</span>
          </div>

          {loading ? (
            <p className="muted">Validando convite…</p>
          ) : error ? (
            <>
              <h1 className="auth-title">Ups…</h1>
              <div className="alert alert--error" style={{ marginTop: 12 }}>
                {error}
              </div>
              <p className="auth-footer">
                <Link to="/home">Ir para a página inicial</Link>
              </p>
            </>
          ) : !info?.valido ? (
            <>
              <h1 className="auth-title">Convite inválido</h1>
              <p className="auth-subtitle">
                {MOTIVOS[info?.motivo] || 'Este convite não está disponível.'}
              </p>
              <p className="auth-footer">
                <Link to="/home">Ir para a página inicial</Link>
              </p>
            </>
          ) : (
            <>
              <h1 className="auth-title">Convite para um time</h1>
              <p className="auth-subtitle">
                {info.convidadoPor
                  ? `${info.convidadoPor} convidou-te para entrar no time.`
                  : 'Foste convidado para entrar neste time.'}
              </p>

              <div
                style={{ display: 'flex', alignItems: 'center', gap: 14, margin: '8px 0 24px' }}
              >
                <div
                  className="team-avatar team-avatar--lg"
                  style={{ background: c.hex, color: c.text }}
                >
                  {initials(team?.nome)}
                </div>
                <div className="team-card__name" style={{ fontSize: 20 }}>
                  {team?.nome}
                </div>
              </div>

              {error && (
                <div className="alert alert--error" style={{ marginBottom: 16 }}>
                  {error}
                </div>
              )}

              {info.jaMembro ? (
                <>
                  <div className="alert" style={{ background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.3)', color: 'var(--neon)' }}>
                    Já és membro deste time.
                  </div>
                  <Link
                    to={`/equipa/${team?.slug}`}
                    className="btn btn--primary"
                    style={{ width: '100%', marginTop: 8 }}
                  >
                    Ir para o time
                  </Link>
                </>
              ) : (
                <button
                  type="button"
                  className="btn btn--primary"
                  style={{ width: '100%' }}
                  onClick={aceitar}
                  disabled={accepting}
                >
                  {accepting
                    ? 'Entrando…'
                    : session
                      ? 'Entrar no time'
                      : 'Inicia sessão para entrar'}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
