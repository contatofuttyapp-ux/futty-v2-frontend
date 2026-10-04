// Prova no navegador (Rodada 29I, achados 78, 79, 80, 81, 82; 29O; 29P): o wizard "Criar time" — o Voltar do sistema recua um passo por vez,
// do passo 1 pergunta antes de sair, depois de criar sai direto; o contador é 3/3; o Continuar do passo 1 só aparece com nome E cidade
// (da lista, ou texto livre quando a lista não sugere nada); a lixeira tira o logo; o artilheiro depende dos gols; o passo 4 é a festa
// (a máquina com o nome, "Seu time está no ar!") e "Ir para o time" não reabre boas-vindas.
// 29Q: a festa chega com o link do convite PRONTO (gerado sozinho, uma vez); o botão "Gerar link do convite" só volta se a geração falhar.
export const nome = 'Criar time (histórico dos passos, 3/3, cidade obrigatória, lixeira, gols × artilheiro, a festa, link do convite pronto)';

// Um PNG de 1×1 (o motor é interceptado: só a prévia e a lixeira interessam aqui).
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64');

export async function rodar({ navegador, base, t }) {
  const erros = [];

  // `convite`: 'ok' responde o token e o código; 'falha-e-depois-ok' falha o 1º pedido (o automático) e atende o do botão de reserva.
  // `pedidosConvite` recebe um item por POST de convite que chegou ao motor de mentira.
  async function nova({ convite = 'ok', pedidosConvite = [] } = {}) {
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
      if (u.pathname === '/api/teams/time-teste/convite' && req.method() === 'POST') {
        pedidosConvite.push(Date.now());
        if (convite === 'falha-e-depois-ok' && pedidosConvite.length === 1) {
          return route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'Não deu para gerar o link agora.' }) });
        }
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ token: 'tok-123', codigo: 'ABC123' }) });
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
  const campoCidade = (page) => page.getByPlaceholder('Ex: Brasília');
  const continuar = (page) => page.getByRole('button', { name: 'Continuar' });
  const entrar = async (page) => {
    await page.locator('[data-ir]').click();
    await page.locator('[data-progresso]').waitFor();
    await esperar(page);
  };
  // A cidade da lista: digita e escolhe a sugestão (a lista pública /dados/cidades.json desce do próprio Vite).
  const escolherCidade = async (page, digitar, opcao) => {
    await campoCidade(page).click();
    await campoCidade(page).fill(digitar);
    await page.locator('[data-sugestoes-cidade] button', { hasText: opcao }).first().click({ timeout: 15000 });
    await esperar(page);
  };
  // Cidade fora da lista (sem sugestão): o texto vale.
  const cidadeLivre = async (page, nomeCidade) => {
    await campoCidade(page).click();
    await campoCidade(page).fill(nomeCidade);
    await esperar(page, 400);
  };
  const passo1Pronto = async (page, nomeTime = 'Domingueira FC') => {
    await campoNome(page).fill(nomeTime);
    await cidadeLivre(page, 'Kyoto');
  };

  // ── 1. Passo 1 (29P): sem título; Continuar só com nome E cidade; a cidade da lista; e os passos pelo Voltar do sistema ───────────
  {
    const page = await nova();
    await entrar(page);
    t('abre no passo 1/3', (await progresso(page)) === '1/3', await progresso(page));
    t('o contador é x/3, nunca x/4 (achado 79)', !/\/4/.test(await texto(page)));
    const corpo = await texto(page);
    t('sem título nem subtítulo na tela ("Dê nome ao seu time" saiu); o h1 fica só para leitor de tela', !/Dê nome ao seu time|O escudo nasce das iniciais/.test(corpo) && (await page.getByRole('heading', { name: 'Passo 1 de 3' }).evaluate((el) => el.getBoundingClientRect().width <= 1)));
    t('rótulos limpos: "Nome do time", "Cidade", "Bairro (opcional)", "Logo do time (opcional)" — nenhum "(obrigatório)"', /NOME DO TIME/i.test(corpo) && /\bCIDADE\b/i.test(corpo) && /BAIRRO \(OPCIONAL\)/i.test(corpo) && /LOGO DO TIME \(OPCIONAL\)/i.test(corpo) && !/obrigatóri/i.test(corpo));
    t('sem textos de apoio embaixo dos campos', !/nunca o endereço|Só a cidade|até 2 MB/.test(corpo));
    t('sem nome: o Continuar NEM aparece (e nada de "Falta o nome do time.")', (await continuar(page).count()) === 0 && !/Falta o nome do time\./.test(corpo));
    t('o bairro apagado diz "Escolha a cidade primeiro" (achado 77)', (await page.locator('[data-campo-bairro]').getAttribute('placeholder')) === 'Escolha a cidade primeiro');

    await campoNome(page).fill('Domingueira FC');
    await esperar(page);
    t('com nome mas sem cidade: ainda sem Continuar (cidade obrigatória, 29P)', (await continuar(page).count()) === 0);
    await campoCidade(page).click();
    await campoCidade(page).fill('Bras');
    await page.locator('[data-sugestoes-cidade] button').first().waitFor({ timeout: 15000 });
    await esperar(page);
    t('"Bras" tem sugestões na lista: a pessoa escolhe uma — o Continuar ainda não aparece', (await continuar(page).count()) === 0);
    await page.locator('[data-sugestoes-cidade] button', { hasText: 'Brasília, DF' }).first().click();
    await esperar(page);
    t('escolhida "Brasília, DF": o Continuar aparece', (await continuar(page).count()) === 1 && (await campoCidade(page).inputValue()) === 'Brasília, DF');
    t('o escudo das iniciais fica ("DF" de Domingueira FC)', (await page.locator('[data-escudo-iniciais]').innerText()).trim() === 'DF');

    await continuar(page).click(); await esperar(page);
    t('Continuar leva ao passo 2/3', (await progresso(page)) === '2/3', await progresso(page));
    await continuar(page).click(); await esperar(page);
    t('e ao 3/3, o último (tem o botão CRIAR O TIME)', (await progresso(page)) === '3/3' && (await page.getByRole('button', { name: 'Criar o time' }).count()) === 1, await progresso(page));

    await page.goBack(); await esperar(page);
    t('Voltar do sistema no passo 3 recua para o 2 (não vai ao Início) — achado 80', (await progresso(page)) === '2/3' && caminho(page) === '/criar-time', `${await progresso(page)} ${caminho(page)}`);
    await page.goBack(); await esperar(page);
    t('Voltar de novo: passo 1, com o nome e a cidade preenchidos (nada se perdeu)', (await progresso(page)) === '1/3' && (await campoNome(page).inputValue()) === 'Domingueira FC' && (await campoCidade(page).inputValue()) === 'Brasília, DF');
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

  // ── 3. Cidade fora da lista (sem sugestão): o texto vale — e uma letra só não ──────────────────────────────────────────────────
  {
    const page = await nova();
    await entrar(page);
    await campoNome(page).fill('Time de Kyoto');
    await cidadeLivre(page, 'K');
    t('uma letra só não é cidade: sem Continuar', (await continuar(page).count()) === 0);
    await cidadeLivre(page, 'Kyoto');
    t('"Kyoto" não tem sugestão na lista (fora do Brasil e de Portugal): o texto vale e o Continuar aparece', (await continuar(page).count()) === 1);
    await campoCidade(page).fill('');
    await esperar(page, 300);
    t('apagar a cidade some com o Continuar', (await continuar(page).count()) === 0);
    await page.context().close();
  }

  // ── 4. O chevron do topo faz o mesmo que o Voltar do sistema ───────────────────────────────────────────────────────────────────
  {
    const page = await nova();
    await entrar(page);
    await passo1Pronto(page, 'Meu Time');
    await continuar(page).click(); await esperar(page);
    await page.getByRole('button', { name: '← voltar' }).click(); await esperar(page);
    t('"← voltar" da tela recua um passo e preserva o estado', (await progresso(page)) === '1/3' && (await campoNome(page).inputValue()) === 'Meu Time' && (await campoCidade(page).inputValue()) === 'Kyoto');
    await page.getByRole('button', { name: 'Voltar' }).first().click(); await esperar(page);
    t('o chevron do topo, no passo 1, pergunta antes de sair', (await page.locator('[data-sair-da-criacao]').count()) === 1);
    await page.context().close();
  }

  // ── 5. O logo: a prévia, e a lixeira que tira o logo (29P) ─────────────────────────────────────────────────────────────────────
  {
    const page = await nova();
    await entrar(page);
    await campoNome(page).fill('Logo FC');
    await page.locator('input[type="file"]').setInputFiles({ name: 'logo.png', mimeType: 'image/png', buffer: PNG });
    await page.locator('img[alt="Prévia do logo do time"]').waitFor({ timeout: 8000 });
    const lixeira = page.getByRole('button', { name: 'Tirar logo' });
    t('com logo: "Trocar logo" e a LIXEIRA (ícone, com nome "Tirar logo" para leitor de tela); sem o chip "Tirar"', (await page.getByRole('button', { name: 'Trocar logo' }).count()) === 1 && (await lixeira.count()) === 1 && (await lixeira.locator('svg').count()) === 1 && !/\bTirar\b/.test(await texto(page)));
    await lixeira.click(); await esperar(page);
    t('a lixeira tira o logo: a prévia some, o escudo das iniciais volta e o chip diz "Escolher logo"', (await page.locator('img[alt="Prévia do logo do time"]').count()) === 0 && (await page.locator('[data-escudo-iniciais]').count()) === 1 && (await page.getByRole('button', { name: 'Escolher logo' }).count()) === 1 && (await lixeira.count()) === 0);
    await page.context().close();
  }

  // ── 6. Gols, artilheiro e destaque (29O: tudo nasce desligado; ligar o artilheiro liga os gols; desligar os gols desliga o artilheiro) ──
  {
    const page = await nova();
    await entrar(page);
    await passo1Pronto(page, 'Gols FC');
    await continuar(page).click(); await esperar(page);
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

  // ── 7. Passo 3 e a FESTA (29P): o corpo do POST é coerente; a máquina com o nome; "Pronto"; o Voltar sai direto ─────────────────
  {
    const pedidosConvite = [];
    const page = await nova({ pedidosConvite });
    const corpos = [];
    await page.route('**/api/teams', async (route) => {
      if (route.request().method() === 'POST') corpos.push(JSON.parse(route.request().postData() || '{}'));
      return route.fallback();
    });
    await entrar(page);
    await passo1Pronto(page, 'Criado FC');
    await continuar(page).click(); await esperar(page);
    await continuar(page).click(); await esperar(page);
    const t3 = await texto(page);
    t('passo 3 sem o subtítulo "Como se entra no seu time."', /Aceita novos membros\?/.test(t3) && !/Como se entra no seu time/.test(t3));
    t('passo 3: os textos citam o "Radar de peladas", entre aspas', /Quem achar o time no "Radar de peladas" pede para entrar\. Você aceita ou não\./.test(t3) && /Qualquer um que achar o time no "Radar de peladas" entra na hora\./.test(t3) && !/Explorar/.test(t3));
    await page.getByRole('button', { name: /Aberto/ }).click();
    t('time aberto COM cidade (ela é obrigatória agora): "Criar o time" segue aceso, sem "Time aberto precisa de cidade"', !(await page.getByRole('button', { name: 'Criar o time' }).isDisabled()) && !/Time aberto precisa de cidade/.test(await texto(page)));
    await page.getByRole('button', { name: /Fechado/ }).click();
    await page.getByRole('button', { name: 'Criar o time' }).click();
    await page.locator('text=Seu time está no ar!').waitFor({ timeout: 5000 });
    await esperar(page, 400);
    t('time criado sem tocar em nada: o POST leva os três desligados (29O) e a cidade', corpos.length === 1 && corpos[0].mostrar_gols === false && corpos[0].mostrar_artilheiro === false && corpos[0].mostrar_destaque === false && corpos[0].cidade === 'Kyoto', JSON.stringify(corpos));
    const t4 = await texto(page);
    // O letreiro e a cidade vão em CAIXA ALTA pelo CSS; o texto de verdade (textContent) é o que o motor devolveu.
    const letreiro = (await page.locator('[data-festa] .maq .letreiro').textContent()).trim();
    t('a festa: a máquina deitada (sem logo) com o nome do time (o que o motor devolveu) como letreiro', (await page.locator('[data-festa] .maq').count()) === 1 && (await page.locator('[data-festa] .maq.quadrada').count()) === 0 && letreiro === 'Time Teste', letreiro);
    const cidadeDoTime = (await page.locator('[data-cidade-do-time]').textContent()).trim();
    t('embaixo do nome, a cidade como informação do time (sem "Encontramos:")', cidadeDoTime === 'Kyoto' && !/Encontramos:/.test(t4), cidadeDoTime);
    t('"Seu time está no ar!" e "Chame a galera pelo link. Ele vale 30 dias."', /Seu time está no ar!/.test(t4) && /Chame a galera pelo link\. Ele vale 30 dias\./.test(t4));
    t('saíram "Chame o seu time", "Você pode pular este passo." e "Logo do time enviado"', !/Chame o seu time|Você pode pular este passo|Logo do time enviado/.test(t4));
    // 29Q: o link chega pronto — o campo já está preenchido, sem ninguém tocar em nada, e o botão de gerar não existe.
    await page.locator('input[readonly]').waitFor({ timeout: 5000 });
    t('o link do convite chega PRONTO (o curto, /c/<código>), com "Copiar link" e "Compartilhar no WhatsApp"', /\/c\/ABC123$/.test(await page.locator('input[readonly]').inputValue()) && (await page.getByRole('button', { name: 'Copiar link' }).count()) === 1 && (await page.getByRole('button', { name: 'Compartilhar no WhatsApp' }).count()) === 1);
    t('o botão "Gerar link do convite" SUMIU (a geração deu certo)', (await page.getByRole('button', { name: 'Gerar link do convite' }).count()) === 0 && !/Preparando o link do convite/.test(await texto(page)));
    t('o convite foi pedido UMA vez só, sem ninguém tocar em nada', pedidosConvite.length === 1, String(pedidosConvite.length));
    t('ficam o link do convite e o "Ir para o time"', (await page.getByRole('button', { name: 'Ir para o time' }).count()) === 1);
    t('depois de criar a tela diz "Pronto" (e não "3/4")', (await progresso(page)) === 'Pronto' && !/\/4/.test(t4), await progresso(page));
    await page.goBack(); await esperar(page, 600);
    t('Voltar depois de criar sai da criação direto (não volta a passo nenhum nem pergunta)', (await page.locator('[data-casa]').count()) === 1 && (await page.locator('[data-sair-da-criacao]').count()) === 0, `${caminho(page)} ${await progresso(page)}`);
    await page.context().close();
  }

  // ── 8. "Ir para o time" NÃO reabre a festa (sem criouAgora no state) ───────────────────────────────────────────────────────────
  {
    const page = await nova();
    await entrar(page);
    await passo1Pronto(page, 'Festa FC');
    await continuar(page).click(); await esperar(page);
    await continuar(page).click(); await esperar(page);
    await page.getByRole('button', { name: 'Criar o time' }).click();
    await page.locator('text=Seu time está no ar!').waitFor({ timeout: 5000 });
    await page.getByRole('button', { name: 'Ir para o time' }).click(); await esperar(page, 400);
    const estado = await page.evaluate(() => window.history.state?.usr ?? null);
    t('"Ir para o time" leva à página do time sem o state criouAgora (a comemoração já aconteceu no passo 4)', caminho(page) === '/time/time-teste' && (await page.locator('[data-time]').count()) === 1 && !(estado && estado.criouAgora), JSON.stringify({ caminho: caminho(page), estado }));
    t('nenhuma caixa de boas-vindas aberta', (await page.locator('.bv[role="dialog"]').count()) === 0);
    await page.context().close();
  }

  // ── 9. Se a geração sozinha falhar, o botão volta como reserva (com o aviso de sempre) e funciona ──────────────────────────────
  {
    const pedidosConvite = [];
    const page = await nova({ convite: 'falha-e-depois-ok', pedidosConvite });
    await entrar(page);
    await passo1Pronto(page, 'Reserva FC');
    await continuar(page).click(); await esperar(page);
    await continuar(page).click(); await esperar(page);
    await page.getByRole('button', { name: 'Criar o time' }).click();
    await page.locator('text=Seu time está no ar!').waitFor({ timeout: 5000 });
    const botao = page.getByRole('button', { name: 'Gerar link do convite' });
    await botao.waitFor({ timeout: 5000 });
    t('a geração sozinha falhou: o botão "Gerar link do convite" volta como reserva, com o aviso de erro, e nenhum link', (await botao.count()) === 1 && /Não deu para gerar o link agora\./.test(await texto(page)) && (await page.locator('input[readonly]').count()) === 0);
    await botao.click();
    await page.locator('input[readonly]').waitFor({ timeout: 5000 });
    t('o botão de reserva gera o link (o 2º pedido) e some', /\/c\/ABC123$/.test(await page.locator('input[readonly]').inputValue()) && (await page.getByRole('button', { name: 'Gerar link do convite' }).count()) === 0 && pedidosConvite.length === 2, String(pedidosConvite.length));
    await page.context().close();
  }

  const reais = erros.filter((e) => !/favicon|Failed to load resource/.test(e));
  t('console sem erros', reais.length === 0, reais.slice(0, 3).join(' | '));
}
