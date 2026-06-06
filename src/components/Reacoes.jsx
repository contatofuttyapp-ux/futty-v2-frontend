// Futty v2.0 — Barra de reações reutilizável (jogos, posts e comentários).
// 6 emojis com contagem e update optimista. POST /api/feed/reacoes (toggle).
import { useState } from 'react';
import { apiFetch } from '../lib/api';

const EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '😡'];

export default function Reacoes({ targetType, targetId, contagemInicial = {}, minhaReacaoInicial = null }) {
  const [contagem, setContagem] = useState(contagemInicial);
  const [minha, setMinha] = useState(minhaReacaoInicial);
  const [busy, setBusy] = useState(false);

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
