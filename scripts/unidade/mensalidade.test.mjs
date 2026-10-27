// Futty v2.0 — src/utils/mensalidade.js: o "Como pagar" só vira botão com http(s) de verdade (javascript:, intent:, data: e companhia são
// texto), o domínio aparece antes, os nomes dos meses, o contador e o e-mail do "Traga seu histórico".
//
// Uso: npm test  (ou: node --test scripts/unidade/mensalidade.test.mjs)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { jeitoDePagar, nomeDoMes, outroMes, diaDoVencimento, textoDoContador, emailDoHistorico, historicoFechado, fecharHistorico } from '../../src/utils/mensalidade.js';

test('"Como pagar": http(s) vira o botão Pagar com o domínio; o que vem depois do endereço fica como texto', () => {
  assert.deepEqual(jeitoDePagar('https://picpay.me/chavo'), { link: { href: 'https://picpay.me/chavo', dominio: 'picpay.me' }, texto: null });
  assert.deepEqual(jeitoDePagar('  http://www.mercadopago.com.br/x  mande o print no grupo '), {
    link: { href: 'http://www.mercadopago.com.br/x', dominio: 'mercadopago.com.br' }, texto: 'mande o print no grupo',
  });
  assert.equal(jeitoDePagar('HTTPS://PICPAY.ME/Z').link.dominio, 'picpay.me');
});

test('"Como pagar": qualquer outro esquema é TEXTO (nunca vira link)', () => {
  for (const t of ['javascript:alert(1)', 'JavaScript:alert(document.cookie)', 'intent://scan/#Intent;scheme=zxing;end', 'data:text/html,<script>x</script>',
    'pix://qualquer', 'vbscript:msgbox', 'Pix pro Zé: (11) 99999-9999', 'picpay.me/chavo', '//evil.example/x', 'https://', 'https:// espaço']) {
    const j = jeitoDePagar(t);
    assert.equal(j.link, null, t);
    assert.equal(j.texto, t.trim(), t);
  }
  assert.equal(jeitoDePagar(''), null);
  assert.equal(jeitoDePagar('   '), null);
  assert.equal(jeitoDePagar(null), null);
});

test('meses, vencimento e contador', () => {
  assert.equal(nomeDoMes('2026-10'), 'Outubro de 2026');
  assert.equal(nomeDoMes('2026-03'), 'Março de 2026');
  assert.equal(nomeDoMes('torto'), '');
  assert.equal(outroMes('2026-01', -1), '2025-12');
  assert.equal(outroMes('2026-12', 1), '2027-01');
  assert.equal(diaDoVencimento('2026-02-28'), '28/02');
  assert.equal(diaDoVencimento(null), null);
  assert.equal(textoDoContador({ pagos: 8, total: 15 }), '8 de 15 pagaram');
  assert.equal(textoDoContador({ pagos: 1, total: 15 }), '1 de 15 pagou');
  assert.equal(textoDoContador({ pagos: 0, total: 4 }), '0 de 4 pagaram');
});

test('"Traga seu histórico": o mailto leva o assunto com o nome do time e o corpo com o link do time e o que mandar', () => {
  const href = emailDoHistorico({ nome: 'Missa de Quinta', slug: 'missa-de-quinta-ogqq6' }, 'https://futtyapp.com.br');
  const u = new URL(href);
  assert.equal(u.protocol, 'mailto:');
  assert.equal(u.pathname, 'contato@futtyapp.com');
  assert.equal(u.searchParams.get('subject'), 'Histórico do time Missa de Quinta');
  const corpo = u.searchParams.get('body');
  assert.match(corpo, /https:\/\/futtyapp\.com\.br\/time\/missa-de-quinta-ogqq6/);
  assert.match(corpo, /nomes, jogos, gols, vitórias e campeões/);
});

test('"Traga seu histórico": fechar vale para aquele time só; sem localStorage, a sessão segura', () => {
  assert.equal(historicoFechado('time-a'), false);
  fecharHistorico('time-a');
  assert.equal(historicoFechado('time-a'), true);
  assert.equal(historicoFechado('time-b'), false);
  assert.equal(historicoFechado(null), true, 'sem time, nada aparece');
});
