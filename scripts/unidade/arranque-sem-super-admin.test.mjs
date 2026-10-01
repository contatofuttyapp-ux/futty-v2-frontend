// Futty v2.0 — Rodada 29B (bloco 2, B — "conta pesada"): NENHUMA chamada de super-admin no arranque comum.
//
// A conta Chavo é super-admin e abria o Início devagar; a suspeita era "chamadas extras de super-admin no arranque". Conferido (o
// arranque frio é UM pedido, /api/inicio, e o pré-aquecimento só pede feed, ranking, selos e bloqueios): não há nenhuma. Este teste
// TRAVA isso, para não voltar sem ninguém ver: as rotas /api/super/* (Gabinete) e /api/diagnostico só podem ser citadas pelas
// telas que são DELAS — e essas telas só entram no app por import dinâmico (lazy), nunca no arranque.
//
// Uso: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SRC = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'src');

function arquivos(dir) {
  return readdirSync(dir).flatMap((nome) => {
    const caminho = path.join(dir, nome);
    return statSync(caminho).isDirectory() ? arquivos(caminho) : /\.(js|jsx|mjs)$/.test(nome) ? [caminho] : [];
  });
}
const relativo = (f) => path.relative(SRC, f).split(path.sep).join('/');

// As telas de super-admin: as ÚNICAS que podem falar com essas rotas.
const TELAS_DO_SUPER_ADMIN = [/^pages\/Gabinete\.jsx$/, /^pages\/gabinete\//, /^pages\/Super\.jsx$/, /^pages\/Diagnostico\.jsx$/];
const ROTAS_DO_SUPER_ADMIN = /\/api\/super\b|\/api\/diagnostico\b/;

test('as rotas de super-admin (/api/super/*, /api/diagnostico) só aparecem nas telas do super-admin', () => {
  const fora = arquivos(SRC)
    .map(relativo)
    .filter((f) => !TELAS_DO_SUPER_ADMIN.some((re) => re.test(f)))
    .filter((f) => ROTAS_DO_SUPER_ADMIN.test(readFileSync(path.join(SRC, f), 'utf8')));
  assert.deepEqual(fora, [], `arquivo(s) fora das telas do super-admin citando rota de super-admin: ${fora.join(', ')}`);
});

test('as telas do super-admin entram no app só por import dinâmico (lazy) — nunca no arranque', () => {
  const app = readFileSync(path.join(SRC, 'App.jsx'), 'utf8');
  for (const tela of ['Super', 'Gabinete', 'Diagnostico']) {
    assert.doesNotMatch(app, new RegExp(`^import\\s+${tela}\\s+from`, 'm'), `${tela} importada de forma estática no App.jsx`);
    assert.match(app, new RegExp(`import\\('\\./pages/${tela}'\\)`), `${tela} deixou de ser carregada por import dinâmico`);
  }
  // E nenhum outro arquivo do arranque as importa de forma estática.
  const estaticos = arquivos(SRC)
    .map(relativo)
    .filter((f) => !TELAS_DO_SUPER_ADMIN.some((re) => re.test(f)))
    .filter((f) => /^import .*from ['"][^'"]*\/pages\/(Gabinete|gabinete|Super|Diagnostico)\b/m.test(readFileSync(path.join(SRC, f), 'utf8')));
  assert.deepEqual(estaticos, [], `import estático de tela do super-admin em: ${estaticos.join(', ')}`);
});

test('o pré-aquecimento do arranque só pede o que as telas comuns leem (nada de super-admin)', () => {
  const fonte = readFileSync(path.join(SRC, 'lib', 'preaquecerDados.js'), 'utf8');
  const rotas = [...fonte.matchAll(/passos\.push\(\[\s*[`'"]([^`'"]+)[`'"]/g)].map((m) => m[1].replace(/\$\{[^}]+\}/g, '{slug}'));
  assert.deepEqual(rotas.sort(), ['/api/blocks', '/api/feed?limite=20', '/api/me/selos', '/api/teams/{slug}/ranking'].sort());
  assert.doesNotMatch(fonte, ROTAS_DO_SUPER_ADMIN);
});
