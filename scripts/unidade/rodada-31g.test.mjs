// Futty v2.0 — Rodada 31G: a loja fácil de achar. As contas e os textos aqui (quem é dono, o que o cartão do Início diz, os 7 dias do X); o que só um
// navegador confirma (o botão "Loja" no topo, o cartão na Figurinha em cada estado, o X na tela, a 390 e a 360 px) fica em
// scripts/provas/rodada-31g.prova.mjs (npm run provar:navegador -- rodada-31g).
//
// Uso: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ID_PACOTE_NO_INICIO, linhaDoPacote, timesDoDono } from '../../src/utils/pacoteNoInicio.js';
import { DIAS_DO_AGORA_NAO, esconderLembrete, lembreteEscondido } from '../../src/utils/lembretes.js';
import { lerPagina } from './_fonteDaPagina.mjs';

const RAIZ = fileURLToPath(new URL('../../', import.meta.url));
const ler = (rel) => fs.readFileSync(path.join(RAIZ, rel), 'utf8');
const DIA = 24 * 60 * 60 * 1000;
const armazem = (valores = {}) => ({ getItem: (k) => (k in valores ? valores[k] : null), setItem: (k, v) => { valores[k] = String(v); } });

test('só o dono (admin) de algum time entra na conta do cartão; jogador comum devolve vazio', () => {
  const times = [{ id: 'a', role: 'member' }, { id: 'b', role: 'admin' }, { id: 'c', role: 'admin', brilhante_ativo: true }];
  assert.deepEqual(timesDoDono(times).map((t) => t.id), ['b', 'c']);
  assert.deepEqual(timesDoDono([{ id: 'a', role: 'member' }]), []);
  assert.deepEqual(timesDoDono(null), []);
  assert.deepEqual(timesDoDono(undefined), []);
});

test('a linha do cartão: o que o pacote dá, e o presente quando todo time do dono já tem o pacote', () => {
  assert.equal(linhaDoPacote([{ brilhante_ativo: false }]), '2 gerações para cada jogador, até 25.');
  assert.equal(linhaDoPacote([{ brilhante_ativo: true }, { brilhante_ativo: false }]), '2 gerações para cada jogador, até 25.');
  assert.equal(linhaDoPacote([{ brilhante_ativo: true }]), 'Presenteie o time: +2 gerações para cada jogador.');
});

test('o X esconde o cartão por 7 dias naquele aparelho (e não antes, nem depois)', () => {
  assert.equal(DIAS_DO_AGORA_NAO, 7);
  const agora = Date.parse('2026-10-13T12:00:00Z');
  const guardado = armazem();
  assert.equal(lembreteEscondido(ID_PACOTE_NO_INICIO, agora, guardado), false); // nunca fechado: aparece
  assert.equal(esconderLembrete(ID_PACOTE_NO_INICIO, agora, guardado), true);
  assert.equal(lembreteEscondido(ID_PACOTE_NO_INICIO, agora + 1000, guardado), true);
  assert.equal(lembreteEscondido(ID_PACOTE_NO_INICIO, agora + 6 * DIA, guardado), true);
  assert.equal(lembreteEscondido(ID_PACOTE_NO_INICIO, agora + 7 * DIA, guardado), false); // passados os 7 dias, volta
});

test('o aparelho que recusa guardar não quebra o X: devolve false e a tela esconde só desta vez', () => {
  const recusa = { getItem: () => { throw new Error('bloqueado'); }, setItem: () => { throw new Error('QuotaExceededError'); } };
  assert.equal(esconderLembrete(ID_PACOTE_NO_INICIO, Date.now(), recusa), false);
  assert.equal(lembreteEscondido(ID_PACOTE_NO_INICIO, Date.now(), recusa), false);
});

test('a fiação: o botão Loja está nas três telas da Figurinha, o cartão é um só e o do Início só aparece para o dono', () => {
  const figurinha = lerPagina('Figurinha');
  assert.equal((figurinha.match(/<Topbar hud="FIGURINHA" direita=\{<BotaoLoja \/>\} \/>/g) || []).length, 3, 'estreia, carregando e estúdio');
  assert.equal((figurinha.match(/data-cartao-loja/g) || []).length, 1, 'um cartão só — nada duplicado');
  assert.doesNotMatch(figurinha, /Vire figurinha ✨/, 'o convite antigo virou o cartão');
  assert.doesNotMatch(figurinha, /data-comprar-mais/, 'o link solto saiu: o cartão logo abaixo é o caminho');
  assert.match(ler('src/pages/MeuPerfil.jsx'), /Ver Figurinhas →/, 'o link do Perfil continua');
  const inicio = ler('src/pages/Inicio.jsx');
  assert.match(inicio, /timesDoDono\.length > 0 && !pacoteFechado \? <CartaoPacoteInicio/);
  assert.match(ler('src/components/BotaoLoja.jsx'), /to="\/planos"/);
  assert.match(ler('src/components/CartaoPacoteInicio.jsx'), /to="\/planos\?destaque=pacote"/);
});
