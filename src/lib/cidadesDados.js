// Futty v2.0 — busca a lista de cidades (public/dados/cidades.json) UMA vez, só quando o campo
// "Cidade" ganha foco. Nunca no bundle: servida do site (no app nativo, de VITE_ASSETS_URL — o pacote
// leva só a casca, ver scripts/preparar-nativo.js) e guardada pelo navegador (ver public/_headers).
// Falhou a rede? A promessa é descartada e o próximo foco tenta de novo; o campo continua aceitando
// texto livre.
//
// A URL é montada AQUI, com a mesma regra do urlAsset (web: mesma origem; nativo: VITE_ASSETS_URL), e
// não chamando o urlAsset de utils/avatar.js: importar aquele módulo daqui faz o bundler separá-lo
// num chunk próprio DENTRO do arranque (+320 B medidos, e o arranque tem teto de 320 KiB). Se a regra
// do urlAsset mudar, mude aqui.
import { Capacitor } from '@capacitor/core';
import { indexarCidades } from '../utils/cidades';

let promessa = null;

function urlDaLista() {
  const base = Capacitor.isNativePlatform() ? String(import.meta.env.VITE_ASSETS_URL || '').trim().replace(/\/+$/, '') : '';
  return `${base}/dados/cidades.json`;
}

/** @returns {Promise<{ linha: [string, string, string, number, number], chave: string }[]>} o índice de busca */
export function carregarCidades() {
  if (!promessa) {
    promessa = fetch(urlDaLista())
      .then((r) => {
        if (!r.ok) throw new Error(`cidades.json: HTTP ${r.status}`);
        return r.json();
      })
      .then(indexarCidades)
      .catch((e) => {
        promessa = null;
        throw e;
      });
  }
  return promessa;
}
