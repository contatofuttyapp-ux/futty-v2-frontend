// Futty v2.0 — o motor FALSO das capturas da revisão da Apple (scripts/capturar-revisao-loja.mjs): o motor de VERDADE (server.js, todas as rotas) por cima
// de um banco, um Storage e um Auth de MENTIRA, em memória (backend/tests/_appFalsa.js). O .env do backend nunca é lido, a rede de fora está fechada e o
// servidor só escuta em 127.0.0.1 — nada daqui toca a produção.
//
// O mundo: o Pedro (admin do time Domingueira FC) é TESTADOR — o e-mail dele está em PAGAMENTOS_TESTERS, então para ele o motor diz `loja_pronta: true` sem
// PAGAMENTOS_ATIVOS —; o Zé é do mesmo time e NÃO é testador (a loja fica fechada para ele). É a regra da Rodada 31B vista pela tela.
//
// Protocolo com o script: uma linha de JSON no stdout quando está pronto ({ pronto, base, ... }); "fim\n" no stdin devolve a última linha (o que o motor
// tentou fazer na rede) e encerra.
'use strict';

const path = require('node:path');

const TESTES_DO_MOTOR = path.resolve(__dirname, '..', '..', '..', 'backend', 'tests');
// PRIMEIRO require: o dotenv de mentira e a rede fechada têm de estar de pé antes de qualquer módulo do motor.
const { subirApp, usuario } = require(path.join(TESTES_DO_MOTOR, '_appFalsa.js'));
const { uuid } = require(path.join(TESTES_DO_MOTOR, '_mundoDeSeguranca.js'));

const fala = (...a) => process.stderr.write(`${a.join(' ')}\n`);

(async () => {
  const app = await subirApp();
  const N = 32;
  const PESSOAS = { adm: ['Pedro', 'Pedro Ferreira Borges'], ze: ['Zé', 'José Carlos Ribeiro'] };
  const ids = { adm: uuid('a1', N), ze: uuid('a2', N) };
  const U = Object.fromEntries(Object.entries(PESSOAS).map(([k, [apelido, nome]]) => [k, { ...usuario(ids[k], apelido), nome, nome_jogador: apelido, birthdate: '1990-01-01' }]));
  app.reiniciar({ tabelas: {}, usuarios: Object.values(U) });
  app.criarBucketsDoProjeto();
  for (const u of Object.values(U)) {
    const { data } = await app.cliente.auth.getUser(app.token(u.id));
    data.user.user_metadata.onboarding_completo = true;
  }

  // A regra da 31B: só o e-mail do Pedro abre a loja; PAGAMENTOS_ATIVOS fica desligado. Lido a cada pedido pelo motor.
  delete process.env.PAGAMENTOS_ATIVOS;
  process.env.PAGAMENTOS_TESTERS = U.adm.email;

  const chamar = async (quem, metodo, rota, corpo) => {
    const r = await app.pedir(metodo, rota, { token: app.token(U[quem].id), corpo });
    const ok = r.status < 400;
    fala(`${ok ? 'ok  ' : 'ERRO'} ${r.status} ${quem.padEnd(4)} ${metodo.padEnd(6)} ${rota}${ok ? '' : ` — ${String(r.json?.error || r.texto).slice(0, 160)}`}`);
    if (!ok) throw new Error(`${metodo} ${rota} → ${r.status}`);
    return r;
  };
  for (const [quem, [apelido, nome]] of Object.entries(PESSOAS)) await chamar(quem, 'PATCH', '/api/me', { nome, nome_jogador: apelido });
  const criado = await chamar('adm', 'POST', '/api/teams', { nome: 'Domingueira FC', publica: false, cor: 'verde' });
  const T = criado.json.team;
  const conv = await chamar('adm', 'POST', `/api/teams/${T.slug}/convite`, {});
  await chamar('ze', 'POST', `/api/convite/${conv.json?.token || conv.json?.convite?.token}/aceitar`, {});

  process.stdout.write(`${JSON.stringify({
    pronto: true,
    base: app.base,
    tokens: Object.fromEntries(Object.entries(U).map(([k, u]) => [k, app.token(u.id)])),
    pessoas: Object.fromEntries(Object.entries(U).map(([k, u]) => [k, { id: u.id, apelido: u.nome_jogador }])),
    time: { id: T.id, slug: T.slug },
  })}\n`);

  process.stdin.setEncoding('utf8');
  process.stdin.on('data', (d) => {
    if (!String(d).includes('fim')) return;
    process.stdout.write(`${JSON.stringify({ rede: app.tentativasDeRede })}\n`, () => process.exit(0));
  });
  process.stdin.on('end', () => process.exit(0));
})().catch((e) => { process.stderr.write(`[motor-loja] ${e.stack || e.message}\n`); process.exit(1); });
