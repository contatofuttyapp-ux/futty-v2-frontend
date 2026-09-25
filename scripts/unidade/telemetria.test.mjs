// Futty v2.0 — RODADA 28 (bloco E): telemetria ANÔNIMA de velocidade (lib/telemetria.js).
//
// O que se tranca aqui (sem browser, sem rede — fetch e navigator de mentira):
//   1. telas e rotas saem do aparelho como PADRÃO — sem slug de time, id, token, e-mail nem número;
//   2. o envio tem SÓ os campos combinados (tela, ms_util, chamadas, versao_app, plataforma, rede,
//      aparelho) — nada de user id, e-mail, token, IP ou id de aparelho, mesmo que existam por perto;
//   3. uma vez por tela por sessão, sem Authorization e sem cookie; tela que nem pintou não vai;
//   4. a faixa de aparelho é genérica ("android-medio"), nunca modelo.
//
// Uso: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';

const enviados = [];
globalThis.fetch = async (url, opcoes) => {
  enviados.push({ url, opcoes });
  return { ok: true, status: 204 };
};

const diag = await import('../../src/lib/diagnostico.js');
const { normalizarRota, montarEnvio, faixaDoAparelho, versaoDoApp } = await import('../../src/lib/telemetria.js');

const CAMPOS = ['aparelho', 'chamadas', 'ms_util', 'plataforma', 'rede', 'tela', 'versao_app'];
const UUID = '5b1c2d3e-aaaa-4bbb-8ccc-0123456789ab';

test('normalizarRota: a mesma regra do motor — nada que identifique alguém ou um time', () => {
  const casos = [
    ['/equipa/missa-de-quinta-ogqq6/ranking', '/equipa/:slug/ranking'],
    ['/equipa/teste-abcde', '/equipa/:slug'],
    [`/equipa/missa/jogador/${UUID}`, '/equipa/:slug/jogador/:id'],
    ['/api/teams/missa-de-quinta-ogqq6/ranking?x=1', '/api/teams/:slug/ranking'],
    [`/p/missa-de-quinta-ogqq6/${UUID}`, '/p/:slug/:id'],
    ['/api/users/joao@exemplo.com', '/api/users/:x'],
    ['/api/media/eyJhbGciOi.xyz', '/api/media/:x'],
    ['/home', '/home'],
  ];
  for (const [de, para] of casos) assert.equal(normalizarRota(de), para, de);
});

test('faixaDoAparelho e versaoDoApp: genéricos, nunca modelo', () => {
  assert.equal(faixaDoAparelho({ plataforma: 'android', memoriaGb: 4 }), 'android-medio');
  assert.equal(faixaDoAparelho({ plataforma: 'android', memoriaGb: 8, nucleos: 2 }), 'android-alto', 'memória manda quando existe');
  assert.equal(faixaDoAparelho({ plataforma: 'ios', nucleos: 6 }), 'ios-medio');
  assert.equal(faixaDoAparelho({ plataforma: 'ios' }), null, 'sem dado nenhum: nada, em vez de chute');
  assert.equal(versaoDoApp({ plataforma: 'ios', infoApp: { version: '1.0.0', build: '34' } }), '1.0.0 (34)');
  assert.equal(versaoDoApp({ plataforma: 'web', versaoWeb: '3f2a1b9' }), 'web 3f2a1b9');
  assert.equal(versaoDoApp({ plataforma: 'android', infoApp: null }), null);
});

test('montarEnvio: só os campos combinados, mesmo com identificadores por perto', () => {
  const nav = {
    rota: `/equipa/missa-de-quinta-ogqq6/jogador/${UUID}`,
    registo: { msPintura: 812.6, rota: 'x', email: 'pessoa@exemplo.com' },
    chamadas: [
      { rota: '/api/teams/missa-de-quinta-ogqq6/jogador/' + UUID, ms: 540.4, motorMs: 120.2, token: 'eyJ.segredo' },
      { rota: '/api/teams/missa-de-quinta-ogqq6/jogador/' + UUID, ms: 300, motorMs: 90 }, // mesmo padrão: fica o pior
      { rota: '/api/me/selos', ms: 210, motorMs: null },
      { rota: 'https://evil.example/x', ms: 5 },
    ],
    userId: 'u-1',
    email: 'pessoa@exemplo.com',
  };
  const envio = montarEnvio(nav, { plataforma: 'android', infoApp: { version: '1.0.0', build: '16' }, conexao: { type: 'wifi' }, memoriaGb: 2, userId: 'u-1', email: 'pessoa@exemplo.com' });
  assert.deepEqual(Object.keys(envio).sort(), CAMPOS);
  assert.deepEqual(envio, {
    tela: '/equipa/:slug/jogador/:id',
    ms_util: 813,
    chamadas: { '/api/teams/:slug/jogador/:id': { ms: 540, motor: 120 }, '/api/me/selos': { ms: 210, motor: null } },
    versao_app: '1.0.0 (16)',
    plataforma: 'android',
    rede: 'wifi',
    aparelho: 'android-baixo',
  });
  const texto = JSON.stringify(envio);
  for (const proibido of ['pessoa@exemplo.com', 'u-1', 'eyJ.segredo', 'missa-de-quinta', UUID]) {
    assert.ok(!texto.includes(proibido), `"${proibido}" saiu do aparelho: ${texto}`);
  }
});

test('montarEnvio: tela que não pintou não vai; no máximo 20 rotas', () => {
  assert.equal(montarEnvio({ rota: '/home', registo: null, chamadas: [] }, { plataforma: 'web' }), null);
  const chamadas = Array.from({ length: 30 }, (_, i) => ({ rota: `/api/rota-${'abcdefghijklmnopqrstuvwxyzab'[i]}${i > 25 ? 'x' : ''}`, ms: i }));
  const envio = montarEnvio({ rota: '/home', registo: { msPintura: 10 }, chamadas }, { plataforma: 'web' });
  assert.ok(Object.keys(envio.chamadas).length <= 20);
});

test('ponta a ponta: uma vez por tela, sem Authorization nem cookie, na troca de rota', async () => {
  enviados.length = 0;
  // /home abre, pinta, chama o motor; depois a pessoa vai para /feed → /home fecha e é enviada.
  diag.marcarNavegacao('/home');
  diag.registarChamada({ rota: '/api/inicio', status: 200, ms: 480, motorMs: 150 });
  diag.registarChamada({ rota: '/api/me/selos', status: 200, ms: 90, motorMs: 30, segundoPlano: true }); // pré-aquecimento: fora
  diag.marcarPintura();
  diag.marcarNavegacao('/feed');
  diag.marcarPintura();
  // de volta ao Início: segunda visita da mesma tela na mesma sessão → não manda de novo
  diag.marcarNavegacao('/home');
  diag.marcarPintura();
  diag.marcarNavegacao('/figurinha');

  assert.equal(enviados.length, 2, `esperava /home e /feed, uma vez cada: ${JSON.stringify(enviados.map((e) => e.opcoes.body))}`);
  const corpos = enviados.map((e) => JSON.parse(e.opcoes.body));
  assert.deepEqual(corpos.map((c) => c.tela), ['/home', '/feed']);
  assert.deepEqual(Object.keys(corpos[0].chamadas), ['/api/inicio'], 'a chamada do pré-aquecimento não é da tela');
  for (const { url, opcoes } of enviados) {
    assert.match(url, /\/api\/telemetria$/);
    assert.equal(opcoes.method, 'POST');
    assert.equal(opcoes.credentials, 'omit');
    const cabecalhos = Object.keys(opcoes.headers).map((h) => h.toLowerCase());
    assert.ok(!cabecalhos.includes('authorization'), 'a telemetria não pode levar a sessão');
  }
});
