// Futty v2.0 — Vista PÚBLICA do sorteio (/p/:slug/:gameId), sem login.
// SPEC-SORTEIO §9: o LINK partilhado reproduz a MESMA cerimónia (seed persistida)
// a quem o abrir — a montra do Futty: animação + marca + CTA "cria o teu grupo".
// (A página antiga de listas morreu, substituída por esta.)
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import { estadoSorteio } from '../utils/estadoSorteio';
import { visaoDoSorteio } from '../utils/seloDoSorteio';
import { quandoOndeDoJogo } from '../utils/quandoOndeDoJogo';
import { nomeDoTimeNaTela } from '../utils/nomeDoTime';
import FuttyLogo from '../components/FuttyLogo';
import LoadingFutty from '../components/LoadingFutty';
import CerimoniaSorteio from '../components/CerimoniaSorteio';
import DrawnTeams from '../components/DrawnTeams';
import '../styles/app.css';

const RAJ = "'Rajdhani', sans-serif";

export default function SorteioPublico() {
  const { gameId } = useParams();
  // `error` tem de sair distinto de "ainda não aconteceu" — mesma regra do SorteioShow (a página com
  // login).
  const { data, loading, error, reload } = useApi(`/api/p/${gameId}`);
  const resultado = data?.times_resultado;
  const res = data?.resultado;
  const estado = estadoSorteio({ loading, error, resultado });
  const visao = visaoDoSorteio(resultado);
  // A página mostra quando e onde é o jogo: é o que quem recebe o link no grupo foi ali procurar.
  const quandoOnde = quandoOndeDoJogo(data?.jogo, data?.equipa);
  // Quem chega pelo link do grupo quer ver os times, não assistir a cerimônia inteira (+20s). Aqui o
  // resultado já vem montado; "Ver sorteio" é a cerimônia, pra quem quiser.
  const [verCerimonia, setVerCerimonia] = useState(false);

  return (
    <div className="app-shell">
      <main className="app-main page-reveal" style={{ maxWidth: 480, paddingTop: 18, position: 'relative' }}>
        {/* marca no topo — isto é a montra */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 4 }}>
          <FuttyLogo variant="icone" size={30} />
          <span style={{ fontFamily: RAJ, fontWeight: 800, fontSize: 20, letterSpacing: '0.12em', color: '#f0c94a' }}>FUTTY</span>
        </div>
        <p style={{ fontFamily: RAJ, fontSize: 13, letterSpacing: '0.08em', color: 'var(--text-dim)', textAlign: 'center', margin: '0 0 14px', textTransform: 'uppercase' }}>
          {data?.equipa?.nome || 'Sorteio'} · sorteio dos times
        </p>
        {quandoOnde ? (
          <p style={{ fontFamily: RAJ, fontSize: 13, color: 'var(--text-dim)', textAlign: 'center', margin: '-8px 0 14px' }}>{quandoOnde}</p>
        ) : null}

        {estado === 'carregando' ? (
          <LoadingFutty />
        ) : estado === 'erro' ? (
          <div style={{ textAlign: 'center' }}>
            <div className="alert alert--error">{error}</div>
            <button type="button" className="btn btn--outline hud-corners-s" style={{ marginTop: 12 }} onClick={reload}>
              Tentar de novo
            </button>
          </div>
        ) : estado === 'nao_feito' ? (
          <p className="muted" style={{ textAlign: 'center' }}>Este sorteio ainda não aconteceu.</p>
        ) : (
          <>
            {verCerimonia ? (
              <CerimoniaSorteio resultado={visao?.daRoleta || resultado} selo={visao?.selo} ajuste={visao?.ajuste} final={visao?.ajuste ? visao.final : null} />
            ) : (
              <>
                <DrawnTeams resultado={resultado} teamCor={data?.equipa?.cor} />
                <button type="button" className="btn btn--outline hud-corners-s" style={{ width: '100%', marginTop: 14 }} onClick={() => setVerCerimonia(true)}>
                  Ver sorteio
                </button>
              </>
            )}

            {/* resultado do jogo, se já houver */}
            {res?.nivel >= 2 ? (
              <div style={{ marginTop: 14, padding: '12px 14px', clipPath: 'polygon(8px 0, calc(100% - 8px) 0, 100% 8px, 100% calc(100% - 8px), calc(100% - 8px) 100%, 8px 100%, 0 calc(100% - 8px), 0 8px)', background: 'rgba(212,160,23,0.08)', border: '1px solid rgba(212,160,23,0.3)', textAlign: 'center', fontFamily: RAJ, fontWeight: 800, fontSize: 20 }}>
                {nomeDoTimeNaTela(resultado.times?.[0]?.nome, 0)} <span style={{ color: '#d4a017' }}>{res.placar_a} × {res.placar_b}</span> {nomeDoTimeNaTela(resultado.times?.[1]?.nome, 1)}
              </div>
            ) : null}
          </>
        )}

        {/* CTA — a razão de esta página existir */}
        <div style={{ marginTop: 22, textAlign: 'center' }}>
          <p style={{ fontSize: 12, color: 'var(--text-dim)', margin: '0 0 10px' }}>O seu time também merece isto.</p>
          <Link to="/register" className="btn hud-corners-s cta-gold" style={{ display: 'inline-flex', fontFamily: RAJ, letterSpacing: '0.1em', textTransform: 'uppercase', textDecoration: 'none', padding: '13px 26px' }}>
            Crie o seu time no Futty
          </Link>
        </div>
      </main>
    </div>
  );
}
