// Futty v2.0 — Lista de jogos do time. O corpo é o components/ListaDeJogos.jsx — o MESMO da aba Jogos
// da página do time. "Voltar" volta para onde a pessoa estava (histórico); sem histórico, a página do
// time.
import { Link, useParams } from 'react-router-dom';
import { useTeamGames } from '../hooks/useTeam';
import Topbar from '../components/Topbar';
import LoadingFutty from '../components/LoadingFutty';
import ListaDeJogos from '../components/ListaDeJogos';
import '../styles/app.css';

export default function Jogos() {
  const { slug } = useParams();
  const { team, games, loading, error } = useTeamGames(slug);
  const isAdmin = team?.role === 'admin';

  return (
    <div className="app-shell">
      <Topbar hud="JOGOS" back="voltar" backFallback={`/time/${slug}?aba=jogos`} />
      <main className="app-main page-reveal">
        {isAdmin && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
            <Link to={`/time/${slug}/jogo/novo`} className="btn btn--sm hud-corners-s cta-gold" style={{ fontFamily: "'Rajdhani', sans-serif", letterSpacing: '0.08em', textTransform: 'uppercase', textDecoration: 'none' }}>
              + Novo jogo
            </Link>
          </div>
        )}

        {error && <div className="alert alert--error" style={{ marginTop: 4 }}>{error}</div>}

        {loading ? <LoadingFutty /> : <ListaDeJogos slug={slug} team={team} games={games} vazio={isAdmin ? 'Marque o primeiro e chame o time.' : 'Espere um admin agendar um jogo.'} />}
      </main>
    </div>
  );
}
