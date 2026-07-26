// Futty v2.0 — Criar jogo (só admin).
// 3 modos: SORTEAR (normal, o sorteio é o caminho padrão) · TIMES À MÃO (manual, hoje)
// · JÁ ACONTECEU (retroativo, data passada). Os 2 últimos partilham a mesma peça de
// composição (ComporTimes) e NÃO abrem cerimónia (times_resultado sem seed). O
// retroativo é histórico: NÃO notifica ninguém. Ver SPEC-JOGO-MANUAL / SPEC-JOGO-RETROATIVO.
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { apiFetch } from '../lib/api';
import { useTeam } from '../hooks/useTeam';
import Topbar from '../components/Topbar';
import NumberStepper from '../components/NumberStepper';
import ComporTimes from '../components/ComporTimes';
import Toast from '../components/Toast';
import '../styles/app.css';

const RAJ = "'Rajdhani', sans-serif";
const NOMES_PALETA = ['Time Ouro', 'Time Roxo', 'Time Prata', 'Time Bronze'];

export default function NovoJogo() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { members } = useTeam(slug);

  const [modo, setModo] = useState('sortear'); // 'sortear' | 'manual' | 'retro'
  const [fase, setFase] = useState('form'); // 'form' | 'compor'
  const [gameId, setGameId] = useState(null);

  const [data, setData] = useState('');
  const [hora, setHora] = useState('');
  const [local, setLocal] = useState('');
  const [porTime, setPorTime] = useState(5);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  // fase 'compor' (manual/retro)
  const [presentes, setPresentes] = useState({}); // { [user_id]: { jogou, gr } }
  const [convidados, setConvidados] = useState([]);
  const [convInput, setConvInput] = useState('');
  const [nTimes, setNTimes] = useState(2);
  const [atrib, setAtrib] = useState([]);

  const eManual = modo === 'manual' || modo === 'retro';
  const nomesTimes = NOMES_PALETA.slice(0, nTimes);

  const pool = [
    ...(members || []).filter((m) => presentes[m.id]?.jogou).map((m) => ({ key: `u:${m.id}`, user_id: m.id, nome: m.nome || 'Jogador', avatar_url: m.avatar_url || null, convidado: false })),
    ...convidados.map((c, i) => ({ key: `g:${i}:${c}`, user_id: null, nome: c, avatar_url: null, convidado: true })),
  ];
  const poolByKey = Object.fromEntries(pool.map((p) => [p.key, p]));
  const podeGuardar = nomesTimes.every((_, i) => (atrib[i] || []).length >= 1);

  function toggleJogou(id) {
    setPresentes((c) => ({ ...c, [id]: { jogou: !c[id]?.jogou, gr: c[id]?.jogou ? false : c[id]?.gr } }));
  }
  function toggleGr(id) {
    setPresentes((c) => ({ ...c, [id]: { ...c[id], gr: !c[id]?.gr } }));
  }
  function addConv() { const v = convInput.trim(); if (v) { setConvidados((c) => [...c, v]); setConvInput(''); } }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!data) { setError('Indica a data do jogo.'); return; }
    if (modo === 'sortear' && !hora) { setError('Indica a hora do jogo.'); return; }
    if (modo === 'sortear' && (!porTime || Number(porTime) < 2)) { setError('Indica quantos jogadores por time (mínimo 2).'); return; }
    setError('');
    setLoading(true);
    try {
      const iso = new Date(`${data}T${hora || '12:00'}`).toISOString();
      const { game } = await apiFetch('/api/games', {
        method: 'POST',
        body: JSON.stringify({
          team_slug: slug,
          data: iso,
          local: local.trim() || null,
          jogadores_por_time: Number(porTime) || 5,
          historico: modo === 'retro',
        }),
      });
      if (eManual) { setGameId(game.id); setFase('compor'); setLoading(false); }
      else navigate(`/equipa/${slug}/jogo/${game.id}`);
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
      const times = nomesTimes.map((nome, i) => ({
        nome,
        jogadores: (atrib[i] || []).map((k) => poolByKey[k]).filter(Boolean).map((p) => ({ user_id: p.user_id, nome: p.nome, avatar_url: p.avatar_url, convidado: p.convidado })),
      }));
      await apiFetch(`/api/games/${gameId}/times-manuais`, { method: 'POST', body: JSON.stringify({ times }) });
      navigate(`/equipa/${slug}/jogo/${gameId}`);
    } catch (err) {
      setToast({ tipo: 'error', mensagem: err.message });
      setLoading(false);
    }
  }

  return (
    <div className="app-shell">
      <Topbar hud="NOVO JOGO" back={`/equipa/${slug}/jogos`} />
      <main className="app-main page-reveal" style={{ maxWidth: 480 }}>
        {fase === 'form' ? (
          <>
            {/* Modo */}
            <div className="chips-row" style={{ margin: '4px 0 14px' }}>
              <button type="button" className={`chip ${modo === 'sortear' ? 'chip--active' : ''}`} onClick={() => setModo('sortear')}>Sortear</button>
              <button type="button" className={`chip ${modo === 'manual' ? 'chip--active' : ''}`} onClick={() => setModo('manual')}>Times à mão</button>
              <button type="button" className={`chip ${modo === 'retro' ? 'chip--active' : ''}`} onClick={() => setModo('retro')}>Já aconteceu</button>
            </div>
            <p className="muted" style={{ fontSize: 12, margin: '0 0 14px', lineHeight: 1.5 }}>
              {modo === 'sortear' ? 'Agenda um jogo — os times saem do sorteio.'
                : modo === 'manual' ? 'Define tu os times à mão. Sem sorteio, sem cerimónia.'
                  : 'Carrega um jogo que já aconteceu (data passada). Silencioso — não notifica ninguém.'}
            </p>

            <form onSubmit={handleSubmit} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.10)', clipPath: 'polygon(8px 0, calc(100% - 8px) 0, 100% 8px, 100% calc(100% - 8px), calc(100% - 8px) 100%, 8px 100%, 0 calc(100% - 8px), 0 8px)', padding: '16px 16px 18px', display: 'grid', gap: 14 }}>
              {error && <div className="alert alert--error">{error}</div>}

              <div style={{ display: 'flex', gap: 12 }}>
                <div className="field" style={{ flex: 1 }}>
                  <label htmlFor="data">Data</label>
                  <input id="data" type="date" className="input input--hud" value={data} max={modo === 'retro' ? new Date().toISOString().slice(0, 10) : undefined} onChange={(e) => setData(e.target.value)} />
                </div>
                <div className="field" style={{ flex: 1 }}>
                  <label htmlFor="hora">Hora {modo !== 'sortear' ? <span className="muted" style={{ fontSize: 11 }}>(opcional)</span> : null}</label>
                  <input id="hora" type="time" className="input input--hud" value={hora} onChange={(e) => setHora(e.target.value)} />
                </div>
              </div>

              <div className="field">
                <label htmlFor="local">Local</label>
                <input id="local" className="input input--hud" placeholder="Ex.: Campo Municipal" value={local} onChange={(e) => setLocal(e.target.value)} maxLength={120} />
              </div>

              {modo === 'sortear' ? (
                <div className="field">
                  <label>Jogadores por time</label>
                  <NumberStepper value={porTime} onChange={setPorTime} min={2} max={11} />
                  <span className="muted" style={{ fontSize: 12, marginTop: 4 }}>O número de times é calculado automaticamente no sorteio, conforme os jogadores confirmados.</span>
                </div>
              ) : null}

              <button type="submit" className="btn hud-corners-s cta-gold" style={{ width: '100%', marginTop: 8, fontFamily: RAJ, letterSpacing: '0.08em', textTransform: 'uppercase' }} disabled={loading}>
                {loading ? 'Criando…' : eManual ? 'Continuar → montar' : 'Criar jogo'}
              </button>
            </form>
          </>
        ) : (
          <>
            {/* FASE COMPOR (manual/retro) */}
            <p className="muted" style={{ fontSize: 12, margin: '4px 0 12px', lineHeight: 1.5 }}>
              {modo === 'retro' ? 'Jogo histórico' : 'Jogo manual'} · marca quem jogou e monta os times à mão.
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
                        <input type="checkbox" checked={!!st.gr} onChange={() => toggleGr(m.id)} /> GR
                      </label>
                    ) : null}
                  </div>
                );
              })}
              {(members || []).length === 0 ? <p className="muted" style={{ fontSize: 12 }}>Sem membros na equipa.</p> : null}
            </div>

            {/* Convidados sem app (nome solto) */}
            <div className="section-title">Convidados <span className="muted" style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, fontSize: 11 }}>(sem app — só nome)</span></div>
            <div className="hud-corners" style={{ padding: '10px 12px', marginBottom: 14, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)' }}>
              {convidados.length ? (
                <div className="chips-row" style={{ marginBottom: 8 }}>
                  {convidados.map((n, i) => (
                    <span key={i} className="chip" style={{ gap: 6 }}>{n}<button type="button" aria-label={`Remover ${n}`} onClick={() => setConvidados((c) => c.filter((_, x) => x !== i))} style={{ border: 'none', background: 'none', color: 'inherit', cursor: 'pointer', padding: 0, fontSize: 12 }}>✕</button></span>
                  ))}
                </div>
              ) : null}
              <div style={{ display: 'flex', gap: 8 }}>
                <input className="input input--hud" value={convInput} maxLength={24} placeholder="Nome do convidado…" onChange={(e) => setConvInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addConv(); } }} style={{ flex: 1, minWidth: 0, fontFamily: RAJ }} />
                <button type="button" className="btn btn--sm btn--outline hud-corners-s" disabled={!convInput.trim()} onClick={addConv}>+ Convidado</button>
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

            {/* Composição (a MESMA peça do campeonato) */}
            <ComporTimes nomes={nomesTimes} pool={pool} atrib={atrib} onChangeAtrib={setAtrib} />

            <div style={{ marginTop: 18, display: 'grid', gap: 9 }}>
              <button type="button" className="btn hud-corners cta-gold" disabled={!podeGuardar || loading} onClick={guardarManual}>
                {loading ? 'A guardar…' : 'Guardar jogo'}
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
