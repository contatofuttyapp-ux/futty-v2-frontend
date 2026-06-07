// Futty v2.0 — Ranking (modelo definitivo): voto por jogador (meias estrelas),
// nota exibida 6-10, score por categoria. Sem jogo de votação nem períodos.
import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { apiFetch } from '../lib/api';
import { useApi } from '../hooks/useApi';
import { useRanking } from '../hooks/useRanking';
import { celebrarTop3 } from '../hooks/useConfetti';
import { urlAsset, iniciaisNome } from '../utils/avatar';
import Loading from '../components/Loading';
import PlayerAvatar from '../components/PlayerAvatar';
import AvatarFrame from '../components/AvatarFrame';
import Topbar from '../components/Topbar';
import Toast from '../components/Toast';
import '../styles/app.css';

const MEDALS = ['🥇', '🥈', '🥉'];

// Avatar quadrado (48px) com cantos em L dourados (AvatarFrame).
function RankingAvatar({ nome, avatarUrl, dur = '2s' }) {
  const src = avatarUrl ? urlAsset(avatarUrl) : null;
  return (
    <AvatarFrame size={48} active dur={dur}>
      <div style={{ width: 48, height: 48, borderRadius: 6, overflow: 'hidden', background: '#15151a', display: 'grid', placeItems: 'center' }}>
        {src ? (
          <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top center' }} />
        ) : (
          <span style={{ color: '#fff', fontWeight: 900, fontSize: 16 }}>{iniciaisNome(nome)}</span>
        )}
      </div>
    </AvatarFrame>
  );
}

// Converte a média interna (1-5) para a nota exibida (6-10).
function notaParaExibir(n) {
  if (n == null) return null;
  return Math.round((6 + ((n - 1) / 4) * 4) * 10) / 10;
}

// Input de 5 estrelas com meia-estrela (clique na metade esquerda = X.5).
function MeiaEstrelas({ value = 0, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
      {[1, 2, 3, 4, 5].map((i) => {
        const fill = value >= i ? 100 : value >= i - 0.5 ? 50 : 0;
        return (
          <div key={i} style={{ position: 'relative', width: 36, height: 36, fontSize: 36, lineHeight: '36px' }}>
            <span style={{ color: '#333' }}>★</span>
            <span style={{ position: 'absolute', left: 0, top: 0, width: `${fill}%`, overflow: 'hidden', color: '#d4a017' }}>★</span>
            <button type="button" aria-label={`${i - 0.5} estrelas`} onClick={() => onChange(i - 0.5)} style={{ position: 'absolute', left: 0, top: 0, width: '50%', height: '100%', border: 'none', background: 'transparent', cursor: 'pointer' }} />
            <button type="button" aria-label={`${i} estrelas`} onClick={() => onChange(i)} style={{ position: 'absolute', right: 0, top: 0, width: '50%', height: '100%', border: 'none', background: 'transparent', cursor: 'pointer' }} />
          </div>
        );
      })}
    </div>
  );
}

export default function Ranking() {
  const { slug } = useParams();
  const { ranking, loading, error, reload } = useRanking(slug);
  const { data: status } = useApi(slug ? `/api/teams/${slug}/votacao-status` : null);

  const [voteModal, setVoteModal] = useState(null); // jogador a votar
  const [modalNota, setModalNota] = useState(0);
  const [voteBusy, setVoteBusy] = useState(false);
  const [toast, setToast] = useState(null);
  const [bannerFechado, setBannerFechado] = useState(false);
  const celebrouTop3 = useRef(false);

  // Confetti uma vez se o utilizador estiver no pódio (top 3).
  useEffect(() => {
    if (celebrouTop3.current) return;
    const meu = ranking.find((p) => p.sou_eu && p.posicao <= 3);
    if (meu) {
      celebrouTop3.current = true;
      celebrarTop3(meu.posicao);
    }
  }, [ranking]);

  function openVote(player) {
    setVoteModal(player);
    setModalNota(player.minha_nota ?? 0);
  }

  async function confirmVote() {
    if (!voteModal || !(modalNota >= 0.5)) return;
    setVoteBusy(true);
    try {
      await apiFetch(`/api/teams/${slug}/votar`, {
        method: 'POST',
        body: JSON.stringify({ para_user_id: voteModal.user_id, nota: modalNota }),
      });
      setVoteModal(null);
      await reload();
      setToast({ tipo: 'success', mensagem: 'Voto guardado! ⭐' });
    } catch (err) {
      setToast({ tipo: 'error', mensagem: err.message });
    } finally {
      setVoteBusy(false);
    }
  }

  const mostrarBanner = status?.pedido_revotacao && !bannerFechado;

  return (
    <div className="app-shell">
      <Topbar title="Ranking" back={`/equipa/${slug}`} />
      <main className="app-main">
        <style>{`
@keyframes rankShimmer { 0% { transform: translateX(-100%) skewX(-15deg); } 100% { transform: translateX(300%) skewX(-15deg); } }
@keyframes rankGlowBreath { 0%,100% { box-shadow: 0 0 8px rgba(212,160,23,0.2); } 50% { box-shadow: 0 0 20px rgba(212,160,23,0.45), 0 0 40px rgba(212,160,23,0.1); } }
`}</style>

        {mostrarBanner ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', marginBottom: 12, borderRadius: 12, background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.3)', color: '#8b5cf6', fontSize: 13, fontWeight: 700 }}>
            <span style={{ flex: 1 }}>✨ Actualize as suas notas</span>
            <button type="button" aria-label="Fechar" onClick={() => setBannerFechado(true)} style={{ border: 'none', background: 'transparent', color: '#8b5cf6', cursor: 'pointer', fontSize: 16, lineHeight: 1 }}>✕</button>
          </div>
        ) : null}

        {error && <div className="alert alert--error">{error}</div>}

        {loading && ranking.length === 0 ? (
          <Loading />
        ) : ranking.length === 0 ? (
          <p className="muted">Ainda não há jogadores.</p>
        ) : (
          <div className="rank-list">
            {ranking.map((p, idx) => {
              const eu = p.minha_nota != null;
              const top = p.posicao;
              // Borda + glow especiais para o pódio.
              const podioStyle =
                top === 1
                  ? { border: '1px solid #d4a017', animation: 'rankGlowBreath 3.3s ease-in-out infinite' }
                  : top === 2
                    ? { border: '1px solid #aaaaaa', boxShadow: '0 0 12px rgba(170,170,170,0.25)' }
                    : top === 3
                      ? { border: '1px solid #cd7f32', boxShadow: '0 0 12px rgba(205,127,50,0.25)' }
                      : {};
              const medalShadow =
                top === 1
                  ? 'drop-shadow(0 0 6px rgba(212,160,23,0.85))'
                  : top === 2
                    ? 'drop-shadow(0 0 5px rgba(190,190,190,0.7))'
                    : top === 3
                      ? 'drop-shadow(0 0 5px rgba(205,127,50,0.7))'
                      : 'none';
              const shimmerDelay = top === 1 ? 0 : top === 2 ? 1.3 : top === 3 ? 2.6 : idx % 2 ? 0.5 : 0;
              return (
                <div className={`rank-row ${p.posicao <= 3 ? 'rank-row--top' : ''}`} key={p.user_id} style={{ position: 'relative', overflow: 'hidden', ...podioStyle }}>
                  <span aria-hidden style={{ position: 'absolute', top: 0, left: 0, height: '100%', width: '40%', pointerEvents: 'none', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent)', animation: `rankShimmer 5.2s ease-in-out ${shimmerDelay}s infinite` }} />
                  <div className="rank-pos" style={top <= 3 ? { filter: medalShadow } : undefined}>{p.posicao <= 3 ? MEDALS[p.posicao - 1] : `#${p.posicao}`}</div>
                  <Link to={`/equipa/${slug}/jogador/${p.user_id}`} aria-label={`Ver perfil de ${p.nome}`} style={{ lineHeight: 0 }}>
                    <RankingAvatar nome={p.nome} avatarUrl={p.avatar_url} dur={top <= 3 ? '2.6s' : '4.6s'} />
                  </Link>
                  <div className="rank-info">
                    <div className="rank-name" style={{ fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                      {p.nome}
                      {p.categoria === 'GR' ? (
                        <span style={{ fontSize: 9, fontWeight: 800, color: '#b69cff', border: '1px solid var(--purple)', borderRadius: 999, padding: '1px 5px' }}>GR</span>
                      ) : null}
                    </div>
                    <div className="rank-votes" style={{ marginTop: 4, fontSize: 12 }}>
                      {p.nota != null ? (
                        <span style={{ color: '#d4a017', fontWeight: 800, fontSize: 15 }}>{p.nota.toFixed(1)}</span>
                      ) : (
                        <span style={{ color: 'var(--text-dim)' }} title="Precisa de 3 votos para mostrar nota">--</span>
                      )}
                      {eu ? (
                        <span className="muted" style={{ marginLeft: 8 }}>★ deste {p.minha_nota}</span>
                      ) : (
                        <span className="muted" style={{ marginLeft: 8 }}>☆ por votar</span>
                      )}
                    </div>
                  </div>
                  <div className="rank-actions">
                    {p.sou_eu ? (
                      <span className="muted" style={{ fontSize: 11, fontWeight: 800, color: 'var(--neon)', border: '1px solid var(--neon)', borderRadius: 999, padding: '3px 9px' }}>Tu</span>
                    ) : (
                      <button type="button" className="btn btn--primary btn--sm" onClick={() => openVote(p)}>
                        {eu ? 'Alterar' : 'Votar'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Modal de votação (meias estrelas) */}
      {voteModal && (
        <div className="modal-overlay" role="presentation" onClick={() => !voteBusy && setVoteModal(null)}>
          <div className="modal-card" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <div className="modal-card__inner">
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
                <PlayerAvatar nome={voteModal.nome} avatarUrl={voteModal.avatar_url} />
              </div>
              <h2 style={{ fontSize: 18, marginBottom: 14 }}>{voteModal.nome}</h2>
              <MeiaEstrelas value={modalNota} onChange={setModalNota} />
              <div style={{ marginTop: 12, fontSize: 14, color: 'var(--text-dim)' }}>
                {modalNota >= 0.5 ? (
                  <>A tua nota: <b style={{ color: 'var(--neon)' }}>{notaParaExibir(modalNota).toFixed(1)}</b></>
                ) : (
                  'Escolhe de 0.5 a 5 estrelas'
                )}
              </div>
              <button type="button" className="btn btn--primary" style={{ width: '100%', marginTop: 16 }} disabled={voteBusy || !(modalNota >= 0.5)} onClick={confirmVote}>
                {voteBusy ? 'A guardar…' : 'Guardar voto'}
              </button>
              <button type="button" className="btn btn--ghost btn--sm" style={{ width: '100%', marginTop: 10 }} disabled={voteBusy} onClick={() => setVoteModal(null)}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {toast ? <Toast mensagem={toast.mensagem} tipo={toast.tipo} onClose={() => setToast(null)} /> : null}
    </div>
  );
}
