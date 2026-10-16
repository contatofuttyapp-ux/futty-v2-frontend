// Futty v2.0 — o "Restam N gerações" da Figurinha com N = TUDO o que a pessoa pode gerar, e a compra que chega depois.
//
// O que se tranca aqui (sem browser, sem rede):
//   1. totalDeGeracoes: 3 do time + 55 de crédito = 58; só time = 3; só crédito = 55; motor antigo (sem `total`) soma o direito do time e os créditos;
//   2. a Figurinha não mostra mais só o primeiro direito, nem o "· uniforme à sua escolha"; o "Refazer" e a confirmação usam o mesmo número;
//   3. acompanharCompra: o crédito que chega pelo webhook depois da loja confirmar é visto em segundo plano, vai ao Início guardado e é avisado à
//      tela aberta (o evento EVENTO_BRILHANTES); se não chegar, desiste calado;
//   4. "Campeões anotados": o selo e a frase do resultado de um jogo antigo com um time só (o campeão).
//
// Uso: npm test  (ou: node --import ./scripts/unidade/registrar.mjs --test scripts/unidade/rodada-31v.test.mjs)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

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
globalThis.__FUTTY_ENV__ = { PROD: false, VITE_API_URL: 'http://motor.teste' };
globalThis.__FUTTY_SUPABASE__ = { auth: { getSession: async () => ({ data: { session: null } }) } };
const avisos = [];
globalThis.window = globalThis.window || { dispatchEvent: (ev) => { avisos.push(ev); return true; } };
globalThis.CustomEvent = globalThis.CustomEvent || class { constructor(tipo, o) { this.type = tipo; this.detail = o?.detail; } };

const { totalDeGeracoes, geracoesPorExtenso } = await import('../../src/utils/totalDeGeracoes.js');
const { acompanharCompra, compraApareceu, EVENTO_BRILHANTES } = await import('../../src/lib/brilhantes.js');
const { gravarCache, lerCacheComIdade } = await import('../../src/lib/cacheLocal.js');
const { visaoDoSorteio } = await import('../../src/utils/seloDoSorteio.js');
const { fraseDoResultado, nomesDosTimes, desfechoDoEstado, corpoDoResultadoDoJogo } = await import('../../src/utils/resultadoDoJogo.js');

const estado = (fonte, restantes, creditos, total) => ({ direito: { fonte, team_id: null, kit_id: null, restantes, ...(total != null ? { total } : {}) }, creditos });

test('o contador é a soma: 3 do time + 55 de crédito = 58; só time = 3; só crédito = 55; nada = 0', () => {
  assert.equal(totalDeGeracoes(estado('time', 3, 55, 58)), 58);
  assert.equal(totalDeGeracoes(estado('time', 3, 0, 3)), 3);
  assert.equal(totalDeGeracoes(estado('credito', 55, 55, 55)), 55);
  assert.equal(totalDeGeracoes(estado(null, 0, 0, 0)), 0);
  assert.equal(totalDeGeracoes(null), 0);
});

test('motor de antes do `total`: soma o saldo do time e os créditos (o caso do dono: 3 + 55)', () => {
  assert.equal(totalDeGeracoes(estado('time', 3, 55)), 58);
  assert.equal(totalDeGeracoes(estado('credito', 55, 55)), 55);
  assert.equal(totalDeGeracoes(estado(null, 0, 0)), 0);
});

test('"1 geração" e "58 gerações"', () => {
  assert.equal(geracoesPorExtenso(1), '1 geração');
  assert.equal(geracoesPorExtenso(58), '58 gerações');
});

test('a Figurinha mostra o total no contador, no "Refazer" e na confirmação; o "uniforme à sua escolha" saiu', () => {
  const fonte = readFileSync(new URL('../../src/pages/Figurinha.jsx', import.meta.url), 'utf8');
  assert.match(fonte, /Restam \$\{totalGeracoes\} gerações/);
  assert.match(fonte, /Refazer \{kitDoCard\.nome\} · \{geracoesPorExtenso\(totalGeracoes\)\}/);
  assert.match(fonte, /Você tem \$\{geracoesPorExtenso\(totalGeracoes\)\}/);
  assert.ok(!/uniforme à sua escolha/.test(fonte), 'sem o rabicho do crédito');
  assert.ok(!/Restam \$\{restantesDireito\}/.test(fonte), 'o contador não é mais o do primeiro direito');
  assert.match(fonte, /addEventListener\(EVENTO_BRILHANTES/, 'a tela aberta escuta a compra que chega');
  assert.match(fonte, /addEventListener\('visibilitychange', aoVoltar\)/, 'e relê ao voltar ao primeiro plano');
});

test('compraApareceu: créditos a mais (Minha Figurinha) e pacote ativo no time', () => {
  assert.equal(compraApareceu('minha', { creditos: 45 }, { creditos: 55, times: [] }), true);
  assert.equal(compraApareceu('minha', { creditos: 45 }, { creditos: 45, times: [] }), false);
  assert.equal(compraApareceu('pacote', {}, { times: [{ id: 't1', brilhante_ativo: true }] }, 't1'), true);
  assert.equal(compraApareceu('pacote', {}, { times: [{ id: 't1', brilhante_ativo: false }] }, 't1'), false);
  assert.equal(compraApareceu('minha', { creditos: 0 }, { creditos: 9, indisponivel: true }), false, 'resposta que falhou não conta');
});

test('acompanharCompra: o webhook chega na 3ª leitura → o Início guardado e a tela aberta recebem 58 na hora', async () => {
  const EU = 'u-31v';
  gravarCache(EU, 'inicio', { teams: { teams: [] }, brilhante: { fonte: 'time', team_id: 't1', kit_id: 'dark-gold', creditos: 45, restantes: 3, total: 48 }, pedidos_brilhante: [] });
  const leituras = [estado('time', 3, 45, 48), estado('time', 3, 45, 48), { ...estado('time', 3, 55, 58), times: [], pedidos: [] }];
  let i = 0;
  avisos.length = 0;
  const novo = await acompanharCompra({ userId: EU, produto: 'minha', antes: { creditos: 45 }, ler: async () => leituras[Math.min(i++, leituras.length - 1)], esperar: async () => {} });
  assert.equal(i, 3);
  assert.equal(totalDeGeracoes(novo), 58);
  assert.equal(lerCacheComIdade(EU, 'inicio').dados.brilhante.total, 58, 'a Figurinha nasce do Início guardado');
  assert.equal(lerCacheComIdade(EU, 'inicio').dados.brilhante.creditos, 55);
  assert.equal(avisos.length, 1);
  assert.equal(avisos[0].type, EVENTO_BRILHANTES);
  assert.equal(totalDeGeracoes(avisos[0].detail), 58);
});

test('acompanharCompra: se nunca chega, desiste calado (nada guardado, nada avisado)', async () => {
  avisos.length = 0;
  let n = 0;
  const novo = await acompanharCompra({ userId: 'u-x', produto: 'minha', antes: { creditos: 5 }, tentativas: 4, ler: async () => { n += 1; return estado('credito', 5, 5, 5); }, esperar: async () => {} });
  assert.equal(novo, null);
  assert.equal(n, 4);
  assert.equal(avisos.length, 0);
});

test('o estado guardado sem `total` (motor antigo) não deixa um total velho no Início guardado', async () => {
  const { espelharBrilhantesNoInicio } = await import('../../src/lib/cacheCard.js');
  const EU = 'u-velho';
  gravarCache(EU, 'inicio', { teams: { teams: [] }, brilhante: { fonte: 'time', creditos: 0, restantes: 3, total: 3 }, pedidos_brilhante: [] });
  espelharBrilhantesNoInicio(EU, { direito: { fonte: 'credito', team_id: null, kit_id: null, restantes: 10 }, creditos: 10, times: [], pedidos: [] });
  const b = lerCacheComIdade(EU, 'inicio').dados.brilhante;
  assert.equal(b.total, undefined);
  assert.equal(totalDeGeracoes({ direito: { fonte: b.fonte, restantes: b.restantes, total: b.total }, creditos: b.creditos }), 10);
});

// ── Campeões anotados: o jogo antigo com um time só (o campeão), os nomes como convidados sem app ──
const CAMPEOES = {
  manual: true, num_times: 1,
  times: [{ nome: 'Time campeão', jogadores: [{ user_id: null, nome: 'Eric Lopes', convidado: true }, { user_id: null, nome: 'Kim', convidado: true }] }],
  reservas: [],
  registro: { origem: 'manual', campeoes: true, por: { id: 'x', nome: 'Chavo' }, em: '2026-10-16T20:00:00Z', ajustes: [] },
};

test('selo do jogo antigo: "Campeões anotados por Chavo" (não "Montado à mão"), sem roleta, sem nota', () => {
  const v = visaoDoSorteio(CAMPEOES);
  assert.equal(v.tipo, 'manual');
  assert.equal(v.selo.texto, 'Campeões anotados por Chavo');
  assert.equal(v.daRoleta, null);
});

test('frase do resultado com um time só: o nome do time, sem "venceu"', () => {
  const g = { campeao_time_index: 0, time_vencedor: null, placar_a: null, placar_b: null };
  assert.equal(fraseDoResultado(g, nomesDosTimes(CAMPEOES)), 'Time campeão');
});

test('o editor do resultado, com um time só, nunca apaga o campeão gravado', () => {
  const d = desfechoDoEstado({ campeaoIdx: 0, empate: false, golsMap: {} }, { nTimes: 1, jogadores: [] });
  assert.equal(d.campeaoIdx, 0);
  assert.equal(corpoDoResultadoDoJogo({ campeaoIdx: 0, empate: false, golsMap: {} }, { nTimes: 1, jogadores: [] }).campeao_time_index, 0);
});
