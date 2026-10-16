// Futty v2.0 — O que as telas precisam saber sobre Figurinhas Brilhantes. Um sítio só, para Planos,
// Figurinha e Início não escreverem três versões da mesma pergunta.
import { apiFetch } from './api';
import { espelharBrilhantesNoInicio } from './cacheCard';

/** O aviso de "o estado das figurinhas mudou" (uma compra chegou): a Figurinha aberta escuta e troca o contador na hora. */
export const EVENTO_BRILHANTES = 'futty:brilhantes';

/** Guarda o estado novo no Início guardado (a Figurinha nasce dele) e avisa quem estiver com a tela aberta. */
export function avisarBrilhantes(userId, estado) {
  if (!estado || estado.indisponivel) return;
  espelharBrilhantesNoInicio(userId, estado);
  try { window.dispatchEvent(new CustomEvent(EVENTO_BRILHANTES, { detail: estado })); } catch { /* sem janela (teste) */ }
}

/** O que foi comprado já aparece no estado? (créditos a mais na Minha Figurinha; pacote ativo no time). */
export function compraApareceu(produto, antes, novo, teamId = null) {
  if (!novo || novo.indisponivel) return false;
  if (produto === 'minha') return (novo.creditos || 0) > (antes?.creditos || 0);
  if (produto === 'pacote') return !!(novo.times || []).find((t) => t.id === teamId)?.brilhante_ativo;
  return false;
}

/**
 * A loja confirmou a compra, mas o motor ainda não a mostra (o webhook chega segundos depois): segue conferindo em segundo plano, mesmo que a
 * pessoa saia dos Planos, e avisa quando aparecer — o contador da Figurinha sobe sem fechar o app. Nunca lança; devolve o estado novo ou null.
 */
export async function acompanharCompra({ userId, produto, antes, teamId = null, tentativas = 10, intervaloMs = 3000, ler = estadoBrilhantes, esperar = (ms) => new Promise((r) => { setTimeout(r, ms); }) }) {
  for (let i = 0; i < tentativas; i += 1) {
    await esperar(intervaloMs);
    const novo = await ler({ segundoPlano: true });
    if (compraApareceu(produto, antes, novo, teamId)) {
      avisarBrilhantes(userId, novo);
      return novo;
    }
  }
  return null;
}

/**
 * GET /api/brilhantes/estado — direito atual, créditos, times e pedidos
 * pendentes. Nunca lança: uma tela não pode cair porque o motor ainda não tem
 * a migração 054 aplicada. Sem resposta, devolve "ninguém tem nada", que é
 * exatamente o que o app deve mostrar nesse caso.
 */
export async function estadoBrilhantes({ segundoPlano = false } = {}) {
  try {
    // `segundoPlano`: revalidação por trás, com a tela já aberta
    // a partir do que o /api/inicio trouxe. Marca a chamada como de fundo no
    // diagnóstico — não é espera de ninguém, e não pode entrar na conta de
    // "dados" da tela.
    return await apiFetch('/api/brilhantes/estado', { segundoPlano });
  } catch {
    // indisponivel: a tela mostra 'ninguém tem nada', mas isto NÃO é uma resposta do servidor — quem guarda
    // o estado (cacheCard.espelharBrilhantesNoInicio) não pode guardá-lo como verdade.
    return { direito: { fonte: null, team_id: null, kit_id: null, restantes: 0 }, creditos: 0, times: [], pedidos: [], indisponivel: true };
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
