// Futty v2.0 — Ranking completo (pesos v1): tabs, lista, modal de voto e lembrete
import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { apiFetch } from '../lib/api';
import { useRanking } from '../hooks/useRanking';
import { formatRating } from '../utils/format';
import Loading from '../components/Loading';
import PlayerAvatar from '../components/PlayerAvatar';
import Stars from '../components/Stars';
import '../styles/app.css';

const TABS = [
  { k: 'semana', l: 'Semana' },
  { k: 'mes', l: 'Mês' },
  { k: 'geral', l: 'Geral' },
];
const MEDALS = ['🥇', '🥈', '🥉'];

export default function Ranking() {
  const { slug } = useParams();
  const [periodo, setPeriodo] = useState('geral');
  const { team, ranking, votacao, loading, error, reload } = useRanking(slug, periodo);

  const [voteModal, setVoteModal] = useState(null);
  const [modalStars, setModalStars] = useState(null);
  const [voteBusy, setVoteBusy] = useState(false);
  const [voteError, setVoteError] = useState('');

  const [reminder, setReminder] = useState(null); // { faltam }
  const reminderChecked = useRef(false);

  const votaveis = new Set(votacao?.votaveis || []);

  // Lembrete de votação — uma vez por sessão, se votou em < 85% dos colegas
  useEffect(() => {
    if (reminderChecked.current) return undefined;
    const key = `futty_vote_reminder_${slug}`;
    let stored = false;
    try {
      stored = !!sessionStorage.getItem(key);
    } catch {
      /* sessionStorage indisponível */
    }
    if (stored) {
      reminderChecked.current = true;
      return undefined;
    }
    let active = true;
    apiFetch(`/api/teams/${slug}/votacao-status`)
      .then((st) => {
        if (!active) return;
        reminderChecked.current = true;
        if (st.game_id && st.total_colegas > 0 && st.percentagem < 85) {
          setReminder({ faltam: st.faltam });
        }
      })
      .catch(() => {
        reminderChecked.current = true;
      });
    return () => {
      active = false;
    };
  }, [slug]);

  function openVote(player) {
    setVoteModal(player);
    setModalStars(player.minha_nota ?? null);
  }

  async function confirmVote() {
    if (!voteModal || modalStars == null) return;
    setVoteBusy(true);
    setVoteError('');
    try {
      await apiFetch(`/api/teams/${slug}/votar`, {
        method: 'POST',
        body: JSON.stringify({ para_user_id: voteModal.user_id, nota: modalStars }),
      });
      setVoteModal(null);
      setModalStars(null);
      await reload();
    } catch (err) {
      setVoteError(err.message);
    } finally {
      setVoteBusy(false);
    }
  }

  function dismissReminder() {
    try {
      sessionStorage.setItem(`futty_vote_reminder_${slug}`, '1');
    } catch {
      /* ignore */
    }
    setReminder(null);
  }

  function reminderVoteNow() {
    dismissReminder();
    const target = ranking.find((p) => votaveis.has(p.user_id) && p.minha_nota == null);
    if (target) openVote(target);
  }

  return (
    <div className="app-shell">
      <main className="app-main">
        <Link to={`/equipa/${slug}`} className="back-link">
          ← {team?.nome || 'Equipa'}
        </Link>

        <h1 className="app-page-title">Ranking</h1>
        <p className="app-page-sub">Classificação dos jogadores da equipa.</p>

        {/* Tabs de período */}
        <div className="rank-tabs" role="tablist" aria-label="Período do ranking">
          {TABS.map(({ k, l }) => (
            <button
              key={k}
              type="button"
              role="tab"
              aria-selected={periodo === k}
              className={`rank-tab ${periodo === k ? 'rank-tab--active' : ''}`}
              onClick={() => setPeriodo(k)}
            >
              {l}
            </button>
          ))}
          {loading && (
            <span className="muted" style={{ fontSize: 12 }}>
              A carregar…
            </span>
          )}
        </div>

        {(error || voteError) && <div className="alert alert--error">{error || voteError}</div>}

        {loading && ranking.length === 0 ? (
          <Loading />
        ) : ranking.length === 0 ? (
          <p className="muted">Ainda não há jogadores.</p>
        ) : (
          <div className="rank-list">
            {ranking.map((p, i) => {
              const canVote = votaveis.has(p.user_id);
              return (
                <div className={`rank-row ${i < 3 ? 'rank-row--top' : ''}`} key={p.user_id}>
                  <div className="rank-pos">{i < 3 ? MEDALS[i] : `#${i + 1}`}</div>
                  <Link
                    to={`/equipa/${slug}/jogador/${p.user_id}`}
                    aria-label={`Ver perfil de ${p.nome}`}
                    style={{ lineHeight: 0 }}
                  >
                    <PlayerAvatar nome={p.nome} avatarUrl={p.avatar_url} glow={i < 3} />
                  </Link>
                  <div className="rank-info">
                    <div className="rank-name">{p.nome}</div>
                    <div className="rank-votes" style={{ marginTop: 4 }}>
                      Média <span style={{ color: 'var(--neon)', fontWeight: 700 }}>{formatRating(p.media_votos)}</span>
                      {p.minha_nota != null && <span className="muted"> · a tua nota {p.minha_nota}★</span>}
                    </div>
                  </div>
                  <div className="rank-actions">
                    <button
                      type="button"
                      className="btn btn--primary btn--sm"
                      disabled={!canVote}
                      onClick={() => openVote(p)}
                    >
                      Votar
                    </button>
                    <Link to={`/equipa/${slug}/jogador/${p.user_id}`} className="btn btn--purple btn--sm">
                      Ver perfil
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Modal de votação */}
      {voteModal && (
        <div className="modal-overlay" role="presentation" onClick={() => !voteBusy && setVoteModal(null)}>
          <div className="modal-card" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <div className="modal-card__inner">
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
                <PlayerAvatar nome={voteModal.nome} avatarUrl={voteModal.avatar_url} />
              </div>
              <h2 style={{ fontSize: 18, marginBottom: 14 }}>{voteModal.nome}</h2>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 18 }}>
                <Stars big value={modalStars || 0} onChange={setModalStars} />
              </div>
              <button
                type="button"
                className="btn btn--primary"
                style={{ width: '100%' }}
                disabled={voteBusy || modalStars == null}
                onClick={confirmVote}
              >
                {voteBusy ? 'A guardar…' : 'Confirmar voto'}
              </button>
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                style={{ width: '100%', marginTop: 10 }}
                disabled={voteBusy}
                onClick={() => setVoteModal(null)}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Popup de lembrete de votação */}
      {reminder && (
        <div className="modal-overlay" role="presentation">
          <div className="modal-card" role="dialog" aria-modal="true">
            <div className="modal-card__inner">
              <div style={{ fontSize: 40, marginBottom: 8 }}>🗳️</div>
              <p style={{ fontSize: 15, lineHeight: 1.45, marginBottom: 16 }}>
                Ainda tens <strong style={{ color: 'var(--neon)' }}>{reminder.faltam}</strong>{' '}
                {reminder.faltam === 1 ? 'jogador' : 'jogadores'} para avaliar.
              </p>
              <button type="button" className="btn btn--primary" style={{ width: '100%' }} onClick={reminderVoteNow}>
                Votar agora
              </button>
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                style={{ width: '100%', marginTop: 10 }}
                onClick={dismissReminder}
              >
                Depois
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
