// Futty v2.0 — Cache do cromo do Início entre aberturas (VELOCIDADE 4).
//
// O cromo é a figurinha real desenhada em canvas: 600×600, decodificar o avatar
// e o fundo, compor, exportar. No celular isso leva de um a três segundos — e
// até 14-set a tela do Início ESPERAVA por ele para aparecer. Agora a tela
// aparece primeiro; isto aqui é o que faz o cromo aparecer na hora na abertura
// seguinte, em vez de se redesenhar do zero toda vez.
//
// Porquê IndexedDB e não o cacheLocal (localStorage) do resto da casa: o PNG tem
// algumas centenas de KB. Em localStorage teria de ir em base64 (+33%) e, com os
// ~5 MB de quota partilhados por TODOS os caches da app, uma figurinha grande
// sozinha despejaria o resto. O IndexedDB guarda o Blob como ele é, sem inflar e
// sem disputar essa quota.
//
// Chave por utilizador, como todo o cache da casa: celular partilhado não pode
// mostrar a figurinha de quem saiu. limparCromos() é chamada no mesmo signOut
// que limpa o cacheLocal (context/AuthContext.jsx).
//
// Nunca lança: cache é otimização, jamais dependência. Modo privado, quota
// cheia, IndexedDB desligado — tudo cai no mesmo sítio, que é "não há cache".

const BD = 'futty';
const VERSAO = 1;
const LOJA = 'cromos';
const VALIDADE_MS = 7 * 24 * 60 * 60 * 1000; // 7 dias, igual ao cacheLocal

function abrir() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('sem indexedDB'));
      return;
    }
    const pedido = indexedDB.open(BD, VERSAO);
    pedido.onupgradeneeded = () => {
      const bd = pedido.result;
      if (!bd.objectStoreNames.contains(LOJA)) bd.createObjectStore(LOJA, { keyPath: 'id' });
    };
    pedido.onsuccess = () => resolve(pedido.result);
    pedido.onerror = () => reject(pedido.error || new Error('indexedDB recusou abrir'));
    // Outra aba a correr uma versão diferente da BD segura o upgrade para sempre.
    pedido.onblocked = () => reject(new Error('indexedDB bloqueado por outra aba'));
  });
}

function transacao(bd, modo) {
  const tx = bd.transaction(LOJA, modo);
  return { tx, loja: tx.objectStore(LOJA) };
}

function comoPromessa(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function blobParaDataURL(blob) {
  return new Promise((resolve) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result);
    fr.onerror = () => resolve(null);
    fr.readAsDataURL(blob);
  });
}

/**
 * Cromo guardado do `userId`, já convertido para dataURL (a mesma forma que o
 * resto do Início usa). Devolve `{ chave, dataURL }` ou null — e null também
 * quando a chave guardada é de outra composição (mudou a foto, o fundo ou o
 * nome), porque aí os pixéis seriam outros.
 */
export async function lerCromo(userId) {
  if (!userId) return null;
  let bd;
  try {
    bd = await abrir();
    const { loja } = transacao(bd, 'readonly');
    const registo = await comoPromessa(loja.get(userId));
    if (!registo?.blob || !registo.chave) return null;
    if (!registo.em || Date.now() - registo.em > VALIDADE_MS) {
      limparCromos(userId).catch(() => {});
      return null;
    }
    const dataURL = await blobParaDataURL(registo.blob);
    return dataURL ? { chave: registo.chave, dataURL } : null;
  } catch {
    return null;
  } finally {
    bd?.close();
  }
}

/**
 * Guarda o cromo de `userId`. `chave` descreve a composição (avatar, fundo,
 * nome) — é ela que diz, na leitura, se o guardado ainda serve. Um registo por
 * utilizador: o anterior é substituído, nada se acumula.
 */
export async function gravarCromo(userId, chave, blob) {
  if (!userId || !chave || !blob) return;
  let bd;
  try {
    bd = await abrir();
    const { tx, loja } = transacao(bd, 'readwrite');
    loja.put({ id: userId, chave, blob, em: Date.now() });
    await new Promise((resolve, reject) => {
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } catch {
    /* sem cache — segue a vida */
  } finally {
    bd?.close();
  }
}

/**
 * Apaga o cromo de um utilizador, ou de todos se `userId` for omitido. O caso
 * "todos" é o do signOut: um celular partilhado nunca pode mostrar a figurinha
 * da conta anterior.
 */
export async function limparCromos(userId) {
  let bd;
  try {
    bd = await abrir();
    const { tx, loja } = transacao(bd, 'readwrite');
    if (userId) loja.delete(userId);
    else loja.clear();
    await new Promise((resolve, reject) => {
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } catch {
    /* nada a limpar */
  } finally {
    bd?.close();
  }
}
