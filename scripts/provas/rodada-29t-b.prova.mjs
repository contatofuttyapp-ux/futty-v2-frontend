// Prova no navegador da Rodada 29T, bloco B (o Radar apresenta o time, os bairros viram lista): o que só um Chromium de verdade confirma, com as MESMAS fontes
// e o MESMO CSS do app, as listas de verdade (public/dados/) e o motor de mentira (/api/** respondido por page.route).
//   · a fila ÚNICA de avisos do Início (ajuste da Freaky; ordem revista na 29T-C): todos os avisos entram nela, um por vez — primeiro o que aconteceu ou tem
//     prazo (jogo → pedido → resposta do pedido → votação → denúncia → figurinha nascendo), depois os lembretes sem prazo (figurinha para gerar, uniforme,
//     card, data de nascimento — cada um com o "Agora não" de 7 dias), por último as notificações; fechar ou resolver faz entrar o próximo; "Seus times" com
//     pendência primeiro e nenhum escondido atrás do "Ver todos";
//   · o Radar (157): "Bairro · Cidade" e o "Sobre o time" em até 2 linhas, tocar no card abre o pop-up com tudo e o mesmo botão, tocar no botão NÃO abre;
//   · o campo Bairro (157): só aparece com cidade que tem lista (IBGE no Brasil, freguesias em Portugal), só aceita da lista, e some quando a cidade muda;
//   · o "Sobre o time" (157): obrigatório no passo 3 do Criar time só para aberto / com aprovação; Ajustes pede o texto antes de abrir o time.
// Nada sai para a rede: a sessão é de mentira, plantada no localStorage.
import { readFileSync } from 'node:fs';

export const nome = 'Rodada 29T-B (fila única de avisos, Radar com bairro e "Sobre o time", bairros de lista, "Sobre o time" no Criar time e nos Ajustes)';

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
  { id: 'T1', slug: 'missa', nome: 'Missa de Quinta', cidade: 'Brasília, DF', fuso: SP, cor: 'vinho', escudo_cor2: 'ouro', escudo_padrao: 'faixa' },
  { id: 'T2', slug: 'varzea-fc', nome: 'Várzea FC', cidade: 'São Paulo, SP', fuso: SP, cor: 'azul', escudo_cor2: 'ouro', escudo_padrao: 'solido' },
  { id: 'T3', slug: 'quinta-raiz', nome: 'Quinta Raiz', cidade: 'Campinas, SP', fuso: SP, cor: 'verde', escudo_cor2: 'ouro', escudo_padrao: 'aro' },
  { id: 'T4', slug: 'racha-do-guara', nome: 'Racha do Guará', cidade: 'Brasília, DF', fuso: SP, cor: 'laranja', escudo_cor2: 'preto', escudo_padrao: 'barra' },
];
const SEM = { pedidos: 0, presenca: null, resultado: null, denuncias: 0, total: 0 };
const COM = { pedidos: 2, presenca: null, resultado: null, denuncias: 0, total: 2 };
const seuTime = (comPendencia = []) => TIMES.map((t, i) => ({ team_id: t.id, slug: t.slug, nome: t.nome, fuso: SP, pendencias: comPendencia.includes(i) ? COM : SEM }));
const jogo = (id, time, dias, resto = {}) => ({
  id, name: `Campo ${id}`, date: new Date(Date.now() + dias * DIA).toISOString(), location: `Campo ${id}`, confirmed_count: 5, status: 'scheduled', cancelado: false,
  user_status: null, team_id: time.id, team_name: time.nome, team_slug: time.slug, fuso: SP, ausente_proximo: false, eu_jogo: true, ...resto,
});
const pendente = (id, nomeDoTime) => ({ id, status: 'pending', updated_at: new Date().toISOString(), team: { id: `X${id}`, nome: nomeDoTime, slug: `x-${id}`, cor: 'azul', logo_url: null } });
const aceito = (id, nomeDoTime) => ({ id, status: 'approved', updated_at: new Date().toISOString(), team: { id: `X${id}`, nome: nomeDoTime, slug: `x-${id}`, cor: 'azul', logo_url: null } });

function payloadInicio({ jogos = [], pedidos = [], votacoes = [], denuncias = 0, nascimento = false, foto = true, figurinha = null, direito = null, comPendencia = [] } = {}) {
  return {
    me: {
      user: {
        id: 'U1', nome: 'Chavo', nome_jogador: 'Chavo', onboarding_completo: true, birthdate: nascimento ? null : '1990-01-01', foto_url: foto ? '/imagens-prova/bom.png' : null,
        avatar_url: null, plano: 'free', fundo_figurinha: 'estadio', figurinha_status: figurinha,
      },
      stats: { nota: 0, jogos: 0, gols: 0 },
    },
    teams: { teams: TIMES.map((t) => ({ ...t, role: 'admin', joga: true, logo_url: null })) },
    convites: { games: jogos },
    pedidos: { pedidos },
    votacoes_pendentes: { pendentes: votacoes },
    denuncias_desfechos: { total: denuncias },
    votacao_status: null,
    campeonato: null,
    rsvp: null,
    seu_time: seuTime(comPendencia),
    ad: { ad: null },
    ads: null,
    brilhante: { fonte: direito, team_id: direito ? 'T1' : null, kit_id: null, creditos: 0, restantes: 0, loja_pronta: false },
    pedidos_brilhante: [],
  };
}

// O motor de mentira: anota cada pedido que muda alguma coisa e responde o que a prova pediu.
function criarRoteador(base, { inicio = null, chamadas, explorar = [], respostas = {} }) {
  const origem = new URL(base).host;
  return (route) => {
    const req = route.request();
    const u = new URL(req.url());
    if (u.pathname.startsWith('/api/')) {
      const corpo = req.postData();
      if (req.method() !== 'GET') chamadas.push({ metodo: req.method(), caminho: u.pathname, corpo: corpo ? JSON.parse(corpo) : null });
      let resposta = {};
      if (u.pathname === '/api/inicio') resposta = inicio || {};
      else if (u.pathname === '/api/teams/explorar') resposta = { teams: explorar };
      else if (req.method() === 'POST' && /\/pedir-entrada$/.test(u.pathname)) resposta = { entrou: u.pathname.includes('candanga') || u.pathname.includes('guara') };
      else if (req.method() === 'POST' && u.pathname === '/api/teams') resposta = { team: { id: 't1', slug: 'time-teste', nome: 'Time Teste' }, joga: true };
      else if (req.method() === 'POST' && /\/convite$/.test(u.pathname)) resposta = { token: 'tok-123', codigo: 'ABC123' };
      else if (u.pathname === '/api/me') resposta = inicio?.me || {};
      else if (u.pathname in respostas) resposta = respostas[u.pathname];
      else if (req.method() !== 'GET') resposta = { ok: true };
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(resposta) });
    }
    if (u.pathname.startsWith('/imagens-prova/')) return route.fulfill({ status: 200, contentType: 'image/png', body: PNG_1X1 });
    if (u.host === origem) return route.continue();
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  };
}

export async function abrir(navegador, base, { largura = 390, altura = ALTURA, caminho = '/home', inicio = null, explorar = [], respostas = {}, plantar = {} } = {}) {
  const ctx = await navegador.newContext({ viewport: { width: largura, height: altura }, deviceScaleFactor: 1, isMobile: true, hasTouch: true, locale: 'pt-BR', timezoneId: SP });
  await ctx.addInitScript((itens) => {
    // `plantar`: chaves do localStorage já postas antes de o app abrir (o "Agora não" de dias atrás, por exemplo)
    try { for (const [k, v] of Object.entries(itens)) localStorage.setItem(k, v); } catch { /* sem storage */ }
  }, plantar);
  await ctx.addInitScript(({ chave, sessao }) => {
    try { localStorage.setItem('futty_cookies', 'aceite'); localStorage.setItem(chave, sessao); } catch { /* sem storage */ }
    // O Chromium sem tela nasce com a permissão de notificações NEGADA e o aviso "Ativar notificações" nunca apareceria. Aqui ela está "default".
    try { Object.defineProperty(window.Notification, 'permission', { get: () => 'default', configurable: true }); } catch { /* sem Notification */ }
  }, { chave: `sb-${REF}-auth-token`, sessao: SESSAO });
  const page = await ctx.newPage();
  const erros = [];
  const chamadas = [];
  page.on('pageerror', (e) => erros.push(e.message));
  await page.route('**/*', criarRoteador(base, { inicio, chamadas, explorar, respostas }));
  await page.goto(`${base}/scripts/provas/rodada-29t-b.html`, { waitUntil: 'domcontentloaded' });
  await page.locator('[data-casa]').waitFor({ timeout: 20000 });
  await page.evaluate((c) => { window.history.pushState({}, '', c); window.dispatchEvent(new PopStateEvent('popstate')); }, caminho);
  return { ctx, page, erros, chamadas };
}

// FUTTY_PROVA_PRINTS=<pasta>: guarda uma imagem de cada estado importante (para a Freaky olhar). Sem a variável, nada é gravado.
async function imagem(page, nomeDoArquivo) {
  if (process.env.FUTTY_PROVA_PRINTS) await page.screenshot({ path: `${process.env.FUTTY_PROVA_PRINTS}/${nomeDoArquivo}.png` });
}
const avisos = (page) => page.locator('[data-aviso]');
const tipoDoAviso = async (page) => ((await avisos(page).count()) === 1 ? avisos(page).first().getAttribute('data-aviso') : `${await avisos(page).count()} avisos`);
async function esperarAviso(page, tipo, ms = 8000) {
  await page.locator(`[data-aviso="${tipo}"]`).waitFor({ timeout: ms });
}
async function esperarChamada(chamadas, procura, ms = 4000) {
  const fim = Date.now() + ms;
  while (Date.now() < fim) {
    if (chamadas.some(procura)) return true;
    await new Promise((r) => setTimeout(r, 50));
  }
  return false;
}

export async function rodar({ navegador, base, t }) {
  // FUTTY_PROVA_PARTE=<parte>: roda só uma parte (fila, pronta, nascendo, card, seus-times, radar, criar, criar-pt, ajustes) — para depurar sem esperar a prova inteira.
  const so = process.env.FUTTY_PROVA_PARTE || '';
  const roda = (parte) => !so || so === parte;
  // ── A fila única: todos os avisos do topo, um por vez, na ordem decidida ──────────────────────────────────────────────────────────────────
  if (roda('fila')) {
    const inicio = payloadInicio({
      jogos: [jogo('g1', TIMES[0], 2)],
      pedidos: [pendente('p1', 'Pelada do Bandeirante'), aceito('d1', 'Racha da Candanga')],
      votacoes: [{ slug: 'missa', nome: 'Missa de Quinta', faltam: 2, pedido_revotacao: false }],
      denuncias: 1,
      nascimento: true,
    });
    const { ctx, page, erros, chamadas } = await abrir(navegador, base, { inicio });
    await esperarAviso(page, 'jogo', 25000);
    const ordem = [];
    const registrar = async () => { ordem.push(await tipoDoAviso(page)); };
    await registrar();
    t('1º: o jogo sem resposta, sozinho no topo', ordem[0] === 'jogo', ordem[0]);
    await imagem(page, 'fila-1-jogo');
    await page.locator('[data-aviso-vou]').click();

    await esperarAviso(page, 'pedido'); await registrar();
    t('respondeu o jogo → entra o pedido pendente (um só aviso na tela)', ordem[1] === 'pedido', ordem[1]);
    t('o jogo respondido chamou a mesma API dos cards: POST /api/games/g1/confirmar', await esperarChamada(chamadas, (c) => c.metodo === 'POST' && c.caminho === '/api/games/g1/confirmar'));
    await imagem(page, 'fila-2-pedido');
    await page.locator('[data-aviso="pedido"]').getByRole('button', { name: 'Cancelar' }).click();

    await esperarAviso(page, 'desfecho'); await registrar();
    t('cancelou o pedido → entra a resposta do outro pedido ("Você entrou no time Racha da Candanga!")', ordem[2] === 'desfecho' && /Você entrou no time Racha da Candanga!/.test(await page.locator('[data-aviso="desfecho"]').innerText()), ordem[2]);
    await imagem(page, 'fila-3-desfecho');
    await page.locator('[data-aviso="desfecho"] [aria-label="Dispensar"]').click();

    await esperarAviso(page, 'votacao'); await registrar();
    t('dispensou a resposta → entra a votação ("Você tem colegas para avaliar")', ordem[3] === 'votacao' && /colegas para avaliar/.test(await page.locator('[data-aviso="votacao"]').innerText()), ordem[3]);
    await imagem(page, 'fila-4-votacao');
    await page.locator('[data-aviso="votacao"] [aria-label="Dispensar"]').click();

    await esperarAviso(page, 'denuncia'); await registrar();
    t('dispensou a votação → entra o desfecho da denúncia (ainda é o que aconteceu, antes dos lembretes)', ordem[4] === 'denuncia', ordem[4]);
    await page.locator('[data-aviso="denuncia"] [aria-label="Fechar"]').click();

    await esperarAviso(page, 'nascimento'); await registrar();
    t('fechou a denúncia → só agora entra o lembrete da data de nascimento', ordem[5] === 'nascimento', ordem[5]);
    t('o lembrete traz o "Agora não"', (await page.locator('[data-aviso="nascimento"] [data-agora-nao]').count()) === 1);
    await imagem(page, 'fila-6-nascimento');
    await page.locator('[data-aviso="nascimento"] [data-agora-nao]').click();
    t('"Agora não" guarda o adiamento neste aparelho (7 dias)', await page.evaluate(() => { const v = Number(localStorage.getItem('futty_agora_nao_nascimento')); return v > Date.now() - 60000 && v <= Date.now(); }));

    await esperarAviso(page, 'notificacoes'); await registrar();
    t('"Agora não" → a fila anda: as notificações são o ÚLTIMO', ordem[6] === 'notificacoes', ordem[6]);
    await imagem(page, 'fila-7-notificacoes');
    await page.locator('[data-aviso="notificacoes"] [aria-label="Fechar"]').click();
    await page.waitForFunction(() => document.querySelectorAll('[data-aviso]').length === 0, null, { timeout: 5000 });
    t('a ordem inteira: jogo → pedido → resposta do pedido → votação → denúncia → nascimento (lembrete) → notificações', JSON.stringify(ordem) === JSON.stringify(['jogo', 'pedido', 'desfecho', 'votacao', 'denuncia', 'nascimento', 'notificacoes']), JSON.stringify(ordem));
    t('fechada a fila, nenhum aviso sobra no topo', (await avisos(page).count()) === 0);
    t('a fila roda sem exceção', erros.length === 0, erros.slice(0, 2).join(' | '));
    await ctx.close();
  }

  // ── A figurinha para gerar (cartão dourado) é um lembrete: vem DEPOIS do que aconteceu, ANTES da data de nascimento e das notificações; "Agora não" a faz andar ──
  if (roda('pronta')) {
    const inicio = payloadInicio({ denuncias: 1, nascimento: true, foto: true, direito: 'time' });
    const { ctx, page } = await abrir(navegador, base, { inicio });
    await esperarAviso(page, 'denuncia', 25000);
    await page.waitForTimeout(600);
    t('o desfecho da denúncia (aconteceu) passa à frente do lembrete da figurinha, e é o único aviso', (await tipoDoAviso(page)) === 'denuncia', await tipoDoAviso(page));
    await page.locator('[data-aviso="denuncia"] [aria-label="Fechar"]').click();
    await esperarAviso(page, 'figurinha-pronta');
    await page.waitForTimeout(600);
    t('sem nada que tenha acontecido, só o cartão "Você tem uma figurinha para gerar" aparece — a data de nascimento e as notificações esperam atrás dele', (await tipoDoAviso(page)) === 'figurinha-pronta' && /figurinha para gerar/.test(await page.locator('[data-aviso]').innerText()), await tipoDoAviso(page));
    await imagem(page, 'lembrete-figurinha-pronta');
    t('o cartão traz o "Agora não" e continua levando à Figurinha', (await page.locator('[data-aviso="figurinha-pronta"] [data-agora-nao]').count()) === 1 && (await page.locator('[data-aviso="figurinha-pronta"] a[href="/figurinha"]').count()) === 1);
    await page.locator('[data-aviso="figurinha-pronta"] [data-agora-nao]').click();
    await esperarAviso(page, 'nascimento');
    t('"Agora não" na figurinha → entra o próximo lembrete (data de nascimento), e a figurinha não volta', (await tipoDoAviso(page)) === 'nascimento' && (await page.locator('[data-aviso="figurinha-pronta"]').count()) === 0, await tipoDoAviso(page));
    t('a figurinha ficou adiada neste aparelho (7 dias)', await page.evaluate(() => Number(localStorage.getItem('futty_agora_nao_figurinha-pronta')) > Date.now() - 60000));
    await page.locator('[data-aviso="nascimento"] [data-agora-nao]').click();
    await esperarAviso(page, 'notificacoes');
    t('os dois lembretes adiados: ativar notificações, por último, aparece (a fila não trava)', (await tipoDoAviso(page)) === 'notificacoes', await tipoDoAviso(page));
    await ctx.close();
  }
  // ── A figurinha nascendo é o que acontece agora: passa à frente de todos os lembretes ──────────────────────────────────────────────────
  if (roda('nascendo')) {
    const inicio = payloadInicio({ nascimento: true, figurinha: 'gerando' });
    const { ctx, page } = await abrir(navegador, base, { inicio });
    await esperarAviso(page, 'figurinha-nascendo', 25000);
    await page.waitForTimeout(600);
    t('"Sua figurinha está sendo criada…" vem antes do lembrete da data de nascimento, e é o único aviso', (await tipoDoAviso(page)) === 'figurinha-nascendo' && /sendo criada/.test(await page.locator('[data-aviso]').innerText()), await tipoDoAviso(page));
    await ctx.close();
  }
  // a que não saiu ("Não deu para gerar sua figurinha agora"): "Agora não" a esconde e a fila anda
  if (roda('nascendo')) {
    const inicio = payloadInicio({ nascimento: true, figurinha: 'falhou' });
    const { ctx, page } = await abrir(navegador, base, { inicio });
    await esperarAviso(page, 'figurinha-nascendo', 25000);
    await page.waitForTimeout(600);
    t('a figurinha que não saiu traz o "Agora não" e o botão "Ir para Figurinha"', /Não deu para gerar sua figurinha/.test(await page.locator('[data-aviso]').innerText()) && (await page.locator('[data-aviso="figurinha-nascendo"] [data-agora-nao]').count()) === 1);
    await page.locator('[data-aviso="figurinha-nascendo"] [data-agora-nao]').click();
    await esperarAviso(page, 'nascimento');
    t('"Agora não" → a fila anda para a data de nascimento', (await tipoDoAviso(page)) === 'nascimento', await tipoDoAviso(page));
    await ctx.close();
  }
  // ── "Complete seu card" (sem foto): lembrete com "Agora não" (antes não tinha X: segurava a fila para sempre) ───────────────────────────
  if (roda('card')) {
    const inicio = payloadInicio({ foto: false });
    const { ctx, page } = await abrir(navegador, base, { inicio });
    await esperarAviso(page, 'card', 25000);
    await page.waitForTimeout(600);
    t('sem foto, "Complete seu card" é o aviso e as notificações esperam atrás dele', (await tipoDoAviso(page)) === 'card' && /Complete seu card/.test(await page.locator('[data-aviso]').innerText()), await tipoDoAviso(page));
    t('o card traz o "Agora não"', (await page.locator('[data-aviso="card"] [data-agora-nao]').count()) === 1);
    await imagem(page, 'lembrete-card');
    await page.locator('[data-aviso="card"] [data-agora-nao]').click();
    await esperarAviso(page, 'notificacoes');
    t('"Agora não" → o card some por 7 dias e entram as notificações', (await tipoDoAviso(page)) === 'notificacoes' && (await page.locator('[data-aviso="card"]').count()) === 0, await tipoDoAviso(page));
    await ctx.close();
  }
  // ── o "Agora não" vale 7 dias NAQUELE aparelho: com a marca de ontem o lembrete não volta; com a de 8 dias atrás, volta ──────────────
  if (roda('lembrete-7-dias')) {
    for (const [dias, volta] of [[1, false], [8, true]]) {
      const inicio = payloadInicio({ foto: false });
      const { ctx, page } = await abrir(navegador, base, { inicio, plantar: { futty_agora_nao_card: String(Date.now() - dias * DIA) } });
      await esperarAviso(page, volta ? 'card' : 'notificacoes', 25000);
      t(volta ? 'adiado há 8 dias: o card volta' : 'adiado ontem: o card continua escondido e as notificações entram', (await page.locator('[data-aviso="card"]').count()) === (volta ? 1 : 0), await tipoDoAviso(page));
      await ctx.close();
    }
  }

  // ── "Seus times": os com pendência primeiro, nenhum atrás do "Ver todos" ─────────────────────────────────────────────────────────────────
  if (roda('seus-times')) {
    const linhas = (page) => page.locator('[data-seus-times] [data-time-linha]').evaluateAll((els) => els.map((e) => e.getAttribute('data-time-linha')));
    const verTodos = (page) => page.locator('[data-ver-todos]');
    // 1 time com pendência (o último): sobe para o topo; o "Ver todos (4)" esconde só os sem pendência
    {
      const { ctx, page } = await abrir(navegador, base, { inicio: payloadInicio({ comPendencia: [3] }) });
      await page.locator('[data-seus-times]').waitFor({ timeout: 25000 });
      t('4 times, só o "Racha do Guará" com pendência: ele sobe para a 1ª linha e a lista fechada tem 2', JSON.stringify(await linhas(page)) === JSON.stringify(['racha-do-guara', 'missa']), JSON.stringify(await linhas(page)));
      t('...e o "Ver todos (4)" continua lá', /Ver todos \(4\)/.test(await verTodos(page).innerText()));
      await verTodos(page).click();
      t('"Ver todos" abre o resto no lugar, na mesma ordem (pendência primeiro)', JSON.stringify(await linhas(page)) === JSON.stringify(['racha-do-guara', 'missa', 'varzea-fc', 'quinta-raiz']), JSON.stringify(await linhas(page)));
      await ctx.close();
    }
    // 3 times com pendência: a lista fechada cresce até caberem os 3
    {
      const { ctx, page } = await abrir(navegador, base, { inicio: payloadInicio({ comPendencia: [1, 2, 3] }) });
      await page.locator('[data-seus-times]').waitFor({ timeout: 25000 });
      t('3 times com pendência: a lista fechada mostra os 3 (nenhum atrás do "Ver todos")', JSON.stringify(await linhas(page)) === JSON.stringify(['varzea-fc', 'quinta-raiz', 'racha-do-guara']), JSON.stringify(await linhas(page)));
      t('...e o "Ver todos (4)" só esconde o que não pede nada', /Ver todos \(4\)/.test(await verTodos(page).innerText()));
      await ctx.close();
    }
    // todos com pendência: todos aparecem e o botão nem existe
    {
      const { ctx, page } = await abrir(navegador, base, { inicio: payloadInicio({ comPendencia: [0, 1, 2, 3] }) });
      await page.locator('[data-seus-times]').waitFor({ timeout: 25000 });
      t('4 times, todos com pendência: os 4 aparecem e não há "Ver todos"', (await linhas(page)).length === 4 && (await verTodos(page).count()) === 0);
      await ctx.close();
    }
  }

  // ── O Radar: o time se apresenta (bairro + "Sobre o time"), tocar abre o pop-up ───────────────────────────────────────────────────────────
  if (roda('radar')) {
    const LONGO = 'Turma de 40+, joga domingo de manhã perto do Cruzeiro. Chega cedo, café depois do jogo, ninguém é obrigado a ser bom de bola, só a ser gente boa. Traz a chuteira, a água e a boa vontade.';
    const explorar = [
      { id: 'E1', slug: 'racha-do-guara', nome: 'Racha do Guará', cidade: 'Brasília, DF', bairro: 'Guará', descricao: LONGO, membro_count: 12, modo_visibilidade: 'publico_aberto', ja_membro: false, pedido_pendente: false },
      { id: 'E2', slug: 'pelada-do-bandeirante', nome: 'Pelada do Bandeirante', cidade: 'Brasília, DF', bairro: null, descricao: 'Sábado à tarde, no Núcleo Bandeirante.', membro_count: 15, modo_visibilidade: 'publico_aprovacao', ja_membro: false, pedido_pendente: false },
      { id: 'E3', slug: 'os-pica', nome: 'Os Pica', cidade: 'Lisboa, Portugal', bairro: 'Alvalade', descricao: null, membro_count: 9, modo_visibilidade: 'publico_aberto', ja_membro: false, pedido_pendente: false },
      { id: 'E4', slug: 'boleiros-do-cruzeiro', nome: 'Boleiros do Cruzeiro', cidade: 'Brasília, DF', bairro: 'Cruzeiro', descricao: 'Quinta à noite.', membro_count: 11, modo_visibilidade: 'publico_aberto', ja_membro: true, pedido_pendente: false },
    ];
    const { ctx, page, erros, chamadas } = await abrir(navegador, base, { caminho: '/explorar', explorar });
    await page.getByText('Racha do Guará', { exact: true }).first().waitFor({ timeout: 25000 });
    await page.waitForTimeout(500);
    const card = (slug) => page.locator(`[data-card-do-time="${slug}"]`);
    const local = async (slug) => (await card(slug).locator('[data-local-do-time]').innerText()).replace(/\s+/g, ' ').trim();

    t('o card mostra "Bairro · Cidade" embaixo do nome', (await local('racha-do-guara')) === 'Guará · Brasília, DF', await local('racha-do-guara'));
    t('sem bairro, só a cidade', (await local('pelada-do-bandeirante')) === 'Brasília, DF', await local('pelada-do-bandeirante'));
    t('em Portugal o bairro é a freguesia: "Alvalade · Lisboa, Portugal"', (await local('os-pica')) === 'Alvalade · Lisboa, Portugal', await local('os-pica'));
    const sobre = card('racha-do-guara').locator('[data-sobre-do-time]');
    const medida = await sobre.evaluate((el) => { const cs = getComputedStyle(el); return { linhas: Math.round(el.clientHeight / parseFloat(cs.lineHeight)), cortado: el.scrollHeight > el.clientHeight + 1 }; });
    t('o "Sobre o time" ocupa no máximo 2 linhas e o texto longo fica cortado (com "…")', medida.linhas <= 2 && medida.cortado, JSON.stringify(medida));
    t('o texto curto cabe inteiro e não é cortado', await card('pelada-do-bandeirante').locator('[data-sobre-do-time]').evaluate((el) => el.scrollHeight <= el.clientHeight + 1));
    t('time sem "Sobre o time" (antigo) não ganha linha vazia', (await card('os-pica').locator('[data-sobre-do-time]').count()) === 0);
    await imagem(page, 'radar-cards');

    // tocar no botão NÃO abre o pop-up; tocar no card abre
    await card('pelada-do-bandeirante').getByRole('button', { name: 'Pedir entrada', exact: true }).click();
    await page.getByText('Pedido enviado ✓').first().waitFor({ timeout: 8000 });
    t('tocar no botão do card age (pediu entrada) e NÃO abre o pop-up', (await page.locator('[data-popup-do-time]').count()) === 0 && await esperarChamada(chamadas, (c) => c.caminho === '/api/teams/pelada-do-bandeirante/pedir-entrada'));

    await card('racha-do-guara').locator('[data-abrir-time]').click();
    const popup = page.locator('[data-popup-do-time="racha-do-guara"]');
    await popup.waitFor({ timeout: 5000 });
    const dentro = (await popup.innerText()).replace(/\s+/g, ' ');
    t('tocar no card abre o pop-up: nome, "Guará · Brasília, DF", "12 membros · aberto" e "Sobre o time"', /Racha do Guará/.test(dentro) && /Guará · Brasília, DF/.test(dentro) && /12 membros · aberto/.test(dentro) && /Sobre o time/i.test(dentro), dentro.slice(0, 200));
    t('...com o texto INTEIRO (sem corte)', dentro.includes(LONGO), dentro);
    t('...com o escudo e o mesmo botão "Entrar"', (await popup.locator('[data-escudo]').count()) === 1 && (await popup.getByRole('button', { name: 'Entrar', exact: true }).count()) === 1);
    await imagem(page, 'radar-popup');
    await popup.getByRole('button', { name: 'Entrar', exact: true }).click();
    await popup.locator('[data-entrou-agora]').waitFor({ timeout: 8000 });
    t('entrar pelo pop-up chama a mesma API e o pop-up comemora ("Você entrou!" + "Ver o time")', await esperarChamada(chamadas, (c) => c.metodo === 'POST' && c.caminho === '/api/teams/racha-do-guara/pedir-entrada') && /Você entrou!/.test(await popup.innerText()) && /Ver o time/.test(await popup.innerText()));
    await page.locator('[data-fechar-popup]').click();
    await page.locator('[data-popup-do-time]').waitFor({ state: 'detached', timeout: 3000 });
    t('o X fecha o pop-up, e o card por trás já mostra "Você entrou!" com 13 membros', /Você entrou!/.test(await card('racha-do-guara').innerText()) && /13 membros/.test(await card('racha-do-guara').innerText()));

    // Esc e o toque fora fecham; time sem "Sobre o time" diz isso; membro vai direto ao time
    await card('os-pica').locator('[data-abrir-time]').click();
    await page.locator('[data-popup-do-time="os-pica"]').waitFor({ timeout: 5000 });
    t('time antigo, sem texto: o pop-up diz "Este time ainda não contou como ele é."', /Este time ainda não contou como ele é\./.test(await page.locator('[data-popup-do-time]').innerText()));
    const fechou = () => page.locator('[data-popup-do-time]').waitFor({ state: 'detached', timeout: 3000 }).then(() => true, () => false);
    await page.keyboard.press('Escape');
    t('Esc fecha o pop-up', await fechou());
    await card('os-pica').locator('[data-abrir-time]').click();
    await page.locator('[data-popup-do-time="os-pica"]').waitFor({ timeout: 5000 });
    await page.mouse.click(6, 420); // o véu, na margem ao lado do cartão (a barra do topo fica por cima do véu na faixa de cima)
    t('o toque fora do pop-up (no véu) também fecha', await fechou());

    t('o Radar roda sem exceção', erros.length === 0, erros.slice(0, 2).join(' | '));
    await card('boleiros-do-cruzeiro').locator('[data-abrir-time]').click();
    await page.waitForFunction(() => location.pathname === '/time/boleiros-do-cruzeiro', null, { timeout: 5000 });
    t('quem já é membro vai direto ao time (como sempre foi), sem pop-up', (await page.locator('[data-popup-do-time]').count()) === 0);
    await ctx.close();
  }

  // ── Criar time: o Bairro só com cidade que tem lista, só da lista, e o "Sobre o time" no passo 3 ──────────────────────────────────────────
  if (roda('criar')) {
    const { ctx, page, erros, chamadas } = await abrir(navegador, base, { caminho: '/criar-time' });
    await page.locator('input[placeholder="Ex.: Domingueira FC"]').waitFor({ timeout: 25000 });
    const campoCidade = page.getByPlaceholder('Ex.: Brasília');
    const bairro = page.locator('[data-campo-bairro]');
    const fora = () => page.getByText('Nome do time', { exact: true }).first().click(); // um toque em lugar neutro: o campo Bairro confere o texto
    const escolherCidade = async (digitar, opcao) => {
      await campoCidade.click();
      await campoCidade.fill(digitar);
      await page.locator('[data-sugestoes-cidade] button', { hasText: opcao }).first().click({ timeout: 15000 });
      await page.waitForTimeout(500);
    };
    await page.locator('input[placeholder="Ex.: Domingueira FC"]').fill('Racha do Guará');

    t('sem cidade o campo Bairro nem aparece (não há campo apagado)', (await bairro.count()) === 0 && !/BAIRRO/i.test(await page.locator('main').innerText()));
    // 29T-C: São Paulo capital não tem bairros no Censo, mas tem os 96 distritos oficiais do IBGE — o campo aparece e sugere "Pinheiros"
    await escolherCidade('São Paulo', 'São Paulo, SP');
    await bairro.waitFor({ timeout: 10000 });
    await bairro.click();
    await bairro.fill('pinhei');
    await page.locator('[data-sugestoes-bairro] button', { hasText: 'Pinheiros' }).first().waitFor({ timeout: 5000 });
    t('São Paulo (capital): os distritos do IBGE viram a lista — o campo Bairro aparece e "pinhei" sugere "Pinheiros"', (await page.locator('[data-sugestoes-bairro] button').allInnerTexts()).includes('Pinheiros'));
    await imagem(page, 'criar-bairro-sao-paulo');
    await bairro.fill('');
    // Rio Branco (AC) tem um distrito só: não há o que escolher, o campo some
    await escolherCidade('Rio Branc', 'Rio Branco, AC');
    t('Rio Branco, AC (um distrito só no IBGE): o campo Bairro não aparece e o que estava escrito sai', (await bairro.count()) === 0);
    await escolherCidade('Brasíl', 'Brasília, DF');
    await bairro.waitFor({ timeout: 10000 });
    t('Brasília, DF: o campo Bairro (opcional) aparece, com "Onde vocês jogam"', (await bairro.getAttribute('placeholder')) === 'Onde vocês jogam' && /BAIRRO \(OPCIONAL\)/i.test(await page.locator('main').innerText()));
    await imagem(page, 'criar-bairro-vazio');

    // só da lista: o que não está lá volta ao que valia
    await bairro.click();
    await bairro.fill('Pinheiros');
    await page.waitForTimeout(200);
    t('digitando um bairro que a lista não tem, nenhuma sugestão', (await page.locator('[data-sugestoes-bairro] button').count()) === 0);
    await fora();
    await page.waitForTimeout(250);
    t('tocar fora com "Pinheiros" (fora da lista) apaga o campo: texto livre não existe', (await bairro.inputValue()) === '', await bairro.inputValue());

    await bairro.click();
    await bairro.fill('guar');
    await page.locator('[data-sugestoes-bairro] button', { hasText: 'Guará' }).first().waitFor({ timeout: 5000 });
    const sugeridos = await page.locator('[data-sugestoes-bairro] button').allInnerTexts();
    t('digitando "guar" a lista sugere "Guará" (Regiões Administrativas do DF, do IBGE)', sugeridos.includes('Guará'), sugeridos.join(','));
    await imagem(page, 'criar-bairro-sugestoes');
    await page.locator('[data-sugestoes-bairro] button', { hasText: 'Guará' }).first().click();
    t('escolher da lista preenche o campo', (await bairro.inputValue()) === 'Guará');

    // escrever o nome inteiro e sair também vale (sem acento, sem maiúscula)
    await bairro.click();
    await bairro.fill('nucleo bandeirante');
    await fora();
    await page.waitForTimeout(250);
    t('o nome inteiro, sem acento nem maiúscula, vale como o da lista ("Núcleo Bandeirante")', (await bairro.inputValue()) === 'Núcleo Bandeirante', await bairro.inputValue());
    await bairro.click();
    await bairro.fill('Guará');
    await page.locator('[data-sugestoes-bairro] button', { hasText: 'Guará' }).first().click();

    // trocar de cidade limpa o bairro (ele é da cidade antiga)
    await campoCidade.click();
    await campoCidade.fill('Belo Horiz');
    await page.waitForTimeout(300);
    t('mexer na cidade limpa o bairro, que era da cidade antiga (e o campo some até a nova cidade ter lista)', (await bairro.count()) === 0);
    await page.locator('[data-sugestoes-cidade] button', { hasText: 'Belo Horizonte, MG' }).first().click({ timeout: 15000 });
    await bairro.waitFor({ timeout: 10000 });
    t('Belo Horizonte, MG tem bairros no IBGE (476): o campo volta vazio', (await bairro.inputValue()) === '');
    await escolherCidade('Brasíl', 'Brasília, DF');
    await bairro.waitFor({ timeout: 10000 });
    await bairro.click();
    await bairro.fill('Guará');
    await page.locator('[data-sugestoes-bairro] button', { hasText: 'Guará' }).first().click();

    // passo 2 → passo 3: o "Sobre o time"
    await page.locator('[data-continuar-passo-1]').click();
    await page.getByRole('button', { name: 'Continuar' }).waitFor();
    await page.getByRole('button', { name: 'Continuar' }).click();
    await page.getByText('Aceita novos membros?').waitFor({ timeout: 8000 });
    const criar = page.getByRole('button', { name: 'Criar o time', exact: true });
    const sobre = page.locator('#sobre-o-time');
    t('"Fechado" (o padrão) não pede o "Sobre o time" e o "Criar o time" está aceso', (await sobre.count()) === 0 && (await criar.isEnabled()));
    await page.getByRole('button', { name: /^Aberto/ }).click();
    await sobre.waitFor({ timeout: 3000 });
    t('"Aberto": aparece o campo "Sobre o time" com o exemplo; "Criar o time" fica apagado até escrever', (await sobre.getAttribute('placeholder')) === 'Ex.: Turma de 40+, joga domingo de manhã perto do Cruzeiro.' && (await criar.isDisabled()) && /Conte como é o time para criar\./.test(await page.locator('main').innerText()));
    await imagem(page, 'criar-passo3-aberto');
    await sobre.fill('   ');
    t('só espaços não vale', await criar.isDisabled());
    await page.getByRole('button', { name: /^Só com a sua aprovação/ }).click();
    t('"Só com a sua aprovação" também pede (o campo continua lá)', (await sobre.count()) === 1 && (await criar.isDisabled()));
    await page.getByRole('button', { name: /^Fechado/ }).click();
    t('voltar a "Fechado" tira o campo e acende o botão', (await sobre.count()) === 0 && (await criar.isEnabled()));
    await page.getByRole('button', { name: /^Aberto/ }).click();
    await sobre.fill('Turma de 40+, joga domingo de manhã perto do Cruzeiro.');
    t('com o texto escrito o "Criar o time" acende', await criar.isEnabled());
    t('o campo tem teto de 300 letras', (await sobre.getAttribute('maxlength')) === '300');
    await criar.click();
    await page.getByText('Seu time está no ar!').waitFor({ timeout: 10000 });
    const post = chamadas.find((c) => c.metodo === 'POST' && c.caminho === '/api/teams');
    t('o POST leva a cidade da lista, o bairro da lista COM a coordenada e o "Sobre o time" (descricao)', !!post && post.corpo.cidade === 'Brasília' && post.corpo.uf === 'DF' && post.corpo.bairro === 'Guará' && post.corpo.bairro_origem === 'lista' && Number.isFinite(post.corpo.bairro_lat) && Number.isFinite(post.corpo.bairro_lng) && post.corpo.descricao === 'Turma de 40+, joga domingo de manhã perto do Cruzeiro.', JSON.stringify(post?.corpo));
    t('...e a política de entrada vai no PATCH que já existia', chamadas.some((c) => c.metodo === 'PATCH' && c.caminho === '/api/teams/time-teste' && c.corpo?.modo_visibilidade === 'publico_aberto'));
    t('o Criar time roda sem exceção', erros.length === 0, erros.slice(0, 2).join(' | '));
    await ctx.close();
  }

  // ── Criar time em Portugal: a freguesia continua (agora só da lista) ───────────────────────────────────────────────────────────────────────
  if (roda('criar-pt')) {
    const { ctx, page } = await abrir(navegador, base, { caminho: '/criar-time' });
    await page.locator('input[placeholder="Ex.: Domingueira FC"]').waitFor({ timeout: 25000 });
    await page.locator('input[placeholder="Ex.: Domingueira FC"]').fill('Alvalade FC');
    const campoCidade = page.getByPlaceholder('Ex.: Brasília');
    await campoCidade.click();
    await campoCidade.fill('Lisbo');
    await page.locator('[data-sugestoes-cidade] button', { hasText: 'Lisboa, Portugal' }).first().click({ timeout: 15000 });
    const bairro = page.locator('[data-campo-bairro]');
    const fora = () => page.getByText('Nome do time', { exact: true }).first().click(); // um toque em lugar neutro: o campo Bairro confere o texto
    await bairro.waitFor({ timeout: 10000 });
    await bairro.click();
    await bairro.fill('Alval');
    await page.locator('[data-sugestoes-bairro] button', { hasText: 'Alvalade' }).first().click({ timeout: 8000 });
    t('Lisboa, Portugal: o campo sugere as freguesias do concelho e "Alvalade" entra da lista', (await bairro.inputValue()) === 'Alvalade');
    await bairro.click();
    await bairro.fill('Pinheiros');
    await fora();
    await page.waitForTimeout(250);
    t('...e em Portugal também só da lista: "Pinheiros" volta a "Alvalade"', (await bairro.inputValue()) === 'Alvalade', await bairro.inputValue());
    await campoCidade.click();
    await campoCidade.fill('Madrid');
    await page.waitForTimeout(400);
    t('cidade fora do Brasil e de Portugal (texto livre): sem lista, sem campo Bairro', (await bairro.count()) === 0);
    await ctx.close();
  }

  // ── Ajustes do time: "Sobre o time", o bairro de lista e a pergunta ao abrir o time ─────────────────────────────────────────────────────
  if (roda('ajustes')) {
    const DIA_MS = DIA;
    const montar = ({ cidade, bairro: bairroSalvo = null, modo = 'privado', descricao = '' }) => {
      const team = { id: 'T1', slug: 'varzea-fc', nome: 'Várzea FC', cor: 'vinho', escudo_cor2: 'ouro', escudo_padrao: 'faixa', role: 'admin', joga: true, fuso: SP, cidade, bairro: bairroSalvo, descricao, jogadores_por_time: 6, mostrar_gols: true, modo_visibilidade: modo, logo_url: null };
      const members = [{ id: 'U1', nome: 'Tonhão', role: 'admin', joga: true, goleiro: false }];
      return {
        '/api/teams/varzea-fc': { team, members },
        '/api/teams/varzea-fc/games': { team, games: [{ id: 'g-futuro', data: new Date(Date.now() + 3 * DIA_MS).toISOString(), local: 'Campo da Vila', status: 'agendado', confirmados: 4, sorteio_realizado: false }] },
        '/api/teams/varzea-fc/pedidos': { pedidos: [] },
        '/api/push/preferencias': { preferencias: { jogos: true, pedidos: true, figurinha: true, resenha: true }, admin: true, salvavel: true },
      };
    };
    const ir = async (opcoes) => {
      const r = await abrir(navegador, base, { caminho: '/time/varzea-fc?aba=ajustes', respostas: montar(opcoes) });
      await r.page.locator('[data-ajustes-do-time]').waitFor({ timeout: 25000 });
      return r;
    };

    // Brasília: o bairro de lista aparece; "Descrição" virou "Sobre o time"; abrir o time sem o texto pede o texto
    {
      const { ctx, page, chamadas, erros } = await ir({ cidade: 'Brasília, DF', bairro: 'Guará', modo: 'privado', descricao: '' });
      const bairro = page.locator('[data-campo-bairro]');
      await bairro.waitFor({ timeout: 10000 });
      const ajustes = await page.locator('[data-ajustes-do-time]').innerText();
      t('Ajustes: o campo se chama "Sobre o time" (não mais "Descrição") e traz o exemplo do dono', /Sobre o time/.test(ajustes) && !/Descrição/.test(ajustes) && (await page.locator('[data-sobre-o-time]').getAttribute('placeholder')) === 'Ex.: Turma de 40+, joga domingo de manhã perto do Cruzeiro.');
      t('Brasília, DF (Regiões Administrativas): o campo Bairro aparece com o bairro salvo', (await bairro.inputValue()) === 'Guará');
      await imagem(page, 'ajustes-sobre');

      await page.getByRole('button', { name: /^Aberto/ }).click();
      await page.locator('[data-sobre-o-time-pergunta]').waitFor({ timeout: 5000 });
      t('tocar em "Aberto" sem "Sobre o time" abre a pergunta e NÃO chama o motor', (await page.locator('.modal-card').innerText()).includes('conte como ele é') && !chamadas.some((c) => c.metodo === 'PATCH'));
      const salvarPergunta = page.locator('.modal-card').getByRole('button', { name: 'Salvar', exact: true });
      t('...e o "Salvar" da pergunta só acende com o texto', await salvarPergunta.isDisabled());
      await imagem(page, 'ajustes-pergunta');
      await page.locator('.modal-card').getByRole('button', { name: 'Cancelar' }).click();
      t('cancelar a pergunta deixa o time como estava (privado), sem chamada', (await page.locator('.modal-card').count()) === 0 && !chamadas.some((c) => c.metodo === 'PATCH') && (await page.getByRole('button', { name: /^Privado/ }).getAttribute('aria-pressed')) === 'true');

      await page.getByRole('button', { name: /^Aberto/ }).click();
      await page.locator('[data-sobre-o-time-pergunta]').fill('Turma de 40+, joga domingo de manhã perto do Cruzeiro.');
      await page.locator('.modal-card').getByRole('button', { name: 'Salvar', exact: true }).click();
      await page.locator('.modal-card').waitFor({ state: 'detached', timeout: 5000 });
      const patch = chamadas.find((c) => c.metodo === 'PATCH' && c.caminho === '/api/teams/varzea-fc');
      t('escrever e salvar manda o texto e a política NO MESMO pedido (time público nunca fica sem apresentação)', !!patch && patch.corpo.modo_visibilidade === 'publico_aberto' && patch.corpo.descricao === 'Turma de 40+, joga domingo de manhã perto do Cruzeiro.', JSON.stringify(patch?.corpo));
      await page.waitForFunction(() => document.querySelector('[data-sobre-o-time]')?.value.startsWith('Turma de 40+'), null, { timeout: 4000 }).catch(() => {});
      t('...e o campo "Sobre o time" de cima já mostra o texto', (await page.locator('[data-sobre-o-time]').inputValue()) === 'Turma de 40+, joga domingo de manhã perto do Cruzeiro.');

      // time público não salva sem o texto
      await page.locator('[data-sobre-o-time]').fill('');
      await page.locator('[data-ajustes-do-time] button.btn--primary', { hasText: /^Salvar$/ }).first().click();
      await page.getByText('Time aberto precisa do "Sobre o time". Conte como ele é.').waitFor({ timeout: 4000 });
      t('apagar o texto de um time aberto e salvar é recusado com o recado (nenhum PATCH de "Salvar" sai)', chamadas.filter((c) => c.metodo === 'PATCH').length === 1);
      t('Ajustes roda sem exceção', erros.length === 0, erros.slice(0, 2).join(' | '));
      await ctx.close();
    }

    // Bairro antigo escrito à mão: fica como está até alguém editar; texto fora da lista volta; escolher da lista manda a coordenada
    {
      const { ctx, page, chamadas } = await ir({ cidade: 'Brasília, DF', bairro: 'Pinheiros', modo: 'privado', descricao: 'Sábado de manhã.' });
      const bairro = page.locator('[data-campo-bairro]');
      const fora = () => page.getByText('Nome do time', { exact: true }).first().click();
      await bairro.waitFor({ timeout: 10000 });
      t('time com bairro antigo escrito à mão ("Pinheiros"): o campo o mostra, como está', (await bairro.inputValue()) === 'Pinheiros');
      await bairro.click();
      await bairro.fill('Gua');
      await fora();
      await page.waitForTimeout(250);
      t('"Gua" não é da lista: ao tocar fora o campo volta a "Pinheiros"', (await bairro.inputValue()) === 'Pinheiros', await bairro.inputValue());
      await page.locator('[data-sobre-o-time]').fill('Sábado de manhã, mais gente.');
      await page.locator('[data-ajustes-do-time] button.btn--primary', { hasText: /^Salvar$/ }).first().click();
      await page.getByText('Time atualizado.').waitFor({ timeout: 5000 });
      const salvo = chamadas.find((c) => c.metodo === 'PATCH' && c.caminho === '/api/teams/varzea-fc');
      t('salvar sem mexer no bairro NÃO o manda (o antigo continua salvo)', !!salvo && !('bairro' in salvo.corpo) && salvo.corpo.descricao === 'Sábado de manhã, mais gente.', JSON.stringify(salvo?.corpo));
      await bairro.click();
      await bairro.fill('Guar');
      await page.locator('[data-sugestoes-bairro] button', { hasText: 'Guará' }).first().click();
      await page.locator('[data-ajustes-do-time] button.btn--primary', { hasText: /^Salvar$/ }).first().click();
      await page.waitForTimeout(500);
      const segundo = chamadas.filter((c) => c.metodo === 'PATCH' && c.caminho === '/api/teams/varzea-fc').at(-1);
      t('escolher "Guará" da lista e salvar manda o bairro COM a coordenada da lista', segundo.corpo.bairro === 'Guará' && segundo.corpo.bairro_origem === 'lista' && Number.isFinite(segundo.corpo.bairro_lat) && Number.isFinite(segundo.corpo.bairro_lng), JSON.stringify(segundo.corpo));
      await ctx.close();
    }

    // Cidade sem bairros na lista: o campo não aparece, e o bairro antigo fica salvo
    {
      const { ctx, page, chamadas } = await ir({ cidade: 'Rio Branco, AC', bairro: 'Pinheiros', modo: 'privado', descricao: '' });
      await page.waitForTimeout(800);
      t('Rio Branco, AC (um distrito só no IBGE, sem lista): o campo Bairro não aparece nos Ajustes', (await page.locator('[data-campo-bairro]').count()) === 0 && !/Bairro/.test(await page.locator('[data-ajustes-do-time]').innerText().then((s) => s.replace(/Bairro e a cidade/, ''))));
      await page.locator('[data-ajustes-do-time] button.btn--primary', { hasText: /^Salvar$/ }).first().click();
      await page.getByText('Time atualizado.').waitFor({ timeout: 5000 });
      const salvo = chamadas.find((c) => c.metodo === 'PATCH' && c.caminho === '/api/teams/varzea-fc');
      t('...e salvar não toca no bairro antigo ("Pinheiros" continua no time)', !!salvo && !('bairro' in salvo.corpo), JSON.stringify(salvo?.corpo));
      await ctx.close();
    }
  }
}
