// Futty v2.0 — Detalhe do jogo: confirmados, marcação, sorteio e resultado
import { useState } from 'react';
import { Link, useParams, useLocation, useNavigate } from 'react-router-dom';
import { apiFetch } from '../lib/api';
import { useApi } from '../hooks/useApi';
import { formatDateTime, STATUS_LABELS } from '../utils/format';
import Topbar from '../components/Topbar';
import LoadingFutty from '../components/LoadingFutty';
import SilhuetaJogador from '../components/SilhuetaJogador';
import DrawnTeams from '../components/DrawnTeams';
import CampoSorteio from '../components/CampoSorteio';
import ResultadoEditor from '../components/ResultadoEditor';
import TimesEditor from '../components/TimesEditor';
import CountdownSorteio from '../components/CountdownSorteio';
import Toast from '../components/Toast';
import AdCard from '../components/AdCard';
import Icon from '../components/Icon';
import { urlAsset } from '../utils/avatar';
import '../styles/app.css';

const VIDRO = { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' };
const CLIP = 'polygon(8px 0, calc(100% - 8px) 0, 100% 8px, 100% calc(100% - 8px), calc(100% - 8px) 100%, 8px 100%, 0 calc(100% - 8px), 0 8px)';
const CLIP_S = 'polygon(5px 0, calc(100% - 5px) 0, 100% 5px, 100% calc(100% - 5px), calc(100% - 5px) 100%, 5px 100%, 0 calc(100% - 5px), 0 5px)';
const RAJ = "'Rajdhani', sans-serif";

// Moldura V1 (família do Ranking/Equipa).
function FrameAvatar({ avatarUrl, size = 36 }) {
  const src = avatarUrl ? urlAsset(avatarUrl) : null;
  return (
    <span className="avatar-frame" style={{ width: size, height: size }}>
      <span className="avatar-frame__fill" style={{ fontSize: Math.round(size * 0.34) }}>
        {src ? <img src={src} alt="" /> : <SilhuetaJogador size="74%" />}
      </span>
      <span className="avatar-frame__veil" />
      <span className="avatar-frame__lc avatar-frame__lc--tl" />
      <span className="avatar-frame__lc avatar-frame__lc--tr" />
      <span className="avatar-frame__lc avatar-frame__lc--br" />
      <span className="avatar-frame__lc avatar-frame__lc--bl" />
    </span>
  );
}

function SecLabel({ children }) {
  return (
    <div style={{ fontFamily: RAJ, fontSize: 12, fontWeight: 700, letterSpacing: '0.14em', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', margin: '24px 0 10px' }}>
      {children}
    </div>
  );
}

export default function Jogo() {
  const { slug, id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  // IDs dos confirmados via RSVP (passados pelo AdminPanel ao "Fazer sorteio").
  const rsvpConfirmados = location.state?.rsvpConfirmados || null;
  const { data, loading, error, reload } = useApi(`/api/games/${id}`);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');
  const [editando, setEditando] = useState(false); // modo ajuste manual dos times
  const [jogadoresPorTime, setJogadoresPorTime] = useState(null); // selector do sorteio (null = usa o do jogo)
  const [convidados, setConvidados] = useState([]); // SPEC-SORTEIO §11: nomes sem app
  const [novoConvidado, setNovoConvidado] = useState('');
  const [vistaCampo, setVistaCampo] = useState(false); // resultado: lista (false) | campo (true)
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

  // Copia o link público do sorteio (para WhatsApp / telão).
  async function partilharLink() {
    const url = `${window.location.origin}/p/${slug}/${id}`;
    try {
      await navigator.clipboard.writeText(url);
      setToast({ tipo: 'success', mensagem: 'Link copiado!' });
    } catch {
      setToast({ tipo: 'error', mensagem: 'Não foi possível copiar o link.' });
    }
  }

  const confirmar = (confirmado, goleiro) => runAction(`/api/games/${id}/confirmar`, { confirmado, goleiro });
  const marcar = (userId, patch) => runAction(`/api/games/${id}/jogador`, { user_id: userId, ...patch });

  // Sorteio: faz o POST, abre o overlay com o resultado e recarrega o jogo.
  async function sortear() {
    setActionError('');
    setBusy(true);
    try {
      const body = { jogadoresPorTime: porTimeEfectivo };
      if (rsvpConfirmados) body.jogadoresIds = rsvpConfirmados;
      if (convidados.length) body.convidados = convidados;
      await apiFetch(`/api/games/${id}/sortear`, { method: 'POST', body: JSON.stringify(body) });
      // Junta os dados do jogo (local/data) ao resultado fresco (times_resultado).
      await reload();
      // A cerimónia corre na PÁGINA do sorteio (SPEC §13d)
      navigate(`/equipa/${slug}/jogo/${id}/sorteio`);
    } catch (err) {
      setActionError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="app-shell">
        <Topbar hud="JOGO" back={`/equipa/${slug}/jogos`} />
        <main className="app-main">
          <LoadingFutty />
        </main>
      </div>
    );
  }

  const { team, game, players, meuEstado } = data || {};
  const isAdmin = team?.role === 'admin';
  const golsResultado = data?.gols || [];
  // Times do sorteio (para nomes, jogadores do resultado e artilheiro).
  const timesSorteio = game?.times_resultado?.times || [];
  const nomeTimeA = timesSorteio[0]?.nome || 'Time A';
  const nomeTimeB = timesSorteio[1]?.nome || 'Time B';
  const jogadoresResultado = [
    ...(timesSorteio[0]?.jogadores || []).map((j) => ({ ...j, time: 'A' })),
    ...(timesSorteio[1]?.jogadores || []).map((j) => ({ ...j, time: 'B' })),
  ];
  const artilheiro = golsResultado.reduce((max, g) => (g.gols > (max?.gols || 0) ? g : max), null);
  const confirmadosTodos = (players || []).filter((p) => p.confirmado);
  // Se vier do RSVP, mostra só os confirmados via RSVP (filtro de UI).
  const confirmados = rsvpConfirmados
    ? confirmadosTodos.filter((p) => rsvpConfirmados.includes(p.user_id))
    : confirmadosTodos;
  const porTimeEfectivo = jogadoresPorTime ?? game?.jogadores_por_time ?? 5;
  const estouConfirmado = !!meuEstado?.confirmado;
  const souGoleiro = !!meuEstado?.goleiro;

  return (
    <div className="app-shell">
      <Topbar hud="JOGO" back={`/equipa/${slug}/jogos`} />
      <main className="app-main page-reveal" style={game?.times_resultado ? { paddingBottom: 140 } : undefined}>
        {(error || actionError) && <div className="alert alert--error">{error || actionError}</div>}

        {!game ? (
          !error && <p className="muted">Jogo não encontrado.</p>
        ) : (
          <>
            {rsvpConfirmados ? (
              <div style={{ marginBottom: 12, padding: '8px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-accent)', background: 'rgba(139,92,246,0.08)', color: '#8b5cf6', fontSize: 13, fontWeight: 700 }}>
                Sorteio com {confirmados.length} confirmados via RSVP
              </div>
            ) : null}
            <div className="hud-corners" style={{ ...VIDRO, clipPath: CLIP, display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px' }}>
              <div style={{ display: 'grid', placeItems: 'center', width: 52, height: 56, flexShrink: 0, background: 'rgba(212,160,23,0.10)', border: '1px solid rgba(212,160,23,0.45)', clipPath: CLIP_S }}>
                <div style={{ fontFamily: RAJ, fontWeight: 800, fontSize: 20, color: '#f0c94a', lineHeight: 1 }}>{new Date(game.data).getDate()}</div>
                <div style={{ fontFamily: RAJ, fontSize: 10, color: '#c9a24a', textTransform: 'uppercase' }}>{new Date(game.data).toLocaleDateString('pt-PT', { month: 'short' }).replace('.', '')}</div>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: RAJ, fontWeight: 800, fontSize: 18, lineHeight: 1.15 }}>{game.local || 'Jogo'}</div>
                <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>
                  {formatDateTime(game.data)}
                  {game.jogadores_por_time ? ` · ${game.jogadores_por_time} por time` : ''}
                  {game.sorteio_realizado && game.num_times ? ` · ${game.num_times} times` : ''}
                </div>
              </div>
              <span style={{ fontFamily: RAJ, fontWeight: 800, fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '4px 9px', clipPath: CLIP_S, flexShrink: 0, color: game.status === 'em_curso' ? '#7bd88f' : game.status === 'cancelado' ? '#fda4af' : '#8ab4ff', border: '1px solid rgba(255,255,255,0.25)', background: 'rgba(255,255,255,0.04)' }}>{STATUS_LABELS[game.status] || game.status}</span>
            </div>

            {/* Resultado (visível a todos) */}
            {game.resultado_nivel > 0 ? (
              <div style={{ marginTop: 12, padding: '12px 14px', clipPath: CLIP, background: 'rgba(212,160,23,0.08)', border: '1px solid rgba(212,160,23,0.3)', textAlign: 'center' }}>
                {game.resultado_nivel >= 2 ? (
                  <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 22, fontWeight: 800, color: '#fff' }}>
                    {nomeTimeA} <span style={{ color: '#d4a017' }}>{game.placar_a} × {game.placar_b}</span> {nomeTimeB}
                  </div>
                ) : (
                  <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 18, fontWeight: 800, color: '#fff' }}>
                    {game.time_vencedor === 'empate' ? 'Empate' : `${game.time_vencedor === 'A' ? nomeTimeA : nomeTimeB} venceu`}
                  </div>
                )}
                {game.resultado_nivel === 3 && artilheiro && artilheiro.gols > 0 ? (
                  <div style={{ fontSize: 13, color: 'var(--text-dim)', marginTop: 4 }}>
                    Artilheiro: {artilheiro.nome} ({artilheiro.gols} {artilheiro.gols === 1 ? 'gol' : 'gols'})
                  </div>
                ) : null}
              </div>
            ) : null}

            <div className="header-actions">
              <Link to={`/equipa/${slug}/ranking`} className="btn btn--ghost btn--sm">
                Ranking
              </Link>
            </div>

            {/* Confirmação de presença */}
            <SecLabel>A tua presença</SecLabel>
            <div style={{ ...VIDRO, clipPath: CLIP, display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', flexWrap: 'wrap' }}>
              {estouConfirmado ? (
                <>
                  <span style={{ fontFamily: RAJ, color: '#7bd88f', fontWeight: 800, letterSpacing: '0.04em' }}>✓ Estás confirmado</span>
                  <label className="check-inline" style={{ fontFamily: RAJ }}>
                    <input
                      type="checkbox"
                      checked={souGoleiro}
                      disabled={busy}
                      onChange={(e) => confirmar(true, e.target.checked)}
                    />
                    Sou goleiro (GR)
                  </label>
                  <button
                    type="button"
                    className="btn btn--sm btn--outline hud-corners-s"
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
                    className="btn btn--sm hud-corners-s cta-gold"
                    style={{ marginLeft: 'auto', fontFamily: RAJ, letterSpacing: '0.06em', textTransform: 'uppercase' }}
                    onClick={() => confirmar(true, false)}
                    disabled={busy}
                  >
                    Confirmar presença
                  </button>
                </>
              )}
            </div>

            {/* Confirmados */}
            <SecLabel>Confirmados · {confirmados.length}</SecLabel>
            {isAdmin && confirmados.length > 0 && (
              <p className="muted" style={{ fontSize: 13 }}>
                Marca jogadores como goleiro (GR) ou cabeça de chave (C) antes de sortear.
              </p>
            )}
            {confirmados.length === 0 ? (
              <p className="muted">Ainda ninguém confirmou.</p>
            ) : (
              <div style={{ ...VIDRO, clipPath: CLIP, padding: '4px 12px' }}>
                {confirmados.map((p, pi) => (
                  <div key={p.user_id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderTop: pi === 0 ? 'none' : '1px solid rgba(255,255,255,0.06)' }}>
                    <FrameAvatar nome={p.nome} avatarUrl={p.avatar_url} />
                    <div style={{ flex: 1, minWidth: 0, fontFamily: RAJ, fontWeight: 700, fontSize: 14 }}>{p.nome}</div>
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
            <SecLabel>Sorteio</SecLabel>
            {!game.sorteio_realizado && (
              <div style={{ marginBottom: 12 }}>
                <CountdownSorteio jogo={game} />
              </div>
            )}
            {isAdmin && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
                <span className="muted" style={{ fontSize: 13 }}>Jogadores por time:</span>
                <div className="chips-row" style={{ margin: 0 }}>
                  {[2, 3, 4, 5, 6, 7, 8].map((n) => (
                    <button
                      key={n}
                      type="button"
                      className={`chip ${jogadoresPorTime === n ? 'chip--active' : ''}`}
                      aria-pressed={porTimeEfectivo === n}
                      onClick={() => setJogadoresPorTime(n)}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {/* CONVIDADOS SEM APP (SPEC-SORTEIO §11): só nome; entram no sorteio,
                nunca em users/ranking. */}
            {isAdmin ? (
              <div style={{ ...VIDRO, clipPath: CLIP, padding: '10px 12px', marginBottom: 10 }}>
                <div style={{ fontFamily: RAJ, fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', color: '#9a8fc0', textTransform: 'uppercase', marginBottom: 6 }}>
                  Convidados sem app <span style={{ color: '#6f6a80', textTransform: 'none', letterSpacing: 0 }}>(só o nome — não entram no ranking)</span>
                </div>
                {convidados.length ? (
                  <div className="chips-row" style={{ marginBottom: 8 }}>
                    {convidados.map((n, i) => (
                      <span key={i} className="chip" style={{ gap: 6 }}>
                        {n}
                        <button type="button" aria-label={`Remover ${n}`} onClick={() => setConvidados((c) => c.filter((_, x) => x !== i))} style={{ border: 'none', background: 'none', color: 'inherit', cursor: 'pointer', padding: 0, fontSize: 12, lineHeight: 1 }}>✕</button>
                      </span>
                    ))}
                  </div>
                ) : null}
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    className="input input--hud"
                    value={novoConvidado}
                    maxLength={24}
                    placeholder="Nome do convidado…"
                    onChange={(e) => setNovoConvidado(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && novoConvidado.trim()) { setConvidados((c) => [...c, novoConvidado.trim()]); setNovoConvidado(''); } }}
                    style={{ flex: 1, minWidth: 0, fontFamily: RAJ }}
                  />
                  <button type="button" className="btn btn--sm btn--outline hud-corners-s" disabled={!novoConvidado.trim()} onClick={() => { setConvidados((c) => [...c, novoConvidado.trim()]); setNovoConvidado(''); }}>
                    + Convidado
                  </button>
                </div>
              </div>
            ) : null}

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {isAdmin && (
                <button type="button" className="btn btn--sm hud-corners-s cta-gold" style={{ fontFamily: RAJ, letterSpacing: '0.06em', textTransform: 'uppercase' }} onClick={sortear} disabled={busy}>
                  {busy ? 'Processando…' : game.sorteio_realizado ? 'Sortear novamente' : 'Sortear times'}
                </button>
              )}
              {game.sorteio_realizado && (
                <button type="button" className="btn btn--sm hud-corners-s cta-gold" style={{ fontFamily: RAJ, letterSpacing: '0.06em', textTransform: 'uppercase' }} onClick={() => navigate(`/equipa/${slug}/jogo/${id}/sorteio`)}>
                  Ver sorteio
                </button>
              )}
              {isAdmin && game.sorteio_realizado && !editando && (
                <button type="button" className="btn btn--sm btn--outline hud-corners-s" onClick={() => setEditando(true)}>
                  Ajustar times
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
                  <>
                    {/* Toggle Lista | Campo */}
                    <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
                      <button type="button" className={`btn btn--sm ${!vistaCampo ? 'btn--primary' : 'btn--ghost'}`} aria-pressed={!vistaCampo} onClick={() => setVistaCampo(false)}>
                        ≡ Lista
                      </button>
                      <button type="button" className={`btn btn--sm ${vistaCampo ? 'btn--primary' : 'btn--ghost'}`} aria-pressed={vistaCampo} onClick={() => setVistaCampo(true)}>
                        Campo
                      </button>
                      {isAdmin ? (
                        <button type="button" className="btn btn--ghost btn--sm" style={{ marginLeft: 'auto' }} onClick={partilharLink}>
                          Compartilhar
                        </button>
                      ) : null}
                    </div>

                    {vistaCampo ? (
                      <>
                        <CampoSorteio
                          timeA={game.times_resultado.times?.[0]?.jogadores || []}
                          timeB={game.times_resultado.times?.[1]?.jogadores || []}
                          nomeA={game.times_resultado.times?.[0]?.nome || 'Time A'}
                          nomeB={game.times_resultado.times?.[1]?.nome || 'Time B'}
                        />
                        {(game.times_resultado.times?.length || 0) > 2 ? (
                          <p className="muted" style={{ fontSize: 12, marginTop: 8 }}>
                            A vista de campo mostra os 2 primeiros times. Vê todos na Lista.
                          </p>
                        ) : null}
                      </>
                    ) : (
                      <DrawnTeams resultado={game.times_resultado} teamCor={team?.cor} />
                    )}
                  </>
                )}
              </div>
            )}

            {/* Resultado — edição (só admin, após sorteio) */}
            {isAdmin && game.times_resultado ? (
              <>
                <SecLabel>Resultado</SecLabel>
                <ResultadoEditor
                  gameId={id}
                  game={game}
                  gols={golsResultado}
                  jogadores={jogadoresResultado}
                  nomeA={nomeTimeA}
                  nomeB={nomeTimeB}
                  onSaved={reload}
                  showToast={(mensagem, tipo = 'success') => setToast({ mensagem, tipo })}
                />
              </>
            ) : null}

            {/* P1-3 — a votação era texto morto. Agora é uma acção visível: leva
                direto ao Ranking, onde se avaliam os companheiros. */}
            {game.sorteio_realizado && (game.status === 'em_curso' || game.status === 'terminado') && (
              <div style={{ marginTop: 20 }}>
                <div className="cta-gold-glow" style={{ display: 'flex' }}>
                  <Link to={`/equipa/${slug}/ranking`} className="btn hud-corners cta-gold" style={{ flex: 1, textDecoration: 'none' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                      <Icon name="estrela" size={16} />
                      Avaliar os jogadores
                    </span>
                  </Link>
                </div>
                <p className="muted" style={{ marginTop: 8, fontSize: 12, textAlign: 'center' }}>
                  Dá a tua nota — conta para o ranking da equipa.
                </p>
              </div>
            )}
          </>
        )}
      </main>

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
