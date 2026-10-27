// Prova no navegador da Rodada 31W — o que só um Chromium de verdade confirma, com as MESMAS fontes e o MESMO CSS do app, a 390 e a 360 px:
//   · a nota numa régua só, de 0 a 10: o voto do Ranking (onze botões, o 0 e o 10 valem, "Escolha de 0 a 10"), a linha do Ranking ("nota 8", "sem nota",
//     "você deu 8", "falta seu voto", sem estrela), a vitrine do jogador (o anel e "8 / 10"; "Sem nota"), o Início (a nota embaixo da figurinha) e o
//     Painel (Elenco: "nota 8"); os votos antigos convertidos pela migração 086 dão a média certa; o sorteio antigo (em estrelas) aparece × 2;
//   · a página do jogo TERMINADO sem presença, confirmados, "Jogadores por time", convidados, "Ajustar times", "Sortear de novo / Montar à mão" e
//     "Criar campeonato"; ficam o cabeçalho, o resultado, os times com os nomes (+ Associar do admin), "Avaliar os jogadores", "Ranking do time" e, para o
//     admin, o link discreto "Corrigir o resultado" (que abre o editor de sempre). Em andamento e futuro continuam com tudo;
//   · o APP ANTIGO (as telas de antes desta rodada, num worktree — o app da loja antes de baixar as telas novas pelo Capgo) contra o motor NOVO: vota em
//     estrelas e o motor grava × 2; o "Alterar" abre com as estrelas certas. As fotos "antes" saem dele.
// Como: o motor de VERDADE (todas as rotas) num processo à parte, por cima de banco, Storage e Auth de mentira (scripts/provas/_motor-31w.cjs →
// backend/tests/_appFalsa.js; o .env do backend, que aponta para o banco de produção, nunca é lido). Todo pedido do navegador passa por aqui: /api/** vai
// ao motor de mentira, o servidor das telas passa e qualquer outro endereço (inclusive o Supabase de produção) é respondido vazio sem sair da máquina.
//
// Uso: npm run provar:navegador -- rodada-31w      (~2 min)
//      R31W_FOTOS=pasta   salva a foto de cada passo (390 e 360)
//      R31W_ANTES=pasta   as telas de antes (um worktree do commit anterior, com node_modules ligado); sem ela, a parte "antes" é pulada
import { spawn } from 'node:child_process';
import { readFileSync, mkdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

export const nome = 'Rodada 31W · nota de 0 a 10 em todo lugar (voto, Ranking, vitrine, Início, Painel, sorteio) e jogo terminado sem presença/sorteio (motor de verdade, banco falso; app antigo contra o motor novo)';

const RAIZ = fileURLToPath(new URL('../../', import.meta.url));
const MOTOR = path.join(RAIZ, 'scripts', 'provas', '_motor-31w.cjs');
const BACKEND_AO_LADO = path.resolve(RAIZ, '..', 'backend', 'tests', '_appFalsa.js');
const REF = new URL((readFileSync(new URL('../../.env', import.meta.url), 'utf8').match(/^VITE_SUPABASE_URL=(.+)$/m)?.[1] || 'https://prova.supabase.co').trim()).hostname.split('.')[0];
const FOTOS = process.env.R31W_FOTOS || '';
const ANTES = process.env.R31W_ANTES || '';

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
/** As duas colunas do voto, lidas direto do banco de mentira (a prova confere o que ficou GRAVADO, não só o que a tela mostra). */
async function votoGravado(filho, de, para) {
  filho.stdin.write(`voto ${de} ${para}\n`);
  return (await filho.esperarLinha('{"voto"', 8000)).voto;
}

const sessaoDe = (dados, quem) => JSON.stringify({
  access_token: dados.tokens[quem], refresh_token: 'prova', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 86400 * 30,
  user: { id: dados.pessoas[quem].id, aud: 'authenticated', email: 'prova@futty.test', app_metadata: {}, user_metadata: { onboarding_completo: true }, created_at: '2026-01-01T00:00:00Z' },
});
const CABECALHOS_QUE_NAO_VOLTAM = new Set(['content-encoding', 'content-length', 'transfer-encoding', 'connection', 'keep-alive']);
const CABECALHOS_QUE_NAO_VAO = ['host', 'origin', 'referer', 'if-none-match', 'if-modified-since', 'content-length', 'accept-encoding', 'connection'];

async function aoMotor(route, base, pedidos) {
  const req = route.request();
  const url = new URL(req.url());
  const origem = req.headers().origin || '*';
  const cors = { 'access-control-allow-origin': origem, 'access-control-allow-credentials': 'true', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' };
  if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
  const cabecalhos = { ...req.headers() };
  for (const h of CABECALHOS_QUE_NAO_VAO) delete cabecalhos[h];
  const corpo = req.postDataBuffer();
  if (url.pathname.endsWith('/votar')) pedidos.push({ corpo: corpo ? JSON.parse(corpo.toString('utf8')) : null, regua: cabecalhos['x-futty-nota'] || null });
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
  const estado = { externos: [], erros: [], votos: [] };
  await ctx.addInitScript(({ chave, sessao }) => {
    try { localStorage.setItem('futty_cookies', 'aceite'); if (sessao) localStorage.setItem(chave, sessao); } catch { /* sem armazenamento */ }
  }, { chave: `sb-${REF}-auth-token`, sessao: sessaoDe(dados, quem) });
  const origemDoVite = new URL(baseDoVite).host;
  await ctx.route('**/*', async (route) => {
    const url = new URL(route.request().url());
    try {
      if (url.pathname.startsWith('/api/')) return await aoMotor(route, dados.base, estado.votos);
      if (url.host === origemDoVite) return await route.continue();
      estado.externos.push(`${route.request().method()} ${url.host}${url.pathname}`.slice(0, 120));
      return await route.fulfill({ status: 200, contentType: url.pathname.endsWith('.js') ? 'text/javascript' : 'application/json', body: url.pathname.endsWith('.js') ? '' : '{}' });
    } catch { return route.abort().catch(() => {}); }
  });
  await ctx.routeWebSocket((url) => url.host !== origemDoVite, (ws) => ws.close());
  return { ctx, estado };
}

/** O que a prova lê e faz no motor de mentira sem passar pelo navegador (é local; nunca produção). */
async function noMotor(dados, quem, metodo, rota, corpo, cabecalhos = { 'x-futty-nota': '10' }) {
  const r = await fetch(`${dados.base}${rota}`, { method: metodo, headers: { ...(quem ? { authorization: `Bearer ${dados.tokens[quem]}` } : {}), 'content-type': 'application/json', ...cabecalhos }, body: corpo ? JSON.stringify(corpo) : undefined });
  return { status: r.status, json: await r.json().catch(() => null) };
}

const rolaParaOLado = (page) => page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
const textoDe = (page, sel = 'main') => page.locator(sel).first().innerText().then((s) => s.replace(/\s+/g, ' ').trim());
const linhaDoRanking = (page, apelido) => page.locator('.rank-row', { has: page.locator('.rank-name', { hasText: apelido }) }).first();
// O "você deu 8 / falta seu voto" só aparece onde há folga (o botão ao lado já diz o mesmo): lido do DOM, não do que está à vista.
const meuVoto = (linha) => linha.locator('[data-meu-voto]').first().textContent().then((s) => (s || '').trim()).catch(() => '');

// O que a página do jogo terminado NÃO pode ter, e o que ela tem de ter.
const FORA_DO_TERMINADO = [
  ['Sua presença', /Sua presença/i], ['Confirmar presença', /Confirmar presença/i], ['Confirmados ·', /Confirmados ·/i], ['Ainda ninguém confirmou', /Ainda ninguém confirmou/i],
  ['Jogadores por time', /Jogadores por time/i], ['"faltam … jogadores"', /faltam \d+ jogador/i], ['Alguém sem o app vai jogar?', /sem o app vai jogar/i],
  ['Ajustar times', /Ajustar times/i], ['Sortear de novo', /Sortear de novo/i], ['Montar à mão', /Montar à mão/i], ['Criar campeonato', /Criar campeonato/i],
  ['Trocar os times', /Trocar os times/i], ['O sorteio ainda não foi realizado', /sorteio ainda não foi realizado/i],
  ['Banco de reservas', /Banco de reservas/i], ['Próximo a entrar', /Próximo a entrar/i],
];

export async function rodar({ navegador, base, t }) {
  try { readFileSync(BACKEND_AO_LADO); } catch { t('o backend não está ao lado (FUTTY-V2/backend): a prova foi pulada', true); return; }
  const { filho, dados } = await subirMotor();
  const missa = dados.missa.slug;
  const id = (quem) => dados.pessoas[quem].id;
  if (FOTOS) mkdirSync(FOTOS, { recursive: true });
  const foto = async (page, rotulo, opcoes = { fullPage: true }) => { if (FOTOS) { await page.waitForTimeout(600); await page.screenshot({ path: path.join(FOTOS, `${rotulo}.png`), ...opcoes }); } };
  const abrir = async (cena, baseDaTela, rota, esperarPor) => {
    const page = await cena.ctx.newPage();
    page.on('pageerror', (e) => cena.estado.erros.push(e.message));
    await page.goto(`${baseDaTela}${rota}`, { waitUntil: 'domcontentloaded' });
    try {
      await page.locator(esperarPor).first().waitFor({ timeout: 40000 });
    } catch (e) {
      if (FOTOS) await page.screenshot({ path: path.join(FOTOS, `ERRO-${rota.replace(/[^a-z0-9]+/gi, '-')}.png`) }).catch(() => {});
      throw new Error(`${rota}: não apareceu ${esperarPor}. Na tela: ${(await page.locator('body').innerText().catch(() => '')).replace(/s+/g, ' ').slice(0, 300)} · erros: ${cena.estado.erros.slice(0, 2).join(' | ')} · fora: ${cena.estado.externos.slice(0, 4).join(' | ')}`);
    }
    await page.waitForTimeout(900); // o fade de entrada da página
    return page;
  };
  const rankingNoMotor = async (quem = 'chavo') => (await noMotor(dados, quem, 'GET', `/api/teams/${missa}/ranking`)).json?.ranking || [];
  const linhaNoMotor = (r, quem) => r.find((x) => x.user_id === id(quem));

  // As telas de antes, num segundo servidor (o mesmo Vite, outra raiz).
  let antes = null;
  let baseAntes = null;
  if (ANTES && existsSync(path.join(ANTES, 'src', 'pages', 'Ranking.jsx'))) {
    antes = await createServer({ root: ANTES, configFile: path.join(ANTES, 'vite.config.js'), logLevel: 'silent', server: { host: '127.0.0.1', port: 0 } });
    await antes.listen();
    baseAntes = `http://127.0.0.1:${antes.httpServer.address().port}`;
  }

  // O Vite compila na primeira visita (e pode recarregar a página ao otimizar dependências): uma volta em cada servidor antes das fotos.
  for (const b of [base, baseAntes].filter(Boolean)) {
    const aquece = await abrirContexto(navegador, b, dados, 'chavo', 390);
    const p = await aquece.ctx.newPage();
    for (const rota of [`/time/${missa}/ranking`, `/time/${missa}/jogo/${dados.jogos.terminado}`, `/time/${missa}/jogador/${id('eric')}`, `/time/${missa}?aba=elenco`, '/home']) {
      await p.goto(`${b}${rota}`, { waitUntil: 'networkidle', timeout: 180000 }).catch(() => {});
      await p.locator('main').first().waitFor({ timeout: 120000 }).catch(() => {});
    }
    await aquece.ctx.close();
  }

  try {
    // ── No motor: a média dos votos antigos convertidos e os limites do voto ──
    const r0 = await rankingNoMotor();
    const notas = Object.fromEntries(['eric', 'kim', 'wes', 'carla', 'chavo', 'tiago', 'igor'].map((k) => [k, linhaNoMotor(r0, k)?.nota ?? null]));
    t('motor · média com os votos antigos convertidos (estrelas × 2, sem os 15% de antes): Eric 8, Kim 7,7, Wesley 9,7, Carla 5,7, Chavo 8,3; Tiago e Igor sem nota',
      JSON.stringify(notas) === JSON.stringify({ eric: 8, kim: 7.7, wes: 9.7, carla: 5.7, chavo: 8.3, tiago: null, igor: null }), JSON.stringify(notas));
    for (const [nota, esperado] of [[11, 400], [-1, 400], [7.5, 400], [0, 200], [10, 200]]) {
      const v = await noMotor(dados, 'igor', 'POST', `/api/teams/${missa}/votar`, { para_user_id: id('jefim'), nota });
      t(`motor · voto ${String(nota).replace('.', ',')} → ${esperado}${esperado === 400 ? ` ("${v.json?.error}")` : ''}`, v.status === esperado, JSON.stringify(v.json));
    }
    t('motor · o 10 ficou gravado (nota10 10; a coluna antiga, em estrelas, é o gatilho do banco que acerta)', (await votoGravado(filho, id('igor'), id('jefim')))?.nota10 === 10);

    for (const largura of [390, 360]) {
      const r = `${largura} px`;
      const chavo = await abrirContexto(navegador, base, dados, 'chavo', largura);

      // ── Ranking (telas novas) ──
      const rk = await abrir(chavo, base, `/time/${missa}/ranking`, '.rank-row');
      const eric = (await linhaDoRanking(rk, 'Eric Lopes').innerText()).replace(/\s+/g, ' ');
      t(`${r} · Ranking: Eric "nota 8" e "você deu 8" (os votos antigos, convertidos)`, /nota 8(?![,\d])/.test(eric) && (await meuVoto(linhaDoRanking(rk, 'Eric Lopes'))) === 'você deu 8', eric);
      // A 390 o Chavo ainda não votou no Kim (7,7); a 360 o Kim já tem o 10 da volta de 390, e quem falta é a Carla (5,7).
      const [semVoto, notaSemVoto] = largura === 390 ? ['Kim', '7,7'] : ['Carla', '5,7'];
      const kim = (await linhaDoRanking(rk, semVoto).innerText()).replace(/\s+/g, ' ');
      t(`${r} · Ranking: ${semVoto} "nota ${notaSemVoto}" e "falta seu voto"`, kim.includes(`nota ${notaSemVoto}`) && (await meuVoto(linhaDoRanking(rk, semVoto))) === 'falta seu voto', kim);
      const tiago = (await linhaDoRanking(rk, 'Tiago').innerText()).replace(/\s+/g, ' ');
      t(`${r} · Ranking: Tiago (2 votos) "sem nota", nada de "—"`, /sem nota/.test(tiago) && !/nota —|—\s*$/.test(tiago), tiago);
      const lista = await textoDe(rk, '.rank-list');
      t(`${r} · Ranking: nenhuma estrela (★ ☆) e nenhum número com ponto`, !/[★☆]/.test(lista) && !/\d\.\d/.test(lista), lista.slice(0, 200));
      t(`${r} · o Ranking não rola para o lado`, !(await rolaParaOLado(rk)));
      await foto(rk, `1-ranking-${largura}`);

      // ── O voto: 0 a 10 ──
      const alvo = largura === 390 ? 'Kim' : 'Carla';
      await linhaDoRanking(rk, alvo).getByRole('button', { name: 'Votar' }).click();
      const modal = rk.locator('.modal-card');
      await modal.waitFor({ timeout: 10000 });
      const botoes = await modal.locator('[data-nota-botao]').allInnerTexts();
      t(`${r} · voto: onze botões, de 0 a 10`, JSON.stringify(botoes.map((b) => b.trim())) === JSON.stringify(['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10']), JSON.stringify(botoes));
      t(`${r} · voto: antes de escolher, "Escolha de 0 a 10" e o Salvar travado; sem estrela`, /Escolha de 0 a 10/.test(await modal.innerText()) && await modal.getByRole('button', { name: 'Salvar voto' }).isDisabled() && !/[★☆]/.test(await modal.innerText()));
      const caixas = await modal.locator('[data-nota-botao]').evaluateAll((els) => els.map((e) => { const b = e.getBoundingClientRect(); return { h: b.height, w: b.width, dentro: b.right <= window.innerWidth && b.left >= 0 }; }));
      t(`${r} · voto: os botões têm 44 px de altura e cabem na tela (6 em cima, 5 embaixo)`, caixas.every((c) => c.h >= 44 && c.dentro) && new Set(caixas.map((c) => Math.round(c.w))).size === 1, JSON.stringify(caixas.slice(0, 2)));
      await foto(rk, `2-votar-antes-de-escolher-${largura}`, { fullPage: false });
      await modal.locator('[data-nota-botao="0"]').click();
      t(`${r} · voto: o 0 é nota (aparece grande e libera o Salvar)`, (await modal.locator('[data-nota-escolhida]').innerText()).includes('0') && !(await modal.getByRole('button', { name: 'Salvar voto' }).isDisabled()));
      const escolhida = largura === 390 ? 10 : 0;
      await modal.locator(`[data-nota-botao="${escolhida}"]`).click();
      t(`${r} · voto: o escolhido fica marcado (aria-checked) e o número aparece grande`, (await modal.locator(`[data-nota-botao="${escolhida}"]`).getAttribute('aria-checked')) === 'true' && (await modal.locator('[data-nota-escolhida]').innerText()).includes(String(escolhida)));
      await foto(rk, `3-votar-${escolhida}-${largura}`, { fullPage: false });
      await modal.getByRole('button', { name: 'Salvar voto' }).click();
      await rk.locator('.futty-toast').first().waitFor({ timeout: 10000 });
      const pedido = chavo.estado.votos.at(-1);
      t(`${r} · voto: a tela manda ${escolhida} com o aviso da régua (X-Futty-Nota: 10)`, pedido?.corpo?.nota === escolhida && pedido?.regua === '10', JSON.stringify(pedido));
      const gravado = await votoGravado(filho, id('chavo'), id(alvo === 'Kim' ? 'kim' : 'carla'));
      t(`${r} · voto: gravado nota10 = ${escolhida}`, gravado?.nota10 === escolhida, JSON.stringify(gravado));
      await rk.waitForTimeout(800);
      const depois = (await linhaDoRanking(rk, alvo).innerText()).replace(/\s+/g, ' ');
      t(`${r} · Ranking depois do voto: "você deu ${escolhida}" e o botão vira "Alterar"`, (await meuVoto(linhaDoRanking(rk, alvo))) === `você deu ${escolhida}` && /Alterar/.test(depois), depois);
      await linhaDoRanking(rk, alvo).getByRole('button', { name: 'Alterar' }).click();
      await modal.waitFor({ timeout: 10000 });
      t(`${r} · "Alterar" abre com o ${escolhida} marcado`, (await modal.locator(`[data-nota-botao="${escolhida}"]`).getAttribute('aria-checked')) === 'true');
      await modal.getByRole('button', { name: 'Cancelar' }).click();
      t(`${r} · sem erro de página (Ranking)`, chavo.estado.erros.length === 0, chavo.estado.erros.slice(0, 3).join(' | '));

      // ── A vitrine do jogador ──
      const vt = await abrir(chavo, base, `/time/${missa}/jogador/${id('eric')}`, '.perfil-num');
      const vtTexto = await textoDe(vt);
      t(`${r} · vitrine do Eric: a nota 8 no anel e "8 / 10" (média recebida)`, /8 \/ 10/.test(vtTexto) && (await vt.locator('.perfil-num').first().innerText()).trim() === '8', vtTexto.slice(0, 300));
      t(`${r} · vitrine: nenhum número com ponto`, !/\d\.\d/.test(vtTexto));
      await foto(vt, `4-vitrine-eric-${largura}`);
      const vt2 = await abrir(chavo, base, `/time/${missa}/jogador/${id('igor')}`, 'main');
      await vt2.waitForTimeout(1200);
      const vt2Texto = await textoDe(vt2);
      t(`${r} · vitrine do Igor (sem voto): "Sem nota", sem "ainda" e sem "—"`, /Sem nota/i.test(vt2Texto) && !/Sem nota ainda/.test(vt2Texto), vt2Texto.slice(0, 300));
      await foto(vt2, `5-vitrine-sem-nota-${largura}`, { fullPage: false });

      // ── O Painel: Elenco do admin ──
      const el = await abrir(chavo, base, `/time/${missa}?aba=elenco`, '[data-elenco-admin]');
      const elTexto = await textoDe(el, '[data-elenco-admin]');
      // Wesley: 9,7 com os votos antigos; com a parte "antes" ligada, a 360 já tem o 8 que o app antigo deu na volta de 390 (9,3). O motor diz qual.
      const notaWes = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(linhaNoMotor(await rankingNoMotor(), 'wes').nota);
      t(`${r} · Painel (Elenco): "nota 8" (Eric), "nota ${notaWes}" (Wesley), "sem nota" (Tiago); sem estrela`, /nota 8(?![,\d])/.test(elTexto) && elTexto.includes(`nota ${notaWes}`) && /sem nota/.test(elTexto) && !/★/.test(elTexto), elTexto.slice(0, 300));
      await el.locator('[data-elenco-admin]').scrollIntoViewIfNeeded();
      await foto(el, `6-painel-elenco-${largura}`);
      await chavo.ctx.close();

      // ── O Início do Eric: a nota embaixo da figurinha ──
      const ericCena = await abrirContexto(navegador, base, dados, 'eric', largura);
      const ini = await abrir(ericCena, base, '/home', '.inicio-stats');
      const stats = await textoDe(ini, '.inicio-stats');
      t(`${r} · Início (embaixo da figurinha): a nota "8" na régua de 10`, /^8 ·/.test(stats), stats);
      await foto(ini, `7-inicio-figurinha-${largura}`, { fullPage: false });
      await ericCena.ctx.close();

      // ── O jogo TERMINADO: o admin ──
      const adm = await abrirContexto(navegador, base, dados, 'chavo', largura);
      const jt = await abrir(adm, base, `/time/${missa}/jogo/${dados.jogos.terminado}`, '.sorteio-team');
      const jtTexto = await textoDe(jt);
      const sobra = FORA_DO_TERMINADO.filter(([, re]) => re.test(jtTexto)).map(([n]) => n);
      t(`${r} · jogo terminado (admin): nada de presença nem de sorteio (${FORA_DO_TERMINADO.map(([n]) => n).join(', ')})`, sobra.length === 0, `ainda aparece: ${sobra.join(', ')}`);
      const resultado = (await jt.locator('[data-frase-do-resultado]').first().innerText()).replace(/\s+/g, ' ');
      t(`${r} · ficam: o resultado (${resultado}), o artilheiro e o destaque`, /3 × 1/.test(resultado) && /Artilheiro: Wesley/.test(jtTexto) && /Destaque: Eric Lopes/.test(jtTexto), jtTexto.slice(0, 300));
      const nomes = await jt.locator('.sorteio-team .sorteio-player').evaluateAll((els) => els.map((e) => e.innerText.replace(/\s+/g, ' ').trim()));
      t(`${r} · ficam: os times com os nomes (7 com conta + o convidado) e o "Associar jogador" no convidado`, nomes.length === 8 && (await jt.locator('.sorteio-team [data-associar-jogador]').count()) === 1, JSON.stringify(nomes));
      const pastilhas = await jt.locator('.sorteio-team .rating-pill').allInnerTexts();
      t(`${r} · o sorteio antigo (gravado em estrelas) aparece na régua de 10: Wesley 9,6, Eric 8, convidado 6`, pastilhas.includes('9,6') && pastilhas.includes('8') && pastilhas.includes('6') && pastilhas.every((p) => Number(p.replace(',', '.')) >= 5), JSON.stringify(pastilhas));
      t(`${r} · ficam: "Avaliar os jogadores", "Ranking do time" e "Ver sorteio" (discreto, não pulsa)`, /Avaliar os jogadores/.test(jtTexto) && (await jt.locator('[data-ranking-do-time]').count()) === 1 && (await jt.locator('[data-ver-sorteio].btn--outline').count()) === 1 && (await jt.locator('.pulse-glow').count()) === 0);
      t(`${r} · o admin tem o link discreto "Corrigir o resultado" e o editor não está aberto`, (await jt.locator('[data-corrigir-resultado]').innerText()).trim() === 'Corrigir o resultado' && !/Quem ganhou\?/.test(jtTexto));
      t(`${r} · a página do jogo terminado não rola para o lado`, !(await rolaParaOLado(jt)));
      await foto(jt, `8-jogo-terminado-admin-depois-${largura}`);
      await jt.locator('[data-corrigir-resultado]').click();
      await jt.waitForTimeout(600);
      const comEditor = await textoDe(jt);
      t(`${r} · "Corrigir o resultado" abre o editor de sempre ("Quem ganhou?"), ainda sem as seções de presença/sorteio`, /Quem ganhou\?/.test(comEditor) && FORA_DO_TERMINADO.every(([, re]) => !re.test(comEditor)), comEditor.slice(-300));
      await jt.locator('text=Quem ganhou?').first().scrollIntoViewIfNeeded();
      await foto(jt, `9-corrigir-resultado-${largura}`, { fullPage: false });

      // o terminado pelas 2 horas, sem resultado: o link diz "Lançar o resultado"
      const sr = await abrir(adm, base, `/time/${missa}/jogo/${dados.jogos.semResultado}`, '.sorteio-team');
      const srTexto = await textoDe(sr);
      t(`${r} · jogo de ontem sem resultado (terminado pelas 2 h): "Lançar o resultado", sem presença nem sorteio`, (await sr.locator('[data-corrigir-resultado]').innerText()).trim() === 'Lançar o resultado' && FORA_DO_TERMINADO.every(([, re]) => !re.test(srTexto)), srTexto.slice(0, 300));
      const srPastilhas = await sr.locator('.sorteio-team .rating-pill').allInnerTexts();
      t(`${r} · sorteio já gravado na régua de 10 (escala_nota: 10) aparece como veio: Wesley 9,6, Eric 8`, srPastilhas.includes('9,6') && srPastilhas.includes('8'), JSON.stringify(srPastilhas));
      // em andamento: continua com tudo (o sorteio às vezes é feito no campo)
      const ea = await abrir(adm, base, `/time/${missa}/jogo/${dados.jogos.emAndamento}`, '.sorteio-team');
      const eaTexto = await textoDe(ea);
      t(`${r} · jogo em andamento (começou há 40 min): continua com presença, confirmados e "Trocar os times"`, /Em andamento/i.test(eaTexto) && /Sua presença/i.test(eaTexto) && /Confirmados · 8/i.test(eaTexto) && /Trocar os times/i.test(eaTexto), eaTexto.slice(0, 300));
      t(`${r} · jogo em andamento: o "Banco de reservas" continua, com o Jefim "Próximo a entrar"`, /Banco de reservas/i.test(eaTexto) && /Jefim/.test(eaTexto) && /Próximo a entrar/i.test(eaTexto), eaTexto.slice(-300));
      t(`${r} · sem erro de página (admin)`, adm.estado.erros.length === 0, adm.estado.erros.slice(0, 3).join(' | '));
      await adm.ctx.close();

      // ── O jogo TERMINADO: quem não é admin ──
      const kimCena = await abrirContexto(navegador, base, dados, 'kim', largura);
      const jk = await abrir(kimCena, base, `/time/${missa}/jogo/${dados.jogos.terminado}`, '.sorteio-team');
      const jkTexto = await textoDe(jk);
      const sobraK = FORA_DO_TERMINADO.filter(([, re]) => re.test(jkTexto)).map(([n]) => n);
      t(`${r} · jogo terminado (membro): nada de presença nem de sorteio, e nenhum botão de admin`, sobraK.length === 0 && (await jk.locator('[data-associar-jogador], [data-corrigir-resultado]').count()) === 0, `ainda aparece: ${sobraK.join(', ')}`);
      t(`${r} · ficam para o membro: o resultado, os times e "Avaliar os jogadores"`, /3 × 1/.test(jkTexto) && (await jk.locator('.sorteio-team .sorteio-player').count()) === 8 && /Avaliar os jogadores/.test(jkTexto));
      await foto(jk, `10-jogo-terminado-membro-depois-${largura}`);
      // o jogo futuro continua com a presença
      const jf = await abrir(kimCena, base, `/time/${missa}/jogo/${dados.jogos.futuro}`, 'main');
      await jf.locator('[data-sua-presenca] [data-resposta]').first().waitFor({ timeout: 15000 }).catch(() => {});
      t(`${r} · jogo futuro: "Sua presença" continua, com o Vou / Não vou (desde a 32H, no lugar do "Confirmar presença")`, /Sua presença/i.test(await textoDe(jf)) && (await jf.locator('[data-sua-presenca] [data-resposta]').count()) === 1);
      t(`${r} · sem erro de página (membro)`, kimCena.estado.erros.length === 0, kimCena.estado.erros.slice(0, 3).join(' | '));
      await kimCena.ctx.close();

      // ── ANTES: as telas de antes desta rodada (o app da loja antes do Capgo) contra o motor novo ──
      if (baseAntes) {
        const velho = await abrirContexto(navegador, baseAntes, dados, 'chavo', largura);
        const vj = await abrir(velho, baseAntes, `/time/${missa}/jogo/${dados.jogos.terminado}`, '.sorteio-team');
        const vjTexto = await textoDe(vj);
        t(`${r} · ANTES (telas de antes): o jogo terminado ainda tinha presença e sorteio (o achado da Freaky)`, /Sua presença/i.test(vjTexto) && /Confirmados ·/i.test(vjTexto) && /Jogadores por time/i.test(vjTexto) && /Trocar os times/i.test(vjTexto), vjTexto.slice(0, 200));
        await foto(vj, `0-jogo-terminado-admin-ANTES-${largura}`);
        const vr = await abrir(velho, baseAntes, `/time/${missa}/ranking`, '.rank-row');
        const vEric = (await linhaDoRanking(vr, 'Eric Lopes').innerText()).replace(/\s+/g, ' ');
        t(`${r} · app antigo × motor novo: o Ranking mostra a nota nova (8,0) e "você deu 4" (as estrelas que o Chavo deu)`, /nota 8,0/.test(vEric) && /você deu 4$/.test(((await linhaDoRanking(vr, 'Eric Lopes').locator('.rank-votes__voto').first().textContent()) || '').trim()), vEric);
        await foto(vr, `0-ranking-ANTES-${largura}`);
        const alvoVelho = largura === 390 ? 'Wesley' : 'Tiago';
        await linhaDoRanking(vr, alvoVelho).getByRole('button', { name: 'Votar' }).click();
        const vm = vr.locator('.modal-card');
        await vm.waitFor({ timeout: 10000 });
        await vm.getByRole('button', { name: '4 estrelas', exact: true }).click();
        await foto(vr, `0-votar-ANTES-${largura}`, { fullPage: false });
        await vm.getByRole('button', { name: 'Salvar voto' }).click();
        await vr.locator('.futty-toast').first().waitFor({ timeout: 10000 });
        const pedidoVelho = velho.estado.votos.at(-1);
        const gv = await votoGravado(filho, id('chavo'), id(alvoVelho === 'Wesley' ? 'wes' : 'tiago'));
        t(`${r} · app antigo × motor novo: vota 4 estrelas sem o aviso da régua e o motor grava 8`, pedidoVelho?.corpo?.nota === 4 && !pedidoVelho?.regua && gv?.nota10 === 8, JSON.stringify({ pedidoVelho, gv }));
        await vr.waitForTimeout(800);
        await linhaDoRanking(vr, alvoVelho).getByRole('button', { name: 'Alterar' }).click();
        await vm.waitFor({ timeout: 10000 });
        const sua = await vm.innerText();
        t(`${r} · app antigo: o "Alterar" abre com as 4 estrelas (o motor devolve o voto na régua dele)`, /Sua nota/.test(sua) && !/Escolha de 0,5 a 5 estrelas/.test(sua), sua.replace(/\s+/g, ' '));
        await vm.getByRole('button', { name: 'Cancelar' }).click();
        const rNovo = linhaNoMotor(await rankingNoMotor(), alvoVelho === 'Wesley' ? 'wes' : 'tiago');
        t(`${r} · e as telas novas veem o mesmo voto como 8`, rNovo?.minha_nota === 8, JSON.stringify(rNovo));
        const vk = await abrirContexto(navegador, baseAntes, dados, 'kim', largura);
        const vkj = await abrir(vk, baseAntes, `/time/${missa}/jogo/${dados.jogos.terminado}`, '.sorteio-team');
        await foto(vkj, `0-jogo-terminado-membro-ANTES-${largura}`);
        t(`${r} · sem erro de página (telas de antes)`, velho.estado.erros.length === 0 && vk.estado.erros.length === 0, [...velho.estado.erros, ...vk.estado.erros].slice(0, 3).join(' | '));
        await vk.ctx.close();
        await velho.ctx.close();
      } else {
        t(`${r} · ANTES: sem R31W_ANTES, a parte do app antigo foi pulada`, true);
      }
    }
  } finally {
    const rede = await encerrarMotor(filho);
    t('o motor falso não tentou sair da máquina (rede fechada)', Array.isArray(rede) && rede.length === 0, `tentativas: ${JSON.stringify(rede)}`);
    if (antes) await antes.close();
  }
}
