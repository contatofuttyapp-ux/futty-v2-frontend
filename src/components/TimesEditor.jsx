// Futty v2.0 — Editor manual dos times pós-sorteio (drag & drop HTML5).
// Move jogadores entre times/reservas, adiciona atrasados e grava via PATCH.
import { useRef, useState } from 'react';
import { apiFetch } from '../lib/api';

const EDITOR_CSS = `
@keyframes teDropPulse { 0%,100% { box-shadow: 0 0 0 0 rgba(139,92,246,0.5); } 50% { box-shadow: 0 0 0 4px rgba(139,92,246,0.15); } }
.te-zone--over { border-color: var(--neon) !important; animation: teDropPulse 1s ease-in-out infinite; }
`;

const media = (jogadores) => (jogadores.length ? Math.round((jogadores.reduce((s, j) => s + (j.rating || 0), 0) / jogadores.length) * 100) / 100 : 0);

export default function TimesEditor({ gameId, resultadoInicial, confirmados = [], onSaved, onCancel, showToast }) {
  // Clona o estado inicial (times + reservas).
  const [times, setTimes] = useState(() => (resultadoInicial?.times || []).map((t) => ({ ...t, jogadores: [...(t.jogadores || [])] })));
  const [reservas, setReservas] = useState(() => [...(resultadoInicial?.reservas || [])]);
  const [draggingId, setDraggingId] = useState(null);
  const [overZone, setOverZone] = useState(null); // índice do time ou 'reservas'
  const [addUser, setAddUser] = useState('');
  const [addTime, setAddTime] = useState('0');
  const [saving, setSaving] = useState(false);
  const dragRef = useRef(null);

  // user_ids já colocados (para calcular atrasados).
  const colocados = new Set([...times.flatMap((t) => t.jogadores), ...reservas].map((j) => j.user_id));
  const atrasados = confirmados.filter((p) => !colocados.has(p.user_id));

  function moverPara(userId, destino) {
    let jogador = null;
    const novosTimes = times.map((t) => {
      const idx = t.jogadores.findIndex((j) => j.user_id === userId);
      if (idx >= 0) {
        jogador = t.jogadores[idx];
        return { ...t, jogadores: t.jogadores.filter((_, k) => k !== idx) };
      }
      return { ...t, jogadores: [...t.jogadores] };
    });
    let novasReservas = reservas.filter((j) => {
      if (j.user_id === userId) {
        jogador = j;
        return false;
      }
      return true;
    });
    if (!jogador) return;
    if (destino === 'reservas') novasReservas = [...novasReservas, jogador];
    else novosTimes[destino] = { ...novosTimes[destino], jogadores: [...novosTimes[destino].jogadores, jogador] };
    setTimes(novosTimes);
    setReservas(novasReservas);
  }

  function onDrop(destino) {
    const id = dragRef.current;
    setOverZone(null);
    setDraggingId(null);
    dragRef.current = null;
    if (id) moverPara(id, destino);
  }

  function adicionarAtrasado() {
    const p = atrasados.find((x) => x.user_id === addUser);
    if (!p) return;
    const jogador = { user_id: p.user_id, nome: p.nome, avatar_url: p.avatar_url || null, rating: p.rating ?? 0, goleiro: !!p.goleiro, cabeca_chave: !!p.cabeca_chave };
    const idx = Number(addTime) || 0;
    setTimes((prev) => prev.map((t, i) => (i === idx ? { ...t, jogadores: [...t.jogadores, jogador] } : t)));
    setAddUser('');
  }

  async function guardar() {
    if (saving) return;
    // Cada time tem de ter pelo menos 1 jogador.
    if (times.some((t) => t.jogadores.length < 1)) {
      showToast?.('Cada time precisa de pelo menos 1 jogador.', 'error');
      return;
    }
    setSaving(true);
    const tr = {
      ...resultadoInicial,
      times: times.map((t) => ({ ...t, rating_medio: media(t.jogadores) })),
      reservas: reservas.map((r, i) => {
        const base = { posicao: i + 1, user_id: r.user_id, nome: r.nome, avatar_url: r.avatar_url || null, rating: r.rating ?? 0 };
        if (i === 0) base.ordem_entrada = 'primeiro';
        return base;
      }),
      num_times: times.length,
      total_jogadores: times.reduce((s, t) => s + t.jogadores.length, 0),
    };
    try {
      const { times_resultado } = await apiFetch(`/api/games/${gameId}/times`, {
        method: 'PATCH',
        body: JSON.stringify({ times_resultado: tr }),
      });
      showToast?.('Times actualizados!');
      onSaved?.(times_resultado);
    } catch (e) {
      showToast?.(e.message, 'error');
      setSaving(false);
    }
  }

  function Jogador({ j }) {
    return (
      <div
        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 4px', opacity: draggingId === j.user_id ? 0.5 : 1 }}
      >
        <span
          draggable
          onDragStart={() => {
            dragRef.current = j.user_id;
            setDraggingId(j.user_id);
          }}
          onDragEnd={() => {
            setDraggingId(null);
            setOverZone(null);
          }}
          title="Arrastar"
          style={{ cursor: 'grab', color: '#444', fontSize: 16, touchAction: 'none', userSelect: 'none' }}
        >
          ⠿
        </span>
        <span style={{ flex: 1, fontSize: 13, color: '#fff' }}>{j.nome}</span>
        {j.cabeca_chave ? <span className="sorteio-player__cap">C</span> : null}
        {j.goleiro ? <span className="sorteio-player__gk">GR</span> : null}
        <span className="rating-pill">{j.rating}</span>
      </div>
    );
  }

  return (
    <div>
      <style>{EDITOR_CSS}</style>

      <div className="sorteio-grid">
        {times.map((t, i) => (
          <div
            key={i}
            className={`sorteio-team te-zone ${overZone === i ? 'te-zone--over' : ''}`}
            onDragOver={(e) => {
              e.preventDefault();
              if (overZone !== i) setOverZone(i);
            }}
            onDragLeave={() => setOverZone((z) => (z === i ? null : z))}
            onDrop={() => onDrop(i)}
            style={{ border: '1px solid #222', borderRadius: 10 }}
          >
            <div className="sorteio-team__head">
              <span>{t.nome}</span>
              <span className="sorteio-team__avg">★ {media(t.jogadores)}</span>
            </div>
            {t.jogadores.map((j) => (
              <Jogador key={j.user_id} j={j} />
            ))}
            {t.jogadores.length === 0 ? <div style={{ fontSize: 12, color: 'var(--danger)', padding: 4 }}>Vazio</div> : null}
          </div>
        ))}
      </div>

      {/* Dropzone de reservas (sempre visível em edição) */}
      <div
        className={`te-zone ${overZone === 'reservas' ? 'te-zone--over' : ''}`}
        onDragOver={(e) => {
          e.preventDefault();
          if (overZone !== 'reservas') setOverZone('reservas');
        }}
        onDragLeave={() => setOverZone((z) => (z === 'reservas' ? null : z))}
        onDrop={() => onDrop('reservas')}
        style={{ marginTop: 12, border: '1px dashed #333', borderRadius: 10, padding: 12 }}
      >
        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.1em', color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: 6 }}>
          Reservas
        </div>
        {reservas.length === 0 ? (
          <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>Arrasta jogadores para aqui</div>
        ) : (
          reservas.map((j) => <Jogador key={j.user_id} j={j} />)
        )}
      </div>

      {/* Adicionar atrasado */}
      {atrasados.length > 0 ? (
        <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <select value={addUser} onChange={(e) => setAddUser(e.target.value)} style={selStyle}>
            <option value="">+ Adicionar atrasado…</option>
            {atrasados.map((p) => (
              <option key={p.user_id} value={p.user_id}>{p.nome}</option>
            ))}
          </select>
          {addUser ? (
            <>
              <select value={addTime} onChange={(e) => setAddTime(e.target.value)} style={selStyle}>
                {times.map((t, i) => (
                  <option key={i} value={i}>{t.nome}</option>
                ))}
              </select>
              <button type="button" className="btn btn--ghost btn--sm" onClick={adicionarAtrasado}>Adicionar</button>
            </>
          ) : null}
        </div>
      ) : null}

      {/* Ações */}
      <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
        <button type="button" className="btn btn--primary btn--sm" style={{ flex: 1 }} disabled={saving} onClick={guardar}>
          {saving ? 'Salvando…' : 'Salvar ajustes'}
        </button>
        <button type="button" className="btn btn--ghost btn--sm" style={{ flex: 1 }} disabled={saving} onClick={onCancel}>
          Cancelar
        </button>
      </div>
    </div>
  );
}

const selStyle = {
  padding: '8px 10px',
  borderRadius: 8,
  border: '1px solid #222',
  background: '#0c0c0c',
  color: '#fff',
  fontSize: 13,
};
