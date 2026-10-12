// Futty v2.0 — Rodada 29B (B): o estado de cada uniforme da grade por DIREITO (src/utils/uniformesGrade.js).
// Três casos, uma grade só: grátis (todos com cadeado), pacote do time (só o do time abre), Minha Figurinha (todos abertos).
//
// Uso: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  DESTINO_DO_CADEADO, acaoDoToque, direitoDaGrade, estadoDoUniforme, ordemDaGrade, podeRefazer,
} from '../../src/utils/uniformesGrade.js';

const KITS = [
  { id: 'dark-gold' }, { id: 'dark-purple' }, { id: 'white-gold' }, { id: 'elite-gold' }, { id: 'royal-purple' },
];
const estados = (args) => Object.fromEntries(KITS.map((k) => [k.id, estadoDoUniforme({ ...args, kitId: k.id })]));

test('direito: crédito manda (abre todos), depois o pacote do time, senão grátis', () => {
  assert.equal(direitoDaGrade({ fonteDireito: null, creditos: 0 }), 'gratis');
  assert.equal(direitoDaGrade({}), 'gratis');
  assert.equal(direitoDaGrade(), 'gratis');
  assert.equal(direitoDaGrade({ fonteDireito: 'time', creditos: 0 }), 'pacote');
  assert.equal(direitoDaGrade({ fonteDireito: 'credito', creditos: 3 }), 'minha');
  assert.equal(direitoDaGrade({ fonteDireito: null, creditos: 2 }), 'minha', 'saldo de crédito sem a fonte marcada ainda é Minha Figurinha');
  assert.equal(direitoDaGrade({ fonteDireito: 'time', creditos: 2 }), 'minha', 'quem é do pacote E comprou a Minha abre todos');
});

test('grátis (card com a foto): TODOS os cinco com cadeado — nem o Ouro Escuro fica livre', () => {
  assert.deepEqual(estados({ direito: 'gratis', kitVestido: null, slots: [] }), {
    'dark-gold': 'trancado', 'dark-purple': 'trancado', 'white-gold': 'trancado', 'elite-gold': 'trancado', 'royal-purple': 'trancado',
  });
});

test('pacote do time: o uniforme do time aberto (pintável) e os outros quatro com cadeado', () => {
  assert.deepEqual(estados({ direito: 'pacote', kitDoTime: 'dark-purple', kitVestido: null, slots: [] }), {
    'dark-gold': 'trancado', 'dark-purple': 'geravel', 'white-gold': 'trancado', 'elite-gold': 'trancado', 'royal-purple': 'trancado',
  });
});

test('pacote do time, já pintado: o do time vira "vestido" (✓) e os outros continuam trancados', () => {
  assert.deepEqual(estados({ direito: 'pacote', kitDoTime: 'dark-purple', kitVestido: 'dark-purple', slots: ['dark-purple'] }), {
    'dark-gold': 'trancado', 'dark-purple': 'vestido', 'white-gold': 'trancado', 'elite-gold': 'trancado', 'royal-purple': 'trancado',
  });
});

test('Minha Figurinha: todos abertos; os não pintados dizem que custam 1 geração; o vestido e os pintados ficam à parte', () => {
  assert.deepEqual(estados({ direito: 'minha', kitVestido: 'dark-gold', slots: ['dark-gold', 'white-gold'] }), {
    'dark-gold': 'vestido', 'dark-purple': 'geravel', 'white-gold': 'pintado', 'elite-gold': 'geravel', 'royal-purple': 'geravel',
  });
  assert.deepEqual(estados({ direito: 'minha', kitVestido: null, slots: [] }), {
    'dark-gold': 'geravel', 'dark-purple': 'geravel', 'white-gold': 'geravel', 'elite-gold': 'geravel', 'royal-purple': 'geravel',
  }, 'no card com a foto nenhum uniforme está vestido');
});

test('uniforme já pintado abre mesmo sem direito (trocar entre pintados é grátis e instantâneo)', () => {
  assert.equal(estadoDoUniforme({ direito: 'gratis', kitId: 'white-gold', kitVestido: 'dark-gold', slots: ['dark-gold', 'white-gold'] }), 'pintado');
  assert.equal(estadoDoUniforme({ direito: 'pacote', kitId: 'elite-gold', kitDoTime: 'dark-purple', slots: ['elite-gold'] }), 'pintado');
});

test('toque: vestido não faz nada, pintado veste, gerável pede confirmação, trancado leva à Minha Figurinha', () => {
  assert.equal(acaoDoToque('vestido'), 'nada');
  assert.equal(acaoDoToque('pintado'), 'vestir');
  assert.equal(acaoDoToque('geravel'), 'pintar');
  assert.equal(acaoDoToque('trancado'), 'planos');
  assert.equal(DESTINO_DO_CADEADO, '/planos?destaque=minha');
});

test('31D · o tile do uniforme que custa uma geração não leva texto (só a estrelinha de IA); o aviso é só na confirmação', async () => {
  const { readFileSync } = await import('node:fs');
  const fonte = readFileSync(new URL('../../src/pages/Figurinha.jsx', import.meta.url), 'utf8');
  assert.ok(!/SELO_PINTAR/.test(fonte) && !/data-selo="pintar"/.test(fonte), 'o selo "pintar · 1 geração · ~45 s" saiu do tile');
  assert.match(fonte, /data-ia-estrela/, 'fica a estrelinha de IA, sem texto');
  assert.ok(!/SELO_PINTAR/.test(readFileSync(new URL('../../src/utils/uniformesGrade.js', import.meta.url), 'utf8')));
  // a confirmação: título, linha com o saldo (singular/plural certo) e os dois botões; o tempo só na mensagem de "gerando"
  assert.match(fonte, /Gerar figurinha com este uniforme\?/);
  assert.match(fonte, /Isso usa 1 geração\. Você tem/);
  assert.match(fonte, />\s*Gerar\s*<\/button>/);
  assert.ok(!/Pintar no uniforme|Usa 1 das suas|leva ~45 s/.test(fonte), 'nada do texto antigo da confirmação');
  assert.match(fonte, /Leva uns \{pintura\?\.estimativaSegundos \|\| 45\} segundos/, 'o tempo aparece na mensagem de "gerando"');
});

test('Refazer: só com a figurinha no card, geração sobrando e direito que pinta ESTE uniforme', () => {
  const base = { avatarEhIA: true, restantes: 2 };
  assert.equal(podeRefazer({ ...base, direito: 'minha', kitVestido: 'white-gold' }), true);
  assert.equal(podeRefazer({ ...base, direito: 'pacote', kitVestido: 'dark-purple', kitDoTime: 'dark-purple' }), true);
  assert.equal(podeRefazer({ ...base, direito: 'pacote', kitVestido: 'white-gold', kitDoTime: 'dark-purple' }), false, 'no pacote só o uniforme do time é pintável');
  assert.equal(podeRefazer({ ...base, direito: 'gratis', kitVestido: 'dark-gold' }), false);
  assert.equal(podeRefazer({ ...base, restantes: 0, direito: 'minha', kitVestido: 'dark-gold' }), false, 'sem geração sobrando não há o que refazer');
  assert.equal(podeRefazer({ ...base, avatarEhIA: false, direito: 'minha', kitVestido: 'dark-gold' }), false, 'card com a foto não tem uniforme atual');
  assert.equal(podeRefazer({ ...base, direito: 'minha', kitVestido: null }), false);
});

test('ordem: no pacote o uniforme do time vai primeiro; nos demais casos vale a do catálogo (e nada é alterado no original)', () => {
  const original = [...KITS];
  assert.deepEqual(ordemDaGrade(KITS, { direito: 'pacote', kitDoTime: 'royal-purple' }).map((k) => k.id), ['royal-purple', 'dark-gold', 'dark-purple', 'white-gold', 'elite-gold']);
  assert.deepEqual(ordemDaGrade(KITS, { direito: 'minha', kitDoTime: null }).map((k) => k.id), KITS.map((k) => k.id));
  assert.deepEqual(ordemDaGrade(KITS, { direito: 'gratis' }).map((k) => k.id), KITS.map((k) => k.id));
  assert.deepEqual(KITS, original);
});
