// Futty v2.0 — Figurinha: o que ela aproveita do Início já guardado (o direito de gerar e a idade desse cache).

import { lerCacheComIdade } from '../../lib/cacheLocal';

// ─── O que a Figurinha aproveita do Início ──────────────────────────────────────────────
//
// Três pedidos que a tela abriria sozinha — o anúncio, os selos e /api/brilhantes/estado (539 + 540 +
// 606 ms, de Lisboa: tudo distância) — não trazem novidade nenhuma para quem chegou pelo Início: o
// /api/inicio já traz o direito, os créditos, os pedidos vivos e as colunas do pacote em cada time.
// Fica tudo no cache de sessão, com a mesma chave que o InicioContext usa; daqui só se lê.
const FRESCOR_DO_INICIO_MS = 60000;

/** Idade (ms) do payload de /api/inicio guardado, ou null se não houver. */
function idadeDoInicio(userId) {
  return lerCacheComIdade(userId, 'inicio')?.idadeMs ?? null;
}

/**
 * O mesmo formato que `estadoBrilhantes()` devolve, montado a partir do
 * /api/inicio guardado. Sem payload (ou sem o direito lá dentro) devolve null e
 * a tela pede como antes.
 */
function brilhanteDoInicio(userId) {
  const d = lerCacheComIdade(userId, 'inicio')?.dados;
  if (!d?.brilhante) return null;
  const times = (d.teams?.teams || []).map((t) => ({
    id: t.id,
    nome: t.nome,
    slug: t.slug,
    sou_dono: t.role === 'admin',
    brilhante_ativo: !!t.brilhante_ativo,
    brilhante_kit: t.brilhante_kit || null,
    brilhante_limite: Number(t.brilhante_limite) || 25,
    manto_proprio: !!t.manto_proprio,
  }));
  return {
    direito: {
      fonte: d.brilhante.fonte, team_id: d.brilhante.team_id, kit_id: d.brilhante.kit_id, restantes: d.brilhante.restantes || 0,
      ...(d.brilhante.total != null ? { total: d.brilhante.total } : {}),
    },
    creditos: d.brilhante.creditos || 0,
    times,
    pedidos: d.pedidos_brilhante || [],
    // Pagamentos P2: o motor diz se a loja está ligada (PAGAMENTOS_ATIVOS) — vem no mesmo /api/inicio.
    loja_pronta: !!d.brilhante.loja_pronta,
  };
}

export { FRESCOR_DO_INICIO_MS, brilhanteDoInicio, idadeDoInicio };
