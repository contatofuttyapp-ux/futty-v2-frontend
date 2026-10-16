// Prova no navegador da Rodada 31V — o que só um Chromium de verdade confirma, com as MESMAS fontes e o MESMO CSS do app, a 390 e a 360 px:
//   · jogo antigo com os campeões anotados (FUT\DADOS-31V.sql): a página mostra o time campeão com os nomes, o selo "Campeões anotados", a frase
//     "Time campeão" (sem "venceu"), sem "Ver times", sem "1 times" e sem o editor do resultado (que, com um time só, apagaria o campeão);
//   · o admin vê "Associar jogador" ao lado de cada nome; associar liga a vitória à conta (a presença de fundador não duplica) e o Desfazer devolve;
//   · o jogo com o "?" fica só com os 4 nomes; quem não é admin não vê botão nenhum;
//   · a Resenha mostra o cartão do jogo com a foto e os nomes do time campeão;
//   · o Ranking não muda com os campeões anotados (convidado sem app não pontua) — só o Chavo, que entra pela conta;
//   · a Figurinha: "Restam N gerações" com N = TUDO (pacote do time + créditos): 3 + 45 = 48; a compra (o webhook do RevenueCat de verdade) e a volta
//     ao app sobem o número na hora (58); só o pacote = 3; só crédito = 55; o "Refazer" e a confirmação dizem o mesmo número.
// Como: o motor de VERDADE (todas as rotas) num processo à parte, por cima de banco, Storage e Auth de mentira (scripts/provas/_motor-31v.cjs →
// backend/tests/_appFalsa.js; o .env do backend, que aponta para o banco de produção, nunca é lido). Todo pedido do navegador passa por aqui: /api/** vai
// ao motor de mentira, o servidor das telas passa e qualquer outro endereço (inclusive o Supabase de produção) é respondido vazio sem sair da máquina.
//
// Uso: npm run provar:navegador -- rodada-31v      (~2 min)
//      R31V_FOTOS=pasta  salva a foto de cada passo (390 e 360)
import { spawn } from 'node:child_process';
import { readFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const nome = 'Rodada 31V · campeões antigos como convidados (página, Associar, Resenha, Ranking) e "Restam N gerações" com N = total (motor de verdade, banco falso)';

const RAIZ = fileURLToPath(new URL('../../', import.meta.url));
const MOTOR = path.join(RAIZ, 'scripts', 'provas', '_motor-31v.cjs');
const BACKEND_AO_LADO = path.resolve(RAIZ, '..', 'backend', 'tests', '_appFalsa.js');
const REF = new URL((readFileSync(new URL('../../.env', import.meta.url), 'utf8').match(/^VITE_SUPABASE_URL=(.+)$/m)?.[1] || 'https://prova.supabase.co').trim()).hostname.split('.')[0];
const FOTOS = process.env.R31V_FOTOS || '';
const NOMES_0309 = ['Igor', 'Eric Lopes', 'K9', 'Kim', 'Marcos'];

function subirMotor() {
  return new Promise((resolve, reject) => {
    const filho = spawn(process.execPath, [MOTOR], { stdio: ['pipe', 'pipe', 'pipe'], cwd: RAIZ });
    const linhas = [];
    const esperando = [];
    let resto = '';
    let erro = '';
    filho.esperarLinha = (prefixo, ms = 20000) => new Promise((ok, falha) => {
      const achada = linhas.find((l) => l.startsWith(prefixo));
      if (achada) { linhas.splice(linhas.indexOf(achada), 1); ok(JSON.parse(achada)); return; }
      const prazo = setTimeout(() => falha(new Error(`o motor não respondeu ${prefixo}\n${erro.slice(-600)}`)), ms);
      esperando.push({ prefixo, ok: (l) => { clearTimeout(prazo); ok(JSON.parse(l)); } });
    });
    const prazo = setTimeout(() => { filho.kill(); reject(new Error(`o motor falso não ficou pronto em 120 s\n${erro.slice(-700)}`)); }, 120000);
    filho.stderr.on('data', (d) => { erro += d; });
    filho.stdout.on('data', (d) => {
      resto += d;
      const partes = resto.split('\n');
      resto = partes.pop();
      for (const l of partes) {
        const i = esperando.findIndex((e) => l.startsWith(e.prefixo));
        if (i >= 0) esperando.splice(i, 1)[0].ok(l); else linhas.push(l);
      }
      const pronto = linhas.find((l) => l.startsWith('{"pronto"'));
      if (pronto) { linhas.splice(linhas.indexOf(pronto), 1); clearTimeout(prazo); resolve({ filho, dados: JSON.parse(pronto) }); }
    });
    filho.once('exit', (codigo) => { clearTimeout(prazo); reject(new Error(`o motor falso saiu com ${codigo}\n${erro.slice(-900)}`)); });
  });
}
async function encerrarMotor(filho) {
  try { filho.stdin.write('fim\n'); } catch { return null; }
  const r = await filho.esperarLinha('{"rede"', 8000).catch(() => null);
  try { filho.kill(); } catch { /* já saiu */ }
  return r?.rede ?? null;
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
    serviceWorkers: 'block', reducedMotion: 'reduce',
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

/** O que a prova lê e faz no motor de mentira sem passar pelo navegador (é local; nunca produção). */
async function noMotor(dados, quem, metodo, rota, corpo, cabecalhos = {}) {
  const r = await fetch(`${dados.base}${rota}`, { method: metodo, headers: { ...(quem ? { authorization: `Bearer ${dados.tokens[quem]}` } : {}), 'content-type': 'application/json', ...cabecalhos }, body: corpo ? JSON.stringify(corpo) : undefined });
  return { status: r.status, json: await r.json().catch(() => null) };
}

/** A compra da Minha Figurinha como o RevenueCat a manda ao motor (o webhook de verdade, com o segredo de mentira do motor falso). */
const comprarMinha = (dados, quem, transacao) => noMotor(dados, null, 'POST', '/api/compras/webhook/revenuecat', {
  event: { type: 'NON_RENEWING_PURCHASE', id: `ev-${transacao}`, store: 'APP_STORE', environment: 'PRODUCTION', product_id: 'futty_minha', transaction_id: transacao, app_user_id: dados.pessoas[quem].id, price: 2.99, currency: 'BRL', price_in_purchased_currency: 9.9 },
}, { authorization: dados.segredo });

const rolaParaOLado = (page) => page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
const esperar = (ms) => new Promise((r) => { setTimeout(r, ms); });
const contador = (page) => page.locator('[data-contador-geracoes]').first().innerText().then((s) => s.trim()).catch(() => null);

export async function rodar({ navegador, base, t }) {
  try { readFileSync(BACKEND_AO_LADO); } catch { t('o backend não está ao lado (FUTTY-V2/backend): a prova foi pulada', true); return; }
  const { filho, dados } = await subirMotor();
  const missa = dados.missa.slug;
  const id = (quem) => dados.pessoas[quem].id;
  if (FOTOS) mkdirSync(FOTOS, { recursive: true });
  const foto = async (page, rotulo, opcoes = { fullPage: true }) => { if (FOTOS) { await page.waitForTimeout(700); await page.screenshot({ path: path.join(FOTOS, `${rotulo}.png`), ...opcoes }); } };
  const abrir = async (cena, rota, esperarPor) => {
    const page = await cena.ctx.newPage();
    page.on('pageerror', (e) => cena.estado.erros.push(e.message));
    await page.goto(`${base}${rota}`, { waitUntil: 'domcontentloaded' });
    await page.locator(esperarPor).first().waitFor({ timeout: 40000 });
    await page.waitForTimeout(900); // o fade de entrada da página
    return page;
  };
  const ranking = async (slug) => (await noMotor(dados, 'chavo', 'GET', `/api/teams/${slug}/ranking`)).json?.ranking || [];
  const linhaDe = (r, quem) => r.find((x) => x.user_id === id(quem));

  try {
    // ── No motor: o Ranking antes e depois dos campeões anotados ──
    t('motor · Missa: o Ranking é o MESMO antes e depois dos campeões anotados (convidado sem app não pontua; a presença de fundador já contava os jogos)',
      JSON.stringify(dados.rankingAntes.missa) === JSON.stringify(dados.rankingDepois.missa), JSON.stringify(dados.rankingDepois.missa));
    const [chA, chD] = [dados.rankingAntes.domingueira, dados.rankingDepois.domingueira].map((r) => r.find((x) => x.user_id === id('chavo')));
    const [tiA, tiD] = [dados.rankingAntes.domingueira, dados.rankingDepois.domingueira].map((r) => r.find((x) => x.user_id === id('tiago')));
    t('motor · Domingueira: só o Chavo (entra pela conta no 05/04) ganha 1 vitória e 1 jogo; o Tiago fica igual',
      chD.vitorias === chA.vitorias + 1 && chD.presenca === chA.presenca + 1 && JSON.stringify({ ...tiA, score: 0, posicao: 0 }) === JSON.stringify({ ...tiD, score: 0, posicao: 0 }), JSON.stringify({ chA, chD, tiA, tiD }));
    const gp = (await noMotor(dados, 'chavo', 'GET', `/api/games/${dados.jogos.j0504}`)).json;
    t('motor · o 05/04 da Domingueira tem o Chavo pela conta, com a presença confirmada', gp?.game?.times_resultado?.times?.[0]?.jogadores?.[1]?.user_id === id('chavo') && gp.players.some((p) => p.user_id === id('chavo') && p.confirmado));

    let creditosEsperados = 45;
    let compra = 0;
    for (const largura of [390, 360]) {
      const r = `${largura} px`;

      // ── A página do jogo antigo, vista pelo admin ──
      const chavo = await abrirContexto(navegador, base, dados, 'chavo', largura);
      const pj = await abrir(chavo, `/time/${missa}/jogo/${dados.jogos.j0309}`, '[data-associar-jogador]');
      const nomes = await pj.locator('.sorteio-team .sorteio-player').evaluateAll((els) => els.map((e) => e.innerText.replace(/\s+/g, ' ').replace(/Associar jogador/g, '').trim()));
      t(`${r} · jogo antigo: o time campeão com os 5 nomes, na ordem do dono`, JSON.stringify(nomes.map((n) => n.replace(/^[•·]\s*/, ''))) === JSON.stringify(NOMES_0309), JSON.stringify(nomes));
      t(`${r} · "Associar jogador" ao lado de cada um dos 5 nomes (admin)`, (await pj.locator('.sorteio-team [data-associar-jogador]').count()) === 5);
      const selo = (await pj.locator('[data-selo-do-sorteio]').first().innerText()).replace(/\s+/g, ' ').trim();
      t(`${r} · o selo diz "Campeões anotados por Chavo, el matador" (não "Montado à mão")`, /campeões anotados por chavo, el matador/i.test(selo), selo);
      const frase = (await pj.locator('[data-frase-do-resultado]').first().innerText()).trim();
      t(`${r} · o resultado diz "Time campeão" (sem "venceu", que pediria um adversário)`, frase === 'Time campeão', frase);
      const cabecalho = await pj.evaluate(() => document.querySelector('.hud-corners')?.innerText.replace(/\s+/g, ' ') || '');
      t(`${r} · sem "1 times" no cabeçalho, sem "Ver times" e sem o editor do resultado (que apagaria o campeão)`,
        !/1 times/.test(cabecalho) && (await pj.locator('[data-ver-times]').count()) === 0 && (await pj.locator('[data-resultado-editor]').count()) === 0, cabecalho);
      t(`${r} · a página do jogo não rola para o lado`, !(await rolaParaOLado(pj)));
      await pj.locator('.sorteio-team').first().scrollIntoViewIfNeeded();
      await foto(pj, `1-jogo-antigo-${largura}`);

      // ── Associar um nome à conta, e Desfazer ──
      const [convidado, quem] = largura === 390 ? ['Eric Lopes', 'eric'] : ['Kim', 'kim'];
      const antes = linhaDe(await ranking(missa), quem);
      await pj.locator('.sorteio-player', { hasText: convidado }).locator('[data-associar-jogador]').click();
      await pj.locator('[data-associar-janela]').waitFor({ timeout: 15000 });
      await pj.locator(`[data-membro="${id(quem)}"]`).waitFor({ timeout: 15000 });
      await pj.locator(`[data-membro="${id(quem)}"]`).click();
      await foto(pj, `2-associar-${largura}`, { fullPage: false });
      await pj.locator('[data-confirmar]').click();
      await pj.locator('[data-associar-janela]').waitFor({ state: 'detached', timeout: 15000 });
      await pj.locator('.futty-toast').first().waitFor({ timeout: 10000 });
      const aviso = await pj.locator('.futty-toast').first().innerText();
      t(`${r} · "Pronto: o ${convidado} deste jogo agora é ${dados.pessoas[quem].apelido}."`, aviso.includes(`Pronto: o ${convidado} deste jogo agora é ${dados.pessoas[quem].apelido}.`), aviso);
      const depois = linhaDe(await ranking(missa), quem);
      t(`${r} · o título do 03/09 passa para a conta (${dados.pessoas[quem].apelido}: vitórias ${antes.vitorias} → ${depois.vitorias}) e a presença não duplica (${antes.presenca} → ${depois.presenca})`,
        depois.vitorias === antes.vitorias + 1 && depois.presenca === antes.presenca, JSON.stringify({ antes, depois }));
      t(`${r} · o nome virou a conta no time campeão e saiu o botão dele (ficam 4)`, (await pj.locator('.sorteio-team [data-associar-jogador]').count()) === 4);
      await pj.locator('[data-associacoes-recentes]').scrollIntoViewIfNeeded();
      await foto(pj, `3-associado-${largura}`);
      await pj.locator('[data-desfazer]').first().click();
      await pj.locator('[data-desfazer-confirmar]').click();
      await pj.locator('.futty-toast', { hasText: 'Desfeito' }).first().waitFor({ timeout: 10000 });
      const desfeito = linhaDe(await ranking(missa), quem);
      t(`${r} · Desfazer: o convidado volta e a vitória sai da conta (${desfeito.vitorias})`, desfeito.vitorias === antes.vitorias && desfeito.presenca === antes.presenca && (await pj.locator('.sorteio-team [data-associar-jogador]').count()) === 5);
      t(`${r} · sem erro de página (admin)`, chavo.estado.erros.length === 0, chavo.estado.erros.slice(0, 3).join(' | '));

      // ── O jogo com o "?": só os 4 nomes; quem não é admin não vê botão ──
      const kim = await abrirContexto(navegador, base, dados, 'kim', largura);
      const p21 = await abrir(kim, `/time/${missa}/jogo/${dados.jogos.j2105}`, '.sorteio-team');
      const nomes21 = await p21.locator('.sorteio-team .sorteio-player').evaluateAll((els) => els.map((e) => e.innerText.replace(/\s+/g, ' ').trim().replace(/^[•·]\s*/, '')));
      t(`${r} · 21/05 ("Jefim, Igor, MT, ?, K9"): só os 4 que têm nome, nenhuma vaga vazia`, JSON.stringify(nomes21) === JSON.stringify(['Jefim', 'Igor', 'MT', 'K9']), JSON.stringify(nomes21));
      t(`${r} · quem não é admin não vê "Associar jogador"`, (await p21.locator('[data-associar-jogador]').count()) === 0);
      await foto(p21, `4-jogo-com-interrogacao-${largura}`);

      // ── A Resenha: o cartão do jogo com a foto e os nomes ──
      const resenha = await abrir(kim, '/feed', '.feed-card');
      await resenha.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 500) { window.scrollTo(0, y); await new Promise((ok) => { setTimeout(ok, 120); }); } window.scrollTo(0, 0); });
      await resenha.waitForTimeout(1500);
      const cartoes = await resenha.locator('.feed-card').evaluateAll((els) => els.map((e) => ({ texto: e.innerText.replace(/\s+/g, ' '), fotos: [...e.querySelectorAll('img')].filter((i) => i.naturalWidth > 300).length })));
      const c0309 = cartoes.find((c) => c.texto.includes(NOMES_0309.join(' · ')));
      t(`${r} · Resenha: o cartão do 03/09 tem a foto e "Time campeão: ${NOMES_0309.join(' · ')}"`, !!c0309 && c0309.fotos === 1 && /time campeão/i.test(c0309.texto), JSON.stringify(cartoes.map((c) => c.texto.slice(0, 140))));
      t(`${r} · a Resenha não rola para o lado`, !(await rolaParaOLado(resenha)));
      await resenha.locator('.feed-card', { hasText: NOMES_0309.join(' · ') }).first().scrollIntoViewIfNeeded();
      await foto(resenha, `5-resenha-${largura}`, { fullPage: false });
      t(`${r} · sem erro de página (Kim)`, kim.estado.erros.length === 0, kim.estado.erros.slice(0, 3).join(' | '));
      await kim.ctx.close();

      // ── A Figurinha do Chavo: 3 do pacote da Domingueira + créditos ──
      const fig = await abrir(chavo, '/figurinha', '[data-contador-geracoes]');
      const n0 = 3 + creditosEsperados;
      t(`${r} · Figurinha: "Restam ${n0} gerações" (3 do pacote do time + ${creditosEsperados} de crédito), sem "uniforme à sua escolha"`, (await contador(fig)) === `Restam ${n0} gerações` && !/uniforme à sua escolha/.test(await fig.evaluate(() => document.body.innerText)), await contador(fig));
      const abertaEm = Date.now();
      compra += 1;
      const w = await comprarMinha(dados, 'chavo', `tx-31v-${compra}`);
      t(`${r} · compra simulada: o webhook da loja credita a Minha Figurinha (+10)`, w.status === 200 && w.json?.estado === 'creditada', JSON.stringify(w.json));
      creditosEsperados += 10;
      await esperar(Math.max(0, 15500 - (Date.now() - abertaEm)));
      // A folha da loja fecha e o app volta ao primeiro plano: é o que a tela escuta.
      await fig.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
      await fig.locator(`[data-contador-geracoes="${3 + creditosEsperados}"]`).waitFor({ timeout: 10000 }).catch(() => {});
      t(`${r} · sem fechar o app, o número sobe na hora: "Restam ${3 + creditosEsperados} gerações"`, (await contador(fig)) === `Restam ${3 + creditosEsperados} gerações`, await contador(fig));
      await fig.getByText('Uniforme', { exact: true }).first().click(); // a grade de uniformes (e o Refazer) mora na aba Uniforme
      await fig.waitForTimeout(500);
      const refazer = await fig.locator('[data-acao="refazer"]').first().innerText().catch(() => null);
      t(`${r} · o "Refazer" diz o mesmo número (${3 + creditosEsperados} gerações)`, !!refazer && refazer.endsWith(`· ${3 + creditosEsperados} gerações`), refazer);
      await fig.locator('[data-contador-geracoes]').scrollIntoViewIfNeeded();
      await foto(fig, `6-figurinha-depois-da-compra-${largura}`, { fullPage: false });
      await fig.locator('[data-grade="uniformes"] [data-estado="geravel"]').first().click();
      await fig.locator('[data-confirmar-total]').waitFor({ timeout: 10000 });
      const confirmacao = (await fig.locator('[data-confirmar-total]').innerText()).trim();
      t(`${r} · a confirmação de gerar diz "Você tem ${3 + creditosEsperados} gerações"`, confirmacao === `Isso usa 1 geração. Você tem ${3 + creditosEsperados} gerações.`, confirmacao);
      await foto(fig, `7-confirmacao-${largura}`, { fullPage: false });
      await fig.getByRole('button', { name: 'Agora não' }).click();
      t(`${r} · a Figurinha não rola para o lado`, !(await rolaParaOLado(fig)));
      t(`${r} · sem erro de página (Figurinha do Chavo)`, chavo.estado.erros.length === 0, chavo.estado.erros.slice(0, 3).join(' | '));

      // ── Só o pacote (Tiago) e só crédito (Carla) ──
      for (const [pessoa, esperado] of [['tiago', 'Restam 3 gerações'], ['carla', 'Restam 55 gerações']]) {
        const cena = await abrirContexto(navegador, base, dados, pessoa, largura);
        const pf = await abrir(cena, '/figurinha', '[data-contador-geracoes]');
        t(`${r} · ${dados.pessoas[pessoa].apelido}: "${esperado}"`, (await contador(pf)) === esperado, await contador(pf));
        await pf.locator('[data-contador-geracoes]').scrollIntoViewIfNeeded();
        await foto(pf, `8-figurinha-${pessoa}-${largura}`, { fullPage: false });
        t(`${r} · sem erro de página (${dados.pessoas[pessoa].apelido}) e nada saiu da máquina`, cena.estado.erros.length === 0, cena.estado.erros.slice(0, 3).join(' | '));
        await cena.ctx.close();
      }
      await chavo.ctx.close();
    }
  } finally {
    const rede = await encerrarMotor(filho);
    t('o motor falso não tentou sair da máquina (rede fechada)', Array.isArray(rede) && rede.length === 0, `tentativas: ${JSON.stringify(rede)}`);
  }
}
