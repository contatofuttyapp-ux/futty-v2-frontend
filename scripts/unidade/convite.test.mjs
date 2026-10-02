// Futty v2.0 — Rodada 29B (A): o que a página do convite escreve (src/utils/convite.js) e o bilhete do convite pendente
// (src/lib/convitePendente.js). Puro: sem navegador, sem rede.
//
// Uso: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dataCurta, fatosDoConvite, fraseDoConvite, linkDoConvite, textoDoConvite, enderecoDoWhatsapp } from '../../src/utils/convite.js';
import { guardarConvitePendente, guardarPosicaoPendente, lerConvitePendente, temConvitePendente, tomarConvitePendente } from '../../src/lib/convitePendente.js';

const SP = 'America/Sao_Paulo';
const AGORA = new Date('2026-10-01T15:00:00Z'); // quinta-feira, 12h em São Paulo
const opc = { agora: AGORA, fuso: SP };

test('dataCurta: hoje, amanhã e "dia da semana, dia mês" — sempre no fuso de quem olha', () => {
  assert.equal(dataCurta('2026-10-01T23:00:00Z', opc), 'hoje');
  assert.equal(dataCurta('2026-10-02T23:00:00Z', opc), 'amanhã');
  assert.equal(dataCurta('2026-10-03T22:00:00Z', opc), 'sáb, 3 out');
  assert.equal(dataCurta('2026-12-25T15:00:00Z', opc), 'sex, 25 dez');
  // 23h30 de quinta em São Paulo já é sexta em UTC: o dia é o de quem olha, não o do servidor.
  assert.equal(dataCurta('2026-10-02T02:30:00Z', opc), 'hoje');
  assert.equal(dataCurta('2026-10-02T02:30:00Z', { agora: AGORA, fuso: 'UTC' }), 'amanhã');
});

test('dataCurta: sem data ou com data quebrada devolve null (nunca "Invalid Date" na tela)', () => {
  assert.equal(dataCurta(null, opc), null);
  assert.equal(dataCurta('', opc), null);
  assert.equal(dataCurta('ontem à noite', opc), null);
});

test('fatosDoConvite: jogadores, próximo jogo e cidade — só o que existe', () => {
  const cheio = { membros: 21, proximoJogo: '2026-10-03T22:00:00Z', cidade: 'Belo Horizonte' };
  assert.deepEqual(fatosDoConvite(cheio, opc), [
    { chave: 'membros', texto: '21 jogadores' },
    { chave: 'jogo', texto: 'Próximo jogo sáb, 3 out' },
    { chave: 'cidade', texto: 'Belo Horizonte' },
  ]);
  assert.deepEqual(fatosDoConvite({ ...cheio, proximoJogo: '2026-10-01T23:00:00Z' }, opc)[1], { chave: 'jogo', texto: 'Próximo jogo hoje' });
});

test('fatosDoConvite: singular, e sem jogo marcado nem cidade sobra um fato só, sem buraco', () => {
  assert.deepEqual(fatosDoConvite({ membros: 1, proximoJogo: null, cidade: null }, opc), [{ chave: 'membros', texto: '1 jogador' }]);
  assert.deepEqual(fatosDoConvite({ membros: 7, cidade: '   ' }, opc), [{ chave: 'membros', texto: '7 jogadores' }]);
});

test('fatosDoConvite: motor antigo (sem os campos novos) ou contagem zero não inventa fato', () => {
  assert.deepEqual(fatosDoConvite({}, opc), []);
  assert.deepEqual(fatosDoConvite(null, opc), []);
  assert.deepEqual(fatosDoConvite({ membros: 0 }, opc), []);
});

test('fraseDoConvite: "Tonhão te convidou para o Várzea FC"; sem saber quem convidou, "Você foi convidado…"', () => {
  assert.equal(fraseDoConvite({ convidadoPor: 'Tonhão', nomeTime: 'Várzea FC' }), 'Tonhão te convidou para o Várzea FC');
  assert.equal(fraseDoConvite({ convidadoPor: null, nomeTime: 'Várzea FC' }), 'Você foi convidado para o Várzea FC');
  assert.equal(fraseDoConvite({ convidadoPor: '  ', nomeTime: 'Várzea FC' }), 'Você foi convidado para o Várzea FC');
});

// ─── o bilhete do convite pendente ────────────────────────────────────────────────────────────────
function comArmazenamento(fn) {
  const guardado = new Map();
  globalThis.localStorage = {
    getItem: (k) => (guardado.has(k) ? guardado.get(k) : null),
    setItem: (k, v) => { guardado.set(k, String(v)); },
    removeItem: (k) => { guardado.delete(k); },
  };
  try { fn(guardado); } finally { delete globalThis.localStorage; }
}

test('convite pendente: guarda, devolve UMA vez e apaga', () => {
  comArmazenamento((guardado) => {
    guardarConvitePendente('abc-123');
    assert.equal(guardado.size, 1);
    assert.equal(tomarConvitePendente(), 'abc-123');
    assert.equal(guardado.size, 0, 'depois de tomado, o bilhete some');
    assert.equal(tomarConvitePendente(), null, 'segunda vez não há nada');
  });
});

test('convite pendente: espreitar (Onboarding, 29D) diz se há bilhete válido SEM o tomar', () => {
  comArmazenamento((guardado) => {
    assert.equal(temConvitePendente(), false, 'sem bilhete');
    const t0 = 1_000_000;
    guardarConvitePendente('abc-123', t0);
    assert.equal(temConvitePendente(t0 + 1000), true);
    assert.equal(guardado.size, 1, 'espreitar não apaga');
    assert.equal(temConvitePendente(t0 + 3 * 86400000), false, 'vencido não conta');
    assert.equal(tomarConvitePendente(t0 + 1000), 'abc-123', 'o Início ainda o toma depois');
  });
});

test('convite pendente: passou de dois dias não vale (e também é apagado)', () => {
  comArmazenamento((guardado) => {
    const t0 = 1_000_000;
    guardarConvitePendente('velho', t0);
    assert.equal(tomarConvitePendente(t0 + 2 * 86400000 + 1), null);
    assert.equal(guardado.size, 0);
    guardarConvitePendente('fresco', t0);
    assert.equal(tomarConvitePendente(t0 + 86400000), 'fresco');
  });
});

test('convite pendente: sem armazenamento (modo privado) ou lixo no lugar nunca quebra', () => {
  assert.doesNotThrow(() => guardarConvitePendente('x'));
  assert.equal(tomarConvitePendente(), null);
  comArmazenamento((guardado) => {
    guardado.set('futty_convite_pendente', '{não é json');
    assert.equal(tomarConvitePendente(), null);
    guardarConvitePendente('');
    assert.equal(guardado.size, 0, 'token vazio não guarda nada');
  });
});

// ─── Rodada 29H (item 1): o bilhete leva o time e a escolha linha/gol ─────────────────────────────────────────
test('bilhete 29H: guarda uma cópia do time (nome, logo, cor de fundo) para as boas-vindas abrirem sem esperar a rede', () => {
  comArmazenamento((guardado) => {
    const time = { nome: 'Várzea FC', logo_url: 'https://x/logo.png', cor_fundo: '#1a1a2e', slug: 'nao-guarda', cor: 'nao-guarda' };
    guardarConvitePendente('k7m2p9qx', 1_000_000, time);
    assert.deepEqual(lerConvitePendente(1_000_001), { token: 'k7m2p9qx', time: { nome: 'Várzea FC', logo_url: 'https://x/logo.png', cor_fundo: '#1a1a2e' }, goleiro: false });
    assert.equal(guardado.size, 1, 'ler não apaga');
    assert.ok(!guardado.get('futty_convite_pendente').includes('nao-guarda'), 'só o que a tela precisa');
    assert.equal(tomarConvitePendente(1_000_002), 'k7m2p9qx');
    assert.equal(lerConvitePendente(), null);
  });
});

test('bilhete 29H: time sem logo, bilhete antigo (sem time) e bilhete vencido', () => {
  comArmazenamento(() => {
    guardarConvitePendente('abc', 1_000_000, { nome: 'Sem Logo FC' });
    assert.deepEqual(lerConvitePendente(1_000_001).time, { nome: 'Sem Logo FC', logo_url: null, cor_fundo: null });
    guardarConvitePendente('abc', 1_000_000); // a página voltou a abrir sem o time (ex.: erro de rede): mantém o que já tinha
    assert.equal(lerConvitePendente(1_000_001).time.nome, 'Sem Logo FC');
    guardarConvitePendente('outro-convite', 1_000_000);
    assert.equal(lerConvitePendente(1_000_001).time, null, 'outro convite começa limpo, sem o time do anterior');
    assert.equal(lerConvitePendente(1_000_000 + 3 * 86400000), null, 'vencido');
  });
});

test('bilhete 29H: a escolha "No gol" feita nas boas-vindas fica no bilhete (sobrevive a recarregar a página) e some com ele', () => {
  comArmazenamento(() => {
    const t0 = 1_000_000;
    guardarConvitePendente('abc', t0, { nome: 'Várzea FC' });
    guardarPosicaoPendente(true, t0 + 10);
    assert.equal(lerConvitePendente(t0 + 20).goleiro, true);
    guardarConvitePendente('abc', t0 + 30, { nome: 'Várzea FC' }); // a mesma página de novo: a escolha fica
    assert.equal(lerConvitePendente(t0 + 40).goleiro, true);
    guardarPosicaoPendente(false, t0 + 50);
    assert.equal(lerConvitePendente(t0 + 60).goleiro, false);
    tomarConvitePendente(t0 + 70);
    guardarPosicaoPendente(true, t0 + 80); // sem bilhete não há onde guardar: nada acontece, nada quebra
    assert.equal(lerConvitePendente(t0 + 90), null);
  });
});

// ─── Rodada 29H (item 7): o link e a frase do convite ─────────────────────────────────────────────────────────
test('linkDoConvite: o curto (/c/<código>) quando há código; senão o longo (/convite/<uuid>)', () => {
  const origem = 'https://futtyapp.com.br';
  assert.equal(linkDoConvite({ origem, token: 'uuid-longo', codigo: 'k7m2p9qx' }), 'https://futtyapp.com.br/c/k7m2p9qx');
  assert.equal(linkDoConvite({ origem, token: 'uuid-longo', codigo: null }), 'https://futtyapp.com.br/convite/uuid-longo');
  assert.equal(linkDoConvite({ origem, token: 'uuid-longo' }), 'https://futtyapp.com.br/convite/uuid-longo', 'motor sem a migração 072');
});

test('textoDoConvite: a frase aprovada pelo dono (2-out), com o time e o link', () => {
  assert.equal(
    textoDoConvite({ nomeTime: 'Várzea FC', link: 'https://futtyapp.com.br/c/k7m2p9qx' }),
    'Bora jogar? Você foi chamado para o Várzea FC no Futty. Entre pelo link: https://futtyapp.com.br/c/k7m2p9qx'
  );
  assert.equal(textoDoConvite({ nomeTime: '  Várzea FC ', link: 'L' }), 'Bora jogar? Você foi chamado para o Várzea FC no Futty. Entre pelo link: L');
  assert.match(textoDoConvite({ nomeTime: '', link: 'L' }), /para o time no Futty/, 'sem nome, a frase continua inteira');
});

test('enderecoDoWhatsapp: wa.me com a frase codificada', () => {
  const url = enderecoDoWhatsapp({ nomeTime: 'Várzea FC', link: 'https://futtyapp.com.br/c/k7m2p9qx' });
  assert.ok(url.startsWith('https://wa.me/?text='));
  assert.equal(decodeURIComponent(url.slice('https://wa.me/?text='.length)), 'Bora jogar? Você foi chamado para o Várzea FC no Futty. Entre pelo link: https://futtyapp.com.br/c/k7m2p9qx');
});
