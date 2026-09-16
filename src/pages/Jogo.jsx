// Futty v2.0 — Detalhe do jogo: confirmados, marcação, sorteio e resultado
import { useState } from 'react';
import { Link, useParams, useLocation, useNavigate } from 'react-router-dom';
import { apiFetch } from '../lib/api';
import { useApi } from '../hooks/useApi';
import { formatDateTime, STATUS_LABELS } from '../utils/format';
import { plural } from '../utils/plural';
import Topbar from '../components/Topbar';
import LoadingFutty from '../components/LoadingFutty';
import SilhuetaJogador from '../components/SilhuetaJogador';
import DrawnTeams from '../components/DrawnTeams';
import ResultadoEditor from '../components/ResultadoEditor';
import TimesEditor from '../components/TimesEditor';
import CountdownSorteio from '../components/CountdownSorteio';
import Toast from '../components/Toast';
import AdCard from '../components/AdCard';
import Icon from '../components/Icon';
import { urlAsset, urlImagem } from '../utils/avatar';
import { avatarGenericoUrl } from '../utils/avatarGenerico';
import { copiarTexto } from '../utils/clipboard';
import '../styles/app.css';

const VIDRO = { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' };
const CLIP = 'polygon(8px 0, calc(100% - 8px) 0, 100% 8px, 100% calc(100% - 8px), calc(100% - 8px) 100%, 8px 100%, 0 calc(100% - 8px), 0 8px)';
const CLIP_S = 'polygon(5px 0, calc(100% - 5px) 0, 100% 5px, 100% calc(100% - 5px), calc(100% - 5px) 100%, 5px 100%, 0 calc(100% - 5px), 0 5px)';
const RAJ = "'Rajdhani', sans-serif";

// Moldura V1 (família do Ranking/Equipa).
// Sem foto, mas com identidade (userId), mostra o avatar genérico da casa — nunca
// a silhueta "?".
function FrameAvatar({ avatarUrl, userId = null, avatarGenerico = null, size = 36 }) {
  const src = avatarUrl ? urlImagem(urlAsset(avatarUrl), 128) : (userId != null ? avatarGenericoUrl(userId, avatarGenerico) : null);
  return (
    <span className="avatar-frame" style={{ width: size, height: size }}>
      <span className="avatar-frame__fill" style={{ fontSize: Math.round(size * 0.34) }}>
        {src ? <img src={src} alt="" decoding="async" /> : <SilhuetaJogador size="74%" />}
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
  // P2-10: integração SÓ DE LEITURA com o sistema de espera (rsvp_espera). Mostra a
  // posição na fila dentro do Jogo; NÃO toca na capacidade do /confirmar (vaga futura).
  const { data: rsvpEstado } = useApi(`/api/jogos/${id}/rsvp`);
  const posEspera = rsvpEstado?.minha_posicao_espera ?? null;
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');
  const [editando, setEditando] = useState(false); // modo ajuste manual dos times
  const [jogadoresPorTime, setJogadoresPorTime] = useState(null); // selector do sorteio (null = usa o do jogo)
  const [convidados, setConvidados] = useState([]); // SPEC-SORTEIO §11: nomes sem app
  const [novoConvidado, setNovoConvidado] = useState('');
  const [toast, setToast] = useState(null);
  const [confirmacao, setConfirmacao] = useState(null); // 're-sorteio' | 'cancelar-presenca' | 'campeonato' | null
  const [criandoCamp, setCriandoCamp] = useState(false);

  // Campeonato a partir dos times sorteados (SPEC-CAMPEONATOS): o admin só escolhe
  // o formato — nomes/plantéis vêm do adaptador no servidor (times_resultado → campeonato).
  async function criarCampeonatoDeSorteio(formato) {
    setCriandoCamp(true);
    try {
      const data = await apiFetch(`/api/equipas/${slug}/campeonatos/de-sorteio`, {
        method: 'POST',
        body: JSON.stringify({ game_id: id, formato }),
      });
      navigate(`/equipa/${slug}/campeonato/${data.campeonato.id}`);
    } catch (err) {
      setToast({ tipo: 'error', mensagem: err.message });
      setCriandoCamp(false);
      setConfirmacao(null);
    }
  }

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
    const ok = await copiarTexto(url);
    setToast(ok
      ? { tipo: 'success', mensagem: 'Link copiado!' }
      : { tipo: 'error', mensagem: 'Não deu para copiar, copie o link à mão.' });
  }

  // `goleiro` omitido = o motor decide (o que já estiver marcado neste jogo ou,
  // se ainda não houver, a flag de goleiro do time — Rodada 9).
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
  // "Confirmados suficientes" = dá para encher dois times. Abaixo disso o botão
  // continua lá (o admin pode sortear com menos), só não chama o toque.
  const podeSortear = !game?.sorteio_realizado && confirmados.length >= porTimeEfectivo * 2;
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
                Sorteio com {confirmados.length} {plural(confirmados.length, 'confirmado', 'confirmados')} via RSVP
              </div>
            ) : null}
            <div className="hud-corners" style={{ ...VIDRO, clipPath: CLIP, display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px' }}>
              <div style={{ display: 'grid', placeItems: 'center', width: 52, height: 56, flexShrink: 0, background: 'rgba(212,160,23,0.10)', border: '1px solid rgba(212,160,23,0.45)', clipPath: CLIP_S }}>
                <div style={{ fontFamily: RAJ, fontWeight: 800, fontSize: 20, color: '#f0c94a', lineHeight: 1 }}>{new Date(game.data).getDate()}</div>
                <div style={{ fontFamily: RAJ, fontSize: 10, color: '#c9a24a', textTransform: 'uppercase' }}>{new Date(game.data).toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')}</div>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: RAJ, fontWeight: 800, fontSize: 18, lineHeight: 1.15 }}>{game.local || 'Jogo'}</div>
                <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>
                  {formatDateTime(game.data)}
                  {game.jogadores_por_time ? ` · ${game.jogadores_por_time} por time` : ''}
                  {game.sorteio_realizado && game.num_times ? ` · ${game.num_times} times` : ''}
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                <span style={{ fontFamily: RAJ, fontWeight: 800, fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '4px 9px', clipPath: CLIP_S, color: game.status === 'em_curso' ? '#7bd88f' : game.status === 'cancelado' ? '#fda4af' : '#8ab4ff', border: '1px solid rgba(255,255,255,0.25)', background: 'rgba(255,255,255,0.04)' }}>{STATUS_LABELS[game.status] || game.status}</span>
                {game.sorteio_realizado && game.status === 'agendado' ? (
                  <span style={{ fontFamily: RAJ, fontWeight: 700, fontSize: 9, letterSpacing: '0.06em', textTransform: 'uppercase', padding: '3px 8px', clipPath: CLIP_S, color: '#d4a017', border: '1px solid rgba(212,160,23,0.4)', background: 'rgba(212,160,23,0.08)' }}>Times sorteados</span>
                ) : null}
              </div>
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
                {/* Artilheiro do dia (marcado pelo admin, senão o melhor marcador) + Destaque
                    do dia (MVP marcado) — chips dignos. Os IDs vêm do game; nomes do resultado. */}
                {game.resultado_nivel === 3 ? (() => {
                  const todosJ = timesSorteio.flatMap((t) => t.jogadores || []);
                  const nomeDe = (uid) => todosJ.find((j) => j.user_id === uid)?.nome || null;
                  const artNome = game.artilheiro_user_id ? nomeDe(game.artilheiro_user_id) : (artilheiro && artilheiro.gols > 0 ? artilheiro.nome : null);
                  const artGols = game.artilheiro_user_id ? game.artilheiro_gols : (artilheiro && artilheiro.gols);
                  const destNome = game.destaque_user_id ? nomeDe(game.destaque_user_id) : null;
                  if (!artNome && !destNome) return null;
                  const chip = (ic, txt, cor) => (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: RAJ, fontWeight: 700, fontSize: 12, color: cor, border: `1px solid ${cor}55`, background: `${cor}14`, borderRadius: 20, padding: '4px 11px' }}>{ic} {txt}</span>
                  );
                  return (
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                      {artNome ? chip('🏆', `Artilheiro: ${artNome}${artGols ? ` (${artGols})` : ''}`, '#d4a017') : null}
                      {destNome ? chip('⭐', `Destaque: ${destNome}`, '#8b5cf6') : null}
                    </div>
                  );
                })() : null}
              </div>
            ) : null}

            <div className="header-actions">
              <Link to={`/equipa/${slug}/ranking`} className="btn btn--ghost btn--sm">
                Ranking
              </Link>
            </div>

            {/* Confirmação de presença */}
            <SecLabel>Sua presença</SecLabel>
            <div style={{ ...VIDRO, clipPath: CLIP, display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', flexWrap: 'wrap' }}>
              {posEspera != null && !estouConfirmado ? (
                <span style={{ width: '100%', display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: RAJ, color: 'var(--neon)', fontWeight: 700, fontSize: 13, letterSpacing: '0.03em' }}>
                  ⏳ Você está em {posEspera}º na lista de espera
                </span>
              ) : null}
              {estouConfirmado ? (
                <>
                  {/* Rodada 12A: o verde saturado saiu — quem está confirmado
                      veste o dourado da casa, como o "Vou" do card de jogo. */}
                  <span style={{ fontFamily: RAJ, color: 'var(--presenca-sim-texto)', fontWeight: 800, letterSpacing: '0.04em' }}>✓ Você está confirmado</span>
                  <label className="check-inline" style={{ fontFamily: RAJ }}>
                    <input
                      type="checkbox"
                      checked={souGoleiro}
                      disabled={busy}
                      onChange={(e) => confirmar(true, e.target.checked)}
                    />
                    Sou goleiro (GR)
                  </label>
                  {/* P2-8: sem confirmação, um dedo mal posto tirava-te do jogo. */}
                  {confirmacao === 'cancelar-presenca' ? (
                    <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 13, color: 'var(--text-dim)' }}>Cancelar mesmo?</span>
                      <button type="button" className="btn btn--sm btn--outline hud-corners-s" style={{ borderColor: 'var(--presenca-nao-borda)', color: 'var(--presenca-nao-texto)' }} onClick={() => { setConfirmacao(null); confirmar(false); }} disabled={busy}>
                        Sim, sair
                      </button>
                      <button type="button" className="btn btn--sm btn--ghost" onClick={() => setConfirmacao(null)} disabled={busy}>
                        Não
                      </button>
                    </span>
                  ) : (
                    <button
                      type="button"
                      className="btn btn--sm btn--outline hud-corners-s"
                      style={{ marginLeft: 'auto' }}
                      onClick={() => setConfirmacao('cancelar-presenca')}
                      disabled={busy}
                    >
                      Cancelar presença
                    </button>
                  )}
                </>
              ) : (
                <>
                  <span className="muted">Você ainda não confirmou presença.</span>
                  <button
                    type="button"
                    className="btn btn--sm hud-corners-s cta-gold"
                    style={{ marginLeft: 'auto', fontFamily: RAJ, letterSpacing: '0.06em', textTransform: 'uppercase' }}
                    /* Rodada 9: sem `goleiro` no pedido — o motor usa a flag do
                       time (quem é goleiro do time já entra no gol) e respeita o
                       que o jogador/admin tenham marcado neste jogo. */
                    onClick={() => confirmar(true)}
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
                Marque jogadores como goleiro (GR) ou cabeça de chave (C) antes de sortear.
              </p>
            )}
            {confirmados.length === 0 ? (
              <p className="muted">Ainda ninguém confirmou.</p>
            ) : (
              <div style={{ ...VIDRO, clipPath: CLIP, padding: '4px 12px' }}>
                {confirmados.map((p, pi) => (
                  <div key={p.user_id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderTop: pi === 0 ? 'none' : '1px solid rgba(255,255,255,0.06)' }}>
                    <FrameAvatar avatarUrl={p.avatar_url} userId={p.user_id} avatarGenerico={p.avatar_generico} />
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
                  Convidados sem app <span style={{ color: '#6f6a80', textTransform: 'none', letterSpacing: 0 }}>(só o nome, não entram no ranking)</span>
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

            {/* P2-7: re-sortear apaga o sorteio actual (e o replay) — confirmação
                inline, no mesmo padrão de "sair da equipa". */}
            {isAdmin && game.sorteio_realizado && confirmacao === 're-sorteio' && (
              <div style={{ ...VIDRO, clipPath: CLIP, padding: '12px 14px', marginBottom: 10, borderColor: 'rgba(240,201,74,0.4)' }}>
                <div style={{ fontFamily: RAJ, fontWeight: 700, fontSize: 14, color: '#f0c94a' }}>Sortear de novo?</div>
                <div style={{ fontSize: 13, color: 'var(--text-dim)', margin: '4px 0 10px' }}>Isto substitui o sorteio atual: perde-se o resultado e o replay deste.</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button type="button" className="btn btn--sm hud-corners-s cta-gold" style={{ fontFamily: RAJ, letterSpacing: '0.06em', textTransform: 'uppercase' }} onClick={() => { setConfirmacao(null); sortear(); }} disabled={busy}>
                    {busy ? 'Processando…' : 'Substituir sorteio'}
                  </button>
                  <button type="button" className="btn btn--sm btn--outline hud-corners-s" onClick={() => setConfirmacao(null)} disabled={busy}>
                    Manter
                  </button>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {isAdmin && confirmacao !== 're-sorteio' && (
                // RODADA 12A — com gente confirmada para dois times, sortear é A
                // ação da página: pulsa. Já sorteado, o destaque passa ao "Ver
                // sorteio" ao lado (duas coisas a pulsar não destacam nenhuma).
                <span className={podeSortear ? 'pulse-glow' : ''} style={{ display: 'flex' }}>
                  <button type="button" className={`btn btn--sm hud-corners-s cta-gold ${podeSortear ? 'pulse-active' : ''}`} style={{ fontFamily: RAJ, letterSpacing: '0.06em', textTransform: 'uppercase' }} onClick={() => game.sorteio_realizado ? setConfirmacao('re-sorteio') : sortear()} disabled={busy}>
                    {busy ? 'Processando…' : game.sorteio_realizado ? 'Sortear novamente' : 'Sortear times'}
                  </button>
                </span>
              )}
              {/* LEI: jogo manual/histórico (times à mão → sem seed) NÃO abre cerimónia.
                  Só o sorteio (com seed) tem replay/"Ver sorteio". */}
              {game.sorteio_realizado && game.times_resultado?.seed != null && (
                <span className="pulse-glow" style={{ display: 'flex' }}>
                  <button type="button" className="btn btn--sm hud-corners-s cta-gold pulse-active" style={{ fontFamily: RAJ, letterSpacing: '0.06em', textTransform: 'uppercase' }} onClick={() => navigate(`/equipa/${slug}/jogo/${id}/sorteio`)}>
                    Ver sorteio
                  </button>
                </span>
              )}
              {isAdmin && game.sorteio_realizado && !editando && (
                <button type="button" className="btn btn--sm btn--outline hud-corners-s" onClick={() => setEditando(true)}>
                  Ajustar times
                </button>
              )}
              {isAdmin && timesSorteio.length >= 3 && confirmacao !== 'campeonato' && (
                <button type="button" className="btn btn--sm btn--outline hud-corners-s" onClick={() => setConfirmacao('campeonato')}>
                  Criar campeonato com estes times
                </button>
              )}
            </div>

            {/* Campeonato a partir do sorteio: só o formato — plantéis já vêm prontos. */}
            {isAdmin && confirmacao === 'campeonato' && (
              <div style={{ ...VIDRO, clipPath: CLIP, padding: '12px 14px', marginTop: 10, borderColor: 'rgba(139,92,246,0.4)' }}>
                <div style={{ fontFamily: RAJ, fontWeight: 700, fontSize: 14, color: '#c9b6ff' }}>Criar campeonato com estes times</div>
                <div style={{ fontSize: 13, color: 'var(--text-dim)', margin: '4px 0 10px' }}>
                  Os {Math.min(timesSorteio.length, 8)} times e jogadores deste sorteio entram já preenchidos. Escolha o formato:
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button type="button" className="btn btn--sm hud-corners-s cta-gold" style={{ fontFamily: RAJ, letterSpacing: '0.06em', textTransform: 'uppercase' }} onClick={() => criarCampeonatoDeSorteio('pontos')} disabled={criandoCamp}>
                    {criandoCamp ? 'Criando…' : 'Pontos corridos'}
                  </button>
                  <button type="button" className="btn btn--sm hud-corners-s" style={{ fontFamily: RAJ, letterSpacing: '0.06em', textTransform: 'uppercase', borderColor: 'rgba(139,92,246,0.5)', color: '#c9b6ff' }} onClick={() => criarCampeonatoDeSorteio('mata')} disabled={criandoCamp}>
                    {criandoCamp ? 'Criando…' : 'Mata-mata'}
                  </button>
                  <button type="button" className="btn btn--sm btn--outline hud-corners-s" onClick={() => setConfirmacao(null)} disabled={criandoCamp}>
                    Cancelar
                  </button>
                </div>
              </div>
            )}
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
                    {isAdmin ? (
                      <div style={{ display: 'flex', marginBottom: 12 }}>
                        <button type="button" className="btn btn--ghost btn--sm" style={{ marginLeft: 'auto' }} onClick={partilharLink}>
                          Compartilhar
                        </button>
                      </div>
                    ) : null}
                    {/* Vista oficial (a única) — o modo Campo era protótipo abortado de
                        cartaz alternativo; morreu aqui. Modelos alternativos futuros =
                        SPEC-SORTEIO, desenhados pelo Fable quando o dono pedir. */}
                    <DrawnTeams resultado={game.times_resultado} teamCor={team?.cor} />
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
                  Dê sua nota, conta para o ranking do time.
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
