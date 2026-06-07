// Futty v2.0 — Figurinha (/figurinha): card premium em fullscreen, personalizar
// e partilhar. Sem Topbar, mobile-first. Tudo no cliente (canvas), sem IA.
// As escolhas de frame e fundo guardam-se no perfil e aplicam-se em todo o app.
import { useEffect, useState } from 'react';
import { apiFetch } from '../lib/api';
import { useTeams } from '../hooks/useTeam';
import { nomeJogador } from '../utils/avatar';
import { getFrameColor } from '../utils/frameColors';
import { gerarFigurinhaCanvas } from '../utils/figurinhaCanvas';
import PlayerCard from '../components/PlayerCard';
import Toast from '../components/Toast';
import '../styles/app.css';

const CARD = { background: '#111111', border: '1px solid #222222', borderRadius: 12 };
// Chaves nomeadas (iguais às guardadas em users.cor_frame / fundo_figurinha).
const FRAMES = ['dourado', 'verde', 'roxo', 'branco'];
const FUNDOS = [
  { k: 'estadio', label: 'Estádio', emoji: '🏟️' },
  { k: 'gradiente', label: 'Gradiente', emoji: '🌌' },
  { k: 'preto', label: 'Preto', emoji: '⬛' },
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
  const { teams } = useTeams();

  const [me, setMe] = useState(null);
  const [fundo, setFundo] = useState('estadio');
  const [corFrame, setCorFrame] = useState('dourado');
  const [mostrarStats, setMostrarStats] = useState(true);
  const [mostrarNome, setMostrarNome] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState('');
  const [toast, setToast] = useState(null);

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

  // Guarda as escolhas no perfil (aplicam-se em todo o app).
  async function guardar() {
    if (saving) return;
    setSaving(true);
    setErro('');
    try {
      const res = await apiFetch('/api/me', {
        method: 'PATCH',
        body: JSON.stringify({ cor_frame: corFrame, fundo_figurinha: fundo }),
      });
      setMe((m) => (m ? { ...m, user: { ...m.user, ...res.user } } : m));
      setToast({ tipo: 'success', mensagem: 'Figurinha guardada! ✨' });
    } catch (e) {
      setToast({ tipo: 'error', mensagem: e?.message || 'Não foi possível guardar.' });
    } finally {
      setSaving(false);
    }
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
        <h1 style={{ textAlign: 'center', fontFamily: "'Rajdhani', sans-serif", fontSize: 22, fontWeight: 700, color: '#ffffff', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '4px 0 2px' }}>A minha figurinha</h1>
        <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.35)', fontSize: 12, marginBottom: 16 }}>personaliza o teu card</p>

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
                    gap: 4,
                    padding: '10px 6px',
                    border: `1px solid ${sel ? 'rgba(212,160,23,0.6)' : 'rgba(255,255,255,0.08)'}`,
                    borderRadius: 8,
                    background: sel ? 'rgba(212,160,23,0.08)' : 'rgba(255,255,255,0.03)',
                    color: '#fff',
                    cursor: 'pointer',
                  }}
                >
                  <span style={{ fontSize: 20, lineHeight: 1 }}>{f.emoji}</span>
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
                  style={{ width: 28, height: 28, borderRadius: '50%', cursor: 'pointer', background: hex, border: sel ? '2px solid #fff' : '2px solid #333', boxShadow: sel ? `0 0 10px ${hex}` : 'none' }}
                />
              );
            })}
          </div>

          {/* C) MOSTRAR NOME / STATS */}
          <SecLabel>No card</SecLabel>
          <label style={{ ...CARD, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', cursor: 'pointer', marginBottom: 8 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>Mostrar nome</span>
            <input type="checkbox" checked={mostrarNome} onChange={(e) => setMostrarNome(e.target.checked)} style={{ width: 20, height: 20, accentColor: '#8b5cf6' }} />
          </label>
          <label style={{ ...CARD, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', cursor: 'pointer' }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>Mostrar nota · jogos · gols</span>
            <input type="checkbox" checked={mostrarStats} onChange={(e) => setMostrarStats(e.target.checked)} style={{ width: 20, height: 20, accentColor: '#8b5cf6' }} />
          </label>

          {erro ? <div className="alert alert--error" style={{ marginTop: 12 }}>{erro}</div> : null}

          {/* 4. BOTÕES */}
          <div style={{ display: 'grid', gap: 10, marginTop: 18 }}>
            <button type="button" className="btn btn--primary" style={{ width: '100%' }} disabled={saving} onClick={guardar}>
              {saving ? 'A guardar…' : '💾 Guardar figurinha'}
            </button>
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

      {toast ? <Toast mensagem={toast.mensagem} tipo={toast.tipo} onClose={() => setToast(null)} /> : null}
    </div>
  );
}
