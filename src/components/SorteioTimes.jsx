// Futty v2.0 — Mostra os times resultantes do sorteio
import { colorOf } from '../lib/teamColors';

export default function SorteioTimes({ resultado, teamCor }) {
  if (!resultado?.times?.length) return null;
  const c = colorOf(teamCor);

  return (
    <div className="sorteio-grid">
      {resultado.times.map((time, i) => (
        <div className="sorteio-team" key={i}>
          <div className="sorteio-team__head" style={{ borderColor: c.hex }}>
            <span>{time.nome}</span>
            <span className="sorteio-team__avg">★ {time.rating_medio}</span>
          </div>
          {time.jogadores.map((j) => (
            <div className="sorteio-player" key={j.user_id}>
              <span>{j.nome}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {j.goleiro && <span className="sorteio-player__gk">GR</span>}
                <span className="rating-pill">{j.rating}</span>
              </span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
