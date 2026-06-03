// Futty v2.0 — Detalhe da equipa + membros + convite
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { apiFetch } from '../lib/api';
import { colorOf, initials } from '../lib/teamColors';
import Topbar from '../components/Topbar';
import '../styles/app.css';

export default function Equipa() {
  const { slug } = useParams();
  const [team, setTeam] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [inviteLink, setInviteLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    let active = true;
    apiFetch(`/api/teams/${slug}`)
      .then((data) => {
        if (!active) return;
        setTeam(data.team);
        setMembers(data.members || []);
        setLoading(false);
      })
      .catch((err) => {
        if (!active) return;
        setError(err.message);
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [slug]);

  async function gerarConvite() {
    setError('');
    setCopied(false);
    setGenerating(true);
    try {
      const { token } = await apiFetch(`/api/teams/${slug}/convite`, { method: 'POST' });
      setInviteLink(`${window.location.origin}/convite/${token}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  }

  async function copiar() {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  const c = team ? colorOf(team.cor) : colorOf('verde');

  return (
    <div className="app-shell">
      <Topbar />
      <main className="app-main">
        <Link to="/home" className="back-link">
          ← As tuas equipas
        </Link>

        {error && <div className="alert alert--error">{error}</div>}

        {loading ? (
          <p className="muted">A carregar…</p>
        ) : team ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 8 }}>
              <div
                className="team-avatar team-avatar--lg"
                style={{ background: c.hex, color: c.text }}
              >
                {initials(team.nome)}
              </div>
              <div>
                <h1 className="app-page-title" style={{ marginBottom: 0 }}>
                  {team.nome}
                </h1>
                <span className="team-card__role">
                  {members.length} {members.length === 1 ? 'membro' : 'membros'}
                  {team.role ? ` · és ${team.role}` : ''}
                </span>
              </div>
            </div>

            <div className="header-actions">
              <Link to={`/equipa/${slug}/jogos`} className="btn btn--primary btn--sm">
                ⚽ Jogos
              </Link>
              {team.role === 'admin' && (
                <Link to={`/equipa/${slug}/jogo/novo`} className="btn btn--ghost btn--sm">
                  + Criar jogo
                </Link>
              )}
            </div>

            <h2 className="section-title">Membros</h2>
            <div className="member-list">
              {members.map((m) => (
                <div className="member-row" key={m.id || m.email}>
                  <div className="member-avatar">
                    {initials(m.nome || m.email || '?') || '?'}
                  </div>
                  <div className="member-info">
                    <div className="member-name">{m.nome || m.email}</div>
                    {m.nome && <div className="member-email">{m.email}</div>}
                  </div>
                  <span className={`badge badge--${m.role === 'admin' ? 'admin' : 'member'}`}>
                    {m.role}
                  </span>
                </div>
              ))}
            </div>

            <h2 className="section-title">Convidar jogador</h2>
            <p className="muted" style={{ fontSize: 14 }}>
              Gera um link de convite (válido 7 dias, uso único) para partilhar com novos jogadores.
            </p>
            <button
              type="button"
              className="btn btn--purple btn--sm"
              style={{ marginTop: 12 }}
              onClick={gerarConvite}
              disabled={generating}
            >
              {generating ? 'A gerar…' : 'Convidar jogador'}
            </button>

            {inviteLink && (
              <div className="invite-box">
                <strong style={{ fontSize: 14 }}>Link de convite</strong>
                <div className="invite-link">
                  <input className="input" readOnly value={inviteLink} onFocus={(e) => e.target.select()} />
                  <button type="button" className="btn btn--ghost btn--sm" onClick={copiar}>
                    {copied ? 'Copiado!' : 'Copiar'}
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          !error && <p className="muted">Equipa não encontrada.</p>
        )}
      </main>
    </div>
  );
}
