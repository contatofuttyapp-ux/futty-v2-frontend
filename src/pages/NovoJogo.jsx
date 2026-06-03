// Futty v2.0 — Criar jogo (só admin)
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { apiFetch } from '../lib/api';
import Topbar from '../components/Topbar';
import '../styles/app.css';

export default function NovoJogo() {
  const { slug } = useParams();
  const navigate = useNavigate();

  const [data, setData] = useState('');
  const [hora, setHora] = useState('');
  const [local, setLocal] = useState('');
  const [numTimes, setNumTimes] = useState(2);
  const [porTime, setPorTime] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!data || !hora) {
      setError('Indica a data e a hora do jogo.');
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
          num_times: Number(numTimes),
          jogadores_por_time: porTime ? Number(porTime) : null,
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
      <Topbar />
      <main className="app-main">
        <Link to={`/equipa/${slug}/jogos`} className="back-link">
          ← Jogos
        </Link>
        <h1 className="app-page-title">Criar jogo</h1>
        <p className="app-page-sub">Agenda um novo jogo para a equipa.</p>

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

          <div style={{ display: 'flex', gap: 12 }}>
            <div className="field" style={{ flex: 1 }}>
              <label htmlFor="numTimes">Número de times</label>
              <select
                id="numTimes"
                className="input"
                value={numTimes}
                onChange={(e) => setNumTimes(e.target.value)}
              >
                {[2, 3, 4, 5, 6].map((n) => (
                  <option key={n} value={n}>
                    {n} times
                  </option>
                ))}
              </select>
            </div>
            <div className="field" style={{ flex: 1 }}>
              <label htmlFor="porTime">Jogadores por time</label>
              <input
                id="porTime"
                type="number"
                min="1"
                max="11"
                className="input"
                placeholder="Opcional"
                value={porTime}
                onChange={(e) => setPorTime(e.target.value)}
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn btn--primary"
            style={{ width: '100%', marginTop: 8 }}
            disabled={loading}
          >
            {loading ? 'A criar…' : 'Criar jogo'}
          </button>
        </form>
      </main>
    </div>
  );
}
