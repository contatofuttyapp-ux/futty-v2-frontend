// Prova no navegador da Rodada 31Q — o Ranking mostra todo mundo desde a entrada no time (decisão do dono). O que só um Chromium de verdade confirma,
// com as MESMAS fontes e o MESMO CSS do app, a 390 e a 360 px:
//   · o Zeca, que entrou no time e ainda não jogou, aparece no Ranking: no fim, com "—" nos pontos e sem pódio (mesmo caindo no 3º lugar), sem
//     quebrar a linha nem rolar para o lado;
//   · dá para dar nota a ele pelo botão Votar, e o motor grava;
//   · ele mesmo se vê na lista ("Você"), sem confete de pódio;
//   · o Pedro, que só organiza o time, não aparece; e nenhum texto fala em "3 jogos".
// Como: o motor de VERDADE (todas as rotas) sobe num processo à parte por cima de banco, Storage e Auth de mentira, em memória
// (scripts/provas/_motor-31q.cjs → backend/tests/_appFalsa.js; o .env do backend aponta para o único banco, o de produção, e aqui nunca é lido). O app é o
// de verdade, num Chromium; /api/** vai ao motor de mentira, o servidor das telas passa e QUALQUER outro endereço é respondido vazio sem sair da máquina.
//
// Uso: npm run provar:navegador -- rodada-31q
//      R31Q_FOTOS=pasta  salva a foto do Ranking (390 e 360)
import { spawn } from 'node:child_process';
import { readFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const nome = 'Rodada 31Q · Ranking desde a entrada no time (motor de verdade, banco falso, nada sai da máquina)';

const RAIZ = fileURLToPath(new URL('../../', import.meta.url));
const MOTOR = path.join(RAIZ, 'scripts', 'provas', '_motor-31q.cjs');
const BACKEND_AO_LADO = path.resolve(RAIZ, '..', 'backend', 'tests', '_appFalsa.js');
const REF = new URL((readFileSync(new URL('../../.env', import.meta.url), 'utf8').match(/^VITE_SUPABASE_URL=(.+)$/m)?.[1] || 'https://prova.supabase.co').trim()).hostname.split('.')[0];
const FOTOS = process.env.R31Q_FOTOS || '';

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
    window.__confetes = 0;
    // O canvas-confetti desenha num <canvas> fixo que ele põe no body: cada um que entra é uma festa.
    new MutationObserver((mudancas) => {
      for (const m of mudancas) for (const n of m.addedNodes) if (n.nodeName === 'CANVAS' && n.style.position === 'fixed') window.__confetes += 1;
    }).observe(document, { childList: true, subtree: true });
    try { localStorage.setItem('futty_cookies', 'aceite'); localStorage.setItem(chave, sessao); } catch { /* sem armazenamento */ }
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

async function lerDoMotor(dados, quem, rota) {
  const r = await fetch(`${dados.base}${rota}`, { headers: { authorization: `Bearer ${dados.tokens[quem]}`, 'x-futty-nota': '10' } }); // como as telas de hoje (nota de 0 a 10)
  return { status: r.status, json: await r.json().catch(() => null) };
}

/** As linhas do Ranking como a tela as mostra. */
const linhas = (page) => page.evaluate(() => [...document.querySelectorAll('.rank-list .rank-row')].map((row) => {
  const b = row.getBoundingClientRect();
  return {
    nome: row.querySelector('.rank-name')?.childNodes[0]?.textContent?.trim() || '',
    pos: row.querySelector('.rank-pos')?.innerText.trim(),
    pontos: row.querySelector('[data-pontos]')?.innerText.trim() ?? null,
    medalha: !!row.querySelector('.rank-medal'),
    heroi: row.classList.contains('rank-row--hero'),
    voce: /você/i.test(row.querySelector('.rank-actions')?.innerText || ''), // innerText segue o text-transform (VOCÊ)
    votar: !!row.querySelector('.rank-actions button'),
    esquerda: b.left, direita: b.right,
  };
}));

export async function rodar({ navegador, base, t }) {
  try { readFileSync(BACKEND_AO_LADO); } catch { t('o backend não está ao lado (FUTTY-V2/backend): a prova foi pulada', true); return; }
  const { filho, dados } = await subirMotor();
  const slug = dados.time.slug;
  const zecaId = dados.pessoas.zeca.id;
  if (FOTOS) mkdirSync(FOTOS, { recursive: true });

  const abrirRanking = async (quem, largura) => {
    const cena = await abrirContexto(navegador, base, dados, quem, largura);
    const page = await cena.ctx.newPage();
    page.on('pageerror', (e) => cena.estado.erros.push(e.message));
    await page.goto(`${base}/time/${slug}/ranking`, { waitUntil: 'domcontentloaded' });
    await page.locator('.rank-list .rank-row').first().waitFor({ timeout: 40000 });
    await page.waitForTimeout(1200); // a entrada da página e a festa do pódio (sai 400 ms depois da lista)
    return { ...cena, page };
  };

  try {
    // Pelo motor: o Zeca está no ranking com 0 jogos, no fim; o Pedro (só organiza), não.
    const peloMotor = (await lerDoMotor(dados, 'm1', `/api/teams/${slug}/ranking`)).json?.ranking || [];
    t('motor · o ranking leva o Magrão, o Zé e o Zeca (0 jogos, por último); o Pedro, que só organiza, não',
      peloMotor.length === 3 && peloMotor[2].user_id === zecaId && peloMotor[2].presenca === 0 && !peloMotor.some((r) => r.user_id === dados.pessoas.adm.id),
      JSON.stringify(peloMotor.map((r) => [r.nome_jogador, r.presenca, r.posicao])));

    for (const largura of [390, 360]) {
      const rotulo = `${largura} px`;
      // O Magrão abre o Ranking.
      const c = await abrirRanking('m1', largura);
      const ls = await linhas(c.page);
      const zeca = ls.find((l) => l.nome === 'Zeca');
      t(`${rotulo} · o Zeca aparece no Ranking, por último (3º)`, ls.length === 3 && ls[2]?.nome === 'Zeca' && zeca?.pos === '3', JSON.stringify(ls.map((l) => [l.nome, l.pos])));
      t(`${rotulo} · o Pedro (só organiza) não aparece`, !ls.some((l) => l.nome === 'Pedro'));
      t(`${rotulo} · quem não jogou mostra "—" nos pontos; quem jogou mostra número`, zeca?.pontos === '—' && ls.slice(0, 2).every((l) => /\d/.test(l.pontos || '')), JSON.stringify(ls.map((l) => l.pontos)));
      t(`${rotulo} · em 3º sem ter jogado: sem medalha e sem linha de herói; os dois que jogaram, com`, zeca && !zeca.medalha && !zeca.heroi && ls.slice(0, 2).every((l) => l.medalha && l.heroi));
      const caixa = await c.page.evaluate(() => ({ janela: window.innerWidth, rolagemLateral: document.documentElement.scrollWidth > window.innerWidth }));
      t(`${rotulo} · a linha do Zeca cabe na tela e nada rola para o lado`, zeca && zeca.esquerda >= 0 && zeca.direita <= caixa.janela + 0.5 && !caixa.rolagemLateral, JSON.stringify({ zeca, caixa }));
      const texto = await c.page.evaluate(() => document.body.innerText);
      t(`${rotulo} · nenhum texto fala em "3 jogos"`, !/3 jogos|três jogos|a partir de 3/i.test(texto));
      if (FOTOS) await c.page.screenshot({ path: path.join(FOTOS, `ranking-${largura}.png`), fullPage: true });

      // Nota para o Zeca pelo botão Votar.
      if (largura === 390) {
        await c.page.locator('.rank-row', { hasText: 'Zeca' }).locator('.rank-actions button').click();
        const janela = c.page.locator('.modal-card');
        await janela.waitFor({ timeout: 10000 });
        await janela.locator('[data-nota-botao="8"]').click();
        await janela.getByRole('button', { name: 'Salvar voto' }).click();
        await janela.waitFor({ state: 'detached', timeout: 10000 });
        const depois = (await lerDoMotor(dados, 'm1', `/api/teams/${slug}/ranking`)).json?.ranking || [];
        t(`${rotulo} · o Magrão deu nota ao Zeca pelo Ranking e o motor gravou (8)`, depois.find((r) => r.user_id === zecaId)?.minha_nota === 8, JSON.stringify(depois.find((r) => r.user_id === zecaId)));
        await c.page.waitForTimeout(600);
        const zecaDepois = (await linhas(c.page)).find((l) => l.nome === 'Zeca');
        t(`${rotulo} · a linha do Zeca passa a dizer que o Magrão já votou ("Alterar")`, (await c.page.locator('.rank-row', { hasText: 'Zeca' }).locator('.rank-actions button').innerText()).trim() === 'Alterar' && zecaDepois?.votar, await c.page.locator('.rank-row', { hasText: 'Zeca' }).innerText());
      }
      t(`${rotulo} · sem erro de página (Magrão) e nada saiu da máquina`, c.estado.erros.length === 0, c.estado.erros.slice(0, 3).join(' | '));
      await c.ctx.close();

      // O próprio Zeca: se vê na lista, sem confete de pódio (está em 3º sem ter jogado).
      const z = await abrirRanking('zeca', largura);
      const lz = await linhas(z.page);
      t(`${rotulo} · o Zeca se vê no Ranking ("Você", sem botão de votar em si mesmo)`, lz.find((l) => l.nome === 'Zeca')?.voce === true && lz.find((l) => l.nome === 'Zeca')?.votar === false);
      t(`${rotulo} · o Zeca pode votar nos outros (os dois têm "Votar")`, lz.filter((l) => l.nome !== 'Zeca').every((l) => l.votar));
      t(`${rotulo} · sem confete de pódio para quem ainda não jogou`, (await z.page.evaluate(() => window.__confetes)) === 0);
      t(`${rotulo} · sem erro de página (Zeca)`, z.estado.erros.length === 0, z.estado.erros.slice(0, 3).join(' | '));
      await z.ctx.close();
    }
  } finally {
    const rede = await encerrarMotor(filho);
    t('o motor falso não tentou sair da máquina (rede fechada)', Array.isArray(rede) && rede.length === 0, `tentativas: ${JSON.stringify(rede)}`);
  }
}
