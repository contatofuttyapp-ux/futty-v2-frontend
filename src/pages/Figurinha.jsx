// Futty v2.0 — Figurinha (/figurinha): card premium em fullscreen, personalizar
// e partilhar. Sem Topbar, mobile-first. Tudo no cliente (canvas), sem IA.
import { useEffect, useState } from 'react';
import { useApi } from '../hooks/useApi';
import { useTeams } from '../hooks/useTeam';
import { nomeJogador } from '../utils/avatar';
import { gerarFigurinhaCanvas } from '../utils/figurinhaCanvas';
import PlayerCard from '../components/PlayerCard';
import '../styles/app.css';

const CARD = { background: '#111111', border: '1px solid #222222', borderRadius: 12 };
const FRAMES = ['#d4a017', '#00e5a0', '#7c3aed', '#ffffff'];
const FUNDOS = [
  { k: 'stadium', label: 'Estádio' },
  { k: 'blur', label: 'Desfocado' },
  { k: 'preto', label: 'Preto' },
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
    <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.12em', color: 'var(--text-dim)', textTransform: 'uppercase', margin: '18px 0 8px' }}>
      {children}
    </div>
  );
}

export default function Figurinha() {
  const { data: me } = useApi('/api/me');
  const { teams } = useTeams();

  const [fundo, setFundo] = useState('stadium');
  const [corFrame, setCorFrame] = useState('#d4a017');
  const [mostrarStats, setMostrarStats] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [erro, setErro] = useState('');

  const jogador = me?.user || {};
  const stats = me?.stats || {};
  const equipa = teams[0] || null;

  // Fechar fullscreen com Escape.
  useEffect(() => {
    if (!fullscreen) return undefined;
    const onKey = (e) => e.key === 'Escape' && setFullscreen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [fullscreen]);

  async function gerar() {
    return gerarFigurinhaCanvas({ jogador, stats, fundo, corFrame, mostrarStats });
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
      <main className="app-main" style={{ paddingLeft: 16, paddingRight: 16 }}>
        {/* 1. CABEÇALHO */}
        <h1 style={{ textAlign: 'center', fontSize: 22, fontWeight: 800, color: '#fff', margin: '4px 0 2px' }}>✨ A minha figurinha</h1>
        <p style={{ textAlign: 'center', color: 'var(--text-dim)', fontSize: 13, marginBottom: 16 }}>O teu card de jogador</p>

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
            <PlayerCard jogador={jogador} stats={stats} equipa={equipa} fundo={fundo} corFrame={corFrame} mostrarStats={mostrarStats} />
          </div>
        </div>

        {/* 3. PERSONALIZAÇÕES */}
        <div style={{ maxWidth: 420, margin: '0 auto' }}>
          {/* A) FUNDO */}
          <SecLabel>Fundo</SecLabel>
          <div style={{ display: 'flex', gap: 10 }}>
            {FUNDOS.map((f) => (
              <button
                key={f.k}
                type="button"
                onClick={() => setFundo(f.k)}
                title={f.label}
                style={{ padding: 0, border: `2px solid ${fundo === f.k ? 'var(--neon)' : 'transparent'}`, borderRadius: 8, overflow: 'hidden', cursor: 'pointer', lineHeight: 0, background: 'transparent' }}
              >
                <div style={{ width: 56, height: 40, ...fundoThumb(f.k) }} />
              </button>
            ))}
          </div>

          {/* B) COR DO FRAME */}
          <SecLabel>Frame</SecLabel>
          <div style={{ display: 'flex', gap: 12 }}>
            {FRAMES.map((c) => {
              const sel = corFrame === c;
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCorFrame(c)}
                  aria-label={`Frame ${c}`}
                  aria-pressed={sel}
                  style={{ width: 28, height: 28, borderRadius: '50%', cursor: 'pointer', background: c, border: sel ? '2px solid #fff' : '2px solid #333', boxShadow: sel ? `0 0 10px ${c}` : 'none' }}
                />
              );
            })}
          </div>

          {/* C) MOSTRAR STATS */}
          <SecLabel>Stats no card</SecLabel>
          <label style={{ ...CARD, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', cursor: 'pointer' }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>Mostrar nota · jogos · gols</span>
            <input type="checkbox" checked={mostrarStats} onChange={(e) => setMostrarStats(e.target.checked)} style={{ width: 20, height: 20, accentColor: '#00e5a0' }} />
          </label>

          {erro ? <div className="alert alert--error" style={{ marginTop: 12 }}>{erro}</div> : null}

          {/* 4. BOTÕES */}
          <div style={{ display: 'grid', gap: 10, marginTop: 18 }}>
            <button type="button" className="btn btn--primary" style={{ width: '100%' }} disabled={busy} onClick={baixar}>
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
            <PlayerCard jogador={jogador} stats={stats} equipa={equipa} fundo={fundo} corFrame={corFrame} mostrarStats={mostrarStats} />
          </div>
        </div>
      ) : null}
    </div>
  );
}

// Miniatura do fundo para os chips.
function fundoThumb(k) {
  if (k === 'preto') return { background: '#000000' };
  if (k === 'blur') return { background: 'radial-gradient(ellipse 90% 70% at 50% 50%, #0c3a26, #061410 60%, #000)' };
  return { backgroundImage: 'url(/stadium_bg.png)', backgroundSize: 'cover', backgroundPosition: 'center' };
}
