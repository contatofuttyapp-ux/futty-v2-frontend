// Futty v2.0 — busca a lista de freguesias (public/dados/freguesias.json) UMA vez, só quando a pessoa escolhe
// uma cidade de Portugal e toca no campo "Bairro". Mesma regra do lib/cidadesDados.js: servida do SITE (no app
// nativo, de VITE_ASSETS_URL), nunca no bundle, e a URL montada aqui (importar utils/avatar.js daqui separaria
// aquele módulo num chunk próprio dentro do arranque). Falhou a rede? A promessa é descartada e o próximo foco
// tenta de novo; o campo continua aceitando texto livre.
import { Capacitor } from '@capacitor/core';
import { indexarFreguesias } from '../utils/freguesias';

let promessa = null;

function urlDaLista() {
  const base = Capacitor.isNativePlatform() ? String(import.meta.env.VITE_ASSETS_URL || '').trim().replace(/\/+$/, '') : '';
  return `${base}/dados/freguesias.json`;
}

/** @returns {Promise<Map<string, { distrito: string, itens: { linha: [string, number, number], chave: string }[] }[]>>} o índice de busca */
export function carregarFreguesias() {
  if (!promessa) {
    promessa = fetch(urlDaLista())
      .then((r) => {
        if (!r.ok) throw new Error(`freguesias.json: HTTP ${r.status}`);
        return r.json();
      })
      .then(indexarFreguesias)
      .catch((e) => {
        promessa = null;
        throw e;
      });
  }
  return promessa;
}
