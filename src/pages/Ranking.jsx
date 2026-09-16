// Futty v2.0 — Ranking (modelo definitivo): voto por jogador (meias estrelas),
// nota exibida 6-10, score por categoria. Sem jogo de votação nem períodos.
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useParams } from 'react-router-dom';
import { apiFetch } from '../lib/api';
import { marcarInstante } from '../lib/diagnostico';
import { useApi } from '../hooks/useApi';
import { useSessao } from '../context/SessaoContext';
import { useRanking } from '../hooks/useRanking';
import { useListaProgressiva } from '../hooks/useListaProgressiva';
import { celebrarTop3 } from '../hooks/useConfetti';
import { urlAsset, urlImagem } from '../utils/avatar';
import { nomeExibicao } from '../utils/nomeExibicao';
import LoadingFutty from '../components/LoadingFutty';
import SilhuetaJogador from '../components/SilhuetaJogador';
import EstadoErroRede from '../components/EstadoErroRede';
import EstadoSemTime from '../components/EstadoSemTime';
import Topbar from '../components/Topbar';
import Toast from '../components/Toast';
import EscudoEquipa from '../components/EscudoEquipa';
import '../styles/app.css';

// Diagnóstico (Rodada 8A): a 1ª imagem da tela que terminou de carregar.
const marcarImagem = () => marcarInstante('imagem');

// Moldura de avatar do cânone (V1): quadrado + cantos-L dourados + interior no material
// da casa + véu. Moldura única da página — rows, pódio e modal partilham-na.
function FrameAvatar({ avatarUrl, size = 48 }) {
  const src = avatarUrl ? urlImagem(urlAsset(avatarUrl), 128) : null;
  return (
    <span className="avatar-frame" style={{ width: size, height: size }}>
      <span className="avatar-frame__fill" style={{ fontSize: Math.round(size * 0.34) }}>
        {src ? <img src={src} alt="" decoding="async" onLoad={marcarImagem} /> : <SilhuetaJogador size="74%" />}
      </span>
      <span className="avatar-frame__veil" />
      <span className="avatar-frame__lc avatar-frame__lc--tl" />
      <span className="avatar-frame__lc avatar-frame__lc--tr" />
      <span className="avatar-frame__lc avatar-frame__lc--br" />
      <span className="avatar-frame__lc avatar-frame__lc--bl" />
    </span>
  );
}

// Estado do voto: por votar → CTA dourado vivo (pulse + shine); já votado → discreto
// (outline roxo). Não aparece no próprio jogador (não se vota em si).
function VoteButton({ jaVotou, onClick }) {
  return jaVotou ? (
    <button type="button" className="btn btn--sm btn--hud btn--outline hud-corners-s" onClick={onClick}>Alterar</button>
  ) : (
    <button type="button" className="btn btn--sm btn--hud btn--gold hud-corners-s pulse-active tab-shine" onClick={onClick}>Votar</button>
  );
}

// Cor do lugar do pódio (ouro/prata/bronze).
function corDoLugar(pos) {
  return pos === 1 ? '#d4a017' : pos === 2 ? '#aaaaaa' : '#cd7f32';
}

// Uma linha do ranking. O top-3 destaca-se DENTRO da lista por ESCALA (linha de herói):
// mais alta, avatar/nome/nota maiores em degradé 1>2>3, com borda + glow + medalha na
// cor do lugar. As linhas normais (#4+) levam o shimmer. O top-3 FLUTUA (assinatura de
// herói da casa, dosada abaixo do cromo — rankRowFloat no wrapper, delays desfasados).
function RankRow({ p, idx, slug, onVote }) {
  const pos = p.posicao;
  const top = pos <= 3;
  const cor = top ? corDoLugar(pos) : null;
  const delay = pos === 1 ? 0 : pos === 2 ? 0.6 : 1.2;
  const jaVotou = p.minha_nota != null;
  const nomeShow = nomeExibicao(p);
  const avSize = pos === 1 ? 60 : pos <= 3 ? 56 : 48;
  const nomeFs = pos === 1 ? 17 : pos === 2 ? 15 : pos === 3 ? 14 : undefined;
  const notaFs = pos === 1 ? 20 : pos === 2 ? 18 : pos === 3 ? 17 : 16;
  return (
    <div className={`rank-row-lift ${top ? 'rank-row-lift--podio' : ''}`} style={top ? { '--podio-cor': cor, '--podio-delay': `${delay}s` } : undefined}>
      <div className={`rank-row ${top ? 'rank-row--top rank-row--hero' : ''}`} style={{ position: 'relative', overflow: 'hidden', ...(top ? { border: `1px solid ${cor}` } : {}) }}>
        {!top ? <span aria-hidden className="rank-shimmer" style={{ '--shimmer-delay': `${idx % 2 ? 0.5 : 0}s` }} /> : null}
        <div className="rank-pos">
          {top ? (
            <span className="rank-medal" style={{ '--medal-cor': cor }}>{pos}</span>
          ) : (
            pos
          )}
        </div>
        <Link to={`/equipa/${slug}/jogador/${p.user_id}`} aria-label={`Ver perfil de ${nomeShow}`} style={{ lineHeight: 0 }}>
          <FrameAvatar nome={nomeShow} avatarUrl={p.avatar_url} size={avSize} />
        </Link>
        <div className="rank-info">
          <div className="rank-name" style={nomeFs ? { fontSize: nomeFs } : undefined}>
            {nomeShow}
            {p.categoria === 'GR' ? (
              <span className="hud-corners-s" style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', color: '#b69cff', border: '1px solid var(--purple)', padding: '1px 6px' }}>GR</span>
            ) : null}
          </div>
          <div className="rank-votes" style={{ marginTop: 4, fontSize: 12 }}>
            {p.nota != null ? (
              <span style={{ fontFamily: "'Rajdhani', sans-serif", color: '#d4a017', fontWeight: 700, fontSize: notaFs }}>{p.nota.toFixed(1)}</span>
            ) : (
              <span style={{ color: 'var(--text-dim)' }} title="Precisa de 3 votos para mostrar nota">--</span>
            )}
            {jaVotou ? (
              <span className="muted" style={{ marginLeft: 8 }}>★ você deu {p.minha_nota}</span>
            ) : (
              <span className="muted" style={{ marginLeft: 8 }}>☆ por votar</span>
            )}
          </div>
        </div>
        <div className="rank-actions" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
          {p.sou_eu ? (
            <span className="muted hud-corners-s" style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--neon)', border: '1px solid var(--neon)', padding: '3px 9px' }}>Você</span>
          ) : (
            <VoteButton jaVotou={jaVotou} onClick={() => onVote(p)} />
          )}
          <Link to={`/equipa/${slug}/jogador/${p.user_id}`} style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.35)', fontSize: 11, textDecoration: 'none', cursor: 'pointer' }}>
            Ver perfil
          </Link>
        </div>
      </div>
    </div>
  );
}

// A lista. O useLayoutEffect corre no commit, antes do desenho: é o instante
// "lista commitada" do Diagnóstico (Rodada 8A) — daí até a pintura, o tempo é do
// navegador (estilo, layout, desenho), não dos dados. `ranking` muda de identidade
// quando a resposta fresca substitui a do cache: esse commit é a "lista nova".
function ListaRanking({ ranking, children }) {
  // Compara a LISTA, não um "já montou": o StrictMode repete os efeitos em dev e
  // a repetição não é uma lista nova.
  const primeira = useRef(null);
  useLayoutEffect(() => {
    if (primeira.current == null) {
      primeira.current = ranking;
      marcarInstante('lista');
    } else if (ranking !== primeira.current) {
      marcarInstante('listaNova');
    }
  }, [ranking]);
  return <div className="rank-list">{children}</div>;
}

// Converte a média interna (1-5) para a nota exibida (6-10).
function notaParaExibir(n) {
  if (n == null) return null;
  return Math.round((6 + ((n - 1) / 4) * 4) * 10) / 10;
}

// Input de 5 estrelas com meia-estrela (clique na metade esquerda = X.5).
function MeiaEstrelas({ value = 0, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
      {[1, 2, 3, 4, 5].map((i) => {
        const fill = value >= i ? 100 : value >= i - 0.5 ? 50 : 0;
        return (
          <div key={i} style={{ position: 'relative', width: 36, height: 36, fontSize: 36, lineHeight: '36px' }}>
            <span style={{ color: '#333' }}>★</span>
            <span style={{ position: 'absolute', left: 0, top: 0, width: `${fill}%`, overflow: 'hidden', color: '#d4a017' }}>★</span>
            <button type="button" aria-label={`${i - 0.5} estrelas`} onClick={() => onChange(i - 0.5)} style={{ position: 'absolute', left: 0, top: 0, width: '50%', height: '100%', border: 'none', background: 'transparent', cursor: 'pointer' }} />
            <button type="button" aria-label={`${i} estrelas`} onClick={() => onChange(i)} style={{ position: 'absolute', right: 0, top: 0, width: '50%', height: '100%', border: 'none', background: 'transparent', cursor: 'pointer' }} />
          </div>
        );
      })}
    </div>
  );
}

export default function Ranking() {
  const { slug } = useParams();
  // Rota /ranking (sem :slug): é para onde a BottomNav manda quem ainda não
  // tem time — ver o fallback de `rankingTo` em BottomNav.jsx. useRanking(undefined)
  // e useApi(null) já não disparam pedido nenhum com slug ausente.
  const semTime = !slug;
  const { ranking, loading, error, reload } = useRanking(slug);
  // VELOCIDADE 8 (16-set) — listas grandes pintam em duas levas. As 10 primeiras
  // são as que cabem na tela (e são as caras: o pódio leva moldura, glow e
  // flutuação); o resto entra dois quadros depois. Os relatórios do iPhone dão
  // 1389, 1866 e 2121 ms para pintar esta tela com 23 linhas.
  // Só divide acima de 15 linhas: abaixo disso a 1ª leva é a lista toda e o hook
  // devolve-a inteira à primeira — dividir o que já cabe num quadro só
  // acrescentava um quadro de espera.
  const linhasADesenhar = useListaProgressiva(ranking, ranking.length > 15 ? 10 : ranking.length);
  const { teams, votacaoStatus } = useSessao();
  // votacaoStatus do SessaoContext já é da equipa PRINCIPAL (teams[0], 1x por
  // sessão) — só dispara pedido próprio quando esta página é de OUTRA equipa.
  const usaVotacaoDoContexto = slug === teams[0]?.slug;
  const { data: votacaoPropria } = useApi(!usaVotacaoDoContexto && slug ? `/api/teams/${slug}/votacao-status` : null);
  const status = usaVotacaoDoContexto ? votacaoStatus : votacaoPropria;
  const equipaAtual = teams.find((t) => t.slug === slug) || null;

  const [voteModal, setVoteModal] = useState(null); // jogador a votar
  const [modalNota, setModalNota] = useState(0);
  const [voteBusy, setVoteBusy] = useState(false);
  const [toast, setToast] = useState(null);
  const [bannerFechado, setBannerFechado] = useState(false);
  const celebrouTop3 = useRef(false);
  const festaRef = useRef(null);
  useEffect(() => () => clearTimeout(festaRef.current), []);

  // Confetti uma vez se o utilizador estiver no pódio (top 3). Velocidade 7B: sai
  // 400 ms depois de a lista estar na tela — criar o canvas de tela cheia e o
  // worker do confetti no mesmo instante da primeira pintura disputava-a.
  useEffect(() => {
    if (celebrouTop3.current) return;
    const meu = ranking.find((p) => p.sou_eu && p.posicao <= 3);
    if (meu) {
      celebrouTop3.current = true;
      festaRef.current = setTimeout(() => celebrarTop3(meu.posicao), 400);
    }
  }, [ranking]);

  function openVote(player) {
    setVoteModal(player);
    setModalNota(player.minha_nota ?? 0);
  }

  async function confirmVote() {
    if (!voteModal || !(modalNota >= 0.5)) return;
    setVoteBusy(true);
    try {
      await apiFetch(`/api/teams/${slug}/votar`, {
        method: 'POST',
        body: JSON.stringify({ para_user_id: voteModal.user_id, nota: modalNota }),
      });
      setVoteModal(null);
      await reload();
      setToast({ tipo: 'success', mensagem: 'Voto salvo!' });
    } catch (err) {
      setToast({ tipo: 'error', mensagem: err.message });
    } finally {
      setVoteBusy(false);
    }
  }

  const mostrarBanner = status?.pedido_revotacao && !bannerFechado;

  return (
    <div className="app-shell page-reveal">
      <Topbar hud="RANKING" back={semTime ? undefined : `/equipa/${slug}`} />
      <main className="app-main">
        {semTime ? (
          <EstadoSemTime icone="trofeu" mensagem="O ranking nasce com o seu time. Crie o seu ou entre em um." />
        ) : (
          <>
            {/* Cabeçalho: escudo + nome da equipa actual. */}
            {equipaAtual ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <EscudoEquipa team={equipaAtual} size={40} />
                <span style={{ fontFamily: "'Rajdhani', sans-serif", fontWeight: 800, fontSize: 20, letterSpacing: '0.04em' }}>{equipaAtual.nome}</span>
              </div>
            ) : null}

            {/* Chips das equipas do utilizador (sem "Todas"); trocar chip troca o ranking.
                Com 1 equipa só, escondidos (não há escolha). */}
            {teams.length > 1 ? (
              <div className="chips-row" style={{ marginBottom: 12 }}>
                {teams.map((t) => (
                  <Link
                    key={t.id}
                    to={`/equipa/${t.slug}/ranking`}
                    className={`chip ${t.slug === slug ? 'chip--active tab-shine' : ''}`}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 7, textDecoration: 'none' }}
                  >
                    <EscudoEquipa team={t} size={20} />
                    {t.nome}
                  </Link>
                ))}
              </div>
            ) : null}

            {mostrarBanner ? (
              <div className="rank-banner hud-corners">
                <span style={{ flex: 1 }}>Atualize suas notas</span>
                <button type="button" className="rank-banner__close" aria-label="Fechar" onClick={() => setBannerFechado(true)}>✕</button>
              </div>
            ) : null}

            {error && ranking.length === 0 ? <EstadoErroRede onRepetir={reload} /> : null}

            {loading && ranking.length === 0 ? (
              <LoadingFutty />
            ) : ranking.length === 0 ? (
              /* P3-18 — vazio DIGNO com próximo passo (antes: só "Ainda não há jogadores"). */
              <div style={{ textAlign: 'center', padding: '30px 16px', display: 'grid', gap: 14, justifyItems: 'center' }}>
                <p className="muted" style={{ margin: 0, fontSize: 14, color: '#c9c2d6' }}>O ranking nasce do 1º jogo.</p>
                {equipaAtual?.role === 'admin' ? (
                  <Link to={`/equipa/${slug}/jogo/novo`} className="btn btn--sm hud-corners-s cta-gold" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '0 18px', fontFamily: "'Rajdhani', sans-serif", letterSpacing: '0.06em', textTransform: 'uppercase', textDecoration: 'none' }}>
                    Criar o 1º jogo
                  </Link>
                ) : (
                  <p className="muted" style={{ margin: 0, fontSize: 12 }}>Assim que houver jogo e votos, aparece aqui.</p>
                )}
              </div>
            ) : (
              <ListaRanking ranking={ranking}>
                {linhasADesenhar.map((p, idx) => (
                  <RankRow key={p.user_id} p={p} idx={idx} slug={slug} onVote={openVote} />
                ))}
                {/* RODADA 12A — as linhas que ainda não montaram ficam como
                    esqueleto, nunca como espaço vazio. A lista entra de 5 em 5
                    (useListaProgressiva) e até aqui quem rolava depressa via a
                    lista acabar a meio e voltar a crescer — lê-se como defeito,
                    não como carregamento. O esqueleto tem a altura exata da
                    linha, por isso a rolagem já nasce do tamanho certo e nada
                    salta quando a linha real ocupa o lugar. */}
                {ranking.slice(linhasADesenhar.length).map((p) => (
                  <div key={`esqueleto-${p.user_id}`} className="rank-row-esqueleto" aria-hidden="true" />
                ))}
              </ListaRanking>
            )}
          </>
        )}
      </main>

      {/* Modal de votação (meias estrelas). PORTAL para o body (Rodada 8A): dentro
          do [data-page], o transform da animação de entrada vira o "chão" do
          position:fixed e o modal centrava-se na PÁGINA inteira, não na tela — com
          a lista rolada ficava fora de quadro e a barra de baixo por cima do véu. */}
      {voteModal && createPortal(
        <div className="modal-overlay" role="presentation" onClick={() => !voteBusy && setVoteModal(null)}>
          <div className="modal-card modal-card--hud" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <div className="modal-card__inner">
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
                <FrameAvatar nome={nomeExibicao(voteModal)} avatarUrl={voteModal.avatar_url} size={64} />
              </div>
              <h2 style={{ fontSize: 18, marginBottom: 14 }}>{nomeExibicao(voteModal)}</h2>
              <MeiaEstrelas value={modalNota} onChange={setModalNota} />
              <div style={{ marginTop: 12, fontSize: 14, color: 'var(--text-dim)' }}>
                {modalNota >= 0.5 ? (
                  <>Sua nota: <b style={{ fontFamily: "'Rajdhani', sans-serif", color: 'var(--neon)', fontSize: 16 }}>{notaParaExibir(modalNota).toFixed(1)}</b></>
                ) : (
                  'Escolha de 0.5 a 5 estrelas'
                )}
              </div>
              <button type="button" className="btn btn--primary btn--hud hud-corners-s" style={{ width: '100%', marginTop: 16 }} disabled={voteBusy || !(modalNota >= 0.5)} onClick={confirmVote}>
                {voteBusy ? 'Salvando…' : 'Salvar voto'}
              </button>
              <button type="button" className="btn btn--ghost btn--sm btn--hud hud-corners-s" style={{ width: '100%', marginTop: 10 }} disabled={voteBusy} onClick={() => setVoteModal(null)}>
                Cancelar
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {toast ? <Toast mensagem={toast.mensagem} tipo={toast.tipo} onClose={() => setToast(null)} /> : null}
    </div>
  );
}
