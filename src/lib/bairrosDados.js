// Futty v2.0 — busca a lista de bairros da cidade que a pessoa escolheu, só então, e nunca no bundle
// nem no pacote nativo (a pasta dados/ sai em scripts/preparar-nativo.js; no app nativo vem de
// VITE_ASSETS_URL, como cidades.json e freguesias.json).
//   Brasil    um arquivo por estado (public/dados/bairros/<UF>.json, de 0,5 a 35 KB comprimidos),
//             buscado quando a cidade é escolhida: é preciso saber se ela TEM bairros na lista antes
//             de mostrar o campo. Cada estado é buscado uma vez só.
//   Portugal  o freguesias.json (lib/freguesiasDados.js).
// Falhou a rede? A promessa é descartada e a próxima escolha de cidade tenta de novo; sem a lista o
// campo (opcional) simplesmente não aparece.
//
// A URL é montada AQUI, com a mesma regra do urlAsset (web: mesma origem; nativo: VITE_ASSETS_URL), e
// não chamando o urlAsset de utils/avatar.js — o mesmo motivo de lib/cidadesDados.js (importar aquele
// módulo daqui o separaria num chunk próprio dentro do arranque).
import { Capacitor } from '@capacitor/core';
import { bairrosDoMunicipio, indexarBairrosDoEstado } from '../utils/bairros';
import { freguesiasDoConcelho } from '../utils/freguesias';
import { carregarFreguesias } from './freguesiasDados';

const estados = new Map();

function urlDoEstado(uf) {
  const base = Capacitor.isNativePlatform() ? String(import.meta.env.VITE_ASSETS_URL || '').trim().replace(/\/+$/, '') : '';
  return `${base}/dados/bairros/${uf}.json`;
}

function carregarEstado(uf) {
  if (!estados.has(uf)) {
    estados.set(uf, fetch(urlDoEstado(uf))
      .then((r) => {
        if (!r.ok) throw new Error(`bairros/${uf}.json: HTTP ${r.status}`);
        return r.json();
      })
      .then(indexarBairrosDoEstado)
      .catch((e) => {
        estados.delete(uf);
        throw e;
      }));
  }
  return estados.get(uf);
}

/**
 * @param {{ pais: 'BR', nome: string, uf: string } | { pais: 'PT', nome: string, distrito: string|null }} alvo o que `alvoDeBairros` (utils/bairros.js) devolveu
 * @returns {Promise<{ linha: [string, number, number], chave: string }[]>} os bairros (ou freguesias) da cidade; [] se a lista não tem
 */
export async function carregarBairrosDaCidade(alvo) {
  if (alvo.pais === 'PT') return freguesiasDoConcelho(await carregarFreguesias(), { nome: alvo.nome, distrito: alvo.distrito });
  return bairrosDoMunicipio(await carregarEstado(alvo.uf), alvo.nome);
}
