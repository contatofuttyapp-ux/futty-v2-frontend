// Capturas cruas para as lojas, logado como a conta de demonstração criada por
// backend/scripts/demo-loja.js. Padrão (Google Play): celular 360×780 a 3× (1080×2340).
// Correr a partir de frontend/: `node scripts/loja/capturar-telas.mjs [--so=inicio,perfil] [--base=https://dev.futty.pages.dev] [--tamanho=1290x2796] [--pasta=apple]`
// Saída: FUT/LOJA/cruas/<tela>.png (com --pasta=apple: FUT/LOJA/apple/cruas/<tela>.png)
// --tamanho=LxA (em pixels, múltiplos de 3) troca a viewport para L/3 × A/3 a 3× e o user agent para o do
// iPhone. iPhone 6,7" da App Store: --tamanho=1290x2796.
// Nenhuma tela sai se mostrar preço, "Brilhante" ou palavra de venda: o script aborta.
import { readFileSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const AQUI = dirname(fileURLToPath(import.meta.url));
const LOJA = resolve(AQUI, '..', '..', '..', '..', 'LOJA');
const opcao = (nome) => (process.argv.find((a) => a.startsWith(`--${nome}=`)) || '').slice(nome.length + 3);
const CRUAS = join(opcao('pasta') ? join(LOJA, opcao('pasta')) : LOJA, 'cruas');
const BASE = opcao('base') || 'https://futty.pages.dev';
const [LARGURA_PX, ALTURA_PX] = (opcao('tamanho') || '1080x2340').split('x').map(Number);
if (!LARGURA_PX || !ALTURA_PX || LARGURA_PX % 3 || ALTURA_PX % 3) throw new Error('--tamanho=LARGURAxALTURA, em pixels e múltiplos de 3 (ex.: 1290x2796)');
const UA_ANDROID = 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36';
const UA_IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.7 Mobile/15E148 Safari/604.1';

const estado = JSON.parse(readFileSync(join(LOJA, 'demo-estado.json'), 'utf8'));
const senha = readFileSync(join(LOJA, 'demo-senha.txt'), 'utf8').match(/senha: (.+)/)[1].trim();
const so = opcao('so').split(',').filter(Boolean);
const quer = (tela) => !so.length || so.includes(tela);

// Posição fictícia em Brasília (Asa Sul), só para o Explorar mostrar distâncias.
// O app calcula a distância no aparelho; nada disto vai ao servidor.
const CONTEXTO = {
  viewport: { width: LARGURA_PX / 3, height: ALTURA_PX / 3 },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
  userAgent: opcao('tamanho') ? UA_IPHONE : UA_ANDROID,
  locale: 'pt-BR',
  timezoneId: 'America/Sao_Paulo',
  colorScheme: 'dark',
  serviceWorkers: 'block',
  permissions: ['geolocation'],
  geolocation: { latitude: -15.815, longitude: -47.905 },
};

// Faixas e avisos que apareceriam por cima das telas numa conta nova.
const SEM_AVISOS = () => {
  localStorage.setItem('futty_cookies', 'aceite');
  localStorage.setItem('futty_tour_done', '1');
  localStorage.setItem('futty_figurinha_estreia', '1');
  localStorage.setItem('futty_dob_dispensado', '1');
  localStorage.removeItem('futty_cta_figurinha');
  sessionStorage.setItem('futty_push_dismiss', '1');
  sessionStorage.setItem('futty_votacao_dismiss', '1');
  sessionStorage.setItem('futty_denuncia_desfecho', '1');
};

async function novoContexto(navegador, extra = {}) {
  const ctx = await navegador.newContext({ ...CONTEXTO, ...extra });
  await ctx.addInitScript(SEM_AVISOS);
  const page = await ctx.newPage();
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
  await page.fill('#email', estado.email);
  await page.fill('#password', senha);
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await page.waitForURL('**/home', { timeout: 60000 });
  return { ctx, page };
}

// Espera o app assentar: sem loader (role=status), fontes prontas, imagens
// carregadas, sem a legenda "Bola parada", e a tela de abertura (1,6 s) já fora.
async function assentar(page, { minimo = 1800 } = {}) {
  const inicio = Date.now();
  for (let tentativa = 0; tentativa < 40; tentativa += 1) {
    await page.waitForTimeout(500);
    const pronto = await page.evaluate(async () => {
      await document.fonts.ready;
      if (document.querySelector('[role="status"]')) return false;
      if (document.body.innerText.includes('Bola parada')) return false;
      const imgs = [...document.images].filter((i) => i.src && !i.hidden);
      return imgs.every((i) => i.complete);
    });
    if (pronto && Date.now() - inicio >= minimo) return;
  }
  console.warn('  ! a tela não assentou em 20 s; capturando mesmo assim');
}

const PROIBIDO = /R\$|€|brilhante|pre[çc]o|comprar|pagar/i;

async function capturar(page, nome) {
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(300);
  const achado = (await page.evaluate(() => document.body.innerText)).match(PROIBIDO);
  if (achado) throw new Error(`${nome}: a tela mostra "${achado[0]}" e não vai para a loja`);
  await page.screenshot({ path: join(CRUAS, `${nome}.png`), type: 'png', animations: 'disabled', caret: 'hide' });
  console.log('✓', `${nome}.png`);
}

mkdirSync(CRUAS, { recursive: true });
const navegador = await chromium.launch();

// Telas comuns: movimento reduzido (o app respeita e tira animações de entrada).
const { ctx, page } = await novoContexto(navegador, { reducedMotion: 'reduce' });

if (quer('inicio')) {
  await page.goto(`${BASE}/home`);
  await page.waitForSelector('.cromo-inicio img[src]', { timeout: 60000 });
  await page.waitForSelector('.gcard', { timeout: 60000 });
  await assentar(page);
  await capturar(page, 'inicio');
}

if (quer('figurinha')) {
  await page.goto(`${BASE}/figurinha`);
  await page.waitForSelector('img.fig-aura[src]', { timeout: 60000 });
  await assentar(page);
  await capturar(page, 'figurinha');
}

if (quer('ranking')) {
  await page.goto(`${BASE}/equipa/${estado.teamSlug}/ranking`);
  await page.waitForSelector('.rank-list .rank-row', { timeout: 60000 });
  await assentar(page);
  // Confete do pódio (canvas-confetti): o canvas some quando a animação acaba.
  await page.waitForFunction(() => !document.querySelector('canvas'), null, { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(500);
  await capturar(page, 'ranking');
}

if (quer('resenha')) {
  await page.goto(`${BASE}/feed`);
  await page.getByText('Sorteio domingo às 8h45').first().waitFor({ timeout: 60000 });
  await assentar(page);
  await capturar(page, 'resenha');
}

if (quer('explorar')) {
  await page.goto(`${BASE}/explorar`);
  await page.getByText('Times abertos').first().waitFor({ timeout: 60000 });
  await page.getByText('Usar minha localização').first().click();
  await page.getByText('Localização ativa').first().waitFor({ timeout: 15000 });
  await assentar(page, { minimo: 4500 }); // o aviso "só neste celular" some
  await capturar(page, 'explorar');
}

if (quer('perfil')) {
  await page.goto(`${BASE}/perfil`);
  await page.getByText('Nome de jogador').first().waitFor({ timeout: 60000 });
  await assentar(page);
  await capturar(page, 'perfil');
}
await ctx.close();

// Sorteio: com movimento, para a cerimônia terminar com as molduras travadas.
// Se em 45 s não acabar, cai para a versão instantânea (movimento reduzido).
if (quer('sorteio')) {
  const url = `${BASE}/equipa/${estado.teamSlug}/jogo/${estado.proximoJogoId}/sorteio`;
  const { ctx: c2, page: p2 } = await novoContexto(navegador, { reducedMotion: 'no-preference' });
  await p2.goto(url);
  let ok = false;
  try {
    await p2.waitForSelector('.saltar.on', { timeout: 60000 });
    await p2.waitForSelector('.partilha.on', { timeout: 45000 });
    await assentar(p2, { minimo: 800 });
    await capturar(p2, 'sorteio');
    ok = true;
  } catch (e) {
    console.warn('  ! cerimônia com movimento não terminou:', e.message);
  }
  await c2.close();
  if (!ok) {
    const { ctx: c3, page: p3 } = await novoContexto(navegador, { reducedMotion: 'reduce' });
    await p3.goto(url);
    await p3.waitForSelector('.smaq .grupos .mmold', { timeout: 60000 });
    await assentar(p3);
    await capturar(p3, 'sorteio');
    await c3.close();
  }
}

await navegador.close();
