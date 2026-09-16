// Futty v2.0 — O desenho da figurinha é LEI (FLUIDEZ 2, 16-set).
//
// A rodada da fluidez mexeu no CAMINHO do canvas (cache do padrão Épico, glow do
// Aura pré-desenhado, imagens descodificadas uma vez). Nada disso pode mudar um
// pixel do que a pessoa vê — e "acho que está igual" não é prova.
//
// Este script põe as duas versões a desenhar a MESMA figurinha, lado a lado, no
// mesmo WebKit, e conta as diferenças. A versão antiga sai do git (o commit que
// se quiser comparar), não de uma cópia à mão.
//
// Uso (com `npx vite --port 5175` a correr):
//   node scripts/comparar-canvas.mjs
//   node scripts/comparar-canvas.mjs --base HEAD --saida ../../COMPARACAO
import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { webkit } from 'playwright';

const args = process.argv.slice(2);
const opcao = (nome, omissao) => {
  const i = args.indexOf(`--${nome}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : omissao;
};

const BASE = opcao('url', 'http://localhost:5175');
const COMMIT = opcao('base', 'HEAD');
const SAIDA = opcao('saida', 'capturas-canvas');
// Quem manda é o DESVIO DE CANAL, não a contagem de pixéis. Um desvio de 5 em
// 255 espalhado por 1% da imagem é arredondamento de anti-aliasing nas linhas do
// honeycomb (que são desenhadas a alpha 0.065 — a coisa mais fraca do card);
// um desvio de 200 num só pixel seria um defeito a sério. A percentagem fica
// larga de propósito e serve só para apanhar uma mudança ESPALHADA.
const LIMITE_CANAL = 8;
const LIMITE_PCT = 2;

const ANTES = 'src/utils/figurinhaCanvasAntes.js';

// Avatar de teste com FUNDO TRANSPARENTE, como o real (o birefnet recorta o
// jogador). Com um retângulo opaco, o avatar tapava o fundo e a comparação do
// Aura e do Épico não via justamente aquilo que mudou.
const AVATAR_FALSO = `
  const c = document.createElement('canvas');
  c.width = 445; c.height = 680;
  const x = c.getContext('2d');
  x.fillStyle = '#1b2433';
  x.beginPath(); x.moveTo(120, 680); x.lineTo(165, 300); x.lineTo(280, 300); x.lineTo(325, 680); x.closePath(); x.fill();
  x.fillStyle = '#e8c9a0';
  x.beginPath(); x.ellipse(222, 180, 95, 120, 0, 0, Math.PI * 2); x.fill();
  window.__avatarFalso = c.toDataURL('image/png');
`;

const COMPARAR = async () => {
  const novo = await import('/src/utils/figurinhaCanvas.js');
  const velho = await import('/src/utils/figurinhaCanvasAntes.js');
  if (document.fonts?.ready) { try { await document.fonts.ready; } catch { /* segue */ } }

  const jogador = { id: 'bancada', nome_jogador: 'CHAVO, EL MATADOR' };
  const foto = window.__avatarFalso;

  const paraPixeis = async (blob) => {
    const bmp = await createImageBitmap(blob);
    const c = document.createElement('canvas');
    c.width = bmp.width;
    c.height = bmp.height;
    const x = c.getContext('2d');
    x.drawImage(bmp, 0, 0);
    return { dados: x.getImageData(0, 0, c.width, c.height).data, w: c.width, h: c.height, url: c.toDataURL('image/png') };
  };

  const casos = [];
  for (const [rotulo, extra] of [
    ['cromo', { avatarZoom: 1.1, formato: 'quadrado', fundoGlints: 'discreto' }],
    ['figurinha', {}],
  ]) {
    for (const fundo of ['estadio', 'gradiente', 'aura', 'golden', 'royal', 'preto']) {
      const opts = { jogador, fotoOverride: foto, fundo, corFrame: 'dourado', ...extra };
      // A versão nova dimensiona o quadrado pela tela; para comparar tem de sair
      // no tamanho canónico de sempre, senão comparavam-se resoluções diferentes.
      const [bNovo, bVelho] = await Promise.all([
        novo.gerarFigurinhaCanvas({ ...opts, larguraExibida: null }),
        velho.gerarFigurinhaCanvas(opts),
      ]);
      const a = await paraPixeis(bVelho);
      const b = await paraPixeis(bNovo);
      if (a.w !== b.w || a.h !== b.h) {
        casos.push({ caso: `${rotulo}/${fundo}`, erro: `tamanhos diferentes: ${a.w}×${a.h} vs ${b.w}×${b.h}` });
        continue;
      }
      let diferentes = 0;
      let maiorCanal = 0;
      for (let i = 0; i < a.dados.length; i += 4) {
        const d = Math.max(
          Math.abs(a.dados[i] - b.dados[i]),
          Math.abs(a.dados[i + 1] - b.dados[i + 1]),
          Math.abs(a.dados[i + 2] - b.dados[i + 2]),
          Math.abs(a.dados[i + 3] - b.dados[i + 3])
        );
        if (d > maiorCanal) maiorCanal = d;
        if (d > 1) diferentes += 1;
      }
      const totalPx = a.dados.length / 4;
      casos.push({
        caso: `${rotulo}/${fundo}`,
        maiorCanal,
        pctDiferente: Math.round((diferentes / totalPx) * 10000) / 100,
        pngAntes: a.url,
        pngDepois: b.url,
      });
    }
  }
  return casos;
};

// O `finally` tem de esperar pela PROMESSA, não pelo retorno: apagar o ficheiro
// antes de o browser o importar dava "Importing a module script failed".
async function comSemAntes(fn) {
  execSync(`git show ${COMMIT}:src/utils/figurinhaCanvas.js > ${ANTES}`, { shell: 'bash', stdio: 'inherit' });
  // O vite vê o ficheiro novo, reprocessa o grafo e manda a página recarregar.
  // Abrir o browser antes disso assentar dá "Execution context was destroyed".
  await new Promise((r) => setTimeout(r, 5000));
  try { return await fn(); } finally { rmSync(ANTES, { force: true }); }
}

async function correr() {
  const navegador = await webkit.launch({ headless: true });
  const contexto = await navegador.newContext({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 3, serviceWorkers: 'block' });
  const pagina = await contexto.newPage();
  const erros = [];
  pagina.on('pageerror', (e) => erros.push(e.message));
  // Volta de aquecimento: a PRIMEIRA importação de um módulo novo faz o vite
  // reotimizar as dependências e mandar a página recarregar — o que rebentava a
  // comparação a meio. Importa-se uma vez para isso acontecer agora, espera-se,
  // e só depois se abre a página que vai medir.
  await pagina.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
  await pagina.evaluate(() => Promise.all([
    import('/src/utils/figurinhaCanvas.js').catch(() => {}),
    import('/src/utils/figurinhaCanvasAntes.js').catch(() => {}),
  ])).catch(() => {});
  await pagina.waitForTimeout(3000);

  await pagina.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
  await pagina.evaluate(AVATAR_FALSO);
  const casos = await pagina.evaluate(COMPARAR);
  await navegador.close();
  if (erros.length) console.error('Erros na página:', erros.slice(0, 3));
  return casos;
}

const promessa = comSemAntes(() => correr());

promessa
  .then((casos) => {
    mkdirSync(SAIDA, { recursive: true });
    console.log(`\n=== O DESENHO MUDOU? (base ${COMMIT}, WebKit) ===\n`);
    console.log('caso                 maior canal   % pixéis diferentes');
    let reprovou = false;
    for (const c of casos) {
      if (c.erro) {
        console.log(`${c.caso.padEnd(20)} ${c.erro}`);
        reprovou = true;
        continue;
      }
      const mau = c.maiorCanal > LIMITE_CANAL || c.pctDiferente > LIMITE_PCT;
      if (mau) reprovou = true;
      console.log(`${c.caso.padEnd(20)} ${String(c.maiorCanal).padStart(11)} ${String(c.pctDiferente).padStart(21)}%  ${mau ? '← OLHAR' : 'ok'}`);
      const nome = c.caso.replace('/', '-');
      for (const [sufixo, url] of [['antes', c.pngAntes], ['depois', c.pngDepois]]) {
        writeFileSync(`${SAIDA}/${nome}-${sufixo}.png`, Buffer.from(url.split(',')[1], 'base64'));
      }
    }
    console.log(`\n(limites: até ${LIMITE_CANAL} de canal e ${LIMITE_PCT}% de pixéis — acima disso é outro desenho)`);
    console.log(`(imagens lado a lado em ${SAIDA}/)\n`);
    if (reprovou) process.exit(1);
  })
  .catch((e) => {
    console.error('Falhou:', e.message);
    process.exit(1);
  });
