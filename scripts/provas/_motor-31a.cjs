// Futty v2.0 — o motor FALSO da prova da Rodada 31A (scripts/provas/rodada-31a.prova.mjs): o motor de VERDADE (server.js, todas as rotas) por cima de um
// banco, um Storage e um Auth de MENTIRA, em memória — a mesma bancada do backend (backend/tests/_appFalsa.js) das provas de XSS e de nomes públicos.
// O .env do backend aponta para o único banco (o de produção): aqui ele nunca é lido, a rede de fora está fechada e o servidor só escuta em 127.0.0.1.
//
// O mundo, montado pelas rotas de verdade: o time Domingueira FC com 4 membros (Pedro, o admin, Magrão, Zé e Dedé); um jogo sorteado com os 4 + dois
// convidados sem app (Beto e Caio), que já aconteceu — o time do Beto ganhou, com 2 gols dele — e um campeonato "pontos" nascido desse sorteio, já
// terminado (o time do Beto é o campeão). DEPOIS do jogo entraram no time o Betão (o Beto, que baixou o app depois do campeão) e o Zeca (que não jogou);
// e o Fora, de outro time. A prova liga o Beto ao Betão e confere a tela do jogo, o ranking, o selo e o card "Você é campeão!".
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
  const N = 31;

  // quem: [apelido, nome completo]
  const PESSOAS = {
    adm: ['Pedro', 'Pedro Ferreira Borges'],
    m1: ['Magrão', 'Marcos Antunes Lopes'],
    m2: ['Zé', 'José Carlos Ribeiro'],
    m3: ['Dedé', 'André Luiz Fernandes'],
    novo: ['Betão', 'Roberto Alves Teixeira'], // o convidado Beto, depois de baixar o app
    zeca: ['Zeca', 'Ezequiel Moraes Neto'], // entrou no time e não jogou
    fora: ['Forasteiro', 'Felipe Oliveira Rocha'], // de OUTRO time
  };
  const ids = Object.fromEntries(Object.keys(PESSOAS).map((k, i) => [k, uuid(`a${i + 1}`, N)]));
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
  const criado = await chamar('adm', 'POST', '/api/teams', { nome: 'Domingueira FC', publica: false, cor: 'verde' });
  const T = criado.json.team;
  const outro = await chamar('fora', 'POST', '/api/teams', { nome: 'Outro FC', publica: false, cor: 'azul' });
  const conv = await chamar('adm', 'POST', `/api/teams/${T.slug}/convite`, {});
  const token = conv.json?.token || conv.json?.convite?.token;
  for (const quem of ['m1', 'm2', 'm3']) await chamar(quem, 'POST', `/api/convite/${token}/aceitar`, {});

  // O jogo: 4 membros + 2 convidados sem app, 3 por time. Já aconteceu, e o time do Beto ganhou (2 gols dele, 1 de um companheiro).
  const jogo = await chamar('adm', 'POST', '/api/games', { team_slug: T.slug, data: iso(48 * HORA), jogadores_por_time: 3, local: 'Quadra do Guará' });
  const G = jogo.json.game || jogo.json;
  for (const quem of ['adm', 'm1', 'm2', 'm3']) await chamar(quem, 'POST', `/api/games/${G.id}/confirmar`, { confirmado: true });
  await chamar('adm', 'POST', `/api/games/${G.id}/sortear`, { convidados: ['Beto', 'Caio'] });
  const linha = app.tabelas.games.find((g) => g.id === G.id);
  linha.data = iso(-5 * HORA);
  const times = linha.times_resultado.times;
  const timeDoBeto = times.findIndex((t) => t.jogadores.some((j) => !j.user_id && j.nome === 'Beto'));
  const timeDoCaio = times.findIndex((t) => t.jogadores.some((j) => !j.user_id && j.nome === 'Caio'));
  const gols = [{ user_id: null, convidado_nome: 'Beto', gols: 2 }, { user_id: null, convidado_nome: 'Caio', gols: 0 }];
  const doTime = (i) => times[i].jogadores.find((j) => j.user_id);
  gols.push({ user_id: doTime(timeDoBeto).user_id, gols: 1 });
  await chamar('adm', 'PATCH', `/api/games/${G.id}/resultado`, { campeao_time_index: timeDoBeto, gols });

  // O campeonato nasceu desse sorteio e o time do Beto levou a taça.
  const camp = await chamar('adm', 'POST', `/api/equipas/${T.slug}/campeonatos/de-sorteio`, { game_id: G.id, formato: 'pontos', nome: 'Copa da Domingueira' });
  const CAMP = camp.json.campeonato;
  const timeDoCamp = CAMP.times[timeDoBeto];
  for (const c of CAMP.confrontos || []) {
    const [a, b] = c.time_a_id === timeDoCamp.id ? [3, 1] : [1, 3];
    await chamar('adm', 'POST', `/api/equipas/${T.slug}/campeonatos/${CAMP.id}/confrontos/${c.id}/resultado`, { placar_a: a, placar_b: b });
  }

  // Quem entra DEPOIS do jogo: o Betão (que era o Beto) e o Zeca.
  for (const quem of ['novo', 'zeca']) await chamar(quem, 'POST', `/api/convite/${token}/aceitar`, {});

  // O ranking só põe quem tem 3 jogos: dois jogos a mais (depois do domingo, já passados) com o Betão presente. Ele fica com 2 — e entra no ranking só
  // quando a associação lhe dá o jogo do domingo.
  for (let i = 0; i < 2; i += 1) {
    const extra = await chamar('adm', 'POST', '/api/games', { team_slug: T.slug, data: iso((72 + i) * HORA), jogadores_por_time: 3, local: 'Quadra do Guará' });
    const E = extra.json.game || extra.json;
    for (const quem of ['adm', 'm1', 'm2', 'm3', 'novo']) await chamar(quem, 'POST', `/api/games/${E.id}/confirmar`, { confirmado: true });
    app.tabelas.games.find((g) => g.id === E.id).data = iso(-(30 + i) * HORA);
  }

  const saida = {
    pronto: true,
    base: app.base,
    tokens: Object.fromEntries(Object.entries(U).map(([k, u]) => [k, app.token(u.id)])),
    pessoas: Object.fromEntries(Object.entries(U).map(([k, u]) => [k, { id: u.id, apelido: u.nome_jogador, nome: u.nome }])),
    time: { id: T.id, slug: T.slug }, outroTime: { slug: outro.json.team.slug },
    jogo: { id: G.id, timeDoBeto, timeDoCaio }, campeonato: { id: CAMP.id, nomeDoTimeCampeao: timeDoCamp.nome },
  };
  process.stdout.write(`${JSON.stringify(saida)}\n`);

  process.stdin.setEncoding('utf8');
  process.stdin.on('data', (d) => {
    if (!String(d).includes('fim')) return;
    process.stdout.write(`${JSON.stringify({ rede: app.tentativasDeRede })}\n`, () => process.exit(0));
  });
  process.stdin.on('end', () => process.exit(0));
})().catch((e) => { process.stderr.write(`[motor-31a] ${e.stack || e.message}\n`); process.exit(1); });
