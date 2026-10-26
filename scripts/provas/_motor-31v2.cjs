// Futty v2.0 — o motor FALSO da prova da Rodada 31V-2 (scripts/provas/rodada-31v2.prova.mjs): o motor de VERDADE (server.js, todas as rotas) por cima de
// um banco, um Storage e um Auth de MENTIRA, em memória (backend/tests/_appFalsa.js). O .env do backend aponta para o único banco (o de produção):
// aqui ele nunca é lido, a rede de fora está fechada e o servidor só escuta em 127.0.0.1.
//
// O mundo:
//   · a Missa de Quinta (slug de verdade, missa-de-quinta-ogqq6 — o time protegido): o Chavo (admin, super-admin do Gabinete) e o Wesley;
//   · dois times iguais para o "Associar em todos" (um para cada largura, 390 e 360): o Chavo admin, o Eric (que entrou depois) e 4 jogos que já
//     aconteceram com o convidado "Eric Lopes" — o jogo 1 (onde o admin toca), o 2 e o 3 (mesmo nome, " eric lopes " no 3), o 4 em que o Eric já
//     jogou com a conta (fica de fora) e o 5, com outro nome ("Eric"), que não conta;
//   · as contas do Gabinete: a pessoal do dono, a do revisor das lojas (demo-loja@futtymock.com), o John Apple, as de teste do dono (+teste1,
//     +teste4 sozinho no "Time do Teste 4", +teste5 admin da "Pelada do Teste 5" com a Bia), uma de teste @futtymock.com que pode sair
//     (teste-x@) e a Ana, a Bia e o Caio (para suspender as três).
//
// Protocolo com a prova: uma linha de JSON no stdout quando está pronto ({ pronto, base, ... }); "fim\n" no stdin devolve a última linha (o que o
// motor tentou fazer na rede) e encerra. O resto vai para o stderr.
'use strict';

const path = require('node:path');

const TESTES_DO_MOTOR = path.resolve(__dirname, '..', '..', '..', 'backend', 'tests');
// PRIMEIRO require: o dotenv de mentira e a rede fechada têm de estar de pé antes de qualquer módulo do motor.
const { subirApp, usuario } = require(path.join(TESTES_DO_MOTOR, '_appFalsa.js'));
const { uuid, iso, HORA } = require(path.join(TESTES_DO_MOTOR, '_mundoDeSeguranca.js'));

const fala = (...a) => process.stderr.write(`${a.join(' ')}\n`);
const BANCO = 'https://projeto-falso.supabase.test/storage/v1/object/public';

(async () => {
  const app = await subirApp();
  const N = 312;

  // quem: [apelido, nome completo, e-mail]
  const PESSOAS = {
    adm: ['Chavo, el matador', 'Pedro Borges', 'contatofuttyapp@gmail.com'],
    pessoal: ['Pedro', 'Pedro Borges', 'phferreiraborgesbackup@gmail.com'],
    wesley: ['Wesley', 'Wesley Prado', 'wesley.prado@gmail.com'],
    eric: ['Eric', 'Eric Lopes Ramos', 'eric.lopes@gmail.com'],
    demo: ['Bruninho', 'Demo Loja', 'demo-loja@futtymock.com'],
    apple: ['', 'John Apple', 'k8x2@privaterelay.appleid.com'],
    teste1: ['T1', 'Teste Um', 'phferreiraborgesbackup+teste1@gmail.com'],
    teste4: ['T4', 'Teste Quatro', 'phferreiraborgesbackup+teste4@gmail.com'],
    teste5: ['T5', 'Teste Cinco', 'phferreiraborgesbackup+teste5@gmail.com'],
    ana: ['Ana', 'Ana Souza', 'ana.souza@gmail.com'],
    bia: ['Bia', 'Beatriz Lima', 'bia.lima@gmail.com'],
    caio: ['Caio', 'Caio Mendes', 'caio.mendes@gmail.com'],
    testeX: ['TX', 'Teste X', 'teste-x@futtymock.com'],
  };
  const ids = Object.fromEntries(Object.keys(PESSOAS).map((k, i) => [k, uuid(`c${String(i + 1).padStart(2, '0')}`, N)]));
  const U = Object.fromEntries(Object.entries(PESSOAS).map(([k, [apelido, nome, email]]) => [k, { ...usuario(ids[k], apelido || nome), nome, nome_jogador: apelido, email, birthdate: '1990-01-01' }]));
  U.teste4.avatar_url = `${BANCO}/avatars/public/${ids.teste4}-1700000000.jpg`;
  app.reiniciar({ tabelas: {}, usuarios: Object.values(U), superAdmins: [U.adm.id] });
  app.criarBucketsDoProjeto();
  // O Auth de mentira só anota o deleteUser; no Supabase, apagar a conta do Auth apaga em cascata a linha de users e o que aponta para ela.
  const apagarDoAuth = app.cliente.auth.admin.deleteUser;
  app.cliente.auth.admin.deleteUser = async (id) => {
    const r = await apagarDoAuth(id);
    for (const [tabela, coluna] of [['users', 'id'], ['team_members', 'user_id'], ['game_players', 'user_id']]) {
      if (app.tabelas[tabela]) app.tabelas[tabela] = app.tabelas[tabela].filter((l) => l[coluna] !== id);
    }
    return r;
  };
  app.storage.buckets.get('avatars').arquivos.set(`public/${ids.teste4}-1700000000.jpg`, { corpo: Buffer.from('foto'), tipo: 'image/jpeg', em: new Date().toISOString() });
  for (const u of Object.values(U)) {
    const { data } = await app.cliente.auth.getUser(app.token(u.id));
    data.user.user_metadata.onboarding_completo = true;
    data.user.email = u.email;
  }

  const chamar = async (quem, metodo, rota, corpo) => {
    const r = await app.pedir(metodo, rota, { token: app.token(U[quem].id), corpo });
    const ok = r.status < 400;
    fala(`${ok ? 'ok  ' : 'ERRO'} ${r.status} ${quem.padEnd(7)} ${metodo.padEnd(6)} ${rota}${ok ? '' : ` — ${String(r.json?.error || r.texto).slice(0, 160)}`}`);
    if (!ok) throw new Error(`${metodo} ${rota} → ${r.status}`);
    return r;
  };
  const conviteDe = async (quem, slug) => {
    const conv = await chamar(quem, 'POST', `/api/teams/${slug}/convite`, {});
    return conv.json?.token || conv.json?.convite?.token;
  };

  // ── A Missa de Quinta (o time protegido): o slug de verdade ──
  const missa = (await chamar('adm', 'POST', '/api/teams', { nome: 'Missa de Quinta', publica: false, cor: 'roxo' })).json.team;
  const linhaMissa = app.tabelas.teams.find((t) => t.id === missa.id);
  linhaMissa.slug = 'missa-de-quinta-ogqq6';
  await chamar('wesley', 'POST', `/api/convite/${await conviteDe('adm', linhaMissa.slug)}/aceitar`, {});

  // ── Os times das contas de teste ──
  const t4 = (await chamar('teste4', 'POST', '/api/teams', { nome: 'Time do Teste 4', publica: false, cor: 'azul' })).json.team;
  const t5 = (await chamar('teste5', 'POST', '/api/teams', { nome: 'Pelada do Teste 5', publica: false, cor: 'verde' })).json.team;
  await chamar('bia', 'POST', `/api/convite/${await conviteDe('teste5', t5.slug)}/aceitar`, {});

  // ── Dois times iguais para o "Associar em todos" (um por largura) ──
  const conv = (nome) => ({ user_id: null, convidado: true, nome, avatar_url: null, rating: 3, goleiro: false, cabeca_chave: false });
  const contaNoJogo = (k) => ({ user_id: U[k].id, nome: U[k].nome_jogador, avatar_url: null, rating: 3, goleiro: false, cabeca_chave: false });
  const quintas = {};
  for (const largura of [390, 360]) {
    const T = (await chamar('adm', 'POST', '/api/teams', { nome: `Quinta ${largura}`, publica: false, cor: 'verde' })).json.team;
    await chamar('eric', 'POST', `/api/convite/${await conviteDe('adm', T.slug)}/aceitar`, {});
    const montar = [
      [[contaNoJogo('adm'), conv('Eric Lopes')], [conv('Igor'), conv('Kim')]], // 1: onde o admin toca
      [[conv('Igor'), conv('Gui')], [conv('Eric Lopes'), conv('MT')]], // 2
      [[conv(' eric lopes '), conv('PJ')], [conv('Igor'), conv('Marcos')]], // 3: mesmo nome, outra caixa
      [[conv('Eric Lopes'), contaNoJogo('eric')], [conv('Kim'), conv('Wes')]], // 4: o Eric já está nele → fica de fora
      [[conv('Eric'), conv('Gui')], [conv('Kim'), conv('Igor')]], // 5: outro nome → não conta
    ];
    const jogos = [];
    for (let i = 0; i < montar.length; i += 1) {
      const g = (await chamar('adm', 'POST', '/api/games', { team_slug: T.slug, data: iso((48 + i) * HORA), jogadores_por_time: 2, local: 'Urban Soccer' })).json;
      const G = g.game || g;
      const linha = app.tabelas.games.find((x) => x.id === G.id);
      Object.assign(linha, {
        data: iso(-(24 * 7 * (i + 1)) * HORA),
        times_resultado: { seed: 1, num_times: 2, times: montar[i].map((js, k) => ({ nome: k ? 'Time Roxo' : 'Time Ouro', jogadores: js })), reservas: [], registro: { origem: 'sorteio', ajustes: [] } },
        num_times: 2, sorteio_realizado: true, campeao_time_index: 0, resultado_nivel: 1,
      });
      jogos.push(G.id);
    }
    quintas[largura] = { id: T.id, slug: T.slug, jogos };
  }

  const saida = {
    pronto: true,
    base: app.base,
    tokens: Object.fromEntries(Object.entries(U).map(([k, u]) => [k, app.token(u.id)])),
    pessoas: Object.fromEntries(Object.entries(U).map(([k, u]) => [k, { id: u.id, apelido: u.nome_jogador, nome: u.nome, email: u.email }])),
    missa: { id: missa.id, slug: linhaMissa.slug }, t4: { id: t4.id, slug: t4.slug }, t5: { id: t5.id, slug: t5.slug },
    quintas,
  };
  process.stdout.write(`${JSON.stringify(saida)}\n`);

  // A prova pergunta ao motor o que só o banco sabe (os times que sobraram, as contas, o Storage): "estado\n" devolve uma linha {"estado": …}.
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', (d) => {
    const s = String(d);
    if (s.includes('estado')) {
      const estado = {
        teams: app.tabelas.teams.map((t) => ({ id: t.id, slug: t.slug, criado_por: t.criado_por })),
        membros: app.tabelas.team_members.map((m) => ({ team_id: m.team_id, user_id: m.user_id, role: m.role })),
        auth_apagados: app.chamadasAdmin.filter((c) => c[0] === 'deleteUser').map((c) => c[1]),
        avatars: [...app.storage.buckets.get('avatars').arquivos.keys()],
        suspensoes: (() => { const a = app.storage.buckets.get('denuncias').arquivos.get('_plataforma/suspensoes.json'); return a ? JSON.parse(a.corpo.toString('utf8')) : null; })(),
      };
      process.stdout.write(`${JSON.stringify({ estado })}\n`);
    }
    if (s.includes('fim')) process.stdout.write(`${JSON.stringify({ rede: app.tentativasDeRede })}\n`, () => process.exit(0));
  });
  process.stdin.on('end', () => process.exit(0));
})().catch((e) => { process.stderr.write(`[motor-31v2] ${e.stack || e.message}\n`); process.exit(1); });
