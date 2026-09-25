// Futty v2.0 — RODADA 28 (bloco B): "Sair" só deste aparelho e 401 → login (lib/api.js + lib/sessao.js).
//
// O que se tranca aqui (sem browser, sem rede — fetch e Supabase de mentira):
//   1. "Sair" chama signOut({ scope: 'local' }) — e nenhum signOut do app sai sem scope 'local'
//      (varredura do src/: quem voltar ao signOut() global reprova aqui);
//   2. 401 do motor: renova UMA vez e repete o pedido com o token novo; se o motor recusar de novo,
//      sai deste aparelho; renovação recusada pelo Supabase → sai; rede fora → NINGUÉM sai;
//   3. 503 (Supabase Auth fora do ar, motor não sabe) não é 401: ninguém é deslogado;
//   4. pedidos simultâneos com 401 dividem UMA renovação; o upload (FormData) segue as mesmas regras.
//
// Uso: npm test
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

globalThis.__FUTTY_ENV__ = { PROD: false, VITE_API_URL: 'http://motor.teste' };

// ── Supabase de mentira ──────────────────────────────────────────────────────
const supa = {
  token: 'token-velho',
  refresh: null, // () => ({ data, error })
  saidas: [],
  renovacoes: 0,
  auth: {
    getSession: async () => ({ data: { session: supa.token ? { access_token: supa.token } : null } }),
    refreshSession: async () => {
      supa.renovacoes += 1;
      await new Promise((r) => setTimeout(r, 5));
      return supa.refresh();
    },
    signOut: async (opcoes) => {
      supa.saidas.push(opcoes);
      supa.token = null;
      return { error: null };
    },
  },
};
globalThis.__FUTTY_SUPABASE__ = supa;

// ── fetch de mentira: responde pela fila do teste ────────────────────────────
const pedidos = [];
let responder = () => ({ status: 200, corpo: { ok: true } });
globalThis.fetch = async (url, opcoes) => {
  pedidos.push({ url, opcoes });
  const { status, corpo } = responder({ url, opcoes, n: pedidos.length });
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: () => null },
    json: async () => corpo,
  };
};

const { obterSupabase } = await import('../../src/lib/supabaseAsync.js');
const { apiFetch, apiUploadCampos, registrarSessaoInvalida } = await import('../../src/lib/api.js');
const { criarTratador401, sairDesteAparelho } = await import('../../src/lib/sessao.js');

const tokenDo = (p) => p.opcoes.headers?.Authorization || null;

beforeEach(() => {
  pedidos.length = 0;
  supa.token = 'token-velho';
  supa.saidas.length = 0;
  supa.renovacoes = 0;
  supa.refresh = () => ({ data: { session: { access_token: 'token-novo' } }, error: null });
  registrarSessaoInvalida(criarTratador401(obterSupabase));
});

test('"Sair" é só deste aparelho: signOut({ scope: "local" })', async () => {
  await sairDesteAparelho(obterSupabase);
  assert.deepEqual(supa.saidas, [{ scope: 'local' }]);
});

test('nenhum signOut do app sai sem scope "local" (varredura do src/)', () => {
  const raiz = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'src');
  const achados = [];
  const andar = (dir) => {
    for (const nome of fs.readdirSync(dir)) {
      const p = path.join(dir, nome);
      if (fs.statSync(p).isDirectory()) andar(p);
      else if (/\.(jsx?|mjs)$/.test(nome)) {
        const texto = fs.readFileSync(p, 'utf8');
        for (const m of texto.matchAll(/auth\.signOut\(([^)]*)\)/g)) {
          if (!/scope:\s*'local'/.test(m[1])) achados.push(`${path.relative(raiz, p)}: auth.signOut(${m[1]})`);
        }
      }
    }
  };
  andar(raiz);
  assert.deepEqual(achados, [], 'signOut sem scope local derruba a pessoa em TODOS os aparelhos');
});

test('401 → renova uma vez e repete o pedido com o token novo', async () => {
  responder = ({ n }) => (n === 1 ? { status: 401, corpo: { error: 'Sessão inválida.' } } : { status: 200, corpo: { ok: 'depois' } });
  const r = await apiFetch('/api/inicio');
  assert.deepEqual(r, { ok: 'depois' });
  assert.equal(pedidos.length, 2);
  assert.equal(tokenDo(pedidos[0]), 'Bearer token-velho');
  assert.equal(tokenDo(pedidos[1]), 'Bearer token-novo');
  assert.equal(supa.renovacoes, 1);
  assert.deepEqual(supa.saidas, [], 'renovou: ninguém sai');
});

test('401 de novo com o token novo → sai só deste aparelho e o pedido falha com 401', async () => {
  responder = () => ({ status: 401, corpo: { error: 'Sessão inválida.' } });
  await assert.rejects(apiFetch('/api/inicio'), (e) => e.status === 401);
  assert.equal(pedidos.length, 2, 'uma volta a mais, não um laço');
  assert.deepEqual(supa.saidas, [{ scope: 'local' }]);
});

test('Supabase recusa a renovação → sai deste aparelho, sem repetir o pedido', async () => {
  supa.refresh = () => ({ data: { session: null }, error: { name: 'AuthApiError', message: 'Invalid Refresh Token' } });
  responder = () => ({ status: 401, corpo: { error: 'Sessão inválida.' } });
  await assert.rejects(apiFetch('/api/me'), (e) => e.status === 401);
  assert.equal(pedidos.length, 1);
  assert.deepEqual(supa.saidas, [{ scope: 'local' }]);
});

test('rede fora na renovação → ninguém é deslogado', async () => {
  supa.refresh = () => ({ data: { session: null }, error: { name: 'AuthRetryableFetchError', message: 'Failed to fetch' } });
  responder = () => ({ status: 401, corpo: { error: 'Sessão inválida.' } });
  await assert.rejects(apiFetch('/api/me'), (e) => e.status === 401);
  assert.deepEqual(supa.saidas, [], 'um soluço de rede deslogou a pessoa');
});

test('503 AUTH_INDISPONIVEL não é 401: sem renovação, sem saída', async () => {
  responder = () => ({ status: 503, corpo: { error: 'Não deu para confirmar sua sessão agora.', code: 'AUTH_INDISPONIVEL' } });
  await assert.rejects(apiFetch('/api/inicio'), (e) => e.status === 503 && e.code === 'AUTH_INDISPONIVEL');
  assert.equal(supa.renovacoes, 0);
  assert.deepEqual(supa.saidas, []);
});

test('sem sessão nenhuma, 401 não dispara renovação', async () => {
  supa.token = null;
  responder = () => ({ status: 401, corpo: { error: 'Token em falta.' } });
  await assert.rejects(apiFetch('/api/me'), (e) => e.status === 401);
  assert.equal(supa.renovacoes, 0);
});

test('três pedidos com 401 ao mesmo tempo dividem UMA renovação', async () => {
  responder = ({ opcoes }) => (opcoes.headers.Authorization === 'Bearer token-velho' ? { status: 401, corpo: {} } : { status: 200, corpo: { ok: true } });
  const r = await Promise.all([apiFetch('/api/inicio'), apiFetch('/api/teams'), apiFetch('/api/me/selos')]);
  assert.equal(r.length, 3);
  assert.equal(supa.renovacoes, 1, `renovou ${supa.renovacoes} vezes`);
});

test('upload (FormData) segue as mesmas regras e sem Content-Type à mão', async () => {
  responder = ({ n }) => (n === 1 ? { status: 401, corpo: {} } : { status: 200, corpo: { foto_url: 'x' } });
  const r = await apiUploadCampos('/api/me/avatar', { avatar: new Blob(['a'], { type: 'image/jpeg' }) });
  assert.deepEqual(r, { foto_url: 'x' });
  assert.equal(pedidos.length, 2);
  assert.ok(pedidos[1].opcoes.body instanceof FormData);
  assert.equal(pedidos[1].opcoes.headers['Content-Type'], undefined, 'o boundary do multipart é do browser');
  assert.equal(tokenDo(pedidos[1]), 'Bearer token-novo');
});
