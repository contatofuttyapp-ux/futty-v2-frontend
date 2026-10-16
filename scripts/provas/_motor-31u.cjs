// Futty v2.0 — o motor FALSO da prova da Rodada 31U (scripts/provas/rodada-31u.prova.mjs): o motor de VERDADE (server.js, todas as rotas) por cima de um
// banco, um Storage e um Auth de MENTIRA, em memória (backend/tests/_appFalsa.js). O .env do backend aponta para o único banco (o de produção): aqui ele
// nunca é lido, a rede de fora está fechada e o servidor só escuta em 127.0.0.1.
//
// O mundo, montado pelas rotas de verdade:
//   · Missa de Quinta (o Pedro, admin e super-admin do Gabinete; o Magrão e o Zé jogaram um jogo que já aconteceu) e o link /c/missa-de-quinta-<código>;
//   · a Pelada do Zé (outro time, do Zé), com o seu link — para a pessoa que abriu os DOIS convites e tem de escolher;
//   · o Gabriel entrou na Missa e confirmou o PRÓXIMO jogo (daqui a 2 dias), que ainda não aconteceu;
//   · contas NOVAS, sem time e sem cadastro: seis para os caminhos do convite (sem/com o app × e-mail/Google/Apple), uma para a escolha entre dois
//     times, três para a idade (13 anos e 12 anos); e o Perdido, que terminou o cadastro e ficou sem time (a lista do Gabinete).
//
// Protocolo com a prova: uma linha de JSON no stdout quando está pronto ({ pronto, base, ... }). No stdin: "avancar\n" adianta o relógio do motor em
// 3 dias (o jogo do Gabriel passa a ter acontecido; responde {"avancou":true}); "pendentes\n" devolve as linhas de convites_pendentes; "apagadas\n"
// devolve os ids que o motor mandou apagar no Auth; "fim\n" devolve a última linha (o que o motor tentou fazer na rede) e encerra. O resto do que
// se diz vai para o stderr.
'use strict';

const path = require('node:path');

// O relógio do motor: a prova o adianta para o jogo futuro "acontecer". Trocado ANTES de qualquer módulo do motor carregar.
const DataReal = Date;
let desvioMs = 0;
class DataDoMotor extends DataReal {
  constructor(...a) { if (a.length) super(...a); else super(DataReal.now() + desvioMs); }
  static now() { return DataReal.now() + desvioMs; }
}
global.Date = DataDoMotor;

const TESTES_DO_MOTOR = path.resolve(__dirname, '..', '..', '..', 'backend', 'tests');
// PRIMEIRO require: o dotenv de mentira e a rede fechada têm de estar de pé antes de qualquer módulo do motor.
const { subirApp, usuario } = require(path.join(TESTES_DO_MOTOR, '_appFalsa.js'));
const { uuid } = require(path.join(TESTES_DO_MOTOR, '_mundoDeSeguranca.js'));

const fala = (...a) => process.stderr.write(`${a.join(' ')}\n`);
const HORA = 3600 * 1000;
const iso = (ms) => new Date(Date.now() + ms).toISOString();

(async () => {
  const app = await subirApp();
  const N = 731;

  const VETERANOS = {
    adm: ['Pedro', 'Pedro Ferreira Borges'],
    m1: ['Magrão', 'Marcos Antunes Lopes'],
    m2: ['Zé', 'José Carlos Ribeiro'],
    m3: ['Gabriel', 'Gabriel Costa Neves'],
    perdido: ['Perdido', 'Rogério Perdigão Alves'],
  };
  // As contas novas: [nome completo, e-mail, data de nascimento]. Sem apelido (o cadastro pergunta) e sem cadastro concluído.
  const NOVOS = {
    lojaEmail: ['Miguel Souza Lima', 'miguel@futtymock.com', '1990-01-01'],
    lojaGoogle: ['Rafael Motta Dias', 'motta@futtymock.com', '1990-01-01'],
    lojaApple: ['Marcos Vinicius Prado', 'marquinhos@futtymock.com', '1990-01-01'],
    appEmail: ['Bruno Teixeira Gomes', 'bruno@futtymock.com', '1990-01-01'],
    appGoogle: ['Caio Nunes Pereira', 'caio@futtymock.com', '1990-01-01'],
    appApple: ['Thiago Rocha Lima', 'thiago@futtymock.com', '1990-01-01'],
    escolha: ['Diego Alves Moura', 'diego@futtymock.com', '1990-01-01'],
    treze: ['Lucas Prado Silva', 'lucas@futtymock.com', null], // Google: o cadastro pergunta a data
    doze: ['Pedrinho Souza Lima', 'pedrinho@futtymock.com', null], // Google: o cadastro pergunta a data
    dozeEmail: ['Joãozinho Melo Reis', 'joaozinho@futtymock.com', null], // e-mail: nem chega a ter conta
    trezeEmail: ['Ana Clara Mota', 'anaclara@futtymock.com', null],
  };
  const chaves = [...Object.keys(VETERANOS), ...Object.keys(NOVOS)];
  const ids = Object.fromEntries(chaves.map((k, i) => [k, uuid(`u${String(i + 1).padStart(2, '0')}`, N)]));
  const U = {
    ...Object.fromEntries(Object.entries(VETERANOS).map(([k, [apelido, nome]]) => [k, { ...usuario(ids[k], apelido), nome, nome_jogador: apelido, birthdate: '1990-01-01', created_at: iso(-30 * 60000) }])),
    ...Object.fromEntries(Object.entries(NOVOS).map(([k, [nome, email, nascimento]]) => [k, { ...usuario(ids[k], 'x'), nome, nome_jogador: null, email, birthdate: nascimento }])),
  };
  app.reiniciar({ tabelas: {}, usuarios: Object.values(U), superAdmins: [U.adm.id] });
  app.criarBucketsDoProjeto();
  // O Auth de mentira só anota o updateUserById; o de verdade grava. Aqui ele grava o user_metadata na conta, para o "cadastro concluído"
  // (POST /api/me/onboarding-completo) valer no pedido seguinte — sem isso, recarregar o app devolveria a pessoa ao cadastro.
  const anotar = app.cliente.auth.admin.updateUserById.bind(app.cliente.auth.admin);
  app.cliente.auth.admin.updateUserById = async (id, atributos) => {
    const r = await anotar(id, atributos);
    const { data } = await app.cliente.auth.getUser(app.token(id));
    if (data?.user && atributos?.user_metadata) data.user.user_metadata = { ...(data.user.user_metadata || {}), ...atributos.user_metadata };
    return r;
  };
  for (const k of Object.keys(VETERANOS)) {
    const { data } = await app.cliente.auth.getUser(app.token(U[k].id));
    data.user.user_metadata.onboarding_completo = true;
  }

  const chamar = async (quem, metodo, rota, corpo) => {
    const r = await app.pedir(metodo, rota, { token: app.token(U[quem].id), corpo });
    const ok = r.status < 400;
    fala(`${ok ? 'ok  ' : 'ERRO'} ${r.status} ${quem.padEnd(10)} ${metodo.padEnd(6)} ${rota}${ok ? '' : ` — ${String(r.json?.error || r.texto).slice(0, 160)}`}`);
    if (!ok) throw new Error(`${metodo} ${rota} → ${r.status}`);
    return r;
  };

  for (const [quem, [apelido, nome]] of Object.entries(VETERANOS)) await chamar(quem, 'PATCH', '/api/me', { nome, nome_jogador: apelido });
  const T = (await chamar('adm', 'POST', '/api/teams', { nome: 'Missa de Quinta', publica: false, cor: 'verde' })).json.team;
  const conv = (await chamar('adm', 'POST', `/api/teams/${T.slug}/convite`, {})).json;
  for (const quem of ['m1', 'm2', 'm3']) await chamar(quem, 'POST', `/api/convite/${conv.token}/aceitar`, {});
  const T2 = (await chamar('m2', 'POST', '/api/teams', { nome: 'Pelada do Zé', publica: false, cor: 'azul' })).json.team;
  const conv2 = (await chamar('m2', 'POST', `/api/teams/${T2.slug}/convite`, {})).json;

  // Um jogo que já aconteceu (Pedro, Magrão e Zé) e o próximo, daqui a 2 dias, que o Gabriel já confirmou.
  const passado = (await chamar('adm', 'POST', '/api/games', { team_slug: T.slug, data: iso(48 * HORA), jogadores_por_time: 1, local: 'Quadra do Guará' })).json;
  const P = passado.game || passado;
  for (const quem of ['adm', 'm1', 'm2']) await chamar(quem, 'POST', `/api/games/${P.id}/confirmar`, { confirmado: true });
  Object.assign(app.tabelas.games.find((g) => g.id === P.id), { data: iso(-26 * HORA), status: 'terminado' });
  const futuro = (await chamar('adm', 'POST', '/api/games', { team_slug: T.slug, data: iso(48 * HORA), jogadores_por_time: 1, local: 'Quadra do Guará' })).json;
  const F = futuro.game || futuro;
  await chamar('m3', 'POST', `/api/games/${F.id}/confirmar`, { confirmado: true });

  const saida = {
    pronto: true,
    base: app.base,
    tokens: Object.fromEntries(Object.entries(U).map(([k, u]) => [k, app.token(u.id)])),
    pessoas: Object.fromEntries(Object.entries(U).map(([k, u]) => [k, { id: u.id, nome: u.nome, email: u.email }])),
    time: { id: T.id, slug: T.slug, nome: T.nome },
    time2: { id: T2.id, slug: T2.slug, nome: T2.nome },
    convite: { token: conv.token, codigo: conv.codigo },
    convite2: { token: conv2.token, codigo: conv2.codigo },
    jogoFuturo: { id: F.id, data: app.tabelas.games.find((g) => g.id === F.id).data },
  };
  process.stdout.write(`${JSON.stringify(saida)}\n`);

  process.stdin.setEncoding('utf8');
  process.stdin.on('data', (d) => {
    const s = String(d);
    if (s.includes('pendentes')) process.stdout.write(`${JSON.stringify({ pendentes: (app.tabelas.convites_pendentes || []).map((l) => ({ ...l })) })}\n`);
    if (s.includes('apagadas')) process.stdout.write(`${JSON.stringify({ apagadas: app.chamadasAdmin.filter(([o]) => o === 'deleteUser').map(([, id]) => id) })}\n`);
    if (s.includes('avancar')) {
      desvioMs += 3 * 24 * HORA;
      process.stdout.write(`${JSON.stringify({ avancou: true, agora: new Date().toISOString() })}\n`);
    }
    if (s.includes('fim')) process.stdout.write(`${JSON.stringify({ rede: app.tentativasDeRede })}\n`, () => process.exit(0));
  });
  process.stdin.on('end', () => process.exit(0));
})().catch((e) => { process.stderr.write(`[motor-31u] ${e.stack || e.message}\n`); process.exit(1); });
