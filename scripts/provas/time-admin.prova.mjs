// Prova no navegador (Rodada 29I, bloco 3 — "admin não é um lugar"): a página do time de verdade, num Chromium, com o motor de mentira.
//   · admin: abas Jogos · Elenco · Ajustes (Ajustes com o selo ADMIN); trocar de aba muda o endereço sem empilhar histórico; o jogo
//     passado sem resultado tem "Lançar resultado"; um toque no nome do membro abre o que o admin faz com ele (sem "⋯"); Ajustes termina
//     em AÇÕES DEFINITIVAS e mostra o escudo em 84, 36 e 20 px; "Voltar" volta para onde a pessoa estava;
//   · jogador: duas abas, sem Ajustes (nem pelo endereço);
//   · o escudo: os seis padrões nos três tamanhos das bancadas do dono, com a régua das iniciais;
//   · o card "Seu time" do Início: uma linha por pendência, os quatro atalhos com nome e o "Tudo tranquilo por aqui.".
export const nome = 'Página do time (abas, Voltar pelo histórico, membro por toque, escudo, card "Seu time")';

const DIA = 86400000;

function motor(papel) {
  const agora = Date.now();
  const team = {
    id: 'T1', slug: 'varzea-fc', nome: 'Várzea FC', cor: 'vinho', escudo_cor2: 'ouro', escudo_padrao: 'faixa', role: papel, joga: true,
    fuso: 'America/Sao_Paulo', cidade: 'São Paulo', jogadores_por_time: 6, mostrar_gols: true, modo_visibilidade: 'privado', logo_url: null,
  };
  const members = [
    { id: 'U1', nome: 'Tonhão', role: 'admin', joga: true, goleiro: false },
    { id: 'U2', nome: 'Zeca', role: 'member', joga: true, goleiro: true },
  ];
  const games = [
    { id: 'g-futuro', data: new Date(agora + 3 * DIA).toISOString(), local: 'Campo da Vila', status: 'agendado', confirmados: 4, sorteio_realizado: false },
    { id: 'g-passado', data: new Date(agora - 2 * DIA).toISOString(), local: 'Quadra 2', status: 'terminado', confirmados: 10, sorteio_realizado: true, campeao_time_index: null, resultado_nivel: 0 },
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
    '/api/feed/denuncias': { denuncias: [] },
    '/api/denuncias/fila': { fila: [] },
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

async function abrir(navegador, base, papel) {
  const ctx = await navegador.newContext({ viewport: { width: 390, height: 800 } });
  const page = await ctx.newPage();
  const erros = [];
  page.on('pageerror', (e) => erros.push(e.message));
  await page.route('**/*', rotear(motor(papel), base));
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
    t('Ajustes: O time, Admins, Notificações do admin, Avisar o time, Denúncias e, no fim, AÇÕES DEFINITIVAS',
      /o time[\s\S]*admins[\s\S]*notificações do admin[\s\S]*avisar o time[\s\S]*denúncias[\s\S]*ações definitivas/i.test(ajustes), ajustes.slice(0, 160).replace(/\s+/g, ' '));
    t('Ajustes: "Pedir para votar de novo" mora em Ações definitivas', /ações definitivas[\s\S]*Pedir para votar de novo/i.test(ajustes));
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
    t('nada do admin para o jogador (sem Ações definitivas, sem "Novo jogo")', !/Ações definitivas|Novo jogo/i.test(await page.locator('body').innerText()));
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
    t('uma linha por pendência: pedido, presença, resultado, denúncia', linhas.length === 4 && /2 pedidos de entrada/.test(linhas[0]) && /sem presença aberta/.test(linhas[1]) && /por lançar/.test(linhas[2]) && /1 denúncia/.test(linhas[3]), linhas.join(' | '));
    const atalhos = await page.locator('[data-com-pendencias] [data-atalho]').evaluateAll((els) => els.map((e) => [e.getAttribute('data-atalho'), e.getAttribute('href')]));
    t('os quatro atalhos com nome: Novo jogo · Sortear · Convidar · Ajustes', atalhos.map((a) => a[0]).join(' · ') === 'Novo jogo · Sortear · Convidar · Ajustes', JSON.stringify(atalhos));
    t('"Sortear" vai ao próximo jogo do time; "Convidar" abre o convite no Elenco', atalhos[1][1] === '/time/varzea-fc/jogo/g2' && atalhos[2][1] === '/time/varzea-fc?aba=elenco&convidar=1', JSON.stringify(atalhos));
    const semNada = await page.locator('[data-sem-pendencias]').innerText();
    t('sem pendência o card fica compacto: "Tudo tranquilo por aqui."', /Tudo tranquilo por aqui\./.test(semNada) && (await page.locator('[data-sem-pendencias] [data-pendencia]').count()) === 0);
    t('o card roda sem exceção', erros.length === 0, erros.slice(0, 2).join(' | '));
    await ctx.close();
  }
}
