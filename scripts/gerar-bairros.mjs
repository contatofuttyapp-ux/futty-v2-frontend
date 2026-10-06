#!/usr/bin/env node
// Futty v2.0 — Rodada 29T (bloco B, achado 157): gera public/dados/bairros/<UF>.json, a lista de bairros do Brasil do campo "Bairro"
// (CampoBairro). O dono decidiu (4-out): o bairro é de LISTA, como a cidade — no Brasil, a lista oficial do IBGE (Censo 2022); em Portugal,
// as freguesias (scripts/gerar-freguesias.js). Quem escreve à mão não existe mais.
//
// Fonte principal: a malha de BAIRROS do Censo Demográfico 2022 do IBGE (shapefile, 17.576 bairros em 895 municípios):
//   https://ftp.ibge.gov.br/Censos/Censo_Demografico_2022/Agregados_por_Setores_Censitarios/malha_com_atributos/bairros/shp/BR/BR_bairros_CD2022.zip
// De cada bairro guarda-se o NOME, o MUNICÍPIO (código IBGE) e o PONTO CENTRAL (centro de área do maior polígono, arredondado em 2 casas
// ≈ 1 km — a mesma precisão da cidade). O polígono em si nunca sai deste script.
//
// O IBGE só delimita bairros onde o município os tem em lei: 895 dos 5.571. Ficam de fora, entre outros, São Paulo (capital), Goiânia, São Luís,
// Palmas, Rio Branco e o Distrito Federal. Município sem bairros na lista = o campo Bairro não aparece (decisão do dono).
//
// RODADA 29T-C (decisão da Freaky, 4-out): onde o Censo não tem bairros entram os DISTRITOS e SUBDISTRITOS oficiais do mesmo IBGE — quando o
// município tem 2 ou mais. É o que já se fazia com o DF (Brasília é uma cidade só, dividida em 33 Regiões Administrativas — Guará, Núcleo
// Bandeirante, Candangolândia… —, que o IBGE traz como subdistritos) e é o que cobre São Paulo capital (os 96 distritos: Pinheiros, Mooca, Butantã…).
// Fonte: os arquivos de subdistritos do Censo 2022, um por estado (<UF>_subdistritos_CD2022.zip). Cada linha é um distrito OU um subdistrito dele:
// o distrito que o IBGE subdivide aparece só pelos subdistritos (NM_SUBDIST), o que não subdivide, pelo próprio nome (NM_DIST). Os 10.699 distritos
// do país estão lá (conferido contra BR_distritos_CD2022.zip, 227 MB). Município com um distrito só (Rio Branco, São Luís…) continua sem lista.
// Uma correção: o DISTRITO-SEDE (o que tem o nome do município) usa o ponto da sede do município (cidades.json), não o centro da área dele —
// a área do distrito-sede abrange a zona rural e o centro dela pode cair a 90 km da cidade. (O Censo não tem "Asa Norte": ela é parte do "Plano Piloto".)
//
// Os nomes dos municípios saem da MESMA lista do campo Cidade (public/dados/cidades.json, via o código IBGE do CSV kelvins/municipios-brasileiros,
// MIT): o campo liga o bairro à cidade escolhida por nome + UF, então a grafia tem de ser a mesma ("Ererê", "Lauro Muller").
//
// Formato (o mínimo), um arquivo por estado: [[codigoIbge, municipio, [[bairro, lat, lng], …]], …], ordenado por município e, dentro dele, por
// bairro. UF sem nenhum bairro (Tocantins) grava []. Servido do SITE (VITE_ASSETS_URL no app nativo), buscado só quando a pessoa escolhe a
// cidade: NUNCA no bundle nem no pacote nativo (a pasta dados/ sai em scripts/preparar-nativo.js). Cada UF tem o seu teto comprimido (abaixo).
//
// Uso (a partir de FUTTY-V2/frontend; precisa de internet):  node scripts/gerar-bairros.mjs
//   --zip <arquivo>              usa um BR_bairros_CD2022.zip já baixado (sem internet)
//   --subdistritos <pasta>       idem para os <UF>_subdistritos_CD2022.zip (uma pasta com os 27 arquivos)
import { gzipSync, inflateRawSync } from 'node:zlib';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const SAIDA = path.join(RAIZ, 'public', 'dados', 'bairros');
const CIDADES = path.join(RAIZ, 'public', 'dados', 'cidades.json');
const TETO_GZIP_POR_UF = 60 * 1024;
const BASE_IBGE = 'https://ftp.ibge.gov.br/Censos/Censo_Demografico_2022/Agregados_por_Setores_Censitarios/malha_com_atributos';
const FONTE_BAIRROS = `${BASE_IBGE}/bairros/shp/BR/BR_bairros_CD2022.zip`;
const fonteSubdistritos = (uf) => `${BASE_IBGE}/subdistritos/shp/UF/${uf}/${uf}_subdistritos_CD2022.zip`;
const FONTE_MUNICIPIOS = 'https://raw.githubusercontent.com/kelvins/municipios-brasileiros/main/csv/municipios.csv';
const UA = 'Futty/1.0 (https://futtyapp.com.br; contato@futtyapp.com)';
const RAIO_DO_BAIRRO_KM = 60; // o do motor (utils/cidade.js): ponto de bairro mais longe que isto da cidade o motor não aceita como "da lista"

/** Municípios que a conferência exige com este número de itens na lista (DF: as 33 Regiões Administrativas; São Paulo: os 96 distritos). */
const ITENS_EXIGIDOS = { 5300108: 33, 3550308: 96 };
/** As 27 capitais (código IBGE → nome), para dizer no fim quais continuam sem lista. */
const CAPITAIS = {
  1100205: 'Porto Velho', 1200401: 'Rio Branco', 1302603: 'Manaus', 1400100: 'Boa Vista', 1501402: 'Belém', 1600303: 'Macapá', 1721000: 'Palmas',
  2111300: 'São Luís', 2211001: 'Teresina', 2304400: 'Fortaleza', 2408102: 'Natal', 2507507: 'João Pessoa', 2611606: 'Recife', 2704302: 'Maceió',
  2800308: 'Aracaju', 2927408: 'Salvador', 3106200: 'Belo Horizonte', 3205309: 'Vitória', 3304557: 'Rio de Janeiro', 3550308: 'São Paulo',
  4106902: 'Curitiba', 4205407: 'Florianópolis', 4314902: 'Porto Alegre', 5002704: 'Campo Grande', 5103403: 'Cuiabá', 5208707: 'Goiânia', 5300108: 'Brasília',
};

const UF_DO_CODIGO = {
  11: 'RO', 12: 'AC', 13: 'AM', 14: 'RR', 15: 'PA', 16: 'AP', 17: 'TO', 21: 'MA', 22: 'PI', 23: 'CE', 24: 'RN', 25: 'PB', 26: 'PE', 27: 'AL', 28: 'SE', 29: 'BA',
  31: 'MG', 32: 'ES', 33: 'RJ', 35: 'SP', 41: 'PR', 42: 'SC', 43: 'RS', 50: 'MS', 51: 'MT', 52: 'GO', 53: 'DF',
};
const ESPERADO = { bairros: 17576, municipios: 895, divisoes: 11307, distritos: 10699, todosOsMunicipios: 5571 };
const MAX_LETRAS = 80; // o limite do motor para o bairro (lerBairro)

const args = process.argv.slice(2);
const opcao = (nome) => { const i = args.indexOf(`--${nome}`); return i >= 0 && args[i + 1] ? args[i + 1] : null; };
const arredonda = (n) => Math.round(n * 100) / 100;
/** Distância em km entre dois pontos { lat, lng } (haversine) — a mesma de utils/cidade.js no motor. */
function distanciaKm(a, b) {
  const rad = (g) => (g * Math.PI) / 180;
  const h = Math.sin(rad(b.lat - a.lat) / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(rad(b.lng - a.lng) / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(h)));
}
const normalizar = (t) => String(t ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
const limpar = (t) => String(t ?? '').replace(/\s+/g, ' ').trim();

async function baixar(url) {
  const r = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!r.ok) throw new Error(`${url} → HTTP ${r.status}`);
  return Buffer.from(await r.arrayBuffer());
}

/** Um .zip lido na mão (sem dependência): a tabela do fim do arquivo diz onde está cada parte. Não lida com zip64 (estes arquivos não precisam). */
function lerZip(buf) {
  let fim = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i -= 1) {
    if (buf.readUInt32LE(i) === 0x06054b50) { fim = i; break; }
  }
  if (fim < 0) throw new Error('não é um .zip (falta o fim da tabela)');
  const total = buf.readUInt16LE(fim + 10);
  let p = buf.readUInt32LE(fim + 16);
  const partes = new Map();
  for (let n = 0; n < total; n += 1) {
    if (buf.readUInt32LE(p) !== 0x02014b50) throw new Error('tabela do .zip corrompida');
    const nomeLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const comentarioLen = buf.readUInt16LE(p + 32);
    partes.set(buf.toString('utf8', p + 46, p + 46 + nomeLen), { metodo: buf.readUInt16LE(p + 10), tamanho: buf.readUInt32LE(p + 20), local: buf.readUInt32LE(p + 42) });
    p += 46 + nomeLen + extraLen + comentarioLen;
  }
  return (sufixo) => {
    const nome = [...partes.keys()].find((k) => k.toLowerCase().endsWith(sufixo));
    if (!nome) throw new Error(`o .zip não tem um arquivo ${sufixo}`);
    const { metodo, tamanho, local } = partes.get(nome);
    if (tamanho === 0xffffffff) throw new Error('zip64 não é suportado');
    const dados = local + 30 + buf.readUInt16LE(local + 26) + buf.readUInt16LE(local + 28);
    const bruto = buf.subarray(dados, dados + tamanho);
    if (metodo === 0) return bruto;
    if (metodo === 8) return inflateRawSync(bruto);
    throw new Error(`método de compressão ${metodo} não suportado`);
  };
}

/** O .dbf (tabela de atributos, UTF-8): uma linha por feição, `null` nas apagadas. */
function lerDbf(buf) {
  const n = buf.readUInt32LE(4);
  const cabecalho = buf.readUInt16LE(8);
  const tamanhoLinha = buf.readUInt16LE(10);
  const campos = [];
  let desloc = 1;
  for (let o = 32; buf[o] !== 0x0d; o += 32) {
    const len = buf[o + 16];
    campos.push({ nome: buf.toString('latin1', o, o + 11).replace(/\0.*$/, ''), len, desloc });
    desloc += len;
  }
  const linhas = [];
  for (let i = 0; i < n; i += 1) {
    const base = cabecalho + i * tamanhoLinha;
    if (buf[base] === 0x2a) { linhas.push(null); continue; }
    linhas.push(Object.fromEntries(campos.map((c) => [c.nome, limpar(buf.toString('utf8', base + c.desloc, base + c.desloc + c.len))])));
  }
  return linhas;
}

/** O .shp (formas): para cada feição, o ponto central — centro de área do MAIOR anel externo (anel horário), em graus. `null` = sem forma. */
function lerShp(buf) {
  const pontos = [];
  let p = 100;
  while (p + 8 <= buf.length) {
    const ini = p + 8;
    const fim = ini + buf.readInt32BE(p + 4) * 2;
    const tipo = buf.readInt32LE(ini);
    if (tipo === 0) pontos.push(null);
    else if (tipo === 5 || tipo === 15 || tipo === 25) {
      const nPartes = buf.readInt32LE(ini + 36);
      const nPontos = buf.readInt32LE(ini + 40);
      const origemPartes = ini + 44;
      const origemPontos = origemPartes + 4 * nPartes;
      let melhor = null;
      let maiorAnel = null;
      for (let i = 0; i < nPartes; i += 1) {
        const de = buf.readInt32LE(origemPartes + 4 * i);
        const ate = i + 1 < nPartes ? buf.readInt32LE(origemPartes + 4 * (i + 1)) : nPontos;
        let a = 0; let cx = 0; let cy = 0;
        let x0 = buf.readDoubleLE(origemPontos + 16 * de);
        let y0 = buf.readDoubleLE(origemPontos + 16 * de + 8);
        for (let k = de + 1; k < ate; k += 1) {
          const x1 = buf.readDoubleLE(origemPontos + 16 * k);
          const y1 = buf.readDoubleLE(origemPontos + 16 * k + 8);
          const f = x0 * y1 - x1 * y0;
          a += f; cx += (x0 + x1) * f; cy += (y0 + y1) * f;
          x0 = x1; y0 = y1;
        }
        const anel = { area: Math.abs(a / 2), lng: a === 0 ? x0 : cx / (3 * a), lat: a === 0 ? y0 : cy / (3 * a) };
        if (!maiorAnel || anel.area > maiorAnel.area) maiorAnel = anel;
        if (a < 0 && (!melhor || anel.area > melhor.area)) melhor = anel; // horário = anel externo
      }
      pontos.push(melhor || maiorAnel);
    } else throw new Error(`tipo de forma ${tipo} não suportado`);
    p = fim;
  }
  return pontos;
}

/** As feições de um .zip de malha do IBGE: [{ ...atributos, lat, lng }]. */
function feicoes(zipBuf) {
  const parte = lerZip(zipBuf);
  const linhas = lerDbf(parte('.dbf'));
  const pontos = lerShp(parte('.shp'));
  if (linhas.length !== pontos.length) throw new Error(`o .dbf tem ${linhas.length} linhas e o .shp ${pontos.length} formas`);
  return linhas.map((l, i) => (l && pontos[i] ? { ...l, lat: arredonda(pontos[i].lat), lng: arredonda(pontos[i].lng) } : null)).filter(Boolean);
}

function lerCsv(texto) {
  const [cab, ...linhas] = texto.replace(/^﻿/, '').trim().split(/\r?\n/);
  const cols = cab.split(',');
  return linhas.map((l) => Object.fromEntries(l.split(',').map((v, i) => [cols[i], v])));
}

async function carregarZip(argumento, fonte) {
  const local = opcao(argumento);
  if (local) return readFileSync(local);
  console.log(`[bairros] baixando ${fonte}`);
  return baixar(fonte);
}

// ── Lê as fontes ───────────────────────────────────────────────────────────────────────────────────────────────────────────────
const nomeDoMunicipio = new Map(lerCsv((await baixar(FONTE_MUNICIPIOS)).toString('utf8')).map((m) => [m.codigo_ibge, m.nome]));
/** "nome normalizado|UF" → { lat, lng } da cidade, como o campo Cidade a conhece. */
const cidadesDoApp = new Map(JSON.parse(readFileSync(CIDADES, 'utf8')).filter((c) => c[2] === 'BR').map((c) => [`${normalizar(c[0])}|${c[1]}`, { lat: c[3], lng: c[4] }]));
const bairrosDoIbge = feicoes(await carregarZip('zip', FONTE_BAIRROS));

const erros = [];
if (bairrosDoIbge.length !== ESPERADO.bairros) erros.push(`bairros: ${bairrosDoIbge.length} feições, esperava ${ESPERADO.bairros}`);

/** codigo do município → { uf, nome, itens: Map(nome normalizado → [bairro, lat, lng]) } */
const municipios = new Map();
let repetidos = 0;
function acrescentar({ codigoUf, codigoMunicipio, nomeNoIbge, bairro, lat, lng }) {
  const uf = UF_DO_CODIGO[Number(codigoUf)];
  if (!uf) { erros.push(`UF desconhecida: ${codigoUf} (${bairro})`); return; }
  if (!bairro || bairro.length > MAX_LETRAS) { erros.push(`nome de bairro inválido em ${nomeNoIbge}: "${bairro}"`); return; }
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -34 || lat > 6 || lng < -74 || lng > -28) { erros.push(`fora do Brasil: ${bairro}/${nomeNoIbge} ${lat},${lng}`); return; }
  if (!municipios.has(codigoMunicipio)) municipios.set(codigoMunicipio, { uf, nome: nomeDoMunicipio.get(codigoMunicipio) || nomeNoIbge, itens: new Map() });
  const m = municipios.get(codigoMunicipio);
  const chave = normalizar(bairro);
  if (m.itens.has(chave)) { repetidos += 1; return; } // o mesmo nome duas vezes no município: fica o primeiro
  m.itens.set(chave, [bairro, lat, lng]);
}

for (const b of bairrosDoIbge) {
  acrescentar({ codigoUf: b.CD_UF, codigoMunicipio: b.CD_MUN, nomeNoIbge: b.NM_MUN, bairro: b.NM_BAIRRO, lat: b.lat, lng: b.lng });
}
if (municipios.size !== ESPERADO.municipios) erros.push(`municípios com bairros: ${municipios.size}, esperava ${ESPERADO.municipios}`);

// ── Onde o Censo não tem bairros, os distritos e subdistritos oficiais (2 ou mais por município) ─────
const comBairrosDoCenso = new Set(municipios.keys());
/** codigo do município → as linhas (distrito ou subdistrito) do IBGE */
const divisoes = new Map();
let linhasDivisoes = 0;
const distritosVistos = new Set();
for (const uf of Object.values(UF_DO_CODIGO).sort()) {
  const pasta = opcao('subdistritos');
  const zip = pasta ? readFileSync(path.join(pasta, `${uf}_subdistritos_CD2022.zip`)) : await (async () => { console.log(`[bairros] baixando ${fonteSubdistritos(uf)}`); return baixar(fonteSubdistritos(uf)); })();
  for (const s of feicoes(zip)) {
    linhasDivisoes += 1;
    distritosVistos.add(s.CD_DIST);
    if (!divisoes.has(s.CD_MUN)) divisoes.set(s.CD_MUN, []);
    divisoes.get(s.CD_MUN).push(s);
  }
}
if (linhasDivisoes !== ESPERADO.divisoes) erros.push(`distritos+subdistritos: ${linhasDivisoes} linhas, esperava ${ESPERADO.divisoes}`);
if (distritosVistos.size !== ESPERADO.distritos) erros.push(`distritos: ${distritosVistos.size}, esperava ${ESPERADO.distritos}`);
if (divisoes.size !== ESPERADO.todosOsMunicipios) erros.push(`municípios nos arquivos de divisões: ${divisoes.size}, esperava ${ESPERADO.todosOsMunicipios}`);

const pontoDaSede = (nome, uf) => cidadesDoApp.get(`${normalizar(nome)}|${uf}`);
let viraramLista = 0; let sedesComPontoDaCidade = 0;
for (const [codigo, linhas] of divisoes) {
  if (comBairrosDoCenso.has(codigo)) continue;
  const nomeNoIbge = linhas[0].NM_MUN;
  const nomes = new Set(linhas.map((s) => normalizar(s.NM_SUBDIST || s.NM_DIST)));
  if (nomes.size < 2) continue; // um distrito só: o campo Bairro não aparece
  const uf = UF_DO_CODIGO[Number(linhas[0].CD_UF)];
  const nomeDaCidade = nomeDoMunicipio.get(codigo) || nomeNoIbge;
  const sede = pontoDaSede(nomeDaCidade, uf);
  viraramLista += 1;
  for (const s of linhas) {
    // Goiânia: o IBGE chama os 63 subdistritos de "U.T.P. Aeroviários" (Unidade Territorial de Planejamento); o nome do bairro é o que vem depois.
    const bairro = (s.NM_SUBDIST || s.NM_DIST).replace(/^U\.T\.P\.\s+/, '');
    const eSede = !s.NM_SUBDIST && normalizar(bairro) === normalizar(nomeDaCidade);
    if (eSede && sede) sedesComPontoDaCidade += 1;
    acrescentar({ codigoUf: s.CD_UF, codigoMunicipio: codigo, nomeNoIbge, bairro, lat: eSede && sede ? sede.lat : s.lat, lng: eSede && sede ? sede.lng : s.lng });
  }
}
for (const [codigo, esperados] of Object.entries(ITENS_EXIGIDOS)) {
  const n = municipios.get(codigo)?.itens.size ?? 0;
  if (n !== esperados) erros.push(`${CAPITAIS[codigo]} (${codigo}): ${n} itens na lista, esperava ${esperados}`);
}

// O campo liga o bairro à cidade pelo nome + UF: todo município daqui tem de existir na lista de cidades do app.
for (const [codigo, m] of municipios) {
  if (!cidadesDoApp.has(`${normalizar(m.nome)}|${m.uf}`)) erros.push(`${m.nome}/${m.uf} (${codigo}) não está em cidades.json`);
}
if (erros.length) {
  console.error(`[bairros] ${erros.length} problema(s):\n  ${erros.slice(0, 20).join('\n  ')}`);
  process.exit(1);
}

// ── Grava um arquivo por estado ────────────────────────────────────────────────────────────────────────────────────────────────
mkdirSync(SAIDA, { recursive: true });
const ordem = (a, b) => a.localeCompare(b, 'pt');
let totalBytes = 0; let totalGzip = 0; let totalBairros = 0; let maior = { uf: '', gzip: 0 };
const linhasDaTabela = [];
for (const uf of Object.values(UF_DO_CODIGO).sort(ordem)) {
  const doEstado = [...municipios].filter(([, m]) => m.uf === uf)
    .map(([codigo, m]) => [codigo, m.nome, [...m.itens.values()].sort((a, b) => ordem(a[0], b[0]))])
    .sort((a, b) => ordem(a[1], b[1]));
  const json = JSON.stringify(doEstado);
  const gzip = gzipSync(json, { level: 9 }).length;
  if (gzip > TETO_GZIP_POR_UF) { console.error(`[bairros] ${uf}: ${(gzip / 1024).toFixed(1)} KB comprimido passa do teto de ${TETO_GZIP_POR_UF / 1024} KB — não gravei.`); process.exit(1); }
  writeFileSync(path.join(SAIDA, `${uf}.json`), json);
  const nBairros = doEstado.reduce((s, m) => s + m[2].length, 0);
  totalBytes += Buffer.byteLength(json); totalGzip += gzip; totalBairros += nBairros;
  if (gzip > maior.gzip) maior = { uf, gzip };
  linhasDaTabela.push(`${uf}  ${String(doEstado.length).padStart(4)} municípios  ${String(nBairros).padStart(5)} bairros  ${(Buffer.byteLength(json) / 1024).toFixed(1).padStart(6)} KB  ${(gzip / 1024).toFixed(1).padStart(5)} KB gzip`);
}
console.log(linhasDaTabela.join('\n'));
console.log(`[bairros] ${municipios.size} municípios, ${totalBairros} bairros (${repetidos} nome(s) repetido(s) no mesmo município ficaram só uma vez) em 27 arquivos`);
console.log(`[bairros] ${comBairrosDoCenso.size} municípios com bairros do Censo + ${viraramLista} por distritos/subdistritos (${sedesComPontoDaCidade} distritos-sede com o ponto da cidade)`);
const capitaisSem = Object.entries(CAPITAIS).filter(([codigo]) => !municipios.has(codigo)).map(([, nome]) => nome);
console.log(`[bairros] capitais ainda sem lista: ${capitaisSem.length ? capitaisSem.join(', ') : 'nenhuma'}`);
let longeDaCidade = 0; const municipiosLonge = new Set();
for (const [codigo, m] of municipios) {
  const sede = pontoDaSede(m.nome, m.uf);
  if (!sede) continue;
  for (const [, lat, lng] of m.itens.values()) {
    if (distanciaKm(sede, { lat, lng }) > RAIO_DO_BAIRRO_KM) { longeDaCidade += 1; municipiosLonge.add(codigo); }
  }
}
console.log(`[bairros] ${longeDaCidade} itens a mais de ${RAIO_DO_BAIRRO_KM} km do ponto da cidade (em ${municipiosLonge.size} municípios): o motor não aceita o ponto deles como "da lista" e geocodifica`);
console.log(`[bairros] total ${(totalBytes / 1024).toFixed(1)} KB sem comprimir · ${(totalGzip / 1024).toFixed(1)} KB com gzip · o maior arquivo é o de ${maior.uf}, com ${(maior.gzip / 1024).toFixed(1)} KB comprimidos`);
