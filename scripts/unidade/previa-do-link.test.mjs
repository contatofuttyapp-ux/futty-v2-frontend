// Futty v2.0 — Rodada 29J, achado 121: a lógica pura da prévia do link (functions/_shared/
// previaDoLink.js) — o que cada rota pede ao motor e o que vira título/descrição/imagem. O que
// depende do runtime da Cloudflare (HTMLRewriter, fetch de verdade) fica fora daqui — ver o
// cabeçalho do próprio arquivo.
//
// Uso: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ehRastreador, caminhoDoP, segundoSegmento, previaDoSorteio, previaDoCampeonato, previaDoConvite,
} from '../../functions/_shared/previaDoLink.js';

test('ehRastreador: WhatsApp (facebookexternalhit) e as outras redes, sim; um navegador normal, não', () => {
  for (const ua of [
    'facebookexternalhit/1.1',
    'Mozilla/5.0 (compatible; WhatsApp/2.23)',
    'Twitterbot/1.0',
    'Slackbot-LinkExpanding 1.0',
    'TelegramBot (like TwitterBot)',
  ]) assert.ok(ehRastreador(ua), ua);
  for (const ua of [
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0',
    '',
    undefined,
  ]) assert.ok(!ehRastreador(ua), String(ua));
});

test('caminhoDoP: sorteio (/p/<slug>/<gameId>) e campeonato (/p/campeonato/<slug>/<id>) pedem caminhos diferentes ao motor', () => {
  assert.deepEqual(caminhoDoP('/p/varzea-fc-teste/372f8e0d-5618-460d-b0ad-548e84de9581'), {
    tipo: 'sorteio', caminho: '/api/p/372f8e0d-5618-460d-b0ad-548e84de9581',
  });
  assert.deepEqual(caminhoDoP('/p/campeonato/varzea-fc-teste/abc123'), {
    tipo: 'campeonato', caminho: '/api/p/campeonato/varzea-fc-teste/abc123',
  });
  assert.equal(caminhoDoP('/p/so-um-segmento'), null);
  assert.equal(caminhoDoP('/outra-coisa/x/y'), null);
});

test('segundoSegmento: o código de /s/<código> e o token de /c/<token> ou /convite/<token>', () => {
  assert.equal(segundoSegmento('/s/ab3k9x7m'), 'ab3k9x7m');
  assert.equal(segundoSegmento('/convite/372f8e0d-5618-460d-b0ad-548e84de9581'), '372f8e0d-5618-460d-b0ad-548e84de9581');
  assert.equal(segundoSegmento('/c/'), null);
  assert.equal(segundoSegmento('/'), null);
});

test('previaDoSorteio: "<time> · sorteio dos times", a descrição fixa da casa, e o logo do time como imagem quando existe', () => {
  assert.deepEqual(previaDoSorteio({ equipa: { nome: 'Várzea FC', logo_url: 'https://x/logo.png' } }), {
    titulo: 'Várzea FC · sorteio dos times',
    descricao: 'Sorteio de times, ranking e figurinha de colecionador.',
    imagem: 'https://x/logo.png',
  });
  assert.equal(previaDoSorteio({ equipa: { nome: 'Várzea FC' } }).imagem, null, 'sem logo, sem imagem própria — fica o og:image padrão');
  assert.equal(previaDoSorteio(null), null, 'motor fora do ar, ou jogo que não existe: nunca quebra a página');
  assert.equal(previaDoSorteio({}), null);
});

test('previaDoCampeonato: nome do campeonato + nome do time, times e formato na descrição', () => {
  const p = previaDoCampeonato({
    equipa: { nome: 'Várzea FC', logo_url: null },
    campeonato: { nome: 'Copa de Outubro', formato: 'mata', times: [{}, {}, {}, {}] },
  });
  assert.equal(p.titulo, 'Copa de Outubro · Várzea FC · campeonato');
  assert.equal(p.descricao, '4 times · mata-mata.');
  assert.equal(p.imagem, null);
  assert.equal(previaDoCampeonato(null), null);
  assert.equal(previaDoCampeonato({ equipa: { nome: 'x' } }), null, 'sem campeonato (404 do motor), sem prévia própria');
});

test('previaDoConvite: "<time> · convite para o time", a frase de boas-vindas fixa (VOZ §1); convite inválido não tem prévia própria', () => {
  const p = previaDoConvite({ valido: true, team: { nome: 'Missa de Quinta', logo_url: 'https://x/logo.png' } });
  assert.equal(p.titulo, 'Missa de Quinta · convite para o time');
  assert.equal(p.descricao, 'Aqui a gente confirma presença, sorteia os times, guarda o ranking e faz sua figurinha.');
  assert.equal(p.imagem, 'https://x/logo.png');
  assert.equal(previaDoConvite({ valido: false, team: { nome: 'x' } }), null, 'convite expirado: fica a prévia genérica');
  assert.equal(previaDoConvite({ valido: true, team: null }), null, 'convite que não existe (nao_encontrado): time nulo');
});
