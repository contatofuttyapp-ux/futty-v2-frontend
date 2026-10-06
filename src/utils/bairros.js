// Futty v2.0 — o campo "Bairro" do time é de LISTA, como a cidade (o dono: "só aceita o que tiver lá").
// Puro (sem React, sem rede).
//
// Brasil: a lista oficial do IBGE (Censo 2022), um arquivo por estado em public/dados/bairros/<UF>.json
// (scripts/gerar-bairros.mjs): [[codigoIbge, municipio, [[bairro, lat, lng], …]], …]. O IBGE só tem
// bairros em 895 dos 5.571 municípios; nos outros entram os distritos e subdistritos oficiais do mesmo
// IBGE quando o município tem 2 ou mais (o DF, São Paulo capital, Goiânia, Palmas…; 2.590 municípios no
// total). Cidade sem nada na lista (Rio Branco, São Luís: um distrito só) = o campo Bairro NÃO aparece
// (ele é opcional) e o time mostra só a cidade.
// Portugal: as freguesias (utils/freguesias.js).
// A lista de cidades (public/dados/cidades.json) não traz o código do IBGE, então o campo liga o bairro à
// cidade escolhida por NOME + UF (o script grava o município com a mesma grafia do cidades.json).
// Escolher da lista manda a coordenada junto.
import { normalizarCidade } from './cidades';
import { buscarNosItens, concelhoDePortugal } from './freguesias';

export { escolhaDaFreguesia as escolhaDoBairro } from './freguesias';

/** Quantas sugestões o campo mostra (a lista rola dentro do campo; Belo Horizonte tem 476 bairros). */
export const MAX_SUGESTOES_BAIRRO = 30;

const UFS = new Set(['AC', 'AL', 'AM', 'AP', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MG', 'MS', 'MT', 'PA', 'PB', 'PE', 'PI', 'PR', 'RJ', 'RN', 'RO', 'RR', 'RS', 'SC', 'SE', 'SP', 'TO']);

/**
 * De onde vêm os bairros desta cidade? A cidade que a pessoa escolheu na lista, ou o texto já guardado no time ("Brasília, DF",
 * "Lisboa, Portugal"). Devolve { pais: 'BR', nome, uf } | { pais: 'PT', nome, distrito } | null (cidade digitada à mão, fora do Brasil
 * e de Portugal, ou nenhuma: sem lista, sem campo).
 */
export function alvoDeBairros(textoDaCidade, escolha = null) {
  if (escolha?.pais === 'BR' && escolha.cidade && UFS.has(escolha.uf)) return { pais: 'BR', nome: escolha.cidade, uf: escolha.uf };
  const concelho = concelhoDePortugal(textoDaCidade, escolha);
  if (concelho) return { pais: 'PT', nome: concelho.nome, distrito: concelho.distrito };
  const m = /^(.+?),\s*([A-Z]{2})\s*$/.exec(String(textoDaCidade ?? ''));
  if (m && UFS.has(m[2])) return { pais: 'BR', nome: m[1].trim(), uf: m[2] };
  return null;
}

/** Prepara a busca de um estado: um mapa "município normalizado" → os bairros dele ({ linha: [bairro, lat, lng], chave }[]). */
export function indexarBairrosDoEstado(arquivo) {
  const mapa = new Map();
  for (const [, municipio, bairros] of arquivo || []) {
    mapa.set(normalizarCidade(municipio), bairros.map((linha) => ({ linha, chave: normalizarCidade(linha[0]) })));
  }
  return mapa;
}

/** Os bairros do município num estado já indexado; município sem bairros na lista: []. */
export function bairrosDoMunicipio(indice, nomeDoMunicipio) {
  return indice?.get(normalizarCidade(nomeDoMunicipio)) || [];
}

/** Sugestões de bairro para o que a pessoa digitou (a busca de utils/freguesias.js: começa com → palavra começa → contém). */
export function buscarBairros(itens, consulta, max = MAX_SUGESTOES_BAIRRO) {
  return buscarNosItens(itens, consulta, max);
}

/** A linha da lista que o texto escreve por inteiro (sem acento nem maiúscula), ou null: é o que decide se o texto "vale" como bairro. */
export function linhaDaLista(itens, texto) {
  const q = normalizarCidade(texto);
  if (!q) return null;
  return (itens || []).find((x) => x.chave === q)?.linha || null;
}
