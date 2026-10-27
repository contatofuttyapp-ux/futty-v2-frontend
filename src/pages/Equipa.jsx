// Futty v2.0 — A página do time (hub no cânone): vidro + hud-corners + chips 45° + Rajdhani + .cta-gold.
// Posição do jogador em DESTAQUE (regra: o próprio decide; GR no roxo).
//
// ADMIN NÃO É UM LUGAR (dono). A página tem abas no estilo da Figurinha — JOGOS · ELENCO · AJUSTES — e o
// painel do admin mora nelas: Jogos (+ resultados + campeonato), Elenco (+ convites) e Ajustes (só o admin
// vê, com o selo ADMIN). A aba fica no endereço (?aba=elenco), trocar de aba não empilha histórico, e
// "Voltar" volta para onde a pessoa estava. As partes do admin vêm de pages/AdminPanel.jsx em lazy: quem
// não é admin não baixa nada delas.
import { Suspense, lazy, useEffect, useState } from 'react';
import { Link, useParams, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { ChevronRight, Trophy } from 'lucide-react';
import { apiFetch } from '../lib/api';
import { ORIGEM_DO_SITE } from '../lib/linkDoSite';
import { usePerfil } from '../context/PerfilContext';
import { useTeam, useTeamGames } from '../hooks/useTeam';
import { abaDoTime } from '../lib/rotasAntigas';
import { lazyComRetry } from '../utils/lazyComRetry';
import { urlAsset, urlImagem } from '../utils/avatar';
import { avatarGenericoUrl } from '../utils/avatarGenerico';
import { copiarTexto } from '../utils/clipboard';
import { enderecoDoWhatsapp, linkDoConvite, validadeDoConvite } from '../utils/convite';
import { plural } from '../utils/plural';
import { nomeExibicao } from '../utils/nomeExibicao';
import Topbar from '../components/Topbar';
import LoadingFutty from '../components/LoadingFutty';
import SilhuetaJogador from '../components/SilhuetaJogador';
import EscudoEquipa from '../components/EscudoEquipa';
import Toast from '../components/Toast';
import Icon from '../components/Icon';
import ListaDeJogos from '../components/ListaDeJogos';
import EscolhaLinhaGol, { TEXTO_APOIO_LINHA_GOL } from '../components/EscolhaLinhaGol';
import ForaDoTime from '../components/ForaDoTime';
import { ehForaDoTime } from '../utils/foraDoTime';
import '../styles/app.css';

// Em lazy: as boas-vindas só aparecem uma vez por time (convidado na 1ª entrada, criador ao
// tocar "Ir para o time"; uma página, um botão) e não têm motivo para pesar no arranque.
const BoasVindas = lazy(() => import('../components/BoasVindas'));
// O que só o admin usa: um chunk só, baixado quando a pessoa é admin do time.
const JogosDoAdmin = lazyComRetry(() => import('./AdminPanel').then((m) => ({ default: m.JogosDoAdmin })));
const ElencoDoAdmin = lazyComRetry(() => import('./AdminPanel').then((m) => ({ default: m.ElencoDoAdmin })));
const AjustesDoTime = lazyComRetry(() => import('./AdminPanel').then((m) => ({ default: m.AjustesDoTime })));
// A aba Mensalidade só existe com a mensalidade ligada: quem não tem a aba não baixa nada dela.
const AbaMensalidade = lazyComRetry(() => import('./mensalidade/AbaMensalidade'));

const VIDRO = { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' };
const CLIP = 'polygon(8px 0, calc(100% - 8px) 0, 100% 8px, 100% calc(100% - 8px), calc(100% - 8px) 100%, 8px 100%, 0 calc(100% - 8px), 0 8px)';
const CLIP_S = 'polygon(5px 0, calc(100% - 5px) 0, 100% 5px, 100% calc(100% - 5px), calc(100% - 5px) 100%, 5px 100%, 0 calc(100% - 5px), 0 5px)';

// Moldura V1 (a mesma família do Ranking).
// Sem foto, mas com identidade (userId), mostra o avatar genérico da casa — nunca
// a silhueta "?".
function FrameAvatar({ avatarUrl, userId = null, avatarGenerico = null, nome = null, size = 40 }) {
  const src = avatarUrl ? urlImagem(urlAsset(avatarUrl), 128, { quadrado: true }) : (userId != null ? avatarGenericoUrl(userId, avatarGenerico, nome) : null);
  return (
    <span className="avatar-frame" style={{ width: size, height: size }}>
      <span className="avatar-frame__fill" style={{ fontSize: Math.round(size * 0.34) }}>
        {src ? <img src={src} alt="" decoding="async" /> : <SilhuetaJogador size="74%" />}
      </span>
      <span className="avatar-frame__veil" />
      <span className="avatar-frame__lc avatar-frame__lc--tl" />
      <span className="avatar-frame__lc avatar-frame__lc--tr" />
      <span className="avatar-frame__lc avatar-frame__lc--br" />
      <span className="avatar-frame__lc avatar-frame__lc--bl" />
    </span>
  );
}

function SecLabel({ children }) {
  return (
    <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 12, fontWeight: 700, letterSpacing: '0.14em', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', margin: '24px 0 10px' }}>
      {children}
    </div>
  );
}

// Badge 45° (papel do membro / posição).
function Badge45({ children, gold }) {
  return (
    <span style={{ fontFamily: "'Rajdhani', sans-serif", fontWeight: 800, fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '3px 9px', clipPath: CLIP_S, flexShrink: 0, color: gold ? '#f0c94a' : 'rgba(255,255,255,0.72)', border: gold ? '1px solid rgba(212,160,23,0.6)' : '1px solid rgba(255,255,255,0.2)', background: gold ? 'rgba(212,160,23,0.10)' : 'rgba(255,255,255,0.04)' }}>
      {children}
    </span>
  );
}

// As abas, no estilo das da Figurinha (as mesmas medidas). O Painel só para o admin, com o selo ADMIN.
// O Ranking é um item do MESMO tamanho das abas, na mesma linha — uma barra solta, de largura total,
// parecia banner, não botão (mas é navegação para outra página, não uma aba: por isso fica fora do
// role="tablist", sem role="tab").
// Tudo o que decide a LARGURA da aba (fonte, espaçamento, selo) vive na classe .aba-time (app.css), que muda
// por largura de tela, e não no estilo em linha. Com `flex: 1` (partes iguais) a aba "Painel" + selo ADMIN
// não cabia na sua parte e empurrava o resto; por isso cada aba tem a largura do próprio texto e divide a
// sobra. Em telas estreitas o selo vira um ponto dourado.
const ESTILO_ABA = (on) => ({
  height: 36,
  border: on ? '1px solid var(--border-accent)' : '1px solid transparent',
  background: on ? 'rgba(139,92,246,0.2)' : 'transparent',
  color: on ? '#8b5cf6' : 'var(--label-color)',
  fontFamily: "'Rajdhani', sans-serif",
  fontWeight: 700,
  textTransform: 'uppercase',
  cursor: 'pointer',
  transition: 'all 0.15s ease',
  textDecoration: 'none',
});

function AbasDoTime({ aba, ehAdmin, mensalidade = false, aoTrocar, slug }) {
  const abas = [['jogos', 'Jogos'], ['elenco', 'Elenco'], ...(mensalidade ? [['mensalidade', 'Mensalidade']] : []), ...(ehAdmin ? [['ajustes', 'Painel']] : [])];
  // Quatro abas (admin com a mensalidade ligada) não cabem com o selo ADMIN escrito e o "Ranking" por extenso num celular de 360 px:
  // a linha CHEIA usa o selo em ponto (o mesmo das telas estreitas) e o Ranking vira o troféu da barra de baixo. O resto fica como sempre.
  const cheia = abas.length >= 4;
  return (
    <div className={cheia ? 'abas-time--cheia' : undefined} style={{ display: 'flex', gap: 6, marginTop: 14 }}>
      <div role="tablist" aria-label="Seções do time" style={{ display: 'flex', gap: 6, flex: `${abas.length} 1 auto`, minWidth: 0 }}>
        {abas.map(([k, rotulo]) => {
          const on = aba === k;
          return (
            <button
              key={k}
              type="button"
              role="tab"
              className="hud-corners-s aba-time"
              data-aba={k}
              aria-selected={on}
              aria-pressed={on}
              onClick={() => aoTrocar(k)}
              style={ESTILO_ABA(on)}
            >
              {rotulo}
              {k === 'ajustes' ? (
                <span data-selo-admin className="aba-time__selo" style={{ clipPath: CLIP_S }}>ADMIN</span>
              ) : null}
            </button>
          );
        })}
      </div>
      <Link to={`/time/${slug}/ranking`} className="hud-corners-s aba-time" data-botao-ranking aria-label={cheia ? 'Ranking' : undefined} title={cheia ? 'Ranking' : undefined} style={{ ...ESTILO_ABA(false), ...(cheia ? { flex: '0 0 auto', padding: '0 10px' } : null) }}>
        {cheia ? <Trophy size={17} aria-hidden="true" /> : 'Ranking'}
      </Link>
    </div>
  );
}

// A aba Jogos de quem não é admin: a lista do time (os próximos e os que já foram), cada um levando ao jogo.
function JogosDoTime({ slug }) {
  const { team, games, loading, error, errorStatus, errorCode } = useTeamGames(slug);
  if (loading) return <LoadingFutty />;
  if (ehForaDoTime({ status: errorStatus, code: errorCode, mensagem: error })) return <ForaDoTime compacto />;
  if (error) return <div className="alert alert--error">{error}</div>;
  return <ListaDeJogos slug={slug} team={team} games={games} />;
}

export default function Equipa() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { team, members, loading, error, errorStatus, errorCode, reload } = useTeam(slug);
  const foraDoTime = ehForaDoTime({ status: errorStatus, code: errorCode, mensagem: error });
  const ehAdmin = team?.role === 'admin';
  const temMensalidade = team?.mensalidade_ativa === true;
  const aba = abaDoTime(searchParams.get('aba'), ehAdmin, { mensalidade: temMensalidade });
  // Trocar de aba troca o endereço SEM empilhar histórico: "Voltar" continua indo para onde a pessoa estava antes da página do time.
  function trocarAba(k) {
    setSearchParams((prev) => {
      const p = new URLSearchParams(prev);
      p.set('aba', k);
      p.delete('convidar');
      p.delete('mes');
      return p;
    }, { replace: true });
  }
  const [versaoConvites, setVersaoConvites] = useState(0); // o "Convidar" gerou um link → a lista de links ativos recarrega
  const { perfil: me } = usePerfil();
  const [confirmarSaida, setConfirmarSaida] = useState(false);
  const [saindo, setSaindo] = useState(false);

  async function sairDaEquipa() {
    if (saindo) return;
    setSaindo(true);
    try {
      await apiFetch(`/api/teams/${slug}/membros/me`, { method: 'DELETE' });
      navigate('/home', { replace: true });
    } catch (e) {
      setToast({ tipo: 'error', mensagem: e.message });
      setSaindo(false);
      setConfirmarSaida(false);
    }
  }

  const [posBusy, setPosBusy] = useState(false);
  const [inviteLink, setInviteLink] = useState('');
  const [inviteExpira, setInviteExpira] = useState(null); // quando o link vence (expires_at do motor)
  const [inviteVencido, setInviteVencido] = useState(false);
  const [copied, setCopied] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [actionError, setActionError] = useState('');

  const [pedidos, setPedidos] = useState([]);
  const [busyPedido, setBusyPedido] = useState(null);
  const [toast, setToast] = useState(null);

  const meuId = me?.user?.id;
  // `goleiro` é o campo único (fonte: team_members.categoria) —
  // a pastilha "GR" do admin e este chip nunca podem discordar.
  const souGoleiroNoTime = !!members.find((m) => m.id === meuId)?.goleiro;

  // Boas-vindas, uma vez por time (localStorage por equipa): `convidado` — 1ª vez de um jogador que não
  // fundou a equipa, logo depois de aceitar o convite (a página do convite manda `state.primeiraEntrada`) ou
  // ainda sem avatar. O admin que acabou de criar o time já comemorou no fim do Criar time: aqui não abre
  // nada para ele.
  const [onboardingDispensado, setOnboardingDispensado] = useState(false);
  const onboardingKey = team ? `futty_onboarding_${team.id}` : null;
  // Quem foi aceito num pedido também chega como primeira entrada — pelo card do Início (state) ou pela
  // notificação do motor (`/time/:slug?entrou=1`).
  const entrouAgora = !!location.state?.primeiraEntrada || new URLSearchParams(location.search).get('entrou') === '1';
  const varianteBoasVindas = !team || team.role === 'admin'
    ? null
    : (entrouAgora || !me?.user?.avatar_url ? 'convidado' : null);
  const mostrarOnboarding =
    !!me &&
    !!varianteBoasVindas &&
    !onboardingDispensado &&
    !(onboardingKey && localStorage.getItem(onboardingKey));

  function fecharOnboarding({ mudou, erro } = {}) {
    if (onboardingKey) localStorage.setItem(onboardingKey, '1');
    setOnboardingDispensado(true);
    // Dispensar a tela do convidado ativa o banner CTA da figurinha no Início (mostra uma vez); o criador não, como antes.
    if (varianteBoasVindas === 'convidado') localStorage.setItem('futty_cta_figurinha', '1');
    if (mudou) reload();
    if (erro) setToast({ tipo: 'error', mensagem: `Não deu para salvar sua posição: ${erro}` });
  }

  // Liga/desliga o goleiro do time (booleano só, grava categoria).
  async function escolherGoleiro(ligado) {
    if (posBusy) return;
    setPosBusy(true);
    try {
      await apiFetch(`/api/equipas/${slug}/membros/posicao`, { method: 'PATCH', body: JSON.stringify({ goleiro: ligado }) });
      await reload();
    } catch (e) {
      setToast({ tipo: 'error', mensagem: e.message });
    } finally {
      setPosBusy(false);
    }
  }

  // Onboarding dia-1: "você é goleiro?" ficou em pref local — aplica-se aqui, no
  // 1º time em que o jogador entra ainda como jogador de linha (e a pref morre).
  // O cadastro já não pergunta; isto só serve a quem respondeu antes.
  // (set-state-in-effect justificado: é uma acção one-shot pós-onboarding — dispara
  // o MESMO fluxo do clique no chip, uma única vez, e a pref morre.)
  useEffect(() => {
    if (!team || !meuId || posBusy) return;
    if (!souGoleiroNoTime && localStorage.getItem('futty_pref_gr') === 'GL') {
      localStorage.removeItem('futty_pref_gr');
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot pós-onboarding
      escolherGoleiro(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- corre 1x quando team+me carregam
  }, [team, meuId]);

  // Carrega os pedidos pendentes (só se for admin).
  useEffect(() => {
    if (!team || team.role !== 'admin') return undefined;
    let ativo = true;
    apiFetch(`/api/teams/${slug}/pedidos`)
      .then((d) => ativo && setPedidos(d.pedidos || []))
      .catch(() => {});
    return () => {
      ativo = false;
    };
  }, [team, slug]);

  async function decidirPedido(pedidoId, status) {
    setBusyPedido(pedidoId);
    try {
      await apiFetch(`/api/teams/${slug}/pedidos/${pedidoId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      setPedidos((cur) => cur.filter((p) => p.id !== pedidoId));
      setToast({ tipo: status === 'approved' ? 'success' : 'info', mensagem: status === 'approved' ? 'Jogador adicionado.' : 'Pedido rejeitado.' });
      if (status === 'approved') reload();
    } catch (e) {
      setToast({ tipo: 'error', mensagem: e.message });
    } finally {
      setBusyPedido(null);
    }
  }

  function mostrarConvite({ token, codigo, expires_at: expira, vencido = false }) {
    // O link curto com o nome do time (/c/<nome>-<código>) quando há código; o longo continua valendo.
    setInviteLink(linkDoConvite({ origem: ORIGEM_DO_SITE, token, codigo, nomeTime: team?.nome }));
    setInviteExpira(expira || null);
    setInviteVencido(!!vencido);
  }

  // "Gerar link novo": um link novo, valendo 30 dias a partir de agora (os anteriores continuam valendo até vencer ou o admin revogar).
  async function gerarConvite() {
    setActionError('');
    setCopied(false);
    setGenerating(true);
    try {
      mostrarConvite(await apiFetch(`/api/teams/${slug}/convite`, { method: 'POST' }));
      setVersaoConvites((v) => v + 1);
    } catch (err) {
      setActionError(err.message);
    } finally {
      setGenerating(false);
    }
  }

  // "Convidar": o link ATUAL do time, com a validade. Só gera um novo se o time nunca teve link.
  async function abrirConvite() {
    setActionError('');
    setCopied(false);
    setGenerating(true);
    try {
      const { convite } = await apiFetch(`/api/teams/${slug}/convite/atual`);
      if (convite) {
        mostrarConvite(convite);
        setGenerating(false);
        return;
      }
    } catch {
      // motor antigo (sem a rota): gera um link, como antes
    }
    await gerarConvite();
  }

  const pediuConvite = searchParams.get('convidar') === '1';
  useEffect(() => {
    if (!pediuConvite || !team || inviteLink || generating) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot: o atalho "Convidar" do Início pede o link ao abrir
    abrirConvite();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- corre 1x quando o time carrega com ?convidar=1
  }, [pediuConvite, team]);

  async function copiar() {
    const ok = await copiarTexto(inviteLink);
    setCopied(ok);
    if (!ok) setActionError('Não deu para copiar. Copie o link à mão.');
  }

  // A validade do link do convite na tela ("Vale até 26/11 (30 dias)"); o relógio pode vencê-lo com a tela aberta.
  const validade = inviteExpira ? validadeDoConvite(inviteExpira, { fuso: team?.fuso }) : null;
  const conviteVencido = inviteVencido || (!!inviteExpira && !validade);

  // Quem não é do time vê o aviso próprio (abaixo), não a frase do motor num alerta vermelho.
  const erroNaTela = foraDoTime ? actionError : error || actionError;

  return (
    <div className="app-shell">
      <Topbar hud="TIME" back="voltar" backFallback="/home" />
      <main className="app-main page-reveal">
        {erroNaTela && <div className="alert alert--error">{erroNaTela}</div>}

        {loading ? (
          <LoadingFutty />
        ) : !team ? (
          foraDoTime ? <ForaDoTime /> : !error && <p className="muted">Time não encontrado.</p>
        ) : (
          <>
            {/* Identidade — escudo + nome + meta + papel */}
            <div className="hud-corners" style={{ ...VIDRO, clipPath: CLIP, display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px' }}>
              <EscudoEquipa team={team} size={52} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: "'Rajdhani', sans-serif", fontWeight: 800, fontSize: 22, lineHeight: 1.1 }}>{team.nome}</div>
                <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>
                  {members.length} {plural(members.length, 'membro', 'membros')}
                </div>
              </div>
              {team.role ? <Badge45 gold={team.role === 'admin'}>{team.role === 'admin' ? 'ADMIN' : 'MEMBRO'}</Badge45> : null}
            </div>

            {/* O card do PRÓPRIO jogador, no topo (num chip no meio da página ninguém o achava): linha ou gol, escrito
                por extenso. `goleiro` é o campo único (team_members.categoria) — a pastilha "GR" do admin e esta escolha
                nunca discordam. Ligado, cada jogo deste time já nasce com você no gol. */}
            {meuId && members.some((m) => m.id === meuId) ? (
              <div className="hud-corners" style={{ ...VIDRO, clipPath: CLIP, marginTop: 10, padding: '12px 14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <FrameAvatar nome={nomeExibicao(me.user)} avatarUrl={me?.user?.avatar_url} userId={meuId} avatarGenerico={me?.user?.avatar_generico} size={44} />
                  <div style={{ flex: 1, minWidth: 0, display: 'grid', gap: 6, justifyItems: 'start' }}>
                    <div style={{ fontFamily: "'Rajdhani', sans-serif", fontWeight: 800, fontSize: 15, lineHeight: 1.1, maxWidth: '100%', overflowWrap: 'anywhere' }}>{nomeExibicao(me.user)}</div>
                    {team.joga === false ? (
                      <span className="chip" data-so-organizo style={{ color: '#f0c94a', borderColor: 'rgba(212,160,23,0.5)', background: 'rgba(212,160,23,0.08)' }}>Você só organiza o time</span>
                    ) : (
                      <EscolhaLinhaGol goleiro={souGoleiroNoTime} ocupado={posBusy} aoTrocar={escolherGoleiro} />
                    )}
                  </div>
                </div>
                <p className="texto-apoio">
                  {team.joga === false
                    ? 'Você não entra na lista de presença, no sorteio nem no ranking. Dá para mudar nas configurações do time.'
                    : TEXTO_APOIO_LINHA_GOL}
                </p>
              </div>
            ) : null}

            <AbasDoTime aba={aba} ehAdmin={ehAdmin} mensalidade={temMensalidade} aoTrocar={trocarAba} slug={slug} />

            <div style={{ marginTop: 14 }} role="tabpanel" data-painel-aba={aba}>
            {aba === 'jogos' ? (
              ehAdmin ? (
                <Suspense fallback={<LoadingFutty />}>
                  <JogosDoAdmin slug={slug} team={team} showToast={(mensagem, tipo = 'success') => setToast({ mensagem, tipo })} navigate={navigate} />
                </Suspense>
              ) : (
                <JogosDoTime slug={slug} />
              )
            ) : null}

            {aba === 'ajustes' ? (
              <Suspense fallback={<LoadingFutty />}>
                <AjustesDoTime slug={slug} team={team} members={members} showToast={(mensagem, tipo = 'success') => setToast({ mensagem, tipo })} onMudou={reload} />
              </Suspense>
            ) : null}

            {aba === 'mensalidade' ? (
              <Suspense fallback={<LoadingFutty />}>
                <AbaMensalidade slug={slug} meId={meuId} mesInicial={searchParams.get('mes')} showToast={(mensagem, tipo = 'success') => setToast({ mensagem, tipo })} aoAbrirAjustes={() => trocarAba('ajustes')} />
              </Suspense>
            ) : null}

            {aba === 'elenco' ? (
            <>
            {/* O "Convidar" é a ação principal da aba (o dourado): abre o link do convite, curto, pronto para o grupo. */}
            <button
              type="button"
              className="btn hud-corners-s cta-gold"
              data-convidar
              style={{ width: '100%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: "'Rajdhani', sans-serif", letterSpacing: '0.08em', textTransform: 'uppercase' }}
              onClick={abrirConvite}
              disabled={generating}
            >
              <Icon name="partilhar" size={15} /> {generating && !inviteLink ? 'Abrindo…' : 'Convidar'}
            </button>
            {inviteLink ? null : (
              <p className="texto-apoio" style={{ marginBottom: 0 }}>
                Manda no grupo do seu time. O mesmo link serve para todo mundo, vale 30 dias e o admin pode revogar quando quiser.
              </p>
            )}

            {inviteLink && (
              <div style={{ ...VIDRO, clipPath: CLIP, padding: '12px 14px', marginTop: 10 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                  <strong style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 13, letterSpacing: '0.06em' }}>Link do convite</strong>
                  {/* A validade (o link vence; o admin gera outro quando quiser). Vencido: diz, e o link não sai para o grupo. */}
                  {conviteVencido ? (
                    <span data-convite-vencido style={{ fontSize: 12, fontWeight: 800, color: '#fda4af' }}>Vencido</span>
                  ) : inviteExpira ? (
                    <span data-convite-validade style={{ fontSize: 12, color: 'var(--text-dim)' }}>{validade}</span>
                  ) : null}
                </div>
                {conviteVencido ? (
                  <p className="texto-apoio" style={{ margin: '6px 0 0' }}>Este link venceu e não abre mais. Gere um novo para mandar no grupo.</p>
                ) : (
                <>
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <input className="input input--hud" readOnly value={inviteLink} onFocus={(e) => e.target.select()} style={{ flex: 1, minWidth: 0 }} />
                  <button type="button" className="btn btn--sm btn--outline hud-corners-s" onClick={copiar}>
                    {copied ? 'Copiado' : 'Copiar'}
                  </button>
                </div>
                {/* A frase aprovada pelo dono já vem escrita no WhatsApp ("Bora jogar? Você foi chamado para o <time> no
                    Futty…"). */}
                <a
                  href={enderecoDoWhatsapp({ nomeTime: team.nome, link: inviteLink })}
                  target="_blank"
                  rel="noreferrer"
                  data-whatsapp
                  className="btn btn--sm btn--outline hud-corners-s"
                  style={{ marginTop: 8, width: '100%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', color: '#7bd88f', borderColor: 'rgba(123,216,143,0.45)', background: 'rgba(123,216,143,0.06)' }}
                >
                  Mandar no WhatsApp
                </a>
                </>
                )}
                <button type="button" data-gerar-link-novo className="btn btn--ghost btn--sm" style={{ marginTop: 8 }} disabled={generating} onClick={gerarConvite}>
                  {generating ? 'Gerando…' : 'Gerar link novo'}
                </button>
              </div>
            )}

            {ehAdmin && pedidos.length > 0 && (
              <>
                <SecLabel>Pedidos de entrada · {pedidos.length}</SecLabel>
                <div style={{ display: 'grid', gap: 8 }}>
                  {pedidos.map((p) => (
                    <div key={p.id} style={{ ...VIDRO, clipPath: CLIP, display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px' }}>
                      <FrameAvatar nome={p.nome_jogador || p.nome || 'Jogador'} avatarUrl={p.avatar_url} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, fontSize: 14 }}>{p.nome_jogador || p.nome || 'Jogador'}</div>
                        {p.mensagem && <div style={{ fontSize: 11, color: 'var(--text-dim)', whiteSpace: 'normal' }}>{p.mensagem}</div>}
                      </div>
                      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                        <button type="button" className="btn btn--sm btn--outline hud-corners-s" style={{ fontFamily: "'Rajdhani', sans-serif", letterSpacing: '0.06em', color: '#f0c94a', borderColor: 'rgba(212,160,23,0.6)' }} disabled={busyPedido === p.id} onClick={() => decidirPedido(p.id, 'approved')}>
                          Aprovar
                        </button>
                        <button type="button" className="btn btn--sm btn--outline hud-corners-s" style={{ borderColor: 'rgba(248,113,113,0.45)', color: '#fda4af' }} disabled={busyPedido === p.id} onClick={() => decidirPedido(p.id, 'rejected')}>
                          Rejeitar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            <SecLabel>Elenco · {members.length}</SecLabel>
            {ehAdmin ? (
              <>
                {/* Um toque no nome abre tudo o que o admin faz com aquele membro (o "⋯" saiu). */}
                <p className="texto-apoio" style={{ marginTop: -4, marginBottom: 10 }}>Toque num nome para ver o que dá para fazer.</p>
                <Suspense fallback={<LoadingFutty />}>
                  <ElencoDoAdmin slug={slug} nomeTime={team?.nome} meId={meuId} showToast={(mensagem, tipo = 'success') => setToast({ mensagem, tipo })} versaoConvites={versaoConvites} />
                </Suspense>
                {/* Mensalidade desligada: um convite discreto que leva ao cartão dela no Painel. Ligada, a aba já diz tudo. */}
                {!temMensalidade ? (
                  <button type="button" data-convite-mensalidade onClick={() => navigate(`/time/${slug}?aba=ajustes#mensalidade`, { replace: true })}
                    style={{ ...VIDRO, clipPath: CLIP, width: '100%', marginTop: 14, padding: '12px 14px', display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', alignItems: 'center', gap: 10, textAlign: 'left', color: '#fff', cursor: 'pointer' }}>
                    <span>
                      <span style={{ display: 'block', fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, fontSize: 14 }}>Controle a mensalidade do time</span>
                      <span style={{ display: 'block', fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>Quem pagou e quem não pagou, mês a mês.</span>
                    </span>
                    <ChevronRight size={16} aria-hidden="true" />
                  </button>
                ) : null}
              </>
            ) : (
            <div style={{ ...VIDRO, clipPath: CLIP, padding: '4px 12px' }}>
              {members.map((m, i) => (
                <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderTop: i === 0 ? 'none' : '1px solid rgba(255,255,255,0.06)' }}>
                  <FrameAvatar nome={nomeExibicao(m)} avatarUrl={m.avatar_url} userId={m.id} avatarGenerico={m.avatar_generico} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, fontSize: 14, lineHeight: 1.15 }}>{nomeExibicao(m)}</div>
                  </div>
                  {m.joga === false ? <Badge45>ORGANIZA</Badge45> : null}
                  {m.goleiro ? <Badge45 gold>GOL</Badge45> : null}
                  <Badge45 gold={m.role === 'admin'}>{m.role === 'admin' ? 'ADMIN' : 'MEMBRO'}</Badge45>
                </div>
              ))}
              {members.length === 0 && <p className="muted" style={{ padding: '10px 2px' }}>Nenhum membro ainda.</p>}
            </div>
            )}

            {/* SAIR DA EQUIPA — zona discreta no FIM (acção destrutiva não compete
                com o resto). História preservada; regresso = novo pedido. */}
            <div style={{ marginTop: 36, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.06)', textAlign: 'center' }}>
              {confirmarSaida ? (
                <div style={{ ...VIDRO, clipPath: CLIP, padding: '14px 16px', borderColor: 'rgba(248,113,113,0.35)' }}>
                  <div style={{ fontFamily: "'Rajdhani', sans-serif", fontWeight: 800, fontSize: 14, color: '#fda4af' }}>Você vai sair de {team.nome}</div>
                  <div className="texto-apoio texto-apoio--centro" style={{ marginBottom: 12 }}>
                    Sua história (jogos, notas, prêmios) fica; você sai do ranking e dos próximos jogos. Para voltar, peça entrada de novo.
                  </div>
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                    <button type="button" className="btn btn--sm hud-corners-s" style={{ color: '#fda4af', border: '1.5px solid rgba(248,113,113,0.5)', background: 'rgba(248,113,113,0.08)', fontFamily: "'Rajdhani', sans-serif", letterSpacing: '0.06em' }} disabled={saindo} onClick={sairDaEquipa}>
                      {saindo ? 'Saindo…' : 'Sair mesmo'}
                    </button>
                    <button type="button" className="btn btn--sm btn--outline hud-corners-s" disabled={saindo} onClick={() => setConfirmarSaida(false)}>
                      Ficar
                    </button>
                  </div>
                </div>
              ) : (
                <button type="button" onClick={() => setConfirmarSaida(true)} style={{ background: 'none', border: 'none', color: '#6f6a80', fontFamily: "'Rajdhani', sans-serif", fontSize: 12, letterSpacing: '0.06em', cursor: 'pointer' }}>
                  Sair deste time
                </button>
              )}
            </div>
            </>
            ) : null}
            </div>
          </>
        )}
      </main>
      {toast ? <Toast mensagem={toast.mensagem} tipo={toast.tipo} onClose={() => setToast(null)} /> : null}
      {/* Sem fallback: o modal é um extra por cima da equipa já desenhada — um F
          de carregamento por meio segundo seria mais ruído do que ajuda. */}
      {mostrarOnboarding ? (
        <Suspense fallback={null}>
          <BoasVindas variante={varianteBoasVindas} team={team} slug={slug} goleiroInicial={souGoleiroNoTime} onClose={fecharOnboarding} />
        </Suspense>
      ) : null}
    </div>
  );
}
