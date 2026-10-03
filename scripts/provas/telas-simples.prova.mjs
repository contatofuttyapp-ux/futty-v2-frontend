// Prova no navegador (Rodada 29I, achados 75 e 76): a tela "Algo deu errado" não mostra a linha técnica em inglês (só a frase da casa; o erro
// fica no console), e a landing tem o rodapé com Termos de Uso, Privacidade e o aviso de 18+.
export const nome = 'Telas simples (erro sem linha técnica, rodapé legal da landing)';

export async function rodar({ navegador, base, t }) {
  // ── "Algo deu errado" ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
  {
    const page = await (await navegador.newContext({ viewport: { width: 390, height: 800 } })).newPage();
    const consoleErros = [];
    page.on('console', (m) => { if (m.type() === 'error') consoleErros.push(m.text()); });
    page.on('pageerror', () => {});
    await page.goto(`${base}/scripts/provas/telas-simples.html`, { waitUntil: 'domcontentloaded' });
    await page.locator('h1').waitFor();
    const texto = await page.locator('body').innerText();
    t('a tela diz "Algo deu errado" e a frase da casa', /Algo deu errado/.test(texto) && /O servidor está descansando\. Tente de novo daqui a pouco\./.test(texto), texto);
    t('NÃO mostra a linha técnica ("Failed to fetch dynamically imported module…")', !/Failed to fetch|dynamically imported|LandingPage-|\.js/.test(texto), texto);
    t('o erro técnico continua no console (para quem for investigar)', consoleErros.some((e) => /Failed to fetch dynamically imported module/.test(e)), consoleErros.slice(0, 2).join(' | '));
    t('tem como tentar de novo e voltar ao início', (await page.getByRole('button', { name: 'Tentar novamente' }).count()) === 1 && (await page.getByRole('button', { name: 'Voltar ao início' }).count()) === 1);
    await page.context().close();
  }

  // ── a landing ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  {
    const page = await (await navegador.newContext({ viewport: { width: 390, height: 800 } })).newPage();
    const erros = [];
    page.on('pageerror', (e) => erros.push(e.message));
    await page.goto(`${base}/scripts/provas/telas-simples.html`, { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => { window.history.pushState({}, '', '/landing'); window.dispatchEvent(new PopStateEvent('popstate')); });
    await page.locator('[data-rodape-legal]').waitFor({ timeout: 8000 });
    const rodape = page.locator('[data-rodape-legal]');
    const texto = await rodape.innerText();
    t('o rodapé diz "Termos de Uso · Privacidade"', /Termos de Uso\s*·\s*Privacidade/.test(texto), texto);
    t('e "Para maiores de 18 anos."', /Para maiores de 18 anos\./.test(texto), texto);
    const termos = rodape.getByRole('link', { name: 'Termos de Uso' });
    const priv = rodape.getByRole('link', { name: 'Privacidade' });
    t('os dois são links de verdade (/termos e /privacidade)', (await termos.getAttribute('href')) === '/termos' && (await priv.getAttribute('href')) === '/privacidade');
    const caixa = await rodape.boundingBox();
    t('o rodapé fica visível no celular, sem rolar até o fim da página', !!caixa && caixa.y + caixa.height <= 800 + 400, JSON.stringify(caixa));
    const discreto = await rodape.evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
    t('é discreto: letra pequena (12 px)', discreto <= 12, String(discreto));
    await priv.click();
    await page.waitForTimeout(200);
    t('tocar em Privacidade abre a página (sem conta)', (await page.locator('[data-onde]').innerText()) === '/privacidade');
    t('a landing carrega sem exceção', erros.length === 0, erros.slice(0, 2).join(' | '));
    await page.context().close();
  }
}
