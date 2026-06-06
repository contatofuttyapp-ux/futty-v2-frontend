// Futty v2.0 — Mostra os times resultantes do sorteio + avisos + banco de reservas.
import { colorOf } from '../utils/teamColors';
import PlayerAvatar from './PlayerAvatar';

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
          <h2 className="section-title" style={{ textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-dim)' }}>
            Banco de reservas
          </h2>
          <div style={{ display: 'grid', gap: 8 }}>
            {reservas.map((r, i) => {
              const proximo = r.ordem_entrada === 'primeiro' || r.posicao === 1 || i === 0;
              return (
                <div
                  key={r.user_id || i}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#080808', border: '1px solid #141414', borderRadius: 10, padding: '12px 14px' }}
                >
                  <span style={{ fontSize: 16, fontWeight: 900, color: '#d4a017', minWidth: 26 }}>{r.posicao ?? i + 1}º</span>
                  <PlayerAvatar nome={r.nome} avatarUrl={r.avatar_url} sm />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.nome}</div>
                    {proximo && (
                      <span style={{ display: 'inline-block', marginTop: 4, fontSize: 10, fontWeight: 800, letterSpacing: '0.06em', color: '#8b5cf6', background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.3)', borderRadius: 999, padding: '2px 8px' }}>
                        PRÓXIMO A ENTRAR
                      </span>
                    )}
                  </div>
                  <span style={{ color: 'var(--neon)', fontWeight: 800 }}>{r.rating}</span>
                </div>
              );
            })}
          </div>
        </>
      )}
    </>
  );
}
