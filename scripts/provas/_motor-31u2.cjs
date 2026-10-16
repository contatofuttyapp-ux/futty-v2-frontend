// Futty v2.0 — o motor FALSO da prova da Rodada 31U-2 (scripts/provas/rodada-31u2.prova.mjs): o motor de VERDADE (server.js, todas as rotas) por cima
// de um banco, um Storage e um Auth de MENTIRA, em memória (backend/tests/_appFalsa.js). O .env do backend aponta para o único banco (o de produção):
// aqui ele nunca é lido, a rede de fora está fechada e o servidor só escuta em 127.0.0.1.
//
// O mundo, montado pelas rotas de verdade:
//   · Missa de Quinta (o Pedro; o Magrão é membro) e o link /c/missa-de-quinta-<código>;
//   · a Pelada do Zé (outro time, do Zé), com o seu link — o convite que fica "pela rede" quando a prova quer as duas coisas ao mesmo tempo;
//   · contas NOVAS, sem time e sem cadastro, uma por caso do referrer (vazio, de quem instalou pela busca, estranho, válido, referrer + rede, app
//     antigo, iPhone); e o Perdido, que terminou o cadastro e está sem time.
//
// Protocolo com a prova: uma linha de JSON no stdout quando está pronto ({ pronto, base, ... }). No stdin: "pendentes\n" devolve as linhas de
// convites_pendentes; "fim\n" devolve a última linha (o que o motor tentou fazer na rede) e encerra. O resto do que se diz vai para o stderr.
'use strict';

const path = require('node:path');

const TESTES_DO_MOTOR = path.resolve(__dirname, '..', '..', '..', 'backend', 'tests');
// PRIMEIRO require: o dotenv de mentira e a rede fechada têm de estar de pé antes de qualquer módulo do motor.
const { subirApp, usuario } = require(path.join(TESTES_DO_MOTOR, '_appFalsa.js'));
const { uuid } = require(path.join(TESTES_DO_MOTOR, '_mundoDeSeguranca.js'));

const fala = (...a) => process.stderr.write(`${a.join(' ')}\n`);
const iso = (ms) => new Date(Date.now() + ms).toISOString();

(async () => {
  const app = await subirApp();
  const N = 732;

  const VETERANOS = {
    adm: ['Pedro', 'Pedro Ferreira Borges'],
    m1: ['Magrão', 'Marcos Antunes Lopes'],
    m2: ['Zé', 'José Carlos Ribeiro'],
    perdido: ['Perdido', 'Rogério Perdigão Alves'],
  };
  // As contas novas: [nome completo, e-mail]. Sem apelido (o cadastro pergunta) e sem cadastro concluído.
  const NOVOS = {
    vazio: ['Rafael Motta Dias', 'motta@futtymock.com'],
    organico: ['Caio Nunes Pereira', 'caio@futtymock.com'],
    estranho: ['Thiago Rocha Lima', 'thiago@futtymock.com'],
    valido: ['Miguel Souza Lima', 'miguel@futtymock.com'],
    ambos: ['Bruno Teixeira Gomes', 'bruno@futtymock.com'],
    antigo: ['Diego Alves Moura', 'diego@futtymock.com'],
    iphone: ['Marcos Vinicius Prado', 'marquinhos@futtymock.com'],
  };
  const chaves = [...Object.keys(VETERANOS), ...Object.keys(NOVOS)];
  const ids = Object.fromEntries(chaves.map((k, i) => [k, uuid(`u${String(i + 1).padStart(2, '0')}`, N)]));
  const U = {
    ...Object.fromEntries(Object.entries(VETERANOS).map(([k, [apelido, nome]]) => [k, { ...usuario(ids[k], apelido), nome, nome_jogador: apelido, birthdate: '1990-01-01', created_at: iso(-30 * 60000) }])),
    ...Object.fromEntries(Object.entries(NOVOS).map(([k, [nome, email]]) => [k, { ...usuario(ids[k], 'x'), nome, nome_jogador: null, email, birthdate: '1990-01-01' }])),
  };
  app.reiniciar({ tabelas: {}, usuarios: Object.values(U), superAdmins: [U.adm.id] });
  app.criarBucketsDoProjeto();
  // O Auth de mentira só anota o updateUserById; o de verdade grava. Aqui ele grava o user_metadata na conta, para o "cadastro concluído"
  // valer no pedido seguinte (sem isso, recarregar o app devolveria a pessoa ao cadastro).
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
  await chamar('m1', 'POST', `/api/convite/${conv.token}/aceitar`, {});
  const T2 = (await chamar('m2', 'POST', '/api/teams', { nome: 'Pelada do Zé', publica: false, cor: 'azul' })).json.team;
  const conv2 = (await chamar('m2', 'POST', `/api/teams/${T2.slug}/convite`, {})).json;

  const saida = {
    pronto: true,
    base: app.base,
    tokens: Object.fromEntries(Object.entries(U).map(([k, u]) => [k, app.token(u.id)])),
    pessoas: Object.fromEntries(Object.entries(U).map(([k, u]) => [k, { id: u.id, nome: u.nome, email: u.email }])),
    time: { id: T.id, slug: T.slug, nome: T.nome },
    time2: { id: T2.id, slug: T2.slug, nome: T2.nome },
    convite: { token: conv.token, codigo: conv.codigo },
    convite2: { token: conv2.token, codigo: conv2.codigo },
  };
  process.stdout.write(`${JSON.stringify(saida)}\n`);

  process.stdin.setEncoding('utf8');
  process.stdin.on('data', (d) => {
    const s = String(d);
    if (s.includes('pendentes')) process.stdout.write(`${JSON.stringify({ pendentes: (app.tabelas.convites_pendentes || []).map((l) => ({ ...l })) })}\n`);
    if (s.includes('fim')) process.stdout.write(`${JSON.stringify({ rede: app.tentativasDeRede })}\n`, () => process.exit(0));
  });
  process.stdin.on('end', () => process.exit(0));
})().catch((e) => { process.stderr.write(`[motor-31u2] ${e.stack || e.message}\n`); process.exit(1); });
