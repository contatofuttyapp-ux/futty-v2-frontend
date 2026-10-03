// Futty v2.0 — Rodada 29I (achados 87 e 105): links que a pessoa COPIA e manda para o grupo saem com o endereço do site, nunca com o de
// quem está olhando.
//
// A varredura (3-out): o convite mostrava `http://localhost:517…` na própria tela (achado 105) e seis telas montavam o link com
// `window.location.origin` (achado 87). No app nativo a origem é `capacitor://localhost` (iPhone) ou `https://localhost` (Android): o
// link copiado só funcionava no aparelho de quem mandou. Existe `ORIGEM_DO_SITE` (src/lib/linkDoSite.js, a partir de HOST_DO_SITE).
//
// Este teste FALHA se `window.location.origin` voltar a aparecer num link partilhável — e só deixa passar os de AUTENTICAÇÃO (Login,
// Register, ForgotPassword, LandingPage), onde a origem de quem está olhando é de propósito: o retorno do Google/do e-mail tem de
// voltar para onde a pessoa está.
//
// Uso: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { HOST_DO_SITE, ORIGEM_DO_SITE } from '../../src/lib/linkDoSite.js';
import { linkDoConvite } from '../../src/utils/convite.js';

const RAIZ = fileURLToPath(new URL('../../', import.meta.url));
const ler = (rel) => fs.readFileSync(path.join(RAIZ, rel), 'utf8');

// Onde a origem de quem olha é CERTA, de propósito (autenticação) ou não é link (base de imagens).
const PERMITIDOS = new Set([
  'src/pages/Login.jsx', 'src/pages/Register.jsx', 'src/pages/ForgotPassword.jsx', 'src/pages/LandingPage.jsx', // o retorno do Google/e-mail volta para onde a pessoa está
  'src/utils/avatar.js', // base de URL de IMAGEM (asset), não link que se compartilha
]);

// Os seis lugares do achado 87, com o link que cada um monta.
const SEIS_LUGARES = [
  ['src/pages/SorteioShow.jsx', /ORIGEM_DO_SITE\}\/p\/\$\{slug\}\/\$\{id\}/, 'link do sorteio'],
  ['src/pages/Jogo.jsx', /ORIGEM_DO_SITE\}\/p\/\$\{slug\}\/\$\{id\}/, 'link público do jogo'],
  ['src/pages/AdminPanel.jsx', /linkDoConvite\(\{ origem: ORIGEM_DO_SITE/, 'convite (admin)'],
  ['src/pages/Equipa.jsx', /linkDoConvite\(\{ origem: ORIGEM_DO_SITE/, 'convite'],
  ['src/pages/CriarEquipa.jsx', /linkDoConvite\(\{ origem: ORIGEM_DO_SITE/, 'convite ao criar o time'],
  ['src/components/CampeonatoVistas.jsx', /ORIGEM_DO_SITE\}\/p\/campeonato\//, 'link do campeonato'],
];

test('a origem dos links é o site de verdade: https + futtyapp.com.br', () => {
  assert.equal(HOST_DO_SITE, 'futtyapp.com.br');
  assert.equal(ORIGEM_DO_SITE, 'https://futtyapp.com.br');
  assert.equal(linkDoConvite({ origem: ORIGEM_DO_SITE, token: 'abc', codigo: 'k7m2p9qx' }), 'https://futtyapp.com.br/c/k7m2p9qx');
  assert.equal(linkDoConvite({ origem: ORIGEM_DO_SITE, token: 'abc', codigo: null }), 'https://futtyapp.com.br/convite/abc');
});

for (const [arquivo, padrao, nome] of SEIS_LUGARES) {
  test(`${nome} (${arquivo}) usa ORIGEM_DO_SITE e importa de lib/linkDoSite`, () => {
    const texto = ler(arquivo);
    assert.match(texto, padrao, `${arquivo}: o link não usa ORIGEM_DO_SITE`);
    assert.match(texto, /import \{ ORIGEM_DO_SITE \} from '\.\.\/lib\/linkDoSite'/, `${arquivo}: falta o import`);
  });
}

function arquivosDe(dir) {
  const saida = [];
  for (const nome of fs.readdirSync(dir)) {
    const caminho = path.join(dir, nome);
    if (fs.statSync(caminho).isDirectory()) saida.push(...arquivosDe(caminho));
    else if (/\.jsx?$/.test(nome)) saida.push(caminho);
  }
  return saida;
}

test('window.location.origin não aparece em lugar nenhum além da autenticação (e da base de imagens)', () => {
  const achados = [];
  for (const arquivo of arquivosDe(path.join(RAIZ, 'src'))) {
    const rel = path.relative(RAIZ, arquivo).replaceAll('\\', '/');
    if (PERMITIDOS.has(rel)) continue;
    ler(rel).split('\n').forEach((linha, i) => {
      // comentário não conta; só o uso
      if (/location\.origin/.test(linha) && !/^\s*(\/\/|\*|\/\*)/.test(linha)) achados.push(`${rel}:${i + 1}`);
    });
  }
  assert.deepEqual(achados, [], `link partilhável com a origem de quem olha (volta o achado 87): ${achados.join(', ')}`);
});

test('os de autenticação continuam com a origem de quem está olhando — o retorno do Google tem de voltar para onde a pessoa está', () => {
  for (const arquivo of ['src/pages/Login.jsx', 'src/pages/Register.jsx', 'src/pages/ForgotPassword.jsx', 'src/pages/LandingPage.jsx']) {
    assert.match(ler(arquivo), /window\.location\.origin/, `${arquivo} deixou de usar a origem de quem olha (não pode: quebra o retorno do login)`);
  }
});
