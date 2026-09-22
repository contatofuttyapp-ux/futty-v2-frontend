// Futty v2.0 — O que as telas precisam saber sobre Figurinhas Brilhantes
// (SPEC-FIGURINHA-3, 22-set). Um sítio só, para Planos, Figurinha e Início não
// escreverem três versões da mesma pergunta.
import { apiFetch } from './api';

/**
 * GET /api/brilhantes/estado — direito atual, créditos, times e pedidos
 * pendentes. Nunca lança: uma tela não pode cair porque o motor ainda não tem
 * a migração 054 aplicada. Sem resposta, devolve "ninguém tem nada", que é
 * exatamente o que o app deve mostrar nesse caso.
 */
export async function estadoBrilhantes() {
  try {
    return await apiFetch('/api/brilhantes/estado');
  } catch {
    return { direito: { fonte: null, team_id: null, kit_id: null }, creditos: 0, times: [], pedidos: [] };
  }
}

/**
 * POST /api/brilhantes/pedido — cria (ou reencontra) o pedido de ativação.
 * Devolve `{ ok, jaExistia, erro }`; quem chama mostra "Pedido enviado — a
 * gente ativa e avisa" nos dois casos de sucesso, porque do lado de quem toca
 * no botão pedir duas vezes não é um erro, é impaciência.
 */
export async function pedirAtivacao(produto, teamId = null) {
  try {
    const r = await apiFetch('/api/brilhantes/pedido', {
      method: 'POST',
      body: JSON.stringify(teamId ? { produto, teamId } : { produto }),
    });
    return { ok: true, jaExistia: !!r?.ja_existia };
  } catch (e) {
    return { ok: false, erro: e?.message || 'Não deu para enviar o pedido. Tente de novo.' };
  }
}

/**
 * O pedido que vale a pena mostrar para este produto (e este time): a pendente
 * manda à frente da recusa, porque pedir de novo depois de uma recusa é a
 * pessoa a seguir em frente — a tela tem de acompanhar, não insistir no não.
 * Devolve o pedido (com `estado` e `motivo`) ou null.
 */
export function pedidoDoProduto(pedidos, produto, teamId = null) {
  const meus = (pedidos || []).filter((p) => p.produto === produto && (teamId ? p.team_id === teamId : true));
  return meus.find((p) => p.estado === 'pendente') || meus.find((p) => p.estado === 'recusado') || null;
}

/** Já existe um pedido PENDENTE deste produto (para este time)? */
export function temPedidoPendente(pedidos, produto, teamId = null) {
  return pedidoDoProduto(pedidos, produto, teamId)?.estado === 'pendente';
}
