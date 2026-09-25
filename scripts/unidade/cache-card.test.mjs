// Futty v2.0 — RODADA 27: o card mudou, os caches guardados mudam junto (lib/cacheCard.js + cacheLocal.js).
//
// O que se tranca aqui (sem browser, sem rede — só o localStorage de mentira):
//   1. emendarCache troca o CONTEÚDO de uma entrada sem renovar o carimbo (a idade decide se a tela
//      revalida), não regrava quando nada mudou e nunca lança;
//   2. alinharCachesComOPerfil: foto nova → o `me` do Início é o novo E cada objeto que é a pessoa nos
//      outros caches (Ranking, Feed, presença) recebe o rosto novo; os outros ficam como estão; o cache
//      `me` (gravado pelo PerfilContext) e o de OUTRA conta não são tocados;
//   3. rosto igual → só o `me` do Início acompanha (sem varredura);
//   4. espelharBrilhantesNoInicio escreve o estado dos Brilhantes no formato do /api/inicio;
//   5. aquecerImagensDoRosto só pede o que é NOVO, no proxy, nos 4 tamanhos das telas.
//
// Uso: npm test  (ou: node --import ./scripts/unidade/registrar.mjs --test scripts/unidade/cache-card.test.mjs)
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// ── localStorage e Image de mentira ──────────────────────────────────────────
class ArmazemFalso {
  constructor() { this.m = new Map(); }
  get length() { return this.m.size; }
  key(i) { return [...this.m.keys()][i] ?? null; }
  getItem(k) { return this.m.has(k) ? this.m.get(k) : null; }
  setItem(k, v) { this.m.set(k, String(v)); }
  removeItem(k) { this.m.delete(k); }
  clear() { this.m.clear(); }
}
globalThis.localStorage = new ArmazemFalso();

const imagensPedidas = [];
globalThis.Image = class ImagemFalsa {
  set src(valor) { imagensPedidas.push({ src: valor, cors: this.crossOrigin === 'anonymous' }); }
};

const { gravarCache, lerCacheComIdade } = await import('../../src/lib/cacheLocal.js');
const {
  emendarCache, chavesDoCache, alinharCachesComOPerfil, espelharBrilhantesNoInicio, aquecerImagensDoRosto, rostoDe, rostoMudou, emendarRostoNoNo,
} = await import('../../src/lib/cacheCard.js');

const EU = 'user-eu';
const OUTRO = 'user-outro';
const PROXY = 'https://motor.exemplo/api/media';
const foto = (n) => `${PROXY}/token-${n}`;

const cru = (userId, chave) => localStorage.getItem(`futty_cache_v1:${userId}:${chave}`);
const emDe = (userId, chave) => JSON.parse(cru(userId, chave)).em;
/** Grava uma entrada com um carimbo ANTIGO conhecido — para provar que emendar não o renova. */
const gravarComCarimbo = (userId, chave, dados, em) => localStorage.setItem(`futty_cache_v1:${userId}:${chave}`, JSON.stringify({ em, dados }));
const EM_ANTIGO = Date.now() - 20_000;

const meAntigo = () => ({ user: { id: EU, avatar_url: foto('velha'), foto_url: foto('velha'), foto_original_url: foto('orig-velha'), avatar_generico: null, fundo_figurinha: 'estadio', nome: 'Eu' }, slots: [], stats: { jogos: 3 } });
const meNovo = () => ({ user: { ...meAntigo().user, avatar_url: foto('nova'), foto_url: foto('nova'), foto_original_url: foto('orig-nova') }, slots: [], stats: { jogos: 3 } });

beforeEach(() => {
  localStorage.clear();
  imagensPedidas.length = 0;
});

test('emendarCache: troca o conteúdo SEM renovar o carimbo; undefined não regrava; entrada ausente/corrompida não lança', () => {
  gravarComCarimbo(EU, 'feed', { posts: [1, 2] }, EM_ANTIGO);
  assert.equal(emendarCache(EU, 'feed', (d) => ({ ...d, posts: [1, 2, 3] })), true);
  assert.deepEqual(lerCacheComIdade(EU, 'feed').dados, { posts: [1, 2, 3] });
  assert.equal(emDe(EU, 'feed'), EM_ANTIGO, 'a resposta continua tão velha quanto era — só concorda com a mudança');

  const antes = cru(EU, 'feed');
  assert.equal(emendarCache(EU, 'feed', () => undefined), false);
  assert.equal(cru(EU, 'feed'), antes, 'nada mudou: nada é regravado');

  assert.equal(emendarCache(EU, 'nao-existe', (d) => d), false);
  localStorage.setItem(`futty_cache_v1:${EU}:quebrada`, '{isto não é json');
  assert.equal(emendarCache(EU, 'quebrada', (d) => d), false);
  assert.equal(emendarCache(null, 'feed', (d) => d), false, 'sem userId não há cache');
});

test('chavesDoCache: só as chaves DESTA conta', () => {
  gravarCache(EU, 'me', {});
  gravarCache(EU, 'inicio', {});
  gravarCache(EU, 'ranking:time-a', {});
  gravarCache(OUTRO, 'me', {});
  assert.deepEqual(chavesDoCache(EU).sort(), ['inicio', 'me', 'ranking:time-a']);
  assert.deepEqual(chavesDoCache(null), []);
});

test('rostoDe / rostoMudou: null e ausente contam como o mesmo; qualquer campo do rosto que mude conta', () => {
  assert.deepEqual(rostoDe({ id: 'x', avatar_url: 'a', nome: 'n' }), { avatar_url: 'a' });
  assert.equal(rostoMudou({ avatar_url: null }, {}), false);
  assert.equal(rostoMudou({ avatar_url: 'a' }, { avatar_url: 'b' }), true);
  assert.equal(rostoMudou({ foto_original_url: 'a' }, { foto_original_url: 'b' }), true, 'o reenquadramento troca a original/recorte');
  assert.equal(rostoMudou({ avatar_generico: 'm1' }, { avatar_generico: 'f2' }), true);
  assert.equal(rostoMudou({ fundo_figurinha: 'a' }, { fundo_figurinha: 'b' }), false, 'fundo não é rosto');
});

test('alinharCachesComOPerfil: foto nova chega ao Início, ao Ranking, ao Feed e à presença; os outros ficam como estão', () => {
  const eu = meAntigo();
  gravarComCarimbo(EU, 'me', eu, EM_ANTIGO);
  gravarComCarimbo(EU, 'inicio', { me: eu, teams: { teams: [{ slug: 'a' }] }, convites: { games: [{ id: 'g1', rsvp: [{ id: EU, avatar_url: foto('velha'), avatar_generico: null }, { id: OUTRO, avatar_url: foto('dele') }] }] } }, EM_ANTIGO);
  gravarComCarimbo(EU, 'ranking:a', {
    ranking: [
      { user_id: OUTRO, avatar_url: foto('dele'), foto_url: foto('dele'), avatar_generico: 'm1' },
      { user_id: EU, sou_eu: true, avatar_url: foto('velha'), foto_url: foto('velha'), avatar_generico: null },
    ],
  }, EM_ANTIGO);
  gravarComCarimbo(EU, 'feed', { posts: [{ id: 'p1', user_id: EU, avatar_url: foto('velha'), texto: 'oi' }, { id: 'p2', user_id: OUTRO, avatar_url: foto('dele') }] }, EM_ANTIGO);
  // uma linha SEM foto_url (a presença não a traz): não pode ganhar um foto_url
  gravarComCarimbo(EU, 'team:a', { membros: [{ id: EU, avatar_url: foto('velha'), avatar_generico: null }] }, EM_ANTIGO);
  gravarComCarimbo(OUTRO, 'ranking:a', { ranking: [{ user_id: EU, avatar_url: foto('velha') }] }, EM_ANTIGO);
  const meAntes = cru(EU, 'me');
  const deOutraConta = cru(OUTRO, 'ranking:a');

  const novo = meNovo();
  const r = alinharCachesComOPerfil(EU, novo, eu);
  assert.equal(r.rostoMudou, true);
  assert.ok(!r.chaves.includes('me'), 'o `me` é do PerfilContext — não se mexe aqui');

  const inicio = lerCacheComIdade(EU, 'inicio').dados;
  assert.deepEqual(inicio.me, novo, 'o Início guardado passa a ter o perfil confirmado (o cromo nasce dele)');
  assert.deepEqual(inicio.teams, { teams: [{ slug: 'a' }] }, 'o resto do Início não muda');
  assert.equal(inicio.convites.games[0].rsvp[0].avatar_url, foto('nova'), 'a pessoa na lista de presença recebe a foto nova');
  assert.equal(inicio.convites.games[0].rsvp[1].avatar_url, foto('dele'), 'os outros ficam como estão');

  const ranking = lerCacheComIdade(EU, 'ranking:a').dados.ranking;
  assert.equal(ranking[1].avatar_url, foto('nova'));
  assert.equal(ranking[1].foto_url, foto('nova'));
  assert.equal(ranking[0].avatar_url, foto('dele'), 'a linha do outro não muda');
  assert.equal(ranking[0].avatar_generico, 'm1');

  const feed = lerCacheComIdade(EU, 'feed').dados.posts;
  assert.equal(feed[0].avatar_url, foto('nova'));
  assert.equal(feed[0].texto, 'oi');
  assert.equal(feed[1].avatar_url, foto('dele'));

  const membro = lerCacheComIdade(EU, 'team:a').dados.membros[0];
  assert.equal(membro.avatar_url, foto('nova'));
  assert.equal('foto_url' in membro, false, 'só se trocam os campos que o objeto JÁ tem');

  for (const chave of ['inicio', 'ranking:a', 'feed', 'team:a']) assert.equal(emDe(EU, chave), EM_ANTIGO, `${chave}: carimbo preservado`);
  assert.equal(cru(EU, 'me'), meAntes, 'o cache `me` não é tocado');
  assert.equal(cru(OUTRO, 'ranking:a'), deOutraConta, 'nem o cache de outra conta');
});

test('alinharCachesComOPerfil: o genérico escolhido chega às linhas do Ranking (quem não tem foto)', () => {
  const sem = { user: { id: EU, avatar_url: null, foto_url: null, avatar_generico: null } };
  const com = { user: { id: EU, avatar_url: null, foto_url: null, avatar_generico: 'f2' } };
  gravarComCarimbo(EU, 'ranking:a', { ranking: [{ user_id: EU, avatar_url: null, foto_url: null, avatar_generico: null }] }, EM_ANTIGO);
  alinharCachesComOPerfil(EU, com, sem);
  assert.equal(lerCacheComIdade(EU, 'ranking:a').dados.ranking[0].avatar_generico, 'f2');
});

test('alinharCachesComOPerfil: rosto igual → só o `me` do Início acompanha (nenhuma varredura)', () => {
  const eu = meAntigo();
  gravarComCarimbo(EU, 'inicio', { me: eu }, EM_ANTIGO);
  gravarComCarimbo(EU, 'ranking:a', { ranking: [{ user_id: EU, avatar_url: foto('velha') }] }, EM_ANTIGO);
  const rankingAntes = cru(EU, 'ranking:a');

  const comOutroFundo = { ...eu, user: { ...eu.user, fundo_figurinha: 'golden' } };
  const r = alinharCachesComOPerfil(EU, comOutroFundo, eu);
  assert.equal(r.rostoMudou, false);
  assert.deepEqual(r.chaves, ['inicio']);
  assert.equal(lerCacheComIdade(EU, 'inicio').dados.me.user.fundo_figurinha, 'golden', 'o fundo novo chega ao Início guardado');
  assert.equal(cru(EU, 'ranking:a'), rankingAntes, 'o Ranking nem foi lido');
});

test('alinharCachesComOPerfil: doInicio (ignorar) deixa o `inicio` para quem o grava; sem `anterior` assume que o rosto mudou', () => {
  const eu = meAntigo();
  gravarComCarimbo(EU, 'inicio', { me: eu }, EM_ANTIGO);
  gravarComCarimbo(EU, 'ranking:a', { ranking: [{ user_id: EU, avatar_url: foto('velha') }] }, EM_ANTIGO);
  const inicioAntes = cru(EU, 'inicio');
  const r = alinharCachesComOPerfil(EU, meNovo(), null, { ignorar: ['inicio'] });
  assert.equal(r.rostoMudou, true);
  assert.equal(cru(EU, 'inicio'), inicioAntes, 'o InicioContext grava o payload inteiro logo a seguir');
  assert.equal(lerCacheComIdade(EU, 'ranking:a').dados.ranking[0].avatar_url, foto('nova'));
});

test('alinharCachesComOPerfil: sem userId ou sem user não faz nada e não lança', () => {
  assert.deepEqual(alinharCachesComOPerfil(null, meNovo(), null), { rostoMudou: false, chaves: [] });
  assert.deepEqual(alinharCachesComOPerfil(EU, {}, null), { rostoMudou: false, chaves: [] });
});

test('emendarRostoNoNo: arrays e objetos aninhados, profundidade limitada, nada além do que já existe', () => {
  const dados = { a: [{ b: { c: { id: EU, avatar_url: 'x' } } }] };
  assert.equal(emendarRostoNoNo(dados, EU, { avatar_url: 'y', foto_url: 'z' }), true);
  assert.deepEqual(dados.a[0].b.c, { id: EU, avatar_url: 'y' });
  assert.equal(emendarRostoNoNo(dados, EU, { avatar_url: 'y' }), false, 'já estava igual');
  assert.equal(emendarRostoNoNo(null, EU, {}), false);
});

test('espelharBrilhantesNoInicio: escreve o estado no formato do /api/inicio, preserva o carimbo e o resto', () => {
  gravarComCarimbo(EU, 'inicio', { teams: { teams: [] }, brilhante: { fonte: 'creditos', team_id: null, kit_id: null, creditos: 10, restantes: 10 }, pedidos_brilhante: [] }, EM_ANTIGO);
  const estado = { direito: { fonte: 'creditos', team_id: null, kit_id: null, restantes: 9 }, creditos: 9, times: [], pedidos: [{ id: 'p1', estado: 'pendente' }] };
  assert.equal(espelharBrilhantesNoInicio(EU, estado), true);
  const d = lerCacheComIdade(EU, 'inicio').dados;
  assert.equal(d.brilhante.restantes, 9, 'o contador da Figurinha nasce com o número de DEPOIS de gerar');
  assert.equal(d.brilhante.creditos, 9);
  assert.equal(d.pedidos_brilhante.length, 1);
  assert.deepEqual(d.teams, { teams: [] });
  assert.equal(emDe(EU, 'inicio'), EM_ANTIGO);
  assert.equal(espelharBrilhantesNoInicio(EU, null), false);
  assert.equal(espelharBrilhantesNoInicio(EU, {}), false);
  assert.equal(espelharBrilhantesNoInicio(OUTRO, estado), false, 'sem Início guardado nesta conta não há o que espelhar');
});

test('aquecerImagensDoRosto: só o que é NOVO, no proxy, nos 4 tamanhos das telas (512 com e sem CORS, 128 quadrado, 128)', async () => {
  const antes = { avatar_url: foto('velha'), foto_url: foto('velha') };
  const depois = { avatar_url: foto('nova'), foto_url: foto('nova') };
  const n = aquecerImagensDoRosto(depois, antes);
  assert.equal(n, 4, 'avatar_url e foto_url são o MESMO arquivo: 4 pedidos, não 8');
  await new Promise((r) => setTimeout(r, 5));
  const s = imagensPedidas.map((p) => `${p.src.replace(PROXY, '')}|${p.cors ? 'cors' : 'plain'}`).sort();
  assert.deepEqual(s, [
    '/token-nova?w=128&sq=1|plain',
    '/token-nova?w=128|plain',
    '/token-nova?w=512|cors',
    '/token-nova?w=512|plain',
  ].sort());

  imagensPedidas.length = 0;
  assert.equal(aquecerImagensDoRosto(depois, depois), 0, 'nada mudou: nada a aquecer');
  // com figurinha (Brilhante): só a foto mudou, e é ela que se aquece
  const comFigurinha = aquecerImagensDoRosto({ avatar_url: foto('arte'), foto_url: foto('nova2') }, { avatar_url: foto('arte'), foto_url: foto('nova') });
  assert.equal(comFigurinha, 4);
  // genérico, foto do Google e vazio não passam pelo proxy: nada a fazer
  assert.equal(aquecerImagensDoRosto({ avatar_url: 'https://lh3.googleusercontent.com/a', foto_url: null }, {}), 0);
  assert.equal(aquecerImagensDoRosto(null, {}), 0);
});
