// Prova no navegador (Rodada 30F, item 2): "Ajustar times" com dois convidados sem app. Antes, a tela mostrava
// "Convidado Dois" duas vezes e sumia com "Convidado Teste" (key = user_id = null), e arrastar um convidado não movia
// ninguém. Aqui: os dois aparecem uma vez cada, arrastar um convidado e um jogador com conta funciona (arrasto HTML5 de
// verdade), e o que vai para o motor tem os dois convidados, cada um no seu lugar, sem a chave interna do editor.
export const nome = 'Ajustar times com convidados sem app (nada duplica, nada some, convidado se move)';

export async function rodar({ navegador, base, t }) {
  const page = await (await navegador.newContext({ viewport: { width: 390, height: 900 } })).newPage();
  page.setDefaultTimeout(10000); // um arrasto que não termina vira erro, não trava a prova
  const erros = [];
  page.on('pageerror', (e) => erros.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) erros.push(m.text()); });
  let corpo = null;
  const origem = new URL(base).host;
  await page.route('**/*', (route) => {
    const u = new URL(route.request().url());
    if (u.pathname === '/api/games/g1/times') {
      corpo = JSON.parse(route.request().postData() || '{}');
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ times_resultado: corpo.times_resultado }) });
    }
    if (u.host === origem) return route.continue();
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });
  await page.goto(`${base}/scripts/provas/editor-de-times.html`, { waitUntil: 'domcontentloaded' });
  await page.locator('.sorteio-team').first().waitFor();

  const naTela = () => page.evaluate(() => {
    const zonas = [...document.querySelectorAll('.te-zone')];
    return zonas.map((z) => [...z.querySelectorAll('[data-jogador-editor]')].map((el) => el.textContent.replace(/[⠿]|GOL|\bC\b/g, '').replace(/\d+(,\d+)?$/, '').trim()));
  });
  t('ao abrir: cada convidado aparece uma vez, no seu time (antes: "Convidado Dois" duas vezes)', JSON.stringify(await naTela()) === JSON.stringify([['Magrão', 'Convidado Teste'], ['Zé', 'Convidado Dois'], []]), JSON.stringify(await naTela()));

  const alca = (chave) => page.locator(`[data-jogador-editor="${chave}"] span[draggable="true"]`);
  const zonaDoTime = (i) => page.locator('.sorteio-team.te-zone').nth(i);
  // Arrasto HTML5: os mesmos eventos que o navegador dispara (dragstart → dragover → drop → dragend), com um DataTransfer
  // de verdade. O dragTo do Playwright não termina com este editor (alça de 16 px com touch-action: none).
  const arrastar = async (origem, destino) => {
    const dt = await page.evaluateHandle(() => new DataTransfer());
    await origem.dispatchEvent('dragstart', { dataTransfer: dt });
    await destino.dispatchEvent('dragover', { dataTransfer: dt });
    await destino.dispatchEvent('drop', { dataTransfer: dt });
    await origem.dispatchEvent('dragend', { dataTransfer: dt }).catch(() => {});
  };
  await arrastar(alca('convidado:t0:1'), zonaDoTime(1));
  await page.waitForTimeout(150);
  t('arrastar "Convidado Teste" para o Time B: ele vai, o "Convidado Dois" fica', JSON.stringify(await naTela()) === JSON.stringify([['Magrão'], ['Zé', 'Convidado Dois', 'Convidado Teste'], []]), JSON.stringify(await naTela()));

  await arrastar(alca('u:u1'), page.locator('.te-zone:not(.sorteio-team)'));
  await page.waitForTimeout(150);
  await arrastar(alca('convidado:t1:1'), zonaDoTime(0));
  await page.waitForTimeout(150);
  t('arrastar um jogador com conta para a reserva e o outro convidado para o Time A: nada duplica, nada some', JSON.stringify(await naTela()) === JSON.stringify([['Convidado Dois'], ['Zé', 'Convidado Teste'], ['Magrão']]), JSON.stringify(await naTela()));

  await page.getByRole('button', { name: 'Salvar ajustes' }).click();
  await page.waitForFunction(() => window.__salvo, null, { timeout: 5000 });
  const tr = corpo?.times_resultado;
  const nomes = tr ? [...tr.times.map((x) => x.jogadores.map((p) => p.nome)), tr.reservas.map((p) => p.nome)] : null;
  t('o que vai para o motor: os dois convidados, cada um no seu lugar', JSON.stringify(nomes) === JSON.stringify([['Convidado Dois'], ['Zé', 'Convidado Teste'], ['Magrão']]), JSON.stringify(nomes));
  t('a chave interna do editor não vai para o motor', !JSON.stringify(corpo).includes('_chave'));
  t('os convidados continuam marcados como convidados (sem conta)', tr.times.flat ? [...tr.times.flatMap((x) => x.jogadores)].filter((p) => !p.user_id).every((p) => p.convidado === true) : false);
  t('console sem erros', erros.length === 0, erros.join(' | '));
  await page.context().close();
}
