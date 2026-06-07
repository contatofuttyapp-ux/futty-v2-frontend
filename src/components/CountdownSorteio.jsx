// Futty v2.0 — Contagem decrescente até ao momento do sorteio.
// Campos V2: data (timestamp), draw_window_hours, sorteio_realizado.
// Fallback V1: data_jogo + hora, horas_antes_para_sortear, sorteado.
import { Fragment, useEffect, useMemo, useRef, useState } from 'react';

// Estilos dos dígitos estilo cassino (injectados via <style>).
const CD_CSS = `
.cd-wrap { display: flex; align-items: center; gap: 6px; justify-content: center; padding: 8px 0; }
.cd-unit { display: flex; flex-direction: column; align-items: center; gap: 2px; }
.cd-digit { position: relative; overflow: hidden; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; background: #0d0d12; border: 1px solid rgba(212,160,23,0.25); border-radius: 6px; font-size: 20px; font-weight: 700; color: #d4a017; font-family: 'Rajdhani', monospace; }
.cd-digit::after { content: ''; position: absolute; left: 0; right: 0; top: 50%; height: 1px; background: rgba(212,160,23,0.10); }
.cd-label { font-size: 9px; color: rgba(255,255,255,0.3); text-transform: uppercase; letter-spacing: 0.08em; }
.cd-sep { font-size: 20px; font-weight: 700; color: rgba(212,160,23,0.4); margin-bottom: 14px; }
`;

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

  // Tempo esgotado → "A sortear…" (bloco roxo com ⚡).
  if (!b) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0', ...style }} aria-live="polite">
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.3)', borderRadius: 8, padding: '10px 16px', color: '#a78bfa', fontSize: 13, fontWeight: 600, textAlign: 'center' }}>
          <span aria-hidden>⚡</span> A sortear…
        </span>
      </div>
    );
  }

  // Dígitos estilo cassino — esconde "Dias" quando é 0.
  const pad = (n) => String(n).padStart(2, '0');
  const unidades = [
    ...(b.d > 0 ? [{ v: b.d, lbl: 'Dias' }] : []),
    { v: b.h, lbl: 'Horas' },
    { v: b.m, lbl: 'Min' },
    { v: b.s, lbl: 'Seg' },
  ];

  return (
    <div className="cd-wrap" style={style}>
      <style>{CD_CSS}</style>
      {unidades.map((u, i) => (
        <Fragment key={u.lbl}>
          {i > 0 ? <span className="cd-sep">:</span> : null}
          <div className="cd-unit">
            <div className="cd-digit">{pad(u.v)}</div>
            <div className="cd-label">{u.lbl}</div>
          </div>
        </Fragment>
      ))}
    </div>
  );
}
