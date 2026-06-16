// Futty v2.0 — Figurinha (/figurinha): "card studio". Card 2:3 com tilt 3D e
// entrada animada; opções em tabs (Fundo/Frame/Uniforme) + toggles compactos.
// Trocar foto é preview local (sem backend). Tudo no cliente (canvas).
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Camera, Download, Share2, Loader2 } from 'lucide-react';
import { apiFetch, apiUpload } from '../lib/api';
import { useTeams } from '../hooks/useTeam';
import { nomeJogador } from '../utils/avatar';
import { getFrameColor } from '../utils/frameColors';
import { KITS, kitGradientCss } from '../utils/kits';
import { gerarFigurinhaCanvas, gerarFigurinhaCanvasStory } from '../utils/figurinhaCanvas';
import { celebrarPartilha } from '../hooks/useConfetti';
import PlayerCard from '../components/PlayerCard';
import Topbar from '../components/Topbar';
import '../styles/app.css';

// Chaves nomeadas (iguais às guardadas em users.cor_frame / fundo_figurinha).
const FRAMES = ['dourado', 'roxo', 'roxo_escuro', 'prata', 'vermelho', 'verde', 'azul', 'cinza'];
const FUNDOS = [
  { k: 'estadio', label: 'Estádio' },
  { k: 'gradiente', label: 'Gradiente' },
  { k: 'preto', label: 'Neutro' },
];
// Background real de cada fundo (igual ao do PlayerCard) para os tiles.
const FUNDO_BG = {
  estadio: "url('/stadium_bg.png') center / cover no-repeat, #1b2433",
  gradiente: 'radial-gradient(ellipse 90% 70% at 50% 45%, #0c3a26, #061410 55%, #000 100%)',
  preto: '#000000',
};
// Cores de uniforme (camisola) — overlay suave sobre o avatar.
const UNIFORMES = [
  { k: 'verde', hex: '#16a34a' },
  { k: 'azul', hex: '#2563eb' },
  { k: 'vermelho', hex: '#dc2626' },
  { k: 'branco', hex: '#f1f5f9' },
  { k: 'preto', hex: '#0f172a' },
  { k: 'amarelo', hex: '#ca8a04' },
];
const TABS = [
  { k: 'fundo', label: 'Fundo' },
  { k: 'frame', label: 'Frame' },
  { k: 'uniforme', label: 'Uniforme' },
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
  const [uploadFoto, setUploadFoto] = useState(false);
  const [gerandoIA, setGerandoIA] = useState(false);
  const [limiteIA, setLimiteIA] = useState(false);
  const [activeTab, setActiveTab] = useState('fundo');
  const [busy, setBusy] = useState(false);
  const [erro, setErro] = useState('');
  const fileRef = useRef(null);
  const cardRef = useRef(null);

  const jogador = me?.user || {};
  const stats = me?.stats || {};
  const equipa = teams[0] || null;
  const plano = me?.user?.plan || 'free';
  const frameHex = getFrameColor(corFrame).stroke;
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

  // Trocar foto: preview local imediato + upload para o servidor.
  async function onPickFile(e) {
    const file = e.target.files?.[0];
    e.target.value = ''; // permite re-seleccionar o mesmo ficheiro
    if (!file) return;
    setFotoLocal(URL.createObjectURL(file)); // preview imediato
    setUploadFoto(true);
    setErro('');
    try {
      const data = await apiUpload('/api/me/avatar', file, 'avatar');
      setMe((m) => (m ? { ...m, user: { ...m.user, avatar_url: data.avatar_url } } : m));
    } catch (err) {
      setErro(err?.message || 'Não foi possível enviar a foto.');
    } finally {
      setUploadFoto(false);
    }
  }

  // Gerar avatar com IA a partir da foto atual (endpoint usa users.avatar_url).
  async function gerarAvatarIA() {
    if (gerandoIA) return;
    setGerandoIA(true);
    setErro('');
    setLimiteIA(false);
    try {
      const data = await apiFetch('/api/me/avatar/ai', { method: 'POST' });
      setMe((m) => (m ? { ...m, user: { ...m.user, avatar_url: data.avatar_url } } : m));
      setFotoLocal(null); // limpa o preview local → mostra o avatar IA (avatar_url)
    } catch (err) {
      if (err?.status === 403) setLimiteIA(true); // limite de gerações do plano
      else setErro(err?.message || 'Não foi possível gerar o avatar IA.');
    } finally {
      setGerandoIA(false);
    }
  }

  // Tilt 3D — só em ponteiro fino (rato), não em toque.
  function onCardMove(e) {
    if (window.matchMedia('(pointer: coarse)').matches) return;
    const el = cardRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
    const y = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
    el.style.transition = 'none';
    el.style.transform = `perspective(900px) rotateX(${(-y * 10).toFixed(2)}deg) rotateY(${(x * 10).toFixed(2)}deg)`;
  }
  function onCardLeave() {
    const el = cardRef.current;
    if (!el) return;
    el.style.transition = 'transform 0.4s ease';
    el.style.transform = 'perspective(900px) rotateX(0deg) rotateY(0deg)';
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
        {/* 1. ZONA DO CARD (2:3, tilt 3D + entrada animada) */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0' }}>
          <div className="fig-card-enter" style={{ width: 'min(80vw, calc((100dvh - 400px) * 2 / 3))', aspectRatio: '2 / 3' }}>
            <div
              ref={cardRef}
              onMouseMove={onCardMove}
              onMouseLeave={onCardLeave}
              style={{ position: 'relative', width: '100%', height: '100%', willChange: 'transform' }}
            >
              <PlayerCard {...opts} equipa={equipa} cantos={false} aspect="2 / 3" glowSuave posicao={jogador?.posicao || null} />

              {/* Câmara — trocar foto (canto inferior-direito) */}
              <button
                type="button"
                aria-label="Trocar foto"
                onClick={() => fileRef.current?.click()}
                disabled={uploadFoto}
                style={{ position: 'absolute', right: 8, bottom: 8, zIndex: 10, width: 38, height: 38, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.25)', background: 'rgba(0,0,0,0.55)', color: '#fff', display: 'grid', placeItems: 'center', cursor: uploadFoto ? 'wait' : 'pointer', opacity: uploadFoto ? 0.6 : 1, backdropFilter: 'blur(4px)' }}
              >
                <Camera size={16} />
              </button>
            </div>
          </div>
        </div>

        <input ref={fileRef} type="file" accept="image/*" hidden onChange={onPickFile} />

        {/* 2. CONTROLOS — tabs + painel + detalhes */}
        <div style={{ maxWidth: 460, margin: '0 auto', display: 'grid', gap: 8 }}>
          {/* Gerar Avatar IA (precisa de uma foto guardada) */}
          {jogador.avatar_url ? (
            <div style={{ display: 'grid', gap: 4 }}>
              <button
                type="button"
                className="btn btn--purple"
                style={{ width: '100%', height: 40, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                disabled={gerandoIA || uploadFoto}
                onClick={gerarAvatarIA}
              >
                {gerandoIA ? (
                  <>
                    <Loader2 size={16} className="spin" /> A gerar…
                  </>
                ) : (
                  '✨ Gerar Avatar IA'
                )}
              </button>
              {gerandoIA ? (
                <span style={{ fontSize: 11, color: 'var(--label-color)', textAlign: 'center' }}>Pode demorar até 30 segundos</span>
              ) : null}
            </div>
          ) : (
            <div style={{ fontSize: 12, color: 'var(--label-color)', textAlign: 'center', padding: '6px 0' }}>
              Adiciona primeiro uma foto para gerar o avatar IA
            </div>
          )}

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
                  onClick={() => setActiveTab(t.k)}
                  aria-pressed={on}
                  style={{
                    flex: 1,
                    height: 36,
                    borderRadius: 'var(--radius-sm)',
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
            <div style={{ display: 'flex', gap: 8 }}>
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
                      height: 58,
                      position: 'relative',
                      overflow: 'hidden',
                      padding: 0,
                      borderRadius: 'var(--radius-md)',
                      cursor: 'pointer',
                      background: FUNDO_BG[f.k],
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      border: sel ? '2px solid #8b5cf6' : '1px solid var(--border-subtle)',
                      boxShadow: sel ? '0 0 12px rgba(139,92,246,0.6)' : 'none',
                    }}
                  >
                    <span style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: '3px 0', fontFamily: "'Rajdhani', sans-serif", fontSize: 11, fontWeight: 700, color: '#fff', textAlign: 'center', background: 'linear-gradient(transparent, rgba(0,0,0,0.75))' }}>
                      {f.label}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : activeTab === 'frame' ? (
            <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4 }}>
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
                      borderRadius: 'var(--radius-xs)',
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
          ) : (
            <div style={{ display: 'grid', gap: 8 }}>
              {/* Kits Futty (tiles) */}
              <div style={{ display: 'flex', gap: 8 }}>
                {KITS.map((kit) => {
                  const sel = corUniforme === kit.id;
                  // Elite desbloqueia para quem tem plano Elite.
                  const bloqueado = kit.id === 'kit-elite' ? plano !== 'elite' : kit.locked;
                  return (
                    <button
                      key={kit.id}
                      type="button"
                      onClick={() => (bloqueado ? setErro('Disponível no plano Elite.') : setCorUniforme(kit.id))}
                      aria-label={`Kit ${kit.label}`}
                      aria-pressed={sel}
                      style={{
                        flex: 1,
                        height: 52,
                        position: 'relative',
                        overflow: 'hidden',
                        padding: 0,
                        borderRadius: 'var(--radius-md)',
                        cursor: 'pointer',
                        background: kitGradientCss(kit),
                        border: sel ? '2px solid #8b5cf6' : '1px solid var(--border-subtle)',
                        boxShadow: sel ? '0 0 12px rgba(139,92,246,0.6)' : 'none',
                        opacity: bloqueado ? 0.6 : 1,
                      }}
                    >
                      <span style={{ position: 'absolute', top: 3, right: 5, fontSize: 11 }}>{kit.badge}</span>
                      <span style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: '2px 0', fontFamily: "'Rajdhani', sans-serif", fontSize: 10, fontWeight: 700, color: '#fff', textAlign: 'center', background: 'linear-gradient(transparent, rgba(0,0,0,0.7))' }}>
                        {kit.label}
                      </span>
                      {bloqueado ? (
                        <span aria-hidden style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', fontSize: 18 }}>🔒</span>
                      ) : null}
                    </button>
                  );
                })}
              </div>

              {/* Cores simples */}
              <div style={{ display: 'flex', gap: 12 }}>
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
                        borderRadius: 'var(--radius-pill)',
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
          )}

          {/* Detalhes — linha compacta sempre visível (sem título) */}
          <div style={{ display: 'flex', gap: 8 }}>
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
                  height: 32,
                  borderRadius: 'var(--radius-sm)',
                  border: `1px solid ${t.on ? 'var(--border-accent)' : 'var(--border-subtle)'}`,
                  background: t.on ? 'rgba(139,92,246,0.2)' : 'var(--surface-1)',
                  color: t.on ? '#8b5cf6' : 'var(--label-color)',
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          {erro ? <div className="alert alert--error" style={{ margin: 0 }}>{erro}</div> : null}

          {/* 3. AÇÕES */}
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" className="btn btn--purple-outline" style={{ flex: 1, height: 40, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }} disabled={busy} onClick={baixar}>
              <Download size={16} /> {busy ? 'A gerar…' : 'Baixar'}
            </button>
            <button
              type="button"
              className="btn"
              style={{ flex: 1, height: 40, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, border: 'none', color: '#fff', background: `linear-gradient(135deg, ${frameHex}ee, ${frameHex}99)`, boxShadow: `0 4px 18px ${frameHex}44` }}
              disabled={busy}
              onClick={partilhar}
            >
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
