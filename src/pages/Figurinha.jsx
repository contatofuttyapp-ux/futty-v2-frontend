// Futty v2.0 — Figurinha (/figurinha): "card studio". Card 2:3 com tilt 3D e
// entrada animada; opções em tabs (Fundo/Frame/Uniforme) + toggles compactos.
// Trocar foto é preview local (sem backend). Tudo no cliente (canvas).
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Camera, Download, Share2, Loader2, X, Lock, Check, Plus, Minus } from 'lucide-react';
import { apiFetch, apiUpload } from '../lib/api';
import { useTeams } from '../hooks/useTeam';
import { nomeJogador, urlAsset } from '../utils/avatar';
import { getFrameColor } from '../utils/frameColors';
import { gerarFigurinhaCanvas, gerarCamadasFigurinha, desenharFundoEpico } from '../utils/figurinhaCanvas';
import { celebrarPartilha, celebrarCromoPronto } from '../hooks/useConfetti';
import PlayerCard from '../components/PlayerCard';
import Topbar from '../components/Topbar';
import '../styles/app.css';

// Chaves nomeadas (iguais às guardadas em users.cor_frame / fundo_figurinha).
const FUNDOS = [
  { k: 'estadio', label: 'Estádio' },
  { k: 'gradiente', label: 'Épico' }, // chave interna 'gradiente' (estado), label novo
  { k: 'preto', label: 'Neutro' },
];
// Background real de cada fundo (igual ao do PlayerCard) para os tiles.
const FUNDO_BG = {
  estadio: "url('/stadium_bg.png') center / cover no-repeat, #1b2433",
  // 'gradiente' = Carta Épica. Chave interna mantida para não refactorizar estado.
  // Este valor é só o FALLBACK (base escura) até o render real do fundo ficar pronto
  // — o tile passa a mostrar o fundo verdadeiro em miniatura (ver `epicoTile`).
  gradiente: 'linear-gradient(180deg, #16161c 0%, #1d1d24 50%, #101014 100%)',
  preto: '#000000',
};
const TABS = [
  { k: 'fundo', label: 'Fundo' },
  { k: 'uniforme', label: 'Uniforme' },
];

// Kits do card. 'dark-gold' é o único vestido/seleccionável por agora; os
// restantes são placeholders (em breve) ou trancados por plano (pro).
const KIT_DARK_GOLD_IMG = 'https://ynzmjcvqdljffgbeqglh.supabase.co/storage/v1/object/public/avatars/Kits/kit1-dark-gold.png';
const KITS_FIGURINHA = [
  { id: 'dark-gold', nome: 'Dark Gold', base: '#0d0d12', acento: '#d4a017', estado: 'ativo' },
  { id: 'dark-purple', nome: 'Dark Purple', base: '#0d0d12', acento: '#8b5cf6', estado: 'breve' },
  { id: 'white-gold', nome: 'White Gold', base: '#f8f5f0', acento: '#d4a017', estado: 'breve' },
  { id: 'elite-gold', nome: 'Elite Gold', base: '#d4a017', acento: '#0d0d12', estado: 'pro' },
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
  const { teams } = useTeams();
  const navigate = useNavigate();

  const [me, setMe] = useState(null);
  const [fundo, setFundo] = useState('estadio');
  const corFrame = 'dourado';
  const [fotoLocal, setFotoLocal] = useState(null);
  const [uploadFoto, setUploadFoto] = useState(false);
  const [gerandoIA, setGerandoIA] = useState(false);
  const [limiteIA, setLimiteIA] = useState(false);
  const [modalFoto, setModalFoto] = useState(false); // modal "A tua foto" (foto actual + estado IA + carregar nova)
  const [activeTab, setActiveTab] = useState('fundo');
  const [busy, setBusy] = useState(false);
  const [erro, setErro] = useState('');
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
  const fileRef = useRef(null);

  const jogador = me?.user || {};
  const stats = me?.stats || {};
  const equipa = teams[0] || null;
  const frameHex = getFrameColor(corFrame).stroke;
  // Regra única: a foto CRUA nunca entra no card. Só entra o avatar quando é
  // um avatar IA confirmado (foto_url e avatar_url existem e são diferentes —
  // logo após o upload o backend grava a foto crua em ambos, então é igual).
  const fotoOriginal = me?.user?.foto_url || null;
  const avatarEhIA = !!fotoOriginal && !!me?.user?.avatar_url && fotoOriginal !== me.user.avatar_url;
  // Jogador "de card": só leva avatar_url se for avatar IA; caso contrário, sem avatar.
  const jogadorCard = avatarEhIA ? jogador : { ...jogador, avatar_url: null };
  const opts = { jogador: jogadorCard, stats, fundo, corFrame, avatarZoom };

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
  }, [fundo, avatarZoom, avatarEhIA, jogador?.avatar_url, estreiaFase]);

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
        await desenharFundoEpico(cv.getContext('2d'), 120, 120);
        if (vivo) setEpicoTile(cv.toDataURL('image/png'));
      } catch { /* fallback: fica o gradiente base do FUNDO_BG */ }
    })();
    return () => { vivo = false; };
  }, []);

  // Marca a estreia como concluída e passa ao studio normal.
  function concluirEstreia() {
    localStorage.setItem('futty_figurinha_estreia', '1');
    setEstreiaFase('fim');
  }

  // Trocar foto: preview local imediato + upload para o servidor.
  // Na estreia, dispara automaticamente a geração do avatar IA.
  async function onPickFile(e) {
    const file = e.target.files?.[0];
    e.target.value = ''; // permite re-seleccionar o mesmo ficheiro
    if (!file) return;
    setModalFoto(false); // fecha o modal "A tua foto" ao escolher — revela o fluxo upload→gerar
    const emEstreia = estreiaFase === 'foto';
    setFotoLocal(URL.createObjectURL(file)); // preview imediato
    if (emEstreia) setEstreiaFase('gerando');
    setUploadFoto(true);
    setErro('');
    try {
      const data = await apiUpload('/api/me/avatar', file, 'avatar');
      // foto_url = a nova foto (fonte da próxima geração). avatar_url = o que o card
      // mostra: o backend PRESERVA o avatar IA antigo se existir (senão espelha a foto),
      // por isso o card mantém o avatar antigo até o utilizador gerar de novo.
      setMe((m) => (m ? { ...m, user: { ...m.user, foto_url: data.foto_url ?? data.avatar_url, avatar_url: data.avatar_url } } : m));
      setUploadFoto(false);
      if (emEstreia) await gerarAvatarIAEstreia(); // auto-trigger
    } catch (err) {
      setErro(err?.message || 'Não foi possível enviar a foto.');
      setUploadFoto(false);
      if (emEstreia) setEstreiaFase('foto'); // volta ao estado A
    }
  }

  // Geração IA durante a estreia: ao concluir (ou falhar), revela o cromo.
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

  // Partilha do cromo no momento da estreia (imagem do card + texto viral).
  async function partilharCromo() {
    celebrarPartilha(frameHex);
    try {
      const blob = await gerarFigurinhaCanvas(opts);
      const file = blob ? new File([blob], ficheiroNome(nomeJogador(jogador)), { type: 'image/png' }) : null;
      const payload = { title: 'O meu cromo Futty', text: 'Vê o meu cartão de jogador no Futty ⚽' };
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
  async function gerarAvatarIA() {
    if (gerandoIA) return;
    setGerandoIA(true);
    setErro('');
    setLimiteIA(false);
    try {
      const data = await apiFetch('/api/me/avatar/ai', { method: 'POST', body: JSON.stringify({ kit: 'dark-gold' }) });
      setMe((m) => (m ? { ...m, user: { ...m.user, avatar_url: data.avatar_url } } : m));
      setFotoLocal(null); // limpa o preview local → mostra o avatar IA (avatar_url)
    } catch (err) {
      if (err?.status === 403) setLimiteIA(true); // limite de gerações do plano
      else setErro(err?.message || 'Não foi possível gerar o avatar IA.');
    } finally {
      setGerandoIA(false);
    }
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
    celebrarPartilha(frameHex); // confetti antes da partilha
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
        await navigator.share({ files: [file], title: 'A minha figurinha Futty' });
      } else {
        baixarBlob(blob, file.name);
      }
    } catch (e) {
      if (e?.name !== 'AbortError') setErro(e?.message || 'Não foi possível partilhar.');
    } finally {
      setBusy(false);
    }
  }

  // Overlay digno para o estado "a gerar" (sobre o card, tanto na estreia como
  // no studio). Logo Futty metálico a respirar + texto.
  const overlayGerando = (
    <div style={{ position: 'absolute', inset: 0, zIndex: 8, clipPath: CLIP_OCTOGONO, background: 'rgba(5,8,16,0.75)', backdropFilter: 'blur(6px)', display: 'grid', placeItems: 'center' }}>
      <div style={{ display: 'grid', justifyItems: 'center', gap: 10 }}>
        <img src="/futty-logo-metallic.png" alt="" className="fig-breathe" style={{ width: 64, height: 64, objectFit: 'contain' }} />
        <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>A criar o teu avatar…</span>
      </div>
    </div>
  );

  // Enquanto a fase de estreia não está decidida (perfil a carregar), espera.
  if (estreiaFase === null) {
    return (
      <div className="app-shell">
        <Topbar hud="FIGURINHA" />
        <main className="app-main" style={{ display: 'grid', placeItems: 'center', minHeight: '40vh' }}>
          <Loader2 size={28} className="spin" color="#8b5cf6" />
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
                : <PlayerCard {...opts} equipa={equipa} cantos={false} aspect="2 / 3" glowSuave posicao={jogador?.posicao || null} />
              }
              {estreiaFase === 'gerando' ? overlayGerando : null}
            </div>
          </div>

          <input ref={fileRef} type="file" accept="image/*" hidden onChange={onPickFile} />

          <div style={{ maxWidth: 420, margin: '0 auto', textAlign: 'center', display: 'grid', gap: 12 }}>
            {estreiaFase === 'foto' ? (
              <>
                <h2 style={{ fontFamily: "'Rajdhani', sans-serif", fontWeight: 800, fontSize: 22, color: '#fff', margin: 0 }}>O teu cromo está quase pronto <EstrelaIA size={14} color="#fff" /></h2>
                <p style={{ fontSize: 14, lineHeight: 1.5, color: 'rgba(255,255,255,0.8)', margin: 0 }}>Adiciona uma foto para personalizar o teu cartão de jogador</p>
                <button type="button" className="btn btn--purple" style={{ width: '100%', height: 48, fontSize: 15 }} onClick={() => fileRef.current?.click()}>📷 Adicionar foto</button>
                <button type="button" onClick={concluirEstreia} style={{ border: 'none', background: 'transparent', color: 'var(--label-color)', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Saltar por agora →</button>
              </>
            ) : estreiaFase === 'gerando' ? (
              <>
                <h2 style={{ fontFamily: "'Rajdhani', sans-serif", fontWeight: 800, fontSize: 20, color: '#fff', margin: 0 }}>Gerando o teu avatar Panini… <EstrelaIA size={14} color="#fff" /></h2>
                <p style={{ fontSize: 13, color: 'var(--label-color)', margin: 0 }}>Pode demorar até 30 segundos</p>
              </>
            ) : (
              <>
                <h2 style={{ fontFamily: "'Rajdhani', sans-serif", fontWeight: 800, fontSize: 24, color: '#fff', margin: 0 }}>O teu cromo está pronto! 🎉</h2>
                {limiteIA ? (
                  <p style={{ fontSize: 12, color: 'var(--label-color)', margin: 0 }}>Limite de gerações IA atingido — mostramos o cromo com a tua foto.</p>
                ) : null}
                <button type="button" className="btn btn--purple" style={{ width: '100%', height: 48, fontSize: 15, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }} onClick={partilharCromo}>
                  <Share2 size={18} /> Compartilhar agora
                </button>
                <button type="button" className="btn btn--purple-outline" style={{ width: '100%', height: 44 }} onClick={concluirEstreia}>🎨 Personalizar</button>
                <button type="button" onClick={concluirEstreia} style={{ border: 'none', background: 'transparent', color: 'var(--label-color)', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Saltar →</button>
              </>
            )}
            {erro ? <div className="alert alert--error" style={{ margin: 0 }}>{erro}</div> : null}
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
                  <PlayerCard {...opts} equipa={equipa} cantos={false} aspect="2 / 3" glowSuave posicao={jogador?.posicao || null} />
                )}

              {/* Zoom do avatar — controlo compacto à direita, abaixo do canto (só com avatar IA) */}
              {avatarEhIA && !fotoLocal ? (
                <div className="hud-corners-s" style={{ position: 'absolute', top: '30%', right: 8, zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, background: 'rgba(13,13,18,0.7)', backdropFilter: 'blur(4px)', padding: '5px 4px', border: '1px solid rgba(212,160,23,0.45)' }}>
                  <button
                    type="button"
                    aria-label="Aumentar zoom"
                    className="fig-zoom-btn"
                    onClick={() => setAvatarZoom((z) => Math.min(ZOOM_MAX, +(z + 0.11).toFixed(2)))}
                    disabled={avatarZoom >= ZOOM_MAX}
                  >
                    <Plus size={13} />
                  </button>
                  <button
                    type="button"
                    aria-label="Reduzir zoom"
                    className="fig-zoom-btn"
                    onClick={() => setAvatarZoom((z) => Math.max(ZOOM_MIN, +(z - 0.11).toFixed(2)))}
                    disabled={avatarZoom <= ZOOM_MIN}
                  >
                    <Minus size={13} />
                  </button>
                </div>
              ) : null}
              </div>
            </div>
            {/* Estado "a gerar" — cobre a zona do card */}
            {gerandoIA ? overlayGerando : null}
          </div>
        </div>

        {/* (Faixa "Avatar IA ativo · Ver foto" removida na FASE 3.21 — a informação
            passou toda para o modal "A tua foto", aberto pelo botão Trocar foto.) */}

        {/* Foto subida mas ainda sem avatar IA gerado (a foto não entra no card). */}
        {fotoLocal ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center', padding: '4px 0', marginBottom: 10, fontSize: 11, color: '#d4a017' }}>
            <Check size={14} /> Foto carregada — gera o teu avatar
          </div>
        ) : null}

        <input ref={fileRef} type="file" accept="image/*" hidden onChange={onPickFile} />

        {/* 2. CONTROLOS — tabs + painel + detalhes */}
        <div style={{ maxWidth: 460, margin: '0 auto', display: 'grid', gap: 14 }}>
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
                      <Loader2 size={16} className="spin" /> Gerando…
                    </>
                  ) : (
                    <>
                      <EstrelaIA size={16} color="#ffffff" /> Gerar Avatar IA
                    </>
                  )}
                </button>
              ) : (
                <div style={{ flex: 1, fontSize: 12, color: 'var(--label-color)', textAlign: 'center', alignSelf: 'center' }}>
                  Adiciona uma foto para gerar o avatar IA
                </div>
              )}
            </div>
            {gerandoIA ? (
              <span style={{ fontSize: 11, color: 'var(--label-color)', textAlign: 'center' }}>Pode demorar até 30 segundos</span>
            ) : null}
          </div>

          {limiteIA ? (
            <div className="alert alert--error" style={{ margin: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              Limite atingido. <Link to="/planos" style={{ color: '#fff', textDecoration: 'underline' }}>Ver planos →</Link>
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
            // Tiles do mesmo tamanho dos kits (¼ da largura); linha de 3 centrada.
            // Container a 85% → tiles ~15% mais pequenos, centrados.
            <div style={{ display: 'flex', justifyContent: 'center', gap: 8, width: '85%', margin: '0 auto' }}>
              {FUNDOS.map((f) => {
                const sel = fundo === f.k;
                return (
                  <button
                    key={f.k}
                    type="button"
                    onClick={() => setFundo(f.k)}
                    aria-pressed={sel}
                    style={{
                      flex: '0 0 calc((100% - 24px) / 4)',
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
                      width: '100%',
                      aspectRatio: '1 / 1',
                      // Épico: mostra o FUNDO REAL renderizado (fallback = base escura).
                      background: f.k === 'gradiente' && epicoTile ? `url(${epicoTile})` : FUNDO_BG[f.k],
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      border: sel ? '2px solid #d4a017' : '1px solid var(--border-subtle)',
                      filter: sel ? 'none' : 'saturate(0.7) brightness(0.85)',
                    }} />
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
                const ativo = kit.estado === 'ativo';
                const pro = kit.estado === 'pro';
                const bloqueado = kit.estado === 'breve' || pro;
                return (
                  <button
                    key={kit.id}
                    type="button"
                    onClick={pro ? () => navigate('/planos') : undefined}
                    aria-label={kit.nome}
                    aria-pressed={ativo}
                    disabled={kit.estado === 'breve'}
                    style={{
                      flex: '0 0 calc((100% - 24px) / 4)',
                      display: 'grid',
                      gap: 4,
                      padding: 0,
                      background: 'transparent',
                      border: 'none',
                      cursor: pro ? 'pointer' : 'default',
                      textAlign: 'center',
                    }}
                  >
                    {/* Thumbnail quadrado */}
                    <div className="hud-corners-s" style={{ position: 'relative', width: '100%', aspectRatio: '1 / 1', overflow: 'hidden', background: kit.id === 'dark-gold' ? '#0d0d12' : `linear-gradient(135deg, ${kit.base} 55%, ${kit.acento} 55%)`, opacity: bloqueado ? 0.45 : 1, border: ativo ? '2px solid #d4a017' : '1px solid var(--border-subtle)', filter: ativo ? 'none' : 'saturate(0.7) brightness(0.85)' }}>
                      {kit.id === 'dark-gold' ? (
                        <img src={KIT_DARK_GOLD_IMG} alt={kit.nome} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : null}
                      {ativo ? (
                        <span style={{ position: 'absolute', top: 3, right: 3, width: 15, height: 15, borderRadius: '50%', background: '#d4a017', color: '#0d0d12', display: 'grid', placeItems: 'center' }}>
                          <Check size={10} strokeWidth={3} />
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

          {erro ? <div className="alert alert--error" style={{ margin: 0 }}>{erro}</div> : null}

          {/* 3. AÇÕES — logo abaixo do painel de tiles. Mais altas (46px) que os
              botões do topo (40px) → hierarquia: topo = configurar, fundo = agir. */}
          <div style={{ display: 'flex', gap: 12 }}>
            <button type="button" className="btn btn--purple-outline hud-corners" style={{ flex: 1, height: 46, borderWidth: '1.5px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }} disabled={busy} onClick={baixar}>
              <Download size={16} /> {busy ? 'Gerando…' : 'Baixar'}
            </button>
            {/* Glow do Compartilhar: o clip-path corta box-shadows. O wrapper (SEM clip)
                carrega o glow via drop-shadow — que segue a forma RECORTADA do botão
                interior (um box-shadow no wrapper daria um glow rectangular à volta de
                um botão octogonal). O clip fica só no botão. */}
            <div style={{ flex: 1, display: 'flex', filter: `drop-shadow(0 4px 10px ${frameHex}55) drop-shadow(0 0 7px rgba(212,160,23,0.45))` }}>
              <button
                type="button"
                className="btn hud-corners"
                style={{ flex: 1, height: 46, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, border: 'none', color: '#fff', background: `linear-gradient(135deg, ${frameHex}ee, ${frameHex}99)` }}
                disabled={busy}
                onClick={partilhar}
              >
                <Share2 size={16} /> Compartilhar
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Modal "A tua foto" — foto actual + estado do avatar IA + carregar nova */}
      {modalFoto ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="A tua foto"
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

            <h3 style={{ margin: '0 0 16px', fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, fontSize: 20, letterSpacing: '0.04em', color: '#fff', textAlign: 'center' }}>A tua foto</h3>

            {/* Preview da foto actual (cantos 45° coerentes com o sistema visual) */}
            {fotoOriginal ? (
              // contain + fundo escuro sólido → mostra a pessoa INTEIRA, sem cortar topo/base.
              /* FASE 3.35 — moldura ADAPTATIVA: sem height fixa, o container cresce com
                 a foto (o maxHeight trava as muito altas). As barras que sobrem em
                 #0d0d12 lêem como moldura intencional, não como corte. */
              <div className="hud-corners" style={{ width: '100%', background: '#0d0d12' }}>
                <img
                  src={urlAsset(fotoOriginal)}
                  alt="A tua foto"
                  style={{ width: 'auto', height: 'auto', maxWidth: '100%', maxHeight: '46vh', objectFit: 'contain', display: 'block', margin: '0 auto' }}
                />
              </div>
            ) : (
              <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--label-color)', fontSize: 13 }}>Ainda não tens foto.</div>
            )}

            {/* Estado do avatar IA (reaproveita avatarEhIA) */}
            <div style={{ marginTop: 14 }}>
              {avatarEhIA ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 10, background: 'linear-gradient(90deg, rgba(139,92,246,0.18), rgba(212,160,23,0.12))', border: '1px solid rgba(139,92,246,0.4)' }}>
                  <img
                    src={urlAsset(me?.user?.avatar_url)}
                    alt="Avatar IA"
                    style={{ width: 48, height: 48, borderRadius: 8, objectFit: 'contain', border: '1px solid rgba(212,160,23,0.5)', flex: 'none', background: '#0d0d12' }}
                  />
                  <div style={{ display: 'grid', gap: 3 }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: '#d4a017' }}>
                      <EstrelaIA size={14} color="#d4a017" /> Avatar IA activo
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--label-color)' }}>Gerado a partir desta foto</span>
                  </div>
                </div>
              ) : (
                <p style={{ margin: 0, textAlign: 'center', fontSize: 12, color: 'var(--label-color)' }}>Ainda não geraste o teu avatar IA.</p>
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
