// Futty v2.0 — a chave VAPID do push e a re-inscrição silenciosa (COFRE 25-set).
//
// O par VAPID do motor foi trocado (o antigo vazou). Uma subscrição de push nasce amarrada à chave pública com que foi
// feita: depois da troca o push service recusa os envios do motor (403) e a subscrição de cada pessoa vira letra morta —
// sem a pessoa saber e sem nenhum erro na tela. Aqui mora o que faz o app se curar sozinho: comparar a chave com que a
// subscrição foi feita com a que o motor serve HOJE e, se mudou, refazer a inscrição (sem pedir permissão de novo: ela
// já foi concedida) e avisar o motor.
//
// Sem React, sem rede e sem `window`: só contas e a ordem das chamadas, com as dependências injetadas — para poderem
// ser provadas no Node (scripts/unidade/chave-push.test.mjs). O hook (hooks/usePushNotifications.js) traz as de verdade.

const ehArrayBuffer = (v) => v instanceof ArrayBuffer || Object.prototype.toString.call(v) === '[object ArrayBuffer]';

/**
 * Bytes (ArrayBuffer, Uint8Array, DataView...) ou texto base64/base64url → base64url SEM padding, o formato único em
 * que as duas chaves se comparam. `null` quando não há o que converter (vazio, ausente, tipo estranho).
 */
export function paraBase64Url(valor) {
  if (valor == null) return null;
  if (typeof valor === 'string') {
    const limpo = valor.trim().replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    return limpo || null;
  }
  let bytes = null;
  if (ehArrayBuffer(valor)) bytes = new Uint8Array(valor);
  else if (ArrayBuffer.isView(valor)) bytes = new Uint8Array(valor.buffer, valor.byteOffset, valor.byteLength);
  if (!bytes || !bytes.length) return null;
  let binario = '';
  for (let i = 0; i < bytes.length; i += 1) binario += String.fromCharCode(bytes[i]);
  return globalThis.btoa(binario).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * A chave que o motor serve hoje é DIFERENTE da que a subscrição usou? Só responde `true` quando as duas existem e
 * diferem. Sem a chave da subscrição (alguns browsers não a expõem) não há como saber — e refazer à toa, a cada abertura,
 * seria pior do que não refazer.
 */
export function chavesDiferem(applicationServerKey, publicaDoMotor) {
  const daSubscricao = paraBase64Url(applicationServerKey);
  const doMotor = paraBase64Url(publicaDoMotor);
  if (!daSubscricao || !doMotor) return false;
  return daSubscricao !== doMotor;
}

/** A chave VAPID vem em base64url; pushManager.subscribe exige um Uint8Array. */
export function urlBase64ParaBytes(base64Url) {
  const padding = '='.repeat((4 - (base64Url.length % 4)) % 4);
  const base64 = (base64Url + padding).replace(/-/g, '+').replace(/_/g, '/');
  const bruto = globalThis.atob(base64);
  const bytes = new Uint8Array(bruto.length);
  for (let i = 0; i < bruto.length; i += 1) bytes[i] = bruto.charCodeAt(i);
  return bytes;
}

/**
 * Confere a subscrição que o browser tem contra a chave do motor e, se a chave mudou, refaz a inscrição.
 *
 * Só age sobre uma subscrição que JÁ existe: quem desligou as notificações no app (dessubscrever) não tem subscrição
 * e nunca é reinscrito por aqui. O motor guarda a subscrição por (pessoa, endpoint) com upsert, então avisá-lo também
 * quando a chave é a mesma é barato e cura o caso de a linha ter sido apagada do lado dele (403/404/410 no envio, ou
 * limpeza manual da tabela depois da troca das chaves) — o app não fica achando que está tudo certo sem estar.
 *
 * @param {object} dep
 * @param {() => Promise<PushSubscription|null>} dep.subscricaoAtual   a subscrição que o browser tem (ou null)
 * @param {() => Promise<string|null>} dep.chaveDoMotor                a chave pública que o motor serve hoje
 * @param {(chave: Uint8Array) => Promise<PushSubscription>} dep.inscrever   pushManager.subscribe com a chave nova
 * @param {(sub: PushSubscription) => Promise<unknown>} dep.avisarMotor      POST /api/push/subscribe
 * @returns {Promise<'sem-subscricao'|'sem-chave'|'igual'|'refeita'>}
 */
export async function sincronizarSubscricao({ subscricaoAtual, chaveDoMotor, inscrever, avisarMotor }) {
  const sub = await subscricaoAtual();
  if (!sub) return 'sem-subscricao';
  const publica = await chaveDoMotor();
  if (!publica) return 'sem-chave';
  if (!chavesDiferem(sub.options?.applicationServerKey, publica)) {
    await avisarMotor(sub);
    return 'igual';
  }
  // O browser recusa subscribe() com outra chave enquanto a subscrição antiga existir: sai primeiro.
  await sub.unsubscribe();
  const nova = await inscrever(urlBase64ParaBytes(publica));
  await avisarMotor(nova);
  return 'refeita';
}
