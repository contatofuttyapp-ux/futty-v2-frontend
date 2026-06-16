// Futty v2.0 — Painel super-admin (/super?tab=...). Só super-admins (protegido
// por SuperAdminGuard). Gestão global: utilizadores, equipas e métricas.
import { useCallback, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { apiFetch } from '../lib/api';
import { useApi } from '../hooks/useApi';
import '../styles/app.css';

const CARD = { background: '#111111', border: '1px solid #222222', borderRadius: 12 };
const PLANOS = ['free', 'pro', 'elite'];
const TABS = [
  { k: 'users', label: 'Utilizadores' },
  { k: 'teams', label: 'Equipas' },
  { k: 'stats', label: 'Stats' },
];
const PAGE_SIZE = 50;

const btn = {
  padding: '6px 10px',
  borderRadius: 8,
  border: '1px solid #2a2a2a',
  background: '#0c0c0c',
  color: '#fff',
  fontSize: 12,
  fontWeight: 700,
  cursor: 'pointer',
};
const th = { textAlign: 'left', padding: '8px 10px', fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid #222' };
const td = { padding: '8px 10px', fontSize: 13, borderBottom: '1px solid #1a1a1a', verticalAlign: 'middle' };

function fmtData(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function MetricCard({ valor, label }) {
  return (
    <div style={{ ...CARD, padding: 18, textAlign: 'center' }}>
      <div style={{ fontSize: 32, fontWeight: 900, color: '#fff' }}>{valor}</div>
      <div style={{ fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 4 }}>{label}</div>
    </div>
  );
}

// ─── TAB: UTILIZADORES ───────────────────────────────────────────────────────
function TabUsers({ showMsg }) {
  const [page, setPage] = useState(1);
  const { data, loading, error, reload } = useApi(`/api/super/users?page=${page}&limit=${PAGE_SIZE}`);
  const users = data?.users || [];
  const total = data?.total || 0;

  async function mudarPlano(id, plano) {
    try {
      await apiFetch(`/api/super/users/${id}/plano`, { method: 'PATCH', body: JSON.stringify({ plano }) });
      showMsg('Plano atualizado.');
      reload();
    } catch (err) {
      showMsg(err.message, true);
    }
  }

  async function definirBan(u, banned) {
    const verbo = banned ? 'suspender' : 'reativar';
    if (!window.confirm(`Confirmas ${verbo} a conta de ${u.email}?`)) return;
    try {
      await apiFetch(`/api/super/users/${u.id}/ban`, { method: 'PATCH', body: JSON.stringify({ banned }) });
      showMsg(banned ? 'Conta suspensa.' : 'Conta reativada.');
    } catch (err) {
      showMsg(err.message, true);
    }
  }

  const totalPaginas = Math.max(1, Math.ceil(total / PAGE_SIZE));

  if (error) return <div style={{ ...CARD, padding: 14, color: 'var(--danger)' }}>{error}</div>;

  return (
    <div>
      <div style={{ ...CARD, overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 640 }}>
          <thead>
            <tr>
              <th style={th}>Nome</th>
              <th style={th}>Email</th>
              <th style={th}>Plano</th>
              <th style={th}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td style={td}>{u.nome || '—'}{u.is_super_admin ? ' 👑' : ''}</td>
                <td style={td}>{u.email}</td>
                <td style={td}>
                  <select value={u.plan || 'free'} onChange={(e) => mudarPlano(u.id, e.target.value)} style={{ ...btn, padding: '5px 8px' }}>
                    {PLANOS.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </td>
                <td style={td}>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button type="button" style={{ ...btn, borderColor: 'var(--danger)', color: 'var(--danger)' }} onClick={() => definirBan(u, true)}>Suspender</button>
                    <button type="button" style={btn} onClick={() => definirBan(u, false)}>Reativar</button>
                  </div>
                </td>
              </tr>
            ))}
            {!users.length && !loading && (
              <tr><td style={td} colSpan={4}>Sem utilizadores.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 }}>
        <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>
          {total} utilizadores · página {page}/{totalPaginas}
        </span>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" style={btn} disabled={page <= 1 || loading} onClick={() => setPage((p) => Math.max(1, p - 1))}>← Anterior</button>
          <button type="button" style={btn} disabled={page >= totalPaginas || loading} onClick={() => setPage((p) => p + 1)}>Seguinte →</button>
        </div>
      </div>
    </div>
  );
}

// ─── TAB: EQUIPAS ────────────────────────────────────────────────────────────
function TabTeams({ showMsg }) {
  const { data, loading, error, reload } = useApi('/api/super/teams');
  const teams = data?.teams || [];

  async function apagar(t) {
    const resp = window.prompt(`Vais APAGAR a equipa "${t.nome}" e todos os seus dados (jogos, membros, votos…). Isto é irreversível.\n\nEscreve APAGAR para confirmar:`);
    if (resp !== 'APAGAR') {
      if (resp !== null) showMsg('Confirmação incorreta — nada apagado.', true);
      return;
    }
    try {
      await apiFetch(`/api/super/teams/${t.id}`, { method: 'DELETE', body: JSON.stringify({ confirmar: 'APAGAR' }) });
      showMsg('Equipa apagada.');
      reload();
    } catch (err) {
      showMsg(err.message, true);
    }
  }

  if (error) return <div style={{ ...CARD, padding: 14, color: 'var(--danger)' }}>{error}</div>;

  return (
    <div style={{ ...CARD, overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 560 }}>
        <thead>
          <tr>
            <th style={th}>Nome</th>
            <th style={th}>Slug</th>
            <th style={th}>Membros</th>
            <th style={th}>Criada</th>
            <th style={th}>Ações</th>
          </tr>
        </thead>
        <tbody>
          {teams.map((t) => (
            <tr key={t.id}>
              <td style={td}>{t.nome}</td>
              <td style={td}><code style={{ color: 'var(--text-dim)' }}>{t.slug}</code></td>
              <td style={td}>{t.nr_membros}</td>
              <td style={td}>{fmtData(t.created_at)}</td>
              <td style={td}>
                <button type="button" style={{ ...btn, borderColor: 'var(--danger)', color: 'var(--danger)' }} onClick={() => apagar(t)}>Apagar</button>
              </td>
            </tr>
          ))}
          {!teams.length && !loading && (
            <tr><td style={td} colSpan={5}>Sem equipas.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

// ─── TAB: STATS ──────────────────────────────────────────────────────────────
function TabStats() {
  const { data: s, error } = useApi('/api/super/stats');

  if (error) return <div style={{ ...CARD, padding: 14, color: 'var(--danger)' }}>{error}</div>;
  if (!s) return <p style={{ color: 'var(--text-dim)' }}>A carregar métricas…</p>;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
      <MetricCard valor={s.total_users} label="Utilizadores" />
      <MetricCard valor={s.total_teams} label="Equipas" />
      <MetricCard valor={s.users_pro} label="Plano Pro" />
      <MetricCard valor={s.users_elite} label="Plano Elite" />
      <MetricCard valor={s.users_hoje} label="Users hoje" />
      <MetricCard valor={s.teams_hoje} label="Equipas hoje" />
    </div>
  );
}

export default function Super() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get('tab') || 'users';
  const [msg, setMsg] = useState(null); // { texto, erro }
  const msgTimer = useRef(null);

  const showMsg = useCallback((texto, erro = false) => {
    setMsg({ texto, erro });
    window.clearTimeout(msgTimer.current);
    msgTimer.current = window.setTimeout(() => setMsg(null), 3500);
  }, []);

  function irTab(k) {
    setSearchParams((prev) => {
      const p = new URLSearchParams(prev);
      p.set('tab', k);
      return p;
    });
  }

  return (
    <div className="app-shell">
      <main className="app-main" style={{ paddingLeft: 16, paddingRight: 16 }}>
        <h1 className="app-page-title">Super-Admin</h1>
        <p className="app-page-sub">Gestão global de utilizadores e equipas.</p>

        <div style={{ display: 'flex', gap: 8, margin: '12px 0 16px' }}>
          {TABS.map((t) => (
            <button
              key={t.k}
              type="button"
              onClick={() => irTab(t.k)}
              style={{ ...btn, padding: '8px 14px', background: tab === t.k ? 'var(--neon)' : '#0c0c0c', borderColor: tab === t.k ? 'var(--neon)' : '#2a2a2a' }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {msg && (
          <div style={{ ...CARD, padding: '10px 12px', marginBottom: 12, borderColor: msg.erro ? 'var(--danger)' : '#2a2a2a', color: msg.erro ? 'var(--danger)' : '#fff', fontSize: 13 }}>
            {msg.texto}
          </div>
        )}

        {tab === 'users' && <TabUsers showMsg={showMsg} />}
        {tab === 'teams' && <TabTeams showMsg={showMsg} />}
        {tab === 'stats' && <TabStats />}
      </main>
    </div>
  );
}
