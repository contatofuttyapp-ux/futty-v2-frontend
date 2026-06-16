// Futty v2.0 — Detalhe da equipa + membros + convite
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { apiFetch } from '../lib/api';
import { useApi } from '../hooks/useApi';
import { useTeam } from '../hooks/useTeam';
import { initials } from '../utils/teamColors';
import { POSICOES, labelPosicao } from '../utils/posicoes';
import Topbar from '../components/Topbar';
import Loading from '../components/Loading';
import PlayerAvatar from '../components/PlayerAvatar';
import TeamAvatar from '../components/TeamAvatar';
import Toast from '../components/Toast';
import OnboardingModal from '../components/OnboardingModal';
import '../styles/app.css';

export default function Equipa() {
  const { slug } = useParams();
  const { team, members, loading, error, reload } = useTeam(slug);
  const { data: me } = useApi('/api/me');

  const [posBusy, setPosBusy] = useState(false);
  const [inviteLink, setInviteLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [actionError, setActionError] = useState('');

  const [pedidos, setPedidos] = useState([]);
  const [busyPedido, setBusyPedido] = useState(null);
  const [toast, setToast] = useState(null);

  const meuId = me?.user?.id;
  const minhaPosicao = members.find((m) => m.id === meuId)?.posicao || null;

  // Onboarding: 1ª vez de um jogador que não fundou a equipa (não-admin, sem
  // avatar ainda) e que nunca o dispensou (localStorage por equipa).
  const [onboardingDispensado, setOnboardingDispensado] = useState(false);
  const onboardingKey = team ? `futty_onboarding_${team.id}` : null;
  const mostrarOnboarding =
    !!team &&
    !!me &&
    team.role !== 'admin' &&
    !me?.user?.avatar_url &&
    !onboardingDispensado &&
    !(onboardingKey && localStorage.getItem(onboardingKey));

  function fecharOnboarding() {
    if (onboardingKey) localStorage.setItem(onboardingKey, '1');
    setOnboardingDispensado(true);
    // Ativa o banner CTA da figurinha no Início (mostra uma vez).
    localStorage.setItem('futty_cta_figurinha', '1');
  }

  // Define a minha posição na equipa (null = sem posição).
  async function escolherPosicao(pos) {
    if (posBusy || pos === minhaPosicao) return;
    setPosBusy(true);
    try {
      await apiFetch(`/api/equipas/${slug}/membros/posicao`, { method: 'PATCH', body: JSON.stringify({ posicao: pos }) });
      await reload();
    } catch (e) {
      setToast({ tipo: 'error', mensagem: e.message });
    } finally {
      setPosBusy(false);
    }
  }

  // Carrega os pedidos pendentes (só se for admin).
  useEffect(() => {
    if (!team || team.role !== 'admin') return undefined;
    let ativo = true;
    apiFetch(`/api/teams/${slug}/pedidos`)
      .then((d) => ativo && setPedidos(d.pedidos || []))
      .catch(() => {});
    return () => {
      ativo = false;
    };
  }, [team, slug]);

  async function decidirPedido(pedidoId, status) {
    setBusyPedido(pedidoId);
    try {
      await apiFetch(`/api/teams/${slug}/pedidos/${pedidoId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      setPedidos((cur) => cur.filter((p) => p.id !== pedidoId));
      setToast({ tipo: status === 'approved' ? 'success' : 'info', mensagem: status === 'approved' ? 'Jogador adicionado!' : 'Pedido rejeitado.' });
      if (status === 'approved') reload();
    } catch (e) {
      setToast({ tipo: 'error', mensagem: e.message });
    } finally {
      setBusyPedido(null);
    }
  }

  async function gerarConvite() {
    setActionError('');
    setCopied(false);
    setGenerating(true);
    try {
      const { token } = await apiFetch(`/api/teams/${slug}/convite`, { method: 'POST' });
      setInviteLink(`${window.location.origin}/convite/${token}`);
    } catch (err) {
      setActionError(err.message);
    } finally {
      setGenerating(false);
    }
  }

  async function copiar() {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="app-shell">
      <Topbar />
      <main className="app-main">
        <Link to="/home" className="back-link">
          ← Os teus times
        </Link>

        {(error || actionError) && <div className="alert alert--error">{error || actionError}</div>}

        {loading ? (
          <Loading />
        ) : !team ? (
          !error && <p className="muted">Time não encontrado.</p>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 8 }}>
              <TeamAvatar team={team} size="lg" />
              <div>
                <h1 className="app-page-title" style={{ marginBottom: 0 }}>
                  {team.nome}
                </h1>
                <span className="team-card__role">
                  {members.length} {members.length === 1 ? 'membro' : 'membros'}
                  {team.role ? ` · és ${team.role}` : ''}
                </span>
              </div>
            </div>

            <div className="header-actions">
              <Link to={`/equipa/${slug}/jogos`} className="btn btn--primary btn--sm">
                ⚽ Jogos
              </Link>
              <Link to={`/equipa/${slug}/ranking`} className="btn btn--ghost btn--sm">
                🏆 Ranking
              </Link>
              {team.role === 'admin' && (
                <Link to={`/equipa/${slug}/jogo/novo`} className="btn btn--ghost btn--sm">
                  + Criar jogo
                </Link>
              )}
            </div>

            {/* A minha posição nesta equipa */}
            <h2 className="section-title">A minha posição neste time</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              {POSICOES.map((p) => (
                <button
                  key={p.k}
                  type="button"
                  title={p.label}
                  className={`btn btn--sm ${minhaPosicao === p.k ? 'btn--purple' : 'btn--ghost'}`}
                  disabled={posBusy}
                  onClick={() => escolherPosicao(p.k)}
                >
                  {p.k}
                </button>
              ))}
              <button
                type="button"
                title="Sem posição"
                className={`btn btn--sm ${minhaPosicao === null ? 'btn--purple' : 'btn--ghost'}`}
                disabled={posBusy}
                onClick={() => escolherPosicao(null)}
              >
                —
              </button>
            </div>
            {minhaPosicao ? (
              <p className="muted" style={{ fontSize: 13, marginTop: 6 }}>{labelPosicao(minhaPosicao)}</p>
            ) : null}

            {team.role === 'admin' && pedidos.length > 0 && (
              <>
                <h2 className="section-title">Pedidos de entrada</h2>
                <div className="member-list">
                  {pedidos.map((p) => (
                    <div className="member-row" key={p.id}>
                      <PlayerAvatar nome={p.nome_jogador || p.nome || 'Jogador'} avatarUrl={p.avatar_url} />
                      <div className="member-info" style={{ flex: 1, minWidth: 0 }}>
                        <div className="member-name">{p.nome_jogador || p.nome || 'Jogador'}</div>
                        {p.mensagem && (
                          <div className="member-email" style={{ whiteSpace: 'normal', color: 'var(--text-dim)' }}>{p.mensagem}</div>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                        <button
                          type="button"
                          className="btn btn--primary btn--sm"
                          disabled={busyPedido === p.id}
                          onClick={() => decidirPedido(p.id, 'approved')}
                        >
                          Aprovar
                        </button>
                        <button
                          type="button"
                          className="btn btn--ghost btn--sm"
                          style={{ borderColor: 'var(--danger)', color: '#fda4af' }}
                          disabled={busyPedido === p.id}
                          onClick={() => decidirPedido(p.id, 'rejected')}
                        >
                          Rejeitar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            <h2 className="section-title">Membros</h2>
            <div className="member-list">
              {members.map((m) => (
                <div className="member-row" key={m.id || m.email}>
                  <div className="member-avatar">{initials(m.nome || m.email || '?') || '?'}</div>
                  <div className="member-info">
                    <div className="member-name">{m.nome || m.email}</div>
                    {m.nome && <div className="member-email">{m.email}</div>}
                  </div>
                  {m.posicao ? (
                    <span style={{ fontSize: 10, fontWeight: 800, color: '#d4a017', border: '1px solid rgba(212,160,23,0.4)', borderRadius: 999, padding: '2px 7px' }}>{m.posicao}</span>
                  ) : null}
                  <span className={`badge badge--${m.role === 'admin' ? 'admin' : 'member'}`}>{m.role}</span>
                </div>
              ))}
              {members.length === 0 && (
                <p className="muted" style={{ padding: '6px 2px' }}>Nenhum membro ainda.</p>
              )}
            </div>

            <h2 className="section-title">Convidar jogador</h2>
            <p className="muted" style={{ fontSize: 14 }}>
              Gera um link de convite (válido 7 dias, uso único) para compartilhar com novos jogadores.
            </p>
            <button
              type="button"
              className="btn btn--purple btn--sm"
              style={{ marginTop: 12 }}
              onClick={gerarConvite}
              disabled={generating}
            >
              {generating ? 'Gerando…' : 'Convidar jogador'}
            </button>

            {inviteLink && (
              <div className="invite-box">
                <strong style={{ fontSize: 14 }}>Link de convite</strong>
                <div className="invite-link">
                  <input className="input" readOnly value={inviteLink} onFocus={(e) => e.target.select()} />
                  <button type="button" className="btn btn--ghost btn--sm" onClick={copiar}>
                    {copied ? 'Copiado!' : 'Copiar'}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </main>
      {toast ? <Toast mensagem={toast.mensagem} tipo={toast.tipo} onClose={() => setToast(null)} /> : null}
      {mostrarOnboarding ? <OnboardingModal teamNome={team.nome} onClose={fecharOnboarding} /> : null}
    </div>
  );
}
