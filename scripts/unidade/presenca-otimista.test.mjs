// Futty v2.0 — Rodada 29I (achado 86): "Vou" / "Não vou" no Início não dava retorno nenhum.
//
// O clique disparava o POST /api/jogos/<id>/rsvp/responder e gravava, mas a tela não mudava: o botão não acendia e o contador de
// confirmados não subia — só recarregando aparecia. Agora o estado é OTIMISTA: ao tocar, o botão escolhido acende na hora, o contador
// sobe/desce na hora, e se o pedido falhar volta ao estado anterior com uma frase curta. Os botões têm aria-pressed.
// O miolo (lib/rsvp.js, utils/presenca.js) é puro: aqui se prova a ordem dos acontecimentos — a tela muda ANTES de o pedido voltar.
//
// Uso: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { responderComOtimismo, MSG_FALHA_RSVP } from '../../src/lib/rsvp.js';
import { confirmadosComResposta, respostaNoRsvp, statusDoJogoPelaResposta } from '../../src/utils/presenca.js';

const EU = 'eu-1';
const rsvp = (confirmados, recusados = []) => ({
  confirmados: confirmados.map((id) => ({ id })),
  recusados: recusados.map((id) => ({ id })),
});
const onzeConfirmados = rsvp(Array.from({ length: 11 }, (_, i) => `jog-${i}`)); // "11 confirmados", eu ainda não respondi

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

test('o contador sobe e desce NA HORA (o achado: ficava "11 confirmados" depois do "Vou")', () => {
  assert.equal(confirmadosComResposta(onzeConfirmados, EU, null), 11, 'ainda não respondi: o número do motor');
  assert.equal(confirmadosComResposta(onzeConfirmados, EU, 'confirmado'), 12, '"Vou": sobe');
  assert.equal(confirmadosComResposta(onzeConfirmados, EU, 'recusado'), 11, '"Não vou" sem ter confirmado: não mexe');
});

test('quem já estava confirmado e muda para "Não vou" desce; e voltar à resposta de antes devolve o número do motor (a falha)', () => {
  const comigo = rsvp(['a', 'b', 'c', EU]); // 4 confirmados, eu entre eles
  assert.equal(confirmadosComResposta(comigo, EU, 'confirmado'), 4, 'continuar confirmado: 4');
  assert.equal(confirmadosComResposta(comigo, EU, 'recusado'), 3, 'mudei para "Não vou": desce');
  assert.equal(confirmadosComResposta(comigo, EU, respostaNoRsvp(comigo, EU)), 4, 'o pedido falhou e voltei: 4 de novo');
  const recusei = rsvp(['a', 'b'], [EU]);
  assert.equal(confirmadosComResposta(recusei, EU, 'confirmado'), 3, 'recusei e agora vou: sobe');
});

test('sem RSVP não há número do RSVP (a tela usa o do jogo) e o número nunca fica negativo', () => {
  assert.equal(confirmadosComResposta(null, EU, 'confirmado'), null);
  assert.equal(confirmadosComResposta({}, EU, 'confirmado'), null);
  assert.equal(confirmadosComResposta(rsvp([EU]), EU, 'recusado'), 0);
});

test('respostaNoRsvp e o status do botão do jogo', () => {
  assert.equal(respostaNoRsvp(rsvp([EU]), EU), 'confirmado');
  assert.equal(respostaNoRsvp(rsvp([], [EU]), EU), 'recusado');
  assert.equal(respostaNoRsvp(rsvp(['x']), EU), null);
  assert.equal(respostaNoRsvp(rsvp([EU]), undefined), null, 'sem sessão carregada: sem resposta');
  assert.equal(respostaNoRsvp(null, EU), null);
  assert.equal(statusDoJogoPelaResposta('confirmado'), 'going');
  assert.equal(statusDoJogoPelaResposta('recusado'), 'not_going');
  assert.equal(statusDoJogoPelaResposta(null), null);
});

test('os botões Vou / Não vou têm aria-pressed — no cartão "Confirme presença" e no card do jogo', () => {
  const raiz = fileURLToPath(new URL('../../', import.meta.url));
  const card = fs.readFileSync(`${raiz}src/components/RSVPCard.jsx`, 'utf8');
  assert.match(card, /aria-pressed=\{respostaActual === 'confirmado'\}/);
  assert.match(card, /aria-pressed=\{respostaActual === 'recusado'\}/);
  const inicio = fs.readFileSync(`${raiz}src/pages/Inicio.jsx`, 'utf8');
  assert.match(inicio, /aria-pressed=\{going\}/);
  assert.match(inicio, /aria-pressed=\{notGoing\}/);
  // o card e o jogo respondem pelo mesmo caminho: o do RSVP, com estado otimista
  assert.match(card, /responderComOtimismo\(/);
  assert.match(inicio, /responderComOtimismo\(/);
});
