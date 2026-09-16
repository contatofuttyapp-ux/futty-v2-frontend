// Futty v2.0 — Início: o cromo, chips de equipas, próximos jogos e publicidade.
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { RefreshCw } from 'lucide-react';
import { apiFetch } from '../lib/api';
import { usePerfil } from '../context/PerfilContext';
import { useInicio } from '../context/InicioContext';
import { useTeams } from '../hooks/useTeam';
import { usePushNotifications } from '../hooks/usePushNotifications';
import { celebrarTop3 } from '../hooks/useConfetti';
import { nomeCampeao } from '../utils/campeonato';
import { formatDateTime, formatRating } from '../utils/format';
import { plural } from '../utils/plural';
import { gerarFigurinhaCanvas, enquadrarAvatar } from '../utils/figurinhaCanvas';
import { lerCromo, gravarCromo } from '../lib/cromoCache';
import { registarFalha, aposPrimeiraPintura, tarefaEmCurso } from '../lib/diagnostico';
import RSVPCard from '../components/RSVPCard';
import TeamAvatar from '../components/TeamAvatar';
import Icon from '../components/Icon';
import Topbar from '../components/Topbar';
import ProductTour from '../components/ProductTour';
import LoadingFutty from '../components/LoadingFutty';
import SilhuetaJogador from '../components/SilhuetaJogador';
import AdCard from '../components/AdCard';
import Toast from '../components/Toast';
import { avatarGenericoUrl } from '../utils/avatarGenerico';
import { urlAsset, urlImagem } from '../utils/avatar';
import AvatarGenericoSheet from '../components/AvatarGenericoSheet';
import '../styles/app.css';

function isToday(iso) {
  if (!iso) return false;
  const d = new Date(iso);
  const n = new Date();
  return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && d.getDate() === n.getDate();
}

// "domingo, 20/09" — o dia do jogo na pergunta do aviso de ausência.
function diaDoJogo(iso) {
  const d = iso ? new Date(iso) : null;
  if (!d || Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit' });
}

// ----- O cromo do Início -----
// É a figurinha REAL (o mesmo canvas da /figurinha), reduzida e clicável — não o
// PlayerCard, que era a geração anterior do cromo e mostrava outra coisa.
//
// COMPOSTO, nunca em camadas: o teatro do studio (partículas entre o fundo e o
// jogador, luz direccional, glint a percorrer o frame) é exclusivo da /figurinha.
// Aqui o cromo é um OBJECTO, não um palco — por cima dele só a física da casa:
// bob e sway dessincronizados (7.2s/9.3s) e a sombra no chão em contra-fase. São
// as .fig-* do studio, partilhadas de propósito: já trazem o prefers-reduced-motion.
//
// FORMATO: retrato QUADRADO nativo (600×600, sem placa nem nome) — não o card 2:3.
// O quadrado é mais baixo, deixa a página respirar e o nome vive em texto livre por
// baixo. O card 2:3 com placa continua canónico na Figurinha e no download.
//
// CACHE: cada geração é um canvas 600×600 mais a descodificação do avatar e do
// stadium_bg, e o Início remonta a cada volta da bottom nav. O dataURL fica em
// módulo (sobrevive ao unmount, ao contrário de um estado) com chave = tudo o que
// mexe nos pixéis. Mudar o fundo na Figurinha muda a chave e regenera sozinho:
// não há invalidação manual para alguém se esquecer de chamar.
//
// VELOCIDADE 4: este Map morre quando a aba morre. O cromo guardado em
// IndexedDB (lib/cromoCache.js) é o que atravessa ABERTURAS — sem ele, toda
// abertura do app redesenhava a figurinha do zero.
const cromoCache = new Map();

async function gerarCromoDataURL(opts, chave, userId) {
  const cached = cromoCache.get(chave);
  if (cached) return cached;
  const blob = await gerarFigurinhaCanvas(opts);
  if (!blob) return null;
  // dataURL e não objectURL: sem ciclo de vida para gerir, o cache pode
  // atravessar montagens sem ficar a apontar para um URL já revogado.
  const dataURL = await new Promise((resolve) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result);
    fr.onerror = () => resolve(null);
    fr.readAsDataURL(blob);
  });
  if (dataURL) {
    cromoCache.set(chave, dataURL);
    // Guarda o BLOB (não o dataURL): o IndexedDB aguenta-o como é, sem os +33%
    // do base64. Não se espera por isto — a tela não depende do cache.
    gravarCromo(userId, chave, blob).catch(() => {});
  }
  return dataURL;
}

// Presentacional: recebe o cromo JÁ gerado (dataURL) do Início.
//
// VELOCIDADE 4 — até 14-set a página inteira esperava o cromo estar desenhado
// para aparecer, e por isso este componente nunca precisava de um estado
// intermédio. Agora é o contrário: a tela aparece primeiro e o cromo chega
// quando fica pronto, então há um instante sem ele. Esse instante é preenchido
// com a própria foto da pessoa (`previa`), no mesmo sítio e no mesmo tamanho —
// sem isso a tela nascia com um buraco quadrado no meio, que é pior do que
// esperar. Sem avatar IA o canvas já veio com o genérico da casa desenhado (ver
// `jogadorCard` em Inicio()) — não há overlay de convite: o card em si é o
// convite (rodízio 31-jul).
// O fundo do cromo, em CSS, para a prévia. Os que têm asset usam o MESMO
// ficheiro que o canvas desenha (e com o mesmo enquadramento: `cover` ancorado a
// 22% do topo é o biasTopo do retrato quadrado). Os desenhados ficam pela base —
// o honeycomb do Épico é alpha 0.065 e não se distingue num placeholder.
function fundoDaPrevia(fundo) {
  if (fundo === 'estadio') return { backgroundImage: 'url(/stadium_bg.webp)' };
  if (fundo === 'golden') return { backgroundImage: 'url(/golden-plate.jpg)', backgroundPosition: '50% 50%' };
  if (fundo === 'royal') return { backgroundImage: 'url(/royal-plate.webp)', backgroundPosition: '50% 50%' };
  if (fundo === 'aura') {
    return { background: 'radial-gradient(ellipse 50% 48% at 50% 42%, rgba(212,160,23,0.5), rgba(212,160,23,0.12) 64%, transparent 92%), linear-gradient(#0a0a12, #070812 55%, #050609)' };
  }
  // 'preto' (Neutro) e 'gradiente' (Épico) partilham a base escura da casa.
  return { background: 'linear-gradient(#16161c, #1d1d24 50%, #101014)' };
}

// A PRÉVIA — o cromo inteiro composto em DOM, pronto na primeira pintura.
// O avatar é medido e posicionado com a conta do canvas (enquadrarAvatar), em
// percentagens: assim os dois põem o jogador no mesmo sítio e a troca da prévia
// pelo cromo desenhado não salta.
//
// RODADA 12A (16-set) — a composição entra INTEIRA, num quadro só.
//
// Até aqui a moldura dourada pintava no primeiro quadro e o avatar entrava
// depois, no onLoad: no aparelho isso é uma moldura vazia à espera de uma cara,
// e foi o que o Pedro viu no build 21. Agora nada da composição vai à tela antes
// de a imagem estar DECODIFICADA — decode(), não onLoad: o onLoad garante os
// bytes, não os pixéis prontos a desenhar, e é entre um e outro que o WebKit
// segura o quadro. Até lá fica só a área reservada com o fundo escolhido: o
// mesmo lugar, o mesmo tamanho, sem forma pela metade.
//
// Se a foto não chegar em PRAZO_AVATAR_MS, a composição aparece na mesma com a
// silhueta da casa (SVG, não espera rede nenhuma) e a foto entra quando chegar.
// Uma espera sem fim não é transição, é defeito — a mesma lição da Velocidade 5.
const PRAZO_AVATAR_MS = 1500;

function PreviaCromo({ previa, fundo }) {
  const [avatar, setAvatar] = useState(null);
  const [semEspera, setSemEspera] = useState(!previa);
  // Prévia nova (a pessoa trocou o avatar genérico): volta à área reservada.
  // Ajuste DURANTE o render — o padrão oficial do React para estado derivado de
  // props, o mesmo que o useListaProgressiva usa. Num efeito corria tarde de
  // mais e a composição antiga chegava a pintar com a foto errada.
  const [vista, setVista] = useState(previa);
  if (vista !== previa) {
    setVista(previa);
    setAvatar(null);
    setSemEspera(!previa);
  }

  useEffect(() => {
    if (!previa) return undefined;
    let vivo = true;
    const prazo = setTimeout(() => { if (vivo) setSemEspera(true); }, PRAZO_AVATAR_MS);
    const img = new Image();
    img.decoding = 'async';
    img.src = previa;
    // decode() rejeita em imagem quebrada; aí vale a silhueta, como no prazo.
    img.decode()
      .then(() => {
        if (!vivo || !img.naturalWidth) return;
        // W=H=100 → o resultado já vem em percentagem do lado do cromo.
        const { dx, dy, dw, dh } = enquadrarAvatar({
          W: 100, H: 100, nw: img.naturalWidth, nh: img.naturalHeight, avatarZoom: 1.1, ehQuadrado: true,
        });
        setAvatar({ left: `${dx}%`, top: `${dy}%`, width: `${dw}%`, height: `${dh}%` });
      })
      .catch(() => { if (vivo) setSemEspera(true); });
    return () => { vivo = false; clearTimeout(prazo); };
  }, [previa]);

  if (!avatar && !semEspera) {
    return <div className="cromo-previa__reserva" style={fundoDaPrevia(fundo)} aria-hidden="true" />;
  }

  return (
    <div className="cromo-previa" aria-hidden="true">
      <div className="cromo-previa__dentro">
        <div className="cromo-previa__fundo" style={fundoDaPrevia(fundo)} />
        {avatar ? (
          // decoding="sync": os pixéis já estão decodificados acima, então este
          // <img> pinta no mesmo quadro em que a moldura aparece.
          <img src={previa} alt="" decoding="sync" className="cromo-previa__avatar" style={avatar} />
        ) : (
          <div className="cromo-previa__silhueta">
            <SilhuetaJogador size="58%" color="rgba(240,201,74,0.5)" interrogacao={false} />
          </div>
        )}
        <div className="cromo-previa__pe" />
      </div>
    </div>
  );
}

function CromoInicio({ cromo, previa, fundo, nome, refCromo, destino = '/figurinha', destinoLabel = 'Ver e personalizar minha figurinha' }) {
  return (
    <Link to={destino} ref={refCromo} data-tour="player-card" className="cromo-inicio" aria-label={destinoLabel}>
      {/* Sombra no chão — contra-fase com o bob: encolhe quando o cromo sobe. */}
      <div
        className="fig-shadow"
        aria-hidden="true"
        style={{ position: 'absolute', left: '15%', bottom: -10, width: '70%', height: 10, background: 'radial-gradient(ellipse, rgba(212,160,23,0.35), rgba(0,0,0,0.5) 60%, transparent)', filter: 'blur(6px)', pointerEvents: 'none' }}
      />
      <div className="fig-bob" style={{ position: 'relative', width: '100%', height: '100%' }}>
        <div className="fig-sway" style={{ position: 'relative', width: '100%', height: '100%' }}>
          {cromo ? (
            <img src={cromo} alt={`Figurinha de ${nome}`} className="fig-aura" decoding="async" fetchpriority="high" loading="eager" style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />
          ) : (
            <PreviaCromo previa={previa} fundo={fundo} />
          )}
        </div>
      </div>
    </Link>
  );
}

// Nome por baixo do cromo, em texto livre grande (o quadrado não o traz baked). Base
// 44px; encolhe até caber numa linha (mínimo 28px, sem quebrar), como o fit-to-width
// da placa do card. A medição é impura (scrollWidth) → useLayoutEffect, antes do paint,
// para o utilizador não ver um salto de tamanho. Reajusta em resize e quando as fontes
// carregam (a Rajdhani mede diferente da fallback).
function NomeCromo({ nome }) {
  const ref = useRef(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const ajustar = () => {
      let f = 44;
      el.style.fontSize = `${f}px`;
      // scrollWidth = largura do texto (nowrap); clientWidth = largura disponível
      // (o div é bloco → ocupa a coluna). Reduz até caber ou atingir o mínimo.
      while (el.scrollWidth > el.clientWidth && f > 28) {
        f -= 1;
        el.style.fontSize = `${f}px`;
      }
    };
    ajustar();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(ajustar) : null;
    if (ro) ro.observe(el);
    if (document.fonts?.ready) document.fonts.ready.then(ajustar).catch(() => {});
    return () => ro && ro.disconnect();
  }, [nome]);
  return (
    <div
      ref={ref}
      style={{
        fontFamily: "'Rajdhani', sans-serif",
        fontWeight: 700,
        fontSize: 44,
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
        color: '#f0c94a',
        textAlign: 'center',
        lineHeight: 1.05,
        width: '100%',
        maxWidth: 360,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      }}
    >
      {nome}
    </div>
  );
}

// ----- Card de jogo -----
function GameCard({ game, busy, isNext, onPresence, onVerSorteio, index = 0 }) {
  const today = isToday(game.date);
  const isPast = game.status === 'finished';
  const isDrawn = game.status === 'drawn';
  const going = game.user_status === 'going';
  const notGoing = game.user_status === 'not_going';

  return (
    // Wrapper e card separados porque o card passou a levar cantos a 45°: a ordem
    // de composição do CSS é filter → clip-path, por isso QUALQUER sombra exterior
    // posta no elemento recortado (box-shadow ou drop-shadow) é cortada com ele.
    // No wrapper, o drop-shadow lê a silhueta já recortada e a sombra ganha também
    // os 45°. É o mesmo par do .cta-gold-glow/.cta-gold. O tilt e a entrada mudam-se
    // para cá com ele; a lógica do jogo não muda uma linha.
    <div
      className={`gcard-lift anim-slide-in ${isNext ? 'gcard-lift--next' : ''}`}
      style={{ animationDelay: `${index * 0.08}s` }}
      onMouseMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const dx = (e.clientX - (rect.left + rect.width / 2)) / (rect.width / 2);
        const dy = (e.clientY - (rect.top + rect.height / 2)) / (rect.height / 2);
        e.currentTarget.style.transform = `perspective(800px) translateY(-4px) scale(1.01) rotateX(${-dy * 3}deg) rotateY(${dx * 3}deg)`;
        e.currentTarget.style.transition = 'none';
        // Blur de drop-shadow ≈ metade do de box-shadow: 32px → 16px, 20px → 10px.
        e.currentTarget.style.filter = 'drop-shadow(0 12px 16px rgba(0,0,0,0.5)) drop-shadow(0 0 10px rgba(212,160,23,0.08))';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = '';
        e.currentTarget.style.transition = '';
        e.currentTarget.style.filter = '';
      }}
    >
      <div className={`gcard hud-corners ${isPast ? 'gcard--past' : ''} ${isNext ? 'gcard--next' : ''}`}>
        {isNext ? <div className="gcard__next-badge hud-corners-s">PRÓXIMO</div> : null}
        <div className="gcard__top">
          <span className="gcard__title">{game.name}</span>
          {game.team_name && <span className="gcard__team">{game.team_name}</span>}
        </div>

        <div className="gcard__meta">
          <span className={`gcard__date ${today ? 'gcard__date--today' : ''}`}>
            {game.date ? formatDateTime(game.date) : 'Data a definir'}
          </span>
          {` · ${game.confirmed_count} ${plural(game.confirmed_count, 'confirmado', 'confirmados')}`}
        </div>

        {isPast ? (
          <div className="gcard__drawn">
            <span className="badge badge--encerrado hud-corners-s">Encerrado</span>
            {going && <span className="muted" style={{ fontSize: 13 }}>Você esteve presente</span>}
          </div>
        ) : isDrawn ? (
          <div className="gcard__drawn">
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="badge badge--sorteado hud-corners-s">Sorteado</span>
              <span className="muted" style={{ fontSize: 13 }}>
                {going ? 'Vai jogar' : notGoing ? 'Não vai' : 'Sem resposta'}
              </span>
            </span>
            {/* RODADA 12A — ver o sorteio é a ação mais importante do app; o
                card tinha-a como um botão qualquer. Mesmo par do "Vou" aqui ao
                lado: o glow no wrapper (drop-shadow atravessa o recorte a 45°),
                o .pulse-active no botão (a metade dele que anima a borda
                sobrevive ao clip-path). */}
            <span className="pulse-glow" style={{ display: 'flex' }}>
              <button type="button" className="btn btn--purple btn--sm hud-corners-s pulse-active tab-shine" onClick={() => onVerSorteio(game)}>
                Ver sorteio
              </button>
            </span>
          </div>
        ) : (
          <div className="gcard__presence">
            {/* O pulso do "Vou" é funcional (marca a acção disponível) e o
                .pulse-active fá-lo com box-shadow — que os 45° do botão cortariam.
                Vai para o wrapper em drop-shadow; o .pulse-active fica no botão
                porque a metade dele que anima a BORDA sobrevive ao recorte. */}
            <span className={`pbtn-slot ${!going && !busy ? 'pbtn-pulse' : ''}`}>
              <button
                type="button"
                className={`pbtn pbtn--go hud-corners-s ${going ? 'active' : ''} ${!going && !busy ? 'pulse-active tab-shine' : ''}`}
                disabled={busy}
                onClick={() => onPresence(game.id, true)}
              >
                Vou
              </button>
            </span>
            <button
              type="button"
              className={`pbtn pbtn--no hud-corners-s ${notGoing ? 'active' : ''}`}
              disabled={busy}
              onClick={() => onPresence(game.id, false)}
            >
              Não vou
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ----- Estado vazio (sem equipas) -----
// O único sítio do Início onde o dourado entra. A regra do cânone é "dourado só se
// houver acção principal de PÁGINA": no Início cheio não há (é um hub — o cromo, o
// feed, os chips, e as acções vivem dentro de cada card), mas aqui há uma e só uma
// — criar o time. Sem ela a página não existe. As outras duas recuam para roxo.
function EmptyState() {
  return (
    <div className="home-empty">
      <h2 style={{ fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, fontSize: 22, letterSpacing: '0.02em' }}>Bem-vindo ao Futty.</h2>
      <p className="muted" style={{ marginTop: 6 }}>Comece por aqui.</p>
      <div className="home-empty__actions">
        {/* Glow no wrapper, recorte no botão — clip-path corta sombras (ver .cta-gold). */}
        <div className="cta-gold-glow" style={{ display: 'flex' }}>
          <Link to="/criar-equipa" className="btn hud-corners cta-gold" style={{ flex: 1 }}>
            ＋ Criar meu time
          </Link>
        </div>
        <Link to="/explorar" className="btn btn--purple hud-corners">
          Explorar peladas
        </Link>
        <Link to="/figurinha" className="btn btn--purple-outline hud-corners">
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Icon name="estrela" size={16} />
            Criar minha figurinha
          </span>
        </Link>
      </div>
    </div>
  );
}

export default function Inicio() {
  const { perfil: me, carregando: meLoading, recarregar: recarregarPerfil } = usePerfil();
  const { teams, loading: teamsLoading } = useTeams();
  // Início (11-set): 1 pedido só (GET /api/inicio, via Layout.jsx que monta o
  // InicioProvider só nesta rota) alimenta jogos, RSVP, campeonato, pedidos,
  // votações pendentes, desfechos de denúncia e o anúncio — em vez dos ~9
  // pedidos que esta página disparava em paralelo. As AÇÕES (confirmar
  // presença, ausência, etc.) continuam a ir direto à API de sempre.
  const inicio = useInicio();
  const dadosInicio = inicio.dados;

  // O cromo é gerado AQUI (não dentro do CromoInicio) porque o Início é quem
  // sabe o avatar, o fundo e o nome. VELOCIDADE 4: já NÃO segura a página —
  // começa a null, a tela aparece na mesma, e ele entra quando estiver pronto
  // (do IndexedDB na hora, ou do canvas um segundo depois).
  const [cromo, setCromo] = useState(null);
  // O elemento do cromo — para medir a que largura ele é realmente mostrado e
  // gerar o canvas nesse tamanho, em vez dos 600×600 fixos de antes.
  const refCromo = useRef(null);

  const [games, setGames] = useState(null); // null = a carregar
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [selectedTeam, setSelectedTeam] = useState('all');
  const [minhaResposta, setMinhaResposta] = useState(null); // 'confirmado' | 'recusado' | null
  const [ausenciaBusy, setAusenciaBusy] = useState(false);
  const [confirmarAusencia, setConfirmarAusencia] = useState(false); // pergunta "Avisar o time…?" aberta
  const [toast, setToast] = useState(null); // { msg, tipo }
  const celebrouCamp = useRef(false);

  // Pedido ÚNICO de data de nascimento (Opção B): sem ela, o /p/ cai em silhueta
  // (proteção de menores — a idade manda). Banner não-bloqueante e dispensável.
  const [dobInput, setDobInput] = useState('');
  const [dobBusy, setDobBusy] = useState(false);
  const [dobFeito, setDobFeito] = useState(false);
  const [dobDispensado, setDobDispensado] = useState(() => {
    try { return localStorage.getItem('futty_dob_dispensado') === '1'; } catch { return false; }
  });
  const precisaDob = !!me?.user && !me.user.birthdate && !dobFeito && !dobDispensado;
  async function guardarDob() {
    if (dobBusy || !dobInput) return;
    setDobBusy(true);
    try {
      await apiFetch('/api/me', { method: 'PATCH', body: JSON.stringify({ birthdate: dobInput }) });
      setDobFeito(true);
      setToast({ msg: 'Obrigado! Data salva.', tipo: 'success' });
    } catch (e) {
      setToast({ msg: e.message || 'Não deu para salvar.', tipo: 'error' });
    } finally {
      setDobBusy(false);
    }
  }
  function dispensarDob() {
    setDobDispensado(true);
    try { localStorage.setItem('futty_dob_dispensado', '1'); } catch { /* priv */ }
  }

  // Notificações push: banner discreto (uma vez por sessão).
  const { estado: pushEstado, subscrever: pushSubscrever } = usePushNotifications();
  const [pushBannerFechado, setPushBannerFechado] = useState(() => sessionStorage.getItem('futty_push_dismiss') === '1');
  function fecharPushBanner() {
    setPushBannerFechado(true);
    sessionStorage.setItem('futty_push_dismiss', '1');
  }

  // CTA pós-onboarding: criar figurinha (ativado ao fechar o onboarding da equipa).
  const [ctaFigurinha, setCtaFigurinha] = useState(() => localStorage.getItem('futty_cta_figurinha') === '1');
  function dispensarCtaFigurinha() {
    localStorage.removeItem('futty_cta_figurinha');
    setCtaFigurinha(false);
  }

  // Onboarding (product tour) — só na primeira vez. O "já vi" definitivo vive no
  // USER (server, via /api/me → tour_inicio_visto); o localStorage é só um atalho
  // local. Assim o tour NÃO reaparece noutro dispositivo nem ao limpar o localStorage.
  const [tourDoneLocal, setTourDone] = useState(() => !!localStorage.getItem('futty_tour_done'));

  // "Ver sorteio": a cerimónia corre na PÁGINA do sorteio (SPEC-SORTEIO §13d).
  function verSorteio(game) {
    window.location.assign(`/equipa/${game.team_slug}/jogo/${game.id}/sorteio`);
  }

  // Sincroniza `games` a partir de /api/inicio (carga inicial e qualquer
  // reload() subsequente) — as ações abaixo continuam a fazer optimistic
  // update em cima deste estado local, exatamente como faziam com o fetch
  // próprio de antes. Sincronizado DURANTE o render (mesmo padrão de
  // MeuPerfil.jsx), não num efeito — evita o lint react-hooks/set-state-in-effect.
  const [convitesAnterior, setConvitesAnterior] = useState(undefined);
  if (dadosInicio?.convites !== convitesAnterior) {
    setConvitesAnterior(dadosInicio?.convites);
    if (dadosInicio?.convites) setGames(dadosInicio.convites.games || []);
  }

  // Presença com optimistic update + chamada à API.
  async function onPresence(gameId, going) {
    setError('');
    setBusyId(gameId);
    setGames((prev) =>
      (prev || []).map((g) => {
        if (g.id !== gameId) return g;
        let count = g.confirmed_count;
        if (going && g.user_status !== 'going') count += 1;
        if (!going && g.user_status === 'going') count -= 1;
        return { ...g, user_status: going ? 'going' : 'not_going', confirmed_count: Math.max(0, count) };
      })
    );
    try {
      await apiFetch(`/api/games/${gameId}/confirmar`, {
        method: 'POST',
        body: JSON.stringify({ confirmado: going }),
      });
    } catch (err) {
      setError(err.message);
      // Recarrega o agregado inteiro (não só os jogos) — o useEffect acima
      // aplica `games` fresco assim que a resposta chegar.
      await inicio.reload();
    } finally {
      setBusyId(null);
    }
  }

  const user = me?.user;
  const stats = me?.stats;
  const nome = user?.nome_jogador || user?.nome || user?.email?.split('@')[0] || 'Jogador';

  // Avatar IA confirmado (mesma regra da Figurinha): a foto CRUA nunca entra no cromo.
  const cromoAvatarEhIA = !!user?.foto_url && !!user?.avatar_url && user.foto_url !== user.avatar_url;
  const cromoFundo = user?.fundo_figurinha || 'estadio';

  // Figurinha automática do cadastro (12-set): o Onboarding dispara a geração
  // em fundo e marca o sessionStorage; aqui o Início mostra "criando..." em vez
  // do CTA normal, com polling de /api/me até sair de 'gerando'. O sessionStorage
  // cobre o instante entre o disparo e o /api/me confirmar 'gerando' — sem ele o
  // usuário veria o CTA normal piscar por 1 beat antes do estado de loading.
  const [figurinhaSessaoMarcada, setFigurinhaSessaoMarcada] = useState(() => {
    try {
      return sessionStorage.getItem('futty_figurinha_gerando') === '1';
    } catch {
      return false;
    }
  });
  const figurinhaStatus = user?.figurinha_status || null;
  const figurinhaGerando = figurinhaStatus === 'gerando' || (figurinhaSessaoMarcada && !figurinhaStatus && !user?.avatar_url);
  const figurinhaFalhou = figurinhaStatus === 'falhou';

  // Limpa o sessionStorage assim que sair de 'gerando' — sincronizado DURANTE
  // o render (mesmo padrão de MeuPerfil.jsx), não num efeito.
  if (figurinhaSessaoMarcada && !figurinhaGerando) {
    try {
      sessionStorage.removeItem('futty_figurinha_gerando');
    } catch {
      /* priv */
    }
    setFigurinhaSessaoMarcada(false);
  }

  useEffect(() => {
    if (!figurinhaGerando) return undefined;
    const prazo = Date.now() + 3 * 60 * 1000; // máx. 3 min de polling (mesmo teto do backend)
    const id = setInterval(() => {
      recarregarPerfil();
      if (Date.now() > prazo) clearInterval(id);
    }, 5000);
    return () => clearInterval(id);
  }, [figurinhaGerando, recarregarPerfil]);

  // Escolha do avatar genérico (31-jul): undefined = usa o que veio do servidor;
  // definido = override otimista local (PATCH em curso ou já confirmado).
  const [sheetAvatarAberto, setSheetAvatarAberto] = useState(false);
  const [avatarGenericoOverride, setAvatarGenericoOverride] = useState(undefined);
  const avatarGenericoEscolha = avatarGenericoOverride !== undefined ? avatarGenericoOverride : user?.avatar_generico ?? null;
  async function escolherAvatarGenerico(key) {
    const anterior = avatarGenericoEscolha;
    setAvatarGenericoOverride(key);
    try {
      await apiFetch('/api/me', { method: 'PATCH', body: JSON.stringify({ avatar_generico: key }) });
      // Achado 4: invalida o PerfilContext partilhado — outras páginas (Perfil,
      // Figurinha) que leem o avatar genérico sem override próprio ficam frescas.
      recarregarPerfil();
    } catch (e) {
      setAvatarGenericoOverride(anterior);
      setToast({ msg: e.message || 'Não deu para salvar.', tipo: 'error' });
    }
  }

  // Gera o cromo assim que o user existe. corFrame/zoom são os defaults FIXOS da
  // Figurinha — divergir dava dois cromos diferentes para o mesmo utilizador.
  //
  // VELOCIDADE 4 — a ordem passa a ser: memória → IndexedDB → canvas. Só se
  // chega ao canvas (o passo de um a três segundos no celular) quando não há
  // nada guardado, ou quando a composição mudou. Nada disto segura a tela.
  useEffect(() => {
    if (!user) return undefined;
    let vivo = true;
    // Sem avatar IA: veste o genérico da casa (escolhido ou rodízio por id).
    const jogadorCard = cromoAvatarEhIA
      ? { ...user, avatar_url: urlImagem(user.avatar_url, 512) }
      : { ...user, avatar_url: avatarGenericoUrl(user.id, avatarGenericoEscolha) };
    // fundoGlints:'discreto' — o cromo do Início é um OBJECTO estático (nunca em
    // camadas/animado, ver nota acima); o GOLDEN não pode copiar nem o pico do
    // download nem a montra do tile do seletor — densidade de repouso própria.
    const opts = { jogador: jogadorCard, fundo: cromoFundo, corFrame: 'dourado', avatarZoom: 1.1, formato: 'quadrado', fundoGlints: 'discreto' };
    const chave = `q|${jogadorCard.avatar_url || '-'}|${cromoFundo}|${nome}`;

    const naMemoria = cromoCache.get(chave);
    if (naMemoria) {
      // Já desenhado nesta sessão (voltar do feed, por exemplo). Adiado ao
      // microtask: setState síncrono no corpo do efeito dispara renders em
      // cascata — mesmo padrão do PerfilContext e do useApiComCache.
      Promise.resolve().then(() => { if (vivo) setCromo(naMemoria); });
      return () => { vivo = false; };
    }

    // VELOCIDADE 5 (14-set) — o cromo não pode depender de ninguém para sempre.
    // No iPhone da loja apanhámos o placeholder desfocado eternamente: o
    // lerCromo() do IndexedDB não tinha prazo e, com o WebKit a travar a base
    // (outra aba a segurar o upgrade, modo privado, disco a responder mal), a
    // promessa nunca assentava — e como o desenhar() estava DENTRO do .then(),
    // o canvas também nunca corria. Uma otimização de cache a segurar a coisa
    // que ela devia acelerar.
    //
    // Agora quem manda é o relógio: passados 400 ms sem resposta do cache,
    // desenha-se na mesma. Perde-se o atalho, nunca a figurinha.
    //
    // FLUIDEZ 2 (16-set) — o canvas deixa de esperar o aparelho PARAR.
    //
    // A Velocidade 8 pô-lo atrás do `quandoParado` (3 s sem tocar na tela)
    // porque compor era de um a três segundos de thread principal. Isso resolvia
    // o engasgo e criava outro: o relatório do build 20 mostra a travada de
    // 6402 ms aos 82 s — o cromo a compor quando a pessoa finalmente parou, ou
    // seja no pior momento possível, já depois de ter desistido de esperar.
    //
    // Agora compor custa ~100 ms e é fatiado (ver figurinhaCanvas), por isso o
    // certo é o contrário: começar CEDO, dois quadros depois da primeira
    // pintura. Dois quadros porque o primeiro ainda cai antes do desenho e o
    // segundo já corre com a tela na frente — o mesmo critério da marcação da
    // pintura em lib/diagnostico.js. Os atalhos (memória e IndexedDB) continuam
    // imediatos: é deles que vem o cromo instantâneo de quem já abriu o app.
    let desenhou = false;
    let quadro1 = null;
    let quadro2 = null;
    let comecouEm = null;
    function desenhar() {
      if (!vivo || desenhou) return;
      desenhou = true;
      aposPrimeiraPintura(() => {
        if (!vivo) return;
        quadro1 = requestAnimationFrame(() => {
          quadro2 = requestAnimationFrame(() => {
            if (!vivo) return;
            comecouEm = Date.now();
            compor();
          });
        });
      });
    }
    function compor() {
      // A largura a que o cromo é MOSTRADO manda no tamanho do canvas: gerar
      // 600×600 para uma tela que mostra 99 px é rasterizar e codificar seis
      // vezes mais pixéis do que se vê (ver ladoDoCromo).
      const larguraExibida = refCromo.current?.getBoundingClientRect().width || null;
      // Rodada 12A: enquanto o canvas compõe, qualquer quadro perdido fica
      // anotado com esta tarefa. É o que faltava à travada de 5,7 s do build 21.
      const fimDaTarefa = tarefaEmCurso('cromo:compor');
      gerarCromoDataURL({ ...opts, larguraExibida }, chave, user.id)
        .then((url) => {
          if (!vivo) return;
          if (url) setCromo(url);
          else registarFalha('cromo', 'blob-nulo');
        })
        .catch((e) => {
          console.error('[cromo]', e);
          registarFalha('cromo', 'erro', e?.message);
        })
        .finally(fimDaTarefa);
    }

    // Guardado da última abertura: se a composição é a mesma, os pixéis seriam
    // idênticos — mostra-se e não se redesenha nada.
    const prazoCache = new Promise((resolve) => setTimeout(() => resolve('prazo'), 400));
    Promise.race([lerCromo(user.id).catch(() => null), prazoCache])
      .then((guardado) => {
        if (!vivo) return;
        if (guardado === 'prazo') {
          registarFalha('cromo', 'timeout-indexeddb');
          desenhar();
          return;
        }
        if (guardado?.chave === chave) {
          cromoCache.set(chave, guardado.dataURL);
          setCromo(guardado.dataURL);
          return;
        }
        desenhar();
      })
      .catch(desenhar);

    // Rede de segurança: se ao fim de 4 s A DESENHAR ainda não há cromo no ecrã,
    // foi o próprio canvas que não chegou ao fim (decodificar avatar e fundo é o
    // passo caro). Fica registado para se ver no Gabinete — é a diferença
    // entre "o cromo demora" e "o cromo não vem".
    //
    // Velocidade 8: a vigia conta a partir do INÍCIO do desenho, não da montagem
    // — agora o canvas espera o aparelho parar, e contar da montagem daria um
    // alarme falso sempre que a pessoa estivesse a mexer na tela.
    const vigia = setInterval(() => {
      if (!vivo || cromoCache.get(chave)) return;
      if (comecouEm && Date.now() - comecouEm > 4000) {
        registarFalha('cromo', 'sem-cromo-4s');
        clearInterval(vigia);
      }
    }, 1000);

    return () => {
      vivo = false;
      clearInterval(vigia);
      if (quadro1 != null) cancelAnimationFrame(quadro1);
      if (quadro2 != null) cancelAnimationFrame(quadro2);
    };
  }, [user, cromoAvatarEhIA, cromoFundo, avatarGenericoEscolha, nome]);

  // A foto que segura o lugar do cromo enquanto ele não existe: a mesma imagem
  // que o canvas vai usar por baixo, então a troca não salta.
  const previaCromo = cromoAvatarEhIA
    ? urlImagem(urlAsset(user?.avatar_url), 512)
    : user
      ? avatarGenericoUrl(user.id, avatarGenericoEscolha)
      : '';

  const loadingGames = games === null;
  const filtered = (games || []).filter((g) => selectedTeam === 'all' || g.team_id === selectedTeam);
  // Achado 8: "Próximos Jogos" só mostra o que ainda vai acontecer (nem encerrado
  // nem cancelado); o que já passou vai para "Últimos jogos" (máx. 3, mais recente
  // primeiro — a lista vem ordenada por data ascendente).
  const proximosJogos = filtered.filter((g) => g.status !== 'finished');
  const ultimosJogos = filtered.filter((g) => g.status === 'finished' && !g.cancelado).slice(-3).reverse();
  // Próximo jogo = o primeiro que não está encerrado (lista vem ordenada por data).
  const proximoJogo = proximosJogos[0] || null;
  const nextId = proximoJogo?.id ?? null;

  // Aviso de ausência ao próximo jogo (declaração proactiva, sem RSVP).
  // Rodada 8A: "Não vou ao próximo jogo / Afinal vou" lia como ESTADO, não como
  // ação. Agora o botão diz o que faz ("Avisar que não vou"), pergunta antes, e
  // depois fica a faixa "Você avisou que não vai · Desfazer". O servidor já
  // fazia o resto: quando o admin abre o RSVP, quem avisou entra como "Não vou"
  // (routes/rsvp.js), e a marca zera quando o resultado do jogo é lançado.
  async function definirAusencia(novo) {
    if (!proximoJogo?.team_slug || ausenciaBusy) return;
    const teamId = proximoJogo.team_id;
    setConfirmarAusencia(false);
    setAusenciaBusy(true);
    // Optimista: a flag é por equipa → atualiza todos os jogos dessa equipa.
    setGames((prev) => (prev || []).map((g) => (g.team_id === teamId ? { ...g, ausente_proximo: novo } : g)));
    try {
      await apiFetch(`/api/teams/${proximoJogo.team_slug}/membros/ausencia`, {
        method: 'PATCH',
        body: JSON.stringify({ ausente: novo }),
      });
      setToast({ msg: novo ? 'Pronto: o time já sabe que você não vai.' : 'Aviso desfeito.', tipo: 'success' });
    } catch (err) {
      setGames((prev) => (prev || []).map((g) => (g.team_id === teamId ? { ...g, ausente_proximo: !novo } : g)));
      setToast({ msg: err.message || (novo ? 'Não deu para avisar agora. Tente de novo.' : 'Não deu para desfazer agora. Tente de novo.'), tipo: 'error' });
    } finally {
      setAusenciaBusy(false);
    }
  }

  // RSVP do próximo jogo: mostra o cartão de confirmação se estiver aberto.
  // /api/inicio já calculou o próximo jogo com o MESMO critério do `nextId`
  // abaixo (1º não-encerrado, jogos ordenados por data ASC) e devolveu o RSVP
  // dele — sem rsvp aqui é porque não há próximo jogo, ou a leitura falhou.
  const rsvpData = dadosInicio?.rsvp || null;
  const rsvpInfo = nextId ? { ...(rsvpData || { rsvp_aberto: false }), gameId: nextId } : null;
  // O RSVPCard do próximo jogo está na tela (e com ele o Vou / Não vou).
  const rsvpAbertoNoProximo = !!(rsvpInfo && rsvpInfo.gameId === nextId && rsvpInfo.rsvp_aberto && !rsvpInfo.rsvp_fechado);
  // Sincronizado DURANTE o render (mesmo padrão de MeuPerfil.jsx), não num
  // efeito: `minhaResposta` continua editável localmente pelo RSVPCard
  // (onResposta={setMinhaResposta}) depois desta sincronização inicial.
  const [rsvpDataAnterior, setRsvpDataAnterior] = useState(undefined);
  if (rsvpData !== rsvpDataAnterior) {
    setRsvpDataAnterior(rsvpData);
    if (rsvpData) {
      const meuId = me?.user?.id;
      setMinhaResposta(
        rsvpData.confirmados?.some((u) => u.id === meuId)
          ? 'confirmado'
          : rsvpData.recusados?.some((u) => u.id === meuId)
            ? 'recusado'
            : null
      );
    }
  }

  // Campeonato da equipa principal (card no Início) — mesmo campSlug que o
  // backend usou para calcular `campeonato` dentro de /api/inicio.
  const campSlug = teams[0]?.slug || null;
  const campeonato = dadosInicio?.campeonato?.campeonato || null;

  // Confetti uma vez quando o campeonato está terminado.
  useEffect(() => {
    if (campeonato?.estado === 'terminado' && !celebrouCamp.current) {
      celebrouCamp.current = true;
      celebrarTop3(1);
    }
  }, [campeonato]);

  // Anúncio nativo: a seguir ao 2º jogo; se houver ≤1 jogo, no fim.
  const items = [];
  proximosJogos.forEach((g, i) => {
    items.push({ type: 'game', game: g });
    if (i === 1) items.push({ type: 'ad', key: 'ad-inicio' });
  });
  if (proximosJogos.length <= 1) items.push({ type: 'ad', key: 'ad-inicio' });

  const noTeams = !teamsLoading && teams.length === 0;

  // Rodada 12C: para onde o cromo leva. A vitrine vive DENTRO de um time (a
  // rota é /equipa/:slug/jogador/:id), por isso só existe com time e com
  // sessão carregada; até lá, a Figurinha continua a ser um destino honesto.
  const destinoCromo = noTeams
    ? { to: '/criar-equipa', label: 'Criar meu time' }
    : campSlug && user?.id
      ? { to: `/equipa/${campSlug}/jogador/${user.id}`, label: 'Ver minha vitrine de jogador' }
      : { to: '/figurinha', label: 'Ver e personalizar minha figurinha' };

  // Desfechos dos meus pedidos de entrada (aceite/recusado) — ciclo v1 sem push.
  // Sincronizado DURANTE o render a partir de /api/inicio (carga inicial +
  // reload()) — mesmo padrão de MeuPerfil.jsx, não num efeito; as ações abaixo
  // continuam a fazer optimistic update local por cima.
  const [desfechos, setDesfechos] = useState([]);
  const [pedidosAnterior, setPedidosAnterior] = useState(undefined);
  if (dadosInicio?.pedidos !== pedidosAnterior) {
    setPedidosAnterior(dadosInicio?.pedidos);
    if (dadosInicio?.pedidos) setDesfechos(dadosInicio.pedidos.pedidos || []);
  }
  function dispensarDesfecho(id) {
    setDesfechos((cur) => cur.filter((p) => p.id !== id));
    apiFetch(`/api/me/pedidos/${id}`, { method: 'DELETE' }).catch(() => {});
  }
  // P1-4 — o pedido PENDENTE era invisível fora do Explorar. Separa-se do desfecho
  // e ganha um card discreto com cancelar (DELETE do próprio pedido).
  const pedidosPendentes = desfechos.filter((p) => p.status === 'pending');
  const desfechosResolvidos = desfechos.filter((p) => p.status !== 'pending');
  function cancelarPedidoPendente(p) {
    if (!p.team?.slug) return;
    setDesfechos((cur) => cur.filter((x) => x.id !== p.id));
    apiFetch(`/api/teams/${p.team.slug}/pedir-entrada`, { method: 'DELETE' }).catch(() => {});
  }

  // P1-3 — a votação era invisível fora do Ranking. Banner no Início quando há
  // avaliações por dar (agregado de todas as equipas); dispensável por sessão.
  const votacoes = dadosInicio?.votacoes_pendentes?.pendentes || [];
  const [votacaoFechada, setVotacaoFechada] = useState(() => sessionStorage.getItem('futty_votacao_dismiss') === '1');
  const votacaoTop = !votacaoFechada ? votacoes[0] : null;
  function fecharVotacao() {
    setVotacaoFechada(true);
    sessionStorage.setItem('futty_votacao_dismiss', '1');
  }

  // Tijolo 3 — desfecho das MINHAS denúncias (nº, sem veredicto). Banner discreto.
  const denunciaDesfechos = dadosInicio?.denuncias_desfechos?.total || 0;
  const [desfechoFechado, setDesfechoFechado] = useState(() => sessionStorage.getItem('futty_denuncia_desfecho') === '1');
  function fecharDesfecho() {
    setDesfechoFechado(true);
    sessionStorage.setItem('futty_denuncia_desfecho', '1');
  }

  // REVELAÇÃO — VELOCIDADE 4, a inversão que faz a diferença no celular.
  //
  // Era: o LoadingFutty segurava o ecrã até o cromo estar DESENHADO. Desenhar o
  // cromo é um canvas 600×600 mais descodificar duas imagens — de um a três
  // segundos num telemóvel. Ou seja: a pessoa ficava a olhar para um F enquanto
  // TODO o resto da tela (nome, stats, jogos, equipa) já estava pronto há muito.
  // Era essa espera, e não a rede, a maior parte do "surreal de devagar".
  //
  // É: a tela aparece assim que há PERFIL — que na segunda abertura vem do
  // cache local, portanto de imediato. O cromo entra depois, no lugar que já
  // está reservado para ele (.cromo-inicio tem aspect-ratio fixo, não há salto),
  // com a foto da pessoa a segurar o sítio enquanto isso.
  if (meLoading) return <LoadingFutty />;

  return (
    <div className="app-shell inicio-reveal">
      <Topbar hud="INÍCIO" />
      <main className="app-main" style={{ paddingLeft: 16, paddingRight: 16, paddingTop: 10 }}>
        {/* Banner discreto para ativar notificações push */}
        {pushEstado === 'suportado' && !pushBannerFechado ? (
          <div className="hud-corners" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', marginBottom: 12, background: 'rgba(139,92,246,0.06)', border: '1px solid rgba(139,92,246,0.2)' }}>
            <span style={{ flex: 1, fontSize: 13, color: '#fff' }}>Ativar notificações para não perder nenhum jogo</span>
            {/* Secundário: o cânone tira o verde daqui — activar notificações não é
                a acção principal da página (o Início não tem uma; ver EmptyState). */}
            <button type="button" className="btn btn--purple btn--sm hud-corners-s" onClick={() => pushSubscrever()}>Ativar</button>
            <button type="button" aria-label="Fechar" onClick={fecharPushBanner} style={{ border: 'none', background: 'transparent', color: 'var(--text-dim)', cursor: 'pointer', fontSize: 16, lineHeight: 1 }}>✕</button>
          </div>
        ) : null}

        {/* Pedido único de data de nascimento (Opção B) — para proteger menores nos
            links públicos de sorteio. Não-bloqueante; dispensável. */}
        {precisaDob ? (
          <div className="hud-corners" style={{ display: 'grid', gap: 10, padding: '12px 14px', marginBottom: 12, background: 'rgba(212,160,23,0.06)', border: '1px solid rgba(212,160,23,0.25)' }}>
            <span style={{ fontSize: 13, color: '#fff', lineHeight: 1.45 }}>
              Informe sua <b>data de nascimento</b>: é para sabermos proteger menores nos links públicos de sorteio.
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <input
                type="date"
                value={dobInput}
                max={new Date().toISOString().slice(0, 10)}
                onChange={(e) => setDobInput(e.target.value)}
                style={{ flex: '1 1 150px', padding: '8px 10px', borderRadius: 2, border: '1px solid rgba(255,255,255,0.18)', background: 'rgba(0,0,0,0.3)', color: '#fff', fontSize: 16 }}
                aria-label="Data de nascimento"
              />
              <button type="button" className="btn btn--purple btn--sm hud-corners-s" disabled={!dobInput || dobBusy} onClick={guardarDob}>
                {dobBusy ? 'Salvando…' : 'Salvar'}
              </button>
              <button type="button" aria-label="Agora não" onClick={dispensarDob} style={{ border: 'none', background: 'transparent', color: 'var(--text-dim)', cursor: 'pointer', fontSize: 13 }}>Agora não</button>
            </div>
          </div>
        ) : null}

        {/* Tijolo 3 — DESFECHO discreto ao denunciante (sem veredicto: protege alvo e
            denunciante). Uma linha no Início, dispensável. */}
        {denunciaDesfechos > 0 && !desfechoFechado ? (
          <div className="hud-corners" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', marginBottom: 12, background: 'rgba(123,216,143,0.05)', border: '1px solid rgba(123,216,143,0.25)' }}>
            <span style={{ flex: 1, fontSize: 13, color: '#fff' }}>Sua denúncia foi analisada. <b style={{ color: '#9fd8a8' }}>Obrigado por cuidar da casa.</b></span>
            <button type="button" aria-label="Fechar" onClick={fecharDesfecho} style={{ border: 'none', background: 'transparent', color: 'var(--text-dim)', cursor: 'pointer', fontSize: 16, lineHeight: 1 }}>✕</button>
          </div>
        ) : null}

        {/* P1-4 — PEDIDOS PENDENTES: enquanto o admin não decide, o candidato vê
            aqui "pedido pendente na {equipa} · cancelar" (antes só existia no
            Explorar). Card discreto, roxo — é espera, não desfecho. */}
        {pedidosPendentes.map((p) => (
          <div key={p.id} className="hud-corners" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', marginBottom: 12, background: 'rgba(139,92,246,0.06)', border: '1px solid rgba(139,92,246,0.28)' }}>
            <span style={{ flexShrink: 0, display: 'grid', placeItems: 'center' }}>
              <Icon name="espera" size={18} color="#b69cff" />
            </span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: 'block', fontFamily: "'Rajdhani', sans-serif", fontWeight: 800, fontSize: 14, color: '#c9c2d6' }}>
                Pedido pendente na {p.team?.nome}
              </span>
              <span style={{ display: 'block', fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>
                À espera de aprovação do admin, avisamos você aqui quando decidir.
              </span>
            </span>
            <button type="button" onClick={() => cancelarPedidoPendente(p)} style={{ border: '1px solid rgba(255,255,255,0.18)', background: 'transparent', color: 'var(--text-dim)', cursor: 'pointer', fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, fontSize: 12, letterSpacing: '0.04em', textTransform: 'uppercase', padding: '6px 12px', flexShrink: 0, borderRadius: 2 }}>
              Cancelar
            </button>
          </div>
        ))}

        {/* DESFECHOS dos meus pedidos de entrada (ciclo v1, sem push): aceite →
            destaque + link para a equipa; recusado → aviso digno. Dispensar apaga. */}
        {desfechosResolvidos.map((p) => (
          <div key={p.id} className="hud-corners" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', marginBottom: 12, background: p.status === 'approved' ? 'rgba(123,216,143,0.08)' : 'rgba(255,255,255,0.03)', border: p.status === 'approved' ? '1px solid rgba(123,216,143,0.5)' : '1px solid rgba(255,255,255,0.14)' }}>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: 'block', fontFamily: "'Rajdhani', sans-serif", fontWeight: 800, fontSize: 14, color: p.status === 'approved' ? '#7bd88f' : '#c9c2d6' }}>
                {p.status === 'approved' ? `Você entrou na ${p.team?.nome}!` : `O pedido para ${p.team?.nome} não seguiu`}
              </span>
              <span style={{ display: 'block', fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>
                {p.status === 'approved' ? 'O admin aceitou seu pedido, bem-vindo.' : 'Sem drama: há mais peladas no Explorar.'}
              </span>
            </span>
            {p.status === 'approved' && p.team?.slug ? (
              <Link to={`/equipa/${p.team.slug}`} className="btn btn--sm hud-corners-s cta-gold" style={{ fontFamily: "'Rajdhani', sans-serif", letterSpacing: '0.06em', textDecoration: 'none', flexShrink: 0 }} onClick={() => dispensarDesfecho(p.id)}>
                Ir ao time
              </Link>
            ) : null}
            <button type="button" aria-label="Dispensar" onClick={() => dispensarDesfecho(p.id)} style={{ border: 'none', background: 'transparent', color: 'var(--text-dim)', cursor: 'pointer', fontSize: 16, lineHeight: 1, flexShrink: 0 }}>✕</button>
          </div>
        ))}

        {/* P1-3 — VOTAÇÃO VISÍVEL: sinal no Início de que há colegas por avaliar.
            Dourado porque é uma acção do utilizador (leva ao Ranking, onde se vota). */}
        {votacaoTop ? (
          <div className="hud-corners" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', marginBottom: 12, background: 'rgba(212,160,23,0.07)', border: '1px solid rgba(212,160,23,0.45)' }}>
            <span style={{ flexShrink: 0, display: 'grid', placeItems: 'center' }}>
              <Icon name="estrela" size={20} color="#f0c94a" />
            </span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: 'block', fontFamily: "'Rajdhani', sans-serif", fontWeight: 800, fontSize: 14, color: '#f0c94a' }}>
                {votacaoTop.pedido_revotacao ? `A ${votacaoTop.nome} pediu nova avaliação` : 'Você tem colegas para avaliar'}
              </span>
              <span style={{ display: 'block', fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>
                {votacaoTop.pedido_revotacao
                  ? 'Dê sua nota aos companheiros do último jogo.'
                  : `Faltam ${votacaoTop.faltam} na ${votacaoTop.nome}: sua nota conta para o ranking.`}
              </span>
            </span>
            <Link to={`/equipa/${votacaoTop.slug}/ranking`} className="btn btn--sm hud-corners-s cta-gold" style={{ fontFamily: "'Rajdhani', sans-serif", letterSpacing: '0.06em', textDecoration: 'none', flexShrink: 0 }} onClick={fecharVotacao}>
              Avaliar
            </Link>
            <button type="button" aria-label="Dispensar" onClick={fecharVotacao} style={{ border: 'none', background: 'transparent', color: 'var(--text-dim)', cursor: 'pointer', fontSize: 16, lineHeight: 1, flexShrink: 0 }}>✕</button>
          </div>
        ) : null}

        {/* Figurinha automática do cadastro (12-set): enquanto a IA gera em fundo,
            mostra a foto da pessoa com um brilho dourado passando em vez do CTA
            normal — sem isso pareceria que nada está acontecendo por ~30s. */}
        {figurinhaGerando ? (
          <div className="hud-corners" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', marginBottom: 12, background: 'rgba(212,160,23,0.06)', border: '1px solid rgba(212,160,23,0.4)' }}>
            <span className="figurinha-gerando-moldura" style={{ position: 'relative', width: 52, height: 52, flexShrink: 0, clipPath: 'polygon(16% 0, 84% 0, 100% 16%, 100% 84%, 84% 100%, 16% 100%, 0 84%, 0 16%)', border: '1.5px solid rgba(212,160,23,0.5)', background: '#101012' }}>
              {user?.foto_url ? (
                <img src={urlImagem(urlAsset(user.foto_url), 128)} alt="" width={52} height={52} decoding="async" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : null}
            </span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: 'block', fontFamily: "'Rajdhani', sans-serif", fontWeight: 800, fontSize: 15 }}>Sua figurinha está sendo criada…</span>
              <span style={{ display: 'block', fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>leva uns 30 segundos</span>
            </span>
          </div>
        ) : figurinhaFalhou ? (
          <div className="hud-corners" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', marginBottom: 12, background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.45)' }}>
            <span style={{ position: 'relative', width: 52, height: 52, flexShrink: 0, clipPath: 'polygon(16% 0, 84% 0, 100% 16%, 100% 84%, 84% 100%, 16% 100%, 0 84%, 0 16%)', border: '1.5px solid rgba(248,113,113,0.5)', background: '#101012', overflow: 'hidden' }}>
              {user?.foto_url ? (
                <img src={urlImagem(urlAsset(user.foto_url), 128)} alt="" width={52} height={52} decoding="async" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : null}
            </span>
            {/* Texto neutro (14-set): 'falhou' também cobre IA_INDISPONIVEL (motor
                recusado pela fal, nada a ver com a foto) — "tente outra foto" seria
                enganoso nesse caso. */}
            <span style={{ flex: 1, minWidth: 0, fontSize: 13, color: '#f8b4b4', lineHeight: 1.4 }}>Não deu para gerar sua figurinha agora. Tente de novo na aba Figurinha.</span>
            <Link to="/figurinha" className="btn btn--sm hud-corners-s cta-gold" style={{ flexShrink: 0, fontFamily: "'Rajdhani', sans-serif", letterSpacing: '0.06em', textDecoration: 'none' }}>
              Ir para Figurinha
            </Link>
          </div>
        ) : null}

        {/* CARD PERSISTENTE — sem foto não há cromo: moldura V1 vazia + convite.
            Sem X: persiste até haver foto (a estratégia "quase-obrigatória" do
            onboarding dia-1). Substitui o antigo CTA dispensável quando não há avatar. */}
        {figurinhaGerando || figurinhaFalhou ? null : !meLoading && user && !user.avatar_url ? (
          <Link to="/figurinha" className="hud-corners" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', marginBottom: 12, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(212,160,23,0.4)', textDecoration: 'none', color: 'inherit' }}>
            <span style={{ position: 'relative', width: 52, height: 52, flexShrink: 0 }}>
              <span style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', background: '#101012', border: '1.5px solid rgba(212,160,23,0.5)', clipPath: 'polygon(16% 0, 84% 0, 100% 16%, 100% 84%, 84% 100%, 16% 100%, 0 84%, 0 16%)' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(212,160,23,0.65)" strokeWidth="1.6"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" /><circle cx="12" cy="13" r="3" /></svg>
              </span>
            </span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: 'block', fontFamily: "'Rajdhani', sans-serif", fontWeight: 800, fontSize: 15 }}>Complete sua figurinha</span>
              <span style={{ display: 'block', fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>30 segundos e seu card fica pronto.</span>
            </span>
            <span style={{ fontFamily: "'Rajdhani', sans-serif", fontWeight: 800, fontSize: 11, color: '#f0c94a', letterSpacing: '0.08em', textTransform: 'uppercase', flexShrink: 0 }}>Adicionar →</span>
          </Link>
        ) : ctaFigurinha ? (
          <div className="hud-corners" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', marginBottom: 12, background: 'rgba(139,92,246,0.12)', border: '1px solid var(--purple)' }}>
            <span style={{ flex: 1, fontSize: 13, color: '#fff' }}>Crie sua figurinha</span>
            <Link to="/figurinha" className="btn btn--purple btn--sm hud-corners-s" onClick={dispensarCtaFigurinha}>Ir para Figurinha</Link>
            <button type="button" aria-label="Fechar" onClick={dispensarCtaFigurinha} style={{ border: 'none', background: 'transparent', color: 'var(--text-dim)', cursor: 'pointer', fontSize: 16, lineHeight: 1 }}>✕</button>
          </div>
        ) : null}

        {/* O CROMO — o destaque do topo, agora RETRATO QUADRADO sem placa. O nome
            vem por baixo em texto livre (o quadrado não o traz baked, ao contrário
            do card 2:3). Ordem: cromo → nome → equipa → stats — cada um diz o que o
            cromo não diz. Sem o nome herói com shimmer da versão 2:3: aqui é texto
            seco, dourado, sem palco. */}
        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, margin: '8px 0 18px', paddingTop: 'var(--space-lg)' }}>
          <div className="inicio-vline" aria-hidden="true" />
          <div style={{ position: 'relative', display: 'inline-block' }}>
            {/* RODADA 12C — o cromo abre a VITRINE, não a oficina.
                O cromo é o retrato da pessoa como jogadora; o destino natural
                de tocar nele é a página que mostra o que ela fez (nota, gols,
                conquistas), a mesma que se abre pelo avatar no Ranking. Editar
                a figurinha continua a um toque, na aba Figurinha da barra de
                baixo. Sem time não há vitrine (ela vive dentro de um time): aí
                o destino é a Figurinha, e sem conta nenhuma, criar o time. */}
            <CromoInicio cromo={cromo} previa={previaCromo} fundo={cromoFundo} nome={nome} refCromo={refCromo} destino={destinoCromo.to} destinoLabel={destinoCromo.label} />
            {/* Trocar visual — só quando o card veste o genérico (sem avatar IA). */}
            {!cromoAvatarEhIA ? (
              <button
                type="button"
                className="hud-corners-s"
                aria-label="Trocar visual do card"
                onClick={() => setSheetAvatarAberto(true)}
                style={{ position: 'absolute', top: 6, right: 6, zIndex: 2, width: 30, height: 30, display: 'grid', placeItems: 'center', border: '1px solid rgba(212,160,23,0.5)', background: 'rgba(13,13,18,0.72)', color: '#d4a017', cursor: 'pointer' }}
              >
                <RefreshCw size={15} />
              </button>
            ) : null}
          </div>
          <NomeCromo nome={nome} />
          {teams[0] ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: 'var(--text-dim)' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--neon)' }} />
              {teams[0].nome}
            </div>
          ) : null}
          <div className="inicio-stats">
            <span className="nota">{stats ? formatRating(stats.nota) : '--'}</span>
            <span>·</span>
            <span>
              <b>{stats?.jogos ?? 0}</b> jogos
            </span>
            <span>·</span>
            <span>
              <b>{stats?.gols ?? 0}</b> gols
            </span>
          </div>
        </div>

        {(error || inicio.erro) && <div className="alert alert--error hud-corners" style={{ marginTop: 12 }}>{error || inicio.erro}</div>}

        {noTeams ? (
          <EmptyState />
        ) : (
          <>
            {/* Chips de equipas. O 45° entra pelo USE SITE e não pela classe .chip:
                ela é partilhada com o Feed e o AdminPanel, que ainda não passaram
                pelo cânone — varrer a classe mudava-lhes o desenho sem os rever.
                A .chip--active traz uma "serpente" dourada a percorrer o contorno;
                sob o recorte ela abre-se nas 4 diagonais, o que ecoa o travessão
                que o frame do cromo abre exactamente nos mesmos cantos. */}
            <div className="chips-row">
              <button
                type="button"
                className={`chip hud-corners-s ${selectedTeam === 'all' ? 'chip--active tab-shine' : ''}`}
                onClick={() => setSelectedTeam('all')}
              >
                Todas
              </button>
              {teams.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className={`chip hud-corners-s ${selectedTeam === t.id ? 'chip--active tab-shine' : ''}`}
                  onClick={() => setSelectedTeam(t.id)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                >
                  <TeamAvatar team={t} size="sm" />
                  {t.nome}
                  {/* P2-6: pedidos de entrada por resolver (só admin) — badge dourado. */}
                  {t.pedidos_pendentes > 0 ? (
                    <span className="chip-badge" aria-label={`${t.pedidos_pendentes} pedidos para resolver`}>
                      {t.pedidos_pendentes}
                    </span>
                  ) : null}
                </button>
              ))}
              <Link to="/explorar" className="chip chip--explore hud-corners-s">
                ＋ Explorar
              </Link>
            </div>

            {/* Jogos */}
            <div data-tour="jogos-section">
              <div className="games-label">Próximos Jogos</div>
            {rsvpAbertoNoProximo ? (
              <RSVPCard gameId={nextId} prazo={rsvpInfo.rsvp_prazo} respostaActual={minhaResposta} onResposta={setMinhaResposta} cheio={rsvpInfo.cheio} minhaPosicaoEspera={rsvpInfo.minha_posicao_espera} />
            ) : null}
            {/* Aviso de ausência (Rodada 8A). Com o RSVP aberto para ESTE jogo, some
                — o card acima já tem Vou / Não vou, e é a resposta dele que vale. */}
            {proximoJogo && proximoJogo.team_slug && !rsvpAbertoNoProximo ? (
              proximoJogo.ausente_proximo ? (
                <div className="hud-corners-s" style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '8px 0 4px', padding: '8px 12px', background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.45)' }}>
                  <Icon name="ausente" size={16} color="grey" />
                  <span style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 700, color: '#f8b4b4' }}>Você avisou que não vai</span>
                  <button type="button" onClick={() => definirAusencia(false)} disabled={ausenciaBusy} style={{ border: 'none', background: 'transparent', color: 'var(--neon)', fontWeight: 700, fontSize: 13, textDecoration: 'underline', textUnderlineOffset: 3, cursor: ausenciaBusy ? 'default' : 'pointer', padding: '4px 0', flexShrink: 0, opacity: ausenciaBusy ? 0.6 : 1 }}>
                    {ausenciaBusy ? 'Salvando…' : 'Desfazer'}
                  </button>
                </div>
              ) : (
                <button type="button" className="hud-corners-s" onClick={() => setConfirmarAusencia(true)} disabled={ausenciaBusy} style={{ margin: '8px 0 4px', border: '1px solid var(--border-subtle)', background: 'var(--surface-1)', color: 'var(--text-dim)', fontWeight: 700, fontSize: 13, cursor: ausenciaBusy ? 'default' : 'pointer', padding: '6px 12px', opacity: ausenciaBusy ? 0.6 : 1 }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <Icon name="ausente" size={16} color="grey" />
                    {ausenciaBusy ? 'Salvando…' : 'Avisar que não vou'}
                  </span>
                </button>
              )
            ) : null}
            {loadingGames ? (
              <LoadingFutty />
            ) : (
              <>
                {proximosJogos.length === 0 && <p className="muted">Sem jogos para mostrar.</p>}
                {items.map((item, i) =>
                  item.type === 'ad' ? (
                    <AdCard key={item.key} />
                  ) : (
                    <GameCard
                      key={item.game.id}
                      game={item.game}
                      busy={busyId === item.game.id}
                      isNext={item.game.id === nextId}
                      onPresence={onPresence}
                      onVerSorteio={verSorteio}
                      index={i}
                    />
                  )
                )}
              </>
            )}
            </div>

            {/* Achado 8: jogos já encerrados saem do "Próximos Jogos" e ficam aqui,
                no máximo 3, mais recente primeiro. */}
            {!loadingGames && ultimosJogos.length > 0 ? (
              <div style={{ marginTop: 16 }} data-tour="ultimos-jogos-section">
                <div className="games-label">Últimos Jogos</div>
                {ultimosJogos.map((g) => (
                  <GameCard key={g.id} game={g} busy={false} isNext={false} onPresence={onPresence} onVerSorteio={verSorteio} />
                ))}
              </div>
            ) : null}

            {/* Card do campeonato (equipa principal) */}
            {campeonato && campSlug ? (
              <Link to={`/equipa/${campSlug}/campeonato`} className="hud-corners" style={{ textDecoration: 'none', display: 'block', marginTop: 14, background: 'var(--surface-1)', border: '1px solid var(--border-subtle)', padding: 'var(--space-md)' }}>
                {campeonato.estado === 'terminado' ? (
                  <>
                    <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 16, fontWeight: 800, color: '#d4a017' }}>{campeonato.nome} · Campeão: {nomeCampeao(campeonato)}</div>
                    <div style={{ fontSize: 13, color: 'var(--text-dim)', marginTop: 4 }}>{campeonato.time_a_nome} {campeonato.time_a_pontos} × {campeonato.time_b_pontos} {campeonato.time_b_nome}</div>
                  </>
                ) : (
                  <>
                    <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 16, fontWeight: 800, color: '#fff' }}>{campeonato.nome}</div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 8, color: '#fff', fontWeight: 700 }}>
                      <span>{campeonato.time_a_nome}</span>
                      <span style={{ color: '#d4a017', fontSize: 18 }}>{campeonato.time_a_pontos}</span>
                      <span style={{ color: 'var(--text-dim)' }}>vs</span>
                      <span style={{ color: '#d4a017', fontSize: 18 }}>{campeonato.time_b_pontos}</span>
                      <span>{campeonato.time_b_nome}</span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-dim)', textAlign: 'center', marginTop: 6 }}>Jornada {campeonato.jornadas_jogadas} de {campeonato.num_jornadas} · clique para ver</div>
                  </>
                )}
              </Link>
            ) : null}
          </>
        )}
      </main>

      {toast ? <Toast mensagem={toast.msg} tipo={toast.tipo} onClose={() => setToast(null)} /> : null}

      {/* Pergunta do aviso de ausência — portal para o body (overlay fixo nunca
          dentro do [data-page], ver LoadingFutty.jsx). */}
      {confirmarAusencia && proximoJogo && !rsvpAbertoNoProximo
        ? createPortal(
            <div className="modal-overlay" role="presentation" onClick={() => setConfirmarAusencia(false)}>
              <div className="modal-card modal-card--hud" role="dialog" aria-modal="true" aria-labelledby="aviso-ausencia-pergunta" onClick={(e) => e.stopPropagation()}>
                <div className="modal-card__inner">
                  <p id="aviso-ausencia-pergunta" style={{ fontSize: 15, lineHeight: 1.5, marginBottom: 16 }}>
                    {diaDoJogo(proximoJogo.date)
                      ? `Avisar o time que você não vai ao jogo de ${diaDoJogo(proximoJogo.date)}?`
                      : 'Avisar o time que você não vai ao próximo jogo?'}
                  </p>
                  <button type="button" className="btn hud-corners-s cta-gold" style={{ width: '100%' }} onClick={() => definirAusencia(true)}>
                    Avisar
                  </button>
                  <button type="button" className="btn btn--ghost btn--sm btn--hud hud-corners-s" style={{ width: '100%', marginTop: 10 }} onClick={() => setConfirmarAusencia(false)}>
                    Cancelar
                  </button>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}

      <AvatarGenericoSheet
        aberto={sheetAvatarAberto}
        onClose={() => setSheetAvatarAberto(false)}
        escolhaActual={avatarGenericoEscolha}
        onEscolher={escolherAvatarGenerico}
      />

      {/* Onboarding (primeira visita) — só se NEM o server NEM o local o dão como visto. */}
      {!tourDoneLocal && user && !user.tour_inicio_visto && (
        <ProductTour
          onDone={() => {
            localStorage.setItem('futty_tour_done', '1');
            setTourDone(true);
            // Persiste no user (server) — não volta a aparecer noutro dispositivo.
            apiFetch('/api/me/tour-visto', { method: 'POST' }).catch(() => {});
          }}
        />
      )}
    </div>
  );
}
