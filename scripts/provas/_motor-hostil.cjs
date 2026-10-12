// Futty v2.0 — o MOTOR HOSTIL da prova de XSS (scripts/provas/xss.prova.mjs): o motor de VERDADE (server.js, todas as rotas, o mesmo tratador de
// erros) por cima de um banco, um Storage e um Auth de MENTIRA, em memória — a bancada do backend (backend/tests/_appFalsa.js). O .env de lá aponta
// para o único banco (o de produção), então aqui ele nunca é lido, a rede de fora está fechada e o servidor só escuta em 127.0.0.1.
//
// Os dados hostis entram pelas MESMAS rotas de escrita que uma pessoa usa (PATCH /api/me, POST /api/teams, /api/feed/posts, comentários, campeonato…),
// então o que a prova vê na tela é o que o motor de verdade guardaria e devolveria — com os tetos, o corte e a limpeza que ele já aplica.
// Cada texto hostil carrega um número no `P(n)`: se algum dia executar, a prova diz de qual campo ele veio.
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

// ─── Os textos hostis ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// `P` é o canário que a prova põe na página: se um destes textos virasse HTML de verdade, chamaria P(n).
let contador = 0;
const registro = {}; // campo -> { valor, numeros, limite, aceito }
function hostil(campo, molde, limite = null) {
  const numeros = [];
  const k = () => { contador += 1; numeros.push(contador); return contador; };
  const valor = molde(k);
  if (limite && valor.length > limite) throw new Error(`${campo}: o texto hostil tem ${valor.length} e o campo aceita ${limite}`);
  registro[campo] = { valor, numeros, limite, aceito: null };
  return valor;
}
// Sem espaços de propósito: as telas que mostram só a primeira palavra do nome ainda mostram o texto inteiro.
const IMG = (k) => `<img/src="x"/onerror=P(${k()})>`;
const SVG = (k) => `<svg/onload=P(${k()})>`;
const IMG_COM_ESPACOS = (k) => `<img src=x onerror=P(${k()})>`;
const SCRIPT = (k) => `<script>P(${k()})</script>`;
// O texto comprido: todos os jeitos de escapar de um texto, um depois do outro — tag, atributo, JavaScript, link, quadro, estilo, formulário,
// redirecionamento, mXSS, modelo de texto e entidades. Cada um chama P(n) com o seu número, ou pede um endereço de fora (evil.test).
const VETORES = [
  (n) => `<img src=x onerror=P(${n})>`,
  (n) => `<svg/onload=P(${n})>`,
  (n) => `<script>P(${n})</script>`,
  (n) => `"><img src=x onerror=P(${n})>`,
  (n) => `'-P(${n})-'`,
  (n) => `</script><script>P(${n})</script>`,
  (n) => `<a href="javascript:P(${n})">clique</a>`,
  (n) => `<iframe src="javascript:P(${n})"></iframe>`,
  (n) => `<iframe srcdoc="<script>parent.P(${n})</script>"></iframe>`,
  (n) => `<style>body{outline:9px solid red}/*XSS${n}*/</style>`,
  (n) => `<img src="https://evil.test/p${n}.gif">`,
  (n) => `<meta http-equiv="refresh" content="0;url=https://evil.test/r${n}">`,
  (n) => `<form action="https://evil.test/f${n}"><button>x</button></form>`,
  (n) => `<math><mtext><table><mglyph><style><!--</style><img title="--&gt;&lt;img src=1 onerror=P(${n})&gt;">`,
  (n) => `{{constructor.constructor('P(${n})')()}}`,
  (n) => `\${P(${n})}`,
  (n) => `%s %d {0} <!-- c${n} --> &lt;b&gt;x&lt;/b&gt;`,
  (n) => `&#60;img src=x onerror=P(${n})&#62;`,
];
// Os vetores, na ordem, até onde o campo aceita (cada um leva o próximo número do canário).
const compor = (k, limite = Infinity) => {
  const itens = [];
  let total = 0;
  for (const vetor of VETORES) {
    const texto = vetor(contador + 1);
    if (total + texto.length + 1 > limite) break;
    k();
    itens.push(texto);
    total += texto.length + 1;
  }
  return itens.join(' ');
};
const BOMBA = (k) => compor(k); // post, anúncio, denúncia, diagnóstico: textos longos
const BOMBA_500 = (k) => compor(k, 500); // comentário
const BOMBA_CURTA = (k) => compor(k, 290); // descrição do time (300)

(async () => {
  const app = await subirApp();
  const N = 7;

  // ─── As pessoas ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  const U = {
    adm: usuario(uuid('a1', N), 'Ana'),
    m1: usuario(uuid('a2', N), 'Alice'),
    m2: usuario(uuid('a3', N), 'Amanda'),
    m3: usuario(uuid('a4', N), 'Andre'),
    ext: usuario(uuid('f1', N), 'Fernando'), // quer entrar no time (pedido de entrada)
    sup: usuario(uuid('99', N), 'Super'),
    outro: usuario(uuid('b1', N), 'Bruno'), // admin de OUTRO time (o time rival, que também aparece nas telas)
  };
  for (const u of Object.values(U)) u.birthdate = '1990-01-01';
  app.reiniciar({ tabelas: {}, usuarios: Object.values(U), superAdmins: [U.sup.id] });
  app.criarBucketsDoProjeto();
  // A conta já passou do cadastro (o que o app confere em user_metadata.onboarding_completo); o getUser devolve o MESMO objeto da sessão.
  for (const u of Object.values(U)) {
    const { data } = await app.cliente.auth.getUser(app.token(u.id));
    data.user.user_metadata.onboarding_completo = true;
  }

  const chamar = async (quem, metodo, rota, corpo, { campo = null } = {}) => {
    const r = await app.pedir(metodo, rota, { token: app.token(U[quem].id), corpo });
    const ok = r.status < 400;
    if (campo && registro[campo]) registro[campo].aceito = ok ? r.status : `recusado ${r.status}`;
    fala(`${ok ? 'ok  ' : 'ERRO'} ${r.status} ${quem.padEnd(5)} ${metodo.padEnd(6)} ${rota}${ok ? '' : ` — ${String(r.json?.error || r.texto).slice(0, 160)}`}`);
    return r;
  };

  // ─── Os nomes das pessoas (PATCH /api/me): apelido até 18, nome até 60 ────────────────────────────────────────────────────────────────────
  const APELIDOS = {
    adm: hostil('adm.apelido', SVG, 18),
    m1: hostil('m1.apelido', SVG, 18),
    m2: hostil('m2.apelido', SVG, 18),
    m3: hostil('m3.apelido', SVG, 18),
    ext: hostil('ext.apelido', SVG, 18),
    outro: hostil('outro.apelido', SVG, 18),
  };
  for (const quem of Object.keys(APELIDOS)) {
    const nome = hostil(`${quem}.nome`, (k) => `${IMG(k)}${SVG(k)}`, 60);
    await chamar(quem, 'PATCH', '/api/me', { nome, nome_jogador: APELIDOS[quem] }, { campo: `${quem}.apelido` });
    registro[`${quem}.nome`].aceito = registro[`${quem}.apelido`].aceito;
  }
  await chamar('sup', 'PATCH', '/api/me', { nome: 'Super do Futty', nome_jogador: 'Super' });

  // ─── O time (e o rival) ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  const nomeDoTime = hostil('time.nome', (k) => `${IMG(k)}${SVG(k)}`, 60);
  const criado = await chamar('adm', 'POST', '/api/teams', {
    nome: nomeDoTime, localizacao: hostil('time.localizacao', (k) => `${IMG(k)}${SVG(k)}`, 100), descricao: hostil('time.descricao', BOMBA_CURTA, 300), publica: true, cor: 'verde',
  }, { campo: 'time.nome' });
  const T = criado.json.team;
  registro['time.localizacao'].aceito = registro['time.nome'].aceito;
  registro['time.descricao'].aceito = registro['time.nome'].aceito;
  const rival = await chamar('outro', 'POST', '/api/teams', { nome: hostil('rival.nome', (k) => `${IMG(k)}${SVG(k)}`, 60), publica: true, cor: 'roxo' }, { campo: 'rival.nome' });
  const R = rival.json.team;
  // Time público (Explorar) com a visibilidade que a rota de pedido de entrada confere, e um ponto no mapa (Brasília) para o radar achá-lo.
  for (const t of app.tabelas.teams) {
    if (t.id !== T.id && t.id !== R.id) continue;
    Object.assign(t, { publica: true, modo_visibilidade: t.id === T.id ? 'publico_aprovacao' : 'publico_aberto', cidade: 'Brasília - DF', cidade_normalizada: 'brasilia - df', geo_lat: -15.7942, geo_lng: -47.8822 });
  }

  // ─── Todos entram pelo convite do time ───────────────────────────────────────────────────────────────────────────────────────────────────
  const conv = await chamar('adm', 'POST', `/api/teams/${T.slug}/convite`, {});
  const tokenDoConvite = conv.json?.token || conv.json?.convite?.token || null;
  for (const quem of ['m1', 'm2', 'm3']) {
    await chamar(quem, 'POST', `/api/convite/${tokenDoConvite}/aceitar`, {});
    await chamar(quem, 'PATCH', `/api/equipas/${T.slug}/membros/posicao`, { goleiro: quem === 'm3' });
  }
  await chamar('ext', 'POST', `/api/teams/${T.slug}/pedir-entrada`, {});

  // ─── O jogo: local hostil, quatro confirmados, sorteio com convidados hostis ─────────────────────────────────────────────────────────────
  const jogo = await chamar('adm', 'POST', '/api/games', { team_slug: T.slug, data: iso(48 * HORA), jogadores_por_time: 3, local: hostil('jogo.local', (k) => `${IMG(k)}${SVG(k)}`, 100) }, { campo: 'jogo.local' });
  const G = jogo.json.game || jogo.json;
  for (const quem of ['adm', 'm1', 'm2', 'm3']) await chamar(quem, 'POST', `/api/games/${G.id}/confirmar`, { confirmado: true });
  const convidados = [hostil('convidado1', IMG, 40), hostil('convidado2', SVG, 40)];
  await chamar('adm', 'POST', `/api/games/${G.id}/sortear`, { convidados }, { campo: 'convidado1' });
  registro.convidado2.aceito = registro.convidado1.aceito;
  const curto = await chamar('adm', 'POST', `/api/games/${G.id}/link-curto`, {});

  // Um jogo ABERTO (sem sorteio) para a tela de presença.
  const aberto = await chamar('adm', 'POST', '/api/games', { team_slug: T.slug, data: iso(96 * HORA), jogadores_por_time: 5, local: 'Quadra do Aberto' });
  const GA = aberto.json.game || aberto.json;
  await chamar('m1', 'POST', `/api/games/${GA.id}/confirmar`, { confirmado: true });

  // O sorteio de cima vira um jogo que já aconteceu (a data é a única coisa que o relógio muda); o resultado entra pelas rotas.
  const linhaDoJogo = app.tabelas.games.find((g) => g.id === G.id);
  if (linhaDoJogo) linhaDoJogo.data = iso(-5 * HORA);
  await chamar('adm', 'PATCH', `/api/games/${G.id}/resultado`, {
    campeao_time_index: 0, placar_a: 3, placar_b: 2,
    gols: [{ user_id: U.m1.id, gols: 2 }, { convidado_nome: hostil('gol.convidado', IMG, 40), gols: 1 }],
  }, { campo: 'gol.convidado' });
  await chamar('adm', 'PATCH', `/api/feed/games/${G.id}/resultado`, {
    campeao_time_index: 0, artilheiro_user_id: U.m1.id, artilheiro_gols: 2, destaque_user_id: U.m2.id, destaque_titulo: hostil('destaque.titulo', (k) => `${IMG(k)}${SVG(k)}`, 60), rodada_user_id: U.m3.id,
  }, { campo: 'destaque.titulo' });

  // O ranking só aceita quem tem 3 jogos: mais dois jogos (com os quatro confirmados), que também já aconteceram.
  for (const [i, dias] of [[1, -9], [2, -16]]) {
    const extra = await chamar('adm', 'POST', '/api/games', { team_slug: T.slug, data: iso(24 * HORA), jogadores_por_time: 3, local: `Quadra ${i}` });
    const GX = extra.json.game || extra.json;
    for (const quem of ['adm', 'm1', 'm2', 'm3']) await chamar(quem, 'POST', `/api/games/${GX.id}/confirmar`, { confirmado: true });
    const linhaX = app.tabelas.games.find((g) => g.id === GX.id);
    if (linhaX) linhaX.data = iso(dias * 24 * HORA);
  }

  // As notas: quem jogou vota nos outros (é delas que nasce o ranking, onde os apelidos aparecem de novo).
  const quatro = ['adm', 'm1', 'm2', 'm3'];
  for (const de of quatro) {
    for (const para of quatro) {
      if (de !== para) await chamar(de, 'POST', `/api/teams/${T.slug}/votar`, { para_user_id: U[para].id, nota: 3.5 + ((de.length + para.length) % 3) / 2 });
    }
  }

  // ─── A Resenha: post, anúncio, comentários, resposta, reação ────────────────────────────────────────────────────────────────────────────
  const post = await chamar('adm', 'POST', '/api/feed/posts', { team_id: T.id, body: hostil('post.corpo', BOMBA) }, { campo: 'post.corpo' });
  const P1 = post.json.post || post.json;
  await chamar('adm', 'POST', `/api/feed/equipas/${T.slug}/anuncio`, {
    titulo: hostil('anuncio.titulo', (k) => `${IMG(k)}${SVG(k)}`, 80), mensagem: hostil('anuncio.mensagem', BOMBA),
  }, { campo: 'anuncio.titulo' });
  registro['anuncio.mensagem'].aceito = registro['anuncio.titulo'].aceito;
  const coment = await chamar('m1', 'POST', '/api/feed/comentarios', { parent_type: 'post', parent_id: P1.id, body: hostil("comentario.corpo", BOMBA_500) }, { campo: 'comentario.corpo' });
  const C1 = coment.json.comentario || coment.json;
  await chamar('m2', 'POST', '/api/feed/comentarios', { parent_type: 'post', parent_id: P1.id, body: hostil("resposta.corpo", BOMBA_500), reply_to: C1.id }, { campo: 'resposta.corpo' });
  await chamar('m3', 'POST', '/api/feed/reacoes', { target_type: 'post', target_id: P1.id, emoji: hostil('reacao.emoji', IMG) }, { campo: 'reacao.emoji' });
  await chamar('m3', 'POST', '/api/feed/reacoes', { target_type: 'post', target_id: P1.id, emoji: '👍' });

  // ─── O campeonato (3 times com nomes hostis, jogadores do plantel hostis) e o post do campeão ────────────────────────────────────────────
  const camp = await chamar('adm', 'POST', `/api/equipas/${T.slug}/campeonatos`, {
    nome: hostil('campeonato.nome', (k) => `${IMG(k)}${SVG(k)}`, 60), formato: 'pontos',
    nomes: [hostil('campeonato.time1', IMG, 40), hostil('campeonato.time2', SVG, 40), hostil('campeonato.time3', IMG_COM_ESPACOS, 40)],
    plantel: [
      [{ user_id: U.m1.id, nome: hostil('plantel.membro', SVG, 40), avatar_url: null, convidado: false }, { nome: hostil('plantel.convidado', IMG, 40), convidado: true }],
      [{ user_id: U.m2.id, nome: 'Amanda', avatar_url: null, convidado: false }], [{ nome: 'Zeca', convidado: true }],
    ],
  }, { campo: 'campeonato.nome' });
  for (const c of ['campeonato.time1', 'campeonato.time2', 'campeonato.time3', 'plantel.membro', 'plantel.convidado']) registro[c].aceito = registro['campeonato.nome'].aceito;
  const CAMP = camp.json?.campeonato;
  if (CAMP) {
    let gols = 0;
    for (const c of CAMP.confrontos || []) {
      await chamar('adm', 'POST', `/api/equipas/${T.slug}/campeonatos/${CAMP.id}/confrontos/${c.id}/resultado`, { placar_a: 2 + (gols % 2), placar_b: gols % 3 });
      gols += 1;
    }
    await chamar('adm', 'POST', `/api/equipas/${T.slug}/campeonatos/${CAMP.id}/terminar`, {});
  }

  // ─── Denúncias (a fila do admin e o Gabinete leem estes textos) ──────────────────────────────────────────────────────────────────────────
  await chamar('m2', 'POST', '/api/denuncias', { target_type: 'post', target_id: P1.id, categoria: 'spam', descricao: hostil('denuncia.descricao', BOMBA) }, { campo: 'denuncia.descricao' });
  await chamar('m3', 'POST', '/api/feed/denuncias', { target_type: 'comentario', target_id: C1.id, motivo: 'spam', descricao: hostil('denuncia.motivo', (k) => `${IMG(k)}${SVG(k)}`, 200) }, { campo: 'denuncia.motivo' });

  // A denúncia nasce "pendente" até a análise automática (que precisa do modelo de IA, fora da bancada) decidir: aqui o caso vai para a fila do admin,
  // como iria um caso ambíguo — é a fila que mostra ao admin o texto da denúncia e o do conteúdo denunciado.
  const baldeDeDenuncias = app.storage.buckets.get('denuncias');
  for (const [caminho, arquivo] of baldeDeDenuncias ? baldeDeDenuncias.arquivos : []) {
    if (!caminho.startsWith('casos/') || !caminho.endsWith('.json')) continue;
    const caso = JSON.parse(arquivo.corpo.toString('utf8'));
    caso.estado = 'fila';
    arquivo.corpo = Buffer.from(JSON.stringify(caso));
  }

  // ─── O que o Gabinete (super-admin) lê de quem escreve livremente ────────────────────────────────────────────────────────────────────────
  // O relatório de diagnóstico tem a forma do app (aparelho + resumo de tempos); os textos livres vão no aparelho e num campo solto.
  await chamar('m1', 'POST', '/api/diagnostico', {
    em: new Date().toISOString(),
    aparelho: { plataforma: hostil('diagnostico.plataforma', IMG, 60), appVersao: hostil('diagnostico.versao', SVG, 60), appBuild: hostil('diagnostico.build', IMG, 60) },
    resumo: { motor: { media: 12 }, rede: { media: 40 }, pintura: { media: 90 } },
    notas: hostil('diagnostico.resumo', BOMBA),
  }, { campo: 'diagnostico.plataforma' });
  for (const c of ['diagnostico.versao', 'diagnostico.build', 'diagnostico.resumo']) registro[c].aceito = registro['diagnostico.plataforma'].aceito;
  const aviseMe = await app.pedir('POST', '/api/avise-me', { corpo: { email: 'bola@exemplo.com', origem: hostil('avise.origem', (k) => `${IMG(k)}${SVG(k)}`, 60), plataforma: 'ios' } });
  registro['avise.origem'].aceito = aviseMe.status < 400 ? aviseMe.status : `recusado ${aviseMe.status}`;
  fala(`${aviseMe.status < 400 ? 'ok  ' : 'ERRO'} ${aviseMe.status} anon  POST   /api/avise-me`);

  // ─── Uma campanha de anúncio com texto hostil e um link que NÃO é http(s) (só o super-admin grava campanha; o app abre o link ao tocar) ──────
  await chamar('sup', 'PUT', '/api/super/gabinete/operacao', {
    ads_ativo: true,
    toggles: { inicio: true, resenha: true, ranking: true, figurinha: true, sorteio: true, p: true },
    campanhas: [{
      id: 'campanha-xss', estado: 'ativa', cls: 'livre', paginas: ['inicio', 'resenha', 'ranking', 'figurinha', 'sorteio', 'p'], nome: 'Campanha de prova',
      anunciante: hostil('ad.anunciante', IMG), texto: hostil('ad.texto', (k) => `${IMG(k)}${SVG(k)}`), sub: hostil('ad.sub', SVG), cta: hostil('ad.cta', SVG),
      link: 'javascript:P(950)', imagem_url: null,
    }],
  });

  const saida = {
    pronto: true,
    base: app.base,
    tokens: Object.fromEntries(Object.entries(U).map(([k, u]) => [k, app.token(u.id)])),
    pessoas: Object.fromEntries(Object.entries(U).map(([k, u]) => [k, { id: u.id }])),
    time: { id: T.id, slug: T.slug }, rival: { id: R.id, slug: R.slug },
    jogo: { id: G.id, codigo: curto.json?.codigo || null }, jogoAberto: { id: GA.id },
    post: { id: P1.id }, comentario: { id: C1.id },
    campeonato: CAMP ? { id: CAMP.id } : null,
    convite: { token: tokenDoConvite },
    registro,
  };
  process.stdout.write(`${JSON.stringify(saida)}\n`);

  process.stdin.setEncoding('utf8');
  process.stdin.on('data', (d) => {
    if (!String(d).includes('fim')) return;
    process.stdout.write(`${JSON.stringify({ rede: app.tentativasDeRede })}\n`, () => process.exit(0));
  });
  process.stdin.on('end', () => process.exit(0));
})().catch((e) => { process.stderr.write(`[motor-hostil] ${e.stack || e.message}\n`); process.exit(1); });
