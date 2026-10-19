// Futty v2.0 — Resenha (/feed): feed social por equipa.
// Jogos passados com resultado + posts editoriais. Sem Topbar (título no conteúdo).
import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { apiFetch } from '../lib/api';
import { nomeExibicao } from '../utils/nomeExibicao';
import { primeiroNome } from '../utils/primeiroNome';
import AdCard from '../components/AdCard';
import Icon from '../components/Icon';
import Topbar from '../components/Topbar';
import { useAuth } from '../hooks/useAuth';
import { usePerfil } from '../context/PerfilContext';
import { useTeams } from '../hooks/useTeam';
import { useAd } from '../hooks/useAd';
import { useApiComCache } from '../hooks/useApiComCache';
import { useListaProgressiva } from '../hooks/useListaProgressiva';
import EscudoEquipa from '../components/EscudoEquipa';
import EstadoSemTime from '../components/EstadoSemTime';
import '../styles/app.css';
import { ComposerInline } from './feed/ComposerInline';
import { PostDoCampeao } from './feed/PostDoCampeao';
import { AnuncioCard } from './feed/AnuncioCard';
import { PostCard } from './feed/PostCard';
import { JogoCard } from './feed/JogoCard';

// Tamanho da página da Resenha (o motor aceita até 50; o app pede 20, que é o que cabe em três ou quatro telas).
const PAGINA_FEED = 20;

// Enquanto não há NADA para mostrar, três cartões-esqueleto com a forma dos de verdade (avatar, linhas, foto)
// ocupam o lugar: sem eles a Resenha, que levava mais de 5 s para mostrar os posts, parecia vazia (só o
// campo de postar e "Ver mais antigos").
function ResenhaEsqueleto() {
  return (
    <div role="status" aria-live="polite" aria-label="Carregando a resenha" data-resenha-esqueleto style={{ display: 'grid', gap: 14 }}>
      {[0, 1, 2].map((n) => (
        <div key={n} className="feed-esqueleto" aria-hidden="true">
          <div className="feed-esqueleto__topo">
            <span className="feed-esqueleto__avatar" />
            <div style={{ flex: 1, display: 'grid', gap: 6 }}>
              <span className="feed-esqueleto__linha" style={{ width: '45%' }} />
              <span className="feed-esqueleto__linha" style={{ width: '25%' }} />
            </div>
          </div>
          <span className="feed-esqueleto__linha" style={{ width: '92%' }} />
          <span className="feed-esqueleto__linha" style={{ width: '70%' }} />
          {n !== 1 ? <span className="feed-esqueleto__foto" /> : null}
        </div>
      ))}
    </div>
  );
}

// ─── Página ────────────────────────────────────────────────────────────────────
export default function Feed() {
  const { user: authUser } = useAuth();
  const { perfil } = usePerfil();
  // O usuário do Auth só tem id e e-mail; nome_jogador e avatar_url vivem no
  // perfil (/api/me). Sem isto o compositor dizia "Solte a resenha, Jogador…".
  const user = perfil?.user ? { ...authUser, ...perfil.user } : authUser;
  const { teams, loading: teamsLoading } = useTeams();
  // A resenha é por time: sem um, não há o que filtrar nem onde publicar — é o
  // mesmo convite do Ranking, com identidade própria (ver EstadoSemTime).
  // !teamsLoading evita mostrar isto por um instante antes de saber se há time.
  const semTime = !teamsLoading && teams.length === 0;

  // A Resenha entra no mesmo stale-while-revalidate do resto da casa: pinta o feed da última visita na hora e
  // actualiza por trás. Sem cache, o loader tapava a tela inteira até a resposta chegar de São Paulo, e quem
  // está em Lisboa pagava essa espera em TODA visita à aba.
  // A Resenha vem em PÁGINAS de 20 (jogos e posts juntos); "Ver mais antigos" busca a seguinte pelo
  // cursor `proximo`. Vir até 120 itens de uma vez era conta pesada, com comentários, reações e fotos de todos
  // os times da pessoa.
  const { data: feedData, loading: feedCarregando, error: feedErro } = useApiComCache(`/api/feed?limite=${PAGINA_FEED}`, 'feed');

  // O anúncio é pedido AQUI, no topo, em paralelo com o feed. Montar o AdCard só entre o 3º e o 4º item da
  // lista faria o pedido dele começar depois do /api/feed inteiro ter chegado e sido pintado — duas idas a
  // São Paulo em fila por uma faixa de 100 px.
  //
  // A página é 'resenha' (e não 'inicio' emprestado, por não existir toggle próprio): o dono liga e desliga
  // esta tela sem mexer no Início — eram duas decisões presas numa chave só.
  const { ad: adFeed, pronto: adPronto } = useAd('resenha');

  const [items, setItems] = useState(null); // null = ainda não há nada para mostrar
  const [erro, setErro] = useState('');
  const [selectedTeam, setSelectedTeam] = useState('all');
  const [imgFull, setImgFull] = useState(null);
  const [novoPostId, setNovoPostId] = useState(null); // P2-11: post acabado de criar

  // `items` continua a ser estado local porque as ações fazem optimistic update
  // por cima dele (apagar post, publicar, bloquear jogador). Sincronizado
  // DURANTE o render a partir do hook — mesmo padrão do MeuPerfil e do Início,
  // nunca num efeito (lint react-hooks/set-state-in-effect).
  const [feedAnterior, setFeedAnterior] = useState(undefined);
  const [proximo, setProximo] = useState(null); // cursor da página seguinte (null = não há mais antigos)
  const [carregandoMais, setCarregandoMais] = useState(false);
  // Erro PRÓPRIO do carregamento automático (distinto do `erro` geral da página, que o composer e o apagar
  // post também usam): é só ele que decide se o botão de reserva volta a aparecer.
  const [erroCarregarMais, setErroCarregarMais] = useState(false);
  const sentinelaRef = useRef(null);
  if (feedData !== feedAnterior) {
    setFeedAnterior(feedData);
    if (feedData) {
      setItems(feedData.items || []);
      setProximo(feedData.proximo || null);
    }
  }

  async function verMais() {
    if (!proximo || carregandoMais) return;
    setCarregandoMais(true);
    setErro('');
    setErroCarregarMais(false);
    try {
      const d = await apiFetch(`/api/feed?limite=${PAGINA_FEED}&antes=${encodeURIComponent(proximo)}`);
      setItems((cur) => {
        const jaVistos = new Set((cur || []).map((i) => `${i.kind}-${i.id}`));
        return [...(cur || []), ...(d.items || []).filter((i) => !jaVistos.has(`${i.kind}-${i.id}`))];
      });
      setProximo(d.proximo || null);
    } catch (err) {
      setErro(err.message || 'Não deu para carregar mais. Tente de novo.');
      setErroCarregarMais(true);
    } finally {
      setCarregandoMais(false);
    }
  }

  // Resenha rolando: um sentinela no fim da lista chama o MESMO verMais() quando entra na tela — sem
  // precisar do botão. Para enquanto não há mais páginas, enquanto o pedido anterior está no ar (o próprio
  // verMais já se protege) e depois de uma falha, para não martelar o motor sozinho: aí só o botão de
  // reserva (ao toque) tenta de novo. O efeito refaz a observação a cada `proximo` novo — se o sentinela já
  // estiver visível (tela alta, página pequena), o navegador dispara na hora e a próxima página já vem.
  useEffect(() => {
    const el = sentinelaRef.current;
    if (!el || !proximo || erroCarregarMais || typeof IntersectionObserver === 'undefined') return undefined;
    const obs = new IntersectionObserver((entradas) => {
      if (entradas[0]?.isIntersecting) verMais();
    }, { rootMargin: '200px' });
    obs.observe(el);
    return () => obs.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- verMais lê `carregandoMais` fechado no momento certo (o efeito só reabre quando `proximo` muda, já depois do pedido anterior terminar)
  }, [proximo, erroCarregarMais]);

  // Bloqueio entre jogadores (Apple UGC 1.2): remove localmente todo o conteúdo
  // dessa pessoa (o servidor já filtra desde já para pedidos futuros).
  async function bloquear(userId) {
    await apiFetch('/api/blocks', { method: 'POST', body: JSON.stringify({ blocked_id: userId }) });
    setItems((prev) => (prev || []).filter((i) => i.author_id !== userId));
  }

  // Equipas onde o utilizador pode publicar (admin OU pode_postar).
  const equipasParaPostar = useMemo(() => teams.filter((t) => t.role === 'admin' || t.pode_postar), [teams]);
  const podeCriar = equipasParaPostar.length > 0;

  const filtrados = useMemo(
    () => (items || []).filter((i) => selectedTeam === 'all' || i.team_id === selectedTeam),
    [items, selectedTeam]
  );
  // Os 6 primeiros no 1º commit, o resto dois quadros depois. Um card da Resenha não é uma linha de texto:
  // traz avatar, foto, reações e a prévia de até 2 comentários (com mais avatares) — vinte deles no
  // mesmo commit é uma leva de layout e pintura que segura a tela inteira.
  // Os comentários em si já não montam fechados (Comentarios devolve null
  // quando `visivel` é falso, e os efeitos dele saem cedo).
  const aDesenhar = useListaProgressiva(filtrados, 6);

  async function apagarPost(id) {
    setErro('');
    try {
      await apiFetch(`/api/feed/posts/${id}`, { method: 'DELETE' });
      setItems((cur) => (cur || []).filter((i) => !(i.kind === 'post' && i.id === id)));
    } catch (err) {
      setErro(err.message);
    }
  }

  function aoCriarPost(post) {
    if (!post) return;
    setItems((cur) => [{ ...post, kind: 'post' }, ...(cur || [])]);
    // P2-11: em feeds longos o post novo entrava sem se ver. Marca-o para o
    // efeito o rolar até à vista e piscar dourado 2s.
    setNovoPostId(post.id);
  }

  // P2-11: quando há post novo, rola até ele e limpa o destaque após 2s.
  useEffect(() => {
    if (!novoPostId) return;
    const el = document.getElementById(`feed-item-${novoPostId}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    const t = setTimeout(() => setNovoPostId(null), 2000);
    return () => clearTimeout(t);
  }, [novoPostId]);

  // Só há loader quando não há NADA para mostrar (nem cache, nem resposta).
  // Com cache, a tela pinta e a actualização acontece por trás, sem loader.
  const loading = items === null && feedCarregando;
  const meId = user?.id;
  // Fonte do nome = a do Início (nome_jogador primeiro). NUNCA o derivado do email.
  // 29I (achados 92 e 94): a regra única do nome (nomeExibicao) e o primeiro nome SEM a pontuação colada ("CHAVO, EL MATADOR" → "CHAVO")
  // — antes cortava no primeiro espaço e a vírgula ia junto: "Solte a resenha, Chavo,…".
  const primeiroNomeDoUser = primeiroNome(nomeExibicao(user)) || 'Jogador';

  return (
    <div className="app-shell page-reveal">
      <Topbar hud="RESENHA" />
      <main className="app-main" style={{ paddingLeft: 16, paddingRight: 16 }}>
        {semTime ? (
          <EstadoSemTime icone="resenha" mensagem="A resenha é do time. Crie o seu ou entre em um." />
        ) : (
          <>
            {/* 2. CHIPS DE EQUIPA */}
            <div className="chips-row">
              <button type="button" className={`chip ${selectedTeam === 'all' ? 'chip--active tab-shine' : ''}`} onClick={() => setSelectedTeam('all')}>
                Todas
              </button>
              {teams.map((t) => (
                <button key={t.id} type="button" className={`chip ${selectedTeam === t.id ? 'chip--active tab-shine' : ''}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }} onClick={() => setSelectedTeam(t.id)}>
                  <EscudoEquipa team={t} size={20} />
                  {t.nome}
                </button>
              ))}
            </div>

            {erro || feedErro ? <div className="alert alert--error" style={{ marginTop: 12 }}>{erro || feedErro}</div> : null}

            {/* 2.5 COMPOSER INLINE NO TOPO (só para quem pode publicar). Substitui o FAB. */}
            {podeCriar ? (
              <ComposerInline teams={equipasParaPostar} user={user} nome={primeiroNomeDoUser} onCreated={aoCriarPost} />
            ) : null}

            {/* 3. FEED — coluna travada na largura da tela (minmax(0, 1fr)). Com a
                coluna automática, um card largo (a prévia de comentário acima)
                alargava TODOS para 638 px num iPhone de 430: era o (b) da 7B. */}
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 14, marginTop: 14 }}>
              {loading ? (
                <ResenhaEsqueleto />
              ) : filtrados.length === 0 ? (
                // Estado vazio de verdade: diz que está vazio e o que fazer — não só um "não há jogos". Com um time escolhido
                // no chip, a frase é desse time.
                <div className="empty-state" data-resenha-vazia style={{ marginTop: 8 }}>
                  <div className="empty-state__emoji"><Icon name="resenha" size={40} /></div>
                  <p className="muted">{selectedTeam === 'all' ? 'Ainda não tem resenha por aqui.' : 'Esse time ainda não tem resenha.'}</p>
                  <p className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                    {podeCriar ? 'Seja o primeiro: o campo de cima é para isso.' : 'Quando alguém postar ou um jogo for fechado, aparece aqui.'}
                  </p>
                </div>
              ) : (
                aDesenhar.map((item, i) => {
                  const equipa = teams.find((t) => t.id === item.team_id);
                  const ehAdmin = equipa?.role === 'admin';
                  const slug = equipa?.slug || item.team_slug || null;
                  const inner =
                    item.kind === 'post' && item.conteudo?.tipo === 'campeao_campeonato' ? (
                      <PostDoCampeao p={item} isAdmin={ehAdmin} teamSlug={slug} index={i} />
                    ) : item.kind === 'post' && item.tipo === 'anuncio' ? (
                      <AnuncioCard p={item} index={i} />
                    ) : item.kind === 'post' ? (
                      <PostCard
                        p={item}
                        podeApagar={item.author_id === meId || ehAdmin}
                        isAdmin={ehAdmin}
                        teamSlug={slug}
                        meId={meId}
                        onDelete={apagarPost}
                        onOpenImage={setImgFull}
                        onBloquear={bloquear}
                        index={i}
                      />
                    ) : (
                      <JogoCard j={item} isAdmin={ehAdmin} teamSlug={slug} onOpenImage={setImgFull} index={i} />
                    );
                  // P2-11: âncora de scroll + destaque dourado no post recém-criado.
                  const card = (
                    <div
                      key={`item-${item.kind}-${item.id}`}
                      id={`feed-item-${item.id}`}
                      className={`feed-item${item.kind === 'post' && item.id === novoPostId ? ' post-recem' : ''}`}
                      style={{ minWidth: 0, maxWidth: '100%' }}
                    >
                      {inner}
                    </div>
                  );
                  // Anúncio nativo entre o 3º e o 4º item do feed.
                  if (i === 2) {
                    return (
                      <Fragment key={`feed-ad-${item.id}`}>
                        {card}
                        <AdCard variant="native" ad={adFeed} prontoExterno={adPronto} />
                      </Fragment>
                    );
                  }
                  return card;
                })
              )}
            </div>
            {proximo && !loading ? (
              <>
                {/* Sentinela invisível: 1px no fim da lista, para o IntersectionObserver (acima) chamar
                    verMais() sozinho. O botão abaixo é só a reserva — escondido enquanto isso funciona. */}
                <div ref={sentinelaRef} aria-hidden="true" style={{ height: 1 }} />
                {carregandoMais ? (
                  <p role="status" aria-live="polite" className="muted" style={{ textAlign: 'center', marginTop: 14 }}>Carregando…</p>
                ) : erroCarregarMais ? (
                  <button type="button" className="btn btn--purple-outline hud-corners" style={{ width: '100%', marginTop: 14 }} onClick={verMais}>
                    Ver mais antigos
                  </button>
                ) : null}
              </>
            ) : null}
          </>
        )}
      </main>

      {/* (O FAB e o sheet de Novo post morreram: o composer é inline no topo.
          Só o CropModal — dentro do UploadComCrop — e o fullscreen usam portal.) */}
      {imgFull
        ? createPortal(
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Imagem"
              onClick={() => setImgFull(null)}
              // Sem isto, um arrasto no véu encadeia a rolagem para o body por trás (WebKit).
              style={{ position: 'fixed', inset: 0, zIndex: 150, background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, overflow: 'hidden', overscrollBehavior: 'contain' }}
            >
              <img src={imgFull} alt="" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

// O que saiu deste arquivo continua exportado daqui: quem importa não muda.
export { JogoCard } from './feed/JogoCard';
export { PostDoCampeao } from './feed/PostDoCampeao';
