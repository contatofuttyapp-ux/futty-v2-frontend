// Futty v2.0 — Vista PÚBLICA do sorteio (/p/:slug/:gameId), sem login.
// SPEC-SORTEIO §9: o LINK partilhado reproduz a MESMA cerimónia (seed persistida)
// a quem o abrir — a montra do Futty: animação + marca + CTA "cria o teu grupo".
// (A página antiga de listas morreu, substituída por esta.)
import { Link, useParams } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import FuttyLogo from '../components/FuttyLogo';
import LoadingFutty from '../components/LoadingFutty';
import CerimoniaSorteio from '../components/CerimoniaSorteio';
import SeletorIdiomaDiscreto from '../components/SeletorIdiomaDiscreto';
import '../styles/app.css';

const RAJ = "'Rajdhani', sans-serif";

export default function SorteioPublico() {
  const { gameId } = useParams();
  const { data, loading } = useApi(`/api/p/${gameId}`);
  const resultado = data?.times_resultado;
  const res = data?.resultado;

  return (
    <div className="app-shell">
      <main className="app-main page-reveal" style={{ maxWidth: 480, paddingTop: 18, position: 'relative' }}>
        <SeletorIdiomaDiscreto style={{ position: 'absolute', top: 0, right: 16 }} />
        {/* marca no topo — isto é a montra */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 4 }}>
          <FuttyLogo variant="flat" size={30} />
          <span style={{ fontFamily: RAJ, fontWeight: 800, fontSize: 20, letterSpacing: '0.12em', color: '#f0c94a' }}>FUTTY</span>
        </div>
        <p style={{ fontFamily: RAJ, fontSize: 13, letterSpacing: '0.08em', color: 'var(--text-dim)', textAlign: 'center', margin: '0 0 14px', textTransform: 'uppercase' }}>
          {data?.equipa?.nome || 'Sorteio'} · sorteio dos times
        </p>

        {loading ? (
          <LoadingFutty />
        ) : !resultado ? (
          <p className="muted" style={{ textAlign: 'center' }}>Este sorteio ainda não aconteceu.</p>
        ) : (
          <>
            <CerimoniaSorteio resultado={resultado} />

            {/* resultado do jogo, se já houver */}
            {res?.nivel >= 2 ? (
              <div style={{ marginTop: 14, padding: '12px 14px', clipPath: 'polygon(8px 0, calc(100% - 8px) 0, 100% 8px, 100% calc(100% - 8px), calc(100% - 8px) 100%, 8px 100%, 0 calc(100% - 8px), 0 8px)', background: 'rgba(212,160,23,0.08)', border: '1px solid rgba(212,160,23,0.3)', textAlign: 'center', fontFamily: RAJ, fontWeight: 800, fontSize: 20 }}>
                {resultado.times?.[0]?.nome} <span style={{ color: '#d4a017' }}>{res.placar_a} × {res.placar_b}</span> {resultado.times?.[1]?.nome}
              </div>
            ) : null}
          </>
        )}

        {/* CTA — a razão de esta página existir */}
        <div style={{ marginTop: 22, textAlign: 'center' }}>
          <p style={{ fontSize: 12, color: 'var(--text-dim)', margin: '0 0 10px' }}>A tua pelada também merece isto.</p>
          <Link to="/register" className="btn hud-corners-s cta-gold" style={{ display: 'inline-flex', fontFamily: RAJ, letterSpacing: '0.1em', textTransform: 'uppercase', textDecoration: 'none', padding: '13px 26px' }}>
            Cria o teu grupo no Futty
          </Link>
        </div>
      </main>
    </div>
  );
}
