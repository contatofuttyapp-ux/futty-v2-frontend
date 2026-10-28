// Futty v2.0 — Início: o cromo, chips de equipas, próximos jogos e publicidade.
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiFetch } from '../lib/api';
import { tomarConvitePendente } from '../lib/convitePendente';
import { tomarConviteDaLoja } from '../lib/conviteDaLoja';
import { usePerfil } from '../context/PerfilContext';
// Liga o alinhamento dos caches ao perfil (foto/genérico novo chega ao Início, Ranking, Feed).
import '../lib/alinharCard';
import { useInicio } from '../context/InicioContext';
import CardSeuTime from '../components/CardSeuTime';
import { useTeams } from '../hooks/useTeam';
import { usePushNotifications } from '../hooks/usePushNotifications';
import { useIndicadorDeRolagem } from '../hooks/useIndicadorDeRolagem';
import { celebrarTop3 } from '../hooks/useConfetti';
import { deveCelebrarCampeonato, guardarCampeonatoCelebrado } from '../utils/campeonatoCelebrado';
import { listasDoInicio } from '../utils/estadoDoJogo';
import { nomeExibicao } from '../utils/nomeExibicao';
import { IDADE_MINIMA } from '../utils/idade';
import RolinhosData from '../components/RolinhosData';
import { mostraFigurinha } from '../utils/figurinhaCanvas';
import AvisoQuemGanhou from '../components/AvisoQuemGanhou';
import { cardsQuemGanhou } from '../utils/quemGanhou';
import { LEMBRETES_SEM_PRAZO, proximoAviso } from '../utils/avisosDoInicio';
import { esconderLembrete, lembretesEscondidos } from '../utils/lembretes';
import { ID_PACOTE_NO_INICIO, timesDoDono as timesDoDonoDe } from '../utils/pacoteNoInicio';
import Topbar from '../components/Topbar';
import LoadingFutty from '../components/LoadingFutty';
import Toast from '../components/Toast';
import { avatarGenericoUrl } from '../utils/avatarGenerico';
import { urlAsset, urlImagem } from '../utils/avatar';
import AvatarGenericoSheet from '../components/AvatarGenericoSheet';
import '../styles/app.css';
import { AgoraNao } from './inicio/AgoraNao';
import { useAcoesDoInicio } from './inicio/acoesDoInicio';
import { useCromoDoInicio } from './inicio/useCromoDoInicio';
import ConteudoDoInicio from './inicio/ConteudoDoInicio';
import { GameCard } from './inicio/GameCard';
import PalcoDoCromo from './inicio/PalcoDoCromo';
import AvisoCardSemFoto from './inicio/AvisoCardSemFoto';
import AvisoFigurinhaPronta from './inicio/AvisoFigurinhaPronta';
import AvisoFigurinhaNascendo from './inicio/AvisoFigurinhaNascendo';
import AvisoVotacao from './inicio/AvisoVotacao';
import AvisoDesfecho from './inicio/AvisoDesfecho';
import AvisoPedido from './inicio/AvisoPedido';
import { fraseDoAviso } from './inicio/estilos';

export default function Inicio() {
  // Quem tocou em "Criar conta e entrar" no convite passou pelo cadastro e chegou aqui — o bilhete que a
  // página do convite deixou no aparelho a devolve ao convite (uma vez só; sem bilhete, nada acontece).
  const navigate = useNavigate();
  const { perfil: me, carregando: meLoading, recarregar: recarregarPerfil, hidratar: hidratarPerfil } = usePerfil();
  // O bilhete só é tomado por conta que JÁ terminou o onboarding. Uma conta nova do Google/Apple cai aqui
  // por um instante (a trava do onboarding só a manda para /onboarding no mesmo ciclo); se o bilhete fosse
  // tomado, ela seria levada à página do convite sem foto e sem nome — e o Onboarding abriria sem saber do
  // convite.
  const onboardingCompleto = me?.user?.onboarding_completo;
  useEffect(() => {
    if (onboardingCompleto === false) return;
    const token = tomarConvitePendente();
    if (token) navigate(`/convite/${token}`, { replace: true });
  }, [navigate, onboardingCompleto]);
  const { teams, loading: teamsLoading, error: teamsErro } = useTeams();
  // Quem já tem time e instalou o app pelo convite de OUTRO time (Android: o código veio no referrer da Play Store, lib/conviteDaLoja.js)
  // vai à página desse convite, como o bilhete acima. Sem time, quem cuida é o ConviteDoMotor, que entra sozinho.
  const temTimes = !teamsLoading && (teams?.length || 0) > 0;
  useEffect(() => {
    if (onboardingCompleto !== true || !temTimes) return;
    tomarConviteDaLoja().then((token) => { if (token) navigate(`/convite/${token}`, { replace: true }); });
  }, [navigate, onboardingCompleto, temTimes]);
  // Início: 1 pedido só (GET /api/inicio, via Layout.jsx que monta o InicioProvider só nesta rota)
  // alimenta jogos, RSVP, campeonato, pedidos, votações pendentes, desfechos de denúncia e o anúncio —
  // em vez de ~9 pedidos em paralelo. As AÇÕES (confirmar presença, ausência, etc.) continuam a ir
  // direto à API de sempre.
  const inicio = useInicio();
  const dadosInicio = inicio.dados;

  const [games, setGames] = useState(null); // null = a carregar
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [selectedTeam, setSelectedTeam] = useState('all');
  // A faixa de chips de time rola; a borda esmaece onde há mais, e o "Várzea FC" cortado deixa de parecer erro.
  const { aoMontar: montarFaixaDeChips, esquerda: chipsEscondidosEsq, direita: chipsEscondidosDir } = useIndicadorDeRolagem();
  const [toast, setToast] = useState(null); // { msg, tipo }

  // Pedido ÚNICO de data de nascimento: sem ela, o /p/ cai em silhueta e o anúncio 18+ nunca aparece (a
  // idade manda: só 18 confirmados revelam o rosto e veem anúncio 18+). Banner não-bloqueante e dispensável.
  const [dobInput, setDobInput] = useState('');
  const [dobBusy, setDobBusy] = useState(false);
  const [dobFeito, setDobFeito] = useState(false);
  // O "Agora não" dos lembretes sem prazo (figurinha para gerar, recado, uniforme, card, data de
  // nascimento — e a figurinha que não saiu) esconde o lembrete por 7 dias NAQUELE aparelho
  // (utils/lembretes.js, com try/catch) e a fila anda. O estado guarda o mesmo para a tela atual, mesmo
  // sem localStorage.
  const [agoraNaoDeles, setAgoraNaoDeles] = useState(() => lembretesEscondidos([...LEMBRETES_SEM_PRAZO, 'figurinha-falhou']));
  const escondido = (id) => agoraNaoDeles.has(id);
  function agoraNao(id) {
    esconderLembrete(id);
    setAgoraNaoDeles((cur) => new Set(cur).add(id));
  }
  // "Figurinhas pro time todo": só para quem é dono (admin) de algum time, nunca para o jogador comum. Fica fora da fila de avisos de
  // propósito: é um convite discreto, não algo que pede resposta. O X o esconde por 7 dias neste aparelho (mesma conta do "Agora não").
  const [pacoteFechado, setPacoteFechado] = useState(() => lembretesEscondidos([ID_PACOTE_NO_INICIO]).has(ID_PACOTE_NO_INICIO));
  const timesDoDono = timesDoDonoDe(teams);
  function fecharPacote() {
    esconderLembrete(ID_PACOTE_NO_INICIO);
    setPacoteFechado(true);
  }
  const precisaDob = !!me?.user && !me.user.birthdate && !dobFeito;

  // Notificações push: banner discreto (uma vez por sessão).
  const { estado: pushEstado, subscrever: pushSubscrever } = usePushNotifications();
  const [pushBannerFechado, setPushBannerFechado] = useState(() => sessionStorage.getItem('futty_push_dismiss') === '1');
  function fecharPushBanner() {
    setPushBannerFechado(true);
    sessionStorage.setItem('futty_push_dismiss', '1');
  }

  // CTA pós-onboarding: criar figurinha (ativado ao fechar o onboarding da equipa).
  const [ctaFigurinha, setCtaFigurinha] = useState(() => localStorage.getItem('futty_cta_figurinha') === '1');
  function dispensarCtaFigurinha() {
    localStorage.removeItem('futty_cta_figurinha');
    setCtaFigurinha(false);
  }

  // "Ver sorteio": a cerimónia corre na PÁGINA do sorteio (SPEC-SORTEIO §13d). Navega pelo roteador (como
  // o botão "Sortear" da tela do jogo) — um recarregamento da página refaria o app INTEIRO, vários
  // segundos sem indicador nenhum — e o botão mostra "Abrindo…" no mesmo instante do toque. Sem state
  // `euSorteei`: quem só vai ver o resultado abre com o som desligado (regra da casa).
  const [abrindoSorteioId, setAbrindoSorteioId] = useState(null);
  function verSorteio(game) {
    if (abrindoSorteioId) return;
    setAbrindoSorteioId(game.id);
    navigate(`/time/${game.team_slug}/jogo/${game.id}/sorteio`);
    // se a tela não abrir (chunk que falhou, por exemplo) o botão volta em vez de ficar apagado para sempre
    setTimeout(() => setAbrindoSorteioId(null), 8000);
  }

  // Sincroniza `games` a partir de /api/inicio (carga inicial e qualquer
  // reload() subsequente) — as ações abaixo continuam a fazer optimistic
  // update em cima deste estado local, exatamente como faziam com o fetch
  // próprio de antes. Sincronizado DURANTE o render (mesmo padrão de
  // MeuPerfil.jsx), não num efeito — evita o lint react-hooks/set-state-in-effect.
  const [convitesAnterior, setConvitesAnterior] = useState(undefined);
  if (dadosInicio?.convites !== convitesAnterior) {
    setConvitesAnterior(dadosInicio?.convites);
    if (dadosInicio?.convites) setGames(dadosInicio.convites.games || []);
  }

  const user = me?.user;
  const stats = me?.stats;
  const nome = nomeExibicao(user); // a regra única do nome (nome de jogador → nome completo → "Jogador"; nunca o e-mail)

  // Figurinha IA no card agora? Quem diz é o motor (mostraFigurinha) — mesma regra da Figurinha.
  const cromoAvatarEhIA = mostraFigurinha(user);
  const cromoFundo = user?.fundo_figurinha || 'estadio';
  // Com Brilhante, o cromo de sempre; sem Brilhante mas com FOTO, a figurinha COMUM (a foto, a cobrir o
  // cromo); sem foto, o genérico da casa. Uma conta só: o canvas e a prévia em DOM leem a mesma.
  const modoDoCromo = !cromoAvatarEhIA && user?.foto_url ? 'comum' : 'brilhante';

  // Figurinha automática do cadastro: o Onboarding dispara a geração em fundo e marca o sessionStorage;
  // aqui o Início mostra "criando..." em vez do CTA normal, com polling de /api/me até sair de 'gerando'.
  // O sessionStorage cobre o instante entre o disparo e o /api/me confirmar 'gerando' — sem ele o
  // usuário veria o CTA normal piscar por 1 beat antes do estado de loading.
  const [figurinhaSessaoMarcada, setFigurinhaSessaoMarcada] = useState(() => {
    try {
      return sessionStorage.getItem('futty_figurinha_gerando') === '1';
    } catch {
      return false;
    }
  });
  const figurinhaStatus = user?.figurinha_status || null;
  // Sem `&& !user?.avatar_url`: essa condição só cobria o cadastro (1ª figurinha
  // de todas, sem avatar_url nenhum ainda). Numa TROCA de foto/uniforme
  // (Figurinha.jsx, gerarAvatarIA) o usuário já tem avatar_url — o antigo — e
  // ela bloquearia o marcador exactamente no caso que ele existe para
  // cobrir: navegar para o Início enquanto a geração ainda corre, antes de o
  // /api/me fresco confirmar 'gerando'. O marcador continua a sumir sozinho
  // (linhas abaixo) assim que figurinhaStatus sai de 'gerando' — nunca fica
  // preso mostrando "sendo criada" para sempre.
  const figurinhaGerando = figurinhaStatus === 'gerando' || (figurinhaSessaoMarcada && !figurinhaStatus);
  const figurinhaFalhou = figurinhaStatus === 'falhou';
  // DIREITO À BRILHANTE — vem no mesmo /api/inicio (routes/inicio.js), sem
  // pedido extra. `podeGerarBrilhante` = tem direito, tem foto e ainda não tem
  // a Brilhante: é exactamente quem vê o cartão dourado.
  const brilhanteDireito = inicio?.dados?.brilhante || null;
  const podeGerarBrilhante = !!brilhanteDireito?.fonte && !!user?.foto_url && !cromoAvatarEhIA;
  // Pedido de ativação vivo (bloco 2): a pendente manda à frente da recusa —
  // quem pediu de novo depois de um não está a seguir em frente, e a tela
  // acompanha em vez de insistir no não.
  const pedidosBrilhante = inicio?.dados?.pedidos_brilhante || [];
  const pedidoBrilhante = pedidosBrilhante.find((p) => p.estado === 'pendente') || pedidosBrilhante[0] || null;
  const recadoBrilhante = !pedidoBrilhante ? null : pedidoBrilhante.estado === 'pendente'
    ? { texto: 'Pedido enviado. A gente ativa e avisa ✨', recusado: false }
    : { texto: pedidoBrilhante.motivo || 'Seu pedido de figurinha não seguiu. Tente de novo.', recusado: true };
  // PAGAMENTOS P2 — o pacote comprado na loja chega sem uniforme quando o time não tinha um, e sem
  // uniforme ninguém do time gera. Enquanto faltar, o dono vê o recado (os times vêm no /api/inicio).
  const timeSemUniforme = (inicio?.dados?.teams?.teams || []).find((t) => t.role === 'admin' && t.brilhante_ativo && !t.brilhante_kit) || null;

  // Limpa o sessionStorage assim que sair de 'gerando' — sincronizado DURANTE
  // o render (mesmo padrão de MeuPerfil.jsx), não num efeito.
  if (figurinhaSessaoMarcada && !figurinhaGerando) {
    try {
      sessionStorage.removeItem('futty_figurinha_gerando');
    } catch {
      /* priv */
    }
    setFigurinhaSessaoMarcada(false);
  }

  useEffect(() => {
    if (!figurinhaGerando) return undefined;
    const prazo = Date.now() + 3 * 60 * 1000; // máx. 3 min de polling (mesmo teto do backend)
    const id = setInterval(() => {
      recarregarPerfil();
      if (Date.now() > prazo) clearInterval(id);
    }, 5000);
    return () => clearInterval(id);
  }, [figurinhaGerando, recarregarPerfil]);

  // Escolha do avatar genérico: undefined = usa o que veio do servidor; definido = override otimista local
  // (PATCH em curso ou já confirmado).
  const [sheetAvatarAberto, setSheetAvatarAberto] = useState(false);
  const [avatarGenericoOverride, setAvatarGenericoOverride] = useState(undefined);
  const avatarGenericoEscolha = avatarGenericoOverride !== undefined ? avatarGenericoOverride : user?.avatar_generico ?? null;

  const { cromo, refCromo } = useCromoDoInicio({ avatarGenericoEscolha, cromoAvatarEhIA, cromoFundo, modoDoCromo, nome, user });
  // NB: `user` inteiro já está nas deps — trocar a foto muda o objecto e
  // repinta o cromo comum sem precisar de `user.foto_url` à parte.

  // A foto que segura o lugar do cromo enquanto ele não existe: a mesma imagem
  // que o canvas vai usar por baixo, então a troca não salta.
  const previaCromo = cromoAvatarEhIA
    ? urlImagem(urlAsset(user?.avatar_url), 512)
    : user?.foto_url
      ? urlImagem(urlAsset(user.foto_url), 512) // figurinha comum: a prévia é a própria foto
      : user
        ? avatarGenericoUrl(user.id, avatarGenericoEscolha, nome)
        : '';

  const loadingGames = games === null;
  const filtered = (games || []).filter((g) => selectedTeam === 'all' || g.team_id === selectedTeam);
  // "Próximos Jogos" mostra o que ainda vai acontecer e o que está em andamento (com o selo); o jogo só desce para "Últimos jogos" quando
  // terminar (máx. 3, mais recente primeiro — a lista vem ordenada por data ascendente). Cancelado não aparece em nenhuma. Próximo jogo = o
  // primeiro que AINDA NÃO COMEÇOU: o em andamento não conta (utils/estadoDoJogo.js).
  const { proximos: proximosJogos, ultimos: ultimosJogos, proximo: proximoJogo } = listasDoInicio(filtered);
  const nextId = proximoJogo?.id ?? null;

  // A resposta de cada jogo vem do próprio jogo (o motor manda user_status, lista_aberta, chamado e espera_posicao): UM cartão por jogo,
  // sem o RSVP "do próximo jogo" à parte (regra do dono — antes o mesmo jogo aparecia em dois ou três cartões).
  const { guardarDob, onPresence, onSairEspera, escolherAvatarGenerico } = useAcoesDoInicio({ avatarGenericoEscolha, dobBusy, dobInput, games, hidratarPerfil, inicio, me, recarregarPerfil, setAvatarGenericoOverride, setBusyId, setDobBusy, setDobFeito, setError, setGames, setToast });

  // Campeonato da equipa principal (card no Início) — mesmo campSlug que o
  // backend usou para calcular `campeonato` dentro de /api/inicio.
  const campSlug = teams[0]?.slug || null;
  const campeonato = dadosInicio?.campeonato?.campeonato || null;
  // O campeonato novo (N times) do time principal; o motor manda o slug junto.
  const campeonatoNovo = dadosInicio?.campeonato_novo || null;
  const campSlugDoNovo = campeonatoNovo?.team_slug || campSlug;

  // Confete do campeonato terminado: uma vez por campeonato por pessoa. O id já celebrado fica no aparelho
  // (utils/campeonatoCelebrado.js), então voltar ao Início não repete a festa. O campeonato novo não tem celebração aqui.
  const userIdDoConfete = user?.id || null;
  useEffect(() => {
    if (!deveCelebrarCampeonato(campeonato, userIdDoConfete)) return;
    guardarCampeonatoCelebrado(userIdDoConfete, campeonato.id);
    celebrarTop3(1);
  }, [campeonato, userIdDoConfete]);

  // O começo dos "Próximos Jogos" — o que está em andamento agora (se houver) e o PRÓXIMO, o do "Vou / Não vou", nessa ordem — sobe para
  // logo abaixo do cromo: com aviso no topo, "Seus times", os atalhos e o pacote de quem administra 4 times, o próximo jogo caía para a
  // segunda tela, e é a única coisa do Início que pede resposta com hora marcada. O resto da página fica onde estava; os jogos que vêm
  // depois do próximo ficam lá embaixo, em "Outros jogos" (um cartão por jogo, sem repetir).
  const fimDoTopo = !loadingGames && proximoJogo ? proximosJogos.findIndex((g) => g.id === proximoJogo.id) + 1 : 0;
  const jogosNoTopo = proximosJogos.slice(0, fimDoTopo);
  const outrosProximos = proximosJogos.slice(fimDoTopo);

  // Anúncio nativo: a seguir ao 2º jogo; se houver ≤1 jogo, no fim.
  const items = [];
  outrosProximos.forEach((g, i) => {
    items.push({ type: 'game', game: g });
    if (i === 1) items.push({ type: 'ad', key: 'ad-inicio' });
  });
  if (outrosProximos.length <= 1) items.push({ type: 'ad', key: 'ad-inicio' });

  // "Sem time" só depois de uma resposta que diga isso: com a sessão morta o /api/inicio devolve 401 e o
  // Início diria "Bem-vindo, crie seu time" a quem TEM time. Falha sem dado nenhum é erro com "Tentar de
  // novo" (e 401 já vai para o login, lib/api.js).
  const semDadosPorErro = !!inicio.erro && !dadosInicio;
  const noTeams = !teamsLoading && !teamsErro && !semDadosPorErro && teams.length === 0;

  // Para onde o cromo leva. A vitrine vive DENTRO de um time (a rota é /time/:slug/jogador/:id), por isso
  // só existe com time e com sessão carregada; até lá, a Figurinha continua a ser um destino honesto.
  const destinoCromo = noTeams
    ? { to: '/criar-time', label: 'Criar meu time' }
    : campSlug && user?.id
      ? { to: `/time/${campSlug}/jogador/${user.id}`, label: 'Ver minha vitrine de jogador' }
      : { to: '/figurinha', label: 'Ver e personalizar minha figurinha' };

  // Desfechos dos meus pedidos de entrada (aceite/recusado) — ciclo v1 sem push.
  // Sincronizado DURANTE o render a partir de /api/inicio (carga inicial +
  // reload()) — mesmo padrão de MeuPerfil.jsx, não num efeito; as ações abaixo
  // continuam a fazer optimistic update local por cima.
  const [desfechos, setDesfechos] = useState([]);
  const [pedidosAnterior, setPedidosAnterior] = useState(undefined);
  if (dadosInicio?.pedidos !== pedidosAnterior) {
    setPedidosAnterior(dadosInicio?.pedidos);
    if (dadosInicio?.pedidos) setDesfechos(dadosInicio.pedidos.pedidos || []);
  }
  function dispensarDesfecho(id) {
    setDesfechos((cur) => cur.filter((p) => p.id !== id));
    apiFetch(`/api/me/pedidos/${id}`, { method: 'DELETE' }).catch(() => {});
  }
  // P1-4 — o pedido PENDENTE era invisível fora do Explorar. Separa-se do desfecho
  // e ganha um card discreto com cancelar (DELETE do próprio pedido).
  const pedidosPendentes = desfechos.filter((p) => p.status === 'pending');
  const desfechosResolvidos = desfechos.filter((p) => p.status !== 'pending');
  function cancelarPedidoPendente(p) {
    if (!p.team?.slug) return;
    setDesfechos((cur) => cur.filter((x) => x.id !== p.id));
    apiFetch(`/api/teams/${p.team.slug}/pedir-entrada`, { method: 'DELETE' }).catch(() => {});
  }

  // UM aviso por vez no topo, o mais importante primeiro (a fila inteira, montada logo abaixo). O "Você vai?" de jogo saiu da fila: o
  // cartão do jogo, embaixo, já pergunta — o mesmo jogo nunca aparece em dois lugares (regra do dono).
  const timeDoJogo = (teamId) => teams.find((t) => t.id === teamId) || null;

  // P1-3 — a votação era invisível fora do Ranking. Banner no Início quando há
  // avaliações por dar (agregado de todas as equipas); dispensável por sessão.
  const votacoes = dadosInicio?.votacoes_pendentes?.pendentes || [];
  const [votacaoFechada, setVotacaoFechada] = useState(() => sessionStorage.getItem('futty_votacao_dismiss') === '1');
  const votacaoTop = !votacaoFechada ? votacoes[0] : null;
  function fecharVotacao() {
    setVotacaoFechada(true);
    sessionStorage.setItem('futty_votacao_dismiss', '1');
  }

  // "Quem ganhou?" — só o admin (o motor só manda `quem_ganhou` em seu_time): o jogo sorteado, 5 minutos depois do início, sem campeão nem empate.
  // Respondido, o card some na hora (sem esperar a próxima leitura) e o Início recarrega para a pendência do "Seus times" sair junto.
  const [quemGanhouRespondidos, setQuemGanhouRespondidos] = useState([]);
  const cardsDoQuemGanhou = cardsQuemGanhou(dadosInicio?.seu_time, quemGanhouRespondidos, teams);
  async function quemGanhouRespondido(card) {
    setQuemGanhouRespondidos((lista) => [...lista, card.game_id]);
    await inicio.reload();
  }

  // Tijolo 3 — desfecho das MINHAS denúncias (nº, sem veredicto). Banner discreto.
  const denunciaDesfechos = dadosInicio?.denuncias_desfechos?.total || 0;
  const [desfechoFechado, setDesfechoFechado] = useState(() => sessionStorage.getItem('futty_denuncia_desfecho') === '1');
  function fecharDesfecho() {
    setDesfechoFechado(true);
    sessionStorage.setItem('futty_denuncia_desfecho', '1');
  }

  // TODOS os avisos do topo numa fila só, um por vez (utils/avisosDoInicio.js tem a ordem: jogo sem
  // resposta → pedido pendente → votação → figurinha pronta → os demais → ativar notificações por último).
  // Cada um mantém a regra de "vale agora"; só o primeiro da fila aparece, e fechar ou resolver faz
  // entrar o próximo.
  const cardSemFoto = !meLoading && !!user && !user.foto_url;
  // Primeiro o que aconteceu ou tem prazo, depois os lembretes sem prazo (cada um com o "Agora não" de 7
  // dias), por último ativar notificações.
  const aviso = proximoAviso({
    pedidos: pedidosPendentes,
    desfechos: desfechosResolvidos,
    quemGanhou: cardsDoQuemGanhou,
    votacoes: votacaoTop ? [votacaoTop] : [],
    denuncia: denunciaDesfechos > 0 && !desfechoFechado,
    figurinhaNascendo: figurinhaGerando ? { estado: 'gerando' } : figurinhaFalhou && !escondido('figurinha-falhou') ? { estado: 'falhou' } : null,
    figurinhaPronta: !figurinhaGerando && !figurinhaFalhou && podeGerarBrilhante && !escondido('figurinha-pronta'),
    recadoFigurinha: !podeGerarBrilhante && !escondido('recado-figurinha') ? recadoBrilhante : null,
    uniforme: escondido('uniforme') ? null : timeSemUniforme,
    card: figurinhaGerando || figurinhaFalhou || escondido('card') ? null : cardSemFoto ? { variante: 'sem-foto' } : ctaFigurinha ? { variante: 'pos-onboarding' } : null,
    nascimento: precisaDob && !escondido('nascimento'),
    notificacoes: pushEstado === 'suportado' && !pushBannerFechado,
  });

  // REVELAÇÃO — VELOCIDADE 4, a inversão que faz a diferença no celular.
  //
  // Era: o LoadingFutty segurava o ecrã até o cromo estar DESENHADO. Desenhar o
  // cromo é um canvas 600×600 mais descodificar duas imagens — de um a três
  // segundos num telemóvel. Ou seja: a pessoa ficava a olhar para um F enquanto
  // TODO o resto da tela (nome, stats, jogos, equipa) já estava pronto há muito.
  // Era essa espera, e não a rede, a maior parte do "surreal de devagar".
  //
  // É: a tela aparece assim que há PERFIL — que na segunda abertura vem do
  // cache local, portanto de imediato. O cromo entra depois, no lugar que já
  // está reservado para ele (.cromo-inicio tem aspect-ratio fixo, não há salto),
  // com a foto da pessoa a segurar o sítio enquanto isso.
  if (meLoading) return <LoadingFutty />;

  return (
    <div className="app-shell inicio-reveal">
      <Topbar hud="INÍCIO" />
      <main className="app-main" style={{ paddingLeft: 16, paddingRight: 16, paddingTop: 10 }}>
        {/* UM aviso por vez, o mais importante primeiro. O que pede ação sobe; o resto é consulta. */}

        {/* QUEM GANHOU? — só o admin: acima de "colegas para avaliar" na fila; um toque abre a pergunta. */}
        {aviso?.tipo === 'quem-ganhou' ? <AvisoQuemGanhou card={aviso.item} mais={aviso.mais} onResolvido={quemGanhouRespondido} /> : null}

        {/* P1-4 — PEDIDO PENDENTE: enquanto o admin não decide, o candidato vê aqui "pedido pendente na {equipa} · cancelar" (antes só
            existia no "Radar de peladas"). Card discreto, roxo — é espera, não desfecho. Mais de um: o mais recente e um "+N". */}
        <AvisoPedido aviso={aviso} cancelarPedidoPendente={cancelarPedidoPendente} />

        {/* Banner discreto para ativar notificações push (o último da fila) */}
        {aviso?.tipo === 'notificacoes' ? (
          <div data-aviso="notificacoes" className="hud-corners" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', marginBottom: 12, background: 'rgba(139,92,246,0.06)', border: '1px solid rgba(139,92,246,0.2)' }}>
            <span style={fraseDoAviso}>Ativar notificações para não perder nenhum jogo</span>
            {/* Secundário: o cânone tira o verde daqui — activar notificações não é
                a acção principal da página (o Início não tem uma; ver EmptyState). */}
            <button type="button" className="btn btn--purple btn--sm hud-corners-s" onClick={() => pushSubscrever()}>Ativar</button>
            <button type="button" aria-label="Fechar" onClick={fecharPushBanner} style={{ border: 'none', background: 'transparent', color: 'var(--text-dim)', cursor: 'pointer', fontSize: 16, lineHeight: 1 }}>✕</button>
          </div>
        ) : null}

        {/* Pedido único de data de nascimento (Opção B) — para confirmar a idade mínima do app.
            Não-bloqueante; dispensável. */}
        {aviso?.tipo === 'nascimento' ? (
          <div data-aviso="nascimento" className="hud-corners" style={{ display: 'grid', gap: 10, padding: '12px 14px', marginBottom: 12, background: 'rgba(212,160,23,0.06)', border: '1px solid rgba(212,160,23,0.25)' }}>
            <span style={{ fontSize: 13, color: '#fff', lineHeight: 1.45 }}>
              Informe sua <b>data de nascimento</b> para confirmarmos que você tem {IDADE_MINIMA} anos ou mais.
            </span>
            {/* Rolinhos dia · mês · ano, como no cadastro e no onboarding. */}
            <RolinhosData id="inicio-nascimento" onChange={setDobInput} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <button type="button" className="btn btn--purple btn--sm hud-corners-s" disabled={!dobInput || dobBusy} onClick={guardarDob}>
                {dobBusy ? 'Salvando…' : 'Salvar'}
              </button>
              <AgoraNao onClick={() => agoraNao('nascimento')} />
            </div>
          </div>
        ) : null}

        {/* Tijolo 3 — DESFECHO discreto ao denunciante (sem veredicto: protege alvo e
            denunciante). Uma linha no Início, dispensável. */}
        {aviso?.tipo === 'denuncia' ? (
          <div data-aviso="denuncia" className="hud-corners" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', marginBottom: 12, background: 'rgba(123,216,143,0.05)', border: '1px solid rgba(123,216,143,0.25)' }}>
            <span style={fraseDoAviso}>Sua denúncia foi analisada. <b style={{ color: '#9fd8a8' }}>Obrigado por cuidar da casa.</b></span>
            <button type="button" aria-label="Fechar" onClick={fecharDesfecho} style={{ border: 'none', background: 'transparent', color: 'var(--text-dim)', cursor: 'pointer', fontSize: 16, lineHeight: 1 }}>✕</button>
          </div>
        ) : null}

        {/* DESFECHOS dos meus pedidos de entrada (ciclo v1, sem push): aceite →
            destaque + link para a equipa; recusado → aviso digno. Dispensar apaga. */}
        <AvisoDesfecho aviso={aviso} dispensarDesfecho={dispensarDesfecho} />

        {/* P1-3 — VOTAÇÃO VISÍVEL: sinal no Início de que há colegas por avaliar.
            Dourado porque é uma acção do utilizador (leva ao Ranking, onde se vota). */}
        <AvisoVotacao aviso={aviso} fecharVotacao={fecharVotacao} votacaoTop={votacaoTop} />

        {/* Figurinha automática do cadastro e QUALQUER geração daqui em diante (troca de foto/uniforme dispara
            o mesmo marcador, ver figurinhaGerando acima) — enquanto a IA gera em fundo, mostra a foto da pessoa
            com um brilho dourado passando em vez do CTA normal — sem isso pareceria que nada está acontecendo
            por ~45s (motor em duas passadas). */}
        <AvisoFigurinhaNascendo agoraNao={agoraNao} aviso={aviso} user={user} />

        {/* VOCÊ TEM UMA BRILHANTE PARA GERAR ✨ (SPEC-FIGURINHA-3 §5/§7) — quem
            tem direito e ainda não gerou vê isto. É daqui que sai a GERAÇÃO
            PREGUIÇOSA do pacote do time: ninguém é gerado em lote quando o
            time ativa; cada pessoa é gerada quando abre o app, e quem nunca
            abre não custa nada. O toque leva à Figurinha, onde o botão dourado
            está à espera — não se dispara uma geração paga sem alguém pedir. */}
        <AvisoFigurinhaPronta agoraNao={agoraNao} aviso={aviso} brilhanteDireito={brilhanteDireito} user={user} />

        {/* RECADO DO PEDIDO (bloco 2) — só para quem AINDA não tem direito: com
            direito, o cartão dourado acima é o que importa e este recado só
            competiria com ele. Pendente diz que está na fila; recusado diz o
            motivo que o dono escreveu. Ativado nunca chega aqui: vira direito. */}
        {/* P2 — pacote ativo sem uniforme: o dono escolhe e o time inteiro passa a poder gerar. */}
        {aviso?.tipo === 'uniforme' ? (
          <div data-aviso="uniforme" className="hud-corners" style={{ marginBottom: 12, background: 'rgba(212,160,23,0.08)', border: '1px solid rgba(212,160,23,0.45)' }}>
            <Link to={`/planos?uniforme=${timeSemUniforme.id}`} style={{ display: 'block', padding: '10px 13px 2px', fontSize: 12.5, lineHeight: 1.45, textDecoration: 'none', color: '#f0c94a' }}>
              Falta escolher o uniforme das figurinhas do {timeSemUniforme.nome}. O time só gera depois disso. Escolher →
            </Link>
            <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '0 13px 6px' }}>
              <AgoraNao onClick={() => agoraNao('uniforme')} />
            </div>
          </div>
        ) : null}

        {aviso?.tipo === 'recado-figurinha' ? (
          <div data-aviso="recado-figurinha" className="hud-corners" style={{ marginBottom: 12, background: recadoBrilhante.recusado ? 'rgba(255,255,255,0.03)' : 'rgba(212,160,23,0.08)', border: `1px solid ${recadoBrilhante.recusado ? 'rgba(255,255,255,0.14)' : 'rgba(212,160,23,0.45)'}` }}>
            <Link to="/planos" style={{ display: 'block', padding: '10px 13px 2px', fontSize: 12.5, lineHeight: 1.45, textDecoration: 'none', color: recadoBrilhante.recusado ? 'rgba(255,255,255,0.75)' : '#f0c94a' }}>
              {recadoBrilhante.texto}
            </Link>
            <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '0 13px 6px' }}>
              <AgoraNao onClick={() => agoraNao('recado-figurinha')} />
            </div>
          </div>
        ) : null}

        {/* CARD PERSISTENTE — sem FOTO não há cromo: moldura V1 vazia + convite.
            Sem X: persiste até haver foto (a estratégia "quase-obrigatória" do onboarding dia-1).
            A condição é `!user.foto_url`, não `!user.avatar_url`: quem tem foto já tem figurinha (a comum), e
            pedir "complete sua figurinha" a quem acabou de a completar seria o convite a mentir. */}
        <AvisoCardSemFoto agoraNao={agoraNao} aviso={aviso} dispensarCtaFigurinha={dispensarCtaFigurinha} />

        {/* O CROMO — o destaque do topo, agora RETRATO QUADRADO sem placa. O nome
            vem por baixo em texto livre (o quadrado não o traz baked, ao contrário
            do card 2:3). Ordem: cromo → nome → equipa → stats — cada um diz o que o
            cromo não diz. Sem o nome herói com shimmer da versão 2:3: aqui é texto
            seco, dourado, sem palco. */}
        <PalcoDoCromo cromo={cromo} cromoAvatarEhIA={cromoAvatarEhIA} cromoFundo={cromoFundo} dadosInicio={dadosInicio} destinoCromo={destinoCromo} modoDoCromo={modoDoCromo} nome={nome} previaCromo={previaCromo} refCromo={refCromo} setSheetAvatarAberto={setSheetAvatarAberto} stats={stats} teams={teams} user={user} />

        {/* O começo dos Próximos Jogos (em andamento + o próximo), na primeira tela mesmo com o Início cheio (ver jogosNoTopo). */}
        {jogosNoTopo.length > 0 && !noTeams && !semDadosPorErro ? (
          <div data-proximo-jogo-no-topo style={{ marginTop: 4, marginBottom: 12 }}>
            <div className="games-label">Próximos Jogos</div>
            {jogosNoTopo.map((g, i) => (
              <GameCard
                key={g.id}
                game={g}
                busy={busyId === g.id}
                isNext={g.id === nextId}
                onPresence={onPresence}
                onSairEspera={onSairEspera}
                onVerSorteio={verSorteio}
                abrindo={abrindoSorteioId === g.id}
                index={i}
                cidade={timeDoJogo(g.team_id)?.cidade}
              />
            ))}
          </div>
        ) : null}

        {/* Embaixo do avatar, como o dono quis: o olho da pessoa cai no avatar, não no topo. O card "Seu time"
            só aparece para quem administra algum time (o Dashboard do painel do admin). */}
        <CardSeuTime seuTime={dadosInicio?.seu_time || []} teams={teams || []} games={games || []} />

        {(error || (inicio.erro && !semDadosPorErro)) && <div className="alert alert--error hud-corners" style={{ marginTop: 12 }}>{error || inicio.erro}</div>}

        <ConteudoDoInicio abrindoSorteioId={abrindoSorteioId} busyId={busyId} campSlug={campSlug} campSlugDoNovo={campSlugDoNovo} campeonato={campeonato} campeonatoNovo={campeonatoNovo} chipsEscondidosDir={chipsEscondidosDir} chipsEscondidosEsq={chipsEscondidosEsq} fecharPacote={fecharPacote} inicio={inicio} items={items} loadingGames={loadingGames} montarFaixaDeChips={montarFaixaDeChips} nextId={nextId} noTeams={noTeams} proximoNoTopo={jogosNoTopo.length > 0} onPresence={onPresence} onSairEspera={onSairEspera} onboardingCompleto={onboardingCompleto} pacoteFechado={pacoteFechado} proximosJogos={proximosJogos} selectedTeam={selectedTeam} semDadosPorErro={semDadosPorErro} setSelectedTeam={setSelectedTeam} teams={teams} timeDoJogo={timeDoJogo} timesDoDono={timesDoDono} ultimosJogos={ultimosJogos} verSorteio={verSorteio} />
      </main>

      {toast ? <Toast mensagem={toast.msg} tipo={toast.tipo} onClose={() => setToast(null)} /> : null}

      <AvatarGenericoSheet
        aberto={sheetAvatarAberto}
        onClose={() => setSheetAvatarAberto(false)}
        escolhaActual={avatarGenericoEscolha}
        onEscolher={escolherAvatarGenerico}
      />
    </div>
  );
}

// O que saiu deste arquivo continua exportado daqui: quem importa não muda.
export { NomeCromo } from './inicio/NomeCromo';
export { GameCard } from './inicio/GameCard';
