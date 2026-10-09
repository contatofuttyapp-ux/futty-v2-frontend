// Prova no navegador (Rodada 30F, item 4): o erro do sorteio aparece JUNTO do botão, sem rolar. Antes ele ia para o topo
// da página e quem tocava em "Sortear de novo", lá embaixo, não via "São precisos pelo menos 14 jogadores…": parecia que
// o botão não tinha feito nada. Usa a bancada do Jogo de verdade (rodada-29s-a.html); o motor é de mentira e responde 400.
import { readFileSync } from 'node:fs';

export const nome = 'Erro do sorteio junto do botão (Sortear de novo e o primeiro Sortear)';

const SP = 'America/Sao_Paulo';
const ALTURA = 844;
const MSG = 'São precisos pelo menos 14 jogadores (7 por time) para formar 2 times. Há 10 (confirmados + convidados).';
const REF = new URL((readFileSync(new URL('../../.env', import.meta.url), 'utf8').match(/^VITE_SUPABASE_URL=(.+)$/m)?.[1] || 'https://prova.supabase.co').trim()).hostname.split('.')[0];
const SESSAO = JSON.stringify({
  access_token: 'prova', refresh_token: 'prova', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 86400 * 30,
  user: { id: 'U1', aud: 'authenticated', email: 'prova@futty.test', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' },
});
const NOMES = ['Ana', 'Beto', 'Caio', 'Duda', 'Edu', 'Fabi', 'Gui', 'Hugo', 'Iara', 'João'];

function motor({ comTimes }) {
  const team = { id: 'T2', slug: 'varzea-fc', nome: 'Várzea FC', cidade: 'Brasília - DF', fuso: SP, cor: 'azul', escudo_cor2: 'ouro', escudo_padrao: 'faixa', role: 'admin', joga: true, jogadores_por_time: 7, mostrar_gols: true, modo_visibilidade: 'privado', logo_url: null };
  const players = NOMES.map((n, i) => ({ user_id: `U${i + 10}`, nome: n, avatar_url: null, avatar_generico: null, goleiro: false, cabeca_chave: false, rating: 6.5, confirmado: true }));
  const tr = { num_times: 2, seed: 4242, times: [0, 1].map((t) => ({ nome: ['Time Ouro', 'Time Roxo'][t], jogadores: players.filter((_, i) => i % 2 === t).map((p) => ({ user_id: p.user_id, nome: p.nome, avatar_url: null, rating: 3 })) })), reservas: [], registro: { origem: 'sorteio', por: { nome: 'Chavo' }, sorteio_numero: 1, sorteios: 1, ajustes: [] } };
  const jogo = { id: 'G1', data: new Date(Date.now() + 3 * 86400000).toISOString(), local: 'Society Madalena — campo 1', status: 'agendado', jogadores_por_time: 7, sorteio_realizado: comTimes, num_times: comTimes ? 2 : null, times_resultado: comTimes ? tr : null, resultado_nivel: 0, cancelado: false };
  return (route) => {
    const req = route.request();
    const u = new URL(req.url());
    if (!u.pathname.startsWith('/api/')) return null;
    if (req.method() === 'POST' && u.pathname === '/api/games/G1/sortear') return route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ error: MSG }) });
    let corpo = { ok: true };
    if (req.method() === 'GET' && u.pathname === '/api/teams/varzea-fc') corpo = { team, members: players.map((p) => ({ id: p.user_id, nome: p.nome, role: 'member', joga: true })) };
    else if (req.method() === 'GET' && u.pathname === '/api/games/G1') corpo = { team, game: jogo, players, meuEstado: { confirmado: true, goleiro: false }, gols: [] };
    else if (req.method() === 'GET' && u.pathname.endsWith('/rsvp')) corpo = { rsvp_aberto: false, rsvp_fechado: false, confirmados: [], recusados: [], pendentes: [], espera: [], eu_jogo: true, fuso: SP };
    else if (req.method() === 'GET') corpo = {};
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(corpo) });
  };
}

async function abrir(navegador, base, comTimes) {
  const ctx = await navegador.newContext({ viewport: { width: 390, height: ALTURA }, deviceScaleFactor: 1, isMobile: true, hasTouch: true, locale: 'pt-BR', timezoneId: SP });
  await ctx.addInitScript(({ chave, sessao }) => {
    try { localStorage.setItem('futty_cookies', 'aceite'); localStorage.setItem(chave, sessao); } catch { /* sem storage */ }
  }, { chave: `sb-${REF}-auth-token`, sessao: SESSAO });
  const page = await ctx.newPage();
  page.setDefaultTimeout(15000);
  const origem = new URL(base).host;
  const doMotor = motor({ comTimes });
  await page.route('**/*', (route) => {
    const u = new URL(route.request().url());
    if (u.pathname.startsWith('/api/')) return doMotor(route);
    if (u.host === origem) return route.continue();
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });
  await page.goto(`${base}/scripts/provas/rodada-29s-a.html`, { waitUntil: 'domcontentloaded' });
  await page.locator('[data-casa]').waitFor({ timeout: 20000 });
  await page.evaluate(() => { window.history.pushState({}, '', '/time/varzea-fc/jogo/G1'); window.dispatchEvent(new PopStateEvent('popstate')); });
  return { ctx, page };
}

const naTela = (page, sel) => page.evaluate((s) => {
  const el = document.querySelector(s);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { topo: Math.round(r.top), base: Math.round(r.bottom), altura: window.innerHeight, visivel: r.top >= 0 && r.bottom <= window.innerHeight };
}, sel);

export async function rodar({ navegador, base, t }) {
  // ── "Sortear de novo", lá embaixo da página ─────────────────────────────────────────────────────────────────────────────────────────
  {
    const { ctx, page } = await abrir(navegador, base, true);
    await page.locator('[data-trocar="sortear"]').waitFor({ timeout: 25000 });
    await page.locator('[data-trocar="sortear"]').click();
    await page.getByRole('button', { name: 'Sortear de novo' }).click();
    await page.locator('[data-erro-do-sorteio]').waitFor();
    await page.waitForTimeout(700); // o scroll suave, se precisar
    const onde = await naTela(page, '[data-erro-do-sorteio]');
    t('"Sortear de novo" com erro do motor: o aviso aparece na tela, sem a pessoa rolar', onde?.visivel, JSON.stringify(onde));
    t('…com a frase do motor (o que fazer), não uma genérica', (await page.locator('[data-erro-do-sorteio]').innerText()).trim() === MSG);
    const botoes = await naTela(page, '[data-trocar-os-times]');
    t('…e logo abaixo de "Trocar os times" (junto da ação, não no topo)', botoes && onde && onde.topo >= botoes.base && onde.topo - botoes.base < 60, JSON.stringify({ botoes, onde }));
    t('o topo da página não repete o erro do sorteio', !(await page.locator('main > .alert.alert--error:not([data-erro-do-sorteio])').count()));
    await ctx.close();
  }

  // ── o primeiro "Sortear" (jogo sem times) ───────────────────────────────────────────────────────────────────────────────────────────
  {
    const { ctx, page } = await abrir(navegador, base, false);
    await page.locator('[data-escolha="sortear"]').waitFor({ timeout: 25000 });
    await page.locator('[data-escolha="sortear"]').click();
    await page.locator('[data-erro-do-sorteio]').waitFor();
    await page.waitForTimeout(700);
    const onde = await naTela(page, '[data-erro-do-sorteio]');
    t('o primeiro "Sortear" com erro: o aviso também aparece na tela, junto dos botões', onde?.visivel, JSON.stringify(onde));
    await ctx.close();
  }
}
