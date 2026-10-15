// Futty v2.0 — o motor FALSO da prova da Rodada 31Q (scripts/provas/rodada-31q.prova.mjs): o motor de VERDADE (server.js, todas as rotas) por cima de um
// banco, um Storage e um Auth de MENTIRA, em memória (backend/tests/_appFalsa.js). O .env do backend aponta para o único banco (o de produção): aqui ele
// nunca é lido, a rede de fora está fechada e o servidor só escuta em 127.0.0.1.
//
// O mundo, montado pelas rotas de verdade: o time Várzea FC criado pelo Pedro, que SÓ ORGANIZA; o Magrão e o Zé entram e jogam um jogo (já passado);
// depois do jogo entra o Zeca — 0 jogos. A prova confere que o Zeca aparece no Ranking (no fim, com "—" nos pontos, sem pódio mesmo em 3º), que dá
// para dar nota a ele e que o Pedro não aparece.
//
// Protocolo com a prova: uma linha de JSON no stdout quando está pronto ({ pronto, base, ... }); "fim\n" no stdin devolve a última linha (o que o
// motor tentou fazer na rede) e encerra. O resto do que se diz vai para o stderr.
'use strict';

const path = require('node:path');

const TESTES_DO_MOTOR = path.resolve(__dirname, '..', '..', '..', 'backend', 'tests');
// PRIMEIRO require: o dotenv de mentira e a rede fechada têm de estar de pé antes de qualquer módulo do motor.
const { subirApp, usuario } = require(path.join(TESTES_DO_MOTOR, '_appFalsa.js'));
const { uuid, iso, HORA } = require(path.join(TESTES_DO_MOTOR, '_mundoDeSeguranca.js'));

const fala = (...a) => process.stderr.write(`${a.join(' ')}\n`);

(async () => {
  const app = await subirApp();
  const N = 317;

  const PESSOAS = {
    adm: ['Pedro', 'Pedro Ferreira Borges'], // só organiza
    m1: ['Magrão', 'Marcos Antunes Lopes'],
    m2: ['Zé', 'José Carlos Ribeiro'],
    zeca: ['Zeca', 'Ezequiel Moraes Neto'], // entrou agora: 0 jogos
  };
  const ids = Object.fromEntries(Object.keys(PESSOAS).map((k, i) => [k, uuid(`q${i + 1}`, N)]));
  const U = Object.fromEntries(Object.entries(PESSOAS).map(([k, [apelido, nome]]) => [k, { ...usuario(ids[k], apelido), nome, nome_jogador: apelido, birthdate: '1990-01-01' }]));
  app.reiniciar({ tabelas: {}, usuarios: Object.values(U) });
  app.criarBucketsDoProjeto();
  for (const u of Object.values(U)) {
    const { data } = await app.cliente.auth.getUser(app.token(u.id));
    data.user.user_metadata.onboarding_completo = true;
  }

  const chamar = async (quem, metodo, rota, corpo) => {
    const r = await app.pedir(metodo, rota, { token: app.token(U[quem].id), corpo });
    const ok = r.status < 400;
    fala(`${ok ? 'ok  ' : 'ERRO'} ${r.status} ${quem.padEnd(4)} ${metodo.padEnd(6)} ${rota}${ok ? '' : ` — ${String(r.json?.error || r.texto).slice(0, 160)}`}`);
    if (!ok) throw new Error(`${metodo} ${rota} → ${r.status}`);
    return r;
  };

  for (const [quem, [apelido, nome]] of Object.entries(PESSOAS)) await chamar(quem, 'PATCH', '/api/me', { nome, nome_jogador: apelido });
  const criado = await chamar('adm', 'POST', '/api/teams', { nome: 'Várzea FC', publica: false, cor: 'verde', joga: false });
  const T = criado.json.team;
  const conv = await chamar('adm', 'POST', `/api/teams/${T.slug}/convite`, {});
  const token = conv.json?.token || conv.json?.convite?.token;
  for (const quem of ['m1', 'm2']) await chamar(quem, 'POST', `/api/convite/${token}/aceitar`, {});

  // Um jogo com o Magrão e o Zé, que já aconteceu.
  const jogo = await chamar('adm', 'POST', '/api/games', { team_slug: T.slug, data: iso(48 * HORA), jogadores_por_time: 1, local: 'Quadra do Guará' });
  const G = jogo.json.game || jogo.json;
  for (const quem of ['m1', 'm2']) await chamar(quem, 'POST', `/api/games/${G.id}/confirmar`, { confirmado: true });
  const linha = app.tabelas.games.find((g) => g.id === G.id);
  linha.data = iso(-26 * HORA);
  linha.status = 'terminado';

  // Depois do jogo, o Zeca entra no time.
  await chamar('zeca', 'POST', `/api/convite/${token}/aceitar`, {});

  const saida = {
    pronto: true,
    base: app.base,
    tokens: Object.fromEntries(Object.entries(U).map(([k, u]) => [k, app.token(u.id)])),
    pessoas: Object.fromEntries(Object.entries(U).map(([k, u]) => [k, { id: u.id, apelido: u.nome_jogador, nome: u.nome }])),
    time: { id: T.id, slug: T.slug },
  };
  process.stdout.write(`${JSON.stringify(saida)}\n`);

  process.stdin.setEncoding('utf8');
  process.stdin.on('data', (d) => {
    if (!String(d).includes('fim')) return;
    process.stdout.write(`${JSON.stringify({ rede: app.tentativasDeRede })}\n`, () => process.exit(0));
  });
  process.stdin.on('end', () => process.exit(0));
})().catch((e) => { process.stderr.write(`[motor-31q] ${e.stack || e.message}\n`); process.exit(1); });
