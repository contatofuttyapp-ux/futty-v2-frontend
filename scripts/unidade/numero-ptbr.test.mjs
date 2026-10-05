// Futty v2.0 — Rodada 29Z: número com casa decimal em PT-BR, por UM helper só (src/utils/numero.js).
//
// Achado nos prints das lojas (5-out): o Ranking dizia "77.9 pontos" e o Início "9.10". Brasileiro escreve 77,9 e 9,1. Vários lugares
// formatavam por conta própria (toFixed, toFixed + replace, uma delas com duas casas). Este teste trava as duas metades da lei, igual à
// da hora (dataHora.js): (1) o helper escreve certo; (2) ninguém em src/ volta a formatar número na unha — todo `.toFixed(` que sobra é
// valor de CSS, ponto de SVG, atraso de animação ou chave de cache (não é texto) e está na lista abaixo, com a conta. Um `.toFixed(`
// novo fora da lista reprova, e a mensagem manda para o helper.
//
// A metade que olha o TEXTO de verdade nas telas (nenhum "\d.\d" visível, em 360 e 390 px) é a prova do navegador "rodada-29z".
//
// Uso: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { formatarAte, formatarDecimal, formatarEUR, formatarNota, formatarPontos, formatarSegundos, formatarUSD } from '../../src/utils/numero.js';
import { formatarMedia } from '../../src/utils/plural.js';

const RAIZ = fileURLToPath(new URL('../../', import.meta.url));

test('formatarDecimal: casas fixas, vírgula, milhar com ponto (os exemplos dos prints)', () => {
  assert.equal(formatarDecimal(77.9), '77,9', 'era "77.9 pontos" no Ranking');
  assert.equal(formatarDecimal(9.1), '9,1');
  assert.equal(formatarDecimal(10), '10,0');
  assert.equal(formatarDecimal(0), '0,0');
  assert.equal(formatarDecimal(87.36), '87,4');
  assert.equal(formatarDecimal(12.5, 2), '12,50');
  assert.equal(formatarDecimal(1234.5, 2), '1.234,50', 'milhar com ponto é do PT-BR; é a vírgula que é decimal');
  assert.equal(formatarDecimal('9.1'), '9,1', 'o motor às vezes manda número como texto');
  assert.equal(formatarDecimal(7, 0), '7');
});

test('formatarDecimal: o que não é número devolve o texto de reserva, nunca "NaN"', () => {
  for (const v of [null, undefined, '', NaN, Infinity, 'abc']) assert.equal(formatarDecimal(v), '', String(v));
  assert.equal(formatarDecimal(null, 1, '—'), '—');
  assert.equal(formatarAte(undefined, 1, '—'), '—');
});

test('formatarAte: até N casas, sem zero à direita (estrelas, média, rating do sorteio)', () => {
  assert.equal(formatarAte(4), '4');
  assert.equal(formatarAte(4.5), '4,5');
  assert.equal(formatarAte(3.45, 2), '3,45');
  assert.equal(formatarAte(3.5, 2), '3,5');
  assert.equal(formatarAte(0.5), '0,5');
});

test('formatarNota e formatarPontos: UMA casa sempre', () => {
  assert.equal(formatarNota(9.1), '9,1');
  assert.equal(formatarNota(9.10), '9,1', 'era "9.10" no Início');
  assert.equal(formatarNota(10), '10,0');
  assert.equal(formatarNota(null, 'sem nota ainda'), 'sem nota ainda');
  assert.equal(formatarPontos(77.9), '77,9');
});

test('formatarUSD e formatarEUR: dinheiro do Gabinete com vírgula', () => {
  assert.equal(formatarUSD(12.3), 'US$12,30');
  assert.equal(formatarUSD(0), 'US$0,00');
  assert.equal(formatarUSD(null), 'US$0,00');
  assert.equal(formatarEUR(7.24), '€7,24');
  assert.equal(formatarEUR(1234.5), '€1.234,50');
});

test('formatarSegundos: de milissegundos para "1,2s" (Diagnóstico)', () => {
  assert.equal(formatarSegundos(1234), '1,2s');
  assert.equal(formatarSegundos(500), '0,5s');
  assert.equal(formatarSegundos(60000), '60,0s');
});

test('formatarMedia (plural.js) segue o helper: inteiro sem casa, senão uma, com vírgula', () => {
  assert.equal(formatarMedia(12), '12');
  assert.equal(formatarMedia(13.14), '13,1');
  assert.equal(formatarMedia(0), '0');
  assert.equal(formatarMedia(undefined), '0');
});

// ── a trava: ninguém formata número na unha ──────────────────────────────────────────────────────────────────────────────────────────
// `.toFixed(` que sobra em src/ porque o valor NÃO é texto (a máquina lê ponto): arquivo → quantas ocorrências, e o porquê.
const TOFIXED_QUE_NAO_E_TEXTO = {
  'src/components/AuroraBg.jsx': [6, 'posição, tamanho e tempo das partículas (CSS)'],
  'src/components/CampeonatoVistas.jsx': [6, 'posição e tempo da chuva de confete (CSS)'],
  'src/components/CerimoniaSorteio.jsx': [9, 'atrasos e duração de animação, translateY (CSS)'],
  'src/pages/Figurinha.jsx': [2, 'zoom da foto: arredonda o NÚMERO do estado, não vira texto'],
  'src/pages/JogadorPerfil.jsx': [2, 'pontos do polyline SVG da evolução'],
  'src/utils/figurinhaCanvas.js': [4, 'chave de cache e opacidade de gradiente do canvas'],
  'src/components/Topbar.jsx': [4, 'clip-path e path SVG da barra'],
};

function arquivosDeFonte(dir, saida = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) arquivosDeFonte(p, saida);
    else if (/\.(jsx?|mjs)$/.test(e.name)) saida.push(p);
  }
  return saida;
}
const relativo = (p) => path.relative(RAIZ, p).split(path.sep).join('/');
const fontes = arquivosDeFonte(path.join(RAIZ, 'src')).filter((p) => relativo(p) !== 'src/utils/numero.js');

test('nenhum .toFixed( em src/ fora da lista de valores que não são texto (use src/utils/numero.js)', () => {
  const achados = [];
  for (const p of fontes) {
    const rel = relativo(p);
    const n = (fs.readFileSync(p, 'utf8').match(/\.toFixed\(/g) || []).length;
    const permitido = TOFIXED_QUE_NAO_E_TEXTO[rel]?.[0] ?? 0;
    if (n !== permitido) achados.push(`${rel}: ${n} .toFixed( (esperado ${permitido})`);
  }
  assert.deepEqual(achados, [], `Número com casa decimal na tela passa por src/utils/numero.js (formatarDecimal, formatarNota, formatarAte…): brasileiro escreve 77,9, não 77.9.\n${achados.join('\n')}`);
});

test('nenhum .replace(\'.\', \',\') nem .replace(/\\./, \',\') em src/ (a vírgula vem do Intl, não de um remendo)', () => {
  const achados = [];
  for (const p of fontes) {
    const txt = fs.readFileSync(p, 'utf8');
    if (/\.replace\(\s*(['"]\.['"]|\/\\\.\/g?)\s*,\s*['"],['"]\s*\)/.test(txt)) achados.push(relativo(p));
  }
  assert.deepEqual(achados, []);
});

test('toda formatação de número com Intl em src/ é pt-BR explícito (nunca o locale do aparelho)', () => {
  const achados = [];
  for (const p of fontes) {
    const txt = fs.readFileSync(p, 'utf8');
    for (const m of txt.matchAll(/new Intl\.NumberFormat\(([^,)]*)/g)) if (!/^\s*'pt-BR'\s*$/.test(m[1])) achados.push(`${relativo(p)}: ${m[0]}`);
  }
  assert.deepEqual(achados, []);
});

test('o helper único existe e usa Intl com pt-BR explícito', () => {
  const fonte = fs.readFileSync(path.join(RAIZ, 'src/utils/numero.js'), 'utf8');
  assert.match(fonte, /new Intl\.NumberFormat\('pt-BR'/);
  assert.doesNotMatch(fonte.replace(/\/\/[^\n]*/g, ''), /\.toFixed\(/, 'o helper não usa toFixed (formata pelo Intl)');
});

test('as telas que o achado citou usam o helper (Ranking, Início, perfil, Admin, Gabinete, Diagnóstico)', () => {
  const ler = (rel) => fs.readFileSync(path.join(RAIZ, rel), 'utf8');
  assert.match(ler('src/utils/format.js'), /formatarNota\(value\)/, 'formatRating (Início e Meu perfil)');
  assert.match(ler('src/utils/format.js'), /formatarPontos\(value \|\| 0\)/, 'formatScore (Ranking)');
  assert.match(ler('src/pages/Ranking.jsx'), /formatarNota\(p\.nota\)/);
  assert.match(ler('src/pages/JogadorPerfil.jsx'), /formatarNota\(notaShow\)/);
  assert.match(ler('src/pages/AdminPanel.jsx'), /formatarNota\(m\.nota_media\)/);
  assert.match(ler('src/pages/Gabinete.jsx'), /fmtUSD = formatarUSD/);
  assert.match(ler('src/pages/Gabinete.jsx'), /fmtEUR = formatarEUR/);
  assert.match(ler('src/pages/Diagnostico.jsx'), /formatarSegundos\(/);
});
