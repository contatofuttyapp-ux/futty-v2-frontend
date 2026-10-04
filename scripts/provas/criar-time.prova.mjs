// Prova no navegador (Rodada 29I, achados 78, 79, 80, 81, 82): o wizard "Criar time" — o Voltar do sistema recua um passo por vez, do passo 1
// pergunta antes de sair, depois de criar sai direto; o contador é 3/3; o botão apagado diz o que falta; o artilheiro depende dos gols.
export const nome = 'Criar time (histórico dos passos, 3/3, gols × artilheiro)';

export async function rodar({ navegador, base, t }) {
  const erros = [];

  async function nova() {
    const ctx = await navegador.newContext({ viewport: { width: 390, height: 800 } });
    const page = await ctx.newPage();
    page.on('pageerror', (e) => erros.push(e.message));
    page.on('console', (m) => { if (m.type() === 'error') erros.push(m.text()); });
    await page.route('**/api/**', async (route) => {
      const req = route.request();
      const u = new URL(req.url());
      if (u.pathname === '/api/teams' && req.method() === 'POST') {
        return route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ team: { id: 't1', slug: 'time-teste', nome: 'Time Teste' }, joga: true }) });
      }
      return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    });
    await page.goto(`${base}/scripts/provas/criar-time.html`, { waitUntil: 'domcontentloaded' });
    await page.locator('[data-casa]').waitFor();
    return page;
  }
  const texto = (page) => page.locator('body').innerText();
  const progresso = async (page) => (await page.locator('[data-progresso]').innerText().catch(() => '')).trim();
  const esperar = (page, ms = 250) => page.waitForTimeout(ms);
  const caminho = (page) => new URL(page.url()).pathname;
  const campoNome = (page) => page.locator('input[placeholder="ex.: Domingueira FC"]');
  const entrar = async (page) => {
    await page.locator('[data-ir]').click();
    await page.locator('[data-progresso]').waitFor();
    await esperar(page);
  };

  // ── 1. Passo a passo, indo e voltando pelo Voltar do sistema ─────────────────────────────────────────────────────────────────────
  {
    const page = await nova();
    await entrar(page);
    t('abre no passo 1/3', (await progresso(page)) === '1/3', await progresso(page));
    t('o contador é x/3, nunca x/4 (achado 79)', !/\/4/.test(await texto(page)));
    const continuar = page.getByRole('button', { name: 'Continuar' });
    t('"Continuar" apagado sem nome', await continuar.isDisabled());
    const cursor = await continuar.evaluate((el) => getComputedStyle(el).cursor);
    t('cursor not-allowed no "Continuar" apagado (achado 82)', cursor === 'not-allowed', cursor);
    t('diz o que falta: "Falta o nome do time."', /Falta o nome do time\./.test(await texto(page)));
    t('"Nome do time" e "Cidade" estão marcados como obrigatórios', /NOME DO TIME \(OBRIGATÓRIO\)/i.test(await texto(page)) && /CIDADE \(OBRIGATÓRIA EM TIME ABERTO\)/i.test(await texto(page)));
    t('o bairro apagado diz "Escolha a cidade primeiro" (achado 77)', (await page.locator('[data-campo-bairro]').getAttribute('placeholder')) === 'Escolha a cidade primeiro');

    await campoNome(page).fill('Domingueira FC');
    t('com nome, a linha "Falta" some', !/Falta o nome do time\./.test(await texto(page)));
    await continuar.click(); await esperar(page);
    t('Continuar leva ao passo 2/3', (await progresso(page)) === '2/3', await progresso(page));
    await page.getByRole('button', { name: 'Continuar' }).click(); await esperar(page);
    t('e ao 3/3, o último (tem o botão CRIAR O TIME)', (await progresso(page)) === '3/3' && (await page.getByRole('button', { name: 'Criar o time' }).count()) === 1, await progresso(page));

    await page.goBack(); await esperar(page);
    t('Voltar do sistema no passo 3 recua para o 2 (não vai ao Início) — achado 80', (await progresso(page)) === '2/3' && caminho(page) === '/criar-time', `${await progresso(page)} ${caminho(page)}`);
    await page.goBack(); await esperar(page);
    t('Voltar de novo: passo 1, com o nome preenchido (nada se perdeu)', (await progresso(page)) === '1/3' && (await campoNome(page).inputValue()) === 'Domingueira FC');
    await page.goForward(); await esperar(page);
    t('Avançar do sistema volta ao passo 2', (await progresso(page)) === '2/3');
    await page.goBack(); await esperar(page);

    await page.goBack(); await esperar(page);
    t('Voltar do passo 1 PERGUNTA antes de sair', (await page.locator('[data-sair-da-criacao]').count()) === 1 && /Sair da criação\? Você perde o que preencheu\./.test(await texto(page)));
    t('e continua na criação (não saiu ainda)', caminho(page) === '/criar-time');
    await page.getByRole('button', { name: 'Continuar criando' }).click(); await esperar(page);
    t('"Continuar criando": a pergunta some e o passo 1 segue com o nome', (await page.locator('[data-sair-da-criacao]').count()) === 0 && (await progresso(page)) === '1/3' && (await campoNome(page).inputValue()) === 'Domingueira FC');
    await page.goBack(); await esperar(page);
    t('Voltar pergunta de novo', (await page.locator('[data-sair-da-criacao]').count()) === 1);
    await page.getByRole('button', { name: 'Sair' }).click(); await esperar(page, 400);
    t('"Sair": volta para a tela de antes', (await page.locator('[data-casa]').count()) === 1, caminho(page));
    await page.context().close();
  }

  // ── 2. Nada preenchido: Voltar sai direto, sem perguntar ───────────────────────────────────────────────────────────────────────
  {
    const page = await nova();
    await entrar(page);
    await page.goBack(); await esperar(page, 400);
    t('sem nada preenchido, o Voltar sai direto', (await page.locator('[data-casa]').count()) === 1 && (await page.locator('[data-sair-da-criacao]').count()) === 0, caminho(page));
    await page.context().close();
  }

  // ── 3. O chevron do topo faz o mesmo que o Voltar do sistema ───────────────────────────────────────────────────────────────────
  {
    const page = await nova();
    await entrar(page);
    await campoNome(page).fill('Meu Time');
    await page.getByRole('button', { name: 'Continuar' }).click(); await esperar(page);
    await page.getByRole('button', { name: '← voltar' }).click(); await esperar(page);
    t('"← voltar" da tela recua um passo e preserva o estado', (await progresso(page)) === '1/3' && (await campoNome(page).inputValue()) === 'Meu Time');
    await page.getByRole('button', { name: 'Voltar' }).first().click(); await esperar(page);
    t('o chevron do topo, no passo 1, pergunta antes de sair', (await page.locator('[data-sair-da-criacao]').count()) === 1);
    await page.context().close();
  }

  // ── 4. Gols, artilheiro e destaque (29O: tudo nasce desligado; ligar o artilheiro liga os gols; desligar os gols desliga o artilheiro) ──
  {
    const page = await nova();
    await entrar(page);
    await campoNome(page).fill('Gols FC');
    await page.getByRole('button', { name: 'Continuar' }).click(); await esperar(page);
    const gols = page.getByRole('button', { name: 'Gols de cada um' });
    const art = page.getByRole('button', { name: 'Artilheiro do dia' });
    const dest = page.getByRole('button', { name: 'Destaque do dia' });
    t('gols, artilheiro e destaque têm nome para leitor de tela (achado 81)', (await gols.count()) === 1 && (await art.count()) === 1 && (await dest.count()) === 1);
    t('os três nascem desligados (29O)', (await gols.getAttribute('aria-pressed')) === 'false' && (await art.getAttribute('aria-pressed')) === 'false' && (await dest.getAttribute('aria-pressed')) === 'false');
    const corpo = await texto(page);
    t('cada um diz o que faz, com a frase fixa', /Registra quantos gols cada jogador marcou\./.test(corpo) && /Quem fez mais gols no jogo ganha o troféu\./.test(corpo) && /O jogador que fez a diferença em campo, escolhido por você\./.test(corpo));
    t('sai o jargão: sem "Como funciona", "radar" nem "MVP"', !/Como funciona o seu time|radar|MVP/i.test(corpo));
    t('o título do passo 2 fica só para leitor de tela (1px, fora da tela)', await page.getByRole('heading', { name: 'Passo 2 de 3' }).evaluate((el) => el.getBoundingClientRect().width <= 1));
    t('o artilheiro nunca fica apagado (sem "Precisa dos gols ligados.")', !(await art.isDisabled()) && !/Precisa dos gols ligados\./.test(corpo));
    await art.click();
    t('ligar o artilheiro liga os gols junto', (await art.getAttribute('aria-pressed')) === 'true' && (await gols.getAttribute('aria-pressed')) === 'true');
    await gols.click();
    t('desligar os gols desliga o artilheiro junto (achado 78)', (await gols.getAttribute('aria-pressed')) === 'false' && (await art.getAttribute('aria-pressed')) === 'false');
    await gols.click();
    t('religar os gols NÃO religa o artilheiro', (await gols.getAttribute('aria-pressed')) === 'true' && (await art.getAttribute('aria-pressed')) === 'false');
    await dest.click();
    t('o destaque liga sozinho, sem mexer nos gols', (await dest.getAttribute('aria-pressed')) === 'true' && (await gols.getAttribute('aria-pressed')) === 'true');
    await page.context().close();
  }

  // ── 5. Criar: o corpo do POST é coerente; depois de criar, "Pronto" e o Voltar sai direto ───────────────────────────────────────
  {
    const page = await nova();
    const corpos = [];
    await page.route('**/api/teams', async (route) => {
      if (route.request().method() === 'POST') corpos.push(JSON.parse(route.request().postData() || '{}'));
      return route.fallback();
    });
    await entrar(page);
    await campoNome(page).fill('Criado FC');
    await page.getByRole('button', { name: 'Continuar' }).click(); await esperar(page);
    await page.getByRole('button', { name: 'Continuar' }).click(); await esperar(page);
    await page.getByRole('button', { name: /Aberto/ }).click();
    t('time aberto sem cidade: "Criar o time" apagado e diz por quê', (await page.getByRole('button', { name: 'Criar o time' }).isDisabled()) && /Time aberto precisa de cidade/.test(await texto(page)));
    await page.getByRole('button', { name: /Fechado/ }).click();
    await page.getByRole('button', { name: 'Criar o time' }).click();
    await page.locator('text=Chame o seu time').waitFor({ timeout: 5000 });
    await esperar(page);
    t('time criado sem tocar em nada: o POST leva os três desligados (29O)', corpos.length === 1 && corpos[0].mostrar_gols === false && corpos[0].mostrar_artilheiro === false && corpos[0].mostrar_destaque === false, JSON.stringify(corpos));
    t('depois de criar a tela de convites diz "Pronto" (e não "3/4")', (await progresso(page)) === 'Pronto' && !/\/4/.test(await texto(page)), await progresso(page));
    await page.goBack(); await esperar(page, 600);
    t('Voltar depois de criar sai da criação direto (não volta a passo nenhum nem pergunta)', (await page.locator('[data-casa]').count()) === 1 && (await page.locator('[data-sair-da-criacao]').count()) === 0, `${caminho(page)} ${await progresso(page)}`);
    await page.context().close();
  }

  const reais = erros.filter((e) => !/favicon|Failed to load resource/.test(e));
  t('console sem erros', reais.length === 0, reais.slice(0, 3).join(' | '));
}
