// Futty v2.0 — Rodada 30F, item 5: a pausa geral das animações com a aba escondida (html[data-oculto], src/index.css)
// prendia a `.entra-em-sequencia` da 30B em opacity 0 (fill `both`): a cerimônia que terminava com a pessoa noutro app
// deixava o selo e os botões invisíveis. A classe entra na lista de exceções, como as outras entradas de conteúdo.
// Prova no navegador: o cenário "apresentação dos times à mão" de scripts/testar-visibilidade.mjs (npm run
// test:visibilidade, com dist/ construído) abre com data-oculto desde o arranque e mede a opacidade efetiva.
//
// Uso: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = fileURLToPath(new URL('../../', import.meta.url));
const ler = (rel) => fs.readFileSync(path.join(RAIZ, rel), 'utf8');

test('30F-5 · .entra-em-sequencia está na lista de exceções da pausa com a aba escondida', () => {
  const regra = ler('src/index.css').split('\n').find((l) => l.startsWith('html[data-oculto] *:not('));
  assert.ok(regra, 'a regra da pausa existe');
  for (const classe of ['page-transition', 'anim-slide-in', 'futty-toast', 'entra-em-sequencia']) {
    assert.ok(regra.includes(`:not(.${classe})`), `falta :not(.${classe})`);
  }
});

test('30F-5 · o teste de visibilidade mede a apresentação dos times à mão nascendo com a aba escondida', () => {
  const vis = ler('scripts/testar-visibilidade.mjs');
  assert.match(vis, /apresentação dos times à mão', path: '\/time\/time-teste-vis\/jogo\/jogo-vis\/sorteio', seletor: '\.entra-em-sequencia'/);
});
