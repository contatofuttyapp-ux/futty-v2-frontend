// Prova no navegador: onde a pessoa NÃO está logada (página pública do sorteio, link curto, página pública do campeonato, convite) e nos cartões 9:16 que
// vão para o WhatsApp, aparece o APELIDO — nunca o nome completo. Em 360 e 390 px, sem rolar para o lado.
//
// Como: o motor de VERDADE (todas as rotas) sobe num processo à parte por cima de banco, Storage e Auth de mentira, em memória
// (scripts/provas/_motor-nomes.cjs → backend/tests/_appFalsa.js; o .env do backend aponta para o único banco, o de produção, e aqui nunca é lido).
// O sorteio gravado imita um jogo ANTIGO (o snapshot guarda o nome completo): a leitura é que tem de trocar pelo apelido. O app é o de verdade, num Chromium;
// todo pedido do navegador passa por aqui: /api/** vai ao motor de mentira, o servidor das telas passa e QUALQUER outro endereço (inclusive o Supabase de
// produção) é respondido vazio sem sair da máquina — e anotado.
//
// Os cartões 9:16 são pintados num <canvas> (nada de texto no DOM): a prova grava todo texto que o app manda ao canvas (fillText) e confere esse texto.
//
// Uso: npm run provar:navegador -- nomes-publicos      (~1 min)
//      NOMES_FOTOS=pasta  salva a foto e o texto de cada tela
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const nome = 'Nomes públicos: o apelido, nunca o nome completo, onde ninguém está logado e nos cartões 9:16 (motor de verdade, banco falso, nada sai da máquina)';

const RAIZ = fileURLToPath(new URL('../../', import.meta.url));
const MOTOR = path.join(RAIZ, 'scripts', 'provas', '_motor-nomes.cjs');
const BACKEND_AO_LADO = path.resolve(RAIZ, '..', 'backend', 'tests', '_appFalsa.js');
const REF = new URL((readFileSync(new URL('../../.env', import.meta.url), 'utf8').match(/^VITE_SUPABASE_URL=(.+)$/m)?.[1] || 'https://prova.supabase.co').trim()).hostname.split('.')[0];
const FOTOS = process.env.NOMES_FOTOS || '';

// O que NÃO pode aparecer (pedaços dos nomes completos) e o que TEM de aparecer (os apelidos; o Roberto não escolheu e sai só pelo primeiro nome).
const PROIBIDOS = ['da Silva', 'Beatriz', 'Alice Pereira', 'Pereira', 'Costa', 'Roberto Carlos', 'Carlos Pereira', 'André Luiz', 'Luiz', 'Fernandes'];
const APELIDOS = ['Aninha', 'Lili', 'Roberto', 'Dedé'];

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

/** Grava todo texto que o app manda ao canvas: os cartões 9:16 não têm texto no DOM. */
function gravarTextoDoCanvas() {
  window.__textos = [];
  for (const metodo of ['fillText', 'strokeText']) {
    const original = CanvasRenderingContext2D.prototype[metodo];
    CanvasRenderingContext2D.prototype[metodo] = function gravado(texto, ...resto) { try { window.__textos.push(String(texto)); } catch { /* sem texto */ } return original.call(this, texto, ...resto); };
  }
}

async function abrirContexto(navegador, motor, dados, quem, largura) {
  const ctx = await navegador.newContext({
    viewport: { width: largura, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true, locale: 'pt-BR', timezoneId: 'America/Sao_Paulo',
    serviceWorkers: 'block', reducedMotion: 'reduce', acceptDownloads: true,
  });
  const estado = { externos: [], erros: [], baixados: 0 };
  await ctx.addInitScript(gravarTextoDoCanvas);
  await ctx.addInitScript(({ chave, sessao }) => {
    try { localStorage.setItem('futty_cookies', 'aceite'); if (sessao) localStorage.setItem(chave, sessao); } catch { /* sem armazenamento */ }
  }, { chave: `sb-${REF}-auth-token`, sessao: quem ? sessaoDe(dados, quem) : null });
  const origemDoVite = new URL(motor.baseDoVite).host;
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

const semCaixa = (s) => s.toLowerCase();

export async function rodar({ navegador, base, t }) {
  try { readFileSync(BACKEND_AO_LADO); } catch { t('o backend não está ao lado (FUTTY-V2/backend): a prova foi pulada', true); return; }
  const { filho, dados } = await subirMotor();
  const motor = { baseDoVite: base };
  const slug = dados.time.slug;
  if (FOTOS) mkdirSync(FOTOS, { recursive: true });
  const salvar = async (page, rotulo, texto) => {
    if (!FOTOS) return;
    const arq = rotulo.replace(/[^\w]+/g, '-').slice(0, 70);
    writeFileSync(path.join(FOTOS, `${arq}.txt`), texto);
    await page.screenshot({ path: path.join(FOTOS, `${arq}.png`), fullPage: true }).catch(() => {});
  };

  try {
    // ── As páginas SEM login, em 360 e 390 ──
    const PUBLICAS = [
      { rotulo: 'Sorteio público', caminho: `/p/${slug}/${dados.jogo.id}`, esperados: APELIDOS },
      { rotulo: 'Sorteio pelo link curto', caminho: `/s/${dados.jogo.codigo}`, esperados: APELIDOS },
      { rotulo: 'Campeonato público', caminho: `/p/campeonato/${slug}/${dados.campeonato.id}`, esperados: ['Time Ouro'] },
      { rotulo: 'Convite', caminho: `/convite/${dados.convite.token}`, esperados: ['Aninha'] },
    ];
    for (const largura of [360, 390]) {
      const cena = await abrirContexto(navegador, motor, dados, null, largura);
      for (const p of PUBLICAS) {
        const page = await cena.ctx.newPage();
        page.on('pageerror', (e) => cena.estado.erros.push(e.message));
        await page.goto(`${base}${p.caminho}`, { waitUntil: 'domcontentloaded' });
        await page.waitForFunction((es) => es.every((e) => document.body.innerText.includes(e)), p.esperados, { timeout: 25000 }).catch(() => {});
        await page.waitForTimeout(1200);
        const lido = await page.evaluate(() => ({ texto: document.body.innerText, largura: document.documentElement.scrollWidth, janela: window.innerWidth, url: location.pathname }));
        const rotulo = `${p.rotulo} · ${largura} px`;
        const faltam = p.esperados.filter((e) => !lido.texto.includes(e));
        t(`${rotulo} · a tela mostra os apelidos (${p.esperados.join(', ')})`, faltam.length === 0, `não apareceu: ${faltam.join(', ')} · a tela tinha: «${lido.texto.replace(/\s+/g, ' ').slice(0, 300)}»`);
        const vazou = PROIBIDOS.filter((x) => semCaixa(lido.texto).includes(semCaixa(x)));
        t(`${rotulo} · nenhum pedaço de nome completo (${vazou.length ? vazou.join(', ') : 'limpa'})`, vazou.length === 0, `apareceu: ${vazou.join(', ')}`);
        t(`${rotulo} · nada rola para o lado`, lido.largura <= lido.janela, `scrollWidth ${lido.largura} > ${lido.janela}`);
        await salvar(page, rotulo, lido.texto);
        await page.close();
      }
      t(`sem login · ${largura} px · nenhum erro de página`, cena.estado.erros.length === 0, cena.estado.erros.slice(0, 3).join(' | '));
      await cena.ctx.close();
    }

    // ── Os cartões 9:16 (canvas), por quem faz parte do time ──
    for (const largura of [360, 390]) {
      const cena = await abrirContexto(navegador, motor, dados, 'm1', largura);
      const page = await cena.ctx.newPage();
      page.on('pageerror', (e) => cena.estado.erros.push(e.message));
      page.on('download', () => { cena.estado.baixados += 1; });
      await page.goto(`${base}/time/${slug}/jogo/${dados.jogo.id}/sorteio`, { waitUntil: 'domcontentloaded' });
      await page.getByRole('button', { name: /Compartilhar os times/ }).first().waitFor({ timeout: 40000 });
      await page.evaluate(() => { window.__textos = []; }); // só o que a geração do cartão desenha
      await page.getByRole('button', { name: /Compartilhar os times/ }).first().click();
      await page.waitForFunction(() => window.__textos.length > 8, null, { timeout: 30000 }).catch(() => {});
      await page.waitForTimeout(2500);
      const textos = await page.evaluate(() => window.__textos);
      const junto = textos.join(' | ');
      const rotulo = `Cartão 9:16 de todos os times · ${largura} px`;
      const faltam = APELIDOS.filter((a) => !semCaixa(junto).includes(semCaixa(a)));
      t(`${rotulo} · o canvas desenhou os apelidos (${textos.length} textos pintados)`, textos.length > 8 && faltam.length === 0, `faltam: ${faltam.join(', ')} · pintado: «${junto.slice(0, 300)}»`);
      const vazou = PROIBIDOS.filter((x) => semCaixa(junto).includes(semCaixa(x)));
      t(`${rotulo} · nenhum pedaço de nome completo no cartão (${vazou.length ? vazou.join(', ') : 'limpo'})`, vazou.length === 0, `desenhou: ${vazou.join(', ')}`);
      if (FOTOS) writeFileSync(path.join(FOTOS, `cartao-9x16-${largura}.txt`), junto);
      // O cartão de um time só (o botão "9:16 · Time …"): mesma regra.
      await page.evaluate(() => { window.__textos = []; });
      await page.getByRole('button', { name: /^9:16 · / }).first().click({ timeout: 8000 }).catch(() => {});
      await page.waitForTimeout(3000);
      const umTime = (await page.evaluate(() => window.__textos)).join(' | ');
      const vazouUm = PROIBIDOS.filter((x) => semCaixa(umTime).includes(semCaixa(x)));
      t(`Cartão 9:16 de um time · ${largura} px · nenhum pedaço de nome completo (${umTime ? 'pintou' : 'não pintou'})`, umTime.length > 0 && vazouUm.length === 0, vazouUm.length ? `desenhou: ${vazouUm.join(', ')}` : 'o botão não pintou nada');
      t(`Cartões · ${largura} px · nenhum erro de página`, cena.estado.erros.length === 0, cena.estado.erros.slice(0, 3).join(' | '));
      await cena.ctx.close();
    }
  } finally {
    const rede = await encerrarMotor(filho);
    t('o motor falso não tentou sair da máquina (rede fechada)', Array.isArray(rede) && rede.length === 0, `tentativas: ${JSON.stringify(rede)}`);
  }
}
