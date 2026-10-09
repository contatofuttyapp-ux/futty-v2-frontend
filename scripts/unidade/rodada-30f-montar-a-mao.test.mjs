// Futty v2.0 — Rodada 30F, item 3: depois de um sorteio com 2 convidados, "Montar à mão" só com gente com conta deixava
// "Convidado Dois" no Time Roxo da TELA DO JOGO — a escalação e o link público mostravam 6 x 6 sem convidado.
//
// O gravado estava certo (tests/registro-do-sorteio.test.js no motor prova isso para o jogo e o link público). Era a tela:
// a lista dos times (DrawnTeams) e a dos gols por jogador (ResultadoEditor) usavam o user_id como key, e todo convidado
// tem null. Com chaves repetidas o React reaproveita a linha errada e deixa uma velha para trás quando o resultado muda
// sem a lista remontar — é o que acontece ao salvar "Montar à mão" e recarregar o jogo. A escalação e o link público
// montam a lista do zero, por isso não mostravam. Prova no navegador: scripts/provas/montar-a-mao-troca.prova.mjs.
//
// Uso: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { corpoDosTimes } from '../../src/utils/timesAMao.js';

const RAIZ = fileURLToPath(new URL('../../', import.meta.url));
const ler = (rel) => fs.readFileSync(path.join(RAIZ, rel), 'utf8');

test('30F-3 · as listas de jogadores do resultado têm key única também para o convidado sem app', () => {
  assert.match(ler('src/components/DrawnTeams.jsx'), /\{time\.jogadores\.map\(\(j, k\) => \(\s*<div className="sorteio-player" key=\{j\.user_id \|\| `convidado:\$\{k\}`\}>/);
  // 30G, item 3: o map ganhou um corpo em bloco (calcula a chaveDoJogador antes do key), mas o key do React continua o mesmo.
  assert.match(ler('src/components/ResultadoEditor.jsx'), /\{jogadores\.map\(\(j, k\) => \{[\s\S]*?<div key=\{j\.user_id \|\| `convidado:\$\{k\}`\}/);
});

test('30F-3 · nenhuma lista de jogadores do RESULTADO volta a usar só o user_id como key', () => {
  for (const arquivo of ['src/components/DrawnTeams.jsx', 'src/components/ResultadoEditor.jsx', 'src/components/TimesEditor.jsx']) {
    assert.doesNotMatch(ler(arquivo), /<(div|Jogador)[^>]*key=\{j\.user_id\}/, arquivo);
  }
});

test('30F-3 · o corpo do "Montar à mão" é só o que foi escolhido na tela (sem herdar convidado do resultado anterior)', () => {
  const pool = [
    { key: 'u:1', user_id: '1', nome: 'Magrão', avatar_url: null, convidado: false },
    { key: 'u:2', user_id: '2', nome: 'Zé', avatar_url: null, convidado: false },
  ];
  const corpo = corpoDosTimes(['Time Ouro', 'Time Roxo'], [['u:1'], ['u:2']], pool);
  assert.deepEqual(corpo, { times: [{ nome: 'Time Ouro', jogadores: [{ user_id: '1', nome: 'Magrão', avatar_url: null, convidado: false }] }, { nome: 'Time Roxo', jogadores: [{ user_id: '2', nome: 'Zé', avatar_url: null, convidado: false }] }] });
  // Os convidados da tela do jogo nascem vazios (não vêm do resultado anterior): o pool do Montar à mão é quem confirmou.
  assert.match(ler('src/pages/Jogo.jsx'), /const \[convidados, setConvidados\] = useState\(\[\]\);/);
});
