// Futty v2.0 — o motor FALSO da prova da Rodada 31R (scripts/provas/rodada-31r.prova.mjs): o motor de VERDADE (server.js, todas as rotas) por cima de um
// banco, um Storage e um Auth de MENTIRA, em memória (backend/tests/_appFalsa.js). O .env do backend aponta para o único banco (o de produção): aqui ele
// nunca é lido, a rede de fora está fechada e o servidor só escuta em 127.0.0.1.
//
// O mundo, montado pelas rotas de verdade: o time Missa de Quinta (o Pedro, admin, e o Magrão e o Zé, que já jogaram um jogo) e o link do convite
// (/c/missa-de-quinta-<código>). E seis contas NOVAS, sem time e sem onboarding, uma para cada caminho da prova: sem o app instalado (a pessoa vai à
// loja) e com o app instalado, cada uma por e-mail, Google e Apple. As contas já existem no Auth de mentira porque o cadastro de verdade acontece
// no Supabase, fora do motor: a prova responde o Supabase no navegador com a sessão delas.
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
  const N = 318;

  const VETERANOS = {
    adm: ['Pedro', 'Pedro Ferreira Borges'],
    m1: ['Magrão', 'Marcos Antunes Lopes'],
    m2: ['Zé', 'José Carlos Ribeiro'],
  };
  // As contas novas: [nome completo, e-mail]. Sem apelido (o onboarding pergunta) e sem onboarding.
  const NOVOS = {
    lojaEmail: ['Miguel Souza Lima', 'miguel@futtymock.com'],
    lojaGoogle: ['Rafael Motta Dias', 'motta@futtymock.com'],
    lojaApple: ['Marcos Vinicius Prado', 'marquinhos@futtymock.com'],
    appEmail: ['Bruno Teixeira Gomes', 'bruno@futtymock.com'],
    appGoogle: ['Gabriel Costa Neves', 'gabriel@futtymock.com'],
    appApple: ['Thiago Rocha Lima', 'thiago@futtymock.com'],
  };
  const chaves = [...Object.keys(VETERANOS), ...Object.keys(NOVOS)];
  const ids = Object.fromEntries(chaves.map((k, i) => [k, uuid(`r${i + 1}`, N)]));
  const U = {
    ...Object.fromEntries(Object.entries(VETERANOS).map(([k, [apelido, nome]]) => [k, { ...usuario(ids[k], apelido), nome, nome_jogador: apelido, birthdate: '1990-01-01' }])),
    // A data de nascimento já vem preenchida para as seis: a pergunta "Quando você nasceu?" (Google e Apple não trazem a data) não é deste
    // assunto e não mexe no convite.
    ...Object.fromEntries(Object.entries(NOVOS).map(([k, [nome, email]]) => [k, { ...usuario(ids[k], 'x'), nome, nome_jogador: null, email, birthdate: '1990-01-01' }])),
  };
  app.reiniciar({ tabelas: {}, usuarios: Object.values(U) });
  app.criarBucketsDoProjeto();
  // Esta prova é a do PLANO B: o motor sem a tabela do convite pendente (migração 084 por aplicar, ou a rede que mudou entre abrir o link e
  // cadastrar). Sem ela o convite volta pelo link copiado e pelo cartão "Recebeu um convite?". O caminho com o motor achando o convite é a
  // prova rodada-31u.
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
  for (const quem of ['m1', 'm2']) await chamar(quem, 'POST', `/api/convite/${token}/aceitar`, {});

  // Um jogo com os três, que já aconteceu: o Ranking tem números de quem jogou e "—" de quem acabou de chegar.
  const jogo = await chamar('adm', 'POST', '/api/games', { team_slug: T.slug, data: iso(48 * HORA), jogadores_por_time: 1, local: 'Quadra do Guará' });
  const G = jogo.json.game || jogo.json;
  for (const quem of ['adm', 'm1', 'm2']) await chamar(quem, 'POST', `/api/games/${G.id}/confirmar`, { confirmado: true });
  const linha = app.tabelas.games.find((g) => g.id === G.id);
  linha.data = iso(-26 * HORA);
  linha.status = 'terminado';

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
    if (!String(d).includes('fim')) return;
    process.stdout.write(`${JSON.stringify({ rede: app.tentativasDeRede })}\n`, () => process.exit(0));
  });
  process.stdin.on('end', () => process.exit(0));
})().catch((e) => { process.stderr.write(`[motor-31r] ${e.stack || e.message}\n`); process.exit(1); });
