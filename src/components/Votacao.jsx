// Futty v2.0 — Votação: avalia cada jogador de 1 a 5 estrelas
import { useState } from 'react';
import { initials } from '../lib/teamColors';

function Estrelas({ valor, onChange }) {
  return (
    <span className="stars">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          className={`star ${valor >= n ? 'star--on' : ''}`}
          aria-label={`${n} estrela${n > 1 ? 's' : ''}`}
          onClick={() => onChange(n)}
        >
          ★
        </button>
      ))}
    </span>
  );
}

export default function Votacao({ jogadores, onSubmit, busy }) {
  const [notas, setNotas] = useState({});

  const setNota = (userId, nota) => setNotas((prev) => ({ ...prev, [userId]: nota }));

  const total = Object.keys(notas).length;

  function submit() {
    const votos = Object.entries(notas).map(([para_user_id, nota]) => ({ para_user_id, nota }));
    onSubmit(votos);
  }

  if (!jogadores.length) {
    return <p className="muted">Não há outros jogadores confirmados para avaliar.</p>;
  }

  return (
    <div>
      {jogadores.map((p) => (
        <div className="vote-row" key={p.user_id}>
          <div className="member-avatar">{initials(p.nome) || '?'}</div>
          <span className="vote-row__name">{p.nome}</span>
          <Estrelas valor={notas[p.user_id] || 0} onChange={(n) => setNota(p.user_id, n)} />
        </div>
      ))}
      <button
        type="button"
        className="btn btn--primary"
        style={{ marginTop: 8 }}
        onClick={submit}
        disabled={busy || total === 0}
      >
        {busy ? 'A enviar…' : `Enviar votos (${total})`}
      </button>
    </div>
  );
}
