// Futty v2.0 — Os jogos do time (presença, jogos que se repetem, editar o jogo), na aba JOGOS do admin.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { apiFetch } from '../../lib/api';
import { formatDateTime, STATUS_LABELS } from '../../utils/format';
import { camposNoCampo, formatarData, formatarDataHora, instanteNoCampo } from '../../utils/dataHora';
import { contar, plural } from '../../utils/plural';
import { nomeExibicao } from '../../utils/nomeExibicao';
import LoadingFutty from '../../components/LoadingFutty';
import PlayerAvatar from '../../components/PlayerAvatar';
import ResultadoModal from '../../components/ResultadoModal';
import { flagsDoTime } from '../../components/golsEPremios';
import { jogoTemResultado } from '../../utils/resultadoDoJogo';
import { inputStyle, lbl } from '../../components/camposDoAdmin';
import NumberStepper from '../../components/NumberStepper';
import { separarFuturosPassados } from '../../utils/jogosFuturoPassado';
import { estadoDoJogo } from '../../utils/estadoDoJogo';
import { BadgeStatus } from '../../components/ListaDeJogos';
import { ConfirmModal, RabichoDaHora } from './pecas';
import { CARD } from './comum';

// ─── TAB: JOGOS ──────────────────────────────────────────────────────────────
// "sex., 20 de jun. · 22:00" para o prazo do RSVP — no relógio do campo (fuso do time).
// Com o rabicho, a cidade do time ("horário de Brasília"), não a do fuso.
const fmtPrazoAdmin = (iso, fuso, cidade) => formatarDataHora(iso, fuso, { cidade });

// Lista compacta de jogadores (avatar + nome) com título opcional.
function ListaUsers({ users, titulo }) {
  if (!users || users.length === 0) return null;
  return (
    <div style={{ marginTop: 8 }}>
      {titulo ? (
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--label-color)', textTransform: 'uppercase', marginBottom: 4 }}>{titulo}</div>
      ) : null}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {users.map((u) => (
          <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#fff' }}>
            <PlayerAvatar nome={nomeExibicao(u)} avatarUrl={u.avatar_url} userId={u.id} avatarGenerico={u.avatar_generico} sm />
            <span style={{ maxWidth: 120, overflowWrap: 'anywhere' }}>{nomeExibicao(u)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Gestão do RSVP de um jogo (admin): abrir / acompanhar / fechar / sortear.
// `abrirInicial` = a pessoa chegou pela linha "presença ainda não aberta" do Início; o "Abrir presença" deste jogo
// já nasce aberto e, quando o cartão tem a forma final (a presença carregou), `aoPronto` rola até ele e o destaca. Só vale no nascimento.
function RSVPAdmin({ gameId, slug, cidade = null, navigate, showToast, abrirInicial = false, aoPronto = null }) {
  const [info, setInfo] = useState(null);
  const [erro, setErro] = useState('');
  const [busy, setBusy] = useState(false);
  const [abrirModal, setAbrirModal] = useState(abrirInicial);
  const [prazoInput, setPrazoInput] = useState('');
  const [confirmarFechar, setConfirmarFechar] = useState(false);
  const faltaAvisarPronto = useRef(abrirInicial);

  const carregar = useCallback(async () => {
    try {
      const d = await apiFetch(`/api/jogos/${gameId}/rsvp`);
      setInfo(d);
      setErro('');
    } catch (e) {
      setErro(e.message);
    }
  }, [gameId]);

  useEffect(() => {
    let ativo = true;
    apiFetch(`/api/jogos/${gameId}/rsvp`)
      .then((d) => {
        if (!ativo) return;
        setInfo(d);
        setErro('');
      })
      .catch((e) => ativo && setErro(e.message));
    return () => {
      ativo = false;
    };
  }, [gameId]);

  // Com a presença carregada (ou o erro dela na tela) o cartão não muda mais de altura; é a hora de rolar até ele. Uma vez só.
  useEffect(() => {
    if (!faltaAvisarPronto.current || !(info || erro)) return;
    faltaAvisarPronto.current = false;
    aoPronto?.(gameId);
  }, [info, erro, aoPronto, gameId]);

  // Polling de 30s enquanto o RSVP está aberto (atualização em tempo real).
  useEffect(() => {
    if (!info?.rsvp_aberto || info?.rsvp_fechado) return undefined;
    const t = setInterval(carregar, 30000);
    return () => clearInterval(t);
  }, [info?.rsvp_aberto, info?.rsvp_fechado, carregar]);

  async function abrir() {
    if (!prazoInput) {
      showToast('Informe o prazo de confirmação.', 'error');
      return;
    }
    // O prazo digitado é a hora do CAMPO (fuso do time), qualquer que seja o relógio do aparelho de quem abre a presença.
    const prazoIso = instanteNoCampo(prazoInput.slice(0, 10), prazoInput.slice(11, 16), info?.fuso);
    if (!prazoIso) {
      showToast('Esse prazo não é válido. Confira a data e a hora.', 'error');
      return;
    }
    setBusy(true);
    try {
      await apiFetch(`/api/jogos/${gameId}/rsvp/abrir`, { method: 'POST', body: JSON.stringify({ prazo: prazoIso }) });
      setAbrirModal(false);
      setPrazoInput('');
      await carregar();
      showToast('Presença aberta.');
    } catch (e) {
      showToast(e.message, 'error');
    } finally {
      setBusy(false);
    }
  }

  async function fechar() {
    setConfirmarFechar(false);
    setBusy(true);
    try {
      await apiFetch(`/api/jogos/${gameId}/rsvp/fechar`, { method: 'POST' });
      await carregar();
      showToast('Presença fechada.');
    } catch (e) {
      showToast(e.message, 'error');
    } finally {
      setBusy(false);
    }
  }

  function fazerSorteio() {
    const ids = (info?.confirmados || []).map((u) => u.id);
    navigate(`/time/${slug}/jogo/${gameId}`, { state: { rsvpConfirmados: ids } });
  }

  const linha = { marginTop: 12, borderTop: '1px solid #222222', paddingTop: 10 };

  if (!info) {
    return <div style={{ ...linha, fontSize: 12, color: 'var(--text-dim)' }}>{erro || 'Carregando presenças…'}</div>;
  }

  // C) RSVP FECHADO
  if (info.rsvp_fechado) {
    return (
      <div style={linha}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>Presença fechada: {info.confirmados.length} {plural(info.confirmados.length, 'confirmado', 'confirmados')}</div>
        <ListaUsers users={info.confirmados} />
        <button type="button" className="btn btn--primary btn--sm" style={{ marginTop: 10 }} onClick={fazerSorteio}>
          Fazer sorteio com confirmados
        </button>
      </div>
    );
  }

  // B) RSVP ABERTO
  if (info.rsvp_aberto) {
    return (
      <div style={linha}>
        <div style={{ fontSize: 12, color: 'var(--neon)', fontWeight: 700 }}>Aberto até {fmtPrazoAdmin(info.rsvp_prazo, info.fuso, cidade)}</div>
        <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 4 }}>
          {info.confirmados.length} {plural(info.confirmados.length, 'confirmado', 'confirmados')} · {info.recusados.length} {plural(info.recusados.length, 'recusado', 'recusados')} · {info.pendentes.length} {plural(info.pendentes.length, 'pendente', 'pendentes')}
        </div>
        <ListaUsers users={info.confirmados} titulo="Confirmados" />
        <ListaUsers users={info.recusados} titulo="Recusados" />
        <ListaUsers users={info.pendentes} titulo="Pendentes" />
        {info.espera?.length ? (
          <div style={{ marginTop: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--neon)' }}>Lista de espera</div>
            <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 4 }}>
              {info.espera.map((e) => `${e.posicao}. ${e.nome || 'Jogador'}`).join(' · ')}
            </div>
          </div>
        ) : null}
        <button type="button" className="btn btn--ghost btn--sm" style={{ marginTop: 10, borderColor: 'var(--danger)', color: '#fda4af' }} disabled={busy} onClick={() => setConfirmarFechar(true)}>
          Fechar presença</button>
        {confirmarFechar ? (
          <ConfirmModal texto="Fechar a presença? Quem não respondeu fica fora." perigo confirmarLabel="Fechar presença" onConfirm={fechar} onCancel={() => setConfirmarFechar(false)} />
        ) : null}
      </div>
    );
  }

  // A) SEM RSVP ABERTO
  return (
    <div style={linha}>
      {abrirModal ? (
        <div style={{ display: 'grid', gap: 8 }}>
          <label style={{ fontSize: 12, color: 'var(--text-dim)' }}>Prazo de confirmação</label>
          <input
            type="datetime-local"
            value={prazoInput}
            onChange={(e) => setPrazoInput(e.target.value)}
            style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid #222222', background: '#0c0c0c', color: '#fff', fontSize: 16 }}
          />
          <RabichoDaHora fuso={info?.fuso} />
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" className="btn btn--primary btn--sm" disabled={busy} onClick={abrir}>Confirmar</button>
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => setAbrirModal(false)}>Cancelar</button>
          </div>
        </div>
      ) : (
        <button type="button" className="btn btn--purple btn--sm" onClick={() => setAbrirModal(true)}>Abrir presença</button>
      )}
    </div>
  );
}

// Form inline para agendar N jogos semanais de uma vez.
const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
function FormRecorrentes({ slug, fuso, cidade, showToast, onClose, onCriado }) {
  const [dia, setDia] = useState(1); // segunda por defeito
  const [hora, setHora] = useState('19:00');
  const [local, setLocal] = useState('');
  const [semanas, setSemanas] = useState(8);
  const [busy, setBusy] = useState(false);

  async function criar() {
    if (busy) return;
    setBusy(true);
    try {
      const r = await apiFetch(`/api/teams/${slug}/jogos/recorrentes`, {
        method: 'POST',
        body: JSON.stringify({ dia_semana: dia, hora, local: local.trim() || undefined, semanas }),
      });
      const datas = (r.datas || []).map((iso) => formatarData(iso, r.fuso, 'diaMes')).join(', ');
      showToast(`${contar(r.criados, 'jogo criado', 'jogos criados')} para as próximas ${semanas} semanas${r.ignorados ? ` (${contar(r.ignorados, 'ignorado', 'ignorados')} por conflito)` : ''}.${datas ? ` Datas: ${datas}` : ''}`);
      await onCriado();
      onClose();
    } catch (e) {
      showToast(e.message, 'error');
      setBusy(false);
    }
  }

  const toggleStyle = (ativo) => ({
    padding: '6px 10px',
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 800,
    cursor: 'pointer',
    border: `1px solid ${ativo ? 'var(--neon)' : '#333'}`,
    background: ativo ? 'rgba(139,92,246,0.12)' : 'transparent',
    color: ativo ? 'var(--neon)' : 'var(--text-dim)',
  });

  return (
    <div style={{ ...CARD, padding: 14, marginTop: 10, display: 'grid', gap: 12 }}>
      <div>
        <span style={lbl}>Dia da semana</span>
        <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
          {DIAS_SEMANA.map((d, i) => (
            <button key={d} type="button" onClick={() => setDia(i)} aria-pressed={dia === i} style={toggleStyle(dia === i)}>{d}</button>
          ))}
        </div>
      </div>
      <label style={{ display: 'grid', gap: 6 }}>
        <span style={lbl}>Hora do jogo</span>
        <input type="time" value={hora} onChange={(e) => setHora(e.target.value)} style={inputStyle} />
        <RabichoDaHora fuso={fuso} cidade={cidade} />
      </label>
      <label style={{ display: 'grid', gap: 6 }}>
        <span style={lbl}>Local (opcional)</span>
        <input value={local} onChange={(e) => setLocal(e.target.value)} placeholder="Ex.: Campo da Vila" style={inputStyle} />
      </label>
      <div>
        <span style={lbl}>Criar para as próximas</span>
        <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
          {[4, 8, 12].map((n) => (
            <button key={n} type="button" onClick={() => setSemanas(n)} aria-pressed={semanas === n} style={toggleStyle(semanas === n)}>{n} semanas</button>
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button type="button" className="btn btn--purple btn--sm" disabled={busy} onClick={criar}>{busy ? 'Criando…' : 'Criar jogos'}</button>
        <button type="button" className="btn btn--ghost btn--sm" disabled={busy} onClick={onClose}>Cancelar</button>
      </div>
    </div>
  );
}

function TabJogos({ slug, team, showToast, navigate, abrirPresencaDe = null, aoUsarAbrirPresenca = null }) {
  const fuso = team?.fuso;
  const [games, setGames] = useState(null);
  const [editar, setEditar] = useState(null);
  const [confirmacao, setConfirmacao] = useState(null);
  const [motivoCancel, setMotivoCancel] = useState('');
  const [lancar, setLancar] = useState(null); // o jogo do "Lançar resultado" (era a aba Resultados)
  const [destaque, setDestaque] = useState(null); // o jogo que a linha do Início apontou, em destaque por um instante

  // O parâmetro vale UMA vez. Com a lista na tela (o RSVPAdmin do jogo certo acabou de nascer lendo-o), sai do
  // endereço — encontrado ou não (jogo cancelado, já passado ou de outro time): voltar e recarregar não reabrem nada.
  useEffect(() => {
    if (games !== null && abrirPresencaDe) aoUsarAbrirPresenca?.();
  }, [games, abrirPresencaDe, aoUsarAbrirPresenca]);

  const destacarJogo = useCallback((id) => {
    const cartao = [...document.querySelectorAll('[data-jogo]')].find((el) => el.getAttribute('data-jogo') === String(id));
    const reduzido = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    cartao?.scrollIntoView({ block: 'center', behavior: reduzido ? 'auto' : 'smooth' });
    setDestaque(id);
  }, []);
  useEffect(() => {
    if (!destaque) return undefined;
    const t = setTimeout(() => setDestaque(null), 2600);
    return () => clearTimeout(t);
  }, [destaque]);

  useEffect(() => {
    let ativo = true;
    apiFetch(`/api/teams/${slug}/games`)
      .then((d) => ativo && setGames(d.games || []))
      .catch((e) => ativo && (setGames([]), showToast(e.message, 'error')));
    return () => {
      ativo = false;
    };
  }, [slug, showToast]);

  const recarregar = useCallback(
    () =>
      apiFetch(`/api/teams/${slug}/games`)
        .then((d) => setGames(d.games || []))
        .catch((e) => showToast(e.message, 'error')),
    [slug, showToast]
  );

  async function onResultado() {
    setLancar(null);
    await recarregar();
    showToast('Resultado salvo. Aparece na Resenha.');
  }

  const [now] = useState(() => Date.now());
  const { futuros, passados } = useMemo(() => separarFuturosPassados(games, now), [games, now]);

  async function cancelar(g, motivo) {
    try {
      await apiFetch(`/api/games/${g.id}/cancelar`, { method: 'POST', body: JSON.stringify({ motivo: motivo || undefined }) });
      setGames((cur) => cur.map((x) => (x.id === g.id ? { ...x, status: 'cancelado', cancelado: true, motivo_cancelamento: motivo || null } : x)));
      showToast('Jogo cancelado. Notificação enviada.');
    } catch (e) {
      showToast(e.message, 'error');
    }
  }

  async function apagar(g) {
    try {
      await apiFetch(`/api/games/${g.id}`, { method: 'DELETE' });
      setGames((cur) => cur.filter((x) => x.id !== g.id));
      showToast('Jogo excluído.');
    } catch (e) {
      showToast(e.message, 'error');
    }
  }

  function onEditado(updated) {
    setGames((cur) => cur.map((x) => (x.id === updated.id ? { ...x, ...updated } : x)));
    setEditar(null);
    showToast('Jogo atualizado.');
  }

  if (games === null) return <LoadingFutty />;

  // A linha de um jogo que já começou: "Lançar resultado" no que foi sorteado e ainda não tem resultado nenhum (era a aba Resultados), o selo do estado
  // e "Editar resultado" / "Ver" nos outros. Fica em "Passados" quando terminou e em "Próximos", com o selo "Em andamento", enquanto rola.
  function linhaDoJogoQueComecou(g) {
    const emAndamento = estadoDoJogo(g) === 'em_curso';
    const cancelado = g.cancelado || g.status === 'cancelado';
    // "Resultado lançado" = campeão ou empate marcado (nível, placar e gols sozinhos não bastam).
    const temResultado = jogoTemResultado(g);
    const semResultado = !cancelado && g.sorteio_realizado && !temResultado;
    return (
      <div key={g.id} data-jogo={emAndamento ? g.id : undefined} data-jogo-em-andamento={emAndamento ? '' : undefined} data-linha-de-jogo style={{ ...CARD, padding: 12, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px 10px', opacity: cancelado ? 0.55 : 1 }}>
        {/* O título e a data nunca ficam mais estreitos que 150 px: quando o selo e os botões não cabem ao lado, descem juntos para uma segunda linha, abaixo do título. */}
        <div style={{ flex: '1 1 150px', minWidth: 150 }}>
          <div style={{ fontWeight: 700, color: '#fff' }}>{g.local || 'Jogo'}</div>
          <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>{formatDateTime(g.data, fuso, { cidade: team?.cidade })}</div>
        </div>
        <div data-linha-de-jogo-acoes style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {emAndamento ? <BadgeStatus status="em_curso" /> : semResultado ? null : <span className={`badge badge--${g.status}`}>{STATUS_LABELS[g.status] || g.status}</span>}
          {semResultado ? (
            <button type="button" className="btn btn--purple btn--sm" data-lancar-resultado onClick={() => setLancar(g)}>Lançar resultado</button>
          ) : (
            <>
              {temResultado ? <button type="button" className="btn btn--ghost btn--sm" onClick={() => setLancar(g)}>Editar resultado</button> : null}
              <button type="button" className="btn btn--ghost btn--sm" onClick={() => navigate(`/time/${slug}/jogo/${g.id}`)}>Ver</button>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div>
        <div className="games-label" style={{ margin: 0 }}>Próximos</div>
        {futuros.length === 0 ? (
          <p className="muted" style={{ fontSize: 13, marginTop: 10 }}>Sem jogos futuros.</p>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            {futuros.map((g) => {
              // O jogo que já começou e ainda está em andamento fica aqui em cima, com o selo; o que se pode fazer nele é o de sempre num jogo que começou.
              if (estadoDoJogo(g) === 'em_curso') return linhaDoJogoQueComecou(g);
              const cancelado = g.cancelado || g.status === 'cancelado';
              if (cancelado) {
                return (
                  <div key={g.id} data-jogo={g.id} data-jogo-cancelado style={{ ...CARD, padding: 12 }}>
                    <div style={{ opacity: 0.55 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 700, color: '#fff' }}>{g.local || 'Jogo'}</span>
                        <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--danger)', border: '1px solid var(--danger)', background: 'rgba(248,113,113,0.12)', borderRadius: 999, padding: '2px 8px' }}>Cancelado</span>
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>{formatDateTime(g.data, fuso, { cidade: team?.cidade })}</div>
                      {g.motivo_cancelamento ? (
                        <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 6 }}>Motivo: {g.motivo_cancelamento}</div>
                      ) : null}
                    </div>
                    {/* Pedido do dono: "Excluir" só existe DEPOIS de cancelar. Cancelar avisa o time e
                        é o primeiro passo; excluir apaga. Lado a lado, em vermelho, os dois ficariam num dedo grosso. O motor só
                        apaga jogo futuro SEM confirmados (409 "Cancele-o em vez de excluí-lo" nos outros); por isso o botão só aparece
                        quando o motor aceita, em vez de oferecer o que ele vai recusar. */}
                    {g.confirmados === 0 ? (
                      <div style={{ marginTop: 10 }}>
                        <button type="button" className="btn btn--ghost btn--sm" data-excluir-jogo style={{ color: '#fda4af' }} onClick={() => setConfirmacao({ tipo: 'apagar', jogo: g })}>Excluir</button>
                      </div>
                    ) : null}
                  </div>
                );
              }
              return (
                <div key={g.id} data-jogo={g.id} className={destaque === g.id ? 'jogo-destaque' : undefined} style={{ ...CARD, padding: 12 }}>
                  <div style={{ fontWeight: 700, color: '#fff' }}>{g.local || 'Jogo'}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>
                    {formatDateTime(g.data, fuso, { cidade: team?.cidade })} · {g.confirmados} {plural(g.confirmados, 'confirmado', 'confirmados')}
                  </div>
                  {g.max_jogadores != null ? (() => {
                    const cheio = g.confirmados >= g.max_jogadores;
                    const pct = Math.min(100, Math.round((g.confirmados / g.max_jogadores) * 100));
                    return (
                      <div style={{ marginTop: 8 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: cheio ? 'var(--neon)' : 'var(--text-dim)' }}>
                          {g.confirmados} / {contar(g.max_jogadores, 'lugar', 'lugares')}{cheio ? ' · cheio' : ''}
                        </div>
                        <div style={{ height: 4, borderRadius: 999, background: 'rgba(255,255,255,0.08)', marginTop: 4, overflow: 'hidden' }}>
                          <div style={{ width: `${pct}%`, height: '100%', background: cheio ? 'var(--neon)' : 'rgba(255,255,255,0.35)', transition: 'width 0.3s ease' }} />
                        </div>
                      </div>
                    );
                  })() : null}
                  <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                    <button type="button" className="btn btn--ghost btn--sm" onClick={() => setEditar(g)}>Editar</button>
                    <button type="button" className="btn btn--ghost btn--sm" style={{ borderColor: 'var(--danger)', color: '#fda4af' }} onClick={() => { setMotivoCancel(''); setConfirmacao({ tipo: 'cancelar', jogo: g }); }}>Cancelar jogo</button>
                  </div>
                  <RSVPAdmin gameId={g.id} slug={slug} cidade={team?.cidade} navigate={navigate} showToast={showToast} abrirInicial={!!abrirPresencaDe && String(g.id) === String(abrirPresencaDe)} aoPronto={destacarJogo} />
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div>
        <div className="games-label">Passados</div>
        {passados.length === 0 ? (
          <p className="muted" style={{ fontSize: 13 }}>Sem jogos passados.</p>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            {passados.map(linhaDoJogoQueComecou)}
          </div>
        )}
      </div>

      {editar ? <EditarJogoModal jogo={editar} fuso={fuso} cidade={team?.cidade} onClose={() => setEditar(null)} onSaved={onEditado} showToast={showToast} /> : null}
      {lancar ? <ResultadoModal jogo={lancar} fuso={fuso} cidade={team?.cidade} premios={flagsDoTime(team)} onClose={() => setLancar(null)} onSaved={onResultado} showToast={showToast} /> : null}

      {confirmacao ? (
        <ConfirmModal
          texto={
            confirmacao.tipo === 'cancelar'
              ? `Cancelar o jogo de ${formatDateTime(confirmacao.jogo.data, fuso, { cidade: team?.cidade })}? Esta ação envia notificação a todos os membros.`
              : 'Excluir este jogo? Esta ação é irreversível.'
          }
          perigo
          confirmarLabel={confirmacao.tipo === 'cancelar' ? 'Cancelar jogo' : 'Excluir'}
          onConfirm={() => {
            const { tipo, jogo } = confirmacao;
            const motivo = motivoCancel.trim();
            setConfirmacao(null);
            if (tipo === 'cancelar') cancelar(jogo, motivo);
            else apagar(jogo);
          }}
          onCancel={() => setConfirmacao(null)}
        >
          {confirmacao.tipo === 'cancelar' ? (
            <input
              type="text"
              value={motivoCancel}
              onChange={(e) => setMotivoCancel(e.target.value.slice(0, 300))}
              placeholder="Motivo (opcional)"
              style={{ width: '100%', boxSizing: 'border-box', padding: '8px 10px', borderRadius: 8, border: '1px solid #1a1a1a', background: '#0c0c0c', color: '#fff', fontSize: 16 }}
            />
          ) : null}
        </ConfirmModal>
      ) : null}
    </div>
  );
}

function EditarJogoModal({ jogo, fuso, cidade, onClose, onSaved, showToast }) {
  // Data e hora do formulário são as do CAMPO (fuso do time): é o que o motor lê ao salvar. Com o relógio
  // do aparelho, o admin em Lisboa veria, e salvaria, a hora de Lisboa.
  const campos = camposNoCampo(jogo.data, fuso);
  const [date, setDate] = useState(campos.data);
  const [time, setTime] = useState(campos.hora);
  const [local, setLocal] = useState(jogo.local || '');
  const [porTime, setPorTime] = useState(jogo.jogadores_por_time || 5);
  const [maxJog, setMaxJog] = useState(jogo.max_jogadores != null ? String(jogo.max_jogadores) : '');
  const [saving, setSaving] = useState(false);

  async function guardar() {
    if (saving) return;
    setSaving(true);
    try {
      const { game } = await apiFetch(`/api/games/${jogo.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ date, time, location: local.trim(), players_per_team: Number(porTime) }),
      });
      // Capacidade (endpoint dedicado). Vazio = sem limite.
      const maxValor = maxJog.trim() === '' ? null : Number(maxJog);
      const { max_jogadores } = await apiFetch(`/api/games/${jogo.id}/capacidade`, {
        method: 'PATCH',
        body: JSON.stringify({ max_jogadores: maxValor }),
      });
      onSaved({ ...game, max_jogadores });
    } catch (e) {
      showToast(e.message, 'error');
      setSaving(false);
    }
  }

  return createPortal(
    <div className="modal-overlay" role="presentation" onClick={() => !saving && onClose()}>
      <div className="modal-card" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 400 }}>
        <div className="modal-card__inner" style={{ textAlign: 'left', display: 'grid', gap: 12 }}>
          <h2 style={{ fontSize: 16, fontWeight: 800, textAlign: 'center', margin: 0 }}>Editar jogo</h2>
          <label style={{ display: 'grid', gap: 6 }}><span style={lbl}>Data</span><input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={inputStyle} /></label>
          <label style={{ display: 'grid', gap: 6 }}><span style={lbl}>Hora do jogo</span><input type="time" value={time} onChange={(e) => setTime(e.target.value)} style={inputStyle} /><RabichoDaHora fuso={fuso} cidade={cidade} /></label>
          <label style={{ display: 'grid', gap: 6 }}><span style={lbl}>Local</span><input value={local} onChange={(e) => setLocal(e.target.value)} style={inputStyle} /></label>
          <label style={{ display: 'grid', gap: 6 }}><span style={lbl}>Jogadores por time</span><NumberStepper value={porTime} onChange={setPorTime} min={2} max={11} /></label>
          <label style={{ display: 'grid', gap: 6 }}>
            <span style={lbl}>Máximo de jogadores</span>
            <input type="number" min="1" inputMode="numeric" value={maxJog} onChange={(e) => setMaxJog(e.target.value.replace(/[^0-9]/g, ''))} placeholder="Sem limite" style={inputStyle} />
          </label>
          <button type="button" className="btn btn--primary" style={{ width: '100%' }} disabled={saving} onClick={guardar}>{saving ? 'Salvando…' : 'Salvar'}</button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export { FormRecorrentes, TabJogos };
