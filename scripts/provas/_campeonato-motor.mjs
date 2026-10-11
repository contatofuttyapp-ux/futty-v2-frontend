// Futty v2.0 — O motor de mentira dos CAMPEONATOS para as provas do navegador e para o roteiro de capturas.
//
// As telas falam com /api/**; aqui quem responde é um motor em memória que roda a regra DE VERDADE: o mesmo
// `backend/utils/campeonatoStore.js` (calendário, tabela, desempate, final automática, correção, pódio) — só
// o Storage é trocado por um Map. Nada sai da máquina: este módulo não faz pedido nenhum.
//
// O backend mora ao lado (FUTTY-V2/backend). Se não estiver lá, `carregarStore()` devolve null e quem usa avisa que pulou.
// (Não começa com `.prova.mjs`, então o `provar-navegador` não o trata como prova.)
import { createRequire } from 'node:module';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const CAMINHO_DO_STORE = fileURLToPath(new URL('../../../backend/utils/campeonatoStore.js', import.meta.url));

/** O store do backend, ou null. As variáveis falsas só existem para o `utils/db` do backend carregar sem encerrar o processo: o cliente nunca é usado. */
export function carregarStore() {
  if (!existsSync(CAMINHO_DO_STORE)) return null;
  process.env.SUPABASE_URL ||= 'http://127.0.0.1:9';
  process.env.SUPABASE_SERVICE_KEY ||= 'prova-sem-rede';
  return createRequire(import.meta.url)(CAMINHO_DO_STORE);
}

// Os nomes que o motor dá aos times quando o campeonato nasce de um sorteio (routes/campeonatos.js).
const NOMES_COR_SORTEIO = ['Time Ouro', 'Time Roxo', 'Time Prata', 'Time Bronze'];

/**
 * @param {object} o
 * @param {object} o.store         o store do backend (carregarStore())
 * @param {'admin'|'member'} [o.papel]  quem está olhando
 * @param {string} [o.slug]
 * @param {string} [o.nomeDoTime]
 * @param {Array}  [o.membros]     [{ id, nome }] — os jogadores do time
 * @param {object} [o.jogo]        o jogo sorteado de onde o campeonato pode nascer: { id, data, times_resultado }
 */
export function criarMotor({ store, papel = 'admin', slug = 'domingueira-fc', nomeDoTime = 'Domingueira FC', membros = [], jogo = null }) {
  const camps = new Map();
  const pedidos = [];
  const team = {
    id: 'T1', slug, nome: nomeDoTime, cor: 'vinho', escudo_cor2: 'ouro', escudo_padrao: 'faixa', role: papel, joga: true,
    fuso: 'America/Sao_Paulo', cidade: 'São Paulo', jogadores_por_time: 5, mostrar_gols: true, modo_visibilidade: 'privado', logo_url: null,
  };

  const ok = (json, status = 200) => ({ status, json });
  const erro = (status, mensagem) => ({ status, json: { error: mensagem } });
  const enriquecer = (c) => store.enriquecer(c);

  function criar(corpo, deSorteio) {
    if (papel !== 'admin') return erro(403, 'Só o admin do time cria campeonatos.');
    const formato = store.lerFormato(corpo?.formato);
    const minimo = store.MIN_TIMES_DO_FORMATO[formato] || 2;
    let opts;
    if (deSorteio) {
      const times = (jogo?.times_resultado?.times || []).slice(0, 8);
      if (times.length < minimo) return erro(400, `Este jogo não tem times sorteados suficientes (mínimo ${minimo}).`);
      opts = {
        nome: `Campeonato do sorteio · ${jogo.dataCurta || ''}`.replace(/ · $/, ''),
        formato,
        usar_sorteio: false,
        nomes: times.map((_, i) => NOMES_COR_SORTEIO[i % NOMES_COR_SORTEIO.length]),
        plantel: times.map((t) => (t.jogadores || []).map((j) => ({ user_id: j.user_id || null, nome: j.nome, avatar_url: j.avatar_url || null, convidado: !!j.convidado }))),
      };
    } else if (corpo.modo === 'sorteio') {
      const n = Math.floor(Number(corpo.num_times) || 0);
      if (n < minimo || n > 8) return erro(400, `Escolha entre ${minimo} e 8 times.`);
      const participantes = membros.map((m) => ({ user_id: m.id, nome: m.nome, avatar_url: m.avatar_url || null, rating: 3, convidado: false }))
        .concat((corpo.convidados || []).map((nome) => ({ user_id: null, nome, avatar_url: null, rating: 3, convidado: true })));
      opts = { nome: corpo.nome, formato, usar_sorteio: true, num_times: n, participantes, seed: corpo.seed, nomes: corpo.nomes };
    } else {
      const nomes = (corpo.nomes || []).map((x) => String(x || '').trim()).filter(Boolean).slice(0, 8);
      if (nomes.length < minimo) return erro(400, formato === 'pontos_final' ? `Este formato precisa de pelo menos ${minimo} times.` : 'Um campeonato precisa de pelo menos 2 times.');
      opts = { nome: corpo.nome, formato, usar_sorteio: false, nomes, plantel: corpo.plantel };
    }
    const camp = store.montar(team.id, 'U1', opts);
    camps.set(camp.id, camp);
    return ok({ campeonato: enriquecer(camp) }, 201);
  }

  function resultado(camp, cid, corpo) {
    if (papel !== 'admin') return erro(403, 'Só o admin lança resultados.');
    if (camp.estado === 'terminado') {
      return camp.formato === 'pontos_final' ? erro(409, store.MSG_FINAL_JOGADA) : erro(400, 'Campeonato já terminou.');
    }
    const pa = Math.max(0, Math.floor(Number(corpo?.placar_a)));
    const pb = Math.max(0, Math.floor(Number(corpo?.placar_b)));
    if (!Number.isFinite(pa) || !Number.isFinite(pb)) return erro(400, 'Placar inválido.');
    const avisos = [];
    try {
      store.aplicarResultado(camp, cid, pa, pb, avisos);
    } catch (e) {
      return erro(400, e.message);
    }
    return ok({ campeonato: enriquecer(camp), avisos });
  }

  function desempate(camp, corpo) {
    if (papel !== 'admin') return erro(403, 'Só o admin decide o empate.');
    if (camp.estado === 'terminado') return erro(400, 'Campeonato já terminou.');
    const avisos = [];
    try {
      store.decidirEmpate(camp, String(corpo?.time_id || ''), avisos);
    } catch (e) {
      return erro(400, e.message);
    }
    return ok({ campeonato: enriquecer(camp), avisos });
  }

  /** Responde um pedido a /api/**; null = deixa para o chamador (resposta vazia). */
  function responder(pathname, metodo, corpo) {
    pedidos.push({ metodo, pathname, corpo });
    const base = `/api/equipas/${slug}/campeonatos`;
    if (pathname === `/api/teams/${slug}`) return ok({ team, members: membros.map((m, i) => ({ id: m.id, nome: m.nome, role: i === 0 ? 'admin' : 'member', joga: true, goleiro: false, avatar_url: m.avatar_url || null })) });
    if (pathname === base && metodo === 'GET') {
      const lista = [...camps.values()].sort((a, b) => b.criado_em.localeCompare(a.criado_em));
      return ok({ campeonatos: lista.map((c) => ({ id: c.id, nome: c.nome, formato: c.formato, estado: c.estado, n_times: c.times.length, criado_em: c.criado_em, campeao: c.campeao_time_id ? c.times.find((t) => t.id === c.campeao_time_id)?.nome || null : null })) });
    }
    if (pathname === base && metodo === 'POST') return criar(corpo, false);
    if (pathname === `${base}/de-sorteio` && metodo === 'POST') return criar(corpo, true);
    const m = pathname.startsWith(`${base}/`) ? pathname.slice(base.length + 1).split('/') : null;
    if (m) {
      const camp = camps.get(m[0]);
      if (!camp) return erro(404, 'Campeonato não encontrado.');
      if (m.length === 1 && metodo === 'GET') return ok({ campeonato: enriquecer(camp) });
      if (m[1] === 'confrontos' && m[3] === 'resultado' && metodo === 'POST') return resultado(camp, m[2], corpo);
      if (m[1] === 'desempate' && metodo === 'POST') return desempate(camp, corpo);
    }
    const publico = pathname.match(/^\/api\/p\/campeonato\/([^/]+)\/([^/]+)$/);
    if (publico) {
      const camp = camps.get(publico[2]);
      return camp ? ok({ campeonato: enriquecer(camp), equipa: { nome: nomeDoTime, slug, logo_url: null } }) : erro(404, 'Campeonato não encontrado.');
    }
    if (jogo && pathname === `/api/games/${jogo.id}`) return ok(jogo.resposta);
    return null;
  }

  // ── atalhos para montar o cenário sem passar pela tela ─────────────────────────────────────────────────────────────────

  /** Cria um campeonato direto (sem tela) e devolve o documento vivo — as telas leem o mesmo objeto. */
  function criarDireto(opts) {
    const camp = store.montar(team.id, 'U1', { usar_sorteio: false, ...opts });
    camps.set(camp.id, camp);
    return camp;
  }

  /** Lança X × Y (gols de X, de Y), onde quer que o jogo esteja no calendário da fase de grupos. */
  function jogar(camp, x, y, gx, gy, avisos = []) {
    const idX = camp.times.find((t) => t.nome === x).id;
    const idY = camp.times.find((t) => t.nome === y).id;
    const c = camp.confrontos.find((k) => k.fase !== 'final' && ((k.time_a_id === idX && k.time_b_id === idY) || (k.time_a_id === idY && k.time_b_id === idX)));
    if (!c) throw new Error(`não há o jogo ${x} × ${y}`);
    const [pa, pb] = c.time_a_id === idX ? [gx, gy] : [gy, gx];
    return store.aplicarResultado(camp, c.id, pa, pb, avisos);
  }

  return { camps, pedidos, team, responder, criarDireto, jogar, enriquecer };
}

// O handler do page.route do Playwright (para todas as URLs): o que é /api vai ao motor; o servidor da prova passa; todo o resto nem sai da máquina.
export function rotear(motor, base, { aoPedir = null } = {}) {
  const origem = new URL(base).host;
  return (route) => {
    const req = route.request();
    const u = new URL(req.url());
    if (u.pathname.startsWith('/api/')) {
      const bruto = req.postData();
      const resposta = motor.responder(u.pathname, req.method(), bruto ? JSON.parse(bruto) : null);
      if (aoPedir) aoPedir(u.pathname, req.method());
      if (resposta) return route.fulfill({ status: resposta.status, contentType: 'application/json', body: JSON.stringify(resposta.json) });
      return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    }
    if (u.host === origem) return route.continue();
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  };
}
