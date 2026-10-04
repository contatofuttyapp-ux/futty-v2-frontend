// Prova no navegador (Rodada 29I, bloco 3 — "admin não é um lugar"): a página do time de verdade, num Chromium, com o motor de mentira.
//   · admin: abas Jogos · Elenco · Ajustes (Ajustes com o selo ADMIN); trocar de aba muda o endereço sem empilhar histórico; o jogo
//     passado sem resultado tem "Lançar resultado"; um toque no nome do membro abre o que o admin faz com ele (sem "⋯"); Ajustes termina
//     no cartão "Nova temporada de notas" (era AÇÕES DEFINITIVAS) e mostra o escudo em 84, 36 e 20 px; "Voltar" volta para onde a pessoa estava;
//   · jogador: duas abas, sem Ajustes (nem pelo endereço);
//   · o escudo: os seis padrões nos três tamanhos das bancadas do dono, com a régua das iniciais;
//   · o card "Seu time" do Início: uma linha por pendência, os quatro atalhos com nome e o "Tudo tranquilo por aqui.".
export const nome = 'Página do time (abas, Voltar pelo histórico, membro por toque, escudo, card "Seu time")';

const DIA = 86400000;

function motor(papel, { comLogo = false, doisFuturos = false } = {}) {
  const agora = Date.now();
  const team = {
    id: 'T1', slug: 'varzea-fc', nome: 'Várzea FC', cor: 'vinho', escudo_cor2: 'ouro', escudo_padrao: 'faixa', role: papel, joga: true,
    fuso: 'America/Sao_Paulo', cidade: 'São Paulo', jogadores_por_time: 6, mostrar_gols: true, modo_visibilidade: 'privado',
    logo_url: comLogo ? 'https://x/logos/T1.png?v=1' : null,
  };
  const members = [
    { id: 'U1', nome: 'Tonhão', role: 'admin', joga: true, goleiro: false },
    { id: 'U2', nome: 'Zeca', role: 'member', joga: true, goleiro: true },
  ];
  const games = [
    { id: 'g-futuro', data: new Date(agora + 3 * DIA).toISOString(), local: 'Campo da Vila', status: 'agendado', confirmados: 4, sorteio_realizado: false },
    { id: 'g-passado', data: new Date(agora - 2 * DIA).toISOString(), local: 'Quadra 2', status: 'terminado', confirmados: 10, sorteio_realizado: true, campeao_time_index: null, resultado_nivel: 0 },
    // 29R (achado 147): o 2º jogo futuro, para provar que "abrir presença" abre no jogo CERTO. Tem o id que o card "Seu time" da bancada aponta (g2).
    ...(doisFuturos ? [{ id: 'g2', data: new Date(agora + 5 * DIA).toISOString(), local: 'Arena Norte', status: 'agendado', confirmados: 0, sorteio_realizado: false }] : []),
  ];
  const membro = (id, nome, role, goleiro) => ({ user_id: id, nome, role, goleiro, email: `${nome.toLowerCase()}@futtymock.com`, pode_postar: true, visivel_ranking: true, ativo: true, presencas_recentes: [] });
  const respostas = {
    '/api/teams/varzea-fc': { team, members },
    '/api/teams/varzea-fc/games': { team, games },
    '/api/teams/varzea-fc/pedidos': { pedidos: [] },
    '/api/teams/varzea-fc/stats': { stats: { total_jogos: 12, total_membros: 2, media_confirmacoes: 9.5 } },
    '/api/teams/varzea-fc/membros': { membros: [membro('U1', 'Tonhão', 'admin', false), membro('U2', 'Zeca', 'member', true)] },
    '/api/teams/varzea-fc/convites': { convites: [] },
    '/api/push/preferencias': { preferencias: { jogos: true, pedidos: true, figurinha: true, resenha: true }, admin: true, salvavel: true },
    '/api/jogos/g-futuro/rsvp': { rsvp_aberto: false, rsvp_fechado: false, confirmados: [], recusados: [], pendentes: [], fuso: 'America/Sao_Paulo' },
    '/api/jogos/g2/rsvp': { rsvp_aberto: false, rsvp_fechado: false, confirmados: [], recusados: [], pendentes: [], fuso: 'America/Sao_Paulo' },
    '/api/feed/denuncias': { denuncias: [] },
    '/api/denuncias/fila': { fila: [] },
    '/api/teams/varzea-fc/logo': { ok: true },
    // 29S-B: o ResultadoModal (Ajustes → Jogos → "Lançar resultado") saiu do AdminPanel para components/ e segue valendo: carrega o jogo passado e os confirmados.
    '/api/games/g-passado': {
      game: { id: 'g-passado', times_resultado: { times: [{ nome: 'Time Ouro', jogadores: [{ user_id: 'U1', nome: 'Tonhão' }] }, { nome: 'Time Roxo', jogadores: [{ user_id: 'U2', nome: 'Zeca' }] }] }, campeao_time_index: null },
      players: [{ user_id: 'U1', nome: 'Tonhão', confirmado: true }, { user_id: 'U2', nome: 'Zeca', confirmado: true }],
    },
  };
  return (pathname) => respostas[pathname] ?? {};
}

// O motor de mentira em /api/**; o Vite da prova passa; qualquer outra coisa (Supabase, fontes) nem sai da máquina.
function rotear(responder, base) {
  const origem = new URL(base).host;
  return (route) => {
    const u = new URL(route.request().url());
    if (u.pathname.startsWith('/api/')) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(responder(u.pathname)) });
    if (u.host === origem) return route.continue();
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  };
}

async function abrir(navegador, base, papel, opcoesMotor) {
  const ctx = await navegador.newContext({ viewport: { width: 390, height: 800 } });
  const page = await ctx.newPage();
  const erros = [];
  page.on('pageerror', (e) => erros.push(e.message));
  await page.route('**/*', rotear(motor(papel, opcoesMotor), base));
  await page.goto(`${base}/scripts/provas/time-admin.html`, { waitUntil: 'domcontentloaded' });
  return { ctx, page, erros };
}
const irPara = (page, caminho) => page.evaluate((c) => { window.history.pushState({}, '', c); window.dispatchEvent(new PopStateEvent('popstate')); }, caminho);

export async function rodar({ navegador, base, t }) {
  // ── admin ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  {
    const { ctx, page, erros } = await abrir(navegador, base, 'admin');
    await page.locator('[data-ir]').click();
    await page.locator('[role="tab"]').first().waitFor({ timeout: 15000 });
    const abas = (await page.locator('[role="tab"]').allInnerTexts()).map((s) => s.replace(/\s+/g, ' ').trim());
    t('admin vê três abas: Jogos · Elenco · Ajustes', abas.length === 3 && /^jogos$/i.test(abas[0]) && /^elenco$/i.test(abas[1]) && /^ajustes/i.test(abas[2]), abas.join(' | '));
    t('a aba Ajustes leva o selo ADMIN', (await page.locator('[data-aba="ajustes"] [data-selo-admin]').count()) === 1);
    t('Jogos é a aba de abertura', (await page.locator('[data-aba="jogos"]').getAttribute('aria-selected')) === 'true');

    await page.locator('[data-jogos-admin]').waitFor({ timeout: 15000 });
    const cta = page.locator('[data-jogos-admin] a.cta-gold');
    t('Jogos: "+ Novo jogo" é o único dourado da aba', (await cta.count()) === 1 && /novo jogo/i.test(await cta.innerText()));
    t('Jogos: "Criar jogos recorrentes" e "Criar campeonato" como secundários no topo',
      (await page.getByRole('button', { name: 'Criar jogos recorrentes' }).count()) === 1 && (await page.getByRole('button', { name: 'Criar campeonato' }).count()) === 1);
    await page.locator('[data-lancar-resultado]').waitFor({ timeout: 15000 });
    t('Jogos: o jogo passado sem resultado mostra "Lançar resultado"', (await page.locator('[data-lancar-resultado]').count()) === 1);

    // 29S-B: o ResultadoModal (agora em components/) abre do mesmo botão, com as mesmas seções, e salva no resultado do feed como sempre.
    const patches = [];
    page.on('request', (r) => { if (r.method() === 'PATCH') patches.push({ url: new URL(r.url()).pathname, corpo: JSON.parse(r.postData() || '{}') }); });
    await page.locator('[data-lancar-resultado]').click();
    await page.locator('.modal-card').waitFor({ timeout: 8000 });
    await page.getByText('Time Roxo', { exact: true }).waitFor({ timeout: 8000 });
    const modal = (await page.locator('.modal-card').innerText()).toLowerCase();
    t('"Lançar resultado" abre o modal de sempre: Campeão (com os times do jogo), Artilheiro, Destaque e Rodada de cerveja, com as fotos', /^resultado:/.test(modal) && modal.includes('campeão') && modal.includes('time ouro') && modal.includes('artilheiro') && modal.includes('destaque') && modal.includes('rodada de cerveja') && modal.includes('foto do campeão') && !modal.includes('do dia'), modal.slice(0, 160).replace(/s+/g, ' '));
    const salvar = page.locator('.modal-card').getByRole('button', { name: 'Salvar resultado' });
    t('...com "Salvar resultado" apagado até escolher o campeão ("Escolha o time campeão para salvar.")', (await salvar.isDisabled()) && modal.includes('escolha o time campeão para salvar.'));
    await page.getByText('Time Roxo', { exact: true }).click();
    await page.locator('.modal-card label', { hasText: 'Artilheiro' }).locator('input[type="checkbox"]').check();
    await page.locator('.modal-card select').first().selectOption({ label: 'Zeca' });
    await salvar.click();
    await page.locator('.modal-card').waitFor({ state: 'detached', timeout: 8000 });
    const feed = patches.find((x) => x.url === '/api/feed/games/g-passado/resultado');
    t('Salvar resultado manda o PATCH do feed com o campeão (Time Roxo = 1) e o artilheiro, no mesmo corpo de antes (o que está desligado vai como null)', !!feed && feed.corpo.campeao_time_index === 1 && feed.corpo.artilheiro_user_id === 'U2' && feed.corpo.artilheiro_gols === 1 && feed.corpo.destaque_user_id === null && feed.corpo.rodada_user_id === null, JSON.stringify(patches));

    const historicoAntes = await page.evaluate(() => window.history.length);
    await page.locator('[data-aba="elenco"]').click();
    await page.waitForURL(/aba=elenco/);
    t('trocar de aba muda o endereço (?aba=elenco) sem empilhar histórico', (await page.evaluate(() => window.history.length)) === historicoAntes);
    await page.locator('[data-elenco-admin]').waitFor({ timeout: 15000 });
    t('Elenco: "Convidar" é o dourado da aba', (await page.locator('[data-convidar].cta-gold').count()) === 1);
    t('Elenco: os 3 números no topo', (await page.locator('[data-tres-numeros] > div').count()) === 3);
    t('nenhum menu "⋯" na página', !(await page.locator('body').innerText()).includes('⋯'));
    await page.locator('[data-membro="U2"]').click();
    await page.locator('[data-painel-membro]').waitFor({ timeout: 5000 });
    const painel = await page.locator('[data-painel-membro]').innerText();
    t('um toque no nome abre o que o admin faz com o membro', /Tornar admin/.test(painel) && /Remover do time/.test(painel) && /Mandar mensagem/.test(painel), painel.replace(/\s+/g, ' '));
    await page.mouse.click(195, 20); // o véu, por cima da folha
    await page.locator('[data-painel-membro]').waitFor({ state: 'detached', timeout: 5000 });
    t('o painel do membro fecha tocando fora', (await page.locator('[data-painel-membro]').count()) === 0);

    await page.locator('[data-aba="ajustes"]').click();
    await page.locator('[data-ajustes-do-time]').waitFor({ timeout: 15000 });
    await page.locator('[data-previa-escudo]').waitFor({ timeout: 5000 });
    const ajustes = await page.locator('[data-ajustes-do-time]').innerText();
    t('Ajustes: O time, Admins, Notificações do admin, Avisar o time, Denúncias e, no fim, o cartão "Nova temporada de notas" (29R; era AÇÕES DEFINITIVAS)',
      /o time[\s\S]*admins[\s\S]*notificações do admin[\s\S]*avisar o time[\s\S]*denúncias[\s\S]*notas do time[\s\S]*nova temporada de notas/i.test(ajustes), ajustes.slice(0, 160).replace(/\s+/g, ' '));
    t('Ajustes: "Nova temporada de notas" (era "Pedir para votar de novo") mora no cartão próprio; "Ações definitivas" saiu',
      /nova temporada de notas/i.test(ajustes) && !/ações definitivas|pedir para votar de novo/i.test(ajustes));
    t('Ajustes: nenhum "Zona de perigo" e nenhuma "Cor de fundo do avatar"', !/Zona de perigo|Cor de fundo do avatar/i.test(ajustes));
    const tamanhos = await page.locator('[data-previa-escudo] [data-escudo]').evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().width)));
    t('Escudo do time: prévia ao vivo em 84, 36 e 20 px', JSON.stringify(tamanhos) === '[84,36,20]', JSON.stringify(tamanhos));
    t('Ajustes: "Jogadores por time" (o padrão do time) com o valor do time', /Jogadores por time/.test(ajustes) && (await page.locator('[data-padrao-por-time]').innerText()).includes('6'));
    const largura = await page.evaluate(() => document.documentElement.scrollWidth);
    t('nada vaza para o lado no celular (390 px)', largura <= 390, String(largura));

    await page.getByRole('button', { name: 'Voltar' }).first().click();
    await page.locator('[data-casa]').waitFor({ timeout: 5000 });
    t('"Voltar" volta para onde a pessoa estava (o histórico), não para um lugar fixo', (await page.locator('[data-casa]').count()) === 1);
    t('a página do admin roda sem exceção', erros.length === 0, erros.slice(0, 2).join(' | '));
    await ctx.close();
  }

  // ── jogador ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  {
    const { ctx, page, erros } = await abrir(navegador, base, 'member');
    await irPara(page, '/time/varzea-fc?aba=ajustes');
    await page.locator('[role="tab"]').first().waitFor({ timeout: 15000 });
    const abas = (await page.locator('[role="tab"]').allInnerTexts()).map((s) => s.trim());
    t('jogador vê duas abas (sem Ajustes)', abas.length === 2 && !abas.some((a) => /ajustes/i.test(a)), abas.join(' | '));
    t('jogador que abre ?aba=ajustes cai em Jogos', (await page.locator('[data-aba="jogos"]').getAttribute('aria-selected')) === 'true');
    t('nada do admin para o jogador (sem Nova temporada de notas, sem "Novo jogo")', !/Ações definitivas|Nova temporada de notas|Novo jogo/i.test(await page.locator('body').innerText()));
    t('a página do jogador roda sem exceção', erros.length === 0, erros.slice(0, 2).join(' | '));
    await ctx.close();
  }

  // ── o escudo: 6 padrões × 3 tamanhos ──────────────────────────────────────────────────────────────────────────────────────────────
  {
    const { ctx, page, erros } = await abrir(navegador, base, 'member');
    await irPara(page, '/escudos');
    await page.locator('[data-escudos]').waitFor({ timeout: 10000 });
    const medidas = await page.locator('[data-padrao]').evaluateAll((linhas) => linhas.map((l) => ({
      padrao: l.getAttribute('data-padrao'),
      escudos: [...l.querySelectorAll('[data-escudo]')].map((e) => {
        const r = e.getBoundingClientRect();
        const cs = getComputedStyle(e);
        const letra = e.querySelector('span');
        return { w: Math.round(r.width), h: Math.round(r.height), raio: cs.borderRadius, fundo: cs.backgroundImage, camada: e.querySelector('i') ? getComputedStyle(e.querySelector('i')).backgroundImage : null, letra: letra ? parseFloat(getComputedStyle(letra.parentElement).fontSize) : 0, texto: letra?.textContent };
      }),
    })));
    t('os seis padrões aprovados, nesta ordem', medidas.map((m) => m.padrao).join(',') === 'solido,faixa,metade,listras,barra,aro', medidas.map((m) => m.padrao).join(','));
    t('cada padrão em 84, 36 e 20 px, redondo', medidas.every((m) => JSON.stringify(m.escudos.map((e) => [e.w, e.h])) === '[[84,84],[36,36],[20,20]]' && m.escudos.every((e) => e.raio === '50%')), JSON.stringify(medidas[0].escudos.map((e) => [e.w, e.h, e.raio])));
    t('as iniciais na régua das bancadas: 30, 14 e 8 px, e legíveis ("VF")', medidas.every((m) => JSON.stringify(m.escudos.map((e) => e.letra)) === '[30,14,8]' && m.escudos.every((e) => e.texto === 'VF')), JSON.stringify(medidas[0].escudos.map((e) => e.letra)));
    const por = Object.fromEntries(medidas.map((m) => [m.padrao, m.escudos[0]]));
    t('faixa e barra: a segunda cor numa camada por cima; aro: o centro por cima do fundo na segunda cor',
      /linear-gradient/.test(por.faixa.camada || '') && /linear-gradient/.test(por.barra.camada || '') && /radial-gradient/.test(por.aro.camada || ''));
    t('metade e listras: as duas cores no próprio fundo; sólido: uma cor só',
      /linear-gradient/.test(por.metade.fundo) && /repeating-linear-gradient/.test(por.listras.fundo) && por.solido.fundo === 'none' && por.solido.camada === null);
    t('o escudo roda sem exceção', erros.length === 0, erros.slice(0, 2).join(' | '));
    await ctx.close();
  }

  // ── o card "Seu time" do Início ───────────────────────────────────────────────────────────────────────────────────────────────────
  {
    const { ctx, page, erros } = await abrir(navegador, base, 'member');
    await irPara(page, '/seu-time');
    await page.locator('[data-com-pendencias] [data-seu-time]').waitFor({ timeout: 10000 });
    const linhas = await page.locator('[data-com-pendencias] [data-pendencia]').allInnerTexts();
    t('uma linha por pendência: pedido, presença, resultado, denúncia', linhas.length === 4 && /2 pedidos de entrada/.test(linhas[0]) && /presença ainda não aberta/.test(linhas[1]) && /por lançar/.test(linhas[2]) && /1 denúncia/.test(linhas[3]), linhas.join(' | '));
    const atalhos = await page.locator('[data-com-pendencias] [data-atalho]').evaluateAll((els) => els.map((e) => [e.getAttribute('data-atalho'), e.getAttribute('href')]));
    t('os quatro atalhos com nome: Novo jogo · Sortear · Convidar · Ajustes', atalhos.map((a) => a[0]).join(' · ') === 'Novo jogo · Sortear · Convidar · Ajustes', JSON.stringify(atalhos));
    t('"Sortear" vai ao próximo jogo do time; "Convidar" abre o convite no Elenco', atalhos[1][1] === '/time/varzea-fc/jogo/g2' && atalhos[2][1] === '/time/varzea-fc?aba=elenco&convidar=1', JSON.stringify(atalhos));
    const semNada = await page.locator('[data-sem-pendencias]').innerText();
    t('sem pendência o card fica compacto: "Tudo tranquilo por aqui."', /Tudo tranquilo por aqui\./.test(semNada) && (await page.locator('[data-sem-pendencias] [data-pendencia]').count()) === 0);
    t('o card roda sem exceção', erros.length === 0, erros.slice(0, 2).join(' | '));
    await ctx.close();
  }

  // ── achado 124 (29K): fechar um diálogo não pode deixar resíduo na página ────────────────────────────────────────────────────────
  {
    const { ctx, page, erros } = await abrir(navegador, base, 'admin', { comLogo: true });
    await irPara(page, '/time/varzea-fc?aba=ajustes');
    await page.locator('[data-ajustes-do-time]').waitFor({ timeout: 15000 });
    const alturaAntes = await page.evaluate(() => document.documentElement.scrollHeight);

    // Abrir e CANCELAR: nada muda de dado nenhum — a altura tem de voltar ao byte.
    await page.locator('[data-ajustes-do-time] button:has-text("Remover logo")').click();
    await page.locator('.modal-card').waitFor({ timeout: 5000 });
    await page.getByRole('button', { name: 'Cancelar' }).click();
    await page.locator('.modal-card').waitFor({ state: 'detached', timeout: 5000 });
    const alturaCancelar = await page.evaluate(() => document.documentElement.scrollHeight);
    t('cancelar o diálogo de "Remover logo" não deixa resíduo: a altura volta ao que era',
      alturaCancelar === alturaAntes, `antes ${alturaAntes}px, depois de cancelar ${alturaCancelar}px`);

    // Abrir e CONFIRMAR: o logo some e o editor de escudo aparece — a página cresce de VERDADE
    // (mais conteúdo), o que não é "resíduo". Comparo com uma segunda aba que nasce já sem logo:
    // se as alturas baterem, o crescimento é só o conteúdo novo, não sobra nenhuma.
    await page.locator('[data-ajustes-do-time] button:has-text("Remover logo")').click();
    await page.locator('.modal-card').waitFor({ timeout: 5000 });
    await page.locator('.modal-card button:has-text("Remover logo")').click();
    await page.locator('.modal-card').waitFor({ state: 'detached', timeout: 5000 });
    await page.locator('[data-previa-escudo]').waitFor({ timeout: 5000 });
    const alturaConfirmar = await page.evaluate(() => document.documentElement.scrollHeight);

    const semLogo = await abrir(navegador, base, 'admin', { comLogo: false });
    await irPara(semLogo.page, '/time/varzea-fc?aba=ajustes');
    await semLogo.page.locator('[data-previa-escudo]').waitFor({ timeout: 15000 });
    const alturaDeReferencia = await semLogo.page.evaluate(() => document.documentElement.scrollHeight);
    await semLogo.ctx.close();

    t('confirmar "Remover logo": a altura final bate com a de um time que já nasce sem logo (só cresceu o conteúdo novo, sem resíduo)',
      Math.abs(alturaConfirmar - alturaDeReferencia) <= 2, `confirmado ${alturaConfirmar}px, referência ${alturaDeReferencia}px`);
    t('sem o logo, o editor de escudo (864 combinações) aparece', (await page.locator('[data-previa-escudo]').count()) === 1);
    t('achado 124: roda sem exceção', erros.length === 0, erros.slice(0, 2).join(' | '));
    await ctx.close();
  }

  // ── achado 150 (29R): "Nova temporada de notas" — o botão é dourado, a confirmação é vermelha ────────────────────────────────────
  {
    const { ctx, page, erros } = await abrir(navegador, base, 'admin');
    const escritas = []; // tudo o que não é leitura: o que chegaria ao motor
    page.on('request', (r) => { if (r.method() !== 'GET') escritas.push(`${r.method()} ${new URL(r.url()).pathname} ${r.postData() || ''}`.trim()); });
    await irPara(page, '/time/varzea-fc?aba=ajustes');
    const botao = page.locator('[data-pedir-votar-de-novo]');
    await botao.waitFor({ timeout: 15000 });
    const vermelho = (cor) => { const [r, g, b] = (cor.match(/\d+(\.\d+)?/g) || []).map(Number); return r > 180 && g < 120 && b < 120; };
    const estilo = await botao.evaluate((el) => { const cs = getComputedStyle(el); return { classe: el.className, borda: cs.borderTopColor, letra: cs.color, fundo: cs.backgroundColor, estrela: !!el.querySelector('svg'), texto: el.textContent.trim() }; });
    t('150 · o botão "Nova temporada de notas" é o dourado da casa (cta-gold), com estrela, e nada nele é vermelho',
      /cta-gold/.test(estilo.classe) && estilo.estrela && estilo.texto === 'Nova temporada de notas' && ![estilo.borda, estilo.letra, estilo.fundo].some(vermelho), JSON.stringify(estilo));
    t('150 · o apoio diz "Zera as notas e o time avalia todo mundo de novo, do zero."', (await page.locator('[data-ajustes-do-time]').innerText()).includes('Zera as notas e o time avalia todo mundo de novo, do zero.'));

    await botao.click();
    const modal = page.locator('.modal-card');
    await modal.waitFor({ timeout: 5000 });
    t('150 · a confirmação diz o perigo: "Começar uma nova temporada? As notas de todo mundo voltam a zero. Não dá para desfazer."',
      (await modal.innerText()).includes('Começar uma nova temporada? As notas de todo mundo voltam a zero. Não dá para desfazer.'));
    const fundoConfirmar = await modal.getByRole('button', { name: 'Zerar e começar' }).evaluate((el) => getComputedStyle(el).backgroundColor);
    t('150 · o botão da confirmação ("Zerar e começar") é vermelho de perigo', vermelho(fundoConfirmar), fundoConfirmar);
    await modal.getByRole('button', { name: 'Cancelar' }).click();
    await modal.waitFor({ state: 'detached', timeout: 5000 });
    t('150 · cancelar a confirmação não chama o motor', escritas.length === 0, escritas.join(' | '));

    await botao.click();
    await modal.getByRole('button', { name: 'Zerar e começar' }).click();
    await page.getByText('Nova temporada aberta. O time foi avisado para dar as notas.').waitFor({ timeout: 5000 });
    t('150 · confirmar chama pedir-revotacao com zerar: true (o motor não mudou) e o aviso diz "Nova temporada aberta. O time foi avisado para dar as notas."',
      escritas.length === 1 && escritas[0] === 'POST /api/teams/varzea-fc/pedir-revotacao {"zerar":true}', escritas.join(' | '));
    t('150: roda sem exceção', erros.length === 0, erros.slice(0, 2).join(' | '));
    await ctx.close();
  }

  // ── achado 147 (29R): a linha "presença ainda não aberta" do Início leva ao jogo certo e já abre o "Abrir presença" dele ───────────
  {
    const { ctx, page, erros } = await abrir(navegador, base, 'admin', { doisFuturos: true });
    const escritas = [];
    page.on('request', (r) => { if (r.method() !== 'GET') escritas.push(`${r.method()} ${new URL(r.url()).pathname}`); });
    await page.setViewportSize({ width: 390, height: 520 }); // tela curta: o 2º jogo fica abaixo da dobra e o "rolar até ele" tem o que provar
    await irPara(page, '/seu-time');
    const linha = page.locator('[data-com-pendencias] [data-pendencia="presenca"]');
    await linha.waitFor({ timeout: 10000 });
    t('147 · a linha "presença ainda não aberta" leva ao jogo: ?aba=jogos&abrir-presenca=<game_id>',
      (await linha.getAttribute('href')) === '/time/varzea-fc?aba=jogos&abrir-presenca=g2', String(await linha.getAttribute('href')));

    const historicoAntes = await page.evaluate(() => window.history.length);
    await linha.click(); // o toque de verdade: Início → página do time
    const campoPrazo = (id) => page.locator(`[data-jogo="${id}"] input[type="datetime-local"]`);
    await campoPrazo('g2').waitFor({ timeout: 15000 });
    t('147 · o toque abre o "Abrir presença" do jogo certo (g2): o campo do prazo está na tela', (await campoPrazo('g2').count()) === 1);
    await page.locator('[data-jogo="g-futuro"]').getByRole('button', { name: 'Abrir presença' }).waitFor({ timeout: 5000 });
    t('147 · o outro jogo (g-futuro) fica como estava: só o botão "Abrir presença", sem campo aberto', (await campoPrazo('g-futuro').count()) === 0);
    t('147 · aba Jogos, a mesma de sempre', (await page.locator('[data-aba="jogos"]').getAttribute('aria-selected')) === 'true');

    await page.waitForFunction(() => !location.search.includes('abrir-presenca'), null, { timeout: 5000 });
    t('147 · depois de usado, o parâmetro sai do endereço e a aba fica (?aba=jogos)', new URL(page.url()).search === '?aba=jogos', page.url());
    t('147 · sem empilhar histórico: Início → página do time é UMA entrada a mais, não duas', (await page.evaluate(() => window.history.length)) === historicoAntes + 1);

    await page.locator('[data-jogo="g2"].jogo-destaque').waitFor({ timeout: 5000 });
    t('147 · o cartão do jogo ganha um destaque curto (.jogo-destaque)', (await page.locator('[data-jogo="g2"].jogo-destaque').count()) === 1);
    await page.waitForFunction(() => { const r = document.querySelector('[data-jogo="g2"]').getBoundingClientRect(); return r.top >= 0 && r.bottom <= window.innerHeight + 1; }, null, { timeout: 5000 });
    const rolou = await page.evaluate(() => window.scrollY);
    t('147 · a tela rolou até o cartão (ele cabe inteiro na tela de 520 px, que o 2º jogo não cabia sem rolar)', rolou > 0, `scrollY ${rolou}`);
    await page.waitForFunction(() => !document.querySelector('.jogo-destaque'), null, { timeout: 8000 });
    t('147 · o destaque é curto: some sozinho', (await page.locator('.jogo-destaque').count()) === 0);

    await page.locator('[data-jogo="g2"]').getByRole('button', { name: 'Cancelar', exact: true }).click();
    await campoPrazo('g2').waitFor({ state: 'detached', timeout: 5000 });
    const depoisDeCancelar = await page.evaluate(() => { const r = document.querySelector('[data-jogo="g2"]').getBoundingClientRect(); return { dentro: r.top >= 0 && r.top < window.innerHeight }; });
    t('147 · Cancelar fecha o campo e deixa a pessoa na aba Jogos, no jogo certo: o botão "Abrir presença" volta',
      (await page.locator('[data-jogo="g2"]').getByRole('button', { name: 'Abrir presença' }).count()) === 1 && (await page.locator('[data-aba="jogos"]').getAttribute('aria-selected')) === 'true' && depoisDeCancelar.dentro);

    await page.goBack(); // /seu-time
    await linha.waitFor({ timeout: 5000 });
    await page.goForward(); // a página do time de novo, SEM o parâmetro: nada reabre
    await page.locator('[data-jogo="g2"]').getByRole('button', { name: 'Abrir presença' }).waitFor({ timeout: 15000 });
    await page.waitForTimeout(800);
    t('147 · "Voltar" e depois avançar não reabre nada (o parâmetro já saiu da entrada do histórico)',
      (await page.locator('input[type="datetime-local"]').count()) === 0 && !page.url().includes('abrir-presenca'), page.url());
    t('147 · nada foi gravado: abrir o campo não abre a presença (só o "Confirmar" faria isso)', escritas.length === 0, escritas.join(' | '));
    t('147: roda sem exceção', erros.length === 0, erros.slice(0, 2).join(' | '));
    await ctx.close();
  }

  // ── achado 147 (29R): sem o parâmetro nada muda; com um jogo que não está na lista, nada abre e o parâmetro sai ──────────────────
  {
    const { ctx, page, erros } = await abrir(navegador, base, 'admin', { doisFuturos: true });
    await page.setViewportSize({ width: 390, height: 520 });
    await irPara(page, '/time/varzea-fc?aba=jogos');
    await page.locator('[data-jogo="g2"]').getByRole('button', { name: 'Abrir presença' }).waitFor({ timeout: 15000 });
    await page.locator('[data-jogo="g-futuro"]').getByRole('button', { name: 'Abrir presença' }).waitFor({ timeout: 5000 });
    await page.waitForTimeout(1200);
    t('147 · sem o parâmetro, nada muda: nenhum campo aberto, nenhum destaque, a tela no topo',
      (await page.locator('input[type="datetime-local"]').count()) === 0 && (await page.locator('.jogo-destaque').count()) === 0 && (await page.evaluate(() => window.scrollY)) === 0);

    await irPara(page, '/time/varzea-fc?aba=jogos&abrir-presenca=jogo-que-nao-existe');
    await page.waitForFunction(() => !location.search.includes('abrir-presenca'), null, { timeout: 5000 });
    await page.waitForTimeout(800);
    t('147 · um jogo que não está na lista (ou já passou): nada abre e o parâmetro sai do endereço mesmo assim',
      (await page.locator('input[type="datetime-local"]').count()) === 0 && (await page.locator('.jogo-destaque').count()) === 0 && new URL(page.url()).search === '?aba=jogos', page.url());
    t('147: o jogo sem parâmetro roda sem exceção', erros.length === 0, erros.slice(0, 2).join(' | '));
    await ctx.close();
  }
}
