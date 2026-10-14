// Futty v2.0 — Rodada 31N: o link do convite com o nome do time e o link único de download.
//
//   1. o nome do time vira enfeite do link curto: /c/<nome-em-slug>-<código> (minúsculas, sem acento, hífens, até 30 caracteres);
//   2. quem lê o link — a tela (codigoDoLinkCurto) e a prévia do WhatsApp (functions/_shared/previaDoLink.js#parametroDoConvite) — tira
//      o MESMO código do link novo e do antigo (/c/<código>), e o link novo continua na lista dos que abrem o app;
//   3. as três telas que geram o link (página do time, criação do time, Admin) mandam o nome do time;
//   4. /download, /baixar e /app ficam FORA da lista de links que abrem o app (parser, AASA do iOS, manifesto do Android).
//
// O comportamento na tela (convite aberto pelo link novo com e sem o app; /download no iPhone, no Android e no computador) é provado no
// navegador: npm run provar:navegador -- rodada-31n
//
// Uso: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { slugDoNome, caminhoCurtoDoConvite, codigoDoLinkCurto } from '../../src/utils/linkCurtoDoConvite.js';
import { linkDoConvite } from '../../src/utils/convite.js';
import { ORIGEM_DO_SITE, PREFIXOS_DE_LINK, caminhoDoLinkDoSite } from '../../src/lib/linkDoSite.js';
import { parametroDoConvite } from '../../functions/_shared/previaDoLink.js';

const RAIZ = fileURLToPath(new URL('../../', import.meta.url));
const ler = (rel) => fs.readFileSync(`${RAIZ}${rel}`, 'utf8');

test('slugDoNome: minúsculas, sem acento, só letras e números com hífen; até 30 caracteres cortando numa palavra inteira', () => {
  assert.equal(slugDoNome('Domingueira FC'), 'domingueira-fc');
  assert.equal(slugDoNome('Missa de Quinta'), 'missa-de-quinta');
  assert.equal(slugDoNome('Pelada do Zé & Cia.'), 'pelada-do-ze-cia');
  assert.equal(slugDoNome('  São João — Várzea ⚽ '), 'sao-joao-varzea');
  assert.equal(slugDoNome('Racha da Asa Norte (quinta 20h)'), 'racha-da-asa-norte-quinta-20h');
  assert.equal(slugDoNome('Associação Atlética dos Amigos do Bairro da Penha'), 'associacao-atletica-dos-amigos');
  assert.equal(slugDoNome('Pelada dos Veteranos de Guarapuava'), 'pelada-dos-veteranos-de');
  assert.equal(slugDoNome('Supercalifragilisticexpialidocious FC'), 'supercalifragilisticexpialidoc', 'uma palavra só maior que 30: corta seco');
  for (const nome of ['Associação Atlética dos Amigos do Bairro da Penha', 'Pelada dos Veteranos de Guarapuava', 'Supercalifragilisticexpialidocious FC']) {
    const s = slugDoNome(nome);
    assert.ok(s.length <= 30 && !s.endsWith('-') && !s.startsWith('-'), `${nome} → ${s}`);
  }
  for (const vazio of ['⚽⚽', '', '   ', null, undefined, '---']) assert.equal(slugDoNome(vazio), '', String(vazio));
});

test('o link que o app compartilha: futtyapp.com.br/c/<nome-do-time>-<código>; sem nome, /c/<código>; sem código, o longo', () => {
  assert.equal(linkDoConvite({ origem: ORIGEM_DO_SITE, token: 'uuid', codigo: 'epbgx5b3', nomeTime: 'Domingueira FC' }), 'https://futtyapp.com.br/c/domingueira-fc-epbgx5b3');
  assert.equal(linkDoConvite({ origem: ORIGEM_DO_SITE, token: 'uuid', codigo: 'k7m2p9qx', nomeTime: 'Missa de Quinta' }), 'https://futtyapp.com.br/c/missa-de-quinta-k7m2p9qx');
  assert.equal(linkDoConvite({ origem: ORIGEM_DO_SITE, token: 'uuid', codigo: 'k7m2p9qx', nomeTime: '⚽⚽' }), 'https://futtyapp.com.br/c/k7m2p9qx', 'nome que não rende slug');
  assert.equal(linkDoConvite({ origem: ORIGEM_DO_SITE, token: 'uuid', codigo: 'k7m2p9qx' }), 'https://futtyapp.com.br/c/k7m2p9qx', 'sem o nome: como antes');
  assert.equal(linkDoConvite({ origem: ORIGEM_DO_SITE, token: 'uuid-longo', codigo: null, nomeTime: 'Domingueira FC' }), 'https://futtyapp.com.br/convite/uuid-longo');
});

test('a tela e a prévia do WhatsApp tiram o MESMO código do link novo e do antigo; o longo segue como veio', () => {
  const NOMES = ['Domingueira FC', 'Missa de Quinta', 'Pelada do Zé & Cia.', 'Time k7m2p9qx', '⚽', 'Associação Atlética dos Amigos do Bairro da Penha'];
  for (const nomeTime of NOMES) {
    for (const codigo of ['epbgx5b3', 'k7m2p9qx', 'k7m2p9']) {
      const caminho = caminhoCurtoDoConvite({ nomeTime, codigo });
      const pedaco = caminho.slice('/c/'.length);
      assert.equal(codigoDoLinkCurto(pedaco), codigo, `${nomeTime} · tela · ${caminho}`);
      assert.equal(parametroDoConvite(caminho), codigo, `${nomeTime} · prévia · ${caminho}`);
    }
  }
  assert.equal(codigoDoLinkCurto('EPBGX5B3'), 'epbgx5b3', 'o código em maiúsculas (digitado) vale');
  assert.equal(parametroDoConvite('/c/Domingueira-FC-EPBGX5B3'), 'epbgx5b3');
  // O que não tem código no fim segue como veio (o motor responde "não encontrado"), igual nos dois.
  for (const pedaco of ['domingueira-fc', 'abc', 'k7m2p9qx-', '']) {
    assert.equal(codigoDoLinkCurto(pedaco), pedaco, pedaco);
    if (pedaco) assert.equal(parametroDoConvite(`/c/${pedaco}`), pedaco, pedaco);
  }
  // O link longo (uuid, com hífens) não passa pela leitura do código.
  const uuid = '372f8e0d-5618-460d-b0ad-548e84de9581';
  assert.equal(parametroDoConvite(`/convite/${uuid}`), uuid);
  assert.equal(codigoDoLinkCurto(uuid), uuid, 'o último pedaço do uuid tem 12 posições: não é código');
});

test('o link novo abre o app (o parser do app e a lista do iOS/Android cobrem /c/<nome>-<código>)', () => {
  assert.equal(caminhoDoLinkDoSite('https://futtyapp.com.br/c/domingueira-fc-epbgx5b3'), '/c/domingueira-fc-epbgx5b3');
  assert.equal(caminhoDoLinkDoSite('https://futtyapp.com.br/c/domingueira-fc-epbgx5b3?origem=zap'), '/c/domingueira-fc-epbgx5b3?origem=zap');
  assert.ok(PREFIXOS_DE_LINK.includes('/c/'));
  const aasa = JSON.parse(ler('public/.well-known/apple-app-site-association'));
  assert.ok(aasa.applinks.details[0].components.some((c) => c['/'] === '/c/*'), 'o "*" do AASA cobre o nome com hífens');
  assert.match(ler('android/app/src/main/AndroidManifest.xml'), /android:pathPrefix="\/c\/"/);
});

test('as três telas que geram o link do convite mandam o nome do time', () => {
  assert.match(ler('src/pages/Equipa.jsx'), /linkDoConvite\(\{ origem: ORIGEM_DO_SITE, token, codigo, nomeTime: team\?\.nome \}\)/);
  assert.match(ler('src/pages/Equipa.jsx'), /<ElencoDoAdmin slug=\{slug\} nomeTime=\{team\?\.nome\}/);
  assert.match(ler('src/pages/CriarEquipa.jsx'), /linkDoConvite\(\{ origem: ORIGEM_DO_SITE, token, codigo, nomeTime \}\)/);
  const admin = ler('src/pages/AdminPanel.jsx');
  assert.match(admin, /linkDoConvite\(\{ origem: ORIGEM_DO_SITE, token, codigo, nomeTime \}\)/);
  assert.match(admin, /<TabConvites key=\{versaoConvites\} slug=\{slug\} nomeTime=\{nomeTime\}/);
});

test('/download, /baixar e /app ficam FORA dos links que abrem o app (parser, AASA do iOS, manifesto do Android)', () => {
  for (const c of ['/download', '/baixar', '/app']) {
    assert.equal(caminhoDoLinkDoSite(`https://futtyapp.com.br${c}`), null, c);
    assert.ok(!PREFIXOS_DE_LINK.some((p) => c.startsWith(p) || `${c}/`.startsWith(p)), c);
  }
  const caminhosDoIos = JSON.parse(ler('public/.well-known/apple-app-site-association')).applinks.details.flatMap((d) => d.components.map((x) => x['/']));
  // O "*" do AASA casa qualquer sequência; o resto do padrão é literal.
  const casa = (padrao, caminho) => new RegExp(['^', padrao.split('*').map((s) => s.replace(/[.+?^$()|[\]\\{}]/g, '\\$&')).join('.*'), '$'].join('')).test(caminho);
  for (const c of ['/download', '/baixar', '/app']) assert.ok(!caminhosDoIos.some((p) => casa(p, c)), `o AASA abriria ${c} no app`);
  const prefixosDoAndroid = [...ler('android/app/src/main/AndroidManifest.xml').matchAll(/android:pathPrefix="([^"]+)"/g)].map((m) => m[1]);
  for (const c of ['/download', '/baixar', '/app']) assert.ok(!prefixosDoAndroid.some((p) => c.startsWith(p)), `o manifesto abriria ${c} no app`);
});

test('as rotas: /download é pública, /baixar e /app levam a ela, e nenhuma tem a barra de baixo nem o portão do onboarding', () => {
  const app = ler('src/App.jsx');
  assert.match(app, /<Route path="\/download" element=\{<Download \/>\} \/>/);
  assert.match(app, /<Route path="\/baixar" element=\{<Navigate to="\/download" replace \/>\} \/>/);
  assert.match(app, /<Route path="\/app" element=\{<Navigate to="\/download" replace \/>\} \/>/);
  assert.match(app, /<Route path="\/c\/:token" element=\{<ConviteCurtoRoute \/>\} \/>/);
  assert.ok(!/ROTAS_PRIVADAS = \[[\s\S]*?'\/download'/.test(app), '/download não pede login');
  const layout = ler('src/components/Layout.jsx');
  assert.equal(layout.split('/^\\/(download|baixar|app)\\/?$/').length - 1, 2, 'na lista sem barra e na lista sem o portão do onboarding');
});
