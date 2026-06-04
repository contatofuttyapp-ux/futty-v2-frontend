// Futty v2.0 — Perfil do jogador: stats, posição, fotos campeão e radar
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { apiFetch } from '../lib/api';
import Topbar from '../components/Topbar';
import PlayerAvatar from '../components/PlayerAvatar';
import MediaStars from '../components/MediaStars';
import RadarChart from '../components/RadarChart';
import '../styles/app.css';

export default function JogadorPerfil() {
  const { slug, userId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    apiFetch(`/api/teams/${slug}/jogador/${userId}`)
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
  }, [slug, userId]);

  const jogador = data?.jogador;
  const radar = data?.radar;
  const jogosCampeao = data?.jogos_campeao || [];

  return (
    <div className="app-shell">
      <Topbar />
      <main className="app-main">
        <Link to={`/equipa/${slug}/ranking`} className="back-link">
          ← Ranking
        </Link>

        {error && <div className="alert alert--error">{error}</div>}

        {loading ? (
          <p className="muted">A carregar perfil…</p>
        ) : !jogador ? (
          !error && <p className="muted">Jogador não encontrado.</p>
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
              <PlayerAvatar nome={jogador.nome} avatarUrl={jogador.avatar_url} lg />
            </div>
            <h1 style={{ textAlign: 'center', fontSize: 24, marginBottom: 6 }}>{jogador.nome}</h1>

            <div className="profile-stats">
              <span>
                Média <b style={{ color: 'var(--neon)' }}>{jogador.media_votos > 0 ? jogador.media_votos.toFixed(2) : '--'}</b>
              </span>
              <span>
                Votos <b style={{ color: 'var(--purple)' }}>{jogador.votos}</b>
              </span>
              <span>
                Gols <b style={{ color: 'var(--neon)' }}>{jogador.gols}</b>
              </span>
              <span>
                Artilharia <b style={{ color: 'var(--purple)' }}>{jogador.artilharia}</b>
              </span>
              <span>
                Vitórias <b style={{ color: '#d4a017' }}>{jogador.vitorias}</b>
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}>
              <MediaStars value={jogador.media_votos} />
            </div>

            <div className="profile-card">
              {jogador.posicao != null ? (
                <p style={{ margin: '0 0 12px', fontSize: 14 }}>
                  Posição no ranking (média):{' '}
                  <strong style={{ color: 'var(--neon)' }}>#{jogador.posicao}</strong> de{' '}
                  {jogador.total_com_media || '--'} com média
                </p>
              ) : (
                <p className="muted" style={{ margin: '0 0 12px', fontSize: 13 }}>
                  Sem posição (ainda sem média).
                </p>
              )}

              {jogosCampeao.length ? (
                <div className="profile-photos">
                  {jogosCampeao.map((f, i) => (
                    <img key={i} src={f.foto} alt="" />
                  ))}
                </div>
              ) : (
                <p className="muted" style={{ fontSize: 13 }}>
                  Sem fotos de jogos como campeão.
                </p>
              )}

              <div className="radar-title" style={{ marginTop: 16 }}>
                Mapa de Performance
              </div>
              {radar && <RadarChart valores={radar} />}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
