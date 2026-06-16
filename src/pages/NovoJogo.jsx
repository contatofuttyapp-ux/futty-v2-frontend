// Futty v2.0 — Criar jogo (só admin)
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { apiFetch } from '../lib/api';
import Topbar from '../components/Topbar';
import NumberStepper from '../components/NumberStepper';
import '../styles/app.css';

export default function NovoJogo() {
  const { slug } = useParams();
  const navigate = useNavigate();

  const [data, setData] = useState('');
  const [hora, setHora] = useState('');
  const [local, setLocal] = useState('');
  const [porTime, setPorTime] = useState(5);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!data || !hora) {
      setError('Indica a data e a hora do jogo.');
      return;
    }
    if (!porTime || Number(porTime) < 2) {
      setError('Indica quantos jogadores por time (mínimo 2).');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const iso = new Date(`${data}T${hora}`).toISOString();
      const { game } = await apiFetch('/api/games', {
        method: 'POST',
        body: JSON.stringify({
          team_slug: slug,
          data: iso,
          local: local.trim() || null,
          jogadores_por_time: Number(porTime),
        }),
      });
      navigate(`/equipa/${slug}/jogo/${game.id}`);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }

  return (
    <div className="app-shell">
      <Topbar back={`/equipa/${slug}/jogos`} title="Criar jogo" />
      <main className="app-main">
        <h1 className="app-page-title">Criar jogo</h1>
        <p className="app-page-sub">Agenda um novo jogo para o time.</p>

        <form className="form-card" onSubmit={handleSubmit}>
          {error && <div className="alert alert--error">{error}</div>}

          <div style={{ display: 'flex', gap: 12 }}>
            <div className="field" style={{ flex: 1 }}>
              <label htmlFor="data">Data</label>
              <input
                id="data"
                type="date"
                className="input"
                value={data}
                onChange={(e) => setData(e.target.value)}
              />
            </div>
            <div className="field" style={{ flex: 1 }}>
              <label htmlFor="hora">Hora</label>
              <input
                id="hora"
                type="time"
                className="input"
                value={hora}
                onChange={(e) => setHora(e.target.value)}
              />
            </div>
          </div>

          <div className="field">
            <label htmlFor="local">Local</label>
            <input
              id="local"
              className="input"
              placeholder="Ex.: Campo Municipal"
              value={local}
              onChange={(e) => setLocal(e.target.value)}
              maxLength={120}
            />
          </div>

          <div className="field">
            <label>Jogadores por time</label>
            <NumberStepper value={porTime} onChange={setPorTime} min={2} max={11} />
            <span className="muted" style={{ fontSize: 12, marginTop: 4 }}>
              O número de times é calculado automaticamente no sorteio, conforme os jogadores confirmados.
            </span>
          </div>

          <button
            type="submit"
            className="btn btn--primary"
            style={{ width: '100%', marginTop: 8 }}
            disabled={loading}
          >
            {loading ? 'Criando…' : 'Criar jogo'}
          </button>
        </form>
      </main>
    </div>
  );
}
