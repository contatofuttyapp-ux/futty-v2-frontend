// Futty v2.0 — Rodada 29B (D): a lista de cidades do campo "Cidade" (CampoCidade). Puro (sem React, sem rede).
//
// A lista é public/dados/cidades.json (scripts/gerar-cidades.js): um vetor de [nome, uf|distrito, país, lat, lng] com
// os 5.571 municípios do Brasil e os 308 concelhos de Portugal. O app a busca SÓ quando o campo ganha foco
// (lib/cidadesDados.js) e nunca a leva no bundle. A normalização é a MESMA do motor (backend/utils/cidade.js) — o
// Explorar casa por texto comparando as duas pontas, então as duas têm de concordar letra por letra.

const MINIMO_DE_LETRAS = 2;

/** "  SÃO  paulo " → "sao paulo": sem acento, sem maiúscula, espaços duplos e das pontas fora. */
export function normalizarCidade(texto) {
  return String(texto ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/** Como a sugestão se escreve: "Belo Horizonte, MG" no Brasil, "Lisboa, Portugal" em Portugal. */
export function rotuloDaCidade([nome, uf, pais]) {
  if (pais === 'BR' && uf) return `${nome}, ${uf}`;
  if (pais === 'PT') return `${nome}, Portugal`;
  return nome;
}

/** O que a escolha manda ao motor: { cidade, uf, pais, lat, lng, origem: 'lista' } (uf = distrito em Portugal). */
export function escolhaDaLinha([cidade, uf, pais, lat, lng]) {
  return { cidade, uf, pais, lat, lng, origem: 'lista' };
}

/** Prepara a busca: normaliza cada nome UMA vez (são ~5.900; a cada tecla seria desperdício). */
export function indexarCidades(lista) {
  return (lista || []).map((linha) => ({ linha, chave: normalizarCidade(linha[0]) }));
}

/**
 * Sugestões para o que a pessoa digitou: a partir de 2 letras, sem acento nem maiúscula. Ordem: começa com o texto →
 * alguma palavra começa com o texto → contém o texto; dentro de cada grupo, o nome mais curto primeiro e depois a ordem
 * alfabética. Devolve as linhas da lista (não os objetos do índice).
 */
export function buscarCidades(indice, consulta, max = 8) {
  const q = normalizarCidade(consulta);
  if (q.length < MINIMO_DE_LETRAS) return [];
  const grupos = [[], [], []];
  for (const item of indice || []) {
    const i = item.chave.indexOf(q);
    if (i < 0) continue;
    if (i === 0) grupos[0].push(item);
    else if (item.chave[i - 1] === ' ') grupos[1].push(item);
    else grupos[2].push(item);
  }
  const porTamanho = (a, b) => a.chave.length - b.chave.length || a.chave.localeCompare(b.chave) || a.linha[1].localeCompare(b.linha[1]);
  return grupos.flatMap((g) => g.sort(porTamanho)).slice(0, max).map((x) => x.linha);
}

/** O time aparece para quem busca esta cidade por TEXTO? Só sem coordenada e com a cidade normalizada IGUAL à busca. */
export function timeCasaPorCidade(time, busca) {
  const procurada = normalizarCidade(busca);
  if (!procurada) return false;
  if (time?.geo_lat != null && time?.geo_lng != null) return false;
  return !!time?.cidade_normalizada && time.cidade_normalizada === procurada;
}

/** "Encontramos: <nome oficial>" — o aviso quando a cidade foi achada (na lista ou no Nominatim). */
export function avisoAchou(nomeOficial) {
  return `Encontramos: ${nomeOficial}`;
}

/** O aviso quando nada achou a cidade: o time fica só com o texto. */
export function avisoNaoAchou(texto) {
  return `Não achamos essa cidade. Seu time só aparece no Explorar para quem escrever exatamente '${String(texto ?? '').trim()}'.`;
}

/** O aviso certo para a resposta `geo` do motor ({ encontrada, nomeOficial }), ou null se não houve cidade. */
export function avisoDaCidade(geo, textoDigitado) {
  if (!geo) return null;
  return geo.encontrada ? { tipo: 'ok', texto: avisoAchou(geo.nomeOficial) } : { tipo: 'aviso', texto: avisoNaoAchou(textoDigitado) };
}
