// Futty v2.0 — Rodada 30I, item 2: o empate é um resultado e vira post na Resenha ("Empate · Ouro 2 × 2 Roxo").
// O motor (backend/tests/empate.test.js) grava e entrega o jogo empatado; aqui a frase do post e a ligação no card.
//
// Uso: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { empateDaResenha, nomeCurtoDoTime } from '../../src/utils/resultadoDoJogo.js';

const RAIZ = fileURLToPath(new URL('../../', import.meta.url));
const ler = (rel) => fs.readFileSync(path.join(RAIZ, rel), 'utf8');

const times = [
  { nome: 'Time A', jogadores: [{ user_id: 'a', nome: 'Magrão' }] },
  { nome: 'Time B', jogadores: [{ user_id: 'b', nome: 'Zé' }] },
];
const jogoEmpatado = (extra = {}) => ({ campeao_time_index: null, time_vencedor: 'empate', placar_a: 2, placar_b: 2, times_resultado: { times }, ...extra });

test('nomeCurtoDoTime: o nome da cor sem o "Time" ("Ouro", "Roxo"); o nome que a equipe escolheu fica como está', () => {
  assert.equal(nomeCurtoDoTime('Time A', 0), 'Ouro');
  assert.equal(nomeCurtoDoTime('Time B', 1), 'Roxo');
  assert.equal(nomeCurtoDoTime('Time Ouro', 0), 'Ouro');
  assert.equal(nomeCurtoDoTime('Os Boleiros', 0), 'Os Boleiros');
});

test('empateDaResenha: "Ouro 2 × 2 Roxo" quando houve placar', () => {
  const e = empateDaResenha(jogoEmpatado());
  assert.equal(e.frase, 'Ouro 2 × 2 Roxo');
  assert.deepEqual(e.times.map((t) => t.nome), ['Ouro', 'Roxo']);
  assert.deepEqual(e.times.map((t) => t.jogadores.length), [1, 1]);
});

test('empateDaResenha: sem placar a frase não inventa número ("Ouro × Roxo"); 0 × 0 é placar de verdade', () => {
  assert.equal(empateDaResenha(jogoEmpatado({ placar_a: null, placar_b: null })).frase, 'Ouro × Roxo');
  assert.equal(empateDaResenha(jogoEmpatado({ placar_a: 0, placar_b: 0 })).frase, 'Ouro 0 × 0 Roxo');
});

test('empateDaResenha: só o jogo empatado — campeão, sem resultado ou sem times não viram "empate"', () => {
  assert.equal(empateDaResenha(jogoEmpatado({ campeao_time_index: 0, time_vencedor: 'A' })), null);
  assert.equal(empateDaResenha(jogoEmpatado({ campeao_time_index: null, time_vencedor: null })), null);
  assert.equal(empateDaResenha(jogoEmpatado({ times_resultado: null })), null);
  assert.equal(empateDaResenha(jogoEmpatado({ times_resultado: { times: [times[0]] } })), null);
  assert.equal(empateDaResenha(null), null);
});

test('Resenha: o card do jogo tem o bloco do empate (ícone lucide, não emoji), no lugar do time campeão, e o partilhar diz o empate', () => {
  const feed = ler('src/pages/Feed.jsx');
  assert.match(feed, /import \{[^}]*Handshake[^}]*\} from 'lucide-react';/);
  assert.match(feed, /const empate = campeao \? null : empateDaResenha\(j\);/);
  assert.match(feed, /data-empate-frase/);
  assert.match(feed, /`Empate · \$\{empate\.frase\}`/);
  assert.match(feed, /\{empate \? \(\s*<div className="feed-cromo-bob">/, 'respira como o bloco do campeão (bob + sway)');
});

test('perfil: jogo sem resultado mostra traço, nunca "E" de empate', () => {
  const perfil = ler('src/pages/JogadorPerfil.jsx');
  assert.match(perfil, /sem: \{ txt: '—'/);
  assert.match(perfil, /RES\[j\.resultado\] \|\| RES\.sem/);
  assert.doesNotMatch(perfil, /RES\[j\.resultado\] \|\| RES\.empate/);
});
