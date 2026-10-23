// Prova no navegador da Rodada 32A — o jogo da Missa de Quinta de 22-out reproduzido na máquina (5 contas + 10 convidados sem app, 5 por time),
// sem tocar no jogo de verdade. O que só um Chromium de verdade confirma, com as MESMAS fontes e o MESMO CSS do app, a 390 e a 360 px:
//   · o admin escreve os 10 convidados, marca 3 deles como cabeça de chave (C) e um nome repetido é recusado na hora;
//   · recarregar a página não perde a lista nem as marcas (ela vive no jogo, no motor);
//   · o sorteio põe cada cabeça convidada num time diferente;
//   · depois de associar 4 convidados às contas deles, a conta diz 15 (9 confirmados + 6 convidados), não 19 — inclusive pelo atalho da presença
//     formal, que antes escondia as 4 contas ("5 confirmados" ao recarregar);
//   · o "Sortear de novo" usa os mesmos 15 sem digitar nada, cada pessoa uma vez;
//   · quem não é do time vê "Você não faz parte deste time." no Ranking, no Time e no Jogo — nunca "Sem conexão".
// Como: o motor de VERDADE (todas as rotas) sobe num processo à parte por cima de banco, Storage e Auth de mentira, em memória
// (scripts/provas/_motor-32a.cjs → backend/tests/_appFalsa.js; o .env do backend aponta para o único banco, o de produção, e aqui nunca é lido). O app é o
// de verdade, num Chromium; todo pedido do navegador passa por aqui: /api/** vai ao motor de mentira, o servidor das telas passa e QUALQUER outro
// endereço (inclusive o Supabase de produção) é respondido vazio sem sair da máquina — e anotado.
//
// Uso: npm run provar:navegador -- rodada-32a      (~2 min)
//      R32A_FOTOS=pasta  salva a foto de cada passo (390 e 360)
import { spawn } from 'node:child_process';
import { readFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const nome = 'Rodada 32A · convidado cabeça de chave, lista guardada no jogo, conta depois de associar, aviso de quem não é do time (motor de verdade, banco falso)';

const RAIZ = fileURLToPath(new URL('../../', import.meta.url));
const MOTOR = path.join(RAIZ, 'scripts', 'provas', '_motor-32a.cjs');
const BACKEND_AO_LADO = path.resolve(RAIZ, '..', 'backend', 'tests', '_appFalsa.js');
const REF = new URL((readFileSync(new URL('../../.env', import.meta.url), 'utf8').match(/^VITE_SUPABASE_URL=(.+)$/m)?.[1] || 'https://prova.supabase.co').trim()).hostname.split('.')[0];
const FOTOS = process.env.R32A_FOTOS || '';

const CABECAS = ['Eric Lopes', 'Wesley', 'Matheus Zanardi'];
const LIGADOS = [['Gabriel Costa', 'g1'], ['Motta', 'g2'], ['Miguel', 'g3'], ['Marcos', 'g4']];
const CONVIDADOS = [...CABECAS, 'Gabriel Costa', 'Motta', 'Miguel', 'Marcos', 'Thiago', 'Rafa', 'Dudu'];
const FRASE_FORA = 'Você não faz parte deste time.';

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

/** O que a prova lê e grava no motor de mentira sem passar pelo navegador (é local; nunca produção). */
async function aoMotorDireto(dados, quem, metodo, rota, corpo) {
  const r = await fetch(`${dados.base}${rota}`, {
    method: metodo,
    headers: { authorization: `Bearer ${dados.tokens[quem]}`, 'content-type': 'application/json', 'x-futty-nota': '10' },
    body: corpo ? JSON.stringify(corpo) : undefined,
  });
  return { status: r.status, json: await r.json().catch(() => null) };
}
const lerDoMotor = (dados, quem, rota) => aoMotorDireto(dados, quem, 'GET', rota);

/** Espera até `cond()` dar verdadeiro (a gravação da lista é assíncrona: a tela mostra na hora, o motor recebe logo depois). */
async function esperar(cond, ms = 15000) {
  const ate = Date.now() + ms;
  for (;;) {
    const v = await cond();
    if (v) return v;
    if (Date.now() > ate) return v;
    await new Promise((r) => { setTimeout(r, 150); });
  }
}

const texto = (page) => page.evaluate(() => document.body.innerText.replace(/\s+/g, ' '));
// Tudo cabe na janela e nada rola para o lado: a régua do celular estreito.
const caixaDentro = (page, seletor) => page.evaluate((s) => {
  const e = document.querySelector(s);
  if (!e) return { achou: false };
  const b = e.getBoundingClientRect();
  const filhos = [...e.querySelectorAll('button, input')].map((x) => x.getBoundingClientRect()).filter((r) => r.width > 0);
  return {
    achou: true, esquerda: b.left, direita: b.right, janela: window.innerWidth,
    filhosDentro: filhos.every((r) => r.left >= b.left - 0.5 && r.right <= b.right + 0.5),
    rolagemLateral: document.documentElement.scrollWidth > window.innerWidth,
  };
}, seletor);

export async function rodar({ navegador, base, t }) {
  try { readFileSync(BACKEND_AO_LADO); } catch { t('o backend não está ao lado (FUTTY-V2/backend): a prova foi pulada', true); return; }
  const { filho, dados } = await subirMotor();
  const slug = dados.time.slug;
  if (FOTOS) mkdirSync(FOTOS, { recursive: true });
  const foto = async (page, rotulo, opcoes = { fullPage: true }) => { if (FOTOS) { await page.waitForTimeout(700); await page.screenshot({ path: path.join(FOTOS, `${rotulo}.png`), ...opcoes }); } };

  try {
    for (const [n, largura] of [390, 360].entries()) {
      const rotulo = `${largura} px`;
      const gameId = dados.jogos[n];
      const rotaDoJogo = `/time/${slug}/jogo/${gameId}`;
      const doMotor = async () => (await lerDoMotor(dados, 'adm', `/api/games/${gameId}`)).json;

      const adm = await abrirContexto(navegador, base, dados, 'adm', largura);
      const page = await adm.ctx.newPage();
      page.on('pageerror', (e) => adm.estado.erros.push(e.message));
      await page.goto(`${base}${rotaDoJogo}`, { waitUntil: 'domcontentloaded' });
      await page.locator('[data-convidados-do-jogo]').waitFor({ timeout: 40000 });
      await page.waitForTimeout(900); // o fade de entrada da página
      const resumo = page.locator('[data-resumo-do-sorteio]');
      t(`${rotulo} · partida: 5 confirmados e nenhum convidado ("5 confirmados: faltam 5")`, (await resumo.innerText()).trim() === '5 confirmados: faltam 5 jogadores para formar 2 times de 5.', await resumo.innerText());

      // ── 1. os 10 convidados, pela tela ──
      const campo = page.locator('[data-convidados-do-jogo] input[aria-label="Nome de quem vai jogar"]');
      for (const nomeConv of CONVIDADOS) {
        await campo.fill(nomeConv);
        await campo.press('Enter');
        await page.locator(`[data-convidado="${nomeConv}"]`).waitFor({ timeout: 10000 });
      }
      const gravados = await esperar(async () => ((await doMotor()).convidados || []).length === 10);
      t(`${rotulo} · os 10 convidados chegam ao motor (guardados no jogo)`, gravados, JSON.stringify((await doMotor()).convidados));
      for (const c of CABECAS) await page.locator(`[data-convidado="${c}"] [data-marca="c"]`).click();
      const marcados = await esperar(async () => ((await doMotor()).convidados || []).filter((c) => c.cabeca_chave).map((c) => c.nome).sort().join('|') === [...CABECAS].sort().join('|'));
      t(`${rotulo} · as 3 cabeças de chave convidadas (Eric Lopes, Wesley, Matheus Zanardi) ficam marcadas no motor`, marcados, JSON.stringify((await doMotor()).convidados.filter((c) => c.cabeca_chave)));
      const apertados = await page.locator('[data-convidados-do-jogo] [data-marca="c"][aria-pressed="true"]').count();
      t(`${rotulo} · na tela, o C dos 3 está aceso`, apertados === 3, `${apertados}`);
      t(`${rotulo} · a conta: "15 confirmados → 3 times de 5"`, (await resumo.innerText()).trim() === '15 confirmados → 3 times de 5', await resumo.innerText());

      // nome repetido: recusado na hora, com a frase; nada vai ao motor
      await campo.fill('wesley');
      await campo.press('Enter');
      const aviso = page.locator('[data-aviso-convidado]');
      await aviso.waitFor({ timeout: 5000 });
      t(`${rotulo} · "wesley" de novo: a tela recusa com "já está na lista" e o motor continua com 10`, (await aviso.innerText()).includes('"wesley" já está na lista. Use um sobrenome ou apelido para diferenciar.') && ((await doMotor()).convidados || []).length === 10, await aviso.innerText());
      await campo.fill('');

      // editar e tirar
      await page.locator('[data-convidado="Dudu"] [data-editar]').click();
      const edicao = page.locator('[data-convidados-do-jogo] input[aria-label="Novo nome de Dudu"]');
      await edicao.fill('Dudu Silva');
      await page.locator('[data-salvar-nome]').click();
      await page.locator('[data-convidado="Dudu Silva"]').waitFor({ timeout: 10000 });
      const renomeado = await esperar(async () => ((await doMotor()).convidados || []).some((c) => c.nome === 'Dudu Silva'));
      await campo.fill('Sobrando');
      await campo.press('Enter');
      await page.locator('[data-convidado="Sobrando"]').waitFor({ timeout: 10000 });
      await esperar(async () => ((await doMotor()).convidados || []).length === 11);
      await page.locator('[data-convidado="Sobrando"] [data-tirar]').click();
      const tirado = await esperar(async () => { const l = (await doMotor()).convidados || []; return l.length === 10 && !l.some((c) => c.nome === 'Sobrando'); });
      t(`${rotulo} · editar ("Dudu" → "Dudu Silva") e tirar ("Sobrando") gravam no motor`, renomeado && tirado, JSON.stringify((await doMotor()).convidados.map((c) => c.nome)));

      const cabe = await caixaDentro(page, '[data-convidados-do-jogo]');
      t(`${rotulo} · a lista de convidados cabe na tela: GOL, C, editar e tirar dentro do cartão, sem rolar para o lado`, cabe.achou && cabe.esquerda >= 0 && cabe.direita <= cabe.janela && cabe.filhosDentro && !cabe.rolagemLateral, JSON.stringify(cabe));
      await page.locator('[data-convidados-do-jogo]').scrollIntoViewIfNeeded();
      await foto(page, `1-convidados-${largura}`);

      // ── 2. recarregar: a lista e as marcas ficam ──
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.locator('[data-convidado="Eric Lopes"]').waitFor({ timeout: 40000 });
      await page.waitForTimeout(600);
      const depoisDeRecarregar = await page.locator('[data-convidado]').evaluateAll((els) => els.map((e) => e.getAttribute('data-convidado')));
      const cDepois = await page.locator('[data-convidados-do-jogo] [data-marca="c"][aria-pressed="true"]').count();
      t(`${rotulo} · recarregar a página: os 10 convidados continuam lá, com as 3 cabeças marcadas, e a conta segue 15`, depoisDeRecarregar.length === 10 && cDepois === 3 && (await resumo.innerText()).trim() === '15 confirmados → 3 times de 5', JSON.stringify(depoisDeRecarregar));
      await page.locator('[data-convidados-do-jogo]').scrollIntoViewIfNeeded();
      await foto(page, `2-recarregado-${largura}`, { fullPage: false });

      // ── 3. o sorteio ──
      await page.locator('[data-escolha="sortear"]').click();
      await page.waitForURL(/\/sorteio$/, { timeout: 30000 });
      const sorteado = (await doMotor()).game.times_resultado;
      const cabecasPorTime = sorteado.times.map((x) => x.jogadores.filter((j) => j.cabeca_chave).map((j) => j.nome));
      t(`${rotulo} · o sorteio dá 3 times de 5 e cada cabeça convidada fica num time diferente`, sorteado.times.length === 3 && sorteado.times.every((x) => x.jogadores.length === 5) && cabecasPorTime.every((c) => c.length === 1) && cabecasPorTime.flat().sort().join('|') === [...CABECAS].sort().join('|'), JSON.stringify(cabecasPorTime));
      await page.goto(`${base}${rotaDoJogo}`, { waitUntil: 'domcontentloaded' });
      await page.locator('.sorteio-grid').waitFor({ timeout: 40000 });
      await page.waitForTimeout(700);
      const marcasNosTimes = await page.locator('.sorteio-grid .sorteio-player', { has: page.locator('.sorteio-player__cap') }).allInnerTexts();
      t(`${rotulo} · nos times da tela, o C aparece nas 3 cabeças convidadas`, marcasNosTimes.length === 3 && CABECAS.every((c) => marcasNosTimes.some((x) => x.includes(c))), JSON.stringify(marcasNosTimes));
      await page.locator('.sorteio-grid').scrollIntoViewIfNeeded();
      await foto(page, `3-sorteado-${largura}`);

      // ── 4. associar 4 convidados às contas deles ("só neste jogo"), como o dono fez ──
      for (const [convidado, quem] of LIGADOS) {
        const r = await aoMotorDireto(dados, 'adm', 'POST', `/api/games/${gameId}/associar-jogador`, { convidado_nome: convidado, user_id: dados.pessoas[quem].id });
        if (r.status !== 200) t(`${rotulo} · associar ${convidado}`, false, JSON.stringify(r.json));
      }
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.locator('[data-convidados-do-jogo]').waitFor({ timeout: 40000 });
      await page.waitForTimeout(700);
      const listaDepois = await page.locator('[data-convidado]').evaluateAll((els) => els.map((e) => e.getAttribute('data-convidado')));
      const textoDepois = await texto(page);
      t(`${rotulo} · depois de associar: "Confirmados · 9", a lista com 6 (sem os 4 associados) e a conta "15 confirmados → 3 times de 5" (antes: 19)`, /confirmados · 9/i.test(textoDepois) && listaDepois.length === 6 && !LIGADOS.some(([c]) => listaDepois.includes(c)) && (await resumo.innerText()).trim() === '15 confirmados → 3 times de 5', JSON.stringify({ listaDepois, resumo: await resumo.innerText() }));
      await page.locator('[data-resumo-do-sorteio]').scrollIntoViewIfNeeded();
      await foto(page, `4-depois-de-associar-${largura}`);

      // ── 5. pelo atalho da presença formal ("Fazer sorteio" do admin): os 5 ids da presença ficam no histórico e sobrevivem ao recarregar ──
      const idsDaPresenca = ['adm', 'm1', 'm2', 'm3', 'm4'].map((k) => dados.pessoas[k].id);
      await page.evaluate((idsP) => { window.history.replaceState({ ...(window.history.state || {}), usr: { rsvpConfirmados: idsP } }, ''); }, idsDaPresenca);
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.locator('[data-convidados-do-jogo]').waitFor({ timeout: 40000 });
      await page.waitForTimeout(700);
      const textoRsvp = await texto(page);
      t(`${rotulo} · pelo atalho da presença, recarregado: as 4 contas associadas continuam ("Confirmados · 9", conta 15) — antes saía "5 confirmados"`, textoRsvp.includes('Sorteio com 9 confirmados na lista de presença') && /confirmados · 9/i.test(textoRsvp) && (await resumo.innerText()).trim() === '15 confirmados → 3 times de 5', await resumo.innerText());
      await foto(page, `5-atalho-da-presenca-${largura}`, { fullPage: false });

      // ── 6. "Sortear de novo": os mesmos 15, sem digitar nada ──
      await page.locator('[data-trocar="sortear"]').click();
      await page.locator('[data-confirmar-trocar-times="re-sorteio"] button', { hasText: 'Sortear de novo' }).click();
      await page.waitForURL(/\/sorteio$/, { timeout: 30000 });
      const deNovo = (await doMotor()).game.times_resultado;
      const todos = [...deNovo.times.flatMap((x) => x.jogadores), ...(deNovo.reservas || [])];
      const nomes = todos.map((j) => j.nome);
      const ligadosIds = LIGADOS.map(([, q]) => dados.pessoas[q].id);
      t(`${rotulo} · "Sortear de novo": 15 no sorteio (9 contas + 6 convidados), ninguém repetido, as 4 contas associadas entram uma vez cada`, todos.length === 15 && todos.filter((j) => j.user_id).length === 9 && new Set(nomes).size === 15 && ligadosIds.every((id) => todos.filter((j) => j.user_id === id).length === 1) && !LIGADOS.some(([c]) => todos.some((j) => !j.user_id && j.nome === c)), nomes.join(', '));
      const cabecasDeNovo = deNovo.times.map((x) => x.jogadores.filter((j) => j.cabeca_chave && !j.user_id).map((j) => j.nome));
      t(`${rotulo} · "Sortear de novo": as 3 cabeças convidadas continuam uma por time`, cabecasDeNovo.every((c) => c.length === 1), JSON.stringify(cabecasDeNovo));

      t(`${rotulo} · a tela do jogo não rola para o lado`, !(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)));
      t(`${rotulo} · sem erro de página (admin) e nada saiu da máquina (${adm.estado.externos.length ? [...new Set(adm.estado.externos.map((x) => x.split(' ')[1].split('/')[0]))].join(', ') : 'nada'})`, adm.estado.erros.length === 0, adm.estado.erros.slice(0, 3).join(' | '));
      await adm.ctx.close();

      // ── 7. quem não é do time ──
      const fora = await abrirContexto(navegador, base, dados, 'fora', largura);
      for (const [onde, rota] of [['Ranking', `/time/${slug}/ranking`], ['Time (Jogos/Elenco)', `/time/${slug}`], ['Jogo', rotaDoJogo]]) {
        const p = await fora.ctx.newPage();
        p.on('pageerror', (e) => fora.estado.erros.push(e.message));
        await p.goto(`${base}${rota}`, { waitUntil: 'domcontentloaded' });
        await p.locator('[data-fora-do-time]').first().waitFor({ timeout: 40000 }).catch(() => {});
        await p.waitForTimeout(600);
        const tx = await texto(p);
        t(`${rotulo} · ${onde} de time alheio: "${FRASE_FORA}", sem "Sem conexão"/"internet" e sem o vazio de time novo`, tx.includes(FRASE_FORA) && !/sem conex|internet/i.test(tx) && !tx.includes('O ranking nasce do 1º jogo') && !tx.includes('Jogo não encontrado') && !tx.includes('Time não encontrado'), tx.slice(0, 300));
        const caixa = await caixaDentro(p, '[data-fora-do-time]');
        t(`${rotulo} · ${onde}: o aviso cabe na tela`, caixa.achou && caixa.esquerda >= 0 && caixa.direita <= caixa.janela && !caixa.rolagemLateral, JSON.stringify(caixa));
        await foto(p, `6-fora-${onde.split(' ')[0].toLowerCase()}-${largura}`, { fullPage: false });
        await p.close();
      }
      // o perfil de um jogador do time alheio: o aviso de sempre ("Perfil só entre companheiros"), agora reconhecido pelo código do motor
      const perfil = await fora.ctx.newPage();
      perfil.on('pageerror', (e) => fora.estado.erros.push(e.message));
      await perfil.goto(`${base}/time/${slug}/jogador/${dados.pessoas.m1.id}`, { waitUntil: 'domcontentloaded' });
      await perfil.getByText('Perfil só entre companheiros').first().waitFor({ timeout: 40000 }).catch(() => {});
      const txPerfil = await texto(perfil);
      t(`${rotulo} · perfil de jogador de time alheio: "Perfil só entre companheiros" (não "Não deu para abrir o perfil agora")`, txPerfil.includes('Perfil só entre companheiros') && !txPerfil.includes('Não deu para abrir o perfil agora'), txPerfil.slice(0, 300));
      await foto(perfil, `6-fora-perfil-${largura}`, { fullPage: false });
      await perfil.close();
      t(`${rotulo} · sem erro de página (visitante) e nada saiu da máquina`, fora.estado.erros.length === 0, fora.estado.erros.slice(0, 3).join(' | '));
      await fora.ctx.close();
    }
  } finally {
    const rede = await encerrarMotor(filho);
    t('o motor falso não tentou sair da máquina (rede fechada)', Array.isArray(rede) && rede.length === 0, `tentativas: ${JSON.stringify(rede)}`);
  }
}
