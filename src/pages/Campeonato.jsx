// Futty v2.0 — Campeonato (Vaga 11B): hub (lista + criar) e detalhe (tabela/
// bracket + lançar resultado + celebração). Modelo N times, Storage no backend.
// A cerimónia do sorteio é REUTILIZADA para montar os times.
import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { apiFetch } from '../lib/api';
import { useTeam } from '../hooks/useTeam';
import Topbar from '../components/Topbar';
import LoadingFutty from '../components/LoadingFutty';
import Toast from '../components/Toast';
import Icon from '../components/Icon';
import CerimoniaSorteio from '../components/CerimoniaSorteio';
import ComporTimes from '../components/ComporTimes';
import { CampeonatoTabela, CampeonatoJogos, CampeonatoBracket, CampeonatoCelebracao, CampeonatoPlanteis } from '../components/CampeonatoVistas';
import '../styles/app.css';

const RAJ = "'Rajdhani', sans-serif";

export default function Campeonato() {
  const { slug, id } = useParams();
  return id ? <Detalhe slug={slug} id={id} /> : <Hub slug={slug} />;
}

// ============ HUB (lista + criar) ============
function Hub({ slug }) {
  const navigate = useNavigate();
  const { team } = useTeam(slug);
  const isAdmin = team?.role === 'admin';
  const [lista, setLista] = useState(null);
  const [criar, setCriar] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    let ativo = true;
    apiFetch(`/api/equipas/${slug}/campeonatos`)
      .then((d) => ativo && setLista(d.campeonatos || []))
      .catch((e) => ativo && setToast({ tipo: 'error', mensagem: e.message }));
    return () => { ativo = false; };
  }, [slug]);

  if (criar) return <Wizard slug={slug} onCancel={() => setCriar(false)} onCriado={(c) => navigate(`/equipa/${slug}/campeonato/${c.id}`, { state: { cerimonia: !!c.seed } })} />;

  return (
    <div className="app-shell">
      <Topbar hud="CAMPEONATO" back={`/equipa/${slug}`} />
      <main className="app-main page-reveal" style={{ padding: '12px 14px' }}>
        <h1 className="camp-title" style={{ fontSize: 22 }}>Campeonatos</h1>
        <p className="muted" style={{ fontSize: 12, margin: '0 0 14px' }}>Torneios internos da equipa — o ranking fica intocado.</p>

        {lista === null ? <LoadingFutty /> : lista.length === 0 ? (
          <div className="camp-card" style={{ textAlign: 'center', padding: '26px 14px' }}>
            <div style={{ fontFamily: RAJ, fontWeight: 700, fontSize: 16 }}>Ainda sem campeonatos</div>
            <p className="muted" style={{ fontSize: 12, margin: '6px 0 0' }}>{isAdmin ? 'Cria o primeiro — pontos corridos ou mata-mata.' : 'O admin cria o primeiro torneio da equipa.'}</p>
          </div>
        ) : (
          lista.map((c) => (
            <button key={c.id} type="button" className="camp-card" onClick={() => navigate(`/equipa/${slug}/campeonato/${c.id}`)} style={{ width: '100%', textAlign: 'left', cursor: 'pointer' }}>
              <div className="camp-card__n">{c.nome}</div>
              <div className="row" style={{ marginTop: 6 }}>
                <span className={`camp-chip ${c.formato === 'mata' ? 'camp-chip--roxo' : 'camp-chip--gold'}`}>{c.formato === 'mata' ? 'Mata-mata' : 'Pontos corridos'}</span>
                <span className={`camp-chip ${c.estado === 'terminado' ? 'camp-chip--gold' : 'camp-chip--live'}`}>{c.estado === 'terminado' ? 'Terminado' : 'Em curso'}</span>
                <span className="camp-chip">{c.n_times} times</span>
              </div>
              {c.campeao ? <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#f0c94a', marginTop: 8, fontFamily: RAJ, fontWeight: 700 }}><Icon name="trofeu" size={14} color="#d4a017" /> {c.campeao}</div> : null}
            </button>
          ))
        )}

        {isAdmin ? (
          <div className="cta-gold-glow" style={{ display: 'flex', marginTop: 16 }}>
            <button type="button" className="btn hud-corners cta-gold" style={{ flex: 1 }} onClick={() => setCriar(true)}>＋ Criar campeonato</button>
          </div>
        ) : null}
      </main>
      {toast ? <Toast mensagem={toast.mensagem} tipo={toast.tipo} onClose={() => setToast(null)} /> : null}
    </div>
  );
}

// ============ WIZARD (criar) ============
function Wizard({ slug, onCancel, onCriado }) {
  const { members } = useTeam(slug);
  const [passo, setPasso] = useState(1);
  const [nome, setNome] = useState('');
  const [formato, setFormato] = useState('pontos');
  const [nomes, setNomes] = useState(['', '', '', '']);
  const [convidados, setConvidados] = useState([]);
  const [convInput, setConvInput] = useState('');
  const [atrib, setAtrib] = useState([]); // Vaga 11C — plantel por time (chaves)
  const [criando, setCriando] = useState(false);
  const [toast, setToast] = useState(null);

  const KITN = ['Ouro', 'Roxo', 'Prata', 'Bronze', 'Ciano', 'Rosa', 'Verde', 'Âmbar'];

  // Pool de jogadores atribuíveis: membros da equipa + convidados (chips).
  const pool = [
    ...(members || []).map((m) => ({ key: `u:${m.id}`, user_id: m.id, nome: m.nome || (m.email ? m.email.split('@')[0] : 'Jogador'), avatar_url: m.avatar_url || null, convidado: false })),
    ...convidados.map((c, i) => ({ key: `g:${i}:${c}`, user_id: null, nome: c, avatar_url: null, convidado: true })),
  ];
  const poolByKey = Object.fromEntries(pool.map((p) => [p.key, p]));
  const atribSafe = nomes.map((_, i) => atrib[i] || []);
  const totalAtrib = new Set(atribSafe.flat()).size;

  function setNomeT(i, v) { setNomes((cur) => cur.map((x, k) => (k === i ? v : x))); }
  function addTime() { if (nomes.length < 8) setNomes((c) => [...c, '']); }
  function delTime(i) { if (nomes.length > 2) { setNomes((c) => c.filter((_, k) => k !== i)); setAtrib((c) => c.filter((_, k) => k !== i)); } }
  function addConv() { const v = convInput.trim(); if (v) { setConvidados((c) => [...c, v]); setConvInput(''); } }

  async function criar(modo) {
    setCriando(true);
    try {
      const nomesLimpos = nomes.map((x, i) => x.trim() || `Time ${i + 1}`);
      let body;
      if (modo === 'sorteio') {
        body = { nome: nome.trim(), formato, modo: 'sorteio', num_times: nomes.length, nomes: nomesLimpos, convidados };
      } else {
        body = { nome: nome.trim(), formato, modo: 'manual', nomes: nomesLimpos };
        if (totalAtrib > 0) {
          body.plantel = atribSafe.map((arr) => arr.map((k) => poolByKey[k]).filter(Boolean).map((p) => ({ user_id: p.user_id, nome: p.nome, avatar_url: p.avatar_url, convidado: p.convidado })));
        }
      }
      const r = await apiFetch(`/api/equipas/${slug}/campeonatos`, { method: 'POST', body: JSON.stringify(body) });
      onCriado(r.campeonato);
    } catch (e) {
      setToast({ tipo: 'error', mensagem: e.message });
      setCriando(false);
    }
  }

  const dots = [1, 2, 3, 4].map((s) => <i key={s} className={s <= passo ? 'on' : ''} />);

  return (
    <div className="app-shell">
      <Topbar hud="CRIAR CAMPEONATO" back={`/equipa/${slug}`} />
      <main className="app-main page-reveal" style={{ padding: '12px 14px' }}>
        <div className="camp-steps">{dots}</div>

        {passo === 1 && (
          <>
            <div className="camp-title" style={{ fontSize: 20, textAlign: 'center' }}>NOVO CAMPEONATO</div>
            <p className="muted" style={{ fontSize: 12, textAlign: 'center', margin: '0 0 18px' }}>Um torneio interno — os times são do campeonato; o ranking da equipa fica intocado.</p>
            <label className="lbl-hud" style={{ fontFamily: RAJ, fontSize: 11, fontWeight: 700, letterSpacing: '.12em', color: 'rgba(255,255,255,.5)', textTransform: 'uppercase', display: 'block', margin: '0 0 6px' }}>Nome do campeonato</label>
            <input className="input input--hud" value={nome} maxLength={60} onChange={(e) => setNome(e.target.value)} placeholder="ex.: Copa da Resenha" style={{ width: '100%', fontFamily: RAJ, fontSize: 16, fontWeight: 700 }} />
            <div style={{ marginTop: 22, display: 'grid', gap: 9 }}>
              <button type="button" className="btn hud-corners cta-gold" disabled={!nome.trim()} onClick={() => setPasso(2)}>Continuar</button>
              <button type="button" className="btn btn--ghost btn--sm" onClick={onCancel}>Cancelar</button>
            </div>
          </>
        )}

        {passo === 2 && (
          <>
            <div className="section-title" style={{ marginTop: 2 }}>Escolhe o formato</div>
            <div className={`camp-fopt ${formato === 'pontos' ? 'on' : ''}`} onClick={() => setFormato('pontos')} role="button" tabIndex={0}>
              <div><div className="camp-fopt__t">Pontos corridos</div><div className="camp-fopt__d">Todos contra todos. Vence quem somar mais pontos na tabela.</div></div>
            </div>
            <div className={`camp-fopt ${formato === 'mata' ? 'on' : ''}`} onClick={() => setFormato('mata')} role="button" tabIndex={0}>
              <div><div className="camp-fopt__t">Mata-mata</div><div className="camp-fopt__d">Eliminatória direta. Quem perde sai; o vencedor avança até à final.</div></div>
            </div>
            <div className="muted" style={{ fontSize: 11, marginTop: 8 }}>Fase de grupos chega na v2.</div>
            <div style={{ marginTop: 18, display: 'grid', gap: 9 }}>
              <button type="button" className="btn hud-corners cta-gold" onClick={() => setPasso(3)}>Continuar</button>
              <button type="button" className="btn btn--ghost btn--sm" onClick={() => setPasso(1)}>Voltar</button>
            </div>
          </>
        )}

        {passo === 3 && (
          <>
            <div className="section-title" style={{ marginTop: 2 }}>Os times do campeonato</div>
            {nomes.map((n, i) => (
              <div key={i} className="camp-slot">
                <span className="camp-tab__dot" style={{ background: ['#d4a017', '#8b5cf6', '#aab4c8', '#c2652e', '#35b6a8', '#d1689e', '#6fae52', '#e08a2e'][i], borderRadius: 2, boxShadow: 'none' }} />
                <input value={n} maxLength={40} onChange={(e) => setNomeT(i, e.target.value)} placeholder={`Time ${i + 1}`} />
                <span className="camp-slot__c">{KITN[i]}</span>
                {nomes.length > 2 ? <button type="button" aria-label="Remover" onClick={() => delTime(i)} style={{ border: 'none', background: 'transparent', color: '#6f6a80', cursor: 'pointer', fontSize: 15 }}>✕</button> : null}
              </div>
            ))}
            {nomes.length < 8 ? <button type="button" onClick={addTime} style={{ fontFamily: RAJ, fontWeight: 700, fontSize: 11, letterSpacing: '.06em', color: '#f0c94a', background: 'rgba(212,160,23,.08)', border: '1px dashed rgba(212,160,23,.5)', padding: '7px 12px', cursor: 'pointer', clipPath: 'polygon(8% 0,92% 0,100% 28%,100% 72%,92% 100%,8% 100%,0 72%,0 28%)' }}>＋ Time</button> : null}

            <div className="section-title" style={{ fontSize: 13 }}>Convidados sem app <span className="muted" style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(só o nome — entram no sorteio)</span></div>
            <div className="row" style={{ marginBottom: 8 }}>
              {convidados.map((c, i) => (
                <span key={i} className="camp-chip camp-chip--roxo" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>{c}<span onClick={() => setConvidados((cur) => cur.filter((_, k) => k !== i))} style={{ cursor: 'pointer' }}>✕</span></span>
              ))}
            </div>
            <div className="row">
              <input className="input input--hud" value={convInput} onChange={(e) => setConvInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addConv())} placeholder="Nome do convidado…" style={{ flex: 1, fontFamily: RAJ }} />
              <button type="button" className="btn btn--purple btn--sm" onClick={addConv}>＋</button>
            </div>

            <div className="cta-gold-glow" style={{ display: 'flex', marginTop: 16 }}>
              <button type="button" className="btn hud-corners cta-gold" style={{ flex: 1 }} disabled={criando} onClick={() => criar('sorteio')}>⚡ Sortear pela cerimónia</button>
            </div>
            <div className="muted" style={{ fontSize: 11, margin: '8px 0 0' }}>…ou monta à mão (nomes acima) e cria direto.</div>
            <div style={{ marginTop: 12, display: 'grid', gap: 9 }}>
              <button type="button" className="btn hud-corners" style={{ border: '1.5px solid rgba(255,255,255,.22)', color: '#c9c2d6', background: 'rgba(255,255,255,.03)' }} disabled={criando} onClick={() => setPasso(4)}>Montar à mão →</button>
              <button type="button" className="btn btn--ghost btn--sm" onClick={() => setPasso(2)}>Voltar</button>
            </div>
          </>
        )}

        {passo === 4 && (
          <>
            <div className="hud-corners" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.10)', padding: '10px 12px', marginBottom: 12 }}>
              <div style={{ fontFamily: RAJ, fontWeight: 800, fontSize: 16, color: '#f0c94a' }}>{nome.trim() || 'Campeonato'}</div>
              <div className="row" style={{ marginTop: 6 }}>
                <span className={`camp-chip ${formato === 'mata' ? 'camp-chip--roxo' : 'camp-chip--gold'}`}>{formato === 'mata' ? 'Mata-mata' : 'Pontos corridos'}</span>
                <span className="camp-chip">{nomes.length} times</span>
                <span className="camp-chip">{totalAtrib > 0 ? `${totalAtrib} jogadores` : 'só nomes'}</span>
              </div>
            </div>

            <ComporTimes nomes={nomes} pool={pool} atrib={atrib} onChangeAtrib={setAtrib} />

            <div style={{ marginTop: 18, display: 'grid', gap: 9 }}>
              <button type="button" className="btn hud-corners cta-gold" disabled={criando} onClick={() => criar('manual')}>{criando ? 'A criar…' : 'Criar campeonato'}</button>
              <button type="button" className="btn btn--ghost btn--sm" onClick={() => setPasso(3)}>Voltar</button>
            </div>
          </>
        )}
      </main>
      {toast ? <Toast mensagem={toast.mensagem} tipo={toast.tipo} onClose={() => setToast(null)} /> : null}
    </div>
  );
}

// Secção "Times & plantéis" — só aparece se algum time tiver jogadores.
function PlanteisSection({ campeonato }) {
  const tem = (campeonato.times || []).some((t) => (t.jogadores || []).length);
  if (!tem) return null;
  return (
    <>
      <div className="section-title">Times &amp; plantéis</div>
      <CampeonatoPlanteis campeonato={campeonato} />
    </>
  );
}

// ============ DETALHE ============
function Detalhe({ slug, id }) {
  const location = useLocation();
  const { team } = useTeam(slug);
  const isAdmin = team?.role === 'admin';
  const [camp, setCamp] = useState(null);
  const [erro, setErro] = useState('');
  const [toast, setToast] = useState(null);
  const [revelar, setRevelar] = useState(() => !!location.state?.cerimonia);

  useEffect(() => {
    let ativo = true;
    apiFetch(`/api/equipas/${slug}/campeonatos/${id}`)
      .then((d) => ativo && setCamp(d.campeonato))
      .catch((e) => ativo && setErro(e.message));
    return () => { ativo = false; };
  }, [slug, id]);

  async function onResultado(cid, pa, pb) {
    try {
      const r = await apiFetch(`/api/equipas/${slug}/campeonatos/${id}/confrontos/${cid}/resultado`, { method: 'POST', body: JSON.stringify({ placar_a: pa, placar_b: pb }) });
      setCamp(r.campeonato);
      if (r.campeonato.estado === 'terminado') setToast({ tipo: 'success', mensagem: 'Temos campeão!' });
    } catch (e) {
      setToast({ tipo: 'error', mensagem: e.message });
    }
  }

  async function terminar() {
    try {
      const r = await apiFetch(`/api/equipas/${slug}/campeonatos/${id}/terminar`, { method: 'POST' });
      setCamp(r.campeonato);
      setToast({ tipo: 'success', mensagem: 'Campeonato terminado.' });
    } catch (e) { setToast({ tipo: 'error', mensagem: e.message }); }
  }

  if (erro) return <div className="app-shell"><Topbar hud="CAMPEONATO" back={`/equipa/${slug}/campeonato`} /><main className="app-main"><div className="alert alert--error hud-corners">{erro}</div></main></div>;
  if (!camp) return <div className="app-shell"><Topbar hud="CAMPEONATO" back={`/equipa/${slug}/campeonato`} /><main className="app-main"><LoadingFutty /></main></div>;

  // Reveal da cerimónia (times sorteados) antes de mostrar o campeonato.
  if (revelar && camp.seed) {
    const resultado = { numTimes: camp.times.length, times: camp.times.map((t) => ({ nome: t.nome, jogadores: t.jogadores })), reservas: [], seed: camp.seed };
    return (
      <div className="app-shell">
        <Topbar hud="SORTEIO DOS TIMES" back={`/equipa/${slug}/campeonato`} />
        <main className="app-main" style={{ padding: 0 }}>
          <CerimoniaSorteio resultado={resultado} aoTerminar={() => setRevelar(false)} />
          <div style={{ textAlign: 'center', padding: 12 }}><button type="button" className="btn btn--ghost btn--sm" onClick={() => setRevelar(false)}>Ver o campeonato →</button></div>
        </main>
      </div>
    );
  }

  const terminado = camp.estado === 'terminado';
  return (
    <div className="app-shell">
      <Topbar hud="CAMPEONATO" back={`/equipa/${slug}/campeonato`} />
      <main className="app-main page-reveal" style={{ padding: '12px 14px' }}>
        <div className="camp-title">{camp.nome}</div>
        <div className="row" style={{ margin: '4px 0 14px' }}>
          <span className={`camp-chip ${camp.formato === 'mata' ? 'camp-chip--roxo' : 'camp-chip--gold'}`}>{camp.formato === 'mata' ? 'Mata-mata' : 'Pontos corridos'}</span>
          <span className={`camp-chip ${terminado ? 'camp-chip--gold' : 'camp-chip--live'}`}>{terminado ? 'Terminado' : 'Em curso'}</span>
          <span className="camp-chip">{camp.times.length} times</span>
        </div>

        {terminado ? <CampeonatoCelebracao campeonato={camp} slug={slug} /> : null}

        {camp.formato === 'pontos' ? (
          <>
            <div className="section-title">{terminado ? 'Classificação final' : 'Classificação'}</div>
            <CampeonatoTabela campeonato={camp} />
            <div className="section-title">Jogos</div>
            <CampeonatoJogos campeonato={camp} admin={isAdmin && !terminado} onResultado={onResultado} />
            {isAdmin && !terminado ? (
              <button type="button" className="btn btn--ghost btn--sm" style={{ marginTop: 16, borderColor: 'var(--danger)', color: '#fda4af' }} onClick={terminar}>Terminar agora (coroa o líder)</button>
            ) : null}
          </>
        ) : (
          <>
            <div className="section-title">Chaveamento</div>
            <CampeonatoBracket campeonato={camp} admin={isAdmin && !terminado} onResultado={onResultado} />
          </>
        )}

        <PlanteisSection campeonato={camp} />
      </main>
      {toast ? <Toast mensagem={toast.mensagem} tipo={toast.tipo} onClose={() => setToast(null)} /> : null}
    </div>
  );
}
