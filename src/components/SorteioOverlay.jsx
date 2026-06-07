// Futty v2.0 — Overlay do sorteio em 4 fases cinematográficas.
// Fase 1: anticipação · 2: slot de 2 colunas · 3: flash+confetti · 4: resultado.
// Sorteio fresco (jogo.__fresco) corre 1→4; "Ver sorteio" vai direto à fase 4.
import { useEffect, useMemo, useState } from 'react';
import SorteioSlotMachine from './SorteioSlotMachine.jsx';
import { jogoParaSorteioSlot, contarJogadoresSorteio, formatarDataJogo } from '../utils/sorteioUiHelpers.js';
import { urlAsset, iniciaisNome } from '../utils/avatar.js';
import { celebrarSorteio } from '../hooks/useConfetti.js';

const CSS = `
.so-center { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px; position: relative; }
.so-logo { font-family: 'Rajdhani', sans-serif; font-size: 48px; font-weight: 700; color: #d4a017; letter-spacing: 0.3em; animation: soLogoPulse 1s ease-in-out infinite; }
.so-sub { font-size: 14px; color: rgba(255,255,255,0.4); opacity: 0; animation: soFadeIn 0.5s ease 0.3s forwards; }
.so-dot { animation: soDotBlink 1.2s ease-in-out infinite; }
.so-coltitle { color: #d4a017; font-size: 11px; letter-spacing: 0.15em; font-weight: 700; margin-bottom: 6px; }
.so-col { width: 76px; height: 120px; overflow: hidden; border: 1px solid rgba(212,160,23,0.5); border-radius: 8px; background: #0c0f18; }
.so-reel { animation: soSlotSpin 1.8s cubic-bezier(0.25,0.1,0.1,1) forwards; }
.so-cell { height: 60px; display: flex; align-items: center; justify-content: center; overflow: hidden; }
.so-cellimg { width: 100%; height: 100%; object-fit: cover; object-position: top center; }
.so-cellini { font-weight: 800; color: #fff; font-size: 18px; }
.so-flash { position: absolute; inset: 0; background: #fff; opacity: 0; pointer-events: none; animation: soFlash 0.4s ease forwards; }
.so-reveal { font-family: 'Rajdhani', sans-serif; font-size: 28px; font-weight: 700; color: #d4a017; letter-spacing: 0.2em; animation: soTitlePop 0.5s ease forwards; }
.so-phase4 { flex: 1; min-height: 0; display: flex; flex-direction: column; animation: soPhase4In 0.4s ease forwards; }
@keyframes soLogoPulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.05); } }
@keyframes soFadeIn { to { opacity: 1; } }
@keyframes soDotBlink { 0%,100% { opacity: 0.2; } 50% { opacity: 1; } }
@keyframes soSlotSpin { 0% { transform: translateY(0); } 100% { transform: translateY(-75%); } }
@keyframes soFlash { 0% { opacity: 0; } 50% { opacity: 0.6; } 100% { opacity: 0; } }
@keyframes soTitlePop { 0% { transform: scale(0.5); opacity: 0; } 60% { transform: scale(1.1); opacity: 1; } 100% { transform: scale(1); opacity: 1; } }
@keyframes soPhase4In { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
`;

// Fase 1 — anticipação.
function Fase1() {
  return (
    <div className="so-center" style={{ background: 'radial-gradient(ellipse 70% 50% at 50% 40%, rgba(212,160,23,0.08), transparent 70%)' }}>
      <div className="so-logo">FUTTY</div>
      <div className="so-sub">
        A sortear os times
        <span className="so-dot" style={{ animationDelay: '0s' }}>.</span>
        <span className="so-dot" style={{ animationDelay: '0.2s' }}>.</span>
        <span className="so-dot" style={{ animationDelay: '0.4s' }}>.</span>
      </div>
    </div>
  );
}

// Fase 2 — slot de 2 colunas (avatares reais a rolar).
function Fase2({ sorteio }) {
  const times = (sorteio?.times || []).slice(0, 2);
  return (
    <div className="so-center">
      <div style={{ display: 'flex', gap: 18 }}>
        {times.map((t, i) => {
          let avatares = (t.jogadores || []).map((p) => ({ url: p.avatar_url ? urlAsset(p.avatar_url) : null, nome: p.nome }));
          if (!avatares.length) avatares = [{ url: null, nome: '?' }];
          const strip = [];
          while (strip.length < 8) strip.push(...avatares);
          return (
            <div key={i} style={{ textAlign: 'center' }}>
              <div className="so-coltitle">TIME {i + 1}</div>
              <div className="so-col">
                <div className="so-reel">
                  {strip.map((a, k) => (
                    <div key={k} className="so-cell">
                      {a.url ? <img src={a.url} alt="" className="so-cellimg" /> : <span className="so-cellini">{iniciaisNome(a.nome)}</span>}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Fase 3 — flash + reveal.
function Fase3() {
  return (
    <div className="so-center">
      <div className="so-flash" />
      <div className="so-reveal">TIMES DEFINIDOS</div>
    </div>
  );
}

export default function SorteioOverlay({ jogo, onClose, reducedMotion = false }) {
  const fresco = !!jogo?.__fresco;
  const animar = fresco && !reducedMotion;

  const [fase, setFase] = useState(animar ? 1 : 4);
  const [lastJogo, setLastJogo] = useState(jogo);
  // Reset das fases quando abre um novo jogo (padrão de derived state).
  if (jogo !== lastJogo) {
    setLastJogo(jogo);
    setFase(jogo?.__fresco && !reducedMotion ? 1 : 4);
  }

  // Fechar com Escape.
  useEffect(() => {
    if (!jogo) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [jogo, onClose]);

  // Avança as fases (só no sorteio fresco). Confetti na fase 3.
  useEffect(() => {
    if (!animar) return undefined;
    let id;
    if (fase === 1) id = window.setTimeout(() => setFase(2), 2500);
    else if (fase === 2) id = window.setTimeout(() => setFase(3), 2000);
    else if (fase === 3) {
      celebrarSorteio();
      id = window.setTimeout(() => setFase(4), 800);
    }
    return () => window.clearTimeout(id);
  }, [fase, animar]);

  const sorteio = useMemo(() => (jogo ? jogoParaSorteioSlot(jogo) : null), [jogo]);
  const totalJogadores = useMemo(() => (sorteio ? contarJogadoresSorteio(sorteio) : 0), [sorteio]);

  if (!jogo || !sorteio || !totalJogadores) return null;

  const meta = {
    titulo: String(jogo?.location || jogo?.local || '').trim() || 'Jogo',
    dataLabel: formatarDataJogo(jogo),
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100dvh', background: '#050810', zIndex: 9999, display: 'flex', flexDirection: 'column' }}>
      <style>{CSS}</style>
      {fase === 1 && <Fase1 />}
      {fase === 2 && <Fase2 sorteio={sorteio} />}
      {fase === 3 && <Fase3 />}
      {fase === 4 && (
        <div className="so-phase4">
          {/* Sorteio fresco → resultado estático; "Ver sorteio" → anima como hoje. */}
          <SorteioSlotMachine sorteio={sorteio} meta={meta} reducedMotion={reducedMotion || fresco} onClose={onClose} />
        </div>
      )}
    </div>
  );
}
