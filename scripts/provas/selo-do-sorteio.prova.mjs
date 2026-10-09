// Prova no navegador (Rodada 30B): o que a cerimônia e a lista dos times dizem sobre COMO os times foram feitos.
//   · sorteado e depois ajustado → a máquina gira o ORIGINAL; no fim vêm "Ajuste de <nome>", cada troca numa linha,
//     os times finais (quem trocou com moldura dourada) e o selo roxo; o compartilhar é dos times FINAIS;
//   · a lista dos times (tela do jogo, link público) leva o selo dos três casos, com o nome inteiro.
// Com PROVA_FOTOS=<pasta> as telas ficam salvas lá (para olhar o look).
import path from 'node:path';

export const nome = 'Selos do sorteio (cerimônia ajustada, lista dos times)';

export async function rodar({ navegador, base, t }) {
  const erros = [];
  const fotos = process.env.PROVA_FOTOS || null;
  const foto = async (page, arquivo) => { if (fotos) await page.screenshot({ path: path.join(fotos, arquivo), fullPage: true }); };

  async function abrir(caso, altura = 900) {
    const ctx = await navegador.newContext({ viewport: { width: 390, height: altura } });
    const page = await ctx.newPage();
    page.on('pageerror', (e) => erros.push(e.message));
    page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) erros.push(m.text()); });
    await page.goto(`${base}/scripts/provas/selo-do-sorteio.html?caso=${caso}`, { waitUntil: 'domcontentloaded' });
    return page;
  }
  const concluir = async (page) => {
    await page.locator('.smaq .lever').waitFor();
    await page.waitForTimeout(300);
    await page.locator('.smaq .lever').click();
    await page.waitForTimeout(300);
    await page.locator('.smaq .saltar button').click();
    await page.waitForFunction(() => document.querySelector('.smaq .compartilhar')?.classList.contains('on'), null, { timeout: 8000 });
  };

  // ── sorteado e ajustado: a roleta gira o original, o fim conta o ajuste ───────────────────────────────────────────────────────────
  {
    const page = await abrir('ajustado');
    await page.locator('.smaq .lever').waitFor();
    t('antes de terminar, nada do ajuste aparece (é o momento da roleta)', (await page.locator('[data-fim-do-sorteio]').count()) === 0);
    await concluir(page);
    const naMaquina = await page.evaluate(() => [...document.querySelectorAll('.smaq .grupo')].map((g) => [...g.querySelectorAll('.mmold .nm')].map((n) => n.textContent)));
    t('a máquina mostra o ORIGINAL (Gonçalo no Ouro, Rafa na reserva)', JSON.stringify(naMaquina) === JSON.stringify([['Magrão', 'Gonçalo', 'Tiago'], ['Canhotinha', 'Zé', 'Roberto']]), JSON.stringify(naMaquina));
    await page.waitForTimeout(4500); // a sequência do fim inteira entra
    const fim = page.locator('[data-fim-do-sorteio="ajustado"]');
    t('no fim entra o passo do ajuste', (await fim.count()) === 1);
    t('o título diz de quem é o ajuste (nome inteiro)', (await page.locator('[data-passo-do-ajuste]').innerText()).trim().toLowerCase() === 'ajuste de chavo, el matador', await page.locator('[data-passo-do-ajuste]').innerText());
    const trocas = await page.locator('[data-fim-do-sorteio] [data-trocas] li').allInnerTexts();
    t('cada troca numa linha', trocas.length === 2 && /Rafa saiu da reserva para o Ouro/.test(trocas[0]) && /Gonçalo saiu do Ouro para o Roxo/.test(trocas[1]), JSON.stringify(trocas));
    const trocou = await page.locator('[data-fim-do-sorteio] [data-cartao-jogador="trocou"]').allInnerTexts();
    t('nos times finais, quem trocou vem em destaque (e só eles)', JSON.stringify(trocou.map((x) => x.trim()).sort()) === JSON.stringify(['Gonçalo', 'Rafa']), JSON.stringify(trocou));
    const selo = page.locator('[data-fim-do-sorteio] [data-selo-do-sorteio="ajustado"]');
    t('o selo roxo fecha o passo: SORTEADO E AJUSTADO POR CHAVO, EL MATADOR', (await selo.innerText()).trim() === 'SORTEADO E AJUSTADO POR CHAVO, EL MATADOR', await selo.innerText());
    const cabe = await page.evaluate(() => { const el = document.querySelector('[data-fim-do-sorteio] [data-selo-do-sorteio] > div'); return el.scrollWidth <= el.clientWidth + 1; });
    t('o nome cabe inteiro no selo (quebra linha, não corta)', cabe);
    const botoes = await page.locator('.compartilhar__time').allInnerTexts();
    t('o compartilhar é dos times FINAIS (os mesmos dois times)', botoes.length === 2, JSON.stringify(botoes));
    await foto(page, 'selo-ajustado.png');
    await page.context().close();
  }

  // ── sorteado (ninguém mexeu): só o selo ouro ──────────────────────────────────────────────────────────────────────────────────────
  {
    const page = await abrir('sorteado');
    await concluir(page);
    await page.waitForTimeout(600);
    t('sorteado: entra só o selo ouro, sem passo de ajuste', (await page.locator('[data-fim-do-sorteio="sorteado"] [data-selo-do-sorteio="sorteado"]').count()) === 1 && (await page.locator('[data-passo-do-ajuste]').count()) === 0);
    t('o selo diz SORTEADO', (await page.locator('[data-selo-do-sorteio="sorteado"] > div').first().innerText()).trim() === 'SORTEADO');
    await foto(page, 'selo-sorteado.png');
    await page.context().close();
  }

  // ── montado à mão: apresentação, sem roleta ───────────────────────────────────────────────────────────────────────────────────────
  {
    const page = await abrir('mao', 1100);
    await page.locator('[data-apresentacao-dos-times]').waitFor();
    t('à mão: não há máquina nem roleta', (await page.locator('.smaq').count()) === 0);
    t('à mão: abre como anúncio de escalação', /ESCALAÇÃO/.test(await page.locator('[data-apresentacao-dos-times] header').innerText()));
    const cedo = await page.evaluate(() => getComputedStyle(document.querySelectorAll('[data-apresentacao-dos-times] [data-cartao-jogador]')[5]).opacity);
    t('os cartões entram um a um (o 6º ainda não entrou logo no começo)', Number(cedo) < 0.5, cedo);
    await page.waitForTimeout(5200);
    const nomes = await page.locator('[data-apresentacao-dos-times] [data-cartao-jogador]').allInnerTexts();
    t('time a time, cartão a cartão: todos os jogadores, reserva no fim', JSON.stringify(nomes.map((n) => n.trim())) === JSON.stringify(['Magrão', 'Gonçalo', 'Tiago', 'Canhotinha', 'Zé', 'Roberto', 'Rafa']), JSON.stringify(nomes));
    const tarde = await page.evaluate(() => [...document.querySelectorAll('[data-apresentacao-dos-times] [data-cartao-jogador]')].every((c) => getComputedStyle(c).opacity === '1'));
    t('no fim, todos visíveis', tarde);
    t('o selo prata: MONTADO À MÃO POR CHAVO', (await page.locator('[data-apresentacao-dos-times] [data-selo-do-sorteio="manual"] > div').first().innerText()).trim() === 'MONTADO À MÃO POR CHAVO');
    t('dá para compartilhar (cartaz e 9:16 de cada time)', (await page.getByRole('button', { name: /Compartilhar os times/ }).count()) === 1 && (await page.getByRole('button', { name: /9:16 · Time/ }).count()) === 2);
    await foto(page, 'selo-a-mao.png');
    await page.getByRole('button', { name: 'Ver de novo' }).click();
    await page.waitForTimeout(150);
    const deNovo = await page.evaluate(() => getComputedStyle(document.querySelectorAll('[data-apresentacao-dos-times] [data-cartao-jogador]')[5]).opacity);
    t('"Ver de novo" recomeça a apresentação', Number(deNovo) < 0.5, deNovo);
    await page.getByRole('button', { name: 'Sair para a página do jogo' }).click();
    t('o X sai da apresentação', await page.evaluate(() => window.__saiu === true));
    await page.context().close();
  }

  // ── a lista dos times (tela do jogo, link público) ────────────────────────────────────────────────────────────────────────────────
  {
    const page = await abrir('lista', 1400);
    await page.locator('[data-lista="manual"] [data-selo-do-sorteio]').waitFor();
    const texto = async (c) => (await page.locator(`[data-lista="${c}"] [data-selo-do-sorteio] > div`).first().innerText()).trim();
    t('lista · sorteado: SORTEADO', (await texto('sorteado')) === 'SORTEADO', await texto('sorteado'));
    t('lista · ajustado: SORTEADO E AJUSTADO POR …, com as trocas', (await texto('ajustado')) === 'SORTEADO E AJUSTADO POR CHAVO, EL MATADOR' && (await page.locator('[data-lista="ajustado"] [data-trocas] li').count()) === 2, await texto('ajustado'));
    t('lista · à mão: MONTADO À MÃO POR CHAVO', (await texto('manual')) === 'MONTADO À MÃO POR CHAVO', await texto('manual'));
    await foto(page, 'selo-lista.png');
    await page.context().close();
  }

  // ── os cartões compartilháveis levam o selo ───────────────────────────────────────────────────────────────────────────────────────
  {
    const page = await abrir('cartao');
    await page.waitForFunction(() => window.__cartoes, null, { timeout: 30000 });
    const c = await page.evaluate(() => window.__cartoes);
    t('os cartões foram gerados (cartaz do ajustado e 9:16 do montado à mão)', !c.erro && /^data:image\/png/.test(c.cartaz) && /^data:image\/png/.test(c.mao916), c.erro || '');
    const medidas = await page.evaluate(async (urls) => Promise.all(urls.map((u) => new Promise((r) => { const i = new Image(); i.onload = () => r([i.width, i.height]); i.src = u; }))), [c.cartaz, c.mao916]);
    t('os dois em 1080×1920', JSON.stringify(medidas) === JSON.stringify([[1080, 1920], [1080, 1920]]), JSON.stringify(medidas));
    if (fotos && !c.erro) {
      const fs = await import('node:fs');
      fs.writeFileSync(path.join(fotos, 'cartaz-ajustado.png'), Buffer.from(c.cartaz.split(',')[1], 'base64'));
      fs.writeFileSync(path.join(fotos, 'cartao916-a-mao.png'), Buffer.from(c.mao916.split(',')[1], 'base64'));
    }
    await page.context().close();
  }

  t('console sem erros', erros.length === 0, erros.join(' | '));
}
