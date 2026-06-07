// Futty v2.0 — Figurinha (/figurinha): card premium em fullscreen, personalizar
// e partilhar. Sem Topbar, mobile-first. Tudo no cliente (canvas), sem IA.
// As escolhas de frame e fundo guardam-se no perfil e aplicam-se em todo o app.
import { useEffect, useState } from 'react';
import { Landmark, Layers, Circle } from 'lucide-react';
import { apiFetch } from '../lib/api';
import { useTeams } from '../hooks/useTeam';
import { nomeJogador } from '../utils/avatar';
import { getFrameColor } from '../utils/frameColors';
import { gerarFigurinhaCanvas } from '../utils/figurinhaCanvas';
import PlayerCard from '../components/PlayerCard';
import Topbar from '../components/Topbar';
import '../styles/app.css';

const TOGGLE = { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8 };
// Chaves nomeadas (iguais às guardadas em users.cor_frame / fundo_figurinha).
const FRAMES = ['dourado', 'verde', 'roxo', 'branco'];
const FUNDOS = [
  { k: 'estadio', label: 'Estádio', Icon: Landmark },
  { k: 'gradiente', label: 'Gradiente', Icon: Layers },
  { k: 'preto', label: 'Neutro', Icon: Circle },
];

// Nome de ficheiro seguro a partir do nome do jogador.
function ficheiroNome(nome) {
  const base = String(nome || 'jogador')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/gi, '-')
    .toLowerCase()
    .replace(/(^-|-$)/g, '');
  return `futty-${base || 'jogador'}.png`;
}

function SecLabel({ children }) {
  return (
    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', margin: '18px 0 8px' }}>
      {children}
    </div>
  );
}

// Cantos em L (snakeGlow) para o frame seleccionado.
const CANTOS_FRAME = [
  { top: -2, left: -2, borderTop: '2px solid', borderLeft: '2px solid' },
  { top: -2, right: -2, borderTop: '2px solid', borderRight: '2px solid' },
  { bottom: -2, right: -2, borderBottom: '2px solid', borderRight: '2px solid' },
  { bottom: -2, left: -2, borderBottom: '2px solid', borderLeft: '2px solid' },
];

export default function Figurinha() {
  const { teams } = useTeams();

  const [me, setMe] = useState(null);
  const [fundo, setFundo] = useState('estadio');
  const [corFrame, setCorFrame] = useState('dourado');
  const [mostrarStats, setMostrarStats] = useState(true);
  const [mostrarNome, setMostrarNome] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [erro, setErro] = useState('');

  const jogador = me?.user || {};
  const stats = me?.stats || {};
  const equipa = teams[0] || null;

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

  // Fechar fullscreen com Escape.
  useEffect(() => {
    if (!fullscreen) return undefined;
    const onKey = (e) => e.key === 'Escape' && setFullscreen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [fullscreen]);

  async function gerar() {
    return gerarFigurinhaCanvas({ jogador, stats, fundo, corFrame, mostrarStats, mostrarNome });
  }

  async function baixar() {
    if (busy) return;
    setBusy(true);
    setErro('');
    try {
      const blob = await gerar();
      if (!blob) {
        setErro('Não foi possível gerar a imagem.');
        return;
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.download = ficheiroNome(nomeJogador(jogador));
      a.href = url;
      a.click();
      URL.revokeObjectURL(url);
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
      const blob = await gerar();
      if (!blob) {
        setErro('Não foi possível gerar a imagem.');
        return;
      }
      const file = new File([blob], ficheiroNome(nomeJogador(jogador)), { type: 'image/png' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: 'A minha figurinha Futty' });
      } else {
        // Fallback: download.
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.download = file.name;
        a.href = url;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (e) {
      if (e?.name !== 'AbortError') setErro(e?.message || 'Não foi possível partilhar.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="app-shell">
      <Topbar title="Figurinha" />
      <main className="app-main" style={{ paddingLeft: 16, paddingRight: 16 }}>
        {/* 1. CABEÇALHO */}
        <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.35)', fontSize: 12, margin: '4px 0 16px' }}>personaliza o teu card</p>

        {/* 2. CARD PREMIUM */}
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <div
            role="button"
            tabIndex={0}
            onClick={() => setFullscreen(true)}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setFullscreen(true)}
            style={{ width: '72%', maxWidth: 300, cursor: 'pointer' }}
            aria-label="Abrir figurinha em ecrã inteiro"
          >
            <PlayerCard jogador={jogador} stats={stats} equipa={equipa} fundo={fundo} corFrame={corFrame} mostrarStats={mostrarStats} mostrarNome={mostrarNome} />
          </div>
        </div>

        {/* 3. PERSONALIZAÇÕES */}
        <div style={{ maxWidth: 420, margin: '0 auto' }}>
          {/* A) FUNDO */}
          <SecLabel>Fundo</SecLabel>
          <div style={{ display: 'flex', gap: 10 }}>
            {FUNDOS.map((f) => {
              const sel = fundo === f.k;
              const cor = sel ? '#d4a017' : 'rgba(255,255,255,0.6)';
              return (
                <button
                  key={f.k}
                  type="button"
                  onClick={() => setFundo(f.k)}
                  aria-pressed={sel}
                  style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 6,
                    padding: '10px 6px',
                    border: `1px solid ${sel ? 'rgba(212,160,23,0.6)' : 'rgba(255,255,255,0.06)'}`,
                    borderRadius: 8,
                    background: sel ? 'rgba(212,160,23,0.08)' : 'rgba(255,255,255,0.03)',
                    color: cor,
                    cursor: 'pointer',
                  }}
                >
                  <f.Icon size={16} />
                  <span style={{ fontSize: 12, fontWeight: 700 }}>{f.label}</span>
                </button>
              );
            })}
          </div>

          {/* B) COR DO FRAME */}
          <SecLabel>Frame</SecLabel>
          <div style={{ display: 'flex', gap: 12 }}>
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

          {/* C) MOSTRAR NOME / STATS */}
          <SecLabel>No card</SecLabel>
          <label style={{ ...TOGGLE, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', cursor: 'pointer', marginBottom: 8 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>Mostrar nome</span>
            <input type="checkbox" checked={mostrarNome} onChange={(e) => setMostrarNome(e.target.checked)} style={{ width: 20, height: 20, accentColor: '#8b5cf6' }} />
          </label>
          <label style={{ ...TOGGLE, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', cursor: 'pointer' }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>Mostrar nota · jogos · gols</span>
            <input type="checkbox" checked={mostrarStats} onChange={(e) => setMostrarStats(e.target.checked)} style={{ width: 20, height: 20, accentColor: '#8b5cf6' }} />
          </label>

          {erro ? <div className="alert alert--error" style={{ marginTop: 12 }}>{erro}</div> : null}

          {/* 4. BOTÕES */}
          <div style={{ display: 'grid', gap: 10, marginTop: 18 }}>
            <button type="button" className="btn btn--purple-outline" style={{ width: '100%' }} disabled={busy} onClick={baixar}>
              {busy ? 'A gerar…' : '✨ Baixar figurinha'}
            </button>
            <button type="button" className="btn btn--purple" style={{ width: '100%' }} disabled={busy} onClick={partilhar}>
              📤 Partilhar
            </button>
          </div>
        </div>
      </main>

      {/* 5. FULLSCREEN */}
      {fullscreen ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Figurinha em ecrã inteiro"
          onClick={() => setFullscreen(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.95)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
        >
          <button
            type="button"
            aria-label="Fechar"
            onClick={(e) => { e.stopPropagation(); setFullscreen(false); }}
            style={{ position: 'fixed', top: 16, right: 16, zIndex: 201, width: 40, height: 40, borderRadius: 12, border: '1px solid #333', background: 'rgba(255,255,255,0.08)', color: '#fff', fontSize: 18, fontWeight: 900, cursor: 'pointer' }}
          >
            ✕
          </button>
          <div onClick={(e) => e.stopPropagation()} style={{ width: '90%', maxWidth: 380 }}>
            <PlayerCard jogador={jogador} stats={stats} equipa={equipa} fundo={fundo} corFrame={corFrame} mostrarStats={mostrarStats} mostrarNome={mostrarNome} />
          </div>
        </div>
      ) : null}
    </div>
  );
}
