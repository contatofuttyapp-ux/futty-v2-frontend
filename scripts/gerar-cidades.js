#!/usr/bin/env node
// Futty v2.0 — Rodada 29B (D): gera public/dados/cidades.json, a lista de cidades do campo "Cidade" (CampoCidade).
//
//   Brasil    5.571 municípios do IBGE (5.570 em 2022 + Boa Esperança do Norte/MT, instalado em 2025), com UF e coordenadas — CSV do repositório MIT "kelvins/municipios-brasileiros"
//             (https://github.com/kelvins/municipios-brasileiros, licença MIT, © 2016 Kelvin S. do Prado).
//   Portugal  308 concelhos, com distrito (ou região autónoma) e coordenadas — Wikidata (dados CC0), pela consulta
//             SPARQL abaixo: instâncias de "município de Portugal" (Q13217644) sem data de extinção.
//
// Formato (o mínimo): um vetor de [nome, uf|distrito, país, lat, lng] — país "BR" ou "PT", lat/lng com 2 casas (~1 km, a
// mesma precisão que o motor já guardava). Ordenado por nome (BR e PT juntos). Sem espaço no JSON.
//
// Servido do SITE (urlAsset → VITE_ASSETS_URL no app nativo), buscado só quando o campo ganha foco: NUNCA no bundle.
// Meta do dono: ≤ 80 KB comprimido (a Cloudflare serve com gzip/brotli); o script mede e RECUSA passar disso.
//
// Uso (a partir de FUTTY-V2/frontend; precisa de internet):  node scripts/gerar-cidades.js
import { gzipSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const SAIDA = path.join(RAIZ, 'public', 'dados', 'cidades.json');
const TETO_GZIP = 80 * 1024;
// O dono falou em 5.570 (IBGE 2022); a base do IBGE já traz 5.571 desde 2025 (Boa Esperança do Norte/MT foi instalado).
const ESPERADO = { BR: 5571, PT: 308 };

const FONTE_MUNICIPIOS = 'https://raw.githubusercontent.com/kelvins/municipios-brasileiros/main/csv/municipios.csv';
const FONTE_ESTADOS = 'https://raw.githubusercontent.com/kelvins/municipios-brasileiros/main/csv/estados.csv';
const UA = 'Futty/1.0 (https://futtyapp.com.br; contato@futtyapp.com)';

// Os 18 distritos do continente e as duas regiões autónomas. O Wikidata devolve também províncias, NUTS e
// comunidades intermunicipais no mesmo campo (P131); só estes vinte nomes valem como "distrito".
const DISTRITOS = new Set(['Aveiro', 'Beja', 'Braga', 'Bragança', 'Castelo Branco', 'Coimbra', 'Évora', 'Faro', 'Guarda', 'Leiria', 'Lisboa', 'Portalegre', 'Porto', 'Santarém', 'Setúbal', 'Viana do Castelo', 'Vila Real', 'Viseu', 'Açores', 'Madeira']);
// "Lafões" é uma antiga subdivisão histórica que o Wikidata ainda classifica como município: não é um dos 308.
const NAO_SAO_CONCELHOS = new Set(['Lafões']);

const SPARQL = `SELECT ?item ?itemLabel ?coord ?distLabel WHERE {
  ?item wdt:P31 wd:Q13217644 .
  ?item wdt:P625 ?coord .
  FILTER NOT EXISTS { ?item wdt:P576 ?fim }
  OPTIONAL { ?item wdt:P131 ?dist . }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "pt,en". }
}`;

const arredonda = (n) => Math.round(n * 100) / 100;

async function baixar(url, opcoes = {}) {
  const r = await fetch(url, { ...opcoes, headers: { 'User-Agent': UA, ...(opcoes.headers || {}) } });
  if (!r.ok) throw new Error(`${url} → HTTP ${r.status}`);
  return r;
}

/** CSV simples (estes arquivos não têm aspas nem vírgula dentro de campo); tira o BOM. */
function lerCsv(texto) {
  const [cab, ...linhas] = texto.replace(/^\uFEFF/, '').trim().split(/\r?\n/);
  const cols = cab.split(',');
  return linhas.map((l) => Object.fromEntries(l.split(',').map((v, i) => [cols[i], v])));
}

async function municipiosDoBrasil() {
  const estados = lerCsv(await (await baixar(FONTE_ESTADOS)).text());
  const uf = Object.fromEntries(estados.map((e) => [e.codigo_uf, e.uf]));
  return lerCsv(await (await baixar(FONTE_MUNICIPIOS)).text()).map((m) => {
    const sigla = uf[m.codigo_uf];
    if (!sigla) throw new Error(`município sem UF: ${m.nome} (codigo_uf ${m.codigo_uf})`);
    return [m.nome, sigla, 'BR', arredonda(Number(m.latitude)), arredonda(Number(m.longitude))];
  });
}

async function concelhosDePortugal() {
  const r = await baixar(`https://query.wikidata.org/sparql?query=${encodeURIComponent(SPARQL)}`, { headers: { Accept: 'application/sparql-results+json' } });
  const porItem = new Map();
  for (const linha of (await r.json()).results.bindings) {
    const id = linha.item.value;
    const atual = porItem.get(id) || { nome: linha.itemLabel.value, coord: linha.coord.value, distritos: new Set() };
    if (linha.distLabel && DISTRITOS.has(linha.distLabel.value)) atual.distritos.add(linha.distLabel.value);
    porItem.set(id, atual);
  }
  const saida = [];
  for (const c of porItem.values()) {
    if (NAO_SAO_CONCELHOS.has(c.nome)) continue;
    const m = /Point\(([-\d.]+) ([-\d.]+)\)/.exec(c.coord);
    if (!m) throw new Error(`coordenada ilegível: ${c.nome} ${c.coord}`);
    const lng = Number(m[1]);
    const lat = Number(m[2]);
    let distrito = [...c.distritos][0];
    // Uma "Lagoa" dos Açores vem sem distrito casado (o Wikidata a põe na ilha); pela longitude se resolve.
    if (!distrito) distrito = lng < -20 ? 'Açores' : lng < -15 && lat < 34 ? 'Madeira' : null;
    if (!distrito) throw new Error(`concelho sem distrito: ${c.nome}`);
    saida.push([c.nome, distrito, 'PT', arredonda(lat), arredonda(lng)]);
  }
  return saida;
}

const contar = (lista, pais) => lista.filter((x) => x[2] === pais).length;

const [br, pt] = await Promise.all([municipiosDoBrasil(), concelhosDePortugal()]);
const tudo = [...br, ...pt].sort((a, b) => a[0].localeCompare(b[0], 'pt') || a[2].localeCompare(b[2]) || a[1].localeCompare(b[1], 'pt'));

const erros = [];
if (contar(tudo, 'BR') !== ESPERADO.BR) erros.push(`Brasil: ${contar(tudo, 'BR')} municípios, esperava ${ESPERADO.BR}`);
if (contar(tudo, 'PT') !== ESPERADO.PT) erros.push(`Portugal: ${contar(tudo, 'PT')} concelhos, esperava ${ESPERADO.PT}`);
for (const [nome, uf, pais, lat, lng] of tudo) {
  if (!nome || !uf || !Number.isFinite(lat) || !Number.isFinite(lng)) erros.push(`linha inválida: ${JSON.stringify([nome, uf, pais, lat, lng])}`);
  else if (pais === 'BR' && (lat < -34 || lat > 6 || lng < -74 || lng > -28)) erros.push(`fora do Brasil: ${nome}/${uf} ${lat},${lng}`);
  else if (pais === 'PT' && (lat < 32 || lat > 43 || lng < -32 || lng > -6)) erros.push(`fora de Portugal: ${nome} ${lat},${lng}`);
}
if (erros.length) {
  console.error(`[cidades] ${erros.length} problema(s):\n  ${erros.slice(0, 15).join('\n  ')}`);
  process.exit(1);
}

const json = JSON.stringify(tudo);
const gzip = gzipSync(json, { level: 9 }).length;
console.log(`[cidades] ${contar(tudo, 'BR')} municípios do Brasil + ${contar(tudo, 'PT')} concelhos de Portugal = ${tudo.length}`);
console.log(`[cidades] ${(json.length / 1024).toFixed(1)} KB sem comprimir · ${(gzip / 1024).toFixed(1)} KB com gzip (teto ${TETO_GZIP / 1024} KB)`);
if (gzip > TETO_GZIP) {
  console.error('[cidades] passou do teto de 80 KB comprimido — não gravei o arquivo.');
  process.exit(1);
}
mkdirSync(path.dirname(SAIDA), { recursive: true });
writeFileSync(SAIDA, json);
console.log(`[cidades] gravado em ${path.relative(RAIZ, SAIDA)}`);
