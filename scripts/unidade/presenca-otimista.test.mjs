// Futty v2.0 — Rodada 29I (achado 86): "Vou" / "Não vou" no Início não dava retorno nenhum.
//
// O clique disparava o POST /api/jogos/<id>/rsvp/responder e gravava, mas a tela não mudava: o botão não acendia e o contador de
// confirmados não subia — só recarregando aparecia. Agora o estado é OTIMISTA: ao tocar, o botão escolhido acende na hora, o contador
// sobe/desce na hora, e se o pedido falhar volta ao estado anterior com uma frase curta. Os botões têm aria-pressed.
// O miolo (lib/rsvp.js) é puro: aqui se prova a ordem dos acontecimentos — a tela muda ANTES de o pedido voltar.
//
// Uso: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { responderComOtimismo, MSG_FALHA_RSVP } from '../../src/lib/rsvp.js';
import { lerPagina } from './_fonteDaPagina.mjs';


/** Um pedido que só termina quando o teste manda — para olhar a tela ENQUANTO ele está no ar. */
function pedidoPendente() {
  let resolver;
  let rejeitar;
  const promessa = new Promise((res, rej) => { resolver = res; rejeitar = rej; });
  return { promessa, resolver, rejeitar };
}

test('o botão acende ANTES de o pedido voltar (a tela muda na hora)', async () => {
  const telas = [];
  const pedido = pedidoPendente();
  const andamento = responderComOtimismo({
    gameId: 'jogo-1', status: 'confirmado', anterior: null, aplicar: (s) => telas.push(s), enviar: () => pedido.promessa,
  });
  assert.deepEqual(telas, ['confirmado'], 'o pedido ainda está no ar e a tela já mostra o "Vou"');
  pedido.resolver({ ok: true, status: 'confirmado' });
  assert.deepEqual(await andamento, { ok: true });
  assert.deepEqual(telas, ['confirmado'], 'deu certo: nada a desfazer');
});

test('o pedido falhou: volta ao estado de antes e diz o que fazer, em uma frase curta — sem lançar', async () => {
  const telas = [];
  const r = await responderComOtimismo({
    gameId: 'jogo-1', status: 'confirmado', anterior: 'recusado', aplicar: (s) => telas.push(s), enviar: async () => { throw new Error('Failed to fetch'); },
  });
  assert.deepEqual(telas, ['confirmado', 'recusado'], 'acendeu o Vou e voltou ao Não vou de antes');
  assert.deepEqual(r, { ok: false, erro: MSG_FALHA_RSVP });
  assert.equal(MSG_FALHA_RSVP, 'Não deu para registrar sua resposta. Tente de novo.', 'texto pela régua da VOZ: o que houve e o que fazer');
  assert.doesNotMatch(r.erro, /fetch|Error|undefined/i, 'nunca a linha técnica na tela');
});

test('quem ainda não tinha respondido e falhou volta a "sem resposta"', async () => {
  const telas = [];
  await responderComOtimismo({ gameId: 'j', status: 'recusado', anterior: null, aplicar: (s) => telas.push(s), enviar: async () => { throw new Error('x'); } });
  assert.deepEqual(telas, ['recusado', null]);
});

test('jogo cheio (entrou na fila): o "Vou" otimista não vale — desfaz e devolve a posição', async () => {
  const telas = [];
  const r = await responderComOtimismo({ gameId: 'j', status: 'confirmado', anterior: null, aplicar: (s) => telas.push(s), enviar: async () => ({ ok: true, espera: true, posicao: 3 }) });
  assert.deepEqual(telas, ['confirmado', null]);
  assert.deepEqual(r, { ok: true, espera: 3 });
});

test('no jogo já cheio o "Vou" é entrar na fila: não mexe na tela antes (otimista: false)', async () => {
  const telas = [];
  const r = await responderComOtimismo({ gameId: 'j', status: 'confirmado', anterior: null, otimista: false, aplicar: (s) => telas.push(s), enviar: async () => ({ ok: true, espera: true, posicao: 1 }) });
  assert.deepEqual(telas, []);
  assert.deepEqual(r, { ok: true, espera: 1 });
  const falha = await responderComOtimismo({ gameId: 'j', status: 'confirmado', anterior: null, otimista: false, aplicar: (s) => telas.push(s), enviar: async () => { throw new Error('x'); } });
  assert.deepEqual(telas, [], 'sem estado otimista, nada a desfazer');
  assert.equal(falha.ok, false);
});

test('o "Vou / Não vou" do Início e o da página do jogo respondem pela mesma porta (a do RSVP)', () => {
  const raiz = fileURLToPath(new URL('../../', import.meta.url));
  const inicio = lerPagina('Inicio');
  assert.match(inicio, /responderComOtimismo\(/, 'o Início com estado otimista');
  assert.match(inicio, /<RespostaDoJogo/, 'o cartão do jogo usa o componente travado');
  const jogo = fs.readFileSync(`${raiz}src/pages/Jogo.jsx`, 'utf8');
  assert.match(jogo, /enviarRsvp\(id, status\)/, 'a página do jogo também');
  assert.match(jogo, /<RespostaDoJogo/);
});
