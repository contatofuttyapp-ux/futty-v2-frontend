// Futty v2.0 — O campeonato do time, na aba JOGOS do admin.

import { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/api';
import LoadingFutty from '../../components/LoadingFutty';
import { secLbl } from '../../components/camposDoAdmin';
import RegistarJornada from '../../components/RegistarJornada';
import CriarCampeonato from '../../components/CriarCampeonato';
import { nomeCampeao } from '../../utils/campeonato';
import { CARD } from './comum';
import { ConfirmModal } from './pecas';

// ─── TAB: CAMPEONATO ─────────────────────────────────────────────────────────
function TabCampeonato({ slug, team, navigate, showToast }) {
  const [data, setData] = useState(undefined); // undefined = loading
  const [busy, setBusy] = useState(false);
  const [confirmTerminar, setConfirmTerminar] = useState(false);

  useEffect(() => {
    let ativo = true;
    apiFetch(`/api/equipas/${slug}/campeonato`)
      .then((d) => ativo && setData(d))
      .catch((e) => ativo && (setData({ campeonato: null }), showToast(e.message, 'error')));
    return () => {
      ativo = false;
    };
  }, [slug, showToast]);

  function recarregar() {
    return apiFetch(`/api/equipas/${slug}/campeonato`)
      .then((d) => setData(d))
      .catch((e) => showToast(e.message, 'error'));
  }

  async function terminar() {
    setConfirmTerminar(false);
    setBusy(true);
    try {
      await apiFetch(`/api/campeonato/${data.campeonato.id}/terminar`, { method: 'POST' });
      await recarregar();
      showToast('Campeonato terminado.');
    } catch (e) {
      showToast(e.message, 'error');
    } finally {
      setBusy(false);
    }
  }

  if (data === undefined) return <LoadingFutty />;
  const c = data.campeonato;

  // C) TERMINADO
  if (c && c.estado === 'terminado') {
    return (
      <div style={{ display: 'grid', gap: 14 }}>
        <div style={{ ...CARD, padding: 14, textAlign: 'center' }}>
          <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 18, fontWeight: 800, color: '#d4a017' }}>{c.nome} terminou</div>
          <div style={{ color: '#fff', marginTop: 4 }}>Campeão: <b>{nomeCampeao(c)}</b></div>
        </div>
        <button type="button" className="btn btn--purple btn--sm" onClick={() => setData({ campeonato: null })}>Criar novo campeonato</button>
        <button type="button" className="btn btn--ghost btn--sm" onClick={() => navigate(`/time/${slug}/campeonato`)}>Ver detalhes →</button>
      </div>
    );
  }

  // B) ATIVO
  if (c) {
    return (
      <div style={{ display: 'grid', gap: 14 }}>
        <div style={{ ...CARD, padding: 14 }}>
          <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 16, fontWeight: 800, color: '#fff' }}>{c.nome}</div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 8, color: '#fff', fontWeight: 700 }}>
            <span>{c.time_a_nome}</span>
            <span style={{ color: '#d4a017', fontSize: 18 }}>{c.time_a_pontos}</span>
            <span style={{ color: 'var(--text-dim)' }}>pts vs</span>
            <span style={{ color: '#d4a017', fontSize: 18 }}>{c.time_b_pontos}</span>
            <span>{c.time_b_nome}</span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-dim)', textAlign: 'center', marginTop: 4 }}>Jornada {c.jornadas_jogadas} de {c.num_jornadas}</div>
        </div>

        {c.jornadas_jogadas < c.num_jornadas ? (
          <div style={{ ...CARD, padding: 14 }}>
            <div style={secLbl}>Registrar resultado</div>
            <div style={{ marginTop: 10 }}>
              <RegistarJornada campeonato={c} onSaved={recarregar} showToast={showToast} />
            </div>
          </div>
        ) : null}

        <button type="button" className="btn btn--ghost btn--sm" onClick={() => navigate(`/time/${slug}/campeonato`)}>Ver detalhes →</button>
        <button type="button" className="btn btn--ghost btn--sm" style={{ borderColor: 'var(--danger)', color: '#fda4af' }} disabled={busy} onClick={() => setConfirmTerminar(true)}>
          Terminar campeonato antecipadamente
        </button>

        {confirmTerminar ? (
          <ConfirmModal texto="Terminar o campeonato agora? O campeão é decidido pelos pontos atuais." perigo confirmarLabel="Terminar" onConfirm={terminar} onCancel={() => setConfirmTerminar(false)} />
        ) : null}
      </div>
    );
  }

  // A) SEM CAMPEONATO ANTIGO (de 2 times): a escolha de onde vêm os times do campeonato novo. O formulário antigo (nome, nº de
  // jornadas, Time A × Time B) saiu daqui; o painel dos já criados (B e C acima) continua.
  return (
    <div style={{ ...CARD, padding: 14 }} data-painel-criar-campeonato>
      <CriarCampeonato
        slug={slug}
        team={team}
        aoCriado={(c) => navigate(`/time/${slug}/campeonato/${c.id}`)}
        aoMontarAMao={() => navigate(`/time/${slug}/campeonato?novo=manual`)}
      />
    </div>
  );
}

export { TabCampeonato };
