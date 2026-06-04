// Futty v2.0 — Ranking da equipa + votação (estrelas) do jogo mais recente
import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { apiFetch } from '../lib/api';
import { initials } from '../lib/teamColors';
import Topbar from '../components/Topbar';
import Estrelas from '../components/Estrelas';
import '../styles/app.css';

const MEDALHAS = ['🥇', '🥈', '🥉'];

export default function Ranking() {
  const { slug } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notas, setNotas] = useState({});
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await apiFetch(`/api/teams/${slug}/ranking`);
    setData(res);
  }, [slug]);

  useEffect(() => {
    let active = true;
    apiFetch(`/api/teams/${slug}/ranking`)
      .then((res) => {
        if (active) setData(res);
      })
      .catch((err) => {
        if (active) setError(err.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [slug]);

  const team = data?.team;
  const ranking = data?.ranking || [];
  const votacao = data?.votacao || null;
  const jaVotei = !!votacao?.jaVotei;

  // Mapa user_id -> { minhaNota } dos jogadores votáveis (confirmados no jogo, exceto eu)
  const votaveis = new Map((votacao?.jogadores || []).map((j) => [j.user_id, j]));

  const setNota = (userId, nota) => setNotas((prev) => ({ ...prev, [userId]: nota }));
  const totalNotas = Object.keys(notas).length;

  async function enviarVotos() {
    const votos = Object.entries(notas).map(([para_user_id, nota]) => ({ para_user_id, nota }));
    if (!votos.length || !votacao) return;
    setError('');
    setBusy(true);
    try {
      await apiFetch(`/api/games/${votacao.game_id}/votar`, {
        method: 'POST',
        body: JSON.stringify({ votos }),
      });
      setNotas({});
      await load(); // recarrega ranking + estado de votação
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="app-shell">
      <Topbar />
      <main className="app-main">
        <Link to={`/equipa/${slug}`} className="back-link">
          ← {team?.nome || 'Equipa'}
        </Link>

        <h1 className="app-page-title">Ranking</h1>
        <p className="app-page-sub">Jogadores por média de avaliações recebidas.</p>

        {error && <div className="alert alert--error">{error}</div>}

        {loading ? (
          <p className="muted">A carregar ranking…</p>
        ) : ranking.length === 0 ? (
          <p className="muted">Ainda não há jogadores.</p>
        ) : (
          <>
            {/* Cabeçalho da votação */}
            {votacao && (
              jaVotei ? (
                <div
                  className="alert"
                  style={{ background: 'rgba(0,229,160,0.1)', border: '1px solid rgba(0,229,160,0.3)', color: 'var(--neon)' }}
                >
                  ✓ Já votaste no jogo "{votacao.game_label}". Abaixo vês as notas que deste.
                </div>
              ) : (
                <div className="aviso" style={{ marginTop: 0, marginBottom: 16 }}>
                  🗳️ Votação aberta — jogo "{votacao.game_label}". Avalia os jogadores de 1 a 5 estrelas.
                </div>
              )
            )}

            <div className="rank-list">
              {ranking.map((p, i) => {
                const temVotos = p.rating !== null;
                const votavel = votaveis.get(p.user_id);
                return (
                  <div className={`rank-row ${temVotos && i < 3 ? 'rank-row--top' : ''}`} key={p.user_id}>
                    <div className="rank-pos">{temVotos && i < 3 ? MEDALHAS[i] : i + 1}</div>
                    <div className="member-avatar">{initials(p.nome) || '?'}</div>
                    <div className="rank-info">
                      <div className="rank-name">{p.nome}</div>
                      <div className="rank-votes">
                        {p.votos} {p.votos === 1 ? 'voto' : 'votos'}
                      </div>

                      {/* Votação inline */}
                      {votavel && !jaVotei && (
                        <Estrelas valor={notas[p.user_id] || 0} onChange={(n) => setNota(p.user_id, n)} />
                      )}
                      {votavel && jaVotei && votavel.minhaNota != null && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12 }} className="muted">
                          A tua nota: <Estrelas valor={votavel.minhaNota} readOnly />
                        </span>
                      )}
                    </div>
                    {temVotos ? (
                      <div className="rank-score">★ {p.rating}</div>
                    ) : (
                      <div className="rank-score--none">sem votos</div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Botão de enviar votos */}
            {votacao && !jaVotei && (
              <button
                type="button"
                className="btn btn--primary"
                style={{ marginTop: 16 }}
                onClick={enviarVotos}
                disabled={busy || totalNotas === 0}
              >
                {busy ? 'A enviar…' : `Enviar votos (${totalNotas})`}
              </button>
            )}
          </>
        )}
      </main>
    </div>
  );
}
