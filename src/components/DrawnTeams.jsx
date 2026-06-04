// Futty v2.0 — Mostra os times resultantes do sorteio + avisos.
import { colorOf } from '../utils/teamColors';

export default function DrawnTeams({ resultado, teamCor }) {
  if (!resultado?.times?.length) return null;
  const c = colorOf(teamCor);

  // Não mostrar o aviso de "nenhum goleiro marcado" (mesmo em sorteios antigos)
  const avisos = (resultado.avisos || []).filter((a) => !/nenhum goleiro marcado/i.test(a));
  const reservas = resultado.reservas || [];

  return (
    <>
      {avisos.map((aviso, i) => (
        <div className="aviso" key={i}>
          ⚠️ {aviso}
        </div>
      ))}
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
                  {j.cabeca_chave && <span className="sorteio-player__cap">C</span>}
                  {j.goleiro && <span className="sorteio-player__gk">GR</span>}
                  <span className="rating-pill">{j.rating}</span>
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>

      {reservas.length > 0 && (
        <>
          <h2 className="section-title">Reservas</h2>
          <div className="member-list">
            {reservas.map((r, i) => (
              <div className="member-row" key={r.user_id}>
                <div className="member-info">
                  <div className="member-name">
                    Reserva {i + 1} · {r.nome}
                  </div>
                </div>
                <span className="rating-pill">{r.rating}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}
