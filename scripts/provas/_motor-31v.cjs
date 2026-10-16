// Futty v2.0 — o motor FALSO da prova da Rodada 31V (scripts/provas/rodada-31v.prova.mjs): o motor de VERDADE (server.js, todas as rotas) por cima de um
// banco, um Storage e um Auth de MENTIRA, em memória (backend/tests/_appFalsa.js). O .env do backend aponta para o único banco (o de produção): aqui ele
// nunca é lido, a rede de fora está fechada e o servidor só escuta em 127.0.0.1.
//
// O mundo, DEPOIS do FUT\DADOS-31V.sql (o SQL em si é provado à parte, num Postgres local): a Missa de Quinta com dois jogos antigos que só tinham a foto
// e agora têm o time campeão anotado como convidados sem app — 03/09 (Igor, Eric Lopes, K9, Kim, Marcos) e 21/05 (Jefim, Igor, MT, K9: o "?" ficou de
// fora) —; a Domingueira com o 05/04 (K9, Chavo pela conta, Gui, Jefim, Ricardo Tiozão). Eric, Kim e Wesley já têm o app e estão na Missa.
// O Ranking é medido ANTES de os campeões entrarem e DEPOIS (a prova compara: convidado sem app não pontua).
//
// A Figurinha: o pacote da Domingueira dá 3 gerações por jogador (uniforme Dark Gold). O Chavo tem o pacote e 45 créditos (Minha Figurinha) — a tela tem de
// dizer "Restam 48" e, depois da compra (o webhook do RevenueCat de verdade, com o segredo de mentira), "Restam 58". O Tiago tem só o pacote (3); a Carla
// só créditos (55).
//
// Protocolo com a prova: uma linha de JSON no stdout quando está pronto ({ pronto, base, ... }); "fim\n" no stdin devolve a última linha (o que o motor
// tentou fazer na rede) e encerra.
'use strict';

const path = require('node:path');

const BACKEND = path.resolve(__dirname, '..', '..', '..', 'backend');
const TESTES_DO_MOTOR = path.join(BACKEND, 'tests');
// PRIMEIRO require: o dotenv de mentira e a rede fechada têm de estar de pé antes de qualquer módulo do motor.
const { subirApp, usuario, URL_DO_BANCO } = require(path.join(TESTES_DO_MOTOR, '_appFalsa.js'));
const { uuid } = require(path.join(TESTES_DO_MOTOR, '_mundoDeSeguranca.js'));
const sharp = require(path.join(BACKEND, 'node_modules', 'sharp'));

// O segredo do webhook da loja (de mentira): a prova manda a compra como o RevenueCat manda.
process.env.RC_WEBHOOK_SECRET = 'segredo-da-prova-31v';

const fala = (...a) => process.stderr.write(`${a.join(' ')}\n`);

// Uma foto de mentira (um campo verde com linhas brancas, nenhuma foto de gente). Só pixels — o motor não deixa o sharp ler SVG.
const linhaBranca = (largura, altura) => ({ create: { width: largura, height: altura, channels: 3, background: '#ffffff' } });
const fotoDe = (cor) => sharp({ create: { width: 900, height: 640, channels: 3, background: cor } })
  .composite([{ input: linhaBranca(820, 6), left: 40, top: 40 }, { input: linhaBranca(820, 6), left: 40, top: 594 }, { input: linhaBranca(6, 560), left: 447, top: 40 }])
  .jpeg({ quality: 80 }).toBuffer();

(async () => {
  const app = await subirApp();
  const N = 53;
  const PESSOAS = {
    chavo: ['Chavo, el matador', 'Pedro Borges'],
    eric: ['Eric Lopes', 'Eric Lopes Andrade'],
    kim: ['Kim', 'Joaquim Ribeiro'],
    wes: ['Wesley', 'Wesley Prado'],
    tiago: ['Tiago', 'Tiago Moura'],
    carla: ['Carla', 'Carla Nunes'],
  };
  const ids = Object.fromEntries(Object.keys(PESSOAS).map((k, i) => [k, uuid(`b${i + 1}`, N)]));
  const U = Object.fromEntries(Object.entries(PESSOAS).map(([k, [apelido, nome]]) => [k, { ...usuario(ids[k], apelido), nome, nome_jogador: apelido, birthdate: '1990-01-01', avatar_url: null }]));
  app.reiniciar({ tabelas: {}, usuarios: Object.values(U) });
  app.criarBucketsDoProjeto();
  for (const u of Object.values(U)) {
    const { data } = await app.cliente.auth.getUser(app.token(u.id));
    data.user.user_metadata.onboarding_completo = true;
  }

  const chamar = async (quem, metodo, rota, corpo) => {
    const r = await app.pedir(metodo, rota, { token: app.token(U[quem].id), corpo });
    const ok = r.status < 400;
    fala(`${ok ? 'ok  ' : 'ERRO'} ${r.status} ${quem.padEnd(6)} ${metodo.padEnd(6)} ${rota}${ok ? '' : ` — ${String(r.json?.error || r.texto).slice(0, 160)}`}`);
    if (!ok) throw new Error(`${metodo} ${rota} → ${r.status}`);
    return r;
  };
  for (const [quem, [apelido, nome]] of Object.entries(PESSOAS)) await chamar(quem, 'PATCH', '/api/me', { nome, nome_jogador: apelido });

  const criarTime = async (nome, membros) => {
    const r = await chamar('chavo', 'POST', '/api/teams', { nome, publica: false, cor: 'verde' });
    const T = r.json.team;
    app.tabelas.teams.find((t) => t.id === T.id).fuso = 'Europe/Lisbon';
    const conv = await chamar('chavo', 'POST', `/api/teams/${T.slug}/convite`, {});
    for (const quem of membros) await chamar(quem, 'POST', `/api/convite/${conv.json?.token || conv.json?.convite?.token}/aceitar`, {});
    return T;
  };
  const MISSA = await criarTime('Missa de Quinta', ['eric', 'kim', 'wes', 'carla']);
  // A presença de fundador da Missa (DADOS-31T): todo membro que joga tem presença nos jogos até 18-out — os jogos antigos já contam para todos.
  app.tabelas.teams.find((t) => t.id === MISSA.id).presenca_fundador_ate = '2026-10-18';
  const DOM = await criarTime('Domingueira FC', ['tiago']);
  // O pacote da Domingueira: 3 gerações por jogador, uniforme Dark Gold (o que o Gabinete ativa).
  Object.assign(app.tabelas.teams.find((t) => t.id === DOM.id), { brilhante_ativo: true, brilhante_kit: 'dark-gold', brilhante_limite: 25, brilhante_por_jogador: 3 });
  // Créditos da Minha Figurinha e a foto (o Chavo já tem figurinha: o "Refazer" aparece).
  const base = 'https://projeto-falso.supabase.test/storage/v1/object/public/avatars/public';
  Object.assign(app.tabelas.users.find((x) => x.id === U.chavo.id), { brilhante_creditos: 45, foto_url: `${base}/${U.chavo.id}-1.webp`, avatar_url: `${base}/${U.chavo.id}-ai-dark-gold-1.png`, kit_ativo: 'dark-gold' });
  Object.assign(app.tabelas.users.find((x) => x.id === U.carla.id), { brilhante_creditos: 55, foto_url: `${base}/${U.carla.id}-1.webp`, avatar_url: `${base}/${U.carla.id}-1.webp` });
  Object.assign(app.tabelas.users.find((x) => x.id === U.tiago.id), { foto_url: `${base}/${U.tiago.id}-1.webp`, avatar_url: `${base}/${U.tiago.id}-1.webp` });

  // ── Os jogos antigos, como estavam ANTES do DADOS-31V: só a foto do campeão (o DADOS-31T), sem times. ──
  const urlDaFoto = async (team, nome, cor) => {
    const caminho = `${team.id}/historico/${nome}.jpg`;
    const { error } = await app.cliente.storage.from('resenha').upload(caminho, await fotoDe(cor), { contentType: 'image/jpeg' });
    if (error) throw new Error(`upload da foto ${nome}: ${error.message}`);
    return `${URL_DO_BANCO}/storage/v1/object/public/resenha/${caminho}`;
  };
  const antigo = async (team, dia, iso, cor) => ({
    id: uuid(`c${dia.replace('/', '')}${team === DOM ? 'd' : 'm'}`, N), team_id: team.id, data: iso, local: 'Urban Soccer', status: 'agendado', cancelado: false, historico: true,
    campeao_foto_url: await urlDaFoto(team, dia.replace('/', '-'), cor), created_at: iso,
  });
  const J0309 = await antigo(MISSA, '03/09', '2026-09-03T20:00:00.000Z', '#2e7d32');
  const J2105 = await antigo(MISSA, '21/05', '2026-05-21T20:00:00.000Z', '#1b5e20');
  const J0504 = await antigo(DOM, '05/04', '2026-04-06T02:30:00.000Z', '#33691e');
  app.tabelas.games = app.tabelas.games || [];
  for (const g of [J0309, J2105, J0504]) app.tabelas.games.push(g);

  const rankingDe = async (team) => (await chamar('chavo', 'GET', `/api/teams/${team.slug}/ranking`)).json.ranking
    .map((x) => ({ user_id: x.user_id, nome: x.nome_jogador, vitorias: x.vitorias, derrotas: x.derrotas, empates: x.empates, presenca: x.presenca, score: x.score, posicao: x.posicao }));
  const rankingAntes = { missa: await rankingDe(MISSA), domingueira: await rankingDe(DOM) };

  // ── O que o DADOS-31V.sql grava (o mesmo formato, campo a campo; o SQL é provado à parte no Postgres local). ──
  const convidado = (nome) => ({ user_id: null, nome, avatar_url: null, convidado: true });
  const chavo = { user_id: U.chavo.id, nome: 'Chavo, el matador', avatar_url: app.tabelas.users.find((x) => x.id === U.chavo.id).avatar_url };
  const anotar = (g, jogadores) => Object.assign(app.tabelas.games.find((x) => x.id === g.id), {
    times_resultado: {
      manual: true, num_times: 1, total_jogadores: jogadores.length, times: [{ nome: 'Time campeão', jogadores }], reservas: [],
      registro: { origem: 'manual', campeoes: true, em: new Date().toISOString(), ajustes: [], sorteios: 0, por: { id: U.chavo.id, nome: 'Chavo, el matador' } },
    },
    campeao_time_index: 0, time_vencedor: null, num_times: 1, sorteio_realizado: true, resultado_nivel: 1,
  });
  anotar(J0309, ['Igor', 'Eric Lopes', 'K9', 'Kim', 'Marcos'].map(convidado));
  anotar(J2105, ['Jefim', 'Igor', 'MT', 'K9'].map(convidado));
  anotar(J0504, [convidado('K9'), chavo, convidado('Gui'), convidado('Jefim'), convidado('Ricardo Tiozão')]);
  app.tabelas.game_players = app.tabelas.game_players || [];
  app.tabelas.game_players.push({ id: uuid('d1', N), game_id: J0504.id, user_id: U.chavo.id, confirmado: true, goleiro: false });
  const rankingDepois = { missa: await rankingDe(MISSA), domingueira: await rankingDe(DOM) };

  process.stdout.write(`${JSON.stringify({
    pronto: true,
    base: app.base,
    segredo: process.env.RC_WEBHOOK_SECRET,
    tokens: Object.fromEntries(Object.entries(U).map(([k, u]) => [k, app.token(u.id)])),
    pessoas: Object.fromEntries(Object.entries(U).map(([k, u]) => [k, { id: u.id, apelido: u.nome_jogador }])),
    missa: { id: MISSA.id, slug: MISSA.slug },
    domingueira: { id: DOM.id, slug: DOM.slug },
    jogos: { j0309: J0309.id, j2105: J2105.id, j0504: J0504.id },
    rankingAntes,
    rankingDepois,
  })}\n`);

  process.stdin.setEncoding('utf8');
  process.stdin.on('data', (d) => {
    if (!String(d).includes('fim')) return;
    process.stdout.write(`${JSON.stringify({ rede: app.tentativasDeRede })}\n`, () => process.exit(0));
  });
  process.stdin.on('end', () => process.exit(0));
})().catch((e) => { process.stderr.write(`[motor-31v] ${e.stack || e.message}\n`); process.exit(1); });
