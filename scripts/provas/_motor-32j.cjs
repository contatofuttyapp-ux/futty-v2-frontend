// Futty v2.0 — o motor FALSO da prova da Rodada 32J (velocidade): o motor de VERDADE (server.js, todas as rotas) por cima de banco, Storage
// e Auth de MENTIRA, em memória (backend/tests/_appFalsa.js). O .env do backend aponta para o único banco (o de produção): aqui ele nunca é
// lido, a rede de fora está fechada e o servidor só escuta em 127.0.0.1.
//
// O que este tem de diferente: a DISTÂNCIA até o banco. Em memória tudo volta na hora e uma fila de 5 idas custaria o mesmo que 1; com
// cada ida atrasada como a de verdade (banco R32J_LAT_DB ms, Storage R32J_LAT_STORAGE, Auth R32J_LAT_AUTH), o tempo do motor passa a
// ser contado em idas em série, como em São Paulo. E o medidor de consultas do motor (MEDIR_CONSULTAS=1) põe em cada resposta o
// cabeçalho `X-Futty-Consultas: idas=N; fila=M`.
//
// O mundo é o "Início cheio" do dono: o Chavo administra a Missa de Quinta e a Várzea e joga na Pelada e no Racha (4 times); a Missa tem
// 40 jogos com resultado (30 com a foto do time campeão; o mais novo sem foto, para o "Adicionar foto"), 8 posts (4 com foto) e
// comentários; cada time tem o próximo jogo marcado; a mensalidade da Missa tem o lembrete ligado (a carona do Início). A Ana é jogadora
// comum da Missa.
//
// Dois jeitos de rodar:
//   node _motor-32j.cjs                    → sobe e fica ouvindo (a prova no navegador: "estado", "relogio <iso>", "fim" pelo stdin)
//   node _motor-32j.cjs --medir <etiqueta> → mede /api/inicio e /api/feed e grava FUT/PROVA-32J/medicao-<etiqueta>.json
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
const andarRelogio = (ms) => { deslocamento += ms; };
moverRelogio(process.env.R32J_RELOGIO || '2026-10-27T15:00:00-03:00');

// O medidor de consultas liga no carregamento do motor (server.js); o log por pedido fica calado (a prova lê o cabeçalho).
process.env.MEDIR_CONSULTAS = '1';
process.env.MEDIR_CONSULTAS_SILENCIO = process.env.R32J_LOG ? '0' : '1'; // R32J_LOG=1 mostra a linha de cada pedido

const path = require('node:path');
const fs = require('node:fs');
const crypto = require('node:crypto');

const TESTES_DO_MOTOR = path.resolve(__dirname, '..', '..', '..', 'backend', 'tests');
const { subirApp, usuario, URL_DO_BANCO } = require(path.join(TESTES_DO_MOTOR, '_appFalsa.js'));

const LAT = {
  db: Number(process.env.R32J_LAT_DB ?? 30),
  storage: Number(process.env.R32J_LAT_STORAGE ?? 80),
  auth: Number(process.env.R32J_LAT_AUTH ?? 60),
};
// O pool de conexões do PostgREST: o Supabase atende POOL consultas ao mesmo tempo; a 11ª espera uma das 10 acabar. É por isso que
// o NÚMERO de idas pesa, e não só a fila: 38 idas "em paralelo" são 4 rodadas de 10.
const POOL = Number(process.env.R32J_POOL ?? 10);
const fala = (...a) => process.stderr.write(`${a.join(' ')}\n`);
const dormir = (ms) => (ms > 0 ? new Promise((r) => { setTimeout(r, ms); }) : Promise.resolve());
let ocupadas = 0;
const naFila = [];
async function umaConsulta() {
  if (POOL > 0 && ocupadas >= POOL) await new Promise((r) => { naFila.push(r); });
  ocupadas += 1;
  try { await dormir(LAT.db); } finally {
    ocupadas -= 1;
    naFila.shift()?.();
  }
}

/** A distância até o banco: cada consulta, leitura do Storage e getUser só volta depois de LAT ms. Por fora do medidor do motor. */
function porADistancia(cliente) {
  const from0 = cliente.from.bind(cliente);
  cliente.from = (tabela) => {
    const b = from0(tabela);
    const then0 = b.then.bind(b);
    b.then = (ok, falha) => umaConsulta().then(() => then0(ok, falha));
    for (const nome of ['maybeSingle', 'single']) {
      const f0 = b[nome];
      b[nome] = async (...a) => { await umaConsulta(); return f0(...a); };
    }
    return b;
  };
  const storage0 = cliente.storage.from.bind(cliente.storage);
  cliente.storage.from = (bucket) => {
    const b = storage0(bucket);
    return new Proxy(b, {
      get(alvo, prop) {
        const v = alvo[prop];
        if (typeof v !== 'function' || !['download', 'list', 'upload', 'remove'].includes(prop)) return v;
        return async (...a) => { await dormir(LAT.storage); return v.apply(alvo, a); };
      },
    });
  };
  const getUser0 = cliente.auth.getUser.bind(cliente.auth);
  cliente.auth.getUser = async (...a) => { await dormir(LAT.auth); return getUser0(...a); };
}

const SP = '-03:00';
const DIA = 86400000;

(async () => {
  const app = await subirApp();
  const pushes = [];
  require(path.join(TESTES_DO_MOTOR, '..', 'routes', 'push.js')).enviarNotificacao = async (ids, payload) => { pushes.push({ ids: [...ids], titulo: payload.title }); };
  const sharp = require(path.join(TESTES_DO_MOTOR, '..', 'node_modules', 'sharp'));

  // ── as pessoas ──
  const NOMES = ['Chavo', 'Ana', 'Beto', 'Caio', 'Duda', 'Edu', 'Fabi', 'Gui', 'Hugo', 'Iara', 'João', 'Kiko', 'Lia', 'Mau', 'Nina', 'Otto', 'Paty', 'Quim', 'Rafa', 'Sol'];
  const U = NOMES.map((n, i) => ({ ...usuario(crypto.randomUUID(), n), nome: `${n} ${['Souza', 'Alves', 'Mendes', 'Reis'][i % 4]}`, nome_jogador: n, email: `${n.toLowerCase()}@exemplo.test`, birthdate: '1990-01-01' }));
  const [chavo, ana] = U;
  app.reiniciar({ tabelas: {}, usuarios: U, superAdmins: [] });
  app.criarBucketsDoProjeto();
  for (const u of U) {
    const { data } = await app.cliente.auth.getUser(app.token(u.id));
    data.user.user_metadata.onboarding_completo = true;
    data.user.email = u.email;
  }

  // Uma foto de verdade (degradê com ruído: o tamanho em bytes é o de uma foto, não o de um quadrado liso).
  async function foto(largura, altura, semente) {
    const px = Buffer.alloc(largura * altura * 3);
    let s = semente * 9301 + 49297;
    for (let y = 0; y < altura; y += 1) {
      for (let x = 0; x < largura; x += 1) {
        s = (s * 9301 + 49297) % 233280;
        const ruido = (s / 233280) * 40;
        const i = (y * largura + x) * 3;
        px[i] = (semente * 37 + x / 5 + ruido) % 256;
        px[i + 1] = (semente * 71 + y / 4 + ruido) % 256;
        px[i + 2] = (120 + semente * 13 + ruido) % 256;
      }
    }
    return sharp(px, { raw: { width: largura, height: altura, channels: 3 } }).webp({ quality: 82 }).toBuffer();
  }
  const urlCrua = (bucket, caminho) => `${URL_DO_BANCO}/storage/v1/object/public/${bucket}/${caminho}`;

  // Os avatares (a foto de cada pessoa).
  for (const [i, u] of U.entries()) {
    const caminho = `${u.id}/foto-${i}.webp`;
    await app.cliente.storage.from('avatars').upload(caminho, await foto(400, 600, i + 1), { contentType: 'image/webp' });
    const linha = app.tabelas.users.find((x) => x.id === u.id);
    linha.avatar_url = urlCrua('avatars', caminho);
    linha.foto_url = linha.avatar_url;
  }

  const chamar = async (quem, metodo, rota, corpo) => {
    const r = await app.pedir(metodo, rota, { token: app.token(quem.id), corpo });
    if (r.status >= 400) throw new Error(`${metodo} ${rota} → ${r.status} ${String(r.json?.error || r.texto).slice(0, 160)}`);
    return r;
  };
  const entrar = async (time, admin, pessoas) => {
    // O link do convite é reutilizável (vale 30 dias para quem receber): um por time, todos entram por ele.
    const conv = await chamar(admin, 'POST', `/api/teams/${time.slug}/convite`, {});
    for (const p of pessoas) await chamar(p, 'POST', `/api/convite/${conv.json.token}/aceitar`, {});
  };

  // ── os 4 times ──
  const missa = (await chamar(chavo, 'POST', '/api/teams', { nome: 'Missa de Quinta', publica: false, cor: 'roxo' })).json.team;
  const varzea = (await chamar(chavo, 'POST', '/api/teams', { nome: 'Várzea do Chavo', publica: false, cor: 'verde' })).json.team;
  const pelada = (await chamar(U[2], 'POST', '/api/teams', { nome: 'Pelada de Sábado', publica: false, cor: 'azul' })).json.team;
  const racha = (await chamar(U[3], 'POST', '/api/teams', { nome: 'Racha da Firma', publica: false, cor: 'vermelho' })).json.team;
  await entrar(missa, chavo, U.slice(1, 12));
  await entrar(varzea, chavo, U.slice(8, 16));
  await entrar(pelada, U[2], [chavo, ...U.slice(12, 20)]);
  await entrar(racha, U[3], [chavo, ...U.slice(4, 10)]);

  const T = app.tabelas;
  for (const k of ['games', 'game_players', 'feed_posts', 'feed_post_media', 'comentarios', 'reacoes', 'votes', 'team_mensalidade']) T[k] = T[k] || [];
  const elencoMissa = U.slice(0, 12);

  // ── 40 jogos da Missa com resultado: o mais novo há 2 dias, um por semana para trás. 30 com a foto do campeão (o mais novo SEM). ──
  const agora = Date.now();
  const jogosMissa = [];
  for (let i = 0; i < 40; i += 1) {
    const quando = new Date(agora - (2 + 7 * i) * DIA);
    const id = crypto.randomUUID();
    const embaralhado = [...elencoMissa].sort((a, b) => ((a.id + i) > (b.id + i) ? 1 : -1));
    const times = [0, 1].map((t) => ({ nome: ['Time Ouro', 'Time Roxo'][t], jogadores: embaralhado.slice(t * 5, t * 5 + 5).map((p) => ({ user_id: p.id, nome: p.nome_jogador, avatar_url: urlCrua('avatars', `${p.id}/foto-${U.indexOf(p)}.webp`) })) }));
    let campeaoFoto = null;
    if (i >= 1 && i <= 30) {
      const caminho = `jogos/${id}.webp`;
      await app.cliente.storage.from('resenha').upload(caminho, await foto(1200, 900, 100 + i), { contentType: 'image/webp' });
      campeaoFoto = urlCrua('resenha', caminho);
    }
    const g = {
      id, team_id: missa.id, data: quando.toISOString(), local: `Arena ${(i % 3) + 1}`, status: 'terminado', sorteio_realizado: true, num_times: 2, jogadores_por_time: 5,
      created_at: new Date(quando.getTime() + 3 * 3600000).toISOString(), created_by: chavo.id, campeao_time_index: 0, resultado_nivel: 1,
      times_resultado: { seed: 1000 + i, times }, campeao_foto_url: campeaoFoto, artilheiro_user_id: times[0].jogadores[0].user_id, artilheiro_gols: 3,
      destaque_user_id: times[1].jogadores[1].user_id, destaque_titulo: 'Paredão',
    };
    T.games.push(g);
    jogosMissa.push(g);
    for (const p of elencoMissa.slice(0, 10)) T.game_players.push({ id: crypto.randomUUID(), game_id: id, user_id: p.id, confirmado: true, goleiro: false });
    if (i < 12) {
      for (const [k, autor] of [U[1], U[4]].entries()) T.comentarios.push({ id: crypto.randomUUID(), parent_type: 'game', parent_id: id, author_id: autor.id, body: k ? 'Que jogo!' : 'Golaço do Chavo no fim', created_at: new Date(quando.getTime() + (4 + k) * 3600000).toISOString(), deleted_at: null });
      T.reacoes.push({ id: crypto.randomUUID(), target_type: 'game', target_id: id, user_id: U[2].id, emoji: '🔥' });
    }
  }
  // Os outros times têm histórico curto (4 jogos), para o Início dos 4 times ter "Últimos jogos" de todos.
  for (const time of [varzea, pelada, racha]) {
    for (let i = 0; i < 4; i += 1) {
      const quando = new Date(agora - (3 + 7 * i) * DIA);
      T.games.push({ id: crypto.randomUUID(), team_id: time.id, data: quando.toISOString(), local: 'Quadra', status: 'terminado', sorteio_realizado: true, num_times: 2, created_at: quando.toISOString(), created_by: chavo.id, campeao_time_index: 1, resultado_nivel: 1, times_resultado: { seed: 7, times: [{ nome: 'Time Ouro', jogadores: [] }, { nome: 'Time Roxo', jogadores: [] }] } });
    }
  }
  // O próximo jogo de cada time: amanhã (Missa às 20:00, os outros mais tarde na semana). Ninguém respondeu: o "Vou / Não vou" está à mostra.
  const proximos = {};
  for (const [k, time] of [missa, varzea, pelada, racha].entries()) {
    const quando = new Date(`2026-10-${28 + k}T20:00:00${SP}`);
    const id = crypto.randomUUID();
    proximos[time.slug] = id;
    T.games.push({ id, team_id: time.id, data: quando.toISOString(), local: ['Arena Missa', 'Campo da Várzea', 'Society do Sábado', 'Quadra da Firma'][k], status: 'agendado', sorteio_realizado: false, cancelado: false, num_times: 2, jogadores_por_time: 5, created_at: new Date(agora - DIA).toISOString(), created_by: chavo.id, sorteio_em: new Date(quando.getTime() - 3600000).toISOString(), chamados: null });
  }

  // ── 8 posts na Missa (4 com foto), espalhados entre os jogos ──
  for (let i = 0; i < 8; i += 1) {
    const id = crypto.randomUUID();
    const autor = U[1 + (i % 5)];
    T.feed_posts.push({ id, team_id: missa.id, author_id: autor.id, body: `Resenha ${i + 1}: ${['bora', 'que fase', 'quem leva a bola?', 'churrasco depois'][i % 4]}`, tipo: 'post', created_at: new Date(agora - (1 + 9 * i) * DIA).toISOString() });
    if (i % 2 === 0) {
      const caminho = `posts/${id}.webp`;
      await app.cliente.storage.from('resenha').upload(caminho, await foto(1200, 1200, 300 + i), { contentType: 'image/webp' });
      T.feed_post_media.push({ id: crypto.randomUUID(), post_id: id, url: urlCrua('resenha', caminho), media_type: 'image', position: 0 });
    }
  }
  // Votos (o Ranking e a votação pendente têm o que contar).
  for (const p of elencoMissa.slice(1, 6)) T.votes.push({ id: crypto.randomUUID(), team_id: missa.id, de_user_id: p.id, para_user_id: chavo.id, nota: 4, nota10: 8, created_at: new Date(agora - 5 * DIA).toISOString(), updated_at: new Date(agora - 5 * DIA).toISOString() });
  // A mensalidade da Missa com o lembrete ligado: a carona do /api/inicio tem trabalho a fazer.
  T.team_mensalidade.push({ team_id: missa.id, ativa: true, lembrete: true, dia_vencimento: 27, valor: 'R$ 40,00' });

  porADistancia(app.cliente);

  const saida = {
    pronto: true,
    base: app.base,
    relogio: new Date().toISOString(),
    latencia: LAT,
    tokens: { chavo: app.token(chavo.id), ana: app.token(ana.id) },
    pessoas: { chavo: { id: chavo.id, email: chavo.email, apelido: 'Chavo' }, ana: { id: ana.id, email: ana.email, apelido: 'Ana' } },
    times: Object.fromEntries([missa, varzea, pelada, racha].map((t) => [t.slug, { id: t.id, slug: t.slug, nome: t.nome }])),
    missa: { id: missa.id, slug: missa.slug },
    jogoSemFoto: jogosMissa[0].id,
    proximos,
    totalNaResenha: { jogos: 52, posts: 8 }, // os 40 da Missa + os 4 de cada um dos outros 3 times
  };

  if (process.argv[2] === '--medir') {
    await medir(app, saida, process.argv[3] || 'medicao');
    process.exit(0);
  }

  process.stdout.write(`${JSON.stringify(saida)}\n`);
  process.stdin.setEncoding('utf8');
  let buffer = '';
  process.stdin.on('data', (d) => {
    buffer += String(d);
    let i;
    while ((i = buffer.indexOf('\n')) >= 0) {
      const linha = buffer.slice(0, i).trim();
      buffer = buffer.slice(i + 1);
      if (linha === 'estado') {
        const jogo = T.games.find((g) => g.id === saida.jogoSemFoto);
        process.stdout.write(`${JSON.stringify({ estado: { campeao_foto_url: jogo?.campeao_foto_url || null, agora: new Date().toISOString() } })}\n`);
      } else if (linha.startsWith('relogio ')) {
        moverRelogio(linha.slice(8));
        process.stdout.write(`${JSON.stringify({ relogio: new Date().toISOString() })}\n`);
      } else if (linha === 'fim') {
        process.stdout.write(`${JSON.stringify({ rede: app.tentativasDeRede })}\n`, () => process.exit(0));
      }
    }
  });
  process.stdin.on('end', () => process.exit(0));
})().catch((e) => { process.stderr.write(`[motor-32j] ${e.stack || e.message}\n`); process.exit(1); });

// ─── A medição ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────
const percentil = (v, p) => { const o = [...v].sort((a, b) => a - b); return o[Math.min(o.length - 1, Math.ceil((p / 100) * o.length) - 1)]; };

async function medir(app, mundo, etiqueta) {
  const AMOSTRAS = Number(process.env.R32J_AMOSTRAS || 12);
  const rotas = (process.env.R32J_ROTAS || '/api/inicio,/api/feed?limite=20,/api/feed?limite=8').split(',');
  const token = mundo.tokens.chavo;
  const um = async (rota) => {
    const t0 = performance.now();
    const r = await app.pedir('GET', rota, { token });
    const ms = performance.now() - t0;
    if (r.status !== 200) throw new Error(`${rota} → ${r.status}`);
    const c = /idas=(\d+); fila=(\d+)/.exec(r.cabecalhos.get('x-futty-consultas') || '') || [];
    return { ms, idas: Number(c[1] || 0), fila: Number(c[2] || 0), kb: Buffer.byteLength(r.texto) / 1024 };
  };
  const linhas = [];
  for (const rota of rotas) {
    // "abrindo": a pessoa ficou 11 min longe (todo cache curto do motor venceu); "seguido": abriu de novo logo a seguir.
    for (const cenario of ['abrindo', 'seguido']) {
      const v = [];
      await um(rota); // o primeiro pedido do processo (JIT, módulos) não entra na conta
      for (let i = 0; i < AMOSTRAS; i += 1) {
        if (cenario === 'abrindo') andarRelogio(11 * 60 * 1000);
        v.push(await um(rota));
        await dormir(150); // o que ficou correndo por trás (renovação de cache, carona) acaba antes da próxima amostra
      }
      const ms = v.map((x) => x.ms);
      linhas.push({ rota, cenario, p50: Math.round(percentil(ms, 50)), p95: Math.round(percentil(ms, 95)), idas: percentil(v.map((x) => x.idas), 50), fila: Math.max(...v.map((x) => x.fila)), kb: Math.round(percentil(v.map((x) => x.kb), 50) * 10) / 10 });
    }
  }
  const destino = path.resolve(__dirname, '..', '..', '..', '..', 'PROVA-32J');
  fs.mkdirSync(destino, { recursive: true });
  fs.writeFileSync(path.join(destino, `medicao-${etiqueta}.json`), `${JSON.stringify({ etiqueta, em: new DateReal().toISOString(), latencia: LAT, pool: POOL, amostras: AMOSTRAS, linhas }, null, 2)}\n`);
  process.stdout.write(`\nLatência simulada: banco ${LAT.db} ms · Storage ${LAT.storage} ms · Auth ${LAT.auth} ms · pool de ${POOL} consultas · ${AMOSTRAS} amostras\n\n`);
  process.stdout.write('| rota | cenário | p50 ms | p95 ms | idas | fila | KB |\n|---|---|---|---|---|---|---|\n');
  for (const l of linhas) process.stdout.write(`| ${l.rota} | ${l.cenario} | ${l.p50} | ${l.p95} | ${l.idas} | ${l.fila} | ${l.kb} |\n`);
}
