// Futty v2.0 — Figurinha (/figurinha): selos de honra (Vaga 11C) no cromo + olhinho.
// Futty v2.0 — Figurinha (/figurinha): "card studio". Card 2:3 com tilt 3D e
// entrada animada; opções em tabs (Fundo/Frame/Uniforme) + toggles compactos.
// Trocar foto é preview local (sem backend). Tudo no cliente (canvas).
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
import { nomeJogador, urlAsset, urlImagem } from '../utils/avatar';
import { mensagemUploadFoto } from '../utils/uploadErro';
import { normalizarFoto } from '../utils/normalizarFoto';
import { getFrameColor } from '../utils/frameColors';
import { gerarFigurinhaCanvas, gerarCamadasFigurinha, desenharFundoEpico, desenharFundoGolden, desenharFundoRoyal } from '../utils/figurinhaCanvas';
import { avatarGenericoUrl } from '../utils/avatarGenerico';
import { estadoBrilhantes, pedirAtivacao, pedidoDoProduto } from '../lib/brilhantes';
import { PRODUTOS, MINHA_GERACOES } from '../lib/planos';
import { ehAppNativo, salvarOuCompartilhar } from '../utils/salvarImagem';
import { celebrarPartilha, celebrarCromoPronto } from '../hooks/useConfetti';
import AdCard from '../components/AdCard';
import Topbar from '../components/Topbar';
import FuttyLoader from '../components/FuttyLoader';
import FuttyLogo from '../components/FuttyLogo';
import LoadingFutty from '../components/LoadingFutty';
import SeloHonra from '../components/SeloHonra';
import AvatarGenericoSheet from '../components/AvatarGenericoSheet';
import Toast from '../components/Toast';
import '../styles/app.css';

// Chaves nomeadas (iguais às guardadas em users.cor_frame / fundo_figurinha).
// GATES CONFIRMADOS (ordem do dono): Aura, Golden e Royal são PREMIUM (verdade no
// servidor, ver FUNDOS_PREMIUM em backend/routes/auth.js; o `premium: true` aqui é
// só o cadeado do desejo). Épico virou GRÁTIS (15-set, decisão do dono) — deixou de
// ter `premium`. LEI DA REGRA JUSTA: quem já tinha Aura equipado mantém — o gate só
// corre ao TROCAR (ver escolherFundo).
const FUNDOS = [
  // ORDEM (dono, 15-set — 3ª revisão): Neutro, Épico, Estádio, Aura, Golden, Royal
  // — os GRÁTIS primeiro (Neutro, Épico, Estádio), os pagos depois (Aura, Golden,
  // Royal). Revoga a ordem de 14-set (Neutro, Estádio, Épico, Aura...). Só o
  // SELETOR muda: o fundo de quem não escolheu continua a ser 'estadio'
  // (useState abaixo e cromoFundo no Início).
  { k: 'preto', label: 'Neutro' },
  { k: 'gradiente', label: 'Épico' }, // chave interna 'gradiente' (estado), label novo — GRÁTIS (15-set)
  { k: 'estadio', label: 'Estádio' },
  { k: 'aura', label: 'Aura', premium: true }, // glow SELADO da vitrine como fundo do cromo
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
  // FASE 3.51 — 'preto' (label "Neutro") re-baseado: mesma base escura do épico, sem
  // padrão. O tile é o gradiente liso, condizente com o card real.
  preto: 'linear-gradient(180deg, #16161c 0%, #1d1d24 50%, #101014 100%)',
  // 'aura' — tile fiel ao glow selado: elipse dourada (mesmos stops) sobre o escuro
  // da casa. O card real desenha o glow com blur no canvas; aqui a elipse já é suave.
  aura: 'radial-gradient(ellipse 70% 56% at 50% 44%, rgba(212,160,23,0.95) 0%, rgba(212,160,23,0.48) 40%, rgba(212,160,23,0.16) 64%, transparent 92%), linear-gradient(180deg, #0a0a12 0%, #070812 55%, #050609 100%)',
  // 'golden' — FALLBACK (foil dourado) até o render real da chapa ficar pronto (ver `goldenTile`).
  golden: 'linear-gradient(160deg, #b8860b 0%, #e6bd52 28%, #a9760f 54%, #dcab3a 76%, #855a0b 100%)',
  // 'royal' — FALLBACK (foil roxo) até o render real da chapa ficar pronto (ver `royalTile`).
  royal: 'linear-gradient(160deg, #4a2f8a 0%, #6f47c9 28%, #3d2670 54%, #5c3aa8 76%, #2a1a4d 100%)',
};
const TABS = [
  { k: 'fundo', label: 'Fundo' },
  { k: 'uniforme', label: 'Uniforme' },
];

// Kits do card. Assets em bucket PÚBLICO 'kits' (app assets, não PII — o tijolo 1C
// privatizou avatars e partia estas thumbnails). dark-gold e dark-purple ativos/livres.
const KIT_IMG = {
  'dark-gold': 'https://ynzmjcvqdljffgbeqglh.supabase.co/storage/v1/object/public/kits/kit1-dark-gold.png',
  'dark-purple': 'https://ynzmjcvqdljffgbeqglh.supabase.co/storage/v1/object/public/kits/kit2-dark-purple.png',
  'white-gold': 'https://ynzmjcvqdljffgbeqglh.supabase.co/storage/v1/object/public/kits/kit3-white-gold.png',
  'elite-gold': 'https://ynzmjcvqdljffgbeqglh.supabase.co/storage/v1/object/public/kits/kit4-elite-gold.png',
  'royal-purple': 'https://ynzmjcvqdljffgbeqglh.supabase.co/storage/v1/object/public/kits/kit5-royal-purple.png',
};
// Os 5 kits do lançamento (31-jul, dono): mesmo design, cores diferentes. Este
// seletor só existe para quem já tem Brilhante — o cadeado de cada tile é
// DIREITO (crédito ou pacote do time, ver escolherKit), não plano; `estado`
// só distingue 'breve' (kit sem asset, nem aparece) dos demais.
const KITS_FIGURINHA = [
  { id: 'dark-gold', nome: 'Dark Gold', base: '#0d0d12', acento: '#d4a017', estado: 'ativo' },
  { id: 'dark-purple', nome: 'Dark Purple', base: '#0d0d12', acento: '#8b5cf6', estado: 'ativo' },
  { id: 'white-gold', nome: 'White Gold', base: '#f8f5f0', acento: '#d4a017', estado: 'ativo' },
  { id: 'elite-gold', nome: 'Elite Gold', base: '#d4a017', acento: '#0d0d12', estado: 'ativo' },
  { id: 'royal-purple', nome: 'Royal Purple', base: '#8b5cf6', acento: '#0d0d12', estado: 'ativo' },
];

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

// Limites do zoom do avatar. ZOOM_MIN subiu de 0.88 (80% exibido) para 0.99 (90%):
// o degrau de 80% deixou de existir. Qualquer valor abaixo é normalizado no arranque.
const ZOOM_MIN = 0.99;
const ZOOM_MAX = 1.43;

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

// ─── O que a Figurinha aproveita do Início (VELOCIDADE 9, 23-set) ────────────
//
// Esta tela abria com três pedidos: o anúncio, os selos e /api/brilhantes/estado
// (539 + 540 + 606 ms no relatório do build 28 — de Lisboa, tudo distância).
// Nenhum dos três traz novidade nenhuma para quem chegou aqui pelo Início: o
// /api/inicio já traz o direito, os créditos, os pedidos vivos e — desde esta
// rodada — as colunas do pacote em cada time. Fica tudo no cache de sessão, com
// a mesma chave que o InicioContext usa; daqui só se lê.
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
    direito: { fonte: d.brilhante.fonte, team_id: d.brilhante.team_id, kit_id: d.brilhante.kit_id },
    creditos: d.brilhante.creditos || 0,
    times,
    pedidos: d.pedidos_brilhante || [],
  };
}

export default function Figurinha() {
  const navigate = useNavigate();
  // Velocidade 2 (12-set): esta página tinha o seu próprio GET /api/me — o
  // PerfilContext já carrega isso 1x por sessão; agora só usa o `perfil` de lá
  // para inicializar o espelho local `me` (que continua a existir porque a
  // página precisa de merges finos — slots, kit_ativo, avatar_url — que o card
  // usa de imediato, sem esperar round-trip) e as escolhas guardadas
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
  const [gerandoIA, setGerandoIA] = useState(false);
  const [limiteIA, setLimiteIA] = useState(false);
  const [erroIA, setErroIA] = useState(false); // falha da geração (≠ 403) → estado de erro no overlay
  const [erroIAmsg, setErroIAmsg] = useState(''); // mensagem específica (ex.: foto inválida); vazio = texto genérico
  // Toast curto e genérico (build 9): { mensagem, tipo }. Dois usos — aviso
  // quando /avatar/ai reutiliza o slot (mesma foto de antes, sem isto o botão
  // "carregava e nada acontecia"), e erro do PATCH de fundo (ver escolherFundo).
  const [toast, setToast] = useState(null);
  // Destaque pulsante no botão Gerar (build 9): true assim que uma foto NOVA
  // sobe nesta sessão, até a próxima geração terminar (reutilizada ou não) —
  // guia quem trocou a foto e não percebeu que falta tocar em Gerar.
  const [fotoTrocadaSemGerar, setFotoTrocadaSemGerar] = useState(false);
  const [emailNaoConfirmado, setEmailNaoConfirmado] = useState(false); // gate anti-abuso (11-ago): geração exige e-mail confirmado
  const [reenviarBusy, setReenviarBusy] = useState(false);
  const [reenviarFeito, setReenviarFeito] = useState(false);
  const [modalFoto, setModalFoto] = useState(false); // modal "A tua foto" (foto actual + estado IA + carregar nova)
  const [trocandoModo, setTrocandoModo] = useState(false); // Rodada 18: PUT /api/me/avatar/modo em voo
  const [activeTab, setActiveTab] = useState('fundo');
  const [busy, setBusy] = useState(false);
  const [erro, setErro] = useState('');
  const [uploadErro, setUploadErro] = useState(null); // P1-5 — { texto, podeRepetir }
  const ultimoFicheiro = useRef(null); // retém a foto p/ "tentar de novo"
  // Zoom do avatar no card. Escala interna 0.88–1.43 (passo 0.11); exibida ÷1.1
  // → 80/90/100/110/120/130%. Base 1.1 = 100% exibido. Reinicia sempre a 110%.
  // Clamp defensivo no arranque: normaliza qualquer valor fora de [ZOOM_MIN, ZOOM_MAX]
  // (ex.: um 0.88 herdado) para dentro dos limites novos.
  const [avatarZoom, setAvatarZoom] = useState(() => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, 1.1)));
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
  // RODADA 19 — enquadrar dentro de "Trocar foto". cropFile alimenta o
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
  const appNativo = ehAppNativo();
  // GRUPO B 6a — `equipa` existia só para alimentar o PlayerCard, que saiu daqui.
  const frameHex = getFrameColor(corFrame).stroke;
  // Regra única: a foto CRUA nunca entra no card. Só entra o avatar quando é
  // um avatar IA confirmado (foto_url e avatar_url existem e são diferentes —
  // logo após o upload o backend grava a foto crua em ambos, então é igual).
  const fotoOriginal = me?.user?.foto_url || null;
  // `avatarEhIA` = TEM BRILHANTE. Continua a ser a mesma conta de sempre (o
  // avatar_url é diferente da foto só quando a IA gerou alguma coisa), mas
  // desde 22-set o nome da coisa mudou: SPEC-FIGURINHA-3.
  const avatarEhIA = !!fotoOriginal && !!me?.user?.avatar_url && fotoOriginal !== me.user.avatar_url;
  // Rodada 18: existe uma figurinha (mesmo que o card esteja em modo 'foto'
  // agora) — o sinal certo para "há algo para o interruptor escolher", ao
  // contrário de avatarEhIA, que só diz o que está ativo NESTE instante.
  // RODADA 20 (achado da 19): era `!!kit_ativo`, mas kit_ativo é só "qual
  // uniforme", não "já gerou" — toda conta nova aparecia com o interruptor
  // sem nunca ter gerado nada. tem_figurinha vem calculado do servidor
  // (services/inicio.js), que sabe de verdade se existe alguma figurinha.
  const temFigurinhaAlguma = !!me?.user?.tem_figurinha;
  // MODO DO CARD (§3/§4): com Brilhante, o card de sempre (avatar recortado
  // sobre o fundo escolhido). Sem Brilhante mas COM foto, a figurinha COMUM —
  // a foto como ela é, na mesma moldura. Sem foto nenhuma, o genérico da casa
  // continua a ser o convite (nunca um buraco).
  const modoCard = avatarEhIA ? 'brilhante' : 'comum';
  const temFoto = !!fotoOriginal;
  const jogadorCard = avatarEhIA || temFoto
    ? jogador
    : { ...jogador, avatar_url: avatarGenericoUrl(jogador.id, avatarGenericoEscolha) };
  // A2 — kit vestido + kits já gerados (slots). Vindos do GET /api/me.
  const kitAtivo = me?.user?.kit_ativo || 'dark-gold';
  const slotsKits = me?.slots || [];
  // RODADA 17 — o botão "Gerar Avatar IA" vira o CTA dourado (receita do "Ver
  // sorteio", Inicio.jsx) exactamente na janela em que ele é a única ação que
  // falta: foto nova já subiu, ainda não gerou. Fora dessa janela (idle, ou já
  // gerando) continua roxo — dourado é reservado para "toque aqui agora".
  const brilharGerar = fotoTrocadaSemGerar && !gerandoIA;
  // DIREITO DE GERAR (SPEC-FIGURINHA-3 §5) — quem pode gerar uma Brilhante e
  // com que uniforme. Carregado uma vez ao abrir a tela; recarregado depois de
  // gerar (o crédito baixa) e depois de pedir ativação.
  // VELOCIDADE 9 (23-set): nasce com o que o /api/inicio já trouxe (cache de
  // sessão), em vez de null. Era o terceiro pedido desta tela — 606 ms de
  // Lisboa no relatório do build 28 — para saber coisas que estavam em casa.
  const [brilhante, setBrilhante] = useState(() => brilhanteDoInicio(userId));
  const temDireitoDeGerar = !!brilhante?.direito?.fonte;
  const kitDoTime = brilhante?.direito?.fonte === 'time' ? brilhante.direito.kit_id : null;
  const creditos = brilhante?.creditos ?? 0;
  const meuTimeBrilhante = (brilhante?.times || []).find((t) => t.sou_dono) || null;
  const [pedindo, setPedindo] = useState(null);
  const [avisoPedido, setAvisoPedido] = useState(null);
  // BLOCO 2 — o recado do pedido SOBREVIVE a fechar o app: vem do estado
  // gravado, não só do clique desta sessão. Pendente diz que está na fila;
  // recusado diz o motivo que o dono escreveu no Gabinete; ativado não aparece
  // aqui de todo — quem foi ativado já vê o botão dourado, e um recado sobre um
  // pedido resolvido só ia competir com ele.
  const pedidoPacote = pedidoDoProduto(brilhante?.pedidos, 'pacote', meuTimeBrilhante?.id);
  const pedidoMinha = pedidoDoProduto(brilhante?.pedidos, 'minha');
  const candidatos = [pedidoPacote, pedidoMinha].filter(Boolean);
  const pedidoVivo = candidatos.find((p) => p.estado === 'pendente') || candidatos[0] || null;
  const recadoPedido = avisoPedido
    || (pedidoVivo?.estado === 'pendente' ? 'Pedido enviado — a gente ativa e avisa.' : null)
    || (pedidoVivo?.estado === 'recusado' ? (pedidoVivo.motivo || 'Este pedido não seguiu.') : null);

  useEffect(() => {
    let vivo = true;
    // Com o estado semeado pelo Início recente, não se pede nada: a tela abre
    // com a resposta certa e sem rede. Fora dessa janela revalida-se — em
    // SEGUNDO PLANO, para não entrar na conta de "dados" de quem já tem tela.
    const idade = idadeDoInicio(userId);
    if (brilhanteDoInicio(userId) && idade != null && idade < FRESCOR_DO_INICIO_MS) return () => { vivo = false; };
    estadoBrilhantes({ segundoPlano: true }).then((e) => { if (vivo && e) setBrilhante(e); });
    return () => { vivo = false; };
  }, [userId]);

  async function pedirBrilhante(produto) {
    setPedindo(produto);
    const r = await pedirAtivacao(produto, produto === 'minha' ? null : meuTimeBrilhante?.id);
    setPedindo(null);
    setAvisoPedido(r.ok ? 'Pedido enviado — a gente ativa e avisa.' : r.erro);
    if (r.ok) setBrilhante(await estadoBrilhantes());
  }
  // SELOS DE HONRA (Vaga 11C): busca os selos do utilizador; mostra no cromo os 2
  // de maior prioridade que NÃO estejam ocultos (olhinho, persistido). Vêm já
  // ordenados por prioridade (campeonato > ranking) do backend.
  // Velocidade 7B: os selos do cache entram JÁ no primeiro render (antes vinham
  // num microtask, e essa chegada tardia recomeçava o desenho do cromo). Os
  // selos nunca seguram a tela: sem cache, o cromo desenha sem eles e redesenha
  // uma vez quando o /api/me/selos chegar.
  // Rodada 12C: anúncio pedido no topo da tela, em paralelo com o resto (mesmo
  // motivo da Resenha e do Ranking — ver useAd).
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
    // Velocidade 6B: mesma janela de frescor do useApiComCache. Se o
    // pré-aquecimento acabou de trazer os selos, não se pedem outra vez.
    //
    // Velocidade 9: a janela sobe de 30 s para 5 minutos NESTA tela. Um selo é
    // uma conquista (campeonato, 1º do ranking) — não muda enquanto a pessoa
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
  const opts = { jogador: jogadorCard, stats, fundo, corFrame, avatarZoom, modo: modoCard, selos: selosVisiveis.map((s) => ({ tier: s.tier, label: s.label })) };

  // Pré-selecciona as escolhas guardadas a partir do `perfil` já carregado
  // pelo PerfilContext — 1x só, quando ele chega (guard por ref: o `perfil`
  // pode mudar depois, ex. recarregarPerfilGlobal(), sem reiniciar o flow).
  const inicializadoRef = useRef(false);
  useEffect(() => {
    if (inicializadoRef.current) return undefined;
    if (!perfil && !erroPerfil) return undefined;
    // Adiado ao microtask (mesmo padrão do PerfilContext): setState síncrono
    // no corpo do efeito dispara cascading renders.
    //
    // O `inicializadoRef` é marcado DENTRO do microtask, não antes dele
    // (22-set). Marcá-lo aqui fora deixava a página vazia em `npm run dev`: o
    // StrictMode monta, desmonta e remonta cada efeito, e o cleanup da
    // primeira montagem punha `ativo = false` antes de o microtask correr — o
    // setMe nunca acontecia, e na remontagem o guard já estava fechado.
    // Resultado: `me` ficava null para sempre e a Figurinha abria a pedir
    // "Adicionar foto" numa conta que tem foto e figurinha. Em produção não
    // aparecia (uma montagem só), mas o dev e o LIGAR-FUTTY.bat são onde a
    // casa testa — uma tela que mente na bancada não serve de bancada.
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

  // O ESPELHO TEM DE OUVIR O DADO FRESCO UMA VEZ (22-set, relato do dono: "no
  // Início já deu certo, na Figurinha ainda está a foto antiga").
  //
  // O efeito acima semeia `me` com o PRIMEIRO `perfil` que chega — e o
  // PerfilContext entrega primeiro o CACHE LOCAL deste aparelho
  // (stale-while-revalidate) e só depois a resposta do /api/me. O guard por ref
  // existe por bom motivo (o flow da estreia não pode reiniciar a meio), mas
  // apanhava também a actualização: o cromo desta página ficava preso na
  // figurinha gravada no cache, enquanto o Início — que lê o contexto directo —
  // já mostrava a nova. Quem nunca tinha aberto o app naquele aparelho via o
  // certo; quem já tinha, via o antigo. Daí parecer coisa de PC contra celular.
  //
  // Sincroniza-se só o que vem do servidor e não se edita aqui. Fundo, zoom e
  // avatar genérico ficam como o utilizador os deixou. E se houver acção local
  // em voo (upload, geração, foto por gerar), ela é mais nova do que este
  // fresco — desiste-se sem aplicar, para não desfazer o que ele acabou de fazer.
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

  // Velocidade 7B: uma geração do cromo só é jogada fora se já houver cromo NA
  // TELA. Antes, qualquer mudança a meio — os selos a chegarem do cache ou da
  // rede — descartava o desenho quase pronto e o card ficava no F até a geração
  // seguinte acabar: "a Figurinha só pinta quando /api/me/selos chega". Agora a
  // primeira a terminar pinta, e a mais nova substitui quando terminar.
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
  // `jogador?.foto_url` entra nas deps por causa do modo COMUM (22-set): ali a
  // base do card é a FOTO, e trocá-la tem de repintar o cromo — no modo
  // brilhante quem muda é o avatar_url, que já estava aqui.
  }, [me?.user?.id, fundo, avatarZoom, avatarEhIA, jogador?.avatar_url, jogador?.foto_url, avatarGenericoEscolha, estreiaFase, selosKey]);

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
        // FASE 3.51/3.55 — intensidade 3.0: a 120×120 as arestas a alpha do card (0.065)
        // desapareciam. Mesma geometria, alpha subido só para a miniatura se ler.
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
    // RODADA 17 — mesmo marcador do Onboarding (dispararFigurinhaIA): o Início
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
    try {
      const data = await apiFetch('/api/me/avatar/ai', { method: 'POST', body: JSON.stringify({ kit: 'dark-gold' }) });
      setMe((m) => (m ? { ...m, user: { ...m.user, avatar_url: data.avatar_url } } : m));
      setFotoLocal(null);
      recarregarPerfilGlobal();
    } catch (err) {
      // SEM_DIREITO (22-set) não é o "limite" morto — mostrar o card de quota
      // (que mandaria "Ver Brilhantes" para um 403 que já significa isso)
      // seria só ruído; o card comum já está pronto, é só revelar. `subirFoto`
      // só chama esta função quando já há direito confirmado, mas o direito
      // pode ter acabado entre a checagem e a resposta (corrida rara) — cai
      // aqui na mesma, sem erro na tela.
      if (err?.code === 'SEM_DIREITO') estadoBrilhantes().then(setBrilhante);
      else if (err?.status === 403) setLimiteIA(true); // 403 sem código conhecido (defensivo)
      else setErro(err?.message || 'Não foi possível gerar sua figurinha.');
    } finally {
      setGerandoIA(false);
      setEstreiaFase('pronto'); // mostra o cromo (com Brilhante ou a foto)
    }
  }

  // Trocar foto: preview local imediato + upload para o servidor.
  // Na estreia, dispara automaticamente a geração da Brilhante — só quando já
  // há direito (crédito ou pacote do time); sem ele, a comum já está pronta.
  // Núcleo do upload, reutilizado pelo "tentar de novo" (P1-5). `emEstreia` decide
  // se dispara a geração IA automática a seguir. RODADA 19: `file` já é o
  // RECORTE (saído do CropModal); `original` (opcional) é a foto de antes do
  // recorte, mandada junto para "Ajustar enquadramento" mais tarde.
  async function subirFoto(file, emEstreia, original) {
    setFotoLocal(URL.createObjectURL(file)); // preview imediato
    if (emEstreia) setEstreiaFase('gerando');
    setUploadFoto(true);
    setErro('');
    setUploadErro(null);
    try {
      const data = original
        ? await apiUploadCampos('/api/me/avatar', { avatar: file, original })
        : await apiUpload('/api/me/avatar', file, 'avatar');
      // foto_url = a nova foto (fonte da próxima geração). avatar_url = o que o card
      // mostra: o backend PRESERVA o avatar IA antigo se existir (senão espelha a foto),
      // por isso o card mantém o avatar antigo até o utilizador gerar de novo.
      setMe((m) => (m ? {
        ...m,
        user: {
          ...m.user,
          foto_url: data.foto_url ?? data.avatar_url,
          avatar_url: data.avatar_url,
          foto_original_url: data.foto_original_url ?? m.user.foto_original_url ?? null,
        },
      } : m));
      setUploadFoto(false);
      ultimoFicheiro.current = null;
      origParaEnviar.current = null;
      if (emEstreia) {
        // SPEC-FIGURINHA-3 (22-set): a estreia só tenta gerar a Brilhante com
        // direito confirmado (crédito ou pacote do time) — sem isso o POST
        // dava 403 SEM_DIREITO e a tela mostrava o card de "limite" (que nem
        // existe mais). Sem direito, a comum já está pronta (o upload acima
        // gravou foto_url): só falta revelar o cromo, sem tentar nem errar.
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

  // RODADA 19 — "Ajustar enquadramento": regrava só o recorte (PUT), sem
  // mandar original nenhuma (a que já está guardada não muda).
  async function enviarRecorte(blob) {
    const file = new File([blob], 'recorte.jpg', { type: 'image/jpeg' });
    setFotoLocal(URL.createObjectURL(file));
    setUploadFoto(true);
    setErro('');
    setUploadErro(null);
    try {
      const data = await apiUploadCampos('/api/me/avatar/recorte', { recorte: file }, { method: 'PUT' });
      setMe((m) => (m ? { ...m, user: { ...m.user, foto_url: data.foto_url, avatar_url: data.avatar_url } } : m));
      setUploadFoto(false);
      setToast({ tipo: 'success', mensagem: 'Enquadramento atualizado!' });
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

  // "Ajustar enquadramento": reabre o CropModal sobre a foto ORIGINAL
  // guardada (foto_original_url). Fail-safe (fotos de antes desta rodada, ou
  // sem a migração 057): sem original, reabre sobre o RECORTE atual — dá
  // para aproximar, não para recuperar área perdida no primeiro recorte.
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
  async function aoConfirmarCrop(blob) {
    setCropFile(null);
    if (cropModo === 'ajustar') {
      await enviarRecorte(blob);
      return;
    }
    const original = origParaEnviar.current;
    ultimoFicheiro.current = blob;
    await subirFoto(blob, estreiaFase === 'foto', original);
  }
  function aoCancelarCrop() {
    setCropFile(null);
    origParaEnviar.current = null;
  }

  // "Tentar de novo" (P1-5): repete o upload com o MESMO recorte (+ original,
  // se havia), sem passar pelo CropModal de novo.
  function repetirUpload() {
    if (ultimoFicheiro.current) subirFoto(ultimoFicheiro.current, estreiaFase === 'foto', origParaEnviar.current);
  }

  // RODADA 19 — "Minhas figurinhas": até 6, mais recente primeiro. Recarrega
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
      setMe((m) => (m ? { ...m, user: { ...m.user, avatar_url: data.avatar_url, kit_ativo: data.kit } } : m));
      setFotoLocal(null); // mostra o avatar_url novo (não o preview local de upload)
      recarregarPerfilGlobal();
      setToast({ tipo: 'success', mensagem: 'Figurinha aplicada!' });
    } catch (err) {
      setErro(err?.message || 'Não foi possível usar essa figurinha.');
    } finally {
      setUsandoHistoricoId(null);
    }
  }

  // Aviso de erro partilhado (P1-5): erro de upload com mensagem accionável +
  // "tentar de novo" inline; senão, o erro genérico da página.
  const avisoErro = uploadErro ? (
    <div className="alert alert--error" style={{ margin: 0, display: 'grid', gap: 8, justifyItems: 'start' }}>
      <span>{uploadErro.texto}</span>
      {uploadErro.podeRepetir ? (
        <button type="button" onClick={repetirUpload} disabled={uploadFoto} className="btn btn--sm hud-corners-s cta-gold" style={{ fontFamily: "'Rajdhani', sans-serif", letterSpacing: '0.06em' }}>
          {uploadFoto ? 'Enviando…' : 'Tentar de novo'}
        </button>
      ) : null}
    </div>
  ) : erro ? (
    <div className="alert alert--error" style={{ margin: 0 }}>{erro}</div>
  ) : null;

  // Partilha do cromo no momento da estreia (imagem do card + texto viral).
  // No app (Rodada 8A) vai direto à folha de compartilhar do sistema: o
  // navigator.share do WebView não é garantido, e o <a download> é ignorado.
  async function partilharCromo() {
    celebrarPartilha(frameHex);
    try {
      const blob = await gerarFigurinhaCanvas(opts);
      const nome = ficheiroNome(nomeJogador(jogador));
      const file = blob ? new File([blob], nome, { type: 'image/png' }) : null;
      const payload = { title: 'Meu card Futty', text: 'Veja meu cartão de jogador no Futty ⚽' };
      if (ehAppNativo()) {
        await salvarOuCompartilhar(blob, nome, { titulo: payload.title });
      } else if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ ...payload, files: [file] });
      } else if (navigator.share) {
        await navigator.share(payload);
      } else if (blob) {
        await salvarOuCompartilhar(blob, nome);
      }
    } catch (e) {
      if (e?.name !== 'AbortError') setErro(e?.message || 'Não foi possível compartilhar.');
    } finally {
      concluirEstreia();
    }
  }

  // Gerar avatar com IA a partir da foto atual (endpoint usa users.avatar_url).
  // `kitId` opcional: quando vem de um onClick recebe o evento → cai no kit vestido.
  async function gerarAvatarIA(kitId) {
    if (gerandoIA) return;
    const kit = typeof kitId === 'string' ? kitId : kitAtivo;
    // RODADA 17 — mesmo marcador de gerarAvatarIAEstreia/dispararFigurinhaIA
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
    setEmailNaoConfirmado(false);
    try {
      const data = await apiFetch('/api/me/avatar/ai', { method: 'POST', body: JSON.stringify({ kit }) });
      // Guarda o avatar, o kit vestido e regista o slot novo (sem duplicar).
      setMe((m) => (m ? {
        ...m,
        user: { ...m.user, avatar_url: data.avatar_url, kit_ativo: data.kit },
        slots: [...new Set([...(m.slots || []), data.kit])],
      } : m));
      setFotoLocal(null); // limpa o preview local → mostra o avatar IA (avatar_url)
      recarregarPerfilGlobal();
      // O direito acabou de ser gasto (crédito a menos, ou a linha do pacote):
      // relê, para o contador e o botão dourado contarem a verdade.
      estadoBrilhantes().then(setBrilhante);
      setFotoTrocadaSemGerar(false); // gerou (ou reutilizou de propósito) — some o pulso
      // reutilizado:true (motor, build 9) — o slot deste kit já valia para a
      // foto atual e não gerou de novo. Sem aviso, parecia que o toque no
      // botão não fez nada.
      if (data.reutilizado) setToast({ tipo: 'info', mensagem: 'Sua figurinha já estava pronta' });
    } catch (err) {
      // EMAIL_NAO_CONFIRMADO: gate anti-abuso (11-ago) — mesmo status 403 do limite
      // de quota, por isso tem de ser verificado PRIMEIRO (código distingue os dois).
      if (err?.code === 'EMAIL_NAO_CONFIRMADO') setEmailNaoConfirmado(true);
      // SEM_DIREITO (22-set, SPEC-FIGURINHA-3) — também 403, mas não é limite
      // nenhum: é o direito que acabou (ou o pacote do time que não existe).
      // Recarrega o estado para o bloco "Vire Brilhante" aparecer sozinho; o
      // card de quota do plano NÃO serve aqui, e mostrá-lo seria mentir.
      else if (err?.code === 'SEM_DIREITO') {
        estadoBrilhantes().then(setBrilhante);
        setErroIAmsg(err.message);
        setErroIA(true);
      } else if (err?.status === 403) setLimiteIA(true); // gate antigo de plano (morto, fica de rede)
      else {
        // FOTO_INVALIDA / TETO_DIARIO_ATINGIDO / IA_INDISPONIVEL / FOTO_DESATUALIZADA:
        // causas acionáveis com mensagem digna própria, em vez do genérico
        // "não deu desta vez". IA_INDISPONIVEL (14-set: fal recusou por
        // chave/crédito, falha do MOTOR) usa a mensagem que já vem do backend —
        // nunca sugere "tente outra foto", porque o problema não é a foto.
        // FOTO_DESATUALIZADA (22-set) é a trava de hash do motor: a foto que
        // ele baixou ainda não era a que acabou de subir, e ele recusou gerar
        // em vez de fazer a figurinha da foto errada. Nada a corrigir do lado
        // de cá — é esperar uns segundos e tocar de novo, e o botão de repetir
        // do overlay já está lá. Resto (fal fora do ar, etc.) mantém o genérico
        // com retry, que já cobre bem o transitório.
        if (['FOTO_INVALIDA', 'TETO_DIARIO_ATINGIDO', 'IA_INDISPONIVEL', 'FOTO_DESATUALIZADA', 'SEM_DIREITO'].includes(err?.code)) setErroIAmsg(err.message);
        setErroIA(true); // qualquer falha → estado de erro com retry no overlay
      }
    } finally {
      setGerandoIA(false);
    }
  }

  // Reenvia o e-mail de confirmação (gate anti-abuso, 11-ago) — supabase.auth.resend
  // usa a MESMA sessão activa, não precisa senha nem novo login.
  async function reenviarEmailConfirmacao() {
    if (reenviarBusy || !me?.user?.email) return;
    setReenviarBusy(true);
    try {
      const { error } = await supabase.auth.resend({ type: 'signup', email: me.user.email });
      if (error) throw error;
      setReenviarFeito(true);
    } catch (e) {
      setErro(e?.message || 'Não foi possível reenviar o e-mail.');
    } finally {
      setReenviarBusy(false);
    }
  }

  // A2 — toque num kit da grelha. Três caminhos: já gerado (slot) → VESTE via
  // PUT (não gasta direito); sem slot e sem direito → /planos; sem slot e com
  // direito → confirma e gera.
  async function escolherKit(kit) {
    if (kit.estado === 'breve' || kit.id === kitAtivo || gerandoIA) return;
    // 22-set: o cadeado deixou de ser por PLANO e passou a ser por DIREITO
    // (§5). Vestir um uniforme que já se gerou é sempre livre (slot, custo
    // zero); gerar um novo precisa de crédito ou do pacote do time — e é isso
    // que /planos resolve. Um membro do pacote via o PRÓPRIO uniforme do time
    // trancado, porque o dark-purple estava marcado "pro".
    if (slotsKits.includes(kit.id)) {
      try {
        const data = await apiFetch('/api/me/kit', { method: 'PUT', body: JSON.stringify({ kit: kit.id }) });
        setMe((m) => (m ? { ...m, user: { ...m.user, avatar_url: data.avatar_url, kit_ativo: data.kit } } : m));
        aplicarNoPerfilGlobal({ avatar_url: data.avatar_url, kit_ativo: data.kit });
      } catch {
        setErroIA(true);
      }
      return;
    }
    // Sem slot: só dá para gerar com direito. Sem ele, a resposta é /planos —
    // nunca um confirm() que ia terminar em 403 SEM_DIREITO. "Minha Brilhante"
    // é o destaque certo: é o único produto que deixa escolher o uniforme (o
    // pacote do time fixa um só, do dono).
    if (!temDireitoDeGerar) return navigate('/planos?destaque=minha');
    // Gastar 1 geração é irreversível: pede confirmação primeiro.
    if (!window.confirm(`Gerar o kit ${kit.nome}? Usa 1 das suas gerações IA.`)) return;
    await gerarAvatarIA(kit.id);
  }

  // VELOCIDADE 9 (23-set) — escrever no perfil SEM o reler a seguir.
  //
  // O relatório do build 28 trouxe seis `/api/me` seguidos (530/311/279/276/
  // 380/305 ms) e a leitura óbvia — "polling" — estava errada: eram três PARES
  // PATCH+GET. Cada toque num fundo gravava a preferência e chamava
  // `recarregarPerfilGlobal()` atrás, que é um GET /api/me inteiro para saber
  // uma coisa que o próprio toque acabou de decidir. Numa tela feita para
  // experimentar fundos e uniformes, isso é meia ida a São Paulo por toque.
  //
  // `hidratar` põe o mesmo estado no contexto (e no cache local) sem rede. A
  // releitura só se justifica quando a escrita muda coisas que não sabemos —
  // é o caso da geração de figurinha, que mexe em créditos e estado; essas
  // continuam a chamar `recarregarPerfilGlobal()`.
  function aplicarNoPerfilGlobal(campos) {
    if (!perfil) return;
    hidratarPerfilGlobal({ ...perfil, user: { ...perfil.user, ...campos } });
  }

  // Rodada 18 — interruptor "Mostrar minha foto" / "Mostrar minha figurinha"
  // (modal "Sua foto"): troca o que o card mostra sem apagar nada — a
  // figurinha continua no slot, sempre. avatarEhIA já diz qual dos dois está
  // ativo agora, então um toque no modo já ativo não faz nada.
  async function trocarModo(modo) {
    if (trocandoModo || (modo === 'figurinha') === avatarEhIA) return;
    setTrocandoModo(true);
    try {
      const data = await apiFetch('/api/me/avatar/modo', { method: 'PUT', body: JSON.stringify({ modo }) });
      setMe((m) => (m ? { ...m, user: { ...m.user, avatar_url: data.avatar_url } } : m));
      aplicarNoPerfilGlobal({ avatar_url: data.avatar_url });
    } catch (e) {
      setErro(e?.message || 'Não foi possível trocar o card.');
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
    // 22-set (SPEC-FIGURINHA-3 §4/§9): os 6 fundos vêm COM a Brilhante — são
    // composição do card, custo zero. O gate antigo era por plano (Pro/Elite),
    // e os planos saíram das telas: um membro do pacote do time via o Aura
    // trancado no card que o time acabou de pagar, com "Os 6 fundos liberados"
    // escrito na compra. Sem Brilhante não há seletor nenhum, portanto chegar
    // aqui já significa ter direito ao fundo.
    // Guarda o anterior para reverter se o PATCH falhar (build 9, achado real:
    // constraint do Royal sem a migração aplicada dava 500 — o tile ficava
    // marcado no fundo novo com o banco silenciosamente no antigo).
    const anterior = fundo;
    setFundo(k);
    try {
      await apiFetch('/api/me', { method: 'PATCH', body: JSON.stringify({ fundo_figurinha: k }) });
      setMe((m) => (m ? { ...m, user: { ...m.user, fundo_figurinha: k } } : m));
      aplicarNoPerfilGlobal({ fundo_figurinha: k });
    } catch (e) {
      setFundo(anterior); // nunca fica com o tile marcado e o banco diferente
      setToast({ tipo: 'error', mensagem: e?.message || 'Não foi possível trocar o fundo agora.' });
    }
  }

  // Escolha do avatar genérico (31-jul) — mesmo padrão optimista do fundo.
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
        setErro('Não foi possível gerar a imagem.');
        return;
      }
      // Web: baixa. App: folha de compartilhar (tem "Salvar imagem"); fechar a
      // folha sem escolher nada não é erro.
      await salvarOuCompartilhar(blob, ficheiroNome(nomeJogador(jogador)), { titulo: 'Minha figurinha Futty' });
    } catch (e) {
      setErro(e?.message || 'Erro ao gerar.');
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
        setErro('Não foi possível gerar a imagem.');
        return;
      }
      const file = new File([blob], ficheiroNome(nomeJogador(jogador)), { type: 'image/png' });
      if (!ehAppNativo() && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: 'Minha figurinha Futty' });
      } else {
        await salvarOuCompartilhar(blob, file.name, { titulo: 'Minha figurinha Futty' });
      }
    } catch (e) {
      if (e?.name !== 'AbortError') setErro(e?.message || 'Não foi possível compartilhar.');
    } finally {
      setBusy(false);
    }
  }

  // Overlay do card: "a gerar" OU, se a geração falhou (≠403), estado de ERRO com
  // retry. No erro o logo fica ESTÁTICO — sinal de que parou.
  //
  // FASE 3.57 — usa o FuttyLoader DIRECTO, não o <LoadingFutty />. O LoadingFutty é o
  // padrão de ECRÃ e traz minHeight: calc(100dvh - 120px) (~724px); dentro deste card
  // de ~450px transbordava e empurrava o F para baixo. Aqui o centro é o do CARD, e
  // quem o dá é o placeItems:center do próprio overlay.
  const overlayGerando = (
    // Velocidade 8: sem backdrop-filter. Este overlay fica por cima do card
    // ENQUANTO o F de carregamento se pinta — ou seja, o compositor teria de
    // refazer o desfoque a cada quadro da animação, e o que está por baixo é a
    // figurinha parada. 0,75 + blur ≈ 0,92 chapado no mesmo tom.
    <div style={{ position: 'absolute', inset: 0, zIndex: 8, clipPath: CLIP_OCTOGONO, background: 'rgba(5,8,16,0.92)', display: 'grid', placeItems: 'center' }}>
      {erroIA ? (
        <div style={{ display: 'grid', justifyItems: 'center', gap: 12, padding: 16, textAlign: 'center' }}>
          {/* LEI DO F: logo oficial transparente (FuttyLogo SVG), estático no erro.
              O antigo /futty-logo-metallic.png (fundo preto sólido) está BANIDO. */}
          <span style={{ opacity: 0.55, lineHeight: 0 }}><FuttyLogo variant="metallic" size={64} /></span>
          <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)' }}>{erroIAmsg || 'Não deu desta vez. Tente de novo.'}</span>
          <button type="button" className="btn btn--purple hud-corners" style={{ height: 38, paddingLeft: 16, paddingRight: 16, fontSize: 13 }} onClick={gerarAvatarIA}>
            Tentar novamente
          </button>
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
                : /* GRUPO B 6a — enquanto o preview não gera, mostra o F a carregar e
                     não o PlayerCard. O PlayerCard é a geração ANTERIOR do cromo (DOM,
                     sem octógono, sem placa, sem o enquadramento das fases 3.2x–3.4x):
                     usá-lo aqui fazia o utilizador ver, por instantes, um cromo
                     visivelmente diferente do final — um salto, não um carregamento.
                     VAGA 3 — o Início deixou de o usar (mostra este mesmo cromo,
                     composto); o PlayerCard só sobrevive na LandingPage. */
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
                <p style={{ fontSize: 14, lineHeight: 1.5, color: 'rgba(255,255,255,0.8)', margin: 0 }}>Adicione uma foto para personalizar seu cartão de jogador</p>
                <button type="button" className="btn btn--purple" style={{ width: '100%', height: 48, fontSize: 15 }} onClick={() => fileRef.current?.click()}>Adicionar foto</button>
                <button type="button" onClick={concluirEstreia} style={{ border: 'none', background: 'transparent', color: 'var(--label-color)', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Pular por agora →</button>
              </>
            ) : estreiaFase === 'gerando' ? (
              <>
                <h2 style={{ fontFamily: "'Rajdhani', sans-serif", fontWeight: 800, fontSize: 20, color: '#fff', margin: 0 }}>Gerando sua figurinha… <EstrelaIA size={14} color="#fff" /></h2>
                <p style={{ fontSize: 13, color: 'var(--label-color)', margin: 0 }}>Leva uns 45 segundos</p>
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
                    {/* FASE 3.31 — Névoa REMOVIDA no fundo Épico: o facetado é gráfico,
                        não atmosférico; a bruma por cima embaçava o lapidado. As
                        partículas (chuva) ficam — dão o "premium discreto" sem embaçar. */}

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
            {/* Trocar visual — só quando o card veste o genérico (sem avatar IA). */}
            {!avatarEhIA && !fotoLocal && !gerandoIA && !erroIA ? (
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

        {/* (Faixa "Avatar IA ativo · Ver foto" removida na FASE 3.21 — a informação
            passou toda para o modal "A tua foto", aberto pelo botão Trocar foto.) */}

        {/* Foto subida mas ainda sem avatar IA gerado (a foto não entra no card).
            RODADA 17 — gerandoIA vem PRIMEIRO: fotoLocal só é limpo no sucesso/
            falha de gerarAvatarIA (não no início), então sem esta ordem as duas
            geração já em curso mostrava "Foto carregada, gere seu avatar" por
            cima do botão já dizendo "Gerando…" — duas mensagens discordando. */}
        {gerandoIA ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center', padding: '4px 0', marginBottom: 10, fontSize: 11, color: '#d4a017' }}>
            <FuttyLoader size={14} label={null} /> Sua figurinha está sendo criada… leva uns 45 segundos
          </div>
        ) : fotoLocal ? (
          // SPEC-FIGURINHA-3: trocar a foto já MUDA a figurinha comum na hora —
          // não há nada a gerar. A linha só convida a gerar a Brilhante quando
          // há direito; senão diz o que aconteceu de facto.
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center', padding: '4px 0', marginBottom: 10, fontSize: 11, color: '#d4a017' }}>
            <Check size={14} /> {temDireitoDeGerar ? 'Foto trocada, gere sua figurinha' : 'Foto trocada — sua foto já mudou'}
          </div>
        ) : null}

        <input ref={fileRef} type="file" accept="image/*" hidden onChange={onPickFile} />

        {/* 2. CONTROLOS — tabs + painel + detalhes */}
        <div style={{ maxWidth: 460, margin: '0 auto', display: 'grid', gap: 14 }}>
          {/* FASE 3.36 — Zoom saiu de cima do card: linha discreta ABAIXO, à direita.
              Mesma família visual das tabs. Limites e função iguais (90–130%). */}
          {avatarEhIA && !fotoLocal ? (
            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 6, height: 26, marginTop: -4, marginBottom: -6 }}>
              <span style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--label-color)', marginRight: 2 }}>Tamanho</span>
              <button
                type="button"
                aria-label="Reduzir tamanho do avatar"
                className="fig-zoom-btn hud-corners-s"
                onClick={() => setAvatarZoom((z) => Math.max(ZOOM_MIN, +(z - 0.11).toFixed(2)))}
                disabled={avatarZoom <= ZOOM_MIN}
              >
                <Minus size={14} />
              </button>
              <button
                type="button"
                aria-label="Aumentar tamanho do avatar"
                className="fig-zoom-btn hud-corners-s"
                onClick={() => setAvatarZoom((z) => Math.min(ZOOM_MAX, +(z + 0.11).toFixed(2)))}
                disabled={avatarZoom >= ZOOM_MAX}
              >
                <Plus size={14} />
              </button>
            </div>
          ) : null}
          {/* Trocar foto + Gerar Avatar IA (na mesma linha) */}
          <div style={{ display: 'grid', gap: 4 }}>
            <div style={{ display: 'flex', gap: 8 }}>
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
                  // RODADA 17 — EXACTAMENTE a receita do "Ver sorteio" (Inicio.jsx
                  // ~337): o glow fica no WRAPPER, em drop-shadow (filter não é
                  // cortado pelo clip-path); o pulso de BORDA fica no botão (essa
                  // metade sobrevive ao recorte a 45° do hud-corners). fig-io-btn
                  // continua nas duas classes só para a ALTURA: .cta-gold sozinho
                  // vale 46px e quebraria a linha com "Trocar foto" (40px, 34px em
                  // ecrãs curtos) — o par .fig-io-btn.cta-gold no app.css resolve
                  // esse empate de especificidade a favor da grade existente.
                  <span className="cta-gold-glow pulse-glow" style={{ flex: 1, display: 'flex' }}>
                    <button
                      type="button"
                      className="btn hud-corners fig-io-btn cta-gold pulse-active"
                      style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                      disabled={gerandoIA || uploadFoto}
                      onClick={gerarAvatarIA}
                    >
                      <EstrelaIA size={16} color="#f0c94a" /> Gerar minha figurinha
                    </button>
                  </span>
                ) : (
                  <button
                    type="button"
                    className="btn btn--purple fig-io-btn hud-corners"
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
                        <EstrelaIA size={16} color="#ffffff" /> Gerar minha figurinha
                      </>
                    )}
                  </button>
                )
              )}
            </div>
            {/* Contador de gerações restantes (§7). Só com crédito: no pacote do
                time a conta é "uma por time", não um saldo — e um número a
                descer sem necessidade só assusta. */}
            {creditos > 0 ? (
              <span style={{ fontSize: 11, color: 'var(--label-color)', textAlign: 'center' }}>
                {creditos === 1 ? 'Resta 1 geração' : `Restam ${creditos} gerações`}
                {kitDoTime ? ' · o uniforme do time vem por conta do pacote' : ' · uniforme à sua escolha'}
              </span>
            ) : kitDoTime && !avatarEhIA ? (
              <span style={{ fontSize: 11, color: 'var(--label-color)', textAlign: 'center' }}>
                Sua figurinha vem pelo pacote do time, no uniforme que o dono escolheu
              </span>
            ) : null}
            {/* "Pode demorar até 30 segundos" (própria, sob o botão) saiu nesta
                rodada: virou redundante e desatualizada com a mensagem nova
                acima da linha ("Seu avatar está sendo criado… leva uns 45
                segundos"), que já cobre gerandoIA com o tempo real do motor
                em duas passadas. Duas legendas de tempo diferentes ao mesmo
                tempo (30s aqui, 45s ali) confundia mais do que ajudava. */}
          </div>

          {/* VIRE BRILHANTE ✨ (SPEC-FIGURINHA-3 §3/§7) — o único bloco que
              substitui os seletores de fundo/uniforme na figurinha comum. Um
              exemplo FIXO (o modelo fictício da conta demo, nunca gerado na
              hora: gerar um exemplo custaria US$0,11 por pessoa que abrisse a
              tela) e os dois caminhos. `loading="lazy"` + WebP no dobro do
              tamanho de exibição, como manda a lei do app leve (14-set). */}
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
                  style={pedidoVivo?.estado === 'recusado' && !avisoPedido
                    ? { padding: '9px 11px', fontSize: 12.5, lineHeight: 1.4, textAlign: 'center', color: 'rgba(255,255,255,0.75)', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.14)' }
                    : { padding: '9px 11px', fontSize: 12.5, lineHeight: 1.4, textAlign: 'center', color: '#f0c94a', background: 'rgba(212,160,23,0.1)', border: '1px solid rgba(212,160,23,0.45)' }}
                >
                  {recadoPedido}
                </div>
              ) : null}
              <div style={{ display: 'grid', gap: 8 }}>
                {/* Dono de time vê o pacote primeiro: é o que resolve o time
                    inteiro, e é a venda maior. */}
                {meuTimeBrilhante && !meuTimeBrilhante.brilhante_ativo ? (
                  <span className="cta-gold-glow" style={{ display: 'flex' }}>
                    <button
                      type="button"
                      className="btn hud-corners cta-gold"
                      style={{ flex: 1, fontSize: 12.5, lineHeight: 1.3 }}
                      disabled={pedindo === 'pacote'}
                      onClick={() => pedirBrilhante('pacote')}
                    >
                      {pedindo === 'pacote'
                        ? 'Enviando…'
                        : `Ativar para o meu time · ${PRODUTOS[0].preco} · ${PRODUTOS[0].porJogador}`}
                    </button>
                  </span>
                ) : null}
                <button
                  type="button"
                  className="btn btn--purple hud-corners"
                  style={{ width: '100%', fontSize: 12.5 }}
                  disabled={pedindo === 'minha'}
                  onClick={() => pedirBrilhante('minha')}
                >
                  {pedindo === 'minha' ? 'Enviando…' : `Só a minha · ${PRODUTOS[2].preco} · ${MINHA_GERACOES} gerações`}
                </button>
                <Link to="/planos" style={{ fontSize: 11.5, color: 'var(--label-color)', textAlign: 'center', textDecoration: 'none' }}>
                  Ver o que cada um dá →
                </Link>
              </div>
            </div>
          ) : null}

          {/* (l) 403 sem código conhecido — defensivo: hoje o motor só devolve
              EMAIL_NAO_CONFIRMADO ou SEM_DIREITO (cada um com seu próprio
              card), tratados ANTES deste no catch. Isto é o que sobra se um
              dia aparecer um terceiro — mensagem digna, nunca "limite do mês"
              (não há limite mensal desde 22-set). */}
          {limiteIA ? (
            <div className="hud-corners" style={{ position: 'relative', background: 'linear-gradient(180deg, #14121c, #0b0a12)', border: '1px solid rgba(212,160,23,0.35)', padding: '14px 16px', display: 'grid', gap: 8, justifyItems: 'center', textAlign: 'center' }}>
              <span aria-hidden="true" style={{ position: 'absolute', top: 8, right: 10, width: 7, height: 7, borderRadius: 1, transform: 'rotate(45deg)', background: 'linear-gradient(135deg, #f5e070, #d4a017)' }} />
              <span style={{ fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, fontSize: 15, letterSpacing: '0.04em', color: '#fff' }}>Não deu para gerar agora</span>
              <Link to="/planos" className="btn btn--purple hud-corners" style={{ marginTop: 4, height: 38, paddingLeft: 18, paddingRight: 18, fontSize: 13, display: 'inline-flex', alignItems: 'center', textDecoration: 'none' }}>
                Ver Figurinhas
              </Link>
            </div>
          ) : null}

          {/* (m) E-MAIL NÃO CONFIRMADO — gate anti-abuso (11-ago), mesma família HUD. */}
          {emailNaoConfirmado ? (
            <div className="hud-corners" style={{ position: 'relative', background: 'linear-gradient(180deg, #14121c, #0b0a12)', border: '1px solid rgba(212,160,23,0.35)', padding: '14px 16px', display: 'grid', gap: 8, justifyItems: 'center', textAlign: 'center' }}>
              <span aria-hidden="true" style={{ position: 'absolute', top: 8, right: 10, width: 7, height: 7, borderRadius: 1, transform: 'rotate(45deg)', background: 'linear-gradient(135deg, #f5e070, #d4a017)' }} />
              <span style={{ fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, fontSize: 15, letterSpacing: '0.04em', color: '#fff' }}>Confirme seu e-mail para gerar</span>
              <span style={{ fontSize: 12, color: 'var(--label-color)' }}>Enviamos um link de confirmação quando você criou a conta.</span>
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

          {/* Tab strip — SÓ com Brilhante (SPEC-FIGURINHA-3 §3: "sem seletor de
              fundo nem de uniforme" na comum). Os fundos são composição no
              card, custo zero, mas são um prémio de quem pagou; e o uniforme
              não existe numa foto sem IA. No lugar deles fica o bloco "Vire
              Brilhante", logo acima. */}
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
            // UMA linha só, scroll horizontal (nunca 2 linhas — ordem do dono). Tiles
            // com largura FIXA (não fração do container) para não encolher/quebrar;
            // scroll-snap para o gesto de arrastar assentar num tile de cada vez.
            // Grade partilhada com a tab Uniforme (.fig-seletor-grade / .fig-seletor-tile
            // em app.css) — ver nota de 15-set ali.
            <div className="fig-seletor-grade">
              {FUNDOS.map((f) => {
                const sel = fundo === f.k;
                // Cadeado premium (mesma regra dos kits): fundo premium + plano não pago.
                // `!sel` — LEI DA REGRA JUSTA: quem já está equipado neste fundo (ficou de
                // antes do gate) não vê cadeado no que já é seu; o cadeado é só para quem
                // tentaria EQUIPAR agora. O gate real (escolherFundo) não muda: ao trocar
                // pra outro fundo e tentar voltar, sel vira false e o cadeado aparece.
                // Os 6 são de quem tem Brilhante (§4) — e este seletor só existe
                // com Brilhante. Nenhum cadeado aqui desde 22-set.
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
            </div>
          ) : (
            // Grade partilhada com a tab Fundo (.fig-seletor-grade / .fig-seletor-tile
            // em app.css, nota de 15-set) — mesma largura total, mesmo tile, mesmo gap,
            // mesmo padding lateral, mesma rolagem horizontal.
            <div className="fig-seletor-grade">
              {/* Achado 1 (roteiro 10-set): kit ainda não lançado nem aparece — nada de
                  "em breve" na tela. */}
              {KITS_FIGURINHA.filter((kit) => kit.estado !== 'breve').map((kit) => {
                // A2 — estados reais: VESTIDO (kit_ativo) | GERADO (tem slot, 1 toque veste)
                // | GERÁVEL (sem slot, com direito → custa 1 geração) | trancado por direito.
                const vestido = kit.id === kitAtivo;
                const gerado = slotsKits.includes(kit.id);
                // Cadeado por DIREITO, não por plano (ver nota em escolherKit):
                // o que já está gerado veste-se sempre; o resto só com crédito
                // ou pacote do time.
                const semDireito = !gerado && !temDireitoDeGerar;
                const geravel = !semDireito && !gerado;
                const bloqueado = semDireito;
                return (
                  <button
                    key={kit.id}
                    type="button"
                    className="fig-seletor-tile"
                    onClick={() => escolherKit(kit)}
                    aria-label={kit.nome}
                    aria-pressed={vestido}
                    disabled={gerandoIA}
                  >
                    {/* Thumbnail quadrado */}
                    <div className="hud-corners-s" style={{ position: 'relative', width: '100%', aspectRatio: '1 / 1', overflow: 'hidden', background: KIT_IMG[kit.id] ? '#0d0d12' : `linear-gradient(135deg, ${kit.base} 55%, ${kit.acento} 55%)`, opacity: bloqueado ? 0.45 : 1, border: vestido ? '2px solid #d4a017' : '1px solid var(--border-subtle)', filter: vestido ? 'none' : 'saturate(0.7) brightness(0.85)' }}>
                      {KIT_IMG[kit.id] ? (
                        // Enquadramento (reparo do look): o cover cortava a camisa a meio.
                        // Ancora ao topo + desce + reduz a escala → vê-se o corte da gola e
                        // o padrão da manga de relance, com a maior parte da camisa visível.
                        <img
                          src={KIT_IMG[kit.id]}
                          alt={kit.nome}
                          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: '50% 10%', transform: 'scale(0.82) translateY(7%)', transformOrigin: '50% 0%' }}
                        />
                      ) : null}
                      {vestido ? (
                        <span style={{ position: 'absolute', top: 3, right: 3, width: 15, height: 15, borderRadius: '50%', background: '#d4a017', color: '#0d0d12', display: 'grid', placeItems: 'center' }}>
                          <Check size={10} strokeWidth={3} />
                        </span>
                      ) : null}
                      {/* Gerável (activo, sem slot): avisa que custa 1 geração. */}
                      {geravel ? (
                        <span style={{ position: 'absolute', bottom: 3, left: '50%', transform: 'translateX(-50%)', display: 'inline-flex', alignItems: 'center', gap: 2, padding: '1px 4px', borderRadius: 5, background: 'rgba(0,0,0,0.75)', color: '#d4a017', fontFamily: "'Rajdhani', sans-serif", fontSize: 8, fontWeight: 700, whiteSpace: 'nowrap' }}>
                          <EstrelaIA size={7} color="#d4a017" /> 1 geração
                        </span>
                      ) : null}
                      {/* BUG real desta varredura: isto chamava-se `pro` (variável que não
                          existe mais desde que o cadeado virou DIREITO) — a aba Uniforme
                          quebrava com ReferenceError sempre que alguém a abria. Só o
                          cadeado fica; o rótulo "PRO" não existe desde 22-set. */}
                      {bloqueado ? (
                        <span style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', color: '#fff' }}>
                          <Lock size={14} />
                        </span>
                      ) : null}
                    </div>
                    {/* Nome */}
                    <span style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 10, fontWeight: 700, color: bloqueado ? 'var(--label-color)' : '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {kit.nome}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {avisoErro}

          {/* 3. AÇÕES — logo abaixo do painel de tiles. Mais altas (46px) que os
              botões do topo (40px) → hierarquia: topo = configurar, fundo = agir.

              VELOCIDADE 8 (16-set) — NO APP FICA UM BOTÃO SÓ. Os dois faziam
              exactamente a MESMA coisa: no nativo não existe "baixar" (o <a
              download> é ignorado pelo WKWebView), por isso tanto o "Salvar /
              compartilhar" como o "Compartilhar" caíam em salvarOuCompartilhar
              e abriam a mesma folha do sistema — a folha que já tem "Salvar
              imagem" lá dentro. Dois botões para uma ação não são uma escolha,
              são uma dúvida: a pessoa pára a decidir qual é qual, e qualquer
              que escolha vê o mesmo ecrã. Fica o dourado, à largura toda.
              Na WEB os dois continuam, porque lá são mesmo coisas diferentes:
              "Baixar" grava o ficheiro, "Compartilhar" abre o navigator.share. */}
          <div style={{ display: 'flex', gap: 12 }}>
            {/* Baixar RECUA: borda roxa mais fraca + texto a 85% → secundário mas presente. */}
            {appNativo ? null : (
              <button
                type="button"
                className="btn btn--purple-outline hud-corners"
                style={{ flex: 1, height: 46, borderWidth: '1.5px', borderColor: 'rgba(139,92,246,0.5)', color: 'rgba(255,255,255,0.85)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                disabled={busy}
                onClick={baixar}
              >
                <Download size={16} /> {busy ? 'Gerando…' : 'Baixar'}
              </button>
            )}
            {/* FASE 3.47 — CTA dourado partilhado com o "Assinar Pro" dos Planos:
                gradiente, texto, altura, glow e shine vivem em .cta-gold/.cta-gold-glow
                (app.css). O glow fica no wrapper SEM clip porque o clip-path do botão
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

          {/* RODADA 12C — o anúncio entra DEPOIS da linha de ações, nunca antes
              da figurinha: esta tela é a figurinha, e uma faixa por cima dela
              venderia o lugar errado. Aqui já se rolou uma dobra, a figurinha
              foi vista e a ação principal foi tomada. */}
          <div style={{ marginTop: 18 }}>
            <AdCard pagina="figurinha" variant="banner320x100" ad={adFigurinha} prontoExterno={adPronto} />
          </div>

          {/* SELOS DE HONRA (Vaga 11C) — SECÇÃO PRÓPRIA full-width, ABAIXO da linha
              Baixar/Compartilhar; alcançável só por scroll (nunca empurra a 1ª dobra).
              Olhinho: mostra/oculta cada selo do cromo (máx 2; a honra fica na vitrine). */}
          {selos.length ? (
              <div style={{ marginTop: 22 }}>
                <div style={{ fontFamily: "'Rajdhani', sans-serif", fontWeight: 800, fontSize: 13, letterSpacing: '.06em', color: '#f0c94a', textTransform: 'uppercase', marginBottom: 4 }}>Selos de honra</div>
                <p className="muted" style={{ fontSize: 11, margin: '0 0 12px', lineHeight: 1.4 }}>Toque no olho para mostrar/ocultar no card (máx 2). A honra fica sempre na sua vitrine.</p>
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
          </>
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

      {/* Modal "A tua foto" — foto actual + estado do avatar IA + carregar nova.
          Portal para o body (15-set): fixed dentro do [data-page] animado não
          confia no viewport no WebKit do iPhone — ver nota em LoadingFutty.jsx. */}
      {modalFoto
        ? createPortal(
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Sua foto"
          onClick={() => setModalFoto(false)}
          /* Velocidade 8: a 0,85 de preto por cima, o blur de 4px não se via —
             pagava-se uma camada de composição de ecrã inteiro para nada. */
          style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
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

            {/* Rodada 18 — interruptor "Mostrar minha foto" / "Mostrar minha
                figurinha": só aparece pra quem já tem uma figurinha gerada
                (mesmo que o card esteja mostrando a foto agora). Um toque
                troca avatar_url na hora — a prévia abaixo segue junto. */}
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
              /* FASE 3.35 — moldura ADAPTATIVA: sem height fixa, o container cresce com
                 a foto (o maxHeight trava as muito altas). As barras que sobrem em
                 #0d0d12 lêem como moldura intencional, não como corte. */
              <div className="hud-corners" style={{ width: '100%', background: '#0d0d12' }}>
                <img
                  src={urlImagem(urlAsset(fotoOriginal), 512)}
                  alt="Sua foto"
                  style={{ width: 'auto', height: 'auto', maxWidth: '100%', maxHeight: '46vh', objectFit: 'contain', display: 'block', margin: '0 auto' }}
                />
              </div>
            ) : (
              <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--label-color)', fontSize: 13 }}>Você ainda não tem foto.</div>
            )}

            {/* Estado do card — prévia ao vivo do que os outros veem (Rodada
                18: muda na hora com o interruptor acima, sem esperar reload). */}
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

            {/* RODADA 19 — "Minhas figurinhas": até 6, miniaturas + "Usar esta"
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

            {/* Duas ações (decisão do dono, 23-set): "Escolher outra foto" leva
                ao CropModal 2:3 de sempre; "Ajustar enquadramento" reabre o
                MESMO CropModal sobre a foto original guardada, sem upload novo.
                A 2ª só existe havendo foto (nada para ajustar sem ela). */}
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

      {/* RODADA 19 — o mesmo CropModal do Onboarding, para "Escolher outra
          foto" (cropModo='nova') e "Ajustar enquadramento" (cropModo='ajustar');
          só o que aoConfirmarCrop faz com o resultado muda entre os dois. */}
      {cropFile ? (
        <CropModal file={cropFile} aspect={2 / 3} aspectos={[{ k: '2:3', v: 2 / 3 }]} onConfirm={aoConfirmarCrop} onCancel={aoCancelarCrop} />
      ) : null}
    </div>
  );
}
