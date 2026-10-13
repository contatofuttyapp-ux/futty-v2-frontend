// Futty v2.0 — RODADA 31H: todo pedido já identificado ao motor leva o cabeçalho X-Futty-Plataforma (ios | android | web).
//
// O motor usa o cabeçalho só para decidir a vitrine da loja (PAGAMENTOS_PLATAFORMAS); o crédito da compra sai só do webhook do RevenueCat.
// A plataforma vem do Capacitor, que a lê do aparelho (androidBridge no Android, webkit.messageHandlers.bridge no iPhone, nada na web) —
// aqui o "aparelho" é simulado com esses dois globais.
//
// Sem browser, sem rede — fetch e Supabase de mentira. Uso: npm test
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

globalThis.__FUTTY_ENV__ = { PROD: false, VITE_API_URL: 'http://motor.teste' };

const supa = {
  token: 'token',
  auth: {
    getSession: async () => ({ data: { session: supa.token ? { access_token: supa.token } : null } }),
    refreshSession: async () => ({ data: { session: null }, error: null }),
    signOut: async () => ({ error: null }),
  },
};
globalThis.__FUTTY_SUPABASE__ = supa;

const pedidos = [];
globalThis.fetch = async (url, opcoes) => {
  pedidos.push({ url, opcoes });
  return { ok: true, status: 200, headers: { get: () => null }, json: async () => ({ ok: true }) };
};

const { apiFetch, apiUploadCampos } = await import('../../src/lib/api.js');

function noAparelho(plataforma) {
  delete globalThis.androidBridge;
  delete globalThis.webkit;
  if (plataforma === 'android') globalThis.androidBridge = {};
  if (plataforma === 'ios') globalThis.webkit = { messageHandlers: { bridge: {} } };
}

beforeEach(() => {
  pedidos.length = 0;
  supa.token = 'token';
  noAparelho('web');
});

test('o cabeçalho diz a plataforma do aparelho: ios, android e web', async () => {
  for (const plataforma of ['ios', 'android', 'web']) {
    noAparelho(plataforma);
    await apiFetch('/api/inicio');
    assert.equal(pedidos.at(-1).opcoes.headers['X-Futty-Plataforma'], plataforma, plataforma);
  }
});

test('vai em GET, em escrita e no upload (multipart)', async () => {
  noAparelho('android');
  await apiFetch('/api/brilhantes/estado');
  await apiFetch('/api/me', { method: 'PATCH', body: '{}' });
  await apiUploadCampos('/api/me/avatar', { avatar: new Blob(['x']) });
  assert.equal(pedidos.length, 3);
  for (const p of pedidos) {
    assert.equal(p.opcoes.headers['X-Futty-Plataforma'], 'android', p.url);
    assert.ok(p.opcoes.headers.Authorization, 'o cabeçalho vai junto da identificação');
  }
});

test('pedido sem sessão (ninguém identificado) não leva o cabeçalho', async () => {
  supa.token = null;
  await apiFetch('/api/publico');
  assert.equal(pedidos.at(-1).opcoes.headers['X-Futty-Plataforma'], undefined);
});
