// Prova no navegador da Rodada 31G — a loja fácil de achar, a 390 e a 360 px:
//   · o botão "Loja" no topo da Figurinha, sempre à vista, para todo mundo, em todo estado;
//   · o cartão "Loja de figurinhas" no corpo da Figurinha, sempre presente: sem figurinha, com figurinha e gerações, com figurinha e sem gerações,
//     dono e não dono, com loja ("Comprar · preço") e sem loja ("Pedir"), com o pacote já ativo (presente) e sem a loja ("O time já tem o pacote.");
//   · o cartão "Figurinhas pro time todo" no Início: o dono vê, o jogador comum não, o X esconde por 7 dias (e volta passados os 7), e com o
//     armazenamento do aparelho recusando o X ainda esconde a tela atual.
// Mesma bancada das provas da loja: o app de verdade num Chromium que se declara iOS, o motor de VERDADE por cima de banco falso
// (scripts/provas/_motor-loja.cjs) e o SDK do RevenueCat de mentira. Nada sai da máquina.
//
// Uso: npm run provar:navegador -- rodada-31g      (~5 min)
//      R31G_FOTOS=pasta  salva a foto de cada passo
import { spawn } from 'node:child_process';
import { mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const nome = 'Rodada 31G · a loja fácil de achar: botão no topo, cartão na Figurinha e cartão do pacote no Início (motor de verdade, nada sai da máquina)';

const RAIZ = fileURLToPath(new URL('../../', import.meta.url));
const MOTOR = path.join(RAIZ, 'scripts', 'provas', '_motor-loja.cjs');
const BACKEND_AO_LADO = path.resolve(RAIZ, '..', 'backend', 'tests', '_appFalsa.js');
const REF = new URL((readFileSync(new URL('../../.env', import.meta.url), 'utf8').match(/^VITE_SUPABASE_URL=(.+)$/m)?.[1] || 'https://prova.supabase.co').trim()).hostname.split('.')[0];
const FOTOS = process.env.R31G_FOTOS || '';
const IMAGEM_DE_MENTIRA = readFileSync(path.join(RAIZ, 'public', 'avatares', 'exemplo-brilhante.webp'));
const CHAVE_DO_X = 'futty_agora_nao_pacote-no-inicio';

// O SDK do RevenueCat de mentira: as ofertas de sempre (Minha US$ 2,99 e Pacote US$ 12,99).
const SDK_DE_MENTIRA = `
const produto = (identifier, priceString, price) => ({ identifier, priceString, price, currencyCode: 'USD' });
const pacote = (identifier, p) => ({ identifier, packageType: 'CUSTOM', presentedOfferingContext: { offeringIdentifier: 'default', placementIdentifier: null, targetingContext: null }, product: p });
export const Purchases = {
  configure: async () => ({}),
  logIn: async () => ({ customerInfo: { nonSubscriptionTransactions: [] } }),
  logOut: async () => ({}),
  setAttributes: async () => ({}),
  restorePurchases: async () => ({ customerInfo: { nonSubscriptionTransactions: [] } }),
  getOfferings: async () => ({ current: { identifier: 'default', availablePackages: [
    pacote('minha', produto('futty_minha', 'US$ 2,99', 2.99)),
    pacote('pacote', produto('futty_pacote', 'US$ 12,99', 12.99)),
  ] }, all: {} }),
  getProducts: async () => ({ products: [] }),
  purchasePackage: async () => { throw Object.assign(new Error('recusada'), { code: '1', userCancelled: true }); },
  purchaseStoreProduct: async () => { throw Object.assign(new Error('recusada'), { code: '1', userCancelled: true }); },
};
export default Purchases;
`;

function nativoDeMentira() {
  window.webkit = { messageHandlers: { bridge: { postMessage(msg) {
    const m = typeof msg === 'string' ? JSON.parse(msg) : msg;
    setTimeout(() => { try { window.Capacitor.fromNative({ callbackId: m.callbackId, pluginId: m.pluginId, methodName: m.methodName, save: false, success: true, data: {} }); } catch { /* sem ponte */ } }, 0);
  } } } };
}

function subirMotor(flags = {}) {
  return new Promise((resolve, reject) => {
    const filho = spawn(process.execPath, [MOTOR], { stdio: ['pipe', 'pipe', 'pipe'], cwd: RAIZ, env: { ...process.env, ...flags } });
    let saida = '';
    let erro = '';
    const prazo = setTimeout(() => { filho.kill(); reject(new Error(`o motor falso não ficou pronto em 120 s\n${erro.slice(-700)}`)); }, 120000);
    filho.stderr.on('data', (d) => { erro += d; });
    filho.stdout.on('data', (d) => {
      saida += d;
      const linha = saida.split('\n').find((l) => l.startsWith('{"pronto"'));
      if (linha) { clearTimeout(prazo); resolve({ filho, dados: JSON.parse(linha) }); }
    });
    filho.once('exit', (codigo) => { clearTimeout(prazo); reject(new Error(`o motor falso saiu com ${codigo}\n${erro.slice(-900)}`)); });
  });
}
function encerrarMotor(filho) {
  return new Promise((resolve) => {
    let saida = '';
    const acabou = (rede) => { clearTimeout(prazo); try { filho.kill(); } catch { /* já saiu */ } resolve(rede); };
    const prazo = setTimeout(() => acabou(null), 8000);
    filho.stdout.on('data', (d) => {
      saida += d;
      const linha = saida.split('\n').find((l) => l.startsWith('{"rede"'));
      if (linha) acabou(JSON.parse(linha).rede);
    });
    filho.once('exit', () => acabou(null));
    try { filho.stdin.write('fim\n'); } catch { acabou(null); }
  });
}

const sessaoDe = (dados, quem) => JSON.stringify({
  access_token: dados.tokens[quem], refresh_token: 'prova', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 86400 * 30,
  user: { id: dados.pessoas[quem].id, aud: 'authenticated', email: 'prova@futty.test', app_metadata: {}, user_metadata: { onboarding_completo: true }, created_at: '2026-01-01T00:00:00Z' },
});
const NAO_VOLTAM = new Set(['content-encoding', 'content-length', 'transfer-encoding', 'connection', 'keep-alive']);
const NAO_VAO = ['host', 'origin', 'referer', 'if-none-match', 'if-modified-since', 'content-length', 'accept-encoding', 'connection'];

async function aoMotor(route, base) {
  const req = route.request();
  const url = new URL(req.url());
  const cors = { 'access-control-allow-origin': req.headers().origin || '*', 'access-control-allow-credentials': 'true', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' };
  if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
  const cabecalhos = { ...req.headers() };
  for (const h of NAO_VAO) delete cabecalhos[h];
  const corpo = req.postDataBuffer();
  const r = await fetch(`${base}${url.pathname}${url.search}`, { method: req.method(), headers: cabecalhos, body: corpo && !['GET', 'HEAD'].includes(req.method()) ? corpo : undefined, redirect: 'manual' });
  const saida = { ...cors };
  r.headers.forEach((v, k) => { if (!NAO_VOLTAM.has(k) && !k.startsWith('access-control-')) saida[k] = v; });
  return route.fulfill({ status: r.status, headers: saida, body: Buffer.from(await r.arrayBuffer()) });
}

/** Um celular novo para uma pessoa. `extras` = scripts que rodam antes da página (ex.: o armazenamento que recusa gravar). */
async function abrirContexto(navegador, baseDoVite, dados, quem, largura, extras = []) {
  const ctx = await navegador.newContext({
    viewport: { width: largura, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'pt-BR', timezoneId: 'America/Sao_Paulo',
    serviceWorkers: 'block', reducedMotion: 'reduce',
  });
  const estado = { externos: [], erros: [] };
  await ctx.addInitScript(nativoDeMentira);
  // A estreia (1ª visita à Figurinha) é outra prova: aqui o estúdio de sempre.
  await ctx.addInitScript(({ chave, sessao }) => {
    try { localStorage.setItem('futty_cookies', 'aceite'); localStorage.setItem('futty_figurinha_estreia', '1'); localStorage.setItem(chave, sessao); } catch { /* sem armazenamento */ }
  }, { chave: `sb-${REF}-auth-token`, sessao: sessaoDe(dados, quem) });
  for (const e of extras) await ctx.addInitScript(e);
  const origemDoVite = new URL(baseDoVite).host;
  await ctx.route('**/*', async (route) => {
    const url = new URL(route.request().url());
    try {
      if (url.pathname.startsWith('/api/')) return await aoMotor(route, dados.base);
      if (url.host === origemDoVite) {
        if (/purchases-capacitor/.test(url.pathname) && /\.js$/.test(url.pathname)) return await route.fulfill({ status: 200, contentType: 'text/javascript', body: SDK_DE_MENTIRA });
        return await route.continue();
      }
      estado.externos.push(`${route.request().method()} ${url.host}${url.pathname}`.slice(0, 120));
      if (/\.(png|webp|jpe?g)$/.test(url.pathname) || url.pathname.includes('/storage/v1/')) return await route.fulfill({ status: 200, contentType: 'image/webp', body: IMAGEM_DE_MENTIRA });
      return await route.fulfill({ status: 200, contentType: url.pathname.endsWith('.js') ? 'text/javascript' : 'application/json', body: url.pathname.endsWith('.js') ? '' : '{}' });
    } catch { return route.abort().catch(() => {}); }
  });
  await ctx.routeWebSocket((url) => url.host !== origemDoVite, (ws) => ws.close());
  return { ctx, estado };
}

const texto = (page) => page.evaluate(() => document.body.innerText.replace(/\s+/g, ' '));

/** O que a Figurinha mostra da loja: o botão do topo, o cartão e os botões dele, e se algo estoura a tela ou o próprio botão. */
const lerFigurinha = (page) => page.evaluate(() => {
  const retangulo = (e) => { const r = e.getBoundingClientRect(); return { esq: r.left, dir: r.right, topo: r.top, base: r.bottom, altura: r.height }; };
  const topo = document.querySelector('[data-botao-loja]');
  const marca = [...document.querySelectorAll('.app-topbar span')].find((e) => /^FIGURINHA$/.test(e.textContent.trim()));
  const cartoes = [...document.querySelectorAll('[data-cartao-loja]')];
  const cartao = cartoes[0] || null;
  const botoes = cartao ? [...cartao.querySelectorAll('button')].map((b) => ({
    texto: b.innerText.trim(), produto: b.dataset.lojaComprar || null, presente: b.dataset.convitePacote || null, habilitado: !b.disabled,
    cortado: b.scrollWidth > b.clientWidth + 1 || b.scrollHeight > b.clientHeight + 1, dentro: b.getBoundingClientRect().right <= window.innerWidth && b.getBoundingClientRect().left >= 0,
  })) : [];
  return {
    topo: topo ? { texto: topo.innerText.trim(), href: topo.getAttribute('href'), ...retangulo(topo), icone: !!topo.querySelector('svg') } : null,
    marcaDir: marca ? marca.getBoundingClientRect().right : null,
    larguraDaTela: window.innerWidth,
    cartoes: cartoes.length,
    cartao: cartao ? { texto: cartao.innerText.replace(/\s+/g, ' '), ...retangulo(cartao), produtos: [...cartao.querySelectorAll('[data-loja-produto]')].map((e) => e.dataset.lojaProduto), exemplo: !!cartao.querySelector('img') } : null,
    botoes,
    comprarMais: !!document.querySelector('[data-comprar-mais]'),
    restam: (document.body.innerText.match(/Restam? \d+ gerações?|Resta 1 geração/) || [null])[0],
    lateral: document.documentElement.scrollWidth > window.innerWidth,
  };
});

export async function rodar({ navegador, base, t }) {
  try { readFileSync(BACKEND_AO_LADO); } catch { t('o backend não está ao lado (FUTTY-V2/backend): a prova foi pulada', true); return; }
  if (FOTOS) mkdirSync(FOTOS, { recursive: true });
  const foto = async (page, rotulo, alvo = null) => {
    if (!FOTOS) return;
    await page.waitForTimeout(500);
    // O alvo sobe para logo abaixo do topo: a barra de baixo (fixa) não pode cobrir o fim do cartão na foto.
    if (alvo) await page.locator(alvo).first().evaluate((e) => window.scrollTo(0, e.getBoundingClientRect().top + window.scrollY - 66));
    await page.waitForTimeout(250);
    await page.screenshot({ path: path.join(FOTOS, `${rotulo}.png`) });
  };
  const abrir = async (cena, caminho, esperar) => {
    const page = await cena.ctx.newPage();
    page.on('pageerror', (e) => { if (!/plugin is not implemented/.test(e.message)) cena.estado.erros.push(e.message); });
    await page.goto(`${base}${caminho}`, { waitUntil: 'domcontentloaded' });
    await esperar(page);
    await page.waitForTimeout(1200);
    return page;
  };
  const esperaFigurinha = (page) => page.locator('[data-loja-produto="minha"], [data-loja-comprar="ver"]').first().waitFor({ timeout: 40000 });

  /**
   * Um caso da Figurinha: quem abre, o que o botão do topo e o cartão têm de mostrar.
   * esperado = { produtos: ['minha', 'pacote'], botoes: [texto, …], contem: [texto…], naoContem: [regex…], restam }
   */
  async function casoFigurinha({ dados, quem, largura, rotulo, esperado }) {
    const r = `${largura} px · ${rotulo}`;
    const cena = await abrirContexto(navegador, base, dados, quem, largura);
    const page = await abrir(cena, '/figurinha', esperaFigurinha);
    const f = await lerFigurinha(page);
    t(`${r} · o botão "Loja" está no topo, com o ícone, e leva a /planos`, !!f.topo && f.topo.texto === 'Loja' && f.topo.icone && f.topo.href === '/planos', JSON.stringify(f.topo));
    t(`${r} · o botão "Loja" cabe na tela (≥ 8 px da borda), fica à direita da marca e tem o tamanho de um toque`, !!f.topo && f.topo.dir <= f.larguraDaTela - 8 && f.topo.esq > f.marcaDir && f.topo.altura >= 30, JSON.stringify({ topo: f.topo, marca: f.marcaDir }));
    t(`${r} · existe UM cartão "Loja de figurinhas" (nada duplicado)`, f.cartoes === 1 && /Loja de figurinhas/.test(f.cartao?.texto || ''), `${f.cartoes} cartões`);
    t(`${r} · o cartão tem os produtos esperados: ${esperado.produtos.join(' + ')}`, JSON.stringify(f.cartao?.produtos) === JSON.stringify(esperado.produtos), JSON.stringify(f.cartao?.produtos));
    t(`${r} · os botões do cartão: ${esperado.botoes.map((b) => `"${b}"`).join(' e ') || 'nenhum'}`, JSON.stringify(f.botoes.map((b) => b.texto)) === JSON.stringify(esperado.botoes), JSON.stringify(f.botoes.map((b) => b.texto)));
    t(`${r} · os botões estão habilitados, inteiros (nada cortado) e dentro da tela`, f.botoes.every((b) => b.habilitado && !b.cortado && b.dentro), JSON.stringify(f.botoes));
    for (const trecho of esperado.contem || []) t(`${r} · o cartão diz "${trecho}"`, (f.cartao?.texto || '').includes(trecho), f.cartao?.texto);
    for (const proibido of esperado.naoContem || []) t(`${r} · o cartão NÃO diz ${proibido}`, !proibido.test(f.cartao?.texto || ''), f.cartao?.texto);
    t(`${r} · não há o link solto "Comprar mais gerações" (o cartão logo abaixo é o caminho)`, f.comprarMais === false);
    if (esperado.restam !== undefined) t(`${r} · o contador diz ${esperado.restam ? `"${esperado.restam}"` : 'nada (sem gerações)'}`, (f.restam || null) === esperado.restam, String(f.restam));
    if (esperado.exemplo !== undefined) t(`${r} · ${esperado.exemplo ? 'com' : 'sem'} a imagem de exemplo no cartão`, f.cartao?.exemplo === esperado.exemplo);
    t(`${r} · o cartão cabe na largura e a tela não rola para o lado`, !!f.cartao && f.cartao.esq >= 0 && f.cartao.dir <= f.larguraDaTela && !f.lateral, JSON.stringify({ cartao: f.cartao && [f.cartao.esq, f.cartao.dir], lateral: f.lateral }));
    if (esperado.sem) for (const proibido of esperado.sem) t(`${r} · a tela inteira NÃO diz ${proibido}`, !proibido.test(await texto(page)), (await texto(page)).slice(0, 300));
    await foto(page, `topo-${rotulo.replace(/\W+/g, '-')}-${largura}`);
    await foto(page, `cartao-${rotulo.replace(/\W+/g, '-')}-${largura}`, '[data-cartao-loja]');
    t(`${r} · sem erro de página`, cena.estado.erros.length === 0, cena.estado.erros.join(' | '));
    await cena.ctx.close();
    return f;
  }

  const MUNDOS = [
    {
      id: 'loja-sem-figurinha',
      nome: 'loja ligada · sem figurinha',
      flags: { LOJA_ABERTA: '1' },
      casos: [
        { quem: 'adm', rotulo: 'dono, sem figurinha, loja ligada', esperado: { produtos: ['minha', 'pacote'], botoes: ['Comprar · US$ 2,99', 'Comprar para o meu time · US$ 12,99'], contem: ['Minha Figurinha', 'Pacote do time', 'Sua foto vira uma figurinha de verdade'], exemplo: true } },
        { quem: 'ze', rotulo: 'não dono, sem figurinha, loja ligada', esperado: { produtos: ['minha'], botoes: ['Comprar · US$ 2,99'], contem: ['Minha Figurinha'], naoContem: [/Pacote do time/, /Comprar para o/], exemplo: true } },
      ],
    },
    {
      id: 'loja-com-geracoes',
      nome: 'loja ligada · com figurinha e gerações',
      flags: { LOJA_ABERTA: '1', LOJA_FIGURINHA: '1', LOJA_CREDITOS: '1' },
      casos: [
        { quem: 'adm', rotulo: 'dono, com figurinha e 3 gerações', esperado: { produtos: ['minha', 'pacote'], botoes: ['Comprar · US$ 2,99', 'Comprar para o meu time · US$ 12,99'], contem: ['Mais gerações para pintar uniformes novos'], exemplo: false, restam: 'Restam 3 gerações' } },
        { quem: 'ze', rotulo: 'não dono, com 2 gerações e sem figurinha', esperado: { produtos: ['minha'], botoes: ['Comprar · US$ 2,99'], naoContem: [/Pacote do time/], restam: 'Restam 2 gerações' } },
      ],
    },
    {
      id: 'loja-sem-geracoes',
      nome: 'loja ligada · com figurinha, sem gerações',
      flags: { LOJA_ABERTA: '1', LOJA_FIGURINHA: '1' },
      casos: [
        { quem: 'adm', rotulo: 'dono, com figurinha e sem gerações', esperado: { produtos: ['minha', 'pacote'], botoes: ['Comprar · US$ 2,99', 'Comprar para o meu time · US$ 12,99'], exemplo: false, restam: null } },
      ],
    },
    {
      id: 'loja-pacote-ativo',
      nome: 'loja ligada · time com o pacote',
      flags: { LOJA_ABERTA: '1', LOJA_PACOTE_ATIVO: '1', LOJA_PACOTE_ESGOTADO: '1' },
      casos: [
        { quem: 'adm', rotulo: 'dono, pacote ativo, gerações gastas', esperado: { produtos: ['minha', 'pacote'], botoes: ['Comprar · US$ 2,99', 'Comprar para o time · US$ 12,99'], contem: ['Mais figurinhas pro seu time', 'Presenteie o time: +2 gerações para cada jogador.'], naoContem: [/Já é seu/], sem: [/Já é seu/] } },
        { quem: 'ze', rotulo: 'não dono, time com o pacote', esperado: { produtos: ['minha'], botoes: ['Comprar · US$ 2,99'], naoContem: [/Pacote do time/, /Presenteie/] } },
      ],
    },
    {
      id: 'sem-loja',
      nome: 'sem loja · pedido de ativação',
      flags: { LOJA_SEM_TESTER: '1' },
      casos: [
        { quem: 'adm', rotulo: 'dono, sem loja', esperado: { produtos: ['minha', 'pacote'], botoes: ['Pedir a minha · 10 gerações', 'Pedir ativação para o meu time'], naoContem: [/Comprar/, /US\$/], sem: [/US\$/] } },
        { quem: 'ze', rotulo: 'não dono, sem loja', esperado: { produtos: ['minha'], botoes: ['Pedir a minha · 10 gerações'], naoContem: [/Comprar/, /Pacote do time/] } },
      ],
    },
    {
      id: 'sem-loja-pacote-ativo',
      nome: 'sem loja · time com o pacote',
      flags: { LOJA_SEM_TESTER: '1', LOJA_PACOTE_ATIVO: '1', LOJA_PACOTE_ESGOTADO: '1' },
      casos: [
        { quem: 'adm', rotulo: 'dono, sem loja, pacote ativo', esperado: { produtos: ['minha', 'pacote'], botoes: ['Pedir a minha · 10 gerações'], contem: ['O time já tem o pacote.'], naoContem: [/Comprar/, /Pedir ativação/] } },
      ],
    },
  ];

  for (const mundo of MUNDOS) {
    const { filho, dados } = await subirMotor(mundo.flags);
    try {
      for (const caso of mundo.casos) {
        for (const largura of [390, 360]) await casoFigurinha({ dados, largura, ...caso });
      }
      if (mundo.id === 'loja-sem-figurinha') {
        // O botão do topo leva de verdade aos Planos, e lá a loja aparece
        const cena = await abrirContexto(navegador, base, dados, 'ze', 390);
        const page = await abrir(cena, '/figurinha', esperaFigurinha);
        await page.locator('[data-botao-loja]').click();
        await page.waitForURL('**/planos', { timeout: 15000 });
        await page.getByText('Comprar · US$ 2,99').first().waitFor({ timeout: 30000 });
        t('tocar em "Loja" abre os Planos, onde a compra está ("Comprar · US$ 2,99")', /\/planos$/.test(new URL(page.url()).pathname));
        await cena.ctx.close();
        // …e o botão do topo continua lá na tela da estreia (1ª visita, sem foto)
        const nova = await navegador.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'pt-BR', serviceWorkers: 'block', reducedMotion: 'reduce' });
        await nova.addInitScript(nativoDeMentira);
        await nova.addInitScript(({ chave, sessao }) => { try { localStorage.setItem('futty_cookies', 'aceite'); localStorage.setItem(chave, sessao); } catch { /* sem armazenamento */ } }, { chave: `sb-${REF}-auth-token`, sessao: sessaoDe(dados, 'ze') });
        const origemDoVite = new URL(base).host;
        await nova.route('**/*', async (route) => {
          const url = new URL(route.request().url());
          try {
            if (url.pathname.startsWith('/api/')) return await aoMotor(route, dados.base);
            if (url.host === origemDoVite) return await route.continue();
            return await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
          } catch { return route.abort().catch(() => {}); }
        });
        await nova.routeWebSocket((url) => url.host !== origemDoVite, (ws) => ws.close());
        const estreia = await nova.newPage();
        await estreia.goto(`${base}/figurinha`, { waitUntil: 'domcontentloaded' });
        await estreia.getByText('Seu card está quase pronto').waitFor({ timeout: 40000 });
        t('na estreia da Figurinha (1ª visita) o botão "Loja" também está no topo', (await estreia.locator('[data-botao-loja]').count()) === 1);
        await foto(estreia, 'estreia-390');
        await nova.close();
      }
    } finally {
      const rede = await encerrarMotor(filho);
      t(`mundo "${mundo.nome}" · o motor falso não tentou sair da máquina`, Array.isArray(rede) && rede.length === 0, JSON.stringify(rede));
    }
  }

  // ── O Início: "Figurinhas pro time todo" ──
  const lerInicio = (page) => page.evaluate(() => {
    const c = document.querySelector('[data-cartao-pacote-inicio]');
    if (!c) return { achou: false, lateral: document.documentElement.scrollWidth > window.innerWidth };
    const r = c.getBoundingClientRect();
    const botao = c.querySelector('a[href^="/planos"]');
    const x = c.querySelector('[data-fechar-pacote]');
    const rx = x?.getBoundingClientRect();
    const titulo = [...c.querySelectorAll('span')].find((e) => e.textContent.trim() === 'Figurinhas pro time todo');
    const antes = c.previousElementSibling?.getBoundingClientRect();
    return {
      achou: true,
      tituloEmUmaLinha: !!titulo && titulo.getBoundingClientRect().height < 22,
      folgaDeCima: antes ? r.top - antes.bottom : null,
      texto: c.innerText.replace(/\s+/g, ' '),
      href: botao?.getAttribute('href') || null,
      esq: r.left, dir: r.right, larguraDaTela: window.innerWidth,
      x: x ? { rotulo: x.getAttribute('aria-label'), icone: !!x.querySelector('svg'), largura: rx.width, altura: rx.height, dentro: rx.right <= window.innerWidth } : null,
      lateral: document.documentElement.scrollWidth > window.innerWidth,
    };
  });
  const esperaInicio = (page) => page.locator('.games-label').first().waitFor({ timeout: 40000 });

  for (const [rotulo, flags, linha] of [
    ['sem o pacote', { LOJA_ABERTA: '1' }, '2 gerações para cada jogador, até 25.'],
    ['com o pacote', { LOJA_ABERTA: '1', LOJA_PACOTE_ATIVO: '1' }, 'Presenteie o time: +2 gerações para cada jogador.'],
  ]) {
    const { filho, dados } = await subirMotor(flags);
    try {
      for (const largura of [390, 360]) {
        const r = `${largura} px · Início, time ${rotulo}`;
        // O dono vê
        const dono = await abrirContexto(navegador, base, dados, 'adm', largura);
        const page = await abrir(dono, '/home', esperaInicio);
        await page.locator('[data-cartao-pacote-inicio]').first().waitFor({ timeout: 20000 }).catch(() => {});
        const c = await lerInicio(page);
        t(`${r} · o dono vê o cartão "Figurinhas pro time todo"`, c.achou && /Figurinhas pro time todo/.test(c.texto || ''), JSON.stringify(c));
        t(`${r} · a linha diz "${linha}"`, (c.texto || '').includes(linha), c.texto);
        t(`${r} · o botão leva a /planos?destaque=pacote`, c.href === '/planos?destaque=pacote', String(c.href));
        t(`${r} · o X é um botão "Esconder o convite do pacote" com ícone, de toque ≥ 32 px, dentro da tela`, !!c.x && c.x.rotulo === 'Esconder o convite do pacote' && c.x.icone && c.x.largura >= 32 && c.x.altura >= 32 && c.x.dentro, JSON.stringify(c.x));
        t(`${r} · o título "Figurinhas pro time todo" fica numa linha só`, c.tituloEmUmaLinha === true, JSON.stringify(c.tituloEmUmaLinha));
        t(`${r} · o cartão tem respiro (≥ 8 px) do bloco de cima`, c.folgaDeCima === null || c.folgaDeCima >= 8, String(c.folgaDeCima));
        t(`${r} · o cartão cabe na largura e a tela não rola para o lado`, c.achou && c.esq >= 0 && c.dir <= c.larguraDaTela && !c.lateral, JSON.stringify({ esq: c.esq, dir: c.dir, lateral: c.lateral }));
        await foto(page, `inicio-dono-${rotulo.replace(/\W+/g, '-')}-${largura}`, '[data-cartao-pacote-inicio]');
        if (rotulo === 'sem o pacote') {
          // O X esconde, e continua escondido depois de recarregar
          await page.locator('[data-fechar-pacote]').click();
          await page.waitForTimeout(300);
          t(`${r} · o X esconde o cartão`, (await page.locator('[data-cartao-pacote-inicio]').count()) === 0);
          const guardado = await page.evaluate((k) => localStorage.getItem(k), CHAVE_DO_X);
          t(`${r} · o X guarda a hora no aparelho (localStorage)`, Number.isFinite(Number(guardado)) && Math.abs(Date.now() - Number(guardado)) < 120000, String(guardado));
          await foto(page, `inicio-dono-fechado-${largura}`);
          await page.reload({ waitUntil: 'domcontentloaded' });
          await esperaInicio(page);
          await page.waitForTimeout(1500);
          t(`${r} · recarregar a tela NÃO traz o cartão de volta (7 dias)`, (await page.locator('[data-cartao-pacote-inicio]').count()) === 0);
          // Passados 7 dias, volta
          await page.evaluate((k) => localStorage.setItem(k, String(Date.now() - 8 * 24 * 3600 * 1000)), CHAVE_DO_X);
          await page.reload({ waitUntil: 'domcontentloaded' });
          await esperaInicio(page);
          await page.locator('[data-cartao-pacote-inicio]').first().waitFor({ timeout: 20000 }).catch(() => {});
          t(`${r} · com o X de 8 dias atrás o cartão volta`, (await page.locator('[data-cartao-pacote-inicio]').count()) === 1);
          await page.evaluate((k) => localStorage.setItem(k, String(Date.now() - 6 * 24 * 3600 * 1000)), CHAVE_DO_X);
          await page.reload({ waitUntil: 'domcontentloaded' });
          await esperaInicio(page);
          await page.waitForTimeout(1500);
          t(`${r} · com o X de 6 dias atrás o cartão segue escondido`, (await page.locator('[data-cartao-pacote-inicio]').count()) === 0);
        }
        t(`${r} · sem erro de página (dono)`, dono.estado.erros.length === 0, dono.estado.erros.join(' | '));
        await dono.ctx.close();

        if (rotulo === 'sem o pacote') {
          // O jogador comum NÃO vê
          const comum = await abrirContexto(navegador, base, dados, 'ze', largura);
          const p2 = await abrir(comum, '/home', esperaInicio);
          await p2.waitForTimeout(1500);
          t(`${r} · o jogador comum NÃO vê o cartão`, (await p2.locator('[data-cartao-pacote-inicio]').count()) === 0 && !/Figurinhas pro time todo/.test(await texto(p2)));
          await foto(p2, `inicio-jogador-${largura}`);
          t(`${r} · sem erro de página (jogador)`, comum.estado.erros.length === 0, comum.estado.erros.join(' | '));
          await comum.ctx.close();

          // O aparelho recusa guardar: o X ainda esconde a tela atual (e nada quebra)
          const recusa = () => { Storage.prototype.setItem = function setItemRecusado(k) { if (/futty_agora_nao_/.test(k)) throw new Error('QuotaExceededError'); return undefined; }; };
          const bloqueado = await abrirContexto(navegador, base, dados, 'adm', largura, [recusa]);
          const p3 = await abrir(bloqueado, '/home', esperaInicio);
          await p3.locator('[data-cartao-pacote-inicio]').first().waitFor({ timeout: 20000 });
          await p3.locator('[data-fechar-pacote]').click();
          await p3.waitForTimeout(300);
          t(`${r} · com o armazenamento recusando, o X ainda esconde o cartão (sem erro)`, (await p3.locator('[data-cartao-pacote-inicio]').count()) === 0 && bloqueado.estado.erros.length === 0, bloqueado.estado.erros.join(' | '));
          await bloqueado.ctx.close();
        }
      }
    } finally {
      const rede = await encerrarMotor(filho);
      t(`Início, time ${rotulo} · o motor falso não tentou sair da máquina`, Array.isArray(rede) && rede.length === 0, JSON.stringify(rede));
    }
  }
}
