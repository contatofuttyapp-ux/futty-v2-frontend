// Futty v2.0 — Rodada 29W (5-out): um ícone só, o "ouro vivo" que o dono escolheu em 23-set, sem anel em lugar nenhum. A 29V tirou o anel do site e do
// Android antigo, mas pôs a arte antiga das lojas (F amarelo chapado sobre #050810); e o fundo do ícone ADAPTATIVO (o de quase todo Android) ainda
// trazia o aro desenhado. Aqui trava o RESULTADO — o desenho dos arquivos —, não a receita:
//   · o fundo do adaptativo é a vinheta (#1a1826 no centro → #0b0a12 nos cantos), sem aro, nas seis densidades;
//   · o site (icon-192/512) e o Android antigo (ic_launcher, ic_launcher_round) são a composição do adaptativo: o mesmo fundo com o mesmo F por cima;
//   · o que a rodada manda NÃO mexer (frente e monocromo do adaptativo, o ícone do iPhone, o badge, o favicon) continua byte a byte.
//
// Uso: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const RAIZ = fileURLToPath(new URL('../../', import.meta.url));
const ler = (rel) => fs.readFileSync(path.join(RAIZ, rel), 'utf8');
const semComentarios = (texto) => texto.replace(/\/\*[\s\S]*?\*\//g, '').split('\n').filter((l) => !/^\s*\/\//.test(l)).join('\n');
const sha256 = (rel) => crypto.createHash('sha256').update(fs.readFileSync(path.join(RAIZ, rel))).digest('hex');
const RES = 'android/app/src/main/res';
const ADAPTATIVO = { ldpi: 81, mdpi: 108, hdpi: 162, xhdpi: 216, xxhdpi: 324, xxxhdpi: 432 }; // 108 dp × a densidade
const LEGADO = { ldpi: 36, mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 }; // 48 dp × a densidade

// Os pixels do arquivo em RGBA (sem alfa vira opaco).
async function pixels(origem) {
  const { data, info } = await sharp(origem).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const px = (x, y) => { const i = (Math.min(info.height - 1, Math.max(0, y)) * info.width + Math.min(info.width - 1, Math.max(0, x))) * 4; return [data[i], data[i + 1], data[i + 2], data[i + 3]]; };
  return { lado: info.width, px, data };
}
const luz = ([r, g, b]) => r * 0.299 + g * 0.587 + b * 0.114;
const perto = (a, b, folga) => a.every((v, i) => Math.abs(v - b[i]) <= folga);

// A composição do adaptativo (o fundo com o F por cima, 108 dp inteiros) no tamanho de um ícone, em RGB.
async function composicaoEm(lado) {
  const base = path.join(RAIZ, RES, 'mipmap-xxxhdpi');
  const composto = await sharp(path.join(base, 'ic_launcher_background.png')).composite([{ input: path.join(base, 'ic_launcher_foreground.png') }]).png().toBuffer();
  return sharp(composto).removeAlpha().resize(lado, lado, { kernel: 'lanczos3' }).raw().toBuffer();
}
// Diferença média por canal (0–255) entre o arquivo e a composição, só nos pixels que passam no filtro.
async function diferencaParaAComposicao(arquivo, lado, dentro = () => true) {
  const esperado = await composicaoEm(lado);
  const { data } = await sharp(path.join(RAIZ, arquivo)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let soma = 0;
  let n = 0;
  for (let y = 0; y < lado; y += 1) {
    for (let x = 0; x < lado; x += 1) {
      if (!dentro(x, y)) continue;
      for (let c = 0; c < 3; c += 1) { soma += Math.abs(data[(y * lado + x) * 4 + c] - esperado[(y * lado + x) * 3 + c]); n += 1; }
    }
  }
  return soma / n;
}

test('29W · o fundo do ícone adaptativo é a vinheta SEM aro, nas seis densidades (e não o azul chapado antigo)', async () => {
  for (const [densidade, lado] of Object.entries(ADAPTATIVO)) {
    const arquivo = `${RES}/mipmap-${densidade}/ic_launcher_background.png`;
    const { lado: l, px, data } = await pixels(path.join(RAIZ, arquivo));
    assert.equal(l, lado, `${arquivo} mede ${lado}×${lado} (108 dp × a densidade)`);
    // a vinheta: #1a1826 no centro → #0b0a12 nos cantos (a mesma de 23-set; o antigo #050810 chapado e o branco do ldpi velho não passam)
    assert.ok(perto(px(Math.floor(lado / 2), Math.floor(lado / 2)).slice(0, 3), [26, 24, 38], 3), `${densidade}: o centro é #1a1826`);
    assert.ok(perto(px(0, 0).slice(0, 3), [11, 10, 18], 3), `${densidade}: o canto é #0b0a12`);
    assert.ok(luz(px(Math.floor(lado / 2), Math.floor(lado / 2))) > luz(px(0, 0)), `${densidade}: o centro é mais claro que o canto (é vinheta, não cor chapada)`);
    let maisClaro = 0;
    for (let i = 0; i < data.length; i += 4) maisClaro = Math.max(maisClaro, luz([data[i], data[i + 1], data[i + 2]]));
    assert.ok(maisClaro < 40, `${densidade}: o pixel mais claro do fundo tem luz ${maisClaro.toFixed(0)} — o aro dourado (luz > 150) voltou`);
    assert.ok(Array.from({ length: Math.floor(data.length / 4) }, (_, i) => data[i * 4 + 3]).every((a) => a === 255), `${densidade}: o fundo não tem transparência`);
    // o aro antigo: círculo a 29,9% do lado do centro (o diâmetro de fora era a zona segura, 66/108); 360 passos nesse raio
    let dourados = 0;
    for (let k = 0; k < 360; k += 1) {
      const p = px(Math.round(lado / 2 + lado * 0.299 * Math.cos((k * Math.PI) / 180)), Math.round(lado / 2 + lado * 0.299 * Math.sin((k * Math.PI) / 180)));
      if (luz(p) > 80) dourados += 1;
    }
    assert.equal(dourados, 0, `${densidade}: ${dourados} de 360 pontos do raio do aro estão dourados`);
  }
});

test('29W · a frente e o monocromo do adaptativo (o F ouro vivo na zona segura) não mudaram', () => {
  const FRENTE = {
    mdpi: 'd0e03a5bb619e1cb3f7a04cc3217e5b23c55a6d20c4fad2d51a942c78b62e9c8',
    hdpi: 'd7784a0689933dc3578a356bf6a4c81a3490e0180b015d80344cbc335c860cd4',
    xhdpi: '68f2431ad430c1abc5224ae6d19787b4b9240997e6adbb287227dec49bcf26c9',
    xxhdpi: '2df7f44c5944007c6f7bdd8fe1eac1db3b273fa1750a4f6311406d13e08bbacc',
    xxxhdpi: 'a89d2f236eb44087d339fedb75f1896aadb0313099c8733d00514793a3f3592a',
  };
  const MONOCROMO = {
    mdpi: '5499ba85baffd260d038741f5c65e0c03ac9f9a66f0c369c43bdc5062b524a1c',
    hdpi: '949b53ac1f01ca72feee622753712a52a5308efaaeb2a73633095b821fdefb13',
    xhdpi: 'eda585f986f745381ddd9f05d27147031fb7800840a41c519a1130f7eb72d21b',
    xxhdpi: '8ce3333f6c9f4f5e834c752f3c912ecd5336e87fe8d33ba39a66e3457da8c363',
    xxxhdpi: 'd83552f4533bbbb8adc5280d4f853b7591b5183be904d5a12a835778d1edbc2f',
  };
  for (const [densidade, hash] of Object.entries(FRENTE)) assert.equal(sha256(`${RES}/mipmap-${densidade}/ic_launcher_foreground.png`), hash, `a frente do ${densidade} mudou`);
  for (const [densidade, hash] of Object.entries(MONOCROMO)) assert.equal(sha256(`${RES}/mipmap-${densidade}/ic_launcher_monochrome.png`), hash, `o monocromo do ${densidade} mudou`);
});

test('29W · o ldpi deixou de ser arte antiga: a frente é o F ouro vivo transparente (a do xxxhdpi reduzida), não o amarelo com o escuro embutido', async () => {
  const frente = await pixels(path.join(RAIZ, RES, 'mipmap-ldpi', 'ic_launcher_foreground.png'));
  assert.equal(frente.lado, 81);
  assert.equal(frente.px(0, 0)[3], 0, 'o canto da frente é transparente (o escuro não vem mais embutido)');
  const reduzida = await sharp(path.join(RAIZ, RES, 'mipmap-xxxhdpi', 'ic_launcher_foreground.png')).resize(81, 81, { kernel: 'lanczos3' }).ensureAlpha().raw().toBuffer();
  let soma = 0;
  for (let i = 0; i < reduzida.length; i += 1) soma += Math.abs(reduzida[i] - frente.data[i]);
  assert.ok(soma / reduzida.length < 1, `a frente do ldpi é a do xxxhdpi reduzida (diferença média ${(soma / reduzida.length).toFixed(2)})`);
});

test('29W · o que a rodada manda NÃO mexer continua byte a byte: ícone do iPhone (ouro vivo + moldura fina), badge e favicon', () => {
  assert.equal(sha256('ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png'), '0ded1967404be7a9a3116f38d99768fdecbaf001e4e4917ee3a5748d064eb7b9', 'o ícone do iPhone mudou');
  assert.equal(sha256('public/icons/badge-96.png'), 'caeab345cd1ba50f505f70acf07fbbd7aac8012b3ce18a3d1abce6dba4b41e88', 'o badge mudou');
  assert.equal(sha256('public/favicon.svg'), '6d17c631068791579c02278fc52abefb591721125d84905180c93d20fc315581', 'o favicon mudou');
});

test('29W · o site (icon-192 e icon-512) e o Android antigo (quadrado e redondo, 6 densidades) são a composição do adaptativo novo', async () => {
  for (const lado of [192, 512]) {
    const arquivo = `public/icons/icon-${lado}.png`;
    const dif = await diferencaParaAComposicao(arquivo, lado);
    assert.ok(dif < 1, `${arquivo}: diferença média ${dif.toFixed(2)} para a composição (o fundo sem aro com o F por cima)`);
  }
  for (const [densidade, lado] of Object.entries(LEGADO)) {
    const quadrado = `${RES}/mipmap-${densidade}/ic_launcher.png`;
    const difQuadrado = await diferencaParaAComposicao(quadrado, lado);
    assert.ok(difQuadrado < 1, `${quadrado}: diferença média ${difQuadrado.toFixed(2)} para a composição`);
    const redondo = `${RES}/mipmap-${densidade}/ic_launcher_round.png`;
    const difRedondo = await diferencaParaAComposicao(redondo, lado, (x, y) => Math.hypot(x + 0.5 - lado / 2, y + 0.5 - lado / 2) < lado * 0.45);
    assert.ok(difRedondo < 1, `${redondo}: dentro do círculo, diferença média ${difRedondo.toFixed(2)} — o redondo é só o recorte da composição`);
  }
});

test('29W · o F do site é o "ouro vivo" (degradê com brilho sobre a vinheta), não o amarelo chapado sobre #050810', async () => {
  for (const lado of [192, 512]) {
    const { px, data } = await pixels(path.join(RAIZ, `public/icons/icon-${lado}.png`));
    assert.ok(perto(px(0, 0).slice(0, 3), [11, 10, 18], 3), `icon-${lado}: o canto é a vinheta #0b0a12, não o #050810 antigo`);
    assert.ok(luz(px(Math.floor(lado / 2), Math.floor(lado * 0.9))) > luz(px(0, 0)), `icon-${lado}: o fundo é vinheta (o centro é mais claro que o canto)`);
    const claros = [];
    for (let i = 0; i < data.length; i += 4) { const l = luz([data[i], data[i + 1], data[i + 2]]); if (l > 100) claros.push(l); }
    claros.sort((a, b) => a - b);
    const faixa = claros[Math.floor(claros.length * 0.95)] - claros[Math.floor(claros.length * 0.05)];
    // o ouro vivo vai de #f5e070 a #b8860b (≈ 90 de luz entre o 5º e o 95º percentil); o amarelo chapado ficava em ≈ 20
    assert.ok(faixa > 50, `icon-${lado}: o F tem degradê (faixa de luz ${faixa.toFixed(0)}); chapado ficaria perto de 20`);
  }
});

test('29W · o ícone troca de chave no cache: ?v=29w no sw.js, no manifest e no apple-touch-icon, e o service worker em futty-v6', () => {
  const sw = ler('public/sw.js');
  assert.match(sw, /icon: '\/icons\/icon-192\.png\?v=29w'/);
  assert.match(sw, /const CACHE_NAME = 'futty-v6';/, 'o cache subiu de nome para jogar fora o ícone da 29V');
  const manifesto = JSON.parse(ler('public/manifest.json'));
  assert.deepEqual(manifesto.icons.map((i) => i.src), ['/icons/icon-192.png?v=29w', '/icons/icon-512.png?v=29w']);
  assert.match(ler('index.html'), /<link rel="apple-touch-icon" href="\/icons\/icon-192\.png\?v=29w" \/>/);
  for (const arquivo of ['public/sw.js', 'public/manifest.json', 'index.html']) assert.doesNotMatch(ler(arquivo), /\?v=29v/, `${arquivo} ainda aponta para o ícone da 29V`);
});

test('29W · o gerador compõe as duas camadas do adaptativo (fundo sem aro + frente); a arte antiga das lojas não é mais a fonte', () => {
  const gerador = semComentarios(ler('scripts/gerar-icones.mjs'));
  assert.match(gerador, /ic_launcher_background\.png/);
  assert.match(gerador, /ic_launcher_foreground\.png/);
  assert.match(gerador, /\.composite\(/, 'compõe as camadas');
  assert.doesNotMatch(gerador, /LOJA|icone-512/, 'a fonte não é mais o ícone das lojas (F amarelo chapado, anterior a 23-set)');
  assert.doesNotMatch(gerador, /fal\.run|openai|createCanvas|<path /, 'nada de gerar nem desenhar');
});
