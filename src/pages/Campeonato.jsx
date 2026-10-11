// Futty v2.0 — Campeonato: hub (lista + criar) e detalhe (tabela/
// bracket + lançar resultado + celebração). Modelo N times, Storage no backend.
// Os times de um campeonato vêm do sorteio de um jogo (CriarCampeonato) ou são montados à mão (Wizard): o "sortear direto" saiu.
import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { apiFetch } from '../lib/api';
import { useTeam } from '../hooks/useTeam';
import Topbar from '../components/Topbar';
import LoadingFutty from '../components/LoadingFutty';
import Toast from '../components/Toast';
import Icon from '../components/Icon';
import { contar } from '../utils/plural';
import CriarCampeonato from '../components/CriarCampeonato';
import ComporTimes from '../components/ComporTimes';
import { CONVIDADO_BOTAO, CONVIDADO_CAMPO, CONVIDADO_LINHA_CAMPEONATO, CONVIDADO_TITULO } from '../utils/convidadoSemApp';
import { CampeonatoTabela, CampeonatoJogos, CampeonatoBracket, CampeonatoCelebracao, CampeonatoPlanteis, CampeonatoFinal, CampeonatoDesempate, CampeonatoProximoJogo } from '../components/CampeonatoVistas';
import SeletorDeFormato from '../components/SeletorDeFormato';
import { formatarData } from '../utils/dataHora';
import { MIN_TIMES_DO_FORMATO, nomeDoFormato } from '../utils/formatoCampeonato';
import '../styles/app.css';

// O texto de ajuda do ComporTimes é de quem o usa: este é o do Campeonato.
const AJUDA_DOS_TIMES = 'Toque em um jogador para colocá-lo no time selecionado. Quem sobra não joga (não é reserva). Você pode deixar tudo vazio e criar times só com nome (ex.: 5º A vs 5º B).';

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
  // false = a lista · 'escolha' = de onde vêm os times · 'manual' = o passo a passo à mão (o Painel abre direto nele com ?novo=manual)
  const [params] = useSearchParams();
  const [criar, setCriar] = useState(() => (params.get('novo') === 'manual' ? 'manual' : false));
  const [toast, setToast] = useState(null);

  useEffect(() => {
    let ativo = true;
    apiFetch(`/api/equipas/${slug}/campeonatos`)
      .then((d) => ativo && setLista(d.campeonatos || []))
      .catch((e) => ativo && setToast({ tipo: 'error', mensagem: e.message }));
    return () => { ativo = false; };
  }, [slug]);

  const abrirCriado = (c) => navigate(`/time/${slug}/campeonato/${c.id}`);
  if (criar === 'manual') return <Wizard slug={slug} onCancel={() => setCriar('escolha')} onCriado={abrirCriado} />;
  if (criar === 'escolha') {
    return (
      <div className="app-shell">
        <Topbar hud="CRIAR CAMPEONATO" back="voltar" backFallback={`/time/${slug}?aba=jogos`} />
        <main className="app-main page-reveal" style={{ padding: '12px 14px' }}>
          <CriarCampeonato slug={slug} team={team} aoCriado={abrirCriado} aoMontarAMao={() => setCriar('manual')} aoCancelar={() => setCriar(false)} />
        </main>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <Topbar hud="CAMPEONATO" back="voltar" backFallback={`/time/${slug}?aba=jogos`} />
      <main className="app-main page-reveal" style={{ padding: '12px 14px' }}>
        <h1 className="camp-title" style={{ fontSize: 22 }}>Campeonatos</h1>
        <p className="muted" style={{ fontSize: 12, margin: '0 0 14px' }}>Torneios internos do time: o ranking fica intocado.</p>

        {lista === null ? <LoadingFutty /> : lista.length === 0 ? (
          <div className="camp-card" style={{ textAlign: 'center', padding: '26px 14px' }}>
            <div style={{ fontFamily: RAJ, fontWeight: 700, fontSize: 16 }}>Ainda sem campeonatos</div>
            <p className="muted" style={{ fontSize: 12, margin: '6px 0 0' }}>{isAdmin ? 'Crie o primeiro: pontos corridos, todos contra todos + final ou mata-mata.' : 'O admin cria o primeiro torneio do time.'}</p>
          </div>
        ) : (
          lista.map((c) => (
            <button key={c.id} type="button" className="camp-card" onClick={() => navigate(`/time/${slug}/campeonato/${c.id}`)} style={{ width: '100%', textAlign: 'left', cursor: 'pointer' }}>
              <div className="camp-card__n">{c.nome}</div>
              <div className="row camp-chips" style={{ marginTop: 6 }}>
                <span className={`camp-chip ${c.formato === 'mata' ? 'camp-chip--roxo' : 'camp-chip--gold'}`}>{nomeDoFormato(c.formato, { curto: true })}</span>
                <span className={`camp-chip ${c.estado === 'terminado' ? 'camp-chip--gold' : 'camp-chip--live'}`}>{c.estado === 'terminado' ? 'Terminado' : 'Em andamento'}</span>
                <span className="camp-chip">{contar(c.n_times, 'time', 'times')}</span>
              </div>
              {c.campeao ? <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#f0c94a', marginTop: 8, fontFamily: RAJ, fontWeight: 700 }}><Icon name="trofeu" size={14} color="#d4a017" /> {c.campeao}</div> : null}
            </button>
          ))
        )}

        {isAdmin ? (
          <div className="cta-gold-glow" style={{ display: 'flex', marginTop: 16 }}>
            <button type="button" className="btn hud-corners cta-gold" style={{ flex: 1 }} onClick={() => setCriar('escolha')}>＋ Criar campeonato</button>
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
  const [atrib, setAtrib] = useState([]); // plantel por time (chaves)
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

  // "Todos contra todos + final" não existe com 2 times: neste formato o ✕ para no terceiro.
  const minTimes = MIN_TIMES_DO_FORMATO[formato] || 2;

  function setNomeT(i, v) { setNomes((cur) => cur.map((x, k) => (k === i ? v : x))); }
  function addTime() { if (nomes.length < 8) setNomes((c) => [...c, '']); }
  function delTime(i) { if (nomes.length > minTimes) { setNomes((c) => c.filter((_, k) => k !== i)); setAtrib((c) => c.filter((_, k) => k !== i)); } }
  function addConv() { const v = convInput.trim(); if (v) { setConvidados((c) => [...c, v]); setConvInput(''); } }

  async function criar() {
    setCriando(true);
    try {
      const nomesLimpos = nomes.map((x, i) => x.trim() || `Time ${i + 1}`);
      const body = { nome: nome.trim(), formato, modo: 'manual', nomes: nomesLimpos };
      if (totalAtrib > 0) {
        body.plantel = atribSafe.map((arr) => arr.map((k) => poolByKey[k]).filter(Boolean).map((p) => ({ user_id: p.user_id, nome: p.nome, avatar_url: p.avatar_url, convidado: p.convidado })));
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
      <Topbar hud="CRIAR CAMPEONATO" back="voltar" backFallback={`/time/${slug}?aba=jogos`} />
      <main className="app-main page-reveal" style={{ padding: '12px 14px' }}>
        <div className="camp-steps">{dots}</div>

        {passo === 1 && (
          <>
            <div className="camp-title" style={{ fontSize: 20, textAlign: 'center' }}>NOVO CAMPEONATO</div>
            <p className="muted" style={{ fontSize: 12, textAlign: 'center', margin: '0 0 18px' }}>Um torneio interno: os times são do campeonato; o ranking do time fica intocado.</p>
            <label className="lbl-hud" style={{ fontFamily: RAJ, fontSize: 11, fontWeight: 700, letterSpacing: '.12em', color: 'rgba(255,255,255,.5)', textTransform: 'uppercase', display: 'block', margin: '0 0 6px' }}>Nome do campeonato</label>
            <input className="input input--hud" value={nome} maxLength={60} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Copa da Resenha" style={{ width: '100%', fontFamily: RAJ, fontSize: 16, fontWeight: 700 }} />
            <div style={{ marginTop: 22, display: 'grid', gap: 9 }}>
              <button type="button" className="btn hud-corners cta-gold" disabled={!nome.trim()} onClick={() => setPasso(2)}>Continuar</button>
              <button type="button" className="btn btn--ghost btn--sm" onClick={onCancel}>Cancelar</button>
            </div>
          </>
        )}

        {passo === 2 && (
          <>
            <div className="section-title" style={{ marginTop: 2 }}>Escolha o formato</div>
            <SeletorDeFormato valor={formato} onChange={setFormato} nTimes={nomes.length} />
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
                {nomes.length > minTimes ? <button type="button" aria-label="Remover" onClick={() => delTime(i)} style={{ border: 'none', background: 'transparent', color: '#6f6a80', cursor: 'pointer', fontSize: 15 }}>✕</button> : null}
              </div>
            ))}
            {nomes.length < 8 ? <button type="button" onClick={addTime} style={{ fontFamily: RAJ, fontWeight: 700, fontSize: 11, letterSpacing: '.06em', color: '#f0c94a', background: 'rgba(212,160,23,.08)', border: '1px dashed rgba(212,160,23,.5)', padding: '7px 12px', cursor: 'pointer', clipPath: 'polygon(8% 0,92% 0,100% 28%,100% 72%,92% 100%,8% 100%,0 72%,0 28%)' }}>＋ Time</button> : null}

            {/* Os textos vêm de utils/convidadoSemApp.js, os mesmos do Jogo e do Novo jogo (aqui não há ranking, a linha é a do campeonato). */}
            <div className="section-title" data-convidado-titulo>{CONVIDADO_TITULO}</div>
            <p className="texto-apoio" data-convidado-linha style={{ margin: '2px 0 8px' }}>{CONVIDADO_LINHA_CAMPEONATO}</p>
            <div className="row" style={{ marginBottom: 8 }}>
              {convidados.map((c, i) => (
                <span key={i} className="camp-chip camp-chip--roxo" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>{c}<span onClick={() => setConvidados((cur) => cur.filter((_, k) => k !== i))} style={{ cursor: 'pointer' }}>✕</span></span>
              ))}
            </div>
            <div className="row">
              <input className="input input--hud" value={convInput} onChange={(e) => setConvInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addConv())} placeholder={CONVIDADO_CAMPO} aria-label={CONVIDADO_CAMPO} style={{ flex: 1, fontFamily: RAJ }} />
              <button type="button" className="btn btn--purple btn--sm" onClick={addConv}>{CONVIDADO_BOTAO}</button>
            </div>

            <div className="cta-gold-glow" style={{ display: 'flex', marginTop: 16 }}>
              <button type="button" className="btn hud-corners cta-gold" style={{ flex: 1 }} disabled={criando} onClick={() => setPasso(4)}>Montar à mão →</button>
            </div>
            <div style={{ marginTop: 12, display: 'grid', gap: 9 }}>
              <button type="button" className="btn btn--ghost btn--sm" onClick={() => setPasso(2)}>Voltar</button>
            </div>
          </>
        )}

        {passo === 4 && (
          <>
            <div className="hud-corners" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.10)', padding: '10px 12px', marginBottom: 12 }}>
              <div style={{ fontFamily: RAJ, fontWeight: 800, fontSize: 16, color: '#f0c94a' }}>{nome.trim() || 'Campeonato'}</div>
              <div className="row camp-chips" style={{ marginTop: 6 }}>
                <span className={`camp-chip ${formato === 'mata' ? 'camp-chip--roxo' : 'camp-chip--gold'}`}>{nomeDoFormato(formato)}</span>
                <span className="camp-chip">{contar(nomes.length, 'time', 'times')}</span>
                <span className="camp-chip">{totalAtrib > 0 ? contar(totalAtrib, 'jogador', 'jogadores') : 'só nomes'}</span>
              </div>
            </div>

            <ComporTimes nomes={nomes} pool={pool} atrib={atrib} onChangeAtrib={setAtrib} ajuda={AJUDA_DOS_TIMES} />

            <div style={{ marginTop: 18, display: 'grid', gap: 9 }}>
              <button type="button" className="btn hud-corners cta-gold" disabled={criando} onClick={criar}>{criando ? 'Criando…' : 'Criar campeonato'}</button>
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
      <div className="section-title">Times e elencos</div>
      <CampeonatoPlanteis campeonato={campeonato} />
    </>
  );
}

// ============ DETALHE ============
function Detalhe({ slug, id }) {
  const { team } = useTeam(slug);
  const isAdmin = team?.role === 'admin';
  const [camp, setCamp] = useState(null);
  const [erro, setErro] = useState('');
  const [toast, setToast] = useState(null);
  // O que o admin precisa saber depois de um lançamento (a final que foi refeita): fica na página até ele dispensar, não some em 2 s.
  const [avisos, setAvisos] = useState([]);

  useEffect(() => {
    let ativo = true;
    apiFetch(`/api/equipas/${slug}/campeonatos/${id}`)
      .then((d) => ativo && setCamp(d.campeonato))
      .catch((e) => ativo && setErro(e.message));
    return () => { ativo = false; };
  }, [slug, id]);

  // A final acabou de nascer (o último jogo da fase de grupos foi salvo, ou o admin decidiu o empate da vaga): aviso "Final definida:
  // 1º × 2º" (no topo da janela, onde a pessoa está olhando, e na página até ela dispensar) e a tela rola, devagar, até a final — a não
  // ser que a pessoa já tenha tocado ou rolado por conta própria.
  const [rolarParaFinal, setRolarParaFinal] = useState(0);
  useEffect(() => {
    if (!rolarParaFinal) return undefined;
    let mexeu = false;
    const marca = () => { mexeu = true; };
    const eventos = ['pointerdown', 'touchstart', 'wheel', 'keydown'];
    eventos.forEach((e) => window.addEventListener(e, marca, { passive: true }));
    const espera = setTimeout(() => {
      if (mexeu) return;
      const reduz = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      document.querySelector('.camp-final')?.scrollIntoView({ behavior: reduz ? 'auto' : 'smooth', block: 'center' });
    }, 700);
    return () => { clearTimeout(espera); eventos.forEach((e) => window.removeEventListener(e, marca)); };
  }, [rolarParaFinal]);

  // O que a tela faz com o campeonato que o motor devolveu: guarda, mostra os avisos do motor e, se a final acabou de ser definida,
  // diz qual é e rola até ela.
  function receber(novo, avisosDoMotor = []) {
    const finalDe = (c) => (c?.confrontos || []).find((x) => x.fase === 'final');
    const antes = finalDe(camp);
    const depois = finalDe(novo);
    const definida = novo.formato === 'pontos_final' && antes && !antes.time_a_id && depois?.time_a_id;
    setCamp(novo);
    if (definida) {
      const nome = (tid) => novo.times.find((t) => t.id === tid)?.nome || '—';
      const frase = `Final definida: ${nome(depois.time_a_id)} × ${nome(depois.time_b_id)}`;
      setAvisos([frase, ...avisosDoMotor]);
      // O quadro da página fica lá no alto: quem está na lista de jogos, lá embaixo, só o veria rolando de volta. O aviso na janela é o que ele vê.
      setToast({ tipo: 'success', mensagem: frase, posicao: 'topo' });
      setRolarParaFinal((n) => n + 1);
    } else {
      setAvisos(avisosDoMotor);
    }
  }

  // Devolve se o placar foi aceito: o editor de correção só fecha quando foi. `penaltisVencedorId`: o empate de uma decisão (final ou
  // mata-mata) vai com o vencedor dos pênaltis; o placar segue como digitado.
  async function onResultado(cid, pa, pb, penaltisVencedorId = null) {
    try {
      const jaTinhaCampeao = camp.estado === 'terminado';
      const corpo = { placar_a: pa, placar_b: pb, ...(penaltisVencedorId ? { penaltis_vencedor_id: penaltisVencedorId } : {}) };
      const r = await apiFetch(`/api/equipas/${slug}/campeonatos/${id}/confrontos/${cid}/resultado`, { method: 'POST', body: JSON.stringify(corpo) });
      receber(r.campeonato, r.avisos || []);
      // O aviso do campeão sobe para o topo: no meio da tela ele cobria os botões de compartilhar.
      if (r.campeonato.estado === 'terminado') setToast({ tipo: 'success', mensagem: jaTinhaCampeao ? 'Final corrigida.' : 'Temos campeão!', posicao: 'topo' });
      return true;
    } catch (e) {
      setToast({ tipo: 'error', mensagem: e.message });
      return false;
    }
  }

  async function onEscolherDoEmpate(timeId) {
    try {
      const r = await apiFetch(`/api/equipas/${slug}/campeonatos/${id}/desempate`, { method: 'POST', body: JSON.stringify({ time_id: timeId }) });
      receber(r.campeonato, r.avisos || []);
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

  if (erro) return <div className="app-shell"><Topbar hud="CAMPEONATO" back={`/time/${slug}/campeonato`} /><main className="app-main"><div className="alert alert--error hud-corners">{erro}</div></main></div>;
  if (!camp) return <div className="app-shell"><Topbar hud="CAMPEONATO" back={`/time/${slug}/campeonato`} /><main className="app-main"><LoadingFutty /></main></div>;

  const terminado = camp.estado === 'terminado';
  return (
    <div className="app-shell">
      <Topbar hud="CAMPEONATO" back={`/time/${slug}/campeonato`} />
      <main className="app-main page-reveal" style={{ padding: '12px 14px' }}>
        <div className="camp-title">{camp.nome}</div>
        {camp.origem_data ? <div className="camp-sub" data-subtitulo-do-sorteio>Do sorteio de {formatarData(camp.origem_data, team?.fuso)}</div> : null}
        <div className="row camp-chips" style={{ margin: '4px 0 14px' }}>
          <span className={`camp-chip ${camp.formato === 'mata' ? 'camp-chip--roxo' : 'camp-chip--gold'}`}>{nomeDoFormato(camp.formato)}</span>
          <span className={`camp-chip ${terminado ? 'camp-chip--gold' : 'camp-chip--live'}`}>{terminado ? 'Terminado' : 'Em andamento'}</span>
          <span className="camp-chip">{contar(camp.times.length, 'time', 'times')}</span>
        </div>

        <CampeonatoProximoJogo proximo={camp.proximo_jogo} />

        {avisos.length ? (
          <div className="camp-aviso hud-corners" role="status" data-aviso-da-final>
            <div style={{ flex: 1 }}>{avisos.map((a, i) => <div key={i}>{a}</div>)}</div>
            <button type="button" onClick={() => setAvisos([])}>Entendi</button>
          </div>
        ) : null}

        {terminado ? <CampeonatoCelebracao campeonato={camp} slug={slug} /> : null}

        {camp.formato === 'pontos_final' ? (
          <>
            {!terminado ? <CampeonatoDesempate campeonato={camp} admin={isAdmin} onEscolher={onEscolherDoEmpate} /> : null}
            <div className="section-title">Fase de grupos</div>
            <CampeonatoTabela campeonato={camp} />
            <div className="section-title">Jogos da fase de grupos</div>
            {isAdmin && terminado ? <p className="muted" data-grupos-travados style={{ fontSize: 11, margin: '0 0 8px' }}>A final já foi jogada: os jogos da fase de grupos não podem mais ser corrigidos.</p> : null}
            <CampeonatoJogos campeonato={camp} admin={isAdmin && !terminado} corrigivel onResultado={onResultado} />
            <div className="section-title">Final</div>
            <CampeonatoFinal campeonato={camp} admin={isAdmin} onResultado={onResultado} />
          </>
        ) : camp.formato === 'pontos' ? (
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
            <CampeonatoBracket campeonato={camp} admin={isAdmin} terminado={terminado} onResultado={onResultado} />
          </>
        )}

        <PlanteisSection campeonato={camp} />
      </main>
      {toast ? <Toast mensagem={toast.mensagem} tipo={toast.tipo} posicao={toast.posicao} onClose={() => setToast(null)} /> : null}
    </div>
  );
}
