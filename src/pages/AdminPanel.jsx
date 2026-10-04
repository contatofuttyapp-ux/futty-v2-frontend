// Futty v2.0 — O que o admin faz no time. Rodada 29I, bloco 3 (decisão do dono): ADMIN NÃO É UM LUGAR, é um conjunto de botões a mais
// nas telas que já existem. O painel /admin/<slug>, com 10 seções numa barra lateral que não conversava com o resto do app, acabou;
// nada dele se perdeu, mudou de casa:
//   · Dashboard            → card "Seu time" no Início (pendências + Novo jogo · Sortear · Convidar · Ajustes)
//   · Jogos + Resultados + Campeonato → aba JOGOS da página do time (JogosDoAdmin)
//   · Membros + Convites   → aba ELENCO (ElencoDoAdmin; as ações de cada membro abrem com um toque no nome, sem o "⋯")
//   · Time + Comunicação + Denúncias + Zona de perigo → aba AJUSTES (AjustesDoTime; a zona virou AÇÕES DEFINITIVAS e, na 29R, a única
//     ação dela virou o cartão "Nova temporada de notas")
//   · Estatísticas         → Ranking do time (EstatisticasDoTime), para o admin
// /admin/<slug>?tab=… (link antigo, favorito) continua valendo: leva à aba nova (lib/rotasAntigas.js#caminhoDoAdminAntigo).
// A página do time carrega este arquivo só para quem é admin (lazy): o jogador não paga por ele.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom';
import { MessageSquare, UserX, UserCheck, Lock, LockOpen, Globe, ChevronRight, ShieldCheck, ShieldOff, RotateCcw, UserMinus, Star } from 'lucide-react';
import { apiFetch, apiUpload } from '../lib/api';
import { ORIGEM_DO_SITE } from '../lib/linkDoSite';
import { SEM_NOTA_AINDA, formatDateTime, STATUS_LABELS } from '../utils/format';
import { camposNoCampo, formatarData, formatarDataHora, instanteNoCampo, rabichoDoFuso } from '../utils/dataHora';
import { LABEL_LINHA } from '../utils/posicoes';
import { arredondarMedia, contar, formatarMedia, plural } from '../utils/plural';
import { nomeExibicao } from '../utils/nomeExibicao';
import LoadingFutty from '../components/LoadingFutty';
import PlayerAvatar from '../components/PlayerAvatar';
import EscudoEquipa from '../components/EscudoEquipa';
import EditorEscudo from '../components/EditorEscudo';
import ModeracaoFila from '../components/ModeracaoFila';
import ResultadoModal from '../components/ResultadoModal';
import { inputStyle, lbl, secLbl } from '../components/camposDoAdmin';
import NumberStepper from '../components/NumberStepper';
import RegistarJornada from '../components/RegistarJornada';
import { nomeCampeao } from '../utils/campeonato';
import CampoCidadeLazy from '../components/CampoCidadeLazy';
import { EscolhaPapel, TEXTO_ADMIN_E_POSICAO } from '../components/EscolhaLinhaGol';
import { ARTILHEIRO, DESTAQUE, GOLS, alternarArtilheiro, alternarGols } from '../components/golsEPremios';
import CampoBairro from '../components/CampoBairro';
import { avisoDaCidade } from '../utils/cidades';
import { useBairrosDaCidade } from '../hooks/useBairrosDaCidade';
import { TEXTO_APOIO_BAIRRO, avisoDoBairro } from '../utils/freguesias';
import { EXEMPLO_SOBRE_O_TIME, FALTA_SOBRE_NOS_AJUSTES, MAX_SOBRE_O_TIME, faltaSobre, precisaDeSobre } from '../utils/sobreOTime';
import { linkDoConvite } from '../utils/convite';
import { caminhoDoAdminAntigo } from '../lib/rotasAntigas';
import { separarFuturosPassados } from '../utils/jogosFuturoPassado';
import '../styles/app.css';

// Opções de visibilidade (a "cor de fundo do avatar" saiu — 29I, bloco 3, achado 102: o escudo é UM controle, EditorEscudo).
const VIS_OPCOES = [
  { k: 'privado', icon: Lock, label: 'Privado' },
  { k: 'publico_aprovacao', icon: LockOpen, label: 'Com aprovação' },
  { k: 'publico_aberto', icon: Globe, label: 'Aberto' },
];
// 29H (item 45): os textos de entrada aprovados pelo dono (2-out), os mesmos do Criar time; 29P: "Radar de peladas" (era Explorar).
const VIS_DESC = {
  privado: 'Só entra quem receber o seu link de convite. Não aparece no "Radar de peladas".',
  publico_aprovacao: 'Quem achar o time no "Radar de peladas" pede para entrar. Você aceita ou não.',
  publico_aberto: 'Qualquer um que achar o time no "Radar de peladas" entra na hora.',
};

const CARD = { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.10)', borderRadius: 12 };
// "há 5 h": tempo decorrido, não data de calendário — não tem fuso (29I, achado 83); vale o relógio de quem olha.
function haQuantoTempo(iso) {
  const ts = new Date(iso).getTime();
  if (!Number.isFinite(ts)) return '';
  const diff = Date.now() - ts;
  const min = Math.floor(diff / 60000);
  if (min < 60) return `há ${Math.max(1, min)} min`;
  const h = Math.floor(diff / 3600000);
  if (h < 48) return `há ${h} h`;
  return `há ${Math.floor(diff / 86400000)} dias`;
}
function diasAte(iso) {
  const ms = new Date(iso).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / 86400000));
}

// O rabicho embaixo de um campo de hora (29I, bloco 3): "horário de São Paulo" só para quem está noutro relógio que o do time; vazio
// para quem está no mesmo (quase todo mundo). O rótulo do campo é sempre "Hora do jogo" ou "Hora" — nunca "fuso".
function RabichoDaHora({ fuso, cidade }) {
  const r = rabichoDoFuso(new Date(), fuso, { cidade });
  return r ? <span data-rabicho-hora style={{ fontSize: 11, color: 'var(--text-dim)' }}>{r}</span> : null;
}

// O interruptor da casa (o mesmo desenho de "Mostrar gols").
function Interruptor({ ligado, aoTrocar, rotulo, apoio = null }) {
  return (
    <button type="button" role="switch" aria-checked={ligado} aria-label={rotulo} onClick={() => aoTrocar(!ligado)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '10px 12px', borderRadius: 8, cursor: 'pointer', border: `1px solid ${ligado ? 'var(--neon)' : '#1a1a1a'}`, background: ligado ? 'rgba(139,92,246,0.08)' : '#080808', color: '#fff', textAlign: 'left' }}>
      <span style={{ fontSize: 13, fontWeight: 700 }}>
        {rotulo}
        {apoio ? <span style={{ display: 'block', fontSize: 12, fontWeight: 400, color: 'var(--text-dim)', marginTop: 2 }}>{apoio}</span> : null}
      </span>
      <span style={{ width: 40, height: 22, borderRadius: 999, background: ligado ? 'var(--neon)' : '#333', position: 'relative', flexShrink: 0, transition: 'background 0.15s' }}>
        <span style={{ position: 'absolute', top: 2, left: ligado ? 20 : 2, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'left 0.15s' }} />
      </span>
    </button>
  );
}

// Rótulo de seção da aba (a régua dos SecLabel da página do time).
function Secao({ titulo, id, children, perigo = false }) {
  return (
    <section id={id} style={{ display: 'grid', gap: 10 }}>
      <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 12, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: perigo ? '#fda4af' : 'rgba(255,255,255,0.5)', marginTop: 8 }}>
        {titulo}
      </div>
      {children}
    </section>
  );
}

// Pequeno modal de confirmação reutilizável. Os três modais desta página vão por
// PORTAL para o body (Rodada 8A): fixed dentro do [data-page] animado ancora na
// página, não na tela — ver a nota em LoadingFutty.jsx.
function ConfirmModal({ texto, confirmarLabel = 'Confirmar', perigo = false, confirmarDesabilitado = false, onConfirm, onCancel, children = null }) {
  return createPortal(
    <div className="modal-overlay" role="presentation" onClick={onCancel}>
      <div className="modal-card" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <div className="modal-card__inner">
          <p style={{ fontSize: 15, marginBottom: children ? 12 : 16 }}>{texto}</p>
          {children ? <div style={{ marginBottom: 16 }}>{children}</div> : null}
          <button
            type="button"
            className="btn btn--primary"
            style={{ width: '100%', ...(perigo ? { background: 'var(--danger)', color: '#fff' } : {}) }}
            disabled={confirmarDesabilitado}
            onClick={onConfirm}
          >
            {confirmarLabel}
          </button>
          <button type="button" className="btn btn--ghost btn--sm" style={{ width: '100%', marginTop: 10 }} onClick={onCancel}>
            Cancelar
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ─── TAB: DASHBOARD ──────────────────────────────────────────────────────────
function MetricCard({ valor, label, alerta = false }) {
  return (
    <div style={{ ...CARD, padding: 14, textAlign: 'center' }}>
      <div style={{ fontSize: 28, fontWeight: 900, color: alerta ? 'var(--danger)' : '#fff' }}>{valor}</div>
      <div style={{ fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 2 }}>{label}</div>
    </div>
  );
}

// ─── AJUSTES → AVISAR O TIME ─────────────────────────────────────────────────
// 29I, bloco 3 (dono): "Avisar o time" = push + anúncio na Resenha, num formulário só (eram dois cartões com dois títulos e duas
// mensagens). As duas saídas vêm ligadas; dá para mandar só uma. O push é o aviso que não se desliga no Perfil (é o admin falando).
function AvisarOTime({ slug, showToast }) {
  const [titulo, setTitulo] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [noCelular, setNoCelular] = useState(true);
  const [naResenha, setNaResenha] = useState(true);
  const [busy, setBusy] = useState(false);
  // O celular mostra até 60 + 200 caracteres; só na Resenha cabe mais.
  const maxTitulo = noCelular ? 60 : 80;
  const maxMensagem = noCelular ? 200 : 500;

  async function enviar() {
    if (busy || !titulo.trim() || !mensagem.trim() || (!noCelular && !naResenha)) return;
    setBusy(true);
    const corpo = JSON.stringify({ titulo: titulo.trim().slice(0, maxTitulo), mensagem: mensagem.trim().slice(0, maxMensagem) });
    const feitos = [];
    try {
      if (naResenha) {
        await apiFetch(`/api/feed/equipas/${slug}/anuncio`, { method: 'POST', body: corpo });
        feitos.push('Anúncio publicado na Resenha');
      }
      if (noCelular) {
        const r = await apiFetch(`/api/push/equipas/${slug}/broadcast`, { method: 'POST', body: corpo });
        feitos.push(`Aviso enviado para ${r.enviadas} ${plural(r.enviadas, 'celular', 'celulares')}`);
      }
      setTitulo('');
      setMensagem('');
      showToast(`${feitos.join('. ')}.`);
    } catch (e) {
      showToast(feitos.length ? `${feitos.join('. ')}, mas: ${e.message}` : e.message, 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ ...CARD, padding: 14, display: 'grid', gap: 12 }} data-avisar-o-time>
      <label style={{ display: 'grid', gap: 6 }}>
        <span style={lbl}>Título <span style={{ color: 'var(--text-dim)' }}>({titulo.length}/{maxTitulo})</span></span>
        <input value={titulo} onChange={(e) => setTitulo(e.target.value.slice(0, maxTitulo))} placeholder="Ex.: Jogo confirmado" style={inputStyle} />
      </label>
      <label style={{ display: 'grid', gap: 6 }}>
        <span style={lbl}>Mensagem <span style={{ color: 'var(--text-dim)' }}>({mensagem.length}/{maxMensagem})</span></span>
        <textarea value={mensagem} onChange={(e) => setMensagem(e.target.value.slice(0, maxMensagem))} rows={3} placeholder="Escreva o aviso para o time…" style={{ ...inputStyle, resize: 'vertical' }} />
      </label>
      <Interruptor ligado={noCelular} aoTrocar={setNoCelular} rotulo="Notificar no celular" />
      <Interruptor ligado={naResenha} aoTrocar={setNaResenha} rotulo="Publicar na Resenha" />
      <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>Na Resenha o aviso fica fixado como post oficial do time.</span>
      <button type="button" className="btn btn--purple btn--sm" disabled={busy || !titulo.trim() || !mensagem.trim() || (!noCelular && !naResenha)} onClick={enviar}>
        {busy ? 'Enviando…' : 'Avisar o time'}
      </button>
    </div>
  );
}

// ─── TAB: CAMPEONATO ─────────────────────────────────────────────────────────
function TabCampeonato({ slug, navigate, showToast }) {
  const [data, setData] = useState(undefined); // undefined = loading
  const [criando, setCriando] = useState(false);
  const [nome, setNome] = useState('');
  const [numJornadas, setNumJornadas] = useState(8);
  const [timeA, setTimeA] = useState('Time A');
  const [timeB, setTimeB] = useState('Time B');
  const [busy, setBusy] = useState(false);
  const [confirmTerminar, setConfirmTerminar] = useState(false);

  useEffect(() => {
    let ativo = true;
    apiFetch(`/api/equipas/${slug}/campeonato`)
      .then((d) => ativo && setData(d))
      .catch((e) => ativo && (setData({ campeonato: null }), showToast(e.message, 'error')));
    return () => {
      ativo = false;
    };
  }, [slug, showToast]);

  function recarregar() {
    return apiFetch(`/api/equipas/${slug}/campeonato`)
      .then((d) => setData(d))
      .catch((e) => showToast(e.message, 'error'));
  }

  async function criar() {
    if (busy) return;
    if (!nome.trim()) {
      showToast('Informe o nome do campeonato.', 'error');
      return;
    }
    setBusy(true);
    try {
      await apiFetch(`/api/equipas/${slug}/campeonato`, {
        method: 'POST',
        body: JSON.stringify({ nome: nome.trim(), num_jornadas: Number(numJornadas) || 8, time_a_nome: timeA.trim() || 'Time A', time_b_nome: timeB.trim() || 'Time B' }),
      });
      setCriando(false);
      setNome('');
      await recarregar();
      showToast('Campeonato criado!');
    } catch (e) {
      showToast(e.message, 'error');
    } finally {
      setBusy(false);
    }
  }

  async function terminar() {
    setConfirmTerminar(false);
    setBusy(true);
    try {
      await apiFetch(`/api/campeonato/${data.campeonato.id}/terminar`, { method: 'POST' });
      await recarregar();
      showToast('Campeonato terminado.');
    } catch (e) {
      showToast(e.message, 'error');
    } finally {
      setBusy(false);
    }
  }

  if (data === undefined) return <LoadingFutty />;
  const c = data.campeonato;

  // C) TERMINADO
  if (c && c.estado === 'terminado') {
    return (
      <div style={{ display: 'grid', gap: 14 }}>
        <div style={{ ...CARD, padding: 14, textAlign: 'center' }}>
          <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 18, fontWeight: 800, color: '#d4a017' }}>{c.nome} terminou</div>
          <div style={{ color: '#fff', marginTop: 4 }}>Campeão: <b>{nomeCampeao(c)}</b></div>
        </div>
        <button type="button" className="btn btn--purple btn--sm" onClick={() => setData({ campeonato: null })}>Criar novo campeonato</button>
        <button type="button" className="btn btn--ghost btn--sm" onClick={() => navigate(`/time/${slug}/campeonato`)}>Ver detalhes →</button>
      </div>
    );
  }

  // B) ATIVO
  if (c) {
    return (
      <div style={{ display: 'grid', gap: 14 }}>
        <div style={{ ...CARD, padding: 14 }}>
          <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 16, fontWeight: 800, color: '#fff' }}>{c.nome}</div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 8, color: '#fff', fontWeight: 700 }}>
            <span>{c.time_a_nome}</span>
            <span style={{ color: '#d4a017', fontSize: 18 }}>{c.time_a_pontos}</span>
            <span style={{ color: 'var(--text-dim)' }}>pts vs</span>
            <span style={{ color: '#d4a017', fontSize: 18 }}>{c.time_b_pontos}</span>
            <span>{c.time_b_nome}</span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-dim)', textAlign: 'center', marginTop: 4 }}>Jornada {c.jornadas_jogadas} de {c.num_jornadas}</div>
        </div>

        {c.jornadas_jogadas < c.num_jornadas ? (
          <div style={{ ...CARD, padding: 14 }}>
            <div style={secLbl}>Registrar resultado</div>
            <div style={{ marginTop: 10 }}>
              <RegistarJornada campeonato={c} onSaved={recarregar} showToast={showToast} />
            </div>
          </div>
        ) : null}

        <button type="button" className="btn btn--ghost btn--sm" onClick={() => navigate(`/time/${slug}/campeonato`)}>Ver detalhes →</button>
        <button type="button" className="btn btn--ghost btn--sm" style={{ borderColor: 'var(--danger)', color: '#fda4af' }} disabled={busy} onClick={() => setConfirmTerminar(true)}>
          Terminar campeonato antecipadamente
        </button>

        {confirmTerminar ? (
          <ConfirmModal texto="Terminar o campeonato agora? O campeão é decidido pelos pontos atuais." perigo confirmarLabel="Terminar" onConfirm={terminar} onCancel={() => setConfirmTerminar(false)} />
        ) : null}
      </div>
    );
  }

  // A) SEM CAMPEONATO
  return (
    <div style={{ display: 'grid', gap: 14 }}>
      {criando ? (
        <div style={{ ...CARD, padding: 14, display: 'grid', gap: 12 }}>
          <label style={{ display: 'grid', gap: 6 }}>
            <span style={lbl}>Nome do campeonato</span>
            <input value={nome} onChange={(e) => setNome(e.target.value.slice(0, 80))} placeholder="Ex.: Liga de Verão" style={inputStyle} />
          </label>
          <label style={{ display: 'grid', gap: 6 }}>
            <span style={lbl}>Nº de jornadas</span>
            <input type="number" min="1" value={numJornadas} onChange={(e) => setNumJornadas(e.target.value)} style={inputStyle} />
          </label>
          <div style={{ display: 'flex', gap: 10 }}>
            <label style={{ display: 'grid', gap: 6, flex: 1 }}>
              <span style={lbl}>Nome do Time A</span>
              <input value={timeA} onChange={(e) => setTimeA(e.target.value.slice(0, 40))} style={inputStyle} />
            </label>
            <label style={{ display: 'grid', gap: 6, flex: 1 }}>
              <span style={lbl}>Nome do Time B</span>
              <input value={timeB} onChange={(e) => setTimeB(e.target.value.slice(0, 40))} style={inputStyle} />
            </label>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" className="btn btn--primary btn--sm" disabled={busy} onClick={criar}>Criar</button>
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => setCriando(false)}>Cancelar</button>
          </div>
        </div>
      ) : (
        <button type="button" className="btn btn--purple btn--sm" onClick={() => setCriando(true)}>Criar Campeonato</button>
      )}
    </div>
  );
}

// ─── TAB: EQUIPA ─────────────────────────────────────────────────────────────
function TabEquipa({ slug, team, showToast, onMudou }) {
  const [nome, setNome] = useState(team.nome || '');
  const [localizacao, setLocalizacao] = useState(team.localizacao || '');
  const [cidade, setCidade] = useState(team.cidade || '');
  // Rodada 29B (D): escolha da lista (null enquanto digita), o último texto GUARDADO (só se manda a cidade quando mudou)
  // e o que o motor disse da cidade depois de salvar ({ tipo: 'ok' | 'aviso', texto }).
  const [cidadeEscolha, setCidadeEscolha] = useState(null);
  const [cidadeGuardada, setCidadeGuardada] = useState(team.cidade || '');
  const [avisoCidade, setAvisoCidade] = useState(null);
  // 29H (item 12): o bairro (opcional). `bairroEscolha` = a freguesia da lista (Portugal) com a coordenada; null enquanto digita.
  const [bairro, setBairro] = useState(team.bairro || '');
  const [bairroGuardado, setBairroGuardado] = useState(team.bairro || '');
  const [bairroEscolha, setBairroEscolha] = useState(null);
  const [avisoBairro, setAvisoBairro] = useState(null);
  // 29T (bloco B, achado 157): o bairro é de LISTA (IBGE no Brasil, freguesias em Portugal) — o campo só existe quando a cidade tem lista.
  const bairros = useBairrosDaCidade(cidade, cidadeEscolha);
  // O "Sobre o time" (era "Descrição"): obrigatório no time aberto ao público. `pedindoSobre` = a política que a pessoa tocou sem ter o texto
  // (a pergunta abre, o motor só é chamado com o texto na mão); `sobreRascunho` = o que ela escreve na pergunta.
  const [descricao, setDescricao] = useState(team.descricao || '');
  const [pedindoSobre, setPedindoSobre] = useState(null);
  const [sobreRascunho, setSobreRascunho] = useState('');
  const [logoUrl, setLogoUrl] = useState(team.logo_url || null);
  const [previewLogo, setPreviewLogo] = useState(null);
  const [modo, setModo] = useState(team.modo_visibilidade || 'privado');
  const [mostrarGols, setMostrarGols] = useState(team.mostrar_gols !== false);
  // 29H (item 44): "Artilheiro do dia" / "Destaque do dia" — ligados, o editor de resultado oferece a seção.
  // 29I (achado 78): o artilheiro depende dos gols — com os gols desligados ele aparece desligado (um time antigo que ficou com a
  // combinação incoerente é mostrado como o motor a trata: sem artilheiro).
  const [mostrarArtilheiro, setMostrarArtilheiro] = useState(team.mostrar_gols !== false && team.mostrar_artilheiro !== false);
  const [mostrarDestaque, setMostrarDestaque] = useState(team.mostrar_destaque !== false);
  const [joga, setJoga] = useState(team.joga !== false); // Rodada 29B (E): "Eu jogo" / "Só organizo o time"
  const [jogaOcupado, setJogaOcupado] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  // Achado 118 (29J): sem isto não havia volta — quem subisse um logo errado ficava preso, e o
  // editor de escudo (864 combinações) ficava inalcançável em qualquer time com logo.
  const [removendoLogo, setRemovendoLogo] = useState(false);
  const [confirmRemoverLogo, setConfirmRemoverLogo] = useState(false);
  const logoInputRef = useRef(null);
  const [saving, setSaving] = useState(false);
  // Item 68 (Rodada 29): jogadores por time é UM padrão do time — o "Novo jogo" já vem com ele. Grava sozinho, um instante depois do
  // último toque no seletor (sem um pedido por toque); sem a migração 079 o motor diz "ainda não está disponível" e o número volta.
  const [porTime, setPorTime] = useState(team.jogadores_por_time || 5);
  const porTimeTimer = useRef(null);
  useEffect(() => () => clearTimeout(porTimeTimer.current), []);
  function mudarPorTime(n) {
    setPorTime(n);
    clearTimeout(porTimeTimer.current);
    porTimeTimer.current = setTimeout(async () => {
      try {
        await apiFetch(`/api/teams/${slug}`, { method: 'PATCH', body: JSON.stringify({ jogadores_por_time: Number(n) }) });
        showToast(`Padrão do time: ${n} por time.`);
        onMudou?.();
      } catch (err) {
        setPorTime(team.jogadores_por_time || 5);
        showToast(err.message, 'error');
      }
    }, 700);
  }

  // Carrega o logo escolhido (preview imediato) e envia para o backend.
  async function aoEscolherLogo(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setPreviewLogo(URL.createObjectURL(file));
    setUploadingLogo(true);
    try {
      const { logo_url } = await apiUpload(`/api/teams/${slug}/logo`, file, 'logo');
      setLogoUrl(logo_url);
      showToast('Logo atualizado.');
    } catch (err) {
      setPreviewLogo(null);
      showToast(err.message, 'error');
    } finally {
      setUploadingLogo(false);
    }
  }

  // Achado 118 (29J): remove o logo — o escudo do time (EditorEscudo) volta a aparecer.
  async function removerLogo() {
    setConfirmRemoverLogo(false);
    setRemovendoLogo(true);
    try {
      await apiFetch(`/api/teams/${slug}/logo`, { method: 'DELETE' });
      setLogoUrl(null);
      setPreviewLogo(null);
      showToast('Logo removido. O escudo do time volta a aparecer.');
      onMudou?.();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setRemovendoLogo(false);
    }
  }

  // Modo de visibilidade (guarda logo ao selecionar; reverte em erro).
  // 29T (achado 157): tornar o time aberto ao público sem "Sobre o time" pede o texto ANTES de salvar (a pergunta abaixo); com ele, o texto vai junto
  // no mesmo pedido, então um time público nunca fica sem apresentação no motor.
  async function guardarModo(novoModo, sobreNovo = null) {
    const sobre = sobreNovo ?? descricao;
    if (faltaSobre({ modo: novoModo, sobre })) {
      setSobreRascunho('');
      setPedindoSobre(novoModo);
      return;
    }
    const anterior = modo;
    setModo(novoModo);
    const corpo = { modo_visibilidade: novoModo };
    if (precisaDeSobre(novoModo)) corpo.descricao = sobre.trim().slice(0, MAX_SOBRE_O_TIME);
    try {
      await apiFetch(`/api/teams/${slug}`, { method: 'PATCH', body: JSON.stringify(corpo) });
      if (corpo.descricao !== undefined) setDescricao(corpo.descricao);
      showToast('Visibilidade atualizada.');
    } catch (err) {
      setModo(anterior);
      showToast(err.message, 'error');
    }
  }

  // Meu papel (Rodada 29B, E): guarda logo ao tocar, como a visibilidade; reverte em erro (o motor diz o porquê).
  async function guardarJoga(novo) {
    if (jogaOcupado || novo === joga) return;
    const anterior = joga;
    setJoga(novo);
    setJogaOcupado(true);
    try {
      await apiFetch(`/api/equipas/${slug}/membros/joga`, { method: 'PATCH', body: JSON.stringify({ joga: novo }) });
      showToast(novo ? 'Você voltou a jogar.' : 'Agora você só organiza o time.');
    } catch (err) {
      setJoga(anterior);
      showToast(err.message, 'error');
    } finally {
      setJogaOcupado(false);
    }
  }

  // "Gols de cada um" (29O): desligar leva o artilheiro junto, no mesmo pedido (o motor recusa "gols desligados, artilheiro ligado").
  // Religar os gols NÃO religa o artilheiro: quem decide é a pessoa.
  async function guardarMostrarGols(v) {
    const golsAntes = mostrarGols;
    const artilheiroAntes = mostrarArtilheiro;
    const novo = alternarGols(artilheiroAntes, v);
    const desligaArtilheiroJunto = artilheiroAntes && !novo.mostrarArtilheiro;
    setMostrarGols(novo.mostrarGols);
    setMostrarArtilheiro(novo.mostrarArtilheiro);
    try {
      await apiFetch(`/api/teams/${slug}`, { method: 'PATCH', body: JSON.stringify({ mostrar_gols: v, ...(desligaArtilheiroJunto ? { mostrar_artilheiro: false } : {}) }) });
      showToast(v ? 'Gols de cada um ligados.' : desligaArtilheiroJunto ? 'Gols de cada um desligados. O artilheiro do dia foi desligado junto.' : 'Gols de cada um desligados.');
    } catch (err) {
      setMostrarGols(golsAntes);
      setMostrarArtilheiro(artilheiroAntes);
      showToast(err.message, 'error');
    }
  }

  // Ligar o artilheiro liga os gols junto, no mesmo pedido (o motor recusa "gols desligados, artilheiro ligado").
  async function guardarArtilheiro(v) {
    const golsAntes = mostrarGols;
    const artilheiroAntes = mostrarArtilheiro;
    const novo = alternarArtilheiro(golsAntes, v);
    const ligaGolsJunto = novo.mostrarGols !== golsAntes;
    setMostrarGols(novo.mostrarGols);
    setMostrarArtilheiro(novo.mostrarArtilheiro);
    try {
      await apiFetch(`/api/teams/${slug}`, { method: 'PATCH', body: JSON.stringify({ mostrar_artilheiro: v, ...(ligaGolsJunto ? { mostrar_gols: true } : {}) }) });
      showToast(v ? (ligaGolsJunto ? 'Gols de cada um e artilheiro do dia ligados.' : 'Artilheiro do dia ligado.') : 'Artilheiro do dia desligado.');
    } catch (err) {
      setMostrarGols(golsAntes);
      setMostrarArtilheiro(artilheiroAntes);
      showToast(err.message, 'error');
    }
  }

  async function guardarDestaque(v) {
    const anterior = mostrarDestaque;
    setMostrarDestaque(v);
    try {
      await apiFetch(`/api/teams/${slug}`, { method: 'PATCH', body: JSON.stringify({ mostrar_destaque: v }) });
      showToast(v ? 'Destaque do dia ligado.' : 'Destaque do dia desligado.');
    } catch (err) {
      setMostrarDestaque(anterior);
      showToast(err.message, 'error');
    }
  }

  async function guardar() {
    if (saving) return;
    // 29T (achado 157): time aberto ao público se apresenta — sem o "Sobre o time" não salva.
    if (faltaSobre({ modo, sobre: descricao })) {
      showToast(FALTA_SOBRE_NOS_AJUSTES, 'error');
      return;
    }
    setSaving(true);
    try {
      // Rodada 29B (D): a cidade só vai no corpo quando MUDOU (antes ia a cada "Salvar" e geocodificava de novo).
      // Da lista: o pacote todo (o motor usa a coordenada da lista); digitada: só o texto; vazia: sai da busca.
      const corpo = { nome: nome.trim(), localizacao: localizacao.trim(), descricao: descricao.trim() };
      const mudouCidade = cidade.trim() !== cidadeGuardada.trim();
      if (mudouCidade) Object.assign(corpo, cidade.trim() ? (cidadeEscolha || { cidade: cidade.trim() }) : { cidade: '' });
      // 29H (item 12), 29T (achado 157): o bairro vai quando mudou, e SÓ o da lista (leva a coordenada). Apagado, sai ('' — também quando a CIDADE
      // mudou: o bairro é da cidade antiga e o campo foi limpo). Texto que ninguém escolheu não vai; o bairro antigo escrito à mão fica como está.
      const textoDoBairro = bairro.trim();
      const bairroDaLista = textoDoBairro && bairroEscolha && bairroEscolha.bairro === textoDoBairro ? bairroEscolha : null;
      const mandaBairro = textoDoBairro === '' ? bairroGuardado.trim() !== '' : !!bairroDaLista && textoDoBairro !== bairroGuardado.trim();
      if (mandaBairro) Object.assign(corpo, bairroDaLista || { bairro: '' });
      const r = await apiFetch(`/api/teams/${slug}`, { method: 'PATCH', body: JSON.stringify(corpo) });
      if (mudouCidade) {
        setAvisoCidade(avisoDaCidade(r?.geo, cidade.trim()));
        const guardada = r?.team?.cidade ?? cidade.trim();
        setCidade(guardada || '');
        setCidadeGuardada(guardada || '');
        setCidadeEscolha(null);
      }
      if (mandaBairro) {
        setAvisoBairro(avisoDoBairro(r?.bairro));
        const guardado = r?.team?.bairro ?? bairro.trim();
        setBairro(guardado || '');
        setBairroGuardado(guardado || '');
        setBairroEscolha(null);
      }
      showToast('Time atualizado.');
      onMudou?.();
    } catch (e) {
      showToast(e.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ display: 'grid', gap: 14 }}>
    <div style={{ ...CARD, padding: 14, display: 'grid', gap: 14 }}>
      <div style={{ display: 'grid', gap: 6 }}>
        <span style={lbl}>Você também joga?</span>
        <EscolhaPapel joga={joga} ocupado={jogaOcupado} aoTrocar={guardarJoga} />
        {/* Item 69 (Rodada 29): "admin" e "posição em campo" são coisas separadas. */}
        <p className="texto-apoio" data-texto-admin-posicao style={{ marginTop: 0 }}>{TEXTO_ADMIN_E_POSICAO}</p>
      </div>

      <label style={{ display: 'grid', gap: 6 }}>
        <span style={lbl}>Nome do time</span>
        <input value={nome} onChange={(e) => setNome(e.target.value.slice(0, 60))} style={inputStyle} />
      </label>

      <label style={{ display: 'grid', gap: 6 }}>
        <span style={lbl}>Localização</span>
        <input value={localizacao} onChange={(e) => setLocalizacao(e.target.value.slice(0, 100))} placeholder="Ex.: São Paulo · Campo do Zé" style={inputStyle} />
      </label>

      {/* GEO — opt-in implícito (preencher = consentir). Texto obrigatório junto ao campo.
          O nome da cidade é guardado + mostrado; do ponto guarda-se só o arredondado. */}
      <div style={{ display: 'grid', gap: 6 }}>
        <span style={lbl}>Cidade <span style={{ fontSize: 10, color: 'var(--text-dim)', textTransform: 'none', letterSpacing: 0 }}>· busca por proximidade</span></span>
        <CampoCidadeLazy valor={cidade} aoMudar={(texto, escolha) => { if (texto !== cidade) { setBairro(''); setBairroEscolha(null); } setCidade(texto); setCidadeEscolha(escolha); setAvisoCidade(null); }} placeholder="Ex.: Brasília" className="" style={inputStyle} />
        {avisoCidade ? (
          <span role="status" data-aviso-cidade={avisoCidade.tipo} style={{ fontSize: 12, lineHeight: 1.5, color: avisoCidade.tipo === 'ok' ? '#7bd88f' : '#f0c94a' }}>{avisoCidade.texto}</span>
        ) : null}
        <span style={{ fontSize: 11, color: 'var(--text-dim)', lineHeight: 1.5 }}>
          Aparece na busca por proximidade. O endereço exato nunca é mostrado, só a zona aproximada. Apague para sair da busca por distância.
        </span>
      </div>

      {/* 29H (item 12), 29T (achado 157): o bairro, opcional, é de LISTA — os do IBGE no Brasil, as freguesias em Portugal — e põe o time no ponto do
          bairro (e não no centro da cidade). Cidade sem bairros na lista: o campo não aparece; o bairro antigo escrito à mão fica salvo até alguém editar. */}
      {bairros.estado === 'lista' ? (
        <div style={{ display: 'grid', gap: 6 }}>
          <span style={lbl}>Bairro <span style={{ fontSize: 10, color: 'var(--text-dim)', textTransform: 'none', letterSpacing: 0 }}>· opcional</span></span>
          <CampoBairro
            key={bairros.chave}
            valor={bairro}
            aoMudar={(texto, escolha) => { setBairro(texto); setBairroEscolha(escolha); setAvisoBairro(null); }}
            itens={bairros.itens}
            className=""
            style={inputStyle}
          />
          {avisoBairro ? (
            <span role="status" data-aviso-bairro={avisoBairro.tipo} style={{ fontSize: 12, lineHeight: 1.5, color: avisoBairro.tipo === 'ok' ? '#7bd88f' : '#f0c94a' }}>{avisoBairro.texto}</span>
          ) : null}
          <span style={{ fontSize: 11, color: 'var(--text-dim)', lineHeight: 1.5 }}>{TEXTO_APOIO_BAIRRO}</span>
        </div>
      ) : null}

      {/* 29T (achado 157): era "Descrição". É o que o time diz de si no Radar de peladas; obrigatório no time aberto ao público. */}
      <label style={{ display: 'grid', gap: 6 }}>
        <span style={lbl}>Sobre o time</span>
        <textarea data-sobre-o-time value={descricao} onChange={(e) => setDescricao(e.target.value.slice(0, MAX_SOBRE_O_TIME))} rows={3} maxLength={MAX_SOBRE_O_TIME} placeholder={EXEMPLO_SOBRE_O_TIME} style={{ ...inputStyle, resize: 'vertical' }} />
        <span style={{ fontSize: 11, color: 'var(--text-dim)', lineHeight: 1.5 }}>{descricao.length}/{MAX_SOBRE_O_TIME}</span>
      </label>

      {/* LOGO */}
      <div style={{ display: 'grid', gap: 8 }}>
        <span style={lbl}>Logo</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <EscudoEquipa team={{ ...team, nome, logo_url: previewLogo || logoUrl }} size={64} />
          <div style={{ display: 'grid', gap: 6 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                disabled={uploadingLogo || removendoLogo}
                onClick={() => logoInputRef.current?.click()}
              >
                {uploadingLogo ? 'Carregando…' : 'Enviar logo'}
              </button>
              {previewLogo || logoUrl ? (
                <button
                  type="button"
                  className="btn btn--ghost btn--sm"
                  disabled={uploadingLogo || removendoLogo}
                  onClick={() => setConfirmRemoverLogo(true)}
                >
                  {removendoLogo ? 'Removendo…' : 'Remover logo'}
                </button>
              ) : null}
            </div>
            <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>PNG, JPG ou WEBP · máx 2MB</span>
          </div>
          <input ref={logoInputRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={aoEscolherLogo} style={{ display: 'none' }} />
        </div>
      </div>

      {/* ESCUDO DO TIME (29I, bloco 3): só para o time sem logo — com logo, é o logo que aparece. */}
      {previewLogo || logoUrl ? (
        <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>Com logo, o escudo não aparece: o app mostra o logo em todo lugar.</span>
      ) : (
        <EditorEscudo slug={slug} team={{ ...team, nome }} showToast={showToast} onMudou={() => onMudou?.()} />
      )}

      {/* VISIBILIDADE */}
      <div style={{ display: 'grid', gap: 6 }}>
        <span style={lbl}>Visibilidade</span>
        <div style={{ display: 'flex', gap: 8 }}>
          {VIS_OPCOES.map((o) => {
            const ativa = modo === o.k;
            return (
              <button
                key={o.k}
                type="button"
                aria-pressed={ativa}
                onClick={() => guardarModo(o.k)}
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 3,
                  padding: '8px 12px',
                  borderRadius: 8,
                  cursor: 'pointer',
                  border: `1px solid ${ativa ? 'var(--neon)' : '#1a1a1a'}`,
                  background: ativa ? 'rgba(139,92,246,0.08)' : '#080808',
                  color: '#fff',
                }}
              >
                <o.icon size={15} style={{ flexShrink: 0 }} />
                <span style={{ fontSize: 11, fontWeight: 700 }}>{o.label}</span>
              </button>
            );
          })}
        </div>
        <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>{VIS_DESC[modo]}</span>
      </div>

      {/* GOLS (29O): os mesmos títulos e frases do passo 2 do Criar time (golsEPremios.js). */}
      <Interruptor ligado={mostrarGols} aoTrocar={guardarMostrarGols} rotulo={GOLS.titulo} apoio={GOLS.apoio} />

      {/* PRÊMIOS DO DIA (29O): o editor de resultado só oferece o artilheiro / o destaque quando ligados. */}
      <div style={{ display: 'grid', gap: 8 }}>
        <span style={lbl}>Prêmios do dia</span>
        <Interruptor ligado={mostrarArtilheiro} aoTrocar={guardarArtilheiro} rotulo={ARTILHEIRO.titulo} apoio={ARTILHEIRO.apoio} />
        <Interruptor ligado={mostrarDestaque} aoTrocar={guardarDestaque} rotulo={DESTAQUE.titulo} apoio={DESTAQUE.apoio} />
        <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>Desligado: o editor de resultado não oferece o troféu nem o destaque. O que já foi premiado continua no histórico.</span>
      </div>

      {/* JOGADORES POR TIME (item 68): o padrão do time; cada jogo ainda pode mudar só para ele, no "Novo jogo". */}
      <div style={{ display: 'grid', gap: 6 }} data-padrao-por-time>
        <span style={lbl}>Jogadores por time</span>
        <NumberStepper value={porTime} onChange={mudarPorTime} min={2} max={11} />
        <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>O padrão do time: todo jogo novo já nasce com ele. Dá para mudar só num jogo, na hora de criar.</span>
      </div>

      <button type="button" className="btn btn--primary" style={{ width: '100%' }} disabled={saving} onClick={guardar}>
        {saving ? 'Salvando…' : 'Salvar'}
      </button>
    </div>

    {pedindoSobre ? (
      <ConfirmModal
        texto={'Antes de abrir o time, conte como ele é. É o que quem achar o time no "Radar de peladas" vai ler.'}
        confirmarLabel="Salvar"
        confirmarDesabilitado={!sobreRascunho.trim()}
        onConfirm={() => { const novo = pedindoSobre; const texto = sobreRascunho; setPedindoSobre(null); guardarModo(novo, texto); }}
        onCancel={() => setPedindoSobre(null)}
      >
        <textarea
          data-sobre-o-time-pergunta
          autoFocus
          value={sobreRascunho}
          onChange={(e) => setSobreRascunho(e.target.value.slice(0, MAX_SOBRE_O_TIME))}
          rows={4}
          maxLength={MAX_SOBRE_O_TIME}
          placeholder={EXEMPLO_SOBRE_O_TIME}
          aria-label="Sobre o time"
          style={{ ...inputStyle, width: '100%', resize: 'vertical' }}
        />
      </ConfirmModal>
    ) : null}

    {confirmRemoverLogo ? (
      <ConfirmModal
        texto="Remover o logo do time? O escudo volta a aparecer no lugar."
        confirmarLabel="Remover logo"
        perigo
        onConfirm={removerLogo}
        onCancel={() => setConfirmRemoverLogo(false)}
      />
    ) : null}

    </div>
  );
}

// ─── TAB: MEMBROS ────────────────────────────────────────────────────────────
// Form inline de mensagem push directa a um jogador específico.
function FormMensagem({ slug, membro, showToast, onClose }) {
  const [titulo, setTitulo] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [busy, setBusy] = useState(false);
  const nome = membro.nome_jogador || membro.nome || 'jogador';

  async function enviar() {
    if (busy) return;
    if (!titulo.trim() || !mensagem.trim()) {
      showToast('Preencha o título e a mensagem.', 'error');
      return;
    }
    setBusy(true);
    try {
      await apiFetch(`/api/push/equipas/${slug}/membros/${membro.user_id}/mensagem`, {
        method: 'POST',
        body: JSON.stringify({ titulo: titulo.trim(), mensagem: mensagem.trim() }),
      });
      showToast(`Mensagem enviada a ${nome}.`);
      onClose();
    } catch (e) {
      if (e.status === 404) showToast('Jogador sem notificações ativas.', 'error');
      else showToast(e.message, 'error');
      setBusy(false);
    }
  }

  return (
    <div style={{ marginTop: 10, padding: 12, borderRadius: 10, border: '1px solid #222222', background: '#0c0c0c', display: 'grid', gap: 10 }}>
      <div style={{ fontSize: 12, fontWeight: 800, color: '#fff' }}>
        Enviar mensagem a <span style={{ color: 'var(--neon)' }}>{nome}</span>
      </div>
      <label style={{ display: 'grid', gap: 6 }}>
        <span style={lbl}>Título <span style={{ color: 'var(--text-dim)' }}>({titulo.length}/60)</span></span>
        <input value={titulo} onChange={(e) => setTitulo(e.target.value.slice(0, 60))} placeholder="Ex.: Confirme sua presença" style={inputStyle} />
      </label>
      <label style={{ display: 'grid', gap: 6 }}>
        <span style={lbl}>Mensagem <span style={{ color: 'var(--text-dim)' }}>({mensagem.length}/200)</span></span>
        <textarea value={mensagem} onChange={(e) => setMensagem(e.target.value.slice(0, 200))} rows={3} placeholder="Escreva a mensagem…" style={{ ...inputStyle, resize: 'vertical' }} />
      </label>
      <div style={{ display: 'flex', gap: 8 }}>
        <button type="button" className="btn btn--purple btn--sm" disabled={busy || !titulo.trim() || !mensagem.trim()} onClick={enviar}>
          {busy ? 'Enviando…' : 'Enviar'}
        </button>
        <button type="button" className="btn btn--ghost btn--sm" disabled={busy} onClick={onClose}>
          Cancelar
        </button>
      </div>
    </div>
  );
}

function TabMembros({ slug, meId, showToast }) {
  const [membros, setMembros] = useState(null);
  const [abertoId, setAbertoId] = useState(null); // o membro cujo painel está aberto (29I, bloco 3: um toque no nome)
  const [mensagemAberta, setMensagemAberta] = useState(false);
  const [confirmacao, setConfirmacao] = useState(null);

  useEffect(() => {
    let ativo = true;
    apiFetch(`/api/teams/${slug}/membros`)
      .then((d) => ativo && setMembros(d.membros || []))
      .catch((e) => ativo && (setMembros([]), showToast(e.message, 'error')));
    return () => {
      ativo = false;
    };
  }, [slug, showToast]);

  async function togglePostar(m) {
    const novo = !m.pode_postar;
    setMembros((cur) => cur.map((x) => (x.user_id === m.user_id ? { ...x, pode_postar: novo } : x)));
    try {
      await apiFetch(`/api/teams/${slug}/membros/${m.user_id}`, { method: 'PATCH', body: JSON.stringify({ pode_postar: novo }) });
    } catch (e) {
      setMembros((cur) => cur.map((x) => (x.user_id === m.user_id ? { ...x, pode_postar: !novo } : x)));
      showToast(e.message, 'error');
    }
  }

  async function mudarRole(m, role) {
    try {
      await apiFetch(`/api/teams/${slug}/membros/${m.user_id}`, { method: 'PATCH', body: JSON.stringify({ role }) });
      setMembros((cur) => cur.map((x) => (x.user_id === m.user_id ? { ...x, role } : x)));
      showToast(role === 'admin' ? 'Agora é admin.' : 'Não é mais admin.');
    } catch (e) {
      showToast(e.message, 'error');
    }
  }

  async function remover(m) {
    try {
      await apiFetch(`/api/teams/${slug}/membros/${m.user_id}`, { method: 'DELETE' });
      setMembros((cur) => cur.filter((x) => x.user_id !== m.user_id));
      showToast('Membro removido.');
    } catch (e) {
      showToast(e.message, 'error');
    }
  }

  // Marca/reativa um jogador (optimista). Inactivo = fora do sorteio/ranking.
  async function setAtivo(m, ativo) {
    setMembros((cur) => cur.map((x) => (x.user_id === m.user_id ? { ...x, ativo } : x)));
    try {
      await apiFetch(`/api/teams/${slug}/membros/${m.user_id}/ativo`, { method: 'PATCH', body: JSON.stringify({ ativo }) });
      showToast(ativo ? `${m.nome_jogador || m.nome} reativado.` : `${m.nome_jogador || m.nome} marcado como inativo.`);
    } catch (e) {
      setMembros((cur) => cur.map((x) => (x.user_id === m.user_id ? { ...x, ativo: !ativo } : x)));
      showToast(e.message, 'error');
    }
  }

  async function zerarVotos(m) {
    try {
      const r = await apiFetch(`/api/teams/${slug}/votos/${m.user_id}`, { method: 'DELETE' });
      showToast(`Votos de ${m.nome_jogador || m.nome} zerados${r?.count != null ? ` (${r.count})` : ''}.`);
    } catch (e) {
      showToast(e.message, 'error');
    }
  }

  // Alterna a visibilidade no ranking (optimista).
  async function toggleRanking(m) {
    const visivel = m.visivel_ranking !== false;
    const novo = !visivel;
    setMembros((cur) => cur.map((x) => (x.user_id === m.user_id ? { ...x, visivel_ranking: novo } : x)));
    try {
      await apiFetch(`/api/teams/${slug}/membros/${m.user_id}`, { method: 'PATCH', body: JSON.stringify({ visivel_ranking: novo }) });
    } catch (e) {
      setMembros((cur) => cur.map((x) => (x.user_id === m.user_id ? { ...x, visivel_ranking: visivel } : x)));
      showToast(e.message, 'error');
    }
  }

  // Liga/desliga o goleiro de um membro (optimista) via endpoint dedicado.
  // Rodada 10B: `goleiro` é o campo único (grava categoria) — este botão e o
  // chip do próprio jogador (Equipa.jsx) nunca mais podem discordar.
  async function setGoleiro(m, ligado) {
    if (!!m.goleiro === ligado) return;
    const anterior = !!m.goleiro;
    setMembros((cur) => cur.map((x) => (x.user_id === m.user_id ? { ...x, goleiro: ligado } : x)));
    try {
      await apiFetch(`/api/equipas/${slug}/membros/posicao`, { method: 'PATCH', body: JSON.stringify({ goleiro: ligado, user_id: m.user_id }) });
    } catch (e) {
      setMembros((cur) => cur.map((x) => (x.user_id === m.user_id ? { ...x, goleiro: anterior } : x)));
      showToast(e.message, 'error');
    }
  }

  // Edita a nota interna localmente; grava ao sair do input.
  function setNotaLocal(m, value) {
    setMembros((cur) => cur.map((x) => (x.user_id === m.user_id ? { ...x, nota_interna: value } : x)));
  }
  async function saveNota(m) {
    try {
      await apiFetch(`/api/teams/${slug}/membros/${m.user_id}`, { method: 'PATCH', body: JSON.stringify({ nota_interna: m.nota_interna || null }) });
    } catch (e) {
      showToast(e.message, 'error');
    }
  }

  if (membros === null) return <LoadingFutty />;

  // Activos primeiro, inactivos no fundo (mantém a ordem do servidor dentro de cada grupo).
  const membrosOrdenados = [...membros].sort((a, b) => (a.ativo === false ? 1 : 0) - (b.ativo === false ? 1 : 0));
  // O membro aberto vem SEMPRE da lista viva (os toques no painel mudam a lista, otimista).
  const aberto = abertoId ? membros.find((x) => x.user_id === abertoId) || null : null;
  const pilula = (on, cor = 'var(--neon)') => ({ padding: '7px 12px', borderRadius: 999, fontSize: 12, fontWeight: 800, cursor: 'pointer', border: `1px solid ${on ? cor : '#333'}`, background: on ? 'rgba(139,92,246,0.12)' : 'transparent', color: on ? cor : 'var(--text-dim)' });
  const acao = (perigo = false) => ({ display: 'flex', alignItems: 'center', gap: 10, width: '100%', textAlign: 'left', padding: '12px 4px', border: 'none', borderTop: '1px solid rgba(255,255,255,0.06)', background: 'transparent', color: perigo ? '#fda4af' : '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer' });

  return (
    <div style={{ display: 'grid', gap: 8 }} data-elenco-admin>
      {membrosOrdenados.map((m) => {
        const inativo = m.ativo === false;
        return (
          <button
            key={m.user_id}
            type="button"
            data-membro={m.user_id}
            onClick={() => { setAbertoId(m.user_id); setMensagemAberta(false); }}
            style={{ ...CARD, padding: 12, opacity: inativo ? 0.45 : 1, display: 'flex', gap: 10, alignItems: 'center', width: '100%', textAlign: 'left', cursor: 'pointer', color: '#fff' }}
          >
            <PlayerAvatar nome={nomeExibicao(m)} avatarUrl={m.avatar_url} userId={m.user_id} avatarGenerico={m.avatar_generico} />
            <span style={{ flex: 1, minWidth: 0, display: 'grid', gap: 4 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <span style={{ fontWeight: 700 }}>{nomeExibicao(m)}</span>
                {m.role === 'admin' ? <span style={{ fontSize: 10, fontWeight: 800, color: '#b69cff', border: '1px solid var(--purple)', borderRadius: 999, padding: '2px 6px' }}>ADMIN</span> : null}
                {m.goleiro ? <span style={{ fontSize: 10, fontWeight: 800, color: '#d4a017', border: '1px solid rgba(212,160,23,0.6)', borderRadius: 999, padding: '2px 6px' }}>GOL</span> : null}
                {m.ausente_proximo ? <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--danger)', border: '1px solid var(--danger)', background: 'rgba(248,113,113,0.12)', borderRadius: 999, padding: '2px 6px' }}>Ausente</span> : null}
                {inativo ? <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-dim)', border: '1px solid #444', borderRadius: 999, padding: '2px 6px' }}>Inativo</span> : null}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: 'var(--text-dim)' }}>
                <span style={{ fontWeight: 800, color: m.nota_media == null ? 'var(--text-dim)' : m.nota_media >= 7 ? '#d4a017' : '#fff' }}>{m.nota_media == null ? SEM_NOTA_AINDA : `★ ${m.nota_media.toFixed(1)}`}</span>
                <span style={{ display: 'inline-flex', gap: 4 }} aria-hidden>
                  {Array.from({ length: 5 }).map((_, idx) => {
                    const p = (m.presencas_recentes || [])[idx];
                    return <span key={idx} style={{ width: 8, height: 8, borderRadius: '50%', background: !p ? 'transparent' : p.presente ? '#10b981' : '#ef4444', border: p ? 'none' : '1px solid #444', boxSizing: 'border-box' }} />;
                  })}
                </span>
                {m.taxa_presenca ? <span style={{ fontWeight: 700 }}>{m.taxa_presenca}</span> : null}
              </span>
            </span>
            <ChevronRight size={16} style={{ color: 'var(--text-dim)', flexShrink: 0 }} />
          </button>
        );
      })}

      {/* O painel do membro (folha de baixo): tudo o que o admin faz com ele, num toque. Portal para o body (15-set): fixed dentro do
          [data-page] animado não confia no viewport no WebKit do iPhone (ver LoadingFutty.jsx).
          Achado 124 (29K): overflow hidden + overscroll-behavior contain no véu (sem isso, um arrasto nele encadeia para o body por
          trás, no WebKit — ao fechar a folha, o body fica rolado numa posição que não bate com o conteúdo, "dois terços no topo em
          preto"); o mesmo contain na folha, que já rola por si (overflowY: auto). */}
      {aberto
        ? createPortal(
            <div role="presentation" onClick={() => setAbertoId(null)} style={{ position: 'fixed', inset: 0, zIndex: 120, background: 'rgba(0,0,0,0.72)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', overflow: 'hidden', overscrollBehavior: 'contain' }}>
              <div role="dialog" aria-modal="true" aria-label={nomeExibicao(aberto)} data-painel-membro onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: 560, background: '#0a0a0a', borderTopLeftRadius: 18, borderTopRightRadius: 18, borderTop: '1px solid #1a1a1a', padding: '10px 16px calc(16px + env(safe-area-inset-bottom))', maxHeight: '86vh', overflowY: 'auto', overscrollBehavior: 'contain', boxSizing: 'border-box' }}>
                <div style={{ width: 40, height: 4, borderRadius: 999, background: '#333', margin: '6px auto 12px' }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <PlayerAvatar nome={nomeExibicao(aberto)} avatarUrl={aberto.avatar_url} userId={aberto.user_id} avatarGenerico={aberto.avatar_generico} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 800, color: '#fff' }}>{nomeExibicao(aberto)}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{aberto.email}</div>
                  </div>
                </div>

                {/* Rodada 9/10B: goleiro ou linha, mais nada — o MESMO campo do card do próprio jogador. */}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 14 }}>
                  <button type="button" aria-pressed={!!aberto.goleiro} onClick={() => setGoleiro(aberto, !aberto.goleiro)} style={pilula(!!aberto.goleiro, '#d4a017')}>Goleiro</button>
                  {aberto.goleiro ? null : <span style={{ fontSize: 11, color: 'var(--text-dim)', alignSelf: 'center' }}>{LABEL_LINHA}</span>}
                  <button type="button" aria-pressed={!!aberto.pode_postar} onClick={() => togglePostar(aberto)} style={pilula(!!aberto.pode_postar)}>Pode postar</button>
                  <button type="button" aria-pressed={aberto.visivel_ranking !== false} onClick={() => toggleRanking(aberto)} style={pilula(aberto.visivel_ranking !== false)}>No ranking</button>
                </div>
                {aberto.user_id !== meId && aberto.visivel_ranking === false ? (
                  <input
                    type="text"
                    value={aberto.nota_interna || ''}
                    onChange={(e) => setNotaLocal(aberto, e.target.value.slice(0, 200))}
                    onBlur={() => saveNota(aberto)}
                    placeholder="Razão (só você vê)…"
                    style={{ marginTop: 10, width: '100%', boxSizing: 'border-box', padding: '8px 10px', borderRadius: 8, border: '1px solid #1a1a1a', background: '#0c0c0c', color: '#fff', fontSize: 16 }}
                  />
                ) : null}

                {aberto.user_id !== meId ? (
                  <div style={{ marginTop: 12 }}>
                    <button type="button" style={acao()} onClick={() => setMensagemAberta((v) => !v)}><MessageSquare size={16} /> Mandar mensagem</button>
                    {mensagemAberta ? <FormMensagem slug={slug} membro={aberto} showToast={showToast} onClose={() => setMensagemAberta(false)} /> : null}
                    <button type="button" style={acao()} onClick={() => (aberto.ativo === false ? setAtivo(aberto, true) : setConfirmacao({ tipo: 'inativar', membro: aberto }))}>
                      {aberto.ativo === false ? <><UserCheck size={16} /> Reativar</> : <><UserX size={16} /> Marcar como inativo</>}
                    </button>
                    <button type="button" style={acao()} onClick={() => setConfirmacao({ tipo: aberto.role === 'member' ? 'promover' : 'despromover', membro: aberto })}>
                      {aberto.role === 'member' ? <><ShieldCheck size={16} /> Tornar admin</> : <><ShieldOff size={16} /> Tirar de admin</>}
                    </button>
                    <button type="button" style={acao(true)} onClick={() => setConfirmacao({ tipo: 'zerar-votos', membro: aberto })}><RotateCcw size={16} /> Zerar as notas dele</button>
                    <button type="button" style={acao(true)} onClick={() => setConfirmacao({ tipo: 'remover', membro: aberto })}><UserMinus size={16} /> Remover do time</button>
                  </div>
                ) : null}
              </div>
            </div>,
            document.body
          )
        : null}

      {confirmacao ? (
        <ConfirmModal
          texto={
            confirmacao.tipo === 'remover'
              ? `Remover ${confirmacao.membro.nome_jogador || confirmacao.membro.nome} do time?`
              : confirmacao.tipo === 'promover'
                ? `Tornar ${confirmacao.membro.nome_jogador || confirmacao.membro.nome} admin? Admin organiza o time; a posição em campo não muda.`
                : confirmacao.tipo === 'zerar-votos'
                  ? `Zerar as notas que ${confirmacao.membro.nome_jogador || confirmacao.membro.nome} recebeu?`
                  : confirmacao.tipo === 'inativar'
                    ? `Marcar ${confirmacao.membro.nome_jogador || confirmacao.membro.nome} como inativo? Sai do sorteio e do ranking, mas o histórico fica.`
                    : `Tirar ${confirmacao.membro.nome_jogador || confirmacao.membro.nome} de admin?`
          }
          perigo={confirmacao.tipo === 'remover' || confirmacao.tipo === 'zerar-votos'}
          confirmarLabel={confirmacao.tipo === 'remover' ? 'Remover' : confirmacao.tipo === 'zerar-votos' ? 'Zerar' : confirmacao.tipo === 'inativar' ? 'Marcar inativo' : 'Confirmar'}
          onConfirm={() => {
            const { tipo, membro } = confirmacao;
            setConfirmacao(null);
            if (tipo === 'remover') { setAbertoId(null); remover(membro); } else if (tipo === 'zerar-votos') zerarVotos(membro);
            else if (tipo === 'inativar') setAtivo(membro, false);
            else mudarRole(membro, tipo === 'promover' ? 'admin' : 'member');
          }}
          onCancel={() => setConfirmacao(null)}
        />
      ) : null}
    </div>
  );
}

// ─── TAB: CONVITES ───────────────────────────────────────────────────────────
function TabConvites({ slug, showToast, semBotao = false }) {
  const [convites, setConvites] = useState(null);
  const [gerando, setGerando] = useState(false);
  const [novoLink, setNovoLink] = useState('');
  const [revogar, setRevogar] = useState(null);

  function recarregar() {
    return apiFetch(`/api/teams/${slug}/convites`)
      .then((d) => setConvites(d.convites || []))
      .catch((e) => {
        setConvites([]);
        showToast(e.message, 'error');
      });
  }

  useEffect(() => {
    let ativo = true;
    apiFetch(`/api/teams/${slug}/convites`)
      .then((d) => ativo && setConvites(d.convites || []))
      .catch((e) => ativo && (setConvites([]), showToast(e.message, 'error')));
    return () => {
      ativo = false;
    };
  }, [slug, showToast]);

  // 29H (item 7): o link curto (/c/<código>) quando o motor deu um código; senão o longo.
  function linkDe(token, codigo) {
    return linkDoConvite({ origem: ORIGEM_DO_SITE, token, codigo });
  }

  async function gerar() {
    if (gerando) return;
    setGerando(true);
    try {
      const { token, codigo } = await apiFetch(`/api/teams/${slug}/convite`, { method: 'POST' });
      setNovoLink(linkDe(token, codigo));
      await recarregar();
      showToast('Convite gerado.');
    } catch (e) {
      showToast(e.message, 'error');
    } finally {
      setGerando(false);
    }
  }

  async function copiar(texto) {
    try {
      await navigator.clipboard.writeText(texto);
      showToast('Link copiado.');
    } catch {
      showToast('Não deu para copiar. Copie o link à mão.', 'error');
    }
  }

  async function confirmarRevogar(c) {
    try {
      await apiFetch(`/api/teams/${slug}/convites/${c.id}`, { method: 'DELETE' });
      setConvites((cur) => cur.filter((x) => x.id !== c.id));
      showToast('Convite revogado.');
    } catch (e) {
      showToast(e.message, 'error');
    }
  }

  if (convites === null) return <LoadingFutty />;

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      {semBotao ? null : (
        <button type="button" className="btn btn--primary" style={{ width: '100%' }} disabled={gerando} onClick={gerar}>
          {gerando ? 'Gerando…' : '＋ Gerar novo convite'}
        </button>
      )}

      {novoLink ? (
        <div style={{ ...CARD, padding: 12, borderColor: 'rgba(139,92,246,0.4)' }}>
          <div style={{ fontSize: 11, color: 'var(--neon)', fontWeight: 800, marginBottom: 6 }}>NOVO LINK</div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input readOnly value={novoLink} onFocus={(e) => e.target.select()} style={{ ...inputStyle, flex: 1 }} />
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => copiar(novoLink)}>Copiar</button>
          </div>
        </div>
      ) : null}

      {convites.length === 0 ? (
        <p className="muted" style={{ fontSize: 13, margin: 0 }}>Nenhum link de convite ativo.</p>
      ) : (
        convites.map((c) => (
          <div key={c.id} style={{ ...CARD, padding: 12, display: 'grid', gap: 8 }}>
            <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>
              Criado por <b style={{ color: '#fff' }}>{c.criado_por_nome || 'alguém'}</b> · {haQuantoTempo(c.created_at)}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>Expira em {contar(diasAte(c.expires_at), 'dia', 'dias')}</div>
            <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>
              {c.usos > 0 ? `${c.usos} ${c.usos === 1 ? 'entrou' : 'entraram'} por este link` : 'ninguém entrou ainda'}
            </div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {c.codigo ? linkDe(c.token, c.codigo).replace(/^https?:\/\//, '') : `${linkDe(c.token).slice(0, 20)}…`}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" className="btn btn--ghost btn--sm" onClick={() => copiar(linkDe(c.token, c.codigo))}>Copiar link</button>
              <button type="button" className="btn btn--ghost btn--sm" style={{ borderColor: 'var(--danger)', color: '#fda4af' }} onClick={() => setRevogar(c)}>Revogar</button>
            </div>
          </div>
        ))
      )}

      {revogar ? (
        <ConfirmModal
          texto="Revogar este convite? O link deixa de funcionar."
          perigo
          confirmarLabel="Revogar"
          onConfirm={() => { const c = revogar; setRevogar(null); confirmarRevogar(c); }}
          onCancel={() => setRevogar(null)}
        />
      ) : null}
    </div>
  );
}

// ─── TAB: JOGOS ──────────────────────────────────────────────────────────────
// "sex., 20 de jun. · 22:00" para o prazo do RSVP — no relógio do campo (fuso do time, 29I achado 83).
// 29T (achado 165): com o rabicho, a cidade do time ("horário de Brasília"), não a do fuso.
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
            <span style={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nomeExibicao(u)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Gestão do RSVP de um jogo (admin): abrir / acompanhar / fechar / sortear.
// Rodada 29R (achado 147): `abrirInicial` = a pessoa chegou pela linha "presença ainda não aberta" do Início; o "Abrir presença" deste jogo
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

  // 29R: com a presença carregada (ou o erro dela na tela) o cartão não muda mais de altura; é a hora de rolar até ele. Uma vez só.
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
  const [destaque, setDestaque] = useState(null); // 29R: o jogo que a linha do Início apontou, em destaque por um instante

  // Rodada 29R (achado 147): o parâmetro vale UMA vez. Com a lista na tela (o RSVPAdmin do jogo certo acabou de nascer lendo-o), sai do
  // endereço — achado ou não (jogo cancelado, já passado ou de outro time): voltar e recarregar não reabrem nada.
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

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div>
        <div className="games-label" style={{ margin: 0 }}>Próximos</div>
        {futuros.length === 0 ? (
          <p className="muted" style={{ fontSize: 13, marginTop: 10 }}>Sem jogos futuros.</p>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            {futuros.map((g) => {
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
                    {/* Rodada 29L (achado 139, decisão do dono de 3-out): "Excluir" só existe DEPOIS de cancelar. Cancelar avisa o time e
                        é o primeiro passo; excluir apaga. Antes, os dois ficavam lado a lado, em vermelho, num dedo grosso. O motor só
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
            {passados.map((g) => {
              // "Lançar resultado" só no jogo que aconteceu, foi sorteado e ainda não tem resultado nenhum (era a aba Resultados).
              const cancelado = g.cancelado || g.status === 'cancelado';
              const temResultado = (g.campeao_time_index !== null && g.campeao_time_index !== undefined) || (g.resultado_nivel || 0) > 0;
              const semResultado = !cancelado && g.sorteio_realizado && !temResultado;
              return (
                <div key={g.id} style={{ ...CARD, padding: 12, display: 'flex', alignItems: 'center', gap: 10, opacity: cancelado ? 0.55 : 1 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, color: '#fff' }}>{g.local || 'Jogo'}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>{formatDateTime(g.data, fuso, { cidade: team?.cidade })}</div>
                  </div>
                  {semResultado ? (
                    <button type="button" className="btn btn--purple btn--sm" data-lancar-resultado onClick={() => setLancar(g)}>Lançar resultado</button>
                  ) : (
                    <>
                      <span className={`badge badge--${g.status}`}>{STATUS_LABELS[g.status] || g.status}</span>
                      {temResultado ? <button type="button" className="btn btn--ghost btn--sm" onClick={() => setLancar(g)}>Editar resultado</button> : null}
                      <button type="button" className="btn btn--ghost btn--sm" onClick={() => navigate(`/time/${slug}/jogo/${g.id}`)}>Ver</button>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {editar ? <EditarJogoModal jogo={editar} fuso={fuso} cidade={team?.cidade} onClose={() => setEditar(null)} onSaved={onEditado} showToast={showToast} /> : null}
      {lancar ? <ResultadoModal jogo={lancar} fuso={fuso} cidade={team?.cidade} premios={{ artilheiro: team?.mostrar_artilheiro !== false, destaque: team?.mostrar_destaque !== false }} onClose={() => setLancar(null)} onSaved={onResultado} showToast={showToast} /> : null}

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
  // Data e hora do formulário são as do CAMPO (fuso do time, 29I achado 83): é o que o motor lê ao salvar. Antes vinham do relógio
  // do aparelho — o admin em Lisboa via, e salvava, a hora de Lisboa.
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

// ─── TAB: ESTATÍSTICAS ───────────────────────────────────────────────────────
function BarraProgresso({ valor, max }) {
  const pct = max > 0 ? Math.round((valor / max) * 100) : 0;
  return (
    <div style={{ height: 6, background: '#222', borderRadius: 999, overflow: 'hidden', marginTop: 4 }}>
      <div style={{ width: `${pct}%`, height: '100%', background: 'var(--neon)' }} />
    </div>
  );
}

function TabEstatisticas({ slug, membrosBasicos, showToast }) {
  const [membros, setMembros] = useState(null);
  const [games, setGames] = useState([]);

  useEffect(() => {
    let ativo = true;
    apiFetch(`/api/teams/${slug}/membros`)
      .then((d) => ativo && setMembros(d.membros || []))
      .catch((e) => ativo && (setMembros([]), showToast(e.message, 'error')));
    apiFetch(`/api/teams/${slug}/games`).then((d) => ativo && setGames(d.games || [])).catch(() => {});
    return () => {
      ativo = false;
    };
  }, [slug, showToast]);

  if (membros === null) return <LoadingFutty />;

  const topGols = [...membros].sort((a, b) => (b.gols || 0) - (a.gols || 0)).slice(0, 5);
  const maxGols = topGols[0]?.gols || 0;
  // 29I (achado 104): "Presença" é presença — os jogos em que a pessoa ESTEVE, ordenado por isso (antes listava vitórias).
  const topPresenca = [...membros].sort((a, b) => (b.presencas || 0) - (a.presencas || 0)).slice(0, 5);
  const totalGols = membros.reduce((s, m) => s + (m.gols || 0), 0);
  const jogoMaisConf = [...games].sort((a, b) => (b.confirmados || 0) - (a.confirmados || 0))[0] || null;
  const maisAntigo = [...(membrosBasicos || [])].sort((a, b) => new Date(a.created_at) - new Date(b.created_at))[0] || null;

  return (
    <div style={{ display: 'grid', gap: 18 }}>
      {/* Top Jogadores (por gols) */}
      <div>
        <div className="games-label">Top jogadores</div>
        <div style={{ display: 'grid', gap: 10 }}>
          {topGols.map((m) => (
            <div key={m.user_id} style={{ ...CARD, padding: 12, display: 'flex', gap: 10, alignItems: 'center' }}>
              <PlayerAvatar nome={nomeExibicao(m)} avatarUrl={m.avatar_url} userId={m.user_id} avatarGenerico={m.avatar_generico} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, color: '#fff' }}>{nomeExibicao(m)}</div>
                <BarraProgresso valor={m.gols || 0} max={maxGols} />
                <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 4 }}>
                  <b style={{ color: 'var(--neon)' }}>{m.gols || 0}</b> {plural(m.gols || 0, 'gol', 'gols')} · {contar(m.vitorias || 0, 'vitória', 'vitórias')} · {m.artilharia || 0} artilharia
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Presença (por jogos em que a pessoa esteve) */}
      <div>
        <div className="games-label">Presença</div>
        <div style={{ display: 'grid', gap: 8 }}>
          {topPresenca.map((m) => (
            <div key={m.user_id} style={{ ...CARD, padding: 10, display: 'flex', gap: 10, alignItems: 'center' }}>
              <PlayerAvatar nome={nomeExibicao(m)} avatarUrl={m.avatar_url} userId={m.user_id} avatarGenerico={m.avatar_generico} />
              <div style={{ flex: 1, fontWeight: 700, color: '#fff' }}>{nomeExibicao(m)}</div>
              <div style={{ fontSize: 13, color: 'var(--neon)', fontWeight: 800 }}>{m.presencas || 0} {plural(m.presencas || 0, 'presença', 'presenças')}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Visão geral */}
      <div>
        <div className="games-label">Visão geral</div>
        <div style={{ ...CARD, padding: 14, display: 'grid', gap: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={lbl}>Total de gols</span><b style={{ color: '#fff' }}>{totalGols}</b></div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
            <span style={lbl}>Jogo com mais confirmações</span>
            <b style={{ color: '#fff', textAlign: 'right' }}>{jogoMaisConf ? `${jogoMaisConf.local || 'Jogo'} (${jogoMaisConf.confirmados || 0})` : '-'}</b>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
            <span style={lbl}>Membro mais antigo</span>
            <b style={{ color: '#fff', textAlign: 'right' }}>{maisAntigo ? maisAntigo.nome || maisAntigo.email : '-'}</b>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── TAB: DENÚNCIAS ──────────────────────────────────────────────────────────
function TabDenuncias({ showToast }) {
  const [denuncias, setDenuncias] = useState(null);
  const [confirmar, setConfirmar] = useState(null);

  useEffect(() => {
    let ativo = true;
    apiFetch('/api/feed/denuncias')
      .then((d) => ativo && setDenuncias(d.denuncias || []))
      .catch((e) => ativo && (setDenuncias([]), showToast(e.message, 'error')));
    return () => {
      ativo = false;
    };
  }, [showToast]);

  async function resolver(d, apagar) {
    try {
      await apiFetch(`/api/feed/denuncias/${d.id}/resolver`, { method: 'PATCH', body: JSON.stringify({ apagar_conteudo: apagar }) });
      setDenuncias((cur) => cur.filter((x) => x.id !== d.id));
      showToast(apagar ? 'Conteúdo excluído.' : 'Denúncia resolvida.');
    } catch (e) {
      showToast(e.message, 'error');
    }
  }

  if (denuncias === null) return <LoadingFutty />;
  // Vazia, some: a fila da moderação, logo acima, já diz "Tudo tranquilo por aqui." (dois "vazios" seguidos eram ruído).
  if (denuncias.length === 0) return null;

  const MOTIVO_LABEL = { linguagem_inapropriada: 'Linguagem inapropriada', spam: 'Spam', conteudo_ofensivo: 'Conteúdo ofensivo', outro: 'Outro' };

  return (
    <div style={{ display: 'grid', gap: 10 }}>
      {denuncias.map((d) => (
        <div key={d.id} style={{ ...CARD, padding: 12, display: 'grid', gap: 8 }}>
          <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>
            {d.target_type === 'post' ? 'Post' : 'Comentário'} · <span style={{ color: '#fda4af', fontWeight: 700 }}>{MOTIVO_LABEL[d.motivo] || d.motivo}</span>
          </div>
          {d.conteudo ? (
            <div style={{ fontSize: 13, color: '#fff', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden', background: '#0c0c0c', borderRadius: 8, padding: 8 }}>{d.conteudo}</div>
          ) : <div style={{ fontSize: 12, color: 'var(--text-dim)', fontStyle: 'italic' }}>(conteúdo indisponível)</div>}
          <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>Denunciado por {d.reporter_nome || 'alguém'} · {haQuantoTempo(d.created_at)}</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => resolver(d, false)}>Ignorar</button>
            <button type="button" className="btn btn--ghost btn--sm" style={{ borderColor: 'var(--danger)', color: '#fda4af' }} onClick={() => setConfirmar(d)}>Excluir conteúdo</button>
          </div>
        </div>
      ))}

      {confirmar ? (
        <ConfirmModal
          texto="Excluir o conteúdo denunciado?"
          perigo
          confirmarLabel="Excluir"
          onConfirm={() => { const d = confirmar; setConfirmar(null); resolver(d, true); }}
          onCancel={() => setConfirmar(null)}
        />
      ) : null}
    </div>
  );
}

// ─── AJUSTES → NOTIFICAÇÕES DO ADMIN ─────────────────────────────────────────
// 29I, bloco 3: o admin recebe push quando chega pedido de entrada (o dono pediu) e pode desligar aqui. As outras ficam em Perfil →
// Notificações (é a mesma escolha, guardada na conta).
function NotificacoesDoAdmin({ showToast }) {
  const [prefs, setPrefs] = useState(null);
  useEffect(() => {
    let ativo = true;
    apiFetch('/api/push/preferencias')
      .then((d) => ativo && setPrefs(d))
      .catch(() => ativo && setPrefs({ preferencias: { pedidos: true }, salvavel: false }));
    return () => {
      ativo = false;
    };
  }, []);
  async function trocarPedidos(v) {
    const antes = prefs;
    setPrefs((p) => ({ ...p, preferencias: { ...p.preferencias, pedidos: v } }));
    try {
      await apiFetch('/api/push/preferencias', { method: 'PATCH', body: JSON.stringify({ pedidos: v }) });
    } catch (e) {
      setPrefs(antes);
      showToast(e.message, 'error');
    }
  }
  if (!prefs) return null;
  return (
    <div style={{ ...CARD, padding: 14, display: 'grid', gap: 8 }}>
      <Interruptor ligado={prefs.preferencias?.pedidos !== false} aoTrocar={trocarPedidos} rotulo="Pedidos de entrada" apoio="Um aviso no celular quando alguém pede para entrar no time." />
      <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>As outras notificações ficam em Perfil → Notificações.</span>
    </div>
  );
}

// ─── AJUSTES → NOVA TEMPORADA DE NOTAS ──────────────────────────────────────────
// Rodada 29R (achado 150, dono): era "Pedir para votar de novo", em vermelho dentro de "Ações definitivas" — parecia "excluir a conta".
// Agora é "Nova temporada de notas": cartão próprio, botão dourado da casa. O perigo (zera as notas, sem volta) fica dito só na
// confirmação, que segue vermelha. O motor não mudou: POST pedir-revotacao com zerar: true. (O nome do componente e o data-attribute
// ficaram os de antes: as provas apontam para eles.)
function PedirVotarDeNovo({ slug, showToast }) {
  const [confirmar, setConfirmar] = useState(false);
  const [busy, setBusy] = useState(false);
  async function pedir() {
    setConfirmar(false);
    setBusy(true);
    try {
      await apiFetch(`/api/teams/${slug}/pedir-revotacao`, { method: 'POST', body: JSON.stringify({ zerar: true }) });
      showToast('Nova temporada aberta. O time foi avisado para dar as notas.');
    } catch (e) {
      showToast(e.message, 'error');
    } finally {
      setBusy(false);
    }
  }
  return (
    <div style={{ ...CARD, padding: 14, display: 'grid', gap: 10 }}>
      <button type="button" disabled={busy} onClick={() => setConfirmar(true)} data-pedir-votar-de-novo className="btn hud-corners-s cta-gold" style={{ width: '100%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: "'Rajdhani', sans-serif", letterSpacing: '0.08em', textTransform: 'uppercase' }}>
        <Star size={18} aria-hidden="true" />
        {busy ? 'Abrindo…' : 'Nova temporada de notas'}
      </button>
      <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>Zera as notas e o time avalia todo mundo de novo, do zero.</span>
      {confirmar ? (
        <ConfirmModal
          texto="Começar uma nova temporada? As notas de todo mundo voltam a zero. Não dá para desfazer."
          perigo
          confirmarLabel="Zerar e começar"
          onConfirm={pedir}
          onCancel={() => setConfirmar(false)}
        />
      ) : null}
    </div>
  );
}

// ─── As abas da página do time (Rodada 29I, bloco 3) ─────────────────────────

/** Aba JOGOS do admin: "Novo jogo" é a ação principal (o dourado); recorrentes e campeonato, secundários no topo; depois a lista. */
export function JogosDoAdmin({ slug, team, showToast, navigate, abrirPresencaDe = null, aoUsarAbrirPresenca = null }) {
  const [painel, setPainel] = useState(null); // 'recorrentes' | 'campeonato'
  const [versao, setVersao] = useState(0); // remonta a lista depois de criar os recorrentes
  const alternar = (k) => setPainel((p) => (p === k ? null : k));
  return (
    <div style={{ display: 'grid', gap: 12 }} data-jogos-admin>
      <Link to={`/time/${slug}/jogo/novo`} className="btn hud-corners-s cta-gold" style={{ width: '100%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Rajdhani', sans-serif", letterSpacing: '0.08em', textTransform: 'uppercase', textDecoration: 'none' }}>
        + Novo jogo
      </Link>
      {/* Rodada 29L (achado 140): o par era 50%/50% e "Criar jogos recorrentes" quebrava em duas linhas ao lado de "Criar campeonato" em uma.
          Agora cada botão tem a largura do próprio texto (e divide a sobra), nunca parte o rótulo; se a tela for estreita demais para os
          dois, o segundo desce inteiro para a linha de baixo. */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        <button type="button" className="btn btn--outline btn--sm hud-corners-s" aria-pressed={painel === 'recorrentes'} style={{ flex: '1 1 auto', whiteSpace: 'nowrap' }} onClick={() => alternar('recorrentes')}>Criar jogos recorrentes</button>
        <button type="button" className="btn btn--outline btn--sm hud-corners-s" aria-pressed={painel === 'campeonato'} style={{ flex: '1 1 auto', whiteSpace: 'nowrap' }} onClick={() => alternar('campeonato')}>Criar campeonato</button>
      </div>
      {painel === 'recorrentes' ? (
        <FormRecorrentes slug={slug} fuso={team?.fuso} cidade={team?.cidade} showToast={showToast} onClose={() => setPainel(null)} onCriado={async () => setVersao((v) => v + 1)} />
      ) : null}
      {painel === 'campeonato' ? <TabCampeonato slug={slug} navigate={navigate} showToast={showToast} /> : null}
      <TabJogos key={versao} slug={slug} team={team} showToast={showToast} navigate={navigate} abrirPresencaDe={abrirPresencaDe} aoUsarAbrirPresenca={aoUsarAbrirPresenca} />
    </div>
  );
}

/** Aba ELENCO do admin: 3 números do time no topo (o resto das estatísticas está no Ranking), os membros e os links de convite ativos. */
export function ElencoDoAdmin({ slug, meId, showToast, versaoConvites = 0 }) {
  const [stats, setStats] = useState(null);
  useEffect(() => {
    let ativo = true;
    apiFetch(`/api/teams/${slug}/stats`).then((d) => ativo && setStats(d.stats || {})).catch(() => ativo && setStats({}));
    return () => {
      ativo = false;
    };
  }, [slug]);
  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }} data-tres-numeros>
        {/* Rodada 29L (achado 136): o rótulo concorda com o número ("1 jogo", "1 membro") e a média sem casa decimal quando é inteira ("0", não "0.0"). */}
        <MetricCard valor={stats ? stats.total_jogos ?? 0 : '–'} label={plural(stats?.total_jogos, 'jogo', 'jogos')} />
        <MetricCard valor={stats ? stats.total_membros ?? 0 : '–'} label={plural(stats?.total_membros, 'membro', 'membros')} />
        {/* Achado 101: é a média de CONFIRMADOS por jogo (stats.media_confirmacoes), não de gols. */}
        <MetricCard valor={stats ? formatarMedia(stats.media_confirmacoes ?? 0) : '–'} label={plural(arredondarMedia(stats?.media_confirmacoes), 'confirmado por jogo', 'confirmados por jogo')} />
      </div>
      <TabMembros slug={slug} meId={meId} showToast={showToast} />
      <Secao titulo="Links de convite ativos">
        <TabConvites key={versaoConvites} slug={slug} showToast={showToast} semBotao />
      </Secao>
    </div>
  );
}

/** Aba AJUSTES (só admin): o time, admins, notificações do admin, avisar o time, denúncias e, no fim, a Nova temporada de notas. */
export function AjustesDoTime({ slug, team, members = [], showToast, onMudou }) {
  const admins = members.filter((m) => m.role === 'admin');
  return (
    <div style={{ display: 'grid', gap: 18 }} data-ajustes-do-time>
      <Secao titulo="O time">
        <TabEquipa slug={slug} team={team} showToast={showToast} onMudou={onMudou} />
      </Secao>
      <Secao titulo={`Admins · ${admins.length}`}>
        <div style={{ ...CARD, padding: '4px 12px' }}>
          {admins.map((m, i) => (
            <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderTop: i === 0 ? 'none' : '1px solid rgba(255,255,255,0.06)' }}>
              <PlayerAvatar nome={nomeExibicao(m)} avatarUrl={m.avatar_url} userId={m.id} avatarGenerico={m.avatar_generico} sm />
              <span style={{ fontWeight: 700, color: '#fff' }}>{nomeExibicao(m)}</span>
            </div>
          ))}
        </div>
        <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>Para tornar alguém admin, toque no nome dele no Elenco. {TEXTO_ADMIN_E_POSICAO}</span>
      </Secao>
      <Secao titulo="Notificações do admin">
        <NotificacoesDoAdmin showToast={showToast} />
      </Secao>
      <Secao titulo="Avisar o time">
        <AvisarOTime slug={slug} showToast={showToast} />
      </Secao>
      <Secao titulo="Denúncias" id="denuncias">
        <ModeracaoFila slug={slug} />
        <TabDenuncias showToast={showToast} />
      </Secao>
      {/* 29R: cartão próprio. "Ações definitivas" só tinha esta ação; sem ela a seção ficaria vazia e saiu. */}
      <Secao titulo="Notas do time">
        <PedirVotarDeNovo slug={slug} showToast={showToast} />
      </Secao>
    </div>
  );
}

/** As estatísticas do time, no Ranking (eram a aba Estatísticas do painel). Só o admin vê. */
export function EstatisticasDoTime({ slug, membrosBasicos = [], showToast }) {
  return <TabEstatisticas slug={slug} membrosBasicos={membrosBasicos} showToast={showToast} />;
}

/** /admin/<slug>?tab=… — o endereço antigo (favorito, link no grupo) continua valendo: leva à aba nova da página do time. */
export default function AdminRedireciona() {
  const { slug } = useParams();
  const [searchParams] = useSearchParams();
  return <Navigate to={caminhoDoAdminAntigo(slug, searchParams.get('tab'))} replace />;
}
