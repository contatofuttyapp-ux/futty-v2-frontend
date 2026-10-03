// Prova no navegador (Rodada 29I, achados 84 e 88): o card de jogo do Início inteiro abre o jogo (link de verdade), com "Vou / Não vou" e
// "Ver sorteio" funcionando sem abrir o jogo — e o "Ver sorteio" responde na hora ("Abrindo…").
export const nome = 'Card de jogo do Início (link, Vou / Não vou, Ver sorteio)';

export async function rodar({ navegador, base, t }) {
  const page = await (await navegador.newContext({ viewport: { width: 390, height: 1100 } })).newPage();
  const erros = [];
  page.on('pageerror', (e) => erros.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') erros.push(m.text()); });
  await page.goto(`${base}/scripts/provas/cartao-do-jogo.html`, { waitUntil: 'domcontentloaded' });
  await page.locator('[data-c="agendado"] .gcard').waitFor();
  await page.waitForTimeout(500);
  const onde = () => page.locator('[data-onde]').innerText();
  const chamadas = () => page.evaluate(() => window.__chamadas);

  const link = page.locator('[data-c="agendado"] a.gcard__link');
  t('o card tem um link de verdade (<a href>) para o jogo', (await link.getAttribute('href')) === '/time/missa/jogo/j1', await link.getAttribute('href'));
  t('o link tem nome para leitor de tela', /Abrir o jogo Quadra do Zé/.test(await link.getAttribute('aria-label')));

  const cobre = await page.evaluate(() => {
    const card = document.querySelector('[data-c="agendado"] .gcard');
    const a = card.querySelector('a.gcard__link');
    const r = card.getBoundingClientRect();
    const pontos = [[r.left + r.width * 0.5, r.top + 24], [r.left + r.width * 0.3, r.top + r.height * 0.5], [r.left + r.width * 0.5, r.top + r.height * 0.45]];
    return { pos: getComputedStyle(card).position, quem: pontos.map(([x, y]) => { const el = document.elementFromPoint(x, y); return el === a || a.contains(el) ? 'link' : `${el?.tagName}.${el?.className || ''}`; }) };
  });
  t('o card é o contexto da camada (position: relative)', cobre.pos === 'relative', cobre.pos);
  t('o corpo do card é do link (a camada cobre tudo menos os botões)', cobre.quem.every((q) => q === 'link' || /pbtn|BUTTON/.test(q)), JSON.stringify(cobre.quem));

  await page.locator('[data-c="agendado"] .gcard').click({ position: { x: 60, y: 30 } });
  await page.waitForTimeout(150);
  t('clicar no card abre a tela do jogo', (await onde()) === '/time/missa/jogo/j1', await onde());
  await page.goBack();
  await page.waitForTimeout(150);

  await page.locator('[data-c="agendado"] button.pbtn--go').click();
  await page.waitForTimeout(150);
  t('"Vou" funciona sem abrir o jogo', (await onde()) !== '/time/missa/jogo/j1', await onde());
  t('"Vou" chamou a presença', JSON.stringify(await chamadas()) === JSON.stringify([['presenca', 'j1', true]]), JSON.stringify(await chamadas()));
  await page.locator('[data-c="agendado"] button.pbtn--no').click();
  await page.waitForTimeout(150);
  t('"Não vou" funciona sem abrir o jogo', (await onde()) !== '/time/missa/jogo/j1' && (await chamadas()).length === 2, await onde());

  await page.locator('[data-c="sorteado"] button', { hasText: 'Ver sorteio' }).click();
  await page.waitForTimeout(150);
  t('"Ver sorteio" chama o sorteio e não abre o jogo', (await chamadas()).some((c) => c[0] === 'sorteio' && c[1] === 'j2') && (await onde()) !== '/time/missa/jogo/j2', await onde());

  const abrindo = page.locator('[data-c="abrindo"] button.cta-gold');
  t('com o sorteio abrindo, o botão diz "Abrindo…", fica apagado e marcado como ocupado (achado 88)', (await abrindo.innerText()).trim() === 'Abrindo…' && (await abrindo.isDisabled()) && (await abrindo.getAttribute('aria-busy')) === 'true', await abrindo.innerText());

  await page.locator('[data-c="encerrado"] .gcard').click({ position: { x: 60, y: 30 } });
  await page.waitForTimeout(150);
  t('card encerrado também abre o jogo', (await onde()) === '/time/missa/jogo/j3', await onde());

  await page.goBack();
  await page.waitForTimeout(150);
  await page.locator('[data-c="sorteado"] a.gcard__link').focus();
  await page.keyboard.press('Enter');
  await page.waitForTimeout(150);
  t('pelo teclado: Enter no link abre o jogo', (await onde()) === '/time/missa/jogo/j2', await onde());

  const reais = erros.filter((e) => !/favicon|Failed to load resource/.test(e));
  t('console sem erros', reais.length === 0, reais.slice(0, 3).join(' | '));
  await page.context().close();
}
