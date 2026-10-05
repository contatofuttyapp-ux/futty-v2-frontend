// Futty v2.0 — Rodada 29V (5-out): o F sem o círculo em todo lugar e a faixa de cookies só no site. O dono viu o ícone do app com o F dentro de um anel
// dourado; a 29V pôs o das lojas (FUT\LOJA\icone-512.png, F amarelo chapado — arte antiga; a 29W trocou pelo "ouro vivo", ver rodada-29w.test.mjs). Aqui trava o RESULTADO — o desenho dos arquivos, não a
// receita —, e a faixa que não aparece no app nativo roda de verdade num Chromium em scripts/provas/rodada-29v.prova.mjs (npm run provar:navegador).
//
// Uso: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const RAIZ = fileURLToPath(new URL('../../', import.meta.url));
const ler = (rel) => fs.readFileSync(path.join(RAIZ, rel), 'utf8');
const semComentarios = (texto) => texto.replace(/\/\*[\s\S]*?\*\//g, '').split('\n').filter((l) => !/^\s*\/\//.test(l)).join('\n');
const DENSIDADES = { ldpi: 36, mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 };

// Os pixels do arquivo, em RGBA, achatados sobre preto quando não há alfa.
async function pixels(rel) {
  const { data, info } = await sharp(path.join(RAIZ, rel)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const px = (x, y) => { const i = (Math.min(info.height - 1, Math.max(0, y)) * info.width + Math.min(info.width - 1, Math.max(0, x))) * 4; return { r: data[i], g: data[i + 1], b: data[i + 2], a: data[i + 3] }; };
  return { lado: info.width, altura: info.height, px, data };
}
const luz = ({ r, g, b }) => r * 0.299 + g * 0.587 + b * 0.114;

// O anel antigo era um círculo dourado a 30,5% do lado, em volta do F. Dá 360 passos nesse raio: no anel, quase todos são dourados; só com o F (que
// atravessa o círculo em poucos pontos), uma fração pequena.
async function fracaoDouradaNoRaioDoAnel(rel) {
  const { lado, px } = await pixels(rel);
  const cx = lado / 2;
  const raio = lado * 0.305;
  let dourados = 0;
  for (let k = 0; k < 360; k += 1) {
    const p = px(Math.round(cx + raio * Math.cos((k * Math.PI) / 180)), Math.round(cx + raio * Math.sin((k * Math.PI) / 180)));
    if (p.a > 128 && luz(p) > 80) dourados += 1;
  }
  return dourados / 360;
}

test('29V · o ícone do site (192 e 512): o tamanho certo e NENHUM anel em volta do F', async () => {
  for (const lado of [192, 512]) {
    const arquivo = `public/icons/icon-${lado}.png`;
    const meta = await sharp(path.join(RAIZ, arquivo)).metadata();
    assert.equal(`${meta.width}x${meta.height}`, `${lado}x${lado}`, `${arquivo} tem o tamanho que o manifest promete`);
    const fracao = await fracaoDouradaNoRaioDoAnel(arquivo);
    assert.ok(fracao < 0.25, `${arquivo}: ${(fracao * 100).toFixed(0)}% do raio do anel antigo está dourado — o círculo voltou`);
  }
});

test('29V · o ícone do site é "any maskable": o F inteiro cabe no círculo central de 80%', async () => {
  for (const lado of [192, 512]) {
    const { lado: l, px } = await pixels(`public/icons/icon-${lado}.png`);
    let maisLonge = 0;
    for (let y = 0; y < l; y += 1) {
      for (let x = 0; x < l; x += 1) if (luz(px(x, y)) > 60) maisLonge = Math.max(maisLonge, Math.hypot(x + 0.5 - l / 2, y + 0.5 - l / 2) / l);
    }
    assert.ok(maisLonge <= 0.4, `icon-${lado}: o F chega a ${(maisLonge * 100).toFixed(1)}% do lado a partir do centro (limite 40%)`);
    assert.ok(maisLonge >= 0.3, `icon-${lado}: o F aparece (chega a ${(maisLonge * 100).toFixed(1)}%)`);
  }
});

test('29V · os ícones antigos do Android: quadrado e redondo em cada densidade, sem anel, e o redondo é só o recorte', async () => {
  for (const [densidade, lado] of Object.entries(DENSIDADES)) {
    for (const nome of ['ic_launcher', 'ic_launcher_round']) {
      const arquivo = `android/app/src/main/res/mipmap-${densidade}/${nome}.png`;
      const meta = await sharp(path.join(RAIZ, arquivo)).metadata();
      assert.equal(`${meta.width}x${meta.height}`, `${lado}x${lado}`, `${arquivo} mede ${lado}×${lado}`);
      const fracao = await fracaoDouradaNoRaioDoAnel(arquivo);
      assert.ok(fracao < 0.25, `${arquivo}: ${(fracao * 100).toFixed(0)}% do raio do anel antigo está dourado — o círculo voltou`);
    }
    const quadrado = await pixels(`android/app/src/main/res/mipmap-${densidade}/ic_launcher.png`);
    assert.equal(quadrado.px(0, 0).a, 255, `${densidade}: o quadrado vai até o canto`);
    const redondo = await pixels(`android/app/src/main/res/mipmap-${densidade}/ic_launcher_round.png`);
    assert.equal(redondo.px(0, 0).a, 0, `${densidade}: o canto do redondo é transparente`);
    assert.equal(redondo.px(lado - 1, lado - 1).a, 0, `${densidade}: o outro canto também`);
    assert.equal(redondo.px(Math.floor(lado / 2), 1).a >= 200, true, `${densidade}: o redondo chega até a borda do círculo (sem anel, sem folga)`);
    assert.ok(luz(redondo.px(Math.floor(lado / 2), Math.floor(lado * 0.1))) < 40, `${densidade}: entre a borda e o F é só o fundo escuro`);
  }
});

test('29V · o badge das notificações é só a silhueta do F: branca, com o fundo transparente', async () => {
  const { lado, altura, px, data } = await pixels('public/icons/badge-96.png');
  assert.equal(`${lado}x${altura}`, '96x96');
  assert.equal(px(0, 0).a, 0, 'o canto é transparente');
  let opacos = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] === 0) continue;
    assert.deepEqual([data[i], data[i + 1], data[i + 2]], [255, 255, 255], 'todo pixel que aparece é branco');
    if (data[i + 3] > 128) opacos += 1;
  }
  const parte = opacos / (lado * altura);
  assert.ok(parte > 0.2 && parte < 0.6, `o F ocupa uma boa parte do quadrado (${(parte * 100).toFixed(0)}%), sem sobrar nem faltar`);
});

// A versão exata (?v=, nome do cache) muda a cada troca de ícone e mora no teste da rodada que trocou (hoje, rodada-29w.test.mjs).
test('29V · as notificações e o site apontam para o ícone, com ?v= (saem do cache de 1 ano) e o badge é a silhueta', () => {
  const sw = ler('public/sw.js');
  assert.match(sw, /icon: '\/icons\/icon-192\.png\?v=\w+'/);
  assert.match(sw, /badge: '\/icons\/badge-96\.png'/, 'o badge é a silhueta, não o ícone colorido');
  assert.match(sw, /const CACHE_NAME = 'futty-v\d+';/);
  assert.ok(fs.existsSync(path.join(RAIZ, 'public/icons/badge-96.png')));
  const manifesto = JSON.parse(ler('public/manifest.json'));
  assert.match(manifesto.icons[0].src, /^\/icons\/icon-192\.png\?v=\w+$/);
  assert.match(manifesto.icons[1].src, /^\/icons\/icon-512\.png\?v=\w+$/);
  assert.ok(manifesto.icons.every((i) => i.purpose === 'any maskable'), 'continua "any maskable"');
  assert.match(ler('index.html'), /<link rel="apple-touch-icon" href="\/icons\/icon-192\.png\?v=\w+" \/>/);
});

test('29V · o gerador de ícones só redimensiona o asset real — o script que desenhava um F à mão saiu', () => {
  assert.equal(fs.existsSync(path.join(RAIZ, 'scripts/gen-icons.mjs')), false, 'o gen-icons.mjs desenhava um F e sobrescreveria os ícones');
  const gerador = ler('scripts/gerar-icones.mjs');
  assert.doesNotMatch(semComentarios(gerador), /fal\.run|openai|createCanvas|<path /, 'nada de gerar nem desenhar');
});

test('29V · a faixa de cookies não existe no app nativo: o estado já nasce fechado, antes de ler o localStorage', () => {
  const faixa = semComentarios(ler('src/components/CookieBanner.jsx'));
  assert.match(faixa, /import \{ ehNativo \} from '\.\.\/lib\/plataforma';/);
  const inicial = faixa.match(/useState\(\(\) => \{([\s\S]*?)\n  \}\);/);
  assert.ok(inicial, 'o estado inicial existe');
  assert.ok(inicial[1].indexOf('ehNativo()') !== -1, 'o estado inicial pergunta se é o app da loja');
  assert.ok(inicial[1].indexOf('ehNativo()') < inicial[1].indexOf('localStorage'), 'e pergunta ANTES de olhar o localStorage');
  assert.match(inicial[1], /if \(ehNativo\(\)\) return false;/);
  assert.match(ler('src/App.jsx'), /<CookieBanner \/>/, 'no site a faixa continua montada no App, como sempre');
});
