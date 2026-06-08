// Futty v2.0 — Figurinha (/figurinha): "card studio". Card 2:3 grande no topo,
// câmara para trocar a foto (preview local, sem backend) e controlos compactos
// que cabem num ecrã (iPhone 14/15) sem scroll. Tudo no cliente (canvas).
import { useEffect, useRef, useState } from 'react';
import { Landmark, Layers, Circle, Camera, Download, Share2 } from 'lucide-react';
import { apiFetch } from '../lib/api';
import { useTeams } from '../hooks/useTeam';
import { nomeJogador } from '../utils/avatar';
import { getFrameColor } from '../utils/frameColors';
import { gerarFigurinhaCanvas, gerarFigurinhaCanvasStory } from '../utils/figurinhaCanvas';
import PlayerCard from '../components/PlayerCard';
import Topbar from '../components/Topbar';
import '../styles/app.css';

// Chaves nomeadas (iguais às guardadas em users.cor_frame / fundo_figurinha).
const FRAMES = ['dourado', 'roxo', 'roxo_escuro', 'prata', 'vermelho', 'verde', 'azul', 'cinza'];
const FUNDOS = [
  { k: 'estadio', label: 'Estádio', Icon: Landmark },
  { k: 'gradiente', label: 'Gradiente', Icon: Layers },
  { k: 'preto', label: 'Neutro', Icon: Circle },
];
// Cores de uniforme (camisola) — overlay suave sobre o avatar.
const UNIFORMES = [
  { k: 'verde', hex: '#16a34a' },
  { k: 'azul', hex: '#2563eb' },
  { k: 'vermelho', hex: '#dc2626' },
  { k: 'branco', hex: '#f1f5f9' },
  { k: 'preto', hex: '#0f172a' },
  { k: 'amarelo', hex: '#ca8a04' },
];

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

// Rótulo curto e leve à esquerda de cada linha de controlo.
function Lbl({ children }) {
  return (
    <span style={{ width: 52, flexShrink: 0, fontFamily: "'Rajdhani', sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: '1px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>
      {children}
    </span>
  );
}

// Cantos em L (snakeGlow) para o swatch de frame seleccionado.
const CANTOS_FRAME = [
  { top: -2, left: -2, borderTop: '2px solid', borderLeft: '2px solid' },
  { top: -2, right: -2, borderTop: '2px solid', borderRight: '2px solid' },
  { bottom: -2, right: -2, borderBottom: '2px solid', borderRight: '2px solid' },
  { bottom: -2, left: -2, borderBottom: '2px solid', borderLeft: '2px solid' },
];

// Baixa um blob como ficheiro.
function baixarBlob(blob, nomeFicheiro) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.download = nomeFicheiro;
  a.href = url;
  a.click();
  URL.revokeObjectURL(url);
}

export default function Figurinha() {
  const { teams } = useTeams();

  const [me, setMe] = useState(null);
  const [fundo, setFundo] = useState('estadio');
  const [corFrame, setCorFrame] = useState('dourado');
  const [corUniforme, setCorUniforme] = useState(UNIFORMES[0].hex);
  const [mostrarStats, setMostrarStats] = useState(true);
  const [mostrarNome, setMostrarNome] = useState(true);
  const [fotoLocal, setFotoLocal] = useState(null);
  const [busy, setBusy] = useState(false);
  const [erro, setErro] = useState('');
  const fileRef = useRef(null);

  const jogador = me?.user || {};
  const stats = me?.stats || {};
  const equipa = teams[0] || null;
  const opts = { jogador, stats, fundo, corFrame, corUniforme, fotoOverride: fotoLocal, mostrarStats, mostrarNome };

  // Carrega o perfil e pré-selecciona as escolhas guardadas.
  useEffect(() => {
    let ativo = true;
    apiFetch('/api/me')
      .then((d) => {
        if (!ativo) return;
        setMe(d);
        if (d?.user?.fundo_figurinha) setFundo(d.user.fundo_figurinha);
        if (d?.user?.cor_frame) setCorFrame(d.user.cor_frame);
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

  // Trocar foto: preview local, sem upload nem API.
  function onPickFile(e) {
    const file = e.target.files?.[0];
    if (file) setFotoLocal(URL.createObjectURL(file));
    e.target.value = ''; // permite re-seleccionar o mesmo ficheiro
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

  async function baixarStory() {
    if (busy) return;
    setBusy(true);
    setErro('');
    try {
      const blob = await gerarFigurinhaCanvasStory(opts);
      if (!blob) {
        setErro('Não foi possível gerar a imagem.');
        return;
      }
      baixarBlob(blob, ficheiroNome(nomeJogador(jogador), '-story'));
    } catch (e) {
      setErro(e?.message || 'Erro ao gerar.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="app-shell">
      <Topbar title="Figurinha" />
      <main className="app-main" style={{ paddingLeft: 16, paddingRight: 16 }}>
        {/* 1. ZONA DO CARD (2:3, limitado à altura disponível) */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0' }}>
          <div style={{ position: 'relative', width: 'min(80vw, calc((100dvh - 400px) * 2 / 3))', aspectRatio: '2 / 3' }}>
            <PlayerCard {...opts} equipa={equipa} cantos={false} aspect="2 / 3" glowSuave />


            {/* Câmara — trocar foto (canto inferior-direito) */}
            <button
              type="button"
              aria-label="Trocar foto"
              onClick={() => fileRef.current?.click()}
              style={{ position: 'absolute', right: 8, bottom: 8, zIndex: 10, width: 38, height: 38, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.25)', background: 'rgba(0,0,0,0.55)', color: '#fff', display: 'grid', placeItems: 'center', cursor: 'pointer', backdropFilter: 'blur(4px)' }}
            >
              <Camera size={16} />
            </button>
          </div>
        </div>

        <input ref={fileRef} type="file" accept="image/*" hidden onChange={onPickFile} />

        {/* 2. CONTROLOS compactos (uma linha por secção) */}
        <div style={{ maxWidth: 460, margin: '0 auto', display: 'grid', gap: 8 }}>
          {/* FUNDO */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Lbl>Fundo</Lbl>
            <div style={{ display: 'flex', gap: 8, flex: 1 }}>
              {FUNDOS.map((f) => {
                const sel = fundo === f.k;
                return (
                  <button
                    key={f.k}
                    type="button"
                    onClick={() => setFundo(f.k)}
                    aria-pressed={sel}
                    style={{
                      flex: 1,
                      height: 38,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      border: `1px solid ${sel ? 'rgba(212,160,23,0.6)' : 'rgba(255,255,255,0.06)'}`,
                      borderRadius: 12,
                      background: sel ? 'rgba(212,160,23,0.08)' : 'rgba(255,255,255,0.03)',
                      color: sel ? '#d4a017' : 'rgba(255,255,255,0.6)',
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    <f.Icon size={15} />
                    {f.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* FRAME (8 cores, scroll horizontal) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Lbl>Frame</Lbl>
            <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 2, flex: 1 }}>
              {FRAMES.map((c) => {
                const sel = corFrame === c;
                const hex = getFrameColor(c).stroke;
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCorFrame(c)}
                    aria-label={`Frame ${c}`}
                    aria-pressed={sel}
                    style={{
                      position: 'relative',
                      flex: '0 0 auto',
                      width: 32,
                      height: 32,
                      borderRadius: 6,
                      cursor: 'pointer',
                      background: hex,
                      border: sel ? `2px solid ${hex}` : '2px solid rgba(255,255,255,0.2)',
                      opacity: sel ? 1 : 0.5,
                    }}
                  >
                    {sel
                      ? CANTOS_FRAME.map((ct, i) => (
                          <span key={i} aria-hidden style={{ position: 'absolute', width: 10, height: 10, pointerEvents: 'none', borderColor: hex, animation: `snakeGlow 2.6s ease-in-out ${i * 0.5}s infinite`, ...ct }} />
                        ))
                      : null}
                  </button>
                );
              })}
            </div>
          </div>

          {/* UNIFORME (6 cores) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Lbl>Uniforme</Lbl>
            <div style={{ display: 'flex', gap: 10, flex: 1 }}>
              {UNIFORMES.map((un) => {
                const sel = corUniforme === un.hex;
                return (
                  <button
                    key={un.k}
                    type="button"
                    onClick={() => setCorUniforme(un.hex)}
                    aria-label={`Uniforme ${un.k}`}
                    aria-pressed={sel}
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      cursor: 'pointer',
                      background: un.hex,
                      border: sel ? '2px solid #d4a017' : '2px solid rgba(255,255,255,0.2)',
                      boxShadow: sel ? '0 0 8px rgba(212,160,23,0.5)' : 'none',
                    }}
                  />
                );
              })}
            </div>
          </div>

          {/* DETALHES (2 toggles numa linha) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Lbl>Detalhes</Lbl>
            <div style={{ display: 'flex', gap: 8, flex: 1 }}>
              {[
                { on: mostrarNome, set: setMostrarNome, label: 'Nome' },
                { on: mostrarStats, set: setMostrarStats, label: 'Nota · J · G' },
              ].map((t) => (
                <button
                  key={t.label}
                  type="button"
                  onClick={() => t.set((v) => !v)}
                  aria-pressed={t.on}
                  style={{
                    flex: 1,
                    height: 38,
                    borderRadius: 12,
                    border: `1px solid ${t.on ? 'rgba(212,160,23,0.6)' : 'rgba(255,255,255,0.06)'}`,
                    background: t.on ? 'rgba(212,160,23,0.08)' : 'rgba(255,255,255,0.03)',
                    color: t.on ? '#d4a017' : 'rgba(255,255,255,0.5)',
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {erro ? <div className="alert alert--error" style={{ margin: 0 }}>{erro}</div> : null}

          {/* 3. AÇÕES */}
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" className="btn btn--purple-outline" style={{ flex: 1, height: 40, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }} disabled={busy} onClick={baixar}>
              <Download size={16} /> {busy ? 'A gerar…' : 'Baixar'}
            </button>
            <button type="button" className="btn btn--purple" style={{ flex: 1, height: 40, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }} disabled={busy} onClick={partilhar}>
              <Share2 size={16} /> Partilhar
            </button>
          </div>
          <button type="button" className="btn btn--purple-outline" style={{ width: '100%', height: 40, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }} disabled={busy} onClick={baixarStory}>
            <Share2 size={16} /> Story 9:16
          </button>
        </div>
      </main>
    </div>
  );
}
