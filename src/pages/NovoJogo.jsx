// Futty v2.0 — Marcar jogo (/time/:slug/jogo/novo, só admin).
// Rodada 29S, bloco A (achados 151 a 156): a página abre DIRETO no "Marcar jogo" — um jogo que vai acontecer. Saíram os três chips (Sortear /
// Times à mão / Já aconteceu): COMO os times se formam (sorteio ou à mão) é uma decisão do JOGO, depois das confirmações (Jogo.jsx).
// No topo, o "ingresso" do jogo se preenche enquanto a pessoa digita; a hora nasce em 20:00 (ou na hora do último jogo do time, se já está em
// cache); "Só neste jogo" aparece em ROXO. "Jogo passado →" é uma linha discreta embaixo do botão.
// Até o bloco B, o "Jogo passado" abre o modo antigo "Já aconteceu" pela URL (?passado=1) com a fase de montar de sempre — o destino mora em
// utils/novoJogo.js (caminhoDoJogoPassado), um ponto só. Esse modo é histórico: NÃO notifica ninguém. Ver SPEC-JOGO-RETROATIVO.
import { useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Calendar, Clock, MapPin } from 'lucide-react';
import { apiFetch } from '../lib/api';
import { lerCache } from '../lib/cacheLocal';
import { useAuth } from '../hooks/useAuth';
import { useTeam } from '../hooks/useTeam';
import { diaDeCalendario, instanteNoCampo, rabichoDoFuso } from '../utils/dataHora';
import { caminhoDoJogoPassado, horaSugerida } from '../utils/novoJogo';
import { corpoDosTimes, nomesDosTimes, podeSalvarTimes } from '../utils/timesAMao';
import Topbar from '../components/Topbar';
import NumberStepper from '../components/NumberStepper';
import ComporTimes from '../components/ComporTimes';
import IngressoDoJogo from '../components/IngressoDoJogo';
import Toast from '../components/Toast';
import { CONVIDADO_BOTAO, CONVIDADO_CAMPO, CONVIDADO_LINHA, CONVIDADO_TITULO } from '../utils/convidadoSemApp';
import '../styles/app.css';

const RAJ = "'Rajdhani', sans-serif";
// O roxo do "Só neste jogo" (achado 156): o que vale só para este jogo se distingue do padrão do time.
const ROXO = '#8b5cf6';
const ROXO_CLARO = '#c9b6ff';
const CAMPO_GRANDE = { fontFamily: RAJ, fontSize: 18, fontWeight: 600 };
const ROTULO_COM_ICONE = { display: 'flex', alignItems: 'center', gap: 6 };
const CLIP = 'polygon(8px 0, calc(100% - 8px) 0, 100% 8px, 100% calc(100% - 8px), calc(100% - 8px) 100%, 8px 100%, 0 calc(100% - 8px), 0 8px)';

export default function NovoJogo() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { session } = useAuth();
  const { members, team } = useTeam(slug);

  // O modo antigo "Já aconteceu" (Jogo passado, até o bloco B) vem da URL; sem ela é o Marcar jogo.
  const retro = params.get('passado') === '1';
  const [fase, setFase] = useState('form'); // 'form' | 'compor' (só o jogo passado)
  const [gameId, setGameId] = useState(null);

  const [data, setData] = useState('');
  // A hora nasce em 20:00 (achado 155) — ou na hora do último jogo do time no fuso do time, se os jogos do time já estão em cache (o do Início):
  // nenhum pedido novo só para isso. `null` = a pessoa ainda não mexeu; a sugestão vale até ela digitar. O jogo passado segue com a hora opcional.
  const [horaDigitada, setHoraDigitada] = useState(null);
  const [jogosEmCache] = useState(() => lerCache(session?.user?.id, 'inicio')?.convites?.games || null);
  const hora = horaDigitada ?? (retro ? '' : horaSugerida(jogosEmCache, { slug, fuso: team?.fuso }));
  const [local, setLocal] = useState('');
  // Item 68 (Rodada 29): jogadores por time é UM padrão do time (Ajustes) — o jogo já nasce com ele, dobrado em "Padrão do time: 5 ·
  // mudar só neste jogo". `porTime` null = o padrão (o motor usa o do time); com número, vale só para este jogo (ROXO, achado 156).
  const [porTime, setPorTime] = useState(null);
  const padraoDoTime = team?.jogadores_por_time || 5;
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  // fase 'compor' (jogo passado)
  const [presentes, setPresentes] = useState({}); // { [user_id]: { jogou, gr } }
  const [convidados, setConvidados] = useState([]);
  const [convInput, setConvInput] = useState('');
  const [nTimes, setNTimes] = useState(2);
  const [atrib, setAtrib] = useState([]);

  const nomesTimes = nomesDosTimes(nTimes);

  const pool = [
    ...(members || []).filter((m) => presentes[m.id]?.jogou).map((m) => ({ key: `u:${m.id}`, user_id: m.id, nome: m.nome || 'Jogador', avatar_url: m.avatar_url || null, convidado: false })),
    ...convidados.map((c, i) => ({ key: `g:${i}:${c}`, user_id: null, nome: c, avatar_url: null, convidado: true })),
  ];
  const podeGuardar = podeSalvarTimes(nomesTimes, atrib);

  function toggleJogou(id) {
    setPresentes((c) => ({ ...c, [id]: { jogou: !c[id]?.jogou, gr: c[id]?.jogou ? false : c[id]?.gr } }));
  }
  function toggleGr(id) {
    setPresentes((c) => ({ ...c, [id]: { ...c[id], gr: !c[id]?.gr } }));
  }
  function addConv() { const v = convInput.trim(); if (v) { setConvidados((c) => [...c, v]); setConvInput(''); } }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!data) { setError('Informe a data do jogo.'); return; }
    if (!retro && !hora) { setError('Informe a hora do jogo.'); return; }
    if (!retro && porTime != null && (!porTime || Number(porTime) < 2)) { setError('Informe quantos jogadores por time (mínimo 2).'); return; }
    setError('');
    setLoading(true);
    try {
      // 29I (achado 83): a data e a hora digitadas são as do CAMPO (fuso do time), não as do aparelho de quem cria o jogo — o admin
      // em Lisboa que marca "quinta 20:00" para um time de São Paulo está marcando 20:00 de São Paulo.
      const iso = instanteNoCampo(data, hora || '12:00', team?.fuso);
      if (!iso) { setError('Confira a data e a hora do jogo.'); setLoading(false); return; }
      const { game } = await apiFetch('/api/games', {
        method: 'POST',
        body: JSON.stringify({
          team_slug: slug,
          data: iso,
          local: local.trim() || null,
          ...(porTime != null ? { jogadores_por_time: Number(porTime) } : {}), // sem número: o padrão do time
          historico: retro,
        }),
      });
      if (retro) { setGameId(game.id); setFase('compor'); setLoading(false); }
      // replace: o "Voltar" do jogo leva para onde a pessoa estava antes do formulário, não de volta a ele.
      else navigate(`/time/${slug}/jogo/${game.id}`, { replace: true });
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }

  async function guardarManual() {
    if (!podeGuardar || loading) return;
    setLoading(true);
    try {
      // 1) presenças marcadas pelo ADMIN (só membros que jogaram, com GR)
      const jogadores = (members || []).filter((m) => presentes[m.id]?.jogou).map((m) => ({ user_id: m.id, goleiro: !!presentes[m.id]?.gr }));
      await apiFetch(`/api/games/${gameId}/presencas`, { method: 'POST', body: JSON.stringify({ jogadores }) });
      // 2) times definidos à mão → times_resultado (sem seed, sem cerimónia)
      await apiFetch(`/api/games/${gameId}/times-manuais`, { method: 'POST', body: JSON.stringify(corpoDosTimes(nomesTimes, atrib, pool)) });
      navigate(`/time/${slug}/jogo/${gameId}`, { replace: true });
    } catch (err) {
      setToast({ tipo: 'error', mensagem: err.message });
      setLoading(false);
    }
  }

  const rabichoDaHora = rabichoDoFuso(new Date(), team?.fuso, { cidade: team?.cidade });

  return (
    <div className="app-shell">
      <Topbar hud="NOVO JOGO" back="voltar" backFallback={`/time/${slug}?aba=jogos`} />
      <main className="app-main page-reveal" style={{ maxWidth: 480 }}>
        {fase === 'form' ? (
          <>
            {retro ? (
              <p className="muted" data-jogo-passado-aviso style={{ fontSize: 12, margin: '4px 0 14px', lineHeight: 1.5 }}>
                Jogo passado · cadastre um jogo que já aconteceu (data passada). Silencioso: não notifica ninguém.
              </p>
            ) : (
              <IngressoDoJogo team={team} data={data} hora={hora} local={local} porTime={porTime} />
            )}

            <form onSubmit={handleSubmit} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.10)', clipPath: CLIP, padding: '16px 16px 18px', display: 'grid', gap: 14 }}>
              {error && <div className="alert alert--error">{error}</div>}

              <div style={{ display: 'flex', gap: 12 }}>
                <div className="field" style={{ flex: 1 }}>
                  <label htmlFor="data" style={ROTULO_COM_ICONE}><Calendar size={15} aria-hidden="true" /> Data</label>
                  <input id="data" type="date" className="input input--hud" style={CAMPO_GRANDE} value={data} max={retro ? diaDeCalendario(new Date(), team?.fuso) : undefined} onChange={(e) => setData(e.target.value)} />
                </div>
                <div className="field" style={{ flex: 1 }}>
                  {/* 29I, bloco 3 (dono): "Hora do jogo" — nunca "fuso". O rabicho aparece só para quem está noutro relógio que o do time
                      (no Marcar jogo ele mora no ingresso, ao lado da hora). */}
                  <label htmlFor="hora" style={ROTULO_COM_ICONE}><Clock size={15} aria-hidden="true" /> Hora do jogo {retro ? <span className="muted" style={{ fontSize: 11 }}>(opcional)</span> : null}</label>
                  <input id="hora" type="time" className="input input--hud" style={CAMPO_GRANDE} value={hora} onChange={(e) => setHoraDigitada(e.target.value)} />
                  {retro && rabichoDaHora ? (
                    <span className="muted" data-rabicho-hora style={{ fontSize: 11, marginTop: 4 }}>{rabichoDaHora}</span>
                  ) : null}
                </div>
              </div>

              <div className="field">
                <label htmlFor="local" style={ROTULO_COM_ICONE}><MapPin size={15} aria-hidden="true" /> Local</label>
                <input id="local" className="input input--hud" style={CAMPO_GRANDE} placeholder="Ex.: Campo Municipal" value={local} onChange={(e) => setLocal(e.target.value)} maxLength={120} />
              </div>

              {!retro ? (
                <div className="field" data-jogadores-por-time style={porTime != null ? { padding: '10px 12px', border: '1px solid rgba(139,92,246,0.55)', background: 'rgba(139,92,246,0.08)' } : undefined}>
                  <label style={{ ...ROTULO_COM_ICONE, justifyContent: 'space-between' }}>
                    Jogadores por time
                    {porTime != null ? (
                      <span data-selo-so-neste style={{ fontFamily: RAJ, fontWeight: 800, fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: ROXO_CLARO, border: `1px solid ${ROXO}`, background: 'rgba(139,92,246,0.22)', padding: '2px 8px', borderRadius: 2 }}>Só neste jogo</span>
                    ) : null}
                  </label>
                  {porTime == null ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', fontSize: 14 }}>
                      <span>Padrão do time: <b>{padraoDoTime}</b></span>
                      <button type="button" className="btn btn--ghost btn--sm" data-mudar-so-neste onClick={() => setPorTime(padraoDoTime)}>mudar só neste jogo</button>
                    </div>
                  ) : (
                    <>
                      <NumberStepper value={porTime} onChange={setPorTime} min={2} max={11} cor={ROXO_CLARO} />
                      <button type="button" className="btn btn--ghost btn--sm" data-voltar-ao-padrao style={{ justifySelf: 'start', marginTop: 6, color: ROXO_CLARO, borderColor: 'rgba(139,92,246,0.5)' }} onClick={() => setPorTime(null)}>voltar ao padrão ({padraoDoTime})</button>
                    </>
                  )}
                  <span className="muted" style={{ fontSize: 12, marginTop: 4 }}>O número de times sai no sorteio, conforme os confirmados. O padrão muda em Ajustes do time.</span>
                </div>
              ) : null}

              <button type="submit" className="btn hud-corners-s cta-gold" style={{ width: '100%', marginTop: 8, fontFamily: RAJ, letterSpacing: '0.08em', textTransform: 'uppercase' }} disabled={loading}>
                {loading ? 'Criando…' : retro ? 'Continuar → montar' : 'Criar jogo'}
              </button>
            </form>

            {/* A porta do outro caminho. Importância menor (dono, 4-out): uma linha discreta, nunca um cartão do mesmo peso do botão. */}
            {retro ? (
              <p data-marcar-jogo style={{ textAlign: 'center', margin: '8px 0 0', fontSize: 13, color: 'var(--text-dim)' }}>
                Esse jogo ainda vai acontecer?{' '}
                <Link to={`/time/${slug}/jogo/novo`} style={{ color: ROXO_CLARO, textDecoration: 'underline', textUnderlineOffset: 3, display: 'inline-block', padding: '12px 2px' }}>Marcar jogo →</Link>
              </p>
            ) : (
              <p data-jogo-passado style={{ textAlign: 'center', margin: '8px 0 0', fontSize: 13, color: 'var(--text-dim)' }}>
                Esse jogo já aconteceu?{' '}
                <Link to={caminhoDoJogoPassado(slug)} style={{ color: ROXO_CLARO, textDecoration: 'underline', textUnderlineOffset: 3, display: 'inline-block', padding: '12px 2px' }}>Jogo passado →</Link>
              </p>
            )}
          </>
        ) : (
          <>
            {/* FASE COMPOR (jogo passado) */}
            <p className="muted" style={{ fontSize: 12, margin: '4px 0 12px', lineHeight: 1.5 }}>
              Jogo histórico · marque quem jogou e monte os times à mão.
            </p>

            {/* Quem jogou (checklist dos membros, marcada pelo admin) */}
            <div className="section-title">Quem jogou</div>
            <div style={{ display: 'grid', gap: 6, marginBottom: 12 }}>
              {(members || []).map((m) => {
                const st = presentes[m.id] || {};
                return (
                  <div key={m.id} className="hud-corners" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', background: st.jogou ? 'rgba(212,160,23,0.06)' : 'rgba(255,255,255,0.02)', border: `1px solid ${st.jogou ? 'rgba(212,160,23,0.35)' : 'rgba(255,255,255,0.08)'}` }}>
                    <label style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', minWidth: 0 }}>
                      <input type="checkbox" checked={!!st.jogou} onChange={() => toggleJogou(m.id)} style={{ width: 18, height: 18, accentColor: '#d4a017' }} />
                      <span style={{ fontFamily: RAJ, fontWeight: 700, fontSize: 14, color: st.jogou ? '#fff' : 'var(--text-dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.nome || 'Jogador'}</span>
                    </label>
                    {st.jogou ? (
                      <label className="check-inline" style={{ fontFamily: RAJ, fontSize: 12, flexShrink: 0 }}>
                        <input type="checkbox" checked={!!st.gr} onChange={() => toggleGr(m.id)} /> GOL
                      </label>
                    ) : null}
                  </div>
                );
              })}
              {(members || []).length === 0 ? <p className="muted" style={{ fontSize: 12 }}>Sem membros no time.</p> : null}
            </div>

            {/* Convidados sem app (nome solto). 29Q: os textos vêm de utils/convidadoSemApp.js, os mesmos do Jogo e do Campeonato. */}
            <div className="section-title" data-convidado-titulo>{CONVIDADO_TITULO}</div>
            <p className="texto-apoio" data-convidado-linha style={{ margin: '2px 0 8px' }}>{CONVIDADO_LINHA}</p>
            <div className="hud-corners" style={{ padding: '10px 12px', marginBottom: 14, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)' }}>
              {convidados.length ? (
                <div className="chips-row" style={{ marginBottom: 8 }}>
                  {convidados.map((n, i) => (
                    <span key={i} className="chip" style={{ gap: 6 }}>{n}<button type="button" aria-label={`Remover ${n}`} onClick={() => setConvidados((c) => c.filter((_, x) => x !== i))} style={{ border: 'none', background: 'none', color: 'inherit', cursor: 'pointer', padding: 0, fontSize: 12 }}>✕</button></span>
                  ))}
                </div>
              ) : null}
              <div style={{ display: 'flex', gap: 8 }}>
                <input className="input input--hud" value={convInput} maxLength={24} placeholder={CONVIDADO_CAMPO} aria-label={CONVIDADO_CAMPO} onChange={(e) => setConvInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addConv(); } }} style={{ flex: 1, minWidth: 0, fontFamily: RAJ }} />
                <button type="button" className="btn btn--sm btn--outline hud-corners-s" disabled={!convInput.trim()} onClick={addConv}>{CONVIDADO_BOTAO}</button>
              </div>
            </div>

            {/* Nº de times */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <span className="muted" style={{ fontSize: 13 }}>Nº de times:</span>
              <div className="chips-row" style={{ margin: 0 }}>
                {[2, 3, 4].map((n) => (
                  <button key={n} type="button" className={`chip ${nTimes === n ? 'chip--active' : ''}`} onClick={() => setNTimes(n)}>{n}</button>
                ))}
              </div>
            </div>

            {/* Composição (a MESMA peça do campeonato e do jogo). O texto de ajuda é nosso: no passado e sem "ex.: 5º A vs 5º B". */}
            <ComporTimes nomes={nomesTimes} pool={pool} atrib={atrib} onChangeAtrib={setAtrib} ajuda="Toque num time e depois em quem jogou nele." />

            <div style={{ marginTop: 18, display: 'grid', gap: 9 }}>
              <button type="button" className="btn hud-corners cta-gold" disabled={!podeGuardar || loading} onClick={guardarManual}>
                {loading ? 'Salvando…' : 'Salvar jogo'}
              </button>
              {!podeGuardar ? <span className="muted" style={{ fontSize: 11, textAlign: 'center' }}>Cada time precisa de pelo menos 1 jogador.</span> : null}
              <button type="button" className="btn btn--ghost btn--sm" onClick={() => setFase('form')}>← Voltar</button>
            </div>
          </>
        )}
      </main>
      {toast ? <Toast mensagem={toast.mensagem} tipo={toast.tipo} onClose={() => setToast(null)} /> : null}
    </div>
  );
}
