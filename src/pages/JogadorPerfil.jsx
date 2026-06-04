// Futty v2.0 — Perfil do jogador: avatar com glow, stats, posição, fotos e radar
import { Link, useParams } from 'react-router-dom';
import { assetUrl } from '../lib/api';
import { useApi } from '../hooks/useApi';
import { formatRating } from '../utils/format';
import Topbar from '../components/Topbar';
import Loading from '../components/Loading';
import PlayerAvatar from '../components/PlayerAvatar';
import RatingStars from '../components/RatingStars';
import RadarChart from '../components/RadarChart';
import '../styles/app.css';

const TIPO_LABEL = { vitoria: 'Campeão', artilharia: 'Artilheiro', destaque: 'Destaque' };

export default function JogadorPerfil() {
  const { slug, userId } = useParams();
  const { data, loading, error } = useApi(`/api/teams/${slug}/jogador/${userId}`);

  const jogador = data?.jogador;
  const radar = data?.radar;
  const galeria = data?.jogos_campeao || [];

  // Só a Média é verde (rating); o resto em branco.
  const stats = jogador
    ? [
        { lbl: 'Média', val: formatRating(jogador.media_votos), cor: 'var(--neon)' },
        { lbl: 'Votos', val: jogador.votos, cor: 'var(--text)' },
        { lbl: 'Gols', val: jogador.gols, cor: 'var(--text)' },
        { lbl: 'Artilharia', val: jogador.artilharia, cor: 'var(--text)' },
        { lbl: 'Vitórias', val: jogador.vitorias, cor: 'var(--text)' },
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
          <Loading text="A carregar perfil…" />
        ) : !jogador ? (
          !error && <p className="muted">Jogador não encontrado.</p>
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: 8 }}>
              <PlayerAvatar nome={jogador.nome} avatarUrl={jogador.avatar_url} lg glow />
            </div>
            <h1 className="profile-name">{jogador.nome}</h1>
            {jogador.is_goleiro && <p className="profile-sub">🧤 Goleiro</p>}

            <div className="profile-media">
              <RatingStars value={jogador.media_votos} size={26} />
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
