#!/usr/bin/env node
// Futty v2.0 — Rodada 29H (item 12): gera public/dados/freguesias.json, a lista de freguesias de Portugal do campo "Bairro"
// (CampoBairro): em Portugal o "bairro" do time é a freguesia, e a pessoa escolhe numa lista em vez de digitar e torcer.
//
// Fonte, Portugal continental: a CAOP — Carta Administrativa Oficial de Portugal — da Direção-Geral do Território (DGT), a
// coleção "freguesias" da OGC API oficial: https://ogcapi.dgterritorio.gov.pt/collections/freguesias (CAOP2025 quando o script
// rodou: 3.049 freguesias; os 3.092 que o dono citou eram a contagem da CAOP anterior, de antes de várias uniões de freguesias
// serem desfeitas). Cada freguesia vem com o polígono; aqui se guarda só o CENTRO dela (centro de área do maior polígono), com 2
// casas (~1 km) — a mesma precisão que o motor já guarda para cidades. O polígono em si nunca sai deste script.
// Fonte, Açores e Madeira: a API da DGT só tem o Continente; as ilhas vêm do Wikidata (dados CC0), pela consulta SPARQL abaixo:
// freguesias de Portugal sem data de extinção, a oeste de 15° W e ao norte de 30° N (só as ilhas portuguesas ficam aí; Cabo Verde
// também tem "freguesias" no Wikidata e fica abaixo), agrupadas pelo município. O nome do município sai como está no cidades.json
// ("Município do Corvo"), que é o que o app procura.
//
// Formato (o mínimo): [[concelho, distrito|ilha, [[freguesia, lat, lng], …]], …], ordenado por concelho e, dentro dele, por
// freguesia. O nome da freguesia é a designação simplificada da CAOP (a "União das freguesias de A e B" vira "A e B": é como
// as pessoas dizem). Servido do SITE (urlAsset → VITE_ASSETS_URL no app nativo), buscado só quando a pessoa escolhe uma
// cidade de Portugal e toca no campo Bairro: NUNCA no bundle.
//
// Fica num arquivo À PARTE do cidades.json de propósito: a meta do dono para a lista de cidades é ≤ 80 KB comprimido e ela já
// está em ~66 KB; as freguesias têm o seu próprio teto (abaixo), e quem escolhe uma cidade do Brasil nunca as baixa.
//
// Uso (a partir de FUTTY-V2/frontend; precisa de internet):  node scripts/gerar-freguesias.js
import { gzipSync } from 'node:zlib';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const SAIDA = path.join(RAIZ, 'public', 'dados', 'freguesias.json');
const CIDADES = path.join(RAIZ, 'public', 'dados', 'cidades.json');
const TETO_GZIP = 60 * 1024;
const FONTE = 'https://ogcapi.dgterritorio.gov.pt/collections/freguesias/items';
const UA = 'Futty/1.0 (https://futtyapp.com.br; contato@futtyapp.com)';
const PAGINA = 100;

const arredonda = (n) => Math.round(n * 100) / 100;
const normalizar = (t) => String(t ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();

/** Centro de área (shoelace) de um anel [[lng, lat], …]; área com sinal. Em graus: a ~1 km o erro de plano é desprezível. */
function centroDoAnel(anel) {
  let a = 0; let cx = 0; let cy = 0;
  for (let i = 0; i < anel.length - 1; i += 1) {
    const [x0, y0] = anel[i];
    const [x1, y1] = anel[i + 1];
    const f = x0 * y1 - x1 * y0;
    a += f; cx += (x0 + x1) * f; cy += (y0 + y1) * f;
  }
  if (a === 0) { const [x, y] = anel[0]; return { area: 0, lng: x, lat: y }; }
  return { area: Math.abs(a / 2), lng: cx / (3 * a), lat: cy / (3 * a) };
}

/** O centro da freguesia: o centro de área do MAIOR polígono (ilhas e exclaves pequenos não puxam o ponto). */
function centroDaGeometria(g) {
  const poligonos = g.type === 'Polygon' ? [g.coordinates] : g.coordinates;
  let melhor = null;
  for (const p of poligonos) {
    const c = centroDoAnel(p[0]);
    if (!melhor || c.area > melhor.area) melhor = c;
  }
  return { lat: arredonda(melhor.lat), lng: arredonda(melhor.lng) };
}

async function pagina(offset) {
  const r = await fetch(`${FONTE}?f=json&limit=${PAGINA}&offset=${offset}`, { headers: { 'User-Agent': UA } });
  if (!r.ok) throw new Error(`${FONTE} offset ${offset} → HTTP ${r.status}`);
  return r.json();
}

// ─── Açores e Madeira (Wikidata) ──────────────────────────────────────────────────────────────────────────────────
const SPARQL_ILHAS = `SELECT ?f ?fLabel ?m ?mLabel ?lat ?lng WHERE {
  ?f wdt:P31 wd:Q1131296 .
  FILTER NOT EXISTS { ?f wdt:P576 ?fim }
  ?f p:P625/psv:P625 [ wikibase:geoLongitude ?lng ; wikibase:geoLatitude ?lat ] .
  FILTER(?lng < -15 && ?lat > 30)
  OPTIONAL { ?f wdt:P131 ?m . }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "pt,en". }
}`;

const NOME_DO_CONCELHO_NA_LISTA = (() => {
  const semPrefixo = (n) => normalizar(String(n).replace(/^Município d[aeo]s? /, ''));
  return new Map(JSON.parse(readFileSync(CIDADES, 'utf8')).filter((c) => c[2] === 'PT').map((c) => [semPrefixo(c[0]), c[0]]));
})();

async function freguesiasDasIlhas() {
  const r = await fetch('https://query.wikidata.org/sparql?query=' + encodeURIComponent(SPARQL_ILHAS), { headers: { 'User-Agent': UA, Accept: 'application/sparql-results+json' } });
  if (!r.ok) throw new Error(`Wikidata (ilhas) → HTTP ${r.status}`);
  const vistas = new Set();
  const saida = [];
  for (const b of (await r.json()).results.bindings) {
    const lat = Number(b.lat.value);
    const lng = Number(b.lng.value);
    // Município sem rótulo (só o Q…) não dá para escrever na lista; "Município do Corvo" → "Corvo".
    const semPrefixo = (b.mLabel?.value || '').replace(/^Município d[aeo]s? /, '');
    if (!semPrefixo || /^Q\d+$/.test(semPrefixo)) continue;
    const concelho = NOME_DO_CONCELHO_NA_LISTA.get(normalizar(semPrefixo)) || semPrefixo;
    const distrito = lng < -20 ? 'Açores' : 'Madeira';
    const chave = `${b.m?.value}|${normalizar(b.fLabel.value)}`;
    if (vistas.has(chave)) continue; // a mesma freguesia com duas coordenadas no Wikidata
    vistas.add(chave);
    saida.push({ concelho, distrito, freguesia: b.fLabel.value, lat: arredonda(lat), lng: arredonda(lng) });
  }
  return saida;
}

const linhas = [];
let total = Infinity;
for (let offset = 0; offset < total; offset += PAGINA) {
  const j = await pagina(offset);
  total = j.numberMatched;
  for (const f of j.features) {
    const p = f.properties;
    const { lat, lng } = centroDaGeometria(f.geometry);
    linhas.push({ concelho: p.municipio, distrito: p.distrito_ilha, freguesia: p.designacao_simplificada || p.freguesia, lat, lng });
  }
  process.stdout.write(`\r[freguesias] ${Math.min(offset + PAGINA, total)}/${total}`);
}
process.stdout.write('\n');
const continente = linhas.length;
linhas.push(...await freguesiasDasIlhas());
console.log(`[freguesias] continente (CAOP): ${continente} · ilhas (Wikidata): ${linhas.length - continente}`);

const porConcelho = new Map();
for (const l of linhas) {
  const chave = `${l.concelho}|${l.distrito}`;
  if (!porConcelho.has(chave)) porConcelho.set(chave, { concelho: l.concelho, distrito: l.distrito, itens: [] });
  porConcelho.get(chave).itens.push([l.freguesia, l.lat, l.lng]);
}
const saida = [...porConcelho.values()]
  .sort((a, b) => a.concelho.localeCompare(b.concelho, 'pt') || a.distrito.localeCompare(b.distrito, 'pt'))
  .map((c) => [c.concelho, c.distrito, c.itens.sort((a, b) => a[0].localeCompare(b[0], 'pt'))]);

// ─── conferências ─────────────────────────────────────────────────────────────────────────────────────────────────
const erros = [];
if (continente !== total) erros.push(`li ${continente} freguesias do continente, a fonte diz ${total}`);
for (const l of linhas) {
  if (!l.freguesia || !l.concelho || !Number.isFinite(l.lat) || !Number.isFinite(l.lng)) erros.push(`linha inválida: ${JSON.stringify(l)}`);
  else if (l.lat < 32 || l.lat > 43 || l.lng < -32 || l.lng > -6) erros.push(`fora de Portugal: ${l.freguesia}, ${l.concelho} ${l.lat},${l.lng}`);
}
// Todo concelho do cidades.json (os 308 de Portugal) precisa ter freguesias aqui — é por ele que a lista é achada.
const concelhosAqui = new Set(saida.map((c) => normalizar(c[0])));
const faltam = [...NOME_DO_CONCELHO_NA_LISTA.values()].filter((nome) => !concelhosAqui.has(normalizar(nome)));
if (faltam.length) erros.push(`concelhos do cidades.json sem freguesias aqui (${faltam.length}): ${faltam.slice(0, 20).join(', ')}`);
if (erros.length) {
  console.error(`[freguesias] ${erros.length} problema(s):\n  ${erros.slice(0, 20).join('\n  ')}`);
  process.exit(1);
}

const json = JSON.stringify(saida);
const gzip = gzipSync(json, { level: 9 }).length;
console.log(`[freguesias] ${linhas.length} freguesias em ${saida.length} concelhos (${new Set(linhas.map((l) => l.distrito)).size} distritos/ilhas)`);
console.log(`[freguesias] ${(json.length / 1024).toFixed(1)} KB sem comprimir · ${(gzip / 1024).toFixed(1)} KB com gzip (teto ${TETO_GZIP / 1024} KB)`);
if (gzip > TETO_GZIP) {
  console.error('[freguesias] passou do teto — não gravei o arquivo.');
  process.exit(1);
}
mkdirSync(path.dirname(SAIDA), { recursive: true });
writeFileSync(SAIDA, json);
console.log(`[freguesias] gravado ${path.relative(RAIZ, SAIDA)}`);
