// Prova no navegador da Rodada 31T — Missa de Quinta: o que só um Chromium de verdade confirma, com as MESMAS fontes e o MESMO CSS do app, a 390 e a 360 px:
//   · Resenha: os jogos antigos que só têm a foto do campeão viram cartão do jogo (foto carregada, legenda "Time campeão", sem autor e sem nomes); nenhum
//     post "🏆 Time campeão · data" sobra; o post comum continua com o autor;
//   · presença de fundador: todo membro, inclusive quem entrou HOJE e quem entra DAQUI A UM MÊS, tem presença nos jogos até 18-out (e só neles, sem
//     confirmar); o Ranking mostra os pontos dele (não o "—" de quem nunca jogou); a vitrine conta os jogos;
//   · "Associar jogador": a janela mostra o carregando DENTRO dela (era o F da página, escondido atrás da janela — a tela "sem ninguém para escolher"),
//     um erro com "Tentar de novo" quando a lista falha, e depois a lista com os membros; associar passa a vitória do jogo de 15-out para a conta.
// Como: o motor de VERDADE (todas as rotas) sobe num processo à parte por cima de banco, Storage e Auth de mentira, em memória
// (scripts/provas/_motor-31t.cjs → backend/tests/_appFalsa.js; o .env do backend, que aponta para o banco de produção, nunca é lido). O mundo é a Missa
// DEPOIS do FUT\DADOS-31T.sql (o SQL é provado à parte, num Postgres local). Todo pedido do navegador passa por aqui: /api/** vai ao motor de mentira, o
// servidor das telas passa e qualquer outro endereço (inclusive o Supabase de produção) é respondido vazio sem sair da máquina — e anotado.
//
// Uso: npm run provar:navegador -- rodada-31t      (~1 min)
//      R31T_FOTOS=pasta  salva a foto de cada passo (390 e 360)
import { spawn } from 'node:child_process';
import { readFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const nome = 'Rodada 31T · Missa de Quinta: fotos no cartão do jogo, presença de fundador e "Associar" com carregando (motor de verdade, banco falso)';

const RAIZ = fileURLToPath(new URL('../../', import.meta.url));
const MOTOR = path.join(RAIZ, 'scripts', 'provas', '_motor-31t.cjs');
const BACKEND_AO_LADO = path.resolve(RAIZ, '..', 'backend', 'tests', '_appFalsa.js');
const REF = new URL((readFileSync(new URL('../../.env', import.meta.url), 'utf8').match(/^VITE_SUPABASE_URL=(.+)$/m)?.[1] || 'https://prova.supabase.co').trim()).hostname.split('.')[0];
const FOTOS = process.env.R31T_FOTOS || '';
const FUNDADORES = ['chavo', 'gabriel', 'motta', 'miguel', 'marquinhos', 'gui', 'novato'];
// Os 5 jogos até 18-out: 04/06, 11/06, 25/06, 09/07 e 15/10.
const JOGOS_ATE_O_CORTE = 5;

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

/**
 * @param {object} [o]
 * @param {(url: URL, metodo: string) => Promise<boolean>|boolean} [o.mexer]  a prova segura/derruba um pedido do motor (true = já respondeu)
 */
async function abrirContexto(navegador, baseDoVite, dados, quem, largura, { mexer } = {}) {
  const ctx = await navegador.newContext({
    viewport: { width: largura, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'pt-BR', timezoneId: 'Europe/Lisbon',
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
      if (url.pathname.startsWith('/api/')) {
        if (mexer && await mexer(url, route.request().method(), route)) return undefined;
        return await aoMotor(route, dados.base);
      }
      if (url.host === origemDoVite) return await route.continue();
      estado.externos.push(`${route.request().method()} ${url.host}${url.pathname}`.slice(0, 120));
      return await route.fulfill({ status: 200, contentType: url.pathname.endsWith('.js') ? 'text/javascript' : 'application/json', body: url.pathname.endsWith('.js') ? '' : '{}' });
    } catch { return route.abort().catch(() => {}); }
  });
  await ctx.routeWebSocket((url) => url.host !== origemDoVite, (ws) => ws.close());
  return { ctx, estado };
}

/** O que a prova lê e faz no motor de mentira sem passar pelo navegador (é local; nunca produção). */
async function noMotor(dados, quem, metodo, rota, corpo) {
  const r = await fetch(`${dados.base}${rota}`, { method: metodo, headers: { authorization: `Bearer ${dados.tokens[quem]}`, 'content-type': 'application/json' }, body: corpo ? JSON.stringify(corpo) : undefined });
  return { status: r.status, json: await r.json().catch(() => null) };
}
const lerDoMotor = (dados, quem, rota) => noMotor(dados, quem, 'GET', rota);

const texto = (page) => page.evaluate(() => document.body.innerText.replace(/\s+/g, ' '));
const rolaParaOLado = (page) => page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
const esperar = (ms) => new Promise((r) => { setTimeout(r, ms); });

export async function rodar({ navegador, base, t }) {
  try { readFileSync(BACKEND_AO_LADO); } catch { t('o backend não está ao lado (FUTTY-V2/backend): a prova foi pulada', true); return; }
  const { filho, dados } = await subirMotor();
  const slug = dados.time.slug;
  const jogo15 = dados.jogo15.id;
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
  const ranking = async () => (await lerDoMotor(dados, 'chavo', `/api/teams/${slug}/ranking`)).json?.ranking || [];
  const linhaDe = (r, quem) => r.find((x) => x.user_id === id(quem));
  const jogosNaVitrine = async (quem) => (await lerDoMotor(dados, 'chavo', `/api/teams/${slug}/jogador/${id(quem)}`)).json?.conquistas?.jogos_total;

  try {
    // ── No motor, antes de tudo ──
    const r0 = await ranking();
    t(`motor · presença de fundador: os 7 membros (o Novato entrou hoje) com os ${JOGOS_ATE_O_CORTE} jogos até 18-out, sem confirmar nada`,
      FUNDADORES.every((q) => (linhaDe(r0, q)?.presenca ?? 0) >= JOGOS_ATE_O_CORTE) && linhaDe(r0, 'novato')?.presenca === JOGOS_ATE_O_CORTE,
      JSON.stringify(r0.map((x) => [x.nome_jogador, x.presenca])));
    const vitrines0 = Object.fromEntries(await Promise.all(FUNDADORES.map(async (q) => [q, await jogosNaVitrine(q)])));
    t(`motor · a vitrine de cada um conta ${JOGOS_ATE_O_CORTE} jogos (os jogos depois do corte ainda não aconteceram)`, Object.values(vitrines0).every((n) => n === JOGOS_ATE_O_CORTE), JSON.stringify(vitrines0));
    t('motor · nenhuma linha de presença foi criada: a regra é lida, não gravada', (await lerDoMotor(dados, 'chavo', `/api/games/${dados.historico[1].id}`)).json?.players?.length === 0);
    t('motor · vitórias: só o Chavo tem 1 (04/06, com campeão lançado); as fotos sozinhas não dão vitória a ninguém', r0.every((x) => x.vitorias === (x.user_id === id('chavo') ? 1 : 0) && x.derrotas === (x.user_id === id('chavo') ? 0 : 0)), JSON.stringify(r0.map((x) => [x.nome_jogador, x.vitorias, x.derrotas])));
    const feed = (await lerDoMotor(dados, 'novato', `/api/feed?team_id=${dados.time.id}`)).json?.items || [];
    t('motor · a Resenha traz os 5 cartões de jogo (4 antigos com foto + 15-out) e o post comum, e nenhum post de campeão',
      feed.filter((i) => i.kind === 'jogo').length === 5 && feed.filter((i) => i.kind === 'post').length === 1 && !feed.some((i) => i.kind === 'post' && /🏆/.test(i.body || '')),
      JSON.stringify(feed.map((i) => [i.kind, i.date || i.body])));

    for (const largura of [390, 360]) {
      const rotulo = `${largura} px`;

      // ── Resenha ──
      const novato = await abrirContexto(navegador, base, dados, 'novato', largura);
      const resenha = await abrir(novato, '/feed', '[data-so-foto]');
      await resenha.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 500) { window.scrollTo(0, y); await new Promise((r) => { setTimeout(r, 120); }); } window.scrollTo(0, 0); });
      await resenha.waitForTimeout(1500);
      const cartoes = await resenha.locator('.feed-card').evaluateAll((els) => els.map((e) => ({
        texto: e.innerText.replace(/\s+/g, ' '),
        soFoto: !!e.querySelector('[data-so-foto]'),
        fotos: [...e.querySelectorAll('img')].filter((i) => i.naturalWidth > 300).length,
      })));
      const soFoto = cartoes.filter((c) => c.soFoto);
      t(`${rotulo} · Resenha: os 3 jogos que só têm a foto viram cartão do jogo com a foto carregada e a legenda "Time campeão"`, soFoto.length === 3 && soFoto.every((c) => c.fotos === 1 && /time campeão/i.test(c.texto)), JSON.stringify(soFoto));
      t(`${rotulo} · esses cartões não têm autor nem nome de ninguém (o app não inventa quem ganhou)`, soFoto.every((c) => !/Chavo|Gabriel|Motta|Miguel|Gui|Marquinhos|Novato/.test(c.texto)), JSON.stringify(soFoto.map((c) => c.texto)));
      const t04 = cartoes.find((c) => !c.soFoto && c.fotos === 1 && /Chavo/.test(c.texto));
      t(`${rotulo} · o jogo de 04/06 (com campeão) segue com a foto e o time campeão com o nome`, !!t04 && !/Time campeão.*Time campeão/.test(t04.texto), t04?.texto);
      const tudo = await texto(resenha);
      t(`${rotulo} · nenhum post "🏆 Time campeão · data" sobrou; o post comum continua com o autor`, !/🏆 Time campeão ·/.test(tudo) && /Gabriel Costa.*Bora quinta|Bora quinta[\s\S]*Gabriel Costa/.test(tudo), tudo.slice(0, 300));
      t(`${rotulo} · a Resenha não rola para o lado`, !(await rolaParaOLado(resenha)));
      await resenha.locator('[data-so-foto]').first().scrollIntoViewIfNeeded();
      await foto(resenha, `1-resenha-${largura}`);

      // ── Ranking de quem entrou hoje ──
      const rk = await abrir(novato, `/time/${slug}/ranking`, '.rank-row');
      const linhaNovato = rk.locator('.rank-row', { hasText: 'Novato' });
      const pontos = (await linhaNovato.locator('[data-pontos]').first().innerText()).trim();
      t(`${rotulo} · Ranking: o Novato (entrou hoje) aparece com pontos, não com o "—" de quem nunca jogou`, pontos !== '—' && /\d/.test(pontos), `pontos: ${pontos}`);
      t(`${rotulo} · o Ranking não rola para o lado`, !(await rolaParaOLado(rk)));
      await linhaNovato.scrollIntoViewIfNeeded();
      await foto(rk, `2-ranking-hoje-${largura}`);

      // ── Associar jogador: o carregando aparece DENTRO da janela, o erro tem "Tentar de novo", e a lista vem ──
      let derrubar = largura === 360; // a 360, a 1ª lista falha (500) para provar o erro e o "Tentar de novo"
      const segurarLista = async (url, metodo, route) => {
        if (metodo !== 'GET' || !url.pathname.endsWith('/associar-jogador')) return false;
        if (derrubar) { derrubar = false; await route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'Não deu para completar agora. Tente de novo.' }) }); return true; }
        await esperar(2500); // um motor lento: a janela tem de dizer que está carregando
        return false;
      };
      const chavo = await abrirContexto(navegador, base, dados, 'chavo', largura, { mexer: segurarLista });
      const pj = await abrir(chavo, `/time/${slug}/jogo/${jogo15}`, '[data-associar-jogador]');
      const convidado = largura === 390 ? 'El Chavo' : 'Gabriel Costa';
      const quem = largura === 390 ? 'chavo' : 'gabriel';
      await pj.locator('.sorteio-player', { hasText: convidado }).locator('[data-associar-jogador]').click();
      await pj.locator('[data-associar-janela]').waitFor({ timeout: 15000 });
      if (largura === 360) {
        await pj.locator('[data-tentar-de-novo]').waitFor({ timeout: 15000 });
        t(`${rotulo} · lista que falha: a janela mostra o erro e "Tentar de novo" (nunca fica muda)`, (await pj.locator('[data-erro-associar]').count()) === 1 && (await pj.locator('[data-membro]').count()) === 0, await pj.locator('[data-associar-janela]').innerText());
        await foto(pj, `3b-erro-${largura}`, { fullPage: false });
        await pj.locator('[data-tentar-de-novo]').click();
      }
      await pj.locator('[data-carregando-membros]').waitFor({ timeout: 5000 });
      const carregando = await pj.evaluate(() => {
        const c = document.querySelector('[data-carregando-membros]');
        const j = document.querySelector('[data-associar-janela]');
        const b = c.getBoundingClientRect();
        const bj = j.getBoundingClientRect();
        const noMeio = document.elementFromPoint(b.left + b.width / 2, b.top + 10);
        return { dentro: b.top >= bj.top && b.bottom <= bj.bottom && b.height > 30, visivel: !!noMeio && c.contains(noMeio), texto: c.innerText };
      });
      t(`${rotulo} · enquanto a lista não chega, o carregando aparece DENTRO da janela, visível (antes era o F da página, escondido atrás dela)`, carregando.dentro && carregando.visivel && /Carregando os membros/.test(carregando.texto), JSON.stringify(carregando));
      await foto(pj, `3-carregando-${largura}`, { fullPage: false });
      await pj.locator('[data-membro]').first().waitFor({ timeout: 15000 });
      const disponiveis = await pj.locator('[data-membro][data-disponivel="sim"]').evaluateAll((els) => els.map((e) => e.getAttribute('data-membro')));
      t(`${rotulo} · a lista chega com os ${largura === 390 ? 7 : 7} membros do time, todos disponíveis${largura === 360 ? ' menos o Chavo (já associado)' : ''}`,
        (await pj.locator('[data-membro]').count()) === 7 && disponiveis.length === (largura === 390 ? 7 : 6) && disponiveis.includes(id(quem)), JSON.stringify(disponiveis.length));
      await foto(pj, `4-lista-${largura}`, { fullPage: false });
      await pj.locator(`[data-membro="${id(quem)}"]`).click();
      await pj.locator('[data-confirmar]').click();
      await pj.locator('[data-associar-janela]').waitFor({ state: 'detached', timeout: 15000 });
      await pj.locator('.futty-toast').first().waitFor({ timeout: 10000 });
      t(`${rotulo} · "Pronto: o ${convidado} deste jogo agora é ${dados.pessoas[quem].apelido}."`, (await pj.locator('.futty-toast').first().innerText()).includes(`Pronto: o ${convidado} deste jogo agora é ${dados.pessoas[quem].apelido}.`));
      await foto(pj, `5-associado-${largura}`);
      const rDepois = await ranking();
      const noTimeCampeao = (await lerDoMotor(dados, 'chavo', `/api/games/${jogo15}`)).json.game.times_resultado.times[dados.jogo15.timeDoElChavo].jogadores.some((j) => j.user_id === id(quem));
      const vitoriasEsperadas = (quem === 'chavo' ? 1 : 0) + (noTimeCampeao ? 1 : 0);
      t(`${rotulo} · a vitória do jogo de 15-out passa para a conta (${dados.pessoas[quem].apelido}: ${vitoriasEsperadas}) e a presença não duplica (${JOGOS_ATE_O_CORTE})`,
        linhaDe(rDepois, quem)?.vitorias === vitoriasEsperadas && (await jogosNaVitrine(quem)) === JOGOS_ATE_O_CORTE, JSON.stringify(linhaDe(rDepois, quem)));

      for (const [nomeCena, c] of [['Novato', novato], ['Chavo', chavo]]) {
        t(`${rotulo} · sem erro de página (${nomeCena}) e nada saiu da máquina (${c.estado.externos.length ? [...new Set(c.estado.externos.map((x) => x.split(' ')[1].split('/')[0]))].join(', ') : 'nada'})`, c.estado.erros.length === 0, c.estado.erros.slice(0, 3).join(' | '));
        await c.ctx.close();
      }
    }

    // O dono termina a lista dele pelo motor: Motta, Miguel e Gui. Cada um com a vitória só se estava no time campeão.
    for (const [convidado, quem] of [['Motta', 'motta'], ['Miguel', 'miguel'], ['Gui', 'gui']]) {
      const r = await noMotor(dados, 'chavo', 'POST', `/api/games/${jogo15}/associar-jogador`, { convidado_nome: convidado, user_id: id(quem) });
      t(`motor · associar ${convidado} → ${dados.pessoas[quem].apelido}`, r.status === 200, JSON.stringify(r.json));
    }
    const jogo = (await lerDoMotor(dados, 'chavo', `/api/games/${jogo15}`)).json.game;
    const campeoes = new Set(jogo.times_resultado.times[dados.jogo15.timeDoElChavo].jogadores.map((j) => j.user_id).filter(Boolean));
    const rFim = await ranking();
    t('motor · depois das 5 associações: vitória do 15-out só para quem estava no time campeão (mais a de 04/06 do Chavo), ninguém com vitória inventada',
      ['chavo', 'gabriel', 'motta', 'miguel', 'gui', 'marquinhos', 'novato'].every((q) => linhaDe(rFim, q)?.vitorias === (q === 'chavo' ? 1 : 0) + (campeoes.has(id(q)) ? 1 : 0)),
      JSON.stringify(rFim.map((x) => [x.nome_jogador, x.vitorias, campeoes.has(x.user_id)])));

    // ── Daqui a um mês: o relógio do motor anda 31 dias e o Daqui-a-um-mês entra no time ──
    filho.stdin.write('avancar\n');
    const avancou = await filho.esperarLinha('{"avancou"', 30000);
    t('um mês depois · o relógio do motor está em 16-nov e o Daqui-a-um-mês entrou com um convite novo', avancou.avancou === true && avancou.agora.startsWith('2026-11-16'), JSON.stringify(avancou));
    const v = Object.fromEntries(await Promise.all(['mes', 'novato', 'gabriel', 'motta'].map(async (q) => [q, await jogosNaVitrine(q)])));
    t(`um mês depois · quem entrou agora ganha os mesmos ${JOGOS_ATE_O_CORTE} jogos de fundador; o Gabriel tem +2 (confirmou 22/10 e 29/10); 05/11 e 12/11 sem confirmação não contam para ninguém`,
      v.mes === JOGOS_ATE_O_CORTE && v.novato === JOGOS_ATE_O_CORTE && v.motta === JOGOS_ATE_O_CORTE && v.gabriel === JOGOS_ATE_O_CORTE + 2, JSON.stringify(v));
    const rMes = await ranking();
    t(`um mês depois · no Ranking o Daqui-a-um-mês tem presença ${JOGOS_ATE_O_CORTE}`, linhaDe(rMes, 'mes')?.presenca === JOGOS_ATE_O_CORTE, JSON.stringify(linhaDe(rMes, 'mes')));
    for (const largura of [390, 360]) {
      const mes = await abrirContexto(navegador, base, dados, 'mes', largura);
      const rk = await abrir(mes, `/time/${slug}/ranking`, '.rank-row');
      const linha = rk.locator('.rank-row', { hasText: 'Daqui-a-um-mês' });
      const pontos = (await linha.locator('[data-pontos]').first().innerText()).trim();
      t(`${largura} px · um mês depois, o Ranking mostra os pontos do Daqui-a-um-mês (não "—")`, pontos !== '—' && /\d/.test(pontos), `pontos: ${pontos}`);
      await linha.scrollIntoViewIfNeeded();
      await foto(rk, `6-ranking-um-mes-${largura}`);
      t(`${largura} px · sem erro de página (Daqui-a-um-mês)`, mes.estado.erros.length === 0, mes.estado.erros.slice(0, 3).join(' | '));
      await mes.ctx.close();
    }
  } finally {
    const rede = await encerrarMotor(filho);
    t('o motor falso não tentou sair da máquina (rede fechada)', Array.isArray(rede) && rede.length === 0, `tentativas: ${JSON.stringify(rede)}`);
  }
}
