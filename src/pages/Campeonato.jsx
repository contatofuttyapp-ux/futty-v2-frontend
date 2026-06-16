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
import Loading from '../components/Loading';
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
      <Topbar title="Campeonato" back={`/equipa/${slug}`} />
      <main className="app-main">
        {loading ? (
          <Loading text="Carregando…" />
        ) : !c ? (
          <p className="muted">Este time ainda não tem campeonato.</p>
        ) : (
          <>
            {/* Topo */}
            <h1 className="app-page-title" style={{ marginBottom: 4 }}>{c.nome}</h1>
            <span className={`badge badge--${terminado ? 'terminado' : 'sorteado'}`}>{terminado ? 'Terminado' : 'Em curso'}</span>

            {/* Banner do campeão */}
            {terminado ? (
              <div style={{ marginTop: 12, padding: '14px', borderRadius: 'var(--radius-md)', background: 'rgba(212,160,23,0.1)', border: '1px solid rgba(212,160,23,0.4)', textAlign: 'center' }}>
                <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 20, fontWeight: 800, color: '#d4a017' }}>🏆 Campeão: {nomeCampeao(c)}</div>
                <button type="button" className="btn btn--ghost btn--sm" style={{ marginTop: 8 }} onClick={() => celebrarTop3(1)}>🎉 Celebrar</button>
              </div>
            ) : null}

            {/* Classificação */}
            <h2 className="section-title">Classificação</h2>
            <div style={{ background: 'var(--surface-1)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: 'var(--space-sm)' }}>
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
                  <div key={j.id} style={{ background: 'var(--surface-1)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '10px 12px', fontSize: 13, color: '#fff' }}>
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
