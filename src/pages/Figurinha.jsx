// Futty v2.0 — Figurinha (/figurinha): "card studio". Card 2:3 com tilt 3D e
// entrada animada; opções em tabs (Fundo/Frame/Uniforme) + toggles compactos.
// Selos de honra no cromo + olhinho. Trocar foto é preview local (sem backend).
// Tudo no cliente (canvas).
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate } from 'react-router-dom';
import { Camera, Download, Share2, X, Lock, Check, Plus, Minus, RefreshCw } from 'lucide-react';
import { apiFetch, apiUpload, apiUploadCampos } from '../lib/api';
import CropModal from '../components/CropModal';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { useAd } from '../hooks/useAd';
import { usePerfil } from '../context/PerfilContext';
import { lerCacheComIdade, gravarCache } from '../lib/cacheLocal';
// Liga o alinhamento dos caches ao perfil (foto/genérico novo chega ao Início, Ranking, Feed).
import '../lib/alinharCard';
// Pagamentos P2: liga a loja (SDK do RevenueCat) à conta — esta aba é pré-carregada em ócio.
import '../lib/ligarLoja';
import { espelharBrilhantesNoInicio } from '../lib/cacheCard';
import { nomeJogador, urlAsset, urlImagem } from '../utils/avatar';
import { mensagemUploadFoto } from '../utils/uploadErro';
import { normalizarFoto } from '../utils/normalizarFoto';
import { getFrameColor } from '../utils/frameColors';
import { gerarFigurinhaCanvas, gerarCamadasFigurinha, desenharFundoEpico, desenharFundoGolden, desenharFundoRoyal, mostraFigurinha } from '../utils/figurinhaCanvas';
import { avatarGenericoUrl } from '../utils/avatarGenerico';
import { estadoBrilhantes, pedidoDoProduto } from '../lib/brilhantes';
import { produtoDoPedido } from '../lib/planos';
import { lojaLigada as calcularLojaLigada, produtosDaLoja } from '../lib/loja';
import { KIT_IMG, KITS_FIGURINHA } from '../utils/kitsFigurinha';
import { DESTINO_DO_CADEADO, SELO_PINTAR, acaoDoToque, direitoDaGrade, estadoDoUniforme, ordemDaGrade, podeRefazer } from '../utils/uniformesGrade';
import {
  INTERVALO_CONSULTA_MS, TETO_ACOMPANHAMENTO_MS, situacaoDaPintura, lerPinturaGuardada, gravarPinturaGuardada, limparPinturaGuardada,
} from '../utils/progressoPintura';
import BarraPintura from '../components/BarraPintura';
import { ehNativo } from '../lib/plataforma';
import { salvarOuCompartilhar } from '../utils/salvarImagem';
import { celebrarPartilha, celebrarCromoPronto } from '../hooks/useConfetti';
import AdCard from '../components/AdCard';
import Topbar from '../components/Topbar';
import FuttyLoader from '../components/FuttyLoader';
import FaixaRolavel from '../components/FaixaRolavel';
import RotuloGerar from '../components/RotuloGerar';
import FuttyLogo from '../components/FuttyLogo';
import LoadingFutty from '../components/LoadingFutty';
import SeloHonra from '../components/SeloHonra';
import AvatarGenericoSheet from '../components/AvatarGenericoSheet';
import { gravarMiniatura } from '../lib/miniatura';
import Toast from '../components/Toast';
import '../styles/app.css';

// Chaves nomeadas (iguais às guardadas em users.cor_frame / fundo_figurinha).
// GATES (ordem do dono): Aura, Golden e Royal são PREMIUM (verdade no servidor, ver FUNDOS_PREMIUM em
// backend/routes/auth.js; o `premium: true` aqui é só o cadeado do desejo). Épico é GRÁTIS (ordem do
// dono) — não tem `premium`. LEI DA REGRA JUSTA: quem já tinha Aura equipado mantém — o gate só corre
// ao TROCAR (ver escolherFundo).
const FUNDOS = [
  // ORDEM (ordem do dono): Neutro, Épico, Estádio, Aura, Golden, Royal — os GRÁTIS primeiro (Neutro,
  // Épico, Estádio), os pagos depois (Aura, Golden, Royal). Só o SELETOR tem esta ordem: o fundo de
  // quem não escolheu continua a ser 'estadio' (useState abaixo e cromoFundo no Início).
  { k: 'preto', label: 'Neutro' },
  { k: 'gradiente', label: 'Épico' }, // chave interna 'gradiente' (estado), label Épico — GRÁTIS
  { k: 'estadio', label: 'Estádio' },
  { k: 'aura', label: 'Aura', premium: true }, // glow SELADO da vitrine como fundo do cromo
  // "Golden" e "Royal" são nomes de PRODUTO batizados pelo dono, não texto de interface — ficam em
  // inglês, como "Golden" fica no cadeado GOLDEN. A regra do PT-BR vale para o que o app DIZ, não para
  // o que o app BATIZA. Não reabrir sem o dono pedir.
  { k: 'golden', label: 'Golden', premium: true }, // 1º fundo PREMIUM (gated) — DEPOIS dos livres
  { k: 'royal', label: 'Royal', premium: true }, // par de luxo do Golden — chapa roxa da casa
];
// Background real de cada fundo (igual ao do PlayerCard) para os tiles.
const FUNDO_BG = {
  estadio: "url('/stadium_bg.webp') center / cover no-repeat, #1b2433",
  // 'gradiente' = Carta Épica. Chave interna mantida para não refactorizar estado.
  // Este valor é só o FALLBACK (base escura) até o render real do fundo ficar pronto
  // — o tile passa a mostrar o fundo verdadeiro em miniatura (ver `epicoTile`).
  gradiente: 'linear-gradient(180deg, #16161c 0%, #1d1d24 50%, #101014 100%)',
  // 'preto' (label "Neutro"): mesma base escura do épico, sem padrão. O tile é o gradiente liso,
  // condizente com o card real.
  preto: 'linear-gradient(180deg, #16161c 0%, #1d1d24 50%, #101014 100%)',
  // 'aura' — tile fiel ao glow do card: elipse dourada (mesmos stops) sobre o escuro da casa. O card real
  // desenha o glow com blur no canvas; aqui a elipse já é suave. Tamanho 140%×112% e alphas a 3/4, como
  // no canvas.
  aura: 'radial-gradient(ellipse 140% 112% at 50% 44%, rgba(212,160,23,0.7125) 0%, rgba(212,160,23,0.36) 40%, rgba(212,160,23,0.12) 64%, transparent 92%), linear-gradient(180deg, #0a0a12 0%, #070812 55%, #050609 100%)',
  // 'golden' — FALLBACK (foil dourado) até o render real da chapa ficar pronto (ver `goldenTile`).
  golden: 'linear-gradient(160deg, #b8860b 0%, #e6bd52 28%, #a9760f 54%, #dcab3a 76%, #855a0b 100%)',
  // 'royal' — FALLBACK (foil roxo) até o render real da chapa ficar pronto (ver `royalTile`).
  royal: 'linear-gradient(160deg, #4a2f8a 0%, #6f47c9 28%, #3d2670 54%, #5c3aa8 76%, #2a1a4d 100%)',
};
const TABS = [
  { k: 'fundo', label: 'Fundo' },
  { k: 'uniforme', label: 'Uniforme' },
];

// Os 5 uniformes (KIT_IMG + KITS_FIGURINHA) moram em utils/kitsFigurinha.js desde o P2: a escolha
// do uniforme do pacote do time (components/EscolherUniformeTime.jsx) usa o mesmo catálogo.

// Partículas de luz do fundo "estádio" (valores fixos por partícula → o
// movimento nunca sincroniza). left/size fixos, cores alternadas, dur/delay variados.
const FUTTY_PARTICULAS = [
  { left: 8, size: 3, cor: '#f5e070', dur: 7.5, delay: 0 },
  { left: 15, size: 2, cor: '#d4a017', dur: 9.2, delay: 2.4 },
  { left: 23, size: 4, cor: '#ffffff', dur: 6.3, delay: 5.1 },
  { left: 31, size: 2, cor: '#f5e070', dur: 10.4, delay: 1.2 },
  { left: 38, size: 3, cor: '#d4a017', dur: 8.1, delay: 6.7 },
  { left: 45, size: 2, cor: '#ffffff', dur: 6.9, delay: 3.3 },
  { left: 52, size: 4, cor: '#f5e070', dur: 9.8, delay: 0.6 },
  { left: 59, size: 3, cor: '#d4a017', dur: 7.2, delay: 4.5 },
  { left: 66, size: 2, cor: '#ffffff', dur: 11, delay: 7.8 },
  { left: 72, size: 3, cor: '#f5e070', dur: 6.6, delay: 2 },
  { left: 79, size: 4, cor: '#d4a017', dur: 8.7, delay: 5.9 },
  { left: 85, size: 2, cor: '#ffffff', dur: 10.1, delay: 1.7 },
  { left: 90, size: 3, cor: '#f5e070', dur: 7.9, delay: 4 },
  { left: 92, size: 2, cor: '#d4a017', dur: 9.5, delay: 6.2 },
];

// Glints do fundo GOLDEN no PREVIEW (a "mina encantada" viva). Mesmas posições do
// canvas (desenharFundoGolden) — [x%, y%, d(px), delay(s), dur(s)]. Densos fora do
// centro (o avatar tapa o meio). z3: entram ATRÁS do jogador (lei do brilho do cromo).
// No PNG de download o brilho é estático no pico (canvas); aqui vive.
const GOLDEN_GLINTS_UI = [
  { x: 10, y: 12, d: 3, dl: 0.0, dur: 7.6 }, { x: 23, y: 8, d: 2, dl: 4.1, dur: 8.3 },
  { x: 50, y: 6, d: 3, dl: 1.7, dur: 7.1 }, { x: 72, y: 9, d: 2, dl: 5.6, dur: 8.7 },
  { x: 89, y: 14, d: 4, dl: 2.6, dur: 7.9 }, { x: 7, y: 32, d: 3, dl: 6.3, dur: 9.0 },
  { x: 93, y: 37, d: 2, dl: 0.9, dur: 8.4 }, { x: 11, y: 55, d: 2, dl: 3.4, dur: 7.5 },
  { x: 91, y: 60, d: 3, dl: 5.1, dur: 8.9 }, { x: 14, y: 82, d: 3, dl: 1.2, dur: 7.4 },
  { x: 85, y: 85, d: 4, dl: 4.6, dur: 8.1 }, { x: 50, y: 91, d: 3, dl: 2.9, dur: 8.6 },
  { x: 31, y: 19, d: 2, dl: 6.9, dur: 7.8 }, { x: 70, y: 21, d: 3, dl: 3.8, dur: 8.2 },
];

// Recorte octogonal do card (cut/W = 32/400 = 8%; cut/H = 32/600 ≈ 5.3%). Usado
// nos overlays de card inteiro para os cantos coincidirem com o PNG octogonal.
const CLIP_OCTOGONO = 'polygon(8% 0, 92% 0, 100% 5.3%, 100% 94.7%, 92% 100%, 8% 100%, 0 94.7%, 0 5.3%)';
// Ordem do dono: a cabeça cortou nas duas tentativas com esta foto → o recado leva a escolher OUTRA
// foto. Tentar de novo com ela daria o mesmo.
const RECADO_FOTO_RECUSADA = 'Essa foto não deu certo. Escolha outra: de frente, com a cabeça e os ombros inteiros aparecendo, sem nada cortado nas bordas.';

// Limites do zoom do avatar. ZOOM_MIN subiu de 0.88 (80% exibido) para 0.99 (90%):
// o degrau de 80% deixou de existir. Qualquer valor abaixo é normalizado no arranque.
const ZOOM_MIN = 0.99;
const ZOOM_MAX = 1.43;
// Zoom do card com a FOTO: 1 = a foto cobre a moldura por completo (o piso — nunca faixa
// vazia nem borda à mostra, ver enquadrarFotoComum); cada toque aproxima 10%, até 40%.
const FOTO_ZOOM_MAX = 1.4;

// Nome de ficheiro seguro a partir do nome do jogador.
function ficheiroNome(nome, sufixo = '') {
  const base = String(nome || 'jogador')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/gi, '-')
    .toLowerCase()
    .replace(/(^-|-$)/g, '');
  return `futty-${base || 'jogador'}${sufixo}.png`;
}

// Estrela de 4 pontas custom (celebracao.svg) tingida por CSS mask. O padrão do
// app tinge SVGs pretos por filtro (components/Icon.jsx), mas esse só cobre 3
// cores fixas; a máscara permite QUALQUER cor exacta (branco/roxo/dourado).
function EstrelaIA({ size = 16, color = '#d4a017', style }) {
  return (
    <span
      aria-hidden="true"
      style={{
        display: 'inline-block',
        width: size,
        height: size,
        flex: 'none',
        backgroundColor: color,
        WebkitMaskImage: 'url(/icons/celebracao.svg)',
        maskImage: 'url(/icons/celebracao.svg)',
        WebkitMaskRepeat: 'no-repeat',
        maskRepeat: 'no-repeat',
        WebkitMaskPosition: 'center',
        maskPosition: 'center',
        WebkitMaskSize: 'contain',
        maskSize: 'contain',
        verticalAlign: 'middle',
        ...style,
      }}
    />
  );
}

// ─── O que a Figurinha aproveita do Início ──────────────────────────────────────────────
//
// Três pedidos que a tela abriria sozinha — o anúncio, os selos e /api/brilhantes/estado (539 + 540 +
// 606 ms, de Lisboa: tudo distância) — não trazem novidade nenhuma para quem chegou pelo Início: o
// /api/inicio já traz o direito, os créditos, os pedidos vivos e as colunas do pacote em cada time.
// Fica tudo no cache de sessão, com a mesma chave que o InicioContext usa; daqui só se lê.
const FRESCOR_DO_INICIO_MS = 60000;

/** Idade (ms) do payload de /api/inicio guardado, ou null se não houver. */
function idadeDoInicio(userId) {
  return lerCacheComIdade(userId, 'inicio')?.idadeMs ?? null;
}

/**
 * O mesmo formato que `estadoBrilhantes()` devolve, montado a partir do
 * /api/inicio guardado. Sem payload (ou sem o direito lá dentro) devolve null e
 * a tela pede como antes.
 */
function brilhanteDoInicio(userId) {
  const d = lerCacheComIdade(userId, 'inicio')?.dados;
  if (!d?.brilhante) return null;
  const times = (d.teams?.teams || []).map((t) => ({
    id: t.id,
    nome: t.nome,
    slug: t.slug,
    sou_dono: t.role === 'admin',
    brilhante_ativo: !!t.brilhante_ativo,
    brilhante_kit: t.brilhante_kit || null,
    brilhante_limite: Number(t.brilhante_limite) || 25,
    manto_proprio: !!t.manto_proprio,
  }));
  return {
    direito: { fonte: d.brilhante.fonte, team_id: d.brilhante.team_id, kit_id: d.brilhante.kit_id, restantes: d.brilhante.restantes || 0 },
    creditos: d.brilhante.creditos || 0,
    times,
    pedidos: d.pedidos_brilhante || [],
    // Pagamentos P2: o motor diz se a loja está ligada (PAGAMENTOS_ATIVOS) — vem no mesmo /api/inicio.
    loja_pronta: !!d.brilhante.loja_pronta,
  };
}

export default function Figurinha() {
  const navigate = useNavigate();
  // O PerfilContext já carrega o /api/me 1x por sessão: esta página só usa o `perfil` de lá para
  // inicializar o espelho local `me` (que existe porque a página precisa de merges finos — slots,
  // kit_ativo, avatar_url — que o card usa de imediato, sem esperar round-trip) e as escolhas guardadas
  // (fundo/avatar genérico/fase da estreia).
  const { perfil, erro: erroPerfil, deCache: perfilDeCache, recarregar: recarregarPerfilGlobal, hidratar: hidratarPerfilGlobal } = usePerfil();
  const { session } = useAuth();
  const userId = session?.user?.id || null;

  const [me, setMe] = useState(null);
  const [fundo, setFundo] = useState('estadio');
  const [avatarGenericoEscolha, setAvatarGenericoEscolha] = useState(null);
  const [sheetAvatarAberto, setSheetAvatarAberto] = useState(false);
  const corFrame = 'dourado';
  const [fotoLocal, setFotoLocal] = useState(null);
  const [uploadFoto, setUploadFoto] = useState(false);
  // A pintura roda em SEGUNDO PLANO no motor: o POST devolve um jobId e o app consulta
  // GET /api/figurinha/job/:id. `pintura` = { jobId, kit, estreia, estimativaSegundos, etapa,
  // decorridoMs, baseEm } (o decorridoMs do motor + o relógio local desde `baseEm`). Nasce do que ficou
  // guardado no aparelho: quem saiu da tela (ou fechou o app) e volta reencontra a pintura — pronta, ou
  // ainda correndo. `agora` é o relógio da barra.
  const [pintura, setPintura] = useState(() => lerPinturaGuardada(userId));
  const [agora, setAgora] = useState(() => Date.now());
  const [gerandoIA, setGerandoIA] = useState(() => !!lerPinturaGuardada(userId));
  // Kit escolhido na grelha que ainda não foi pintado: abre o diálogo "Pintar no uniforme X?" em vez
  // do window.confirm() (não tem como levar o "N gerações" nem o "~45s" no texto de um confirm nativo).
  const [kitParaPintar, setKitParaPintar] = useState(null);
  const [limiteIA, setLimiteIA] = useState(false);
  const [erroIA, setErroIA] = useState(false); // falha da geração (≠ 403) → estado de erro no overlay
  const [erroIAmsg, setErroIAmsg] = useState(''); // mensagem específica (ex.: foto inválida); vazio = texto genérico
  const [semGeracoes, setSemGeracoes] = useState(false); // o erro foi SEM_DIREITO (as gerações acabaram)
  const [fotoRecusada, setFotoRecusada] = useState(false); // o erro foi FOTO_RECUSADA (cabeça cortada nas duas): o recado manda trocar de foto, não tentar de novo
  // Toast curto e genérico: { mensagem, tipo }. Dois usos — aviso
  // quando /avatar/ai reutiliza o slot (mesma foto de antes, sem isto o botão
  // "carregava e nada acontecia"), e erro do PATCH de fundo (ver escolherFundo).
  const [toast, setToast] = useState(null);
  // Destaque pulsante no botão Gerar: true assim que uma foto NOVA
  // sobe nesta sessão, até a próxima geração terminar (reutilizada ou não) —
  // guia quem trocou a foto e não percebeu que falta tocar em Gerar.
  const [fotoTrocadaSemGerar, setFotoTrocadaSemGerar] = useState(false);
  const [emailNaoConfirmado, setEmailNaoConfirmado] = useState(false); // gate anti-abuso: geração exige e-mail confirmado
  const [reenviarBusy, setReenviarBusy] = useState(false);
  const [reenviarFeito, setReenviarFeito] = useState(false);
  const [modalFoto, setModalFoto] = useState(false); // modal "A tua foto" (foto actual + estado IA + carregar nova)
  const [trocandoModo, setTrocandoModo] = useState(false); // PUT /api/me/avatar/modo em voo
  const [activeTab, setActiveTab] = useState('fundo');
  const [busy, setBusy] = useState(false);
  const [erro, setErro] = useState('');
  const [uploadErro, setUploadErro] = useState(null); // P1-5 — { texto, podeRepetir }
  const ultimoFicheiro = useRef(null); // retém a foto p/ "tentar de novo"
  const ultimoRecorte = useRef(null); // idem, para o "Ajustar enquadramento" (PUT do recorte)
  const ultimoRecorteMini = useRef(null); // o quadrado tracejado da miniatura do último recorte (gravado depois de subir)
  // Zoom do avatar no card. Escala interna 0.88–1.43 (passo 0.11); exibida ÷1.1
  // → 80/90/100/110/120/130%. Base 1.1 = 100% exibido. Reinicia sempre a 110%.
  // Clamp defensivo no arranque: normaliza qualquer valor fora de [ZOOM_MIN, ZOOM_MAX]
  // (ex.: um 0.88 herdado) para dentro dos limites novos.
  const [avatarZoom, setAvatarZoom] = useState(() => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, 1.1)));
  // Zoom do card com a foto. Só da vista e do que se baixa/compartilha daqui — o enquadramento salvo
  // (Trocar foto → Ajustar enquadramento) continua a ser o de todas as telas; volta a 1 com foto nova.
  const [fotoZoom, setFotoZoom] = useState(1);
  // Flow de estreia (1ª visita sem foto/avatar): null = a decidir, 'foto' |
  // 'gerando' | 'pronto' = ecrãs A/B/C, 'fim' = studio normal.
  const [estreiaFase, setEstreiaFase] = useState(() => (localStorage.getItem('futty_figurinha_estreia') ? 'fim' : null));
  const [previewUrl, setPreviewUrl] = useState(null); // composto (estreia)
  const [fundoUrl, setFundoUrl] = useState(null); // camada de fundo (studio, sem jogador)
  const [jogadorUrl, setJogadorUrl] = useState(null); // camada do jogador (studio)
  const [placaUrl, setPlacaUrl] = useState(null); // camada placa+nome (studio, topo)
  // Tile do Épico = render REAL do fundo em miniatura (não uma imitação CSS/SVG).
  const [epicoTile, setEpicoTile] = useState(null);
  const [goldenTile, setGoldenTile] = useState(null); // render real do fundo Golden p/ o tile
  const [royalTile, setRoyalTile] = useState(null); // render real do fundo Royal p/ o tile
  const fileRef = useRef(null);
  // Enquadrar dentro de "Trocar foto". cropFile alimenta o
  // CropModal nos dois fluxos ("Escolher outra foto" e "Ajustar
  // enquadramento"); cropModo decide o que "Confirmar" faz. origParaEnviar só
  // é usado no modo 'nova' (a normalizada vai junto do recorte como a "original").
  const [cropFile, setCropFile] = useState(null);
  const [cropModo, setCropModo] = useState('nova'); // 'nova' | 'ajustar'
  const [ajustandoEnquadramento, setAjustandoEnquadramento] = useState(false);
  const origParaEnviar = useRef(null);
  // "Minhas figurinhas" (histórico, até 6) — carregado quando o modal "Sua
  // foto" abre; usandoHistoricoId é o id em voo (PUT /historico/:id).
  const [historico, setHistorico] = useState([]);
  const [usandoHistoricoId, setUsandoHistoricoId] = useState(null);

  const jogador = me?.user || {};
  const stats = me?.stats || {};
  // GRUPO B 6a — `equipa` existia só para alimentar o PlayerCard, que saiu daqui.
  const frameHex = getFrameColor(corFrame).stroke;
  // Regra única: a foto CRUA nunca entra no card. Só entra o avatar quando é
  // um avatar IA confirmado (foto_url e avatar_url existem e são diferentes —
  // logo após o upload o backend grava a foto crua em ambos, então é igual).
  const fotoOriginal = me?.user?.foto_url || null;
  // `avatarEhIA` = o card mostra AGORA uma figurinha (IA). Quem diz é o motor
  // (`figurinha_ativa`, pelo nome do arquivo — mostraFigurinha), e não foto_url ≠ avatar_url: a foto
  // do Google em avatar_url virava "figurinha" — seletor de fundos e zoom abaixo da moldura numa foto.
  const avatarEhIA = mostraFigurinha(me?.user);
  // Existe uma figurinha (mesmo que o card esteja em modo 'foto' agora) — o sinal certo para "há algo
  // para o interruptor escolher", ao contrário de avatarEhIA, que só diz o que está ativo NESTE instante.
  // Não serve `!!kit_ativo`: kit_ativo é só "qual uniforme", não "já gerou" — toda conta nova apareceria
  // com o interruptor sem nunca ter gerado nada. tem_figurinha vem calculado do servidor
  // (services/inicio.js), que sabe de verdade se existe alguma figurinha.
  const temFigurinhaAlguma = !!me?.user?.tem_figurinha;
  // MODO DO CARD (§3/§4): com Brilhante, o card de sempre (avatar recortado
  // sobre o fundo escolhido). Sem Brilhante mas COM foto, a figurinha COMUM —
  // a foto como ela é, na mesma moldura. Sem foto nenhuma, o genérico da casa
  // continua a ser o convite (nunca um buraco).
  const modoCard = avatarEhIA ? 'brilhante' : 'comum';
  const temFoto = !!fotoOriginal;
  // O "Tamanho −/+" serve aos dois cards: na figurinha é o tamanho do jogador recortado; na
  // FOTO é o zoom da foto, com piso em "cobre a moldura por completo" (o − para em 1).
  const zoomDaFoto = !avatarEhIA && temFoto;
  const zoomNoMinimo = zoomDaFoto ? fotoZoom <= 1 : avatarZoom <= ZOOM_MIN;
  const zoomNoMaximo = zoomDaFoto ? fotoZoom >= FOTO_ZOOM_MAX : avatarZoom >= ZOOM_MAX;
  function mudarZoom(sentido) {
    if (zoomDaFoto) setFotoZoom((z) => Math.min(FOTO_ZOOM_MAX, Math.max(1, +(z + sentido * 0.1).toFixed(2))));
    else setAvatarZoom((z) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, +(z + sentido * 0.11).toFixed(2))));
  }
  const jogadorCard = avatarEhIA || temFoto
    ? jogador
    : { ...jogador, avatar_url: avatarGenericoUrl(jogador.id, avatarGenericoEscolha) };
  // A2 — kit vestido + kits já gerados (slots). Vindos do GET /api/me.
  const kitAtivo = me?.user?.kit_ativo || 'dark-gold';
  const slotsKits = me?.slots || [];
  // O botão "Gerar Avatar IA" vira o CTA dourado (receita do "Ver
  // sorteio", Inicio.jsx) exactamente na janela em que ele é a única ação que
  // falta: foto nova já subiu, ainda não gerou. Fora dessa janela (idle, ou já
  // gerando) continua roxo — dourado é reservado para "toque aqui agora".
  const brilharGerar = fotoTrocadaSemGerar && !gerandoIA;
  // DIREITO DE GERAR (SPEC-FIGURINHA-3 §5) — quem pode gerar uma Brilhante e com que uniforme. Carregado
  // uma vez ao abrir a tela; recarregado depois de gerar (o crédito baixa) e depois de pedir ativação.
  // Nasce com o que o /api/inicio já trouxe (cache de sessão), em vez de null: pedir de novo seria mais
  // um pedido (606 ms de Lisboa) para saber coisas que estão em casa.
  const [brilhante, setBrilhante] = useState(() => brilhanteDoInicio(userId));
  // O estado que chega do servidor (depois de gerar, de pedir ativação) também vai para o Início
  // guardado — a Figurinha nasce a partir dele (brilhanteDoInicio), e sem isto o contador "N gerações
  // restantes" abriria com o número de ANTES de gerar. Uma resposta que falhou (o estadoBrilhantes
  // devolve "ninguém tem nada" e marca indisponivel) não vira verdade guardada.
  const aplicarBrilhante = (e) => {
    if (!e) return;
    setBrilhante(e);
    if (!e.indisponivel) espelharBrilhantesNoInicio(userId, e);
  };
  const temDireitoDeGerar = !!brilhante?.direito?.fonte;
  const fonteDireito = brilhante?.direito?.fonte || null;
  const kitDoTime = fonteDireito === 'time' ? brilhante.direito.kit_id : null;
  // Gerações que sobram no direito ESCOLHIDO (créditos, ou o que
  // falta no pacote do time): é o "N" do contador e do diálogo de confirmação.
  const restantesDireito = brilhante?.direito?.restantes ?? 0;
  const meuTimeBrilhante = (brilhante?.times || []).find((t) => t.sou_dono) || null;
  // PAGAMENTOS P2 — com a loja ligada (o motor diz `loja_pronta`, é o app nativo e o SDK do RevenueCat
  // tem a chave: lib/loja.js#lojaLigada) os convites desta tela dizem "Comprar · preço", com o preço
  // que a LOJA formata; sem ela, o texto do pedido de ativação. Os dois levam ao MESMO lugar,
  // /planos?destaque=… — é lá que se compra ou se pede. Nunca as duas coisas juntas numa tela.
  const lojaLigada = calcularLojaLigada(brilhante);
  const [precosDaLoja, setPrecosDaLoja] = useState(null); // { minha: { priceString }, pacote: … }
  useEffect(() => {
    if (!lojaLigada) return undefined;
    let vivo = true;
    produtosDaLoja().then((r) => { if (vivo && r?.produtos) setPrecosDaLoja(r.produtos); });
    return () => { vivo = false; };
  }, [lojaLigada]);
  /** O texto do convite de um produto — o mesmo verbo do botão dos Planos. */
  function textoDoConvite(produto) {
    if (!lojaLigada) return produtoDoPedido(produto)?.botaoBloco || 'Pedir ativação';
    const preco = precosDaLoja?.[produto]?.priceString;
    const verbo = produto === 'pacote' ? 'Comprar para o meu time' : 'Comprar';
    return preco ? `${verbo} · ${preco}` : verbo;
  }
  // O recado do pedido SOBREVIVE a fechar o app: vem do estado gravado, não só do clique desta sessão.
  // Pendente diz que está na fila; recusado diz o motivo que o dono escreveu no Gabinete; ativado não
  // aparece aqui de todo — quem foi ativado já vê o botão dourado, e um recado sobre um pedido
  // resolvido só ia competir com ele.
  // A GRADE DE UNIFORMES (a mesma .fig-seletor-grade dos fundos) é sempre a mesma, nos dois cards e para
  // os três casos; o que muda é o estado de cada tile, que sai do DIREITO (utils/uniformesGrade.js):
  //   grátis — todos com cadeado; o toque leva à Minha Figurinha (Planos, sem preço no app da loja: ehNativo)
  //   pacote — o uniforme do time aberto (pintável) e os outros com cadeado → Minha Figurinha
  //   minha  — todos abertos; os ainda não pintados com o selo "pintar · 1 geração · ~45 s"
  // Estados de tile: vestido (✓) · pintado (um toque veste, grátis) · geravel (confirma e gasta 1) ·
  // trancado.
  // Nada de "em breve"; o pacote do time, para o dono, continua no convite "Vire figurinha" mais abaixo.
  const temCredito = fonteDireito === 'credito' || (brilhante?.creditos || 0) > 0;
  const direitoDaGradeAgora = direitoDaGrade({ fonteDireito, creditos: brilhante?.creditos });
  function estadoDoKit(kit) {
    return estadoDoUniforme({ direito: direitoDaGradeAgora, kitId: kit.id, kitVestido: avatarEhIA ? kitAtivo : null, kitDoTime, slots: slotsKits });
  }
  const kitsDaGrade = ordemDaGrade(KITS_FIGURINHA.filter((k) => k.estado !== 'breve'), { direito: direitoDaGradeAgora, kitDoTime });
  function tocarUniforme(kit) {
    if (gerandoIA) return;
    const acao = acaoDoToque(estadoDoKit(kit));
    if (acao === 'vestir' || acao === 'pintar') escolherKit(kit);
    else if (acao === 'planos') navigate(DESTINO_DO_CADEADO);
  }
  // "Refazer": ação pequena embaixo do uniforme atual (só com a figurinha no card e geração sobrando).
  const kitDoCard = avatarEhIA ? KITS_FIGURINHA.find((k) => k.id === kitAtivo) || null : null;
  const refazerAtual = !!kitDoCard && podeRefazer({ direito: direitoDaGradeAgora, kitVestido: kitAtivo, kitDoTime, restantes: restantesDireito, avatarEhIA });
  function gradeDeUniformes() {
    return (
      <FaixaRolavel className="fig-seletor-grade" envoltorioClassName="faixa-rolavel--grade" data-grade="uniformes" rotuloMais="Ver mais uniformes" rotuloAnteriores="Ver uniformes anteriores">
        {kitsDaGrade.map((kit) => {
          const estado = estadoDoKit(kit);
          const trancado = estado === 'trancado';
          return (
            <button
              key={kit.id}
              type="button"
              className="fig-seletor-tile"
              onClick={() => tocarUniforme(kit)}
              // P2: o tile trancado diz o que o toque faz, com o mesmo texto do convite (Comprar · preço / Pedir).
              aria-label={trancado ? `${kit.nome} (bloqueado) · ${textoDoConvite('minha')}` : estado === 'geravel' ? `${kit.nome} · ${SELO_PINTAR}` : kit.nome}
              aria-pressed={estado === 'vestido'}
              data-estado={estado}
              disabled={gerandoIA}
            >
              {/* Thumbnail quadrado */}
              <div className="hud-corners-s" style={{ position: 'relative', width: '100%', aspectRatio: '1 / 1', overflow: 'hidden', background: KIT_IMG[kit.id] ? '#0d0d12' : `linear-gradient(135deg, ${kit.base} 55%, ${kit.acento} 55%)`, border: estado === 'vestido' ? '2px solid #d4a017' : estado === 'geravel' ? '1px solid rgba(212,160,23,0.55)' : '1px solid var(--border-subtle)', filter: estado === 'vestido' ? 'none' : 'saturate(0.7) brightness(0.85)' }}>
                {KIT_IMG[kit.id] ? (
                  // Enquadramento (reparo do look): o cover cortava a camisa a meio.
                  // Ancora ao topo + desce + reduz a escala → vê-se o corte da gola e
                  // o padrão da manga de relance, com a maior parte da camisa visível.
                  <img
                    src={KIT_IMG[kit.id]}
                    alt=""
                    style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: '50% 10%', transform: 'scale(0.82) translateY(7%)', transformOrigin: '50% 0%' }}
                  />
                ) : null}
                {estado === 'vestido' ? (
                  <span style={{ position: 'absolute', top: 3, right: 3, width: 15, height: 15, borderRadius: '50%', background: '#d4a017', color: '#0d0d12', display: 'grid', placeItems: 'center' }}>
                    <Check size={10} strokeWidth={3} />
                  </span>
                ) : null}
                {/* Gerável (com direito, sem slot): avisa que custa 1 geração e quanto demora.
                    O tile tem 76 px: o selo quebra em duas linhas ("pintar · 1 geração" / "~45 s"). */}
                {estado === 'geravel' ? (
                  <span data-selo="pintar" style={{ position: 'absolute', bottom: 3, left: '50%', transform: 'translateX(-50%)', display: 'grid', justifyItems: 'center', gap: 0, padding: '2px 4px', borderRadius: 5, background: 'rgba(0,0,0,0.78)', color: '#d4a017', fontFamily: "'Rajdhani', sans-serif", fontSize: 8, lineHeight: 1.15, fontWeight: 700, whiteSpace: 'nowrap' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}><EstrelaIA size={7} color="#d4a017" /> pintar · 1 geração</span>
                    <span>~45 s</span>
                  </span>
                ) : null}
                {trancado ? (
                  <span aria-hidden="true" style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', background: 'rgba(5,8,16,0.55)', color: '#f0c94a' }}>
                    <Lock size={16} />
                  </span>
                ) : null}
              </div>
              {/* Nome */}
              <span style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 10, fontWeight: 700, color: trancado ? 'var(--label-color)' : '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {kit.nome}
              </span>
            </button>
          );
        })}
      </FaixaRolavel>
    );
  }

  const pedidoPacote = pedidoDoProduto(brilhante?.pedidos, 'pacote', meuTimeBrilhante?.id);
  const pedidoMinha = pedidoDoProduto(brilhante?.pedidos, 'minha');
  const candidatos = [pedidoPacote, pedidoMinha].filter(Boolean);
  const pedidoVivo = candidatos.find((p) => p.estado === 'pendente') || candidatos[0] || null;
  // Com a loja ligada a tela vende, não fala de pedidos (P2: nunca as duas coisas juntas).
  const recadoPedido = lojaLigada ? null
    : (pedidoVivo?.estado === 'pendente' ? 'Pedido enviado. A gente ativa e avisa.' : null)
      || (pedidoVivo?.estado === 'recusado' ? (pedidoVivo.motivo || 'Este pedido não seguiu. Tente de novo.') : null);

  useEffect(() => {
    let vivo = true;
    // Com o estado semeado pelo Início recente, não se pede nada: a tela abre
    // com a resposta certa e sem rede. Fora dessa janela revalida-se — em
    // SEGUNDO PLANO, para não entrar na conta de "dados" de quem já tem tela.
    const idade = idadeDoInicio(userId);
    if (brilhanteDoInicio(userId) && idade != null && idade < FRESCOR_DO_INICIO_MS) return () => { vivo = false; };
    estadoBrilhantes({ segundoPlano: true }).then((e) => {
      if (!vivo || !e) return;
      setBrilhante(e);
      if (!e.indisponivel) espelharBrilhantesNoInicio(userId, e); // ver aplicarBrilhante
    });
    return () => { vivo = false; };
  }, [userId]);

  // SELOS DE HONRA: busca os selos do utilizador; mostra no cromo os 2 de maior prioridade que NÃO
  // estejam ocultos (olhinho, persistido). Vêm já ordenados por prioridade (campeonato > ranking) do
  // backend. Os selos do cache entram JÁ no primeiro render: vindos num microtask, a chegada tardia
  // recomeçava o desenho do cromo. Os selos nunca seguram a tela: sem cache, o cromo desenha sem eles e
  // redesenha uma vez quando o /api/me/selos chegar.
  // Anúncio pedido no topo da tela, em paralelo com o resto (mesmo motivo da Resenha e do Ranking — ver
  // useAd).
  const { ad: adFigurinha, pronto: adPronto } = useAd('figurinha');
  const [selos, setSelos] = useState(() => lerCacheComIdade(userId, 'selos')?.dados ?? []);
  const [selosDoUsuario, setSelosDoUsuario] = useState(userId);
  if (selosDoUsuario !== userId) {
    setSelosDoUsuario(userId);
    setSelos(lerCacheComIdade(userId, 'selos')?.dados ?? []);
  }
  const [selosOcultos, setSelosOcultos] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem('futty_selos_ocultos') || '[]')); } catch { return new Set(); }
  });
  useEffect(() => {
    let ativo = true;
    const comIdade = lerCacheComIdade(userId, 'selos');
    const doCache = comIdade?.dados ?? null;
    // Janela de frescor de 5 minutos NESTA tela (a do useApiComCache é de 30 s). Se o
    // pré-aquecimento acabou de trazer os selos, não se pedem outra vez.
    //
    // Um selo é uma conquista (campeonato, 1º do ranking) — não muda enquanto a pessoa
    // escolhe um fundo. Com 30 s, abrir a Figurinha um minuto depois do Início
    // pagava 540 ms por dois emblemas que já estavam em casa. Fora da janela,
    // revalida por trás: o cromo desenha com os selos do cache e redesenha uma
    // vez se algum tiver mudado.
    const frescos = comIdade && comIdade.idadeMs < 5 * 60 * 1000;
    if (frescos) return () => { ativo = false; };
    apiFetch('/api/me/selos', { segundoPlano: !!doCache })
      .then((d) => {
        if (!ativo) return;
        setSelos(d.selos || []);
        gravarCache(userId, 'selos', d.selos || []);
      })
      .catch((e) => {
        if (doCache) console.warn('[Figurinha] /api/me/selos falhou, mantendo cache:', e.message);
      });
    return () => { ativo = false; };
  }, [userId]);
  function toggleSelo(id) {
    setSelosOcultos((cur) => {
      const n = new Set(cur);
      if (n.has(id)) n.delete(id); else n.add(id);
      localStorage.setItem('futty_selos_ocultos', JSON.stringify([...n]));
      return n;
    });
  }
  const selosVisiveis = selos.filter((s) => !selosOcultos.has(s.id)).slice(0, 2);
  const selosKey = selosVisiveis.map((s) => `${s.id}:${s.tier}`).join('|');
  // `fotoOverride` = o preview LOCAL da foto que o servidor acabou de confirmar (200):
  // o card comum a pinta na hora, sem esperar a imagem nova voltar pelo proxy. Só na
  // comum (a base é a foto); o card com figurinha continua vindo do avatar_url. Não
  // entra nas deps do efeito de pintura de propósito: quem o dispara é a troca do
  // foto_url que chega no mesmo lote (setMe + setFotoLocal), e limpar o preview depois
  // não precisa repintar nada.
  const opts = { jogador: jogadorCard, stats, fundo, corFrame, avatarZoom, fotoZoom: modoCard === 'comum' ? fotoZoom : 1, modo: modoCard, fotoOverride: modoCard === 'comum' ? fotoLocal : null, selos: selosVisiveis.map((s) => ({ tier: s.tier, label: s.label })) };

  // Pré-selecciona as escolhas guardadas a partir do `perfil` já carregado
  // pelo PerfilContext — 1x só, quando ele chega (guard por ref: o `perfil`
  // pode mudar depois, ex. recarregarPerfilGlobal(), sem reiniciar o flow).
  const inicializadoRef = useRef(false);
  useEffect(() => {
    if (inicializadoRef.current) return undefined;
    if (!perfil && !erroPerfil) return undefined;
    // Adiado ao microtask (mesmo padrão do PerfilContext): setState síncrono no corpo do efeito dispara
    // cascading renders.
    //
    // O `inicializadoRef` é marcado DENTRO do microtask, não antes dele. Marcá-lo aqui fora deixava a
    // página vazia em `npm run dev`: o StrictMode monta, desmonta e remonta cada efeito, e o cleanup da
    // primeira montagem punha `ativo = false` antes de o microtask correr — o setMe nunca acontecia, e na
    // remontagem o guard já estava fechado. Resultado: `me` ficava null para sempre e a Figurinha abria a
    // pedir "Adicionar foto" numa conta que tem foto e figurinha. Em produção não aparecia (uma montagem
    // só), mas o dev e o LIGAR-FUTTY.bat são onde a casa testa — uma tela que mente na bancada não serve
    // de bancada.
    let ativo = true;
    Promise.resolve().then(() => {
      if (!ativo) return;
      inicializadoRef.current = true;
      if (perfil) {
        setMe(perfil);
        if (perfil?.user?.fundo_figurinha) setFundo(perfil.user.fundo_figurinha);
        if (perfil?.user?.avatar_generico) setAvatarGenericoEscolha(perfil.user.avatar_generico);
        // Decisão da estreia (só quando ainda não foi vista): sem avatar → flow.
        if (!localStorage.getItem('futty_figurinha_estreia')) {
          setEstreiaFase(perfil?.user?.avatar_url ? 'fim' : 'foto');
        }
      } else if (erroPerfil) {
        setErro(erroPerfil);
      }
    });
    return () => {
      ativo = false;
    };
  }, [perfil, erroPerfil]);

  // O ESPELHO TEM DE OUVIR O DADO FRESCO UMA VEZ.
  //
  // O efeito acima semeia `me` com o PRIMEIRO `perfil` que chega — e o PerfilContext entrega primeiro o
  // CACHE LOCAL deste aparelho (stale-while-revalidate) e só depois a resposta do /api/me. O guard por
  // ref existe por bom motivo (o flow da estreia não pode reiniciar a meio), mas apanharia também a
  // actualização: o cromo desta página ficaria preso na figurinha gravada no cache, enquanto o Início —
  // que lê o contexto directo — já mostraria a nova. Quem nunca tinha aberto o app naquele aparelho
  // veria o certo; quem já tinha, veria o antigo — parece coisa de PC contra celular.
  //
  // Sincroniza-se só o que vem do servidor e não se edita aqui. Fundo, zoom e avatar genérico ficam como
  // o utilizador os deixou. E se houver acção local em voo (upload, geração, foto por gerar), ela é mais
  // nova do que este fresco — desiste-se sem aplicar, para não desfazer o que ele acabou de fazer.
  const frescoAplicadoRef = useRef(false);
  useEffect(() => {
    if (frescoAplicadoRef.current || perfilDeCache || !perfil) return undefined;
    frescoAplicadoRef.current = true;
    if (gerandoIA || uploadFoto || fotoLocal) return undefined;
    // Adiado ao microtask, como o efeito de semeadura acima: setState síncrono
    // no corpo do efeito dispara cascading renders.
    let ativo = true;
    Promise.resolve().then(() => {
      if (!ativo) return;
      setMe((m) => (m ? {
        ...m,
        user: {
          ...m.user,
          foto_url: perfil.user?.foto_url ?? m.user?.foto_url,
          avatar_url: perfil.user?.avatar_url ?? m.user?.avatar_url,
          kit_ativo: perfil.user?.kit_ativo ?? m.user?.kit_ativo,
          // o que o card mostra anda junto com o avatar_url.
          figurinha_ativa: perfil.user?.figurinha_ativa ?? m.user?.figurinha_ativa,
          tem_figurinha: perfil.user?.tem_figurinha ?? m.user?.tem_figurinha,
        },
        slots: perfil.slots ?? m.slots,
      } : perfil));
    });
    return () => { ativo = false; };
  }, [perfil, perfilDeCache, gerandoIA, uploadFoto, fotoLocal]);

  // Liberta o objectURL da foto local (ao trocar/desmontar).
  useEffect(() => {
    if (!fotoLocal) return undefined;
    return () => URL.revokeObjectURL(fotoLocal);
  }, [fotoLocal]);

  // Confetti ao chegar ao momento épico (estado C da estreia).
  useEffect(() => {
    if (estreiaFase === 'pronto') celebrarCromoPronto();
  }, [estreiaFase]);

  // Uma geração do cromo só é jogada fora se já houver cromo NA TELA. Descartar a cada mudança a
  // meio — os selos a chegarem do cache ou da rede — jogava fora o desenho quase pronto e o card
  // ficava no F até a geração seguinte acabar: "a Figurinha só pinta quando /api/me/selos chega".
  // Assim a primeira a terminar pinta, e a mais nova substitui quando terminar.
  const geracaoCromoRef = useRef(0);
  const cromoNaTelaRef = useRef({ fim: false, estreia: false });
  const montadaRef = useRef(true);
  useEffect(() => {
    montadaRef.current = true;
    return () => { montadaRef.current = false; };
  }, []);

  useEffect(() => {
    if (!me) return; // sem perfil ainda: nada de pintar um cromo vazio
    const minha = ++geracaoCromoRef.current;
    const modo = estreiaFase === 'fim' ? 'fim' : 'estreia';
    const podePintar = () => montadaRef.current && (geracaoCromoRef.current === minha || !cromoNaTelaRef.current[modo]);
    const trocar = (setter) => (blob) => setter((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return blob ? URL.createObjectURL(blob) : null;
    });
    const gerar = async () => {
      try {
        if (modo === 'fim') {
          // Studio: duas camadas (partículas entre fundo e jogador).
          const { fundoBlob, jogadorBlob, placaBlob } = await gerarCamadasFigurinha(opts);
          if (!podePintar()) return;
          trocar(setFundoUrl)(fundoBlob);
          trocar(setJogadorUrl)(jogadorBlob);
          trocar(setPlacaUrl)(placaBlob);
        } else {
          // Estreia: imagem composta única.
          const blob = await gerarFigurinhaCanvas(opts);
          if (!podePintar()) return;
          trocar(setPreviewUrl)(blob);
        }
        cromoNaTelaRef.current[modo] = true;
      } catch (e) {
        console.error('[preview]', e);
      }
    };
    gerar();
    // selosKey: regenera o cromo quando os selos visíveis mudam (chegam da API ou
    // o utilizador oculta/mostra no olhinho). me?.user?.id: a 1ª geração espera o perfil.
  // `jogador?.foto_url` entra nas deps por causa do modo COMUM: ali a base do card é a FOTO, e trocá-la
  // tem de repintar o cromo — no modo brilhante quem muda é o avatar_url, que já estava aqui.
  }, [me?.user?.id, fundo, avatarZoom, fotoZoom, avatarEhIA, jogador?.avatar_url, jogador?.foto_url, avatarGenericoEscolha, estreiaFase, selosKey]);

  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);
  useEffect(() => () => { if (fundoUrl) URL.revokeObjectURL(fundoUrl); }, [fundoUrl]);
  useEffect(() => () => { if (jogadorUrl) URL.revokeObjectURL(jogadorUrl); }, [jogadorUrl]);
  useEffect(() => () => { if (placaUrl) URL.revokeObjectURL(placaUrl); }, [placaUrl]);

  // Render ÚNICO do tile do Épico (deps [] → uma vez por montagem). 120px = ~2× o
  // tamanho do tile, para ficar nítido em retina. dataURL → usado como background.
  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        const cv = document.createElement('canvas');
        cv.width = 120;
        cv.height = 120;
        // Intensidade 3.0: a 120×120 as arestas a alpha do card (0.065) desapareciam. Mesma geometria, alpha
        // subido só para a miniatura se ler.
        await desenharFundoEpico(cv.getContext('2d'), 120, 120, { intensidade: 3.0 });
        if (vivo) setEpicoTile(cv.toDataURL('image/png'));
      } catch { /* fallback: fica o gradiente base do FUNDO_BG */ }
    })();
    return () => { vivo = false; };
  }, []);

  // Render ÚNICO do tile do Golden (chapa foil + glints no pico), como o Épico.
  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        const cv = document.createElement('canvas');
        cv.width = 120;
        cv.height = 120;
        // 'vitrine': montra a propósito (ordem do dono) — mais rica que o card real.
        await desenharFundoGolden(cv.getContext('2d'), 120, 120, { glints: 'vitrine' });
        if (vivo) setGoldenTile(cv.toDataURL('image/png'));
      } catch { /* fallback: fica o gradiente foil do FUNDO_BG */ }
    })();
    return () => { vivo = false; };
  }, []);

  // Render ÚNICO do tile do Royal (chapa roxa + glints no pico), MESMO pipeline do Golden.
  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        const cv = document.createElement('canvas');
        cv.width = 120;
        cv.height = 120;
        // 'vitrine': montra a propósito (ordem do dono) — mais rica que o card real.
        await desenharFundoRoyal(cv.getContext('2d'), 120, 120, { glints: 'vitrine' });
        if (vivo) setRoyalTile(cv.toDataURL('image/png'));
      } catch { /* fallback: fica o gradiente foil do FUNDO_BG */ }
    })();
    return () => { vivo = false; };
  }, []);

  // Marca a estreia como concluída e passa ao studio normal.
  function concluirEstreia() {
    localStorage.setItem('futty_figurinha_estreia', '1');
    setEstreiaFase('fim');
  }

  // Geração IA durante a estreia: ao concluir (ou falhar), revela o cromo.
  // Declarada antes de subirFoto porque este chama-a no auto-trigger da estreia.
  async function gerarAvatarIAEstreia() {
    // Mesmo marcador do Onboarding (dispararFigurinhaIA): o Início
    // lê isto no PRÓPRIO useState inicial (uma vez, ao montar), por isso tem
    // de estar gravado ANTES do POST — se a pessoa for para lá enquanto isto
    // ainda corre, o Início já nasce sabendo que há uma geração em voo, em vez
    // de mostrar o CTA normal por um instante até o status 'gerando' chegar.
    try {
      sessionStorage.setItem('futty_figurinha_gerando', '1');
    } catch {
      /* priv */
    }
    setGerandoIA(true);
    setErro('');
    setLimiteIA(false);
    let emSegundoPlano = false;
    let falhou = null; // a falha desta geração: a fase que volta (foto ou cromo) depende dela
    try {
      // O POST devolve `{ jobId }` na hora; quem conclui é acompanharPintura (aplicarPinturaPronta /
      // aplicarPinturaFalhou). Sem jobId (resposta imediata) o fluxo é o de sempre.
      const data = await apiFetch('/api/me/avatar/ai', { method: 'POST', body: JSON.stringify({ kit: 'dark-gold', assincrono: true }) });
      if (data.jobId) {
        iniciarPintura(data, { kit: 'dark-gold', estreia: true });
        emSegundoPlano = true;
        return;
      }
      setMe((m) => (m ? { ...m, user: { ...m.user, avatar_url: data.avatar_url, figurinha_ativa: data.figurinha_ativa } } : m));
      setFotoLocal(null);
      recarregarPerfilGlobal();
    } catch (err) {
      falhou = err;
      tratarFalhaDaEstreia(err);
    } finally {
      if (!emSegundoPlano) {
        setGerandoIA(false);
        setEstreiaFase(falhou ? faseAposFalhaDaEstreia(falhou) : 'pronto'); // mostra o cromo (com Brilhante ou a foto)
      }
    }
  }

  // SEM_DIREITO não é o "limite" morto — mostrar o card de quota (que mandaria "Ver Brilhantes" para um
  // 403 que já significa isso) seria só ruído; o card comum já está pronto, é só revelar. `subirFoto` só
  // chama a geração da estreia quando já há direito confirmado, mas o direito pode ter acabado entre a
  // checagem e a resposta (corrida rara) — cai aqui na mesma, sem erro na tela. Serve ao POST e ao
  // desfecho 'falhou' do job.
  function tratarFalhaDaEstreia(err) {
    if (err?.code === 'SEM_DIREITO') estadoBrilhantes().then(aplicarBrilhante);
    else if (err?.code === 'FOTO_RECUSADA') setFotoRecusada(true); // o recado vai na fase 'foto' (ver faseAposFalhaDaEstreia)
    else if (err?.status === 403) setLimiteIA(true); // 403 sem código conhecido (defensivo)
    else setErro(err?.message || 'Não deu para gerar sua figurinha. Tente de novo.');
  }

  // FOTO_RECUSADA na estreia volta a "Adicione uma foto" com o recado (a pessoa escolhe outra); as
  // outras falhas seguem ao cromo.
  function faseAposFalhaDaEstreia(err) {
    return err?.code === 'FOTO_RECUSADA' ? 'foto' : 'pronto';
  }

  // Trocar foto: upload para o servidor e, CONFIRMADO o 200, preview local imediato. O preview (e a
  // linha "Foto trocada") só nascem depois do 200: com o upload falhando a tela não pode dizer que a
  // foto já mudou; com erro, só o erro.
  // Na estreia, dispara automaticamente a geração da Brilhante — só quando já há direito (crédito ou
  // pacote do time); sem ele, a comum já está pronta.
  // Núcleo do upload, reutilizado pelo "tentar de novo". `emEstreia` decide se dispara a geração IA
  // automática a seguir. `file` já é o RECORTE (saído do CropModal); `original` (opcional) é a foto de
  // antes do recorte, mandada junto para "Ajustar enquadramento" mais tarde.
  // `recorteMini` é o quadrado tracejado da miniatura (enquadramento único), gravado em
  // users.avatar_recorte depois do 200 — só quando o card passa a mostrar a FOTO (com figurinha ativa,
  // o arquivo do avatar continua sendo a figurinha; o recorte dela fica).
  async function subirFoto(file, emEstreia, original, recorteMini = null) {
    setFotoLocal(null); // some a confirmação de uma troca anterior enquanto esta corre
    setFotoRecusada(false); // foto nova: some o recado da foto anterior
    if (emEstreia) setEstreiaFase('gerando');
    setUploadFoto(true);
    setErro('');
    setUploadErro(null);
    try {
      const data = original
        ? await apiUploadCampos('/api/me/avatar', { avatar: file, original })
        : await apiUpload('/api/me/avatar', file, 'avatar');
      // foto_url = a nova foto (fonte da próxima geração). avatar_url = o que o card
      // mostra: o backend PRESERVA a figurinha se houver uma (arquivo -ai- nosso) e
      // senão espelha a foto nova, por isso o card comum muda na hora e o com figurinha
      // mantém a figurinha até a pessoa gerar de novo.
      setMe((m) => (m ? {
        ...m,
        user: {
          ...m.user,
          foto_url: data.foto_url ?? data.avatar_url,
          avatar_url: data.avatar_url,
          foto_original_url: data.foto_original_url ?? m.user.foto_original_url ?? null,
          figurinha_ativa: data.figurinha_ativa,
        },
      } : m));
      // O contexto do perfil também aprende a foto nova, sem rede: sem isto, sair da
      // tela e voltar (ou abrir o Início) semeava o card com o perfil de ANTES da troca.
      aplicarNoPerfilGlobal({
        foto_url: data.foto_url ?? data.avatar_url,
        avatar_url: data.avatar_url,
        foto_original_url: data.foto_original_url ?? me?.user?.foto_original_url ?? null,
        figurinha_ativa: data.figurinha_ativa,
      });
      setFotoZoom(1); // foto nova: o zoom volta a "cobre a moldura"
      setFotoLocal(URL.createObjectURL(file)); // 200 confirmado: agora sim o preview e a linha "Foto trocada"
      setUploadFoto(false);
      ultimoFicheiro.current = null;
      origParaEnviar.current = null;
      if (recorteMini && !data.figurinha_ativa) gravarMiniaturaDaFoto(recorteMini);
      if (emEstreia) {
        // SPEC-FIGURINHA-3: a estreia só tenta gerar a Brilhante com direito confirmado (crédito ou pacote do
        // time) — sem isso o POST dava 403 SEM_DIREITO e a tela mostrava o card de "limite" (que nem existe
        // mais). Sem direito, a comum já está pronta (o upload acima gravou foto_url): só falta revelar o
        // cromo, sem tentar nem errar.
        if (temDireitoDeGerar) await gerarAvatarIAEstreia();
        else setEstreiaFase('pronto');
      } else setFotoTrocadaSemGerar(true); // fora da estreia, quem decide gerar é o próprio usuário
    } catch (err) {
      // P1-5 — mensagem accionável (rede/tamanho/formato) + retry inline, não um erro cru.
      setUploadErro(mensagemUploadFoto(err));
      setUploadFoto(false);
      if (emEstreia) setEstreiaFase('foto'); // volta ao estado A
    }
  }

  // Grava o quadrado tracejado como a miniatura de verdade (best-effort, sem segurar a tela); com o 200,
  // o avatar_url novo já traz o `?rc=` e as miniaturas de todo lado passam a cortar nele.
  function gravarMiniaturaDaFoto(recorteMini) {
    gravarMiniatura(recorteMini).then((url) => {
      if (!url) return;
      setMe((m) => (m ? { ...m, user: { ...m.user, avatar_url: url } } : m));
      aplicarNoPerfilGlobal({ avatar_url: url });
    });
  }

  // "Ajustar enquadramento": regrava só o recorte (PUT), sem
  // mandar original nenhuma (a que já está guardada não muda).
  async function enviarRecorte(blob, recorteMini = null) {
    const file = new File([blob], 'recorte.jpg', { type: 'image/jpeg' });
    ultimoRecorte.current = blob; // o "Tentar de novo" de um erro aqui repete ESTE recorte
    setFotoLocal(null);
    setUploadFoto(true);
    setErro('');
    setUploadErro(null);
    try {
      const data = await apiUploadCampos('/api/me/avatar/recorte', { recorte: file }, { method: 'PUT' });
      setMe((m) => (m ? { ...m, user: { ...m.user, foto_url: data.foto_url, avatar_url: data.avatar_url, figurinha_ativa: data.figurinha_ativa } } : m));
      aplicarNoPerfilGlobal({ foto_url: data.foto_url, avatar_url: data.avatar_url, figurinha_ativa: data.figurinha_ativa });
      setFotoZoom(1); // enquadramento novo: é ele que manda, o zoom volta ao piso
      setFotoLocal(URL.createObjectURL(file)); // só depois do 200, como em subirFoto
      setUploadFoto(false);
      ultimoRecorte.current = null;
      if (recorteMini && !data.figurinha_ativa) gravarMiniaturaDaFoto(recorteMini);
      setToast({ tipo: 'success', mensagem: 'Enquadramento atualizado.' });
    } catch (err) {
      setUploadErro(mensagemUploadFoto(err));
      setUploadFoto(false);
    }
  }

  // Escolhe o ficheiro (galeria/câmera) e abre o CropModal 2:3 — igual ao
  // Onboarding. A normalizada segue guardada em origParaEnviar: se o recorte
  // for confirmado, ela vai junto como a "original" (foto_original_url).
  async function onPickFile(e) {
    const file = e.target.files?.[0];
    e.target.value = ''; // permite re-seleccionar o mesmo ficheiro
    if (!file) return;
    setModalFoto(false); // fecha o modal "Sua foto" ao escolher — revela o CropModal
    const normalizada = await normalizarFoto(file);
    origParaEnviar.current = normalizada;
    setCropModo('nova');
    setCropFile(normalizada);
  }

  // "Ajustar enquadramento": reabre o CropModal sobre a foto ORIGINAL guardada (foto_original_url).
  // Fail-safe (fotos de antes de a original ser guardada, ou sem a migração 057): sem original, reabre
  // sobre o RECORTE atual — dá para aproximar, não para recuperar área perdida no primeiro recorte.
  async function abrirAjustarEnquadramento() {
    const fonte = jogador.foto_original_url || fotoOriginal;
    if (!fonte) return;
    setAjustandoEnquadramento(true);
    setErro('');
    try {
      const resp = await fetch(urlImagem(urlAsset(fonte), 1600));
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const blob = await resp.blob();
      origParaEnviar.current = null; // não é upload de foto nova — não manda "original"
      setCropModo('ajustar');
      setModalFoto(false);
      setCropFile(new File([blob], 'ajustar.jpg', { type: blob.type || 'image/jpeg' }));
    } catch (e) {
      console.error('[figurinha] abrir ajustar enquadramento falhou:', e.message);
      setErro('Não foi possível abrir sua foto para ajustar. Tente de novo.');
    } finally {
      setAjustandoEnquadramento(false);
    }
  }

  // Confirmar do CropModal — um só ponto, os dois fluxos ("Escolher outra
  // foto" e "Ajustar enquadramento") só diferem no que fazem com o recorte.
  async function aoConfirmarCrop(blob, extra) {
    setCropFile(null);
    const recorteMini = extra?.recorte || null; // o quadrado tracejado da miniatura
    ultimoRecorteMini.current = recorteMini;
    if (cropModo === 'ajustar') {
      await enviarRecorte(blob, recorteMini);
      return;
    }
    const original = origParaEnviar.current;
    ultimoFicheiro.current = blob;
    ultimoRecorte.current = null;
    await subirFoto(blob, estreiaFase === 'foto', original, recorteMini);
  }
  function aoCancelarCrop() {
    setCropFile(null);
    origParaEnviar.current = null;
  }

  // "Tentar de novo" (P1-5): repete o upload com o MESMO recorte (+ original,
  // se havia), sem passar pelo CropModal de novo. Um erro do "Ajustar
  // enquadramento" repete o PUT do recorte (antes o botão não fazia nada: só
  // olhava para o arquivo do upload de foto nova).
  function repetirUpload() {
    if (ultimoRecorte.current) enviarRecorte(ultimoRecorte.current, ultimoRecorteMini.current);
    else if (ultimoFicheiro.current) subirFoto(ultimoFicheiro.current, estreiaFase === 'foto', origParaEnviar.current, ultimoRecorteMini.current);
  }

  // "Minhas figurinhas": até 6, mais recente primeiro. Recarrega
  // toda vez que o modal "Sua foto" abre (pode ter mudado desde a última).
  function carregarHistorico() {
    return apiFetch('/api/me/avatar/historico')
      .then((data) => data?.items || [])
      .catch(() => []); // galeria some sozinha — não é motivo pra tela de erro
  }
  useEffect(() => {
    if (!modalFoto) return undefined;
    let vivo = true;
    carregarHistorico().then((items) => { if (vivo) setHistorico(items); });
    return () => { vivo = false; };
  }, [modalFoto]);

  async function usarDoHistorico(item) {
    if (usandoHistoricoId) return;
    setUsandoHistoricoId(item.id);
    setErro('');
    try {
      const data = await apiFetch(`/api/me/avatar/historico/${item.id}`, { method: 'PUT' });
      setMe((m) => (m ? { ...m, user: { ...m.user, avatar_url: data.avatar_url, kit_ativo: data.kit, figurinha_ativa: data.figurinha_ativa } } : m));
      setFotoLocal(null); // mostra o avatar_url novo (não o preview local de upload)
      recarregarPerfilGlobal();
      setToast({ tipo: 'success', mensagem: 'Figurinha aplicada.' });
    } catch (err) {
      setErro(err?.message || 'Não deu para usar essa figurinha. Tente de novo.');
    } finally {
      setUsandoHistoricoId(null);
    }
  }

  // Aviso de erro partilhado: erro de upload com mensagem accionável +
  // "tentar de novo" inline; senão, o erro genérico da página. No studio o erro do
  // upload sai SOB O CARD (`avisoUploadErro`), onde a pessoa está olhando, e o fim da
  // página fica só com o genérico (`avisoErroGenerico`): um erro que mora
  // abaixo das abas ninguém vê, e a tela ainda dizia que a foto já tinha mudado.
  const avisoUploadErro = uploadErro ? (
    <div className="alert alert--error" role="alert" style={{ margin: 0, display: 'grid', gap: 8, justifyItems: 'start' }}>
      <span>{uploadErro.texto}</span>
      {uploadErro.podeRepetir ? (
        <button type="button" onClick={repetirUpload} disabled={uploadFoto} className="btn btn--sm hud-corners-s cta-gold" style={{ fontFamily: "'Rajdhani', sans-serif", letterSpacing: '0.06em' }}>
          {uploadFoto ? 'Enviando…' : 'Tentar de novo'}
        </button>
      ) : null}
    </div>
  ) : null;
  const avisoErroGenerico = !uploadErro && erro ? (
    <div className="alert alert--error" style={{ margin: 0 }}>{erro}</div>
  ) : null;
  const avisoErro = avisoUploadErro || avisoErroGenerico;

  // Partilha do cromo no momento da estreia (imagem do card + texto viral). No app vai direto à folha de
  // compartilhar do sistema: o navigator.share do WebView não é garantido, e o <a download> é ignorado.
  async function partilharCromo() {
    celebrarPartilha(frameHex);
    try {
      const blob = await gerarFigurinhaCanvas(opts);
      const nome = ficheiroNome(nomeJogador(jogador));
      const file = blob ? new File([blob], nome, { type: 'image/png' }) : null;
      const payload = { title: 'Meu card Futty', text: 'Veja meu cartão de jogador no Futty ⚽' };
      if (ehNativo()) {
        await salvarOuCompartilhar(blob, nome, { titulo: payload.title });
      } else if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ ...payload, files: [file] });
      } else if (navigator.share) {
        await navigator.share(payload);
      } else if (blob) {
        await salvarOuCompartilhar(blob, nome);
      }
    } catch (e) {
      if (e?.name !== 'AbortError') setErro(e?.message || 'Não deu para compartilhar. Tente de novo.');
    } finally {
      concluirEstreia();
    }
  }

  // Gerar avatar com IA a partir da foto atual (endpoint usa users.avatar_url).
  // `kitId` opcional: quando vem de um onClick recebe o evento → cai no kit vestido.
  async function gerarAvatarIA(kitId) {
    if (gerandoIA) return;
    const kit = typeof kitId === 'string' ? kitId : kitAtivo;
    // Mesmo marcador de gerarAvatarIAEstreia/dispararFigurinhaIA
    // (Onboarding): cobre a TROCA de foto/uniforme, não só o cadastro. Antes
    // do POST — é o que o Início lê ao montar, se a pessoa sair desta tela
    // enquanto a geração ainda corre.
    try {
      sessionStorage.setItem('futty_figurinha_gerando', '1');
    } catch {
      /* priv */
    }
    setGerandoIA(true);
    setErro('');
    setLimiteIA(false);
    setErroIA(false);
    setErroIAmsg('');
    setSemGeracoes(false);
    setFotoRecusada(false);
    setEmailNaoConfirmado(false);
    let emSegundoPlano = false;
    try {
      // O POST devolve `{ jobId }` na hora e a pintura segue em segundo plano (ver acompanharPintura).
      // Uniforme já pintado da mesma foto responde na hora com a figurinha, sem job.
      const data = await apiFetch('/api/me/avatar/ai', { method: 'POST', body: JSON.stringify({ kit, assincrono: true }) });
      if (data.jobId) {
        iniciarPintura(data, { kit });
        emSegundoPlano = true;
        return;
      }
      // Guarda o avatar, o kit vestido e regista o slot novo (sem duplicar).
      setMe((m) => (m ? {
        ...m,
        user: { ...m.user, avatar_url: data.avatar_url, kit_ativo: data.kit, figurinha_ativa: data.figurinha_ativa },
        slots: [...new Set([...(m.slots || []), data.kit])],
      } : m));
      setFotoLocal(null); // limpa o preview local → mostra o avatar IA (avatar_url)
      recarregarPerfilGlobal();
      // O direito acabou de ser gasto (crédito a menos, ou a linha do pacote):
      // relê, para o contador e o botão dourado contarem a verdade.
      estadoBrilhantes().then(aplicarBrilhante);
      setFotoTrocadaSemGerar(false); // gerou (ou reutilizou de propósito) — some o pulso
      // reutilizado:true (motor) — o slot deste kit já valia para a
      // foto atual e não gerou de novo. Sem aviso, parecia que o toque no
      // botão não fez nada.
      if (data.reutilizado) setToast({ tipo: 'info', mensagem: 'Sua figurinha já estava pronta' });
    } catch (err) {
      tratarFalhaDaGeracao(err);
    } finally {
      if (!emSegundoPlano) setGerandoIA(false);
    }
  }

  // O que a tela faz com cada falha da geração — serve ao POST (as validações seguem síncronas no motor) e ao
  // desfecho 'falhou' da pintura em segundo plano: os códigos e as mensagens são os mesmos de antes do job.
  function tratarFalhaDaGeracao(err) {
    // EMAIL_NAO_CONFIRMADO: gate anti-abuso — mesmo status 403 do limite de quota, por isso tem de ser
    // verificado PRIMEIRO (código distingue os dois).
    if (err?.code === 'EMAIL_NAO_CONFIRMADO') setEmailNaoConfirmado(true);
    // SEM_DIREITO (SPEC-FIGURINHA-3) — também 403, mas não é limite nenhum: é o direito que acabou (ou o
    // pacote do time que não existe). Recarrega o estado para o bloco "Vire Brilhante" aparecer sozinho; o
    // card de quota do plano NÃO serve aqui, e mostrá-lo seria mentir.
    else if (err?.code === 'SEM_DIREITO') {
      estadoBrilhantes().then(aplicarBrilhante);
      setErroIAmsg(err.message);
      // P2: com a loja ligada o overlay troca o "Tentar novamente" (que daria o mesmo 403) por
      // "Suas gerações acabaram. Comprar mais?" → Planos, com a Minha Figurinha em destaque.
      setSemGeracoes(true);
      setErroIA(true);
    } else if (err?.code === 'FOTO_RECUSADA') {
      // FOTO_RECUSADA: a cabeça cortou nas duas tentativas com esta foto — o motor já não a pinta. O overlay
      // mostra o recado e leva a escolher outra foto (sem "tentar de novo", que daria o mesmo).
      setFotoRecusada(true);
      setErroIA(true);
    } else if (err?.status === 403) setLimiteIA(true); // gate antigo de plano (morto, fica de rede)
    else {
      // FOTO_INVALIDA / TETO_DIARIO_ATINGIDO / IA_INDISPONIVEL / FOTO_DESATUALIZADA / FIGURINHA_DEFEITUOSA:
      // causas acionáveis com mensagem digna própria, em vez do genérico "não deu desta vez".
      // IA_INDISPONIVEL (fal recusou por chave/crédito, falha do MOTOR) usa a mensagem que já vem do
      // backend — nunca sugere "tente outra foto", porque o problema não é a foto. FOTO_DESATUALIZADA é a
      // trava de hash do motor: a foto que ele baixou ainda não era a que acabou de subir, e ele recusou
      // gerar em vez de fazer a figurinha da foto errada. Nada a corrigir do lado de cá — é esperar uns
      // segundos e tocar de novo, e o botão de repetir do overlay já está lá. Resto (fal fora do ar, etc.)
      // mantém o genérico com retry, que já cobre bem o transitório.
      if (['FOTO_INVALIDA', 'TETO_DIARIO_ATINGIDO', 'IA_INDISPONIVEL', 'FOTO_DESATUALIZADA', 'SEM_DIREITO', 'FIGURINHA_DEFEITUOSA', 'GERACAO_INTERROMPIDA'].includes(err?.code) || err?.mostrar) setErroIAmsg(err.message);
      setErroIA(true); // qualquer falha → estado de erro com retry no overlay
    }
  }

  // ── A PINTURA EM SEGUNDO PLANO ──────────────────────────────────────────────────────────────────
  // O POST respondeu `{ jobId, estimativaSegundos }`: a barra começa e o app passa a consultar o motor.
  function iniciarPintura(data, { kit, estreia = false }) {
    const nova = {
      jobId: data.jobId,
      kit,
      estreia,
      estimativaSegundos: data.estimativaSegundos || 45,
      etapa: 'preparando',
      decorridoMs: 0,
      baseEm: Date.now(),
    };
    gravarPinturaGuardada(userId, nova);
    setAgora(Date.now());
    setPintura(nova);
  }

  // A figurinha existe: o card troca (a animação de sempre), o direito já foi debitado pelo motor — relê.
  function aplicarPinturaPronta(d, estreia) {
    limparPinturaGuardada();
    setMe((m) => (m ? {
      ...m,
      user: { ...m.user, avatar_url: d.avatar_url, kit_ativo: d.kit, figurinha_ativa: d.figurinha_ativa },
      slots: [...new Set([...(m.slots || []), d.kit])],
    } : m));
    setFotoLocal(null); // limpa o preview local → mostra o avatar IA (avatar_url)
    recarregarPerfilGlobal();
    estadoBrilhantes().then(aplicarBrilhante);
    setFotoTrocadaSemGerar(false);
    setPintura(null);
    setGerandoIA(false);
    if (estreia) setEstreiaFase((f) => (f === 'gerando' || f === 'foto' ? 'pronto' : f)); // mostra o cromo
  }

  // A pintura falhou (o motor não cobrou nada): os mesmos erros de sempre — cabeça cortada pede outra foto.
  function aplicarPinturaFalhou(d, estreia) {
    limparPinturaGuardada();
    setPintura(null);
    setGerandoIA(false);
    const err = { code: d.code || null, status: d.status || 500, message: d.erro || '', mostrar: !!d.mostrar };
    if (estreia) {
      tratarFalhaDaEstreia(err);
      setEstreiaFase((f) => (f === 'gerando' || f === 'foto' ? faseAposFalhaDaEstreia(err) : f));
    } else {
      tratarFalhaDaGeracao(err);
    }
    // A pintura pode ter gastado um 'gerando' que o motor já marcou 'falhou': relê o perfil para o Início acompanhar.
    recarregarPerfilGlobal();
  }

  // Segue a pintura: pergunta ao motor a cada 3 s enquanto a aba está visível e, ao voltar para ela, na hora.
  // Sair da tela só pára as perguntas — a pintura continua no motor (e o push avisa se a pessoa saiu do app).
  const jobAtual = pintura?.jobId || null;
  const estreiaDoJob = !!pintura?.estreia;
  const pintando = !!pintura;
  useEffect(() => {
    if (!jobAtual) return undefined;
    let vivo = true;
    let timer = null;
    let emVoo = false;
    const inicio = Date.now();
    const visivel = () => typeof document === 'undefined' || document.visibilityState === 'visible';
    const agendar = () => {
      clearTimeout(timer);
      if (vivo && visivel()) timer = setTimeout(consultar, INTERVALO_CONSULTA_MS);
    };
    async function consultar() {
      if (!vivo || emVoo || !visivel()) return;
      emVoo = true;
      try {
        const d = await apiFetch(`/api/figurinha/job/${jobAtual}`, { segundoPlano: true });
        if (!vivo) return;
        if (d.estado === 'pronta') { aplicarPinturaPronta(d, estreiaDoJob); return; }
        if (d.estado === 'falhou') { aplicarPinturaFalhou(d, estreiaDoJob); return; }
        setPintura((p) => (p && p.jobId === jobAtual
          ? { ...p, etapa: d.etapa, estimativaSegundos: d.estimativaSegundos, decorridoMs: d.decorridoSegundos * 1000, baseEm: Date.now() }
          : p));
      } catch (err) {
        if (!vivo) return;
        // 404: o motor não conhece essa pintura (id velho guardado, outra conta) — não há o que esperar.
        if (err?.status === 404) { aplicarPinturaFalhou({ erro: 'Não achamos essa pintura. Toque em gerar para tentar de novo.', mostrar: true }, estreiaDoJob); return; }
        // Rede caiu ou o motor respondeu 5xx: a pintura segue lá — tenta de novo no próximo ciclo.
      } finally {
        emVoo = false;
      }
      if (Date.now() - inicio > TETO_ACOMPANHAMENTO_MS) {
        aplicarPinturaFalhou({ erro: 'A pintura demorou demais. Toque em gerar para tentar de novo. Nada foi cobrado.', mostrar: true }, estreiaDoJob);
        return;
      }
      agendar();
    }
    const aoVoltar = () => { if (visivel()) consultar(); };
    document.addEventListener('visibilitychange', aoVoltar);
    consultar();
    return () => {
      vivo = false;
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', aoVoltar);
    };
    // aplicarPinturaPronta/Falhou só usam setters e funções estáveis do contexto; o job e a estreia são o que muda a pintura.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobAtual, estreiaDoJob]);

  // O relógio da barra: 4 vezes por segundo enquanto há pintura (o decorrido do motor + o tempo local desde a consulta).
  useEffect(() => {
    if (!pintando) return undefined;
    const t = setInterval(() => setAgora(Date.now()), 250);
    return () => clearInterval(t);
  }, [pintando]);
  const situacaoPintura = pintura
    ? situacaoDaPintura({
      etapa: pintura.etapa,
      decorridoMs: pintura.decorridoMs + Math.max(0, agora - pintura.baseEm),
      estimativaSegundos: pintura.estimativaSegundos,
    })
    : null;

  // Reenvia o e-mail de confirmação (gate anti-abuso) — supabase.auth.resend usa a MESMA sessão activa,
  // não precisa senha nem novo login.
  async function reenviarEmailConfirmacao() {
    if (reenviarBusy || !me?.user?.email) return;
    setReenviarBusy(true);
    try {
      const { error } = await supabase.auth.resend({ type: 'signup', email: me.user.email });
      if (error) throw error;
      setReenviarFeito(true);
    } catch (e) {
      setErro(e?.message || 'Não deu para reenviar o e-mail. Tente de novo.');
    } finally {
      setReenviarBusy(false);
    }
  }

  // A2 — toque num kit da grelha. Três caminhos: já gerado (slot) → VESTE via
  // PUT (não gasta direito); sem slot e sem direito → /planos; sem slot e com
  // direito → confirma e gera.
  async function escolherKit(kit) {
    // "Já vestido" só vale com a figurinha no card — no card com a FOTO nenhum uniforme está vestido
    // (kit_ativo nasce 'dark-gold' pelo default da coluna), e tocar nele tem de pintar/vestir.
    if (kit.estado === 'breve' || (avatarEhIA && kit.id === kitAtivo) || gerandoIA) return;
    // O cadeado é por DIREITO (§5), não por PLANO. Vestir um uniforme que já se gerou é sempre livre (slot,
    // custo zero); gerar um novo precisa de crédito ou do pacote do time — e é isso que /planos resolve.
    // Por plano, um membro do pacote veria o PRÓPRIO uniforme do time trancado.
    if (slotsKits.includes(kit.id)) {
      try {
        const data = await apiFetch('/api/me/kit', { method: 'PUT', body: JSON.stringify({ kit: kit.id }) });
        setMe((m) => (m ? { ...m, user: { ...m.user, avatar_url: data.avatar_url, kit_ativo: data.kit, figurinha_ativa: data.figurinha_ativa } } : m));
        aplicarNoPerfilGlobal({ avatar_url: data.avatar_url, kit_ativo: data.kit, figurinha_ativa: data.figurinha_ativa });
      } catch {
        setErroIA(true);
      }
      return;
    }
    // Sem slot: só dá para gerar com direito. Sem ele, a resposta é /planos —
    // nunca um diálogo que ia terminar em 403 SEM_DIREITO. "Minha Brilhante"
    // é o destaque certo: é o único produto que deixa escolher o uniforme (o
    // pacote do time fixa um só, do dono).
    if (!temDireitoDeGerar) return navigate('/planos?destaque=minha');
    // Gastar 1 geração é irreversível: pede confirmação no diálogo próprio
    // (ver kitParaPintar, perto do fim do componente) — nunca sem avisar.
    setKitParaPintar(kit);
  }

  async function confirmarPintura() {
    const kit = kitParaPintar;
    setKitParaPintar(null);
    if (kit) await gerarAvatarIA(kit.id);
  }

  // Escrever no perfil SEM o reler a seguir.
  //
  // Cada toque num fundo grava a preferência e não chama `recarregarPerfilGlobal()` atrás: seria um GET
  // /api/me inteiro para saber uma coisa que o próprio toque acabou de decidir. Numa tela feita para
  // experimentar fundos e uniformes, isso é meia ida a São Paulo por toque.
  //
  // `hidratar` põe o mesmo estado no contexto (e no cache local) sem rede. A releitura só se justifica
  // quando a escrita muda coisas que não sabemos — é o caso da geração de figurinha, que mexe em
  // créditos e estado; essas continuam a chamar `recarregarPerfilGlobal()`.
  function aplicarNoPerfilGlobal(campos) {
    if (!perfil) return;
    hidratarPerfilGlobal({ ...perfil, user: { ...perfil.user, ...campos } });
  }

  // Interruptor "Mostrar minha foto" / "Mostrar minha figurinha" (modal "Sua foto"): troca o que o card
  // mostra sem apagar nada — a figurinha continua no slot, sempre. avatarEhIA já diz qual dos dois está
  // ativo agora, então um toque no modo já ativo não faz nada.
  async function trocarModo(modo) {
    if (trocandoModo || (modo === 'figurinha') === avatarEhIA) return;
    setTrocandoModo(true);
    try {
      const data = await apiFetch('/api/me/avatar/modo', { method: 'PUT', body: JSON.stringify({ modo }) });
      setMe((m) => (m ? { ...m, user: { ...m.user, avatar_url: data.avatar_url, figurinha_ativa: data.figurinha_ativa } } : m));
      aplicarNoPerfilGlobal({ avatar_url: data.avatar_url, figurinha_ativa: data.figurinha_ativa });
    } catch (e) {
      setErro(e?.message || 'Não deu para trocar o card. Tente de novo.');
    } finally {
      setTrocandoModo(false);
    }
  }

  // O fundo é uma PREFERÊNCIA PERSISTIDA, e faltava-lhe metade do laço: a coluna
  // users.fundo_figurinha existe (migração 018), o GET /api/me devolve-a e esta
  // página já a LIA no arranque — mas ninguém a escrevia, por isso a escolha
  // morria ao sair. Agora o Início mostra este mesmo cromo e precisa de saber qual
  // é o fundo, o que torna a escrita obrigatória: é a fonte de verdade dos dois.
  // Optimista — o studio responde já e o PATCH segue atrás; se falhar, a escolha
  // vale para esta sessão e não se estraga o ecrã por causa de uma preferência.
  async function escolherFundo(k) {
    if (k === fundo) return;
    // SPEC-FIGURINHA-3 §4/§9: os 6 fundos vêm COM a Brilhante — são composição do card, custo zero. Não há
    // gate por plano (Pro/Elite; os planos saíram das telas): um membro do pacote do time veria o Aura
    // trancado no card que o time acabou de pagar, com "Os 6 fundos liberados" escrito na compra. Sem
    // Brilhante não há seletor nenhum, portanto chegar aqui já significa ter direito ao fundo.
    // Guarda o anterior para reverter se o PATCH falhar (caso real: constraint do Royal sem a migração
    // aplicada dava 500 — o tile ficava marcado no fundo novo com o banco silenciosamente no antigo).
    const anterior = fundo;
    setFundo(k);
    try {
      await apiFetch('/api/me', { method: 'PATCH', body: JSON.stringify({ fundo_figurinha: k }) });
      setMe((m) => (m ? { ...m, user: { ...m.user, fundo_figurinha: k } } : m));
      aplicarNoPerfilGlobal({ fundo_figurinha: k });
    } catch (e) {
      setFundo(anterior); // nunca fica com o tile marcado e o banco diferente
      setToast({ tipo: 'error', mensagem: e?.message || 'Não deu para trocar o fundo agora. Tente de novo.' });
    }
  }

  // Escolha do avatar genérico — mesmo padrão optimista do fundo.
  async function escolherAvatarGenerico(k) {
    setAvatarGenericoEscolha(k);
    try {
      await apiFetch('/api/me', { method: 'PATCH', body: JSON.stringify({ avatar_generico: k }) });
      setMe((m) => (m ? { ...m, user: { ...m.user, avatar_generico: k } } : m));
      aplicarNoPerfilGlobal({ avatar_generico: k });
    } catch { /* preferência: não vale um erro no ecrã */ }
  }

  async function baixar() {
    if (busy) return;
    setBusy(true);
    setErro('');
    try {
      const blob = await gerarFigurinhaCanvas(opts);
      if (!blob) {
        setErro('Não deu para gerar a imagem. Tente de novo.');
        return;
      }
      // Web: baixa. App: folha de compartilhar (tem "Salvar imagem"); fechar a
      // folha sem escolher nada não é erro.
      await salvarOuCompartilhar(blob, ficheiroNome(nomeJogador(jogador)), { titulo: 'Minha figurinha Futty' });
    } catch (e) {
      setErro(e?.message || 'Não deu para gerar agora. Tente de novo.');
    } finally {
      setBusy(false);
    }
  }

  async function partilhar() {
    if (busy) return;
    setBusy(true);
    setErro('');
    try {
      const blob = await gerarFigurinhaCanvas(opts);
      if (!blob) {
        setErro('Não deu para gerar a imagem. Tente de novo.');
        return;
      }
      const file = new File([blob], ficheiroNome(nomeJogador(jogador)), { type: 'image/png' });
      if (!ehNativo() && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: 'Minha figurinha Futty' });
      } else {
        await salvarOuCompartilhar(blob, file.name, { titulo: 'Minha figurinha Futty' });
      }
    } catch (e) {
      if (e?.name !== 'AbortError') setErro(e?.message || 'Não deu para compartilhar. Tente de novo.');
    } finally {
      setBusy(false);
    }
  }

  // Foto recusada → o botão do recado leva direto ao seletor de foto (o mesmo de "Trocar foto"). Nada
  // gasta.
  function escolherOutraFoto() {
    setFotoRecusada(false);
    setErroIA(false);
    setErroIAmsg('');
    fileRef.current?.click();
  }

  // Overlay do card: "a gerar" OU, se a geração falhou (≠403), estado de ERRO com retry. No erro o logo
  // fica ESTÁTICO — sinal de que parou.
  //
  // Usa o FuttyLoader DIRECTO, não o <LoadingFutty />. O LoadingFutty é o padrão de ECRÃ e traz
  // minHeight: calc(100dvh - 120px) (~724px); dentro deste card de ~450px transbordava e empurrava o F
  // para baixo. Aqui o centro é o do CARD, e quem o dá é o placeItems:center do próprio overlay.
  const overlayGerando = (
    // Sem backdrop-filter. Este overlay fica por cima do card
    // ENQUANTO o F de carregamento se pinta — ou seja, o compositor teria de
    // refazer o desfoque a cada quadro da animação, e o que está por baixo é a
    // figurinha parada. 0,75 + blur ≈ 0,92 chapado no mesmo tom.
    <div style={{ position: 'absolute', inset: 0, zIndex: 8, clipPath: CLIP_OCTOGONO, background: 'rgba(5,8,16,0.92)', display: 'grid', placeItems: 'center' }}>
      {erroIA && semGeracoes && lojaLigada ? (
        // P2 — as gerações acabaram e a loja está ligada: tentar de novo daria o mesmo 403, então o
        // caminho é comprar mais (Planos, Minha Figurinha em destaque). "Agora não" só fecha.
        <div style={{ display: 'grid', justifyItems: 'center', gap: 12, padding: 16, textAlign: 'center' }}>
          <span style={{ opacity: 0.55, lineHeight: 0 }}><FuttyLogo variant="metallic" size={64} /></span>
          <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)' }}>Suas gerações acabaram. Comprar mais?</span>
          <span className="cta-gold-glow" style={{ display: 'flex' }}>
            <button type="button" className="btn hud-corners cta-gold" style={{ height: 38, paddingLeft: 16, paddingRight: 16, fontSize: 13 }} onClick={() => navigate('/planos?destaque=minha')}>
              Comprar mais
            </button>
          </span>
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => { setErroIA(false); setSemGeracoes(false); }}>
            Agora não
          </button>
        </div>
      ) : erroIA && fotoRecusada ? (
        // A cabeça cortou nas duas tentativas com ESTA foto. Tentar de novo daria o mesmo: o recado leva a
        // outra foto.
        <div style={{ display: 'grid', justifyItems: 'center', gap: 12, padding: 16, textAlign: 'center' }}>
          <span style={{ opacity: 0.55, lineHeight: 0 }}><FuttyLogo variant="metallic" size={64} /></span>
          <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)' }}>{RECADO_FOTO_RECUSADA}</span>
          <button type="button" className="btn btn--purple hud-corners" style={{ height: 38, paddingLeft: 16, paddingRight: 16, fontSize: 13 }} onClick={escolherOutraFoto}>
            Escolher outra foto
          </button>
        </div>
      ) : erroIA ? (
        <div style={{ display: 'grid', justifyItems: 'center', gap: 12, padding: 16, textAlign: 'center' }}>
          {/* LEI DO F: logo oficial transparente (FuttyLogo SVG), estático no erro.
              O antigo /futty-logo-metallic.png (fundo preto sólido) está BANIDO. */}
          <span style={{ opacity: 0.55, lineHeight: 0 }}><FuttyLogo variant="metallic" size={64} /></span>
          <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)' }}>{erroIAmsg || 'Não deu desta vez. Tente de novo.'}</span>
          <button type="button" className="btn btn--purple hud-corners" style={{ height: 38, paddingLeft: 16, paddingRight: 16, fontSize: 13 }} onClick={gerarAvatarIA}>
            Tentar novamente
          </button>
        </div>
      ) : situacaoPintura ? (
        // A barra HONESTA: avança pelo tempo típico até 90%, segura em "finalizando…" e nunca marca 100% antes
        // de a imagem existir. O F continua pintando em cima.
        <div style={{ display: 'grid', justifyItems: 'center', gap: 14, padding: 12 }}>
          <FuttyLoader size={96} label={null} />
          <BarraPintura situacao={situacaoPintura} estimativaSegundos={pintura.estimativaSegundos} />
        </div>
      ) : (
        <FuttyLoader size={129} label={null} />
      )}
    </div>
  );

  // Enquanto a fase de estreia não está decidida (perfil a carregar), espera.
  if (estreiaFase === null) {
    return (
      <div className="app-shell">
        <Topbar hud="FIGURINHA" />
        <main className="app-main">
          <LoadingFutty />
        </main>
      </div>
    );
  }

  // ── ECRÃ DE ESTREIA (1ª visita): substitui o studio até partilhar/saltar ──
  if (estreiaFase === 'foto' || estreiaFase === 'gerando' || estreiaFase === 'pronto') {
    return (
      <div className="app-shell">
        <Topbar hud="FIGURINHA" />
        <main className="app-main" style={{ paddingLeft: 16, paddingRight: 16 }}>
          {/* Card */}
          <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0' }}>
            <div className="fig-card-enter" style={{ position: 'relative', width: 'min(74vw, 300px)', aspectRatio: '2 / 3' }}>
              {previewUrl
                ? <img
                    src={previewUrl}
                    alt="figurinha"
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                  />
                : /* O F a carregar, não o PlayerCard (geração anterior do cromo): seria um salto, não um carregamento. */
                  <div style={{ display: 'grid', placeItems: 'center', width: '100%', height: '100%' }}>
                    <FuttyLoader size={96} label={null} />
                  </div>
              }
              {estreiaFase === 'gerando' ? overlayGerando : null}
            </div>
          </div>

          <input ref={fileRef} type="file" accept="image/*" hidden onChange={onPickFile} />

          <div style={{ maxWidth: 420, margin: '0 auto', textAlign: 'center', display: 'grid', gap: 12 }}>
            {estreiaFase === 'foto' ? (
              <>
                <h2 style={{ fontFamily: "'Rajdhani', sans-serif", fontWeight: 800, fontSize: 22, color: '#fff', margin: 0 }}>Seu card está quase pronto <EstrelaIA size={14} color="#fff" /></h2>
                <p style={{ fontSize: 14, lineHeight: 1.5, color: 'rgba(255,255,255,0.8)', margin: 0 }}>{fotoRecusada ? RECADO_FOTO_RECUSADA : 'Adicione uma foto para personalizar seu cartão de jogador'}</p>
                <button type="button" className="btn btn--purple" style={{ width: '100%', height: 48, fontSize: 15 }} onClick={escolherOutraFoto}>{fotoRecusada ? 'Escolher outra foto' : 'Adicionar foto'}</button>
                <button type="button" onClick={concluirEstreia} style={{ border: 'none', background: 'transparent', color: 'var(--label-color)', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Pular por agora →</button>
              </>
            ) : estreiaFase === 'gerando' ? (
              <>
                <h2 style={{ fontFamily: "'Rajdhani', sans-serif", fontWeight: 800, fontSize: 20, color: '#fff', margin: 0 }}>Gerando sua figurinha… <EstrelaIA size={14} color="#fff" /></h2>
                <p className="texto-apoio texto-apoio--centro" style={{ marginTop: 0 }}>Leva uns {pintura?.estimativaSegundos || 45} segundos · pode sair da tela, a gente avisa</p>
              </>
            ) : (
              <>
                <h2 style={{ fontFamily: "'Rajdhani', sans-serif", fontWeight: 800, fontSize: 24, color: '#fff', margin: 0 }}>Seu card está pronto!</h2>
                {limiteIA ? (
                  <p style={{ fontSize: 12, color: 'var(--label-color)', margin: 0 }}>Não deu para gerar agora: mostramos o card com sua foto.</p>
                ) : null}
                <button type="button" className="btn btn--purple" style={{ width: '100%', height: 48, fontSize: 15, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }} onClick={partilharCromo}>
                  <Share2 size={18} /> Compartilhar agora
                </button>
                <button type="button" className="btn btn--purple-outline" style={{ width: '100%', height: 44 }} onClick={concluirEstreia}>Personalizar</button>
                <button type="button" onClick={concluirEstreia} style={{ border: 'none', background: 'transparent', color: 'var(--label-color)', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Pular →</button>
              </>
            )}
            {avisoErro}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <Topbar hud="FIGURINHA" />
      <main className="app-main" style={{ paddingLeft: 16, paddingRight: 16, paddingTop: 10, paddingBottom: 24 }}>
        {/* 1. ZONA DO CARD (2:3, levitação Star Fox + entrada animada) */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '4px 0 16px' }}>
          <div className="fig-card-enter fig-studio-card" style={{ position: 'relative' }}>
            {/* Sombra viva no chão (contra-fase com a levitação) */}
            <div
              className="fig-shadow"
              style={{ position: 'absolute', left: '15%', bottom: -18, width: '70%', height: 14, background: 'radial-gradient(ellipse, rgba(212,160,23,0.35), rgba(0,0,0,0.5) 60%, transparent)', filter: 'blur(8px)', pointerEvents: 'none', zIndex: 0 }}
            />
            {/* Bob (translateY) exterior → Sway (rotate 3D) interior */}
            <div className="fig-bob" style={{ position: 'relative', width: '100%', height: '100%', zIndex: 1 }}>
              <div className="fig-sway" style={{ position: 'relative', width: '100%', height: '100%' }}>
                {fundoUrl ? (
                  <>
                    {/* Camada de fundo — card completo SEM jogador */}
                    <img
                      src={fundoUrl}
                      alt="figurinha"
                      className="fig-aura"
                      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', zIndex: 2 }}
                    />

                    {/* Fundo vivo — partículas ENTRE o fundo e o jogador (caem atrás dele).
                        Estádio E Gradiente (chuva dourada sobre a carta gold). */}
                    {avatarEhIA && (fundo === 'estadio' || fundo === 'gradiente') ? (
                      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 3, containerType: 'size', mixBlendMode: 'screen', clipPath: CLIP_OCTOGONO }}>
                        {FUTTY_PARTICULAS.map((p, i) => {
                          // Sobre o facetado escuro: brancas → branco-quente; douradas
                          // mantêm-se (a chuva é o "premium discreto").
                          const cor = fundo === 'gradiente' && p.cor === '#ffffff' ? '#fff8dc' : p.cor;
                          return (
                            <span
                              key={i}
                              className="fig-particle"
                              style={{ position: 'absolute', left: `${p.left}%`, top: '-5%', width: p.size, height: p.size, borderRadius: '50%', background: cor, boxShadow: `0 0 6px ${cor}`, animationDuration: `${p.dur * 1.25}s`, animationDelay: `${p.delay}s` }}
                            />
                          );
                        })}
                      </div>
                    ) : null}
                    {/* Sem névoa no fundo Épico: o facetado é gráfico, não atmosférico; a bruma por cima embaçaria o
                        lapidado. As partículas (chuva) ficam — dão o "premium discreto" sem embaçar. */}

                    {/* GOLDEN — mina encantada VIVA no preview: poeira de diamante a z3,
                        ATRÁS do jogador (lei do brilho do cromo). O download leva o pico
                        estático (canvas). reduced-motion → pontos ténues sem flash. */}
                    {fundo === 'golden' ? (
                      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 3, clipPath: CLIP_OCTOGONO }}>
                        {GOLDEN_GLINTS_UI.map((g, i) => (
                          <span key={i} className="fig-glint" style={{ left: `${g.x}%`, top: `${g.y}%`, '--gd': `${g.d}px`, '--gdl': `${g.dl}s`, '--gdur': `${g.dur}s` }}>
                            <span className="fig-glint__dot" />
                            <span className="fig-glint__cross" />
                          </span>
                        ))}
                      </div>
                    ) : null}

                    {/* Camada do jogador — só o avatar, por cima das partículas */}
                    {jogadorUrl ? (
                      <img
                        src={jogadorUrl}
                        alt=""
                        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', pointerEvents: 'none', zIndex: 4 }}
                      />
                    ) : null}

                    {/* Camada placa+nome — POR CIMA do jogador (nunca tapada por ele) */}
                    {placaUrl ? (
                      <img
                        src={placaUrl}
                        alt=""
                        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', pointerEvents: 'none', zIndex: 5 }}
                      />
                    ) : null}

                    {/* Glow pulsante fixo sobre a zona do nome (nada a atravessá-lo) */}
                    <div className="fig-name-glow" style={{ position: 'absolute', left: 0, bottom: '8%', width: '100%', height: '20%', pointerEvents: 'none', zIndex: 5, background: 'radial-gradient(ellipse 55% 70% at 50% 55%, rgba(245,224,112,0.20), transparent 70%)', mixBlendMode: 'screen', WebkitMaskImage: 'linear-gradient(to top, black 0%, black 55%, transparent 100%)', maskImage: 'linear-gradient(to top, black 0%, black 55%, transparent 100%)' }} />

                    {/* Luz direccional sincronizada com o sway (desloca-se → volume 3D).
                        Wrapper estático recorta o octógono; o interior desliza. */}
                    <div style={{ position: 'absolute', inset: 0, zIndex: 6, pointerEvents: 'none', overflow: 'hidden', clipPath: CLIP_OCTOGONO }}>
                      <div className="fig-light" style={{ position: 'absolute', inset: '-5%', background: 'linear-gradient(105deg, rgba(255,245,200,0.08) 0%, transparent 35%, transparent 65%, rgba(0,0,0,0.12) 100%)', mixBlendMode: 'soft-light', WebkitMaskImage: 'linear-gradient(to bottom, black 0%, black 45%, transparent 75%)', maskImage: 'linear-gradient(to bottom, black 0%, black 45%, transparent 75%)' }} />
                    </div>

                    {/* Linha de brilho a percorrer o frame (cromo a apanhar luz) */}
                    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 7, clipPath: CLIP_OCTOGONO }}>
                      <div className="fig-frame-shine" style={{ position: 'absolute', top: 0, left: 0, width: '250%', height: '100%', background: 'linear-gradient(115deg, transparent 44%, rgba(255,240,180,0.35) 50%, transparent 56%)', mixBlendMode: 'screen' }} />
                    </div>

                    {/* Dots dos cantos a cintilar intercalados (sobre os dots do canvas:
                        19*k → 4.75% na horizontal, 3.17% na vertical num card 2:3) */}
                    {[
                      { pos: { top: '3.17%', left: '4.75%', marginTop: -5, marginLeft: -5 }, delay: 0 },
                      { pos: { top: '3.17%', right: '4.75%', marginTop: -5, marginRight: -5 }, delay: 2.1 },
                      { pos: { bottom: '3.17%', left: '4.75%', marginBottom: -5, marginLeft: -5 }, delay: 4.3 },
                      { pos: { bottom: '3.17%', right: '4.75%', marginBottom: -5, marginRight: -5 }, delay: 6.2 },
                    ].map((d, i) => (
                      <span
                        key={i}
                        className="fig-dot-twinkle"
                        style={{ position: 'absolute', ...d.pos, width: 10, height: 10, borderRadius: 1, background: 'linear-gradient(135deg, #f5e070, #d4a017)', mixBlendMode: 'screen', pointerEvents: 'none', zIndex: 7, animationDelay: `${d.delay}s` }}
                      />
                    ))}
                  </>
                ) : (
                  // GRUPO B 6a — ver nota no fallback da estreia: o F a carregar em vez
                  // do PlayerCard (a geração anterior do cromo).
                  <div style={{ display: 'grid', placeItems: 'center', width: '100%', height: '100%' }}>
                    <FuttyLoader size={96} label={null} />
                  </div>
                )}

              </div>
            </div>
            {/* Estado "a gerar" — cobre a zona do card */}
            {/* Sem avatar IA o card já veste o genérico da casa (ver `jogadorCard`
                acima) — não há mais empty state de silhueta a desenhar aqui. */}
            {gerandoIA || erroIA ? overlayGerando : null}
            {/* Trocar visual — só quando o card veste o genérico da casa: sem Brilhante E SEM FOTO. Com foto o card
                mostra a foto e o genérico não aparece em lugar nenhum: o botão não mudaria nada. Sem foto, a
                escolha vale para todas as telas (Início, Ranking, Presença). */}
            {!avatarEhIA && !temFoto && !fotoLocal && !uploadFoto && !gerandoIA && !erroIA ? (
              <button
                type="button"
                className="hud-corners-s"
                aria-label="Trocar visual do card"
                onClick={() => setSheetAvatarAberto(true)}
                style={{ position: 'absolute', top: 10, right: 10, zIndex: 8, width: 32, height: 32, display: 'grid', placeItems: 'center', border: '1px solid rgba(212,160,23,0.5)', background: 'rgba(13,13,18,0.72)', color: '#d4a017', cursor: 'pointer' }}
              >
                <RefreshCw size={16} />
              </button>
            ) : null}
          </div>
        </div>

        {/* Foto subida mas ainda sem avatar IA gerado (a foto não entra no card).
            gerandoIA vem PRIMEIRO: fotoLocal só é limpo no sucesso/falha de gerarAvatarIA (não no início),
            então sem esta ordem uma geração já em curso mostrava "Foto carregada, gere seu avatar" por cima
            do botão já dizendo "Gerando…" — duas mensagens discordando.
            Depois vêm o envio e o erro do upload, ANTES de "Foto trocada": essa linha só existe depois do
            200 (fotoLocal nasce lá), e com o upload falhando a pessoa vê o erro aqui, sob o card. */}
        {gerandoIA ? (
          // Título numa linha, com o F, e a explicação embaixo no texto de apoio da casa (≤ 34 em, 2 linhas,
          // centrada); as duas frases coladas numa linha só de 11 px quebrariam no meio, sem alinhamento.
          <div role="status" data-pintando-aviso style={{ display: 'grid', justifyItems: 'center', gap: 2, padding: '4px 0', marginBottom: 10 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, fontSize: 15, letterSpacing: '0.02em', color: '#d4a017' }}>
              <FuttyLoader size={16} label={null} /> Sua figurinha está sendo pintada…
            </span>
            <span className="texto-apoio texto-apoio--centro" style={{ marginTop: 0 }}>Pode sair da tela. A gente avisa quando ficar pronta.</span>
          </div>
        ) : uploadFoto ? (
          <div role="status" style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center', padding: '4px 0', marginBottom: 10, fontSize: 11, color: '#d4a017' }}>
            <FuttyLoader size={14} label={null} /> Enviando sua foto…
          </div>
        ) : avisoUploadErro ? (
          <div style={{ maxWidth: 460, margin: '0 auto 12px' }}>{avisoUploadErro}</div>
        ) : fotoLocal ? (
          // SPEC-FIGURINHA-3: trocar a foto já MUDA a figurinha comum na hora —
          // não há nada a gerar. A linha só convida a gerar a Brilhante quando
          // há direito; senão diz o que aconteceu de facto.
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center', padding: '4px 0', marginBottom: 10, fontSize: 11, color: '#d4a017' }}>
            <Check size={14} /> {temDireitoDeGerar ? 'Foto trocada, gere sua figurinha' : 'Foto trocada. Seu card já mostra a nova foto.'}
          </div>
        ) : null}

        <input ref={fileRef} type="file" accept="image/*" hidden onChange={onPickFile} />

        {/* 2. CONTROLOS — tabs + painel + detalhes */}
        <div style={{ maxWidth: 460, margin: '0 auto', display: 'grid', gap: 14 }}>
          {/* Zoom: linha discreta ABAIXO do card, à direita. Mesma família visual das tabs. Vale também no card
              com a FOTO (ver zoomDaFoto). */}
          {(avatarEhIA || temFoto) && !fotoLocal ? (
            // Os botões − e + precisam de 44 px (o mínimo para o dedo): a linha tem 44 de altura e as margens
            // negativas (−13 e −15) compensam, para a altura que ela ocupa na página ser 16 (44 − 13 − 15) — o
            // card e os botões de baixo não se mexem e a figurinha continua cabendo na primeira tela.
            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 0, height: 44, marginTop: -13, marginBottom: -15 }}>
              <span style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--label-color)', marginRight: 2 }}>{zoomDaFoto ? 'Zoom' : 'Tamanho'}</span>
              <button
                type="button"
                aria-label={zoomDaFoto ? 'Afastar a foto' : 'Reduzir tamanho do avatar'}
                className="fig-zoom-btn"
                onClick={() => mudarZoom(-1)}
                disabled={zoomNoMinimo}
              >
                <Minus size={14} />
              </button>
              <button
                type="button"
                aria-label={zoomDaFoto ? 'Aproximar a foto' : 'Aumentar tamanho do avatar'}
                className="fig-zoom-btn"
                onClick={() => mudarZoom(1)}
                disabled={zoomNoMaximo}
              >
                <Plus size={14} />
              </button>
            </div>
          ) : null}
          {/* Trocar foto + Gerar Avatar IA (na mesma linha). Em telas estreitas demais para os dois lado a lado
              (320 px), o "Gerar" desce inteiro para a linha de baixo, em vez de estourar a tela ou partir o
              rótulo em duas linhas. */}
          <div style={{ display: 'grid', gap: 4 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              <button
                type="button"
                className="btn btn--purple-outline fig-io-btn hud-corners"
                style={{ flex: '0 0 auto', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, paddingLeft: 12, paddingRight: 12 }}
                disabled={uploadFoto || gerandoIA}
                onClick={() => setModalFoto(true)}
              >
                <Camera size={16} /> {jogador.avatar_url ? 'Trocar foto' : 'Adicionar foto'}
              </button>
              {/* SPEC-FIGURINHA-3 §7: "Trocar foto" SEMPRE (à esquerda); o botão
                  de gerar só existe para quem tem DIREITO. Sem direito, o que
                  aparece por baixo é o bloco "Vire Brilhante" — não um botão
                  que só serve para levar um 403 na cara. */}
              {!temFoto ? (
                <div style={{ flex: 1, fontSize: 12, color: 'var(--label-color)', textAlign: 'center', alignSelf: 'center' }}>
                  Adicione uma foto para começar
                </div>
              ) : !temDireitoDeGerar && !gerandoIA ? null : (
                brilharGerar || (temDireitoDeGerar && !avatarEhIA) ? (
                  // EXACTAMENTE a receita do "Ver sorteio" (Inicio.jsx): o glow fica no WRAPPER, em
                  // drop-shadow (filter não é cortado pelo clip-path); o pulso de BORDA fica no botão
                  // (essa metade sobrevive ao recorte a 45° do hud-corners). fig-io-btn
                  // continua nas duas classes só para a ALTURA: .cta-gold sozinho
                  // vale 46px e quebraria a linha com "Trocar foto" (40px, 34px em
                  // ecrãs curtos) — o par .fig-io-btn.cta-gold no app.css resolve
                  // esse empate de especificidade a favor da grade existente.
                  <span className="cta-gold-glow pulse-glow" style={{ flex: 1, display: 'flex' }}>
                    <button
                      type="button"
                      className="btn hud-corners fig-io-btn fig-gerar cta-gold pulse-active"
                      style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                      disabled={gerandoIA || uploadFoto}
                      onClick={gerarAvatarIA}
                    >
                      <EstrelaIA size={16} color="#f0c94a" /> <RotuloGerar />
                    </button>
                  </span>
                ) : (
                  <button
                    type="button"
                    className="btn btn--purple fig-io-btn fig-gerar hud-corners"
                    style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                    disabled={gerandoIA || uploadFoto}
                    onClick={gerarAvatarIA}
                  >
                    {gerandoIA ? (
                      <>
                        <FuttyLoader size={22} label={null} /> Gerando…
                      </>
                    ) : (
                      <>
                        <EstrelaIA size={16} color="#ffffff" /> <RotuloGerar />
                      </>
                    )}
                  </button>
                )
              )}
            </div>
            {/* Contador de gerações restantes (§7). O pacote do time também tem saldo (2 por jogador, não "uma por
                time") — o contador vale para os dois direitos. */}
            {restantesDireito > 0 ? (
              <span style={{ fontSize: 11, color: 'var(--label-color)', textAlign: 'center' }}>
                {restantesDireito === 1 ? 'Resta 1 geração' : `Restam ${restantesDireito} gerações`}
                {kitDoTime ? '' : ' · uniforme à sua escolha'}
              </span>
            ) : null}
            {/* Sem legenda de tempo própria sob o botão: a mensagem acima da linha já cobre gerandoIA, e duas
                legendas de tempo diferentes ao mesmo tempo confundem mais do que ajudam. */}
          </div>

          {/* VIRE BRILHANTE ✨ (SPEC-FIGURINHA-3 §3/§7) — o convite do card com a FOTO para quem ainda não tem
              geração. Um exemplo FIXO (o modelo fictício da conta demo, nunca gerado na hora: gerar um exemplo
              custaria US$0,11 por pessoa que abrisse a tela). `loading="lazy"` + WebP no dobro do tamanho de
              exibição (lei do app leve). Não há "Pedir a minha" aqui: a escolha é a grade de uniformes logo
              abaixo (cadeado → Planos). Fica o pacote para o dono do time: resolve o time inteiro. */}
          {!avatarEhIA && temFoto && !temDireitoDeGerar && brilhante ? (
            <div className="hud-corners" style={{ position: 'relative', background: 'linear-gradient(180deg, #14121c, #0b0a12)', border: '1px solid rgba(212,160,23,0.35)', padding: '16px', display: 'grid', gap: 12 }}>
              <span aria-hidden="true" style={{ position: 'absolute', top: 8, right: 10, width: 7, height: 7, borderRadius: 1, transform: 'rotate(45deg)', background: 'linear-gradient(135deg, #f5e070, #d4a017)' }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <img
                  src={urlAsset('/avatares/exemplo-brilhante.webp')}
                  alt="Exemplo de figurinha"
                  width={72}
                  height={108}
                  loading="lazy"
                  decoding="async"
                  style={{ width: 72, height: 108, objectFit: 'cover', flexShrink: 0, clipPath: CLIP_OCTOGONO, border: '1.5px solid rgba(212,160,23,0.55)' }}
                />
                <div style={{ display: 'grid', gap: 5, minWidth: 0 }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: "'Rajdhani', sans-serif", fontWeight: 800, fontSize: 17, color: '#f0c94a' }}>
                    <Lock size={14} /> Vire figurinha ✨
                  </span>
                  <span style={{ fontSize: 12.5, lineHeight: 1.45, color: 'rgba(255,255,255,0.78)' }}>
                    Sua foto vira uma figurinha de verdade, no uniforme do Futty, com os 6 fundos liberados.
                  </span>
                </div>
              </div>
              {recadoPedido ? (
                // Recusa fala em branco, não em dourado: o dourado desta tela é
                // convite ("dá para ter"), e um não pintado de convite mente.
                <div
                  className="hud-corners-s"
                  role="status"
                  style={pedidoVivo?.estado === 'recusado'
                    ? { padding: '9px 11px', fontSize: 12.5, lineHeight: 1.4, textAlign: 'center', color: 'rgba(255,255,255,0.75)', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.14)' }
                    : { padding: '9px 11px', fontSize: 12.5, lineHeight: 1.4, textAlign: 'center', color: '#f0c94a', background: 'rgba(212,160,23,0.1)', border: '1px solid rgba(212,160,23,0.45)' }}
                >
                  {recadoPedido}
                </div>
              ) : null}
              <div style={{ display: 'grid', gap: 8 }}>
                {/* Dono de time vê o pacote primeiro: é o que resolve o time
                    inteiro, e é a venda maior. P2: o botão leva aos Planos com o
                    pacote em destaque — lá se compra (loja ligada) ou se pede. */}
                {meuTimeBrilhante && !meuTimeBrilhante.brilhante_ativo ? (
                  <span className="cta-gold-glow" style={{ display: 'flex' }}>
                    <button
                      type="button"
                      className="btn hud-corners cta-gold"
                      style={{ flex: 1, fontSize: 12.5, lineHeight: 1.3 }}
                      onClick={() => navigate('/planos?destaque=pacote')}
                    >
                      {textoDoConvite('pacote')}
                    </button>
                  </span>
                ) : null}
                {/* P2: pacote ativo sem uniforme (comprado na loja) — ninguém gera até o dono escolher. */}
                {meuTimeBrilhante?.brilhante_ativo && !meuTimeBrilhante.brilhante_kit ? (
                  <span className="cta-gold-glow" style={{ display: 'flex' }}>
                    <button
                      type="button"
                      className="btn hud-corners cta-gold"
                      style={{ flex: 1, fontSize: 12.5, lineHeight: 1.3 }}
                      onClick={() => navigate(`/planos?uniforme=${meuTimeBrilhante.id}`)}
                    >
                      Escolher o uniforme do time
                    </button>
                  </span>
                ) : null}
                <Link to="/planos" style={{ fontSize: 11.5, color: 'var(--label-color)', textAlign: 'center', textDecoration: 'none' }}>
                  Ver o que cada um dá →
                </Link>
              </div>
            </div>
          ) : null}

          {/* (l) 403 sem código conhecido — defensivo: hoje o motor só devolve EMAIL_NAO_CONFIRMADO ou
              SEM_DIREITO (cada um com seu próprio card), tratados ANTES deste no catch. Isto é o que sobra se um
              dia aparecer um terceiro — mensagem digna, nunca "limite do mês" (não há limite mensal). */}
          {limiteIA ? (
            <div className="hud-corners" style={{ position: 'relative', background: 'linear-gradient(180deg, #14121c, #0b0a12)', border: '1px solid rgba(212,160,23,0.35)', padding: '14px 16px', display: 'grid', gap: 8, justifyItems: 'center', textAlign: 'center' }}>
              <span aria-hidden="true" style={{ position: 'absolute', top: 8, right: 10, width: 7, height: 7, borderRadius: 1, transform: 'rotate(45deg)', background: 'linear-gradient(135deg, #f5e070, #d4a017)' }} />
              <span style={{ fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, fontSize: 15, letterSpacing: '0.04em', color: '#fff' }}>Não deu para gerar agora</span>
              <Link to="/planos" className="btn btn--purple hud-corners" style={{ marginTop: 4, height: 38, paddingLeft: 18, paddingRight: 18, fontSize: 13, display: 'inline-flex', alignItems: 'center', textDecoration: 'none' }}>
                Ver Figurinhas
              </Link>
            </div>
          ) : null}

          {/* (m) E-MAIL NÃO CONFIRMADO — gate anti-abuso, mesma família HUD. */}
          {emailNaoConfirmado ? (
            <div className="hud-corners" style={{ position: 'relative', background: 'linear-gradient(180deg, #14121c, #0b0a12)', border: '1px solid rgba(212,160,23,0.35)', padding: '14px 16px', display: 'grid', gap: 8, justifyItems: 'center', textAlign: 'center' }}>
              <span aria-hidden="true" style={{ position: 'absolute', top: 8, right: 10, width: 7, height: 7, borderRadius: 1, transform: 'rotate(45deg)', background: 'linear-gradient(135deg, #f5e070, #d4a017)' }} />
              <span style={{ fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, fontSize: 15, letterSpacing: '0.04em', color: '#fff' }}>Confirme seu e-mail para gerar</span>
              <span className="texto-apoio texto-apoio--centro" style={{ marginTop: 0 }}>Enviamos um link de confirmação quando você criou a conta.</span>
              {reenviarFeito ? (
                <span style={{ fontSize: 12, color: '#7bd88f' }}>E-mail reenviado, confira sua caixa de entrada.</span>
              ) : (
                <button
                  type="button"
                  className="btn btn--purple hud-corners"
                  style={{ marginTop: 4, height: 38, paddingLeft: 18, paddingRight: 18, fontSize: 13 }}
                  disabled={reenviarBusy}
                  onClick={reenviarEmailConfirmacao}
                >
                  {reenviarBusy ? 'Reenviando…' : 'Reenviar e-mail'}
                </button>
              )}
            </div>
          ) : null}

          {/* Tab strip — SÓ com a figurinha (SPEC-FIGURINHA-3 §3). Os fundos são composição no card, custo zero,
              mas são um prêmio de quem pagou — e a foto já tem o fundo dela. Só as abas ficam exclusivas daqui;
              o card com a FOTO tem a grade de uniformes (logo abaixo, no outro ramo), e as ações, o anúncio e os
              selos valem para os dois (se este bloco os embrulhasse, o card com a foto não teria como ser baixado
              nem compartilhado). */}
          {avatarEhIA ? (
          <>
          <div style={{ display: 'flex', gap: 6 }}>
            {TABS.map((t) => {
              const on = activeTab === t.k;
              return (
                <button
                  key={t.k}
                  type="button"
                  className="hud-corners-s"
                  onClick={() => setActiveTab(t.k)}
                  aria-pressed={on}
                  style={{
                    flex: 1,
                    height: 36,
                    border: on ? '1px solid var(--border-accent)' : '1px solid transparent',
                    background: on ? 'rgba(139,92,246,0.2)' : 'transparent',
                    color: on ? '#8b5cf6' : 'var(--label-color)',
                    fontFamily: "'Rajdhani', sans-serif",
                    fontWeight: 700,
                    fontSize: 13,
                    letterSpacing: '0.5px',
                    textTransform: 'uppercase',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {t.label}
                </button>
              );
            })}
          </div>

          {/* Painel da tab activa */}
          {activeTab === 'fundo' ? (
            // UMA linha só, scroll horizontal (nunca 2 linhas — ordem do dono). Tiles com largura FIXA (não fração
            // do container) para não encolher/quebrar; scroll-snap para o gesto de arrastar assentar num tile de
            // cada vez. Grade partilhada com a tab Uniforme (.fig-seletor-grade / .fig-seletor-tile em app.css) —
            // ver a nota ali.
            <FaixaRolavel className="fig-seletor-grade" envoltorioClassName="faixa-rolavel--grade" data-grade="fundos" rotuloMais="Ver mais fundos" rotuloAnteriores="Ver fundos anteriores">
              {FUNDOS.map((f) => {
                const sel = fundo === f.k;
                // Nenhum cadeado aqui: os 6 fundos são de quem tem Brilhante (§4), e este seletor só existe com
                // Brilhante.
                return (
                  <button
                    key={f.k}
                    type="button"
                    className="fig-seletor-tile"
                    onClick={() => escolherFundo(f.k)}
                    aria-pressed={sel}
                    style={{
                      opacity: sel ? 1 : 0.55, // não-seleccionado mais discreto
                      // glow da selecção no PAI (drop-shadow segue o recorte a 45°;
                      // um box-shadow no thumb seria cortado pelo clip-path).
                      filter: sel ? 'drop-shadow(0 0 7px rgba(212,160,23,0.55))' : 'none',
                    }}
                  >
                    {/* Thumbnail quadrado (cantos 45° — identidade HUD) */}
                    <div className="hud-corners-s" style={{
                      position: 'relative',
                      width: '100%',
                      aspectRatio: '1 / 1',
                      // Épico, Golden e Royal mostram o FUNDO REAL renderizado (fallback = gradiente base).
                      background: f.k === 'golden' && goldenTile
                        ? `url(${goldenTile})`
                        : f.k === 'royal' && royalTile
                          ? `url(${royalTile})`
                          : f.k === 'gradiente' && epicoTile ? `url(${epicoTile})` : FUNDO_BG[f.k],
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      border: sel ? '2px solid #d4a017' : '1px solid var(--border-subtle)',
                      filter: sel ? 'none' : 'saturate(0.7) brightness(0.85)',
                    }}>
                    </div>
                    {/* Nome */}
                    <span style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 10, fontWeight: 700, color: sel ? '#fff' : 'var(--label-color)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {f.label}
                    </span>
                  </button>
                );
              })}
            </FaixaRolavel>
          ) : (
            // Grade partilhada com a tab Fundo (.fig-seletor-grade / .fig-seletor-tile em app.css). A MESMA grade
            // nos três casos (grátis, pacote do time, Minha Figurinha) — o que não se pode pintar aparece com
            // cadeado (leva à Minha Figurinha) em vez de sumir. No pacote não há cartão de texto à parte: o
            // uniforme do time é o tile aberto, e o "Refazer" é uma ação pequena embaixo da grade.
            <>
              {gradeDeUniformes()}
              {refazerAtual ? (
                <button
                  type="button"
                  data-acao="refazer"
                  className="btn btn--ghost btn--sm"
                  style={{ justifySelf: 'center', fontSize: 12, padding: '4px 12px', opacity: 0.85 }}
                  disabled={gerandoIA}
                  onClick={() => setKitParaPintar(kitDoCard)}
                >
                  Refazer {kitDoCard.nome} · {restantesDireito === 1 ? '1 geração' : `${restantesDireito} gerações`}
                </button>
              ) : null}
            </>
          )}
          </>
          ) : temFoto ? (
            // Card com a FOTO: sem seletor de fundos (o fundo é o da própria foto) e, no lugar
            // do "Pedir a minha", os uniformes — o 1º liberado, os outros com cadeado (ver gradeDeUniformes).
            <div style={{ display: 'grid', gap: 8 }}>
              <span style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--label-color)' }}>
                Uniforme da figurinha
              </span>
              {gradeDeUniformes()}
            </div>
          ) : null}

          {avisoErroGenerico}

          {/* 3. AÇÕES — logo abaixo do painel de tiles. Mais altas (46px) que os botões do topo (40px) →
              hierarquia: topo = configurar, fundo = agir.
              No nativo não existe "baixar" (o <a download> é ignorado pelo WKWebView): tanto "Baixar" como
              "Compartilhar" caem em salvarOuCompartilhar e abrem a folha do sistema, que já tem "Salvar imagem".
              Na WEB são coisas diferentes: "Baixar" grava o ficheiro, "Compartilhar" abre o navigator.share. */}
          {/* "Baixar" fica ao lado de "Compartilhar", também no celular (o dono quer os dois): compartilhar abre
              a folha do sistema (WhatsApp, Instagram), baixar guarda a figurinha para a pessoa (no navegador, o
              arquivo; no app da loja, a folha do sistema, que tem "Salvar imagem" — gravar direto no rolo da
              câmera pede um plugin nativo, que não está instalado). */}
          <div style={{ display: 'flex', gap: 12 }}>
            {/* Baixar RECUA: borda roxa mais fraca + texto a 85% → secundário mas presente. */}
            <button
              type="button"
              className="btn btn--purple-outline hud-corners"
              data-acao="baixar"
              style={{ flex: 1, height: 46, borderWidth: '1.5px', borderColor: 'rgba(139,92,246,0.5)', color: 'rgba(255,255,255,0.85)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
              disabled={busy}
              onClick={baixar}
            >
              <Download size={16} /> {busy ? 'Gerando…' : 'Baixar'}
            </button>
            {/* CTA dourado partilhado com o "Assinar Pro" dos Planos: gradiente, texto, altura, glow e shine vivem
                em .cta-gold/.cta-gold-glow (app.css). O glow fica no wrapper SEM clip porque o clip-path do botão
                cortaria a sombra. */}
            <div className="cta-gold-glow" style={{ flex: 1, display: 'flex' }}>
              <button
                type="button"
                className="btn hud-corners cta-gold"
                style={{ flex: 1 }}
                disabled={busy}
                onClick={partilhar}
              >
                <Share2 size={16} /> {busy ? 'Gerando…' : 'Compartilhar'}
              </button>
            </div>
          </div>

          {/* O anúncio entra DEPOIS da linha de ações, nunca antes
              da figurinha: esta tela é a figurinha, e uma faixa por cima dela
              venderia o lugar errado. Aqui já se rolou uma dobra, a figurinha
              foi vista e a ação principal foi tomada. */}
          <div style={{ marginTop: 18 }}>
            <AdCard pagina="figurinha" variant="banner320x100" ad={adFigurinha} prontoExterno={adPronto} />
          </div>

          {/* SELOS DE HONRA — SECÇÃO PRÓPRIA full-width, ABAIXO da linha
              Baixar/Compartilhar; alcançável só por scroll (nunca empurra a 1ª dobra).
              Olhinho: mostra/oculta cada selo do cromo (máx 2; a honra fica na vitrine). */}
          {selos.length ? (
              <div style={{ marginTop: 22 }}>
                <div style={{ fontFamily: "'Rajdhani', sans-serif", fontWeight: 800, fontSize: 13, letterSpacing: '.06em', color: '#f0c94a', textTransform: 'uppercase', marginBottom: 4 }}>Selos de honra</div>
                <p className="texto-apoio" style={{ marginTop: 0, marginBottom: 12 }}>Toque no olho para mostrar ou ocultar no card (máx. 2). A honra fica sempre na sua vitrine.</p>
                <div style={{ display: 'grid', gap: 10 }}>
                  {selos.map((s) => {
                    const oculto = selosOcultos.has(s.id);
                    const visivel = selosVisiveis.some((v) => v.id === s.id);
                    return (
                      <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 10px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.10)', opacity: oculto ? 0.5 : 1, clipPath: 'polygon(4px 0,calc(100% - 4px) 0,100% 4px,100% calc(100% - 4px),calc(100% - 4px) 100%,4px 100%,0 calc(100% - 4px),0 4px)' }}>
                        <SeloHonra tier={s.tier} label={s.label} size={54} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, fontSize: 14, color: '#fff' }}>{s.label}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>{s.sub}{s.fonte === 'ranking' ? ' · vivo' : s.historico ? ' · histórico' : s.ativa ? ` · ${s.dias_restantes}d no card` : ''}</div>
                        </div>
                        {!visivel && !oculto ? <span style={{ fontSize: 10, color: '#6f6a80' }}>só vitrine</span> : null}
                        <button type="button" aria-label={oculto ? 'Mostrar' : 'Ocultar'} onClick={() => toggleSelo(s.id)} style={{ border: '1px solid rgba(255,255,255,0.18)', background: 'transparent', color: oculto ? '#6f6a80' : '#f0c94a', cursor: 'pointer', borderRadius: 6, padding: '6px 8px', display: 'grid', placeItems: 'center' }}>
                          {oculto
                            ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 10 8 10 8a13.16 13.16 0 0 1-1.67 2.68M6.61 6.61A13.526 13.526 0 0 0 2 12s3 8 10 8a9.74 9.74 0 0 0 5.39-1.61M2 2l20 20M9.88 9.88a3 3 0 1 0 4.24 4.24" /></svg>
                            : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-8 10-8 10 8 10 8-3 8-10 8-10-8-10-8Z" /><circle cx="12" cy="12" r="3" /></svg>}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
          ) : null}
        </div>
      </main>

      {toast ? <Toast mensagem={toast.mensagem} tipo={toast.tipo} onClose={() => setToast(null)} /> : null}

      <AvatarGenericoSheet
        aberto={sheetAvatarAberto}
        onClose={() => setSheetAvatarAberto(false)}
        escolhaActual={avatarGenericoEscolha}
        onEscolher={escolherAvatarGenerico}
      />

      {/* Modal "A tua foto" — foto actual + estado do avatar IA + carregar nova. Portal para o body: fixed
          dentro do [data-page] animado não confia no viewport no WebKit do iPhone — ver nota em
          LoadingFutty.jsx. */}
      {modalFoto
        ? createPortal(
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Sua foto"
          onClick={() => setModalFoto(false)}
          /* Velocidade 8: a 0,85 de preto por cima, o blur de 4px não se via —
             pagava-se uma camada de composição de ecrã inteiro para nada.
             Achado 124 (29K): overflow hidden + overscroll-behavior contain — sem isso, um arrasto no véu encadeia
             a rolagem para o body por trás (WebKit), e ao fechar a página fica numa posição que não bate. */
          style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, overflow: 'hidden', overscrollBehavior: 'contain' }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="hud-corners"
            style={{ position: 'relative', width: '100%', maxWidth: 360, background: 'linear-gradient(180deg, #14121c, #0b0a12)', border: '1px solid rgba(212,160,23,0.35)', padding: '22px 20px 20px' }}
          >
            <button
              type="button"
              aria-label="Fechar"
              onClick={() => setModalFoto(false)}
              style={{ position: 'absolute', top: 12, right: 12, width: 32, height: 32, borderRadius: 10, border: '1px solid #333', background: 'rgba(255,255,255,0.06)', color: '#fff', display: 'grid', placeItems: 'center', cursor: 'pointer', zIndex: 1 }}
            >
              <X size={16} />
            </button>

            {/* (i) Losango decorativo no canto sup. direito, com o twinkle existente. */}
            <span
              className="fig-dot-twinkle"
              aria-hidden="true"
              style={{ position: 'absolute', top: 18, right: 52, width: 8, height: 8, borderRadius: 1, transform: 'rotate(45deg)', background: 'linear-gradient(135deg, #f5e070, #d4a017)', pointerEvents: 'none' }}
            />
            <h3 style={{ margin: '0 0 6px', fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, fontSize: 20, letterSpacing: '0.04em', color: '#fff', textAlign: 'center' }}>Sua foto</h3>
            {/* (h) Linha HUD dourada com degrau — mesma linguagem do header, escala menor. */}
            <svg width="100%" height="6" viewBox="0 0 200 6" preserveAspectRatio="none" aria-hidden="true" style={{ display: 'block', marginBottom: 14 }}>
              <defs>
                <linearGradient id="modalhudline" x1="0" x2="1">
                  <stop offset="0" stopColor="#d4a017" stopOpacity="0.9" />
                  <stop offset="0.6" stopColor="#d4a017" stopOpacity="0.4" />
                  <stop offset="1" stopColor="#d4a017" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d="M0 5 H70 L75 1 H200" stroke="url(#modalhudline)" strokeWidth="1" fill="none" />
            </svg>

            {/* Interruptor "Mostrar minha foto" / "Mostrar minha figurinha": só aparece pra quem já tem uma
                figurinha gerada (mesmo que o card esteja mostrando a foto agora). Um toque troca avatar_url na hora
                — a prévia abaixo segue junto. */}
            {temFigurinhaAlguma ? (
              <div role="radiogroup" aria-label="O que o card mostra" style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                <button
                  type="button"
                  role="radio"
                  aria-checked={!avatarEhIA}
                  disabled={trocandoModo}
                  onClick={() => trocarModo('foto')}
                  className="hud-corners-s"
                  style={{
                    flex: 1, padding: '9px 6px', fontSize: 12, fontWeight: 700, cursor: trocandoModo ? 'default' : 'pointer',
                    background: !avatarEhIA ? 'rgba(212,160,23,0.14)' : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${!avatarEhIA ? 'rgba(212,160,23,0.6)' : 'rgba(255,255,255,0.14)'}`,
                    color: !avatarEhIA ? '#f0c94a' : 'rgba(255,255,255,0.75)',
                    opacity: trocandoModo ? 0.6 : 1,
                  }}
                >
                  Mostrar minha foto
                </button>
                <button
                  type="button"
                  role="radio"
                  aria-checked={avatarEhIA}
                  disabled={trocandoModo}
                  onClick={() => trocarModo('figurinha')}
                  className="hud-corners-s"
                  style={{
                    flex: 1, padding: '9px 6px', fontSize: 12, fontWeight: 700, cursor: trocandoModo ? 'default' : 'pointer',
                    background: avatarEhIA ? 'rgba(212,160,23,0.14)' : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${avatarEhIA ? 'rgba(212,160,23,0.6)' : 'rgba(255,255,255,0.14)'}`,
                    color: avatarEhIA ? '#f0c94a' : 'rgba(255,255,255,0.75)',
                    opacity: trocandoModo ? 0.6 : 1,
                  }}
                >
                  Mostrar minha figurinha
                </button>
              </div>
            ) : null}

            {/* Preview da foto actual (cantos 45° coerentes com o sistema visual) */}
            {fotoOriginal ? (
              // contain + fundo escuro sólido → mostra a pessoa INTEIRA, sem cortar topo/base.
              /*
               * Moldura ADAPTATIVA: sem height fixa, o container cresce com a foto (o maxHeight trava as muito
               * altas). As barras que sobrem em #0d0d12 lêem como moldura intencional, não como corte.
               */
              <div className="hud-corners" style={{ width: '100%', background: '#0d0d12' }}>
                <img
                  // Logo depois de trocar a foto/o enquadramento o preview é o LOCAL (o recorte que o servidor acabou de
                  // confirmar). Trocar só o src deixava a foto ANTIGA na tela até o derivado novo chegar pelo proxy.
                  src={fotoLocal || urlImagem(urlAsset(fotoOriginal), 512)}
                  alt="Sua foto"
                  style={{ width: 'auto', height: 'auto', maxWidth: '100%', maxHeight: '46vh', objectFit: 'contain', display: 'block', margin: '0 auto' }}
                />
              </div>
            ) : (
              <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--label-color)', fontSize: 13 }}>Você ainda não tem foto.</div>
            )}

            {/* Estado do card — prévia ao vivo do que os outros veem (muda na hora com o interruptor acima, sem
                esperar reload). */}
            <div style={{ marginTop: 14 }}>
              {avatarEhIA ? (
                /* (j) Badge com glow dourado suave — mesma família dos dots. */
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 10, background: 'linear-gradient(90deg, rgba(139,92,246,0.18), rgba(212,160,23,0.12))', border: '1px solid rgba(139,92,246,0.4)', boxShadow: '0 0 12px rgba(212,160,23,0.22)' }}>
                  <img
                    src={urlImagem(urlAsset(me?.user?.avatar_url), 128, { quadrado: true })}
                    alt="Figurinha"
                    width={48}
                    height={48}
                    decoding="async"
                    loading="lazy"
                    style={{ width: 48, height: 48, borderRadius: 8, objectFit: 'contain', border: '1px solid rgba(212,160,23,0.5)', flex: 'none', background: '#0d0d12' }}
                  />
                  <div style={{ display: 'grid', gap: 3 }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: '#d4a017' }}>
                      <EstrelaIA size={14} color="#d4a017" /> Figurinha ativa
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--label-color)' }}>Gerado a partir desta foto</span>
                  </div>
                </div>
              ) : temFigurinhaAlguma ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.14)' }}>
                  <img
                    src={urlImagem(urlAsset(me?.user?.avatar_url), 128, { quadrado: true })}
                    alt="Sua foto"
                    width={48}
                    height={48}
                    decoding="async"
                    loading="lazy"
                    style={{ width: 48, height: 48, borderRadius: 8, objectFit: 'contain', border: '1px solid rgba(255,255,255,0.2)', flex: 'none', background: '#0d0d12' }}
                  />
                  <div style={{ display: 'grid', gap: 3 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>Mostrando sua foto</span>
                    <span style={{ fontSize: 11, color: 'var(--label-color)' }}>Sua figurinha continua guardada</span>
                  </div>
                </div>
              ) : (
                <p style={{ margin: 0, textAlign: 'center', fontSize: 12, color: 'var(--label-color)' }}>Você ainda não gerou sua figurinha.</p>
              )}
            </div>

            {/* "Minhas figurinhas": até 6, miniaturas + "Usar esta"
                (sem custo — troca avatar_url/kit_ativo, respeita card_modo).
                Some sozinha sem histórico (conta nova, ou 057 por aplicar). */}
            {historico.length ? (
              <div style={{ marginTop: 16 }}>
                <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--label-color)' }}>
                  Minhas figurinhas
                </p>
                <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 2 }}>
                  {historico.map((item) => {
                    const emUso = item.avatar_url === me?.user?.avatar_url;
                    const carregando = usandoHistoricoId === item.id;
                    return (
                      <div key={item.id} style={{ flex: '0 0 auto', width: 72, display: 'grid', gap: 4, justifyItems: 'center' }}>
                        <img
                          src={urlImagem(urlAsset(item.avatar_url), 128, { quadrado: true })}
                          alt="Figurinha antiga"
                          width={64}
                          height={64}
                          style={{ width: 64, height: 64, borderRadius: 8, objectFit: 'cover', border: `1px solid ${emUso ? 'rgba(212,160,23,0.7)' : 'rgba(255,255,255,0.16)'}`, background: '#0d0d12' }}
                        />
                        <button
                          type="button"
                          className="btn btn--sm hud-corners-s"
                          style={{ width: '100%', fontSize: 10, padding: '4px 2px', opacity: emUso ? 0.6 : 1 }}
                          disabled={emUso || carregando || !!usandoHistoricoId}
                          onClick={() => usarDoHistorico(item)}
                        >
                          {emUso ? 'Em uso' : carregando ? '…' : 'Usar esta'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {/* Duas ações (ordem do dono): "Escolher outra foto" leva ao CropModal 2:3; "Ajustar enquadramento"
                reabre o MESMO CropModal sobre a foto original guardada, sem upload novo. A 2ª só existe havendo
                foto (nada para ajustar sem ela). */}
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button
                type="button"
                className="btn btn--purple"
                style={{ flex: 1, height: 46, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 13 }}
                disabled={uploadFoto || gerandoIA}
                onClick={() => fileRef.current?.click()}
              >
                <Camera size={16} /> Escolher outra foto
              </button>
              {temFoto ? (
                <button
                  type="button"
                  className="btn btn--purple-outline"
                  style={{ flex: 1, height: 46, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 13 }}
                  disabled={uploadFoto || gerandoIA || ajustandoEnquadramento}
                  onClick={abrirAjustarEnquadramento}
                >
                  <RefreshCw size={16} /> {ajustandoEnquadramento ? 'Abrindo…' : 'Ajustar enquadramento'}
                </button>
              ) : null}
            </div>
          </div>
        </div>,
        document.body
          )
        : null}

      {/* O mesmo CropModal do Onboarding, para "Escolher outra
          foto" (cropModo='nova') e "Ajustar enquadramento" (cropModo='ajustar');
          só o que aoConfirmarCrop faz com o resultado muda entre os dois. */}
      {cropFile ? (
        <CropModal file={cropFile} aspect={2 / 3} aspectos={[{ k: '2:3', v: 2 / 3 }]} miniatura onConfirm={aoConfirmarCrop} onCancel={aoCancelarCrop} />
      ) : null}

      {/* "Pintar no uniforme X?" antes de qualquer geração nova
          (SPEC-FIGURINHA-3 §2). Mesmo padrão do DenunciaModal (modal-overlay/
          modal-card, portal no body); fecha ao tocar fora, igual aos outros. */}
      {kitParaPintar
        ? createPortal(
            <div className="modal-overlay" role="presentation" onClick={() => !gerandoIA && setKitParaPintar(null)}>
              <div className="modal-card" role="dialog" aria-modal="true" style={{ maxWidth: 360 }} onClick={(e) => e.stopPropagation()}>
                <div className="modal-card__inner" style={{ textAlign: 'center', display: 'grid', gap: 12, padding: '18px 16px 16px' }}>
                  <h2 style={{ fontFamily: "'Rajdhani', sans-serif", fontWeight: 800, fontSize: 18, margin: 0 }}>
                    Pintar no uniforme {kitParaPintar.nome}?
                  </h2>
                  <p style={{ fontSize: 13, color: 'var(--text-dim)', margin: 0, lineHeight: 1.5 }}>
                    {(() => {
                      // Uniforme que não é o do pacote do time sai dos CRÉDITOS (o motor usa o crédito para ele) — o número
                      // é o dos créditos, não o do pacote.
                      const n = kitDoTime && kitParaPintar.id !== kitDoTime && temCredito ? (brilhante?.creditos ?? restantesDireito) : restantesDireito;
                      return `Usa 1 das suas ${n === 1 ? '1 geração' : `${n} gerações`} · leva ~45 s`;
                    })()}
                  </p>
                  <div style={{ display: 'grid', gap: 8, marginTop: 4 }}>
                    <span className="cta-gold-glow" style={{ display: 'flex' }}>
                      <button type="button" className="btn hud-corners cta-gold" style={{ flex: 1 }} onClick={confirmarPintura}>
                        Pintar
                      </button>
                    </span>
                    <button type="button" className="btn btn--ghost btn--sm" style={{ width: '100%' }} onClick={() => setKitParaPintar(null)}>
                      Agora não
                    </button>
                  </div>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
    </div>
  );
}
