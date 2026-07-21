// Futty v2.0 — Detalhe da equipa + membros + convite (hub no cânone, transversal lote 1).
// Lógica intacta; render no material da casa: vidro + hud-corners + chips 45° + Rajdhani
// + .cta-gold. Posição do jogador em DESTAQUE (regra: o próprio decide; GR no roxo).
import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { apiFetch } from '../lib/api';
import { useApi } from '../hooks/useApi';
import { useTeam } from '../hooks/useTeam';
import { urlAsset } from '../utils/avatar';
import { POSICOES, labelPosicao } from '../utils/posicoes';
import { copiarTexto } from '../utils/clipboard';
import Topbar from '../components/Topbar';
import LoadingFutty from '../components/LoadingFutty';
import SilhuetaJogador from '../components/SilhuetaJogador';
import EscudoEquipa from '../components/EscudoEquipa';
import Toast from '../components/Toast';
import Icon from '../components/Icon';
import OnboardingModal from '../components/OnboardingModal';
import ModeracaoFila from '../components/ModeracaoFila';
import '../styles/app.css';

const VIDRO = { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' };
const CLIP = 'polygon(8px 0, calc(100% - 8px) 0, 100% 8px, 100% calc(100% - 8px), calc(100% - 8px) 100%, 8px 100%, 0 calc(100% - 8px), 0 8px)';
const CLIP_S = 'polygon(5px 0, calc(100% - 5px) 0, 100% 5px, 100% calc(100% - 5px), calc(100% - 5px) 100%, 5px 100%, 0 calc(100% - 5px), 0 5px)';

// Moldura V1 (a mesma família do Ranking).
function FrameAvatar({ avatarUrl, size = 40 }) {
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
    <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 12, fontWeight: 700, letterSpacing: '0.14em', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', margin: '24px 0 10px' }}>
      {children}
    </div>
  );
}

// Badge 45° (papel do membro / posição).
function Badge45({ children, gold }) {
  return (
    <span style={{ fontFamily: "'Rajdhani', sans-serif", fontWeight: 800, fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '3px 9px', clipPath: CLIP_S, flexShrink: 0, color: gold ? '#f0c94a' : 'rgba(255,255,255,0.72)', border: gold ? '1px solid rgba(212,160,23,0.6)' : '1px solid rgba(255,255,255,0.2)', background: gold ? 'rgba(212,160,23,0.10)' : 'rgba(255,255,255,0.04)' }}>
      {children}
    </span>
  );
}

export default function Equipa() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { team, members, loading, error, reload } = useTeam(slug);
  const { data: me } = useApi('/api/me');
  const [confirmarSaida, setConfirmarSaida] = useState(false);
  const [saindo, setSaindo] = useState(false);

  async function sairDaEquipa() {
    if (saindo) return;
    setSaindo(true);
    try {
      await apiFetch(`/api/teams/${slug}/membros/me`, { method: 'DELETE' });
      navigate('/home', { replace: true });
    } catch (e) {
      setToast({ tipo: 'error', mensagem: e.message });
      setSaindo(false);
      setConfirmarSaida(false);
    }
  }

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

  // Onboarding dia-1: "és guarda-redes?" ficou em pref local — aplica-se aqui, na
  // 1ª equipa em que o jogador entra sem posição definida (e a pref morre).
  // (set-state-in-effect justificado: é uma acção one-shot pós-onboarding — dispara
  // o MESMO fluxo do clique no chip, uma única vez, e a pref morre.)
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => {
    if (!team || !meuId || posBusy) return;
    if (minhaPosicao === null && localStorage.getItem('futty_pref_gr') === 'GL') {
      localStorage.removeItem('futty_pref_gr');
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot pós-onboarding
      escolherPosicao('GL');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- corre 1x quando team+me carregam
  }, [team, meuId]);

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
    const ok = await copiarTexto(inviteLink);
    setCopied(ok);
    if (!ok) setActionError('Não deu para copiar — copia o link à mão.');
  }

  return (
    <div className="app-shell">
      <Topbar hud="EQUIPA" back="/home" />
      <main className="app-main page-reveal">
        {(error || actionError) && <div className="alert alert--error">{error || actionError}</div>}

        {loading ? (
          <LoadingFutty />
        ) : !team ? (
          !error && <p className="muted">Time não encontrado.</p>
        ) : (
          <>
            {/* Identidade — escudo + nome + meta + papel */}
            <div className="hud-corners" style={{ ...VIDRO, clipPath: CLIP, display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px' }}>
              <EscudoEquipa team={team} size={52} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: "'Rajdhani', sans-serif", fontWeight: 800, fontSize: 22, lineHeight: 1.1 }}>{team.nome}</div>
                <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>
                  {members.length} {members.length === 1 ? 'membro' : 'membros'}
                </div>
              </div>
              {team.role ? <Badge45 gold={team.role === 'admin'}>{team.role}</Badge45> : null}
            </div>

            {/* Acções principais */}
            <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
              <Link to={`/equipa/${slug}/jogos`} className="btn hud-corners-s cta-gold" style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: "'Rajdhani', sans-serif", letterSpacing: '0.08em', textTransform: 'uppercase', textDecoration: 'none' }}>
                <Icon name="bola" size={15} /> Jogos
              </Link>
              <Link to={`/equipa/${slug}/ranking`} className="btn btn--outline hud-corners-s" style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: "'Rajdhani', sans-serif", letterSpacing: '0.08em', textTransform: 'uppercase', textDecoration: 'none' }}>
                <Icon name="medalha" size={15} /> Ranking
              </Link>
            </div>
            {team.role === 'admin' && (
              <div style={{ marginTop: 8 }}>
                <Link to={`/equipa/${slug}/jogo/novo`} className="btn btn--outline hud-corners-s" style={{ width: '100%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Rajdhani', sans-serif", letterSpacing: '0.06em', textDecoration: 'none' }}>
                  + Criar jogo
                </Link>
              </div>
            )}

            {/* A minha posição — DESTAQUE (regra: o próprio jogador decide; GR no roxo) */}
            <SecLabel>A minha posição neste time — tu decides</SecLabel>
            <div style={{ ...VIDRO, clipPath: CLIP, padding: '14px 12px' }}>
              <div className="chips-row" style={{ justifyContent: 'center' }}>
                {POSICOES.map((p) => {
                  const on = minhaPosicao === p.k;
                  const ehGR = p.k === 'GL';
                  return (
                    <button
                      key={p.k}
                      type="button"
                      title={p.label}
                      className={`chip ${on ? 'chip--active' : ''}`}
                      disabled={posBusy}
                      onClick={() => escolherPosicao(p.k)}
                      style={ehGR ? { color: on ? undefined : '#b69cff', borderColor: on ? undefined : 'rgba(139,92,246,0.55)', background: on ? undefined : 'rgba(139,92,246,0.08)' } : undefined}
                    >
                      {ehGR ? 'GR' : p.k}
                    </button>
                  );
                })}
                <button
                  type="button"
                  title="Sem posição"
                  className={`chip ${minhaPosicao === null ? 'chip--active' : ''}`}
                  disabled={posBusy}
                  onClick={() => escolherPosicao(null)}
                >
                  —
                </button>
              </div>
              <p style={{ fontSize: 11, color: 'var(--text-dim)', textAlign: 'center', margin: '10px 0 0' }}>
                {minhaPosicao ? labelPosicao(minhaPosicao) : 'A tua posição alimenta o sorteio (GR na baliza) e o teu chip no ranking.'}
              </p>
            </div>

            {team.role === 'admin' && pedidos.length > 0 && (
              <>
                <SecLabel>Pedidos de entrada · {pedidos.length}</SecLabel>
                <div style={{ display: 'grid', gap: 8 }}>
                  {pedidos.map((p) => (
                    <div key={p.id} style={{ ...VIDRO, clipPath: CLIP, display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px' }}>
                      <FrameAvatar nome={p.nome_jogador || p.nome || 'Jogador'} avatarUrl={p.avatar_url} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, fontSize: 14 }}>{p.nome_jogador || p.nome || 'Jogador'}</div>
                        {p.mensagem && <div style={{ fontSize: 11, color: 'var(--text-dim)', whiteSpace: 'normal' }}>{p.mensagem}</div>}
                      </div>
                      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                        <button type="button" className="btn btn--sm hud-corners-s cta-gold" disabled={busyPedido === p.id} onClick={() => decidirPedido(p.id, 'approved')} style={{ fontFamily: "'Rajdhani', sans-serif", letterSpacing: '0.06em' }}>
                          Aprovar
                        </button>
                        <button type="button" className="btn btn--sm btn--outline hud-corners-s" style={{ borderColor: 'rgba(248,113,113,0.45)', color: '#fda4af' }} disabled={busyPedido === p.id} onClick={() => decidirPedido(p.id, 'rejected')}>
                          Rejeitar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Tijolo 3 — moderação: só casos ambíguos (a IA resolve os óbvios). */}
            {team.role === 'admin' && (
              <>
                <SecLabel>Moderação</SecLabel>
                <ModeracaoFila slug={slug} />
              </>
            )}

            <SecLabel>Membros · {members.length}</SecLabel>
            <div style={{ ...VIDRO, clipPath: CLIP, padding: '4px 12px' }}>
              {members.map((m, i) => (
                <div key={m.id || m.email} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderTop: i === 0 ? 'none' : '1px solid rgba(255,255,255,0.06)' }}>
                  <FrameAvatar nome={m.nome || m.email || '?'} avatarUrl={m.avatar_url} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, fontSize: 14, lineHeight: 1.15 }}>{m.nome || m.email}</div>
                    {m.nome && <div style={{ fontSize: 10, color: 'var(--text-dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.email}</div>}
                  </div>
                  {m.posicao ? <Badge45 gold>{m.posicao === 'GL' ? 'GR' : m.posicao}</Badge45> : null}
                  <Badge45 gold={m.role === 'admin'}>{m.role}</Badge45>
                </div>
              ))}
              {members.length === 0 && <p className="muted" style={{ padding: '10px 2px' }}>Nenhum membro ainda.</p>}
            </div>

            <SecLabel>Convidar jogador</SecLabel>
            <p className="muted" style={{ fontSize: 13, margin: '0 0 10px' }}>
              Gera um link de convite (válido 7 dias, uso único) para compartilhar com novos jogadores.
            </p>
            <button
              type="button"
              className="btn hud-corners-s cta-gold"
              style={{ width: '100%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: "'Rajdhani', sans-serif", letterSpacing: '0.08em', textTransform: 'uppercase' }}
              onClick={gerarConvite}
              disabled={generating}
            >
              <Icon name="partilhar" size={15} /> {generating ? 'Gerando…' : 'Gerar link de convite'}
            </button>

            {inviteLink && (
              <div style={{ ...VIDRO, clipPath: CLIP, padding: '12px 14px', marginTop: 10 }}>
                <strong style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 13, letterSpacing: '0.06em' }}>Link de convite</strong>
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <input className="input input--hud" readOnly value={inviteLink} onFocus={(e) => e.target.select()} style={{ flex: 1, minWidth: 0 }} />
                  <button type="button" className="btn btn--sm btn--outline hud-corners-s" onClick={copiar}>
                    {copied ? 'Copiado!' : 'Copiar'}
                  </button>
                </div>
              </div>
            )}

            {/* SAIR DA EQUIPA — zona discreta no FIM (acção destrutiva não compete
                com o resto). História preservada; regresso = novo pedido. */}
            <div style={{ marginTop: 36, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.06)', textAlign: 'center' }}>
              {confirmarSaida ? (
                <div style={{ ...VIDRO, clipPath: CLIP, padding: '14px 16px', borderColor: 'rgba(248,113,113,0.35)' }}>
                  <div style={{ fontFamily: "'Rajdhani', sans-serif", fontWeight: 800, fontSize: 14, color: '#fda4af' }}>Vais sair de {team.nome}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-dim)', margin: '6px 0 12px', lineHeight: 1.5 }}>
                    A tua história (jogos, notas, prémios) fica; sais do ranking e dos próximos jogos. Para voltar, pedes entrada de novo.
                  </div>
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                    <button type="button" className="btn btn--sm hud-corners-s" style={{ color: '#fda4af', border: '1.5px solid rgba(248,113,113,0.5)', background: 'rgba(248,113,113,0.08)', fontFamily: "'Rajdhani', sans-serif", letterSpacing: '0.06em' }} disabled={saindo} onClick={sairDaEquipa}>
                      {saindo ? 'A sair…' : 'Sair mesmo'}
                    </button>
                    <button type="button" className="btn btn--sm btn--outline hud-corners-s" disabled={saindo} onClick={() => setConfirmarSaida(false)}>
                      Ficar
                    </button>
                  </div>
                </div>
              ) : (
                <button type="button" onClick={() => setConfirmarSaida(true)} style={{ background: 'none', border: 'none', color: '#6f6a80', fontFamily: "'Rajdhani', sans-serif", fontSize: 12, letterSpacing: '0.06em', cursor: 'pointer' }}>
                  Sair desta equipa
                </button>
              )}
            </div>
          </>
        )}
      </main>
      {toast ? <Toast mensagem={toast.mensagem} tipo={toast.tipo} onClose={() => setToast(null)} /> : null}
      {mostrarOnboarding ? <OnboardingModal teamNome={team.nome} onClose={fecharOnboarding} /> : null}
    </div>
  );
}
