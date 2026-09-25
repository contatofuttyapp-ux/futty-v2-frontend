// Peças das lojas: 6 capturas com celular em mockup e, na Google Play, a imagem
// de destaque (1024×500). HTML montado aqui, renderizado pelo Chromium do
// Playwright. Correr: `node scripts/loja/gerar-imagens.mjs [--tamanho=1290x2796] [--pasta=apple]`
// (a partir de frontend/).
// Padrão (Google Play, 1080×1920): entrada FUT/LOJA/cruas/*.png, saída FUT/LOJA/.
// App Store (iPhone 6,7"): --tamanho=1290x2796 --pasta=apple lê FUT/LOJA/apple/cruas/*.png
// (de capturar-telas.mjs com os mesmos argumentos) e grava FUT/LOJA/apple/.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const AQUI = dirname(fileURLToPath(import.meta.url));
const FRONTEND = resolve(AQUI, '..', '..');
const PUBLIC = join(FRONTEND, 'public');
const LOJA = resolve(FRONTEND, '..', '..', 'LOJA');
const opcao = (nome) => (process.argv.find((a) => a.startsWith(`--${nome}=`)) || '').slice(nome.length + 3);
const SAIDA = opcao('pasta') ? join(LOJA, opcao('pasta')) : LOJA;
const CRUAS = join(SAIDA, 'cruas');

// O desenho é feito em 1080 unidades de largura; a peça inteira é escalada para
// a largura pedida. `altura` é a altura em unidades (1920 = 9:16). Celular:
// `celularLargura` é a caixa dentro da moldura, `telaLargura` a captura, `moldura`
// a escala da borda/raio/sombra. Na Google Play a captura (760) é mais estreita que
// a caixa (786) desde 13-set e sobra uma faixa de moldura à direita; fica assim
// para as peças já enviadas. Na App Store a captura enche a caixa.
const LAYOUTS = {
  '1080x1920': { altura: 1920, textoTopo: 150, celularTopo: 470, celularLargura: 786, telaLargura: 760, moldura: 1 },
  '1290x2796': { altura: 2796 / (1290 / 1080), textoTopo: 170, celularTopo: 520, celularLargura: 894, telaLargura: 894, moldura: 1.17 },
};
const TAMANHO = opcao('tamanho') || '1080x1920';
const LAYOUT = LAYOUTS[TAMANHO];
if (!LAYOUT) throw new Error(`--tamanho=${TAMANHO} não suportado (use ${Object.keys(LAYOUTS).join(' ou ')})`);
const [LARGURA, ALTURA] = TAMANHO.split('x').map(Number);
const ESCALA = LARGURA / 1080;

const OURO = '#D4AF37';

const PECAS = [
  { arquivo: '01-sorteio.png', tela: 'sorteio.png', kicker: 'Sorteio', titulo: 'Sorteio justo e com show' },
  { arquivo: '02-figurinha.png', tela: 'figurinha.png', kicker: 'Figurinha', titulo: 'Sua figurinha de craque' },
  { arquivo: '03-ranking.png', tela: 'ranking.png', kicker: 'Ranking', titulo: 'Ranking que vale discussão' },
  { arquivo: '04-resenha.png', tela: 'resenha.png', kicker: 'Resenha', titulo: 'A resenha do time' },
  // recorte: pixels da captura (a 1080 de largura) cortados no topo, por tamanho, para os botões
  // "Vou / Não vou" caberem no cartaz. Na App Store cabem sem recorte.
  { arquivo: '05-presenca.png', tela: 'inicio.png', kicker: 'Presença', titulo: 'Confirme presença em um toque', recorte: { '1080x1920': 160 } },
  { arquivo: '06-explorar.png', tela: 'explorar.png', kicker: 'Explorar', titulo: 'Ache uma pelada perto de você' },
];

const dataUri = (caminho, mime) => `data:${mime};base64,${readFileSync(caminho).toString('base64')}`;

const FONTES = `
  @font-face { font-family: 'Rajdhani'; font-weight: 400; src: url(${dataUri(join(PUBLIC, 'fonts/rajdhani-400.woff2'), 'font/woff2')}) format('woff2'); }
  @font-face { font-family: 'Rajdhani'; font-weight: 600; src: url(${dataUri(join(PUBLIC, 'fonts/rajdhani-600.woff2'), 'font/woff2')}) format('woff2'); }
  @font-face { font-family: 'Rajdhani'; font-weight: 700; src: url(${dataUri(join(PUBLIC, 'fonts/rajdhani-700.woff2'), 'font/woff2')}) format('woff2'); }
`;

const LOGO_F = dataUri(join(PUBLIC, 'futty-logo-flat.webp'), 'image/webp');

// Fundo comum: noite de estádio. Dois holofotes vindos de cima, círculo central e
// linha do meio-campo quase invisíveis, gradiente do preto da casa ao azul-escuro.
const FUNDO = `
  .fundo { position:absolute; inset:0; overflow:hidden;
    background:
      radial-gradient(ellipse 1100px 800px at 50% -12%, rgba(212,175,55,.26), transparent 62%),
      radial-gradient(ellipse 1300px 1000px at 50% 118%, #141824 0%, transparent 72%),
      linear-gradient(180deg, #0b0d14 0%, #080808 100%); }
  .cone { position:absolute; top:-360px; width:760px; height:1500px; filter:blur(48px);
    background:linear-gradient(180deg, rgba(212,175,55,.17), rgba(212,175,55,0) 70%); }
  .cone.esq { left:-260px; transform:rotate(20deg); transform-origin:top center; }
  .cone.dir { right:-260px; transform:rotate(-20deg); transform-origin:top center; }
  .grao { position:absolute; inset:0; opacity:.05;
    background-image: repeating-linear-gradient(115deg, rgba(255,255,255,.9) 0 2px, transparent 2px 118px); }
`;

function htmlPeca({ kicker, titulo, tela, recorte = 0 }) {
  const { altura, textoTopo, celularTopo, celularLargura, telaLargura, moldura: f } = LAYOUT;
  const deslocamento = Math.round((recorte * telaLargura) / 1080);
  const escala = ESCALA === 1 ? '' : `transform:scale(${ESCALA}); transform-origin:0 0;`;
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><style>
    ${FONTES}
    html, body { margin:0; width:${LARGURA}px; height:${ALTURA}px; overflow:hidden; background:#080808;
      font-family:'Rajdhani', system-ui, sans-serif; -webkit-font-smoothing:antialiased; }
    .palco { position:absolute; left:0; top:0; width:1080px; height:${altura}px; ${escala} }
    ${FUNDO}
    .circulo { position:absolute; left:50%; top:${altura - 860}px; width:1500px; height:1500px; transform:translateX(-50%);
      border:3px solid rgba(212,175,55,.11); border-radius:50%; }
    .meio { position:absolute; left:0; right:0; top:${altura - 110}px; height:3px; background:rgba(212,175,55,.11); }
    .texto { position:absolute; left:90px; right:90px; top:${textoTopo}px; color:#fff; }
    .kicker { display:flex; align-items:center; gap:20px; color:${OURO}; font-weight:600; font-size:36px;
      letter-spacing:.24em; text-transform:uppercase; }
    .kicker::before { content:''; display:block; width:64px; height:5px; background:${OURO}; }
    h1 { margin:22px 0 0; font-weight:700; font-size:104px; line-height:.96; letter-spacing:-.012em;
      max-width:900px; text-wrap:balance; text-shadow:0 6px 40px rgba(0,0,0,.6); }
    .brilho { position:absolute; left:50%; top:${celularTopo + 90}px; width:1000px; height:1000px; transform:translateX(-50%);
      background:radial-gradient(circle, rgba(212,175,55,.22), rgba(212,175,55,0) 62%); filter:blur(30px); }
    .celular { position:absolute; left:50%; top:${celularTopo}px; width:${celularLargura}px; transform:translateX(-50%);
      padding:${13 * f}px; border-radius:${76 * f}px; background:linear-gradient(160deg, #2c2c31 0%, #111114 55%, #1a1a1e 100%);
      box-shadow: 0 ${70 * f}px ${160 * f}px rgba(0,0,0,.8), 0 0 0 1px rgba(212,175,55,.32), 0 0 ${140 * f}px rgba(212,175,55,.14); }
    .ecra { overflow:hidden; border-radius:${64 * f}px; }
    .tela { display:block; width:${telaLargura}px; margin-top:-${deslocamento}px; }
    .reflexo { position:absolute; inset:${13 * f}px; border-radius:${64 * f}px; pointer-events:none;
      background:linear-gradient(115deg, rgba(255,255,255,.07) 0%, rgba(255,255,255,0) 28%); }
  </style></head><body><div class="palco">
    <div class="fundo"><div class="cone esq"></div><div class="cone dir"></div><div class="grao"></div>
      <div class="circulo"></div><div class="meio"></div></div>
    <div class="brilho"></div>
    <div class="texto"><div class="kicker">${kicker}</div><h1>${titulo}</h1></div>
    <div class="celular"><div class="ecra"><img class="tela" src="${tela}" alt=""></div><div class="reflexo"></div></div>
  </div></body></html>`;
}

function htmlDestaque() {
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><style>
    ${FONTES}
    html, body { margin:0; width:1024px; height:500px; overflow:hidden; background:#080808;
      font-family:'Rajdhani', system-ui, sans-serif; -webkit-font-smoothing:antialiased; }
    ${FUNDO}
    .fundo { background:
      radial-gradient(ellipse 700px 500px at 22% 50%, rgba(212,175,55,.22), transparent 62%),
      radial-gradient(ellipse 900px 600px at 85% 120%, #141824 0%, transparent 70%),
      linear-gradient(180deg, #0b0d14 0%, #080808 100%); }
    .cone { top:-500px; width:520px; height:1100px; }
    .cone.esq { left:-120px; } .cone.dir { right:-120px; }
    .circulo { position:absolute; left:-330px; top:-250px; width:1000px; height:1000px;
      border:3px solid rgba(212,175,55,.12); border-radius:50%; }
    .f { position:absolute; left:58px; top:62px; height:376px;
      filter:drop-shadow(0 20px 50px rgba(0,0,0,.7)) drop-shadow(0 0 60px rgba(212,175,55,.25)); }
    .bloco { position:absolute; left:424px; top:0; bottom:0; right:36px; display:flex; flex-direction:column;
      justify-content:center; gap:18px; }
    .nome { color:${OURO}; font-weight:700; font-size:160px; line-height:.86; letter-spacing:.03em;
      text-shadow:0 6px 40px rgba(0,0,0,.6); }
    .frase { color:#fff; font-weight:600; font-size:43px; line-height:1; letter-spacing:.012em;
      white-space:nowrap; text-shadow:0 4px 30px rgba(0,0,0,.6); }
    .risco { width:96px; height:5px; background:${OURO}; margin:6px 0 4px; }
  </style></head><body>
    <div class="fundo"><div class="cone esq"></div><div class="cone dir"></div><div class="grao"></div>
      <div class="circulo"></div></div>
    <img class="f" src="${LOGO_F}" alt="">
    <div class="bloco"><div class="nome">FUTTY</div><div class="risco"></div>
      <div class="frase">Sua pelada virou campeonato</div></div>
  </body></html>`;
}

async function renderizar(page, html, largura, altura, destino) {
  await page.setViewportSize({ width: largura, height: altura });
  await page.setContent(html, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(150);
  await page.screenshot({ path: destino, type: 'png', animations: 'disabled' });
  console.log('✓', destino);
}

const navegador = await chromium.launch();
const page = await navegador.newPage({ deviceScaleFactor: 1, colorScheme: 'dark' });
mkdirSync(SAIDA, { recursive: true });

for (const peca of PECAS) {
  const crua = join(CRUAS, peca.tela);
  if (!existsSync(crua)) { console.warn('! falta a captura', crua, '— peça pulada'); continue; }
  await renderizar(page, htmlPeca({ ...peca, tela: dataUri(crua, 'image/png'), recorte: peca.recorte?.[TAMANHO] ?? 0 }), LARGURA, ALTURA, join(SAIDA, peca.arquivo));
}
// A imagem de destaque 1024×500 é peça só da Google Play.
if (TAMANHO === '1080x1920') await renderizar(page, htmlDestaque(), 1024, 500, join(SAIDA, 'destaque-1024x500.png'));

await navegador.close();
