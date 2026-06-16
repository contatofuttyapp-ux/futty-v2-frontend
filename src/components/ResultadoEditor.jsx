// Futty v2.0 — Editor do resultado do jogo (admin): 4 níveis de detalhe.
import { useState } from 'react';
import { apiFetch } from '../lib/api';
import { urlAsset, iniciaisNome } from '../utils/avatar';

const NIVEIS = [
  { n: 0, label: 'Sem resultado' },
  { n: 1, label: 'Quem ganhou' },
  { n: 2, label: 'Placar' },
  { n: 3, label: 'Stats' },
];

const inputPlacar = { width: 48, textAlign: 'center', padding: '8px 6px', borderRadius: 8, border: '1px solid #222', background: '#0c0c0c', color: '#fff', fontSize: 18, fontWeight: 800 };
const stepBtn = { width: 28, height: 28, borderRadius: 8, border: '1px solid #333', background: 'transparent', color: '#fff', fontSize: 16, fontWeight: 800, cursor: 'pointer', lineHeight: 1 };

function MiniAvatar({ nome, avatarUrl }) {
  const [falhou, setFalhou] = useState(false);
  const src = avatarUrl ? urlAsset(avatarUrl) : null;
  return (
    <div style={{ width: 32, height: 32, borderRadius: 6, overflow: 'hidden', background: '#15151a', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
      {src && !falhou ? (
        <img src={src} alt="" onError={() => setFalhou(true)} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top center' }} />
      ) : (
        <span style={{ color: '#fff', fontWeight: 800, fontSize: 12 }}>{iniciaisNome(nome)}</span>
      )}
    </div>
  );
}

export default function ResultadoEditor({ gameId, game, gols, jogadores, nomeA, nomeB, onSaved, showToast }) {
  const [nivel, setNivel] = useState(game.resultado_nivel || 0);
  const [vencedor, setVencedor] = useState(game.time_vencedor || null);
  const [placarA, setPlacarA] = useState(game.placar_a ?? 0);
  const [placarB, setPlacarB] = useState(game.placar_b ?? 0);
  const [golsMap, setGolsMap] = useState(() => {
    const m = {};
    (gols || []).forEach((g) => { m[g.user_id] = g.gols || 0; });
    return m;
  });
  const [busy, setBusy] = useState(false);

  function setGol(uid, delta) {
    setGolsMap((m) => ({ ...m, [uid]: Math.max(0, (m[uid] || 0) + delta) }));
  }

  async function guardar() {
    if (busy) return;
    if (nivel >= 1 && !vencedor) {
      showToast('Indica quem venceu.', 'error');
      return;
    }
    setBusy(true);
    try {
      const body = { nivel };
      if (nivel >= 1) body.time_vencedor = vencedor;
      if (nivel >= 2) {
        body.placar_a = Math.max(0, Number(placarA) || 0);
        body.placar_b = Math.max(0, Number(placarB) || 0);
      }
      if (nivel === 3) body.gols = jogadores.map((j) => ({ user_id: j.user_id, gols: golsMap[j.user_id] || 0 }));
      await apiFetch(`/api/games/${gameId}/resultado`, { method: 'PATCH', body: JSON.stringify(body) });
      showToast('Resultado guardado!');
      onSaved();
    } catch (e) {
      showToast(e.message, 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ marginTop: 8 }}>
      {/* Selector de nível */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {NIVEIS.map((x) => (
          <button key={x.n} type="button" className={`btn btn--sm ${nivel === x.n ? 'btn--purple' : 'btn--ghost'}`} aria-pressed={nivel === x.n} onClick={() => setNivel(x.n)}>
            {x.label}
          </button>
        ))}
      </div>

      {/* Quem venceu (níveis 1-3) */}
      {nivel >= 1 ? (
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          {[['A', `${nomeA} ganhou`], ['empate', 'Empate'], ['B', `${nomeB} ganhou`]].map(([v, label]) => (
            <button key={v} type="button" className={`btn btn--sm ${vencedor === v ? 'btn--primary' : 'btn--ghost'}`} style={{ flex: 1 }} onClick={() => setVencedor(v)}>
              {label}
            </button>
          ))}
        </div>
      ) : null}

      {/* Placar (níveis 2-3) */}
      {nivel >= 2 ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 12, color: '#fff', fontWeight: 700 }}>
          <span style={{ fontSize: 13 }}>{nomeA}</span>
          <input type="number" min="0" value={placarA} onChange={(e) => setPlacarA(e.target.value)} style={inputPlacar} />
          <span style={{ color: 'var(--text-dim)' }}>×</span>
          <input type="number" min="0" value={placarB} onChange={(e) => setPlacarB(e.target.value)} style={inputPlacar} />
          <span style={{ fontSize: 13 }}>{nomeB}</span>
        </div>
      ) : null}

      {/* Gols por jogador (nível 3) */}
      {nivel === 3 ? (
        <div style={{ display: 'grid', gap: 8, marginTop: 12 }}>
          {jogadores.map((j) => (
            <div key={j.user_id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <MiniAvatar nome={j.nome} avatarUrl={j.avatar_url} />
              <span style={{ flex: 1, minWidth: 0, color: '#fff', fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {j.nome} <span style={{ color: 'var(--text-dim)', fontSize: 11 }}>· {j.time}</span>
              </span>
              <button type="button" style={stepBtn} onClick={() => setGol(j.user_id, -1)} aria-label="Menos">−</button>
              <span style={{ minWidth: 20, textAlign: 'center', color: '#d4a017', fontWeight: 800 }}>{golsMap[j.user_id] || 0}</span>
              <button type="button" style={stepBtn} onClick={() => setGol(j.user_id, 1)} aria-label="Mais">+</button>
            </div>
          ))}
        </div>
      ) : null}

      <button type="button" className="btn btn--purple btn--sm" style={{ marginTop: 14 }} disabled={busy} onClick={guardar}>
        {busy ? 'A guardar…' : 'Guardar resultado'}
      </button>
    </div>
  );
}
