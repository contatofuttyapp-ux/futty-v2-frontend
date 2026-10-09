// Prova no navegador (Rodada 30F, item 3): resultado sorteado com 2 convidados → "Montar à mão" só com gente com conta.
// Achado: a tela do jogo passou a mostrar "Convidado Dois" no Time Roxo, enquanto a escalação e o link público (que
// montam a lista do zero) mostravam 6 x 6 sem convidado. O dado gravado estava certo: era a TELA. As listas usavam o
// user_id como key e todo convidado tem null — com chaves repetidas o React reaproveita a linha errada e deixa uma
// velha para trás quando o resultado muda sem a lista remontar (é o que acontece ao salvar e recarregar o jogo).
export const nome = 'Montar à mão depois de um sorteio com convidados (nenhum convidado fantasma na tela do jogo)';

export async function rodar({ navegador, base, t }) {
  const page = await (await navegador.newContext({ viewport: { width: 390, height: 1400 } })).newPage();
  page.setDefaultTimeout(10000);
  const avisosDeChave = [];
  const erros = [];
  page.on('pageerror', (e) => erros.push(e.message));
  page.on('console', (m) => {
    if (/same key/i.test(m.text())) avisosDeChave.push(m.text().slice(0, 120));
    else if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) erros.push(m.text());
  });
  await page.goto(`${base}/scripts/provas/montar-a-mao-troca.html`, { waitUntil: 'domcontentloaded' });
  await page.locator('[data-lista] .sorteio-team').first().waitFor();
  const nomesDaLista = () => page.evaluate(() => [...document.querySelectorAll('[data-lista] .sorteio-team')].map((tm) => [...tm.querySelectorAll('.sorteio-player > span:first-child')].map((s) => s.textContent)));
  const antes = await nomesDaLista();
  // Desde a 30G (item 2) o nome do convidado na lista leva o ponto ("· Convidado Teste"): substring, não igualdade.
  t('antes: o sorteio com os 2 convidados no Time Roxo', antes[1].some((n) => n.includes('Convidado Teste')) && antes[1].some((n) => n.includes('Convidado Dois')), JSON.stringify(antes));
  const golsAntes = await page.evaluate(() => document.querySelector('[data-gols]').textContent);
  t('antes: a lista de gols por jogador mostra os 2 convidados (a verificação de depois vale)', /Convidado Teste/.test(golsAntes) && /Convidado Dois/.test(golsAntes), golsAntes.slice(0, 200));

  // Rodada 30G, item 3: dois convidados com contagens diferentes de gols não se misturam (achado da 30F — os dois
  // caíam no mesmo contador por terem o mesmo user_id vazio). A linha de cada um é a mais funda com o nome dele.
  const linhaDoConvidado = (nome) => page.locator('[data-gols] div').filter({ hasText: nome }).last();
  const contador = (linha) => linha.locator('span').filter({ hasText: /^\d+$/ });
  const maisDoConvidado = (nome) => linhaDoConvidado(nome).getByRole('button', { name: 'Mais' }).click();
  await maisDoConvidado('Convidado Teste');
  await maisDoConvidado('Convidado Teste');
  await maisDoConvidado('Convidado Dois');
  const depoisDosCliques = [await contador(linhaDoConvidado('Convidado Teste')).innerText(), await contador(linhaDoConvidado('Convidado Dois')).innerText()];
  t('Convidado Teste está em 2 e Convidado Dois em 1 — cada um com o próprio contador', depoisDosCliques[0] === '2' && depoisDosCliques[1] === '1', JSON.stringify(depoisDosCliques));
  await linhaDoConvidado('Convidado Dois').getByRole('button', { name: 'Menos' }).click();
  const depoisDeZerar = [await contador(linhaDoConvidado('Convidado Teste')).innerText(), await contador(linhaDoConvidado('Convidado Dois')).innerText()];
  t('zerar o Convidado Dois não encosta no Convidado Teste (contadores independentes, não um só por "sem id")', depoisDeZerar[0] === '2' && depoisDeZerar[1] === '0', JSON.stringify(depoisDeZerar));

  await page.locator('[data-salvar-a-mao]').click();
  await page.waitForTimeout(200);
  const depois = await nomesDaLista();
  t('depois de montar à mão: a lista da tela do jogo é 6 x 6, sem convidado nenhum', JSON.stringify(depois) === JSON.stringify([[1, 2, 3, 4, 5, 6].map((n) => `Jogador ${n}`), [7, 8, 9, 10, 11, 12].map((n) => `Jogador ${n}`)]), JSON.stringify(depois));
  const gols = await page.evaluate(() => document.querySelector('[data-gols]').textContent);
  t('a lista de gols por jogador também não tem convidado fantasma', !/Convidado/.test(gols), gols.slice(0, 200));
  t('nenhum aviso de chave repetida no React', avisosDeChave.length === 0, avisosDeChave.join(' | '));
  t('console sem erros', erros.length === 0, erros.join(' | '));
  await page.context().close();
}
