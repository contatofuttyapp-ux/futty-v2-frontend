// Futty v2.0 — O mundo dos vídeos de divulgação (Rodada 32B): o time Domingueira FC com 15 jogadores, todos com figurinha, o
// Bruninho admin olhando, e um jogo de domingo com os 15 confirmados e ainda sem sorteio. O /api/** é respondido aqui, em memória.
//
// A regra de verdade roda por baixo onde ela existe no motor: o sorteio é o `executarSorteio` do backend (goleiro 1 por time,
// cabeças de chave espalhadas). O resto (ranking, Início, Figurinha) é resposta montada com os campos que o motor devolve.
// Este módulo não faz pedido nenhum: quem fala com a rede (e a impede) é o gravador.
import { createRequire } from 'node:module';

const requireBackend = createRequire(new URL('../../../backend/package.json', import.meta.url));

export const SP = 'America/Sao_Paulo';
export const SLUG = 'domingueira-fc';
export const ID_DO_JOGO = 'jogo-domingo';
// dom., 25 de out., 20:00 em São Paulo — o próximo domingo de quem grava (23-out).
export const DATA_DO_JOGO = '2026-10-25T23:00:00.000Z';
export const ROTA_DOS_ROSTOS = '/storage/v1/object/public/avatars/public/';

// O elenco: os apelidos da Domingueira FC demo (demo-loja.js) e mais três para fechar 15. `rosto` = arquivo em FUT/VIDEOS/_rostos.
// Os números do ranking são de um time com 8 jogos na temporada: pontos (0–100) decrescentes, nota 0–10.
export const ELENCO = [
  { nome: 'Tiago', rosto: 'tiago', score: 86.4, nota: 8.9, jogos: 8, cabeca: true },
  { nome: 'Bruninho', rosto: 'bruninho', score: 81.7, nota: 8.6, jogos: 8, cabeca: true },
  { nome: 'Paredão', rosto: 'paredao', score: 77.2, nota: 8.8, jogos: 7, goleiro: true },
  { nome: 'Marquinhos', rosto: 'marquinhos', score: 71.5, nota: 8.1, jogos: 8 },
  { nome: 'Carlos', rosto: 'carlos', score: 68.9, nota: 7.9, jogos: 7, cabeca: true },
  { nome: 'Paulinho', rosto: 'paulinho', score: 64.3, nota: 7.6, jogos: 8 },
  { nome: 'Dudu', rosto: 'dudu', score: 61.8, nota: 7.7, jogos: 6 },
  { nome: 'Gonçalo', rosto: 'goncalo', score: 58.4, nota: 7.4, jogos: 7, goleiro: true },
  { nome: 'Diguinho', rosto: 'diguinho', score: 55.0, nota: 7.2, jogos: 6 },
  { nome: 'Roberto', rosto: 'roberto', score: 51.6, nota: 7.1, jogos: 8 },
  { nome: 'Léo', rosto: 'leo', score: 47.9, nota: 6.8, jogos: 5 },
  { nome: 'Fabinho', rosto: 'fabinho', score: 44.2, nota: 6.9, jogos: 6 },
  { nome: 'Rafa', rosto: 'rafa', score: 40.7, nota: 6.5, jogos: 5 },
  { nome: 'Renatinho', rosto: 'renatinho', score: 36.3, nota: 6.4, jogos: 4 },
  { nome: 'Nando', rosto: 'nando', score: 31.8, nota: 6.1, jogos: 4 },
].map((j, i) => ({ ...j, id: `U${i + 1}` }));

export const EU = ELENCO.find((j) => j.nome === 'Bruninho');

// Os votos que o Bruninho já deu nesta temporada (os outros aparecem com "Votar").
const MEUS_VOTOS = { Tiago: 9, Paredão: 9, Marquinhos: 8, Carlos: 8, Paulinho: 7, Dudu: 8, Gonçalo: 7, Roberto: 7, Fabinho: 7 };

const NOMES_DOS_TIMES = ['Time A', 'Time B', 'Time C', 'Time D']; // o motor nomeia assim; a cerimônia dá a cor

/**
 * @param {object} o
 * @param {string} o.base   a origem do servidor das telas (escudo e rostos saem dela)
 */
export function criarMundo({ base }) {
  const { executarSorteio } = requireBackend('./utils/sorteio.js');
  const rostoDe = (j) => `${base}${ROTA_DOS_ROSTOS}v32b-${j.rosto}-ai-dark-gold.png`;

  const time = {
    id: 'T1', slug: SLUG, nome: 'Domingueira FC', cidade: 'Brasília - DF', fuso: SP, cor: 'vinho', escudo_cor2: 'ouro', escudo_padrao: 'faixa',
    role: 'admin', joga: true, logo_url: `${base}/__demo-logos/domingueira-fc.png`, jogadores_por_time: 5, mostrar_gols: true, mostrar_artilheiro: true,
    mostrar_destaque: true, modo_visibilidade: 'privado',
  };

  const jogo = {
    id: ID_DO_JOGO, data: DATA_DO_JOGO, local: 'Society do Guará II', status: 'agendado', num_times: null, jogadores_por_time: 5, max_jogadores: null,
    sorteio_realizado: false, times_resultado: null, historico: false, cancelado: false, resultado_nivel: 0, time_vencedor: null, placar_a: null, placar_b: null,
    campeao_time_index: null, campeao_foto_url: null, artilheiro_user_id: null, artilheiro_gols: null, destaque_user_id: null, destaque_titulo: null,
    rodada_user_id: null, rodada_foto_url: null, convidados: [],
  };
  const jogadoresDoJogo = () => ELENCO.map((j) => ({
    user_id: j.id, nome: j.nome, nome_jogador: j.nome, avatar_url: rostoDe(j), rating: 3, confirmado: true, goleiro: !!j.goleiro, cabeca_chave: !!j.cabeca,
  }));

  // O perfil do Bruninho. A Figurinha troca estes campos (foto enviada, figurinha pronta) pelo `perfil`.
  const perfil = { foto_url: rostoDe(EU), avatar_url: rostoDe(EU), figurinha_ativa: true, tem_figurinha: true, kit_ativo: 'dark-gold', slots: ['dark-gold'], fundo_figurinha: 'estadio' };
  const meuPayload = () => ({
    user: {
      id: EU.id, nome: 'Bruno Henrique', nome_jogador: EU.nome, onboarding_completo: true, birthdate: '1994-03-12', plano: 'free', avatar_generico: 'm1',
      foto_original_url: perfil.foto_url, foto_url: perfil.foto_url, avatar_url: perfil.avatar_url, figurinha_ativa: perfil.figurinha_ativa,
      tem_figurinha: perfil.tem_figurinha, figurinha_status: perfil.figurinha_ativa ? 'pronta' : null, kit_ativo: perfil.kit_ativo, fundo_figurinha: perfil.fundo_figurinha,
    },
    slots: perfil.slots,
    stats: { nota: EU.nota, jogos: EU.jogos, gols: 11 },
  });

  const jogoDoInicio = () => ({
    id: jogo.id, name: jogo.local, date: jogo.data, location: jogo.local, status: jogo.sorteio_realizado ? 'drawn' : 'scheduled', estado: 'agendado',
    confirmed_count: ELENCO.length, cancelado: false, user_status: 'going', team_id: time.id, team_name: time.nome, team_slug: time.slug, fuso: SP,
    ausente_proximo: false, eu_jogo: true, montado_a_mao: false,
  });
  const SEM_PENDENCIA = { pedidos: 0, presenca: null, resultado: null, denuncias: 0, total: 0 };
  const inicioPayload = () => ({
    me: meuPayload(),
    teams: { teams: [{ ...time }] },
    convites: { games: [jogoDoInicio()] },
    pedidos: { pedidos: [] },
    votacoes_pendentes: { pendentes: [] },
    denuncias_desfechos: { total: 0 },
    votacao_status: null, campeonato: null, campeonato_novo: null, rsvp: null,
    seu_time: [{ team_id: time.id, slug: time.slug, nome: time.nome, fuso: SP, pendencias: { ...SEM_PENDENCIA }, quem_ganhou: null }],
    ad: { ad: null }, ads: null,
    brilhante: { fonte: null, team_id: null, kit_id: null, creditos: 0, restantes: 0, loja_pronta: false },
    pedidos_brilhante: [],
  });

  const ranking = () => ELENCO.map((j, i) => ({
    user_id: j.id, sou_eu: j.id === EU.id, nome: j.nome, nome_jogador: j.nome, avatar_url: rostoDe(j), foto_url: null, avatar_generico: null, cor_frame: 'dourado',
    categoria: j.goleiro ? 'GR' : 'linha', nota: j.nota, nota_interna: j.nota, total_votos: 9 + ((i * 3) % 5), minha_nota: j.id === EU.id ? null : (MEUS_VOTOS[j.nome] ?? null),
    vitorias: Math.round(j.jogos * 0.6), empates: 1, derrotas: Math.max(0, j.jogos - Math.round(j.jogos * 0.6) - 1), gols: j.goleiro ? 0 : Math.round(j.score / 8),
    artilharia: 0, destaques: Math.round(j.score / 30), presenca: j.jogos, score: j.score, posicao: i + 1,
  }));

  function sortear(corpo) {
    const porTime = Math.max(1, parseInt(corpo?.jogadoresPorTime, 10) || 5);
    const confirmados = jogadoresDoJogo().map((p) => ({ user_id: p.user_id, nome: p.nome, avatar_url: p.avatar_url, rating: 3, goleiro: p.goleiro, cabeca_chave: p.cabeca_chave }));
    const s = executarSorteio(confirmados, porTime, { convidados: [], seed: 2532 });
    Object.assign(jogo, { num_times: s.numTimes, jogadores_por_time: porTime, sorteio_realizado: true, status: 'agendado' });
    jogo.times_resultado = {
      num_times: s.numTimes, total_jogadores: confirmados.length, convidados_total: 0, seed: s.seed, avisos: [],
      times: s.times.map((jogadores, i) => ({ nome: NOMES_DOS_TIMES[i], rating_medio: 3, jogadores })),
      reservas: s.reservas, registro: { origem: 'sorteio', por: EU.id, ajustes: [], sorteio_numero: 1 },
    };
    return { game: { id: jogo.id, fuso: SP, num_times: s.numTimes, sorteio_realizado: true, times_resultado: jogo.times_resultado, status: jogo.status } };
  }

  const ok = (json, status = 200) => ({ status, json });
  const desconhecidos = new Set();
  const extras = { rotas: [] }; // rotas que cada vídeo acrescenta: [(pathname, metodo, corpo) => resposta | undefined]

  function responder(pathname, metodo, corpo) {
    for (const r of extras.rotas) {
      const resposta = r(pathname, metodo, corpo);
      if (resposta !== undefined) return resposta;
    }
    if (metodo === 'GET' && pathname === '/api/inicio') return ok(inicioPayload());
    if (metodo === 'GET' && pathname === '/api/me') return ok(meuPayload());
    if (metodo === 'GET' && pathname === '/api/teams') return ok({ teams: [{ ...time }] });
    if (metodo === 'GET' && pathname === '/api/me/selos') return ok({ selos: [] });
    if (metodo === 'GET' && pathname === '/api/feed') return ok({ items: [], proximo: null });
    if (metodo === 'GET' && pathname.startsWith('/api/ads')) return ok({});
    if (metodo === 'GET' && pathname === `/api/teams/${SLUG}`) {
      return ok({ team: { ...time }, members: ELENCO.map((j) => ({ id: j.id, nome: j.nome, nome_jogador: j.nome, role: j.id === EU.id ? 'admin' : 'member', joga: true, goleiro: !!j.goleiro, avatar_url: rostoDe(j) })) });
    }
    if (metodo === 'GET' && pathname === `/api/teams/${SLUG}/ranking`) return ok({ team: { ...time }, ranking: ranking() });
    if (metodo === 'GET' && pathname === `/api/teams/${SLUG}/votacao-status`) return ok({ aberta: false, temporada: null });
    if (metodo === 'GET' && pathname === `/api/teams/${SLUG}/games`) {
      return ok({ team: { ...time }, games: [{ id: jogo.id, local: jogo.local, data: jogo.data, status: 'agendado', num_times: jogo.num_times || 3, jogadores_por_time: jogo.jogadores_por_time, sorteio_realizado: jogo.sorteio_realizado, resultado_nivel: 0, campeao_time_index: null, time_vencedor: null, cancelado: false, motivo_cancelamento: null, max_jogadores: null, rsvp_aberto: false, rsvp_fechado: false, confirmados: ELENCO.length }] });
    }
    if (metodo === 'GET' && pathname === `/api/games/${jogo.id}`) {
      return ok({ team: { ...time }, game: { ...jogo }, players: jogadoresDoJogo(), gols: [], meuEstado: { confirmado: true, goleiro: false, cabeca_chave: true }, jaVotei: false });
    }
    if (metodo === 'POST' && pathname === `/api/games/${jogo.id}/sortear`) return ok(sortear(corpo));
    if (metodo === 'GET' && pathname === `/api/jogos/${jogo.id}/rsvp`) {
      return ok({ rsvp_aberto: false, rsvp_fechado: false, confirmados: ELENCO.map((j) => j.id), recusados: [], pendentes: [], fuso: SP, eu_jogo: true });
    }
    if (metodo === 'GET') { desconhecidos.add(`GET ${pathname}`); return ok({}); }
    desconhecidos.add(`${metodo} ${pathname}`);
    return ok({ ok: true });
  }

  return { responder, desconhecidos, extras, perfil, jogo, time, rostoDe, meuPayload };
}
