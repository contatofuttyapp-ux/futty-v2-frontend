// Prova no navegador (Rodada 29Q): os dois cartões do Início, "Radar de peladas" e "Criar time" — lado a lado, com o texto da casa, sem
// letra cortada (em 390 px e também nos 360 px dos Androids menores), com a área de toque cheia (o cartão inteiro é o link) e levando
// para /explorar e /criar-time.
export const nome = 'Início: cartões "Radar de peladas" e "Criar time" (lado a lado, toque cheio, destinos)';

export async function rodar({ navegador, base, t }) {
  const erros = [];
  async function nova(largura = 390) {
    const ctx = await navegador.newContext({ viewport: { width: largura, height: 800 }, hasTouch: true });
    const page = await ctx.newPage();
    page.on('pageerror', (e) => erros.push(e.message));
    page.on('console', (m) => { if (m.type() === 'error') erros.push(m.text()); });
    await page.goto(`${base}/scripts/provas/atalhos-inicio.html`, { waitUntil: 'domcontentloaded' });
    await page.locator('[data-atalhos-do-inicio]').waitFor();
    // As medidas de texto só valem com a Rajdhani de verdade carregada (a letra de reserva é bem mais larga).
    await page.evaluate(async () => { await document.fonts.load("800 15px 'Rajdhani'"); await document.fonts.ready; });
    return page;
  }
  const radar = (page) => page.locator('[data-atalho-do-inicio="radar"]');
  const criar = (page) => page.locator('[data-atalho-do-inicio="criar-time"]');

  // ── 1. O desenho: dois cartões lado a lado, com o texto da casa, e nada cortado ───────────────────────────────────────────────
  for (const largura of [390, 360]) {
    const onde = `${largura} px`;
    const page = await nova(largura);
    if (largura === 390) {
      t('são dois cartões, e os dois são LINKS (o cartão inteiro)', (await radar(page).count()) === 1 && (await criar(page).count()) === 1 && (await radar(page).evaluate((el) => el.tagName)) === 'A' && (await criar(page).evaluate((el) => el.tagName)) === 'A');
      t('o Radar leva a /explorar e o Criar time a /criar-time', (await radar(page).getAttribute('href')) === '/explorar' && (await criar(page).getAttribute('href')) === '/criar-time');
      const tr = (await radar(page).innerText()).replace(/\s+/g, ' ').trim();
      const tc = (await criar(page).innerText()).replace(/\s+/g, ' ').trim();
      t('Radar: "Radar de peladas" + "Encontre uma pelada perto de você"', tr === 'Radar de peladas Encontre uma pelada perto de você', tr);
      t('Criar time: "Criar time" + "Organize o jogo da sua galera"', tc === 'Criar time Organize o jogo da sua galera', tc);
      const cores = await page.evaluate(() => [...document.querySelectorAll('[data-atalho-do-inicio] svg')].map((s) => s.getAttribute('stroke')));
      t('ícones do lucide: o Radar em roxo (#8b5cf6) e o de mais em dourado (#d4a017)', cores[0] === '#8b5cf6' && cores[1] === '#d4a017', JSON.stringify(cores));
      t('sem emoji: os ícones são SVG (lei dos ícones)', (await page.locator('[data-atalho-do-inicio] svg').count()) === 2 && !/\p{Extended_Pictographic}/u.test(tr + tc));
    }
    const a = await radar(page).boundingBox();
    const b = await criar(page).boundingBox();
    t(`${onde}: lado a lado, o Radar à esquerda, mesmo topo, larguras iguais`, Math.abs(a.y - b.y) < 1 && a.x < b.x && Math.abs(a.width - b.width) < 1, JSON.stringify({ a, b }));
    t(`${onde}: cabem sem rolagem horizontal`, b.x + b.width <= largura && (await page.evaluate(() => document.documentElement.scrollWidth)) <= largura, JSON.stringify(b));
    t(`${onde}: área de toque cheia, cada cartão passa de 44 px de altura`, a.height >= 44 && b.height >= 44, `${a.height} ${b.height}`);
    // A letra nunca encolhe nem corta: o rótulo cabe numa linha só dentro do cartão e a chamada tem no máximo 2 linhas.
    const medidas = await page.evaluate(() => [...document.querySelectorAll('[data-atalho-do-inicio]')].map((el) => {
      const rotulo = el.querySelector(':scope > span:first-child > span'); // o texto ao lado do ícone
      const chamada = el.querySelector(':scope > span:last-child'); // a frase de baixo
      const cr = getComputedStyle(chamada);
      const rr = rotulo.getBoundingClientRect();
      return {
        umaLinha: rr.height < 24, // 15 px × 1,15 = 17 px; duas linhas passariam de 34
        dentro: rr.right <= el.getBoundingClientRect().right - 6,
        fonteRotulo: parseFloat(getComputedStyle(rotulo).fontSize),
        fonteChamada: parseFloat(cr.fontSize),
        linhasChamada: Math.round(chamada.getBoundingClientRect().height / parseFloat(cr.lineHeight)),
      };
    }));
    t(`${onde}: o rótulo cabe em UMA linha, dentro do cartão, com a letra de 15 px (a chamada, 12 px)`, medidas.every((m) => m.umaLinha && m.dentro && m.fonteRotulo === 15 && m.fonteChamada === 12), JSON.stringify(medidas));
    t(`${onde}: a chamada ocupa no máximo 2 linhas`, medidas.every((m) => m.linhasChamada <= 2), JSON.stringify(medidas));
    await page.context().close();
  }

  // ── 2. O toque cai no cartão inteiro, não só no texto: tocar no canto vazio também navega ─────────────────────────────────────
  {
    const page = await nova();
    const a = await radar(page).boundingBox();
    await page.touchscreen.tap(a.x + a.width - 6, a.y + a.height - 6); // o canto de baixo à direita, longe do texto
    await page.locator('[data-onde="/explorar"]').waitFor({ timeout: 5000 });
    t('tocar no CANTO do cartão do Radar leva a /explorar', (await page.locator('[data-onde]').innerText()) === 'RADAR-DE-MENTIRA');
    await page.context().close();
  }
  {
    const page = await nova();
    const b = await criar(page).boundingBox();
    await page.touchscreen.tap(b.x + b.width - 6, b.y + b.height - 6);
    await page.locator('[data-onde="/criar-time"]').waitFor({ timeout: 5000 });
    t('tocar no CANTO do cartão do Criar time leva a /criar-time', (await page.locator('[data-onde]').innerText()) === 'CRIAR-TIME-DE-MENTIRA');
    await page.context().close();
  }

  const reais = erros.filter((e) => !/favicon|Failed to load resource/.test(e));
  t('console sem erros', reais.length === 0, reais.slice(0, 3).join(' | '));
}
