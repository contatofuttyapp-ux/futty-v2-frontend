// Futty v2.0 — O link curto do sorteio, futtyapp.com.br/s/<código> (Rodada 29I, bloco 3, item 74 da Rodada 29). Sem login, como a vista
// pública: pergunta ao motor para onde o código leva (GET /api/s/:codigo) e abre a página de sempre, /p/<slug>/<id do jogo>, no lugar
// (replace: o "Voltar" do navegador não cai de novo aqui). O link longo continua valendo.
import { Link, Navigate, useParams } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import LoadingFutty from '../components/LoadingFutty';
import '../styles/app.css';

export default function SorteioCurto() {
  const { codigo } = useParams();
  const { data, loading, error } = useApi(`/api/s/${encodeURIComponent(codigo || '')}`);
  if (data?.slug && data?.gameId) return <Navigate to={`/p/${data.slug}/${data.gameId}`} replace />;
  if (loading && !error) return <LoadingFutty />;
  return (
    <div className="app-shell">
      <main className="app-main page-reveal" style={{ maxWidth: 480, textAlign: 'center', paddingTop: 40 }}>
        <p style={{ fontFamily: "'Rajdhani', sans-serif", fontWeight: 800, fontSize: 18, margin: '0 0 8px' }}>Esse sorteio não existe.</p>
        <p className="muted" style={{ fontSize: 13, margin: '0 0 18px' }}>Confira o link com quem mandou.</p>
        <Link to="/" className="btn btn--outline hud-corners-s" style={{ textDecoration: 'none' }}>Ir para o Futty</Link>
      </main>
    </div>
  );
}
