// Futty v2.0 — As estatísticas do time, no Ranking, para o admin.

import { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/api';
import { contar, plural } from '../../utils/plural';
import { nomeExibicao } from '../../utils/nomeExibicao';
import LoadingFutty from '../../components/LoadingFutty';
import PlayerAvatar from '../../components/PlayerAvatar';
import { lbl } from '../../components/camposDoAdmin';
import { CARD, nomeForte } from './comum';

// ─── TAB: ESTATÍSTICAS ───────────────────────────────────────────────────────
function BarraProgresso({ valor, max }) {
  const pct = max > 0 ? Math.round((valor / max) * 100) : 0;
  return (
    <div style={{ height: 6, background: '#222', borderRadius: 999, overflow: 'hidden', marginTop: 4 }}>
      <div style={{ width: `${pct}%`, height: '100%', background: 'var(--neon)' }} />
    </div>
  );
}

function TabEstatisticas({ slug, membrosBasicos, showToast }) {
  const [membros, setMembros] = useState(null);
  const [games, setGames] = useState([]);

  useEffect(() => {
    let ativo = true;
    apiFetch(`/api/teams/${slug}/membros`)
      .then((d) => ativo && setMembros(d.membros || []))
      .catch((e) => ativo && (setMembros([]), showToast(e.message, 'error')));
    apiFetch(`/api/teams/${slug}/games`).then((d) => ativo && setGames(d.games || [])).catch(() => {});
    return () => {
      ativo = false;
    };
  }, [slug, showToast]);

  if (membros === null) return <LoadingFutty />;

  const topGols = [...membros].sort((a, b) => (b.gols || 0) - (a.gols || 0)).slice(0, 5);
  const maxGols = topGols[0]?.gols || 0;
  // "Presença" é presença — os jogos em que a pessoa ESTEVE, ordenado por isso.
  const topPresenca = [...membros].sort((a, b) => (b.presencas || 0) - (a.presencas || 0)).slice(0, 5);
  const totalGols = membros.reduce((s, m) => s + (m.gols || 0), 0);
  const jogoMaisConf = [...games].sort((a, b) => (b.confirmados || 0) - (a.confirmados || 0))[0] || null;
  const maisAntigo = [...(membrosBasicos || [])].sort((a, b) => new Date(a.created_at) - new Date(b.created_at))[0] || null;

  return (
    <div style={{ display: 'grid', gap: 18 }}>
      {/* Top Jogadores (por gols) */}
      <div>
        <div className="games-label">Top jogadores</div>
        <div style={{ display: 'grid', gap: 10 }}>
          {topGols.map((m) => (
            <div key={m.user_id} style={{ ...CARD, padding: 12, display: 'flex', gap: 10, alignItems: 'center' }}>
              <PlayerAvatar nome={nomeExibicao(m)} avatarUrl={m.avatar_url} userId={m.user_id} avatarGenerico={m.avatar_generico} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={nomeForte}>{nomeExibicao(m)}</div>
                <BarraProgresso valor={m.gols || 0} max={maxGols} />
                <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 4 }}>
                  <b style={{ color: 'var(--neon)' }}>{m.gols || 0}</b> {plural(m.gols || 0, 'gol', 'gols')} · {contar(m.vitorias || 0, 'vitória', 'vitórias')} · {m.artilharia || 0} artilharia
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Presença (por jogos em que a pessoa esteve) */}
      <div>
        <div className="games-label">Presença</div>
        <div style={{ display: 'grid', gap: 8 }}>
          {topPresenca.map((m) => (
            <div key={m.user_id} style={{ ...CARD, padding: 10, display: 'flex', gap: 10, alignItems: 'center' }}>
              <PlayerAvatar nome={nomeExibicao(m)} avatarUrl={m.avatar_url} userId={m.user_id} avatarGenerico={m.avatar_generico} />
              <div style={{ flex: 1, fontWeight: 700, color: '#fff' }}>{nomeExibicao(m)}</div>
              <div style={{ fontSize: 13, color: 'var(--neon)', fontWeight: 800 }}>{m.presencas || 0} {plural(m.presencas || 0, 'presença', 'presenças')}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Visão geral */}
      <div>
        <div className="games-label">Visão geral</div>
        <div style={{ ...CARD, padding: 14, display: 'grid', gap: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={lbl}>Total de gols</span><b style={{ color: '#fff' }}>{totalGols}</b></div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
            <span style={lbl}>Jogo com mais confirmações</span>
            <b style={{ color: '#fff', textAlign: 'right' }}>{jogoMaisConf ? `${jogoMaisConf.local || 'Jogo'} (${jogoMaisConf.confirmados || 0})` : '-'}</b>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
            <span style={lbl}>Membro mais antigo</span>
            <b style={{ color: '#fff', textAlign: 'right' }}>{maisAntigo ? maisAntigo.nome || maisAntigo.email : '-'}</b>
          </div>
        </div>
      </div>
    </div>
  );
}

export { TabEstatisticas };
