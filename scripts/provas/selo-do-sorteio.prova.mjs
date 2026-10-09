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

  t('console sem erros', erros.length === 0, erros.join(' | '));
}
