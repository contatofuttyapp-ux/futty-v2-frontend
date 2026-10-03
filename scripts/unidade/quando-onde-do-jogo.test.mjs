// Futty v2.0 — Rodada 29K, achado 112: a página pública do sorteio não dizia quando nem onde era
// o jogo. "qui., 8 de out · 20:00 · Society Madalena — campo 2", no relógio do campo.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { quandoOndeDoJogo } from '../../src/utils/quandoOndeDoJogo.js';

test('data + hora + local, no mesmo fuso de quem olha (sem rabicho)', () => {
  const texto = quandoOndeDoJogo(
    { data: '2026-10-08T23:00:00Z', local: 'Society Madalena — campo 2' },
    { fuso: 'America/Sao_Paulo', cidade: 'São Paulo' },
    { olhando: 'America/Sao_Paulo' },
  );
  assert.equal(texto, 'qui., 8 de out. · 20:00 · Society Madalena — campo 2');
});

test('com o rabicho da cidade quando o fuso de quem olha é diferente do campo (achado 83)', () => {
  const texto = quandoOndeDoJogo(
    { data: '2026-10-08T23:00:00Z', local: 'Society Madalena' },
    { fuso: 'America/Sao_Paulo', cidade: 'São Paulo' },
    { olhando: 'Europe/Lisbon' },
  );
  assert.equal(texto, 'qui., 8 de out. · 20:00 · horário de São Paulo · Society Madalena');
});

test('sem local (jogo em time sem o campo preenchido): só data e hora', () => {
  const texto = quandoOndeDoJogo({ data: '2026-10-08T23:00:00Z', local: null }, { fuso: 'America/Sao_Paulo' }, { olhando: 'America/Sao_Paulo' });
  assert.equal(texto, 'qui., 8 de out. · 20:00');
});

test('sem jogo (404) ou sem data: string vazia — a tela não mostra a linha', () => {
  assert.equal(quandoOndeDoJogo(null, { fuso: 'America/Sao_Paulo' }), '');
  assert.equal(quandoOndeDoJogo({ data: null, local: 'Quadra' }, { fuso: 'America/Sao_Paulo' }), '');
  assert.equal(quandoOndeDoJogo(undefined, undefined), '');
});
