// Futty v2.0 — o motor FALSO da prova da Rodada 31T (scripts/provas/rodada-31t.prova.mjs): o motor de VERDADE (server.js, todas as rotas) por cima de um
// banco, um Storage e um Auth de MENTIRA, em memória (backend/tests/_appFalsa.js). O .env do backend aponta para o único banco (o de produção): aqui ele
// nunca é lido, a rede de fora está fechada e o servidor só escuta em 127.0.0.1.
//
// O mundo é a Missa de Quinta DEPOIS do FUT\DADOS-31T.sql (o SQL em si é provado à parte, num Postgres local): fuso de Lisboa, presença de fundador até
// 18-out-2026; o jogo de 04/06 com campeão (Chavo) e foto; três jogos antigos só com a foto do campeão (os posts do Chavo já saíram); o jogo de 15-out
// sorteado com os convidados sem app El Chavo, Gabriel Costa, Motta, Miguel, Gui e Zé da Tasca, campeão o time do El Chavo; depois dele entraram no time
// Gabriel, Motta, Miguel, Marquinhos e Gui, e HOJE entra o Novato. Jogos depois do corte: 22/10, 29/10, 05/11 e 12/11 — o Gabriel confirmou os dois
// primeiros.
//
// Protocolo com a prova: uma linha de JSON no stdout quando está pronto ({ pronto, base, ... }). No stdin: "avancar\n" adianta o relógio do motor em
// 31 dias e faz o Daqui-a-um-mês entrar no time (responde {"avancou":true}); "fim\n" devolve a última linha (o que o motor tentou fazer na rede) e encerra.
'use strict';

const path = require('node:path');

// O relógio do motor: o mundo é o de 16-out-2026 (o corte de fundador em 18-out, o jogo de 15-out, os jogos de 22/10 a 12/11 ainda por vir), então o
// relógio COMEÇA nesse dia em qualquer data em que a prova rode, e a prova adianta 31 dias para "daqui a um mês". Trocado ANTES de qualquer módulo
// do motor carregar.
const DataReal = Date;
const HOJE_NO_MUNDO = DataReal.parse('2026-10-16T14:00:00.000Z');
let desvioMs = HOJE_NO_MUNDO - DataReal.now();
class DataDoMotor extends DataReal {
  constructor(...a) { if (a.length) super(...a); else super(DataReal.now() + desvioMs); }
  static now() { return DataReal.now() + desvioMs; }
}
global.Date = DataDoMotor;

const BACKEND = path.resolve(__dirname, '..', '..', '..', 'backend');
const TESTES_DO_MOTOR = path.join(BACKEND, 'tests');
// PRIMEIRO require: o dotenv de mentira e a rede fechada têm de estar de pé antes de qualquer módulo do motor.
const { subirApp, usuario, URL_DO_BANCO } = require(path.join(TESTES_DO_MOTOR, '_appFalsa.js'));
const { uuid } = require(path.join(TESTES_DO_MOTOR, '_mundoDeSeguranca.js'));
const sharp = require(path.join(BACKEND, 'node_modules', 'sharp'));

const fala = (...a) => process.stderr.write(`${a.join(' ')}\n`);
const HORA = 3600 * 1000;

// Uma foto de mentira para o cartão: um campo verde com as linhas brancas (nenhuma foto de gente de verdade). Só pixels — o motor não deixa o
// sharp ler SVG. Cada data tem um verde e uma faixa em outra altura, para as fotos não serem iguais.
const linhaBranca = (largura, altura) => ({ create: { width: largura, height: altura, channels: 3, background: '#ffffff' } });
const fotoDe = async (posicao, cor) => sharp({ create: { width: 900, height: 640, channels: 3, background: cor } })
  .composite([
    { input: linhaBranca(820, 6), left: 40, top: 40 }, { input: linhaBranca(820, 6), left: 40, top: 594 },
    { input: linhaBranca(6, 560), left: 40, top: 40 }, { input: linhaBranca(6, 560), left: 854, top: 40 },
    { input: linhaBranca(6, 560), left: 447, top: 40 }, { input: linhaBranca(160, 160), left: 370 + posicao * 0, top: 80 + posicao * 110 },
  ])
  .jpeg({ quality: 80 }).toBuffer();

(async () => {
  const app = await subirApp();
  const N = 47;

  // quem: [apelido, nome completo]
  const PESSOAS = {
    chavo: ['Chavo, el matador', 'Pedro Borges'],
    gabriel: ['Gabriel Costa', 'Gabriel Costa Lima'],
    motta: ['Motta', 'Ricardo Motta Alves'],
    miguel: ['Miguel', 'Miguel Santos Rocha'],
    marquinhos: ['Marquinhos', 'Marcos Vinícius Prado'],
    gui: ['Gui', 'Guilherme Nunes Paiva'],
    novato: ['Novato', 'Renato Dias Correia'], // entra HOJE
    mes: ['Daqui-a-um-mês', 'Otávio Mendes Lago'], // entra daqui a um mês
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
    fala(`${ok ? 'ok  ' : 'ERRO'} ${r.status} ${quem.padEnd(10)} ${metodo.padEnd(6)} ${rota}${ok ? '' : ` — ${String(r.json?.error || r.texto).slice(0, 160)}`}`);
    if (!ok) throw new Error(`${metodo} ${rota} → ${r.status}`);
    return r;
  };

  for (const [quem, [apelido, nome]] of Object.entries(PESSOAS)) await chamar(quem, 'PATCH', '/api/me', { nome, nome_jogador: apelido });
  const criado = await chamar('chavo', 'POST', '/api/teams', { nome: 'Missa de Quinta', publica: false, cor: 'verde' });
  const T = criado.json.team;
  const time = app.tabelas.teams.find((t) => t.id === T.id);
  time.fuso = 'Europe/Lisbon';
  time.presenca_fundador_ate = '2026-10-18'; // o BLOCO A do DADOS-31T
  const conv = await chamar('chavo', 'POST', `/api/teams/${T.slug}/convite`, {});
  const token = conv.json?.token || conv.json?.convite?.token;

  // ── O jogo de 15-out: sorteado só com convidados sem app (ninguém do time tinha o app ainda), 21h de Lisboa. ──
  const CONVIDADOS = ['El Chavo', 'Gabriel Costa', 'Motta', 'Miguel', 'Gui', 'Zé da Tasca'];
  const jogo = await chamar('chavo', 'POST', '/api/games', { team_slug: T.slug, data: new Date(Date.now() + 48 * HORA).toISOString(), jogadores_por_time: 3, local: 'Urban Soccer' });
  const J15 = jogo.json.game || jogo.json;
  await chamar('chavo', 'POST', `/api/games/${J15.id}/sortear`, { convidados: CONVIDADOS });
  const linha15 = app.tabelas.games.find((g) => g.id === J15.id);
  linha15.data = '2026-10-15T20:00:00.000Z';
  const timeDoElChavo = linha15.times_resultado.times.findIndex((t) => t.jogadores.some((j) => !j.user_id && j.nome === 'El Chavo'));
  await chamar('chavo', 'PATCH', `/api/games/${J15.id}/resultado`, { campeao_time_index: timeDoElChavo, gols: [] });

  // Depois do jogo entram os outros cinco (e hoje, o Novato).
  for (const quem of ['gabriel', 'motta', 'miguel', 'marquinhos', 'gui', 'novato']) await chamar(quem, 'POST', `/api/convite/${token}/aceitar`, {});

  // ── O histórico, como o DADOS-31K/31T deixam: a foto mora no jogo; nenhum post de campeão. ──
  const urlDaFoto = async (nome, posicao, cor) => {
    const caminho = `${T.id}/historico/${nome}.jpg`;
    const { error } = await app.cliente.storage.from('resenha').upload(caminho, await fotoDe(posicao, cor), { contentType: 'image/jpeg' });
    if (error) throw new Error(`upload da foto ${nome}: ${error.message}`);
    return `${URL_DO_BANCO}/storage/v1/object/public/resenha/${caminho}`;
  };
  const antigo = (dia, extra) => ({ id: uuid(`c${dia.replace('/', '')}`, N), team_id: T.id, data: `2026-${dia.split('/')[1]}-${dia.split('/')[0]}T20:00:00.000Z`, local: 'Urban Soccer', status: 'agendado', cancelado: false, historico: true, ...extra });
  const historico = [
    antigo('04/06', {
      campeao_foto_url: await urlDaFoto('04-06', 0, '#2e7d32'), campeao_time_index: 0, time_vencedor: 'A', resultado_nivel: 1, sorteio_realizado: true,
      times_resultado: { times: [
        { nome: 'Time Ouro', jogadores: [{ user_id: U.chavo.id, nome: 'Chavo, el matador', avatar_url: null }, { user_id: null, convidado: true, nome: 'Zé da Tasca' }] },
        { nome: 'Time Roxo', jogadores: [{ user_id: null, convidado: true, nome: 'Toninho' }, { user_id: null, convidado: true, nome: 'Bené' }] },
      ] },
    }),
    antigo('11/06', { campeao_foto_url: await urlDaFoto('11-06', 1, '#1b5e20') }),
    antigo('25/06', { campeao_foto_url: await urlDaFoto('25-06', 2, '#33691e') }),
    antigo('09/07', { campeao_foto_url: await urlDaFoto('09-07', 3, '#388e3c') }),
  ];
  for (const g of historico) app.tabelas.games.push({ ...g, created_at: g.data });
  linha15.created_at = linha15.data;
  // Um post comum, que fica com autor.
  app.tabelas.feed_posts = app.tabelas.feed_posts || [];
  app.tabelas.feed_posts.push({ id: uuid('d1', N), team_id: T.id, author_id: U.gabriel.id, body: 'Bora quinta! Quem leva a bola?', tipo: 'post', conteudo: null, created_at: '2026-10-16T09:00:00.000Z' });

  // ── Depois do corte: 22/10 e 29/10 (o Gabriel confirmou), 05/11 e 12/11 (ninguém). Ainda vão acontecer. ──
  const depois = [];
  for (const [dia, iso] of [['22/10', '2026-10-22T20:00:00.000Z'], ['29/10', '2026-10-29T21:00:00.000Z'], ['05/11', '2026-11-05T21:00:00.000Z'], ['12/11', '2026-11-12T21:00:00.000Z']]) {
    const r = await chamar('chavo', 'POST', '/api/games', { team_slug: T.slug, data: iso, jogadores_por_time: 3, local: 'Urban Soccer' });
    const G = r.json.game || r.json;
    if (dia === '22/10' || dia === '29/10') await chamar('gabriel', 'POST', `/api/games/${G.id}/confirmar`, { confirmado: true });
    depois.push({ id: G.id, dia });
  }

  const saida = {
    pronto: true,
    base: app.base,
    agora: new Date().toISOString(),
    tokens: Object.fromEntries(Object.entries(U).map(([k, u]) => [k, app.token(u.id)])),
    pessoas: Object.fromEntries(Object.entries(U).map(([k, u]) => [k, { id: u.id, apelido: u.nome_jogador }])),
    time: { id: T.id, slug: T.slug },
    jogo15: { id: J15.id, timeDoElChavo },
    historico: historico.map((g) => ({ id: g.id, dia: g.data.slice(0, 10), so_foto: g.campeao_time_index == null })),
    depois,
  };
  process.stdout.write(`${JSON.stringify(saida)}\n`);

  process.stdin.setEncoding('utf8');
  process.stdin.on('data', async (d) => {
    const s = String(d);
    if (s.includes('avancar')) {
      desvioMs += 31 * 24 * HORA;
      try {
        // O convite de hoje já venceu daqui a um mês: o Chavo manda um novo, como faria de verdade.
        const novo = await chamar('chavo', 'POST', `/api/teams/${T.slug}/convite`, {});
        await chamar('mes', 'POST', `/api/convite/${novo.json?.token || novo.json?.convite?.token}/aceitar`, {});
        process.stdout.write(`${JSON.stringify({ avancou: true, agora: new Date().toISOString() })}\n`);
      } catch (e) {
        process.stdout.write(`${JSON.stringify({ avancou: false, erro: e.message })}\n`);
      }
    }
    if (s.includes('fim')) process.stdout.write(`${JSON.stringify({ rede: app.tentativasDeRede })}\n`, () => process.exit(0));
  });
  process.stdin.on('end', () => process.exit(0));
})().catch((e) => { process.stderr.write(`[motor-31t] ${e.stack || e.message}\n`); process.exit(1); });
