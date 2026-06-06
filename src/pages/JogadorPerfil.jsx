// Futty v2.0 — Perfil do jogador: header, conquistas, evolução da nota,
// estatísticas de carreira e histórico de jogos.
import { Link, useParams } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useApi } from '../hooks/useApi';
import PlayerAvatar from '../components/PlayerAvatar';
import TeamAvatar from '../components/TeamAvatar';
import Loading from '../components/Loading';
import '../styles/app.css';

const GOLD = '#d4a017';

// Badges de conquistas (emoji + cor por tipo).
const BADGES = [
  { key: 'campeao', emoji: '🏆', label: 'Campeão', cor: '#d4a017' },
  { key: 'artilheiro', emoji: '⚽', label: 'Artilheiro', cor: '#8b5cf6' },
  { key: 'destaque', emoji: '⭐', label: 'Destaque', cor: '#7c3aed' },
  { key: 'rodada', emoji: '🍺', label: 'Rodada', cor: '#f59e0b' },
];

// Estilo do badge de resultado por tipo.
const RESULTADO = {
  vitoria: { txt: 'V', cor: '#8b5cf6', bd: '#8b5cf6', bg: 'rgba(139,92,246,0.14)' },
  derrota: { txt: 'D', cor: '#fda4af', bd: '#ef4444', bg: 'rgba(239,68,68,0.14)' },
  empate: { txt: 'E', cor: 'var(--text-dim)', bd: '#333', bg: 'rgba(255,255,255,0.05)' },
};

function fmtCurto(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit' });
}
function fmtLongo(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('pt-PT', { weekday: 'short', day: 'numeric', month: 'short' });
}

function SecLabel({ children }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.12em', color: 'var(--text-dim)', textTransform: 'uppercase', margin: '22px 0 10px' }}>
      {children}
    </div>
  );
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#111', border: '1px solid #222', borderRadius: 8, padding: '6px 10px', fontSize: 12 }}>
      <div style={{ color: 'var(--text-dim)' }}>{label}</div>
      <div style={{ fontWeight: 800, color: GOLD }}>Nota {Number(payload[0].value).toFixed(1)}</div>
    </div>
  );
}

export default function JogadorPerfil() {
  const { slug, userId } = useParams();
  const { data, loading, error } = useApi(`/api/teams/${slug}/jogador/${userId}`);

  const team = data?.team;
  const jogador = data?.jogador;
  const conquistas = data?.conquistas || {};
  const historico = data?.historico || [];
  const evolucao = data?.evolucao || [];

  const chartData = evolucao.map((p) => ({ x: fmtCurto(p.data), nota: p.nota }));

  const stats = [
    { lbl: 'Jogos', val: conquistas.jogos_total ?? 0 },
    { lbl: 'Vitórias', val: conquistas.vitorias_total ?? 0 },
    { lbl: 'Gols', val: conquistas.gols_total ?? 0 },
    { lbl: 'Artilharias', val: conquistas.artilheiro ?? 0 },
    { lbl: 'Destaques', val: conquistas.destaque ?? 0 },
    { lbl: 'Rodadas', val: conquistas.rodada ?? 0 },
  ];

  return (
    <div className="app-shell">
      <main className="app-main" style={{ paddingLeft: 16, paddingRight: 16 }}>
        <Link to={`/equipa/${slug}/ranking`} className="back-link">← Voltar</Link>

        {error && <div className="alert alert--error">{error}</div>}

        {loading ? (
          <Loading text="A carregar perfil…" />
        ) : !jogador ? (
          !error && <p className="muted">Jogador não encontrado.</p>
        ) : (
          <>
            {/* 1. HEADER */}
            {team ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                <TeamAvatar team={team} size="sm" />
                <span style={{ fontSize: 13, color: 'var(--text-dim)', fontWeight: 700 }}>{team.nome}</span>
              </div>
            ) : null}

            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 12 }}>
              <PlayerAvatar nome={jogador.nome} avatarUrl={jogador.avatar_url} md gold />
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 24, fontWeight: 700, color: '#fff', lineHeight: 1.1 }}>
                  {jogador.nome}
                  {jogador.categoria === 'GR' ? (
                    <span style={{ fontSize: 10, fontWeight: 800, color: '#b69cff', border: '1px solid var(--purple)', borderRadius: 999, padding: '2px 6px', marginLeft: 8, verticalAlign: 'middle' }}>GR</span>
                  ) : null}
                </div>
                {jogador.posicao != null ? (
                  <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--neon)', marginTop: 2 }}>
                    #{jogador.posicao} no ranking
                  </div>
                ) : null}
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 28, fontWeight: 800, color: jogador.nota != null ? GOLD : 'var(--text-dim)', lineHeight: 1 }}>
                  {jogador.nota != null ? jogador.nota.toFixed(1) : '--'}
                </div>
                <div style={{ fontSize: 10, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Nota</div>
              </div>
            </div>

            {/* 2. CONQUISTAS */}
            <div style={{ display: 'flex', gap: 8, overflowX: 'auto', marginTop: 18, paddingBottom: 4 }}>
              {BADGES.map((b) => {
                const n = conquistas[b.key] ?? 0;
                const on = n > 0;
                return (
                  <div
                    key={b.key}
                    style={{
                      flexShrink: 0,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '6px 14px',
                      borderRadius: 20,
                      fontSize: 12,
                      fontWeight: 700,
                      whiteSpace: 'nowrap',
                      background: '#0c0c0c',
                      border: `1px solid ${b.cor}`,
                      color: b.cor,
                      opacity: on ? 1 : 0.35,
                      boxShadow: on ? `0 0 10px ${b.cor}55` : 'none',
                    }}
                  >
                    <span>{b.emoji}</span>
                    <span>{b.label} × {n}</span>
                  </div>
                );
              })}
            </div>

            {/* 3. EVOLUÇÃO DA NOTA */}
            <SecLabel>Evolução da nota</SecLabel>
            {chartData.length < 2 ? (
              <p className="muted" style={{ textAlign: 'center', fontSize: 13, padding: '12px 0' }}>
                Ainda poucos votos para mostrar evolução
              </p>
            ) : (
              <div style={{ width: '100%', height: 160 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 6, right: 12, bottom: 0, left: -18 }}>
                    <CartesianGrid vertical={false} stroke="#111" />
                    <XAxis dataKey="x" tick={{ fill: 'var(--text-dim)', fontSize: 11 }} axisLine={{ stroke: '#222' }} tickLine={false} />
                    <YAxis domain={[6, 10]} tick={{ fill: 'var(--text-dim)', fontSize: 11 }} axisLine={false} tickLine={false} width={28} />
                    <Tooltip content={<ChartTooltip />} cursor={{ stroke: '#333' }} />
                    <Line type="monotone" dataKey="nota" stroke={GOLD} strokeWidth={2} dot={{ r: 3, fill: GOLD }} activeDot={{ r: 5, fill: GOLD }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* 4. ESTATÍSTICAS */}
            <SecLabel>Estatísticas</SecLabel>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {stats.map((s) => (
                <div key={s.lbl} style={{ background: '#0c0c0c', border: '1px solid #1a1a1a', borderRadius: 10, padding: '12px 14px', display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 12, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.lbl}</span>
                  <span style={{ fontSize: 22, fontWeight: 900, color: 'var(--neon)' }}>{s.val}</span>
                </div>
              ))}
            </div>

            {/* 5. HISTÓRICO */}
            <SecLabel>Últimos jogos</SecLabel>
            {historico.length === 0 ? (
              <p className="muted" style={{ fontSize: 13 }}>Ainda sem jogos.</p>
            ) : (
              <div style={{ background: '#0c0c0c', border: '1px solid #1a1a1a', borderRadius: 10, overflow: 'hidden' }}>
                {historico.map((j, i) => {
                  const r = RESULTADO[j.resultado] || RESULTADO.empate;
                  return (
                    <div
                      key={j.game_id}
                      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderTop: i === 0 ? 'none' : '1px solid #1a1a1a' }}
                    >
                      <span style={{ width: 24, height: 24, flexShrink: 0, display: 'grid', placeItems: 'center', borderRadius: 6, fontSize: 12, fontWeight: 900, color: r.cor, border: `1px solid ${r.bd}`, background: r.bg }}>
                        {r.txt}
                      </span>
                      <span style={{ flex: 1, fontSize: 13, color: '#fff' }}>{fmtLongo(j.data)}</span>
                      <span style={{ display: 'flex', gap: 6, fontSize: 14 }}>
                        {j.foi_artilheiro ? <span title="Artilheiro">⚽</span> : null}
                        {j.foi_destaque ? <span title="Destaque">⭐</span> : null}
                        {j.foi_rodada ? <span title="Rodada de cerveja">🍺</span> : null}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
