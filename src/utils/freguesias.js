// Futty v2.0 — Rodada 29H (item 12): o campo "Bairro" do time. Puro (sem React, sem rede).
//
// Em Portugal o "bairro" é a freguesia: public/dados/freguesias.json (scripts/gerar-freguesias.js, CAOP + Wikidata das ilhas) traz
// [[concelho, distrito|ilha, [[freguesia, lat, lng], …]], …] e o campo sugere as freguesias do concelho da cidade que a pessoa
// escolheu. Rodada 29T (bloco B): no Brasil o bairro também é de lista (IBGE, utils/bairros.js) e a pessoa só escolhe o que a lista tem —
// sem texto livre, no Brasil nem em Portugal. A normalização é a MESMA de utils/cidades.js (e do motor): sem acento, sem maiúscula, espaços duplos fora.
import { normalizarCidade } from './cidades';

/** O texto de apoio do campo (dono, 2-out). */
export const TEXTO_APOIO_BAIRRO = 'Só o bairro e a cidade, nunca o endereço.';

/**
 * Qual concelho de Portugal é a cidade que a pessoa escolheu (ou que o time já tem)? Da lista: { nome, distrito } exatos
 * (`escolha.pais === 'PT'`, `uf` = distrito); do texto guardado ("Lisboa, Portugal"): só o nome. Qualquer outra coisa: null.
 */
export function concelhoDePortugal(textoDaCidade, escolha = null) {
  if (escolha?.pais === 'PT' && escolha.cidade) return { nome: escolha.cidade, distrito: escolha.uf || null };
  const m = /^(.+?),\s*Portugal\s*$/i.exec(String(textoDaCidade ?? ''));
  return m ? { nome: m[1].trim(), distrito: null } : null;
}

/** Prepara a busca: um mapa "concelho normalizado" → as listas de freguesias (pode haver duas "Calheta": Madeira e Açores). */
export function indexarFreguesias(lista) {
  const mapa = new Map();
  for (const [concelho, distrito, itens] of lista || []) {
    const chave = normalizarCidade(concelho);
    if (!mapa.has(chave)) mapa.set(chave, []);
    mapa.get(chave).push({ distrito, itens: itens.map((linha) => ({ linha, chave: normalizarCidade(linha[0]) })) });
  }
  return mapa;
}

/** Todas as freguesias do concelho, no formato do índice ({ linha: [freguesia, lat, lng], chave }[]); concelho sem lista (ou fora de Portugal): []. */
export function freguesiasDoConcelho(indice, concelho) {
  if (!indice || !concelho) return [];
  const grupos = (indice.get(normalizarCidade(concelho.nome)) || []).filter((g) => !concelho.distrito || normalizarCidade(g.distrito) === normalizarCidade(concelho.distrito));
  return grupos.flatMap((g) => g.itens);
}

/**
 * A busca do campo Bairro numa lista de itens ({ linha, chave }): sem digitar nada, os primeiros (a pessoa vê as opções ao tocar no campo);
 * com texto, os que começam com ele, depois os que têm alguma palavra que começa e depois os que o contêm — sem acento nem maiúscula.
 * Devolve as linhas [nome, lat, lng]. Serve às freguesias de Portugal e aos bairros do Brasil (utils/bairros.js).
 */
export function buscarNosItens(itens, consulta, max = 8) {
  const q = normalizarCidade(consulta);
  if (!q) return (itens || []).slice(0, max).map((x) => x.linha);
  const tres = [[], [], []];
  for (const item of itens || []) {
    const i = item.chave.indexOf(q);
    if (i < 0) continue;
    if (i === 0) tres[0].push(item);
    else if (item.chave[i - 1] === ' ') tres[1].push(item);
    else tres[2].push(item);
  }
  return tres.flat().slice(0, max).map((x) => x.linha);
}

/**
 * Sugestões de freguesia para o que a pessoa digitou, dentro do concelho (a busca de `buscarNosItens`). Devolve as linhas
 * [freguesia, lat, lng]. Concelho sem lista (ou fora de Portugal): [].
 */
export function buscarFreguesias(indice, concelho, consulta, max = 8) {
  return buscarNosItens(freguesiasDoConcelho(indice, concelho), consulta, max);
}

/** O que a escolha de uma freguesia manda ao motor: { bairro, bairro_origem: 'lista', bairro_lat, bairro_lng } (a coordenada da lista). */
export function escolhaDaFreguesia([nome, lat, lng]) {
  return { bairro: nome, bairro_origem: 'lista', bairro_lat: lat, bairro_lng: lng };
}

/** O aviso certo para a resposta `bairro` do motor ({ encontrado, nomeOficial, salvo? }), ou null se não houve bairro. */
export function avisoDoBairro(info) {
  if (!info) return null;
  if (info.salvo === false) return { tipo: 'aviso', texto: 'Não deu para guardar o bairro agora. Dá para pôr no painel do time.' };
  if (info.encontrado) return { tipo: 'ok', texto: `Encontramos: ${info.nomeOficial}` };
  return { tipo: 'aviso', texto: 'Não achamos esse bairro. Seu time fica no ponto da cidade.' };
}
