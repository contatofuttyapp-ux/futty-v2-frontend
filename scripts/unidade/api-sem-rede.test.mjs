// Futty v2.0 — RODADA 29G: a rede caiu → a mensagem da casa, nunca a crua do navegador (lib/api.js).
//
// O `fetch` rejeita ANTES de haver resposta quando falta rede, o DNS não resolve ou o servidor nem
// atende; o navegador põe a frase dele ("Load failed" no WebKit/iPhone, "Failed to fetch" no Chrome,
// "NetworkError…" no Firefox) e ela ia direto para a tela. Aqui o `apiFetch` e o upload devolvem
// "Sem internet agora. Tente de novo." com code 'SEM_REDE', e o upload de foto continua com a frase
// dele ("Sem conexão…", utils/uploadErro.js).
//
// Sem browser, sem rede — fetch e Supabase de mentira. Uso: npm test
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

globalThis.__FUTTY_ENV__ = { PROD: false, VITE_API_URL: 'http://motor.teste' };

const supa = {
  auth: {
    getSession: async () => ({ data: { session: { access_token: 'token' } } }),
    refreshSession: async () => ({ data: { session: null }, error: null }),
    signOut: async () => ({ error: null }),
  },
};
globalThis.__FUTTY_SUPABASE__ = supa;

let rejeitarCom = new TypeError('Load failed');
let chamadas = 0;
globalThis.fetch = async () => {
  chamadas += 1;
  throw rejeitarCom;
};

const { apiFetch, apiUploadCampos, MSG_SEM_REDE } = await import('../../src/lib/api.js');
const { mensagemUploadFoto } = await import('../../src/utils/uploadErro.js');

beforeEach(() => {
  chamadas = 0;
  rejeitarCom = new TypeError('Load failed');
});

test('a frase da casa é "Sem internet agora. Tente de novo."', () => {
  assert.equal(MSG_SEM_REDE, 'Sem internet agora. Tente de novo.');
});

test('"Load failed" (WebKit) vira a frase da casa, com code SEM_REDE', async () => {
  await assert.rejects(apiFetch('/api/me'), (e) => {
    assert.equal(e.message, 'Sem internet agora. Tente de novo.');
    assert.equal(e.code, 'SEM_REDE');
    assert.doesNotMatch(e.message, /load failed/i);
    return true;
  });
  assert.equal(chamadas, 1, 'sem rede não repete nem fica em laço');
});

test('"Failed to fetch" (Chrome) e "NetworkError…" (Firefox) também', async () => {
  for (const cru of ['Failed to fetch', 'NetworkError when attempting to fetch resource.']) {
    rejeitarCom = new TypeError(cru);
    await assert.rejects(apiFetch('/api/inicio', { method: 'PATCH', body: '{}' }), (e) => e.message === MSG_SEM_REDE && e.code === 'SEM_REDE' && !/fetch|network/i.test(e.message));
  }
});

test('o upload (multipart) segue a mesma regra', async () => {
  await assert.rejects(apiUploadCampos('/api/me/avatar', { avatar: new Blob(['x']) }), (e) => e.message === MSG_SEM_REDE && e.code === 'SEM_REDE');
});

test('resposta do motor (4xx/5xx) NÃO é falha de rede: mantém a mensagem do motor', async () => {
  globalThis.fetch = async () => ({ ok: false, status: 400, headers: { get: () => null }, json: async () => ({ error: 'Data inválida.', code: 'X' }) });
  await assert.rejects(apiFetch('/api/me'), (e) => e.message === 'Data inválida.' && e.status === 400 && e.code === 'X');
  globalThis.fetch = async () => { chamadas += 1; throw rejeitarCom; };
});

test('a foto que falha por rede continua com a frase do upload ("Sem conexão…") e pode repetir', async () => {
  const erro = await apiFetch('/api/me/avatar', { method: 'POST', body: '{}' }).catch((e) => e);
  assert.deepEqual(mensagemUploadFoto(erro), { texto: 'Sem conexão. Verifique a internet e tente de novo.', podeRepetir: true });
  // e a mensagem crua do navegador, se vier por fora do apiFetch, continua reconhecida
  assert.equal(mensagemUploadFoto(new TypeError('Load failed')).podeRepetir, true);
});
