// Futty v2.0 — Página de convite: aceitar entrada numa equipa
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { apiFetch } from '../lib/api';
import { useAuth } from '../hooks/useAuth';
import FuttyLogo from '../components/FuttyLogo';
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
  // P1-2 — saída do beco: pedir entrada na equipa que o token identifica.
  const [pedindo, setPedindo] = useState(false);
  const [pedidoEnviado, setPedidoEnviado] = useState(false);

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

  // P1-2 — convite morto mas o token diz-nos a equipa: em vez de beco, pede
  // entrada (o admin decide, o desfecho aparece no Início). Sem sessão → login
  // e volta a este convite.
  async function pedirEntrada() {
    const alvo = info?.team;
    if (!alvo) return;
    if (!session) {
      navigate('/login', { state: { from: { pathname: `/convite/${token}` } } });
      return;
    }
    setError('');
    setPedindo(true);
    try {
      const r = await apiFetch(`/api/teams/${alvo.slug}/pedir-entrada`, { method: 'POST', body: JSON.stringify({}) });
      if (r?.entrou) {
        navigate(`/equipa/${alvo.slug}`, { replace: true });
        return;
      }
      setPedidoEnviado(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setPedindo(false);
    }
  }

  const team = info?.team;
  const c = colorOf(team?.cor);

  // Saídas partilhadas pelos estados de convite morto (P1-2): pedir entrada (se
  // conhecemos a equipa) e/ou procurar no Explorar.
  const saidas = (alvo) => (
    <div style={{ display: 'grid', gap: 10, marginTop: 8 }}>
      {alvo ? (
        pedidoEnviado ? (
          <div className="alert" style={{ background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.3)', color: 'var(--neon)' }}>
            Pedido enviado a {alvo.nome}. O admin decide, você vê o desfecho no Início.
          </div>
        ) : (
          <button type="button" className="btn btn--primary" style={{ width: '100%' }} onClick={pedirEntrada} disabled={pedindo}>
            {pedindo ? 'Enviando…' : session ? `Pedir entrada em ${alvo.nome}` : `Faça login para entrar em ${alvo.nome}`}
          </button>
        )
      ) : null}
      <Link to="/explorar" className="btn" style={{ width: '100%', border: '1.5px solid rgba(255,255,255,0.22)', color: 'var(--text-dim)' }}>
        Procurar times no Explorar
      </Link>
      <Link to="/home" className="auth-footer" style={{ textAlign: 'center' }}>
        Ir para a página inicial
      </Link>
    </div>
  );

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="auth-card__inner">
          <div className="auth-brand">
<FuttyLogo variant="wordmark" size={28} color="#8b5cf6" />
          </div>

          {loading ? (
            <p className="muted">Validando convite…</p>
          ) : error ? (
            <>
              <h1 className="auth-title">Ups…</h1>
              <div className="alert alert--error" style={{ marginTop: 12, marginBottom: 4 }}>
                {error}
              </div>
              {saidas(info?.team)}
            </>
          ) : !info?.valido ? (
            <>
              <h1 className="auth-title">Convite inválido</h1>
              <p className="auth-subtitle">
                {MOTIVOS[info?.motivo] || 'Este convite não está disponível.'}
                {info?.team ? ' Mas você ainda pode entrar no time:' : ''}
              </p>
              {saidas(info?.team)}
            </>
          ) : (
            <>
              <h1 className="auth-title">Convite para um time</h1>
              <p className="auth-subtitle">
                {info.convidadoPor
                  ? `${info.convidadoPor} convidou você para entrar no time.`
                  : 'Você foi convidado para entrar neste time.'}
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
                    Você já é membro deste time.
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
                      : 'Faça login para entrar'}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
