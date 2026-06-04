// Futty v2.0 — Perfil do jogador: avatar com glow, stats, posição, fotos e radar
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { apiFetch, assetUrl } from '../lib/api';
import Topbar from '../components/Topbar';
import PlayerAvatar from '../components/PlayerAvatar';
import MediaStars from '../components/MediaStars';
import RadarChart from '../components/RadarChart';
import '../styles/app.css';

const TIPO_LABEL = { vitoria: 'Campeão', artilharia: 'Artilheiro', destaque: 'Destaque' };

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
  const galeria = data?.jogos_campeao || [];

  const stats = jogador
    ? [
        { lbl: 'Média', val: jogador.media_votos > 0 ? jogador.media_votos.toFixed(2) : '--', cor: 'var(--neon)' },
        { lbl: 'Votos', val: jogador.votos, cor: 'var(--purple)' },
        { lbl: 'Gols', val: jogador.gols, cor: 'var(--neon)' },
        { lbl: 'Artilharia', val: jogador.artilharia, cor: 'var(--purple)' },
        { lbl: 'Vitórias', val: jogador.vitorias, cor: '#d4a017' },
      ]
    : [];

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
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: 8 }}>
              <PlayerAvatar nome={jogador.nome} avatarUrl={jogador.avatar_url} lg />
            </div>
            <h1 className="profile-name">{jogador.nome}</h1>
            {jogador.is_goleiro && <p className="profile-sub">🧤 Goleiro</p>}

            <div className="profile-media">
              <MediaStars value={jogador.media_votos} size={26} />
            </div>

            <div className="stat-grid">
              {stats.map((s) => (
                <div className="stat-chip" key={s.lbl}>
                  <div className="stat-chip__val" style={{ color: s.cor }}>
                    {s.val}
                  </div>
                  <div className="stat-chip__lbl">{s.lbl}</div>
                </div>
              ))}
            </div>

            {jogador.posicao != null ? (
              <p className="profile-rank-pos">
                Posição no ranking (média):{' '}
                <strong style={{ color: 'var(--neon)' }}>#{jogador.posicao}</strong> de{' '}
                {jogador.total_com_media || '--'} com média
              </p>
            ) : (
              <p className="profile-rank-pos muted">Sem posição (ainda sem média).</p>
            )}

            {galeria.length > 0 && (
              <div className="profile-card">
                <div className="radar-title" style={{ marginBottom: 12 }}>
                  🏆 Galeria de Vitórias 🏆
                </div>
                <div className="profile-photos">
                  {galeria.map((f, i) => {
                    const label = TIPO_LABEL[f.tipo] || 'Campeão';
                    return (
                      <figure className="gallery-item" key={i}>
                        <img src={assetUrl(f.foto)} alt={label} />
                        <figcaption className={`gallery-tag gallery-tag--${f.tipo || 'vitoria'}`}>
                          {label}
                        </figcaption>
                      </figure>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="profile-card">
              <div className="radar-title">Mapa de Performance</div>
              {radar && (
                <div className="radar-wrap">
                  <RadarChart valores={radar} />
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
