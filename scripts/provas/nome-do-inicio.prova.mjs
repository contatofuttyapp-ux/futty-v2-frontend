// Prova no navegador (Rodada 30F, item 1): o nome do Início nunca corta — "Chavo, el matador" em 360 px saía
// "Chavo, el matad…". A 29T não resolveu porque media com scrollWidth: é inteiro e, com text-overflow: ellipsis, o
// Chrome devolve scrollWidth === clientWidth (360 === 360) com o texto a 360,45 px. O laço nunca entrava, a letra
// ficava nos 44 px e a reticência aparecia por menos de meio pixel. Aqui a medida é a do TEXTO de verdade (Range,
// sub-pixel), com a Rajdhani carregada — a letra do app.
export const nome = 'Nome do Início (sem reticência por sub-pixel, em 360 px e vizinhas)';

export async function rodar({ navegador, base, t }) {
  const page = await (await navegador.newContext({ viewport: { width: 390, height: 900 } })).newPage();
  const erros = [];
  page.on('pageerror', (e) => erros.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) erros.push(m.text()); });
  await page.goto(`${base}/scripts/provas/nome-do-inicio.html`, { waitUntil: 'domcontentloaded' });
  await page.locator('[data-largura="360"] [data-nome="dono"] > div').waitFor();
  const rajdhani = await page.evaluate(async () => { await document.fonts.load('700 44px Rajdhani'); await document.fonts.ready; return document.fonts.check('700 44px Rajdhani'); });
  t('a Rajdhani carregou (a medida é na letra do app)', rajdhani);
  await page.waitForTimeout(300); // o reajuste do fonts.ready e do ResizeObserver

  const medidas = await page.evaluate(() => [...document.querySelectorAll('[data-largura]')].flatMap((caixa) => [...caixa.querySelectorAll('[data-nome]')].map((n) => {
    const el = n.firstElementChild;
    const r = document.createRange(); r.selectNodeContents(el);
    return {
      largura: Number(caixa.dataset.largura), nome: n.dataset.nome, texto: el.textContent,
      letra: parseFloat(getComputedStyle(el).fontSize), textoPx: Math.round(r.getBoundingClientRect().width * 100) / 100, cabe: el.clientWidth,
    };
  })));
  const dono360 = medidas.find((m) => m.largura === 360 && m.nome === 'dono');
  t('"Chavo, el matador" em 360 px: o texto inteiro cabe na caixa (nada sobra para a reticência)', dono360.textoPx <= dono360.cabe, JSON.stringify(dono360));
  t('"Chavo, el matador" em 360 px: a letra desceu dos 44 px', dono360.letra < 44, JSON.stringify(dono360));
  t('… e desceu pouco (é questão de meio pixel, não de encolher à toa)', dono360.letra >= 40, JSON.stringify(dono360));
  const estoura = medidas.filter((m) => m.textoPx > m.cabe);
  t('em todas as larguras (360, 358, 340, 320, 288 px) e nomes, nenhum texto passa da caixa', estoura.length === 0, JSON.stringify(estoura));
  const curto = medidas.filter((m) => m.nome === 'curto' || m.nome === 'um');
  t('nome curto continua nos 44 px (só encolhe quem precisa)', curto.every((m) => m.letra === 44), JSON.stringify(curto));
  t('o texto no DOM é o nome inteiro (nada cortado na fonte)', medidas.every((m) => !m.texto.includes('…')));

  // Reajusta quando a coluna muda de largura (ResizeObserver): a mesma caixa em 360 → 300 → 360.
  const vaiE = await page.evaluate(async () => {
    const caixa = document.querySelector('[data-largura="360"]');
    const el = caixa.querySelector('[data-nome="dono"] > div');
    const medir = () => { const r = document.createRange(); r.selectNodeContents(el); return { letra: parseFloat(getComputedStyle(el).fontSize), texto: r.getBoundingClientRect().width, cabe: el.clientWidth }; };
    const quadro = () => new Promise((ok) => requestAnimationFrame(() => requestAnimationFrame(ok)));
    caixa.style.width = '300px'; await quadro();
    const estreita = medir();
    caixa.style.width = '360px'; await quadro();
    return { estreita, de_volta: medir() };
  });
  t('a coluna estreitou para 300 px: a letra desce de novo e o nome cabe', vaiE.estreita.texto <= vaiE.estreita.cabe && vaiE.estreita.letra < 40, JSON.stringify(vaiE));
  t('a coluna voltou para 360 px: o nome cabe (e não fica preso na letra pequena)', vaiE.de_volta.texto <= vaiE.de_volta.cabe && vaiE.de_volta.letra >= 40, JSON.stringify(vaiE));
  t('console sem erros', erros.length === 0, erros.join(' | '));
  await page.context().close();
}
