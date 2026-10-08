// Futty — Rodada 30C: extrai a coluna "Femininos" do PDF oficial da IRN e (re)grava
// scripts/nomes/fontes/irn-nomes-femininos.json — a fonte que gerar-nomes-femininos.mjs lê.
//
// A IRN só publica em PDF (sem API nem CSV), então este passo é MANUAL e raro (só quando a lista
// for atualizada) — não faz parte do gerador de todo dia, de propósito: não exige nenhuma
// biblioteca de PDF nova no projeto, só o `pdftotext` do poppler (que já havia nesta máquina), rodado
// à mão UMA vez por atualização.
//
// Uso (duas etapas):
//   1. baixar https://irn.justica.gov.pt/Portals/33/Regras%20Nome%20Proprio/Lista%20Nomes%20Pr%C3%B3prios.pdf
//      (um navegador de verdade — o servidor às vezes devolve 502 para user-agent de script) e rodar:
//        pdftotext -layout "Lista Nomes Próprios.pdf" lista-irn.txt
//   2. node scripts/nomes/extrair-irn-femininos.mjs lista-irn.txt
//
// O PDF vem em DUAS colunas por página ("GÉNERO NOME" | "GÉNERO NOME", Femininos à esquerda,
// Masculinos à direita) — ver o pdftotext -layout, que preserva a posição horizontal com espaços. O
// texto sai em Latin-1 (ISO-8859-1), não UTF-8 — é por isso que lemos o .txt com 'latin1'.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const AQUI = dirname(fileURLToPath(import.meta.url));
const URL_PDF = 'https://irn.justica.gov.pt/Portals/33/Regras%20Nome%20Proprio/Lista%20Nomes%20Pr%C3%B3prios.pdf';

const caminhoTxt = process.argv[2];
if (!caminhoTxt) {
  console.error('Uso: node scripts/nomes/extrair-irn-femininos.mjs <lista-irn.txt>  (saída de "pdftotext -layout" no PDF da IRN)');
  process.exit(1);
}

const txt = readFileSync(caminhoTxt, 'latin1');
const linhas = txt.split(/\r?\n/);
const femininos = [];
for (const linha of linhas) {
  if (!linha.startsWith('Femininos')) continue;
  let resto = linha.slice('Femininos'.length);
  // Caso normal: a coluna da direita começa em "Masculinos" (com 2+ espaços de vão antes).
  const idx = resto.search(/\s{2,}Masculinos\b/);
  if (idx >= 0) {
    resto = resto.slice(0, idx);
  } else {
    // Algumas linhas (perto do fim de página) perdem o rótulo "Masculinos": corta no primeiro
    // vão de 3+ espaços (é ali que a coluna da direita começa de qualquer forma).
    const m = resto.match(/^(\s*\S(?:.*?\S)?)\s{3,}/);
    resto = m ? m[1] : resto;
  }
  const nome = resto.trim();
  if (nome) femininos.push(nome);
}

if (femininos.length < 1000) throw new Error(`só ${femininos.length} nome(s) extraído(s) — formato do PDF deve ter mudado; conferir o .txt à mão`);

const saida = {
  fonte: 'Instituto dos Registos e do Notariado (IRN) — Lista de Nomes Próprios admitidos para registo civil em Portugal, coluna "Femininos"',
  url: URL_PDF,
  extraidoEm: new Date().toISOString().slice(0, 10),
  ferramenta: 'pdftotext -layout (poppler) + scripts/nomes/extrair-irn-femininos.mjs',
  nota: 'Nomes como a IRN os escreve na lista oficial (maiúscula inicial, com acento); a normalização (sem acento, minúsculas) é feita por gerar-nomes-femininos.mjs, igual aos outros nomes.',
  total: femininos.length,
  nomes: femininos,
};
const destino = join(AQUI, 'fontes', 'irn-nomes-femininos.json');
writeFileSync(destino, JSON.stringify(saida), 'utf8');
console.log(`✓ ${femininos.length} nomes em ${destino}`);
