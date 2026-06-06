// Futty v2.0 — Contagem decrescente até ao momento do sorteio.
// Campos V2: data (timestamp), draw_window_hours, sorteio_realizado.
// Fallback V1: data_jogo + hora, horas_antes_para_sortear, sorteado.
import { useEffect, useMemo, useRef, useState } from 'react';

const NEON = '#8b5cf6';
const ROXO = '#a78bfa';

// Momento de início do jogo em ms.
function inicioJogoMs(j) {
  const base = new Date(j?.date || j?.data_jogo || j?.data);
  if (Number.isNaN(base.getTime())) return NaN;
  // Se vier hora separada (V1), aplica-a; na V2 a timestamp já tem hora.
  const hora = String(j?.time || j?.hora || '').trim();
  const m = /^(\d{1,2}):(\d{2})/.exec(hora);
  if (m) base.setHours(Number(m[1]), Number(m[2]), 0, 0);
  return base.getTime();
}

// Momento alvo do sorteio = início do jogo - janela (horas).
function alvoSorteioMs(j) {
  const start = inicioJogoMs(j);
  if (!Number.isFinite(start)) return NaN;
  const horas = Math.min(168, Math.max(1, Math.round(Number(j?.draw_window_hours ?? j?.horas_antes_para_sortear)) || 24));
  return start - horas * 3600 * 1000;
}

function decompor(ms) {
  if (ms <= 0) return null;
  const total = Math.floor(ms / 1000);
  return {
    d: Math.floor(total / 86400),
    h: Math.floor((total % 86400) / 3600),
    m: Math.floor((total % 3600) / 60),
    s: total % 60,
  };
}

export default function CountdownSorteio({ jogo, style }) {
  const sorteado = jogo?.sorteado === true || jogo?.sorteio_realizado === true;
  const alvo = useMemo(() => alvoSorteioMs(jogo), [jogo]);
  const inicio = useMemo(() => inicioJogoMs(jogo), [jogo]);
  const [agora, setAgora] = useState(() => Date.now());
  const timerRef = useRef(null);

  useEffect(() => {
    if (sorteado || !Number.isFinite(alvo)) return undefined;
    if (Number.isFinite(inicio) && inicio <= Date.now()) return undefined;

    const tick = () => {
      const t = Date.now();
      setAgora(t);
      const falta = alvo - t;
      // Atualiza a cada 1s na última hora; 30s caso contrário.
      timerRef.current = window.setTimeout(tick, falta < 3600 * 1000 ? 1000 : 30000);
    };
    tick();
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [alvo, inicio, sorteado]);

  if (sorteado || !Number.isFinite(alvo)) return null;
  if (Number.isFinite(inicio) && inicio <= agora) return null;

  const b = decompor(alvo - agora);

  const wrap = {
    display: 'inline-flex',
    alignItems: 'baseline',
    gap: 6,
    padding: '4px 10px',
    borderRadius: 999,
    border: `1px solid ${b ? 'rgba(139,92,246,0.32)' : 'rgba(167,139,250,0.45)'}`,
    background: b ? 'rgba(139,92,246,0.06)' : 'rgba(167,139,250,0.12)',
    fontSize: 12,
    color: 'rgba(255,255,255,0.72)',
    ...style,
  };

  // Tempo esgotado → "A sortear…" (roxo).
  if (!b) {
    return (
      <span style={wrap} aria-live="polite">
        <span style={{ color: ROXO, fontWeight: 800, fontSize: 15 }}>A sortear…</span>
      </span>
    );
  }

  const parts = [];
  if (b.d > 0) parts.push(`${b.d}d`);
  if (b.d > 0 || b.h > 0) parts.push(`${b.h}h`);
  parts.push(`${b.m}m`);
  if (b.d === 0) parts.push(`${b.s}s`);

  return (
    <span style={wrap}>
      <span style={{ fontWeight: 700 }}>Sorteio em</span>
      <span style={{ color: NEON, fontWeight: 900, fontSize: 15, fontVariantNumeric: 'tabular-nums' }}>
        {parts.join(' ')}
      </span>
    </span>
  );
}
