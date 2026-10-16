// Futty v2.0 — validar o convite sem nunca ficar preso em "Validando convite…". Puro (sem React, sem rede), para testar no Node.
//
// No iPhone do dono a página do convite ficou parada em "Validando convite…" com o motor respondendo certo: o pedido saiu e nunca voltou
// (ou nem saiu — a ida à rede espera a sessão do Supabase, que pode não responder ao voltar do segundo plano). Por isso cada tentativa tem
// PRAZO, a 2ª sai sozinha e já sem a sessão (a validação é pública), e só depois de as duas falharem a tela mostra "Tentar de novo".
// Resposta do motor que diz algo (4xx, como 404) não se repete: é a resposta.

export const PRAZO_MS = 8000;
export const ESPERA_ENTRE_MS = 1200;

/** A promessa, ou um erro `code: 'PRAZO'` se ela não terminar em `ms`. */
export function comPrazo(promessa, ms) {
  let relogio;
  const prazo = new Promise((_, rejeitar) => {
    relogio = setTimeout(() => {
      const e = new Error('O convite demorou para responder.');
      e.code = 'PRAZO';
      rejeitar(e);
    }, ms);
  });
  return Promise.race([promessa, prazo]).finally(() => clearTimeout(relogio));
}

/** Vale tentar de novo? Prazo, rede caída e erro do servidor sim; uma resposta 4xx (que não seja 408/429) não. */
export function valeTentarDeNovo(erro) {
  const s = Number(erro?.status);
  if (!Number.isFinite(s)) return true;
  return s >= 500 || s === 408 || s === 429;
}

/**
 * Valida o convite: `comSessao()` (o pedido de sempre, que diz se a pessoa já é do time) e, se ele falhar ou passar do prazo,
 * `semSessao()` (o mesmo GET público, sem esperar a sessão). Devolve { dados, semSessao } ou lança o último erro com
 * `code: 'CONVITE_TRAVADO'` — aí a tela mostra "Tentar de novo".
 */
export async function validarConvite({ comSessao, semSessao, prazoMs = PRAZO_MS, esperaEntreMs = ESPERA_ENTRE_MS, dormir = (ms) => new Promise((r) => setTimeout(r, ms)) }) {
  try {
    return { dados: await comPrazo(Promise.resolve().then(comSessao), prazoMs), semSessao: false };
  } catch (e) {
    if (!valeTentarDeNovo(e)) throw e;
  }
  await dormir(esperaEntreMs);
  try {
    return { dados: await comPrazo(Promise.resolve().then(semSessao), prazoMs), semSessao: true };
  } catch (e) {
    if (!valeTentarDeNovo(e)) throw e;
    const travado = new Error('Não deu para validar o convite agora. Confira a internet e tente de novo.');
    travado.code = 'CONVITE_TRAVADO';
    throw travado;
  }
}
