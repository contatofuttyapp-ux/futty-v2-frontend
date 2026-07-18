// Futty v2.0 — Barra de reações reutilizável (jogos, posts e comentários).
// 6 emojis com contagem e update optimista. POST /api/feed/reacoes (toggle).
import { useState, useRef, useEffect } from 'react';
import { SmilePlus } from 'lucide-react';
import { apiFetch } from '../lib/api';

const EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '😡', '🍿'];

export default function Reacoes({ targetType, targetId, contagemInicial = {}, minhaReacaoInicial = null, compacto = false }) {
  const [contagem, setContagem] = useState(contagemInicial);
  const [minha, setMinha] = useState(minhaReacaoInicial);
  const [busy, setBusy] = useState(false);
  const [pickerAberto, setPickerAberto] = useState(false);

  async function toggle(emoji) {
    if (busy) return;
    const prevContagem = contagem;
    const prevMinha = minha;

    // Update optimista imediato
    const next = { ...contagem };
    if (minha === emoji) {
      next[emoji] = Math.max(0, (next[emoji] || 0) - 1);
      setMinha(null);
    } else {
      if (minha) next[minha] = Math.max(0, (next[minha] || 0) - 1);
      next[emoji] = (next[emoji] || 0) + 1;
      setMinha(emoji);
    }
    setContagem(next);
    setBusy(true);

    try {
      const res = await apiFetch('/api/feed/reacoes', {
        method: 'POST',
        body: JSON.stringify({ target_type: targetType, target_id: targetId, emoji }),
      });
      // Reconcilia com o servidor (fonte de verdade)
      setMinha(res?.emoji ?? null);
      setContagem(res?.contagem_reacoes || {});
    } catch {
      // Reverte em caso de erro
      setContagem(prevContagem);
      setMinha(prevMinha);
    } finally {
      setBusy(false);
    }
  }

  // Modo compacto (opt-in, Feed): fechado mostra SÓ as reações já dadas (vidro)
  // + um botão discreto de reagir. Toque → picker-leque (vidro + 45°) que fecha
  // ao escolher ou tocar fora. Por baixo é o mesmo toggle/endpoint.
  if (compacto) {
    return <ReacoesCompacto {...{ contagem, minha, pickerAberto, setPickerAberto, toggle }} />;
  }

  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
      {EMOJIS.map((emoji) => {
        const n = contagem[emoji] || 0;
        const on = minha === emoji;
        return (
          <button
            key={emoji}
            type="button"
            onClick={() => toggle(emoji)}
            aria-pressed={on}
            title={emoji}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '5px 9px',
              borderRadius: 999,
              fontSize: 14,
              lineHeight: 1,
              cursor: 'pointer',
              border: `1px solid ${on ? 'var(--neon)' : 'var(--border)'}`,
              background: on ? 'rgba(139,92,246,0.12)' : 'rgba(255,255,255,0.04)',
              color: on ? 'var(--neon)' : 'var(--text)',
              transition: 'background 0.15s, border-color 0.15s',
            }}
          >
            <span>{emoji}</span>
            {n > 0 ? <span style={{ fontSize: 11, fontWeight: 700 }}>{n}</span> : null}
          </button>
        );
      })}
    </div>
  );
}

// ── Superfície compacta (Feed): reações-dadas em vidro + botão discreto + leque.
function ReacoesCompacto({ contagem, minha, pickerAberto, setPickerAberto, toggle }) {
  const wrapRef = useRef(null);

  // Fecha o leque ao tocar fora (ou Esc).
  useEffect(() => {
    if (!pickerAberto) return undefined;
    function aoTocarFora(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setPickerAberto(false);
    }
    function aoEsc(e) {
      if (e.key === 'Escape') setPickerAberto(false);
    }
    document.addEventListener('pointerdown', aoTocarFora);
    document.addEventListener('keydown', aoEsc);
    return () => {
      document.removeEventListener('pointerdown', aoTocarFora);
      document.removeEventListener('keydown', aoEsc);
    };
  }, [pickerAberto, setPickerAberto]);

  const dadas = EMOJIS.filter((e) => (contagem[e] || 0) > 0);

  return (
    <div ref={wrapRef} style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
      {/* Reações já dadas — pílulas vidro compactas (dourado = a minha) */}
      {dadas.map((e) => {
        const on = minha === e;
        return (
          <span
            key={e}
            className="hud-corners-s"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px', fontSize: 12, lineHeight: 1,
              background: on ? 'rgba(212,160,23,0.14)' : 'rgba(255,255,255,0.05)',
              border: `1px solid ${on ? 'rgba(212,160,23,0.55)' : 'rgba(255,255,255,0.10)'}`,
              color: on ? '#f0c94a' : 'rgba(255,255,255,0.78)',
            }}
          >
            <span>{e}</span>
            <span style={{ fontWeight: 700 }}>{contagem[e]}</span>
          </span>
        );
      })}

      {/* Botão de reagir discreto */}
      <button
        type="button"
        aria-label="Reagir"
        aria-expanded={pickerAberto}
        onClick={() => setPickerAberto((v) => !v)}
        className="hud-corners-s"
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 9px', fontSize: 12, lineHeight: 1, cursor: 'pointer',
          background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.55)',
        }}
      >
        <SmilePlus size={15} />
        {dadas.length === 0 ? <span>Reagir</span> : null}
      </button>

      {/* Leque de emojis — vidro + 45° */}
      {pickerAberto ? (
        <div
          className="reac-picker hud-corners-s"
          style={{
            position: 'absolute', bottom: '100%', left: 0, marginBottom: 8, display: 'flex', gap: 10,
            background: 'rgba(20,20,24,0.72)', border: '1px solid rgba(255,255,255,0.12)', padding: '7px 12px', zIndex: 30,
            backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', boxShadow: '0 8px 22px rgba(0,0,0,0.55)',
          }}
        >
          {EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              className="reac-emoji"
              aria-label={emoji}
              onClick={() => {
                toggle(emoji);
                setPickerAberto(false);
              }}
              style={minha === emoji ? { transform: 'scale(1.25)' } : undefined}
            >
              {emoji}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
