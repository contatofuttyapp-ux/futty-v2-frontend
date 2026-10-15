// Rodada 31P — o confete do campeonato terminado no Início sai UMA vez por campeonato por pessoa (utils/campeonatoCelebrado.js).
// Arquivo só dele: o módulo guarda uma memória da sessão (o Set de quem já celebrou), e outro teste no mesmo processo a contaminaria.
import { test } from 'node:test';
import assert from 'node:assert/strict';

// O aparelho de mentira: um localStorage que se pode ligar e desligar (janela privada / bloqueio = getItem e setItem jogam erro).
const guardado = new Map();
let semArmazenamento = false;
globalThis.localStorage = {
  getItem(k) { if (semArmazenamento) throw new Error('bloqueado'); return guardado.has(k) ? guardado.get(k) : null; },
  setItem(k, v) { if (semArmazenamento) throw new Error('bloqueado'); guardado.set(k, String(v)); },
  removeItem(k) { guardado.delete(k); },
};

const { deveCelebrarCampeonato, guardarCampeonatoCelebrado, campeonatoJaCelebrado } = await import('../../src/utils/campeonatoCelebrado.js');

const terminado = (id) => ({ id, estado: 'terminado' });

test('só o campeonato terminado, com id e com a pessoa conhecida, pede confete', () => {
  assert.equal(deveCelebrarCampeonato(null, 'U1'), false);
  assert.equal(deveCelebrarCampeonato({ id: 'C0', estado: 'em_curso' }, 'U1'), false, 'em andamento: nada');
  assert.equal(deveCelebrarCampeonato({ estado: 'terminado' }, 'U1'), false, 'sem id não há como lembrar: nada');
  assert.equal(deveCelebrarCampeonato(terminado('C0'), null), false, 'a pessoa ainda não carregou: espera');
  assert.equal(deveCelebrarCampeonato(terminado('C0'), 'U1'), true);
});

test('celebrado uma vez, nunca mais — e fica no aparelho, por pessoa e por campeonato', () => {
  assert.equal(deveCelebrarCampeonato(terminado('C1'), 'U1'), true);
  guardarCampeonatoCelebrado('U1', 'C1');
  assert.equal(guardado.get('futty_campeonato_celebrado:U1:C1'), '1');
  assert.equal(deveCelebrarCampeonato(terminado('C1'), 'U1'), false, '2ª abertura');
  assert.equal(deveCelebrarCampeonato(terminado('C1'), 'U1'), false, '3ª abertura');
  assert.equal(deveCelebrarCampeonato(terminado('C2'), 'U1'), true, 'outro campeonato: festa nova');
  assert.equal(deveCelebrarCampeonato(terminado('C1'), 'U2'), true, 'outra pessoa no mesmo aparelho: festa dela');
});

test('o que já está no aparelho vale mesmo depois de o app reabrir (sem a memória da sessão)', () => {
  guardado.set('futty_campeonato_celebrado:U3:C9', '1');
  assert.equal(campeonatoJaCelebrado('U3', 'C9'), true);
  assert.equal(deveCelebrarCampeonato(terminado('C9'), 'U3'), false);
});

test('sem armazenamento (janela privada, bloqueio): não quebra, e a sessão ainda segura a repetição', () => {
  semArmazenamento = true;
  try {
    assert.equal(deveCelebrarCampeonato(terminado('C5'), 'U1'), true);
    assert.doesNotThrow(() => guardarCampeonatoCelebrado('U1', 'C5'));
    assert.equal(deveCelebrarCampeonato(terminado('C5'), 'U1'), false, 'mesma sessão: não repete');
  } finally {
    semArmazenamento = false;
  }
});
