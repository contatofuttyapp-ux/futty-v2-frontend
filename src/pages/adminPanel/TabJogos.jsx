// Futty v2.0 — Os jogos do time (presença, jogos que se repetem, editar o jogo), na aba JOGOS do admin.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { apiFetch } from '../../lib/api';
import { formatDateTime, STATUS_LABELS } from '../../utils/format';
import { camposNoCampo, formatarData, instanteNoCampo } from '../../utils/dataHora';
import { UMA_HORA_MS, contagemDoSorteio, textoDaListaFechada, textoDoSorteio } from '../../utils/chamada';
import { useAgora } from '../../hooks/useAgora';
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
import { CARD, nomeForte, rotuloECampo, textoDeApoio } from './comum';

// ─── TAB: JOGOS ──────────────────────────────────────────────────────────────
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

// A presença de um jogo, para o admin: a hora do sorteio (a lista fecha nela) com a contagem, quem vai, quem não vai, quem ainda não
// respondeu, a lista de espera e "Chamar mais gente" (quando o jogo não chamou o elenco inteiro). Não há abrir, fechar nem prazo: o jogo
// nasce chamando e a lista fecha sozinha na hora do sorteio — ou quando o admin sorteia antes ("Sortear agora").
function PresencaDoJogo({ jogo, slug, fuso, navigate, showToast }) {
  const gameId = jogo.id;
  const [info, setInfo] = useState(null);
  const [erro, setErro] = useState('');
  const [busy, setBusy] = useState(false);
  const [chamando, setChamando] = useState(false); // a lista "Chamar mais gente" aberta
  const [escolhidos, setEscolhidos] = useState(() => new Set());

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

  const sorteioEm = info?.sorteio_em ?? jogo.sorteio_em ?? null;
  const agora = useAgora(!!sorteioEm && info?.lista_aberta !== false);
  const contagem = sorteioEm ? contagemDoSorteio(sorteioEm, agora) : null;
  const aberta = info?.lista_aberta !== false && (!sorteioEm || contagem != null);

  // Enquanto a lista está aberta, as respostas chegam sozinhas (de 30 em 30 s).
  useEffect(() => {
    if (!info || !aberta) return undefined;
    const t = setInterval(carregar, 30000);
    return () => clearInterval(t);
  }, [info, aberta, carregar]);

  // O sorteio é na página do jogo, com quem confirmou; sortear antes da hora fecha a lista (o motor fecha quando o sorteio é feito).
  function fazerSorteio() {
    const ids = (info?.confirmados || []).map((u) => u.id);
    navigate(`/time/${slug}/jogo/${gameId}`, { state: { rsvpConfirmados: ids } });
  }

  function alternar(id) {
    setEscolhidos((cur) => {
      const novo = new Set(cur);
      if (novo.has(id)) novo.delete(id);
      else novo.add(id);
      return novo;
    });
  }

  async function chamar() {
    if (busy || !escolhidos.size) return;
    setBusy(true);
    try {
      const r = await apiFetch(`/api/games/${gameId}/chamar`, { method: 'POST', body: JSON.stringify({ user_ids: [...escolhidos] }) });
      const n = r?.novos?.length || 0;
      showToast(n ? `${contar(n, 'pessoa chamada', 'pessoas chamadas')}. O aviso sai agora.` : 'Essas pessoas já estavam chamadas.');
      setChamando(false);
      setEscolhidos(new Set());
      await carregar();
    } catch (e) {
      showToast(e.message, 'error');
    } finally {
      setBusy(false);
    }
  }

  const linha = { marginTop: 12, borderTop: '1px solid #222222', paddingTop: 10 };

  if (!info) {
    return <div style={{ ...linha, fontSize: 12, color: 'var(--text-dim)' }}>{erro || 'Carregando presenças…'}</div>;
  }

  const confirmados = info.confirmados || [];
  const naoVao = info.recusados || [];
  const semResposta = info.pendentes || [];
  const naoChamados = info.nao_chamados || [];

  return (
    <div style={linha} data-presenca-admin data-lista={aberta ? 'aberta' : 'fechada'}>
      {aberta ? (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2px 8px', fontSize: 12 }}>
          {sorteioEm ? <span data-hora-do-sorteio style={{ color: 'var(--text-dim)' }}>{textoDoSorteio(sorteioEm, jogo.data, fuso)}</span> : null}
          {contagem ? <span data-contagem style={{ color: '#f0c94a', fontWeight: 700 }}>{contagem}</span> : null}
        </div>
      ) : (
        <div data-lista-fechada style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{textoDaListaFechada(confirmados.length)}</div>
      )}
      {aberta ? (
        <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 4 }}>
          {contar(confirmados.length, 'confirmado', 'confirmados')} · {naoVao.length} {plural(naoVao.length, 'não vai', 'não vão')} · {semResposta.length} sem resposta
        </div>
      ) : null}
      <ListaUsers users={confirmados} titulo="Confirmados" />
      {aberta ? <ListaUsers users={naoVao} titulo="Não vão" /> : null}
      {aberta ? <ListaUsers users={semResposta} titulo="Sem resposta" /> : null}
      {info.espera?.length ? (
        <div style={{ marginTop: 10 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--neon)' }}>Lista de espera</div>
          <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 4 }}>
            {info.espera.map((e) => `${e.posicao}. ${e.nome || 'Jogador'}`).join(' · ')}
          </div>
        </div>
      ) : null}

      {aberta && chamando ? (
        <div data-chamar-lista style={{ marginTop: 10, display: 'grid', gap: 6 }}>
          <div style={textoDeApoio}>Quem mais vai ser chamado? Recebe o aviso na hora.</div>
          {naoChamados.map((u) => (
            <label key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#fff', minHeight: 36 }}>
              <input type="checkbox" checked={escolhidos.has(u.id)} onChange={() => alternar(u.id)} />
              <PlayerAvatar nome={nomeExibicao(u)} avatarUrl={u.avatar_url} userId={u.id} avatarGenerico={u.avatar_generico} sm />
              <span style={{ minWidth: 0, overflowWrap: 'anywhere' }}>{nomeExibicao(u)}</span>
            </label>
          ))}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button type="button" className="btn btn--purple btn--sm" data-chamar-confirmar disabled={busy || !escolhidos.size} onClick={chamar}>
              {busy ? 'Chamando…' : escolhidos.size ? `Chamar ${contar(escolhidos.size, 'pessoa', 'pessoas')}` : 'Chamar'}
            </button>
            <button type="button" className="btn btn--ghost btn--sm" disabled={busy} onClick={() => { setChamando(false); setEscolhidos(new Set()); }}>Cancelar</button>
          </div>
        </div>
      ) : null}

      <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
        {aberta && naoChamados.length && !chamando ? (
          <button type="button" className="btn btn--ghost btn--sm" data-chamar-mais onClick={() => setChamando(true)}>Chamar mais gente</button>
        ) : null}
        {jogo.sorteio_realizado ? (
          // Já sorteado (antes da hora, ou na hora): o que se faz agora é ver os times, na página do jogo.
          <button type="button" className="btn btn--ghost btn--sm" data-ver-sorteio onClick={() => navigate(`/time/${slug}/jogo/${gameId}`)}>Ver os times</button>
        ) : (
          <button type="button" className="btn btn--primary btn--sm" data-sortear onClick={fazerSorteio}>
            {aberta ? 'Sortear agora' : 'Fazer sorteio com confirmados'}
          </button>
        )}
      </div>
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
      <label style={rotuloECampo}>
        <span style={lbl}>Hora do jogo</span>
        <input type="time" value={hora} onChange={(e) => setHora(e.target.value)} style={inputStyle} />
        <RabichoDaHora fuso={fuso} cidade={cidade} />
      </label>
      <label style={rotuloECampo}>
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

function TabJogos({ slug, team, showToast, navigate }) {
  const fuso = team?.fuso;
  const [games, setGames] = useState(null);
  const [editar, setEditar] = useState(null);
  const [confirmacao, setConfirmacao] = useState(null);
  const [motivoCancel, setMotivoCancel] = useState('');
  const [lancar, setLancar] = useState(null); // o jogo do "Lançar resultado" (era a aba Resultados)

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
          <div style={nomeForte}>{g.local || 'Jogo'}</div>
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
                        <span style={nomeForte}>{g.local || 'Jogo'}</span>
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
                <div key={g.id} data-jogo={g.id} style={{ ...CARD, padding: 12 }}>
                  <div style={nomeForte}>{g.local || 'Jogo'}</div>
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
                  <PresencaDoJogo key={`${g.sorteio_em || ''}|${g.data}`} jogo={g} slug={slug} fuso={fuso} navigate={navigate} showToast={showToast} />
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
  // A hora do sorteio (a lista fecha nela). Enquanto o admin não mexe, ela acompanha o jogo se estava no "1 hora antes" (a mesma regra
  // do motor); mexeu, vale a que ele escreveu.
  const sorteioOriginal = jogo.sorteio_em || null;
  const estavaNoPadrao = !sorteioOriginal || new Date(jogo.data).getTime() - new Date(sorteioOriginal).getTime() === UMA_HORA_MS;
  const [sorteioMexido, setSorteioMexido] = useState(null); // { data, hora } depois que o admin mexe
  const inicioNovo = instanteNoCampo(date, time, fuso);
  const sorteioSugerido = estavaNoPadrao && inicioNovo
    ? camposNoCampo(new Date(new Date(inicioNovo).getTime() - UMA_HORA_MS).toISOString(), fuso)
    : camposNoCampo(sorteioOriginal, fuso);
  const sorteio = sorteioMexido || sorteioSugerido;

  // Esc fecha, como o X (menos no meio do salvar).
  useEffect(() => {
    const teclar = (e) => { if (e.key === 'Escape' && !saving) onClose(); };
    document.addEventListener('keydown', teclar);
    return () => document.removeEventListener('keydown', teclar);
  }, [onClose, saving]);

  async function guardar() {
    if (saving) return;
    setSaving(true);
    try {
      const corpo = { date, time, location: local.trim(), players_per_team: Number(porTime) };
      // Só manda a hora do sorteio se o admin mexeu nela; sem ela, o motor leva o sorteio junto com o jogo (se estava no 1 h antes).
      if (sorteioMexido) Object.assign(corpo, { sorteio_date: sorteioMexido.data, sorteio_time: sorteioMexido.hora });
      const { game } = await apiFetch(`/api/games/${jogo.id}`, { method: 'PATCH', body: JSON.stringify(corpo) });
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
      <div className="modal-card" role="dialog" aria-modal="true" aria-labelledby="editar-jogo-titulo" data-editar-jogo onClick={(e) => e.stopPropagation()} style={{ maxWidth: 400 }}>
        <div className="modal-card__inner" style={{ position: 'relative', textAlign: 'left', display: 'grid', gap: 12 }}>
          <button type="button" aria-label="Fechar" data-fechar-editar-jogo disabled={saving} onClick={onClose} style={{ position: 'absolute', top: 4, right: 4, width: 44, height: 44, display: 'grid', placeItems: 'center', border: 'none', background: 'transparent', color: 'var(--text-dim)', cursor: saving ? 'default' : 'pointer' }}>
            <X size={20} aria-hidden="true" />
          </button>
          <h2 id="editar-jogo-titulo" style={{ fontSize: 16, fontWeight: 800, textAlign: 'center', margin: 0, padding: '0 40px' }}>Editar jogo</h2>
          <label style={rotuloECampo}><span style={lbl}>Data</span><input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={inputStyle} /></label>
          <label style={rotuloECampo}><span style={lbl}>Hora do jogo</span><input type="time" value={time} onChange={(e) => setTime(e.target.value)} style={inputStyle} /><RabichoDaHora fuso={fuso} cidade={cidade} /></label>
          <div style={rotuloECampo} data-campo-sorteio>
            <span style={lbl}>Sorteio</span>
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 8 }}>
              <input type="date" aria-label="Dia do sorteio" data-sorteio-dia value={sorteio.data} onChange={(e) => setSorteioMexido({ ...sorteio, data: e.target.value })} style={inputStyle} />
              <input type="time" aria-label="Hora do sorteio" data-sorteio-hora value={sorteio.hora} onChange={(e) => setSorteioMexido({ ...sorteio, hora: e.target.value })} style={inputStyle} />
            </div>
            <span style={textoDeApoio}>A lista de presença fecha na hora do sorteio.</span>
          </div>
          <label style={rotuloECampo}><span style={lbl}>Local</span><input value={local} onChange={(e) => setLocal(e.target.value)} style={inputStyle} /></label>
          <label style={rotuloECampo}><span style={lbl}>Jogadores por time</span><NumberStepper value={porTime} onChange={setPorTime} min={2} max={11} /></label>
          <label style={rotuloECampo}>
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
