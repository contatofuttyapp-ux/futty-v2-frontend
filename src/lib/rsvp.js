// Futty v2.0 — o pedido de presença (RSVP), a frase de quando ele falha e o jeito de responder com estado
// OTIMISTA. Vive aqui, e não no RSVPCard, porque o card "Confirme presença" e o "Vou / Não vou" do jogo no
// Início respondem pelo MESMO caminho (um destino só, um número só). O miolo é puro de React, para testar no
// Node.

export const MSG_FALHA_RSVP = 'Não deu para registrar sua resposta. Tente de novo.';

/**
 * Por que a janela de RSVP deste jogo (se já foi aberta ao menos uma vez) não aceita mais resposta — ou
 * `null` se ainda aceita, ou se nunca foi aberta (aí vale o "Vou / Não vou" de sempre, sem prazo nenhum).
 * 'fechado' quando o admin fechou (antes ou depois do prazo); 'prazo' quando só o prazo venceu, sozinho.
 */
export function motivoRsvpEncerrada(rsvp) {
  if (!rsvp?.rsvp_aberto) return null;
  if (rsvp.rsvp_fechado) return 'fechado';
  if (rsvp.rsvp_prazo && new Date(rsvp.rsvp_prazo).getTime() <= Date.now()) return 'prazo';
  return null;
}

// Nunca "tente de novo": tentar de novo não resolve nem o prazo vencido nem a presença fechada pelo admin.
export const FRASE_RSVP_ENCERRADA = { fechado: 'Presença fechada.', prazo: 'Prazo encerrado.' };

/** "Vou" / "Não vou" no RSVP do jogo: status = 'confirmado' | 'recusado'. Devolve a resposta do motor ({ ok, status } ou { espera, posicao }). */
export async function enviarRsvp(gameId, status) {
  const { apiFetch } = await import('./api'); // só aqui, para o resto deste arquivo (e o teste) não puxar a rede
  return apiFetch(`/api/jogos/${gameId}/rsvp/responder`, { method: 'POST', body: JSON.stringify({ status }) });
}

/**
 * Responde presença com estado otimista: `aplicar(status)` roda ANTES do pedido — o botão acende e o contador
 * mexe na hora —, o pedido segue por trás, e se ele falhar `aplicar(anterior)` desfaz e o retorno traz a
 * frase curta do erro. Se o jogo estava cheio e a pessoa entrou na fila (`espera`), o "Vou" não valeu: desfaz
 * também e devolve a posição.
 *   anterior  a resposta de antes ('confirmado' | 'recusado' | null), para onde voltar
 *   aplicar   põe na tela uma resposta (o `setState` de quem chama)
 *   otimista  false = não mexe na tela antes (o jogo cheio, em que "Vou" é entrar na fila)
 *   enviar    o pedido (só o teste troca)
 * @returns {Promise<{ ok: boolean, espera?: number, erro?: string }>}
 */
export async function responderComOtimismo({ gameId, status, anterior, aplicar, otimista = true, enviar = enviarRsvp }) {
  if (otimista) aplicar(status);
  try {
    const r = await enviar(gameId, status);
    if (r?.espera) {
      if (otimista) aplicar(anterior);
      return { ok: true, espera: r.posicao };
    }
    return { ok: true };
  } catch (err) {
    if (otimista) aplicar(anterior);
    // Erro de rede (apiFetch sem `status`: o fetch nem voltou) fica com a frase genérica — "tente de novo"
    // ali é verdade. Erro do motor (400, 409…) tem mensagem própria ("O prazo para confirmar presença já
    // passou.") e mentir com a genérica manda tentar de novo algo que tentar de novo não resolve.
    const erro = err?.status != null && err?.message ? err.message : MSG_FALHA_RSVP;
    return { ok: false, erro };
  }
}
