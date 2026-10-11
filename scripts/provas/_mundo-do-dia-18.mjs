// Futty v2.0 — O "mundo do dia 18" para as provas do navegador e para o roteiro de capturas (FUT/REDES/ROTEIRO-18-OUT): o time Domingueira FC
// (Pedro admin, 20 confirmados no jogo de dom., 18 de out.), com o /api/** respondido por um motor em memória.
//
// A regra de verdade roda por baixo: o sorteio é o `executarSorteio` do backend, o campeonato é o `campeonatoStore` do backend (tabela,
// desempate, final, pênaltis, pódio, o resumo do Início, o conteúdo do post do campeão) — só o banco e o Storage viram memória. Este módulo
// não faz pedido nenhum: quem fala com a rede (e a impede) é a prova ou o roteiro.
import { createRequire } from 'node:module';
import { carregarStore, criarMotor } from './_campeonato-motor.mjs';

const BACKEND = new URL('../../../backend/', import.meta.url);
const requireBackend = createRequire(new URL('package.json', BACKEND));

export const SP = 'America/Sao_Paulo';
export const SLUG = 'domingueira-fc';
export const ID_DO_JOGO = 'g-18-out';
export const DATA_DO_JOGO = '2026-10-18T23:00:00.000Z'; // dom., 18 de out., 20:00 em São Paulo

// O elenco: Pedro (admin) e os outros 19, nomes masculinos brasileiros comuns, só o primeiro nome.
export const ELENCO = [
  'Pedro', 'João', 'Lucas', 'Gabriel', 'Mateus', 'Rafael', 'Bruno', 'Carlos', 'Diego', 'Eduardo',
  'Felipe', 'Gustavo', 'Henrique', 'Leonardo', 'Marcelo', 'Rodrigo', 'Thiago', 'André', 'Fernando', 'Ricardo',
].map((nome, i) => ({ id: `U${i + 1}`, nome }));

const NOMES_DOS_TIMES = ['Time A', 'Time B', 'Time C', 'Time D', 'Time E', 'Time F']; // o motor nomeia assim; a cerimônia e o campeonato dão a cor

/**
 * @param {object} o
 * @param {string} o.base     a origem do servidor das telas (o escudo sai dela)
 * @param {'admin'|'member'} [o.papel]
 * @param {string} [o.euId]   quem está olhando: 'U1' = Pedro
 */
export function criarMundo({ base, papel = 'admin', euId = 'U1' }) {
  const store = carregarStore();
  if (!store) throw new Error('o backend ao lado (FUTTY-V2/backend) não está acessível');
  const { executarSorteio } = requireBackend('./utils/sorteio.js');

  let eu = ELENCO.find((j) => j.id === euId);
  let papelAtual = papel;
  const logo = `${base}/__demo-logos/domingueira-fc.png`;
  const time = {
    id: 'T1', slug: SLUG, nome: 'Domingueira FC', cidade: 'Brasília - DF', fuso: SP, cor: 'vinho', escudo_cor2: 'ouro', escudo_padrao: 'faixa',
    role: papel, joga: true, logo_url: logo, jogadores_por_time: 5, mostrar_gols: true, mostrar_artilheiro: true, mostrar_destaque: true, modo_visibilidade: 'privado',
  };
  const membros = ELENCO.map((j) => ({ id: j.id, nome: j.nome, avatar_url: null }));

  // O jogo do dia 18: ainda sem sorteio, com os 20 confirmados. O sorteio e o campeonato mexem nele.
  const jogo = {
    id: ID_DO_JOGO, data: DATA_DO_JOGO, local: 'Quadra Society Vila Nova', status: 'agendado', num_times: null, jogadores_por_time: 5, max_jogadores: null,
    sorteio_realizado: false, times_resultado: null, historico: false, cancelado: false, resultado_nivel: 0, time_vencedor: null, placar_a: null, placar_b: null,
    campeao_time_index: null, campeao_foto_url: null, artilheiro_user_id: null, artilheiro_gols: null, destaque_user_id: null, destaque_titulo: null,
    rodada_user_id: null, rodada_foto_url: null,
  };
  const jogadoresDoJogo = () => ELENCO.map((j) => ({ user_id: j.id, nome: j.nome, avatar_url: null, rating: 3, confirmado: true, goleiro: false, cabeca_chave: false }));

  // O campeonato: o motor de campeonatos das provas, lendo o jogo (o `de-sorteio` usa o times_resultado de agora).
  const campeonatos = criarMotor({ store, papel, slug: SLUG, nomeDoTime: time.nome, membros, jogos: () => [{ ...jogo, sorteio_realizado: !!jogo.times_resultado }] });
  Object.assign(campeonatos.team, time);

  const desconhecidos = new Set();
  const pedidos = [];

  const meuPayload = () => ({
    user: { id: eu.id, nome: eu.nome, nome_jogador: eu.nome, onboarding_completo: true, birthdate: '1990-01-01', foto_url: null, avatar_url: null, plano: 'free', fundo_figurinha: 'estadio' },
    stats: { nota: 0, jogos: 0, gols: 0 },
  });

  const jogoDoInicio = () => ({
    id: jogo.id, name: jogo.local, date: jogo.data, location: jogo.local, status: jogo.sorteio_realizado ? 'drawn' : 'scheduled', estado: 'agendado',
    confirmed_count: ELENCO.length, cancelado: false, user_status: 'going', team_id: time.id, team_name: time.nome, team_slug: time.slug, fuso: SP,
    ausente_proximo: false, eu_jogo: true, montado_a_mao: false,
  });

  const SEM_PENDENCIA = { pedidos: 0, presenca: null, resultado: null, denuncias: 0, total: 0 };
  // O campeonato novo do time no Início: a MESMA conta do motor (resumoDoInicio), sobre os campeonatos que existem agora.
  const campeonatoNovo = () => {
    const resumo = store.resumoDoInicio([...campeonatos.camps.values()], eu.id);
    return resumo ? { ...resumo, team_slug: SLUG } : null;
  };
  const inicioPayload = () => ({
    me: meuPayload(),
    teams: { teams: [{ ...time }] },
    convites: { games: [jogoDoInicio()] },
    pedidos: { pedidos: [] },
    votacoes_pendentes: { pendentes: [] },
    denuncias_desfechos: { total: 0 },
    votacao_status: null, campeonato: null, campeonato_novo: campeonatoNovo(), rsvp: null,
    seu_time: papelAtual === 'admin' ? [{ team_id: time.id, slug: time.slug, nome: time.nome, fuso: SP, pendencias: { ...SEM_PENDENCIA }, quem_ganhou: null }] : [],
    ad: { ad: null }, ads: null,
    brilhante: { fonte: null, team_id: null, kit_id: null, creditos: 0, restantes: 0, loja_pronta: false },
    pedidos_brilhante: [],
  });

  function sortear(corpo) {
    const porTime = Math.max(1, parseInt(corpo?.jogadoresPorTime, 10) || 5);
    const confirmados = jogadoresDoJogo().map((p) => ({ user_id: p.user_id, nome: p.nome, avatar_url: null, rating: 3, goleiro: false, cabeca_chave: false }));
    const s = executarSorteio(confirmados, porTime, { convidados: [], seed: 1810 });
    jogo.num_times = s.numTimes;
    jogo.jogadores_por_time = porTime;
    jogo.sorteio_realizado = true;
    jogo.status = 'agendado';
    jogo.times_resultado = {
      num_times: s.numTimes, total_jogadores: confirmados.length, convidados_total: 0, seed: s.seed, avisos: [],
      times: s.times.map((jogadores, i) => ({ nome: NOMES_DOS_TIMES[i], rating_medio: 3, jogadores })),
      reservas: s.reservas, registro: null,
    };
    return { game: { id: jogo.id, fuso: SP, num_times: s.numTimes, sorteio_realizado: true, times_resultado: jogo.times_resultado, status: jogo.status } };
  }

  /** Quem joga em cada time do campeonato (para o roteiro escolher um jogador comum do time campeão). */
  const timesDoCampeonato = () => [...campeonatos.camps.values()][0]?.times || [];

  // Os selos de honra do jogador (a mesma conta do backend: pódio de campeonato terminado, 30 dias).
  const HONRA = { 1: 'CAMPEÃO', 2: 'VICE', 3: '3º LUGAR' };
  function selosDe(userId) {
    const selos = [];
    for (const c of campeonatos.camps.values()) {
      if (c.estado !== 'terminado') continue;
      const meu = store.podio(c).find((p) => (p.time.jogadores || []).some((j) => j.user_id === userId));
      if (!meu) continue;
      selos.push({ id: `camp:${c.id}`, fonte: 'campeonato', tier: meu.tier, label: HONRA[meu.pos], sub: c.nome, ativa: true, dias_restantes: 30, historico: false, terminado_em: c.terminado_em, prioridade: 1 });
    }
    return selos;
  }

  // A Resenha: o post do campeão do campeonato (a MESMA conta do motor: conteudoDoPostDoCampeao), e — se o roteiro pedir — o post do campeão do
  // JOGO. `reacoesDoPost` e `comentariosDoPost` são o exemplo que o roteiro põe no post.
  const resenha = { postDoJogo: false, comentarios: [], reacoes: {}, minhaReacao: null };
  function feed() {
    const items = [];
    for (const c of campeonatos.camps.values()) {
      const pronto = c.estado === 'terminado' ? store.conteudoDoPostDoCampeao(c) : null;
      if (!pronto) continue;
      items.push({
        kind: 'post', id: `post-${c.id}`, created_at: c.terminado_em, team_id: time.id, team_name: time.nome, fuso: SP, author_id: DONO_DO_POST, author_nome: 'Pedro', author_avatar_url: null,
        body: pronto.body, tipo: 'post', conteudo: pronto.conteudo, media: [], contagem_reacoes: { ...resenha.reacoes }, minha_reacao: resenha.minhaReacao,
        comentarios_total: resenha.comentarios.length, comentarios_recentes: resenha.comentarios.slice(-2),
      });
    }
    if (resenha.postDoJogo && jogo.times_resultado) {
      items.push({
        kind: 'jogo', id: jogo.id, created_at: new Date().toISOString(), date: jogo.data, time: '20:00', fuso: SP, location: jogo.local, team_id: time.id, team_name: time.nome, team_slug: SLUG,
        times_resultado: jogo.times_resultado, campeao_time_index: 0, time_vencedor: null, placar_a: null, placar_b: null, campeao_foto_url: null,
        artilheiro_user_id: null, artilheiro_gols: null, artilheiro_nome: null, artilheiro_avatar_url: null, destaque_user_id: null, destaque_titulo: null, destaque_nome: null, destaque_avatar_url: null,
        rodada_user_id: null, rodada_foto_url: null, rodada_nome: null, rodada_avatar_url: null, contagem_reacoes: {}, minha_reacao: null, comentarios_total: 0, comentarios_recentes: [],
      });
    }
    return items.sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
  }
  const DONO_DO_POST = 'U1';

  const ok = (json, status = 200) => ({ status, json });

  const extras = { rotas: [] }; // rotas que quem usa o mundo acrescenta: [(pathname, metodo, corpo) => resposta | undefined]

  function responder(pathname, metodo, corpo) {
    pedidos.push({ metodo, pathname, corpo });
    for (const r of extras.rotas) {
      const resposta = r(pathname, metodo, corpo, { eu, time, ELENCO, selosDe, campeonatos, jogo });
      if (resposta !== undefined) return resposta;
    }
    if (metodo === 'GET' && pathname === '/api/inicio') return ok(inicioPayload());
    if (metodo === 'GET' && pathname === '/api/me') return ok(meuPayload());
    if (metodo === 'GET' && pathname === '/api/teams') return ok({ teams: [{ ...time }] });
    if (metodo === 'GET' && pathname === '/api/feed') return ok({ items: feed(), proximo: null });
    if (metodo === 'GET' && pathname === '/api/me/selos') return ok({ selos: selosDe(eu.id) });
    if (metodo === 'GET' && pathname === `/api/teams/${SLUG}`) {
      return ok({ team: { ...time }, members: ELENCO.map((j, i) => ({ id: j.id, nome: j.nome, role: i === 0 ? 'admin' : 'member', joga: true, goleiro: false, avatar_url: null })) });
    }
    if (metodo === 'GET' && pathname === `/api/teams/${SLUG}/games`) {
      return ok({ team: { ...time }, games: [{ id: jogo.id, local: jogo.local, data: jogo.data, status: 'agendado', num_times: jogo.num_times || 2, jogadores_por_time: jogo.jogadores_por_time, sorteio_realizado: jogo.sorteio_realizado, resultado_nivel: 0, campeao_time_index: null, time_vencedor: null, cancelado: false, motivo_cancelamento: null, max_jogadores: null, rsvp_aberto: false, rsvp_fechado: false, confirmados: ELENCO.length }] });
    }
    if (metodo === 'GET' && pathname === `/api/games/${jogo.id}`) {
      return ok({ team: { ...time }, game: { ...jogo }, players: jogadoresDoJogo(), gols: [], meuEstado: { confirmado: true, goleiro: false, cabeca_chave: false }, jaVotei: false });
    }
    if (metodo === 'POST' && pathname === `/api/games/${jogo.id}/sortear`) return ok(sortear(corpo));
    if (metodo === 'GET' && pathname === `/api/jogos/${jogo.id}/rsvp`) {
      return ok({ rsvp_aberto: false, rsvp_fechado: false, confirmados: ELENCO.map((j) => j.id), recusados: [], pendentes: [], fuso: SP, eu_jogo: true });
    }
    // O campeonato (lista, criar, de-sorteio, jogos sorteados, detalhe, resultado, desempate, público).
    const dosCampeonatos = campeonatos.responder(pathname, metodo, corpo);
    if (dosCampeonatos) return dosCampeonatos;
    if (metodo === 'GET') { desconhecidos.add(`GET ${pathname}`); return ok({}); }
    desconhecidos.add(`${metodo} ${pathname}`);
    return ok({ ok: true });
  }

  /** Troca quem está olhando (outra sessão do mesmo mundo): o Pedro admin, um jogador comum… O mundo (sorteio, campeonato) é o mesmo. */
  function verComo(novoId, novoPapel) {
    eu = ELENCO.find((j) => j.id === novoId);
    papelAtual = novoPapel;
    time.role = novoPapel;
  }

  return { responder, desconhecidos, pedidos, campeonatos, jogo, time, get eu() { return eu; }, extras, resenha, timesDoCampeonato, selosDe, verComo, ELENCO, store };
}
