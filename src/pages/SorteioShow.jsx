// Futty v2.0 — A PÁGINA DO SORTEIO (/equipa/:slug/jogo/:id/sorteio).
// SPEC-SORTEIO §13(d): esta página É a animação — chega-se pelo fluxo
// (jogo → countdown → Ver sorteio). Cada visita reproduz a cerimónia completa,
// replay ilimitado e EXACTO (a seed vive em times_resultado).
// Partilha (§9): LINK público (/p/:slug/:gameId) + IMAGEM 9:16 por equipa.
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useParams } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import { apiFetch } from '../lib/api';
import LoadingFutty from '../components/LoadingFutty';
import CerimoniaSorteio, { MARCA_TIME } from '../components/CerimoniaSorteio';
import { gerarCartao916, gerarCartazEscalacao } from '../utils/sorteioCartao';
import { salvarOuCompartilhar } from '../utils/salvarImagem';
import AdCard from '../components/AdCard';
import Toast from '../components/Toast';
import '../styles/app.css';

const RAJ = "'Rajdhani', sans-serif";

export default function SorteioShow() {
  const { slug, id } = useParams();
  // Rodada 12A: só quem chegou aqui pelo botão "Sortear" traz isto (ver Jogo.jsx).
  const euSorteei = !!useLocation().state?.euSorteei;
  const { data, loading } = useApi(`/api/games/${id}`);
  const [toast, setToast] = useState(null);
  const [termoAberto, setTermoAberto] = useState(false);
  // RODADA 12A — compartilhar deixa de estar escondido abaixo da dobra. Enquanto
  // a cerimónia corre não aparece nada (é o momento de olhar, não de agir); no
  // fim, a barra entra presa ao fundo da tela. `false` outra vez se a pessoa
  // puxar a alavanca para repetir.
  const [terminou, setTerminou] = useState(false);
  const [gerando, setGerando] = useState(false);
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
    if (gerando) return;
    setGerando(true);
    try {
      const { blob, nome } = await gerarCartao916(resultado, ti, data?.team?.nome || '');
      const entrega = await salvarOuCompartilhar(blob, nome, { titulo: 'Cartão do sorteio' });
      if (entrega === 'baixou') setToast({ tipo: 'success', mensagem: 'Cartão 9:16 gerado!' });
    } catch (e) {
      setToast({ tipo: 'error', mensagem: e.message || 'Não deu para gerar o cartão.' });
    } finally {
      setGerando(false);
    }
  }

  // Os dois times numa imagem só (o cartaz da escalação). Entrega sozinho: baixa
  // na web, abre a folha de compartilhar no app — o mesmo salvarOuCompartilhar.
  async function compartilharTimes() {
    if (gerando) return;
    setGerando(true);
    try {
      const { entrega } = await gerarCartazEscalacao(resultado, { equipa: data?.team?.nome || '', data: dataCartaz });
      if (entrega === 'baixou') setToast({ tipo: 'success', mensagem: 'Imagem dos times gerada!' });
    } catch (e) {
      setToast({ tipo: 'error', mensagem: e.message || 'Não deu para gerar a imagem.' });
    } finally {
      setGerando(false);
    }
  }

  return (
    <div className="app-shell">
      {/* LEI: página do sorteio = IMERSIVA, SEM Topbar; a saída faz-se pelo X da máquina. */}
      <main className={`app-main page-reveal ${terminou ? 'sorteio-main--barra' : ''}`} style={{ maxWidth: 480 }}>
        {loading ? (
          <LoadingFutty />
        ) : !resultado ? (
          <p className="muted">O sorteio ainda não foi realizado.</p>
        ) : (
          <>
            <CerimoniaSorteio
              resultado={resultado}
              equipa={data?.team?.nome || ''}
              data={dataCartaz}
              aoComecar={() => setTerminou(false)}
              aoTerminar={() => setTerminou(true)}
              bannerInterno={false}
              euSorteei={euSorteei}
            />

            {/* RODADA 12A — o espaço de publicidade da página do sorteio: IAB
                320×100, servido com pagina='sorteio' (toggle do dono no
                Gabinete, filtro etário fail-closed no servidor). Só depois da
                cerimónia: durante ela a tela é para olhar. Sem campanha o
                AdCard devolve null e não fica buraco nem promessa na tela. */}
            {terminou ? (
              <div style={{ marginTop: 18 }}>
                <AdCard pagina="sorteio" variant="banner320x100" />
              </div>
            ) : null}

            {/* partilha (§9): o link fica aqui; a imagem dos times e os 9:16
                mudaram-se para a barra presa ao fundo (ver abaixo). */}
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
      {/* RODADA 12A — a barra de compartilhar, presa ao fundo da tela. Vai por
          portal para o body: dentro do [data-page] qualquer ancestral com
          transform/filter transformaria o `fixed` em "preso à página" e ela
          rolava junto (o defeito que a cena "fixos" da Rodada 9 mediu). Sai
          sozinha quando a pessoa deixa a tela — desmonta com a página. */}
      {terminou && resultado ? createPortal(
        <div className="sorteio-barra">
          <button type="button" className="btn hud-corners-s cta-gold sorteio-barra__principal" disabled={gerando} onClick={compartilharTimes}>
            {gerando ? 'Gerando…' : 'Compartilhar times'}
          </button>
          <div className="sorteio-barra__times">
            {(resultado.times || []).map((t, ti) => (
              <button key={ti} type="button" className="btn btn--sm btn--outline hud-corners-s" disabled={gerando} style={{ flex: 1, minWidth: 0, color: MARCA_TIME[ti % MARCA_TIME.length].c, borderColor: MARCA_TIME[ti % MARCA_TIME.length].c }} onClick={() => baixarCartao(ti)}>
                9:16 · {t.nome}
              </button>
            ))}
          </div>
        </div>,
        document.body,
      ) : null}

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
