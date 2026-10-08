// Futty — Rodada 30C: gera src/utils/nomesFemininos.lista.js, a lista grande de primeiros nomes
// femininos (Brasil + Portugal) usada pelo PALPITE do avatar genérico (src/utils/avatarGenerico.js)
// quando a pessoa não escolheu o seu avatar. Lista pequena (src/utils/nomesFemininos.js, ~160 nomes)
// continua como o palpite instantâneo de sempre; esta lista grande chega depois, por import()
// dinâmico (ver carregarNomesFemininos em nomesFemininos.js), sem pesar o arranque do app.
//
// Fontes (RODADA-30C.md):
//   Brasil  — Censo 2010 do IBGE via o dataset "genero-nomes" do Brasil.io, baixado AO VIVO aqui
//             (https://data.brasil.io/dataset/genero-nomes/nomes.csv.gz, sem token — só a API de
//             consulta do Brasil.io exige token; o arquivo estático não). Entram os nomes com
//             classification=F, ratio (proporção feminina) ≥ 0,90 e frequency_total ≥ 500.
//   Portugal — lista oficial de nomes próprios admitidos do IRN (Instituto dos Registos e do
//             Notariado), coluna "Femininos". A IRN só publica em PDF (sem API nem CSV); o PDF foi
//             extraído com `pdftotext -layout` (poppler) + scripts/nomes/extrair-irn-femininos.mjs,
//             que grava scripts/nomes/fontes/irn-nomes-femininos.json — esse arquivo É a fonte que
//             este script lê (sem precisar de poppler nem de biblioteca de PDF nenhuma em tempo de
//             geração: "sem dependência nova"). Para atualizar um dia, ver o cabeçalho de
//             extrair-irn-femininos.mjs (baixar o PDF de novo, rodar o pdftotext, rodar o script).
//
// Nenhum nome marcado como "ambos os sexos" entra: o Brasil.io já teria de classificar o nome como
// F (não entra se a maioria do uso for M); a IRN já separa Femininos/Masculinos em colunas próprias.
// Unissex fora, na dúvida fora — é o próprio filtro de ratio ≥ 0,90 que decide isso no lado do Brasil;
// do lado de Portugal não há "proporção" (é lista administrativa, não estatística), então entra como
// a IRN classifica.
//
// Achado nesta rodada: a meta original ("2500 a 3500 nomes") supunha uma lista de Portugal menor —
// a lista viva atual da IRN sozinha já tem ~3.600 nomes (cresceu com o tempo, inclui nomes de origem
// estrangeira admitidos por dupla nacionalidade). Reduzir a lista oficial para caber num número
// redondo seria arbitrário (não há frequência nela para cortar "pelos menos comuns"); o que importa
// de verdade — o TAMANHO DO CHUNK — ainda cabe na faixa que o rascunho previu (~25 a 40 KB gzip),
// mesmo com ~9 mil nomes únicos, porque o texto é curto e repetitivo. Registrado no relatório da
// rodada; decisão: manter as duas fontes completas, sem corte artificial.
//
// Uso: node scripts/nomes/gerar-nomes-femininos.mjs
import { writeFileSync, readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ = join(AQUI, '..', '..');
const URL_BRASIL_IO = 'https://data.brasil.io/dataset/genero-nomes/nomes.csv.gz';
const RATIO_MINIMO = 0.90;
const FREQUENCIA_MINIMA = 500;

const semAcento = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '');
const normalizar = (s) => semAcento(String(s ?? '')).toLowerCase().trim();

async function nomesDoBrasil() {
  console.log('· baixando', URL_BRASIL_IO, '…');
  const resp = await fetch(URL_BRASIL_IO);
  if (!resp.ok) throw new Error(`Brasil.io: HTTP ${resp.status}`);
  const gz = Buffer.from(await resp.arrayBuffer());
  const csv = gunzipSync(gz).toString('utf8');
  const linhas = csv.split('\n').slice(1).filter(Boolean);
  const nomes = [];
  for (const linha of linhas) {
    const campos = linha.split(',');
    if (campos.length !== 9) continue; // cabeçalho: alternative_names,classification,first_name,frequency_female,frequency_male,frequency_total,frequency_group,group_name,ratio
    const [, classification, firstName, , , frequencyTotal, , , ratio] = campos;
    if (classification === 'F' && Number(ratio) >= RATIO_MINIMO && Number(frequencyTotal) >= FREQUENCIA_MINIMA) {
      nomes.push(normalizar(firstName));
    }
  }
  ok(`Brasil (Brasil.io/IBGE): ${nomes.length} nomes (classification=F, ratio≥${RATIO_MINIMO}, frequency_total≥${FREQUENCIA_MINIMA})`);
  return nomes;
}

function nomesDePortugal() {
  const caminho = join(AQUI, 'fontes', 'irn-nomes-femininos.json');
  const dados = JSON.parse(readFileSync(caminho, 'utf8'));
  const nomes = dados.nomes.map(normalizar).filter(Boolean);
  ok(`Portugal (IRN, "${dados.fonte.slice(0, 40)}…", extraído em ${dados.extraidoEm}): ${nomes.length} nomes`);
  return nomes;
}

const ok = (m) => console.log('✓', m);

(async () => {
  const [brasil, portugal] = await Promise.all([nomesDoBrasil(), Promise.resolve(nomesDePortugal())]);
  const uniao = [...new Set([...brasil, ...portugal])].filter(Boolean).sort();

  const cabecalho = `// Futty — lista grande de primeiros nomes femininos (Brasil + Portugal), gerada por
// scripts/nomes/gerar-nomes-femininos.mjs (Rodada 30C) em ${new Date().toISOString().slice(0, 10)}.
// NÃO EDITAR À MÃO — rode o gerador de novo. Fontes e regras no cabeçalho do gerador.
// Brasil: Censo 2010/IBGE via Brasil.io (genero-nomes), classification=F, ratio≥${RATIO_MINIMO}, frequency_total≥${FREQUENCIA_MINIMA}.
// Portugal: lista de nomes próprios admitidos do IRN, coluna Femininos (scripts/nomes/fontes/irn-nomes-femininos.json).
// Normalizado como utils/cidades.js: minúsculas, sem acento. Carregado por import() dinâmico em
// src/utils/nomesFemininos.js (carregarNomesFemininos) — nunca import estático (entraria no pacote
// de arranque). ${uniao.length} nomes únicos.
export default ${JSON.stringify(uniao)};
`;
  const destino = join(RAIZ, 'src', 'utils', 'nomesFemininos.lista.js');
  writeFileSync(destino, cabecalho, 'utf8');
  ok(`${uniao.length} nomes únicos (Brasil ${brasil.length} + Portugal ${portugal.length}, com sobreposição) em ${destino}`);
  console.log(`  tamanho do arquivo: ${Buffer.byteLength(cabecalho)} bytes`);
})().catch((e) => {
  console.error('ERRO:', e.message);
  process.exit(1);
});
