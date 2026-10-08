// Futty v2.0 — Rodada 30A: o palpite pelo nome do avatarGenericoUrl (src/utils/avatarGenerico.js).
// Sem campo "sexo" (decisão do dono): escolha da pessoa > palpite pelo primeiro nome > hash do id.
//
// Uso: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  avatarGenericoUrl, AVATARES_GENERICOS_FEM, AVATARES_GENERICOS_MASC,
} from '../../src/utils/avatarGenerico.js';
import { carregarNomesFemininos } from '../../src/utils/nomesFemininos.js';

const ehFem = (url) => AVATARES_GENERICOS_FEM.some((a) => a.url === url);
const ehMasc = (url) => AVATARES_GENERICOS_MASC.some((a) => a.url === url);

test('escolha válida da pessoa vence sempre, mesmo com nome que apontaria para o outro grupo', () => {
  assert.equal(avatarGenericoUrl('u1', 'f2', 'Zé'), AVATARES_GENERICOS_FEM[1].url);
  assert.equal(avatarGenericoUrl('u1', 'm3', 'Mariana'), AVATARES_GENERICOS_MASC[2].url);
});

test('escolha invalida (chave que não existe) cai no palpite pelo nome, não quebra', () => {
  assert.ok(ehFem(avatarGenericoUrl('u1', 'xyz', 'Mariana')));
});

test('palpite pelo primeiro nome: "Mariana" e "Ana Paula" caem no grupo feminino', () => {
  assert.ok(ehFem(avatarGenericoUrl('u1', null, 'Mariana')));
  assert.ok(ehFem(avatarGenericoUrl('u2', null, 'Ana Paula')));
  assert.ok(ehFem(avatarGenericoUrl('u3', null, 'ana')), 'minúsculas também');
  assert.ok(ehFem(avatarGenericoUrl('u4', null, 'MÁRCIA')), 'maiúsculas/acento também');
});

test('palpite pelo primeiro nome: "Zé" (fora da lista) cai no grupo masculino', () => {
  assert.ok(ehMasc(avatarGenericoUrl('u1', null, 'Zé')));
  assert.ok(ehMasc(avatarGenericoUrl('u2', null, 'João Pedro')));
});

test('sem nome nenhum (convidado sem nome, defensivo) cai no masculino — o padrão de sempre', () => {
  assert.ok(ehMasc(avatarGenericoUrl('u1', null, '')));
  assert.ok(ehMasc(avatarGenericoUrl('u1', null, undefined)));
});

test('mesmo id → sempre o mesmo resultado (replay/consistência entre telas)', () => {
  const a = avatarGenericoUrl('user-42', null, 'Mariana');
  const b = avatarGenericoUrl('user-42', null, 'Mariana');
  assert.equal(a, b);
  // ids diferentes no MESMO grupo podem (não têm de) cair em bonecos diferentes — o que importa
  // é que o mesmo id nunca muda; com 3 nomes femininos e poucos ids testados confirma-se só a
  // igualdade acima, não a distribuição.
});

test('convidado sem app (sem id): o hash cai no NOME — mesmo nome, mesmo boneco em todo o sorteio', () => {
  const a = avatarGenericoUrl(null, null, 'Juliana Convidada');
  const b = avatarGenericoUrl(null, null, 'Juliana Convidada');
  assert.equal(a, b);
  assert.ok(ehFem(a));
});

test('dois ids diferentes, mesma escolha, mesmo resultado (a escolha é a fonte única)', () => {
  assert.equal(avatarGenericoUrl('u1', 'f1', 'Qualquer'), avatarGenericoUrl('u2', 'f1', 'Outro Nome'));
});

// Rodada 30C: a lista grande (Brasil + Portugal, ~9 mil nomes) chega por import() dinâmico, depois
// do palpite pequeno de sempre. O teste do ANTES/DEPOIS de carregar vive sozinho em
// avatar-generico-lista-grande.test.mjs (processo próprio do `node --test`) — aqui em cima já
// rodaram vários `avatarGenericoUrl(...)`, que disparam o carregamento como efeito colateral; testar
// o estado "antes de carregar" neste mesmo arquivo seria uma corrida (o import pode já ter resolvido).
test('depois de carregar a lista grande: nomes já certos pelo palpite pequeno (Mariana) continuam exatamente iguais (determinismo, sem regressão)', async () => {
  const antes = avatarGenericoUrl('u-mariana', null, 'Mariana');
  await carregarNomesFemininos();
  const depois = avatarGenericoUrl('u-mariana', null, 'Mariana');
  assert.equal(antes, depois);
  assert.ok(ehFem(depois));
});

test('depois de carregar a lista grande: nome masculino (Zé) continua no masculino', async () => {
  await carregarNomesFemininos();
  assert.ok(ehMasc(avatarGenericoUrl('u-ze', null, 'Zé')));
});
