// Futty v2.0 — Form para registar o resultado de uma jornada do campeonato.
import { useState } from 'react';
import { apiFetch } from '../lib/api';

const inputPlacar = { width: 44, textAlign: 'center', padding: '8px 6px', borderRadius: 8, border: '1px solid #222', background: '#0c0c0c', color: '#fff', fontSize: 16, fontWeight: 800 };

export default function RegistarJornada({ campeonato, onSaved, showToast }) {
  const [vencedor, setVencedor] = useState(null);
  const [placarA, setPlacarA] = useState('');
  const [placarB, setPlacarB] = useState('');
  const [busy, setBusy] = useState(false);

  async function guardar() {
    if (busy) return;
    if (!vencedor) {
      showToast('Indica o vencedor da jornada.', 'error');
      return;
    }
    setBusy(true);
    try {
      const body = { vencedor };
      if (placarA !== '') body.placar_a = Math.max(0, Number(placarA) || 0);
      if (placarB !== '') body.placar_b = Math.max(0, Number(placarB) || 0);
      await apiFetch(`/api/campeonato/${campeonato.id}/jornada`, { method: 'POST', body: JSON.stringify(body) });
      setVencedor(null);
      setPlacarA('');
      setPlacarB('');
      showToast('Jornada registada!');
      onSaved();
    } catch (e) {
      showToast(e.message, 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: 'grid', gap: 10 }}>
      <div style={{ display: 'flex', gap: 8 }}>
        {[['A', `${campeonato.time_a_nome} ganhou`], ['empate', 'Empate'], ['B', `${campeonato.time_b_nome} ganhou`]].map(([v, label]) => (
          <button key={v} type="button" className={`btn btn--sm ${vencedor === v ? 'btn--primary' : 'btn--ghost'}`} style={{ flex: 1 }} onClick={() => setVencedor(v)}>
            {label}
          </button>
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, color: '#fff', fontWeight: 700 }}>
        <span style={{ fontSize: 13 }}>{campeonato.time_a_nome}</span>
        <input type="number" min="0" value={placarA} onChange={(e) => setPlacarA(e.target.value)} placeholder="–" style={inputPlacar} />
        <span style={{ color: 'var(--text-dim)' }}>×</span>
        <input type="number" min="0" value={placarB} onChange={(e) => setPlacarB(e.target.value)} placeholder="–" style={inputPlacar} />
        <span style={{ fontSize: 13 }}>{campeonato.time_b_nome}</span>
      </div>
      <button type="button" className="btn btn--purple btn--sm" disabled={busy} onClick={guardar}>
        {busy ? 'A guardar…' : 'Registar resultado'}
      </button>
    </div>
  );
}
