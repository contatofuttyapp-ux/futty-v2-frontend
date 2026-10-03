// Futty v2.0 — Rodada 29I, bloco 3 (achado 102 + bancadas do dono): o escudo do time sem logo (src/utils/escudo.js).
//
// Paleta FIXA de 12 cores, igual no motor e no app; 6 padrões; o desenho copiado das bancadas DESIGN/escudo-cores.html e
// escudo-padroes.html (as camadas CSS de cada padrão e a régua das iniciais em 84/36/20 px). A chave antiga 'verde' é o roxo da casa.
// E o painel tem UM controle de cor ("Escudo do time"): a "Cor de fundo do avatar" saiu.
//
// Uso: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { PALETA, PADROES, chaveDaCor, hexDaCor, camadasDoEscudo, letraDoEscudo, segundaCorSugerida } from '../../src/utils/escudo.js';
import { colorOf } from '../../src/utils/teamColors.js';

const RAIZ = fileURLToPath(new URL('../../', import.meta.url));
const ler = (rel) => fs.readFileSync(`${RAIZ}${rel}`, 'utf8');

test('a paleta é a do dono: 12 cores, nesta ordem, com estes hex (a mesma do motor e da migração 077)', () => {
  assert.deepEqual(PALETA.map((c) => [c.chave, c.hex]), [
    ['roxo', '#8b5cf6'], ['azul', '#3b82f6'], ['ciano', '#06b6d4'], ['gramado', '#22a060'], ['lima', '#65a30d'], ['ouro', '#d4a017'],
    ['laranja', '#ea7317'], ['vermelho', '#dc2626'], ['rosa', '#db2777'], ['vinho', '#9d174d'], ['grafite', '#3f4654'], ['preto', '#1c1c20'],
  ]);
  assert.equal(PALETA.find((c) => c.chave === 'gramado').nome, 'Verde', 'na tela, o verde se chama Verde');
  assert.deepEqual(PADROES.map((p) => p.chave), ['solido', 'faixa', 'metade', 'listras', 'barra', 'aro']);
  for (const reprovado of ['quadriculado', 'finas', 'listras_finas', 'pontos', 'pontinhos', 'gradiente']) {
    assert.ok(!PADROES.some((p) => p.chave === reprovado), `${reprovado} foi reprovado pelo dono`);
  }
});

test('a chave antiga "verde" sempre foi o ROXO — e continua (times de hoje não mudam de cor)', () => {
  assert.equal(chaveDaCor('verde'), 'roxo');
  assert.equal(hexDaCor('verde'), '#8b5cf6');
  assert.equal(colorOf('verde').hex, '#8b5cf6');
  assert.equal(colorOf('gramado').hex, '#22a060');
  assert.equal(hexDaCor(undefined), '#8b5cf6', 'sem cor: o roxo da casa');
  assert.equal(hexDaCor('#ff00ff'), '#8b5cf6', 'RGB livre não existe');
});

test('as camadas de cada padrão são as da bancada (DESIGN/escudo-padroes.html)', () => {
  const a = '#8b5cf6';
  const b = '#d4a017';
  const t = (padrao) => camadasDoEscudo({ cor: 'roxo', escudo_cor2: 'ouro', escudo_padrao: padrao });
  assert.deepEqual(t('solido'), { fundo: a, camada: null });
  assert.deepEqual(t('faixa'), { fundo: a, camada: `linear-gradient(115deg,transparent 0 46%,${b} 46% 68%,transparent 68%)` });
  assert.deepEqual(t('metade'), { fundo: `linear-gradient(90deg,${a} 0 50%,${b} 50% 100%)`, camada: null });
  assert.deepEqual(t('listras'), { fundo: `repeating-linear-gradient(90deg,${a} 0 25%,${b} 25% 50%)`, camada: null });
  assert.deepEqual(t('barra'), { fundo: a, camada: `linear-gradient(180deg,transparent 0 38%,${b} 38% 62%,transparent 62%)` });
  assert.deepEqual(t('aro'), { fundo: b, camada: `radial-gradient(circle,${a} 0 66%,transparent 66%)` });
  // Sem segunda cor (ou padrão inventado) = sólido: nunca um escudo quebrado.
  assert.deepEqual(camadasDoEscudo({ cor: 'azul', escudo_padrao: 'faixa' }), { fundo: '#3b82f6', camada: null });
  assert.deepEqual(camadasDoEscudo({ cor: 'azul', escudo_cor2: 'ouro', escudo_padrao: 'gradiente' }), { fundo: '#3b82f6', camada: null });
  assert.deepEqual(camadasDoEscudo({}), { fundo: '#8b5cf6', camada: null });
});

test('as iniciais na régua da bancada: 84 → 30 px, 36 → 14 px, 20 → 8 px', () => {
  assert.equal(letraDoEscudo(84), 30);
  assert.equal(letraDoEscudo(36), 14);
  assert.equal(letraDoEscudo(20), 8);
  assert.ok(letraDoEscudo(52) > 14 && letraDoEscudo(52) < 30);
});

test('a segunda cor sugerida nunca é a principal', () => {
  assert.equal(segundaCorSugerida('roxo'), 'ouro');
  assert.equal(segundaCorSugerida('ouro'), 'preto');
  assert.equal(segundaCorSugerida('verde'), 'ouro');
});

test('achado 102: UM controle de cor no painel — "Escudo do time"; "Cor" e "Cor de fundo do avatar" saíram', () => {
  const painel = ler('src/pages/AdminPanel.jsx');
  assert.doesNotMatch(painel, /Cor de fundo do avatar|CORES_FUNDO|COLOR_OPTIONS/);
  assert.doesNotMatch(painel, /<span style=\{lbl\}>Cor<\/span>/);
  assert.match(painel, /<EditorEscudo /);
  const editor = ler('src/components/EditorEscudo.jsx');
  assert.match(editor, /Escudo do time/);
  // A prévia ao vivo nos três tamanhos das bancadas.
  for (const tamanho of [84, 36, 20]) assert.match(editor, new RegExp(`<EscudoEquipa team=\\{previa\\} size=\\{${tamanho}\\} />`));
});
