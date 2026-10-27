// Futty v2.0 — o motor FALSO da prova da Rodada 32H (scripts/provas/rodada-32h.prova.mjs): o motor de VERDADE (server.js, todas as rotas) por cima de
// um banco, um Storage e um Auth de MENTIRA, em memória (backend/tests/_appFalsa.js). O .env do backend aponta para o único banco (o de produção):
// aqui ele nunca é lido, a rede de fora está fechada e o servidor só escuta em 127.0.0.1.
//
// Como o da 32G: um RELÓGIO que a prova move ("relogio <iso>\n") — a lista fecha na hora do sorteio sem job nenhum, então o relógio do motor
// é o que decide — e os PUSH gravados em vez de sair ("estado\n" devolve os push, o registro jogo_avisos e as respostas).
//
// O mundo: a Missa de Quinta com o Chavo (admin, joga), a Ana, o Beto e o Caio; a Duda ainda fora do time (entra por convite no meio da
// prova). Um jogo de 20/10 já terminado, com a Ana e o Beto presentes e uma nota para a Ana: ela fica em 1º no Ranking — o pódio que antes
// soltava confete. E a Várzea do Chavo, com um link de convite que a prova faz vencer ("vencer <slug>\n").
'use strict';

const DateReal = Date;
let deslocamento = 0;
class DateDaProva extends DateReal {
  constructor(...a) {
    if (a.length === 0) super(DateReal.now() + deslocamento);
    else super(...a);
  }
  static now() { return DateReal.now() + deslocamento; }
}
global.Date = DateDaProva;
const moverRelogio = (iso) => { deslocamento = new DateReal(iso).getTime() - DateReal.now(); };
moverRelogio(process.env.R32H_RELOGIO || '2026-10-27T15:00:00-03:00');

const path = require('node:path');

const TESTES_DO_MOTOR = path.resolve(__dirname, '..', '..', '..', 'backend', 'tests');
const { subirApp, usuario } = require(path.join(TESTES_DO_MOTOR, '_appFalsa.js'));
const { uuid } = require(path.join(TESTES_DO_MOTOR, '_mundoDeSeguranca.js'));

const fala = (...a) => process.stderr.write(`${a.join(' ')}\n`);

(async () => {
  const app = await subirApp();
  const pushes = [];
  require(path.join(TESTES_DO_MOTOR, '..', 'routes', 'push.js')).enviarNotificacao = async (ids, payload, opcoes = {}) => {
    pushes.push({ ids: [...ids], titulo: payload.title, corpo: payload.body, url: payload.url, categoria: opcoes.categoria || null });
  };
  const N = 533;
  const PESSOAS = {
    adm: ['Chavo', 'Pedro Borges', 'chavo@exemplo.test'],
    ana: ['Ana', 'Ana Souza', 'ana@exemplo.test'],
    beto: ['Beto', 'Roberto Alves', 'beto@exemplo.test'],
    caio: ['Caio', 'Caio Mendes', 'caio@exemplo.test'],
    duda: ['Duda', 'Eduarda Reis', 'duda@exemplo.test'],
  };
  const ids = Object.fromEntries(Object.keys(PESSOAS).map((k, i) => [k, uuid(`e${String(i + 1).padStart(2, '0')}`, N)]));
  const U = Object.fromEntries(Object.entries(PESSOAS).map(([k, [apelido, nome, email]]) => [k, { ...usuario(ids[k], apelido), nome, nome_jogador: apelido, email, birthdate: '1990-01-01' }]));
  app.reiniciar({ tabelas: {}, usuarios: Object.values(U), superAdmins: [] });
  app.criarBucketsDoProjeto();
  for (const u of Object.values(U)) {
    const { data } = await app.cliente.auth.getUser(app.token(u.id));
    data.user.user_metadata.onboarding_completo = true;
    data.user.email = u.email;
  }

  const chamar = async (quem, metodo, rota, corpo) => {
    const r = await app.pedir(metodo, rota, { token: app.token(U[quem].id), corpo });
    const ok = r.status < 400;
    fala(`${ok ? 'ok  ' : 'ERRO'} ${r.status} ${quem.padEnd(5)} ${metodo.padEnd(6)} ${rota}${ok ? '' : ` — ${String(r.json?.error || r.texto).slice(0, 160)}`}`);
    if (!ok) throw new Error(`${metodo} ${rota} → ${r.status}`);
    return r;
  };

  const missa = (await chamar('adm', 'POST', '/api/teams', { nome: 'Missa de Quinta', publica: false, cor: 'roxo' })).json.team;
  for (const k of ['ana', 'beto', 'caio']) {
    const conv = await chamar('adm', 'POST', `/api/teams/${missa.slug}/convite`, {});
    await chamar(k, 'POST', `/api/convite/${conv.json.token}/aceitar`, {});
  }
  const varzea = (await chamar('adm', 'POST', '/api/teams', { nome: 'Várzea do Chavo', publica: false, cor: 'verde' })).json.team;
  await chamar('adm', 'POST', `/api/teams/${varzea.slug}/convite`, {});

  // O jogo de 20/10, já terminado: a Ana e o Beto estiveram, e a Ana tem nota — ela é a 1ª do Ranking (o pódio).
  const passado = { id: uuid('f01', N), team_id: missa.id, data: '2026-10-20T23:00:00Z', local: 'Arena', status: 'terminado', sorteio_realizado: true, num_times: 2, jogadores_por_time: 2, created_at: '2026-10-15T12:00:00Z', created_by: U.adm.id, campeao_time_index: 0, resultado_nivel: 1, times_resultado: { times: [{ jogadores: [{ user_id: U.ana.id, nome: 'Ana' }] }, { jogadores: [{ user_id: U.beto.id, nome: 'Beto' }] }] } };
  app.tabelas.games.push(passado);
  app.tabelas.game_players = app.tabelas.game_players || [];
  for (const k of ['ana', 'beto']) app.tabelas.game_players.push({ id: uuid(`f1${k === 'ana' ? 1 : 2}`, N), game_id: passado.id, user_id: U[k].id, confirmado: true, goleiro: false });
  app.tabelas.votes = app.tabelas.votes || [];
  app.tabelas.votes.push({ id: uuid('f21', N), team_id: missa.id, de_user_id: U.beto.id, para_user_id: U.ana.id, nota: 5, nota10: 10, created_at: '2026-10-21T12:00:00Z', updated_at: '2026-10-21T12:00:00Z' });

  // Item G: um post da Resenha de 3 semanas atrás, com a foto guardada como a URL do proxy e o token daquela época (já vencido) —
  // o caso das fotos que sumiam. O arquivo de verdade está no Storage de mentira.
  const sharp = require(path.join(TESTES_DO_MOTOR, '..', 'node_modules', 'sharp'));
  const { assinarToken } = require(path.join(TESTES_DO_MOTOR, '..', 'utils', 'mediaToken.js'));
  const fotoVelha = `${U.ana.id}-1760000000000.webp`;
  const foto = await sharp({ create: { width: 480, height: 320, channels: 3, background: { r: 139, g: 92, b: 246 } } }).webp().toBuffer();
  await app.cliente.storage.from('resenha').upload(fotoVelha, foto, { contentType: 'image/webp' });
  const agoraDaProva = new Date().toISOString();
  moverRelogio('2026-10-06T12:00:00-03:00');
  const tokenVelho = assinarToken('resenha', fotoVelha);
  moverRelogio(agoraDaProva);
  const postVelho = uuid('f31', N);
  app.tabelas.feed_posts = app.tabelas.feed_posts || [];
  app.tabelas.feed_posts.push({ id: postVelho, team_id: missa.id, author_id: U.ana.id, body: 'A foto do jogo de 6/10', tipo: 'post', created_at: '2026-10-06T23:30:00Z' });
  app.tabelas.feed_post_media = app.tabelas.feed_post_media || [];
  app.tabelas.feed_post_media.push({ id: uuid('f32', N), post_id: postVelho, url: `${app.base}/api/media/${tokenVelho}`, media_type: 'image', position: 0 });

  const saida = {
    pronto: true, // a prova acha a linha por este começo
    fotoVelha: { path: fotoVelha, urlGuardada: `${app.base}/api/media/${tokenVelho}` },
    base: app.base,
    relogio: new Date().toISOString(),
    tokens: Object.fromEntries(Object.entries(U).map(([k, u]) => [k, app.token(u.id)])),
    pessoas: Object.fromEntries(Object.entries(U).map(([k, u]) => [k, { id: u.id, apelido: u.nome_jogador, nome: u.nome, email: u.email }])),
    missa: { id: missa.id, slug: missa.slug }, varzea: { id: varzea.id, slug: varzea.slug },
  };
  process.stdout.write(`${JSON.stringify(saida)}\n`);

  // "estado\n" → {"estado": …}; "relogio <iso>\n" → {"relogio": iso}; "vencer <slug>\n" → {"vencido": n}; "fim\n" → {"rede": …}.
  process.stdin.setEncoding('utf8');
  let buffer = '';
  process.stdin.on('data', (d) => {
    buffer += String(d);
    let i;
    while ((i = buffer.indexOf('\n')) >= 0) {
      const linha = buffer.slice(0, i).trim();
      buffer = buffer.slice(i + 1);
      if (linha === 'estado') {
        const estado = {
          jogos: (app.tabelas.games || []).map((g) => ({ id: g.id, data: g.data, local: g.local, sorteio_em: g.sorteio_em || null, chamados: g.chamados ?? null, sorteio_realizado: !!g.sorteio_realizado })),
          avisos: (app.tabelas.jogo_avisos || []).map((a) => ({ game_id: a.game_id, tipo: a.tipo, destinatarios: a.destinatarios, web: !!a.web_enviado_em })),
          respostas: (app.tabelas.rsvp_respostas || []).map((r) => ({ game_id: r.game_id, user_id: r.user_id, status: r.status })),
          elenco: (app.tabelas.game_players || []).map((p) => ({ game_id: p.game_id, user_id: p.user_id, confirmado: p.confirmado })),
          pushes,
          agora: new Date().toISOString(),
        };
        process.stdout.write(`${JSON.stringify({ estado })}\n`);
      } else if (linha.startsWith('relogio ')) {
        moverRelogio(linha.slice(8));
        process.stdout.write(`${JSON.stringify({ relogio: new Date().toISOString() })}\n`);
      } else if (linha.startsWith('vencer ')) {
        const time = (app.tabelas.teams || []).find((t) => t.slug === linha.slice(7));
        let n = 0;
        for (const c of app.tabelas.convites || []) if (time && c.team_id === time.id) { c.expires_at = new Date(Date.now() - 3600 * 1000).toISOString(); n += 1; }
        process.stdout.write(`${JSON.stringify({ vencido: n })}\n`);
      } else if (linha === 'fim') {
        process.stdout.write(`${JSON.stringify({ rede: app.tentativasDeRede })}\n`, () => process.exit(0));
      }
    }
  });
  process.stdin.on('end', () => process.exit(0));
})().catch((e) => { process.stderr.write(`[motor-32h] ${e.stack || e.message}\n`); process.exit(1); });
