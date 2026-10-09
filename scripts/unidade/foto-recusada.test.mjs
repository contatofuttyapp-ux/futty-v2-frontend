// Futty v2.0 — 6-out (decisão do dono): a foto que a bancada recusou. Trava o que a tela da Figurinha FAZ com FOTO_RECUSADA
// (a cabeça cortada nas duas tentativas; o motor barra o pedido seguinte com a mesma foto, sem custo):
//   1. o recado é o do dono, escrito uma única vez (RECADO_FOTO_RECUSADA);
//   2. no overlay do card, FOTO_RECUSADA mostra o recado e o botão "Escolher outra foto" — e NÃO o "Tentar novamente";
//   3. esse botão abre o seletor de foto (o mesmo de "Trocar foto") e não chama a geração de novo;
//   4. na estreia, a falha volta à fase "Adicione uma foto" com o recado, e não ao cromo;
//   5. uma foto nova (ou uma nova geração) limpa o recado da anterior.
//
// Uso: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const aqui = path.dirname(fileURLToPath(import.meta.url));
const src = readFileSync(path.join(aqui, '..', '..', 'src', 'pages', 'Figurinha.jsx'), 'utf8');
const TITULO = 'Essa foto não deu certo';
const CORPO = 'Escolha outra: de frente, com a cabeça e os ombros inteiros aparecendo, sem nada cortado nas bordas.';
const RECADO = `${TITULO}. ${CORPO}`;

/** O corpo de uma função do componente: do `function nome(` até o fecho de nível 2 (`  }`). */
function corpo(nome) {
  const i = src.indexOf(`function ${nome}(`);
  assert.ok(i >= 0, `não achei a função ${nome}`);
  const fim = src.indexOf('\n  }', i);
  return src.slice(i, fim);
}

test('o recado é o do dono (título + corpo, 30H) e está escrito uma única vez', () => {
  assert.ok(src.includes(`titulo: '${TITULO}',`), 'a constante tem o título exato');
  assert.ok(src.includes(`corpo: '${CORPO}',`), 'a constante tem o corpo exato');
  assert.equal(src.split(TITULO).length - 1, 1, 'o título só aparece na constante; as telas usam a constante');
  assert.equal(src.split(CORPO).length - 1, 1, 'o corpo só aparece na constante; as telas usam a constante');
});

test('FOTO_RECUSADA na geração liga a recusa e o estado de erro (sem gerar de novo)', () => {
  const tratar = corpo('tratarFalhaDaGeracao');
  assert.match(tratar, /err\?\.code === 'FOTO_RECUSADA'\) \{[\s\S]*?setFotoRecusada\(true\);[\s\S]*?setErroIA\(true\);/);
  assert.doesNotMatch(tratar, /FOTO_RECUSADA[\s\S]*?gerarAvatarIA\(/, 'a recusa não chama a geração');
});

test('no overlay, FOTO_RECUSADA mostra o recado e o botão de outra foto — antes do estado de erro comum', () => {
  const inicio = src.indexOf('erroIA && fotoRecusada');
  const fim = src.indexOf('      ) : erroIA ? (', inicio);
  assert.ok(inicio > 0 && fim > inicio, 'o ramo da foto recusada vem antes do erro comum');
  const ramo = src.slice(inicio, fim);
  assert.ok(ramo.includes('{RECADO_FOTO_RECUSADA.titulo}'), 'mostra o título do recado');
  assert.ok(ramo.includes('{RECADO_FOTO_RECUSADA.corpo}'), 'mostra o corpo do recado');
  assert.ok(ramo.includes('Escolher outra foto'), 'o botão diz para escolher outra foto');
  assert.ok(ramo.includes('onClick={escolherOutraFoto}'), 'o botão leva à troca de foto');
  assert.doesNotMatch(ramo, /Tentar novamente/, 'não oferece tentar de novo com a mesma foto');
  assert.doesNotMatch(ramo, /gerarAvatarIA/, 'não chama a geração');
});

test('escolherOutraFoto abre o seletor de foto e não gera nada', () => {
  const f = corpo('escolherOutraFoto');
  assert.match(f, /fileRef\.current\?\.click\(\)/);
  assert.doesNotMatch(f, /apiFetch|gerarAvatarIA/);
  assert.match(f, /setFotoRecusada\(false\)/, 'o recado sai quando a pessoa escolhe outra');
});

test('na estreia, FOTO_RECUSADA volta à fase "foto" com o recado; as outras falhas seguem ao cromo', () => {
  assert.match(src, /function faseAposFalhaDaEstreia\(err\) \{\s*return err\?\.code === 'FOTO_RECUSADA' \? 'foto' : 'pronto';\s*\}/);
  assert.match(src, /setEstreiaFase\(falhou \? faseAposFalhaDaEstreia\(falhou\) : 'pronto'\)/, 'o finally da estreia usa a falha');
  assert.match(src, /setEstreiaFase\(\(f\) => \(f === 'gerando' \|\| f === 'foto' \? faseAposFalhaDaEstreia\(err\) : f\)\)/, 'a pintura em segundo plano também');
  const fase = src.indexOf("estreiaFase === 'foto' ? (");
  assert.ok(fase > 0);
  const bloco = src.slice(fase, fase + 900);
  assert.ok(bloco.includes('{fotoRecusada ? RECADO_FOTO_RECUSADA.titulo'), 'o título do h2 vira o do recado quando a foto foi recusada');
  assert.ok(bloco.includes('{fotoRecusada ? RECADO_FOTO_RECUSADA.corpo'), 'o corpo mostra o recado quando a foto foi recusada');
  assert.ok(bloco.includes("onClick={escolherOutraFoto}"), 'e o botão leva à troca de foto');
});

test('uma foto nova ou uma nova geração limpa o recado da anterior', () => {
  assert.match(corpo('subirFoto'), /setFotoRecusada\(false\)/);
  assert.match(corpo('gerarAvatarIA'), /setFotoRecusada\(false\)/);
});
