// Futty v2.0 — Rodada 30F, item 4: o erro do sorteio aparece junto do botão. Antes ia para o topo da página (o mesmo
// actionError das ações de presença, que ficam lá em cima) e quem tocava em "Sortear de novo", no fim da página, não via
// "São precisos pelo menos 14 jogadores…". Prova no navegador: scripts/provas/erro-do-sorteio.prova.mjs.
//
// Uso: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = fileURLToPath(new URL('../../', import.meta.url));
const jogo = fs.readFileSync(path.join(RAIZ, 'src/pages/Jogo.jsx'), 'utf8');
const sortear = jogo.slice(jogo.indexOf('async function sortear()'), jogo.indexOf('async function salvarTimes('));

test('30F-4 · o sorteio guarda o erro no lugar próprio (não no actionError do topo)', () => {
  assert.match(jogo, /const \[erroDoSorteio, setErroDoSorteio\] = useState\(''\);/);
  assert.match(sortear, /setErroDoSorteio\(''\);/, 'limpa ao tentar de novo');
  assert.match(sortear, /catch \(err\) \{\s*setErroDoSorteio\(err\.message\);/, 'a frase do motor');
  assert.doesNotMatch(sortear, /setActionError/, 'o erro do sorteio não vai mais para o topo');
});

test('30F-4 · o aviso fica logo depois de "Trocar os times" e entra na tela sozinho se precisar', () => {
  const trocar = jogo.indexOf('data-trocar-os-times');
  const aviso = jogo.indexOf('data-erro-do-sorteio');
  assert.ok(trocar > 0 && aviso > trocar, 'depois dos botões de sortear');
  assert.match(jogo, /<div ref=\{erroDoSorteioRef\} className="alert alert--error" role="alert" data-erro-do-sorteio/);
  assert.match(jogo, /erroDoSorteioRef\.current\?\.scrollIntoView\?\.\(\{ block: 'nearest', behavior: 'smooth' \}\)/);
});
