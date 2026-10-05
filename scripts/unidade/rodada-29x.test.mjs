// Futty v2.0 — Rodada 29X (5-out): o splash e as fontes de reserva com o "ouro vivo", o icon-512 nítido e as pontas soltas da 29W. Trava o RESULTADO:
//   · o splash do iPhone (6 imagens) e o do Android abaixo do 12 (6 arquivos): o F ouro vivo, com degradê, no mesmo tamanho de antes, sobre o #080808 SÓLIDO
//     (a borda da imagem é #080808 inteira: sem vinheta, sem degrau para o app) — e não o F amarelo chapado de antes;
//   · as fontes de reserva do @capacitor/assets (assets/): o ícone atual do iPhone e o splash novo;
//   · o icon-512 vem do tamanho cheio (mais nítido que a ampliação das camadas de 432 px) e continua a mesma composição da 29W;
//   · o manifest pinta o app instalado com o fundo da casa (#080808); os dois XML do modelo do Capacitor saíram e nada os referenciava;
//   · o ?v=29x e o cache futty-v7 (o icon-512/192 mudaram sob o cache de 1 ano).
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
const sha256 = (rel) => crypto.createHash('sha256').update(fs.readFileSync(path.join(RAIZ, rel))).digest('hex');
const semComentarios = (texto) => texto.replace(/\/\*[\s\S]*?\*\//g, '').split('\n').filter((l) => !/^\s*\/\//.test(l)).join('\n');
const RES = 'android/app/src/main/res';
const IOS_SPLASH = 'ios/App/App/Assets.xcassets/Splash.imageset';
const luz = (r, g, b) => r * 0.299 + g * 0.587 + b * 0.114;

// Os pixels em RGBA de um arquivo (ou buffer).
async function rgba(origem) {
  const { data, info } = await sharp(origem).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data, w: info.width, h: info.height, px: (x, y) => Array.from(data.slice((y * info.width + x) * 4, (y * info.width + x) * 4 + 4)) };
}
// O F: os pixels de ouro (luz > 120 sobre #080808, ou opacos no logo transparente); devolve a caixa, a faixa de luz e o centro.
function medirOF({ data, w, h }, { opaco = false } = {}) {
  let [x0, y0, x1, y1] = [w, h, -1, -1];
  const luzes = [];
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const i = (y * w + x) * 4;
      if (opaco ? data[i + 3] < 250 : luz(data[i], data[i + 1], data[i + 2]) <= 120) continue;
      x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
      luzes.push(luz(data[i], data[i + 1], data[i + 2]));
    }
  }
  luzes.sort((a, b) => a - b);
  return {
    altura: y1 - y0 + 1, largura: x1 - x0 + 1, cx: (x0 + x1 + 1) / 2, cy: (y0 + y1 + 1) / 2,
    faixa: luzes[Math.floor(luzes.length * 0.95)] - luzes[Math.floor(luzes.length * 0.05)],
  };
}
// Toda a borda da imagem tem exatamente esta cor?
function bordaTodaIgual({ data, w, h }, [r, g, b]) {
  let fora = 0;
  for (let k = 0; k < Math.max(w, h); k += 1) {
    for (const [x, y] of [[Math.min(k, w - 1), 0], [Math.min(k, w - 1), h - 1], [0, Math.min(k, h - 1)], [w - 1, Math.min(k, h - 1)]]) {
      const i = (y * w + x) * 4;
      if (data[i] !== r || data[i + 1] !== g || data[i + 2] !== b) fora += 1;
    }
  }
  return fora;
}

test('29X · splash do iPhone: as 6 imagens do Splash.imageset são o F ouro vivo sobre #080808 sólido, 2732 px, em paleta e sem alfa', async () => {
  const contents = JSON.parse(ler(`${IOS_SPLASH}/Contents.json`));
  const nomes = [...new Set(contents.images.map((i) => i.filename))];
  assert.equal(nomes.length, 6, '1x/2x/3x, claro e escuro');
  assert.equal(contents.images.filter((i) => i.appearances).length, 3, 'três escuros');
  assert.equal(new Set(nomes.map((n) => sha256(`${IOS_SPLASH}/${n}`))).size, 1, 'claro e escuro são a mesma imagem (o app é sempre escuro)');
  for (const nome of nomes) {
    const arquivo = `${IOS_SPLASH}/${nome}`;
    const meta = await sharp(path.join(RAIZ, arquivo)).metadata();
    assert.equal(`${meta.width}x${meta.height}`, '2732x2732', `${nome} mede 2732×2732 (1366 pt @2x, como o storyboard)`);
    assert.ok(meta.paletteBitDepth, `${nome} está em paleta, como antes`);
    assert.equal(meta.hasAlpha, false, `${nome} não tem canal alfa`);
  }
  const img = await rgba(path.join(RAIZ, `${IOS_SPLASH}/${nomes[0]}`));
  assert.equal(bordaTodaIgual(img, [8, 8, 8, 255]), 0, 'a borda inteira é #080808 (sem vinheta: é a cor do app, sem degrau)');
  const f = medirOF(img);
  assert.ok(Math.abs(f.altura - 928) <= 2, `o F mede ${f.altura} px de altura: o mesmo tamanho de antes (928 px de 2732)`);
  assert.ok(Math.abs(f.cx - 1366) <= 1.5 && Math.abs(f.cy - 1366) <= 1.5, `o F está no centro (${f.cx}, ${f.cy})`);
  assert.ok(f.faixa > 50, `o F é o ouro vivo, com degradê (faixa de luz ${f.faixa.toFixed(0)}); o amarelo chapado de antes ficava em ≈ 20`);
  assert.match(ler('ios/App/App/Base.lproj/LaunchScreen.storyboard'), /<image name="Splash" width="1366" height="1366"\/>/, 'o storyboard continua esperando 1366 pt (2732 @2x)');
});

test('29X · splash do Android abaixo do 12: o splash_logo.png de cada densidade é o F ouro vivo transparente, com os mesmos 117 dp de altura de antes', async () => {
  const densidades = { 'drawable-mdpi': 1, 'drawable-hdpi': 1.5, 'drawable-xhdpi': 2, 'drawable-xxhdpi': 3, 'drawable-xxxhdpi': 4 };
  for (const [pasta, escala] of Object.entries(densidades)) {
    const arquivo = `${RES}/${pasta}/splash_logo.png`;
    const img = await rgba(path.join(RAIZ, arquivo));
    assert.equal(img.w, img.h, `${arquivo} é quadrado (o F com a margem do brilho)`);
    assert.ok(Math.abs(img.w - 158.1 * escala) <= 2, `${arquivo} mede ${img.w} px (158 dp × ${escala})`);
    assert.equal(img.px(0, 0)[3], 0, `${arquivo}: o canto é transparente (o fundo é o @color/futtyFundo do splash.xml)`);
    let bordaVisivel = 0;
    for (let k = 0; k < img.w; k += 1) for (const [x, y] of [[k, 0], [k, img.h - 1], [0, k], [img.w - 1, k]]) if (img.px(x, y)[3] > 2) bordaVisivel += 1;
    assert.equal(bordaVisivel, 0, `${arquivo}: o brilho morre antes da borda (sem retângulo à vista sobre o #080808)`);
    const f = medirOF(img, { opaco: true });
    assert.ok(Math.abs(f.altura - 117 * escala) <= 2, `${arquivo}: o F mede ${f.altura} px de altura (117 dp × ${escala}: o mesmo tamanho físico de antes)`);
    assert.ok(Math.abs(f.cx - img.w / 2) <= 1.5 && Math.abs(f.cy - img.h / 2) <= 1.5, `${arquivo}: o F está no centro (gravity="center" do splash.xml)`);
    assert.ok(f.faixa > 50, `${arquivo}: o F é o ouro vivo, com degradê (faixa de luz ${f.faixa.toFixed(0)})`);
    assert.ok((await sharp(path.join(RAIZ, arquivo)).metadata()).paletteBitDepth, `${arquivo} está em paleta (app leve)`);
  }
  assert.equal(sha256(`${RES}/drawable/splash_logo.png`), sha256(`${RES}/drawable-xhdpi/splash_logo.png`), 'o drawable/ sem sufixo é o xhdpi, como era');
  // o desenho do splash não mudou: a cor sólida da casa e o logo centrado sem escalar
  const splashXml = ler(`${RES}/drawable/splash.xml`);
  assert.match(splashXml, /@color\/futtyFundo/);
  assert.match(splashXml, /android:gravity="center"/);
});

test('29X · fontes de reserva do @capacitor/assets: assets/icon.png é o ícone atual do iPhone e assets/splash*.png o splash novo — nada volta para a arte antiga', async () => {
  assert.equal(sha256('assets/icon.png'), sha256('ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png'), 'assets/icon.png é a cópia do AppIcon-512@2x.png (ouro vivo + moldura)');
  const icone = await sharp(path.join(RAIZ, 'assets/icon.png')).metadata();
  assert.equal(`${icone.width}x${icone.height}`, '1024x1024');
  assert.equal(icone.hasAlpha, false, 'a App Store recusa ícone com canal alfa');
  assert.equal(sha256('assets/splash.png'), sha256('assets/splash-dark.png'), 'claro e escuro são o mesmo splash');
  const meta = await sharp(path.join(RAIZ, 'assets/splash.png')).metadata();
  assert.equal(`${meta.width}x${meta.height}`, '2732x2732');
  assert.equal(meta.hasAlpha, false);
  const img = await rgba(path.join(RAIZ, 'assets/splash.png'));
  assert.equal(bordaTodaIgual(img, [8, 8, 8, 255]), 0, 'a borda é o #080808 sólido');
  const f = medirOF(img);
  assert.ok(Math.abs(f.altura - 928) <= 2, `o F mede ${f.altura} px de altura`);
  assert.ok(f.faixa > 50, `o F é o ouro vivo, com degradê (faixa de luz ${f.faixa.toFixed(0)}), não o amarelo chapado de antes`);
  // a fonte de reserva e o splash do iPhone são a mesma imagem (o do iPhone só passou pela paleta)
  const ios = await rgba(path.join(RAIZ, `${IOS_SPLASH}/Default@2x~universal~anyany.png`));
  let soma = 0;
  for (let i = 0; i < img.data.length; i += 4) for (let c = 0; c < 3; c += 1) soma += Math.abs(img.data[i + c] - ios.data[i + c]);
  assert.ok(soma / (img.w * img.h * 3) < 0.1, `assets/splash.png e o do iPhone são a mesma imagem (diferença média ${(soma / (img.w * img.h * 3)).toFixed(4)} nível)`);
});

test('29X · o icon-512 sai do tamanho cheio: mais nítido que a ampliação das camadas de 432 px, e ainda a composição da 29W', async () => {
  const base = path.join(RAIZ, RES, 'mipmap-xxxhdpi');
  const composto = await sharp(path.join(base, 'ic_launcher_background.png')).ensureAlpha().composite([{ input: path.join(base, 'ic_launcher_foreground.png') }]).png().toBuffer();
  const composicao432 = await sharp(composto).removeAlpha().png().toBuffer();
  // a energia de borda: o quadrado dos gradientes do canal verde (o ouro tem contraste forte aí) — a borda mole de uma ampliação tem menos
  const energia = ({ data, info }) => {
    let e = 0;
    const { width: w, height: h, channels: c } = info;
    for (let y = 1; y < h - 1; y += 1) {
      for (let x = 1; x < w - 1; x += 1) {
        const i = (y * w + x) * c + 1;
        const gx = data[i + c] - data[i - c];
        const gy = data[i + w * c] - data[i - w * c];
        e += gx * gx + gy * gy;
      }
    }
    return e / ((w - 2) * (h - 2));
  };
  const lido = (b) => b.removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const ampliado = energia(await lido(sharp(composicao432).resize(512, 512, { kernel: 'lanczos3' })));
  const nitido = energia(await lido(sharp(path.join(RAIZ, 'public/icons/icon-512.png'))));
  assert.ok(nitido > ampliado * 1.04, `o icon-512 tem ${((nitido / ampliado - 1) * 100).toFixed(1)}% mais energia de borda que a ampliação de 432 px (esperado > 4%): voltou a ser ampliado?`);
  // e reduzido a 432 é a composição das camadas: a mesma arte, só mais nítida
  const reduzido = await sharp(path.join(RAIZ, 'public/icons/icon-512.png')).removeAlpha().resize(432, 432, { kernel: 'lanczos3' }).raw().toBuffer();
  const esperado = await sharp(composicao432).raw().toBuffer();
  let soma = 0;
  for (let i = 0; i < esperado.length; i += 1) soma += Math.abs(reduzido[i] - esperado[i]);
  assert.ok(soma / esperado.length < 0.5, `o icon-512 reduzido a 432 é a composição das camadas (diferença média ${(soma / esperado.length).toFixed(3)} nível)`);
});

test('29X · o manifest pinta o app instalado com o fundo da casa (#080808), a mesma cor do splash, do colors.xml e do capacitor.config.json', () => {
  const manifesto = JSON.parse(ler('public/manifest.json'));
  assert.equal(manifesto.background_color, '#080808');
  assert.equal(manifesto.theme_color, '#080808');
  assert.match(ler(`${RES}/values/colors.xml`), /name="futtyFundo">#080808</, 'a cor do splash do Android');
  const capacitor = JSON.parse(ler('capacitor.config.json'));
  assert.equal(capacitor.backgroundColor, '#080808');
  assert.equal(capacitor.ios.backgroundColor, '#080808');
  assert.equal(capacitor.android.backgroundColor, '#080808');
});

test('29X · os dois XML do modelo do Capacitor (grade verde) saíram, e nada no app os referencia', () => {
  assert.equal(fs.existsSync(path.join(RAIZ, RES, 'drawable/ic_launcher_background.xml')), false);
  assert.equal(fs.existsSync(path.join(RAIZ, RES, 'drawable-v24/ic_launcher_foreground.xml')), false);
  // o ícone adaptativo e o splash do Android 12+ apontam para os mipmaps (PNG), nunca para um drawable
  const achados = [];
  const andar = (pasta) => {
    for (const e of fs.readdirSync(pasta, { withFileTypes: true })) {
      const p = path.join(pasta, e.name);
      if (e.isDirectory()) { if (e.name !== 'assets' && e.name !== 'build') andar(p); continue; }
      if (!/\.(xml|java|kt|gradle|pro)$/.test(e.name)) continue;
      const texto = fs.readFileSync(p, 'utf8');
      if (/@drawable\/ic_launcher_(background|foreground)|R\.drawable\.ic_launcher_(background|foreground)/.test(texto)) achados.push(path.relative(RAIZ, p));
    }
  };
  andar(path.join(RAIZ, 'android', 'app', 'src'));
  assert.deepEqual(achados, [], 'ninguém referencia @drawable/ic_launcher_background nem _foreground');
  const adaptativo = ler(`${RES}/mipmap-anydpi-v26/ic_launcher.xml`);
  assert.match(adaptativo, /@mipmap\/ic_launcher_background/);
  assert.match(adaptativo, /@mipmap\/ic_launcher_foreground/);
  assert.match(ler(`${RES}/values/styles.xml`), /windowSplashScreenAnimatedIcon">@mipmap\/ic_launcher_foreground</, 'o splash do Android 12+ é o ic_launcher_foreground (ouro vivo)');
});

test('29X · o ícone troca de chave no cache: ?v=29x no sw.js, no manifest e no apple-touch-icon, e o service worker em futty-v7', () => {
  const sw = ler('public/sw.js');
  assert.match(sw, /icon: '\/icons\/icon-192\.png\?v=29x'/);
  assert.match(sw, /const CACHE_NAME = 'futty-v7';/, 'o cache subiu de nome: o icon-512 e o icon-192 mudaram sob o cache de 1 ano');
  const manifesto = JSON.parse(ler('public/manifest.json'));
  assert.deepEqual(manifesto.icons.map((i) => i.src), ['/icons/icon-192.png?v=29x', '/icons/icon-512.png?v=29x']);
  assert.match(ler('index.html'), /<link rel="apple-touch-icon" href="\/icons\/icon-192\.png\?v=29x" \/>/);
  for (const arquivo of ['public/sw.js', 'public/manifest.json', 'index.html']) assert.doesNotMatch(ler(arquivo), /\?v=29[vw]/, `${arquivo} ainda aponta para o ícone de uma rodada anterior`);
});

test('29X · os geradores só compõem o asset real: o gerar-icones renderiza no tamanho cheio e o gerar-splash põe o F no #080808; nenhum desenha à mão', () => {
  const icones = semComentarios(ler('scripts/gerar-icones.mjs'));
  assert.match(icones, /renderizarCamadas\(\)/, 'o ícone do site vem das camadas renderizadas no tamanho cheio');
  assert.match(icones, /composicaoCheia/);
  assert.doesNotMatch(icones, /icon-512[^\n]*composicao\b(?!Cheia)/, 'o icon-512 não sai da composição de 432 px');
  const splash = semComentarios(ler('scripts/gerar-splash.mjs'));
  assert.match(splash, /renderizarCamadas\(\{ splashAltura: ALTURA_F \}\)/);
  assert.match(splash, /const FUNDO = 8;/, 'o fundo é o #080808 sólido');
  assert.match(splash, /Splash\.imageset/);
  assert.match(splash, /splash_logo\.png/);
  assert.match(splash, /palette: true/, 'em paleta');
  assert.doesNotMatch(splash, /vinheta|radialGradient/i, 'o splash não tem vinheta (faria degrau para o app)');
  const camadas = semComentarios(ler('scripts/_camadas.mjs'));
  assert.match(camadas, /renderizar-camadas\.js/, 'a receita da bancada roda no backend (o sharp dos dois no mesmo processo derruba o Node)');
  for (const [nome, codigo] of [['gerar-icones', icones], ['gerar-splash', splash], ['_camadas', camadas]]) assert.doesNotMatch(codigo, /fal\.run|openai|createCanvas|<path /, `${nome}: nada de gerar nem desenhar`);
});
