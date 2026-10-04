// Futty v2.0 — Rodada 29U (acabamentos depois do publica de 4-out): a linha do lugar no Radar quebra em vez de cortar, o aviso do Ranking
// fala a língua da 29R e o assetlinks.json traz as duas impressões digitais do Play Console. A linha inteira no card, em 360 e 390 px, fica em
// scripts/provas/rodada-29u.prova.mjs (npm run provar:navegador).
//
// Uso: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = fileURLToPath(new URL('../../', import.meta.url));
const ler = (rel) => fs.readFileSync(path.join(RAIZ, rel), 'utf8');
const semComentarios = (texto) => texto.replace(/\/\*[\s\S]*?\*\//g, '').split('\n').filter((l) => !/^\s*\/\//.test(l)).join('\n');

test('29U · o Radar: a linha "Bairro · Cidade" quebra quando não cabe ao lado do botão (nunca "…" nem uma linha cortada); o "Sobre o time" segue em até 2 linhas', () => {
  const explorar = semComentarios(ler('src/pages/Explorar.jsx'));
  const linha = explorar.match(/<span data-local-do-time style=\{\{[^}]*\}\}>/);
  assert.ok(linha, 'a linha do lugar existe');
  assert.doesNotMatch(linha[0], /nowrap/, 'o nowrap cortava o lugar');
  assert.doesNotMatch(linha[0], /textOverflow/, 'o "…" no lugar é o corte que a Freaky não quer');
  assert.match(linha[0], /overflowWrap: 'break-word'/, 'a linha quebra');
  assert.match(explorar, /WebkitLineClamp: 2/, 'o "Sobre o time" continua em até 2 linhas');
});

test('29U · o Ranking: o aviso diz "Nova temporada de notas" e "Dê sua nota aos companheiros." (o ✕ fica; "Atualize suas notas" saiu)', () => {
  const ranking = ler('src/pages/Ranking.jsx');
  assert.match(ranking, />Nova temporada de notas</);
  assert.match(ranking, />Dê sua nota aos companheiros\.</);
  assert.doesNotMatch(ranking, /Atualize suas notas/);
  assert.match(ranking, /className="rank-banner__close" aria-label="Fechar" onClick=\{\(\) => setBannerFechado\(true\)\}>✕<\/button>/);
});

test('29U · o Ranking e o cartão do Início usam o mesmo texto da 29R', () => {
  const inicio = ler('src/pages/Inicio.jsx');
  assert.match(inicio, /`Nova temporada de notas no \$\{votacaoTop\.nome\}`/);
  assert.match(inicio, /'Dê sua nota aos companheiros\.'/);
  assert.match(ler('src/pages/Ranking.jsx'), />Dê sua nota aos companheiros\.</);
});

test('29U · assetlinks.json: JSON válido, sem texto de exemplo, o pacote do app e as duas impressões digitais do Play Console, nesta ordem', () => {
  const bruto = ler('public/.well-known/assetlinks.json');
  assert.doesNotMatch(bruto, /SHA256_DO|exemplo|example|PENDENTE|TODO/i, 'sobrou texto de exemplo');
  const links = JSON.parse(bruto);
  assert.equal(links.length, 1);
  const [alvo] = links;
  assert.deepEqual(alvo.relation, ['delegate_permission/common.handle_all_urls']);
  assert.equal(alvo.target.namespace, 'android_app');
  assert.equal(alvo.target.package_name, 'com.futty.app');
  assert.deepEqual(alvo.target.sha256_cert_fingerprints, [
    '74:10:28:A7:D3:9B:21:A0:07:E3:71:38:DB:97:99:2D:2D:86:96:8E:96:0B:AF:62:3F:5E:A3:F1:85:02:F6:0A',
    '0F:94:DE:93:82:F0:95:4A:F9:01:C3:F1:2D:ED:95:6C:F7:BC:20:C2:B8:14:90:7C:D9:F1:BE:FA:93:5E:62:E4',
  ]);
  for (const impressao of alvo.target.sha256_cert_fingerprints) assert.match(impressao, /^([0-9A-F]{2}:){31}[0-9A-F]{2}$/, 'SHA-256: 32 bytes em hexadecimal');
});

test('29U · o _headers serve o assetlinks.json como application/json: se declara Content-Type, é esse', () => {
  const linhas = ler('public/_headers').split(/\r?\n/);
  const inicio = linhas.indexOf('/.well-known/assetlinks.json');
  assert.ok(inicio >= 0, 'o bloco do assetlinks.json está no _headers');
  const bloco = [];
  for (const l of linhas.slice(inicio + 1)) {
    if (!/^\s/.test(l)) break;
    bloco.push(l);
  }
  for (const l of bloco.filter((x) => /Content-Type:/i.test(x))) assert.match(l, /application\/json/);
});
