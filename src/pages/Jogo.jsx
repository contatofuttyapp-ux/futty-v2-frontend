// Futty v2.0 — Detalhe do jogo: confirmados, marcação, sorteio e resultado
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { apiFetch } from '../lib/api';
import { useApi } from '../hooks/useApi';
import { formatDateTime, STATUS_LABELS } from '../utils/format';
import { initials } from '../utils/teamColors';
import Topbar from '../components/Topbar';
import Loading from '../components/Loading';
import DrawnTeams from '../components/DrawnTeams';
import TimesEditor from '../components/TimesEditor';
import SorteioOverlay from '../components/SorteioOverlay';
import CountdownSorteio from '../components/CountdownSorteio';
import Toast from '../components/Toast';
import AdCard from '../components/AdCard';
import { celebrarSorteio } from '../hooks/useConfetti';
import '../styles/app.css';

export default function Jogo() {
  const { slug, id } = useParams();
  const { data, loading, error, reload } = useApi(`/api/games/${id}`);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');
  const [jogoSorteio, setJogoSorteio] = useState(null); // jogo a mostrar no overlay do sorteio
  const [editando, setEditando] = useState(false); // modo ajuste manual dos times
  const [toast, setToast] = useState(null);

  // Executa uma ação (POST) e recarrega o jogo. Centraliza o tratamento de erro.
  async function runAction(path, body) {
    setActionError('');
    setBusy(true);
    try {
      await apiFetch(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined });
      await reload();
    } catch (err) {
      setActionError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const confirmar = (confirmado, goleiro) => runAction(`/api/games/${id}/confirmar`, { confirmado, goleiro });
  const marcar = (userId, patch) => runAction(`/api/games/${id}/jogador`, { user_id: userId, ...patch });

  // Sorteio: faz o POST, abre o overlay com o resultado e recarrega o jogo.
  async function sortear() {
    setActionError('');
    setBusy(true);
    try {
      const res = await apiFetch(`/api/games/${id}/sortear`, { method: 'POST' });
      // Junta os dados do jogo (local/data) ao resultado fresco (times_resultado).
      setJogoSorteio({ ...(data?.game || {}), ...res.game });
      celebrarSorteio();
      await reload();
    } catch (err) {
      setActionError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="app-shell">
        <Topbar back={`/equipa/${slug}/jogos`} />
        <main className="app-main">
          <Loading text="A carregar jogo…" />
        </main>
      </div>
    );
  }

  const { team, game, players, meuEstado } = data || {};
  const isAdmin = team?.role === 'admin';
  const confirmados = (players || []).filter((p) => p.confirmado);
  const estouConfirmado = !!meuEstado?.confirmado;
  const souGoleiro = !!meuEstado?.goleiro;

  return (
    <div className="app-shell">
      <Topbar back={`/equipa/${slug}/jogos`} title={game?.local || 'Jogo'} />
      <main className="app-main" style={game?.times_resultado ? { paddingBottom: 140 } : undefined}>
        {(error || actionError) && <div className="alert alert--error">{error || actionError}</div>}

        {!game ? (
          !error && <p className="muted">Jogo não encontrado.</p>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <div>
                <h1 className="app-page-title" style={{ marginBottom: 4 }}>
                  {game.local || 'Jogo'}
                </h1>
                <span className="muted">
                  {formatDateTime(game.data)}
                  {game.jogadores_por_time ? ` · ${game.jogadores_por_time} por time` : ''}
                  {game.sorteio_realizado && game.num_times ? ` · ${game.num_times} times` : ''}
                </span>
              </div>
              <span className={`badge badge--${game.status}`}>{STATUS_LABELS[game.status] || game.status}</span>
            </div>

            <div className="header-actions">
              <Link to={`/equipa/${slug}/ranking`} className="btn btn--ghost btn--sm">
                🏆 Ranking
              </Link>
            </div>

            {/* Confirmação de presença */}
            <h2 className="section-title">A tua presença</h2>
            <div className="confirm-bar">
              {estouConfirmado ? (
                <>
                  <span style={{ color: 'var(--neon)', fontWeight: 700 }}>✓ Estás confirmado</span>
                  <label className="check-inline">
                    <input
                      type="checkbox"
                      checked={souGoleiro}
                      disabled={busy}
                      onChange={(e) => confirmar(true, e.target.checked)}
                    />
                    Sou goleiro
                  </label>
                  <button
                    type="button"
                    className="btn btn--ghost btn--sm"
                    style={{ marginLeft: 'auto' }}
                    onClick={() => confirmar(false, false)}
                    disabled={busy}
                  >
                    Cancelar presença
                  </button>
                </>
              ) : (
                <>
                  <span className="muted">Ainda não confirmaste presença.</span>
                  <button
                    type="button"
                    className="btn btn--primary btn--sm"
                    style={{ marginLeft: 'auto' }}
                    onClick={() => confirmar(true, false)}
                    disabled={busy}
                  >
                    Confirmar presença
                  </button>
                </>
              )}
            </div>

            {/* Confirmados */}
            <h2 className="section-title">
              Confirmados <span className="muted">({confirmados.length})</span>
            </h2>
            {isAdmin && confirmados.length > 0 && (
              <p className="muted" style={{ fontSize: 13 }}>
                Marca jogadores como goleiro (GR) ou cabeça de chave (C) antes de sortear.
              </p>
            )}
            {confirmados.length === 0 ? (
              <p className="muted">Ainda ninguém confirmou.</p>
            ) : (
              <div className="member-list">
                {confirmados.map((p) => (
                  <div className="member-row" key={p.user_id}>
                    <div className="member-avatar">{initials(p.nome) || '?'}</div>
                    <div className="member-info">
                      <div className="member-name">{p.nome}</div>
                    </div>
                    {isAdmin ? (
                      <>
                        <button
                          type="button"
                          className="mark-toggle mark-toggle--gk"
                          aria-pressed={p.goleiro}
                          disabled={busy}
                          onClick={() => marcar(p.user_id, { goleiro: !p.goleiro })}
                        >
                          GR
                        </button>
                        <button
                          type="button"
                          className="mark-toggle"
                          aria-pressed={p.cabeca_chave}
                          disabled={busy}
                          onClick={() => marcar(p.user_id, { cabeca_chave: !p.cabeca_chave })}
                        >
                          C
                        </button>
                      </>
                    ) : (
                      <>
                        {p.cabeca_chave && <span className="sorteio-player__cap">C</span>}
                        {p.goleiro && <span className="sorteio-player__gk">GR</span>}
                      </>
                    )}
                    <span className="rating-pill">★ {p.rating}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Sorteio */}
            <h2 className="section-title">Sorteio</h2>
            {!game.sorteio_realizado && (
              <div style={{ marginBottom: 12 }}>
                <CountdownSorteio jogo={game} />
              </div>
            )}
            <div className="header-actions" style={{ marginTop: 0 }}>
              {isAdmin && (
                <button type="button" className="btn btn--primary btn--sm" onClick={sortear} disabled={busy}>
                  {busy ? 'A processar…' : game.sorteio_realizado ? 'Sortear novamente' : 'Sortear times'}
                </button>
              )}
              {game.sorteio_realizado && (
                <button type="button" className="btn btn--purple btn--sm" onClick={() => setJogoSorteio(data.game)}>
                  Ver sorteio
                </button>
              )}
              {isAdmin && game.sorteio_realizado && !editando && (
                <button type="button" className="btn btn--purple-outline btn--sm" onClick={() => setEditando(true)}>
                  ✏️ Ajustar times
                </button>
              )}
            </div>
            {!isAdmin && !game.sorteio_realizado && <p className="muted">O sorteio ainda não foi realizado.</p>}

            {game.times_resultado && (
              <div style={{ marginTop: 16 }}>
                {editando ? (
                  <TimesEditor
                    gameId={id}
                    resultadoInicial={game.times_resultado}
                    confirmados={confirmados}
                    showToast={(mensagem, tipo = 'success') => setToast({ mensagem, tipo })}
                    onCancel={() => setEditando(false)}
                    onSaved={async () => {
                      setEditando(false);
                      await reload();
                    }}
                  />
                ) : (
                  <DrawnTeams resultado={game.times_resultado} teamCor={team?.cor} />
                )}
              </div>
            )}

            {/* A votação está na página de ranking */}
            {game.sorteio_realizado && (game.status === 'em_curso' || game.status === 'terminado') && (
              <p className="muted" style={{ marginTop: 20, fontSize: 14 }}>
                🗳️ A votação deste jogo está disponível na{' '}
                <Link to={`/equipa/${slug}/ranking`}>página de ranking</Link>.
              </p>
            )}
          </>
        )}
      </main>

      {/* Overlay do sorteio (slot machine) */}
      <SorteioOverlay jogo={jogoSorteio} onClose={() => setJogoSorteio(null)} />

      {/* Banner fixo de publicidade quando há sorteio */}
      {game?.times_resultado ? (
        <div style={{ position: 'fixed', bottom: 64, left: 0, right: 0, zIndex: 50, padding: '0 16px 8px' }}>
          <AdCard variant="banner" />
        </div>
      ) : null}

      {toast ? <Toast mensagem={toast.mensagem} tipo={toast.tipo} onClose={() => setToast(null)} /> : null}
    </div>
  );
}
