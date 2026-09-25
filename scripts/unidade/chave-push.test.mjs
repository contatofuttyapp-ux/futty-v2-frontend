// Futty v2.0 — COFRE 25-set: o push se cura sozinho quando a chave VAPID do motor muda (lib/chavePush.js).
//
// O que se tranca aqui (Node puro, sem navegador nem rede — as dependências entram como dublês):
//   1. a comparação das chaves é sempre em base64url SEM padding: bytes do browser (ArrayBuffer, Uint8Array, um
//      Buffer com byteOffset) contra o texto do motor (com ou sem "=", em base64 ou base64url) — e só diz "diferem"
//      quando as duas existem;
//   2. a ordem da re-inscrição: cancelar a antiga ANTES de inscrever com a nova (o browser recusa o contrário), e o
//      motor recebe a subscrição NOVA;
//   3. só se mexe em quem JÁ tem subscrição (quem desligou as notificações não é reinscrito), sem chave no motor não
//      se faz nada, e a chave igual só avisa o motor (upsert), sem cancelar nem inscrever;
//   4. uma falha no meio sobe para quem chamou (o hook trata e tenta de novo na próxima montagem).
//
// Uso: npm test  (ou: node --import ./scripts/unidade/registrar.mjs --test scripts/unidade/chave-push.test.mjs)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { paraBase64Url, chavesDiferem, urlBase64ParaBytes, sincronizarSubscricao } from '../../src/lib/chavePush.js';

/** Uma chave pública P-256 não comprimida de mentira: 65 bytes, começa em 0x04 (como a VAPID). */
const chaveP256 = () => Buffer.concat([Buffer.from([0x04]), crypto.randomBytes(64)]);
const emArrayBuffer = (buf) => buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);

test('paraBase64Url: ArrayBuffer, Uint8Array e Buffer (com byteOffset) dão o mesmo texto que o Node', () => {
  const chave = chaveP256();
  const esperado = chave.toString('base64url');
  assert.equal(esperado.length, 87, 'a chave VAPID tem 87 caracteres em base64url');
  assert.equal(paraBase64Url(emArrayBuffer(chave)), esperado);
  assert.equal(paraBase64Url(new Uint8Array(chave)), esperado);
  // Buffer.from de tamanho pequeno nasce de um pool com byteOffset ≠ 0: ler o buffer inteiro do pool erraria a chave
  const doPool = Buffer.from(chave);
  assert.equal(paraBase64Url(doPool), esperado, 'byteOffset/byteLength respeitados');
  assert.equal(paraBase64Url(new DataView(emArrayBuffer(chave))), esperado);
});

test('paraBase64Url: texto em base64 ou base64url, com ou sem "=", vira o mesmo base64url sem padding', () => {
  // bytes que geram + e / no base64 comum
  const bytes = Buffer.from([0xfb, 0xff, 0xfe, 0xfa, 0xfb, 0xef]);
  const comum = bytes.toString('base64'); // "+//++vvv" com + e /
  assert.match(comum, /[+/]/, 'a amostra tem de conter + ou /');
  const url = bytes.toString('base64url');
  assert.equal(paraBase64Url(comum), url);
  assert.equal(paraBase64Url(`${url}==`), url, 'padding sobrando some');
  assert.equal(paraBase64Url(`  ${url}\n`), url, 'espaço em volta some');
});

test('paraBase64Url: vazio, ausente e tipo estranho viram null', () => {
  for (const v of [null, undefined, '', '   ', new ArrayBuffer(0), new Uint8Array(0), 42, {}, []]) {
    assert.equal(paraBase64Url(v), null, `${Object.prototype.toString.call(v)} → null`);
  }
});

test('chavesDiferem: mesma chave (bytes do browser × texto do motor) → false; chave trocada → true', () => {
  const velha = chaveP256();
  const nova = chaveP256();
  assert.equal(chavesDiferem(emArrayBuffer(velha), velha.toString('base64url')), false, 'igual');
  assert.equal(chavesDiferem(emArrayBuffer(velha), velha.toString('base64')), false, 'igual, motor em base64 com padding');
  assert.equal(chavesDiferem(emArrayBuffer(velha), nova.toString('base64url')), true, 'VAPID trocado');
  const umByteDiferente = Buffer.from(velha);
  umByteDiferente[64] ^= 0x01;
  assert.equal(chavesDiferem(emArrayBuffer(velha), umByteDiferente.toString('base64url')), true, 'um bit basta');
});

test('chavesDiferem: sem uma das duas chaves não dá para saber → false (não se refaz à toa)', () => {
  const chave = chaveP256();
  assert.equal(chavesDiferem(null, chave.toString('base64url')), false, 'browser que não expõe a chave da subscrição');
  assert.equal(chavesDiferem(undefined, chave.toString('base64url')), false);
  assert.equal(chavesDiferem(emArrayBuffer(chave), null), false, 'motor sem chave');
  assert.equal(chavesDiferem(emArrayBuffer(chave), ''), false);
});

test('urlBase64ParaBytes: ida e volta com e sem padding faltando (64, 65 e 66 bytes)', () => {
  for (const n of [64, 65, 66]) {
    const bytes = crypto.randomBytes(n);
    const volta = urlBase64ParaBytes(bytes.toString('base64url'));
    assert.ok(volta instanceof Uint8Array);
    assert.deepEqual(Buffer.from(volta), bytes, `${n} bytes`);
  }
});

/** Um dublê de PushSubscription que registra as chamadas, na ordem, num diário compartilhado. */
function subscricao(rotulo, diario, chave) {
  return {
    rotulo,
    endpoint: `https://fcm.googleapis.com/fcm/send/${rotulo}`,
    options: { applicationServerKey: chave ? emArrayBuffer(chave) : null },
    unsubscribe: async () => { diario.push(`unsubscribe(${rotulo})`); return true; },
  };
}

test('sincronizarSubscricao: chave trocada → cancela a antiga, inscreve com a nova e avisa o motor com a NOVA (nessa ordem)', async () => {
  const velha = chaveP256();
  const nova = chaveP256();
  const diario = [];
  const antiga = subscricao('antiga', diario, velha);
  const recemFeita = subscricao('nova', diario, nova);
  const r = await sincronizarSubscricao({
    subscricaoAtual: async () => { diario.push('subscricaoAtual'); return antiga; },
    chaveDoMotor: async () => { diario.push('chaveDoMotor'); return nova.toString('base64url'); },
    inscrever: async (chave) => {
      diario.push('inscrever');
      assert.deepEqual(Buffer.from(chave), nova, 'inscreve com os bytes da chave NOVA');
      return recemFeita;
    },
    avisarMotor: async (sub) => { diario.push(`avisarMotor(${sub.rotulo})`); },
  });
  assert.equal(r, 'refeita');
  assert.deepEqual(diario, ['subscricaoAtual', 'chaveDoMotor', 'unsubscribe(antiga)', 'inscrever', 'avisarMotor(nova)']);
});

test('sincronizarSubscricao: sem subscrição (quem desligou as notificações) não faz nada — nem sequer pergunta a chave', async () => {
  const diario = [];
  const r = await sincronizarSubscricao({
    subscricaoAtual: async () => { diario.push('subscricaoAtual'); return null; },
    chaveDoMotor: async () => { diario.push('chaveDoMotor'); return 'x'; },
    inscrever: async () => { diario.push('inscrever'); },
    avisarMotor: async () => { diario.push('avisarMotor'); },
  });
  assert.equal(r, 'sem-subscricao');
  assert.deepEqual(diario, ['subscricaoAtual']);
});

test('sincronizarSubscricao: motor sem chave (push desligado no servidor) não mexe em nada', async () => {
  const diario = [];
  const antiga = subscricao('antiga', diario, chaveP256());
  const r = await sincronizarSubscricao({
    subscricaoAtual: async () => antiga,
    chaveDoMotor: async () => null,
    inscrever: async () => { diario.push('inscrever'); },
    avisarMotor: async () => { diario.push('avisarMotor'); },
  });
  assert.equal(r, 'sem-chave');
  assert.deepEqual(diario, [], 'nem cancelou, nem inscreveu, nem avisou');
});

test('sincronizarSubscricao: chave igual só avisa o motor (upsert cura a linha apagada do lado dele), sem cancelar nem inscrever', async () => {
  const chave = chaveP256();
  const diario = [];
  const viva = subscricao('viva', diario, chave);
  const r = await sincronizarSubscricao({
    subscricaoAtual: async () => viva,
    chaveDoMotor: async () => chave.toString('base64url'),
    inscrever: async () => { diario.push('inscrever'); },
    avisarMotor: async (sub) => { diario.push(`avisarMotor(${sub.rotulo})`); },
  });
  assert.equal(r, 'igual');
  assert.deepEqual(diario, ['avisarMotor(viva)']);
});

test('sincronizarSubscricao: browser que não expõe a chave da subscrição → trata como igual (não refaz à toa)', async () => {
  const diario = [];
  const semChave = subscricao('semchave', diario, null);
  const r = await sincronizarSubscricao({
    subscricaoAtual: async () => semChave,
    chaveDoMotor: async () => chaveP256().toString('base64url'),
    inscrever: async () => { diario.push('inscrever'); },
    avisarMotor: async (sub) => { diario.push(`avisarMotor(${sub.rotulo})`); },
  });
  assert.equal(r, 'igual');
  assert.deepEqual(diario, ['avisarMotor(semchave)']);
});

test('sincronizarSubscricao: falha no meio sobe para quem chamou e o motor não recebe subscrição nenhuma', async () => {
  const velha = chaveP256();
  const nova = chaveP256();
  const diario = [];
  await assert.rejects(
    sincronizarSubscricao({
      subscricaoAtual: async () => subscricao('antiga', diario, velha),
      chaveDoMotor: async () => nova.toString('base64url'),
      inscrever: async () => { throw new Error('push service fora do ar'); },
      avisarMotor: async () => { diario.push('avisarMotor'); },
    }),
    /push service fora do ar/,
  );
  assert.deepEqual(diario, ['unsubscribe(antiga)'], 'cancelou a antiga, não conseguiu inscrever e NÃO avisou o motor');
});
