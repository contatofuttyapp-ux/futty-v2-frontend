// Prova no navegador da Rodada 32H — o jogo simples. O que só um Chromium de verdade confirma, com o motor de verdade, a 390 e 360 px:
//   · criar o jogo já CHAMA o elenco: o "Vou / Não vou" aparece na hora para todos, com "Sorteio às 20:00" (1 h antes) e a contagem; o aviso fica
//     registrado e sai pelo Web Push (nunca para quem criou);
//   · quem entra no time depois é chamado (e avisado) na hora; num jogo só com escolhidos, "Chamar mais gente" chama (e avisa) na hora;
//   · mudar a hora do jogo avisa quem foi chamado e o sorteio "1 h antes" anda junto; o admin muda a hora do sorteio; "Editar jogo" fecha
//     com o X e com Esc;
//   · o "Vou" trava ("Você está confirmado", os botões somem) e só "Trocar resposta" reabre; o Início tem UM cartão por jogo;
//   · o admin sorteia antes da hora (a lista fecha); às 20:00 a lista fecha sozinha ("Lista fechada · N confirmados"), na tela e no motor;
//   · o Ranking não solta confete nem para quem está no pódio; o Convidar mostra o link atual com "Vale até dd/mm (N dias)", e o vencido
//     esconde Copiar e WhatsApp até "Gerar link novo";
//   · a palavra "prazo" não aparece em tela nenhuma.
// Como: o motor de VERDADE sobe num processo à parte por cima de banco, Storage e Auth de mentira (scripts/provas/_motor-32h.cjs →
// backend/tests/_appFalsa.js; o .env do backend aponta para o banco de produção, e aqui nunca é lido), com um relógio que a prova move. O
// navegador vive no mesmo relógio. /api/** vai ao motor de mentira, o servidor das telas passa e QUALQUER outro endereço é respondido vazio.
//
// Uso: npm run provar:navegador -- rodada-32h      (~3 min)
//      R32H_FOTOS=pasta  salva a foto de cada passo
import { spawn } from 'node:child_process';
import { readFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const nome = 'Rodada 32H · O jogo simples: chama na hora, sorteio com hora, Vou travado, um cartão por jogo (motor de verdade, banco falso, relógio da prova)';

const RAIZ = fileURLToPath(new URL('../../', import.meta.url));
const MOTOR = path.join(RAIZ, 'scripts', 'provas', '_motor-32h.cjs');
const BACKEND_AO_LADO = path.resolve(RAIZ, '..', 'backend', 'tests', '_appFalsa.js');
const REF = new URL((readFileSync(new URL('../../.env', import.meta.url), 'utf8').match(/^VITE_SUPABASE_URL=(.+)$/m)?.[1] || 'https://prova.supabase.co').trim()).hostname.split('.')[0];
const FOTOS = process.env.R32H_FOTOS || '';

const APARELHOS = {
  390: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  360: { viewport: { width: 360, height: 780 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
};

function subirMotor() {
  return new Promise((resolve, reject) => {
    const filho = spawn(process.execPath, [MOTOR], { stdio: ['pipe', 'pipe', 'pipe'], cwd: RAIZ });
    let saida = '';
    let erro = '';
    const limite = setTimeout(() => { filho.kill(); reject(new Error(`o motor falso não ficou pronto em 120 s\n${erro.slice(-700)}`)); }, 120000);
    filho.stderr.on('data', (d) => { erro += d; });
    const aoLer = (d) => {
      saida += d;
      const linha = saida.split('\n').find((l) => l.startsWith('{"pronto"'));
      if (linha) { clearTimeout(limite); filho.stdout.off('data', aoLer); resolve({ filho, dados: JSON.parse(linha) }); }
    };
    filho.stdout.on('data', aoLer);
    filho.once('exit', (codigo) => { clearTimeout(limite); reject(new Error(`o motor falso saiu com ${codigo}\n${erro.slice(-900)}`)); });
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
function encerrarMotor(filho) {
  return new Promise((resolve) => {
    let saida = '';
    const acabou = (rede) => { clearTimeout(limite); try { filho.kill(); } catch { /* já saiu */ } resolve(rede); };
    const limite = setTimeout(() => acabou(null), 8000);
    filho.stdout.on('data', (d) => {
      saida += d;
      const linha = saida.split('\n').find((l) => l.startsWith('{"rede"'));
      if (linha) acabou(JSON.parse(linha).rede);
    });
    filho.once('exit', () => acabou(null));
    try { filho.stdin.write('fim\n'); } catch { acabou(null); }
  });
}

const sessaoDe = (dados, quem, agora) => JSON.stringify({
  access_token: dados.tokens[quem], refresh_token: 'prova', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(agora / 1000) + 86400 * 30,
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

async function abrir(navegador, baseDoVite, dados, quem, { aparelho = 390, relogio, movimento = 'reduce' }) {
  const ctx = await navegador.newContext({ ...APARELHOS[aparelho], locale: 'pt-BR', timezoneId: 'America/Sao_Paulo', serviceWorkers: 'block', reducedMotion: movimento });
  const estado = { externos: [], erros: [], dialogos: 0 };
  // O navegador vive no relógio do motor (o mundo da prova), e o tempo corre normal a partir dali.
  await ctx.clock.install({ time: new Date(relogio) });
  await ctx.clock.resume();
  await ctx.addInitScript(({ chave, sessao, times }) => {
    try {
      localStorage.setItem('futty_cookies', 'aceite');
      if (sessao) localStorage.setItem(chave, sessao);
      for (const id of times) localStorage.setItem(`futty_onboarding_${id}`, '1');
    } catch { /* sem armazenamento */ }
  }, { chave: `sb-${REF}-auth-token`, sessao: sessaoDe(dados, quem, Date.parse(relogio)), times: [dados.missa.id, dados.varzea.id] });
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
const texto = async (page, sel) => ((await page.locator(sel).count()) ? (await page.locator(sel).first().innerText()).trim() : null);
const semPrazo = async (page) => !/\bprazo\b/i.test(await page.locator('body').innerText());
const mesmo = (a, b) => JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());

export async function rodar({ navegador, base, t }) {
  try { readFileSync(BACKEND_AO_LADO); } catch { t('o backend não está ao lado (FUTTY-V2/backend): a prova foi pulada', true); return; }
  if (FOTOS) mkdirSync(FOTOS, { recursive: true });
  const foto = async (page, nomeDaFoto, opcoes = {}) => {
    if (!FOTOS) return;
    try { await page.screenshot({ path: path.join(FOTOS, `${nomeDaFoto}.png`), fullPage: true, timeout: 15000, ...opcoes }); } catch (e) { t(`foto ${nomeDaFoto}`, false, e.message.split('\n')[0]); }
  };
  const { filho, dados } = await subirMotor();
  const P = dados.pessoas;
  const slug = dados.missa.slug;
  let relogio = dados.relogio;
  const moverRelogio = async (iso) => { relogio = await falarComOMotor(filho, `relogio ${iso}`, 'relogio'); };
  const cenas = [];
  // O navegador nasce na hora EXATA do motor (o relógio dele andou desde a última mudança): o "vale 30 dias" e a contagem batem.
  const nova = async (quem, opcoes = {}) => { relogio = (await estadoDoMotor(filho)).agora; const c = await abrir(navegador, base, dados, quem, { relogio, ...opcoes }); cenas.push(c); return c; };
  const irPara = async (page, caminho, esperar) => { await page.goto(`${base}${caminho}`, { waitUntil: 'domcontentloaded' }); await page.locator(esperar).first().waitFor({ timeout: 40000 }); await page.waitForTimeout(400); };
  const toast = async (page, trecho) => { const el = page.locator('.futty-toast', { hasText: trecho }).first(); await el.waitFor({ timeout: 10000 }); return (await el.innerText()).trim(); };
  const api = async (quem, metodo, rota, corpo) => {
    const r = await fetch(`${dados.base}${rota}`, { method: metodo, headers: { authorization: `Bearer ${dados.tokens[quem]}`, 'content-type': 'application/json' }, body: corpo ? JSON.stringify(corpo) : undefined });
    return { status: r.status, json: await r.json().catch(() => null) };
  };
  // Fecha a janela quando a cena acaba (os erros dela já ficaram anotados): uma dúzia aberta ao mesmo tempo deixava as fotos lentas.
  const largar = (page) => page.context().close().catch(() => {});
  const cartao = (page, gameId) => page.locator('.gcard', { has: page.locator(`a.gcard__link[href="/time/${slug}/jogo/${gameId}"]`) });
  // A foto do Início com o cartão do jogo no meio da tela (a de página inteira põe a barra de baixo por cima dele).
  const fotoDoCartao = async (page, gameId, nomeDaFoto) => { await cartao(page, gameId).scrollIntoViewIfNeeded(); await page.evaluate(() => window.scrollBy(0, 160)); await page.waitForTimeout(300); await foto(page, nomeDaFoto, { fullPage: false }); };
  const pushesCom = (est, titulo) => est.pushes.filter((p) => p.titulo === titulo);
  const elencoMenosAutor = [P.ana.id, P.beto.id, P.caio.id];

  // Criar um jogo pela tela do Novo jogo e devolver o id (a tela leva à página do jogo).
  const criarPelaTela = async (page, { data, hora, local, escolher = null }) => {
    await irPara(page, `/time/${slug}/jogo/novo`, '#data');
    await page.locator('#data').fill(data);
    await page.locator('#hora').fill(hora);
    await page.locator('#local').fill(local);
    if (escolher) {
      await page.locator('[data-mudar-chamada]').click();
      await page.locator('[data-escolher-quem]').click();
      await page.locator('[data-chamar-membro]').first().waitFor({ timeout: 15000 });
      for (const linha of await page.locator('[data-chamar-membro]').all()) {
        const nomeDaLinha = (await linha.innerText()).trim().split('\n').at(-1).trim(); // o avatar sem foto escreve as iniciais antes do nome
        const marcado = await linha.locator('input[type="checkbox"]').isChecked();
        if (marcado !== escolher.includes(nomeDaLinha)) await linha.locator('input[type="checkbox"]').click();
      }
    }
    return async () => {
      await page.getByRole('button', { name: 'Criar jogo' }).click();
      await page.waitForURL(/\/jogo\/[0-9a-f-]{36}$/, { timeout: 20000 });
      return page.url().split('/').at(-1);
    };
  };

  try {
    // ════ A · Criar o jogo já chama todo mundo ═══════════════════════════════════════════════════════════════════════════════════
    const { page: adm } = await nova('adm');
    const criarJ1 = await criarPelaTela(adm, { data: '2026-10-29', hora: '21:00', local: 'Arena da Quinta' });
    t('Novo jogo · uma linha só: "Sorteio às 20:00 · todo o elenco" e "mudar"', (await texto(adm, '[data-sorteio-padrao]')) === 'Sorteio às 20:00 · todo o elenco' && (await adm.locator('[data-mudar-chamada]').count()) === 1, await texto(adm, '[data-sorteio-padrao]'));
    const criar = await adm.getByRole('button', { name: 'Criar jogo', exact: true }).boundingBox();
    t(`Novo jogo · "Criar jogo" na primeira tela de 390×844 (termina em ${Math.round(criar.y + criar.height)} px); nada de "prazo"; nada rola para o lado`, criar.y + criar.height <= 844 && await semPrazo(adm) && await semRolagemLateral(adm));
    await foto(adm, '01-novo-jogo-390');
    await adm.locator('[data-mudar-chamada]').click();
    t('Novo jogo · "mudar" abre os dois: o dia e a hora do sorteio (20:00, acompanhando o jogo) e "Quem é chamado: Todo o elenco"', (await adm.locator('[data-sorteio-hora]').inputValue()) === '20:00' && (await texto(adm, '[data-elenco-inteiro]')) === 'Todo o elenco');
    await foto(adm, '01c-novo-jogo-aberto-390');
    {
      const { page: p360 } = await nova('adm', { aparelho: 360 });
      await criarPelaTela(p360, { data: '2026-10-29', hora: '21:00', local: 'Arena da Quinta' });
      t('Novo jogo 360 px · o Sorteio e "Quem é chamado" cabem (nada rola para o lado)', await semRolagemLateral(p360));
      await foto(p360, '01b-novo-jogo-360');
      await largar(p360);
    }
    const J1 = await criarJ1();
    let est = await estadoDoMotor(filho);
    const j1 = est.jogos.find((g) => g.id === J1);
    t('no motor · o jogo nasce com o sorteio às 20:00 (23:00 UTC) e chamando o elenco inteiro (chamados = null)', j1?.sorteio_em === '2026-10-29T23:00:00.000Z' && j1.chamados == null, JSON.stringify(j1));
    const criado = pushesCom(est, '⚽ Jogo marcado: Missa de Quinta');
    t('no motor · o aviso "Jogo marcado" saiu pelo Web Push para o elenco (sem o Chavo, que criou), categoria jogos', criado.length === 1 && mesmo(criado[0].ids, elencoMenosAutor) && criado[0].categoria === 'jogos' && criado[0].url === `/time/${slug}/jogo/${J1}`, JSON.stringify(criado));
    t('no motor · o evento ficou registrado (jogo_avisos "criado", com os destinatários e o Web Push marcado)', est.avisos.some((a) => a.game_id === J1 && a.tipo === 'criado' && mesmo(a.destinatarios, elencoMenosAutor) && a.web));
    await adm.locator('[data-sua-presenca]').waitFor({ timeout: 20000 });
    t('página do jogo · "Sorteio às 20:00" e a contagem "Sorteio em 2 dias"; o Vou / Não vou já está lá', (await texto(adm, '[data-sua-presenca] [data-hora-do-sorteio]')) === 'Sorteio às 20:00' && (await texto(adm, '[data-sua-presenca] [data-contagem]')) === 'Sorteio em 2 dias' && (await adm.locator('[data-sua-presenca] [data-vou]').count()) === 1);
    await foto(adm, '02-jogo-criado-390');

    // ════ D + C · O Início: UM cartão por jogo; o Vou trava; "Trocar resposta" reabre ═════════════════════════════════════════════
    const { page: ana } = await nova('ana');
    await irPara(ana, '/home', `a.gcard__link[href="/time/${slug}/jogo/${J1}"]`);
    const c1 = cartao(ana, J1);
    t('Início · UM cartão para o jogo (nenhum aviso "Você vai?" em cima, nenhum cartão de presença à parte)', (await c1.count()) === 1 && (await ana.locator('[data-aviso="jogo"]').count()) === 0 && (await ana.getByText('Confirme presença').count()) === 0);
    t('Início · o cartão diz "Sorteio às 20:00" e "Sorteio em 2 dias", com Vou / Não vou', (await c1.locator('[data-hora-do-sorteio]').innerText()) === 'Sorteio às 20:00' && (await c1.locator('[data-contagem]').innerText()) === 'Sorteio em 2 dias' && (await c1.locator('[data-vou]').count()) === 1 && (await c1.locator('[data-nao-vou]').count()) === 1);
    await fotoDoCartao(ana, J1, '03-inicio-um-cartao-390');
    const respondeu = ana.waitForResponse((r) => r.url().includes(`/api/jogos/${J1}/rsvp/responder`), { timeout: 15000 });
    await c1.locator('[data-vou]').click();
    await c1.locator('[data-resposta="confirmado"]').waitFor({ timeout: 10000 });
    const resposta = await respondeu;
    t('Vou · o motor aceitou (200)', resposta.status() === 200, `${resposta.status()} ${await resposta.text().catch(() => '')}`);
    t('Vou · trava: "Você está confirmado" com o check, os botões somem e fica só o "Trocar resposta"', (await c1.locator('[data-resposta-texto]').innerText()).trim() === 'Você está confirmado' && (await c1.locator('[data-resposta-texto] svg').count()) === 1 && (await c1.locator('[data-vou], [data-nao-vou]').count()) === 0 && (await c1.locator('[data-trocar-resposta]').count()) === 1);
    await fotoDoCartao(ana, J1, '04-inicio-vou-travado-390');
    est = await estadoDoMotor(filho);
    t('no motor · o "Vou" vale na hora: na lista e no elenco do sorteio', est.respostas.some((r) => r.game_id === J1 && r.user_id === P.ana.id && r.status === 'confirmado') && est.elenco.some((e) => e.game_id === J1 && e.user_id === P.ana.id && e.confirmado === true));
    await ana.waitForTimeout(1200); // a releitura por trás do Início (o que fica guardado no aparelho)
    // Recarregar mostra primeiro o Início guardado no aparelho (antes da rede): ele já tem que vir travado.
    await irPara(ana, '/home', `a.gcard__link[href="/time/${slug}/jogo/${J1}"]`);
    t('recarregou · continua travado em "Você está confirmado" (já no Início guardado, antes da rede)', (await cartao(ana, J1).locator('[data-resposta="confirmado"]').count()) === 1,
      `cartão: ${await cartao(ana, J1).locator('[data-resposta]').getAttribute('data-resposta').catch(() => '?')} · motor: ${JSON.stringify(((await api('ana', 'GET', '/api/inicio')).json?.convites?.games || []).filter((g) => g.id === J1).map((g) => g.user_status))}`);
    await cartao(ana, J1).locator('[data-trocar-resposta]').click();
    t('"Trocar resposta" · reabre os dois botões (e "Manter")', (await cartao(ana, J1).locator('[data-vou]').count()) === 1 && (await cartao(ana, J1).locator('[data-nao-vou]').count()) === 1 && (await cartao(ana, J1).locator('[data-manter-resposta]').count()) === 1);
    await cartao(ana, J1).locator('[data-nao-vou]').click();
    await cartao(ana, J1).locator('[data-resposta="recusado"]').waitFor({ timeout: 10000 });
    t('Não vou · trava em "Você não vai nesse jogo"', (await cartao(ana, J1).locator('[data-resposta-texto]').innerText()).trim() === 'Você não vai nesse jogo' && (await cartao(ana, J1).locator('[data-vou]').count()) === 0);
    est = await estadoDoMotor(filho);
    t('no motor · trocou: "recusado" na lista e fora do elenco do sorteio', est.respostas.some((r) => r.game_id === J1 && r.user_id === P.ana.id && r.status === 'recusado') && est.elenco.some((e) => e.game_id === J1 && e.user_id === P.ana.id && e.confirmado === false));
    await fotoDoCartao(ana, J1, '05-inicio-nao-vou-390');
    await cartao(ana, J1).locator('[data-trocar-resposta]').click();
    await cartao(ana, J1).locator('[data-vou]').click();
    await cartao(ana, J1).locator('[data-resposta="confirmado"]').waitFor({ timeout: 10000 });
    {
      const { page: a360 } = await nova('ana', { aparelho: 360 });
      await irPara(a360, '/home', `a.gcard__link[href="/time/${slug}/jogo/${J1}"]`);
      t('Início 360 px · um cartão, travado, nada rola para o lado', (await cartao(a360, J1).count()) === 1 && (await cartao(a360, J1).locator('[data-resposta="confirmado"]').count()) === 1 && await semRolagemLateral(a360));
      await fotoDoCartao(a360, J1, '05b-inicio-travado-360');
      await irPara(a360, `/time/${slug}/jogo/${J1}`, '[data-sua-presenca]');
      t('página do jogo · o mesmo Vou travado e "Trocar resposta"', (await a360.locator('[data-sua-presenca] [data-resposta="confirmado"]').count()) === 1 && (await a360.locator('[data-sua-presenca] [data-trocar-resposta]').count()) === 1 && await semRolagemLateral(a360) && await semPrazo(a360));
      await foto(a360, '05c-jogo-travado-360', { fullPage: false });
      await largar(a360);
    }
    t('o Beto responde "Vou" (pelo motor)', (await api('beto', 'POST', `/api/jogos/${J1}/rsvp/responder`, { status: 'confirmado' })).status === 200);

    // ════ A · Quem entra no time depois é chamado na hora ════════════════════════════════════════════════════════════════════════
    const convite = (await api('adm', 'POST', `/api/teams/${slug}/convite`, {})).json;
    t('a Duda entra no time pelo convite', (await api('duda', 'POST', `/api/convite/${convite.token}/aceitar`, {})).status === 201);
    await new Promise((ok) => setTimeout(ok, 300));
    est = await estadoDoMotor(filho);
    const chamadaDuda = pushesCom(est, '⚽ Você foi chamado para o jogo do Missa de Quinta');
    t('no motor · a Duda é chamada para o jogo na hora (push "Você foi chamado…", registro "chamado")', chamadaDuda.length === 1 && mesmo(chamadaDuda[0].ids, [P.duda.id]) && est.avisos.some((a) => a.game_id === J1 && a.tipo === 'chamado' && mesmo(a.destinatarios, [P.duda.id])), JSON.stringify(chamadaDuda));
    const { page: duda } = await nova('duda');
    await irPara(duda, '/home', `a.gcard__link[href="/time/${slug}/jogo/${J1}"]`);
    t('Início da Duda · o jogo com "Vou / Não vou"', (await cartao(duda, J1).locator('[data-vou]').count()) === 1);
    await largar(duda);

    // ════ A · Só os escolhidos, e "Chamar mais gente" ═══════════════════════════════════════════════════════════════════════════
    const criarJ2 = await criarPelaTela(adm, { data: '2026-10-30', hora: '19:00', local: 'Society do Lago', escolher: ['Ana'] });
    t('Novo jogo · "escolher quem": a lista do elenco, "1 pessoa chamada de 5"', (await texto(adm, '[data-quantos-chamados]')) === '1 pessoa chamada de 5', await texto(adm, '[data-quantos-chamados]'));
    await foto(adm, '06-novo-jogo-escolher-quem-390');
    const J2 = await criarJ2();
    est = await estadoDoMotor(filho);
    t('no motor · o jogo chama só a Ana (e só ela é avisada)', JSON.stringify(est.jogos.find((g) => g.id === J2)?.chamados) === JSON.stringify([P.ana.id]) && est.avisos.some((a) => a.game_id === J2 && a.tipo === 'criado' && mesmo(a.destinatarios, [P.ana.id])));
    const { page: beto } = await nova('beto');
    await irPara(beto, '/home', `a.gcard__link[href="/time/${slug}/jogo/${J2}"]`);
    t('Início do Beto · "Você não foi chamado para este jogo." (sem Vou / Não vou)', (await cartao(beto, J2).locator('[data-nao-chamado]').count()) === 1 && (await cartao(beto, J2).locator('[data-vou]').count()) === 0);
    await irPara(adm, `/time/${slug}?aba=jogos`, `[data-jogo="${J2}"] [data-presenca-admin]`);
    const cJ2 = adm.locator(`[data-jogo="${J2}"]`);
    await cJ2.locator('[data-chamar-mais]').click();
    await cJ2.locator('[data-chamar-lista] label', { hasText: 'Beto' }).locator('input').click();
    await foto(adm, '07-painel-chamar-mais-390');
    await cJ2.locator('[data-chamar-confirmar]').click();
    const toastChamar = await toast(adm, 'pessoa chamada');
    t('Painel · "Chamar mais gente" chama o Beto: "1 pessoa chamada. O aviso sai agora."', toastChamar.includes('1 pessoa chamada. O aviso sai agora.'), toastChamar);
    await new Promise((ok) => setTimeout(ok, 300));
    est = await estadoDoMotor(filho);
    t('no motor · o Beto entra nos chamados e é avisado na hora (registro "chamado")', est.jogos.find((g) => g.id === J2)?.chamados?.includes(P.beto.id) && est.avisos.some((a) => a.game_id === J2 && a.tipo === 'chamado' && mesmo(a.destinatarios, [P.beto.id])));
    await irPara(beto, '/home', `a.gcard__link[href="/time/${slug}/jogo/${J2}"]`);
    t('Início do Beto · agora com "Vou / Não vou" no jogo', (await cartao(beto, J2).locator('[data-vou]').count()) === 1);
    await largar(beto);

    // ════ E/F · Editar jogo: Esc e X fecham; mudar a hora avisa e leva o sorteio junto; o admin muda a hora do sorteio ═══════════
    await irPara(adm, `/time/${slug}?aba=jogos`, `[data-jogo="${J1}"]`);
    const cJ1 = adm.locator(`[data-jogo="${J1}"]`);
    t('Painel · nada de "Abrir presença", "Fechar presença" nem "prazo"; a presença diz a hora do sorteio e quem respondeu', (await adm.getByText(/Abrir presença|Fechar presença/).count()) === 0 && await semPrazo(adm) && (await cJ1.locator('[data-hora-do-sorteio]').innerText()) === 'Sorteio às 20:00');
    await foto(adm, '08-painel-jogos-390');
    await cJ1.getByRole('button', { name: 'Editar' }).click();
    await adm.locator('[data-editar-jogo]').waitFor();
    await adm.keyboard.press('Escape');
    await adm.locator('[data-editar-jogo]').waitFor({ state: 'detached', timeout: 5000 });
    t('Editar jogo · Esc fecha', (await adm.locator('[data-editar-jogo]').count()) === 0);
    await cJ1.getByRole('button', { name: 'Editar' }).click();
    await adm.locator('[data-fechar-editar-jogo]').click();
    t('Editar jogo · o X fecha', (await adm.locator('[data-editar-jogo]').count()) === 0);
    await cJ1.getByRole('button', { name: 'Editar' }).click();
    const modal = adm.locator('[data-editar-jogo]');
    await modal.locator('input[type="time"]').first().fill('21:30');
    t('Editar jogo · mudou a hora do jogo: o sorteio "1 h antes" acompanha (20:30)', (await modal.locator('[data-sorteio-hora]').inputValue()) === '20:30');
    await foto(adm, '09-editar-jogo-390', { fullPage: false });
    await modal.getByRole('button', { name: 'Salvar' }).click();
    await toast(adm, 'Jogo atualizado');
    await new Promise((ok) => setTimeout(ok, 300));
    est = await estadoDoMotor(filho);
    const mudou = pushesCom(est, '📅 O jogo do Missa de Quinta mudou');
    t('no motor · 21:30 e o sorteio às 20:30; quem foi chamado é avisado ("Agora: 29/10 · 21:30 · Arena da Quinta.")', est.jogos.find((g) => g.id === J1)?.sorteio_em === '2026-10-29T23:30:00.000Z' && mudou.length === 1 && mesmo(mudou[0].ids, [P.ana.id, P.beto.id, P.caio.id, P.duda.id]) && mudou[0].corpo === 'Agora: 29/10 · 21:30 · Arena da Quinta.' && est.avisos.some((a) => a.game_id === J1 && a.tipo === 'mudou'), JSON.stringify(mudou));
    await irPara(adm, `/time/${slug}?aba=jogos`, `[data-jogo="${J1}"]`);
    await adm.locator(`[data-jogo="${J1}"]`).getByRole('button', { name: 'Editar' }).click();
    await modal.locator('[data-sorteio-hora]').fill('20:00');
    await modal.getByRole('button', { name: 'Salvar' }).click();
    await toast(adm, 'Jogo atualizado');
    await new Promise((ok) => setTimeout(ok, 300));
    est = await estadoDoMotor(filho);
    t('o admin muda a hora do sorteio (20:00): vale no motor e não avisa ninguém (só data, hora e local avisam)', est.jogos.find((g) => g.id === J1)?.sorteio_em === '2026-10-29T23:00:00.000Z' && pushesCom(est, '📅 O jogo do Missa de Quinta mudou').length === 1);

    // ════ B · O admin sorteia ANTES da hora: a lista fecha ═════════════════════════════════════════════════════════════════════
    const J3 = (await api('adm', 'POST', '/api/games', { team_slug: slug, data: '2026-10-31T13:00:00.000Z', local: 'Campo do Sábado', jogadores_por_time: 2 })).json.game.id;
    for (const k of ['adm', 'ana', 'beto', 'caio']) await api(k, 'POST', `/api/jogos/${J3}/rsvp/responder`, { status: 'confirmado' });
    await irPara(adm, `/time/${slug}?aba=jogos`, `[data-jogo="${J3}"] [data-presenca-admin]`);
    const cJ3 = adm.locator(`[data-jogo="${J3}"]`);
    t('Painel · lista aberta: "Sortear agora" (antes da hora do sorteio)', (await cJ3.locator('[data-presenca-admin]').getAttribute('data-lista')) === 'aberta' && (await cJ3.locator('[data-sortear]').innerText()).trim() === 'Sortear agora');
    await cJ3.locator('[data-sortear]').click();
    await adm.locator('[data-escolha="sortear"]').waitFor({ timeout: 20000 });
    await adm.locator('[data-escolha="sortear"]').click();
    await adm.waitForURL(/\/sorteio$/, { timeout: 30000 });
    est = await estadoDoMotor(filho);
    t('no motor · sorteado antes da hora', est.jogos.find((g) => g.id === J3)?.sorteio_realizado === true);
    const tarde = await api('duda', 'POST', `/api/jogos/${J3}/rsvp/responder`, { status: 'confirmado' });
    t('a lista fechou com o sorteio: responder dá 409 "A lista deste jogo já fechou."', tarde.status === 409 && tarde.json?.error === 'A lista deste jogo já fechou.' && tarde.json?.code === 'LISTA_FECHADA', JSON.stringify(tarde));
    await irPara(adm, `/time/${slug}?aba=jogos`, `[data-jogo="${J3}"] [data-presenca-admin]`);
    t('Painel · "Lista fechada · 4 confirmados" e, já sorteado, "Ver os times" (nunca "Fazer sorteio" de novo)', (await adm.locator(`[data-jogo="${J3}"] [data-lista-fechada]`).innerText()) === 'Lista fechada · 4 confirmados' && (await adm.locator(`[data-jogo="${J3}"] [data-ver-sorteio]`).count()) === 1 && (await adm.locator(`[data-jogo="${J3}"] [data-sortear]`).count()) === 0);
    await irPara(ana, `/time/${slug}/jogo/${J3}`, '[data-sua-presenca]');
    t('página do jogo da Ana · "Você está confirmado" sem "Trocar resposta" (a lista fechou)', (await ana.locator('[data-sua-presenca] [data-resposta="confirmado"]').count()) === 1 && (await ana.locator('[data-trocar-resposta]').count()) === 0);
    await largar(ana);

    // ════ G · A foto da Resenha com o token vencido volta a carregar ═════════════════════════════════════════════════════════════
    const velha = await fetch(dados.fotoVelha.urlGuardada);
    t('G · a URL guardada há 3 semanas, sozinha, dá 403 no proxy (o defeito)', velha.status === 403);
    const { page: resenha } = await nova('beto');
    await irPara(resenha, '/feed', 'main');
    const daFoto = resenha.locator('img[src*="/api/media/"]');
    await resenha.waitForFunction((p) => [...document.querySelectorAll('img[src*="/api/media/"]')].some((img) => {
      try {
        const corpo = img.src.split('/api/media/')[1].split(/[?.]/)[0];
        return JSON.parse(atob(corpo.replace(/-/g, '+').replace(/_/g, '/'))).p === p && img.complete && img.naturalWidth > 0;
      } catch { return false; }
    }), dados.fotoVelha.path, { timeout: 20000 }).catch(() => {});
    const carregou = await resenha.evaluate((p) => [...document.querySelectorAll('img[src*="/api/media/"]')].filter((img) => {
      try {
        const corpo = img.src.split('/api/media/')[1].split(/[?.]/)[0];
        return JSON.parse(atob(corpo.replace(/-/g, '+').replace(/_/g, '/'))).p === p;
      } catch { return false; }
    }).map((img) => ({ ok: img.complete && img.naturalWidth > 0, largura: img.naturalWidth })), dados.fotoVelha.path);
    t('G · na Resenha, a foto do post de 3 semanas atrás CARREGA (token renovado na leitura)', carregou.length > 0 && carregou.every((x) => x.ok), JSON.stringify(carregou) + ` (${await daFoto.count()} imagens do proxy)`);
    await resenha.locator('img[src*="/api/media/"]').first().scrollIntoViewIfNeeded().catch(() => {});
    await foto(resenha, '10b-resenha-foto-antiga-390', { fullPage: false });
    await largar(resenha);

    // ════ F · O Ranking não solta confete (nem para a 1ª do pódio) ═══════════════════════════════════════════════════════════════
    const ranking = (await api('ana', 'GET', `/api/teams/${slug}/ranking`)).json;
    const euNoRanking = (ranking?.ranking || ranking?.jogadores || []).find((p) => p.user_id === P.ana.id || p.id === P.ana.id);
    t('o mundo · a Ana é a 1ª do Ranking, com jogo (o pódio que antes soltava confete)', euNoRanking?.posicao === 1 && euNoRanking.presenca > 0, JSON.stringify(euNoRanking || Object.keys(ranking || {})));
    const { page: anaRanking } = await nova('ana', { movimento: 'no-preference' });
    await irPara(anaRanking, `/time/${slug}/ranking`, 'main');
    await anaRanking.waitForTimeout(2000);
    t('Ranking · nenhum confete (nenhum canvas por cima da tela), com o movimento ligado', (await anaRanking.evaluate(() => [...document.querySelectorAll('canvas')].filter((c) => getComputedStyle(c).position === 'fixed').length)) === 0);
    await foto(anaRanking, '10-ranking-sem-confete-390', { fullPage: false });
    await largar(anaRanking);

    // ════ F · Convidar: o link atual com a validade; vencido esconde Copiar e WhatsApp ═══════════════════════════════════════════
    await irPara(adm, `/time/${slug}?aba=elenco`, '[data-convidar]');
    await adm.locator('[data-convidar]').click();
    await adm.locator('[data-convite-validade]').waitFor({ timeout: 15000 });
    t('Convidar · o link atual (o mesmo que a Duda usou) com "Vale até 26/11 (30 dias)", Copiar e WhatsApp', (await texto(adm, '[data-convite-validade]')) === 'Vale até 26/11 (30 dias)' && (await adm.locator('input[readonly]').inputValue()).includes(convite.codigo || convite.token) && (await adm.locator('[data-whatsapp]').count()) === 1 && (await adm.locator('[data-whatsapp]').locator('xpath=..').getByRole('button', { name: 'Copiar' }).count()) === 1, `${await texto(adm, '[data-convite-validade]')} · ${await adm.locator('input[readonly]').first().inputValue().catch(() => '?')} · ${JSON.stringify(convite)}`);
    await foto(adm, '11-convidar-validade-390', { fullPage: false });
    await largar(adm);
    await falarComOMotor(filho, `vencer ${dados.varzea.slug}`, 'vencido');
    const { page: adm360 } = await nova('adm', { aparelho: 360 });
    await irPara(adm360, `/time/${dados.varzea.slug}?aba=elenco`, '[data-convidar]');
    await adm360.locator('[data-convidar]').click();
    await adm360.locator('[data-convite-vencido]').waitFor({ timeout: 15000 });
    t('Convidar · link vencido: "Vencido", sem Copiar e sem WhatsApp, com "Gerar link novo"', (await texto(adm360, '[data-convite-vencido]')) === 'Vencido' && (await adm360.locator('[data-whatsapp]').count()) === 0 && (await adm360.locator('[data-convite-vencido]').locator('xpath=../..').getByRole('button', { name: 'Copiar' }).count()) === 0 && (await adm360.locator('[data-gerar-link-novo]').count()) === 1 && await semRolagemLateral(adm360));
    await foto(adm360, '12-convidar-vencido-360', { fullPage: false });
    await adm360.locator('[data-gerar-link-novo]').click();
    await adm360.locator('[data-convite-validade]').waitFor({ timeout: 15000 });
    t('"Gerar link novo" · "Vale até 26/11 (30 dias)", e Copiar e WhatsApp voltam', (await texto(adm360, '[data-convite-validade]')) === 'Vale até 26/11 (30 dias)' && (await adm360.locator('[data-whatsapp]').count()) === 1);
    await foto(adm360, '13-convidar-link-novo-360', { fullPage: false });
    await largar(adm360);

    // ════ B · Às 20:00 a lista fecha sozinha ════════════════════════════════════════════════════════════════════════════════════
    await moverRelogio('2026-10-29T19:57:00-03:00');
    const { ctx: ctxQuase, page: anaQuase } = await nova('ana');
    await irPara(anaQuase, '/home', `a.gcard__link[href="/time/${slug}/jogo/${J1}"]`);
    t('19:57 · "Sorteio em 3min" e ainda dá para trocar', (await cartao(anaQuase, J1).locator('[data-contagem]').innerText()) === 'Sorteio em 3min' && (await cartao(anaQuase, J1).locator('[data-trocar-resposta]').count()) === 1);
    await fotoDoCartao(anaQuase, J1, '14-inicio-1957-390');
    await ctxQuase.clock.fastForward('04:00');
    await cartao(anaQuase, J1).locator('[data-lista-fechada]').waitFor({ timeout: 10000 });
    t('o relógio passa das 20:00 com a tela aberta · o cartão fecha sozinho, sem recarregar ("Lista fechada", sem "Trocar resposta")', (await cartao(anaQuase, J1).locator('[data-trocar-resposta]').count()) === 0);
    await largar(anaQuase);
    await moverRelogio('2026-10-29T20:00:30-03:00');
    const { page: anaDepois } = await nova('ana');
    await irPara(anaDepois, '/home', `a.gcard__link[href="/time/${slug}/jogo/${J1}"]`);
    const confirmadosJ1 = (await estadoDoMotor(filho)).elenco.filter((e) => e.game_id === J1 && e.confirmado).length;
    t(`20:00 · "Lista fechada · ${confirmadosJ1} confirmados" e "Você está confirmado" sem botão nenhum`, (await cartao(anaDepois, J1).locator('[data-lista-fechada]').innerText()) === `Lista fechada · ${confirmadosJ1} confirmados` && (await cartao(anaDepois, J1).locator('[data-resposta="confirmado"]').count()) === 1 && (await cartao(anaDepois, J1).locator('button[data-vou], button[data-nao-vou], button[data-trocar-resposta]').count()) === 0);
    await fotoDoCartao(anaDepois, J1, '15-inicio-lista-fechada-390');
    await largar(anaDepois);
    const { page: caio } = await nova('caio', { aparelho: 360 });
    await irPara(caio, '/home', `a.gcard__link[href="/time/${slug}/jogo/${J1}"]`);
    t('20:00 · quem não respondeu vê "Lista fechada. Você não respondeu." (sem botões)', (await cartao(caio, J1).locator('[data-resposta="fechada"]').innerText()).trim() === 'Lista fechada. Você não respondeu.' && (await cartao(caio, J1).locator('[data-vou]').count()) === 0 && await semRolagemLateral(caio));
    await fotoDoCartao(caio, J1, '16-inicio-nao-respondeu-360');
    await largar(caio);
    const fechada = await api('caio', 'POST', `/api/jogos/${J1}/rsvp/responder`, { status: 'confirmado' });
    t('no motor · às 20:00 a lista fechou sozinha (sem job): responder dá 409 "A lista deste jogo já fechou."', fechada.status === 409 && fechada.json?.code === 'LISTA_FECHADA', JSON.stringify(fechada));
    const { page: admDepois } = await nova('adm');
    await irPara(admDepois, `/time/${slug}?aba=jogos`, `[data-jogo="${J1}"] [data-presenca-admin]`);
    t('Painel · J1 fechado: "Lista fechada · N confirmados" e "Fazer sorteio com confirmados"', (await admDepois.locator(`[data-jogo="${J1}"] [data-presenca-admin]`).getAttribute('data-lista')) === 'fechada' && (await admDepois.locator(`[data-jogo="${J1}"] [data-sortear]`).innerText()).trim() === 'Fazer sorteio com confirmados');
    await foto(admDepois, '17-painel-lista-fechada-390');

    for (const [i, c] of cenas.entries()) {
      t(`cena ${i + 1} · sem erro de página, sem alerta do navegador e nada saiu da máquina (${c.estado.externos.length ? [...new Set(c.estado.externos.map((x) => x.split(' ')[1].split('/')[0]))].join(', ') : 'nada'})`, c.estado.erros.length === 0 && c.estado.dialogos === 0, c.estado.erros.slice(0, 3).join(' | '));
    }
  } finally {
    for (const c of cenas) await c.ctx.close().catch(() => {});
    const rede = await encerrarMotor(filho);
    t('o motor falso não tentou sair da máquina (rede fechada)', Array.isArray(rede) && rede.length === 0, `tentativas: ${JSON.stringify(rede)}`);
  }
}
