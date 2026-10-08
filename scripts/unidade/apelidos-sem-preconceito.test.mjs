// Futty — Rodada 30D: trava para apelido pejorativo (aparência/origem/cor/etnia) nunca mais voltar a
// aparecer em scripts/demo-loja.js, scripts/loja/* ou src/ (regra do dono: "nenhum apelido pejorativo em
// lugar nenhum — app, demo, prints, redes"). A lista fica em scripts/loja/apelidos-banidos.mjs — a mesma
// que capturar-telas.mjs usa para conferir o texto da tela do Sorteio em tempo real.
//
// O teste varre o texto do arquivo DEPOIS de tirar os comentários (// e /* */): um comentário histórico
// que EXPLICA um apelido já removido (ex.: "Índio e Nego Di saíram da peça") fica de fora de propósito —
// só o que ainda está vivo em dado ou string reprova. Arquivos que listam o próprio banimento (esta
// trava e a tabela de apelidos-banidos.mjs) são a exceção óbvia e ficam fora da varredura.
//
// Uso: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { APELIDOS_BANIDOS, normalizar } from '../loja/apelidos-banidos.mjs';

const RAIZ = fileURLToPath(new URL('../../', import.meta.url));
const relativo = (p) => path.relative(RAIZ, p).split(path.sep).join('/');

// A própria tabela de banidos contém os apelidos (é o ponto único da lista) — não se varre a si mesma.
const FORA_DA_VARREDURA = new Set(['scripts/loja/apelidos-banidos.mjs']);

function arquivosDeFonte(dir, saida = []) {
  if (!fs.existsSync(dir)) return saida;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules') continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) arquivosDeFonte(p, saida);
    else if (/\.(jsx?|mjs|cjs)$/.test(e.name)) saida.push(p);
  }
  return saida;
}

// scripts/demo-loja.js não existe neste repo (vive no backend) — entra só se um dia existir aqui também.
const RAIZES = [
  path.join(RAIZ, 'scripts', 'demo-loja.js'),
  path.join(RAIZ, 'scripts', 'loja'),
  path.join(RAIZ, 'src'),
];
const fontes = RAIZES.flatMap((raiz) => {
  if (!fs.existsSync(raiz)) return [];
  return fs.statSync(raiz).isDirectory() ? arquivosDeFonte(raiz) : [raiz];
}).filter((p) => !FORA_DA_VARREDURA.has(relativo(p)));

// Tira comentário de bloco e de linha, preservando "://" (http://, https://) — comentário de histórico
// que só explica um apelido já removido não deve reprovar o teste. Tira também o `slug:` do jogador
// (fica no backend, demo-loja.js): é o identificador INTERNO da conta (vira e-mail), nunca aparece em
// tela, e fica para sempre com o apelido ORIGINAL por decisão do dono (mesma conta, mesmo e-mail).
function semComentarios(txt) {
  return txt
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1')
    .replace(/slug:\s*'[^']*'/g, "slug: ''");
}

test(`nenhum apelido pejorativo (${APELIDOS_BANIDOS.join(', ')}) em scripts/demo-loja.js, scripts/loja/* ou src/ — fora de comentário histórico`, () => {
  assert.ok(fontes.length > 10, `varredura vazia demais (${fontes.length} arquivo(s)) — confira os caminhos`);
  const achados = [];
  for (const p of fontes) {
    const alvo = normalizar(semComentarios(fs.readFileSync(p, 'utf8')));
    for (const banido of APELIDOS_BANIDOS) {
      if (alvo.includes(normalizar(banido))) achados.push(`${relativo(p)}: "${banido}"`);
    }
  }
  assert.deepEqual(achados, [], `Apelido pejorativo encontrado fora de comentário histórico:\n${achados.join('\n')}`);
});
