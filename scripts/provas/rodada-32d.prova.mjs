// Prova no navegador da Rodada 32D: "Sortear" e "Sortear de novo" abrem a cerimônia SEMPRE no topo. O app não volta ao topo na troca de rota, e quem
// tocava no botão com a página do jogo rolada para baixo chegava à cerimônia rolada — via o meio da máquina, não o começo.
//
// Como: o motor de VERDADE (todas as rotas) sobe num processo à parte por cima de banco, Storage e Auth de mentira, em memória
// (scripts/provas/_motor-32d.cjs → backend/tests/_appFalsa.js; o .env do backend aponta para o único banco, o de produção, e aqui nunca é lido). O app é o
// de verdade, num Chromium; /api/** vai ao motor de mentira, o servidor das telas passa e QUALQUER outro endereço é respondido aqui mesmo (nada sai da
// máquina). Nas duas larguras (390 e 360): a página do jogo rolada até o fim, o toque em "Sortear" (o primeiro sorteio) e, de volta ao jogo e rolado
// até o fim de novo, o toque em "Sortear de novo" + a confirmação. O toque é dado sem rolar a página (o clique do Playwright rolaria o botão para a tela
// e esconderia o defeito). Fotos antes/depois em R32D_FOTOS, se a variável existir.
import { spawn } from 'node:child_process';
import { readFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const nome = 'Rodada 32D · "Sortear" e "Sortear de novo" com a página rolada abrem a cerimônia no topo (motor de verdade, banco falso)';

const RAIZ = fileURLToPath(new URL('../../', import.meta.url));
const MOTOR = path.join(RAIZ, 'scripts', 'provas', '_motor-32d.cjs');
const BACKEND_AO_LADO = path.resolve(RAIZ, '..', 'backend', 'tests', '_appFalsa.js');
const REF = new URL((readFileSync(new URL('../../.env', import.meta.url), 'utf8').match(/^VITE_SUPABASE_URL=(.+)$/m)?.[1] || 'https://prova.supabase.co').trim()).hostname.split('.')[0];
const FOTOS = process.env.R32D_FOTOS || '';

function subirMotor() {
  return new Promise((resolve, reject) => {
    const filho = spawn(process.execPath, [MOTOR], { stdio: ['pipe', 'pipe', 'pipe'], cwd: RAIZ });
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
const CABECALHOS_QUE_NAO_VOLTAM = new Set(['content-encoding', 'content-length', 'transfer-encoding', 'connection', 'keep-alive']);
const CABECALHOS_QUE_NAO_VAO = ['host', 'origin', 'referer', 'if-none-match', 'if-modified-since', 'content-length', 'accept-encoding', 'connection'];

async function aoMotor(route, base) {
  const req = route.request();
  const url = new URL(req.url());
  const origem = req.headers().origin || '*';
  const cors = { 'access-control-allow-origin': origem, 'access-control-allow-credentials': 'true', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' };
  if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
  const cabecalhos = { ...req.headers() };
  for (const h of CABECALHOS_QUE_NAO_VAO) delete cabecalhos[h];
  const corpo = req.postDataBuffer();
  const r = await fetch(`${base}${url.pathname}${url.search}`, { method: req.method(), headers: cabecalhos, body: corpo && !['GET', 'HEAD'].includes(req.method()) ? corpo : undefined, redirect: 'manual' });
  const cabecalhosDaResposta = { ...cors };
  r.headers.forEach((v, k) => { if (!CABECALHOS_QUE_NAO_VOLTAM.has(k) && !k.startsWith('access-control-')) cabecalhosDaResposta[k] = v; });
  return route.fulfill({ status: r.status, headers: cabecalhosDaResposta, body: Buffer.from(await r.arrayBuffer()) });
}

async function abrirContexto(navegador, baseDoVite, dados, quem, largura) {
  const ctx = await navegador.newContext({
    viewport: { width: largura, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'pt-BR', timezoneId: 'America/Sao_Paulo',
    serviceWorkers: 'block',
  });
  const estado = { externos: [], erros: [] };
  await ctx.addInitScript(({ chave, sessao }) => {
    try { localStorage.setItem('futty_cookies', 'aceite'); if (sessao) localStorage.setItem(chave, sessao); } catch { /* sem armazenamento */ }
  }, { chave: `sb-${REF}-auth-token`, sessao: sessaoDe(dados, quem) });
  const origemDoVite = new URL(baseDoVite).host;
  await ctx.route('**/*', async (route) => {
    const url = new URL(route.request().url());
    try {
      if (url.pathname.startsWith('/api/')) return await aoMotor(route, dados.base);
      if (url.host === origemDoVite) return await route.continue();
      estado.externos.push(`${route.request().method()} ${url.host}${url.pathname}`.slice(0, 120));
      return await route.fulfill({ status: 200, contentType: url.pathname.endsWith('.js') ? 'text/javascript' : 'application/json', body: url.pathname.endsWith('.js') ? '' : '{}' });
    } catch { return route.abort().catch(() => {}); }
  });
  await ctx.routeWebSocket((url) => url.host !== origemDoVite, (ws) => ws.close());
  return { ctx, estado };
}

/** Rola a página até o fim, como a pessoa faria com o dedo, e devolve até onde rolou. */
async function rolarAteOFim(page) {
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await page.waitForTimeout(400);
  return page.evaluate(() => ({ y: Math.round(window.scrollY), max: Math.round(document.documentElement.scrollHeight - window.innerHeight) }));
}
/** O toque SEM rolar a página: o clique do Playwright traria o botão para a tela (e mudaria a rolagem que a prova quer manter). */
const tocarSemRolar = (page, seletor) => page.locator(seletor).first().evaluate((el) => el.click());

/** Onde a cerimônia abriu: a rolagem da janela e o topo da máquina na tela. */
async function ondeAbriu(page) {
  await page.locator('.smaq').first().waitFor({ timeout: 30000 });
  await page.waitForTimeout(600); // o fade de entrada da página
  return page.evaluate(() => {
    const r = document.querySelector('.smaq').getBoundingClientRect();
    return { y: Math.round(window.scrollY), topoDaMaquina: Math.round(r.top), caminho: window.location.pathname };
  });
}

export async function rodar({ navegador, base, t }) {
  try { readFileSync(BACKEND_AO_LADO); } catch { t('o backend não está ao lado (FUTTY-V2/backend): a prova foi pulada', true); return; }
  const { filho, dados } = await subirMotor();
  const slug = dados.time.slug;
  if (FOTOS) mkdirSync(FOTOS, { recursive: true });
  const foto = async (page, rotulo) => { if (FOTOS) await page.screenshot({ path: path.join(FOTOS, `${rotulo}.png`) }); };

  try {
    for (const [i, largura] of [390, 360].entries()) {
      const r = `${largura} px · `;
      const jogo = dados.jogos[i];
      const { ctx, estado } = await abrirContexto(navegador, base, dados, 'adm', largura);
      const page = await ctx.newPage();
      page.setDefaultTimeout(20000);
      page.on('pageerror', (e) => estado.erros.push(e.message));

      // ── O primeiro "Sortear" ──
      await page.goto(`${base}/time/${slug}/jogo/${jogo}`, { waitUntil: 'domcontentloaded' });
      await page.locator('[data-escolha="sortear"]').waitFor({ timeout: 40000 });
      await page.waitForTimeout(900);
      const antes1 = await rolarAteOFim(page);
      t(`${r}antes do "Sortear": a página do jogo está rolada até o fim (${antes1.y} px)`, antes1.y > 200 && antes1.y >= antes1.max - 2, JSON.stringify(antes1));
      await foto(page, `1-antes-sortear-${largura}`);
      await tocarSemRolar(page, '[data-escolha="sortear"]');
      const depois1 = await ondeAbriu(page);
      t(`${r}"Sortear": a cerimônia abre no topo (janela em 0, topo da máquina na tela)`, depois1.y === 0 && depois1.topoDaMaquina >= 0 && depois1.topoDaMaquina < 200 && depois1.caminho.endsWith('/sorteio'), JSON.stringify(depois1));
      await foto(page, `2-depois-sortear-${largura}`);

      // ── De volta ao jogo: "Sortear de novo", lá embaixo ──
      await page.goBack();
      await page.locator('[data-trocar="sortear"]').waitFor({ timeout: 30000 });
      await page.waitForTimeout(900);
      const antes2 = await rolarAteOFim(page);
      t(`${r}antes do "Sortear de novo": a página do jogo está rolada até o fim (${antes2.y} px)`, antes2.y > 200 && antes2.y >= antes2.max - 2, JSON.stringify(antes2));
      await tocarSemRolar(page, '[data-trocar="sortear"]');
      // A confirmação fica ACIMA dos times, longe do link: a página rola (suave) até ela aparecer inteira — e continua bem rolada para baixo.
      const confirmar = page.locator('button:not([data-trocar])', { hasText: /^Sortear de novo$/ });
      await confirmar.first().waitFor();
      const caixa = async () => page.evaluate(() => {
        const b = document.querySelector('[data-confirmar-trocar-times]')?.getBoundingClientRect();
        return { y: Math.round(window.scrollY), topo: b ? Math.round(b.top) : null, base: b ? Math.round(b.bottom) : null, altura: window.innerHeight };
      });
      let naConfirmacao = await caixa();
      for (let k = 0; k < 33 && !(naConfirmacao.topo >= 0 && naConfirmacao.base <= naConfirmacao.altura); k += 1) {
        await page.waitForTimeout(150);
        naConfirmacao = await caixa();
      }
      await page.waitForTimeout(400);
      naConfirmacao = await caixa();
      await foto(page, `3-antes-sortear-de-novo-${largura}`);
      t(`${r}tocar em "Sortear de novo" lá embaixo leva a confirmação até a tela (inteira)`, naConfirmacao.topo >= 0 && naConfirmacao.base <= naConfirmacao.altura, JSON.stringify(naConfirmacao));
      t(`${r}…e a página continua rolada para baixo (${naConfirmacao.y} px) quando a pessoa confirma`, naConfirmacao.y > 200, JSON.stringify(naConfirmacao));
      await confirmar.first().evaluate((el) => el.click());
      const depois2 = await ondeAbriu(page);
      t(`${r}"Sortear de novo": a cerimônia abre no topo (janela em 0, topo da máquina na tela)`, depois2.y === 0 && depois2.topoDaMaquina >= 0 && depois2.topoDaMaquina < 200 && depois2.caminho.endsWith('/sorteio'), JSON.stringify(depois2));
      await foto(page, `4-depois-sortear-de-novo-${largura}`);

      const rodada = await (await fetch(`${dados.base}/api/games/${jogo}`, { headers: { authorization: `Bearer ${dados.tokens.adm}` } })).json();
      t(`${r}o motor guardou os dois sorteios (o de novo é o 2º)`, rodada?.game?.times_resultado?.registro?.sorteios === 2, JSON.stringify(rodada?.game?.times_resultado?.registro || null));
      t(`${r}sem erro de página`, estado.erros.length === 0, estado.erros.slice(0, 3).join(' | '));
      await ctx.close();
    }
  } finally {
    const rede = await encerrarMotor(filho);
    t('o motor falso não tentou sair da máquina (rede fechada)', Array.isArray(rede) && rede.length === 0, `tentativas: ${JSON.stringify(rede)}`);
  }
}
