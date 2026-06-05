// Futty v2.0 — Criar equipa
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../lib/api';
import { COLOR_OPTIONS, initials } from '../utils/teamColors';
import Topbar from '../components/Topbar';
import '../styles/app.css';

export default function CriarEquipa() {
  const navigate = useNavigate();
  const [nome, setNome] = useState('');
  const [cor, setCor] = useState('verde');
  const [localizacao, setLocalizacao] = useState('');
  const [descricao, setDescricao] = useState('');
  const [publica, setPublica] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const selected = COLOR_OPTIONS.find((c) => c.key === cor);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!nome.trim()) {
      setError('Indica o nome da equipa.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const { team } = await apiFetch('/api/teams', {
        method: 'POST',
        body: JSON.stringify({
          nome: nome.trim(),
          cor,
          publica,
          localizacao: localizacao.trim() || undefined,
          descricao: descricao.trim() || undefined,
        }),
      });
      navigate(`/equipa/${team.slug}`);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }

  return (
    <div className="app-shell">
      <Topbar back="/home" title="Criar equipa" />
      <main className="app-main">
        <h1 className="app-page-title">Criar equipa</h1>
        <p className="app-page-sub">Dá um nome e escolhe a cor da tua equipa.</p>

        <form className="form-card" onSubmit={handleSubmit}>
          {error && <div className="alert alert--error">{error}</div>}

          {/* Pré-visualização do avatar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 }}>
            <div
              className="team-avatar team-avatar--lg"
              style={{ background: selected.hex, color: selected.text }}
            >
              {initials(nome) || '?'}
            </div>
            <div>
              <div className="team-card__name">{nome || 'Nome da equipa'}</div>
              <div className="team-card__role">{selected.label}</div>
            </div>
          </div>

          <div className="field">
            <label htmlFor="nome">Nome da equipa</label>
            <input
              id="nome"
              className="input"
              placeholder="Ex.: Águias do Bairro"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              maxLength={60}
              autoFocus
            />
          </div>

          <div className="field">
            <label>Cor da equipa</label>
            <div className="color-picker">
              {COLOR_OPTIONS.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  className="color-swatch"
                  style={{ background: c.hex }}
                  aria-pressed={cor === c.key}
                  aria-label={c.label}
                  title={c.label}
                  onClick={() => setCor(c.key)}
                />
              ))}
            </div>
          </div>

          <div className="field">
            <label htmlFor="localizacao">Localização (opcional)</label>
            <input
              id="localizacao"
              className="input"
              placeholder="Ex: Lisboa · Campo do Ze"
              value={localizacao}
              onChange={(e) => setLocalizacao(e.target.value.slice(0, 100))}
              maxLength={100}
            />
          </div>

          <div className="field">
            <label htmlFor="descricao">Descrição (opcional)</label>
            <textarea
              id="descricao"
              className="input"
              placeholder="Conta um pouco sobre a tua equipa…"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value.slice(0, 300))}
              maxLength={300}
              rows={3}
              style={{ resize: 'vertical' }}
            />
          </div>

          <div className="field">
            <label
              htmlFor="publica"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, cursor: 'pointer' }}
            >
              <span>Equipa pública</span>
              <input
                id="publica"
                type="checkbox"
                checked={publica}
                onChange={(e) => setPublica(e.target.checked)}
                style={{ width: 20, height: 20, accentColor: '#00e5a0', cursor: 'pointer' }}
              />
            </label>
            <p className="muted" style={{ fontSize: 12, marginTop: 6 }}>
              Pública — aparece na pesquisa · Privada — só por convite
            </p>
          </div>

          <button
            type="submit"
            className="btn btn--primary"
            style={{ width: '100%', marginTop: 8 }}
            disabled={loading}
          >
            {loading ? 'A criar…' : 'Criar equipa'}
          </button>
        </form>
      </main>
    </div>
  );
}
