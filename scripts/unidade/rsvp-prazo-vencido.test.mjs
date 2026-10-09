// Futty v2.0 — Rodada 30E (item 3): o prazo de presença vencido não mente mais.
//
// Achado: num jogo com prazo vencido, "Vou / Não vou" continuavam ativos; ao tocar, o motor devolvia 400
// ("O prazo para confirmar presença já passou.") e a tela mostrava a frase genérica de sempre — uma
// mentira, porque tentar de novo não resolve. Duas pontas:
//   · lib/rsvp.js: um erro COM `status` (resposta de verdade do motor) mostra a mensagem dele; sem
//     `status` (apiFetch não distinguiu rede de servidor — o fetch nem voltou) fica a frase genérica.
//   · motivoRsvpEncerrada: a tela sabe ANTES de tocar que o prazo venceu (ou o admin fechou) e desliga o
//     botão com "Prazo encerrado." / "Presença fechada.", em vez de deixar a pessoa tocar para descobrir.
//
// Uso: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { responderComOtimismo, motivoRsvpEncerrada, FRASE_RSVP_ENCERRADA, MSG_FALHA_RSVP } from '../../src/lib/rsvp.js';

const RAIZ = fileURLToPath(new URL('../../', import.meta.url));
const ler = (rel) => fs.readFileSync(path.join(RAIZ, rel), 'utf8');

function erroDoMotor(mensagem, status = 400) {
  const e = new Error(mensagem);
  e.status = status;
  return e;
}

test('30E-3 · 400 com mensagem do motor: a tela mostra a mensagem dele, não a frase genérica', async () => {
  const r = await responderComOtimismo({
    gameId: 'jogo-1', status: 'confirmado', anterior: null, aplicar: () => {},
    enviar: async () => { throw erroDoMotor('O prazo para confirmar presença já passou.'); },
  });
  assert.deepEqual(r, { ok: false, erro: 'O prazo para confirmar presença já passou.' });
});

test('30E-3 · qualquer erro do motor com status (não só 400) mostra a mensagem dele', async () => {
  const r = await responderComOtimismo({
    gameId: 'jogo-1', status: 'confirmado', anterior: null, aplicar: () => {},
    enviar: async () => { throw erroDoMotor('A confirmação de presença não está aberta.', 400); },
  });
  assert.equal(r.erro, 'A confirmação de presença não está aberta.');
});

test('30E-3 · erro de REDE (sem status: o fetch nem voltou) continua com a frase genérica', async () => {
  const semStatus = new Error('Failed to fetch'); // apiFetch só põe `.status` numa resposta de verdade do motor
  const r = await responderComOtimismo({
    gameId: 'jogo-1', status: 'confirmado', anterior: null, aplicar: () => {}, enviar: async () => { throw semStatus; },
  });
  assert.deepEqual(r, { ok: false, erro: MSG_FALHA_RSVP });
});

test('30E-3 · erro com status mas sem mensagem (corpo vazio) ainda cai na frase genérica, nunca em branco', async () => {
  const r = await responderComOtimismo({
    gameId: 'jogo-1', status: 'confirmado', anterior: null, aplicar: () => {},
    enviar: async () => { const e = new Error(''); e.status = 500; throw e; },
  });
  assert.equal(r.erro, MSG_FALHA_RSVP);
});

test('30E-3 · motivoRsvpEncerrada: nunca foi aberta → null (vale o Vou / Não vou de sempre, sem prazo)', () => {
  assert.equal(motivoRsvpEncerrada(null), null);
  assert.equal(motivoRsvpEncerrada(undefined), null);
  assert.equal(motivoRsvpEncerrada({ rsvp_aberto: false, rsvp_fechado: false, rsvp_prazo: null }), null);
});

test('30E-3 · motivoRsvpEncerrada: aberta e dentro do prazo → null (continua respondível)', () => {
  const amanha = new Date(Date.now() + 86400000).toISOString();
  assert.equal(motivoRsvpEncerrada({ rsvp_aberto: true, rsvp_fechado: false, rsvp_prazo: amanha }), null);
});

test('30E-3 · motivoRsvpEncerrada: o admin fechou → "fechado", mesmo se o prazo ainda não venceu', () => {
  const amanha = new Date(Date.now() + 86400000).toISOString();
  assert.equal(motivoRsvpEncerrada({ rsvp_aberto: true, rsvp_fechado: true, rsvp_prazo: amanha }), 'fechado');
});

test('30E-3 · motivoRsvpEncerrada: só o prazo venceu, ninguém fechou → "prazo"', () => {
  const ontem = new Date(Date.now() - 86400000).toISOString();
  assert.equal(motivoRsvpEncerrada({ rsvp_aberto: true, rsvp_fechado: false, rsvp_prazo: ontem }), 'prazo');
});

test('30E-3 · a frase de cada motivo nunca manda "tentar de novo"', () => {
  assert.equal(FRASE_RSVP_ENCERRADA.fechado, 'Presença fechada.');
  assert.equal(FRASE_RSVP_ENCERRADA.prazo, 'Prazo encerrado.');
  assert.doesNotMatch(FRASE_RSVP_ENCERRADA.fechado, /tente de novo/i);
  assert.doesNotMatch(FRASE_RSVP_ENCERRADA.prazo, /tente de novo/i);
});

// ── as telas: o card do jogo e o cartão "Confirme presença" do Início, e o botão do Jogo ──────────────
test('30E-3 · o Início usa motivoRsvpEncerrada para o jogo do RSVP e para o próximo, e nunca deixa "aberto" valer só pelo rsvp_aberto', () => {
  const inicio = ler('src/pages/Inicio.jsx');
  assert.match(inicio, /import \{ MSG_FALHA_RSVP, FRASE_RSVP_ENCERRADA, motivoRsvpEncerrada, responderComOtimismo \} from '\.\.\/lib\/rsvp';/);
  assert.match(inicio, /const encerradaNoProximo = !proximoSoOrganizo \? motivoRsvpEncerrada\(rsvpInfo\) : null;/);
  assert.match(inicio, /const encerradaNoJogoDoRsvp = motivoRsvpEncerrada\(rsvpData\);/);
  // "aberto" de verdade exige NÃO estar encerrado — rsvp_aberto sozinho nunca mais basta.
  assert.match(inicio, /rsvp_aberto\) && !encerradaNoProximo;/);
  assert.match(inicio, /rsvp_aberto\) && !encerradaNoJogoDoRsvp;/);
});

test('30E-3 · o GameCard do Início desliga Vou / Não vou e mostra o motivo quando o jogo do RSVP está encerrado', () => {
  const inicio = ler('src/pages/Inicio.jsx');
  assert.match(inicio, /\) : game\.rsvp_encerrada \? \(/);
  assert.match(inicio, /<button type="button" className="pbtn pbtn--go hud-corners-s" disabled style=\{\{ opacity: 0\.45, cursor: 'not-allowed' \}\}>Vou<\/button>/);
  assert.match(inicio, /<button type="button" className="pbtn pbtn--no hud-corners-s" disabled style=\{\{ opacity: 0\.45, cursor: 'not-allowed' \}\}>Não vou<\/button>/);
  assert.match(inicio, /\{FRASE_RSVP_ENCERRADA\[game\.rsvp_encerrada\]\}/);
  // O cartão "Confirme presença" (RSVPCard) aparece tanto aberto quanto encerrado — nunca só some.
  assert.match(inicio, /\{rsvpAbertoNoProximo \|\| encerradaNoProximo \? \(/);
  assert.match(inicio, /encerrada=\{encerradaNoProximo\}/);
  // O aviso de ausência (e a fila de avisos do topo) não reaparecem nem cobram resposta de um jogo encerrado.
  assert.match(inicio, /!rsvpAbertoNoProximo && !encerradaNoProximo && !proximoSoOrganizo \? \(/);
  assert.match(inicio, /if \(g\.id === jogoDoRsvpId && encerradaNoJogoDoRsvp\) return \{ \.\.\.g, user_status: g\.user_status \|\| 'rsvp_encerrado' \};/);
});

test('30E-3 · o RSVPCard mostra o motivo com os botões desligados (nunca chama responder)', () => {
  const card = ler('src/components/RSVPCard.jsx');
  assert.match(card, /import \{ responderComOtimismo, FRASE_RSVP_ENCERRADA \} from '\.\.\/lib\/rsvp';/);
  assert.match(card, /if \(encerrada\) \{/);
  assert.match(card, /\{FRASE_RSVP_ENCERRADA\[encerrada\]\}/);
  const bloco = card.slice(card.indexOf('if (encerrada) {'), card.indexOf('// Jogo cheio'));
  assert.doesNotMatch(bloco, /onClick/, 'nenhum botão do estado encerrado chama responder');
  assert.match(bloco, /disabled aria-disabled="true"/g);
});

test('30E-3 · a página do Jogo lê o mesmo motivo (só leitura, sem tocar no /confirmar) e avisa em vez de deixar confirmar', () => {
  const jogo = ler('src/pages/Jogo.jsx');
  assert.match(jogo, /import \{ motivoRsvpEncerrada, FRASE_RSVP_ENCERRADA \} from '\.\.\/lib\/rsvp';/);
  assert.match(jogo, /const encerradaNoJogo = motivoRsvpEncerrada\(rsvpEstado\);/);
  assert.match(jogo, /\) : encerradaNoJogo \? \(\s*<span className="muted" data-rsvp-encerrada>\{FRASE_RSVP_ENCERRADA\[encerradaNoJogo\]\}<\/span>/);
});
