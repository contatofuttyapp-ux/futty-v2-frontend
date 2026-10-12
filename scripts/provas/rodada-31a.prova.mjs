// Prova no navegador da Rodada 31A — "Associar jogador": o convidado sem app de um jogo vira a conta de um membro do time. O que só um Chromium de
// verdade confirma, com as MESMAS fontes e o MESMO CSS do app, a 390 e a 360 px:
//   · o botão "Associar jogador" aparece ao lado de cada convidado sem app, só para o admin (o membro comum não vê botão nem aviso);
//   · a janela lista os membros do time (foto/apelido; nunca o e-mail nem o nome completo), com quem já joga naquele jogo desabilitado e o motivo,
//     e sem gente de outro time;
//   · a confirmação diz o que entra na conta; "Voltar" volta à lista; confirmar grava e a tela do jogo já mostra o membro no lugar do convidado;
//   · depois: o gol, o ranking, o perfil (selo CAMPEÃO) e o Início ("Você é campeão!") do membro, e o aviso com o Desfazer;
//   · o Desfazer devolve tudo (o convidado, o selo e o card somem do membro).
// Como: o motor de VERDADE (todas as rotas) sobe num processo à parte por cima de banco, Storage e Auth de mentira, em memória
// (scripts/provas/_motor-31a.cjs → backend/tests/_appFalsa.js; o .env do backend aponta para o único banco, o de produção, e aqui nunca é lido). O app é o
// de verdade, num Chromium; todo pedido do navegador passa por aqui: /api/** vai ao motor de mentira, o servidor das telas passa e QUALQUER outro
// endereço (inclusive o Supabase de produção) é respondido vazio sem sair da máquina — e anotado.
//
// Uso: npm run provar:navegador -- rodada-31a      (~1 min)
//      R31A_FOTOS=pasta  salva a foto de cada passo (390 e 360)
import { spawn } from 'node:child_process';
import { readFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const nome = 'Rodada 31A · Associar jogador (motor de verdade, banco falso, nada sai da máquina)';

const RAIZ = fileURLToPath(new URL('../../', import.meta.url));
const MOTOR = path.join(RAIZ, 'scripts', 'provas', '_motor-31a.cjs');
const BACKEND_AO_LADO = path.resolve(RAIZ, '..', 'backend', 'tests', '_appFalsa.js');
const REF = new URL((readFileSync(new URL('../../.env', import.meta.url), 'utf8').match(/^VITE_SUPABASE_URL=(.+)$/m)?.[1] || 'https://prova.supabase.co').trim()).hostname.split('.')[0];
const FOTOS = process.env.R31A_FOTOS || '';

const FRASE_CONFIRMACAO = 'O Beto deste jogo passa a ser Betão. Gols, presença e títulos deste jogo entram na conta dele.';
const NOMES_COMPLETOS = ['Roberto Alves', 'Teixeira', 'Ezequiel', 'Felipe Oliveira', 'Pedro Ferreira'];

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
    serviceWorkers: 'block', reducedMotion: 'reduce',
  });
  const estado = { externos: [], erros: [] };
  await ctx.addInitScript(({ chave, sessao }) => {
    try { localStorage.setItem('futty_cookies', 'aceite'); if (sessao) localStorage.setItem(chave, sessao); } catch { /* sem armazenamento */ }
  }, { chave: `sb-${REF}-auth-token`, sessao: quem ? sessaoDe(dados, quem) : null });
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

/** O que a prova lê do motor de mentira sem passar pelo navegador (é local; nunca produção). */
async function lerDoMotor(dados, quem, rota) {
  const r = await fetch(`${dados.base}${rota}`, { headers: { authorization: `Bearer ${dados.tokens[quem]}` } });
  return { status: r.status, json: await r.json().catch(() => null) };
}

const texto = (page) => page.evaluate(() => document.body.innerText.replace(/\s+/g, ' '));
// Tudo cabe na janela e nada rola para o lado: a régua do celular estreito.
const caixaDentro = (page, seletor) => page.evaluate((s) => {
  const e = document.querySelector(s);
  if (!e) return { achou: false };
  const b = e.getBoundingClientRect();
  return { achou: true, esquerda: b.left, direita: b.right, topo: b.top, base: b.bottom, janela: window.innerWidth, altura: window.innerHeight, rolagemLateral: document.documentElement.scrollWidth > window.innerWidth };
}, seletor);

export async function rodar({ navegador, base, t }) {
  try { readFileSync(BACKEND_AO_LADO); } catch { t('o backend não está ao lado (FUTTY-V2/backend): a prova foi pulada', true); return; }
  const { filho, dados } = await subirMotor();
  const slug = dados.time.slug;
  const gameId = dados.jogo.id;
  const novoId = dados.pessoas.novo.id;
  const rotaDoJogo = `/time/${slug}/jogo/${gameId}`;
  if (FOTOS) mkdirSync(FOTOS, { recursive: true });
  const foto = async (page, rotulo, opcoes = { fullPage: true }) => { if (FOTOS) { await page.waitForTimeout(700); await page.screenshot({ path: path.join(FOTOS, `${rotulo}.png`), ...opcoes }); } };
  const abrirJogo = async (cena, esperar) => {
    const page = await cena.ctx.newPage();
    page.on('pageerror', (e) => cena.estado.erros.push(e.message));
    await page.goto(`${base}${rotaDoJogo}`, { waitUntil: 'domcontentloaded' });
    await page.locator(esperar).first().waitFor({ timeout: 40000 });
    await page.waitForTimeout(900); // o fade de entrada da página
    return page;
  };

  try {
    // Antes de tudo: o estado de partida pelo motor — o Beto e o Caio são convidados; o Betão ainda não joga neste jogo.
    const inicio = await lerDoMotor(dados, 'adm', `/api/games/${gameId}`);
    const nomesNoJogo = () => inicio.json.game.times_resultado.times.flatMap((x) => x.jogadores).map((j) => `${j.convidado ? '·' : ''}${j.nome}`);
    t('partida · o jogo tem os convidados Beto e Caio e o time do Beto foi o campeão', nomesNoJogo().includes('·Beto') && nomesNoJogo().includes('·Caio') && inicio.json.game.campeao_time_index === dados.jogo.timeDoBeto, nomesNoJogo().join(', '));

    for (const largura of [390, 360]) {
      const rotulo = `${largura} px`;

      // Antes: o Betão tem 2 jogos (não chega aos 3 do ranking), nenhum selo e nenhum card de campeão.
      const antesRanking = (await lerDoMotor(dados, 'adm', `/api/teams/${slug}/ranking`)).json?.ranking || [];
      const antesSelos = (await lerDoMotor(dados, 'novo', '/api/me/selos')).json?.selos || [];
      const antesInicio = (await lerDoMotor(dados, 'novo', '/api/inicio')).json?.campeonato_novo;
      t(`${rotulo} · antes: o Betão não está no ranking (2 jogos), não tem selo e o Início não o chama de campeão`, !antesRanking.some((r) => r.user_id === novoId) && !antesSelos.some((x) => x.label === 'CAMPEÃO') && antesInicio?.voce_e_campeao === false, JSON.stringify({ antesRanking: antesRanking.length, antesSelos, voce: antesInicio?.voce_e_campeao }));

      // ── O botão: só o admin ──
      const adm = await abrirContexto(navegador, base, dados, 'adm', largura);
      const page = await abrirJogo(adm, '[data-associar-jogador]');
      const botoes = page.locator('[data-associar-jogador]');
      t(`${rotulo} · o admin vê o botão "Associar jogador" ao lado de cada convidado sem app (2)`, (await botoes.count()) === 2 && (await botoes.allInnerTexts()).every((x) => x.trim() === 'Associar jogador'), `${await botoes.count()} botões`);
      const caixasDosBotoes = await botoes.evaluateAll((els) => els.map((e) => { const b = e.getBoundingClientRect(); return { esquerda: b.left, direita: b.right, largura: window.innerWidth, altura: b.height }; }));
      t(`${rotulo} · os botões cabem na tela e têm área de toque de pelo menos 28 px`, caixasDosBotoes.every((c) => c.esquerda >= 0 && c.direita <= c.largura && c.altura >= 28), JSON.stringify(caixasDosBotoes));
      t(`${rotulo} · a tela do jogo não rola para o lado`, !(await caixaDentro(page, 'main')).rolagemLateral);
      await botoes.first().scrollIntoViewIfNeeded();
      await foto(page, `1-botao-${largura}`);

      // ── O membro comum não vê nada ──
      const membro = await abrirContexto(navegador, base, dados, 'm1', largura);
      const paginaDoMembro = await abrirJogo(membro, '.sorteio-grid');
      t(`${rotulo} · o membro comum não vê botão nem aviso`, (await paginaDoMembro.locator('[data-associar-jogador], [data-associacoes-recentes]').count()) === 0 && (await texto(paginaDoMembro)).includes('Beto'));
      await membro.ctx.close();

      // ── A janela ──
      await page.locator('.sorteio-player', { hasText: 'Beto' }).locator('[data-associar-jogador]').click();
      const janela = page.locator('[data-associar-janela]');
      await janela.waitFor({ timeout: 15000 });
      await page.locator('[data-membro]').first().waitFor({ timeout: 15000 });
      const membros = page.locator('[data-membro]');
      t(`${rotulo} · a janela lista os 6 membros do time e nenhum de outro time`, (await membros.count()) === 6 && !(await janela.innerText()).includes('Forasteiro'), `${await membros.count()} membros`);
      const disponiveis = await page.locator('[data-membro][data-disponivel="sim"]').evaluateAll((els) => els.map((e) => e.getAttribute('data-membro')));
      t(`${rotulo} · só o Betão e o Zeca (que não estão no jogo) podem ser escolhidos; os outros 4 ficam desabilitados com o motivo`, disponiveis.length === 2 && disponiveis.includes(novoId) && disponiveis.includes(dados.pessoas.zeca.id) && (await page.locator('[data-membro][data-disponivel="nao"] [data-motivo]').allInnerTexts()).every((x) => x === 'Já está neste jogo') && (await page.locator('[data-membro][disabled]').count()) === 4, JSON.stringify(disponiveis));
      const textoDaJanela = await janela.innerText();
      t(`${rotulo} · a janela mostra apelidos: nenhum nome completo, nenhum e-mail`, !NOMES_COMPLETOS.some((n) => textoDaJanela.includes(n)) && !textoDaJanela.includes('@'), textoDaJanela.replace(/\s+/g, ' '));
      const cabeJanela = await caixaDentro(page, '[data-associar-janela]');
      t(`${rotulo} · a janela cabe na tela (sem rolar para o lado, sem passar da altura)`, cabeJanela.esquerda >= 0 && cabeJanela.direita <= cabeJanela.janela && cabeJanela.topo >= 0 && cabeJanela.base <= cabeJanela.altura && !cabeJanela.rolagemLateral, JSON.stringify(cabeJanela));
      await foto(page, `2-lista-${largura}`, { fullPage: false });

      // ── A confirmação ──
      await page.locator(`[data-membro="${novoId}"]`).click();
      const frase = page.locator('[data-frase-da-confirmacao]');
      await frase.waitFor({ timeout: 10000 });
      t(`${rotulo} · a confirmação diz exatamente o que entra na conta`, (await frase.innerText()).trim() === FRASE_CONFIRMACAO, await frase.innerText());
      await foto(page, `3-confirmar-${largura}`, { fullPage: false });
      await page.locator('[data-voltar]').click();
      await page.locator('[data-lista-de-membros]').waitFor({ timeout: 10000 });
      t(`${rotulo} · "Voltar" devolve a lista, e nada foi gravado`, (await page.locator('[data-membro]').count()) === 6 && (await lerDoMotor(dados, 'adm', `/api/games/${gameId}`)).json.game.times_resultado.times.flatMap((x) => x.jogadores).some((j) => j.nome === 'Beto' && j.convidado));
      await page.locator(`[data-membro="${novoId}"]`).click();
      await frase.waitFor({ timeout: 10000 });
      await page.locator('[data-confirmar]').click();

      // ── O jogo depois ──
      await page.locator('[data-associar-janela]').waitFor({ state: 'detached', timeout: 15000 });
      await page.locator('[data-associacoes-recentes]').waitFor({ timeout: 15000 });
      const aviso = page.locator('.futty-toast');
      await aviso.first().waitFor({ timeout: 10000 });
      t(`${rotulo} · o aviso diz "Pronto: o Beto deste jogo agora é Betão."`, (await aviso.first().innerText()).includes('Pronto: o Beto deste jogo agora é Betão.'), await aviso.first().innerText());
      const lista = await page.locator('.sorteio-grid').innerText();
      t(`${rotulo} · a lista de times já mostra o Betão (sem o ponto de convidado) e o Beto saiu`, /Betão/.test(lista) && !/· Beto/.test(lista) && /· Caio/.test(lista), lista.replace(/\s+/g, ' '));
      t(`${rotulo} · sobrou um botão só (o do Caio) e o aviso diz "Betão ocupa a vaga do Beto neste jogo."`, (await page.locator('[data-associar-jogador]').count()) === 1 && (await page.locator('[data-associacoes-recentes]').innerText()).includes('Betão ocupa a vaga do Beto neste jogo.'));
      const doMotor = await lerDoMotor(dados, 'adm', `/api/games/${gameId}`);
      const noMotor = doMotor.json.game.times_resultado.times[dados.jogo.timeDoBeto].jogadores.find((j) => j.user_id === novoId);
      t(`${rotulo} · no motor o Betão ocupa a vaga do Beto, no mesmo time`, !!noMotor && noMotor.nome === 'Betão' && !noMotor.convidado, JSON.stringify(noMotor));
      t(`${rotulo} · os 2 gols do Beto agora são do Betão`, doMotor.json.gols.some((g) => g.user_id === novoId && g.gols === 2) && !doMotor.json.gols.some((g) => !g.user_id && g.nome === 'Beto'), JSON.stringify(doMotor.json.gols));
      t(`${rotulo} · o Betão consta como presente no jogo`, doMotor.json.players.some((p) => p.user_id === novoId && p.confirmado), JSON.stringify(doMotor.json.players.map((p) => [p.nome, p.confirmado])));
      t(`${rotulo} · a tela do jogo não rola para o lado depois de associar`, !(await caixaDentro(page, 'main')).rolagemLateral);
      await page.locator('[data-associacoes-recentes]').scrollIntoViewIfNeeded();
      await foto(page, `4-depois-${largura}`);

      // ── O ranking, o perfil e o Início do Betão ──
      const ranking = await adm.ctx.newPage();
      ranking.on('pageerror', (e) => adm.estado.erros.push(e.message));
      await ranking.goto(`${base}/time/${slug}/ranking`, { waitUntil: 'domcontentloaded' });
      await ranking.getByText('Betão').first().waitFor({ timeout: 30000 }).catch(() => {});
      t(`${rotulo} · o ranking do time agora tem o Betão`, (await texto(ranking)).includes('Betão'), (await texto(ranking)).slice(0, 400));
      await foto(ranking, `5-ranking-${largura}`);
      const linhaDele = ((await lerDoMotor(dados, 'adm', `/api/teams/${slug}/ranking`)).json?.ranking || []).find((r) => r.user_id === novoId);
      t(`${rotulo} · o ranking soma os 2 gols e a vitória do jogo do domingo ao Betão (3 jogos agora)`, linhaDele?.gols === 2 && linhaDele?.vitorias === 1 && linhaDele?.presenca === 3, JSON.stringify(linhaDele));

      const perfilDele = await adm.ctx.newPage();
      perfilDele.on('pageerror', (e) => adm.estado.erros.push(e.message));
      await perfilDele.goto(`${base}/time/${slug}/jogador/${novoId}`, { waitUntil: 'domcontentloaded' });
      await perfilDele.getByText('CAMPEÃO').first().waitFor({ timeout: 40000 }).catch(() => {});
      t(`${rotulo} · o perfil do Betão mostra o selo CAMPEÃO`, (await texto(perfilDele)).includes('CAMPEÃO'), (await texto(perfilDele)).slice(0, 200));
      await foto(perfilDele, `6-perfil-${largura}`);

      const dele = await abrirContexto(navegador, base, dados, 'novo', largura);
      const inicioDele = await dele.ctx.newPage();
      inicioDele.on('pageerror', (e) => dele.estado.erros.push(e.message));
      await inicioDele.goto(`${base}/home`, { waitUntil: 'domcontentloaded' });
      await inicioDele.getByText(/você é campeão!/i).first().waitFor({ timeout: 30000 }).catch(() => {});
      t(`${rotulo} · o Início do Betão diz "Você é campeão!" — na hora, sem esperar nada`, /você é campeão!/i.test(await texto(inicioDele)), (await texto(inicioDele)).slice(0, 300));
      await foto(inicioDele, `7-inicio-${largura}`);
      const selosDele = await lerDoMotor(dados, 'novo', '/api/me/selos');
      t(`${rotulo} · /api/me/selos do Betão tem CAMPEÃO (o cache dos selos foi derrubado)`, (selosDele.json?.selos || []).some((s) => s.label === 'CAMPEÃO'), JSON.stringify(selosDele.json));

      // ── O Desfazer ──
      await page.locator('[data-desfazer]').first().click();
      await page.locator('[data-frase-do-desfazer]').waitFor({ timeout: 10000 });
      t(`${rotulo} · o Desfazer pergunta antes: "O Beto volta a ser convidado, com os gols e a presença de antes."`, (await page.locator('[data-frase-do-desfazer]').innerText()).includes('O Beto volta a ser convidado, com os gols e a presença de antes.'));
      await foto(page, `8-desfazer-${largura}`, { fullPage: false });
      await page.locator('[data-desfazer-manter]').click();
      t(`${rotulo} · "Manter" fecha a pergunta e não desfaz nada`, (await page.locator('[data-frase-do-desfazer]').count()) === 0 && (await page.locator('[data-associacoes-recentes]').count()) === 1);
      await page.locator('[data-desfazer]').first().click();
      await page.locator('[data-desfazer-confirmar]').click();
      await page.locator('[data-associacoes-recentes]').waitFor({ state: 'detached', timeout: 15000 });
      const listaDepois = await page.locator('.sorteio-grid').innerText();
      t(`${rotulo} · desfeito: o Beto volta como convidado e o Betão sai da lista`, /· Beto/.test(listaDepois) && !/Betão/.test(listaDepois) && (await page.locator('[data-associar-jogador]').count()) === 2, listaDepois.replace(/\s+/g, ' '));
      const volta = await lerDoMotor(dados, 'adm', `/api/games/${gameId}`);
      t(`${rotulo} · no motor: gols do Beto de volta pelo nome e o Betão sem presença neste jogo`, volta.json.gols.some((g) => !g.user_id && g.nome === 'Beto' && g.gols === 2) && !volta.json.players.some((p) => p.user_id === novoId), JSON.stringify(volta.json.gols));
      const seloDepois = await lerDoMotor(dados, 'novo', '/api/me/selos');
      t(`${rotulo} · desfeito: o Betão perde o selo CAMPEÃO`, !(seloDepois.json?.selos || []).some((s) => s.label === 'CAMPEÃO'), JSON.stringify(seloDepois.json));
      await inicioDele.reload({ waitUntil: 'domcontentloaded' });
      await inicioDele.waitForTimeout(2500);
      t(`${rotulo} · desfeito: o Início do Betão não diz mais "Você é campeão!"`, !/você é campeão!/i.test(await texto(inicioDele)));
      const rankingDepois = (await lerDoMotor(dados, 'adm', `/api/teams/${slug}/ranking`)).json?.ranking || [];
      t(`${rotulo} · desfeito: o Betão sai do ranking (volta a 2 jogos)`, !rankingDepois.some((r) => r.user_id === novoId));

      for (const [quem, c] of [['admin', adm], ['Betão', dele]]) {
        t(`${rotulo} · sem erro de página (${quem}) e nada saiu da máquina (${c.estado.externos.length ? [...new Set(c.estado.externos.map((x) => x.split(' ')[1].split('/')[0]))].join(', ') : 'nada'})`, c.estado.erros.length === 0, c.estado.erros.slice(0, 3).join(' | '));
      }
      await adm.ctx.close();
      await dele.ctx.close();
    }
  } finally {
    const rede = await encerrarMotor(filho);
    t('o motor falso não tentou sair da máquina (rede fechada)', Array.isArray(rede) && rede.length === 0, `tentativas: ${JSON.stringify(rede)}`);
  }
}
