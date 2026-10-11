// Prova no navegador da Rodada 30I ("Quem ganhou?"): o que só um Chromium de verdade confirma, com as MESMAS fontes e o MESMO CSS do app.
//   · item 2: o empate vira post na Resenha — o bloco "Empate" com a frase "Ouro 2 × 2 Roxo", no lugar do time campeão, que não aparece;
//   · item 5: a tela do jogo de verdade — a seção Resultado é o editor completo, e o resultado lançado aparece no card de cima;
//   · item 7: o card "Quem ganhou?" no Início inteiro — acima de "colegas para avaliar", abaixo do jogo sem resposta; um toque abre a pergunta; tocar no
//     time (ou em Empate) grava e o card some; 3 times: "Quem foi o campeão?" sem Empate; quem não administra não vê;
//   · item 6: a trava — com o jogo há 4 minutos o resultado ainda está fechado (e a tela diz a hora em que abre); há 6 minutos, abre;
//   · itens 1, 3, 4 e 5: o editor ÚNICO do resultado — tocar no time é o campeão; os gols e o placar decidem sozinhos (o toque deixa de valer);
//     com 3 ou 4 times só o campeão; "Salvar resultado" grava em dois pedidos (o resultado e os prêmios); cabe em 360 e 390 px.
// O motor é de mentira (/api/** respondido por page.route, e os pedidos ficam guardados para a prova conferir): nada sai para a rede.
import { readFileSync } from 'node:fs';

// A sessão também é de mentira: a chave do Supabase no localStorage (o mesmo truque da prova 29S-B).
const REF = new URL((readFileSync(new URL('../../.env', import.meta.url), 'utf8').match(/^VITE_SUPABASE_URL=(.+)$/m)?.[1] || 'https://prova.supabase.co').trim()).hostname.split('.')[0];
const SESSAO = JSON.stringify({
  access_token: 'prova', refresh_token: 'prova', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 86400 * 30,
  user: { id: 'U1', aud: 'authenticated', email: 'prova@futty.test', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' },
});

export const nome = 'Rodada 30I (Quem ganhou?: empate na Resenha, editor único do resultado)';

const captura = (arquivo) => new URL(`../capturas/${arquivo}`, import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');

async function abrirCena(navegador, base, cena, { largura = 390, altura = 1400, motor = null, caminho = null } = {}) {
  const ctx = await navegador.newContext({ viewport: { width: largura, height: altura }, deviceScaleFactor: 1, isMobile: true, hasTouch: true, locale: 'pt-BR', timezoneId: 'America/Sao_Paulo' });
  await ctx.addInitScript(({ chave, sessao }) => {
    try { localStorage.setItem('futty_cookies', 'aceite'); localStorage.setItem(chave, sessao); } catch { /* sem storage */ }
  }, { chave: `sb-${REF}-auth-token`, sessao: SESSAO });
  const page = await ctx.newPage();
  const erros = [];
  const chamadas = [];
  page.on('pageerror', (e) => erros.push(e.message));
  const origem = new URL(base).host;
  await page.route('**/*', (route) => {
    const req = route.request();
    const u = new URL(req.url());
    if (u.host === origem && !u.pathname.startsWith('/api/')) return route.continue();
    if (motor && u.pathname.startsWith('/api/')) {
      const bruto = req.postData();
      const resposta = motor.resposta(u.pathname, req.method(), bruto ? JSON.parse(bruto) : null);
      if (resposta) return route.fulfill({ status: resposta.__status || 200, contentType: 'application/json', body: JSON.stringify(resposta.__status ? resposta.corpo : resposta) });
    }
    if (u.pathname.startsWith('/imagens-prova/')) return route.fulfill({ status: 200, contentType: 'image/png', body: PNG_1X1 });
    if (u.pathname.startsWith('/api/') && req.method() !== 'GET') {
      const bruto = req.postData();
      chamadas.push({ metodo: req.method(), caminho: u.pathname, corpo: bruto ? JSON.parse(bruto) : null });
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, game: { id: 'g1', rodada_user_id: null } }) });
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });
  await page.goto(`${base}/scripts/provas/rodada-30i.html#${cena}`, { waitUntil: 'domcontentloaded' });
  if (caminho) {
    await page.locator('[data-casa]').waitFor({ timeout: 20000 });
    await page.evaluate((c) => { window.history.pushState({}, '', c); window.dispatchEvent(new PopStateEvent('popstate')); }, caminho);
  }
  return { page, ctx, erros, chamadas };
}

// O motor de mentira da tela do jogo: serve o jogo e GUARDA o que os dois PATCH gravam (com a mesma regra do motor, em miniatura — a de verdade
// está em backend/tests), para a tela recarregar e mostrar o que foi salvo. `chamadas` guarda os pedidos, na ordem.
function motorDoJogo({ data = new Date(Date.now() - 3 * 3600000).toISOString() } = {}) {
  const timeDe = { u1: 'A', u2: 'A', u3: 'B', u4: 'B' };
  const times = [
    { nome: 'Time A', jogadores: [{ user_id: 'u1', nome: 'Magrão', avatar_url: null, rating: 3 }, { user_id: 'u2', nome: 'Zé', avatar_url: null, rating: 3 }] },
    { nome: 'Time B', jogadores: [{ user_id: 'u3', nome: 'Cacá', avatar_url: null, rating: 3 }, { user_id: 'u4', nome: 'Duda', avatar_url: null, rating: 3 }] },
  ];
  const jogo = {
    id: 'g1', data, local: 'Quadra do Zé', status: 'em_curso', num_times: 2, jogadores_por_time: 2, max_jogadores: null, sorteio_realizado: true,
    times_resultado: { seed: 7, num_times: 2, times, reservas: [] }, historico: false, cancelado: false,
    resultado_nivel: 0, time_vencedor: null, placar_a: null, placar_b: null, campeao_time_index: null, campeao_foto_url: null,
    artilheiro_user_id: null, artilheiro_gols: null, destaque_user_id: null, destaque_titulo: null, rodada_user_id: null, rodada_foto_url: null,
  };
  let gols = [];
  const chamadas = [];
  function aplicarResultado(corpo) {
    const linhas = (corpo.gols || []).map((g) => ({ user_id: g.user_id, nome: times.flatMap((t) => t.jogadores).find((j) => j.user_id === g.user_id)?.nome, gols: g.gols, time: timeDe[g.user_id] || null }));
    const soma = [linhas.filter((l) => l.time === 'A').reduce((a, l) => a + l.gols, 0), linhas.filter((l) => l.time === 'B').reduce((a, l) => a + l.gols, 0)];
    let placar = null;
    if (soma[0] + soma[1] > 0) placar = soma;
    else if (corpo.placar_a != null) placar = [corpo.placar_a, corpo.placar_b];
    let idx = corpo.campeao_time_index ?? null;
    let empate = !!corpo.empate;
    if (placar) { idx = placar[0] > placar[1] ? 0 : placar[0] < placar[1] ? 1 : null; empate = placar[0] === placar[1]; }
    const algo = idx !== null || empate;
    Object.assign(jogo, {
      campeao_time_index: idx, time_vencedor: idx === 0 ? 'A' : idx === 1 ? 'B' : empate ? 'empate' : null,
      placar_a: placar ? placar[0] : null, placar_b: placar ? placar[1] : null,
      resultado_nivel: linhas.some((l) => l.gols > 0) ? 3 : placar ? 2 : algo ? 1 : 0,
    });
    gols = linhas;
  }
  return {
    chamadas,
    resposta(pathname, metodo, corpo) {
      if (metodo === 'GET' && pathname === '/api/games/g1') {
        return {
          team: { id: 't1', slug: 'missa', nome: 'Missa de Quinta', cor: 'verde', fuso: 'America/Sao_Paulo', cidade: null, role: 'admin' },
          game: { ...jogo },
          players: times.flatMap((t) => t.jogadores).map((j) => ({ ...j, confirmado: true, goleiro: false, cabeca_chave: false })),
          gols, meuEstado: { confirmado: true, goleiro: false, cabeca_chave: false }, jaVotei: false,
        };
      }
      if (metodo === 'GET' && pathname === '/api/teams/missa') return { team: { slug: 'missa', nome: 'Missa de Quinta', mostrar_gols: true, mostrar_artilheiro: true, mostrar_destaque: true }, members: [] };
      if (metodo === 'PATCH' && pathname === '/api/games/g1/resultado') { chamadas.push({ caminho: pathname, corpo }); aplicarResultado(corpo); return { game: { ...jogo } }; }
      if (metodo === 'PATCH' && pathname === '/api/feed/games/g1/resultado') { chamadas.push({ caminho: pathname, corpo }); Object.assign(jogo, corpo); return { game: { ...jogo } }; }
      return undefined;
    },
  };
}

// ── o Início de mentira ─────────────────────────────────────────────────────────────────────────────────────────────────
const PNG_1X1 = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
const SP = 'America/Sao_Paulo';
const TIME_MISSA = { id: 'T1', slug: 'missa', nome: 'Missa de Quinta', cidade: 'Brasília - DF', fuso: SP, cor: 'vinho', escudo_cor2: 'ouro', escudo_padrao: 'faixa' };
const SEM_PENDENCIA = { pedidos: 0, presenca: null, resultado: null, denuncias: 0, total: 0 };

/** O /api/inicio de mentira. `quemGanhou` é o que o motor manda em seu_time[0].quem_ganhou; `admin: false` é quem só joga (seu_time vazio). */
function motorDoInicio({ quemGanhou = null, admin = true, votacao = false, jogoSemResposta = false, falha = null } = {}) {
  const chamadas = [];
  let card = quemGanhou;
  const jogo = { id: 'gj', name: 'Quadra', date: new Date(Date.now() + 2 * 86400000).toISOString(), location: 'Quadra', confirmed_count: 5, status: 'scheduled', cancelado: false, user_status: null, team_id: 'T1', team_name: 'Missa de Quinta', team_slug: 'missa', fuso: SP, ausente_proximo: false, eu_jogo: true };
  const payload = () => ({
    me: { user: { id: 'U1', nome: 'Chavo', nome_jogador: 'Chavo', onboarding_completo: true, birthdate: '1990-01-01', foto_url: '/imagens-prova/bom.png', avatar_url: null, plano: 'free', fundo_figurinha: 'estadio' }, stats: { nota: 0, jogos: 0, gols: 0 } },
    teams: { teams: [{ ...TIME_MISSA, role: admin ? 'admin' : 'member', joga: true, logo_url: null }] },
    convites: { games: jogoSemResposta ? [jogo] : [] },
    pedidos: { pedidos: [] },
    votacoes_pendentes: { pendentes: votacao ? [{ slug: 'missa', nome: 'Missa de Quinta', faltam: 3, pedido_revotacao: false }] : [] },
    denuncias_desfechos: { total: 0 },
    votacao_status: null, campeonato: null, rsvp: null,
    seu_time: admin ? [{ team_id: 'T1', slug: 'missa', nome: 'Missa de Quinta', fuso: SP, pendencias: { ...SEM_PENDENCIA, resultado: card ? { game_id: card.game_id, data: card.data } : null, total: card ? 1 : 0 }, quem_ganhou: card }] : [],
    ad: { ad: null }, ads: null,
    brilhante: { fonte: null, team_id: null, kit_id: null, creditos: 0, restantes: 0, loja_pronta: false },
    pedidos_brilhante: [],
  });
  return {
    chamadas,
    resposta(pathname, metodo, corpo) {
      if (metodo === 'GET' && pathname === '/api/inicio') return payload();
      if (metodo === 'GET' && pathname === '/api/me') return payload().me;
      if (metodo === 'PATCH' && /^\/api\/games\/[^/]+\/resultado$/.test(pathname)) {
        chamadas.push({ caminho: pathname, corpo });
        if (falha) return { __status: 400, corpo: { error: falha } };
        card = null; // o motor guardou o resultado: o próximo /api/inicio já vem sem o card
        return { game: { ok: true } };
      }
      return undefined;
    },
  };
}
const cardDoMotor = (extra = {}) => ({ game_id: 'gq', data: new Date(Date.now() - 10 * 60000).toISOString(), local: 'Quadra do Zé', times: [{ nome: 'Time A' }, { nome: 'Time B' }], ...extra });

const pressionado = (page, seletor) => page.locator(seletor).getAttribute('aria-pressed').then((v) => v === 'true');
const semErrosReais = (erros) => erros.filter((e) => !/favicon|Failed to load resource/.test(e));

export async function rodar({ navegador, base, t }) {
  // ─── item 5: a tela do jogo de verdade ──────────────────────────────────────────────────────────────────────────────────
  for (const largura of [390, 360]) {
    const motor = motorDoJogo();
    const { page, ctx, erros } = await abrirCena(navegador, base, 'jogo', { largura, altura: 1800, motor });
    await page.locator('[data-resultado-editor="salvar"]').waitFor({ timeout: 20000 });
    await page.waitForTimeout(400);
    const mais = (nome) => page.locator('[data-gols-de-cada-um] + div').locator('div', { hasText: nome }).first().locator('button[aria-label="Mais"]');
    t(`${largura}px · Jogo: a seção Resultado é o editor completo (Quem ganhou?, placar, gols, artilheiro e destaque do dia, foto, rodada de cerveja)`,
      (await page.getByText('Resultado', { exact: true }).count()) >= 1 && /Quem ganhou\?/.test(await page.locator('[data-quem-ganhou]').innerText()) && (await page.locator('[data-placar]').count()) === 2
      && (await page.locator('[data-gols-de-cada-um]').count()) === 1 && (await page.locator('[data-artilheiro]').count()) === 1 && (await page.locator('[data-destaque]').count()) === 1 && (await page.locator('[data-rodada]').count()) === 1);
    t(`${largura}px · Jogo: nenhum resultado ainda — o card de cima não existe`, (await page.locator('[data-frase-do-resultado]').count()) === 0);

    // 1) só o vencedor tocado: o card de cima diz quem venceu
    await page.locator('[data-vencedor="B"]').click();
    await page.locator('[data-salvar-resultado]').click();
    await page.locator('[data-frase-do-resultado]').waitFor({ timeout: 8000 });
    t(`${largura}px · Jogo: salvou o Time Roxo — o card de cima diz "Time Roxo venceu"`, (await page.locator('[data-frase-do-resultado]').innerText()).trim() === 'Time Roxo venceu', await page.locator('[data-frase-do-resultado]').innerText());
    t(`${largura}px · Jogo: salvar mandou dois pedidos, o do resultado primeiro`, JSON.stringify(motor.chamadas.map((c) => c.caminho)) === JSON.stringify(['/api/games/g1/resultado', '/api/feed/games/g1/resultado']), JSON.stringify(motor.chamadas.map((c) => c.caminho)));
    await page.waitForTimeout(300);
    t(`${largura}px · Jogo: o editor recarrega do que foi salvo — o Time Roxo continua marcado`, await pressionado(page, '[data-vencedor="B"]'));

    // 2) gols: o placar é a soma e o vencedor sai deles
    await mais('Magrão').click(); await mais('Magrão').click();
    await page.locator('[data-salvar-resultado]').click();
    await page.waitForFunction(() => /2 × 0/.test(document.querySelector('[data-frase-do-resultado]')?.textContent || ''), null, { timeout: 8000 });
    t(`${largura}px · Jogo: gols do Magrão (2) — o card de cima vira "Time Ouro 2 × 0 Time Roxo", sem ninguém tocar em vencedor`, /Time Ouro\s*2 × 0\s*Time Roxo/.test((await page.locator('[data-frase-do-resultado]').innerText()).replace(/\s+/g, ' ')));
    await page.waitForTimeout(300);
    t(`${largura}px · Jogo: o editor volta com o Time Ouro marcado, o placar 2 × 0 mostrado (não digitável) e o gol do Magrão no lugar`, (await pressionado(page, '[data-vencedor="A"]')) && (await page.locator('[data-placar="a"]').inputValue()) === '2' && (await page.locator('[data-placar="a"]').getAttribute('readonly')) !== null && (await page.locator('[data-gols-de-cada-um] + div').innerText()).replace(/\s+/g, ' ').includes('Magrão · Time Ouro'));

    // 3) o empate explícito
    await page.locator('[data-limpar-resultado]').click();
    await page.locator('[data-vencedor="empate"]').click();
    await page.locator('[data-salvar-resultado]').click();
    await page.waitForFunction(() => /^Empate$/.test((document.querySelector('[data-frase-do-resultado]')?.textContent || '').trim()), null, { timeout: 8000 });
    t(`${largura}px · Jogo: "Limpar" + "Empate" + salvar — o card de cima diz "Empate"`, (await page.locator('[data-frase-do-resultado]').innerText()).trim() === 'Empate');
    t(`${largura}px · Jogo: o motor guardou o empate explícito (campeão nulo, time_vencedor empate), sem gols`, motor.chamadas.at(-2)?.corpo?.empate === true && motor.chamadas.at(-2)?.corpo?.campeao_time_index === null && motor.chamadas.at(-2)?.corpo?.gols.length === 0, JSON.stringify(motor.chamadas.at(-2)));

    const folga = await page.evaluate(() => ({ sobra: document.documentElement.scrollWidth - window.innerWidth }));
    t(`${largura}px · Jogo: nada rola para o lado`, folga.sobra <= 0, JSON.stringify(folga));
    if (largura === 390) await page.screenshot({ path: captura('30i-jogo-390.png'), fullPage: true });
    t(`${largura}px · Jogo: console sem erros`, semErrosReais(erros).length === 0, erros.slice(0, 2).join(' | '));
    await ctx.close();
  }

  // ─── item 7: o card "Quem ganhou?" no Início ─────────────────────────────────────────────────────────────────────────────
  for (const largura of [390, 360]) {
    // a fila: jogo sem resposta > Quem ganhou? > colegas para avaliar
    {
      const motor = motorDoInicio({ quemGanhou: cardDoMotor(), votacao: true, jogoSemResposta: true });
      const { page, ctx } = await abrirCena(navegador, base, 'inicio', { largura, altura: 844, motor, caminho: '/home' });
      await page.locator('[data-aviso]').first().waitFor({ timeout: 25000 });
      await page.waitForTimeout(500);
      const tipo = async () => ((await page.locator('[data-aviso]').count()) === 1 ? page.locator('[data-aviso]').first().getAttribute('data-aviso') : `${await page.locator('[data-aviso]').count()} avisos`);
      t(`${largura}px · Início: o jogo sem resposta ainda passa à frente de "Quem ganhou?" (um aviso por vez)`, (await tipo()) === 'jogo', await tipo());
      await ctx.close();
    }
    {
      const motor = motorDoInicio({ quemGanhou: cardDoMotor(), votacao: true });
      const { page, ctx, erros } = await abrirCena(navegador, base, 'inicio', { largura, altura: 844, motor, caminho: '/home' });
      await page.locator('[data-aviso]').first().waitFor({ timeout: 25000 });
      await page.waitForTimeout(500);
      const tipo = async () => ((await page.locator('[data-aviso]').count()) === 1 ? page.locator('[data-aviso]').first().getAttribute('data-aviso') : `${await page.locator('[data-aviso]').count()} avisos`);
      t(`${largura}px · Início: "Quem ganhou?" está acima de "colegas para avaliar" — e é o único aviso na tela`, (await tipo()) === 'quem-ganhou', await tipo());
      t(`${largura}px · o card pergunta "Quem ganhou o jogo?", diz o time, o local e a hora do jogo`, /Quem ganhou o jogo\?/.test(await page.locator('[data-quem-ganhou-pergunta]').innerText()) && /Missa de Quinta · Quadra do Zé · /.test(await page.locator('[data-aviso="quem-ganhou"] [data-nome-do-time]').innerText()));
      const cores = await page.locator('[data-quem-ganhou-time-cor]').evaluateAll((els) => els.map((el) => [el.textContent.trim(), getComputedStyle(el).borderTopColor, el.querySelector('svg')?.getAttribute('color') || el.querySelector('svg')?.style.color || '']));
      t(`${largura}px · os dois times com a cor e o escudo da cerimônia: Time Ouro (dourado) × Time Roxo (roxo)`, cores.length === 2 && cores[0][0] === 'Time Ouro' && cores[1][0] === 'Time Roxo' && cores[0][1] === 'rgb(212, 160, 23)' && cores[1][1] === 'rgb(139, 92, 246)' && (await page.locator('[data-quem-ganhou-time-cor] svg').count()) === 2, JSON.stringify(cores));
      const caixa = await page.locator('[data-aviso="quem-ganhou"]').boundingBox();
      t(`${largura}px · o card é grande (mais alto que o aviso do jogo), cabe na largura e fica na primeira tela`, caixa.height >= 120 && caixa.x >= 0 && caixa.x + caixa.width <= largura + 0.5 && caixa.y + caixa.height <= 844, JSON.stringify(caixa));
      if (largura === 390) await page.screenshot({ path: captura('30i-inicio-card-390.png') });

      // um toque abre a pergunta
      await page.locator('[data-aviso="quem-ganhou"]').click();
      await page.locator('[data-quem-ganhou-titulo]').waitFor({ timeout: 8000 });
      t(`${largura}px · um toque no card abre a pergunta, com um botão por time e "Empate"`, (await page.locator('[data-quem-ganhou-time]').count()) === 2 && (await page.locator('[data-quem-ganhou-empate]').count()) === 1 && (await page.locator('[data-quem-ganhou-titulo]').innerText()).trim() === 'Quem ganhou o jogo?');
      t(`${largura}px · e o caminho para lançar gols e prêmios (o editor do jogo)`, (await page.locator('[data-quem-ganhou-detalhes]').getAttribute('href')) === '/time/missa/jogo/gq');
      if (largura === 390) await page.screenshot({ path: captura('30i-inicio-pergunta-390.png') });
      const dentro = await page.locator('.modal-card').evaluate((el) => { const r = el.getBoundingClientRect(); return r.left >= 0 && r.right <= window.innerWidth + 0.5; });
      t(`${largura}px · a janela da pergunta cabe na tela`, dentro);

      // tocar no Time Roxo escolhe; "Finalizar" grava o campeão e o card some (entra o próximo da fila)
      await page.locator('[data-quem-ganhou-time="1"]').click();
      await page.locator('[data-quem-ganhou-finalizar]').click();
      await page.locator('[data-aviso="quem-ganhou"]').waitFor({ state: 'detached', timeout: 8000 });
      t(`${largura}px · escolher o Time Roxo e finalizar manda o campeão (índice 1) ao motor`, JSON.stringify(motor.chamadas) === JSON.stringify([{ caminho: '/api/games/gq/resultado', corpo: { campeao_time_index: 1, empate: false } }]), JSON.stringify(motor.chamadas));
      await page.waitForTimeout(600);
      t(`${largura}px · o card some e entra o próximo aviso da fila ("colegas para avaliar")`, (await page.locator('[data-aviso="quem-ganhou"]').count()) === 0 && (await page.locator('[data-aviso="votacao"]').count()) === 1 && (await page.locator('[data-quem-ganhou-titulo]').count()) === 0);
      t(`${largura}px · Início: console sem erros`, semErrosReais(erros).length === 0, erros.slice(0, 2).join(' | '));
      await ctx.close();
    }
    // o empate
    {
      const motor = motorDoInicio({ quemGanhou: cardDoMotor() });
      const { page, ctx } = await abrirCena(navegador, base, 'inicio', { largura, altura: 844, motor, caminho: '/home' });
      await page.locator('[data-aviso="quem-ganhou"]').waitFor({ timeout: 25000 });
      await page.locator('[data-aviso="quem-ganhou"]').click();
      await page.locator('[data-quem-ganhou-empate]').click();
      await page.locator('[data-quem-ganhou-finalizar]').click();
      await page.locator('[data-aviso="quem-ganhou"]').waitFor({ state: 'detached', timeout: 8000 });
      t(`${largura}px · "Empate" + Finalizar grava o empate explícito (sem campeão) e o card some`, JSON.stringify(motor.chamadas.map((c) => c.corpo)) === JSON.stringify([{ campeao_time_index: null, empate: true }]), JSON.stringify(motor.chamadas));
      await ctx.close();
    }
  }
  {
    // o motor recusa (resultado ainda fechado): a pergunta fica aberta e diz o motivo
    const motor = motorDoInicio({ quemGanhou: cardDoMotor(), falha: 'O resultado abre 5 minutos depois do início do jogo.' });
    const { page, ctx } = await abrirCena(navegador, base, 'inicio', { motor, caminho: '/home', altura: 844 });
    await page.locator('[data-aviso="quem-ganhou"]').waitFor({ timeout: 25000 });
    await page.locator('[data-aviso="quem-ganhou"]').click();
    await page.locator('[data-quem-ganhou-time="0"]').click();
    await page.locator('[data-quem-ganhou-finalizar]').click();
    await page.locator('[data-quem-ganhou-erro]').waitFor({ timeout: 8000 });
    t('se o motor recusa, a pergunta continua aberta e mostra o motivo (nada some)', /abre 5 minutos/.test(await page.locator('[data-quem-ganhou-erro]').innerText()) && (await page.locator('[data-quem-ganhou-time="0"]').isEnabled()) && (await page.locator('[data-aviso="quem-ganhou"]').count()) === 1);
    await page.locator('[data-quem-ganhou-fechar]').click();
    t('o X fecha a janela e o card continua lá', (await page.locator('[data-quem-ganhou-titulo]').count()) === 0 && (await page.locator('[data-aviso="quem-ganhou"]').count()) === 1);
    await ctx.close();
  }
  {
    // rodízio: 3 times, "Quem foi o campeão?", sem Empate
    const motor = motorDoInicio({ quemGanhou: cardDoMotor({ times: [{ nome: 'Time A' }, { nome: 'Time B' }, { nome: 'Time C' }] }) });
    const { page, ctx } = await abrirCena(navegador, base, 'inicio', { motor, caminho: '/home', altura: 844 });
    await page.locator('[data-aviso="quem-ganhou"]').waitFor({ timeout: 25000 });
    t('3 times: o card pergunta "Quem foi o campeão?" e mostra os três com as cores (Ouro, Roxo, Prata)', /Quem foi o campeão\?/.test(await page.locator('[data-quem-ganhou-pergunta]').innerText()) && (await page.locator('[data-quem-ganhou-time-cor]').count()) === 3);
    await page.locator('[data-aviso="quem-ganhou"]').click();
    t('3 times: um botão por time e nenhum "Empate"', (await page.locator('[data-quem-ganhou-time]').count()) === 3 && (await page.locator('[data-quem-ganhou-empate]').count()) === 0);
    await page.locator('[data-quem-ganhou-time="2"]').click();
    await page.locator('[data-quem-ganhou-finalizar]').click();
    await page.locator('[data-aviso="quem-ganhou"]').waitFor({ state: 'detached', timeout: 8000 });
    t('3 times: escolher o 3º e finalizar manda o campeão (índice 2), sem empate', JSON.stringify(motor.chamadas.map((c) => c.corpo)) === JSON.stringify([{ campeao_time_index: 2, empate: false }]));
    await ctx.close();
  }
  {
    // quem não administra o time não vê o card
    const { page, ctx } = await abrirCena(navegador, base, 'inicio', { motor: motorDoInicio({ admin: false, votacao: true }), caminho: '/home', altura: 844 });
    await page.locator('[data-aviso]').first().waitFor({ timeout: 25000 });
    t('quem só joga no time não vê o "Quem ganhou?" (o motor nem manda) — a votação segue sendo o aviso', (await page.locator('[data-aviso="quem-ganhou"]').count()) === 0 && (await page.locator('[data-aviso="votacao"]').count()) === 1);
    await ctx.close();
  }

  // ─── item 6: a trava de 5 minutos ───────────────────────────────────────────────────────────────────────────────────────
  {
    const hora = (ms) => new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/Sao_Paulo' }).format(new Date(ms));
    const inicio = Date.now() - 4 * 60000;
    const fechado = await abrirCena(navegador, base, 'jogo', { altura: 1800, motor: motorDoJogo({ data: new Date(inicio).toISOString() }) });
    await fechado.page.locator('[data-resultado-fechado]').waitFor({ timeout: 20000 });
    const frase = (await fechado.page.locator('[data-resultado-fechado]').innerText()).trim();
    t('Jogo há 4 minutos: o resultado ainda está fechado — sem editor, e a tela diz a hora em que abre (início + 5 min, no relógio do time)', frase === `O resultado abre 5 minutos depois do início do jogo, às ${hora(inicio + 5 * 60000)}.` && (await fechado.page.locator('[data-resultado-editor]').count()) === 0, frase);
    t('Jogo há 4 minutos: sem erro no console', semErrosReais(fechado.erros).length === 0, fechado.erros.slice(0, 2).join(' | '));
    await fechado.ctx.close();
    const aberto = await abrirCena(navegador, base, 'jogo', { altura: 1800, motor: motorDoJogo({ data: new Date(Date.now() - 6 * 60000).toISOString() }) });
    await aberto.page.locator('[data-resultado-editor="salvar"]').waitFor({ timeout: 20000 });
    t('Jogo há 6 minutos: o editor está aberto e a frase de espera não existe', (await aberto.page.locator('[data-resultado-fechado]').count()) === 0);
    await aberto.ctx.close();
  }

  // ─── item 2: o empate na Resenha ───────────────────────────────────────────────────────────────────────────────────
  for (const largura of [390, 360]) {
    const { page, ctx, erros } = await abrirCena(navegador, base, 'empate', { largura });
    await page.locator('[data-c="com-placar"] .feed-card').waitFor({ timeout: 20000 });
    await page.waitForTimeout(400);
    const frase = (c) => page.locator(`[data-c="${c}"] [data-empate-frase]`).innerText();
    t(`${largura}px · o empate com placar diz "Ouro 2 × 2 Roxo"`, (await frase('com-placar')) === 'Ouro 2 × 2 Roxo', await frase('com-placar'));
    t(`${largura}px · sem placar a frase não inventa número ("Ouro × Roxo")`, (await frase('sem-placar')) === 'Ouro × Roxo', await frase('sem-placar'));
    t(`${largura}px · o bloco do empate se chama "Empate"`, /EMPATE/i.test(await page.locator('[data-c="com-placar"] [data-empate]').first().innerText()));
    t(`${largura}px · o empate não tem o bloco "Time campeão"`, (await page.locator('[data-c="com-placar"]').innerText()).toLowerCase().includes('time campeão') === false);
    t(`${largura}px · o jogo com campeão continua com "Time campeão" e sem bloco de empate`,
      /time campe/i.test(await page.locator('[data-c="campeao"]').innerText()) && (await page.locator('[data-c="campeao"] [data-empate]').count()) === 0);
    const sobra = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    t(`${largura}px · nada rola para o lado`, sobra <= 0, `sobra ${sobra}px`);
    const respira = await page.locator('[data-c="com-placar"] [data-empate]').evaluate((el) => !!el.closest('.feed-cromo-sway')?.parentElement?.classList.contains('feed-cromo-bob'));
    t(`${largura}px · o empate respira como o bloco do campeão (bob + sway)`, respira);
    if (largura === 390) await page.screenshot({ path: captura('30i-empate-390.png'), fullPage: true });
    t(`${largura}px · console sem erros`, semErrosReais(erros).length === 0, erros.slice(0, 2).join(' | '));
    await ctx.close();
  }

  // ─── itens 1, 3 e 5: o editor, com 2 times ─────────────────────────────────────────────────────────────────────────
  for (const largura of [390, 360]) {
    const { page, ctx, erros, chamadas } = await abrirCena(navegador, base, 'editor-2', { largura, altura: 1600 });
    const ed = (s) => page.locator(`[data-resultado-editor] ${s}`);
    await page.locator('[data-resultado-editor]').waitFor({ timeout: 20000 });
    await page.waitForTimeout(300);
    const textos = (await page.locator('[data-vencedor]').allInnerTexts()).map((x) => x.trim());
    t(`${largura}px · 2 times: "Quem ganhou?" com Time Ouro · Empate · Time Roxo`, /Quem ganhou\?/.test(await ed('[data-quem-ganhou]').innerText()) && textos.join('|') === 'Time Ouro|Empate|Time Roxo', textos.join('|'));
    t(`${largura}px · sem o seletor de 4 níveis (o motor deduz o nível)`, !/Stats|Sem resultado/.test(await page.locator('[data-resultado-editor]').innerText()));
    t(`${largura}px · nada marcado: sem "Limpar" e sem foto do campeão`, (await page.locator('[data-limpar-resultado]').count()) === 0 && (await page.locator('[data-foto-do-campeao]').count()) === 0);

    // tocar no time é o campeão; tocar de novo desfaz
    await page.locator('[data-vencedor="A"]').click();
    t(`${largura}px · tocar no Time Ouro: é o campeão (e aparece a foto do campeão)`, (await pressionado(page, '[data-vencedor="A"]')) && !(await pressionado(page, '[data-vencedor="B"]')) && (await page.locator('[data-foto-do-campeao]').count()) === 1);
    await page.locator('[data-vencedor="A"]').click();
    t(`${largura}px · tocar de novo desfaz`, !(await pressionado(page, '[data-vencedor="A"]')));
    await page.locator('[data-vencedor="empate"]').click();
    t(`${largura}px · "Empate" é uma resposta (sem foto de campeão)`, (await pressionado(page, '[data-vencedor="empate"]')) && (await page.locator('[data-foto-do-campeao]').count()) === 0);
    await page.locator('[data-vencedor="B"]').click();
    t(`${largura}px · tocar no Time Roxo troca a resposta (o empate sai)`, (await pressionado(page, '[data-vencedor="B"]')) && !(await pressionado(page, '[data-vencedor="empate"]')));

    // o placar digitado decide o vencedor — e o toque deixa de valer
    await page.locator('[data-placar="a"]').fill('2');
    await page.locator('[data-placar="b"]').fill('1');
    t(`${largura}px · placar 2 × 1 digitado: quem ganhou vira o Time Ouro`, (await pressionado(page, '[data-vencedor="A"]')) && !(await pressionado(page, '[data-vencedor="B"]')));
    t(`${largura}px · e a tela diz que o placar decide`, /placar decide/i.test(await page.locator('[data-decide="placar"]').innerText()));
    // força o toque: o botão está marcado como inativo (aria-disabled) e o Playwright esperaria ele habilitar; o dedo de verdade toca e nada acontece.
    await page.locator('[data-vencedor="B"]').click({ force: true });
    t(`${largura}px · tocar em outro time com o placar digitado não muda nada (vencedor e placar nunca são escolhas separadas)`, (await pressionado(page, '[data-vencedor="A"]')) && (await page.locator('[data-placar="a"]').inputValue()) === '2');
    await page.locator('[data-placar="b"]').fill('2');
    t(`${largura}px · placar 2 × 2 digitado: empate`, await pressionado(page, '[data-vencedor="empate"]'));
    await page.locator('[data-placar="a"]').fill('');
    await page.locator('[data-placar="b"]').fill('');
    t(`${largura}px · apagando o placar o toque volta a valer`, (await page.locator('[data-decide]').count()) === 0);

    // os gols decidem sozinhos: o placar é a soma por time e é mostrado, não digitado
    const mais = (nome) => page.locator('[data-gols-de-cada-um]').locator('xpath=following-sibling::div[1]').locator('div', { hasText: nome }).first().locator('button[aria-label="Mais"]');
    await mais('Magrão').click();
    await mais('Magrão').click();
    await mais('Zé').click();
    t(`${largura}px · gols Magrão 2, Zé 1: o placar é a soma (2 × 1), mostrado e não digitável`, (await page.locator('[data-placar="a"]').inputValue()) === '2' && (await page.locator('[data-placar="b"]').inputValue()) === '1' && (await page.locator('[data-placar="a"]').getAttribute('readonly')) !== null);
    t(`${largura}px · e o Time Ouro ganhou, sem toque nenhum`, (await pressionado(page, '[data-vencedor="A"]')) && /gols de cada um decidem/i.test(await page.locator('[data-decide="gols"]').innerText()));
    await page.locator('[data-vencedor="B"]').click({ force: true });
    t(`${largura}px · tocar em outro time com gols lançados não muda nada`, await pressionado(page, '[data-vencedor="A"]'));
    await mais('Zé').click();
    t(`${largura}px · mais um gol do Zé: 2 × 2, empate`, await pressionado(page, '[data-vencedor="empate"]'));
    await mais('Zé').click();
    t(`${largura}px · 2 × 3: o Time Roxo ganhou`, await pressionado(page, '[data-vencedor="B"]'));

    // salvar: dois pedidos, o do resultado primeiro
    await mais('Zé').click(); // 2 × 4: ainda o Roxo
    await page.locator('[data-salvar-resultado]').click();
    await page.waitForTimeout(400);
    t(`${largura}px · "Salvar resultado" manda dois pedidos: o resultado e os prêmios, nesta ordem`, JSON.stringify(chamadas.map((c) => `${c.metodo} ${c.caminho}`)) === JSON.stringify(['PATCH /api/games/g1/resultado', 'PATCH /api/feed/games/g1/resultado']), JSON.stringify(chamadas.map((c) => c.caminho)));
    t(`${largura}px · o corpo do resultado leva o campeão e os gols, e NÃO leva placar (o motor soma)`, JSON.stringify(chamadas[0]?.corpo) === JSON.stringify({ campeao_time_index: 1, empate: false, gols: [{ user_id: 'u1', convidado_nome: null, gols: 2 }, { user_id: 'u3', convidado_nome: null, gols: 4 }] }), JSON.stringify(chamadas[0]?.corpo));
    t(`${largura}px · o corpo dos prêmios não leva nada de quem ganhou`, !('campeao_time_index' in (chamadas[1]?.corpo || {})) && chamadas[1]?.corpo?.artilheiro_user_id === null, JSON.stringify(chamadas[1]?.corpo));
    t(`${largura}px · avisa "Resultado salvo." e recarrega`, JSON.stringify(await page.evaluate(() => window.__toasts)) === JSON.stringify([['Resultado salvo.', 'success']]) && (await page.evaluate(() => window.__salvou)) === 1);

    // limpar
    await page.locator('[data-limpar-resultado]').click();
    t(`${largura}px · "Limpar" tira quem ganhou, o placar e os gols`, (await page.locator('[data-limpar-resultado]').count()) === 0 && !(await pressionado(page, '[data-vencedor="B"]')) && (await page.locator('[data-placar="a"]').inputValue()) === '');

    // o contorno: nada rola para o lado e nada fica fora da tela
    const folga = await page.evaluate(() => {
      const larg = window.innerWidth;
      const fora = [...document.querySelectorAll('[data-resultado-editor] button, [data-resultado-editor] input, [data-resultado-editor] select')].filter((el) => { const r = el.getBoundingClientRect(); return r.width > 0 && (r.left < -0.5 || r.right > larg + 0.5); }).length;
      return { sobra: document.documentElement.scrollWidth - larg, fora };
    });
    t(`${largura}px · o editor cabe: nada rola para o lado, nenhum campo fora da tela`, folga.sobra <= 0 && folga.fora === 0, JSON.stringify(folga));
    if (largura === 390) {
      await page.locator('[data-vencedor="A"]').click();
      await mais('Magrão').click();
      await page.screenshot({ path: captura('30i-editor-2-390.png'), fullPage: true });
    }
    t(`${largura}px · console sem erros`, semErrosReais(erros).length === 0, erros.slice(0, 2).join(' | '));
    await ctx.close();
  }

  // ─── item 4: 3 e 4 times — só o campeão ────────────────────────────────────────────────────────────────────────────
  for (const [cena, quantos] of [['editor-3', 3], ['editor-4', 4]]) {
    const { page, ctx, erros, chamadas } = await abrirCena(navegador, base, cena, { largura: 390, altura: 1800 });
    await page.locator('[data-resultado-editor]').waitFor({ timeout: 20000 });
    await page.waitForTimeout(300);
    t(`${quantos} times · a pergunta é "Quem foi o campeão?" (sem "Quem ganhou?")`, /Quem foi o campeão\?/.test(await page.locator('[data-quem-ganhou]').innerText()) && !/Quem ganhou\?/.test(await page.locator('[data-resultado-editor]').innerText()));
    t(`${quantos} times · um botão por time, sem Empate e sem Placar`, (await page.locator('[data-campeao-time]').count()) === quantos && (await page.locator('[data-vencedor]').count()) === 0 && (await page.locator('[data-placar]').count()) === 0);
    t(`${quantos} times · os gols por jogador valem para os ${quantos} times (artilheiro)`, (await page.locator('[data-gols-de-cada-um] + div').getByText('Duda').count()) === 1 && (await page.locator('[data-gols-de-cada-um]').innerText()).includes('Gols de cada um'));
    await page.locator('[data-campeao-time="2"]').click();
    t(`${quantos} times · tocar no time 3 é o campeão; tocar de novo desfaz`, (await pressionado(page, '[data-campeao-time="2"]')) && ((await page.locator('[data-campeao-time="2"]').click(), !(await pressionado(page, '[data-campeao-time="2"]')))));
    await page.locator('[data-campeao-time="2"]').click();
    // gol de quem está no 3º time: vale como gol, não decide o campeão
    await page.locator('[data-gols-de-cada-um] + div').locator('div', { hasText: 'Duda' }).first().locator('button[aria-label="Mais"]').click();
    t(`${quantos} times · um gol do Duda (3º time) não muda o campeão`, await pressionado(page, '[data-campeao-time="2"]'));
    await page.locator('[data-salvar-resultado]').click();
    await page.waitForTimeout(400);
    t(`${quantos} times · salva o campeão (índice 2) e o gol, sem placar e sem empate`, JSON.stringify(chamadas[0]?.corpo) === JSON.stringify({ campeao_time_index: 2, empate: false, gols: [{ user_id: 'u5', convidado_nome: null, gols: 1 }] }), JSON.stringify(chamadas[0]?.corpo));
    if (quantos === 4) await page.screenshot({ path: captura('30i-editor-4-390.png'), fullPage: true });
    t(`${quantos} times · console sem erros`, semErrosReais(erros).length === 0, erros.slice(0, 2).join(' | '));
    await ctx.close();
  }

  // ─── o que o time conta ────────────────────────────────────────────────────────────────────────────────────────────
  {
    const { page, ctx, erros } = await abrirCena(navegador, base, 'editor-sem-gols');
    await page.locator('[data-resultado-editor]').waitFor({ timeout: 20000 });
    t('time que não conta gols: sem "Gols de cada um" e sem "Artilheiro do dia"; o destaque continua', (await page.locator('[data-gols-de-cada-um]').count()) === 0 && (await page.locator('[data-artilheiro]').count()) === 0 && (await page.locator('[data-destaque]').count()) === 1);
    await page.locator('[data-vencedor="A"]').click();
    t('e o placar digitado segue valendo (sem gols por jogador)', await page.locator('[data-placar="a"]').isEditable());
    t('sem erros no console', semErrosReais(erros).length === 0, erros.slice(0, 2).join(' | '));
    await ctx.close();
  }

  // ─── corrigir um resultado gravado ─────────────────────────────────────────────────────────────────────────────────
  {
    const { page, ctx, erros, chamadas } = await abrirCena(navegador, base, 'editor-corrigir');
    await page.locator('[data-resultado-editor]').waitFor({ timeout: 20000 });
    t('corrigir parte do que está gravado: Roxo 1 × 2 pelos gols — o Time Roxo marcado e o placar mostrado, não digitado', (await pressionado(page, '[data-vencedor="B"]')) && (await page.locator('[data-placar="a"]').inputValue()) === '1' && (await page.locator('[data-placar="b"]').inputValue()) === '2' && (await page.locator('[data-placar="a"]').getAttribute('readonly')) !== null);
    t('e o artilheiro gravado aparece ligado, com o Zé', (await page.locator('[data-artilheiro] select').inputValue()) === 'u3');
    t('o Time Roxo campeão: a foto do campeão aparece', (await page.locator('[data-foto-do-campeao]').count()) === 1);
    await page.locator('[data-salvar-resultado]').click();
    await page.waitForTimeout(400);
    t('salvar sem mexer repete o mesmo resultado e os mesmos prêmios', chamadas[0]?.corpo?.campeao_time_index === 1 && chamadas[1]?.corpo?.artilheiro_user_id === 'u3' && chamadas[1]?.corpo?.artilheiro_gols === 2, JSON.stringify(chamadas.map((c) => c.corpo)));
    t('sem erros no console', semErrosReais(erros).length === 0, erros.slice(0, 2).join(' | '));
    await ctx.close();
  }
}
