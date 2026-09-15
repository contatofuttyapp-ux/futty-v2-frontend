// Futty v2.0 — A PÁGINA DO SORTEIO (/equipa/:slug/jogo/:id/sorteio).
// SPEC-SORTEIO §13(d): esta página É a animação — chega-se pelo fluxo
// (jogo → countdown → Ver sorteio). Cada visita reproduz a cerimónia completa,
// replay ilimitado e EXACTO (a seed vive em times_resultado).
// Partilha (§9): LINK público (/p/:slug/:gameId) + IMAGEM 9:16 por equipa.
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useParams } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import { apiFetch } from '../lib/api';
import LoadingFutty from '../components/LoadingFutty';
import CerimoniaSorteio, { MARCA_TIME } from '../components/CerimoniaSorteio';
import { gerarCartao916 } from '../utils/sorteioCartao';
import { salvarOuCompartilhar } from '../utils/salvarImagem';
import Toast from '../components/Toast';
import '../styles/app.css';

const RAJ = "'Rajdhani', sans-serif";

export default function SorteioShow() {
  const { slug, id } = useParams();
  const { data, loading } = useApi(`/api/games/${id}`);
  const [toast, setToast] = useState(null);
  const [termoAberto, setTermoAberto] = useState(false);
  const game = data?.game;
  const resultado = game?.times_resultado;
  const dataCartaz = game?.data
    ? new Date(game.data).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' }).replace(/ de /g, ' ').replace(/\./g, '')
    : '';

  // TERMO de quem partilha (1-clique, uma vez por jogo). Ao primeiro "Copiar link"
  // pede a declaração; regista em share_declarations e lembra localmente. Não altera
  // a privacidade (a regra de rosto é independente e sempre ligada) — é cobertura legal.
  const jaDeclarou = () => {
    try { return localStorage.getItem(`futty_termo_${id}`) === '1'; } catch { return false; }
  };
  function pedirCopiar() {
    if (jaDeclarou()) copiarLink();
    else setTermoAberto(true);
  }
  async function aceitarTermo() {
    setTermoAberto(false);
    try { await apiFetch(`/api/games/${id}/partilha-declarada`, { method: 'POST' }); } catch { /* best-effort */ }
    try { localStorage.setItem(`futty_termo_${id}`, '1'); } catch { /* priv */ }
    copiarLink();
  }

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
        setToast({ tipo: 'error', mensagem: `Copie à mão: ${url}` });
      }
      inp.remove();
    }
  }

  // Rodada 8A: na web baixa; no app abre a folha de compartilhar (o <a download>
  // não faz nada no WebView). A folha já é o retorno visual; fechar sem escolher
  // nada é silencioso.
  async function baixarCartao(ti) {
    try {
      const { blob, nome } = await gerarCartao916(resultado, ti, data?.team?.nome || '');
      const entrega = await salvarOuCompartilhar(blob, nome, { titulo: 'Cartão do sorteio' });
      if (entrega === 'baixou') setToast({ tipo: 'success', mensagem: 'Cartão 9:16 gerado!' });
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
              <button type="button" className="btn hud-corners-s cta-gold" style={{ width: '100%', fontFamily: RAJ, letterSpacing: '0.08em', textTransform: 'uppercase' }} onClick={pedirCopiar}>
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
                o link reproduz esta MESMA cerimônia (semente {resultado.seed ?? '—'}) para quem abrir, sem app
              </p>
            </div>
          </>
        )}
      </main>
      {toast ? <Toast mensagem={toast.mensagem} tipo={toast.tipo} onClose={() => setToast(null)} /> : null}

      {/* TERMO 1-clique de quem partilha (registado em share_declarations). */}
      {termoAberto ? createPortal(
        <div className="modal-overlay" role="presentation" onClick={() => setTermoAberto(false)}>
          <div className="modal-card" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <div className="modal-card__inner" style={{ textAlign: 'left' }}>
              <p style={{ fontSize: 15, lineHeight: 1.5, marginBottom: 8 }}>
                <b>Declaro que posso compartilhar este sorteio.</b>
              </p>
              <p style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--text-dim)', marginBottom: 16 }}>
                Os jogadores autorizaram ou são maiores de idade. Os rostos de menores aparecem
                sempre como silhueta, independentemente disto.
              </p>
              <button type="button" className="btn btn--primary" style={{ width: '100%' }} onClick={aceitarTermo}>
                Aceitar e copiar link
              </button>
              <button type="button" className="btn btn--ghost btn--sm" style={{ width: '100%', marginTop: 10 }} onClick={() => setTermoAberto(false)}>
                Cancelar
              </button>
            </div>
          </div>
        </div>,
        document.body,
      ) : null}
    </div>
  );
}
