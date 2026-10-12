// Futty v2.0 — o motor FALSO da prova "nomes públicos" (scripts/provas/nomes-publicos.prova.mjs): o motor de VERDADE (server.js, todas as rotas) por
// cima de um banco, um Storage e um Auth de MENTIRA, em memória — a mesma bancada do backend (backend/tests/_appFalsa.js) que a prova de XSS usa.
// O .env do backend aponta para o único banco (o de produção): aqui ele nunca é lido, a rede de fora está fechada e o servidor só escuta em 127.0.0.1.
//
// O mundo: quatro pessoas com NOME COMPLETO e apelido (e um sem apelido), um time, um jogo já sorteado e terminado com gols, um campeonato com
// plantel e um convite. O sorteio gravado imita um jogo ANTIGO — o snapshot guarda o nome completo, como o motor fazia antes da regra do apelido —,
// para a prova ver que a leitura troca pelo apelido de hoje.
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
  const N = 9;

  // quem: [apelido, nome completo]. O Roberto não escolheu apelido: na tela pública só o primeiro nome.
  const PESSOAS = {
    adm: ['Aninha', 'Ana Beatriz da Silva'],
    m1: ['Lili', 'Alice Pereira Costa'],
    m2: [null, 'Roberto Carlos Pereira'],
    m3: ['Dedé', 'André Luiz Fernandes'],
  };
  const ids = { adm: uuid('a1', N), m1: uuid('a2', N), m2: uuid('a3', N), m3: uuid('a4', N) };
  const U = Object.fromEntries(Object.entries(PESSOAS).map(([k, [apelido, nome]]) => [k, { ...usuario(ids[k], apelido || 'x'), nome, nome_jogador: apelido, birthdate: '1990-01-01' }]));
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
  const conv = await chamar('adm', 'POST', `/api/teams/${T.slug}/convite`, {});
  const token = conv.json?.token || conv.json?.convite?.token;
  for (const quem of ['m1', 'm2', 'm3']) await chamar(quem, 'POST', `/api/convite/${token}/aceitar`, {});

  const jogo = await chamar('adm', 'POST', '/api/games', { team_slug: T.slug, data: iso(48 * HORA), jogadores_por_time: 2, local: 'Quadra do Guará' });
  const G = jogo.json.game || jogo.json;
  for (const quem of ['adm', 'm1', 'm2', 'm3']) await chamar(quem, 'POST', `/api/games/${G.id}/confirmar`, { confirmado: true });
  await chamar('adm', 'POST', `/api/games/${G.id}/sortear`, {});
  const curto = await chamar('adm', 'POST', `/api/games/${G.id}/link-curto`, {});

  // O jogo já aconteceu, com resultado e gols; o snapshot do sorteio imita um jogo ANTIGO (nome completo de todo mundo).
  const linha = app.tabelas.games.find((g) => g.id === G.id);
  linha.data = iso(-5 * HORA);
  await chamar('adm', 'PATCH', `/api/games/${G.id}/resultado`, { campeao_time_index: 0, placar_a: 3, placar_b: 1, gols: [{ user_id: U.adm.id, gols: 2 }, { user_id: U.m2.id, gols: 1 }] });
  const completo = (id) => Object.values(U).find((u) => u.id === id)?.nome;
  const comNomeCompleto = (j) => (j && j.user_id && completo(j.user_id) ? { ...j, nome: completo(j.user_id) } : j);
  const tr = linha.times_resultado;
  linha.times_resultado = { ...tr, times: tr.times.map((t) => ({ ...t, jogadores: t.jogadores.map(comNomeCompleto) })), reservas: (tr.reservas || []).map(comNomeCompleto) };

  const camp = await chamar('adm', 'POST', `/api/equipas/${T.slug}/campeonatos`, {
    nome: 'Copa Domingueira', formato: 'pontos', nomes: ['Time Ouro', 'Time Roxo'],
    plantel: [
      [{ user_id: U.adm.id, nome: U.adm.nome, avatar_url: null, convidado: false }, { user_id: U.m2.id, nome: U.m2.nome, avatar_url: null, convidado: false }],
      [{ user_id: U.m1.id, nome: U.m1.nome, avatar_url: null, convidado: false }, { user_id: U.m3.id, nome: U.m3.nome, avatar_url: null, convidado: false }],
    ],
  });
  const CAMP = camp.json.campeonato;
  for (const c of CAMP.confrontos || []) await chamar('adm', 'POST', `/api/equipas/${T.slug}/campeonatos/${CAMP.id}/confrontos/${c.id}/resultado`, { placar_a: 3, placar_b: 1 });
  await chamar('adm', 'POST', `/api/equipas/${T.slug}/campeonatos/${CAMP.id}/terminar`, {});

  const saida = {
    pronto: true,
    base: app.base,
    tokens: Object.fromEntries(Object.entries(U).map(([k, u]) => [k, app.token(u.id)])),
    pessoas: Object.fromEntries(Object.entries(U).map(([k, u]) => [k, { id: u.id, apelido: u.nome_jogador, nome: u.nome }])),
    time: { id: T.id, slug: T.slug }, jogo: { id: G.id, codigo: curto.json?.codigo || null }, campeonato: { id: CAMP.id }, convite: { token },
  };
  process.stdout.write(`${JSON.stringify(saida)}\n`);

  process.stdin.setEncoding('utf8');
  process.stdin.on('data', (d) => {
    if (!String(d).includes('fim')) return;
    process.stdout.write(`${JSON.stringify({ rede: app.tentativasDeRede })}\n`, () => process.exit(0));
  });
  process.stdin.on('end', () => process.exit(0));
})().catch((e) => { process.stderr.write(`[motor-nomes] ${e.stack || e.message}\n`); process.exit(1); });
