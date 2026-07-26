// Futty v2.0 — A PÁGINA DO SORTEIO (/equipa/:slug/jogo/:id/sorteio).
// SPEC-SORTEIO §13(d): esta página É a animação — chega-se pelo fluxo
// (jogo → countdown → Ver sorteio). Cada visita reproduz a cerimónia completa,
// replay ilimitado e EXACTO (a seed vive em times_resultado).
// Partilha (§9): LINK público (/p/:slug/:gameId) + IMAGEM 9:16 por equipa.
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import LoadingFutty from '../components/LoadingFutty';
import CerimoniaSorteio, { MARCA_TIME } from '../components/CerimoniaSorteio';
import { gerarCartao916 } from '../utils/sorteioCartao';
import Toast from '../components/Toast';
import '../styles/app.css';

const RAJ = "'Rajdhani', sans-serif";

export default function SorteioShow() {
  const { slug, id } = useParams();
  const { data, loading } = useApi(`/api/games/${id}`);
  const [toast, setToast] = useState(null);
  const game = data?.game;
  const resultado = game?.times_resultado;
  const dataCartaz = game?.data
    ? new Date(game.data).toLocaleDateString('pt-PT', { day: 'numeric', month: 'short', year: 'numeric' }).replace(/ de /g, ' ').replace(/\./g, '')
    : '';

  async function copiarLink() {
    const url = `${window.location.origin}/p/${slug}/${id}`;
    try {
      await navigator.clipboard.writeText(url);
      setToast({ tipo: 'success', mensagem: 'Link do sorteio copiado!' });
    } catch {
      // fallback (clipboard falha em alguns contextos)
      const inp = document.createElement('input');
      inp.value = url;
      document.body.appendChild(inp);
      inp.select();
      try {
        document.execCommand('copy');
        setToast({ tipo: 'success', mensagem: 'Link do sorteio copiado!' });
      } catch {
        setToast({ tipo: 'error', mensagem: `Copia à mão: ${url}` });
      }
      inp.remove();
    }
  }

  async function baixarCartao(ti) {
    try {
      await gerarCartao916(resultado, ti, data?.team?.nome || '');
      setToast({ tipo: 'success', mensagem: 'Cartão 9:16 gerado!' });
    } catch (e) {
      setToast({ tipo: 'error', mensagem: e.message || 'Não deu para gerar o cartão.' });
    }
  }

  return (
    <div className="app-shell">
      {/* LEI: página do sorteio = IMERSIVA, SEM Topbar; a saída faz-se pelo X da máquina. */}
      <main className="app-main page-reveal" style={{ maxWidth: 480 }}>
        {loading ? (
          <LoadingFutty />
        ) : !resultado ? (
          <p className="muted">O sorteio ainda não foi realizado.</p>
        ) : (
          <>
            <CerimoniaSorteio resultado={resultado} equipa={data?.team?.nome || ''} data={dataCartaz} />

            {/* partilha (§9): link + imagem 9:16 — vídeo morto */}
            <div style={{ marginTop: 18, display: 'grid', gap: 8 }}>
              <button type="button" className="btn hud-corners-s cta-gold" style={{ width: '100%', fontFamily: RAJ, letterSpacing: '0.08em', textTransform: 'uppercase' }} onClick={copiarLink}>
                Copiar link do sorteio
              </button>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {(resultado.times || []).map((t, ti) => (
                  <button key={ti} type="button" className="btn btn--sm btn--outline hud-corners-s" style={{ flex: 1, color: MARCA_TIME[ti % MARCA_TIME.length].c, borderColor: MARCA_TIME[ti % MARCA_TIME.length].c }} onClick={() => baixarCartao(ti)}>
                    9:16 · {t.nome}
                  </button>
                ))}
              </div>
              <p className="muted" style={{ fontSize: 11, textAlign: 'center', margin: 0 }}>
                o link reproduz esta MESMA cerimónia (semente {resultado.seed ?? '—'}) a quem o abrir — sem app
              </p>
            </div>
          </>
        )}
      </main>
      {toast ? <Toast mensagem={toast.mensagem} tipo={toast.tipo} onClose={() => setToast(null)} /> : null}
    </div>
  );
}
