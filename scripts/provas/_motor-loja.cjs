// Futty v2.0 — o motor FALSO das capturas da revisão da Apple (scripts/capturar-revisao-loja.mjs): o motor de VERDADE (server.js, todas as rotas) por cima
// de um banco, um Storage e um Auth de MENTIRA, em memória (backend/tests/_appFalsa.js). O .env do backend nunca é lido, a rede de fora está fechada e o
// servidor só escuta em 127.0.0.1 — nada daqui toca a produção.
//
// O mundo: a loja abre por plataforma e só o iOS está ligado (PAGAMENTOS_PLATAFORMAS=ios, PAGAMENTOS_ATIVOS desligado). O Pedro (admin do time
// Domingueira FC) pede como iPhone e vê a loja; o Zé, do mesmo time, pede como Android e a loja fica fechada para ele.
//
// Protocolo com o script: uma linha de JSON no stdout quando está pronto ({ pronto, base, ... }); "fim\n" no stdin devolve a última linha (o que o motor
// tentou fazer na rede) e encerra.
'use strict';

const path = require('node:path');

const TESTES_DO_MOTOR = path.resolve(__dirname, '..', '..', '..', 'backend', 'tests');
// PRIMEIRO require: o dotenv de mentira e a rede fechada têm de estar de pé antes de qualquer módulo do motor.
const { subirApp, usuario } = require(path.join(TESTES_DO_MOTOR, '_appFalsa.js'));
const { uuid } = require(path.join(TESTES_DO_MOTOR, '_mundoDeSeguranca.js'));

const fala = (...a) => process.stderr.write(`${a.join(' ')}\n`);

(async () => {
  const app = await subirApp();
  const N = 32;
  const PESSOAS = { adm: ['Pedro', 'Pedro Ferreira Borges'], ze: ['Zé', 'José Carlos Ribeiro'], ana: ['Ana', 'Ana Paula Souza'] };
  const ids = { adm: uuid('a1', N), ze: uuid('a2', N), ana: uuid('a3', N) };
  const U = Object.fromEntries(Object.entries(PESSOAS).map(([k, [apelido, nome]]) => [k, { ...usuario(ids[k], apelido), nome, nome_jogador: apelido, birthdate: '1990-01-01' }]));
  app.reiniciar({ tabelas: {}, usuarios: Object.values(U) });
  app.criarBucketsDoProjeto();
  for (const u of Object.values(U)) {
    const { data } = await app.cliente.auth.getUser(app.token(u.id));
    data.user.user_metadata.onboarding_completo = true;
  }

  // A loja abre por plataforma: só o iOS está ligado (PAGAMENTOS_PLATAFORMAS=ios) e PAGAMENTOS_ATIVOS fica desligado. Lido a cada pedido pelo
  // motor. As provas fazem o Pedro pedir como iPhone e os outros como Android (cabeçalho X-Futty-Plataforma): a loja abre para ele e não para o Zé.
  // LOJA_ABERTA=1 (a prova da 31E): a loja abre para TODOS (PAGAMENTOS_ATIVOS). A prova pode mandar a própria lista em LOJA_PLATAFORMAS (a da 31H) ou
  // LOJA_SEM_A_VARIAVEL=1 (o motor sem PAGAMENTOS_PLATAFORMAS: android e ios).
  if (process.env.LOJA_ABERTA === '1') process.env.PAGAMENTOS_ATIVOS = 'true'; else delete process.env.PAGAMENTOS_ATIVOS;
  process.env.PAGAMENTOS_PLATAFORMAS = process.env.LOJA_PLATAFORMAS ?? 'ios';
  if (process.env.LOJA_SEM_A_VARIAVEL === '1') delete process.env.PAGAMENTOS_PLATAFORMAS;
  // LOJA_FECHADA=1 (a prova da 31G): nenhuma plataforma e PAGAMENTOS_ATIVOS desligado — a loja está FECHADA para todos e as telas ficam no
  // pedido de ativação.
  if (process.env.LOJA_FECHADA === '1') { process.env.PAGAMENTOS_PLATAFORMAS = ''; delete process.env.PAGAMENTOS_ATIVOS; }

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
  await chamar('ze', 'POST', `/api/convite/${conv.json?.token || conv.json?.convite?.token}/aceitar`, {});

  // LOJA_RANKING=1 (a prova da 31D): a Ana entra no time e os três jogam 3 jogos já passados — o ranking só põe quem tem 3 jogos, e com três pessoas
  // todas ficam no pódio (o Pedro entre elas).
  if (process.env.LOJA_RANKING === '1') {
    await chamar('ana', 'POST', `/api/convite/${conv.json?.token || conv.json?.convite?.token}/aceitar`, {});
    for (let i = 0; i < 3; i += 1) {
      const jogo = await chamar('adm', 'POST', '/api/games', { team_slug: T.slug, data: new Date(Date.now() + (72 + i) * 3600000).toISOString(), jogadores_por_time: 3, local: 'Quadra do Guará' });
      const G = jogo.json.game || jogo.json;
      for (const quem of ['adm', 'ze', 'ana']) await chamar(quem, 'POST', `/api/games/${G.id}/confirmar`, { confirmado: true });
      app.tabelas.games.find((g) => g.id === G.id).data = new Date(Date.now() - (30 + i) * 3600000).toISOString();
    }
  }
  // LOJA_CREDITOS=1: o Pedro (3) e o Zé (2) têm foto e gerações da Minha Figurinha — a grade de uniformes tem tiles para gerar.
  if (process.env.LOJA_CREDITOS === '1') {
    for (const [quem, n] of [['adm', 3], ['ze', 2]]) {
      const foto = `https://projeto-falso.supabase.test/storage/v1/object/public/avatars/${U[quem].id}.webp`;
      Object.assign(app.tabelas.users.find((x) => x.id === U[quem].id), { brilhante_creditos: n, avatar_url: foto, foto_url: foto });
    }
  }

  // LOJA_FIGURINHA=1 (a prova da 31G): o avatar do Pedro é um arquivo NOSSO (`-ai-` no nome, no bucket avatars) — para o motor, ele TEM uma figurinha.
  if (process.env.LOJA_FIGURINHA === '1') {
    const base = 'https://projeto-falso.supabase.test/storage/v1/object/public/avatars/public';
    Object.assign(app.tabelas.users.find((x) => x.id === U.adm.id), { foto_url: `${base}/${U.adm.id}-1.webp`, avatar_url: `${base}/${U.adm.id}-ai-dark-gold-1.png` });
  }

  // LOJA_PACOTE_ATIVO=1: o time do Pedro já tem o pacote ativo e o uniforme escolhido (o que o Gabinete faz), para ver o cartão do Pacote sem botão.
  if (process.env.LOJA_PACOTE_ATIVO === '1') {
    const linha = app.tabelas.teams.find((x) => x.id === T.id);
    Object.assign(linha, { brilhante_ativo: true, brilhante_kit: 'dark-gold', brilhante_limite: 25 });
  }
  // LOJA_PACOTE_ESGOTADO=1: o Pedro já gastou as 2 gerações dele no pacote — sem direito, a Figurinha mostra o convite (e o botão de comprar mais).
  if (process.env.LOJA_PACOTE_ESGOTADO === '1') {
    app.tabelas.brilhantes_time = app.tabelas.brilhantes_time || [];
    app.tabelas.brilhantes_time.push({ team_id: T.id, user_id: U.adm.id, geracoes: 2, kit_id: 'dark-gold', avatar_url: 'x', custo_cents: 0 });
    // …e ele tem uma FOTO (o convite "Vire figurinha" só aparece para quem tem foto e nenhuma geração sobrando).
    const foto = `https://projeto-falso.supabase.test/storage/v1/object/public/avatars/${U.adm.id}.webp`;
    Object.assign(app.tabelas.users.find((x) => x.id === U.adm.id), { avatar_url: foto, foto_url: foto });
  }

  process.stdout.write(`${JSON.stringify({
    pronto: true,
    base: app.base,
    tokens: Object.fromEntries(Object.entries(U).map(([k, u]) => [k, app.token(u.id)])),
    pessoas: Object.fromEntries(Object.entries(U).map(([k, u]) => [k, { id: u.id, apelido: u.nome_jogador }])),
    time: { id: T.id, slug: T.slug },
  })}\n`);

  process.stdin.setEncoding('utf8');
  process.stdin.on('data', (d) => {
    if (!String(d).includes('fim')) return;
    process.stdout.write(`${JSON.stringify({ rede: app.tentativasDeRede })}\n`, () => process.exit(0));
  });
  process.stdin.on('end', () => process.exit(0));
})().catch((e) => { process.stderr.write(`[motor-loja] ${e.stack || e.message}\n`); process.exit(1); });
