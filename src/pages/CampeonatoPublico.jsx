// Futty v2.0 — Vista pública do campeonato (Vaga 11B): o link partilhável.
// Sem login. Marca FUTTY + tabela/bracket + campeão celebrado + CTA de registo.
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { apiFetch } from '../lib/api';
import FuttyLogo from '../components/FuttyLogo';
import LoadingFutty from '../components/LoadingFutty';
import { CampeonatoTabela, CampeonatoBracket, CampeonatoCelebracao, CampeonatoPlanteis } from '../components/CampeonatoVistas';
import SeletorIdiomaDiscreto from '../components/SeletorIdiomaDiscreto';
import '../styles/app.css';

const RAJ = "'Rajdhani', sans-serif";

export default function CampeonatoPublico() {
  const { slug, id } = useParams();
  const [data, setData] = useState(null);
  const [erro, setErro] = useState('');

  useEffect(() => {
    let ativo = true;
    apiFetch(`/api/p/campeonato/${slug}/${id}`)
      .then((d) => ativo && setData(d))
      .catch((e) => ativo && setErro(e.message));
    return () => { ativo = false; };
  }, [slug, id]);

  return (
    <div className="app-shell" style={{ minHeight: '100svh', position: 'relative' }}>
      <SeletorIdiomaDiscreto style={{ position: 'absolute', top: 10, right: 14, zIndex: 5 }} />
      <AuroraHeader nome={data?.equipa?.nome} />
      <main className="app-main" style={{ padding: '10px 14px 40px', maxWidth: 460, margin: '0 auto' }}>
        {erro ? (
          <div className="alert alert--error hud-corners">{erro}</div>
        ) : !data ? (
          <LoadingFutty />
        ) : (
          <>
            {(() => {
              const camp = data.campeonato;
              const terminado = camp.estado === 'terminado';
              return (
                <>
                  <div className="camp-title">{camp.nome}</div>
                  <div className="row" style={{ margin: '4px 0 14px' }}>
                    <span className={`camp-chip ${camp.formato === 'mata' ? 'camp-chip--roxo' : 'camp-chip--gold'}`}>{camp.formato === 'mata' ? 'Mata-mata' : 'Pontos corridos'}</span>
                    <span className={`camp-chip ${terminado ? 'camp-chip--gold' : 'camp-chip--live'}`}>{terminado ? 'Terminado' : 'Em curso'}</span>
                    <span className="camp-chip">{camp.times.length} times</span>
                  </div>
                  {terminado ? <CampeonatoCelebracao campeonato={camp} slug={slug} /> : null}
                  <div className="section-title">{camp.formato === 'mata' ? 'Chaveamento' : terminado ? 'Classificação final' : 'Classificação'}</div>
                  {camp.formato === 'mata' ? <CampeonatoBracket campeonato={camp} admin={false} /> : <CampeonatoTabela campeonato={camp} />}
                  {(camp.times || []).some((t) => (t.jogadores || []).length) ? (
                    <>
                      <div className="section-title">Times &amp; plantéis</div>
                      <CampeonatoPlanteis campeonato={camp} />
                    </>
                  ) : null}
                </>
              );
            })()}
            <Link to="/register" className="btn hud-corners cta-gold" style={{ display: 'flex', marginTop: 24, textDecoration: 'none' }}>Cria o teu grupo no Futty</Link>
          </>
        )}
      </main>
    </div>
  );
}

function AuroraHeader({ nome }) {
  return (
    <header style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 16px 8px', maxWidth: 460, margin: '0 auto', width: '100%' }}>
      <FuttyLogo variant="flat" size={34} />
      <div>
        <div style={{ fontFamily: RAJ, fontWeight: 800, fontSize: 18, color: '#f0c94a', letterSpacing: '.06em' }}>FUTTY</div>
        {nome ? <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>{nome} · campeonato</div> : null}
      </div>
    </header>
  );
}
