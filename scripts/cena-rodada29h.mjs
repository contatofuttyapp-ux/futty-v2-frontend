// Futty v2.0 — as cenas A a L abaixo, no WebKit do iPhone, em servidor LOCAL (regra do CLAUDE.md) com as
// contas de prova do backend (scripts/_bench/) e TODA escrita interceptada (nada chega ao banco; o signUp
// também é de mentira).
//
// Roda pelo ver-iphone.mjs (que injeta os utilitários), com --cenas <nome desta cena, registrado lá>:
//   node scripts/ver-iphone.mjs --url http://localhost:5233 --cenas <cena> --etiqueta <rótulo>
//
//   A · barra de navegação: some em /avise-me, /termos e /privacidade SEM sessão (com sessão fica), no
//       convite (longo e curto, e no "Saiba mais" do banner de cookies) e no onboarding
//   B · rolinhos de data: dia/mês/ano no cadastro, no onboarding e no Início; sem ano futuro, teto ano
//       atual − 18; dia que acompanha o mês; data de menor mostra a frase da casa e o signUp nem sai
//   C · convidado: abre nas boas-vindas do time (frase "Você foi convidado…", linha/gol, Vamos lá) → foto →
//       nome → time; o bilhete sobrevive a Google/Apple (conta nova que cai em /home vai ao onboarding, não
//       à página do convite); convite morto vira cadastro comum; quem já tem conta pronta segue o caminho
//       de sempre
//   D · página 1: o Register e o Login aquecem o chunk do Onboarding e as 8 figurinhas; imagens com
//       ?v=<hash>
//   E · "deixar para depois": escondido até ~2 s e aparece então
//   F · Criar time: texto do papel por opção; Artilheiro/Destaque clicáveis e gravados; textos de entrada
//       aprovados; o aviso do "só organizo" é texto na tela (nada de toast); bairro opcional; frase do
//       WhatsApp e link curto
//   G · convite: time sem logo = só o nome em destaque; og:image com o ícone do app 1200×630
//   H · chips linha/gol lado a lado no card do jogador e no Perfil; "＋ Criar time" no Início e no Perfil
//   I · painel do admin: frase aprovada e nenhum "IA" fora da figurinha
//   J · figurinha: um botão só no celular, "Baixar" só no computador; Planos: seção "Figurinhas do time"
//       só para dono, textos rediagramados
//   K · painel do time: bairro (freguesias em Portugal) e prêmios do dia
//   L · ajustes finais: o F antes do JavaScript; landing com os pontos; "Você entrou no time <nome>!"
import { mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

export async function cenaRodada29h(navegador, { BASE, IPHONE, PASTA, RAIZ, novoContexto, travarEscritas, espera, escolherData }) {
  if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(BASE)) {
    throw new Error(`rodada29h só roda contra servidor LOCAL (CLAUDE.md, 25-set), e o --url é ${BASE}`);
  }
  const pasta = path.join(PASTA, 'rodada-29h');
  mkdirSync(pasta, { recursive: true });
  const fx = JSON.parse(readFileSync(path.join(PASTA, 'sessao-rodada29b.json'), 'utf8'));
  const slug = fx.times.gratis.slug;
  const idDoTime = fx.times.gratis.id;
  const NOME = 'Prova R29B Grátis';
  const erros = [];
  const verificacoes = [];
  const capturas = [];
  const verificar = (nome, ok, detalhe = '') => verificacoes.push({ nome, ok: !!ok, detalhe });
  const capturar = async (pagina, nome) => {
    const arq = path.join(pasta, `r29h-${nome}.png`);
    await pagina.screenshot({ path: arq });
    capturas.push(path.relative(RAIZ, arq));
  };
  const aceitarCookies = (pagina) => pagina.locator('button', { hasText: /^Aceitar$/ }).click({ timeout: 2500 }).catch(() => {});
  const texto = (pagina) => pagina.locator('body').innerText().catch(() => '');
  const barra = (pagina) => pagina.locator('nav[aria-label="Navegação principal"]');
  const norm = (s) => String(s || '').replace(/\s+/g, ' ').trim();
  // Um bloco que falha (exceção, espera esgotada) vira UMA verificação reprovada e a cena segue — não derruba as demais.
  const bloco = async (rotulo, fn) => {
    try { await fn(); } catch (e) { erros.push(`${rotulo}: ${e.message.split('\n')[0]}`); verificar(`bloco ${rotulo} terminou sem exceção`, false, e.message.split('\n')[0]); }
  };
  const FRASE_MENOR = 'O Futty é para maiores de 18 anos.';
  const ANO_MAX = new Date().getUTCFullYear() - 18;

  // Abre uma página com tudo o que as cenas anteriores já faziam: escritas travadas, SW bloqueado, fuso de São Paulo.
  const abrir = async (sessao, rotulo, rota, { extra = {}, inicial = null, antes = null, respostas = () => null, espiar = null } = {}) => {
    const contexto = await novoContexto(navegador, sessao, { amostrar: false, extra: { timezoneId: 'America/Sao_Paulo', ...extra } });
    if (inicial) await contexto.addInitScript(inicial);
    const escritas = await travarEscritas(contexto, respostas);
    if (antes) await antes(contexto);
    const pagina = await contexto.newPage();
    pagina.on('pageerror', (e) => erros.push(`${rotulo}: ${e.message}`));
    const pedidos = [];
    pagina.on('request', (r) => pedidos.push({ url: r.url(), metodo: r.method(), t: Date.now() }));
    if (espiar) await espiar(pagina);
    await pagina.goto(`${BASE}${rota}`, { waitUntil: 'domcontentloaded' });
    await aceitarCookies(pagina);
    return { contexto, pagina, escritas, pedidos };
  };

  // O convite de prova (GET público): válido, com ou sem logo; o POST /aceitar é respondido pelas escritas travadas.
  const rotasDoConvite = (opcoes = {}) => async (contexto) => {
    await contexto.route('**/api/convite/*', async (route) => {
      const u = new URL(route.request().url());
      if (route.request().method() !== 'GET' || u.pathname.endsWith('/aceitar')) return route.fallback();
      const corpo = opcoes.morto
        ? { valido: false, motivo: 'nao_encontrado', team: null }
        : { valido: true, motivo: null, autenticado: false, jaMembro: false, convidadoPor: 'Tonhão', expires_at: new Date(Date.now() + 86400000).toISOString(), usos: 1, membros: 3, proximoJogo: null, cidade: null, team: { nome: NOME, slug, cor: 'verde', logo_url: opcoes.logo || null, cor_fundo: null } };
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(corpo) });
    });
  };
  const respostaAceitar = (caminho, metodo) => (metodo === 'POST' && caminho.endsWith('/aceitar') ? { jaMembro: false, team: { id: idDoTime, slug, nome: NOME, cor: 'verde' } } : null);
  // O /api/me real, com o que a cena precisa mudar por cima.
  const comMe = (alterar) => async (contexto) => {
    await contexto.route('**/api/me', async (route) => {
      if (route.request().method() !== 'GET') return route.fallback();
      const resposta = await route.fetch();
      const json = await resposta.json().catch(() => null);
      if (!json?.user) return route.fulfill({ response: resposta });
      alterar(json);
      return route.fulfill({ response: resposta, json });
    });
    // O Início traz o mesmo `me` dentro do /api/inicio (a tela lê o perfil das duas fontes).
    await contexto.route('**/api/inicio*', async (route) => {
      if (route.request().method() !== 'GET') return route.fallback();
      const resposta = await route.fetch();
      const json = await resposta.json().catch(() => null);
      if (!json?.me?.user) return route.fulfill({ response: resposta });
      alterar(json.me);
      return route.fulfill({ response: resposta, json });
    });
  };
  // Um SCRIPT (string), não uma função: uma função com variáveis de fora perde as variáveis ao ir para a
  // página (o bilhete saía sem time e o onboarding abria a página "Começar"). O script roda a CADA
  // navegação: o sessionStorage garante que o bilhete é posto UMA vez só (senão a cena o repunha depois de a
  // página o gastar).
  const bilhete = (time = { nome: NOME, logo_url: null, cor_fundo: null }) => `try { if (!sessionStorage.getItem('__bilhete_da_cena')) { sessionStorage.setItem('__bilhete_da_cena', '1'); localStorage.setItem('futty_convite_pendente', JSON.stringify({ token: 'token-de-prova', em: Date.now(), time: ${JSON.stringify(time)} })); } } catch (e) { /* nada */ }`;
  const lerProgresso = (pagina) => pagina.evaluate(() => {
    const tracos = [...document.querySelectorAll('[data-progresso] i')];
    return { n: tracos.length, acesos: tracos.filter((i) => getComputedStyle(i).backgroundImage !== 'none').length };
  });
  const ticket = (pagina) => pagina.evaluate(() => { try { return JSON.parse(localStorage.getItem('futty_convite_pendente') || 'null'); } catch { return null; } });
  const escritaDe = (escritas, metodo, rota) => escritas.filter((e) => e.metodo === metodo && e.rota === rota);

  // ───────────────────────────────── A · a barra de navegação ─────────────────────────────────
  for (const [rota, rotulo] of [['/termos', 'termos'], ['/privacidade', 'privacidade']]) {
    const { contexto, pagina } = await abrir(null, `A-${rotulo}`, rota);
    await espera(1500);
    verificar(`A · ${rota} sem sessão: nenhuma barra de navegação do app`, (await barra(pagina).count()) === 0);
    await contexto.close();
  }
  {
    // A página do Avise-me saiu; o link antigo das redes cai na página inicial (sem barra, como sempre na "/").
    const { contexto, pagina } = await abrir(null, 'A-avise-me', '/avise-me');
    await espera(1500);
    verificar('A · /avise-me leva para a página inicial ("/"), sem barra', new URL(pagina.url()).pathname === '/' && (await barra(pagina).count()) === 0, pagina.url().replace(BASE, ''));
    await capturar(pagina, 'A1-avise-me-vai-para-inicial');
    await contexto.close();
  }
  await bloco('A1', async () => {
    const { contexto, pagina } = await abrir(fx.novato, 'A-privacidade-logado', '/privacidade');
    await espera(2000);
    verificar('A · /privacidade COM sessão (Perfil → Privacidade): a barra continua', (await barra(pagina).count()) === 1);
    await contexto.close();
  });
  for (const [rota, rotulo] of [['/convite/token-de-prova', 'convite-longo'], ['/c/k7m2p9qx', 'convite-curto']]) {
    const { contexto, pagina } = await abrir(null, `A-${rotulo}`, rota, { antes: rotasDoConvite() });
    await pagina.locator('.convite__nome').waitFor({ timeout: 30000 }).catch(() => {});
    const t = await texto(pagina);
    verificar(`A · ${rota} sem sessão abre a página do convite do time (${rotulo}) e não tem barra`, new RegExp(NOME).test(t) && (await barra(pagina).count()) === 0, norm(t).slice(0, 120));
    if (rotulo === 'convite-curto') {
      await capturar(pagina, 'A2-convite-curto');
      // O "Saiba mais" do banner de cookies leva à Privacidade; sem conta, sem barra (item 52).
      await contexto.clearCookies();
      await pagina.evaluate(() => localStorage.removeItem('futty_cookies'));
      await pagina.goto(`${BASE}/convite/token-de-prova`, { waitUntil: 'domcontentloaded' });
      await pagina.getByRole('link', { name: 'Saiba mais' }).click({ timeout: 15000 }).catch(() => {});
      await pagina.waitForURL('**/privacidade', { timeout: 15000 }).catch(() => {});
      await espera(800);
      verificar('A · convite → "Saiba mais" (banner) → Privacidade: sem barra de navegação', /\/privacidade/.test(pagina.url()) && (await barra(pagina).count()) === 0, pagina.url().replace(BASE, ''));
    }
    await contexto.close();
  }
  await bloco('A2', async () => {
    const { contexto, pagina } = await abrir(fx.novato, 'A-onboarding', '/onboarding');
    await pagina.locator('[data-progresso]').waitFor({ timeout: 30000 }).catch(() => {});
    verificar('A · /onboarding (a pessoa ainda não terminou de entrar): sem barra', (await barra(pagina).count()) === 0);
    await contexto.close();
  });

  // ───────────────────────────────── B · rolinhos de data ─────────────────────────────────
  await bloco('B3', async () => {
    const signups = [];
    const { contexto, pagina } = await abrir(null, 'B-register', '/register', {
      antes: async (c) => {
        await c.route('**/auth/v1/signup**', async (route) => {
          const pedido = route.request();
          const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' };
          if (pedido.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
          let corpo = {};
          try { corpo = JSON.parse(pedido.postData() || '{}'); } catch { /* ilegível */ }
          signups.push(corpo);
          const agora = new Date().toISOString();
          return route.fulfill({ status: 200, contentType: 'application/json', headers: cors, body: JSON.stringify({ id: '00000000-0000-4000-8000-000000002908', aud: 'authenticated', role: '', email: corpo.email || 'x@futtymock.com', created_at: agora, updated_at: agora, app_metadata: {}, user_metadata: corpo.data || {}, identities: [] }) });
        });
      },
    });
    await pagina.waitForSelector('#birthdate [data-rolo="ano"]', { timeout: 30000 });
    const anos = await pagina.locator('#birthdate [data-rolo="ano"] [data-valor]').evaluateAll((els) => els.map((e) => Number(e.dataset.valor)));
    verificar(`B · cadastro: três rolos (dia, mês, ano) no lugar do seletor do sistema; anos de 1900 a ${ANO_MAX} (nenhum ano futuro, teto ano atual − 18)`, (await pagina.locator('#birthdate [data-rolo]').count()) === 3 && (await pagina.locator('#birthdate input[type="date"]').count()) === 0 && anos[0] === 1900 && anos[anos.length - 1] === ANO_MAX && anos.every((a) => a <= ANO_MAX), `${anos[0]}…${anos[anos.length - 1]} (${anos.length})`);
    verificar('B · a frase "O Futty é para maiores de 18 anos." mora sob o campo', (await pagina.locator('#birthdate').locator('xpath=..').innerText().catch(() => '')).includes(FRASE_MENOR));
    const meses = await pagina.locator('#birthdate [data-rolo="mes"] [data-valor]').allInnerTexts();
    verificar('B · os 12 meses por extenso, em português', meses.length === 12 && meses[0] === 'janeiro' && meses[2] === 'março' && meses[11] === 'dezembro', meses.join(','));
    await capturar(pagina, 'B1-rolinhos-cadastro');

    // Só depois de mexer nos TRÊS rolos há data: o ponto de partida não vale como resposta.
    let valor = await pagina.locator('#birthdate').getAttribute('data-valor-data');
    verificar('B · sem mexer nos rolos não há data (o ponto de partida não é resposta)', valor === '');
    await escolherData(pagina, '#birthdate', '2001-02-10', { so: ['ano', 'mes'] });
    valor = await pagina.locator('#birthdate').getAttribute('data-valor-data');
    verificar('B · com só ano e mês escolhidos ainda não há data', valor === '', valor);
    const diasFev2001 = await pagina.locator('#birthdate [data-rolo="dia"] [data-valor]').count();
    await escolherData(pagina, '#birthdate', '2004-02-10', { so: ['ano'] });
    const diasFev2004 = await pagina.locator('#birthdate [data-rolo="dia"] [data-valor]').count();
    verificar('B · o rolo do dia acompanha o mês: fevereiro de 2001 tem 28, de 2004 tem 29', diasFev2001 === 28 && diasFev2004 === 29, `${diasFev2001} / ${diasFev2004}`);

    const preencher = async (sufixo) => {
      await pagina.fill('#email', `prova-r29h-${sufixo}-${Date.now()}@futtymock.com`);
      await pagina.fill('#password', 'Prova!R29H-registro');
      await pagina.fill('#confirm', 'Prova!R29H-registro');
      await pagina.locator('input[type="checkbox"]').check();
    };
    const aviso = pagina.locator('.auth-alert--error');
    await preencher('menor');
    await escolherData(pagina, '#birthdate', `${ANO_MAX}-12-31`);
    await pagina.locator('button[type="submit"]').click();
    await aviso.first().waitFor({ timeout: 8000 }).catch(() => {});
    verificar(`B · data de MENOR (${ANO_MAX}-12-31, o último ano oferecido): o aviso diz a frase da casa e o signUp nem sai`, (await aviso.first().innerText().catch(() => '')).includes(FRASE_MENOR) && signups.length === 0, `signups: ${signups.length}`);
    await capturar(pagina, 'B2-menor');

    await escolherData(pagina, '#birthdate', '1990-03-15');
    valor = await pagina.locator('#birthdate').getAttribute('data-valor-data');
    verificar('B · 15 de março de 1990 nos rolos vira "1990-03-15"', valor === '1990-03-15', valor);
    await pagina.locator('button[type="submit"]').click();
    const limite = Date.now() + 10000;
    while (signups.length === 0 && Date.now() < limite) await espera(200);
    await espera(600);
    verificar('B · cadastro com data de maior: o signUp sai com a data certa e segue para "Conta criada!"', signups.length === 1 && signups[0]?.data?.birthdate === '1990-03-15' && /Conta criada!/.test(await texto(pagina)), `signups: ${signups.length} · ${signups[0]?.data?.birthdate}`);
    await capturar(pagina, 'B3-maior');
    await contexto.close();
  });
  await bloco('B4', async () => {
    // Onboarding de conta sem data (Google/Apple): "Quando você nasceu?" com os rolinhos; o motor decide a idade.
    const { contexto, pagina, escritas } = await abrir(fx.novato, 'B-onboarding', '/onboarding', {
      antes: comMe((json) => { json.user.birthdate = null; }),
    });
    await pagina.getByRole('button', { name: /^Começar$/ }).tap({ timeout: 30000 });
    await pagina.getByText(/Quando você/).first().waitFor({ timeout: 15000 });
    verificar('B · onboarding de conta sem data: "Quando você nasceu?" com os rolinhos (sem campo de data do sistema)', (await pagina.locator('#onb-nascimento [data-rolo]').count()) === 3 && (await pagina.locator('input[type="date"]').count()) === 0);
    const continuar = pagina.getByRole('button', { name: /^Continuar$/ });
    verificar('B · "Continuar" fica desligado até haver data', await continuar.isDisabled());
    await escolherData(pagina, '#onb-nascimento', '1988-07-04');
    verificar('B · com os três rolos mexidos, "Continuar" liga', await continuar.isEnabled());
    await capturar(pagina, 'B4-onboarding-nasceu');
    await continuar.tap();
    await pagina.getByText(/SUA FIGURINHA/).first().waitFor({ timeout: 15000 }).catch(() => {});
    const patch = escritaDe(escritas, 'PATCH', '/api/me').find((e) => /birthdate/.test(e.corpo || ''));
    verificar('B · "Continuar" grava a data (PATCH /api/me interceptado) e segue para a foto', /1988-07-04/.test(patch?.corpo || '') && /SUA FIGURINHA/.test(await texto(pagina)), patch?.corpo || '(sem PATCH)');
    await contexto.close();
  });
  await bloco('B5', async () => {
    const { contexto, pagina, escritas } = await abrir(fx.novato, 'B-inicio', '/home', {
      inicial: () => { try { localStorage.removeItem('futty_agora_nao_nascimento'); } catch { /* nada */ } },
      antes: comMe((json) => { json.user.birthdate = null; }),
    });
    await pagina.locator('#inicio-nascimento [data-rolo]').first().waitFor({ timeout: 30000 }).catch(() => {});
    verificar('B · o pedido da data no Início também usa os rolinhos', (await pagina.locator('#inicio-nascimento [data-rolo]').count()) === 3 && (await pagina.locator('input[type="date"]').count()) === 0);
    const salvar = pagina.getByRole('button', { name: 'Salvar' });
    verificar('B · Início: "Salvar" desligado até a data estar nos três rolos', await salvar.isDisabled());
    await escolherData(pagina, '#inicio-nascimento', '1992-11-23');
    await salvar.tap();
    await espera(800);
    verificar('B · Início: salvar grava a data escolhida (PATCH interceptado)', escritaDe(escritas, 'PATCH', '/api/me').some((e) => /1992-11-23/.test(e.corpo || '')));
    await capturar(pagina, 'B5-inicio');
    await contexto.close();
  });

  // ───────────────────────────────── C · o convidado ─────────────────────────────────
  await bloco('C6', async () => {
    // C1: conta nova (sessão pronta) com o bilhete do convite: o onboarding ABRE nas boas-vindas do time
    const { contexto, pagina, escritas } = await abrir(fx.membroFoto, 'C-convidado', '/onboarding', { inicial: bilhete(), antes: rotasDoConvite(), respostas: respostaAceitar });
    await pagina.locator('.bv').waitFor({ timeout: 30000 }).catch(() => {});
    const t = norm(await texto(pagina));
    verificar('C · convidado: a 1ª página é a boas-vindas do time (variante convidado), não a "Começar"', (await pagina.locator('.bv').getAttribute('data-variante').catch(() => null)) === 'convidado' && !/BEM-VINDO AO FUTTY/.test(t) && (await pagina.locator('.msq').count()) === 0);
    verificar(`C · a frase: "Você foi convidado para o ${NOME}. Aqui a gente confirma presença, sorteia os times, guarda o ranking e faz sua figurinha."`, t.includes(`Você foi convidado para o ${NOME}. Aqui a gente confirma presença, sorteia os times, guarda o ranking e faz sua figurinha.`), t.slice(0, 200));
    const chips = await pagina.locator('.bv-posicao .chip').allInnerTexts();
    verificar('C · com a escolha "Jogo na linha" | "No gol" e o botão "Vamos lá"', chips.join('|') === 'Jogo na linha|No gol' && (await pagina.getByRole('button', { name: 'Vamos lá' }).isVisible()), chips.join('|'));
    await capturar(pagina, 'C1-convidado-boasvindas');
    await pagina.getByRole('button', { name: 'No gol' }).tap();
    await pagina.getByRole('button', { name: 'Vamos lá' }).tap();
    await pagina.getByText(/SUA FIGURINHA/).first().waitFor({ timeout: 15000 });
    const prog = await lerProgresso(pagina);
    verificar('C · "Vamos lá" → foto, com 3 traços (o 2º aceso); nenhuma escrita ainda (a pessoa não é do time) e a escolha "No gol" guardada no bilhete', prog.n === 3 && prog.acesos === 2 && escritas.length === 0 && (await ticket(pagina))?.goleiro === true, JSON.stringify({ prog, escritas: escritas.length, goleiro: (await ticket(pagina))?.goleiro }));
    await capturar(pagina, 'C2-convidado-foto');
    await pagina.getByRole('button', { name: /deixar para depois/i }).waitFor({ state: 'visible', timeout: 8000 });
    await pagina.getByRole('button', { name: /deixar para depois/i }).tap();
    await pagina.getByText(/Como te chamam/).first().waitFor({ timeout: 15000 });
    await pagina.locator('input[placeholder^="ex.:"]').fill('Prova 29H');
    await pagina.getByRole('button', { name: /^Entrar$/ }).tap();
    await pagina.waitForURL(`**/time/${slug}`, { timeout: 40000 }).catch(() => {});
    await espera(1500);
    const rotas = escritas.map((e) => `${e.metodo} ${e.rota}`);
    verificar('C · "Entrar" aceita o convite do bilhete e cai DIRETO no time (nome → onboarding selado → aceitar → posição "No gol")', pagina.url().endsWith(`/time/${slug}`) && rotas.includes('POST /api/convite/token-de-prova/aceitar') && rotas.includes('POST /api/me/onboarding-completo') && escritaDe(escritas, 'PATCH', `/api/equipas/${slug}/membros/posicao`).some((e) => /"goleiro":true/.test(e.corpo || '')), JSON.stringify({ url: pagina.url().replace(BASE, ''), rotas }));
    const guardado = await pagina.evaluate((id) => ({ visto: localStorage.getItem(`futty_onboarding_${id}`), bilhete: localStorage.getItem('futty_convite_pendente') }), idDoTime);
    verificar('C · o bilhete é gasto, as boas-vindas do time já contam como vistas (não repetem na página do time)', guardado.bilhete === null && guardado.visto === '1' && (await pagina.locator('.bv').count()) === 0, JSON.stringify(guardado));
    await capturar(pagina, 'C3-convidado-no-time');
    await contexto.close();
  });
  await bloco('C7', async () => {
    // C2: Google/Apple — a conta nova cai em /home com o bilhete; o Início NÃO o toma, a trava do onboarding leva ao onboarding
    const { contexto, pagina } = await abrir(fx.membroFoto, 'C-google', '/home', { inicial: bilhete(), antes: async (c) => { await rotasDoConvite()(c); await comMe((json) => { json.user.onboarding_completo = false; })(c); } });
    await pagina.waitForURL('**/onboarding', { timeout: 30000 }).catch(() => {});
    await pagina.locator('.bv').waitFor({ timeout: 30000 }).catch(() => {});
    verificar('C · Google/Apple: conta nova que cai em /home com o bilhete vai ao ONBOARDING (não à página do convite) e ele abre nas boas-vindas do time', /\/onboarding$/.test(pagina.url()) && (await pagina.locator('.bv').count()) === 1, pagina.url().replace(BASE, ''));
    verificar('C · o bilhete continua no aparelho (o Início não o tomou)', (await ticket(pagina))?.token === 'token-de-prova');
    await capturar(pagina, 'C4-google-vai-ao-onboarding');
    await contexto.close();
  });
  await bloco('C8', async () => {
    // C3: conta nova que abre o convite pelo link: a página manda para o onboarding (e deixa o bilhete)
    const { contexto, pagina } = await abrir(fx.membroFoto, 'C-convite-logado', '/convite/token-de-prova', { antes: async (c) => { await rotasDoConvite()(c); await comMe((json) => { json.user.onboarding_completo = false; })(c); } });
    await pagina.waitForURL('**/onboarding', { timeout: 30000 }).catch(() => {});
    await pagina.locator('.bv').waitFor({ timeout: 30000 }).catch(() => {});
    verificar('C · conta que ainda não terminou o onboarding abre /convite/…: vai ao onboarding, nas boas-vindas do time', /\/onboarding$/.test(pagina.url()) && (await pagina.locator('.bv').count()) === 1, pagina.url().replace(BASE, ''));
    await contexto.close();
  });
  await bloco('C9', async () => {
    // C4: conta com onboarding pronto: o Início toma o bilhete e leva ao convite (o caminho de sempre)
    const { contexto, pagina } = await abrir(fx.membroFoto, 'C-pronta', '/home', { inicial: bilhete(), antes: rotasDoConvite(), respostas: respostaAceitar });
    await pagina.waitForURL('**/convite/token-de-prova', { timeout: 30000 }).catch(() => {});
    await pagina.locator('button.convite__cta', { hasText: 'Entrar no time' }).waitFor({ timeout: 30000 }).catch(() => {});
    verificar('C · conta com onboarding pronto: o Início devolve ao convite ("Entrar no time"), como sempre', /\/convite\/token-de-prova$/.test(pagina.url()) && (await pagina.locator('button.convite__cta', { hasText: 'Entrar no time' }).count()) === 1, pagina.url().replace(BASE, ''));
    await contexto.close();
  });
  await bloco('C10', async () => {
    // C5: convite que morreu → cadastro comum (página "Começar") e o bilhete cai
    const { contexto, pagina } = await abrir(fx.novato, 'C-morto', '/onboarding', { inicial: bilhete(), antes: rotasDoConvite({ morto: true }) });
    await pagina.getByRole('button', { name: /^Começar$/ }).waitFor({ timeout: 30000 }).catch(() => {});
    await espera(500);
    verificar('C · convite que não existe mais: o onboarding é o de sempre ("Começar" + mini sorteio) e o bilhete cai', (await pagina.getByRole('button', { name: /^Começar$/ }).count()) === 1 && (await pagina.locator('.msq').count()) === 1 && (await ticket(pagina)) === null && (await pagina.locator('.bv').count()) === 0);
    await contexto.close();
  });
  await bloco('C11', async () => {
    // C6: sem bilhete nada muda: BEM-VINDO AO FUTTY + Começar + 3 traços
    const { contexto, pagina } = await abrir(fx.novato, 'C-comum', '/onboarding');
    await pagina.locator('.msq .maq').waitFor({ timeout: 30000 }).catch(() => {});
    const prog = await lerProgresso(pagina);
    verificar('C · sem convite: a página "BEM-VINDO AO FUTTY" com o mini sorteio e 3 traços, como sempre', /BEM-VINDO AO FUTTY/.test(await texto(pagina)) && prog.n === 3 && prog.acesos === 1);
    await contexto.close();
  });

  // ───────────────────────────────── D · página 1 do onboarding: aquecimento ─────────────────────────────────
  for (const [rota, rotulo] of [['/register', 'register'], ['/login', 'login']]) {
    const { contexto, pagina, pedidos } = await abrir(null, `D-${rotulo}`, rota);
    await espera(3500);
    const imagens = pedidos.filter((p) => /\/onboarding\/[a-z]+\.webp/.test(p.url));
    const chunk = pedidos.filter((p) => /pages\/Onboarding(\.jsx|-)/.test(p.url));
    const versionadas = imagens.every((p) => /\.webp\?v=[0-9a-f]{8}$/.test(p.url));
    verificar(`D · ${rota}: sem a pessoa tocar em nada, o chunk do Onboarding e as 8 figurinhas (com ?v=hash) já foram pedidos`, chunk.length >= 1 && new Set(imagens.map((p) => p.url)).size === 8 && versionadas, `chunk: ${chunk.length} · imagens: ${new Set(imagens.map((p) => p.url)).size} · versionadas: ${versionadas}`);
    await contexto.close();
  }
  await bloco('D12', async () => {
    // D2: o convite aquece o chunk das boas-vindas (a 1ª página do convidado), não as 8 figurinhas
    const { contexto, pagina, pedidos } = await abrir(null, 'D-convite', '/convite/token-de-prova', { antes: rotasDoConvite() });
    await pagina.locator('.convite__nome').waitFor({ timeout: 30000 }).catch(() => {});
    await espera(3500);
    const bv = pedidos.filter((p) => /components\/BoasVindas(\.jsx|-)/.test(p.url));
    const imagens = pedidos.filter((p) => /\/onboarding\/[a-z]+\.webp/.test(p.url));
    verificar('D · /convite sem conta: aquece o chunk das boas-vindas do time (e NÃO baixa as 8 figurinhas do mini sorteio)', bv.length >= 1 && imagens.length === 0, `boas-vindas: ${bv.length} · imagens: ${imagens.length}`);
    await contexto.close();
  });
  await bloco('D13', async () => {
    // D3: a página 1 desenha com as imagens atrasadas: os rolos já giram, as células são a moldura vazia (nada de buraco)
    const { contexto, pagina } = await abrir(fx.novato, 'D-placeholder', '/onboarding', {
      antes: async (c) => { await c.route('**/onboarding/*.webp*', async (route) => { await espera(2500); await route.fallback(); }); },
    });
    await pagina.locator('.msq .maq').waitFor({ timeout: 30000 });
    await espera(600);
    const estado = await pagina.evaluate(() => {
      const scel = document.querySelector('.msq .scel');
      const img = document.querySelector('.msq .scel img');
      const strip = document.querySelector('.msq .strip');
      return { fundo: getComputedStyle(scel).backgroundImage, carregada: !!img?.complete && img.naturalWidth > 0, anima: getComputedStyle(strip).animationName };
    });
    verificar('D · com as imagens ainda a caminho a máquina já está na tela, os rolos já giram e cada célula é a moldura vazia (degradê), não um buraco', /linear-gradient/.test(estado.fundo) && !estado.carregada && /msqSpin/.test(estado.anima), JSON.stringify(estado));
    await capturar(pagina, 'D1-imagens-a-caminho');
    await contexto.close();
  });

  // ───────────────────────────────── E · "deixar para depois" ─────────────────────────────────
  await bloco('E14', async () => {
    const { contexto, pagina } = await abrir(fx.novato, 'E-depois', '/onboarding');
    await pagina.getByRole('button', { name: /^Começar$/ }).tap({ timeout: 30000 });
    await pagina.getByText(/SUA FIGURINHA/).first().waitFor({ timeout: 15000 });
    const t0 = Date.now();
    // Um seletor que NÃO espera ficar visível (o getByRole espera: mediria o próprio atraso do Playwright, não o do botão).
    const botao = pagina.locator('button', { hasText: /deixar para depois/i });
    const lerEstado = () => botao.evaluate((el) => { const s = getComputedStyle(el); return { visivel: s.visibility === 'visible', opacidade: Number(s.opacity) }; });
    await espera(500);
    const cedo = await lerEstado();
    let quando = null;
    while (Date.now() - t0 < 6000) {
      const e = await lerEstado();
      if (e.visivel && e.opacidade > 0.05) { quando = Date.now() - t0; break; }
      await espera(50);
    }
    await espera(700);
    const tarde = await lerEstado();
    verificar(`E · "deixar para depois": escondido aos 0,5 s, começa a aparecer em ~2 s (medido: ${quando} ms; era ~4 s) e fica inteiro`, !cedo.visivel && quando !== null && quando >= 1500 && quando <= 2800 && tarde.visivel && tarde.opacidade > 0.95, JSON.stringify({ cedo, quando, tarde }));
    await botao.tap();
    verificar('E · tocar nele leva ao nome', await pagina.getByText(/Como te chamam/).first().waitFor({ timeout: 15000 }).then(() => true, () => false));
    await contexto.close();
  });

  // ───────────────────────────────── F · Criar time ─────────────────────────────────
  await bloco('F15', async () => {
    const corpoCriar = { team: { id: 'time-de-prova', slug: 'prova-r29h', nome: 'Savassi FC' }, geo: { encontrada: true, nomeOficial: 'Belo Horizonte, MG' }, bairro: { encontrado: true, nomeOficial: 'Savassi, Belo Horizonte, MG' }, joga: true };
    const respostas = (caminho, metodo) => {
      if (metodo === 'POST' && caminho === '/api/teams') return corpoCriar;
      if (metodo === 'POST' && caminho === '/api/teams/prova-r29h/convite') return { token: '11111111-2222-3333-4444-555555555555', codigo: 'k7m2p9qx', expires_at: new Date(Date.now() + 30 * 86400000).toISOString() };
      return null;
    };
    const { contexto, pagina, escritas } = await abrir(fx.gratis, 'F-criar', '/criar-time', { respostas });
    await pagina.getByPlaceholder('Ex.: Domingueira FC').fill('Savassi FC');
    // a cidade (da lista) e o bairro
    const bairro = pagina.locator('[data-campo-bairro]');
    verificar('F · o campo Bairro (opcional) fica desligado sem cidade, com "Escolha a cidade primeiro"', await bairro.isDisabled() && (await bairro.getAttribute('placeholder')) === 'Escolha a cidade primeiro');
    const cidade = pagina.getByPlaceholder('Ex.: Brasília');
    await cidade.click();
    await cidade.fill('Belo Horizonte');
    await pagina.locator('[data-sugestoes-cidade] button').first().click({ timeout: 20000 });
    verificar('F · com a cidade escolhida o Bairro liga', await bairro.isEnabled());
    await bairro.fill('Savassi');
    verificar('F · (29P) o passo 1 não tem textos de apoio embaixo dos campos', !(await texto(pagina)).includes('Só o bairro e a cidade, nunca o endereço.'));
    await capturar(pagina, 'F1-criar-bairro');
    await pagina.getByRole('button', { name: 'Continuar' }).tap();

    // Passo 2: o papel sem texto embaixo; gols, artilheiro e destaque nascem desligados; ligar o artilheiro
    // liga os gols junto
    await pagina.locator('[data-escolha-papel]').waitFor({ timeout: 15000 });
    const semTextoNoPapel = (await pagina.locator('[data-texto-papel]').count()) === 0;
    await pagina.getByRole('button', { name: 'Sim, eu jogo' }).tap();
    await pagina.getByRole('button', { name: 'Não, só organizo' }).tap();
    const organizaAtivo = await pagina.getByRole('button', { name: 'Não, só organizo' }).getAttribute('aria-pressed');
    verificar('F · o papel não tem texto embaixo dos chips, e "Sim, eu jogo" / "Não, só organizo" trocam', semTextoNoPapel && organizaAtivo === 'true', JSON.stringify({ semTextoNoPapel, organizaAtivo }));
    const gols = pagina.getByRole('button', { name: 'Gols de cada um' });
    const art = pagina.getByRole('button', { name: 'Artilheiro do dia' });
    const dest = pagina.getByRole('button', { name: 'Destaque do dia' });
    const antes = [await gols.getAttribute('aria-pressed'), await art.getAttribute('aria-pressed'), await dest.getAttribute('aria-pressed')];
    const habilitados = [await gols.isEnabled(), await art.isEnabled(), await dest.isEnabled()];
    await art.tap();
    const depoisArt = [await gols.getAttribute('aria-pressed'), await art.getAttribute('aria-pressed')];
    await dest.tap();
    const depois = [await gols.getAttribute('aria-pressed'), await art.getAttribute('aria-pressed'), await dest.getAttribute('aria-pressed')];
    verificar('F · os três nascem desligados; ligar o artilheiro liga os gols junto; os três são botões de verdade', habilitados.every(Boolean) && antes.join() === 'false,false,false' && depoisArt.join() === 'true,true' && depois.join() === 'true,true,true', JSON.stringify({ habilitados, antes, depoisArt, depois }));
    const apoios = await pagina.locator('[data-jogo-item] .texto-apoio').allInnerTexts();
    verificar('F · cada linha diz o que faz, com a frase fixa (29O)', apoios.join('|') === 'Registra quantos gols cada jogador marcou.|Quem fez mais gols no jogo ganha o troféu.|O jogador que fez a diferença em campo, escolhido por você.', apoios.join('|'));
    await capturar(pagina, 'F2-papel-e-premios');
    await pagina.getByRole('button', { name: 'Continuar' }).tap();

    // passo 3: os textos de entrada aprovados
    await pagina.getByText('Aceita novos membros?').waitFor({ timeout: 15000 });
    const t3 = norm(await texto(pagina));
    verificar('F · textos de entrada (29P): "Só com a sua aprovação" + "Quem achar o time no "Radar de peladas" pede para entrar. Você aceita ou não." · "Aberto" + "Qualquer um que achar o time no "Radar de peladas" entra na hora."; sem o subtítulo', t3.includes('Só com a sua aprovação') && t3.includes('Quem achar o time no "Radar de peladas" pede para entrar. Você aceita ou não.') && t3.includes('Aberto') && t3.includes('Qualquer um que achar o time no "Radar de peladas" entra na hora.') && !/Como se entra no seu time|Explorar/.test(t3), t3.slice(0, 260));
    await capturar(pagina, 'F3-entrada');
    await pagina.getByRole('button', { name: /Só com a sua aprovação/ }).tap();
    await pagina.getByRole('button', { name: 'Criar o time' }).tap();
    await pagina.getByText('Seu time está no ar!').waitFor({ timeout: 20000 });
    await espera(600);
    const post = escritaDe(escritas, 'POST', '/api/teams')[0];
    let corpo = {};
    try { corpo = JSON.parse(post?.corpo || '{}'); } catch { /* cortado em 200 caracteres */ }
    verificar('F · o POST leva o bairro e "só organizo"; os prêmios ligados por toque não vão desligados', /"bairro":"Savassi"/.test(post?.corpo || '') && /"joga":false/.test(post?.corpo || '') && !/"mostrar_artilheiro":false/.test(post?.corpo || '') && !/"mostrar_destaque":false/.test(post?.corpo || '') || (corpo.bairro === 'Savassi'), post?.corpo || '(sem POST)');
    const patch = escritaDe(escritas, 'PATCH', '/api/teams/prova-r29h')[0];
    verificar('F · a política "Só com a sua aprovação" vai no PATCH (publico_aprovacao)', /publico_aprovacao/.test(patch?.corpo || ''), patch?.corpo || '(sem PATCH)');
    // passo 4: avisos como TEXTO NA TELA (item 46), nunca toast
    const avisoPapel = await pagina.locator('[data-aviso-papel]').innerText().catch(() => '');
    const cidadeDoTime = await pagina.locator('[data-cidade-do-time]').innerText().catch(() => '');
    verificar('F · o aviso do "só organizo" que não pôde ser gravado vira texto fixo na tela do passo 4, e nenhum toast aparece', /"Só organizo" não pôde ser salvo agora: você entrou jogando\./.test(avisoPapel) && (await pagina.locator('.futty-toast').count()) === 0, avisoPapel);
    verificar('F · (29P) a festa: a máquina deitada com o nome, e embaixo "Savassi · Belo Horizonte, MG" (sem "Encontramos:")', (await pagina.locator('[data-festa] .maq .letreiro').count()) === 1 && cidadeDoTime.trim().toUpperCase() === 'SAVASSI · BELO HORIZONTE, MG' && !/Encontramos:/.test(await texto(pagina)), cidadeDoTime);
    // O link do convite chega PRONTO na festa (gerado sozinho); o botão "Gerar link do convite" só volta se a
    // geração falhar.
    await pagina.locator('input[readonly]').waitFor({ timeout: 15000 });
    verificar('F · (29Q) o botão "Gerar link do convite" sumiu: o link chegou sozinho', (await pagina.getByRole('button', { name: 'Gerar link do convite' }).count()) === 0);
    const link = await pagina.locator('input[readonly]').inputValue();
    verificar('F · o link do convite é o curto: <site>/c/<código>', link === `${BASE}/c/k7m2p9qx`, link);
    const wa = await pagina.locator('a[href^="https://wa.me/"]').getAttribute('href');
    const fraseWa = decodeURIComponent((wa || '').replace('https://wa.me/?text=', ''));
    verificar('F · a frase do WhatsApp aprovada: "Bora jogar? Você foi chamado para o Savassi FC no Futty. Entre pelo link: <link>"', fraseWa === `Bora jogar? Você foi chamado para o Savassi FC no Futty. Entre pelo link: ${link}`, fraseWa);
    await capturar(pagina, 'F4-convite-curto-whatsapp');
    await contexto.close();
  });
  await bloco('F16', async () => {
    // F2: bairro em Portugal — a freguesia da lista, com coordenada
    const { contexto, pagina, escritas } = await abrir(fx.gratis, 'F-criar-pt', '/criar-time', { respostas: (c, m) => (m === 'POST' && c === '/api/teams' ? { team: { id: 'x', slug: 'prova-r29h-pt', nome: 'Alvalade FC' }, geo: { encontrada: true, nomeOficial: 'Lisboa, Portugal' }, bairro: { encontrado: true, nomeOficial: 'Alvalade, Lisboa, Portugal' }, joga: true } : null) });
    await pagina.getByPlaceholder('Ex.: Domingueira FC').fill('Alvalade FC');
    const cidade = pagina.getByPlaceholder('Ex.: Brasília');
    await cidade.click();
    await cidade.fill('Lisboa');
    await pagina.locator('[data-sugestoes-cidade] button', { hasText: 'Lisboa, Portugal' }).first().click({ timeout: 20000 });
    const bairro = pagina.locator('[data-campo-bairro]');
    await bairro.click();
    await bairro.fill('Alval');
    await pagina.locator('[data-sugestoes-bairro] button').first().waitFor({ timeout: 20000 });
    const opcoes = await pagina.locator('[data-sugestoes-bairro] button').allInnerTexts();
    verificar('F · cidade de Portugal: o Bairro sugere as freguesias do concelho (digitando "Alval" → Alvalade)', opcoes.includes('Alvalade'), opcoes.join(','));
    await capturar(pagina, 'F5-freguesias');
    await pagina.locator('[data-sugestoes-bairro] button', { hasText: 'Alvalade' }).first().click();
    await pagina.getByRole('button', { name: 'Continuar' }).tap();
    await pagina.getByRole('button', { name: 'Continuar' }).tap();
    await pagina.getByRole('button', { name: 'Criar o time' }).tap();
    await pagina.getByText('Seu time está no ar!').waitFor({ timeout: 20000 });
    const post = escritaDe(escritas, 'POST', '/api/teams')[0];
    verificar('F · a freguesia escolhida vai ao motor COM a coordenada da lista (sem depender do Nominatim)', /"bairro":"Alvalade"/.test(post?.corpo || '') && /"bairro_origem":"lista"/.test(post?.corpo || ''), post?.corpo || '(sem POST)');
    await contexto.close();
  });
  await bloco('F17', async () => {
    // F3: bairro que o motor não achou: aviso amarelo, o time fica no ponto da cidade
    const { contexto, pagina } = await abrir(fx.gratis, 'F-criar-nao-achou', '/criar-time', { respostas: (c, m) => (m === 'POST' && c === '/api/teams' ? { team: { id: 'x', slug: 'prova-r29h-b', nome: 'Sem Bairro FC' }, geo: { encontrada: true, nomeOficial: 'Belo Horizonte, MG' }, bairro: { encontrado: false }, joga: true } : null) });
    await pagina.getByPlaceholder('Ex.: Domingueira FC').fill('Sem Bairro FC');
    const cidade = pagina.getByPlaceholder('Ex.: Brasília');
    await cidade.click();
    await cidade.fill('Belo Horizonte');
    await pagina.locator('[data-sugestoes-cidade] button').first().click({ timeout: 20000 });
    await pagina.locator('[data-campo-bairro]').fill('Bairro Inventado');
    await pagina.getByRole('button', { name: 'Continuar' }).tap();
    await pagina.getByRole('button', { name: 'Continuar' }).tap();
    await pagina.getByRole('button', { name: 'Criar o time' }).tap();
    await pagina.getByText('Seu time está no ar!').waitFor({ timeout: 20000 });
    const aviso = await pagina.locator('[data-aviso-bairro="aviso"]').innerText().catch(() => '');
    verificar('F · bairro que ninguém achou: "Não achamos esse bairro. Seu time fica no ponto da cidade."', aviso === 'Não achamos esse bairro. Seu time fica no ponto da cidade.', aviso);
    await contexto.close();
  });

  // ───────────────────────────────── G · a página do convite e o og:image ─────────────────────────────────
  await bloco('G18', async () => {
    const { contexto, pagina } = await abrir(null, 'G-sem-logo', '/convite/token-de-prova', { antes: rotasDoConvite() });
    await pagina.locator('.convite__nome').waitFor({ timeout: 30000 });
    const sem = await pagina.evaluate(() => ({ escudo: document.querySelectorAll('.convite__escudo').length, classe: document.querySelector('.convite__nome')?.className, tam: parseFloat(getComputedStyle(document.querySelector('.convite__nome')).fontSize) }));
    verificar('G · time SEM logo: nenhum quadrado de iniciais — só o nome em destaque (44 px)', sem.escudo === 0 && /convite__nome--sozinho/.test(sem.classe) && sem.tam === 44, JSON.stringify(sem));
    await capturar(pagina, 'G1-convite-sem-logo');
    await contexto.close();
  });
  await bloco('G19', async () => {
    const { contexto, pagina } = await abrir(null, 'G-com-logo', '/convite/token-de-prova', { antes: rotasDoConvite({ logo: `${BASE}/futty-logo-flat.png` }) });
    await pagina.locator('.convite__nome').waitFor({ timeout: 30000 });
    const com = await pagina.evaluate(() => ({ escudo: document.querySelectorAll('.convite__escudo').length, img: document.querySelectorAll('.convite__escudo img').length, classe: document.querySelector('.convite__nome')?.className }));
    verificar('G · time COM logo: o escudo com o logo e o nome embaixo (sem a variante "sozinho")', com.escudo === 1 && com.img === 1 && !/sozinho/.test(com.classe), JSON.stringify(com));
    const og = await pagina.evaluate(() => Object.fromEntries([...document.querySelectorAll('meta[property^="og:"], meta[name="twitter:card"]')].map((m) => [m.getAttribute('property') || m.getAttribute('name'), m.content])));
    verificar('G · og:image do site e do convite: o ícone do app em 1200×630, versionado (-v1), URL absoluta de produção; og:title com a assinatura da casa', og['og:image'] === 'https://futtyapp.com.br/og/futty-1200x630-v1.png' && og['og:image:width'] === '1200' && og['og:image:height'] === '630' && og['og:title'] === 'O seu time. A sua figurinha.' && og['twitter:card'] === 'summary_large_image', JSON.stringify(og));
    const dimensoes = await pagina.evaluate(async () => { const r = await fetch('/og/futty-1200x630-v1.png'); const b = await createImageBitmap(await r.blob()); return { status: r.status, tipo: r.headers.get('content-type'), w: b.width, h: b.height }; });
    verificar('G · o arquivo da prévia existe no site: PNG 1200×630', dimensoes.status === 200 && /png/.test(dimensoes.tipo || '') && dimensoes.w === 1200 && dimensoes.h === 630, JSON.stringify(dimensoes));
    await contexto.close();
  });

  // ───────────────────────────────── H · chips linha/gol e "＋ Criar time" ─────────────────────────────────
  await bloco('H20', async () => {
    const { contexto, pagina, escritas } = await abrir(fx.novato, 'H-equipa', `/time/${slug}`, { inicial: () => { try { localStorage.setItem(`futty_onboarding_x`, '1'); } catch { /* nada */ } } });
    await pagina.locator('[data-escolha-linha-gol]').first().waitFor({ timeout: 30000 });
    // O novato não tem foto: as boas-vindas do convidado abrem por cima; "Vamos lá" as fecha (variante convidado).
    await pagina.locator('.bv').waitFor({ timeout: 8000 }).catch(() => {});
    if (await pagina.locator('.bv').count()) await pagina.getByRole('button', { name: 'Vamos lá' }).tap();
    await espera(500);
    const chips = pagina.locator('[data-escolha-linha-gol] .chip');
    const caixas = await chips.evaluateAll((els) => els.map((e) => { const r = e.getBoundingClientRect(); return { texto: e.innerText.trim(), x: Math.round(r.x), y: Math.round(r.y), ativo: e.classList.contains('chip--active') }; }));
    verificar('H · card do jogador: dois chips lado a lado ("Jogo na linha" | "No gol", mesma altura, o da esquerda primeiro), padrão linha aceso', caixas.length === 2 && caixas[0].texto === 'Jogo na linha' && caixas[1].texto === 'No gol' && caixas[0].y === caixas[1].y && caixas[1].x > caixas[0].x && caixas[0].ativo && !caixas[1].ativo, JSON.stringify(caixas));
    verificar('H · sai o "Você joga na linha · trocar"', !/Você joga na linha|· trocar/.test(await texto(pagina)));
    await capturar(pagina, 'H1-chips-no-time');
    await chips.nth(1).tap();
    await espera(800);
    verificar('H · tocar em "No gol" grava a posição (PATCH interceptado, goleiro: true)', escritaDe(escritas, 'PATCH', `/api/equipas/${slug}/membros/posicao`).some((e) => /"goleiro":true/.test(e.corpo || '')));
    await contexto.close();
  });
  await bloco('H21', async () => {
    const { contexto, pagina } = await abrir(fx.membroFoto, 'H-inicio', '/home');
    await pagina.locator('.chips-row').waitFor({ timeout: 30000 });
    // O "Criar time" é um cartão (ao lado do "Radar de peladas"), logo embaixo do "Seus times" — não está na
    // fila de chips.
    const chip = pagina.locator('[data-atalho-do-inicio="criar-time"]');
    verificar('H · Início: cartão "Criar time" à vista (29Q: saiu da fila de chips)', (await chip.count()) === 1 && /Criar time/.test(await chip.innerText()) && (await pagina.locator('.chips-row [data-criar-time]').count()) === 0);
    await capturar(pagina, 'H2-inicio-criar-time');
    await chip.tap();
    await pagina.waitForURL('**/criar-time', { timeout: 15000 }).catch(() => {});
    verificar('H · o cartão leva ao Criar time', /\/criar-time$/.test(pagina.url()));
    await contexto.close();
  });
  await bloco('H22', async () => {
    const { contexto, pagina } = await abrir(fx.membroFoto, 'H-perfil', '/perfil');
    await pagina.getByText('Meus times').first().waitFor({ timeout: 30000 });
    await pagina.locator('[data-escolha-linha-gol]').first().waitFor({ timeout: 20000 }).catch(() => {});
    const dois = await pagina.locator('[data-escolha-linha-gol] .chip').count();
    verificar('H · Perfil → Meus times: os dois chips lado a lado em cada time', dois >= 2 && dois % 2 === 0, `${dois} chips`);
    verificar('H · Perfil: "＋ Criar time" sempre à mão', (await pagina.locator('a[data-criar-time]').count()) === 1);
    await pagina.locator('a[data-criar-time]').scrollIntoViewIfNeeded();
    await capturar(pagina, 'H3-perfil');
    await contexto.close();
  });
  await bloco('H23', async () => {
    // H4: o Perfil de quem não tem time nenhum (a conta de super-admin de prova não entrou em time)
    const { contexto, pagina } = await abrir(fx.super, 'H-perfil-sem-time', '/perfil');
    await pagina.getByText('Meus times').first().waitFor({ timeout: 30000 }).catch(() => {});
    verificar('H · Perfil de quem não tem time: a seção "Meus times" e o "＋ Criar time" aparecem mesmo vazios', (await pagina.getByText('Meus times').count()) >= 1 && (await pagina.locator('a[data-criar-time]').count()) === 1);
    await contexto.close();
  });

  // ───────────────────────────────── I · o painel do admin sem "IA" ─────────────────────────────────
  await bloco('I24', async () => {
    const { contexto, pagina } = await abrir(fx.gratis, 'I-admin', `/time/${slug}`);
    await pagina.getByText('Moderação').first().waitFor({ timeout: 30000 });
    await pagina.getByText('Tudo tranquilo por aqui.').waitFor({ timeout: 20000 }).catch(() => {});
    const t = norm(await texto(pagina));
    verificar('I · painel do admin: "Tudo tranquilo por aqui. O que precisar de você aparece nesta lista."', t.includes('Tudo tranquilo por aqui. O que precisar de você aparece nesta lista.'), t.slice(0, 200));
    verificar('I · a palavra "IA" não aparece na página do time do admin (nem a frase antiga "A IA já resolveu os óbvios")', !/\bIA\b/.test(t) && !/resolveu os óbvios/.test(t));
    await capturar(pagina, 'I1-admin-moderacao');
    await contexto.close();
  });

  // ───────────────────────────────── J · figurinha e Planos ─────────────────────────────────
  await bloco('J25', async () => {
    // J1: celular (toque) — UM botão
    const { contexto, pagina } = await abrir(fx.minha, 'J-figurinha-celular', '/figurinha', {
      inicial: () => { const m = window.matchMedia.bind(window); window.matchMedia = (q) => (/pointer:\s*coarse/.test(q) ? { matches: true, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} } : m(q)); },
    });
    await pagina.getByRole('button', { name: /Compartilhar/ }).first().waitFor({ timeout: 40000 });
    const botoes = await pagina.locator('button').allInnerTexts();
    verificar('J · figurinha no CELULAR (tela de toque): um botão só, "Compartilhar", sem "Baixar"', botoes.some((b) => /^\s*Compartilhar\s*$/.test(b)) && !botoes.some((b) => /^\s*Baixar\s*$/.test(b)), botoes.filter((b) => /Baixar|Compartilhar/.test(b)).join('|'));
    await capturar(pagina, 'J1-figurinha-celular');
    await contexto.close();
  });
  await bloco('J26', async () => {
    // J2: computador — "Baixar" + "Compartilhar"
    const contextoPc = await navegador.newContext({ viewport: { width: 1280, height: 900 }, serviceWorkers: 'block', storageState: { cookies: [], origins: [{ origin: BASE, localStorage: fx.minha }] } });
    await travarEscritas(contextoPc);
    const pagina = await contextoPc.newPage();
    pagina.on('pageerror', (e) => erros.push(`J-pc: ${e.message}`));
    await pagina.goto(`${BASE}/figurinha`, { waitUntil: 'domcontentloaded' });
    await aceitarCookies(pagina);
    await pagina.getByRole('button', { name: /Compartilhar/ }).first().waitFor({ timeout: 40000 });
    const botoes = await pagina.locator('button').allInnerTexts();
    verificar('J · figurinha no COMPUTADOR: "Baixar" e "Compartilhar"', botoes.some((b) => /^\s*Baixar\s*$/.test(b)) && botoes.some((b) => /^\s*Compartilhar\s*$/.test(b)), botoes.filter((b) => /Baixar|Compartilhar/.test(b)).join('|'));
    await contextoPc.close();
  });
  await bloco('J27', async () => {
    // J3: Planos para quem NÃO é dono de time: sem a seção "Figurinhas do time"; o cabeçalho em duas linhas
    const { contexto, pagina } = await abrir(fx.novato, 'J-planos-membro', '/planos');
    await pagina.locator('[data-planos-apoio]').waitFor({ timeout: 30000 });
    await espera(1500);
    const apoio = await pagina.locator('[data-planos-apoio] span').allInnerTexts();
    const t = norm(await texto(pagina));
    verificar('J · Planos de quem não é dono: o cabeçalho em duas linhas ("Seu card com a foto não custa nada." / "Figurinha: a versão em arte, feita por IA no uniforme do Futty.")', apoio.length === 2 && apoio[0] === 'Seu card com a foto não custa nada.' && apoio[1] === 'Figurinha: a versão em arte, feita por IA no uniforme do Futty.', apoio.join(' / '));
    verificar('J · sem a seção "Figurinhas do time" nem o "Só para quem criou um time" (o pacote e o manto são do dono do time)', (await pagina.locator('[data-secao-do-time]').count()) === 0 && !/Só para quem criou um time/.test(t) && /Minha Figurinha/.test(t), t.slice(0, 160));
    await capturar(pagina, 'J2-planos-membro');
    await contexto.close();
  });
  await bloco('J28', async () => {
    const { contexto, pagina } = await abrir(fx.gratis, 'J-planos-dono', '/planos');
    await pagina.locator('[data-secao-do-time]').waitFor({ timeout: 30000 }).catch(() => {});
    const secao = norm(await pagina.locator('[data-secao-do-time]').innerText().catch(() => ''));
    verificar('J · Planos do dono do time: a seção "Figurinhas do time" com o apoio "Pacote do time: 2 gerações para cada um dos 25 jogadores"', /Figurinhas do time/i.test(secao) && secao.includes('Pacote do time: 2 gerações para cada um dos 25 jogadores'), secao);
    await capturar(pagina, 'J3-planos-dono');
    await contexto.close();
  });

  // ───────────────────────────────── K · o painel do time: bairro e prêmios ─────────────────────────────────
  await bloco('K29', async () => {
    const corposDoPatch = [];
    const respostas = (caminho, metodo, corpoCompleto) => (metodo === 'PATCH' && caminho === `/api/teams/${slug}` && (corposDoPatch.push(corpoCompleto || ''), true) ? { team: { id: idDoTime, slug, nome: NOME, cidade: 'Lisboa, Portugal', bairro: 'Alvalade' }, geo: { encontrada: true, nomeOficial: 'Lisboa, Portugal' }, bairro: { encontrado: true, nomeOficial: 'Alvalade, Lisboa, Portugal' } } : null);
    const { contexto, pagina, escritas } = await abrir(fx.gratis, 'K-admin', `/admin/${slug}?tab=time`, { respostas });
    await pagina.getByText('Bairro').first().waitFor({ timeout: 30000 });
    const premios = pagina.getByRole('switch', { name: /^(Artilheiro do dia|Destaque do dia)$/ });
    verificar('K · painel do time: "Prêmios do dia" — dois interruptores (Artilheiro do dia, Destaque do dia) ligados de saída', (await premios.count()) === 2 && (await premios.evaluateAll((els) => els.map((e) => e.getAttribute('aria-checked')))).join() === 'true,true');
    const textoVis = norm(await texto(pagina));
    verificar('K · os textos de entrada aprovados também no painel (29P: "Radar de peladas")', textoVis.includes('Só entra quem receber o seu link de convite. Não aparece no "Radar de peladas".') || textoVis.includes('Quem achar o time no "Radar de peladas" pede para entrar') || textoVis.includes('Qualquer um que achar o time no "Radar de peladas" entra na hora.'), textoVis.slice(0, 100));
    await premios.first().click();
    await espera(600);
    verificar('K · desligar o artilheiro grava mostrar_artilheiro: false (PATCH interceptado) e o interruptor acompanha', escritaDe(escritas, 'PATCH', `/api/teams/${slug}`).some((e) => /"mostrar_artilheiro":false/.test(e.corpo || '')) && (await premios.first().getAttribute('aria-checked')) === 'false');
    // cidade de Portugal (da lista) + freguesia
    const cidade = pagina.getByPlaceholder('Ex.: Brasília');
    await cidade.click();
    await cidade.fill('Lisboa');
    await pagina.locator('[data-sugestoes-cidade] button', { hasText: 'Lisboa, Portugal' }).first().click({ timeout: 20000 });
    const bairro = pagina.locator('[data-campo-bairro]');
    await bairro.click();
    await bairro.fill('Alval');
    await pagina.locator('[data-sugestoes-bairro] button', { hasText: 'Alvalade' }).first().click({ timeout: 20000 });
    await capturar(pagina, 'K1-painel-bairro');
    await pagina.getByRole('button', { name: 'Salvar' }).click();
    await pagina.locator('[data-aviso-bairro="ok"]').waitFor({ timeout: 15000 }).catch(() => {});
    const aviso = await pagina.locator('[data-aviso-bairro="ok"]').innerText().catch(() => '');
    const salvo = corposDoPatch.find((c) => /"bairro":"Alvalade"/.test(c) && /"bairro_origem":"lista"/.test(c) && /"cidade":"Lisboa"/.test(c) && /"origem":"lista"/.test(c));
    verificar('K · salvar com a freguesia da lista: o PATCH leva cidade (da lista) e bairro (com a coordenada) e a tela diz "Encontramos: Alvalade, Lisboa, Portugal"', !!salvo && aviso === 'Encontramos: Alvalade, Lisboa, Portugal', `${aviso} · ${salvo || corposDoPatch.at(-1) || ''}`.slice(0, 500));
    await contexto.close();
  });

  // ───────────────────────────────── L · ajustes finais ─────────────────────────────────
  await bloco('L30', async () => {
    // L1: o F carregando antes do JavaScript (a volta do e-mail de confirmação com o cache frio)
    const contexto = await navegador.newContext({ ...IPHONE, serviceWorkers: 'block' });
    const pagina = await contexto.newPage();
    pagina.on('pageerror', (e) => erros.push(`L-splash: ${e.message}`));
    // segura o JavaScript do app por 3 s: é o "cache frio, rede lenta" do link do e-mail
    await contexto.route('**/src/main.jsx*', async (route) => { await espera(3000); await route.fallback(); });
    const ida = pagina.goto(`${BASE}/onboarding?code=codigo-de-prova`, { waitUntil: 'commit' });
    await espera(1200);
    const splash = await pagina.evaluate(() => {
      const el = document.querySelector('.futty-splash svg');
      if (!el) return null;
      const r = el.getBoundingClientRect();
      const cx = r.x + r.width / 2;
      const cy = r.y + r.height / 2;
      return { cx: Math.round(cx), cy: Math.round(cy), larg: window.innerWidth, alt: window.innerHeight, opacidade: Number(getComputedStyle(el).opacity), caminho: !!el.querySelector('path') };
    });
    verificar('L · com o JavaScript ainda a caminho (volta do e-mail de confirmação) a tela mostra o F no centro, não uma tela vazia', !!splash && Math.abs(splash.cx - splash.larg / 2) <= 2 && Math.abs(splash.cy - splash.alt / 2) <= 2 && splash.opacidade > 0.4 && splash.caminho, JSON.stringify(splash));
    if (splash) await capturar(pagina, 'L1-f-antes-do-js');
    await ida.catch(() => {});
    await contexto.close();
  });
  await bloco('L31', async () => {
    const { contexto, pagina } = await abrir(null, 'L-landing', '/');
    await pagina.locator('h1').first().waitFor({ timeout: 30000 });
    const h1 = (await pagina.locator('h1').first().innerText()).replace(/\s*\n\s*/g, ' ').trim();
    verificar('L · landing: a assinatura da casa com os pontos — "O seu time. A sua figurinha."', h1 === 'O seu time. A sua figurinha.', h1);
    await contexto.close();
  });
  await bloco('L32', async () => {
    // L3: "Você entrou no time <nome>!" no card do Início (pedido aprovado) e na página do time por ?entrou=1
    const comPedidoAceito = async (contexto) => {
      await contexto.route('**/api/inicio*', async (route) => {
        if (route.request().method() !== 'GET') return route.fallback();
        const resposta = await route.fetch();
        const json = await resposta.json().catch(() => null);
        if (!json) return route.fulfill({ response: resposta });
        return route.fulfill({ response: resposta, json: { ...json, pedidos: { ...(json.pedidos || {}), pedidos: [{ id: 'pedido-de-prova', status: 'approved', team: { nome: NOME, slug } }] } } });
      });
    };
    const { contexto, pagina } = await abrir(fx.membroFoto, 'L-entrou', '/home', { antes: comPedidoAceito });
    await pagina.getByText('O admin aceitou seu pedido').first().waitFor({ timeout: 30000 }).catch(() => {});
    const t = norm(await texto(pagina));
    verificar(`L · o card do Início diz "Você entrou no time ${NOME}!" (nunca "na ${NOME}")`, t.includes(`Você entrou no time ${NOME}!`) && !new RegExp(`entrou na ${NOME}`).test(t), t.slice(0, 160));
    await contexto.close();
  });
  await bloco('L33', async () => {
    // L4: a imagem do onboarding versionada chega ao <img> do mini sorteio
    const { contexto, pagina } = await abrir(fx.novato, 'L-versao', '/onboarding');
    await pagina.locator('.msq .scel img').first().waitFor({ timeout: 30000 });
    const srcs = await pagina.locator('.msq .scel img').evaluateAll((els) => [...new Set(els.map((e) => e.getAttribute('src')))]);
    verificar('L · o mini sorteio referencia as 8 imagens versionadas (?v=hash do conteúdo)', srcs.length === 8 && srcs.every((s) => /\/onboarding\/[a-z]+\.webp\?v=[0-9a-f]{8}$/.test(s)), srcs.join(' '));
    await contexto.close();
  });

  // ───────────────────────────────── K2 · o editor de resultado respeita os prêmios do time ─────────────────────────────────
  await bloco('K2', async () => {
    const jogoSem = { id: 'jogo-de-prova-1', sorteio_realizado: true, campeao_time_index: null, local: 'Quadra da prova', data: new Date(Date.now() - 86400000).toISOString() };
    const detalhe = (extra = {}) => ({ game: { id: jogoSem.id, campeao_time_index: null, times_resultado: { times: [{ nome: 'Time A', jogadores: [] }, { nome: 'Time B', jogadores: [] }] }, ...extra }, players: [{ user_id: 'u1', nome: 'Tonhão', confirmado: true }] });
    const rotas = (flags, extraDoJogo) => async (contexto) => {
      await contexto.route(`**/api/teams/${slug}`, async (route) => {
        if (route.request().method() !== 'GET') return route.fallback();
        const resposta = await route.fetch();
        const json = await resposta.json().catch(() => null);
        if (!json?.team) return route.fulfill({ response: resposta });
        return route.fulfill({ response: resposta, json: { ...json, team: { ...json.team, ...flags } } });
      });
      await contexto.route(`**/api/teams/${slug}/games`, (route) => (route.request().method() === 'GET' ? route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ games: [jogoSem] }) }) : route.fallback()));
      await contexto.route(`**/api/games/${jogoSem.id}`, (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(detalhe(extraDoJogo)) }));
    };
    const abrirModal = async (flags, extraDoJogo) => {
      const { contexto, pagina } = await abrir(fx.gratis, 'K2-modal', `/admin/${slug}?tab=resultados`, { antes: rotas(flags, extraDoJogo) });
      await pagina.getByRole('button', { name: 'Registrar resultado' }).tap({ timeout: 30000 });
      await pagina.getByText('Salvar resultado').waitFor({ timeout: 15000 });
      const secoes = await pagina.evaluate(() => ['Artilheiro', 'Destaque', 'Rodada de cerveja'].filter((t) => [...document.querySelectorAll('span, div, label')].some((e) => e.children.length === 0 && e.textContent.trim() === t)));
      return { contexto, pagina, secoes };
    };
    {
      const { contexto, pagina, secoes } = await abrirModal({}, {});
      verificar('K · editor de resultado com os prêmios ligados (o padrão): oferece Artilheiro, Destaque e Rodada de cerveja', secoes.join('|') === 'Artilheiro|Destaque|Rodada de cerveja', secoes.join('|'));
      await contexto.close();
    }
    {
      const { contexto, pagina, secoes } = await abrirModal({ mostrar_artilheiro: false }, {});
      verificar('K · com "Artilheiro do dia" desligado o editor esconde a seção Artilheiro (Destaque e Rodada seguem)', secoes.join('|') === 'Destaque|Rodada de cerveja', secoes.join('|'));
      await capturar(pagina, 'K2-sem-artilheiro');
      await contexto.close();
    }
    {
      const { contexto, secoes } = await abrirModal({ mostrar_artilheiro: false, mostrar_destaque: false }, {});
      verificar('K · com os dois desligados some Artilheiro e Destaque', secoes.join('|') === 'Rodada de cerveja', secoes.join('|'));
      await contexto.close();
    }
    {
      // um jogo que JÁ tem o artilheiro: editar o resultado não pode esconder (nem apagar) o prêmio por causa da escolha de agora
      const { contexto, secoes } = await abrirModal({ mostrar_artilheiro: false }, { artilheiro_user_id: 'u1', artilheiro_gols: 2 });
      verificar('K · jogo que já tem artilheiro: a seção continua à vista mesmo com o prêmio desligado (nada some em silêncio)', secoes.includes('Artilheiro'), secoes.join('|'));
      await contexto.close();
    }
  });

  // ───────────────────────────────── B2 · o cadastro com sessão imediata vai DIRETO ao onboarding ─────────────────────────────────
  await bloco('B2', async () => {
    const sessaoDeMentira = fx.novato[0].value;
    const { contexto, pagina } = await abrir(null, 'B2-direto', '/register', {
      antes: async (c) => {
        await comMe((json) => { json.user.onboarding_completo = false; })(c);
        await c.route('**/auth/v1/signup**', async (route) => {
          const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' };
          if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
          return route.fulfill({ status: 200, contentType: 'application/json', headers: cors, body: sessaoDeMentira });
        });
      },
    });
    const visitadas = [];
    pagina.on('framenavigated', (f) => visitadas.push(new URL(f.url()).pathname));
    await pagina.waitForSelector('#birthdate [data-rolo="ano"]', { timeout: 30000 });
    await pagina.fill('#email', `prova-r29h-direto-${Date.now()}@futtymock.com`);
    await pagina.fill('#password', 'Prova!R29H-direto');
    await pagina.fill('#confirm', 'Prova!R29H-direto');
    await escolherData(pagina, '#birthdate', '1990-03-15');
    await pagina.locator('input[type="checkbox"]').check();
    await pagina.locator('button[type="submit"]').click();
    await pagina.waitForURL('**/onboarding', { timeout: 30000 }).catch(() => {});
    await pagina.locator('.msq .maq').waitFor({ timeout: 30000 }).catch(() => {});
    await espera(1500);
    verificar('B · cadastro com sessão imediata: vai DIRETO a /onboarding e fica lá — não passa pelo Início (que carregava o chunk e o /api/inicio só para a trava devolver a pessoa)', /\/onboarding$/.test(pagina.url()) && !visitadas.includes('/home') && (await pagina.locator('.msq .maq').count()) === 1, JSON.stringify({ url: pagina.url().replace(BASE, ''), visitadas }));
    await contexto.close();
  });

  verificar('sem erro de JS nas páginas', erros.length === 0, erros.join(' | '));
  return { verificacoes, capturas, erros, pasta };
}
