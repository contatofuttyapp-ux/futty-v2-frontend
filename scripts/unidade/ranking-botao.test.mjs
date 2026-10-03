// Futty v2.0 — Rodada 29J, achado 117: o botão RANKING era uma barra dourada de largura total,
// sozinha, acima das abas Jogos · Elenco · Ajustes — parecia banner, não botão. Agora é um item do
// MESMO tamanho das abas, na mesma linha (navegação de verdade, por isso fora do role="tablist").
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const raiz = fileURLToPath(new URL('../../', import.meta.url));
const ler = (p) => fs.readFileSync(`${raiz}${p}`, 'utf8');

test('achado 117: não há mais um Link de Ranking solto, de largura total, antes de AbasDoTime', () => {
  const equipa = ler('src/pages/Equipa.jsx');
  // O padrão antigo: Link para /ranking com width 100% e className própria, fora de AbasDoTime.
  assert.doesNotMatch(
    equipa,
    /<Link to=\{`\/time\/\$\{slug\}\/ranking`\} className="btn[^"]*" style=\{\{[^}]*width: '100%'/,
    'o banner solto do ranking tem de ter saído'
  );
});

test('achado 117: o link do Ranking vive DENTRO de AbasDoTime, do mesmo tamanho (flex: 1) das abas', () => {
  const equipa = ler('src/pages/Equipa.jsx');
  const corpo = equipa.slice(equipa.indexOf('function AbasDoTime'), equipa.indexOf('function AbasDoTime') + 2000);
  assert.match(corpo, /role="tablist"/, 'as abas de verdade continuam num tablist');
  assert.match(corpo, /<Link to=\{`\/time\/\$\{slug\}\/ranking`\}/, 'o Ranking mora aqui agora, ao lado das abas');
  assert.doesNotMatch(corpo.slice(corpo.indexOf('<Link')), /role="tab"/, 'o Ranking é navegação, não uma aba — fica fora do role="tab"');
});
