// Futty v2.0 — Rodada 30G, item 2: o "· " antes do nome do convidado sem app (aprovado na máquina, c96c532)
// fica onde já existe (cerimônia, cartões, apresentação) e entra também na lista de times da tela do jogo e
// do link público (DrawnTeams), que até aqui não usava. Em toda lista que mostrar pelo menos um convidado,
// uma linha discreta no fim, uma só por lista: "· sem o app" — nenhuma outra explicação, nada quando não há
// convidado. src/utils/marcaConvidado.js é a fonte única; cada surpefície importa de lá.
// Comportamento visual provado no navegador: scripts/provas/selo-do-sorteio.prova.mjs (bloco "convidado").
//
// Uso: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { nomeComPonto, temConvidado, PONTO_CONVIDADO, TEXTO_SEM_O_APP } from '../../src/utils/marcaConvidado.js';

const RAIZ = fileURLToPath(new URL('../../', import.meta.url));
const ler = (rel) => fs.readFileSync(path.join(RAIZ, rel), 'utf8');

const comConta = (nome) => ({ user_id: 'u1', nome });
const convidado = (nome) => ({ user_id: null, convidado: true, nome });

test('30G-2 · nomeComPonto: só o convidado leva o ponto na frente', () => {
  assert.equal(nomeComPonto(comConta('Magrão')), 'Magrão');
  assert.equal(nomeComPonto(convidado('Beto')), `${PONTO_CONVIDADO}Beto`);
  assert.equal(nomeComPonto(convidado('Beto')), '· Beto');
});

test('30G-2 · nomeComPonto: sem nome, o "?" de sempre (ou o default de quem chama)', () => {
  assert.equal(nomeComPonto({ user_id: 'u1' }), '?');
  assert.equal(nomeComPonto({ user_id: null, convidado: true }), '· ?');
  assert.equal(nomeComPonto({ user_id: 'u1' }, 'Jogador'), 'Jogador');
});

test('30G-2 · temConvidado: pelo menos um convidado na lista; lista vazia ou sem convidado, false', () => {
  assert.equal(temConvidado([comConta('Magrão'), convidado('Beto')]), true);
  assert.equal(temConvidado([comConta('Magrão'), comConta('Zé')]), false);
  assert.equal(temConvidado([]), false);
  assert.equal(temConvidado(undefined), false);
  assert.equal(temConvidado(null), false);
});

test('30G-2 · a frase é sempre a mesma, em todo lugar (uma fonte só)', () => {
  assert.equal(TEXTO_SEM_O_APP, '· sem o app');
});

test('30G-2 · DrawnTeams (tela do jogo e link público): o ponto nos times E na reserva, com a linha no fim de cada', () => {
  const drawn = ler('src/components/DrawnTeams.jsx');
  assert.match(drawn, /import \{ nomeComPonto, temConvidado, TEXTO_SEM_O_APP \} from '\.\.\/utils\/marcaConvidado';/);
  assert.match(drawn, /<span>\{nomeComPonto\(j\)\}<\/span>/, 'o nome do jogador, dentro de um time');
  assert.match(drawn, /\{temConvidado\(time\.jogadores\) && <div className="muted"[^>]*>\{TEXTO_SEM_O_APP\}<\/div>\}/, 'a linha no fim do time');
  assert.match(drawn, /\{nomeComPonto\(r\)\}/, 'o nome da reserva');
  assert.match(drawn, /\{temConvidado\(reservas\) && <div className="muted"[^>]*>\{TEXTO_SEM_O_APP\}<\/div>\}/, 'a linha no fim da reserva');
});

test('30G-2 · cerimônia: o ponto já existia (vis()); a linha no fim do grupo e da reserva são novas', () => {
  const cer = ler('src/components/CerimoniaSorteio.jsx');
  assert.match(cer, /import \{ PONTO_CONVIDADO, TEXTO_SEM_O_APP, temConvidado \} from '\.\.\/utils\/marcaConvidado';/);
  assert.match(cer, /nome: \(j\.convidado \? PONTO_CONVIDADO : ''\) \+ \(j\.nome \|\| '\?'\),/);
  assert.match(cer, /const nota = temConvidado\(t\.jogadores\) \? `<div class="conv-nota">\$\{esc\(TEXTO_SEM_O_APP\)\}<\/div>` : '';/);
  assert.match(cer, /\$\{rows\}\$\{nota\}<\/div>`;/);
  assert.match(cer, /q\('\.resv-nota'\)\.textContent = temConvidado\(reservas\) \? TEXTO_SEM_O_APP : '';/);
  assert.match(cer, /<div className="resv-nota" \/>/);
});

test('30G-2 · apresentação (TimesEmCartoes, usado também no passo do ajuste): o ponto e a linha, por caixa', () => {
  const cartoes = ler('src/components/TimesEmCartoes.jsx');
  assert.match(cartoes, /import \{ nomeComPonto, temConvidado, TEXTO_SEM_O_APP \} from '\.\.\/utils\/marcaConvidado';/);
  assert.match(cartoes, /\{nomeComPonto\(j, 'Jogador'\)\}/);
  assert.match(cartoes, /\{temConvidado\(jogadores\) && \(/);
  assert.match(cartoes, /\{TEXTO_SEM_O_APP\}/);
});

test('30G-2 · cartões em canvas (9:16 e cartaz): o ponto já existia; a linha nova entra na altura reservada da seção', () => {
  const cartao = ler('src/utils/sorteioCartao.js');
  assert.match(cartao, /import \{ PONTO_CONVIDADO, TEXTO_SEM_O_APP, temConvidado \} from '\.\/marcaConvidado';/);
  assert.match(cartao, /function desenharNotaConvidado\(cx, W, y\) \{/);
  assert.match(cartao, /\(j\.convidado \? PONTO_CONVIDADO : ''\) \+ \(j\.nome \|\| '\?'\) \+ marca/, 'o 9:16');
  assert.match(cartao, /\(j\.convidado \? PONTO_CONVIDADO : ''\) \+ \(j\.nome \|\| '\?'\), j\._img/, 'o cartaz');
  assert.match(cartao, /if \(temConvidado\(jogs\)\) \{/, 'o 9:16 desenha a nota');
  assert.match(cartao, /s\.temConv = temConvidado\(s\.jogs\);/, 'o cartaz calcula por seção, para a altura (space-evenly) contar com a linha');
  assert.match(cartao, /s\.h = L\.hs \+ 18 \+ s\.linhas\.length \* cardH \+ \(s\.linhas\.length - 1\) \* rowGap \+ \(s\.temConv \? ALTURA_NOTA_CONVIDADO : 0\);/);
  assert.match(cartao, /if \(s\.temConv\) desenharNotaConvidado\(cx, W, ry - rowGap \+ 24\);/);
});
