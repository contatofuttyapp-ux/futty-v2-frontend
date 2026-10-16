// Futty v2.0 — o motor FALSO da prova da Rodada 31S (scripts/provas/rodada-31s.prova.mjs): o motor de VERDADE (server.js, todas as rotas) por cima de um
// banco, um Storage e um Auth de MENTIRA, em memória (backend/tests/_appFalsa.js). O .env do backend aponta para o único banco (o de produção): aqui ele
// nunca é lido, a rede de fora está fechada e o servidor só escuta em 127.0.0.1.
//
// O mundo, montado pelas rotas de verdade: o time Missa de Quinta (o Pedro, admin, e o Magrão) e o link do convite (/c/missa-de-quinta-<código>). E as
// contas NOVAS da prova, sem time e sem onboarding, uma por caminho (o link no app do iPhone e do Android e no navegador, com e sem convite; o link
// aberto em outro aparelho; o link vencido; o Entrar numa conta sem confirmar).
// As contas já existem no Auth de mentira porque o cadastro de verdade acontece no Supabase, fora do motor: a prova responde o Supabase no navegador
// (cadastro, o link do e-mail, reenvio) e entrega a sessão delas, que este motor aceita.
//
// Protocolo com a prova: uma linha de JSON no stdout quando está pronto ({ pronto, base, ... }); "membros\n" no stdin devolve { membros: [user_id] }
// (a tabela team_members do time); "fim\n" devolve a última linha (o que o motor tentou fazer na rede) e encerra. O resto vai para o stderr.
'use strict';

const path = require('node:path');

const TESTES_DO_MOTOR = path.resolve(__dirname, '..', '..', '..', 'backend', 'tests');
// PRIMEIRO require: o dotenv de mentira e a rede fechada têm de estar de pé antes de qualquer módulo do motor.
const { subirApp, usuario } = require(path.join(TESTES_DO_MOTOR, '_appFalsa.js'));
const { uuid } = require(path.join(TESTES_DO_MOTOR, '_mundoDeSeguranca.js'));

const fala = (...a) => process.stderr.write(`${a.join(' ')}\n`);

(async () => {
  const app = await subirApp();
  const N = 319;

  const VETERANOS = {
    adm: ['Pedro', 'Pedro Ferreira Borges'],
    m1: ['Magrão', 'Marcos Antunes Lopes'],
  };
  // As contas novas: [nome completo, e-mail]. Sem apelido (o onboarding pergunta) e sem onboarding.
  const NOVOS = {
    appSem: ['Lucas Andrade Pires', 'lucas@futtymock.com'],
    appCom: ['Diego Martins Rocha', 'diego@futtymock.com'],
    androidCom: ['Bruno Teixeira Gomes', 'bruno@futtymock.com'],
    androidSem: ['Rafael Costa Lima', 'rafael@futtymock.com'],
    siteSem: ['Felipe Nunes Barros', 'felipe@futtymock.com'],
    siteCom: ['Caio Henrique Lopes', 'caio@futtymock.com'],
    foraAberto: ['Thiago Moura Dias', 'thiago@futtymock.com'],
    foraFechado: ['Gustavo Ramos Leite', 'gustavo@futtymock.com'],
    vencido: ['Renato Alves Cunha', 'renato@futtymock.com'],
    semConfirmar: ['Vitor Hugo Prado', 'vitor@futtymock.com'],
    linkAntigo: ['Igor Batista Melo', 'igor@futtymock.com'],
  };
  const chaves = [...Object.keys(VETERANOS), ...Object.keys(NOVOS)];
  // Dois algarismos no prefixo: com dez contas, "s1"+"00319" e "s10"+"0319" dariam o mesmo id.
  const ids = Object.fromEntries(chaves.map((k, i) => [k, uuid(`s${String(i + 1).padStart(2, '0')}`, N)]));
  const U = {
    ...Object.fromEntries(Object.entries(VETERANOS).map(([k, [apelido, nome]]) => [k, { ...usuario(ids[k], apelido), nome, nome_jogador: apelido, birthdate: '1990-01-01' }])),
    // A data de nascimento já vem (o cadastro por e-mail a manda no user_metadata; o motor a grava): o onboarding não pergunta de novo.
    ...Object.fromEntries(Object.entries(NOVOS).map(([k, [nome, email]]) => [k, { ...usuario(ids[k], 'x'), nome, nome_jogador: null, email, birthdate: '1990-01-01' }])),
  };
  app.reiniciar({ tabelas: {}, usuarios: Object.values(U) });
  app.criarBucketsDoProjeto();
  // Esta prova é do link do e-mail, não do convite pendente: aqui todo aparelho está na MESMA rede (127.0.0.1) e o convite que um navegador
  // abre numa seção seria achado pelo app da seção seguinte (o caminho da prova rodada-31u). Sem a tabela 084, cada seção vale por si.
  const deVerdade = app.cliente.from.bind(app.cliente);
  app.cliente.from = (tabela) => {
    if (tabela !== 'convites_pendentes') return deVerdade(tabela);
    const falha = { data: null, error: { code: '42P01', message: 'relation "public.convites_pendentes" does not exist' } };
    const q = new Proxy({}, { get: (_o, k) => (k === 'then' ? (ok) => ok(falha) : () => q) });
    return q;
  };
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
  const criado = await chamar('adm', 'POST', '/api/teams', { nome: 'Missa de Quinta', publica: false, cor: 'verde' });
  const T = criado.json.team;
  const conv = await chamar('adm', 'POST', `/api/teams/${T.slug}/convite`, {});
  const { token, codigo } = conv.json;
  await chamar('m1', 'POST', `/api/convite/${token}/aceitar`, {});

  const saida = {
    pronto: true,
    base: app.base,
    tokens: Object.fromEntries(Object.entries(U).map(([k, u]) => [k, app.token(u.id)])),
    pessoas: Object.fromEntries(Object.entries(U).map(([k, u]) => [k, { id: u.id, nome: u.nome, email: u.email }])),
    time: { id: T.id, slug: T.slug, nome: T.nome },
    convite: { token, codigo },
  };
  process.stdout.write(`${JSON.stringify(saida)}\n`);

  process.stdin.setEncoding('utf8');
  process.stdin.on('data', (d) => {
    // "membros": as linhas de team_members do time, lidas da tabela (não de uma rota), para a prova conferir onde a pessoa terminou.
    if (String(d).includes('membros')) {
      const linhas = (app.tabelas.team_members || []).filter((m) => m.team_id === T.id).map((m) => m.user_id);
      process.stdout.write(`${JSON.stringify({ membros: linhas })}\n`);
    }
    if (!String(d).includes('fim')) return;
    process.stdout.write(`${JSON.stringify({ rede: app.tentativasDeRede })}\n`, () => process.exit(0));
  });
  process.stdin.on('end', () => process.exit(0));
})().catch((e) => { process.stderr.write(`[motor-31s] ${e.stack || e.message}\n`); process.exit(1); });
