// Futty v2.0 — Figurinha (/figurinha): selos de honra (Vaga 11C) no cromo + olhinho.
// Futty v2.0 — Figurinha (/figurinha): "card studio". Card 2:3 com tilt 3D e
// entrada animada; opções em tabs (Fundo/Frame/Uniforme) + toggles compactos.
// Trocar foto é preview local (sem backend). Tudo no cliente (canvas).
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Camera, Download, Share2, X, Lock, Check, Plus, Minus } from 'lucide-react';
import { apiFetch, apiUpload } from '../lib/api';
import { nomeJogador, urlAsset } from '../utils/avatar';
import { mensagemUploadFoto } from '../utils/uploadErro';
import { getFrameColor } from '../utils/frameColors';
import { gerarFigurinhaCanvas, gerarCamadasFigurinha, desenharFundoEpico, desenharFundoGolden, desenharFundoRoyal } from '../utils/figurinhaCanvas';
import { celebrarPartilha, celebrarCromoPronto } from '../hooks/useConfetti';
import Topbar from '../components/Topbar';
import FuttyLoader from '../components/FuttyLoader';
import FuttyLogo from '../components/FuttyLogo';
import LoadingFutty from '../components/LoadingFutty';
import SeloHonra from '../components/SeloHonra';
import SilhuetaJogador from '../components/SilhuetaJogador';
import '../styles/app.css';

// Chaves nomeadas (iguais às guardadas em users.cor_frame / fundo_figurinha).
// GATES CONFIRMADOS (ordem do dono): Aura e Épico viram PREMIUM (mesmo padrão do
// Golden — verdade no servidor, ver FUNDOS_PREMIUM em backend/routes/auth.js; o
// `premium: true` aqui é só o cadeado do desejo). Neutro passa a vir ANTES do
// Épico (o único livre a seguir ao Estádio/Aura). LEI DA REGRA JUSTA: quem já
// tinha Aura/Épico equipado mantém — o gate só corre ao TROCAR (ver escolherFundo).
const FUNDOS = [
  { k: 'estadio', label: 'Estádio' },
  { k: 'aura', label: 'Aura', premium: true }, // glow SELADO da vitrine como fundo do cromo
  { k: 'preto', label: 'Neutro' },
  { k: 'gradiente', label: 'Épico', premium: true }, // chave interna 'gradiente' (estado), label novo
  { k: 'golden', label: 'Golden', premium: true }, // 1º fundo PREMIUM (gated) — DEPOIS dos livres
  { k: 'royal', label: 'Royal', premium: true }, // par de luxo do Golden — chapa roxa da casa
];
// Background real de cada fundo (igual ao do PlayerCard) para os tiles.
const FUNDO_BG = {
  estadio: "url('/stadium_bg.png') center / cover no-repeat, #1b2433",
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

// Planos que destrancam os kits 'pro'. Qualquer outro (free, null, futuros) vê cadeado.
const PLANOS_COM_KITS = ['pro', 'elite'];

// Kits do card. Assets em bucket PÚBLICO 'kits' (app assets, não PII — o tijolo 1C
// privatizou avatars e partia estas thumbnails). dark-gold e dark-purple ativos/livres.
const KIT_IMG = {
  'dark-gold': 'https://ynzmjcvqdljffgbeqglh.supabase.co/storage/v1/object/public/kits/kit1-dark-gold.png',
  'dark-purple': 'https://ynzmjcvqdljffgbeqglh.supabase.co/storage/v1/object/public/kits/kit2-dark-purple.png',
};
// Só os kits REAIS (geráveis). White Gold e Elite Gold saíram do seletor — eram
// promessas (breve/locked), não se vende o que não existe. Ver SPEC-REDE-SOCIAL
// (features futuras: kits White/Elite + figurinha animada, sem data).
const KITS_FIGURINHA = [
  { id: 'dark-gold', nome: 'Dark Gold', base: '#0d0d12', acento: '#d4a017', estado: 'ativo' },
  { id: 'dark-purple', nome: 'Dark Purple', base: '#0d0d12', acento: '#8b5cf6', estado: 'ativo' },
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

// Baixa um blob como ficheiro.
function baixarBlob(blob, nomeFicheiro) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.download = nomeFicheiro;
  a.href = url;
  a.click();
  URL.revokeObjectURL(url);
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

export default function Figurinha() {
  const navigate = useNavigate();

  const [me, setMe] = useState(null);
  const [fundo, setFundo] = useState('estadio');
  const corFrame = 'dourado';
  const [fotoLocal, setFotoLocal] = useState(null);
  const [uploadFoto, setUploadFoto] = useState(false);
  const [gerandoIA, setGerandoIA] = useState(false);
  const [limiteIA, setLimiteIA] = useState(false);
  const [erroIA, setErroIA] = useState(false); // falha da geração (≠ 403) → estado de erro no overlay
  const [erroIAmsg, setErroIAmsg] = useState(''); // mensagem específica (ex.: foto inválida); vazio = texto genérico
  const [modalFoto, setModalFoto] = useState(false); // modal "A tua foto" (foto actual + estado IA + carregar nova)
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

  const jogador = me?.user || {};
  const stats = me?.stats || {};
  // GRUPO B 6a — `equipa` existia só para alimentar o PlayerCard, que saiu daqui.
  const frameHex = getFrameColor(corFrame).stroke;
  // Regra única: a foto CRUA nunca entra no card. Só entra o avatar quando é
  // um avatar IA confirmado (foto_url e avatar_url existem e são diferentes —
  // logo após o upload o backend grava a foto crua em ambos, então é igual).
  const fotoOriginal = me?.user?.foto_url || null;
  const avatarEhIA = !!fotoOriginal && !!me?.user?.avatar_url && fotoOriginal !== me.user.avatar_url;
  // Jogador "de card": só leva avatar_url se for avatar IA; caso contrário, sem avatar.
  const jogadorCard = avatarEhIA ? jogador : { ...jogador, avatar_url: null };
  // A2 — kit vestido + kits já gerados (slots). Vindos do GET /api/me.
  const kitAtivo = me?.user?.kit_ativo || 'dark-gold';
  const slotsKits = me?.slots || [];
  // (l) Dias até a quota renovar. O backend zera a contagem quando o MÊS muda
  // (avatar_ia_reset < início do mês corrente) → a renovação é o dia 1 do mês seguinte.
  // O cálculo de datas é impuro (Date), por isso corre UMA vez no initializer do
  // useState, não no corpo do render. A contagem só aparece se o /api/me trouxer
  // avatar_ia_reset; senão omite-se.
  const [diasAteRenovar] = useState(() =>
    Math.max(1, Math.ceil((Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth() + 1, 1) - Date.now()) / 86400000)),
  );
  const diasParaRenovar = me?.user?.avatar_ia_reset ? diasAteRenovar : null;
  // SELOS DE HONRA (Vaga 11C): busca os selos do utilizador; mostra no cromo os 2
  // de maior prioridade que NÃO estejam ocultos (olhinho, persistido). Vêm já
  // ordenados por prioridade (campeonato > ranking) do backend.
  const [selos, setSelos] = useState([]);
  const [selosOcultos, setSelosOcultos] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem('futty_selos_ocultos') || '[]')); } catch { return new Set(); }
  });
  useEffect(() => {
    let ativo = true;
    apiFetch('/api/me/selos').then((d) => { if (ativo) setSelos(d.selos || []); }).catch(() => {});
    return () => { ativo = false; };
  }, []);
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
  const opts = { jogador: jogadorCard, stats, fundo, corFrame, avatarZoom, selos: selosVisiveis.map((s) => ({ tier: s.tier, label: s.label })) };

  // Carrega o perfil e pré-selecciona as escolhas guardadas.
  useEffect(() => {
    let ativo = true;
    apiFetch('/api/me')
      .then((d) => {
        if (!ativo) return;
        setMe(d);
        if (d?.user?.fundo_figurinha) setFundo(d.user.fundo_figurinha);
        // Decisão da estreia (só quando ainda não foi vista): sem avatar → flow.
        if (!localStorage.getItem('futty_figurinha_estreia')) {
          setEstreiaFase(d?.user?.avatar_url ? 'fim' : 'foto');
        }
      })
      .catch((e) => ativo && setErro(e.message));
    return () => {
      ativo = false;
    };
  }, []);

  // Liberta o objectURL da foto local (ao trocar/desmontar).
  useEffect(() => {
    if (!fotoLocal) return undefined;
    return () => URL.revokeObjectURL(fotoLocal);
  }, [fotoLocal]);

  // Confetti ao chegar ao momento épico (estado C da estreia).
  useEffect(() => {
    if (estreiaFase === 'pronto') celebrarCromoPronto();
  }, [estreiaFase]);

  useEffect(() => {
    let vivo = true;
    const trocar = (setter) => (blob) => setter((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return blob ? URL.createObjectURL(blob) : null;
    });
    const gerar = async () => {
      if (!jogador) return;
      try {
        if (estreiaFase === 'fim') {
          // Studio: duas camadas (partículas entre fundo e jogador).
          const { fundoBlob, jogadorBlob, placaBlob } = await gerarCamadasFigurinha(opts);
          if (!vivo) return;
          trocar(setFundoUrl)(fundoBlob);
          trocar(setJogadorUrl)(jogadorBlob);
          trocar(setPlacaUrl)(placaBlob);
        } else {
          // Estreia: imagem composta única.
          const blob = await gerarFigurinhaCanvas(opts);
          if (!vivo) return;
          trocar(setPreviewUrl)(blob);
        }
      } catch (e) {
        console.error('[preview]', e);
      }
    };
    gerar();
    return () => { vivo = false; };
    // selosKey: regenera o cromo quando os selos visíveis mudam (chegam da API ou
    // o utilizador oculta/mostra no olhinho).
  }, [fundo, avatarZoom, avatarEhIA, jogador?.avatar_url, estreiaFase, selosKey]);

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
    setGerandoIA(true);
    setErro('');
    setLimiteIA(false);
    try {
      const data = await apiFetch('/api/me/avatar/ai', { method: 'POST', body: JSON.stringify({ kit: 'dark-gold' }) });
      setMe((m) => (m ? { ...m, user: { ...m.user, avatar_url: data.avatar_url } } : m));
      setFotoLocal(null);
    } catch (err) {
      if (err?.status === 403) setLimiteIA(true);
      else setErro(err?.message || 'Não foi possível gerar o avatar IA.');
    } finally {
      setGerandoIA(false);
      setEstreiaFase('pronto'); // mostra o cromo (com avatar IA ou a foto)
    }
  }

  // Trocar foto: preview local imediato + upload para o servidor.
  // Na estreia, dispara automaticamente a geração do avatar IA.
  // Núcleo do upload, reutilizado pelo "tentar de novo" (P1-5). `emEstreia` decide
  // se dispara a geração IA automática a seguir.
  async function subirFoto(file, emEstreia) {
    setFotoLocal(URL.createObjectURL(file)); // preview imediato
    if (emEstreia) setEstreiaFase('gerando');
    setUploadFoto(true);
    setErro('');
    setUploadErro(null);
    try {
      const data = await apiUpload('/api/me/avatar', file, 'avatar');
      // foto_url = a nova foto (fonte da próxima geração). avatar_url = o que o card
      // mostra: o backend PRESERVA o avatar IA antigo se existir (senão espelha a foto),
      // por isso o card mantém o avatar antigo até o utilizador gerar de novo.
      setMe((m) => (m ? { ...m, user: { ...m.user, foto_url: data.foto_url ?? data.avatar_url, avatar_url: data.avatar_url } } : m));
      setUploadFoto(false);
      ultimoFicheiro.current = null;
      if (emEstreia) await gerarAvatarIAEstreia(); // auto-trigger
    } catch (err) {
      // P1-5 — mensagem accionável (rede/tamanho/formato) + retry inline, não um erro cru.
      setUploadErro(mensagemUploadFoto(err));
      setUploadFoto(false);
      if (emEstreia) setEstreiaFase('foto'); // volta ao estado A
    }
  }

  async function onPickFile(e) {
    const file = e.target.files?.[0];
    e.target.value = ''; // permite re-seleccionar o mesmo ficheiro
    if (!file) return;
    setModalFoto(false); // fecha o modal "A tua foto" ao escolher — revela o fluxo upload→gerar
    ultimoFicheiro.current = file;
    await subirFoto(file, estreiaFase === 'foto');
  }

  // "Tentar de novo" (P1-5): repete o upload com a MESMA foto, sem re-seleccionar.
  function repetirUpload() {
    if (ultimoFicheiro.current) subirFoto(ultimoFicheiro.current, estreiaFase === 'foto');
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
  async function partilharCromo() {
    celebrarPartilha(frameHex);
    try {
      const blob = await gerarFigurinhaCanvas(opts);
      const file = blob ? new File([blob], ficheiroNome(nomeJogador(jogador)), { type: 'image/png' }) : null;
      const payload = { title: 'Meu card Futty', text: 'Veja meu cartão de jogador no Futty ⚽' };
      if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ ...payload, files: [file] });
      } else if (navigator.share) {
        await navigator.share(payload);
      } else if (blob) {
        baixarBlob(blob, file.name);
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
    setGerandoIA(true);
    setErro('');
    setLimiteIA(false);
    setErroIA(false);
    setErroIAmsg('');
    try {
      const data = await apiFetch('/api/me/avatar/ai', { method: 'POST', body: JSON.stringify({ kit }) });
      // Guarda o avatar, o kit vestido e regista o slot novo (sem duplicar).
      setMe((m) => (m ? {
        ...m,
        user: { ...m.user, avatar_url: data.avatar_url, kit_ativo: data.kit },
        slots: [...new Set([...(m.slots || []), data.kit])],
      } : m));
      setFotoLocal(null); // limpa o preview local → mostra o avatar IA (avatar_url)
    } catch (err) {
      if (err?.status === 403) setLimiteIA(true); // limite de gerações do plano → card de quota
      else {
        // FOTO_INVALIDA: causa acionável (a foto guardada não pôde ser processada) —
        // mensagem digna em vez do genérico "não deu desta vez". Resto (fal fora do
        // ar, etc.) mantém o genérico com retry, que já cobre bem o transitório.
        if (err?.code === 'FOTO_INVALIDA') setErroIAmsg(err.message);
        setErroIA(true); // qualquer falha → estado de erro com retry no overlay
      }
    } finally {
      setGerandoIA(false);
    }
  }

  // A2 — toque num kit da grelha. Três caminhos: trancado por plano → /planos;
  // já gerado (slot) → VESTE via PUT (não gasta quota); sem slot → confirma e gera.
  async function escolherKit(kit) {
    if (kit.estado === 'breve' || kit.id === kitAtivo || gerandoIA) return;
    // O cadeado segue a REGRA DE PLANO pura, sem excepção para is_super_admin: a conta
    // de teste é super-admin, e queremos que o UI mostre exactamente o que um free vê.
    // O backend continua a isentar o super-admin — gerar via API mantém-se possível.
    const planoUser = me?.user?.plan || 'free';
    if (kit.estado === 'pro' && !PLANOS_COM_KITS.includes(planoUser)) return navigate('/planos');
    if (slotsKits.includes(kit.id)) {
      try {
        const data = await apiFetch('/api/me/kit', { method: 'PUT', body: JSON.stringify({ kit: kit.id }) });
        setMe((m) => (m ? { ...m, user: { ...m.user, avatar_url: data.avatar_url, kit_ativo: data.kit } } : m));
      } catch {
        setErroIA(true);
      }
      return;
    }
    // Sem slot → gastar 1 geração é irreversível: pede confirmação primeiro.
    if (!window.confirm(`Gerar o kit ${kit.nome}? Usa 1 das suas gerações IA.`)) return;
    await gerarAvatarIA(kit.id);
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
    // GATE PREMIUM (mesmo padrão dos kits): fundo premium exige plano pago (ou super).
    // O backend é a verdade (barra o PATCH); aqui só encaminhamos para /planos.
    const def = FUNDOS.find((f) => f.k === k);
    const planoUser = me?.user?.plan || 'free';
    const ehSuper = !!me?.user?.is_super_admin;
    if (def?.premium && !ehSuper && !PLANOS_COM_KITS.includes(planoUser)) return navigate('/planos');
    setFundo(k);
    try {
      await apiFetch('/api/me', { method: 'PATCH', body: JSON.stringify({ fundo_figurinha: k }) });
      setMe((m) => (m ? { ...m, user: { ...m.user, fundo_figurinha: k } } : m));
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
      baixarBlob(blob, ficheiroNome(nomeJogador(jogador)));
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
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: 'Minha figurinha Futty' });
      } else {
        baixarBlob(blob, file.name);
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
    <div style={{ position: 'absolute', inset: 0, zIndex: 8, clipPath: CLIP_OCTOGONO, background: 'rgba(5,8,16,0.75)', backdropFilter: 'blur(6px)', display: 'grid', placeItems: 'center' }}>
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
                <h2 style={{ fontFamily: "'Rajdhani', sans-serif", fontWeight: 800, fontSize: 20, color: '#fff', margin: 0 }}>Gerando seu avatar Panini… <EstrelaIA size={14} color="#fff" /></h2>
                <p style={{ fontSize: 13, color: 'var(--label-color)', margin: 0 }}>Pode demorar até 30 segundos</p>
              </>
            ) : (
              <>
                <h2 style={{ fontFamily: "'Rajdhani', sans-serif", fontWeight: 800, fontSize: 24, color: '#fff', margin: 0 }}>Seu card está pronto!</h2>
                {limiteIA ? (
                  <p style={{ fontSize: 12, color: 'var(--label-color)', margin: 0 }}>Limite de gerações IA atingido — mostramos o card com sua foto.</p>
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
                    {fundo === 'estadio' || fundo === 'gradiente' ? (
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
            {/* (m) EMPTY STATE — sem avatar válido: silhueta tracejada dourada sobre o
                fundo escolhido. Não bloqueia cliques (pointerEvents none). */}
            {!avatarEhIA && !fotoLocal && !gerandoIA && !erroIA ? (
              <div style={{ position: 'absolute', inset: 0, zIndex: 6, clipPath: CLIP_OCTOGONO, display: 'grid', placeItems: 'center', pointerEvents: 'none' }}>
                <div style={{ display: 'grid', justifyItems: 'center', gap: 12 }}>
                  {/* LEI DA SILHUETA: placeholder de pessoa = silhueta-casa angulosa (nunca círculo). */}
                  <SilhuetaJogador size={86} color="rgba(212,160,23,0.5)" />
                  <span style={{ fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(212,160,23,0.75)' }}>
                    O teu cromo espera por ti
                  </span>
                </div>
              </div>
            ) : null}
            {gerandoIA || erroIA ? overlayGerando : null}
          </div>
        </div>

        {/* (Faixa "Avatar IA ativo · Ver foto" removida na FASE 3.21 — a informação
            passou toda para o modal "A tua foto", aberto pelo botão Trocar foto.) */}

        {/* Foto subida mas ainda sem avatar IA gerado (a foto não entra no card). */}
        {fotoLocal ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center', padding: '4px 0', marginBottom: 10, fontSize: 11, color: '#d4a017' }}>
            <Check size={14} /> Foto carregada — gere seu avatar
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
              {jogador.avatar_url ? (
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
                      <EstrelaIA size={16} color="#ffffff" /> Gerar Avatar IA
                    </>
                  )}
                </button>
              ) : (
                <div style={{ flex: 1, fontSize: 12, color: 'var(--label-color)', textAlign: 'center', alignSelf: 'center' }}>
                  Adicione uma foto para gerar o avatar IA
                </div>
              )}
            </div>
            {gerandoIA ? (
              <span style={{ fontSize: 11, color: 'var(--label-color)', textAlign: 'center' }}>Pode demorar até 30 segundos</span>
            ) : null}
          </div>

          {/* (l) QUOTA (403) — card da família HUD, não um banner de erro. */}
          {limiteIA ? (
            <div className="hud-corners" style={{ position: 'relative', background: 'linear-gradient(180deg, #14121c, #0b0a12)', border: '1px solid rgba(212,160,23,0.35)', padding: '14px 16px', display: 'grid', gap: 8, justifyItems: 'center', textAlign: 'center' }}>
              <span aria-hidden="true" style={{ position: 'absolute', top: 8, right: 10, width: 7, height: 7, borderRadius: 1, transform: 'rotate(45deg)', background: 'linear-gradient(135deg, #f5e070, #d4a017)' }} />
              <span style={{ fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, fontSize: 15, letterSpacing: '0.04em', color: '#fff' }}>Você atingiu o limite deste mês</span>
              {diasParaRenovar != null ? (
                <span style={{ fontSize: 12, color: 'var(--label-color)' }}>Renova em {diasParaRenovar} {diasParaRenovar === 1 ? 'dia' : 'dias'}</span>
              ) : null}
              <Link to="/planos" className="btn btn--purple hud-corners" style={{ marginTop: 4, height: 38, paddingLeft: 18, paddingRight: 18, fontSize: 13, display: 'inline-flex', alignItems: 'center', textDecoration: 'none' }}>
                Ver planos
              </Link>
            </div>
          ) : null}

          {/* Tab strip */}
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
            <div style={{ display: 'flex', flexWrap: 'nowrap', overflowX: 'auto', gap: 10, padding: '2px 6px 8px', margin: '0 auto', maxWidth: '100%', scrollSnapType: 'x proximity', WebkitOverflowScrolling: 'touch' }}>
              {FUNDOS.map((f) => {
                const sel = fundo === f.k;
                // Cadeado premium (mesma regra dos kits): fundo premium + plano não pago.
                // `!sel` — LEI DA REGRA JUSTA: quem já está equipado neste fundo (ficou de
                // antes do gate) não vê cadeado no que já é seu; o cadeado é só para quem
                // tentaria EQUIPAR agora. O gate real (escolherFundo) não muda: ao trocar
                // pra outro fundo e tentar voltar, sel vira false e o cadeado aparece.
                const planoUser = me?.user?.plan || 'free';
                const bloqueado = f.premium && !sel && !me?.user?.is_super_admin && !PLANOS_COM_KITS.includes(planoUser);
                return (
                  <button
                    key={f.k}
                    type="button"
                    onClick={() => escolherFundo(f.k)}
                    aria-pressed={sel}
                    style={{
                      flex: '0 0 76px',
                      scrollSnapAlign: 'center',
                      display: 'grid',
                      gap: 4,
                      padding: 0,
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      textAlign: 'center',
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
                      {/* Cadeado + PRO no fundo premium para quem não assina (o desejo vende). */}
                      {bloqueado ? (
                        <>
                          <span style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', color: '#fff', background: 'rgba(0,0,0,0.34)' }}>
                            <Lock size={14} />
                          </span>
                          <span style={{ position: 'absolute', top: 3, right: 3, padding: '1px 4px', borderRadius: 5, background: '#d4a017', color: '#0d0d12', fontFamily: "'Rajdhani', sans-serif", fontSize: 8, fontWeight: 800, letterSpacing: '0.05em' }}>
                            PRO
                          </span>
                        </>
                      ) : null}
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
            // Container a 85% → tiles ~15% mais pequenos, 4 numa linha centrada.
            <div style={{ display: 'flex', justifyContent: 'center', gap: 8, width: '85%', margin: '0 auto' }}>
              {KITS_FIGURINHA.map((kit) => {
                // A2 — estados reais: VESTIDO (kit_ativo) | GERADO (tem slot, 1 toque veste)
                // | GERÁVEL (activo sem slot → custa 1 geração) | BREVE | trancado por plano.
                const vestido = kit.id === kitAtivo;
                const gerado = slotsKits.includes(kit.id);
                const planoUser = me?.user?.plan || 'free';
                // Cadeado pela regra de plano pura — ver nota em escolherKit().
                const pro = kit.estado === 'pro' && !PLANOS_COM_KITS.includes(planoUser);
                const breve = kit.estado === 'breve';
                const geravel = !breve && !pro && !gerado;
                const bloqueado = breve || pro;
                return (
                  <button
                    key={kit.id}
                    type="button"
                    onClick={() => escolherKit(kit)}
                    aria-label={kit.nome}
                    aria-pressed={vestido}
                    disabled={breve || gerandoIA}
                    style={{
                      flex: '0 0 calc((100% - 24px) / 4)',
                      display: 'grid',
                      gap: 4,
                      padding: 0,
                      background: 'transparent',
                      border: 'none',
                      cursor: breve ? 'default' : 'pointer',
                      textAlign: 'center',
                    }}
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
                      {pro ? (
                        <span style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', color: '#fff' }}>
                          <Lock size={14} />
                        </span>
                      ) : null}
                      {/* Badges de estado */}
                      {kit.estado === 'breve' ? (
                        <span style={{ position: 'absolute', top: 3, left: '50%', transform: 'translateX(-50%)', padding: '1px 4px', borderRadius: 5, background: 'rgba(0,0,0,0.75)', color: '#fff', fontFamily: "'Rajdhani', sans-serif", fontSize: 8, fontWeight: 700, letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>
                          EM BREVE
                        </span>
                      ) : null}
                      {pro ? (
                        <span style={{ position: 'absolute', top: 3, right: 3, padding: '1px 4px', borderRadius: 5, background: '#d4a017', color: '#0d0d12', fontFamily: "'Rajdhani', sans-serif", fontSize: 8, fontWeight: 800, letterSpacing: '0.05em' }}>
                          PRO
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
              botões do topo (40px) → hierarquia: topo = configurar, fundo = agir. */}
          <div style={{ display: 'flex', gap: 12 }}>
            {/* Baixar RECUA: borda roxa mais fraca + texto a 85% → secundário mas presente. */}
            <button type="button" className="btn btn--purple-outline hud-corners" style={{ flex: 1, height: 46, borderWidth: '1.5px', borderColor: 'rgba(139,92,246,0.5)', color: 'rgba(255,255,255,0.85)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }} disabled={busy} onClick={baixar}>
              <Download size={16} /> {busy ? 'Gerando…' : 'Baixar'}
            </button>
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
                <Share2 size={16} /> Compartilhar
              </button>
            </div>
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
        </div>
      </main>

      {/* Modal "A tua foto" — foto actual + estado do avatar IA + carregar nova */}
      {modalFoto ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Sua foto"
          onClick={() => setModalFoto(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
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

            {/* Preview da foto actual (cantos 45° coerentes com o sistema visual) */}
            {fotoOriginal ? (
              // contain + fundo escuro sólido → mostra a pessoa INTEIRA, sem cortar topo/base.
              /* FASE 3.35 — moldura ADAPTATIVA: sem height fixa, o container cresce com
                 a foto (o maxHeight trava as muito altas). As barras que sobrem em
                 #0d0d12 lêem como moldura intencional, não como corte. */
              <div className="hud-corners" style={{ width: '100%', background: '#0d0d12' }}>
                <img
                  src={urlAsset(fotoOriginal)}
                  alt="Sua foto"
                  style={{ width: 'auto', height: 'auto', maxWidth: '100%', maxHeight: '46vh', objectFit: 'contain', display: 'block', margin: '0 auto' }}
                />
              </div>
            ) : (
              <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--label-color)', fontSize: 13 }}>Você ainda não tem foto.</div>
            )}

            {/* Estado do avatar IA (reaproveita avatarEhIA) */}
            <div style={{ marginTop: 14 }}>
              {avatarEhIA ? (
                /* (j) Badge com glow dourado suave — mesma família dos dots. */
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 10, background: 'linear-gradient(90deg, rgba(139,92,246,0.18), rgba(212,160,23,0.12))', border: '1px solid rgba(139,92,246,0.4)', boxShadow: '0 0 12px rgba(212,160,23,0.22)' }}>
                  <img
                    src={urlAsset(me?.user?.avatar_url)}
                    alt="Avatar IA"
                    style={{ width: 48, height: 48, borderRadius: 8, objectFit: 'contain', border: '1px solid rgba(212,160,23,0.5)', flex: 'none', background: '#0d0d12' }}
                  />
                  <div style={{ display: 'grid', gap: 3 }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: '#d4a017' }}>
                      <EstrelaIA size={14} color="#d4a017" /> Avatar IA ativo
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--label-color)' }}>Gerado a partir desta foto</span>
                  </div>
                </div>
              ) : (
                <p style={{ margin: 0, textAlign: 'center', fontSize: 12, color: 'var(--label-color)' }}>Você ainda não gerou seu avatar IA.</p>
              )}
            </div>

            {/* Carregar nova foto — dispara o input file real (fecha o modal em onPickFile) */}
            <button
              type="button"
              className="btn btn--purple"
              style={{ width: '100%', height: 46, marginTop: 16, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 14 }}
              disabled={uploadFoto || gerandoIA}
              onClick={() => fileRef.current?.click()}
            >
              <Camera size={16} /> Carregar nova foto
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
