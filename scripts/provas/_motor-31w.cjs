// Futty v2.0 — o motor FALSO da prova da Rodada 31W (scripts/provas/rodada-31w.prova.mjs): o motor de VERDADE (server.js, todas as rotas) por cima de um
// banco, um Storage e um Auth de MENTIRA, em memória (backend/tests/_appFalsa.js). O .env do backend aponta para o único banco (o de produção): aqui ele
// nunca é lido, a rede de fora está fechada e o servidor só escuta em 127.0.0.1.
//
// O mundo, DEPOIS da migração 086: a Missa de Quinta com 8 jogadores e os votos antigos convertidos (estrelas × 2 em `nota10`, a coluna antiga espelhada).
//   · Eric: 4 · 4,5 · 3,5 · 4 estrelas → 8 · 9 · 7 · 8 = nota 8 (o Chavo deu 4 estrelas = 8)
//   · Kim: 3,5 · 4 · 4 → 7 · 8 · 8 = 7,7      · Wesley: 5 · 4,5 · 5 → 9,7      · Carla: 3 · 2,5 · 3 → 5,7      · Chavo: 4 · 4 · 4,5 → 8,3
//   · Tiago: 2 votos (sem nota) · Igor e Jefim: nenhum voto (sem nota)
// Os jogos: o de 3 dias atrás TERMINADO (sorteio antigo, gravado em estrelas, sem a marca escala_nota; 3 × 1 para o Time Ouro; um convidado sem app no
// time), o de ontem SEM RESULTADO (terminado pelas 2 horas), um EM ANDAMENTO (começou há 40 min, times sorteados) e um FUTURO (daqui a 2 dias).
//
// Protocolo com a prova: uma linha de JSON no stdout quando está pronto ({ pronto, base, ... }); "fim\n" no stdin devolve a última linha (o que o motor
// tentou fazer na rede) e encerra.
'use strict';

const path = require('node:path');

const BACKEND = process.env.R31W_BACKEND || path.resolve(__dirname, '..', '..', '..', 'backend');
const TESTES_DO_MOTOR = path.join(BACKEND, 'tests');
// PRIMEIRO require: o dotenv de mentira e a rede fechada têm de estar de pé antes de qualquer módulo do motor.
const { subirApp, usuario } = require(path.join(TESTES_DO_MOTOR, '_appFalsa.js'));
const { uuid } = require(path.join(TESTES_DO_MOTOR, '_mundoDeSeguranca.js'));

const fala = (...a) => process.stderr.write(`${a.join(' ')}\n`);
const HORA = 3600 * 1000;
const iso = (ms) => new Date(Date.now() + ms).toISOString();

(async () => {
  const app = await subirApp();
  const N = 61;
  const PESSOAS = {
    chavo: ['Chavo, el matador', 'Pedro Borges'],
    eric: ['Eric Lopes', 'Eric Lopes Andrade'],
    kim: ['Kim', 'Joaquim Ribeiro'],
    wes: ['Wesley', 'Wesley Prado'],
    tiago: ['Tiago', 'Tiago Moura'],
    carla: ['Carla', 'Carla Nunes'],
    igor: ['Igor', 'Igor Teles'],
    jefim: ['Jefim', 'Jefferson Lima'],
  };
  const ids = Object.fromEntries(Object.keys(PESSOAS).map((k, i) => [k, uuid(`c${i + 1}`, N)]));
  const U = Object.fromEntries(Object.entries(PESSOAS).map(([k, [apelido, nome]]) => [k, { ...usuario(ids[k], apelido), nome, nome_jogador: apelido, birthdate: '1990-01-01', avatar_url: null }]));
  app.reiniciar({ tabelas: {}, usuarios: Object.values(U) });
  app.criarBucketsDoProjeto();
  for (const u of Object.values(U)) {
    const { data } = await app.cliente.auth.getUser(app.token(u.id));
    data.user.user_metadata.onboarding_completo = true;
  }

  const chamar = async (quem, metodo, rota, corpo) => {
    const r = await app.pedir(metodo, rota, { token: app.token(U[quem].id), corpo, cabecalhos: { 'x-futty-nota': '10' } });
    const ok = r.status < 400;
    fala(`${ok ? 'ok  ' : 'ERRO'} ${r.status} ${quem.padEnd(6)} ${metodo.padEnd(6)} ${rota}${ok ? '' : ` — ${String(r.json?.error || r.texto).slice(0, 160)}`}`);
    if (!ok) throw new Error(`${metodo} ${rota} → ${r.status}`);
    return r;
  };
  for (const [quem, [apelido, nome]] of Object.entries(PESSOAS)) await chamar(quem, 'PATCH', '/api/me', { nome, nome_jogador: apelido });

  const r = await chamar('chavo', 'POST', '/api/teams', { nome: 'Missa de Quinta', publica: false, cor: 'verde' });
  const MISSA = r.json.team;
  const conv = await chamar('chavo', 'POST', `/api/teams/${MISSA.slug}/convite`, {});
  for (const quem of Object.keys(PESSOAS).filter((k) => k !== 'chavo')) await chamar(quem, 'POST', `/api/convite/${conv.json?.token || conv.json?.convite?.token}/aceitar`, {});

  // ── Os votos antigos, como a migração 086 os deixa: a coluna antiga (estrelas) e a nova (× 2). ──
  const ESTRELAS = {
    eric: [['chavo', 4], ['kim', 4.5], ['wes', 3.5], ['carla', 4]],
    kim: [['eric', 3.5], ['wes', 4], ['carla', 4]],
    wes: [['eric', 5], ['kim', 4.5], ['carla', 5]],
    carla: [['eric', 3], ['kim', 2.5], ['wes', 3]],
    chavo: [['eric', 4], ['kim', 4], ['wes', 4.5]],
    tiago: [['eric', 3], ['kim', 3.5]],
  };
  app.tabelas.votes = [];
  let i = 0;
  for (const [para, lista] of Object.entries(ESTRELAS)) {
    for (const [de, estrelas] of lista) {
      i += 1;
      app.tabelas.votes.push({ id: uuid(`7${String(i).padStart(2, '0')}`, N), de_user_id: U[de].id, para_user_id: U[para].id, team_id: MISSA.id, game_id: null, nota: estrelas, nota10: Math.round(estrelas * 2), created_at: iso(-30 * 24 * HORA + i * HORA), updated_at: iso(-30 * 24 * HORA + i * HORA) });
    }
  }

  // ── Os jogos ──
  const jogador = (k, estrelas, extra = {}) => ({ user_id: U[k].id, nome: PESSOAS[k][0], avatar_url: null, rating: estrelas, goleiro: false, cabeca_chave: false, ...extra });
  const registro = { origem: 'sorteio', por: { id: U.chavo.id, nome: 'Chavo, el matador' }, em: iso(-3 * 24 * HORA - 2 * HORA), ajustes: [], sorteios: 1 };
  // O sorteio antigo: o número de cada um em ESTRELAS e sem a marca escala_nota (é assim que estão os sorteios de antes da régua de 10).
  const sorteioAntigo = {
    num_times: 2, total_jogadores: 9, convidados_total: 1, seed: 424242, avisos: [],
    times: [
      { nome: 'Time A', rating_medio: 3.8, jogadores: [jogador('wes', 4.8), jogador('eric', 4), jogador('carla', 2.8), { user_id: null, convidado: true, nome: 'Zé da Esquina', avatar_url: null, rating: 3, goleiro: false, cabeca_chave: false }] },
      { nome: 'Time B', rating_medio: 3.6, jogadores: [jogador('chavo', 4.2), jogador('kim', 3.8), jogador('tiago', 3), jogador('igor', 3)] },
    ],
    reservas: [{ posicao: 1, user_id: U.jefim.id, nome: 'Jefim', avatar_url: null, rating: 3, ordem_entrada: 'primeiro' }],
    registro,
  };
  const novo = (rotulo, quando, extra = {}) => ({ id: uuid(rotulo, N), team_id: MISSA.id, local: 'Urban Soccer', data: quando, status: 'agendado', cancelado: false, jogadores_por_time: 4, created_at: iso(-40 * 24 * HORA), ...extra });
  const TERMINADO = novo('a1', iso(-3 * 24 * HORA), {
    status: 'terminado', sorteio_realizado: true, num_times: 2, times_resultado: sorteioAntigo,
    campeao_time_index: 0, time_vencedor: 'A', placar_a: 3, placar_b: 1, resultado_nivel: 2, artilheiro_user_id: U.wes.id, artilheiro_gols: 2, destaque_user_id: U.eric.id,
  });
  const SEM_RESULTADO = novo('a2', iso(-26 * HORA), { sorteio_realizado: true, num_times: 2, times_resultado: { ...sorteioAntigo, seed: 515151, escala_nota: 10, times: sorteioAntigo.times.map((t) => ({ ...t, rating_medio: t.rating_medio * 2, jogadores: t.jogadores.map((j) => ({ ...j, rating: j.rating * 2 })) })), reservas: sorteioAntigo.reservas.map((j) => ({ ...j, rating: j.rating * 2 })) } });
  const EM_ANDAMENTO = novo('a3', iso(-40 * 60 * 1000), { status: 'em_curso', sorteio_realizado: true, num_times: 2, times_resultado: { ...sorteioAntigo, seed: 616161 } });
  const FUTURO = novo('a4', iso(2 * 24 * HORA));
  app.tabelas.games = [TERMINADO, SEM_RESULTADO, EM_ANDAMENTO, FUTURO];
  const comConta = ['chavo', 'eric', 'kim', 'wes', 'tiago', 'carla', 'igor', 'jefim'];
  const presenca = (g, k) => ({ id: uuid(`d${g.id.slice(-2)}${comConta.indexOf(k)}`, N), game_id: g.id, user_id: U[k].id, confirmado: true, goleiro: false, cabeca_chave: false, users: { id: U[k].id, nome: U[k].nome, nome_jogador: PESSOAS[k][0], email: U[k].email, avatar_url: null, avatar_generico: null } });
  app.tabelas.game_players = [
    ...comConta.map((k) => presenca(TERMINADO, k)),
    ...comConta.map((k) => presenca(SEM_RESULTADO, k)),
    ...comConta.map((k) => presenca(EM_ANDAMENTO, k)),
    ...['eric', 'wes', 'carla'].map((k) => presenca(FUTURO, k)),
  ];
  app.tabelas.gols_jogadores = [
    { id: uuid('e1', N), game_id: TERMINADO.id, user_id: U.wes.id, time: 'A', gols: 2 },
    { id: uuid('e2', N), game_id: TERMINADO.id, user_id: U.eric.id, time: 'A', gols: 1 },
    { id: uuid('e3', N), game_id: TERMINADO.id, user_id: U.kim.id, time: 'B', gols: 1 },
  ];

  process.stdout.write(`${JSON.stringify({
    pronto: true,
    base: app.base,
    tokens: Object.fromEntries(Object.entries(U).map(([k, u]) => [k, app.token(u.id)])),
    pessoas: Object.fromEntries(Object.entries(U).map(([k, u]) => [k, { id: u.id, apelido: u.nome_jogador }])),
    missa: { id: MISSA.id, slug: MISSA.slug },
    jogos: { terminado: TERMINADO.id, semResultado: SEM_RESULTADO.id, emAndamento: EM_ANDAMENTO.id, futuro: FUTURO.id },
  })}\n`);

  process.stdin.setEncoding('utf8');
  process.stdin.on('data', (d) => {
    const s = String(d);
    // "voto <de> <para>": a prova confere o que ficou gravado (as duas colunas), sem passar pela API.
    for (const linha of s.split('\n')) {
      const m = linha.match(/^voto (\S+) (\S+)$/);
      if (m) {
        const v = app.tabelas.votes.find((x) => x.de_user_id === m[1] && x.para_user_id === m[2]);
        process.stdout.write(`${JSON.stringify({ voto: v ? { nota: v.nota ?? null, nota10: v.nota10 ?? null } : null })}\n`);
      }
    }
    if (!s.includes('fim')) return;
    process.stdout.write(`${JSON.stringify({ rede: app.tentativasDeRede })}\n`, () => process.exit(0));
  });
  process.stdin.on('end', () => process.exit(0));
})().catch((e) => { process.stderr.write(`[motor-31w] ${e.stack || e.message}\n`); process.exit(1); });
