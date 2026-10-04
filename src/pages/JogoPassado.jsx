// Futty v2.0 — Jogo passado (/time/:slug/jogo/passado, só admin). Rodada 29S, bloco B (achados 153 e 154).
// Um jogo que já rolou, em quatro passos — Quando foi · Quem jogou · Times · Como terminou — TUDO NO PASSADO. O jogo SÓ É GRAVADO NO FIM
// ("Salvar jogo"): quem desiste no meio não deixa um jogo vazio para trás. Antes, "Continuar → montar" gravava o jogo no primeiro passo.
//
// Cada passo é UMA entrada do histórico (location.state.passo), como no Criar time (achado 80): o Voltar do sistema (Alt+seta, o gesto do Android,
// o swipe do iPhone) e o chevron do topo recuam um passo por vez. O que a pessoa preencheu fica nesta página: voltar a um passo não apaga nada.
//
// "Salvar jogo" grava em sequência (utils/jogoPassado.js#planoDoJogoPassado): POST /api/games (historico: true) → presenças → (com times) times à mão
// → (com resultado) resultado do jogo → (com campeão ou prêmio) resultado do feed. Se um pedido falha no meio, a pessoa fica no passo 4 com o aviso e
// "Tentar de novo" continua de onde parou, sem criar outro jogo (executarPlano guarda o progresso).
// Avisos: presença e times não avisam ninguém. O último pedido avisa o time ("Resultado registrado!"), como hoje quando o admin lança qualquer resultado.
// Fotos e rodada de cerveja ficam de fora: dá para pôr depois, em Ajustes → Jogos.
import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Calendar, Clock, MapPin } from 'lucide-react';
import { apiFetch } from '../lib/api';
import { useTeam } from '../hooks/useTeam';
import { diaDeCalendario, rabichoDoFuso } from '../utils/dataHora';
import { nomesDosTimes, podeSalvarTimes, corpoDosTimes } from '../utils/timesAMao';
import {
  HORA_PADRAO, PASSOS, RESULTADO_VAZIO, TEXTOS, atribuicaoLimpa, executarPlano, instanteDoJogoPassado, jaAconteceu, jogadoresDoResultado,
  membrosQueJogam, planoDoJogoPassado, poolDoJogoPassado, presencasParaGravar, resultadoDoPassado, resumoDoJogoPassado,
} from '../utils/jogoPassado';
import { PREMIOS_VAZIOS } from '../utils/resultadoDoJogo';
import { CONVIDADO_BOTAO, CONVIDADO_CAMPO_PASSADO, CONVIDADO_LINHA_PASSADO, CONVIDADO_TITULO_PASSADO } from '../utils/convidadoSemApp';
import Topbar from '../components/Topbar';
import ComporTimes from '../components/ComporTimes';
import ResultadoEditor from '../components/ResultadoEditor';
import ResultadoModal from '../components/ResultadoModal';
import LoadingFutty from '../components/LoadingFutty';
import '../styles/app.css';

const RAJ = "'Rajdhani', sans-serif";
const CLIP = 'polygon(8px 0, calc(100% - 8px) 0, 100% 8px, 100% calc(100% - 8px), calc(100% - 8px) 100%, 8px 100%, 0 calc(100% - 8px), 0 8px)';
const CLIP_S = 'polygon(5px 0, calc(100% - 5px) 0, 100% 5px, 100% calc(100% - 5px), calc(100% - 5px) 100%, 5px 100%, 0 calc(100% - 5px), 0 5px)';
const CAMPO_GRANDE = { fontFamily: RAJ, fontSize: 18, fontWeight: 600 };
const ROTULO_COM_ICONE = { display: 'flex', alignItems: 'center', gap: 6 };
const VIDRO = { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.10)' };

// O botão da casa, como no Criar time: `cheio` é o dourado (o único da tela), `sec` o discreto.
function Cta({ children, cheio, sec, ...rest }) {
  return (
    <button
      type="button"
      {...rest}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        fontFamily: RAJ, fontWeight: 800, fontSize: 13, letterSpacing: '0.1em', textTransform: 'uppercase',
        padding: '13px 20px', cursor: rest.disabled ? 'not-allowed' : 'pointer', width: '100%', clipPath: CLIP_S,
        color: cheio ? '#1a1408' : sec ? '#c9c2d6' : '#f0c94a',
        background: cheio ? 'linear-gradient(180deg,#f0c94a,#d4a017)' : sec ? 'rgba(255,255,255,0.03)' : 'rgba(30,24,8,0.9)',
        border: cheio ? '1px solid #f4dd6a' : sec ? '1.5px solid rgba(255,255,255,0.25)' : '1.5px solid #d4a017',
        opacity: rest.disabled ? 0.5 : 1,
        ...(rest.style || {}),
      }}
    >
      {children}
    </button>
  );
}

// O que falta para seguir: uma linha curta abaixo do botão apagado.
function Falta({ children }) {
  return <p className="texto-apoio" role="status" data-falta style={{ margin: '8px 0 0', textAlign: 'center' }}>{children}</p>;
}

function TituloDoPasso({ children }) {
  return <h2 data-titulo-do-passo style={{ fontFamily: RAJ, fontWeight: 800, fontSize: 22, lineHeight: 1.15, margin: '4px 0 12px', color: '#fff' }}>{children}</h2>;
}

// A barra dos 4 passos: um segmento por passo (dourado até o atual) com o nome embaixo.
function BarraDePassos({ passo }) {
  return (
    <ol data-barra-de-passos aria-label="Passos do jogo passado" style={{ display: 'flex', gap: 4, listStyle: 'none', padding: 0, margin: '4px 0 18px' }}>
      {PASSOS.map((nome, i) => {
        const n = i + 1;
        const atual = n === passo;
        return (
          <li key={nome} data-passo={n} aria-current={atual ? 'step' : undefined} style={{ flex: 1, minWidth: 0 }}>
            <div style={{ height: 3, background: n <= passo ? 'linear-gradient(90deg,#d4a017,#f0c94a)' : 'rgba(255,255,255,0.10)', boxShadow: atual ? '0 0 8px rgba(212,160,23,0.5)' : 'none', opacity: n < passo ? 0.6 : 1 }} />
            <div style={{ fontFamily: RAJ, fontWeight: atual ? 700 : 600, fontSize: 11, letterSpacing: 0, color: atual ? '#f0c94a' : '#9a8fc0', marginTop: 6, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{nome}</div>
          </li>
        );
      })}
    </ol>
  );
}

export default function JogoPassado() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { team, members } = useTeam(slug);

  // 1 · Quando foi
  const [data, setData] = useState('');
  const [hora, setHora] = useState(HORA_PADRAO); // opcional, já em 20:00 (a hora de uma pelada)
  const [local, setLocal] = useState('');
  const [aviso, setAviso] = useState('');
  // 2 · Quem jogou
  const [presentes, setPresentes] = useState({}); // { [user_id]: { jogou, gr } }
  const [convidados, setConvidados] = useState([]); // [{ id, nome }]
  const [convInput, setConvInput] = useState('');
  const proximoConvidado = useRef(1);
  // 3 · Times
  const [nTimes, setNTimes] = useState(2);
  const [atrib, setAtrib] = useState([]);
  const [usaTimes, setUsaTimes] = useState(false); // "Pular" deixa o jogo sem times
  // 4 · Como terminou
  const [editor, setEditor] = useState(RESULTADO_VAZIO);
  const [premios, setPremios] = useState(PREMIOS_VAZIOS);
  // Salvar: o que já foi gravado fica aqui entre as tentativas ("Tentar de novo" continua de onde parou).
  const progresso = useRef({ gameId: null, feitos: [] });
  const [salvando, setSalvando] = useState(false);
  const [erroAoSalvar, setErroAoSalvar] = useState('');
  const [jogoCriado, setJogoCriado] = useState(false);

  // ── Os passos no histórico (achado 80) ───────────────────────────────────────────────────────────────────────────────────────────
  // `passo` não é um useState: vem da entrada do histórico em que a pessoa está (location.state.passo). Entrada de passo 2 em diante sem data
  // (a entrada sobreviveu a um recarregar, o formulário não) volta ao 1. Com o jogo já criado (um pedido falhou no meio) é sempre o 4: voltar a
  // um passo e mudar quem jogou não mudaria o que já foi gravado.
  const passoDoEndereco = Number(location.state?.passo) || 1;
  const passo = jogoCriado ? 4 : passoDoEndereco >= 2 && !data ? 1 : Math.min(passoDoEndereco, 4);
  /** Vai para o passo `n` como uma entrada nova do histórico (o Voltar do sistema volta ao passo de antes). */
  function irParaPasso(n) {
    navigate(location.pathname, { state: { passo: n } });
  }
  useEffect(() => { window.scrollTo(0, 0); }, [passo]);

  const fuso = team?.fuso;
  const membros = membrosQueJogam(members);
  const pool = poolDoJogoPassado(membros, presentes, convidados);
  const nomes = nomesDosTimes(nTimes);
  const atribLimpa = atribuicaoLimpa(atrib, pool, nTimes);
  const jogaram = pool.length;
  const iso = instanteDoJogoPassado({ data, hora, fuso });

  function marcar(id, parcial) {
    setPresentes((c) => ({ ...c, [id]: { ...c[id], ...parcial } }));
  }
  function alternarJogou(id) {
    const jogou = !presentes[id]?.jogou;
    marcar(id, jogou ? { jogou: true } : { jogou: false, gr: false });
  }
  function adicionarConvidado() {
    const nome = convInput.trim();
    if (!nome) return;
    setConvidados((c) => [...c, { id: proximoConvidado.current++, nome }]);
    setConvInput('');
  }

  function continuarDoPasso1() {
    if (!iso) { setAviso('Confira a data e a hora do jogo.'); return; }
    if (!jaAconteceu(iso)) { setAviso(TEXTOS.naoAconteceu); return; }
    setAviso('');
    irParaPasso(2);
  }

  // O que o passo 4 vai gravar, a partir do que a pessoa preencheu.
  const jogadoresDosGols = usaTimes && nTimes === 2 ? jogadoresDoResultado(nomes, atribLimpa, pool) : [];
  const flags = {
    gols: team?.mostrar_gols !== false,
    artilheiro: team?.mostrar_gols !== false && team?.mostrar_artilheiro !== false, // o troféu faz parte dos gols (golsEPremios.js)
    destaque: team?.mostrar_destaque !== false,
  };
  const comCampeao = usaTimes && nTimes >= 3;
  const timesDoJogo = nomes.map((nome, i) => ({ nome, jogadores: atribLimpa[i].map((k) => pool.find((p) => p.key === k)).filter(Boolean).map((p) => ({ nome: p.nome })) }));
  const quemJogouComConta = pool.filter((p) => p.user_id).map((p) => ({ user_id: p.user_id, nome: p.nome }));
  const algoNoPasso4 = (usaTimes && nTimes === 2) || comCampeao || flags.artilheiro || flags.destaque;

  async function salvar() {
    if (salvando) return;
    setSalvando(true);
    setErroAoSalvar('');
    try {
      const plano = planoDoJogoPassado({
        slug,
        iso,
        local,
        jogadores: presencasParaGravar(membros, presentes),
        times: usaTimes ? corpoDosTimes(nomes, atribLimpa, pool) : null,
        resultado: resultadoDoPassado({ nTimes, usaTimes, editor, premios, jogadores: jogadoresDosGols }),
      });
      const gameId = await executarPlano(plano, progresso.current, apiFetch);
      // replace: o "Voltar" do jogo não leva de volta ao passo 4 (o jogo já está salvo).
      navigate(`/time/${slug}/jogo/${gameId}`, { replace: true });
    } catch (e) {
      setErroAoSalvar(e.message || 'Não deu para salvar o jogo agora.'); // o apiFetch já escreve em português da casa
      setJogoCriado(!!progresso.current.gameId);
      setSalvando(false);
    }
  }

  if (!team) {
    return (
      <div className="app-shell">
        <Topbar hud="JOGO PASSADO" back="voltar" backFallback={`/time/${slug}/jogo/novo`} />
        <main className="app-main page-reveal" style={{ maxWidth: 480 }}><LoadingFutty /></main>
      </div>
    );
  }

  const podeContinuarTimes = podeSalvarTimes(nomes, atribLimpa);
  const tentandoDeNovo = !!erroAoSalvar;
  // O botão "avançar" do navegador pode levar ao passo 4 com um passo anterior desfeito (a pessoa voltou, desmarcou alguém e avançou de novo sem passar
  // pelo "Continuar"). Nada é gravado enquanto isso não for resolvido: o "Salvar jogo" fica apagado e a linha embaixo diz o que falta e onde.
  const pendencia = !iso ? TEXTOS.faltaQuando : !jaAconteceu(iso) ? `${TEXTOS.naoAconteceu} Volte ao primeiro passo.` : jogaram === 0 ? TEXTOS.faltaQuemJogou : usaTimes && !podeContinuarTimes ? TEXTOS.faltaTimes : '';

  return (
    <div className="app-shell">
      {/* O chevron do topo faz o mesmo que o Voltar do sistema: recua um passo (do passo 1, volta ao Marcar jogo). */}
      <Topbar hud="JOGO PASSADO" back="voltar" backFallback={`/time/${slug}/jogo/novo`} />
      <main className="app-main page-reveal" style={{ maxWidth: 480 }} data-jogo-passado-passo={passo}>
        <BarraDePassos passo={passo} />

        {passo === 1 && (
          <>
            <TituloDoPasso>{TEXTOS.quando}</TituloDoPasso>
            <div style={{ ...VIDRO, clipPath: CLIP, padding: '16px 16px 18px', display: 'grid', gap: 14 }}>
              <div style={{ display: 'flex', gap: 12 }}>
                <div className="field" style={{ flex: 1 }}>
                  <label htmlFor="data" style={ROTULO_COM_ICONE}><Calendar size={15} aria-hidden="true" /> Data</label>
                  <input id="data" type="date" className="input input--hud" style={CAMPO_GRANDE} value={data} max={diaDeCalendario(new Date(), fuso)} onChange={(e) => { setData(e.target.value); setAviso(''); }} />
                </div>
                <div className="field" style={{ flex: 1 }}>
                  <label htmlFor="hora" style={ROTULO_COM_ICONE}><Clock size={15} aria-hidden="true" /> Hora do jogo <span className="muted" style={{ fontSize: 11 }}>(opcional)</span></label>
                  <input id="hora" type="time" className="input input--hud" style={CAMPO_GRANDE} value={hora} onChange={(e) => { setHora(e.target.value); setAviso(''); }} />
                  {rabichoDoFuso(new Date(), fuso, { cidade: team?.cidade }) ? (
                    <span className="muted" data-rabicho-hora style={{ fontSize: 11, marginTop: 4 }}>{rabichoDoFuso(new Date(), fuso, { cidade: team?.cidade })}</span>
                  ) : null}
                </div>
              </div>
              <div className="field">
                <label htmlFor="local" style={ROTULO_COM_ICONE}><MapPin size={15} aria-hidden="true" /> Local <span className="muted" style={{ fontSize: 11 }}>(opcional)</span></label>
                <input id="local" className="input input--hud" style={CAMPO_GRANDE} placeholder="Ex.: Campo Municipal" value={local} onChange={(e) => setLocal(e.target.value)} maxLength={120} />
              </div>
            </div>
            {aviso ? <div className="alert alert--error" data-aviso-do-passo style={{ marginTop: 12 }}>{aviso}</div> : null}
            <div style={{ marginTop: 18 }}>
              <Cta cheio disabled={!data} data-continuar onClick={continuarDoPasso1}>{TEXTOS.continuar}</Cta>
            </div>
          </>
        )}

        {passo === 2 && (
          <>
            <TituloDoPasso>{TEXTOS.quemJogou}</TituloDoPasso>
            <p className="texto-apoio" style={{ margin: '0 0 10px' }}>{TEXTOS.quemJogouApoio}</p>
            <div style={{ display: 'grid', gap: 6, marginBottom: 14 }} data-quem-jogou>
              {membros.map((m) => {
                const st = presentes[m.id] || {};
                return (
                  <div key={m.id} className="hud-corners" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', background: st.jogou ? 'rgba(212,160,23,0.06)' : 'rgba(255,255,255,0.02)', border: `1px solid ${st.jogou ? 'rgba(212,160,23,0.35)' : 'rgba(255,255,255,0.08)'}` }}>
                    <label style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', minWidth: 0, minHeight: 28 }}>
                      <input type="checkbox" checked={!!st.jogou} onChange={() => alternarJogou(m.id)} style={{ width: 18, height: 18, accentColor: '#d4a017' }} />
                      <span style={{ fontFamily: RAJ, fontWeight: 700, fontSize: 14, color: st.jogou ? '#fff' : 'var(--text-dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.nome || 'Jogador'}</span>
                    </label>
                    {st.jogou ? (
                      <label className="check-inline" style={{ fontFamily: RAJ, fontSize: 12, flexShrink: 0 }}>
                        <input type="checkbox" checked={!!st.gr} onChange={() => marcar(m.id, { gr: !st.gr })} style={{ accentColor: '#8b5cf6' }} /> GOL
                      </label>
                    ) : null}
                  </div>
                );
              })}
              {membros.length === 0 ? <p className="muted" style={{ fontSize: 12 }}>Sem membros no time.</p> : null}
            </div>

            {/* Convidados sem app (só o nome). Os textos vêm de utils/convidadoSemApp.js, na versão no passado. */}
            <div className="section-title" data-convidado-titulo>{CONVIDADO_TITULO_PASSADO}</div>
            <p className="texto-apoio" data-convidado-linha style={{ margin: '2px 0 8px' }}>{CONVIDADO_LINHA_PASSADO}</p>
            <div className="hud-corners" style={{ padding: '10px 12px', marginBottom: 14, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)' }}>
              {convidados.length ? (
                <div className="chips-row" style={{ marginBottom: 8 }}>
                  {convidados.map((c) => (
                    <span key={c.id} className="chip" style={{ gap: 6 }}>{c.nome}<button type="button" aria-label={`Remover ${c.nome}`} onClick={() => setConvidados((l) => l.filter((x) => x.id !== c.id))} style={{ border: 'none', background: 'none', color: 'inherit', cursor: 'pointer', padding: '4px 2px 4px 8px', fontSize: 12 }}>✕</button></span>
                  ))}
                </div>
              ) : null}
              <div style={{ display: 'flex', gap: 8 }}>
                <input className="input input--hud" value={convInput} maxLength={24} placeholder={CONVIDADO_CAMPO_PASSADO} aria-label={CONVIDADO_CAMPO_PASSADO} onChange={(e) => setConvInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); adicionarConvidado(); } }} style={{ flex: 1, minWidth: 0, fontFamily: RAJ }} />
                <button type="button" className="btn btn--sm btn--outline hud-corners-s" disabled={!convInput.trim()} onClick={adicionarConvidado}>{CONVIDADO_BOTAO}</button>
              </div>
            </div>

            <Cta cheio disabled={jogaram === 0} data-continuar onClick={() => irParaPasso(3)}>{TEXTOS.continuar}</Cta>
            {jogaram === 0 ? <Falta>Marque pelo menos 1 jogador.</Falta> : null}
            <div style={{ marginTop: 9 }}><Cta sec onClick={() => navigate(-1)}>← voltar</Cta></div>
          </>
        )}

        {passo === 3 && (
          <>
            <TituloDoPasso>{TEXTOS.times}</TituloDoPasso>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <span className="muted" style={{ fontSize: 13 }}>Nº de times:</span>
              <div className="chips-row" style={{ margin: 0 }}>
                {[2, 3, 4].map((n) => (
                  <button key={n} type="button" className={`chip ${nTimes === n ? 'chip--active' : ''}`} onClick={() => setNTimes(n)}>{n}</button>
                ))}
              </div>
            </div>
            {/* A MESMA peça do campeonato e do Jogo. O texto de ajuda e o título são nossos: no passado e sem "ex.: 5º A vs 5º B". */}
            <ComporTimes nomes={nomes} pool={pool} atrib={atribLimpa} onChangeAtrib={setAtrib} ajuda={TEXTOS.ajudaDosTimes} opcional={false} titulo={TEXTOS.tituloDosTimes} semJogadores={TEXTOS.semJogadoresNosTimes} />
            <div style={{ marginTop: 18, display: 'grid', gap: 9 }}>
              <Cta cheio disabled={!podeContinuarTimes} data-continuar onClick={() => { setUsaTimes(true); irParaPasso(4); }}>{TEXTOS.continuar}</Cta>
              {!podeContinuarTimes ? <Falta>Cada time precisa de pelo menos 1 jogador.</Falta> : null}
              <Cta sec data-pular onClick={() => { setUsaTimes(false); irParaPasso(4); }}>{TEXTOS.pular}</Cta>
              <Cta sec onClick={() => navigate(-1)}>← voltar</Cta>
            </div>
          </>
        )}

        {passo === 4 && (
          <>
            <TituloDoPasso>{TEXTOS.terminou}</TituloDoPasso>
            <p className="texto-apoio" data-resumo style={{ margin: '0 0 14px' }}>{resumoDoJogoPassado({ iso, comHora: !!hora, fuso, jogaram, nTimes: usaTimes ? nTimes : 0 })}</p>

            {/* Com 2 times: UMA pergunta (quem ganhou), o placar é opcional e os gols de cada um vêm depois — o ResultadoEditor do Jogo, no modo "devolver". */}
            {usaTimes && nTimes === 2 ? (
              <div style={{ marginBottom: 16 }}>
                <ResultadoEditor modo="devolver" nomeA={nomes[0]} nomeB={nomes[1]} jogadores={jogadoresDosGols} comGols={flags.gols} inicial={editor} aoMudar={setEditor} />
              </div>
            ) : null}

            {/* Com 3 ou 4 times, tocar no campeão; depois, o que o time conta (artilheiro, destaque) — o ResultadoModal de Ajustes, no modo "devolver". */}
            {comCampeao || flags.artilheiro || flags.destaque ? (
              <div style={{ marginBottom: 16 }}>
                <ResultadoModal modo="devolver" times={timesDoJogo} confirmados={quemJogouComConta} comCampeao={comCampeao} premios={{ artilheiro: flags.artilheiro, destaque: flags.destaque }} valor={premios} aoMudar={setPremios} />
              </div>
            ) : null}

            {!algoNoPasso4 ? <p className="texto-apoio" data-sem-resultado style={{ margin: '0 0 16px' }}>{TEXTOS.semResultado}</p> : null}

            {erroAoSalvar ? (
              <div className="alert alert--error" role="alert" data-erro-ao-salvar style={{ marginBottom: 12 }}>
                {erroAoSalvar}{' '}
                {jogoCriado ? 'O jogo já foi criado e o que deu certo ficou salvo.' : 'Nada foi salvo ainda.'} Toque em Tentar de novo.
              </div>
            ) : null}
            <div style={{ display: 'grid', gap: 9 }}>
              <Cta cheio disabled={salvando || !!pendencia} data-salvar-jogo onClick={salvar}>{salvando ? TEXTOS.salvando : tentandoDeNovo ? TEXTOS.tentarDeNovo : TEXTOS.salvar}</Cta>
              {pendencia ? <Falta>{pendencia}</Falta> : null}
              {!jogoCriado ? <Cta sec disabled={salvando} onClick={() => navigate(-1)}>← voltar</Cta> : null}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
