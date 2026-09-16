// Futty v2.0 — A PÁGINA DO SORTEIO (/equipa/:slug/jogo/:id/sorteio).
// SPEC-SORTEIO §13(d): esta página É a animação — chega-se pelo fluxo
// (jogo → countdown → Ver sorteio). Cada visita reproduz a cerimónia completa,
// replay ilimitado e EXACTO (a seed vive em times_resultado).
// Partilha (§9): LINK público (/p/:slug/:gameId) + IMAGEM 9:16 por equipa.
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import { apiFetch } from '../lib/api';
import LoadingFutty from '../components/LoadingFutty';
import CerimoniaSorteio from '../components/CerimoniaSorteio';
import AdCard from '../components/AdCard';
import Toast from '../components/Toast';
import '../styles/app.css';

const RAJ = "'Rajdhani', sans-serif";

export default function SorteioShow() {
  const { slug, id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  // Rodada 12A: só quem chegou aqui pelo botão "Sortear" traz isto (ver Jogo.jsx).
  // Lido UMA vez e apagado do histórico a seguir: o state vive na entrada do
  // histórico, e voltaria a valer se a pessoa recuasse e avançasse, ou se o
  // WebView recarregasse a rota ao retomar o app — som ligado sem ninguém ter
  // tocado em "Sortear", que é o oposto do que a regra diz.
  const [euSorteei] = useState(() => !!location.state?.euSorteei);
  useEffect(() => {
    if (euSorteei) navigate(location.pathname, { replace: true, state: null });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- corre uma vez, na montagem
  }, []);
  const { data, loading } = useApi(`/api/games/${id}`);
  const [toast, setToast] = useState(null);
  const [termoAberto, setTermoAberto] = useState(false);
  // O anúncio NÃO pode ir e voltar: o AdCard conta a impressão ao montar, e a
  // alavanca (que repete a cerimónia) montava-o outra vez a cada corrida —
  // cinco repetições, seis impressões pela mesma vista. Por isso este estado só
  // cresce: o slot entra no fim da primeira cerimónia e fica.
  const [jaTerminou, setJaTerminou] = useState(false);
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
            {/* RODADA 14B — compartilhar vive DENTRO da cerimónia, logo abaixo do
                retângulo dos times: um botão dourado com a imagem dos dois times e
                uma linha discreta com o 9:16 de cada um. É o único lugar: a barra
                presa ao fundo da 12A (que cobria o retângulo) e os "Salvar" /
                "Compartilhar" que a máquina tinha embaixo saíram. */}
            <CerimoniaSorteio
              resultado={resultado}
              equipa={data?.team?.nome || ''}
              data={dataCartaz}
              aoTerminar={() => setJaTerminou(true)}
              bannerInterno={false}
              euSorteei={euSorteei}
            />

            {/* RODADA 12A — o espaço de publicidade da página do sorteio: IAB
                320×100, servido com pagina='sorteio' (toggle do dono no
                Gabinete, filtro etário fail-closed no servidor). Só depois da
                cerimónia: durante ela a tela é para olhar. Sem campanha o
                AdCard devolve null e não fica buraco nem promessa na tela. */}
            {jaTerminou ? (
              <div style={{ marginTop: 18 }}>
                <AdCard pagina="sorteio" variant="banner320x100" />
              </div>
            ) : null}

            {/* partilha (§9): o LINK fica aqui — é o único caminho que passa pelo
                termo de quem partilha (o "Compartilhar" antigo da máquina copiava
                o mesmo link sem declaração nenhuma; saiu na 14B). */}
            <div style={{ marginTop: 18, display: 'grid', gap: 8 }}>
              <button type="button" className="btn hud-corners-s cta-gold" style={{ width: '100%', fontFamily: RAJ, letterSpacing: '0.08em', textTransform: 'uppercase' }} onClick={pedirCopiar}>
                Copiar link do sorteio
              </button>
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
