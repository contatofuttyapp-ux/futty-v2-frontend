// Prova no navegador da Rodada 29T, bloco A (o Início que mostra o jogo): o que só um Chromium de verdade confirma, com as MESMAS fontes e o MESMO CSS do app.
//   · a fila de avisos do topo no Início INTEIRO (168): um aviso por vez, a ordem jogo → pedido → notificações, o "+N", responder chama a mesma API dos
//     cards (e o RSVP, quando a presença está aberta), respondeu → entra o próximo, e o jogo que pede resposta cabe na primeira tela de 390×844,
//     também no estado pesado (pedido pendente + notificações + 4 times);
//   · "Seus times": até 2 linhas, "Ver todos (N)" abre o resto no lugar e "Ver menos" fecha (168);
//   · o rabicho com a cidade do time, medido para quem está noutro relógio (165);
//   · o nome do Início que nunca corta, em qualquer largura (164);
//   · o escudo cujo logo não carrega cai nas iniciais (160).
// O Início roda com o motor de mentira (/api/** respondido por page.route) e uma sessão de mentira plantada no localStorage: nada sai para a rede.
import { readFileSync } from 'node:fs';

export const nome = 'Rodada 29T-A (fila de avisos do Início, "Ver todos", rabicho, nome do cromo, escudo sem logo, primeira tela)';

const PNG_1X1 = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
const DIA = 86400000;
const SP = 'America/Sao_Paulo';
const ALTURA = 844;

// A chave da sessão do Supabase no localStorage, derivada do .env como o AuthContext a deriva.
const REF = new URL((readFileSync(new URL('../../.env', import.meta.url), 'utf8').match(/^VITE_SUPABASE_URL=(.+)$/m)?.[1] || 'https://prova.supabase.co').trim()).hostname.split('.')[0];
const SESSAO = JSON.stringify({
  access_token: 'prova', refresh_token: 'prova', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 86400 * 30,
  user: { id: 'U1', aud: 'authenticated', email: 'prova@futty.test', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' },
});

const TIMES = [
  { id: 'T1', slug: 'missa', nome: 'Missa de Quinta', cidade: 'Brasília - DF', fuso: SP, cor: 'vinho', escudo_cor2: 'ouro', escudo_padrao: 'faixa' },
  { id: 'T2', slug: 'varzea-fc', nome: 'Várzea FC', cidade: 'São Paulo', fuso: SP, cor: 'azul', escudo_cor2: 'ouro', escudo_padrao: 'solido' },
  { id: 'T3', slug: 'quinta-raiz', nome: 'Quinta Raiz', cidade: 'Campinas', fuso: SP, cor: 'verde', escudo_cor2: 'ouro', escudo_padrao: 'aro' },
  { id: 'T4', slug: 'racha-do-guara', nome: 'Racha do Guará', cidade: 'Brasília - DF', fuso: SP, cor: 'laranja', escudo_cor2: 'preto', escudo_padrao: 'barra' },
];
const SEM = { pedidos: 0, presenca: null, resultado: null, denuncias: 0, total: 0 };
const seuTime = (n) => TIMES.slice(0, n).map((t) => ({ team_id: t.id, slug: t.slug, nome: t.nome, fuso: SP, pendencias: SEM }));
const jogo = (id, time, dias, resto = {}) => ({
  id, name: `Campo ${id}`, date: new Date(Date.now() + dias * DIA).toISOString(), location: `Campo ${id}`, confirmed_count: 5, status: 'scheduled', cancelado: false,
  user_status: null, team_id: time.id, team_name: time.nome, team_slug: time.slug, fuso: SP, ausente_proximo: false, eu_jogo: true, ...resto,
});
const pedido = (id, nomeDoTime) => ({ id, status: 'pending', updated_at: new Date().toISOString(), team: { id: `X${id}`, nome: nomeDoTime, slug: `x-${id}`, cor: 'azul', logo_url: null } });

function payloadInicio({ jogos = [], pedidos = [], times = TIMES, admin = 0, rsvp = null } = {}) {
  return {
    me: {
      user: { id: 'U1', nome: 'Chavo', nome_jogador: 'Chavo, el matador del Pelé', onboarding_completo: true, birthdate: '1990-01-01', foto_url: '/imagens-prova/bom.png', avatar_url: null, plano: 'free', fundo_figurinha: 'estadio' },
      stats: { nota: 0, jogos: 0, gols: 0 },
    },
    teams: { teams: times.map((t) => ({ ...t, role: 'admin', joga: true, logo_url: null })) },
    convites: { games: jogos },
    pedidos: { pedidos },
    votacoes_pendentes: { pendentes: [] },
    denuncias_desfechos: { total: 0 },
    votacao_status: null,
    campeonato: null,
    rsvp,
    seu_time: seuTime(admin),
    ad: { ad: null },
    ads: null,
    brilhante: { fonte: null, team_id: null, kit_id: null, creditos: 0, restantes: 0, loja_pronta: false },
    pedidos_brilhante: [],
  };
}

const rsvpAberto = (jogoDoRsvp) => ({
  rsvp_aberto: true, rsvp_fechado: false, rsvp_prazo: new Date(Date.now() + DIA).toISOString(), fuso: SP, max_jogadores: null, lugares_disponiveis: null, cheio: false,
  confirmados: [], recusados: [], pendentes: [{ id: 'U1' }], espera: [], minha_posicao_espera: null, eu_jogo: true, gameId: jogoDoRsvp,
});

// O motor de mentira: anota cada pedido (método, caminho, corpo) e responde o que o teste pediu.
function criarRoteador(base, { inicio, chamadas, explorar = null }) {
  const origem = new URL(base).host;
  return (route) => {
    const req = route.request();
    const u = new URL(req.url());
    if (u.pathname.startsWith('/api/')) {
      const corpo = req.postData();
      if (req.method() !== 'GET') chamadas.push({ metodo: req.method(), caminho: u.pathname, corpo: corpo ? JSON.parse(corpo) : null });
      let resposta = {};
      if (u.pathname === '/api/inicio') resposta = inicio;
      else if (u.pathname === '/api/teams/explorar') resposta = { teams: explorar || [] };
      else if (req.method() === 'POST' && /\/pedir-entrada$/.test(u.pathname)) resposta = { entrou: u.pathname.includes('candanga') };
      else if (u.pathname === '/api/me') resposta = inicio.me;
      else if (req.method() !== 'GET') resposta = { ok: true };
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(resposta) });
    }
    if (u.pathname.startsWith('/imagens-prova/')) {
      return u.pathname.includes('bom') ? route.fulfill({ status: 200, contentType: 'image/png', body: PNG_1X1 }) : route.fulfill({ status: 404, contentType: 'text/plain', body: 'nao' });
    }
    if (u.host === origem) return route.continue();
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  };
}

async function abrir(navegador, base, { largura = 390, altura = ALTURA, tz = SP, inicio = payloadInicio(), caminho = '/home', explorar = null } = {}) {
  const ctx = await navegador.newContext({ viewport: { width: largura, height: altura }, deviceScaleFactor: 1, isMobile: true, hasTouch: true, locale: 'pt-BR', timezoneId: tz });
  await ctx.addInitScript(({ chave, sessao }) => {
    try { localStorage.setItem('futty_cookies', 'aceite'); localStorage.setItem(chave, sessao); } catch { /* sem storage */ }
    // O Chromium sem tela nasce com a permissão de notificações NEGADA e o aviso "Ativar notificações" nunca apareceria. Aqui ela está "default",
    // como no navegador de quem ainda não decidiu.
    try { Object.defineProperty(window.Notification, 'permission', { get: () => 'default', configurable: true }); } catch { /* sem Notification */ }
  }, { chave: `sb-${REF}-auth-token`, sessao: SESSAO });
  const page = await ctx.newPage();
  const erros = [];
  const chamadas = [];
  page.on('pageerror', (e) => erros.push(e.message));
  await page.route('**/*', criarRoteador(base, { inicio, chamadas, explorar }));
  await page.goto(`${base}/scripts/provas/rodada-29t.html`, { waitUntil: 'domcontentloaded' });
  await page.locator('[data-casa]').waitFor({ timeout: 20000 });
  await page.evaluate((c) => { window.history.pushState({}, '', c); window.dispatchEvent(new PopStateEvent('popstate')); }, caminho);
  return { ctx, page, erros, chamadas };
}
const fontesProntas = (page) => page.evaluate(() => document.fonts.ready.then(() => true));
// FUTTY_PROVA_PRINTS=<pasta>: guarda uma imagem de cada estado importante (para a Freaky olhar). Sem a variável, nada é gravado.
async function imagem(page, nomeDoArquivo) {
  if (process.env.FUTTY_PROVA_PRINTS) await page.waitForTimeout(2600); // o toast de 2 s sai da frente
  if (process.env.FUTTY_PROVA_PRINTS) await page.screenshot({ path: `${process.env.FUTTY_PROVA_PRINTS}/${nomeDoArquivo}.png` });
}
const texto = (page) => page.locator('body').innerText();
const avisos = (page) => page.locator('[data-aviso]');
// O pedido sai DEPOIS de a tela mudar (estado otimista): espera ele aparecer no motor de mentira em vez de supor a ordem.
async function esperarChamada(chamadas, procura, ms = 4000) {
  const fim = Date.now() + ms;
  while (Date.now() < fim) {
    if (chamadas.some(procura)) return true;
    await new Promise((r) => setTimeout(r, 50));
  }
  return false;
}
const tipoDoAviso = async (page) => ((await avisos(page).count()) === 1 ? avisos(page).first().getAttribute('data-aviso') : `${await avisos(page).count()} avisos`);

export async function rodar({ navegador, base, t }) {
  // ── 168 · a fila no Início inteiro: jogo → outro jogo → pedido → notificações ───────────────────────────────────────────────────────────
  {
    const inicio = payloadInicio({
      jogos: [jogo('g1', TIMES[0], 2), jogo('g2', TIMES[1], 3), jogo('g3', TIMES[0], 9, { user_status: 'going' })],
      pedidos: [pedido('p1', 'Pelada do Bandeirante'), pedido('p2', 'Os Pica')],
      admin: 2,
    });
    const { ctx, page, erros, chamadas } = await abrir(navegador, base, { inicio });
    await page.locator('[data-aviso]').first().waitFor({ timeout: 25000 });
    await fontesProntas(page);
    await page.waitForTimeout(500);

    t('UM aviso por vez: com jogo sem resposta, pedido pendente e notificações disponíveis, só o do jogo está na tela', (await avisos(page).count()) === 1 && (await tipoDoAviso(page)) === 'jogo', await tipoDoAviso(page));
    const corpo = await texto(page);
    t('o aviso do jogo traz a pergunta "Você vai?", o time e os botões Vou / Não vou', /Você vai\?/.test(corpo) && (await page.locator('[data-aviso="jogo"]').innerText()).includes('Missa de Quinta') && (await page.locator('[data-aviso-vou]').count()) === 1 && (await page.locator('[data-aviso-nao-vou]').count()) === 1);
    t('é o jogo mais próximo (g1, o do Missa de Quinta) — o g3 já respondido e o g2 mais longe ficam de fora', (await page.locator('[data-aviso-jogo]').getAttribute('data-aviso-jogo')) === 'g1');
    t('"+1" discreto: o g2 também espera resposta', (await page.locator('[data-aviso="jogo"] [data-aviso-mais]').innerText()).trim() === '+1');
    t('o pedido pendente e o "Ativar notificações" esperam a vez (não estão na tela)', !/Pedido pendente na/.test(corpo) && !/Ativar notificações/.test(corpo));
    const caixa = await page.locator('[data-aviso="jogo"]').boundingBox();
    t('o aviso cabe na largura de 390 px e fica na primeira tela', caixa.x >= 0 && caixa.x + caixa.width <= 390 && caixa.y + caixa.height <= ALTURA, JSON.stringify(caixa));
    const alvo = await page.locator('[data-aviso-vou]').boundingBox();
    t('o botão Vou tem 44 px de toque', alvo.height >= 44 && alvo.width >= 44, JSON.stringify(alvo));

    // Vou no g1 → a MESMA chamada do card (sem RSVP aberto: /api/games/:id/confirmar), o aviso passa para o g2 e o "+1" some.
    await page.locator('[data-aviso-vou]').click();
    await page.locator('[data-aviso-jogo="g2"]').waitFor({ timeout: 8000 });
    t('Vou no aviso chama /api/games/g1/confirmar com confirmado:true — a mesma chamada do botão do card', await esperarChamada(chamadas, (c) => c.metodo === 'POST' && c.caminho === '/api/games/g1/confirmar' && c.corpo?.confirmado === true), JSON.stringify(chamadas));
    t('respondeu → entra o próximo da fila: o aviso agora é o g2, e sem "+N"', (await tipoDoAviso(page)) === 'jogo' && (await page.locator('[data-aviso="jogo"] [data-aviso-mais]').count()) === 0);
    t('a confirmação aparece (toast "Presença confirmada.")', await page.getByText('Presença confirmada.').waitFor({ timeout: 5000 }).then(() => true, () => false));
    t('o card do g1 na lista já está com o Vou aceso (mesmo estado do aviso)', (await page.locator('.gcard:has-text("Campo g1") .pbtn--go.active').count()) === 1);

    // Não vou no g2 → o próximo da fila é o pedido pendente (o mais recente), com "+1" e "Cancelar".
    await page.locator('[data-aviso-nao-vou]').click();
    await page.locator('[data-aviso="pedido"]').waitFor({ timeout: 8000 });
    t('Não vou chama /api/games/g2/confirmar com confirmado:false', await esperarChamada(chamadas, (c) => c.metodo === 'POST' && c.caminho === '/api/games/g2/confirmar' && c.corpo?.confirmado === false));
    t('sem jogo esperando, entra o pedido pendente: "Pedido pendente na Pelada do Bandeirante" + "+1"', /Pedido pendente na Pelada do Bandeirante/.test(await texto(page)) && (await page.locator('[data-aviso="pedido"] [data-aviso-mais]').innerText()).trim() === '+1');
    t('o texto do pedido diz "Esperando a aprovação do admin" (nunca "À espera")', /Esperando a aprovação do admin/.test(await texto(page)) && !/À espera/.test(await texto(page)));

    await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
    await page.locator('[data-aviso="pedido"]:has-text("Os Pica")').waitFor({ timeout: 8000 });
    t('Cancelar chama DELETE /api/teams/x-p1/pedir-entrada e o outro pedido (Os Pica) assume, sem "+N"', (await esperarChamada(chamadas, (c) => c.metodo === 'DELETE' && c.caminho === '/api/teams/x-p1/pedir-entrada')) && (await page.locator('[data-aviso="pedido"] [data-aviso-mais]').count()) === 0);
    await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
    await page.locator('[data-aviso="notificacoes"]').waitFor({ timeout: 8000 });
    t('sem pedido nenhum, o último da fila: "Ativar notificações para não perder nenhum jogo"', (await tipoDoAviso(page)) === 'notificacoes' && /Ativar notificações para não perder nenhum jogo/.test(await texto(page)));
    await page.getByRole('button', { name: 'Fechar' }).click();
    await page.waitForTimeout(300);
    t('fechou → a fila acabou: nenhum aviso no topo', (await avisos(page).count()) === 0);
    t('a fila roda sem exceção', erros.length === 0, erros.slice(0, 2).join(' | '));
    await ctx.close();
  }

  // ── 168 · com o RSVP aberto, o Vou do aviso é o RSVP (a mesma chamada do cartão "Confirme presença") ──────────────────────────────────────
  {
    const inicio = payloadInicio({ jogos: [jogo('g1', TIMES[0], 2), jogo('g2', TIMES[1], 3)], rsvp: rsvpAberto('g1') });
    const { ctx, page, chamadas } = await abrir(navegador, base, { inicio });
    await page.locator('[data-aviso="jogo"]').waitFor({ timeout: 25000 });
    await page.getByText('Confirme presença').waitFor({ timeout: 10000 });
    await page.locator('[data-aviso-vou]').click();
    await page.locator('[data-aviso-jogo="g2"]').waitFor({ timeout: 8000 });
    t('presença aberta: Vou no aviso chama /api/jogos/g1/rsvp/responder com status "confirmado" (e NÃO /api/games/…/confirmar)', (await esperarChamada(chamadas, (c) => c.metodo === 'POST' && c.caminho === '/api/jogos/g1/rsvp/responder' && c.corpo?.status === 'confirmado')) && !chamadas.some((c) => c.caminho === '/api/games/g1/confirmar'), JSON.stringify(chamadas));
    t('e o cartão "Confirme presença" acende o Vou junto (um destino só)', (await page.getByText('Confirme presença').locator('..').getByRole('button', { name: 'Vou', exact: true }).getAttribute('aria-pressed')) === 'true');
    await ctx.close();
  }

  // ── 168 · o chip de time escolhido não esconde o aviso (ele não segue o filtro) ────────────────────────────────────────────────────────
  {
    const inicio = payloadInicio({ jogos: [jogo('g1', TIMES[0], 2), jogo('g2', TIMES[1], 3, { user_status: 'going' })], admin: 2 });
    const { ctx, page } = await abrir(navegador, base, { inicio });
    await page.locator('[data-aviso="jogo"]').waitFor({ timeout: 25000 });
    await page.locator('.chips-row .chip', { hasText: 'Várzea FC' }).click();
    await page.waitForTimeout(300);
    t('com o chip do Várzea FC escolhido, o aviso do jogo do Missa de Quinta continua no topo', (await page.locator('[data-aviso-jogo]').getAttribute('data-aviso-jogo')) === 'g1');
    await ctx.close();
  }

  // ── 168 · a lei da primeira tela: o jogo que pede resposta aparece em 390×844, no estado pesado também ──────────────────────────────────
  {
    const pesado = payloadInicio({
      jogos: [jogo('g1', TIMES[0], 2), jogo('g2', TIMES[1], 3)],
      pedidos: [pedido('p1', 'Pelada do Bandeirante')],
      admin: 4,
    });
    const { ctx, page } = await abrir(navegador, base, { inicio: pesado });
    await page.locator('[data-aviso="jogo"]').waitFor({ timeout: 25000 });
    await fontesProntas(page);
    await page.waitForTimeout(600);
    const m = await page.evaluate(() => {
      const aviso = document.querySelector('[data-aviso="jogo"]').getBoundingClientRect();
      const rotulo = [...document.querySelectorAll('.games-label')].find((el) => /próximos jogos/i.test(el.textContent));
      const card = document.querySelector('[data-seus-times]');
      return {
        avisoBase: Math.round(aviso.bottom),
        rotuloBase: rotulo ? Math.round(rotulo.getBoundingClientRect().bottom) : null,
        linhas: card ? card.querySelectorAll('[data-time-linha]').length : 0,
        verTodos: card ? !!card.querySelector('[data-ver-todos]') : false,
      };
    });
    t(`estado pesado (pedido pendente + notificações + 4 times): o aviso do jogo termina em ${m.avisoBase} px, dentro dos ${ALTURA} px da primeira tela`, m.avisoBase <= ALTURA, JSON.stringify(m));
    t('e o "Seus times" mostra só 2 linhas, com o "Ver todos (4)"', m.linhas === 2 && m.verTodos, JSON.stringify(m));
    t(`(medida) o rótulo "Próximos jogos" termina em ${m.rotuloBase} px — antes, no mesmo estado, era 973`, m.rotuloBase !== null && m.rotuloBase < 973, JSON.stringify(m));
    await ctx.close();
  }

  // ── 165 · o rabicho leva a cidade do time ("horário de Brasília"), para quem está noutro relógio ────────────────────────────────────────
  {
    const inicio = payloadInicio({ jogos: [jogo('g1', TIMES[0], 2), jogo('g2', TIMES[1], 3)], rsvp: rsvpAberto('g1') });
    const { ctx, page } = await abrir(navegador, base, { inicio, tz: 'Europe/Lisbon' });
    await page.locator('[data-aviso="jogo"]').waitFor({ timeout: 25000 });
    await page.getByText('Confirme presença').waitFor({ timeout: 10000 });
    t('aviso do jogo (time de Brasília) visto de Lisboa: "· horário de Brasília"', /horário de Brasília/.test(await page.locator('[data-aviso="jogo"] [data-aviso-quando]').innerText()));
    t('o prazo do cartão "Confirme presença" também', /horário de Brasília/.test(await page.locator('text=/^até /').first().innerText()));
    t('o card do jogo na lista também — e nenhum "horário de São Paulo" no time de Brasília', /horário de Brasília/.test(await page.locator('.gcard:has-text("Campo g1") .gcard__meta').innerText()) && !/horário de São Paulo/.test((await page.locator('.gcard:has-text("Campo g1")').innerText())));
    t('o time de São Paulo (g2) continua "horário de São Paulo"', /horário de São Paulo/.test(await page.locator('.gcard:has-text("Campo g2") .gcard__meta').innerText()));
    await ctx.close();
    const { ctx: ctx2, page: page2 } = await abrir(navegador, base, { inicio });
    await page2.locator('[data-aviso="jogo"]').waitFor({ timeout: 25000 });
    t('quem está no relógio do time não vê rabicho nenhum', !/horário de/.test(await page2.locator('[data-aviso="jogo"]').innerText()));
    await ctx2.close();
  }

  // ── 159 e 161 · o Radar: entrar num time aberto comemora, e o título só promete o que é verdade ────────────────────────────────────────────
  {
    const explorar = [
      { id: 'E1', slug: 'racha-da-candanga', nome: 'Racha da Candanga', cidade: 'Brasília, DF', membro_count: 12, modo_visibilidade: 'publico_aberto', ja_membro: false, pedido_pendente: false },
      { id: 'E2', slug: 'pelada-do-bandeirante', nome: 'Pelada do Bandeirante', cidade: 'Brasília, DF', membro_count: 15, modo_visibilidade: 'publico_aprovacao', ja_membro: false, pedido_pendente: false },
      { id: 'E3', slug: 'boleiros-do-cruzeiro', nome: 'Boleiros do Cruzeiro', cidade: 'Brasília, DF', membro_count: 11, modo_visibilidade: 'publico_aberto', ja_membro: true, pedido_pendente: false },
    ];
    const { ctx, page, chamadas, erros } = await abrir(navegador, base, { caminho: '/explorar', explorar });
    await ctx.grantPermissions(['geolocation']);
    await ctx.setGeolocation({ latitude: -15.79, longitude: -47.88 });
    await page.getByText('Racha da Candanga').first().waitFor({ timeout: 20000 });
    // O card do time: o primeiro <div> acima do nome que tem o recorte de 45° (clip-path) no estilo — o card inteiro, com o botão.
    const card = (nomeDoTime) => page.getByText(nomeDoTime, { exact: true }).locator('xpath=ancestor::div[contains(@style, "clip-path")][1]');
    const tituloDaLista = async () => (await page.getByText(/· \d+$/).first().innerText()).replace(/\s+/g, ' ').trim();

    t('sem localização nem cidade o título é "Peladas abertas a novos jogadores · 3" (nunca "perto de você")', /^Peladas abertas a novos jogadores · 3$/i.test(await tituloDaLista()), await tituloDaLista());
    t('iniciais dos escudos sem "do": Racha da Candanga → RC, Pelada do Bandeirante → PB, Boleiros do Cruzeiro → BC', JSON.stringify(await page.locator('[data-escudo]').allInnerTexts()) === JSON.stringify(['RC', 'PB', 'BC']), JSON.stringify(await page.locator('[data-escudo]').allInnerTexts()));
    t('quem já era membro antes de abrir a tela vê "Você já é membro"', /Você já é membro/.test(await card('Boleiros do Cruzeiro').innerText()));

    await card('Racha da Candanga').getByRole('button', { name: 'Entrar', exact: true }).click();
    await page.locator('[data-entrou-agora]').waitFor({ timeout: 8000 });
    const depois = await card('Racha da Candanga').innerText();
    t('entrou num time aberto: POST /api/teams/racha-da-candanga/pedir-entrada', await esperarChamada(chamadas, (c) => c.metodo === 'POST' && c.caminho === '/api/teams/racha-da-candanga/pedir-entrada'));
    await imagem(page, 'radar-entrou');
    t('o card comemora: "Você entrou!" e o link "Ver o time" (não mais "Você já é membro")', /Você entrou!/.test(depois) && /Ver o time/.test(depois) && !/Você já é membro/.test(depois), depois);
    t('a contagem sobe 1: 12 → 13 membros', /13 membros/.test(depois) && !/12 membros/.test(depois), depois);
    t('"Ver o time" leva ao time (href /time/racha-da-candanga)', (await page.locator('[data-entrou-agora] a').getAttribute('href')) === '/time/racha-da-candanga');
    t('"Você já é membro" segue só no time em que a pessoa já estava (1 vez na tela)', (await page.getByText('Você já é membro').count()) === 1);

    await card('Pelada do Bandeirante').getByRole('button', { name: 'Pedir entrada', exact: true }).click();
    await page.getByText('Pedido enviado ✓').waitFor({ timeout: 8000 });
    const pedida = await card('Pelada do Bandeirante').innerText();
    t('time com aprovação: "Pedido enviado ✓", sem comemorar e a contagem fica em 15', !/Você entrou!/.test(pedida) && /15 membros/.test(pedida), pedida);

    await page.getByRole('button', { name: /Usar minha localização/ }).click();
    await page.getByText('Localização ativa').first().waitFor({ timeout: 8000 });
    t('com a localização ligada o título vira "Perto de você · N"', /^Perto de você · \d+$/i.test(await tituloDaLista()), await tituloDaLista());

    const cidade = page.getByPlaceholder('Sua cidade (Brasil ou Portugal)');
    await cidade.click();
    await cidade.fill('Brasíl');
    await page.locator('[data-sugestoes-cidade] button', { hasText: 'Brasília, DF' }).first().click({ timeout: 15000 });
    await page.waitForTimeout(300);
    t('com a cidade escolhida da lista o título vira "Em Brasília, DF · N"', /^Em Brasília, DF · \d+$/i.test(await tituloDaLista()), await tituloDaLista());
    t('o Radar roda sem exceção', erros.length === 0, erros.slice(0, 2).join(' | '));
    await ctx.close();
  }

  // ── as peças soltas: "Ver todos", o nome do cromo e o escudo sem logo ───────────────────────────────────────────────────────────────────
  {
    const { ctx, page, erros } = await abrir(navegador, base, { caminho: '/pecas' });
    await page.locator('[data-aviso-solto]').waitFor({ timeout: 20000 });
    await fontesProntas(page);
    await page.waitForTimeout(500);

    const linhas = (n) => page.locator(`[data-cartao="${n}"] [data-time-linha]`).count();
    const verTodos = (n) => page.locator(`[data-cartao="${n}"] [data-ver-todos]`);
    t('1 time: o card de sempre (sem "Seus times" nem "Ver todos")', (await page.locator('[data-cartao="1"] [data-seu-time]').count()) === 1 && (await verTodos(1).count()) === 0);
    t('2 times: as duas linhas, sem "Ver todos"', (await linhas(2)) === 2 && (await verTodos(2).count()) === 0);
    t('3 times: 2 linhas e "Ver todos (3)"', (await linhas(3)) === 2 && (await verTodos(3).innerText()).trim() === 'Ver todos (3)');
    t('4 times: 2 linhas e "Ver todos (4)"', (await linhas(4)) === 2 && (await verTodos(4).innerText()).trim() === 'Ver todos (4)');
    await verTodos(4).click();
    t('tocar em "Ver todos (4)" abre as outras 2 no lugar (4 linhas) e o botão vira "Ver menos"', (await linhas(4)) === 4 && (await verTodos(4).innerText()).trim() === 'Ver menos' && (await verTodos(4).getAttribute('aria-expanded')) === 'true');
    t('o botão tem 44 px de toque', (await verTodos(4).boundingBox()).height >= 44);
    await verTodos(4).click();
    t('"Ver menos" volta às 2 linhas', (await linhas(4)) === 2 && (await verTodos(4).innerText()).trim() === 'Ver todos (4)');

    for (const largura of ['358', '288', '240']) {
      const r = await page.evaluate((w) => [...document.querySelectorAll(`[data-nome-largo="${w}"] [data-nome]`)].map((el) => {
        const nomeEl = el.firstElementChild;
        return { qual: el.getAttribute('data-nome'), cabe: nomeEl.scrollWidth <= nomeEl.clientWidth, letra: parseFloat(getComputedStyle(nomeEl).fontSize), largura: nomeEl.clientWidth };
      }), largura);
      const nenhumCorta = r.every((x) => x.cabe);
      t(`nome do cromo em ${largura} px: nenhum corta (curto, médio, longo e enorme cabem inteiros)`, nenhumCorta, JSON.stringify(r));
      t(`nome do cromo em ${largura} px: o curto fica nos 44 px e o enorme encolhe`, r[0].letra === 44 && r[3].letra < 44 && r[3].letra >= 9, JSON.stringify(r));
    }

    await page.waitForFunction(() => document.querySelector('[data-escudo-quebrado] [data-escudo]')?.getAttribute('data-escudo') !== 'logo', null, { timeout: 8000 }).catch(() => {});
    const esc = await page.evaluate(() => {
      const le = (k) => { const el = document.querySelector(`[data-${k}] [data-escudo]`); return { tipo: el.getAttribute('data-escudo'), texto: el.innerText.trim(), img: !!el.querySelector('img') }; };
      return { quebrado: le('escudo-quebrado'), bom: le('escudo-bom'), semLogo: le('escudo-sem-logo') };
    });
    t('logo que não carrega (404): o escudo mostra as iniciais "RG" (Racha do Guará) e a imagem sai', esc.quebrado.tipo !== 'logo' && esc.quebrado.texto === 'RG' && !esc.quebrado.img, JSON.stringify(esc));
    t('logo que carrega continua sendo o logo', esc.bom.tipo === 'logo' && esc.bom.img, JSON.stringify(esc));
    t('time sem logo: as iniciais sem "do" ("Pelada do Bandeirante" → PB)', esc.semLogo.texto === 'PB', JSON.stringify(esc));

    await page.locator('[data-aviso-solto] [data-aviso-vou]').click();
    await page.locator('[data-aviso-solto] [data-aviso-nao-vou]').click();
    t('o aviso solto chama onPresence(id, true) e onPresence(id, false)', JSON.stringify(await page.evaluate(() => window.__chamadas)) === JSON.stringify([['g1', true], ['g1', false]]));
    const semMais = await page.locator('[data-aviso-sem-mais] [data-aviso-mais]').count();
    t('o "+N" só existe quando há mais jogos esperando (+2 no primeiro, nada no segundo)', (await page.locator('[data-aviso-solto] [data-aviso-mais]').innerText()).trim() === '+2' && semMais === 0);
    t('as peças rodam sem exceção', erros.length === 0, erros.slice(0, 2).join(' | '));
    await ctx.close();
  }
}
