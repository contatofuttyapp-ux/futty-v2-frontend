// Futty v2.0 — o motor FALSO da prova da Rodada 32A (scripts/provas/rodada-32a.prova.mjs): o motor de VERDADE (server.js, todas as rotas) por cima de um
// banco, um Storage e um Auth de MENTIRA, em memória — a mesma bancada do backend (backend/tests/_appFalsa.js) da prova da 31A.
// O .env do backend aponta para o único banco (o de produção): aqui ele nunca é lido, a rede de fora está fechada e o servidor só escuta em 127.0.0.1.
//
// O mundo reproduz a Missa de Quinta de 22-out SEM tocar nela: o time com 5 contas confirmadas no jogo (Pedro, o admin, e mais 4), mais 4 membros que
// jogaram como convidados e depois entraram no time (Gabriel, Mottinha, Miguelito e Marquinhos), e o Visitante, de OUTRO time (o papel da conta demo
// das lojas). Dois jogos iguais, um para cada largura da prova (390 e 360), 5 por time, ainda sem convidados nem sorteio: os 10 convidados a prova
// escreve pela tela.
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
  const N = 32;

  // quem: [apelido, nome completo]
  const PESSOAS = {
    adm: ['Pedro', 'Pedro Ferreira Borges'],
    m1: ['Fabinho', 'Fábio Nunes Prado'],
    m2: ['Leleco', 'Leandro Costa Lima'],
    m3: ['Juninho', 'Júlio César Moura'],
    m4: ['Careca', 'Carlos Henrique Dias'],
    g1: ['Gabriel', 'Gabriel Costa Ramos'], // jogou como o convidado "Gabriel Costa"
    g2: ['Mottinha', 'Rodrigo Motta Freire'], // "Motta"
    g3: ['Miguelito', 'Miguel Santos Rocha'], // "Miguel"
    g4: ['Marquinhos', 'Marcos Vinícius Alves'], // "Marcos"
    fora: ['Visitante', 'Vítor Souza Campos'], // de OUTRO time
  };
  // Um dígito hex depois do "b" (b0…b9): com "b1" e "b10" o uuid() dava o mesmo id.
  const ids = Object.fromEntries(Object.keys(PESSOAS).map((k, i) => [k, uuid(`b${i.toString(16)}`, N)]));
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
  const outro = await chamar('fora', 'POST', '/api/teams', { nome: 'Domingueira FC', publica: false, cor: 'verde' });
  const conv = await chamar('adm', 'POST', `/api/teams/${T.slug}/convite`, {});
  const token = conv.json?.token || conv.json?.convite?.token;
  for (const quem of ['m1', 'm2', 'm3', 'm4', 'g1', 'g2', 'g3', 'g4']) await chamar(quem, 'POST', `/api/convite/${token}/aceitar`, {});

  const jogos = [];
  for (let i = 0; i < 2; i += 1) {
    const jogo = await chamar('adm', 'POST', '/api/games', { team_slug: T.slug, data: iso((48 + i) * HORA), jogadores_por_time: 5, local: 'Quadra da Missa' });
    const G = jogo.json.game || jogo.json;
    for (const quem of ['adm', 'm1', 'm2', 'm3', 'm4']) await chamar(quem, 'POST', `/api/games/${G.id}/confirmar`, { confirmado: true });
    jogos.push(G.id);
  }

  const saida = {
    pronto: true,
    base: app.base,
    tokens: Object.fromEntries(Object.entries(U).map(([k, u]) => [k, app.token(u.id)])),
    pessoas: Object.fromEntries(Object.entries(U).map(([k, u]) => [k, { id: u.id, apelido: u.nome_jogador, nome: u.nome }])),
    time: { id: T.id, slug: T.slug }, outroTime: { slug: outro.json.team.slug },
    jogos,
  };
  process.stdout.write(`${JSON.stringify(saida)}\n`);

  process.stdin.setEncoding('utf8');
  process.stdin.on('data', (d) => {
    if (!String(d).includes('fim')) return;
    process.stdout.write(`${JSON.stringify({ rede: app.tentativasDeRede })}\n`, () => process.exit(0));
  });
  process.stdin.on('end', () => process.exit(0));
})().catch((e) => { process.stderr.write(`[motor-32a] ${e.stack || e.message}\n`); process.exit(1); });
