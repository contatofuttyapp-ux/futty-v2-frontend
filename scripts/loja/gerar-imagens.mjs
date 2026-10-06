// Peças das lojas: as 8 capturas com o celular em mockup, a FAIXA 1024×500 da Google Play e a folha de
// revisão. HTML montado aqui, renderizado pelo Chromium do Playwright. Correr a partir de frontend/:
//
//   node scripts/loja/gerar-imagens.mjs --cruas=outubro/cruas --saida=outubro/play-celular
//   node scripts/loja/gerar-imagens.mjs --tamanho=1290x2796 --cruas=outubro/apple/cruas --saida=outubro/apple
//   node scripts/loja/gerar-imagens.mjs --faixa=outubro      só a faixa → LOJA/outubro/faixa-1024x500.png
//   node scripts/loja/gerar-imagens.mjs --revisao=outubro    folha de revisão (as 8 + a faixa)
//
// As 8 peças, os rótulos e as frases são a tabela de LOJA-PRINTS-OUT.md (aprovada pelo dono).
// A FAIXA segue MARCA.md: o símbolo é o ÍCONE DO APP (MARCA/icone-1024.png), nunca o F solto ao lado da
// palavra ("F FUTTY" está aposentado), com FUTTY em branco e "A sua figurinha." em dourado #f0c94a.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { FIGURINHAS_DO_SORTEIO } from './figurinhas-do-sorteio.mjs';

const AQUI = dirname(fileURLToPath(import.meta.url));
const FRONTEND = resolve(AQUI, '..', '..');
const PUBLIC = join(FRONTEND, 'public');
const FUT = resolve(FRONTEND, '..', '..');
const LOJA = join(FUT, 'LOJA');
const MARCA = join(FUT, 'MARCA');
const opcao = (nome) => (process.argv.find((a) => a.startsWith(`--${nome}=`)) || '').slice(nome.length + 3);
const CRUAS = join(LOJA, opcao('cruas') || join('outubro', 'cruas'));
const SAIDA = join(LOJA, opcao('saida') || join('outubro', 'play-celular'));

// O desenho é feito em 1080 unidades de largura; a peça inteira é escalada para a largura pedida. `altura`
// é a altura em unidades (1920 = 9:16). Celular: `celularLargura` é a caixa dentro da moldura,
// `telaLargura` a captura, `moldura` a escala da borda/raio/sombra. Na Google Play a captura (760) é mais
// estreita que a caixa (786) e sobra uma faixa de moldura à direita; fica assim para as peças já enviadas.
// Na App Store a captura enche a caixa.
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
const OURO_TEXTO = '#f0c94a'; // o dourado de texto da marca (MARCA.md)

// LOJA-PRINTS-OUT.md, tabela aprovada pelo dono: ordem, rótulo (dourado, pequeno) e frase.
const PECAS = [
  { arquivo: '01.png', tela: 'sorteio.png', kicker: 'Sorteio', titulo: 'Sorteio justo de times' },
  { arquivo: '02.png', tela: 'figurinha.png', kicker: 'Figurinha', titulo: 'Vire figurinha de colecionador' },
  { arquivo: '03.png', tela: 'inicio.png', kicker: 'Presença', titulo: 'Confirme presença em um toque' },
  { arquivo: '04.png', tela: 'novo-jogo.png', kicker: 'Novo jogo', titulo: 'Marque o jogo em segundos' },
  { arquivo: '05.png', tela: 'ranking.png', kicker: 'Ranking', titulo: 'Ranking com votação dos melhores jogadores' },
  { arquivo: '06.png', tela: 'resenha.png', kicker: 'Resenha', titulo: 'A resenha do time' },
  { arquivo: '07.png', tela: 'radar.png', kicker: 'Radar de peladas', titulo: 'Encontre uma pelada perto de você' },
  { arquivo: '08.png', tela: 'criar-time.png', kicker: 'Criar time', titulo: 'Seu time no ar em um minuto' },
];

const dataUri = (caminho, mime) => `data:${mime};base64,${readFileSync(caminho).toString('base64')}`;

const FONTES = `
  @font-face { font-family: 'Rajdhani'; font-weight: 400; src: url(${dataUri(join(PUBLIC, 'fonts/rajdhani-400.woff2'), 'font/woff2')}) format('woff2'); }
  @font-face { font-family: 'Rajdhani'; font-weight: 600; src: url(${dataUri(join(PUBLIC, 'fonts/rajdhani-600.woff2'), 'font/woff2')}) format('woff2'); }
  @font-face { font-family: 'Rajdhani'; font-weight: 700; src: url(${dataUri(join(PUBLIC, 'fonts/rajdhani-700.woff2'), 'font/woff2')}) format('woff2'); }
`;

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

function htmlPeca({ kicker, titulo, tela, recorte = 0, fonteTitulo = 104 }) {
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
    h1 { margin:22px 0 0; font-weight:700; font-size:${fonteTitulo}px; line-height:.96; letter-spacing:-.012em;
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

// A FAIXA (1024×500) da Google Play. MARCA.md: símbolo = ÍCONE DO APP (nunca o F solto ao lado da palavra),
// FUTTY em Rajdhani Bold branco e, embaixo, "O seu time." branco + "A sua figurinha." em dourado.
// Respiro de 1/4 do lado do ícone em volta dele (MARCA.md, "Assinaturas").
function htmlFaixa() {
  const ICONE = dataUri(join(MARCA, 'icone-1024.png'), 'image/png');
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
    .icone { position:absolute; left:76px; top:100px; width:300px; height:300px; border-radius:66px;
      filter:drop-shadow(0 20px 50px rgba(0,0,0,.7)) drop-shadow(0 0 60px rgba(212,175,55,.25)); }
    .bloco { position:absolute; left:452px; top:0; bottom:0; right:40px; display:flex; flex-direction:column;
      justify-content:center; gap:14px; }
    .nome { color:#fff; font-weight:700; font-size:150px; line-height:.86; letter-spacing:.035em;
      text-shadow:0 6px 40px rgba(0,0,0,.6); }
    .frase { font-weight:600; font-size:42px; line-height:1.05; letter-spacing:.012em; color:#fff;
      white-space:nowrap; text-shadow:0 4px 30px rgba(0,0,0,.6); }
    .frase b { color:${OURO_TEXTO}; font-weight:600; }
  </style></head><body>
    <div class="fundo"><div class="cone esq"></div><div class="cone dir"></div><div class="grao"></div>
      <div class="circulo"></div></div>
    <img class="icone" src="${ICONE}" alt="">
    <div class="bloco"><div class="nome">FUTTY</div>
      <div class="frase">O seu time. <b>A sua figurinha.</b></div></div>
  </body></html>`;
}

// Folha de revisão: as 8 peças lado a lado (na ordem da loja) e a faixa embaixo. Só para olhar — não vai para loja nenhuma.
function htmlRevisao(pecas, faixa) {
  const CARTAO = 260;
  const largura = PECAS.length * CARTAO + (PECAS.length + 1) * 22;
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><style>
    ${FONTES}
    html, body { margin:0; width:${largura}px; background:#0b0d14; color:#fff;
      font-family:'Rajdhani', system-ui, sans-serif; -webkit-font-smoothing:antialiased; }
    .folha { padding:26px 22px 30px; }
    h1 { margin:0 0 4px; font-size:34px; font-weight:700; letter-spacing:.02em; }
    .sub { margin:0 0 22px; font-size:19px; color:#aaa; font-weight:400; }
    .linha { display:flex; gap:22px; }
    figure { margin:0; width:${CARTAO}px; }
    figure img { display:block; width:${CARTAO}px; border-radius:10px; border:1px solid #23262f; }
    figcaption { margin-top:8px; font-size:17px; color:#aaa; line-height:1.25; }
    figcaption b { display:block; color:${OURO}; font-size:14px; letter-spacing:.16em; text-transform:uppercase; }
    .faixa { margin-top:30px; }
    .faixa img { display:block; width:1024px; border-radius:10px; border:1px solid #23262f; }
    .faixa figcaption { margin-top:8px; font-size:17px; color:#aaa; }
  </style></head><body><div class="folha">
    <h1>Prints das lojas — outubro</h1>
    <p class="sub">8 telas do app (celular 1080×1920 na Google Play; 1290×2796 na App Store) e a faixa 1024×500. Capturadas no servidor local, com a conta de demonstração.</p>
    <div class="linha">
      ${pecas.map((p, i) => `<figure><img src="${p.src}" alt=""><figcaption><b>${PECAS[i].arquivo.replace('.png', '')} · ${PECAS[i].kicker}</b>${PECAS[i].titulo}</figcaption></figure>`).join('')}
    </div>
    <div class="faixa"><figure><img src="${faixa}" alt=""><figcaption>Faixa 1024×500 (Google Play) — ícone do app + FUTTY + o slogan da casa.</figcaption></figure></div>
  </div></body></html>`;
}

// Folha dos 4 cartões novos do Sorteio (ajuste 2 do dono): as figurinhas da bancada lado a lado, cada uma com o nome na placa, como a
// figurinha do app — o nome encolhe até caber, nunca é cortado. Só para olhar; não vai para loja nenhuma.
function htmlFolhaAvatares(cartoes, custo) {
  const CARTAO = 300;
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><style>
    ${FONTES}
    html, body { margin:0; width:${cartoes.length * CARTAO + (cartoes.length + 1) * 24}px; background:#0b0d14; color:#fff;
      font-family:'Rajdhani', system-ui, sans-serif; -webkit-font-smoothing:antialiased; }
    .folha { padding:26px 24px 30px; }
    h1 { margin:0 0 4px; font-size:32px; font-weight:700; letter-spacing:.02em; }
    .sub { margin:0 0 22px; font-size:18px; color:#aaa; }
    .linha { display:flex; gap:24px; }
    figure { margin:0; width:${CARTAO}px; }
    .cartao { position:relative; width:${CARTAO}px; height:${CARTAO * 1.5}px; }
    .cartao img { display:block; width:100%; height:100%; }
    .placa { position:absolute; left:11%; right:11%; bottom:8.5%; height:44px; display:flex; align-items:center; justify-content:center;
      background:rgba(10,10,14,.84); border:1px solid rgba(212,175,55,.35); border-radius:8px; overflow:hidden; }
    .placa span { font-weight:700; font-size:28px; letter-spacing:.08em; text-transform:uppercase; white-space:nowrap; padding:0 8px; }
    figcaption { margin-top:10px; font-size:17px; color:#aaa; line-height:1.25; }
    figcaption b { display:block; color:${OURO}; font-size:14px; letter-spacing:.16em; text-transform:uppercase; }
  </style></head><body><div class="folha">
    <h1>Sorteio — os 4 lugares novos</h1>
    <p class="sub">Receita V6 de produção, uniforme Dark Gold, mesmo enquadramento da figurinha do Bruninho.${custo != null ? ` Custo real lido da fal: US$${custo.toFixed(3).replace('.', ',')}.` : ''}</p>
    <div class="linha">
      ${cartoes.map((c) => `<figure><div class="cartao"><img src="${c.src}" alt=""><div class="placa"><span>${c.nome}</span></div></div><figcaption><b>${c.time}</b>${c.nome} · ${c.nota}</figcaption></figure>`).join('')}
    </div>
  </div></body></html>`;
}

async function renderizar(page, html, largura, altura, destino) {
  await page.setViewportSize({ width: largura, height: altura || 10 });
  await page.setContent(html, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(150);
  await page.screenshot({ path: destino, type: 'png', animations: 'disabled', fullPage: !altura });
  console.log('✓', destino);
}

/**
 * UM tamanho de frase para as 8 peças: todas no mesmo tamanho, cada uma em no máximo duas linhas e acima do
 * celular. Começa nos 104 de sempre e, se alguma frase não couber, desce de 2 em 2 para TODAS (cada peça
 * encolhendo sozinha deixava as frases em tamanhos diferentes). As linhas são contadas pela altura do
 * título (line-height .96), com a Rajdhani já carregada.
 */
async function fonteDasFrases(page) {
  const limite = LAYOUT.celularTopo - 34;
  for (let fonte = 104; fonte >= 60; fonte -= 2) {
    const medidas = [];
    for (const peca of PECAS) {
      await page.setContent(htmlPeca({ ...peca, tela: '', fonteTitulo: fonte }), { waitUntil: 'load' });
      const m = await page.evaluate(async (f) => {
        await Promise.all([document.fonts.load(`700 ${f}px Rajdhani`), document.fonts.load('600 36px Rajdhani')]);
        await document.fonts.ready;
        const r = document.querySelector('h1').getBoundingClientRect();
        return { altura: r.height, base: r.bottom, rajdhani: document.fonts.check(`700 ${f}px Rajdhani`) };
      }, fonte);
      if (!m.rajdhani) throw new Error('a Rajdhani não carregou: medir a frase com a fonte de reserva daria outro tamanho');
      medidas.push({ peca, linhas: Math.round(m.altura / ESCALA / (fonte * 0.96)), base: m.base / ESCALA });
    }
    const fora = medidas.filter((m) => m.linhas > 2 || m.base > limite);
    if (!fora.length) return fonte;
    console.log(`  · ${fonte}px não serve: ${fora.map((m) => `${m.peca.arquivo} em ${m.linhas} linhas`).join(', ')}`);
  }
  throw new Error('nenhum tamanho entre 104 e 60 px põe todas as frases em duas linhas');
}

const navegador = await chromium.launch();
const page = await navegador.newPage({ deviceScaleFactor: 1, colorScheme: 'dark' });

// ── só a faixa ────────────────────────────────────────────────────────────────────────────────────────
if (opcao('faixa')) {
  const destino = join(LOJA, opcao('faixa'), 'faixa-1024x500.png');
  mkdirSync(dirname(destino), { recursive: true });
  await renderizar(page, htmlFaixa(), 1024, 500, destino);
  await navegador.close();
  process.exit(0);
}

// ── folha dos 4 cartões novos do Sorteio ─────────────────────────────────────────────────────────────
if (opcao('avatares')) {
  const pasta = join(LOJA, opcao('avatares'));
  const cartoes = FIGURINHAS_DO_SORTEIO.map((f) => {
    const caminho = join(pasta, `${f.arquivo}-card.png`);
    if (!existsSync(caminho)) throw new Error(`falta ${caminho} (rode backend/scripts/_bench/gerar-modelos-ficticios.js --loja)`);
    return { ...f, src: dataUri(caminho, 'image/png') };
  });
  let custo = null;
  try { custo = JSON.parse(readFileSync(join(pasta, 'custos.json'), 'utf8')).total_usd ?? null; } catch { /* sem custos.json, a folha sai sem o custo */ }
  const largura = cartoes.length * 300 + (cartoes.length + 1) * 24;
  await page.setViewportSize({ width: largura, height: 10 });
  await page.setContent(htmlFolhaAvatares(cartoes, custo), { waitUntil: 'load' });
  await page.evaluate(async () => {
    await document.fonts.load('700 28px Rajdhani');
    await document.fonts.ready;
    // O nome nunca é cortado: encolhe até caber na placa.
    for (const span of document.querySelectorAll('.placa span')) {
      let px = 28;
      while (span.scrollWidth > span.parentElement.clientWidth && px > 12) { px -= 1; span.style.fontSize = `${px}px`; }
    }
  });
  const destino = join(pasta, 'folha.png');
  await page.screenshot({ path: destino, type: 'png', fullPage: true });
  console.log('✓', destino);
  await navegador.close();
  process.exit(0);
}

// ── folha de revisão ──────────────────────────────────────────────────────────────────────────────────
if (opcao('revisao')) {
  const pasta = join(LOJA, opcao('revisao'));
  const pecas = PECAS.map((p) => {
    const caminho = join(pasta, 'play-celular', p.arquivo);
    if (!existsSync(caminho)) throw new Error(`falta a peça ${caminho} (gere as 8 antes da folha de revisão)`);
    return { src: dataUri(caminho, 'image/png') };
  });
  const faixa = join(pasta, 'faixa-1024x500.png');
  if (!existsSync(faixa)) throw new Error(`falta a faixa ${faixa} (gere com --faixa=${opcao('revisao')})`);
  await renderizar(page, htmlRevisao(pecas, dataUri(faixa, 'image/png')), PECAS.length * 260 + (PECAS.length + 1) * 22, 0, join(pasta, 'revisao.png'));
  await navegador.close();
  process.exit(0);
}

// ── as 8 peças ────────────────────────────────────────────────────────────────────────────────────────
mkdirSync(SAIDA, { recursive: true });
const fonte = await fonteDasFrases(page);
console.log(`  · as 8 frases em ${fonte}px (unidades de 1080), no máximo duas linhas cada`);
for (const peca of PECAS) {
  const crua = join(CRUAS, peca.tela);
  if (!existsSync(crua)) { console.warn('! falta a captura', crua, '— peça pulada'); continue; }
  const comTela = { ...peca, tela: dataUri(crua, 'image/png'), recorte: peca.recorte?.[TAMANHO] ?? 0 };
  await renderizar(page, htmlPeca({ ...comTela, fonteTitulo: fonte }), LARGURA, ALTURA, join(SAIDA, peca.arquivo));
}

await navegador.close();
writeFileSync(join(SAIDA, 'LEIA-ME.txt'), `Peças ${TAMANHO} geradas por frontend/scripts/loja/gerar-imagens.mjs a partir de ${CRUAS}.\nOrdem e frases: LOJA-PRINTS-OUT.md (tabela aprovada em 5-out).\n`);
