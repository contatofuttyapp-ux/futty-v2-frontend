// Prova no navegador da Rodada 31P (confete e rodada de cerveja), num Chromium de verdade com o mesmo CSS e as mesmas fontes do app:
//   · o confete do campeonato terminado no Início sai UMA vez por campeonato por pessoa: abrir o Início 3 vezes (recarregando a página, que
//     zera a memória do app, e voltando a ele sem recarregar) solta confete só na 1ª; outro campeonato terminado ou outra pessoa no mesmo
//     aparelho celebram de novo, uma vez;
//   · a rodada de cerveja saiu: o editor do resultado de um jogo que TEM rodada gravada não mostra nada dela, e salvar não manda `rodada_*`;
//   · o cartão do jogo na Resenha com rodada gravada não mostra rodada (nem o nome de quem pagou, nem a foto).
// O confete é contado pelo <canvas> de tela cheia que o canvas-confetti põe no body. O motor é de mentira (page.route): nada sai para a rede.
import { readFileSync } from 'node:fs';

const REF = new URL((readFileSync(new URL('../../.env', import.meta.url), 'utf8').match(/^VITE_SUPABASE_URL=(.+)$/m)?.[1] || 'https://prova.supabase.co').trim()).hostname.split('.')[0];
const sessao = (id) => JSON.stringify({
  access_token: 'prova', refresh_token: 'prova', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 86400 * 30,
  user: { id, aud: 'authenticated', email: 'prova@futty.test', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' },
});

export const nome = 'Rodada 31P (confete do campeonato uma vez só; rodada de cerveja fora do app)';

const PNG_1X1 = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
const SP = 'America/Sao_Paulo';
const TIME_MISSA = { id: 'T1', slug: 'missa', nome: 'Missa de Quinta', cidade: 'Brasília - DF', fuso: SP, cor: 'vinho', escudo_cor2: 'ouro', escudo_padrao: 'faixa' };
const campeonato = (id) => ({
  campeonato: { id, nome: 'Copa da Missa', estado: 'terminado', campeao: 'A', time_a_nome: 'Ouro', time_b_nome: 'Roxo', time_a_pontos: 9, time_b_pontos: 6, jornadas_jogadas: 5, num_jornadas: 5 },
  jornadas: [],
});

/** O motor de mentira. `estado.userId` e `estado.campeonatoId` podem mudar entre aberturas (outra pessoa, outro campeonato). */
function motor(estado) {
  const payload = () => ({
    me: { user: { id: estado.userId, nome: 'Chavo', nome_jogador: 'Chavo', onboarding_completo: true, birthdate: '1990-01-01', foto_url: '/imagens-prova/bom.png', avatar_url: null, plano: 'free', fundo_figurinha: 'estadio' }, stats: { nota: 0, jogos: 0, gols: 0 } },
    teams: { teams: [{ ...TIME_MISSA, role: 'member', joga: true, logo_url: null }] },
    convites: { games: [] }, pedidos: { pedidos: [] }, votacoes_pendentes: { pendentes: [] }, denuncias_desfechos: { total: 0 },
    votacao_status: null, campeonato: estado.campeonatoId ? campeonato(estado.campeonatoId) : null, rsvp: null, campeonato_novo: null, seu_time: [],
    ad: { ad: null }, ads: null,
    brilhante: { fonte: null, team_id: null, kit_id: null, creditos: 0, restantes: 0, loja_pronta: false },
    pedidos_brilhante: [],
  });
  return (pathname, metodo) => {
    if (metodo === 'GET' && pathname === '/api/inicio') return payload();
    if (metodo === 'GET' && pathname === '/api/me') return payload().me;
    return undefined;
  };
}

async function novoContexto(navegador, { largura = 390, userId = 'U1' } = {}) {
  const ctx = await navegador.newContext({ viewport: { width: largura, height: 1400 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true, locale: 'pt-BR', timezoneId: SP });
  const estado = { userId, campeonatoId: 'C1' };
  await ctx.addInitScript(() => {
    window.__confetes = 0;
    // O canvas-confetti desenha num <canvas> fixo que ele põe no body e tira quando a festa acaba: cada um que entra é uma festa.
    new MutationObserver((mudancas) => {
      for (const m of mudancas) for (const n of m.addedNodes) if (n.nodeName === 'CANVAS' && n.style.position === 'fixed') window.__confetes += 1;
    }).observe(document, { childList: true, subtree: true });
    try { localStorage.setItem('futty_cookies', 'aceite'); } catch { /* sem storage */ }
  });
  return { ctx, estado };
}

async function abrir(ctx, base, cena, { estado = null, chamadas = null } = {}) {
  const page = await ctx.newPage();
  const erros = [];
  page.on('pageerror', (e) => erros.push(e.message));
  const responder = estado ? motor(estado) : () => undefined;
  const origem = new URL(base).host;
  await page.route('**/*', (route) => {
    const req = route.request();
    const u = new URL(req.url());
    if (u.host === origem && !u.pathname.startsWith('/api/') && !u.pathname.startsWith('/imagens-prova/')) return route.continue();
    if (u.pathname.startsWith('/imagens-prova/')) return route.fulfill({ status: 200, contentType: 'image/png', body: PNG_1X1 });
    if (u.pathname.startsWith('/api/')) {
      const resposta = responder(u.pathname, req.method());
      if (resposta) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(resposta) });
      if (req.method() !== 'GET') {
        const bruto = req.postData();
        chamadas?.push({ metodo: req.method(), caminho: u.pathname, corpo: bruto ? JSON.parse(bruto) : null });
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, game: { id: 'g1' } }) });
      }
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });
  // A sessão de mentira entra antes do app, com a pessoa da vez: trocar de pessoa no mesmo aparelho é mudar estado.userId antes de abrir.
  await page.addInitScript(({ chave, valor }) => {
    try { localStorage.setItem(chave, valor); } catch { /* sem storage */ }
  }, { chave: `sb-${REF}-auth-token`, valor: sessao(estado?.userId || 'U1') });
  await page.goto(`${base}/scripts/provas/rodada-31p.html#${cena}`, { waitUntil: 'domcontentloaded' });
  return { page, erros };
}

/** Abre o Início (página recarregada do zero) e devolve quantas festas saíram até 2,5 s depois de o card do campeonato aparecer. */
async function abrirInicio(ctx, base, estado) {
  const { page, erros } = await abrir(ctx, base, 'inicio', { estado });
  await page.locator('[data-casa]').waitFor({ timeout: 20000 });
  await page.evaluate(() => { window.history.pushState({}, '', '/home'); window.dispatchEvent(new PopStateEvent('popstate')); });
  await page.getByText('Copa da Missa · Campeão: Ouro').waitFor({ timeout: 20000 });
  await page.waitForTimeout(2500);
  return { page, erros, confetes: await page.evaluate(() => window.__confetes) };
}

const semErrosReais = (erros) => erros.filter((e) => !/favicon|Failed to load resource/.test(e));

export async function rodar({ navegador, base, t }) {
  // ─── 1) confete do campeonato terminado: uma vez por campeonato por pessoa ──────────────────────────────────────────
  {
    const { ctx, estado } = await novoContexto(navegador);
    const contagens = [];
    const erros = [];
    let ultima = null;
    for (let i = 0; i < 3; i += 1) {
      if (ultima) await ultima.close();
      const r = await abrirInicio(ctx, base, estado);
      contagens.push(r.confetes);
      erros.push(...r.erros);
      ultima = r.page;
    }
    t('Início aberto 3 vezes com o campeonato terminado (página recarregada a cada vez): confete só na 1ª', JSON.stringify(contagens) === '[1,0,0]', JSON.stringify(contagens));
    const guardado = await ultima.evaluate(() => localStorage.getItem('futty_campeonato_celebrado:U1:C1'));
    t('...e o aparelho guardou o campeonato celebrado (por pessoa e por campeonato)', guardado === '1', String(guardado));

    // Sair do Início e voltar sem recarregar (o Início desmonta e monta de novo): nada.
    const antes = await ultima.evaluate(() => window.__confetes);
    await ultima.evaluate(() => { window.history.pushState({}, '', '/outra'); window.dispatchEvent(new PopStateEvent('popstate')); });
    await ultima.locator('[data-casa]').waitFor({ timeout: 8000 });
    await ultima.evaluate(() => { window.history.pushState({}, '', '/home'); window.dispatchEvent(new PopStateEvent('popstate')); });
    await ultima.getByText('Copa da Missa · Campeão: Ouro').waitFor({ timeout: 20000 });
    await ultima.waitForTimeout(2000);
    t('Sair do Início e voltar (sem recarregar): sem confete', (await ultima.evaluate(() => window.__confetes)) === antes);
    await ultima.close();

    // Outro campeonato terminado: festa nova, uma vez.
    estado.campeonatoId = 'C2';
    const c2a = await abrirInicio(ctx, base, estado);
    await c2a.page.close();
    const c2b = await abrirInicio(ctx, base, estado);
    await c2b.page.close();
    t('Outro campeonato terminado: confete de novo, uma vez só', c2a.confetes === 1 && c2b.confetes === 0, `${c2a.confetes}, ${c2b.confetes}`);

    // Outra pessoa no mesmo aparelho, mesmo campeonato: a festa é dela, uma vez.
    estado.userId = 'U2';
    const u2a = await abrirInicio(ctx, base, estado);
    await u2a.page.close();
    const u2b = await abrirInicio(ctx, base, estado);
    await u2b.page.close();
    t('Outra pessoa no mesmo aparelho: confete dela, uma vez só', u2a.confetes === 1 && u2b.confetes === 0, `${u2a.confetes}, ${u2b.confetes}`);
    erros.push(...c2a.erros, ...c2b.erros, ...u2a.erros, ...u2b.erros);
    t('Início: sem erro no console', semErrosReais(erros).length === 0, semErrosReais(erros).slice(0, 2).join(' | '));
    await ctx.close();
  }

  // ─── 2) o editor do resultado: nenhuma opção de rodada de cerveja, e salvar não manda rodada ───────────────────────────
  for (const largura of [390, 360]) {
    const { ctx } = await novoContexto(navegador, { largura });
    const chamadas = [];
    const { page, erros } = await abrir(ctx, base, 'editor', { chamadas });
    await page.locator('[data-resultado-editor="salvar"]').waitFor({ timeout: 20000 });
    await page.waitForTimeout(300);
    const texto = await page.locator('[data-resultado-editor]').innerText();
    t(`${largura}px · editor de um jogo com rodada gravada: nenhuma opção de rodada de cerveja`,
      !/cerveja|rodada/i.test(texto) && (await page.locator('[data-rodada]').count()) === 0, texto.replace(/\s+/g, ' ').slice(0, 200));
    t(`${largura}px · ...e o editor continua inteiro (Quem ganhou?, artilheiro, destaque, foto do campeão)`,
      /Quem ganhou\?/.test(texto) && (await page.locator('[data-artilheiro]').count()) === 1 && (await page.locator('[data-destaque]').count()) === 1 && (await page.locator('[data-foto-do-campeao]').count()) === 1);
    await page.locator('[data-salvar-resultado]').click();
    await page.waitForFunction(() => window.__salvou === 1, null, { timeout: 8000 });
    const feed = chamadas.find((c) => c.caminho === '/api/feed/games/g1/resultado');
    t(`${largura}px · lançar o resultado: o pedido dos prêmios não leva nada de rodada (a gravada fica no banco, intocada)`,
      !!feed && !Object.keys(feed.corpo).some((k) => k.startsWith('rodada')), JSON.stringify(feed?.corpo));
    t(`${largura}px · lançar o resultado: sem confete`, (await page.evaluate(() => window.__confetes)) === 0);
    t(`${largura}px · editor: sem erro no console`, semErrosReais(erros).length === 0, semErrosReais(erros).slice(0, 2).join(' | '));
    await ctx.close();
  }

  // ─── 3) o cartão do jogo na Resenha com rodada gravada: sem rodada ───────────────────────────────────────────────────
  for (const largura of [390, 360]) {
    const { ctx } = await novoContexto(navegador, { largura });
    const { page, erros } = await abrir(ctx, base, 'resenha');
    await page.locator('[data-c="jogo"] .feed-card').waitFor({ timeout: 20000 });
    await page.waitForTimeout(300);
    const texto = await page.locator('[data-c="jogo"]').innerText();
    const fotos = await page.locator('[data-c="jogo"] img').evaluateAll((imgs) => imgs.map((i) => i.getAttribute('src') || ''));
    t(`${largura}px · Resenha: o cartão de um jogo com rodada gravada não mostra rodada`, !/cerveja|rodada|pagou/i.test(texto), texto.replace(/\s+/g, ' ').slice(0, 200));
    t(`${largura}px · ...nem a foto da rodada`, !fotos.some((s) => s.includes('rodada')), JSON.stringify(fotos));
    t(`${largura}px · ...e o resto do cartão segue lá (Time campeão, artilheiro)`, /time campe/i.test(texto) && /Cacá/.test(texto));
    t(`${largura}px · Resenha: sem erro no console`, semErrosReais(erros).length === 0, semErrosReais(erros).slice(0, 2).join(' | '));
    await ctx.close();
  }
}
