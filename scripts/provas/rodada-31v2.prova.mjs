// Prova no navegador da Rodada 31V-2 — o Gabinete (Suspender que fica, "Excluir conta" de verdade, o log de ações) e o "Associar em todos os jogos do
// time". O que só um Chromium de verdade confirma, com as MESMAS fontes e o MESMO CSS do app, no computador e a 390 e 360 px:
//   · Gabinete → Pessoas: suspender 3 contas seguidas e as 3 seguirem "Suspensa" (também depois de recarregar a página e em outro aparelho);
//   · "Excluir" só aparece para quem pode sair; as protegidas (a do dono, a pessoal, a demo das lojas, o John Apple, o Wesley da Missa) mostram o
//     motivo no lugar; a palavra errada não apaga nada; EXCLUIR apaga (time sozinho some com a foto; time com gente passa adiante) e entra no log;
//   · Associar: depois de escolher o membro, a janela pergunta "Este nome aparece em mais 3 jogos deste time. Associar em todos?"; "Associar nos 4
//     jogos" associa nos jogos com o mesmo nome e avisa o que ficou de fora (o jogo em que o Eric já jogava).
// Como: o motor de VERDADE (todas as rotas) sobe num processo à parte por cima de banco, Storage e Auth de mentira, em memória
// (scripts/provas/_motor-31v2.cjs → backend/tests/_appFalsa.js; o .env do backend aponta para o único banco, o de produção, e aqui nunca é lido). O app é o
// de verdade, num Chromium; /api/** vai ao motor de mentira, o servidor das telas passa e QUALQUER outro endereço é respondido vazio sem sair da máquina.
//
// Uso: npm run provar:navegador -- rodada-31v2      (~1 min)
//      R31V2_FOTOS=pasta  salva a foto de cada passo
import { spawn } from 'node:child_process';
import { readFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const nome = 'Rodada 31V-2 · Gabinete (suspender, excluir, log) e "Associar em todos" (motor de verdade, banco falso, nada sai da máquina)';

const RAIZ = fileURLToPath(new URL('../../', import.meta.url));
const MOTOR = path.join(RAIZ, 'scripts', 'provas', '_motor-31v2.cjs');
const BACKEND_AO_LADO = path.resolve(RAIZ, '..', 'backend', 'tests', '_appFalsa.js');
const REF = new URL((readFileSync(new URL('../../.env', import.meta.url), 'utf8').match(/^VITE_SUPABASE_URL=(.+)$/m)?.[1] || 'https://prova.supabase.co').trim()).hostname.split('.')[0];
const FOTOS = process.env.R31V2_FOTOS || '';

const APARELHOS = {
  computador: { viewport: { width: 1280, height: 860 }, deviceScaleFactor: 1, isMobile: false, hasTouch: false },
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
/** Pergunta ao motor o que só o banco de mentira sabe (times, vínculos, Auth, Storage, suspensões). */
function estadoDoMotor(filho) {
  return new Promise((resolve) => {
    let saida = '';
    const aoLer = (d) => {
      saida += d;
      const linha = saida.split('\n').find((l) => l.startsWith('{"estado"'));
      if (linha) { filho.stdout.off('data', aoLer); resolve(JSON.parse(linha).estado); }
    };
    filho.stdout.on('data', aoLer);
    filho.stdin.write('estado\n');
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

async function abrirContexto(navegador, baseDoVite, dados, quem, aparelho) {
  const ctx = await navegador.newContext({ ...APARELHOS[aparelho], locale: 'pt-BR', timezoneId: 'America/Sao_Paulo', serviceWorkers: 'block', reducedMotion: 'reduce' });
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

async function lerDoMotor(dados, quem, rota) {
  const r = await fetch(`${dados.base}${rota}`, { headers: { authorization: `Bearer ${dados.tokens[quem]}` } });
  return { status: r.status, json: await r.json().catch(() => null) };
}

const semRolagemLateral = (page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
const caixaDentro = (page, seletor) => page.evaluate((s) => {
  const e = document.querySelector(s);
  if (!e) return { achou: false };
  const b = e.getBoundingClientRect();
  return { achou: true, esquerda: b.left, direita: b.right, topo: b.top, base: b.bottom, janela: window.innerWidth, altura: window.innerHeight };
}, seletor);

export async function rodar({ navegador, base, t }) {
  try { readFileSync(BACKEND_AO_LADO); } catch { t('o backend não está ao lado (FUTTY-V2/backend): a prova foi pulada', true); return; }
  const { filho, dados } = await subirMotor();
  const P = dados.pessoas;
  if (FOTOS) mkdirSync(FOTOS, { recursive: true });
  const foto = async (page, rotulo, opcoes = { fullPage: true }) => { if (FOTOS) { await page.waitForTimeout(600); await page.screenshot({ path: path.join(FOTOS, `${rotulo}.png`), ...opcoes }); } };
  const cenas = [];

  try {
    // ════ 1 · "Associar em todos" (um time para cada largura) ════════════════════════════════════════════════════════════
    for (const largura of [390, 360]) {
      const rotulo = `associar ${largura}`;
      const q = dados.quintas[largura];
      const cena = await abrirContexto(navegador, base, dados, 'adm', largura);
      cenas.push(cena);
      const page = await cena.ctx.newPage();
      page.on('pageerror', (e) => cena.estado.erros.push(e.message));
      await page.goto(`${base}/time/${q.slug}/jogo/${q.jogos[0]}`, { waitUntil: 'domcontentloaded' });
      await page.locator('[data-associar-jogador]').first().waitFor({ timeout: 40000 });
      await page.waitForTimeout(900);
      await page.locator('.sorteio-player', { hasText: 'Eric Lopes' }).locator('[data-associar-jogador]').click();
      await page.locator(`[data-membro="${P.eric.id}"]`).waitFor({ timeout: 15000 });
      await page.locator(`[data-membro="${P.eric.id}"]`).click();
      const pergunta = page.locator('[data-pergunta-em-todos]');
      await pergunta.waitFor({ timeout: 10000 });
      t(`${rotulo} · depois de escolher o Eric, a janela pergunta "Este nome aparece em mais 3 jogos deste time. Associar em todos?"`, (await pergunta.innerText()).trim() === 'Este nome aparece em mais 3 jogos deste time. Associar em todos?', await pergunta.innerText());
      t(`${rotulo} · os botões: "Associar nos 4 jogos" (principal) e "Só neste jogo"`, (await page.locator('[data-em-todos]').innerText()).trim() === 'Associar nos 4 jogos' && (await page.locator('[data-so-neste]').innerText()).trim() === 'Só neste jogo' && (await page.locator('[data-confirmar]').count()) === 0);
      const cabe = await caixaDentro(page, '[data-associar-janela]');
      t(`${rotulo} · a janela cabe na tela`, cabe.esquerda >= 0 && cabe.direita <= cabe.janela && cabe.topo >= 0 && cabe.base <= cabe.altura, JSON.stringify(cabe));
      await foto(page, `1-associar-pergunta-${largura}`, { fullPage: false });

      await page.locator('[data-em-todos]').click();
      await page.locator('[data-associar-janela]').waitFor({ state: 'detached', timeout: 20000 });
      const aviso = page.locator('.futty-toast');
      await aviso.first().waitFor({ timeout: 10000 });
      const esperado = 'Pronto: o Eric Lopes agora é Eric em 3 jogos. 1 jogo ficou de fora: Eric já está neste jogo; um jogador não ocupa duas vagas.';
      t(`${rotulo} · o aviso diz quantos jogos e o que ficou de fora`, (await aviso.first().innerText()).includes(esperado), await aviso.first().innerText());
      await foto(page, `2-associar-feito-${largura}`, { fullPage: false });

      const noJogo = async (i) => (await lerDoMotor(dados, 'adm', `/api/games/${q.jogos[i]}`)).json.game.times_resultado.times.flatMap((x) => x.jogadores).map((j) => `${j.user_id === P.eric.id ? '@' : ''}${j.nome.trim()}`);
      const [j1, j2, j3, j4, j5] = [await noJogo(0), await noJogo(1), await noJogo(2), await noJogo(3), await noJogo(4)];
      t(`${rotulo} · no motor: o Eric ocupa a vaga do convidado nos jogos 1, 2 e 3 (o 3 tinha " eric lopes ")`, j1.includes('@Eric') && !j1.includes('Eric Lopes') && j2.includes('@Eric') && !j2.includes('Eric Lopes') && j3.includes('@Eric') && !j3.some((n) => /eric lopes/i.test(n)), JSON.stringify([j1, j2, j3]));
      t(`${rotulo} · o jogo 4 (o Eric já jogava) e o 5 (outro nome, "Eric") ficaram como estavam`, j4.includes('Eric Lopes') && j4.includes('@Eric') && j5.includes('Eric') && !j5.includes('@Eric'), JSON.stringify([j4, j5]));
      t(`${rotulo} · a tela do jogo não rola para o lado`, await semRolagemLateral(page));

      // o jogo 2, aberto depois: o Eric no lugar e o aviso com o Desfazer daquele jogo
      await page.goto(`${base}/time/${q.slug}/jogo/${q.jogos[1]}`, { waitUntil: 'domcontentloaded' });
      await page.locator('[data-associacoes-recentes]').waitFor({ timeout: 30000 });
      t(`${rotulo} · o jogo 2 também tem o seu "Desfazer" ("Eric ocupa a vaga do Eric Lopes neste jogo.")`, (await page.locator('[data-associacoes-recentes]').innerText()).includes('Eric ocupa a vaga do Eric Lopes neste jogo.'));
      await page.locator('[data-associacoes-recentes]').scrollIntoViewIfNeeded();
      await foto(page, `3-associar-outro-jogo-${largura}`);
    }

    // ════ 2 · Gabinete → Pessoas ═════════════════════════════════════════════════════════════════════════════════════════════
    const EXCLUIR_EM = { computador: 'teste4', 390: 'teste5', 360: 'teste1' };
    for (const aparelho of ['computador', 390, 360]) {
      const rotulo = `gabinete ${aparelho === 'computador' ? 'computador' : `${aparelho} px`}`;
      const cena = await abrirContexto(navegador, base, dados, 'adm', aparelho);
      cenas.push(cena);
      const page = await cena.ctx.newPage();
      page.on('pageerror', (e) => cena.estado.erros.push(e.message));
      const abrirPessoas = async () => {
        await page.goto(`${base}/gabinete?aba=pessoas`, { waitUntil: 'domcontentloaded' });
        await page.locator('[data-pessoa]').first().waitFor({ timeout: 40000 });
        await page.locator('[data-ultimas-acoes]').waitFor({ timeout: 20000 });
        await page.waitForTimeout(500);
      };
      const linha = (k) => page.locator(`[data-pessoa="${P[k].id}"]`);
      const suspensa = async (k) => (await linha(k).innerText()).includes('Suspensa');
      await abrirPessoas();

      // As protegidas: sem "Excluir", com o motivo. As outras: com "Excluir".
      const motivos = {};
      for (const k of ['adm', 'pessoal', 'demo', 'apple', 'wesley']) motivos[k] = (await linha(k).locator('[data-protegida]').count()) ? (await linha(k).locator('[data-protegida]').innerText()).trim() : null;
      t(`${rotulo} · protegidas sem "Excluir", com o motivo: a sua, a pessoal, a demo das lojas, o John Apple, o Wesley da Missa`,
        motivos.adm === 'Esta é a sua conta: não sai pelo Gabinete.' && motivos.pessoal === 'Conta do dono: não sai pelo Gabinete.'
        && motivos.demo === 'Conta da demo das lojas: fica até a revisão do 1.0.4 passar.' && motivos.apple === 'Conta de revisor da Apple: fica até a revisão do 1.0.4 passar.'
        && motivos.wesley === 'Membro do Missa de Quinta: o time está protegido.'
        && (await page.locator(`[data-pessoa="${P.adm.id}"] [data-excluir], [data-pessoa="${P.demo.id}"] [data-excluir], [data-pessoa="${P.wesley.id}"] [data-excluir]`).count()) === 0, JSON.stringify(motivos));
      const comExcluir = [];
      for (const k of ['ana', 'bia', 'caio', 'eric', EXCLUIR_EM[aparelho]]) if (await linha(k).locator('[data-excluir]').count()) comExcluir.push(k);
      t(`${rotulo} · as contas comuns e as de teste têm "Excluir"`, comExcluir.length === 5, comExcluir.join(','));

      if (aparelho === 'computador') {
        // ── Suspender 3 seguidas ──
        for (const [i, k] of ['ana', 'bia', 'caio'].entries()) {
          page.once('dialog', (d) => d.accept());
          await linha(k).locator('[data-suspender]').click();
          await linha(k).locator('[data-reativar]').waitFor({ timeout: 15000 });
          const todas = [];
          for (const x of ['ana', 'bia', 'caio'].slice(0, i + 1)) todas.push(await suspensa(x));
          t(`${rotulo} · suspender ${['a 1ª', 'a 2ª', 'a 3ª'][i]} (${P[k].apelido}): ${i ? 'as anteriores continuam "Suspensa"' : '"Suspensa"'}`, todas.every(Boolean), JSON.stringify(todas));
        }
        await foto(page, 'gabinete-1-tres-suspensas-computador');
        await abrirPessoas(); // recarregar a página
        t(`${rotulo} · depois de recarregar a página: as 3 seguem "Suspensa"`, (await suspensa('ana')) && (await suspensa('bia')) && (await suspensa('caio')));
        const est = await estadoDoMotor(filho);
        t(`${rotulo} · no Storage, a lista de suspensões tem as 3`, ['ana', 'bia', 'caio'].every((k) => est.suspensoes?.users?.includes(P[k].id)), JSON.stringify(est.suspensoes));

        // ── A palavra errada não apaga nada ──
        page.once('dialog', (d) => d.accept('excluir'));
        await linha('teste4').locator('[data-excluir]').click();
        await page.locator('.futty-toast', { hasText: 'Confirmação incorreta' }).first().waitFor({ timeout: 10000 });
        t(`${rotulo} · com "excluir" minúsculo: "Confirmação incorreta: nada foi excluído." e a conta continua`, (await linha('teste4').count()) === 1);
      } else {
        t(`${rotulo} · em outro aparelho, as 3 suspensas continuam "Suspensa"`, (await suspensa('ana')) && (await suspensa('bia')) && (await suspensa('caio')));
      }

      // ── Excluir ──
      const alvo = EXCLUIR_EM[aparelho];
      let textoDoPrompt = '';
      page.once('dialog', (d) => { textoDoPrompt = d.message(); d.accept('EXCLUIR'); });
      await linha(alvo).locator('[data-excluir]').click();
      await linha(alvo).waitFor({ state: 'detached', timeout: 20000 });
      t(`${rotulo} · a confirmação mostra o apelido e o e-mail e pede EXCLUIR`, textoDoPrompt.includes(`Excluir a conta de ${P[alvo].apelido} (${P[alvo].email})?`) && textoDoPrompt.includes('Escreva EXCLUIR para confirmar'), textoDoPrompt);
      const aviso = (await page.locator('.futty-toast').last().innerText()).trim();
      const est = await estadoDoMotor(filho);
      if (alvo === 'teste4') {
        t(`${rotulo} · excluiu o T4: o aviso diz que o time dele (era o único) saiu`, aviso.includes('Conta de T4 excluída.') && aviso.includes('1 time saiu (era a única pessoa).'), aviso);
        t(`${rotulo} · no motor: o "Time do Teste 4" sumiu, a foto saiu do Storage e a conta saiu do Auth`, !est.teams.some((x) => x.id === dados.t4.id) && !est.avatars.some((a) => a.includes(P.teste4.id)) && est.auth_apagados.includes(P.teste4.id), JSON.stringify({ avatars: est.avatars, auth: est.auth_apagados }));
      } else if (alvo === 'teste5') {
        t(`${rotulo} · excluiu o T5: o aviso diz que o time passou para outro membro`, aviso.includes('Conta de T5 excluída.') && aviso.includes('1 time passou para outro membro.'), aviso);
        const t5 = est.teams.find((x) => x.id === dados.t5.id);
        t(`${rotulo} · no motor: a "Pelada do Teste 5" continua, agora da Bia (admin)`, t5?.criado_por === P.bia.id && est.membros.some((m) => m.team_id === dados.t5.id && m.user_id === P.bia.id && m.role === 'admin') && est.auth_apagados.includes(P.teste5.id), JSON.stringify(t5));
      } else {
        t(`${rotulo} · excluiu o T1 (sem time): "Conta de T1 excluída."`, aviso.includes('Conta de T1 excluída.') && est.auth_apagados.includes(P.teste1.id), aviso);
      }
      const log = page.locator('[data-ultimas-acoes] [data-acao="excluir_conta"]').first();
      await log.waitFor({ timeout: 15000 });
      const linhaDoLog = (await log.innerText()).replace(/\s+/g, ' ');
      t(`${rotulo} · o log de ações mostra a exclusão (e-mail mascarado, quem fez)`, linhaDoLog.includes(`Excluiu ${P[alvo].apelido} (phf…@gmail.com) · por Chavo, el matador`), linhaDoLog);
      if (aparelho === 'computador') {
        const suspensoes = await page.locator('[data-ultimas-acoes] [data-acao="suspender_conta"]').count();
        t(`${rotulo} · e as 3 suspensões também`, suspensoes === 3, String(suspensoes));
      }
      t(`${rotulo} · a página não rola para o lado (a tabela rola dentro do cartão)`, await semRolagemLateral(page));
      await page.locator('[data-ultimas-acoes]').scrollIntoViewIfNeeded();
      await foto(page, `gabinete-2-excluiu-${aparelho}`);
    }

    const recusa = await fetch(`${dados.base}/api/super/users/${P.wesley.id}`, { method: 'DELETE', headers: { authorization: `Bearer ${dados.tokens.adm}`, 'content-type': 'application/json' }, body: JSON.stringify({ confirmar: 'EXCLUIR' }) });
    t('pelo motor direto: excluir o Wesley (Missa) é recusado com 403', recusa.status === 403);
    const naoDono = await fetch(`${dados.base}/api/super/users/${P.ana.id}`, { method: 'DELETE', headers: { authorization: `Bearer ${dados.tokens.eric}`, 'content-type': 'application/json' }, body: JSON.stringify({ confirmar: 'EXCLUIR' }) });
    t('quem não é super-admin recebe 403', naoDono.status === 403);

    for (const [i, c] of cenas.entries()) {
      t(`cena ${i + 1} · sem erro de página e nada saiu da máquina (${c.estado.externos.length ? [...new Set(c.estado.externos.map((x) => x.split(' ')[1].split('/')[0]))].join(', ') : 'nada'})`, c.estado.erros.length === 0, c.estado.erros.slice(0, 3).join(' | '));
      await c.ctx.close();
    }
  } finally {
    const rede = await encerrarMotor(filho);
    t('o motor falso não tentou sair da máquina (rede fechada)', Array.isArray(rede) && rede.length === 0, `tentativas: ${JSON.stringify(rede)}`);
  }
}
