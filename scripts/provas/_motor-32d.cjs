// Futty v2.0 — o motor FALSO da prova da Rodada 32D (scripts/provas/rodada-32d.prova.mjs): o motor de VERDADE (server.js, todas as rotas) por cima de um
// banco, um Storage e um Auth de MENTIRA, em memória (backend/tests/_appFalsa.js), como na 32A. O .env do backend aponta para o único banco (o de
// produção): aqui ele nunca é lido, a rede de fora está fechada e o servidor só escuta em 127.0.0.1.
//
// O mundo: um time com 9 contas (o Pedro é o admin), e dois jogos iguais ainda sem sorteio, um para cada largura da prova (390 e 360), 4 por time, com
// as 9 contas confirmadas — a lista de presença é longa o bastante para a página do jogo rolar bem para baixo. Também serve à prova da CSP do site
// (csp-do-site.prova.mjs: o "Sortear" de verdade e, com M32D_CREDITOS=1, o "Gerar" da Figurinha).
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
  const N = 33;

  // quem: [apelido, nome completo]
  const PESSOAS = {
    adm: ['Pedro', 'Pedro Ferreira Borges'],
    m1: ['Fabinho', 'Fábio Nunes Prado'],
    m2: ['Leleco', 'Leandro Costa Lima'],
    m3: ['Juninho', 'Júlio César Moura'],
    m4: ['Careca', 'Carlos Henrique Dias'],
    m5: ['Gabriel', 'Gabriel Costa Ramos'],
    m6: ['Mottinha', 'Rodrigo Motta Freire'],
    m7: ['Miguelito', 'Miguel Santos Rocha'],
    m8: ['Marquinhos', 'Marcos Vinícius Alves'],
  };
  // Um dígito hex depois do "d" (d0…d8): com "d1" e "d10" o uuid() daria o mesmo id.
  const ids = Object.fromEntries(Object.keys(PESSOAS).map((k, i) => [k, uuid(`d${i.toString(16)}`, N)]));
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
  const criado = await chamar('adm', 'POST', '/api/teams', { nome: 'Missa de Quinta', publica: false, cor: 'roxo' });
  const T = criado.json.team;
  const conv = await chamar('adm', 'POST', `/api/teams/${T.slug}/convite`, {});
  const token = conv.json?.token || conv.json?.convite?.token;
  const membros = Object.keys(PESSOAS).filter((q) => q !== 'adm');
  for (const quem of membros) await chamar(quem, 'POST', `/api/convite/${token}/aceitar`, {});

  // M32D_CREDITOS=1 (a prova da CSP do site): o Pedro tem foto e 3 gerações da Minha Figurinha — a Figurinha mostra "Gerar minha figurinha".
  if (process.env.M32D_CREDITOS === '1') {
    const foto = `https://projeto-falso.supabase.test/storage/v1/object/public/avatars/${U.adm.id}.webp`;
    Object.assign(app.tabelas.users.find((x) => x.id === U.adm.id), { brilhante_creditos: 3, avatar_url: foto, foto_url: foto });
  }

  const jogos = [];
  for (let i = 0; i < 2; i += 1) {
    const jogo = await chamar('adm', 'POST', '/api/games', { team_slug: T.slug, data: iso((48 + i) * HORA), jogadores_por_time: 4, local: 'Quadra da Missa' });
    const G = jogo.json.game || jogo.json;
    for (const quem of Object.keys(PESSOAS)) await chamar(quem, 'POST', `/api/games/${G.id}/confirmar`, { confirmado: true });
    jogos.push(G.id);
  }

  const saida = {
    pronto: true,
    base: app.base,
    tokens: Object.fromEntries(Object.entries(U).map(([k, u]) => [k, app.token(u.id)])),
    pessoas: Object.fromEntries(Object.entries(U).map(([k, u]) => [k, { id: u.id, apelido: u.nome_jogador, nome: u.nome }])),
    time: { id: T.id, slug: T.slug },
    jogos,
  };
  process.stdout.write(`${JSON.stringify(saida)}\n`);

  process.stdin.setEncoding('utf8');
  process.stdin.on('data', (d) => {
    if (!String(d).includes('fim')) return;
    process.stdout.write(`${JSON.stringify({ rede: app.tentativasDeRede })}\n`, () => process.exit(0));
  });
  process.stdin.on('end', () => process.exit(0));
})().catch((e) => { process.stderr.write(`[motor-32d] ${e.stack || e.message}\n`); process.exit(1); });
