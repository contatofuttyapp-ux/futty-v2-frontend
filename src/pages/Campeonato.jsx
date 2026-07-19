// Futty v2.0 — Campeonato (/equipa/:slug/campeonato): classificação, jornadas
// e gestão (admin). Confetti ao ver o campeão.
import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { apiFetch } from '../lib/api';
import { useApi } from '../hooks/useApi';
import { useTeam } from '../hooks/useTeam';
import { celebrarTop3 } from '../hooks/useConfetti';
import { nomeCampeao, textoJornada } from '../utils/campeonato';
import Topbar from '../components/Topbar';
import LoadingFutty from '../components/LoadingFutty';
import Toast from '../components/Toast';
import CampeonatoStandings from '../components/CampeonatoStandings';
import RegistarJornada from '../components/RegistarJornada';
import '../styles/app.css';

export default function Campeonato() {
  const { slug } = useParams();
  const { team } = useTeam(slug);
  const { data, loading, reload } = useApi(`/api/equipas/${slug}/campeonato`);
  const [toast, setToast] = useState(null);
  const [confirmTerminar, setConfirmTerminar] = useState(false);
  const [busy, setBusy] = useState(false);
  const celebrou = useRef(false);

  const isAdmin = team?.role === 'admin';
  const c = data?.campeonato || null;
  const jornadas = data?.jornadas || [];
  const terminado = c?.estado === 'terminado';

  // Confetti ao primeiro render do campeonato terminado.
  useEffect(() => {
    if (terminado && !celebrou.current) {
      celebrou.current = true;
      celebrarTop3(1);
    }
  }, [terminado]);

  async function terminar() {
    setConfirmTerminar(false);
    setBusy(true);
    try {
      await apiFetch(`/api/campeonato/${c.id}/terminar`, { method: 'POST' });
      await reload();
      setToast({ tipo: 'success', mensagem: 'Campeonato terminado.' });
    } catch (e) {
      setToast({ tipo: 'error', mensagem: e.message });
    } finally {
      setBusy(false);
    }
  }

  const podeRegistar = isAdmin && c && c.estado === 'ativo' && (c.jornadas_jogadas || 0) < c.num_jornadas;

  return (
    <div className="app-shell">
      <Topbar hud="CAMPEONATO" back={`/equipa/${slug}`} />
      <main className="app-main page-reveal">
        {loading ? (
          <LoadingFutty />
        ) : !c ? (
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.10)', clipPath: 'polygon(8px 0, calc(100% - 8px) 0, 100% 8px, 100% calc(100% - 8px), calc(100% - 8px) 100%, 8px 100%, 0 calc(100% - 8px), 0 8px)', textAlign: 'center', padding: '30px 16px' }}><div style={{ fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, fontSize: 16 }}>Este time ainda não tem campeonato</div><p className="muted" style={{ fontSize: 12, margin: '6px 0 0' }}>Os campeonatos internos chegam depois do sorteio novo (formatos: pontos corridos e mata-mata).</p></div>
        ) : (
          <>
            {/* Topo */}
            <h1 className="app-page-title" style={{ marginBottom: 4 }}>{c.nome}</h1>
            <span className={`badge badge--${terminado ? 'terminado' : 'sorteado'}`}>{terminado ? 'Terminado' : 'Em curso'}</span>

            {/* Banner do campeão */}
            {terminado ? (
              <div style={{ marginTop: 12, padding: '14px', clipPath: 'polygon(8px 0, calc(100% - 8px) 0, 100% 8px, 100% calc(100% - 8px), calc(100% - 8px) 100%, 8px 100%, 0 calc(100% - 8px), 0 8px)', background: 'rgba(212,160,23,0.1)', border: '1px solid rgba(212,160,23,0.4)', textAlign: 'center' }}>
                <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 20, fontWeight: 800, color: '#d4a017' }}>Campeão: {nomeCampeao(c)}</div>
                <button type="button" className="btn btn--ghost btn--sm" style={{ marginTop: 8 }} onClick={() => celebrarTop3(1)}>Celebrar</button>
              </div>
            ) : null}

            {/* Classificação */}
            <h2 className="section-title">Classificação</h2>
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.10)', clipPath: 'polygon(8px 0, calc(100% - 8px) 0, 100% 8px, 100% calc(100% - 8px), calc(100% - 8px) 100%, 8px 100%, 0 calc(100% - 8px), 0 8px)', padding: '10px' }}>
              <CampeonatoStandings campeonato={c} />
            </div>

            {/* Registar jornada (admin) */}
            {podeRegistar ? (
              <>
                <h2 className="section-title">Registar jornada {(c.jornadas_jogadas || 0) + 1} de {c.num_jornadas}</h2>
                <RegistarJornada campeonato={c} onSaved={reload} showToast={(mensagem, tipo = 'success') => setToast({ mensagem, tipo })} />
              </>
            ) : null}

            {/* Jornadas jogadas */}
            <h2 className="section-title">Jornadas</h2>
            {jornadas.length === 0 ? (
              <p className="muted" style={{ fontSize: 13 }}>Ainda não há jornadas registadas.</p>
            ) : (
              <div style={{ display: 'grid', gap: 8 }}>
                {jornadas.map((j) => (
                  <div key={j.id} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.10)', clipPath: 'polygon(8px 0, calc(100% - 8px) 0, 100% 8px, 100% calc(100% - 8px), calc(100% - 8px) 100%, 8px 100%, 0 calc(100% - 8px), 0 8px)', padding: '10px 12px', fontSize: 13, color: '#fff' }}>
                    <span style={{ color: 'var(--label-color)', fontWeight: 700 }}>Jornada {j.numero}</span> · {textoJornada(j, c)}
                  </div>
                ))}
              </div>
            )}

            {/* Terminar (admin) */}
            {isAdmin && c.estado === 'ativo' ? (
              <button type="button" className="btn btn--ghost btn--sm" style={{ marginTop: 16, borderColor: 'var(--danger)', color: '#fda4af' }} disabled={busy} onClick={() => setConfirmTerminar(true)}>
                Terminar campeonato antecipadamente
              </button>
            ) : null}
          </>
        )}
      </main>

      {confirmTerminar ? (
        <div className="modal-overlay" role="presentation" onClick={() => setConfirmTerminar(false)}>
          <div className="modal-card" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <div className="modal-card__inner">
              <p style={{ fontSize: 15, marginBottom: 16 }}>Terminar o campeonato agora? O campeão é decidido pelos pontos atuais.</p>
              <button type="button" className="btn btn--primary" style={{ width: '100%', background: 'var(--danger)', color: '#fff' }} onClick={terminar}>Terminar</button>
              <button type="button" className="btn btn--ghost btn--sm" style={{ width: '100%', marginTop: 10 }} onClick={() => setConfirmTerminar(false)}>Cancelar</button>
            </div>
          </div>
        </div>
      ) : null}

      {toast ? <Toast mensagem={toast.mensagem} tipo={toast.tipo} onClose={() => setToast(null)} /> : null}
    </div>
  );
}
