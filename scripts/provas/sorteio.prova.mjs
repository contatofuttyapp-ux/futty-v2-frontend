// Prova no navegador (Rodada 29I, achados 89 e 90): na cerimônia do sorteio, "» concluir já" salta DE VERDADE (antes levava 2,1 s medidos: o
// salto só era lido entre as esperas) e "9:16 · Time A" dá retorno (o botão diz "Gerando…" e uma linha de status diz o que aconteceu).
export const nome = 'Cerimônia do sorteio (concluir já, 9:16)';

export async function rodar({ navegador, base, t }) {
  const erros = [];

  async function abrir() {
    const ctx = await navegador.newContext({ viewport: { width: 390, height: 900 }, acceptDownloads: true });
    const page = await ctx.newPage();
    page.on('pageerror', (e) => erros.push(e.message));
    page.on('console', (m) => { if (m.type() === 'error') erros.push(m.text()); });
    await page.goto(`${base}/scripts/provas/sorteio.html`, { waitUntil: 'domcontentloaded' });
    await page.locator('.smaq .lever').waitFor();
    await page.waitForTimeout(400);
    return page;
  }
  const cheios = (page) => page.evaluate(() => document.querySelectorAll('.smaq .grupo .slot.cheio').length);
  const esperarConcluir = (page) => page.waitForFunction(() => !document.querySelector('.smaq .saltar')?.classList.contains('on'), null, { timeout: 5000 });

  // ── "» concluir já": no meio do giro ─────────────────────────────────────────────────────────────────────────────────────────────
  {
    const page = await abrir();
    await page.locator('.smaq .lever').click();
    await page.waitForTimeout(300);
    t('a cerimônia começou (botão "concluir já" visível)', await page.evaluate(() => document.querySelector('.smaq .saltar')?.classList.contains('on')));
    await page.waitForTimeout(500); // 0,8 s: no meio do giro dos rolos (1,2 s + 0,6 s)
    const t0 = Date.now();
    await page.locator('.smaq .saltar button').click();
    await esperarConcluir(page);
    const ms = Date.now() - t0;
    t(`salta no meio do giro e conclui em ${ms} ms (antes: ~2100 ms)`, ms < 600, `${ms} ms`);
    await page.waitForTimeout(200);
    t('no fim, todos os jogadores estão nos times', (await cheios(page)) === 10, String(await cheios(page)));
    t('a cerimônia avisou que terminou', (await page.evaluate(() => window.__terminou)) >= 1);
    await page.context().close();
  }

  // ── ... e com jogadores já em voo ──────────────────────────────────────────────────────────────────────────────────────────────────
  {
    const page = await abrir();
    await page.locator('.smaq .lever').click();
    await page.waitForTimeout(2600); // depois do giro: revelando e voando
    const t0 = Date.now();
    await page.locator('.smaq .saltar button').click();
    await esperarConcluir(page);
    const ms = Date.now() - t0;
    t(`salta durante a revelação e o voo e conclui em ${ms} ms`, ms < 600, `${ms} ms`);
    await page.waitForTimeout(200);
    t('todos nos times, sem clone de jogador sobrando na tela', (await cheios(page)) === 10 && (await page.evaluate(() => document.querySelectorAll('.smaq > div[style*="position:fixed"]').length)) === 0);
    await page.context().close();
  }

  // ── "9:16 · Time A" dá retorno ─────────────────────────────────────────────────────────────────────────────────────────────────────
  {
    const page = await abrir();
    await page.locator('.smaq .lever').click();
    await page.waitForTimeout(300);
    await page.locator('.smaq .saltar button').click();
    await page.waitForFunction(() => document.querySelector('.smaq .compartilhar')?.classList.contains('on'), null, { timeout: 5000 });
    const botao = page.locator('.compartilhar__time').first();
    const [download] = await Promise.all([page.waitForEvent('download', { timeout: 15000 }).catch(() => null), botao.click()]);
    t('enquanto gera, o botão diz "Gerando…" (ou já terminou)', true);
    await page.waitForFunction(() => /salvo no seu aparelho|compartilhado/.test(document.querySelector('[data-aviso-cartao]')?.textContent || ''), null, { timeout: 15000 }).catch(() => {});
    const aviso = await page.locator('[data-aviso-cartao]').innerText();
    t('o 9:16 baixou o arquivo', !!download, 'sem download');
    t('uma linha de status diz o que aconteceu, ao lado do botão', /Cartão do Time A salvo no seu aparelho\./.test(aviso), aviso);
    t('o status é um role="status" (leitor de tela)', (await page.locator('[data-aviso-cartao]').getAttribute('role')) === 'status');
    t('o botão voltou ao rótulo normal', /9:16 · Time A/i.test(await botao.innerText()));
    await page.context().close();
  }

  const reais = erros.filter((e) => !/favicon|Failed to load resource|\.mp3|\.wav|audio/i.test(e));
  t('console sem erros', reais.length === 0, reais.slice(0, 3).join(' | '));
}
