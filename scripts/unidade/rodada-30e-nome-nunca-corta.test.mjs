// Futty v2.0 — Rodada 30E, item 1: o nome de uma pessoa nunca é cortado com "…" em lugar nenhum do app.
// O NomeCromo do Início já foi corrigido (rodada 29T, achado 164 — ver rodada-29t.test.mjs) e fica como está.
// Esta rodada achou MAIS SEIS lugares com o mesmo defeito (text-overflow: ellipsis sobre o nome de uma
// pessoa, não de um time nem de um produto): o reserva do banco (sorteio), os gols por jogador, a lista de
// jogadores do admin, o card do próprio jogador na Equipa, o "quem jogou" do Jogo Passado e o cabeçalho do
// Meu Perfil. A correção é sempre a mesma: tira o corte (nowrap + overflow hidden + ellipsis) e deixa o nome
// quebrar em duas linhas (overflowWrap: 'anywhere').
//
// Uso: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = fileURLToPath(new URL('../../', import.meta.url));
const ler = (rel) => fs.readFileSync(path.join(RAIZ, rel), 'utf8');

test('30E-1 · os seis lugares achados na varredura não cortam mais o nome com ellipsis', () => {
  const drawn = ler('src/components/DrawnTeams.jsx');
  assert.match(drawn, /overflowWrap: 'anywhere' \}\}>\{r\.nome\}/, 'reserva do banco: quebra em vez de cortar');
  assert.doesNotMatch(drawn, /textOverflow: 'ellipsis'/);

  const resultadoEditor = ler('src/components/ResultadoEditor.jsx');
  assert.match(resultadoEditor, /overflowWrap: 'anywhere' \}\}>\s*\{j\.nome\}/, 'gols por jogador: quebra em vez de cortar');
  assert.doesNotMatch(resultadoEditor, /textOverflow: 'ellipsis'/);

  const adminPanel = ler('src/pages/AdminPanel.jsx');
  assert.match(adminPanel, /maxWidth: 120, overflowWrap: 'anywhere' \}\}>\{nomeExibicao\(u\)\}/, 'lista de jogadores do admin: quebra em vez de cortar');

  const equipa = ler('src/pages/Equipa.jsx');
  assert.match(equipa, /overflowWrap: 'anywhere' \}\}>\{nomeExibicao\(me\.user\)\}/, 'card do próprio jogador na Equipa: quebra em vez de cortar');

  const jogoPassado = ler('src/pages/JogoPassado.jsx');
  assert.match(jogoPassado, /overflowWrap: 'anywhere' \}\}>\{m\.nome \|\| 'Jogador'\}/, 'quem jogou do Jogo Passado: quebra em vez de cortar');

  const meuPerfil = ler('src/pages/MeuPerfil.jsx');
  assert.match(meuPerfil, /overflowWrap: 'anywhere' \}\}>\{nomeMostrar\}/, 'cabeçalho do Meu Perfil: quebra em vez de cortar');
});

test('30E-1 · o Início mantém a defesa de sempre: o NomeCromo encolhe a fonte, nunca ellipsis de verdade (achado 164 não regride)', () => {
  const inicio = ler('src/pages/Inicio.jsx');
  assert.match(inicio, /const PISO_NOME = 9;/);
  assert.match(inicio, /while \(el\.scrollWidth > el\.clientWidth && f > PISO_NOME\)/);
});

// Varredura de regressão: nenhum "ellipsis" (CSS ou inline) na mesma linha de um token que mostra o nome de
// UMA PESSOA (nomeExibicao, nomeMostrar, nomeCromo, .nome de membro/jogador/reserva). Nome de TIME
// (t.nome, time.nome, campeonato.*), de KIT/FUNDO (k.nome, f.label) ou de PASSO (PASSOS) não contam — só
// pessoa corta feio; time e produto podem ficar numa linha e cortar, é outra conversa (RODADA-30E.md).
const TOKEN_NOME_DE_PESSOA = /nomeExibicao\(|nomeMostrar|nomeCromo|\bm\.nome\b|\br\.nome\b|\bj\.nome\b|\.nome \|\| 'Jogador'/;
// Única exceção viva: o piso teórico do NomeCromo (Inicio.jsx), já coberto pelo teste acima.
const EXCECOES = new Set(['src/pages/Inicio.jsx:295']);

test('30E-1 · varredura: nenhuma outra ocorrência de ellipsis sobre nome de pessoa em src/', () => {
  const achados = [];
  const varrer = (dir) => {
    for (const nome of fs.readdirSync(path.join(RAIZ, dir))) {
      const rel = `${dir}/${nome}`;
      if (fs.statSync(path.join(RAIZ, rel)).isDirectory()) { varrer(rel); continue; }
      if (!/\.(jsx?|css)$/.test(nome)) continue;
      ler(rel).split('\n').forEach((linha, i) => {
        if (/ellipsis/.test(linha) && TOKEN_NOME_DE_PESSOA.test(linha) && !EXCECOES.has(`${rel}:${i + 1}`)) {
          achados.push(`${rel}:${i + 1}`);
        }
      });
    }
  };
  varrer('src');
  assert.deepEqual(achados, []);
});
