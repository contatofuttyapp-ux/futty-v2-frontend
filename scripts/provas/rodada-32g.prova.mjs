// Prova no navegador da Rodada 32G — a MENSALIDADE do time ("pagou / não pagou", sem dinheiro no app) e o "Traga seu histórico" (fase 1).
// O que só um Chromium de verdade confirma, com as MESMAS fontes e o MESMO CSS do app, a 390 e 360 px:
//   · desligada, a página do time é a de sempre (jogador: Jogos · Elenco · Ranking; admin: + Painel e um convite discreto no Elenco);
//   · o admin liga pelo convite (cai no cartão do Painel), configura, e a aba Mensalidade aparece; marca e desmarca com um toque;
//   · o jogador vê SÓ o dele (lista privada), "Pagar" abre fora do app com o domínio à vista, "Já paguei" → "Avisou que pagou" (push aos
//     admins, nunca para quem avisou), desfaz; o admin confirma; o jogador não desfaz mais; "Mostrar a lista" liga e desliga o que ele vê;
//   · "javascript:" e um "Pix pro Zé…" viram texto com "Copiar", nunca link;
//   · a virada do mês (o relógio do MOTOR anda) começa em aberto, outubro fica guardado e corrigível, agosto só para ler;
//   · o lembrete do vencimento: nada antes das 10h do relógio do time, 1 por pessoa no mês, a rota do agendador só com o segredo;
//   · desligar volta tudo como era; o "Traga seu histórico" no Ranking e na Resenha vazios (admin), na festa do "Criar time", fecha com X
//     e não volta, e cada toque fica contado no motor.
// Como: o motor de VERDADE (todas as rotas) sobe num processo à parte por cima de banco, Storage e Auth de mentira, em memória
// (scripts/provas/_motor-32g.cjs → backend/tests/_appFalsa.js; o .env do backend aponta para o banco de produção, e aqui nunca é lido). O app é o
// de verdade, num Chromium; /api/** vai ao motor de mentira, o servidor das telas passa e QUALQUER outro endereço é respondido vazio sem sair da máquina.
//
// Uso: npm run provar:navegador -- rodada-32g      (~2 min)
//      R32G_FOTOS=pasta  salva a foto de cada passo
import { spawn } from 'node:child_process';
import { readFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const nome = 'Rodada 32G · Mensalidade do time e "Traga seu histórico" (motor de verdade, banco falso, relógio da prova, nada sai da máquina)';

const RAIZ = fileURLToPath(new URL('../../', import.meta.url));
const MOTOR = path.join(RAIZ, 'scripts', 'provas', '_motor-32g.cjs');
const BACKEND_AO_LADO = path.resolve(RAIZ, '..', 'backend', 'tests', '_appFalsa.js');
const REF = new URL((readFileSync(new URL('../../.env', import.meta.url), 'utf8').match(/^VITE_SUPABASE_URL=(.+)$/m)?.[1] || 'https://prova.supabase.co').trim()).hostname.split('.')[0];
const FOTOS = process.env.R32G_FOTOS || '';

const APARELHOS = {
  390: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  360: { viewport: { width: 360, height: 780 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
};

function subirMotor() {
  return new Promise((resolve, reject) => {
    const filho = spawn(process.execPath, [MOTOR], { stdio: ['pipe', 'pipe', 'pipe'], cwd: RAIZ });
    let saida = '';
    let erro = '';
    const prazo = setTimeout(() => { filho.kill(); reject(new Error(`o motor falso não ficou pronto em 120 s\n${erro.slice(-700)}`)); }, 120000);
    filho.stderr.on('data', (d) => { erro += d; });
    const aoLer = (d) => {
      saida += d;
      const linha = saida.split('\n').find((l) => l.startsWith('{"pronto"'));
      if (linha) { clearTimeout(prazo); filho.stdout.off('data', aoLer); resolve({ filho, dados: JSON.parse(linha) }); }
    };
    filho.stdout.on('data', aoLer);
    filho.once('exit', (codigo) => { clearTimeout(prazo); reject(new Error(`o motor falso saiu com ${codigo}\n${erro.slice(-900)}`)); });
  });
}
/** Manda um comando ao motor e espera a linha de resposta que começa com `{"<chave>"`. */
function falarComOMotor(filho, comando, chave) {
  return new Promise((resolve) => {
    let saida = '';
    const aoLer = (d) => {
      saida += d;
      const linha = saida.split('\n').find((l) => l.startsWith(`{"${chave}"`));
      if (linha) { filho.stdout.off('data', aoLer); resolve(JSON.parse(linha)[chave]); }
    };
    filho.stdout.on('data', aoLer);
    filho.stdin.write(`${comando}\n`);
  });
}
const estadoDoMotor = (filho) => falarComOMotor(filho, 'estado', 'estado');
const moverRelogio = (filho, iso) => falarComOMotor(filho, `relogio ${iso}`, 'relogio');
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
  user: { id: dados.pessoas[quem].id, aud: 'authenticated', email: dados.pessoas[quem].email, app_metadata: {}, user_metadata: { onboarding_completo: true }, created_at: '2026-01-01T00:00:00Z' },
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

async function abrir(navegador, baseDoVite, dados, quem, aparelho) {
  const ctx = await navegador.newContext({ ...APARELHOS[aparelho], locale: 'pt-BR', timezoneId: 'America/Sao_Paulo', serviceWorkers: 'block', reducedMotion: 'reduce' });
  const estado = { externos: [], erros: [], dialogos: 0 };
  // Quem entra já passou pelas boas-vindas do time (senão o convidado abre com elas por cima de tudo, em cada aparelho novo da prova).
  await ctx.addInitScript(({ chave, sessao, times }) => {
    try {
      localStorage.setItem('futty_cookies', 'aceite');
      if (sessao) localStorage.setItem(chave, sessao);
      for (const id of times) localStorage.setItem(`futty_onboarding_${id}`, '1');
    } catch { /* sem armazenamento */ }
  }, { chave: `sb-${REF}-auth-token`, sessao: sessaoDe(dados, quem), times: [dados.missa.id, dados.varzea.id] });
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
  const page = await ctx.newPage();
  page.on('pageerror', (e) => estado.erros.push(e.message));
  page.on('dialog', (d) => { estado.dialogos += 1; d.dismiss().catch(() => {}); });
  return { ctx, page, estado };
}

const semRolagemLateral = (page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
// A linha das abas cabe E nenhum texto vaza da própria aba (o rótulo nunca passa da caixa dele).
const abasCabem = (page) => page.evaluate(() => {
  const linha = document.querySelector('[role="tablist"]').parentElement;
  const itens = [...linha.querySelectorAll('.aba-time')];
  return linha.scrollWidth <= linha.clientWidth + 1 && itens.every((e) => e.scrollWidth <= e.clientWidth + 1) && linha.getBoundingClientRect().right <= window.innerWidth;
});
const abasDe = (page) => page.locator('[role="tablist"] [data-aba]').evaluateAll((els) => els.map((e) => e.getAttribute('data-aba')));
const texto = async (page, sel) => ((await page.locator(sel).count()) ? (await page.locator(sel).first().innerText()).trim() : null);

export async function rodar({ navegador, base, t }) {
  try { readFileSync(BACKEND_AO_LADO); } catch { t('o backend não está ao lado (FUTTY-V2/backend): a prova foi pulada', true); return; }
  if (FOTOS) mkdirSync(FOTOS, { recursive: true });
  const foto = async (page, nomeDaFoto, opcoes = {}) => { if (FOTOS) await page.screenshot({ path: path.join(FOTOS, `${nomeDaFoto}.png`), fullPage: true, ...opcoes }); };
  const { filho, dados } = await subirMotor();
  const P = dados.pessoas;
  const slug = dados.missa.slug;
  const cenas = [];
  const nova = async (quem, aparelho = 390) => { const c = await abrir(navegador, base, dados, quem, aparelho); cenas.push(c); return c; };
  const irPara = async (page, caminho, esperar) => { await page.goto(`${base}${caminho}`, { waitUntil: 'domcontentloaded' }); await page.locator(esperar).first().waitFor({ timeout: 40000 }); await page.waitForTimeout(400); };
  const toast = async (page, trecho) => { const el = page.locator('.futty-toast', { hasText: trecho }).first(); await el.waitFor({ timeout: 10000 }); return (await el.innerText()).trim(); };
  const ehBotao = (page, userId) => page.locator(`[data-linha="${userId}"]`).evaluate((e) => e.tagName === 'BUTTON');

  try {
    // ════ 0 · Desligada: a página do time é a de sempre ═══════════════════════════════════════════════════════════════════════
    const { page: ana } = await nova('ana');
    await irPara(ana, `/time/${slug}?aba=elenco`, '[role="tablist"] [data-aba]');
    t('desligada · jogador: Jogos · Elenco (mais o Ranking ao lado), sem Mensalidade e sem convite', JSON.stringify(await abasDe(ana)) === '["jogos","elenco"]' && (await ana.locator('[data-convite-mensalidade]').count()) === 0 && (await ana.locator('[data-botao-ranking]').count()) === 1);
    await irPara(ana, `/time/${slug}?aba=mensalidade`, '[role="tablist"] [data-aba]');
    t('desligada · ?aba=mensalidade no endereço cai na aba Jogos', (await ana.locator('[data-aba="jogos"][aria-selected="true"]').count()) === 1);

    const { page: adm } = await nova('adm');
    await irPara(adm, `/time/${slug}?aba=elenco`, '[data-convite-mensalidade]');
    t('desligada · admin: Jogos · Elenco · Painel e, no fim do Elenco, o convite discreto "Controle a mensalidade do time"', JSON.stringify(await abasDe(adm)) === '["jogos","elenco","ajustes"]' && (await texto(adm, '[data-convite-mensalidade]')).startsWith('Controle a mensalidade do time'));
    t('desligada · as abas de sempre: o selo ADMIN escrito e o "Ranking" por extenso', (await texto(adm, '[data-selo-admin]')) === 'ADMIN' && (await texto(adm, '[data-botao-ranking]')).toUpperCase() === 'RANKING' && await abasCabem(adm));
    await foto(adm, '01-admin-elenco-convite-390');

    // ════ 1 · O admin liga pelo convite e configura ═══════════════════════════════════════════════════════════════════════════
    await adm.locator('[data-convite-mensalidade]').click();
    await adm.locator('[data-ajustes-mensalidade]').waitFor({ timeout: 20000 });
    await adm.waitForTimeout(900);
    const noTopo = await adm.locator('#mensalidade').evaluate((e) => { const b = e.getBoundingClientRect(); return b.top >= -2 && b.top < window.innerHeight / 2; });
    t('o convite leva ao Painel, com o cartão Mensalidade já na tela', /aba=ajustes/.test(adm.url()) && noTopo, adm.url());
    await adm.getByRole('switch', { name: 'Controlar a mensalidade pelo app' }).click();
    t('ligar: "Mensalidade ligada: a aba já aparece no time."', (await toast(adm, 'Mensalidade ligada')).includes('a aba já aparece no time'));
    await adm.locator('[data-campo-valor]').waitFor({ timeout: 20000 });
    await adm.waitForTimeout(600);
    t('ligada: a aba Mensalidade aparece entre Elenco e Painel', JSON.stringify(await abasDe(adm)) === '["jogos","elenco","mensalidade","ajustes"]', JSON.stringify(await abasDe(adm)));
    await adm.locator('[data-campo-valor]').fill('R$ 60');
    await adm.locator('[data-campo-vencimento]').selectOption('10');
    await adm.locator('[data-campo-como-pagar]').fill('https://picpay.me/missa-de-quinta');
    t('a prévia diz o que o time vai ver: o botão "Pagar" que abre picpay.me fora do app', (await texto(adm, '[data-previa-como-pagar]')).includes('abre picpay.me fora do app'));
    await adm.locator('[data-salvar-mensalidade]').click();
    await toast(adm, 'Mensalidade salva');
    let est = await estadoDoMotor(filho);
    const cfg = est.config.find((c) => c.team_id === dados.missa.id);
    t('no motor: ligada, R$ 60, dia 10, o link, lista privada, lembrete ligado', cfg?.ativa === true && cfg.valor === 'R$ 60' && cfg.dia_vencimento === 10 && cfg.como_pagar === 'https://picpay.me/missa-de-quinta' && cfg.lista_publica === false && cfg.lembrete === true, JSON.stringify(cfg));
    await adm.locator('#mensalidade').scrollIntoViewIfNeeded();
    await foto(adm, '02-admin-painel-mensalidade-390', { fullPage: false });

    // ════ 2 · A aba do admin: marca e desmarca ════════════════════════════════════════════════════════════════════════════════
    await adm.locator('[data-aba="mensalidade"]').click();
    await adm.locator('[data-lista-mensalidade]').waitFor({ timeout: 20000 });
    t('admin · o mês do relógio do time no topo, valor e vencimento, contador "0 de 6 pagaram"', (await texto(adm, '[data-nome-do-mes]')) === 'Outubro de 2026' && (await texto(adm, '[data-resumo-mensalidade]')) === 'R$ 60 · vence 10/10' && (await texto(adm, '[data-contador]')) === '0 de 6 pagaram');
    await adm.locator(`[data-linha="${P.ana.id}"]`).click();
    await adm.locator(`[data-linha="${P.ana.id}"][data-status="pago"]`).waitFor({ timeout: 10000 });
    t('um toque: a Ana fica "Pago" e o contador "1 de 6 pagou"', (await texto(adm, '[data-contador]')) === '1 de 6 pagou');
    await adm.locator(`[data-linha="${P.ana.id}"]`).click();
    await adm.locator(`[data-linha="${P.ana.id}"][data-status="aberto"]`).waitFor({ timeout: 10000 });
    est = await estadoDoMotor(filho);
    t('outro toque: volta a "Em aberto" (no motor, sem registro) e o contador a 0', (await texto(adm, '[data-contador]')) === '0 de 6 pagaram' && !est.pagamentos.some((p) => p.user_id === P.ana.id));
    t('admin · o próximo mês não existe ainda (seta da direita apagada)', await adm.locator('[data-mes-seguinte]').isDisabled());
    await foto(adm, '03-admin-aba-mensalidade-390');
    for (const aparelho of [390, 360]) {
      const { page } = await nova('adm', aparelho);
      await irPara(page, `/time/${slug}?aba=mensalidade`, '[data-lista-mensalidade]');
      t(`admin ${aparelho} px · a linha cheia cabe (4 abas + Ranking): nenhum rótulo vaza, selo em ponto, Ranking é o troféu com nome "Ranking"`,
        await abasCabem(page) && (await page.locator('[data-botao-ranking]').getAttribute('aria-label')) === 'Ranking' && (await page.locator('[data-botao-ranking] svg').count()) === 1 && await semRolagemLateral(page));
      if (aparelho === 360) await foto(page, '03b-admin-aba-mensalidade-360');
    }

    // ════ 3 · O jogador (lista privada): o dele, "Pagar", "Já paguei", desfazer — a 360 e 390 px ═══════════════════════════════════
    for (const aparelho of [360, 390]) {
      const { page } = await nova('ana', aparelho);
      const rot = `jogador ${aparelho} px`;
      await irPara(page, `/time/${slug}?aba=mensalidade`, '[data-meu-status]');
      t(`${rot} · Jogos · Elenco · Mensalidade e o "Ranking" por extenso cabem (nenhum rótulo vaza, nada rola para o lado)`, await abasCabem(page) && (await texto(page, '[data-botao-ranking]')).toUpperCase() === 'RANKING' && await semRolagemLateral(page));
      if (aparelho === 360) {
        t(`${rot} · só o dele: "Em aberto", sem lista e sem contador`, (await page.locator('[data-meu-status="aberto"]').count()) === 1 && (await page.locator('[data-lista-mensalidade], [data-contador]').count()) === 0);
        const pagar = page.locator('[data-pagar]');
        t(`${rot} · "Pagar" é o link de verdade, abre fora (target _blank, noopener) e mostra o domínio antes`, (await pagar.getAttribute('href')) === 'https://picpay.me/missa-de-quinta' && (await pagar.getAttribute('target')) === '_blank' && /noopener/.test(await pagar.getAttribute('rel')) && (await texto(page, '[data-dominio]')) === 'abre picpay.me, fora do app');
        await foto(page, '04-jogador-em-aberto-360');
        await page.locator('[data-ja-paguei]').click();
        await page.locator('[data-meu-status="avisou"]').waitFor({ timeout: 10000 });
        t(`${rot} · "Já paguei" → "Avisou que pagou" (e o aviso de que o admin confere)`, (await texto(page, '[data-meu-status] [data-chip-status]')) === 'Avisou que pagou' && (await toast(page, 'Avisado')).includes('O admin confere e confirma'));
        est = await estadoDoMotor(filho);
        const avisos = est.pushes.filter((p) => /avisou que pagou/.test(p.titulo));
        t(`${rot} · push "Ana avisou que pagou a mensalidade" para os DOIS admins (pedidos), com o link da aba`, avisos.length === 1 && avisos[0].titulo === 'Ana avisou que pagou a mensalidade' && JSON.stringify([...avisos[0].ids].sort()) === JSON.stringify([P.adm.id, P.bia.id].sort()) && avisos[0].categoria === 'pedidos' && avisos[0].url === `/time/${slug}?aba=mensalidade&mes=2026-10`, JSON.stringify(avisos));
        await foto(page, '05-jogador-avisou-360');
        await page.locator('[data-desfazer]').click();
        await page.locator('[data-meu-status="aberto"]').waitFor({ timeout: 10000 });
        t(`${rot} · "Desfazer o aviso" volta a "Em aberto"`, (await page.locator('[data-ja-paguei]').count()) === 1);
        await page.locator('[data-ja-paguei]').click();
        await page.locator('[data-meu-status="avisou"]').waitFor({ timeout: 10000 });
      } else {
        t(`${rot} · depois de avisar de novo, segue "Avisou que pagou"`, (await page.locator('[data-meu-status="avisou"]').count()) === 1);
        await foto(page, '06-jogador-avisou-390');
      }
    }

    // ════ 4 · O admin confirma; o jogador não desfaz mais ════════════════════════════════════════════════════════════════════
    await irPara(adm, `/time/${slug}?aba=mensalidade`, '[data-lista-mensalidade]');
    t('admin · a Ana aparece "Avisou que pagou" e o resumo "1 avisou que pagou"', (await adm.locator(`[data-linha="${P.ana.id}"][data-status="avisou"]`).count()) === 1 && (await texto(adm, '[data-avisaram]')) === '1 avisou que pagou');
    await foto(adm, '07-admin-ana-avisou-390');
    await adm.locator(`[data-linha="${P.ana.id}"]`).click();
    await adm.locator(`[data-linha="${P.ana.id}"][data-status="pago"]`).waitFor({ timeout: 10000 });
    t('admin confirma: Pago e "1 de 6 pagou"', (await texto(adm, '[data-contador]')) === '1 de 6 pagou');
    const { page: ana360 } = await nova('ana', 360);
    await irPara(ana360, `/time/${slug}?aba=mensalidade`, '[data-meu-status]');
    t('jogador · "Pago", "Confirmado pelo admin.", sem "Já paguei", sem "Desfazer" e sem "Pagar"', (await ana360.locator('[data-meu-status="pago"]').count()) === 1 && (await ana360.locator('[data-ja-paguei], [data-desfazer], [data-pagar]').count()) === 0 && (await ana360.locator('text=Confirmado pelo admin.').count()) === 1);
    await foto(ana360, '08-jogador-pago-360');

    // ════ 5 · "Mostrar a lista para o time" ═══════════════════════════════════════════════════════════════════════════════════
    const salvarNoPainel = async (acao) => {
      await irPara(adm, `/time/${slug}?aba=ajustes#mensalidade`, '[data-campo-valor]');
      await acao();
      await adm.locator('[data-salvar-mensalidade]').click();
      await toast(adm, 'Mensalidade salva');
    };
    await salvarNoPainel(() => adm.getByRole('switch', { name: 'Mostrar a lista para o time' }).click());
    const { page: beto } = await nova('beto', 390);
    await irPara(beto, `/time/${slug}?aba=mensalidade`, '[data-lista-mensalidade]');
    const linhasBeto = await beto.locator('[data-lista-mensalidade] [data-linha]').count();
    t('lista aberta · o jogador vê os 6, o contador "1 de 6 pagou" e NÃO consegue marcar ninguém (linhas não são botões)', linhasBeto === 6 && (await texto(beto, '[data-contador]')) === '1 de 6 pagou' && !(await ehBotao(beto, P.ana.id)));
    await foto(beto, '09-jogador-lista-aberta-390');
    await salvarNoPainel(() => adm.getByRole('switch', { name: 'Mostrar a lista para o time' }).click());
    await irPara(beto, `/time/${slug}?aba=mensalidade`, '[data-meu-status]');
    t('lista fechada de novo · o jogador volta a ver só o dele', (await beto.locator('[data-lista-mensalidade], [data-contador]').count()) === 0);

    // ════ 6 · "Como pagar" que não é http(s): texto com "Copiar", nunca link ══════════════════════════════════════════════════
    for (const [rotulo, como] of [['javascript:', 'javascript:alert(document.cookie)'], ['Pix', 'Pix pro Zé: (11) 99999-9999']]) {
      await salvarNoPainel(() => adm.locator('[data-campo-como-pagar]').fill(como));
      await irPara(beto, `/time/${slug}?aba=mensalidade`, '[data-meu-status]');
      t(`"${rotulo}" · o jogador vê o texto com "Copiar", sem botão "Pagar" e sem nenhum <a> com ele`, (await beto.locator('[data-pagar]').count()) === 0 && (await texto(beto, '[data-texto-como-pagar]')) === como && (await beto.locator('[data-copiar]').count()) === 1 && (await beto.locator('a[href^="javascript"]').count()) === 0);
      if (rotulo === 'javascript:') await foto(beto, '10-jogador-javascript-vira-texto-390');
    }
    await salvarNoPainel(() => adm.locator('[data-campo-como-pagar]').fill('https://picpay.me/missa-de-quinta'));

    // ════ 7 · A virada do mês (o relógio do MOTOR anda) ════════════════════════════════════════════════════════════════════════
    await moverRelogio(filho, '2026-11-02T12:00:00-03:00');
    await irPara(adm, `/time/${slug}?aba=mensalidade`, '[data-lista-mensalidade]');
    t('virou o mês · "Novembro de 2026", todos em aberto ("0 de 6 pagaram"), sem job nenhum', (await texto(adm, '[data-nome-do-mes]')) === 'Novembro de 2026' && (await texto(adm, '[data-contador]')) === '0 de 6 pagaram' && (await adm.locator('[data-lista-mensalidade] [data-status="aberto"]').count()) === 6);
    await adm.locator('[data-mes-anterior]').click();
    await adm.locator('[data-mensalidade][data-mes="2026-10"]').waitFor({ timeout: 10000 });
    t('seta para trás · outubro guardado (a Ana "Pago") e ainda corrigível', (await adm.locator(`[data-linha="${P.ana.id}"][data-status="pago"]`).count()) === 1 && (await adm.locator('[data-mes-fechado]').count()) === 0 && await ehBotao(adm, P.ana.id));
    await adm.locator('[data-mes-anterior]').click();
    await adm.locator('[data-mensalidade][data-mes="2026-09"]').waitFor({ timeout: 10000 });
    await adm.locator('[data-mes-anterior]').click();
    await adm.locator('[data-mensalidade][data-mes="2026-08"]').waitFor({ timeout: 10000 });
    t('agosto (3 meses para trás) · "Mês fechado: dá só para ver." e ninguém se marca', (await texto(adm, '[data-mes-fechado]')) === 'Mês fechado: dá só para ver.' && !(await ehBotao(adm, P.ana.id)));
    await foto(adm, '11-admin-mes-fechado-390');
    let volta = 0;
    while ((await adm.locator('[data-mes-anterior]').isEnabled()) && volta < 10) { await adm.locator('[data-mes-anterior]').click(); await adm.waitForTimeout(500); volta += 1; }
    t('as setas param em junho, o mês em que o time nasceu', (await texto(adm, '[data-nome-do-mes]')) === 'Junho de 2026', await texto(adm, '[data-nome-do-mes]'));

    // ════ 8 · O lembrete do vencimento ══════════════════════════════════════════════════════════════════════════════════════
    const agendador = (segredo) => fetch(`${dados.base}/api/interno/mensalidade/lembretes`, { method: 'POST', headers: segredo ? { 'x-futty-interno': segredo } : {} });
    t('a rota do agendador sem o segredo (ou com o errado) é 401', (await agendador(null)).status === 401 && (await agendador('errado')).status === 401);
    await moverRelogio(filho, '2026-11-10T09:30:00-03:00');
    const r1 = await (await agendador(dados.segredo)).json();
    t('dia 10 às 9h30 (relógio do time) · nenhum lembrete', r1.enviados === 0, JSON.stringify(r1));
    await moverRelogio(filho, '2026-11-10T10:05:00-03:00');
    await (await agendador(dados.segredo)).json();
    await (await agendador(dados.segredo)).json();
    await moverRelogio(filho, '2026-11-11T18:00:00-03:00');
    await (await agendador(dados.segredo)).json();
    est = await estadoDoMotor(filho);
    const lembretes = est.pushes.filter((p) => p.titulo === 'Mensalidade de novembro do Missa de Quinta em aberto');
    const destinos = lembretes.flatMap((p) => p.ids);
    t('às 10h05 · "Mensalidade de novembro do Missa de Quinta em aberto" para os 6 (todos em aberto), UMA vez cada, mesmo chamando de novo e no dia seguinte', destinos.length === 6 && new Set(destinos).size === 6 && lembretes.every((p) => p.categoria === 'jogos' && p.corpo === 'R$ 60. Toque para ver como pagar.' && p.url === `/time/${slug}?aba=mensalidade`), JSON.stringify(lembretes));

    // ════ 9 · Desligar: tudo como era ════════════════════════════════════════════════════════════════════════════════════════
    await irPara(adm, `/time/${slug}?aba=ajustes#mensalidade`, '[data-ajustes-mensalidade]');
    await adm.getByRole('switch', { name: 'Controlar a mensalidade pelo app' }).click();
    await toast(adm, 'Mensalidade desligada');
    await irPara(adm, `/time/${slug}?aba=elenco`, '[data-convite-mensalidade]');
    t('desligada de novo · admin: Jogos · Elenco · Painel e o convite volta', JSON.stringify(await abasDe(adm)) === '["jogos","elenco","ajustes"]');
    await irPara(beto, `/time/${slug}?aba=mensalidade`, '[role="tablist"] [data-aba]');
    t('desligada de novo · jogador: Jogos · Elenco, e o ?aba=mensalidade cai em Jogos', JSON.stringify(await abasDe(beto)) === '["jogos","elenco"]' && (await beto.locator('[data-aba="jogos"][aria-selected="true"]').count()) === 1);

    // ════ 10 · "Traga seu histórico" ═════════════════════════════════════════════════════════════════════════════════════════
    const { page: admVazio } = await nova('adm', 360);
    await irPara(admVazio, `/time/${dados.varzea.slug}/ranking`, '[data-traga-historico="ranking"]');
    t('Ranking de um time sem jogo (admin) · o card com o texto e "Enviar por e-mail"', (await texto(admVazio, '[data-traga-historico="ranking"]')).includes('Já tem histórico em planilha ou outro app? Manda pra gente que a gente coloca no seu time.') && (await admVazio.locator('[data-enviar-historico]').count()) === 1 && await semRolagemLateral(admVazio));
    await foto(admVazio, '12-historico-ranking-360', { fullPage: false });
    await admVazio.locator('[data-enviar-historico]').click();
    await admVazio.waitForTimeout(800);
    await irPara(ana360, `/time/${slug}/ranking`, '[data-ranking-criterio], [data-botao-ranking], main');
    t('Ranking · o jogador nunca vê o card', (await ana360.locator('[data-traga-historico]').count()) === 0);
    await irPara(admVazio, '/feed', '[data-resenha-vazia]');
    t('Resenha vazia (admin) · o card aparece', (await admVazio.locator('[data-traga-historico="resenha"]').count()) === 1);
    await foto(admVazio, '13-historico-resenha-360', { fullPage: false });
    await admVazio.locator('[data-traga-historico="resenha"] [data-fechar-historico]').click();
    await irPara(admVazio, '/feed', '[data-resenha-vazia]');
    t('o X fecha e o card não volta para aquele time', (await admVazio.locator('[data-traga-historico="resenha"]').count()) === 0);

    // A festa do "Criar time" (pelo motor de verdade).
    const { page: criar } = await nova('adm', 390);
    await irPara(criar, '/criar-time', '[data-ir], [data-progresso]');
    if (await criar.locator('[data-ir]').count()) { await criar.locator('[data-ir]').click(); await criar.locator('[data-progresso]').waitFor(); }
    await criar.locator('input[placeholder="Ex.: Domingueira FC"]').fill('Pelada Nova');
    const cidade = criar.getByPlaceholder('Ex.: Brasília');
    await cidade.click();
    await cidade.fill('Bras');
    await criar.locator('[data-sugestoes-cidade] button', { hasText: 'Brasília, DF' }).first().click({ timeout: 15000 });
    for (let i = 0; i < 2; i += 1) { await criar.getByRole('button', { name: 'Continuar' }).click(); await criar.waitForTimeout(500); }
    await criar.getByRole('button', { name: 'Criar o time' }).click();
    await criar.locator('[data-traga-historico="criar_time"]').waitFor({ timeout: 30000 });
    t('a festa do "Criar time" · o card do histórico, antes de "Ir para o time"', (await criar.locator('[data-festa]').count()) === 1);
    await criar.locator('[data-traga-historico="criar_time"]').scrollIntoViewIfNeeded();
    await foto(criar, '14-historico-criar-time-390', { fullPage: false });
    await criar.locator('[data-traga-historico="criar_time"] [data-enviar-historico]').click();
    await criar.waitForTimeout(800);
    est = await estadoDoMotor(filho);
    t('no motor · cada toque em "Enviar por e-mail" ficou contado com a origem (ranking, criar_time)', est.interesse.some((x) => x.origem === 'ranking' && x.team_id === dados.varzea.id) && est.interesse.some((x) => x.origem === 'criar_time'), JSON.stringify(est.interesse));

    for (const [i, c] of cenas.entries()) {
      t(`cena ${i + 1} · sem erro de página, sem alerta do navegador e nada saiu da máquina (${c.estado.externos.length ? [...new Set(c.estado.externos.map((x) => x.split(' ')[1].split('/')[0]))].join(', ') : 'nada'})`, c.estado.erros.length === 0 && c.estado.dialogos === 0, c.estado.erros.slice(0, 3).join(' | '));
    }
  } finally {
    for (const c of cenas) await c.ctx.close().catch(() => {});
    const rede = await encerrarMotor(filho);
    t('o motor falso não tentou sair da máquina (rede fechada)', Array.isArray(rede) && rede.length === 0, `tentativas: ${JSON.stringify(rede)}`);
  }
}
