// Prova no navegador da Rodada 29S, bloco A (o Novo jogo de novo): o que só um Chromium de verdade confirma, com as MESMAS fontes e o MESMO CSS do app.
//   · Marcar jogo (151, 155, 156): abre direto no formulário (sem os três chips); a hora nasce em 20:00 (ou na do último jogo do time, vinda do cache do
//     Início); o ingresso se preenche enquanto a pessoa digita (dia por extenso, hora, local, rabicho só em outro relógio); "Só neste jogo" em ROXO e a
//     volta ao padrão; "Criar jogo" na primeira tela de 390×844 e o POST de sempre; "Jogo passado →" embaixo, levando ao passo a passo (a prova do passo a passo é a rodada-29s-b).
//   · O Jogo (152, 153): sem times, "Como vão sair os times?" com Sortear e Montar à mão lado a lado (só o Sortear pulsa); Montar à mão salva em
//     times-manuais com quem confirmou + os convidados da tela; com times, "Trocar os times: Sortear de novo · Montar à mão" com confirmação.
// O motor é de mentira (/api/** respondido por page.route) e a sessão também (chave do Supabase no localStorage): nada sai para a rede.
import { readFileSync } from 'node:fs';

export const nome = 'Rodada 29S-A (Marcar jogo com ingresso e 20:00, "Só neste jogo" em roxo, Jogo: Sortear ou Montar à mão)';

const DIA = 86400000;
const SP = 'America/Sao_Paulo';
const ALTURA = 844;

const REF = new URL((readFileSync(new URL('../../.env', import.meta.url), 'utf8').match(/^VITE_SUPABASE_URL=(.+)$/m)?.[1] || 'https://prova.supabase.co').trim()).hostname.split('.')[0];
const SESSAO = JSON.stringify({
  access_token: 'prova', refresh_token: 'prova', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 86400 * 30,
  user: { id: 'U1', aud: 'authenticated', email: 'prova@futty.test', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' },
});

const NOMES = ['Ana', 'Beto', 'Caio', 'Duda', 'Edu', 'Fabi', 'Gui', 'Hugo', 'Iara', 'João'];

// O motor de mentira. `estado` é mutável de propósito: salvar os times muda o jogo, como no servidor de verdade.
function criarMotor({ papel = 'admin', confirmados = 3, comTimes = false, comSeed = false } = {}) {
  const chamadas = [];
  const team = { id: 'T2', slug: 'varzea-fc', nome: 'Várzea FC', cidade: 'Brasília - DF', fuso: SP, cor: 'azul', escudo_cor2: 'ouro', escudo_padrao: 'faixa', role: papel, joga: true, jogadores_por_time: 5, mostrar_gols: true, modo_visibilidade: 'privado', logo_url: null };
  const players = NOMES.slice(0, confirmados).map((n, i) => ({ user_id: `U${i + 10}`, nome: n, avatar_url: null, avatar_generico: null, goleiro: false, cabeca_chave: false, rating: 6.5, confirmado: true }));
  const timesResultado = (n) => ({
    num_times: n,
    ...(comSeed ? { seed: 12345 } : { manual: true }),
    times: Array.from({ length: n }, (_, t) => ({ nome: ['Time Ouro', 'Time Roxo', 'Time Prata', 'Time Bronze'][t], jogadores: players.filter((_, i) => i % n === t).map((p) => ({ user_id: p.user_id, nome: p.nome, avatar_url: null })) })),
  });
  const jogo = {
    id: 'G1', data: new Date(Date.now() + 3 * DIA).toISOString(), local: 'Society Madalena — campo 2', status: 'agendado', jogadores_por_time: 5,
    sorteio_realizado: comTimes, num_times: comTimes ? 2 : null, times_resultado: comTimes ? timesResultado(2) : null, resultado_nivel: 0,
    rsvp_aberto: false, rsvp_fechado: false, cancelado: false,
  };
  const members = NOMES.map((n, i) => ({ id: `U${i + 10}`, nome: n, role: 'member', joga: true, goleiro: false, avatar_url: null }));
  function responder(pathname, metodo, corpo) {
    if (metodo === 'GET') {
      if (pathname === '/api/teams/varzea-fc') return { team, members };
      if (pathname === '/api/games/G1' || pathname === '/api/games/G9') return { team, game: jogo, players, meuEstado: { confirmado: true, goleiro: false }, gols: [] };
      if (pathname.startsWith('/api/jogos/') && pathname.endsWith('/rsvp')) return { rsvp_aberto: false, rsvp_fechado: false, confirmados: [], recusados: [], pendentes: [], espera: [], eu_jogo: true, fuso: SP };
      return {};
    }
    if (metodo === 'POST' && pathname === '/api/games') return { game: { id: 'G9' } };
    if (metodo === 'POST' && pathname === '/api/games/G1/times-manuais') {
      const n = corpo.times.length;
      Object.assign(jogo, { sorteio_realizado: true, num_times: n, times_resultado: { num_times: n, manual: true, times: corpo.times } });
      return { game: jogo };
    }
    return { ok: true };
  }
  return { chamadas, responder, jogo };
}

function criarRoteador(base, motor) {
  const origem = new URL(base).host;
  return (route) => {
    const req = route.request();
    const u = new URL(req.url());
    if (u.pathname.startsWith('/api/')) {
      const bruto = req.postData();
      const corpo = bruto ? JSON.parse(bruto) : null;
      if (req.method() !== 'GET') motor.chamadas.push({ metodo: req.method(), caminho: u.pathname, corpo });
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(motor.responder(u.pathname, req.method(), corpo)) });
    }
    if (u.host === origem) return route.continue();
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  };
}

async function abrir(navegador, base, { largura = 390, altura = ALTURA, tz = SP, motor = criarMotor(), caminho = '/time/varzea-fc/jogo/novo', cache = null } = {}) {
  const ctx = await navegador.newContext({ viewport: { width: largura, height: altura }, deviceScaleFactor: 1, isMobile: true, hasTouch: true, locale: 'pt-BR', timezoneId: tz });
  await ctx.addInitScript(({ chave, sessao, cacheInicio }) => {
    try {
      localStorage.setItem('futty_cookies', 'aceite');
      localStorage.setItem(chave, sessao);
      if (cacheInicio) localStorage.setItem('futty_cache_v1:U1:inicio', JSON.stringify({ em: Date.now(), dados: cacheInicio }));
    } catch { /* sem storage */ }
  }, { chave: `sb-${REF}-auth-token`, sessao: SESSAO, cacheInicio: cache });
  const page = await ctx.newPage();
  const erros = [];
  page.on('pageerror', (e) => erros.push(e.message));
  await page.route('**/*', criarRoteador(base, motor));
  await page.goto(`${base}/scripts/provas/rodada-29s-a.html`, { waitUntil: 'domcontentloaded' });
  await page.locator('[data-casa]').waitFor({ timeout: 20000 });
  await page.evaluate((c) => { window.history.pushState({}, '', c); window.dispatchEvent(new PopStateEvent('popstate')); }, caminho);
  return { ctx, page, erros, motor };
}

const fontesProntas = (page) => page.evaluate(() => document.fonts.ready.then(() => true));
const texto = (page) => page.locator('body').innerText();
const caminhoAtual = (page) => { const u = new URL(page.url()); return u.pathname + u.search; };
async function esperarChamada(motor, procura, ms = 4000) {
  const fim = Date.now() + ms;
  while (Date.now() < fim) {
    if (motor.chamadas.some(procura)) return true;
    await new Promise((r) => setTimeout(r, 50));
  }
  return false;
}
// FUTTY_PROVA_PRINTS=<pasta>: guarda uma imagem de cada estado importante (para a Freaky olhar). Sem a variável, nada é gravado.
async function imagem(page, nomeDoArquivo) {
  if (process.env.FUTTY_PROVA_PRINTS) await page.screenshot({ path: `${process.env.FUTTY_PROVA_PRINTS}/${nomeDoArquivo}.png` });
}
// O que muda os times do jogo: o sorteio, os times à mão e as presenças. (O POST /link-curto é o código do link do sorteio, de sempre.)
const mexeuNosTimes = (motor) => motor.chamadas.some((c) => /\/(sortear|times-manuais|presencas)$/.test(c.caminho));
const proxima = (dias) => new Date(Date.now() + dias * DIA).toLocaleDateString('sv-SE', { timeZone: SP }); // AAAA-MM-DD no relógio do time

export async function rodar({ navegador, base, t }) {
  // ── Marcar jogo: abre direto no formulário, hora em 20:00, ingresso que se preenche ───────────────────────────────────────────────────
  {
    const { ctx, page, erros, motor } = await abrir(navegador, base);
    await page.locator('#data').waitFor({ timeout: 25000 });
    await fontesProntas(page);
    await page.waitForTimeout(400);
    const corpo = await texto(page);

    t('abre direto no formulário do Marcar jogo: Data · Hora do jogo · Local, "Criar jogo" (sem chips de modo)', (await page.locator('#data').count()) === 1 && (await page.locator('#hora').count()) === 1 && (await page.locator('#local').count()) === 1 && (await page.getByRole('button', { name: 'Criar jogo', exact: true }).count()) === 1);
    t('os três chips saíram: nada de "Sortear", "Times à mão" nem "Já aconteceu" como opção', (await page.locator('.chips-row .chip').count()) === 0 && !/Times à mão|Já aconteceu/.test(corpo) && !/Você define os times à mão|Agende um jogo\. Os times saem do sorteio/.test(corpo));
    t('a hora nasce em 20:00 (achado 155), não na hora do relógio', (await page.locator('#hora').inputValue()) === '20:00', await page.locator('#hora').inputValue());
    t('os campos têm os ícones do lucide (Data, Hora do jogo, Local) e letra de 18 px', (await page.locator('label[for="data"] svg, label[for="hora"] svg, label[for="local"] svg').count()) === 3 && (await page.locator('#data').evaluate((el) => getComputedStyle(el).fontSize)) === '18px');

    // O ingresso, antes de digitar: time e hora já aparecem; dia e local esperam.
    t('o ingresso já traz o escudo e o nome do time, a hora 20:00 e convida a escolher o dia e o local', (await page.locator('[data-ingresso-time]').innerText()) === 'Várzea FC' && (await page.locator('[data-ingresso-hora]').innerText()) === '20:00' && (await page.locator('[data-ingresso-dia]').innerText()) === 'Escolha o dia' && /Onde vai ser o jogo/.test(await page.locator('[data-ingresso-local]').innerText()) && (await page.locator('[data-ingresso] [data-escudo]').count()) === 1);
    t('e o rabicho não aparece para quem está no relógio do time', (await page.locator('[data-ingresso-rabicho]').count()) === 0);

    // Digita: o ingresso acompanha, com o dia por extenso do relógio do time.
    const dia = proxima(10);
    await page.locator('#data').fill(dia);
    await page.locator('#local').fill('Society Madalena — campo 2');
    await page.waitForTimeout(150);
    const esperadoDia = await page.evaluate((iso) => { const d = new Date(`${iso}T12:00:00-03:00`); return d.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'short', timeZone: 'America/Sao_Paulo' }); }, dia);
    const diaNoIngresso = await page.locator('[data-ingresso-dia]').innerText();
    t(`o ingresso mostra o dia por extenso do que foi digitado ("${diaNoIngresso}")`, /^(Segunda|Terça|Quarta|Quinta|Sexta|Sábado|Domingo), \d{1,2} de [a-zç]{3}\.$/.test(diaNoIngresso), `${diaNoIngresso} | ${esperadoDia}`);
    t('...e o local digitado', (await page.locator('[data-ingresso-local]').innerText()) === 'Society Madalena — campo 2');
    await page.locator('#hora').fill('21:15');
    await page.waitForTimeout(150);
    t('...e a hora que a pessoa trocou (21:15)', (await page.locator('[data-ingresso-hora]').innerText()) === '21:15');
    await imagem(page, 'marcar-jogo-ingresso');

    // O botão dourado na primeira tela.
    const botao = await page.getByRole('button', { name: 'Criar jogo', exact: true }).boundingBox();
    t(`"Criar jogo" aparece sem rolar em 390×844 (termina em ${Math.round(botao.y + botao.height)} px)`, botao.y + botao.height <= ALTURA && !(await page.evaluate(() => document.documentElement.scrollHeight > window.innerHeight + 1)), JSON.stringify(botao));

    // "Só neste jogo" em roxo e a volta ao padrão.
    t('sem mudar, só "Padrão do time: 5" e o botão "mudar só neste jogo" (nenhum selo roxo)', /Padrão do time:\s*5/.test(await page.locator('[data-jogadores-por-time]').innerText()) && (await page.locator('[data-selo-so-neste]').count()) === 0 && (await page.locator('[data-ingresso-so-neste]').count()) === 0);
    await page.locator('[data-mudar-so-neste]').click();
    await page.locator('[data-selo-so-neste]').waitFor({ timeout: 5000 });
    const roxo = await page.evaluate(() => {
      const selo = document.querySelector('[data-selo-so-neste]');
      const mais = document.querySelector('[data-stepper] [aria-label="Mais"]');
      const numero = document.querySelector('[data-stepper] span');
      const bloco = document.querySelector('[data-jogadores-por-time]');
      const matiz = (css) => { const m = css.match(/\d+(\.\d+)?/g)?.map(Number) || []; return m.length >= 3 ? { r: m[0], g: m[1], b: m[2] } : null; };
      const ehRoxo = (c) => !!c && c.b > c.g + 40 && c.r > c.g; // azul e vermelho acima do verde = roxo
      return { selo: ehRoxo(matiz(getComputedStyle(selo).color)), seloBorda: ehRoxo(matiz(getComputedStyle(selo).borderTopColor)), botao: ehRoxo(matiz(getComputedStyle(mais).borderTopColor)) && ehRoxo(matiz(getComputedStyle(mais).color)), numero: ehRoxo(matiz(getComputedStyle(numero).color)), bloco: ehRoxo(matiz(getComputedStyle(bloco).borderTopColor)), textoDoSelo: selo.innerText };
    });
    t('"mudar só neste jogo": aparece o selo ROXO "Só neste jogo", o seletor (+/−, número) e o bloco todo em roxo', roxo.textoDoSelo.toLowerCase() === 'só neste jogo' && roxo.selo && roxo.seloBorda && roxo.botao && roxo.numero && roxo.bloco, JSON.stringify(roxo));
    t('o seletor começa no padrão do time (5) e "voltar ao padrão (5)" está lá', (await page.locator('[data-stepper] span').innerText()) === '5' && (await page.locator('[data-voltar-ao-padrao]').innerText()) === 'voltar ao padrão (5)');
    await page.locator('[data-stepper] [aria-label="Mais"]').click();
    t('o ingresso também diz, em roxo, "6 por time · só neste jogo"', (await page.locator('[data-ingresso-so-neste]').innerText()).toLowerCase() === '6 por time · só neste jogo');
    const botaoRoxo = await page.getByRole('button', { name: 'Criar jogo', exact: true }).boundingBox();
    t(`com o seletor roxo aberto, "Criar jogo" continua na primeira tela (termina em ${Math.round(botaoRoxo.y + botaoRoxo.height)} px)`, botaoRoxo.y + botaoRoxo.height <= ALTURA, JSON.stringify(botaoRoxo));
    await imagem(page, 'marcar-jogo-so-neste');

    // Criar jogo: o POST de sempre, com o número só deste jogo e a hora do CAMPO (21:15 de São Paulo = 00:15Z do dia seguinte).
    await page.getByRole('button', { name: 'Criar jogo', exact: true }).click();
    await page.waitForFunction(() => /\/jogo\/G9$/.test(location.pathname), null, { timeout: 8000 }).catch(() => {});
    const post = motor.chamadas.find((c) => c.metodo === 'POST' && c.caminho === '/api/games');
    t('"Criar jogo" chama POST /api/games (historico: false) com o local, 6 por time e a hora 21:15 no relógio do TIME', !!post && post.corpo.team_slug === 'varzea-fc' && post.corpo.local === 'Society Madalena — campo 2' && post.corpo.jogadores_por_time === 6 && post.corpo.historico === false && new Date(post.corpo.data).toLocaleTimeString('sv-SE', { timeZone: SP, hour: '2-digit', minute: '2-digit' }) === '21:15', JSON.stringify(post));
    t('...e vai para o jogo criado (/time/varzea-fc/jogo/G9)', caminhoAtual(page) === '/time/varzea-fc/jogo/G9', caminhoAtual(page));
    t('o Marcar jogo roda sem exceção', erros.length === 0, erros.slice(0, 2).join(' | '));
    await ctx.close();
  }

  // ── voltar ao padrão: o número só deste jogo some, e o POST sai SEM jogadores_por_time (o motor usa o do time) ───────────────────────────
  {
    const { ctx, page, motor } = await abrir(navegador, base);
    await page.locator('#data').waitFor({ timeout: 25000 });
    await page.locator('#data').fill(proxima(5));
    await page.locator('[data-mudar-so-neste]').click();
    await page.locator('[data-selo-so-neste]').waitFor();
    await page.locator('[data-voltar-ao-padrao]').click();
    t('"voltar ao padrão (5)": o selo roxo, o seletor e o chip do ingresso somem; volta "Padrão do time: 5"', (await page.locator('[data-selo-so-neste], [data-stepper], [data-ingresso-so-neste]').count()) === 0 && /Padrão do time:\s*5/.test(await page.locator('[data-jogadores-por-time]').innerText()));
    await page.getByRole('button', { name: 'Criar jogo', exact: true }).click();
    await esperarChamada(motor, (c) => c.caminho === '/api/games');
    const post = motor.chamadas.find((c) => c.caminho === '/api/games');
    t('e o POST não leva jogadores_por_time (o jogo nasce com o padrão do time) e a hora é 20:00 do relógio do time', !!post && !('jogadores_por_time' in post.corpo) && new Date(post.corpo.data).toLocaleTimeString('sv-SE', { timeZone: SP, hour: '2-digit', minute: '2-digit' }) === '20:00', JSON.stringify(post));
    await ctx.close();
  }

  // ── a hora do último jogo do time, vinda do cache do Início (nenhum pedido novo) ───────────────────────────────────────────────────────
  {
    const cache = { convites: { games: [
      { team_slug: 'varzea-fc', date: '2026-10-01T22:30:00Z' }, // 19:30 em São Paulo
      { team_slug: 'varzea-fc', date: '2026-10-08T22:30:00Z' }, // o último
      { team_slug: 'missa', date: '2026-12-01T01:00:00Z' }, // de outro time: não conta
    ] } };
    const { ctx, page, motor } = await abrir(navegador, base, { cache });
    await page.locator('#hora').waitFor({ timeout: 25000 });
    t('com os jogos do time em cache (o do Início), a hora nasce na do último jogo, no relógio do time (19:30)', (await page.locator('#hora').inputValue()) === '19:30', await page.locator('#hora').inputValue());
    t('...sem pedido novo só para isso: nenhum GET de jogos do time', !motor.chamadas.some((c) => /\/games$/.test(c.caminho)));
    await ctx.close();
  }

  // ── o rabicho com a cidade do time, só em outro relógio ───────────────────────────────────────────────────────────────────────────────
  {
    const { ctx, page } = await abrir(navegador, base, { tz: 'Europe/Lisbon' });
    await page.locator('[data-ingresso]').waitFor({ timeout: 25000 });
    await page.locator('#data').fill(proxima(6));
    t('visto de Lisboa, o ingresso do time de Brasília diz "horário de Brasília" ao lado da hora', (await page.locator('[data-ingresso-rabicho]').innerText()) === 'horário de Brasília');
    await ctx.close();
  }

  // ── "Jogo passado →": a linha discreta embaixo do botão e o destino (o passo a passo do bloco B); o link antigo (?passado=1) abre o Marcar jogo ────────
  {
    const { ctx, page, motor } = await abrir(navegador, base);
    await page.locator('[data-jogo-passado]').waitFor({ timeout: 25000 });
    const botao = await page.getByRole('button', { name: 'Criar jogo', exact: true }).boundingBox();
    const linha = await page.locator('[data-jogo-passado]').boundingBox();
    const link = page.locator('[data-jogo-passado] a');
    t('embaixo do botão, uma linha discreta: "Esse jogo já aconteceu? Jogo passado →"', linha.y > botao.y + botao.height && /^Esse jogo já aconteceu\?\s*Jogo passado →$/.test((await page.locator('[data-jogo-passado]').innerText()).replace(/\s+/g, ' ').trim()));
    t('discreta de verdade: letra de 13 px, texto apagado, nada que pareça um segundo botão', (await page.locator('[data-jogo-passado]').evaluate((el) => getComputedStyle(el).fontSize)) === '13px' && !(await link.evaluate((el) => el.className)).includes('btn'));
    t('o link leva à rota própria do passo a passo: /time/varzea-fc/jogo/passado (o destino mora em um ponto só)', (await link.getAttribute('href')) === '/time/varzea-fc/jogo/passado');
    await link.click();
    await page.locator('[data-barra-de-passos]').waitFor({ timeout: 8000 });
    t('o "Jogo passado" abre o passo a passo (bloco B): barra de 4 passos, "Quando foi o jogo?", e nada gravado', caminhoAtual(page) === '/time/varzea-fc/jogo/passado' && (await page.locator('[data-barra-de-passos] li').count()) === 4 && /Quando foi o jogo\?/.test(await texto(page)) && motor.chamadas.length === 0);
    await ctx.close();
  }

  // ── um link antigo para o Novo jogo (?passado=1) abre o Marcar jogo: o modo "Já aconteceu" saiu daqui ────────────────────────────────────
  {
    const { ctx, page } = await abrir(navegador, base, { caminho: '/time/varzea-fc/jogo/novo?passado=1' });
    await page.locator('[data-ingresso]').waitFor({ timeout: 25000 });
    t('/jogo/novo?passado=1 abre o Marcar jogo (ingresso, "Criar jogo", hora 20:00), sem o aviso nem o botão do modo antigo', (await page.getByRole('button', { name: 'Criar jogo', exact: true }).count()) === 1 && (await page.locator('#hora').inputValue()) === '20:00' && (await page.locator('[data-jogo-passado-aviso]').count()) === 0 && (await page.getByRole('button', { name: 'Continuar → montar' }).count()) === 0);
    await ctx.close();
  }

  // ── o Jogo SEM times: a pergunta e os dois cartões ──────────────────────────────────────────────────────────────────────────────────────
  {
    const motor = criarMotor({ confirmados: 3 });
    const { ctx, page, erros } = await abrir(navegador, base, { motor, caminho: '/time/varzea-fc/jogo/G1' });
    await page.locator('[data-como-saem-os-times]').waitFor({ timeout: 25000 });
    await fontesProntas(page);
    const corpo = await texto(page);
    t('sem times, o admin vê "Como vão sair os times?" e as duas escolhas', /Como vão sair os times\?/.test(corpo) && (await page.locator('[data-escolha]').count()) === 2);
    const s = page.locator('[data-escolha="sortear"]');
    const m = page.locator('[data-escolha="a-mao"]');
    const [bs, bm] = [await s.boundingBox(), await m.boundingBox()];
    t('lado a lado: mesma altura da tela, o Sortear à esquerda e o Montar à mão à direita, cabendo nos 390 px', Math.abs(bs.y - bm.y) < 2 && bs.x < bm.x && bs.x + bs.width <= bm.x && bm.x + bm.width <= 390, JSON.stringify([bs, bm]));
    t('"Sortear": ícone Shuffle e "O app sorteia com quem confirmou."', /sortear/i.test(await s.innerText()) && /O app sorteia com quem confirmou\./.test(await s.innerText()) && (await s.locator('svg.lucide-shuffle').count()) === 1, await s.innerHTML());
    t('"Montar à mão": ícone Hand e "Você escolhe quem joga em cada time."', /montar à mão/i.test(await m.innerText()) && /Você escolhe quem joga em cada time\./.test(await m.innerText()) && (await m.locator('svg.lucide-hand').count()) === 1, await m.innerHTML());
    const cores = await page.evaluate(() => {
      const cor = (el) => getComputedStyle(el).borderTopColor.match(/\d+/g).map(Number);
      const s = cor(document.querySelector('[data-escolha="sortear"]'));
      const m = cor(document.querySelector('[data-escolha="a-mao"]'));
      return { dourado: s[0] > s[2] + 60, roxo: m[2] > m[1] + 40 && m[0] > m[1], sortear: s, aMao: m };
    });
    t('o Sortear é dourado e o Montar à mão é roxo', cores.dourado && cores.roxo, JSON.stringify(cores));
    t('com poucos confirmados (3 de 10) nenhum dos dois pulsa', await page.evaluate(() => [...document.querySelectorAll('[data-como-saem-os-times] *')].every((el) => getComputedStyle(el).animationName === 'none' || /ctaGlint/.test(getComputedStyle(el).animationName))));
    await imagem(page, 'jogo-como-saem-os-times');
    t('o jogo roda sem exceção', erros.length === 0, erros.slice(0, 2).join(' | '));
    await ctx.close();
  }

  // ── só o Sortear pulsa (e só quando há gente para dois times), o Montar à mão nunca ─────────────────────────────────────────────────────
  {
    const motor = criarMotor({ confirmados: 10 });
    const { ctx, page } = await abrir(navegador, base, { motor, caminho: '/time/varzea-fc/jogo/G1' });
    await page.locator('[data-como-saem-os-times]').waitFor({ timeout: 25000 });
    await page.waitForTimeout(300);
    const pulsos = await page.evaluate(() => {
      const anima = (el) => { const a = getComputedStyle(el).animationName; return a !== 'none' && !/ctaGlint/.test(a); };
      const s = document.querySelector('[data-escolha="sortear"]');
      const m = document.querySelector('[data-escolha="a-mao"]');
      return { sortear: anima(s) || anima(s.parentElement), aMao: anima(m) || anima(m.parentElement) || [...m.querySelectorAll('*')].some(anima) };
    });
    t('com 10 confirmados (dois times de 5) o Sortear pulsa — a regra de hoje (podeSortear) — e o Montar à mão NÃO', pulsos.sortear && !pulsos.aMao, JSON.stringify(pulsos));
    await ctx.close();
  }

  // ── "Sortear" continua igual: o mesmo POST /api/games/:id/sortear e a cerimônia ───────────────────────────────────────────────────────────
  {
    const motor = criarMotor({ confirmados: 10 });
    const { ctx, page } = await abrir(navegador, base, { motor, caminho: '/time/varzea-fc/jogo/G1' });
    await page.locator('[data-escolha="sortear"]').waitFor({ timeout: 25000 });
    await page.locator('[data-escolha="sortear"]').click();
    await page.locator('[data-sorteio-aberto]').waitFor({ timeout: 8000 });
    const post = motor.chamadas.find((c) => c.caminho === '/api/games/G1/sortear');
    t('"Sortear" chama POST /api/games/G1/sortear com { jogadoresPorTime: 5 } e abre a cerimônia (euSorteei)', !!post && post.corpo.jogadoresPorTime === 5 && (await page.locator('[data-sorteio-aberto]').getAttribute('data-caminho')) === '/time/varzea-fc/jogo/G1/sorteio' && (await page.locator('[data-sorteio-aberto]').getAttribute('data-eu-sorteei')) === '1', JSON.stringify(post));
    t('...e nenhum POST de times-manuais', !motor.chamadas.some((c) => c.caminho.endsWith('/times-manuais')));
    await ctx.close();
  }

  // ── Montar à mão: quem confirmou + os convidados da tela → POST /times-manuais ───────────────────────────────────────────────────────────
  {
    const motor = criarMotor({ confirmados: 3 });
    const { ctx, page } = await abrir(navegador, base, { motor, caminho: '/time/varzea-fc/jogo/G1' });
    await page.locator('[data-como-saem-os-times]').waitFor({ timeout: 25000 });
    await page.getByPlaceholder('Nome de quem vai jogar').fill('Zé da Esquina');
    await page.getByRole('button', { name: 'Adicionar', exact: true }).click();
    await page.locator('[data-escolha="a-mao"]').click();
    await page.locator('[data-montar-a-mao]').waitFor({ timeout: 8000 });
    const painel = page.locator('[data-montar-a-mao]');
    t('"Montar à mão" abre a composição no lugar dos cartões, com 2/3/4 times e a ajuda "Toque num time e depois em quem vai jogar nele."', (await page.locator('[data-como-saem-os-times]').count()) === 0 && (await painel.locator('.chips-row .chip').allInnerTexts()).join() === '2,3,4' && (await painel.locator('[data-ajuda-dos-times]').innerText()) === 'Toque num time e depois em quem vai jogar nele.');
    t('...sem "(opcional)" e sem o exemplo "5º A vs 5º B" (aqui os times não são opcionais)', !/\(opcional\)|5º A vs 5º B|Quem sobra não joga/.test(await painel.innerText()));
    const disponiveis = (await painel.locator('button.camp-chip').allInnerTexts()).map((x) => x.toLowerCase()); // o CSS põe os chips em caixa alta
    t('quem pode jogar: os 3 confirmados e o convidado sem app da tela ("conv.")', ['ana', 'beto', 'caio'].every((n) => disponiveis.some((x) => x.includes(n))) && disponiveis.some((x) => x.includes('zé da esquina') && x.includes('conv.')), JSON.stringify(disponiveis));
    t('os times saem com os nomes da casa (Time Ouro · 0, Time Roxo · 0)', disponiveis.some((x) => /time ouro · 0/.test(x)) && disponiveis.some((x) => /time roxo · 0/.test(x)));
    const salvar = page.locator('[data-salvar-times]');
    t('"Salvar times" começa apagado (cada time precisa de 1 jogador)', await salvar.isDisabled());
    await painel.locator('button.camp-chip', { hasText: 'Ana' }).click();
    t('com um time ainda vazio, segue apagado', await salvar.isDisabled());
    await painel.locator('button.camp-chip', { hasText: /^Time Roxo/ }).click();
    await painel.locator('button.camp-chip', { hasText: 'Beto' }).click();
    await painel.locator('button.camp-chip', { hasText: 'Zé da Esquina' }).click();
    t('com 1 jogador em cada time, "Salvar times" acende', await salvar.isEnabled());
    await imagem(page, 'jogo-montar-a-mao');
    await salvar.click();
    await page.locator('[data-trocar-os-times]').waitFor({ timeout: 8000 });
    const post = motor.chamadas.find((c) => c.metodo === 'POST' && c.caminho === '/api/games/G1/times-manuais');
    t('"Salvar times" chama POST /api/games/G1/times-manuais com os dois times e os jogadores certos (o convidado só com o nome)', !!post && post.corpo.times.length === 2
      && post.corpo.times[0].nome === 'Time Ouro' && post.corpo.times[0].jogadores.map((j) => j.user_id).join() === 'U10'
      && post.corpo.times[1].nome === 'Time Roxo' && post.corpo.times[1].jogadores.length === 2
      && post.corpo.times[1].jogadores.some((j) => j.user_id === 'U11' && j.convidado === false)
      && post.corpo.times[1].jogadores.some((j) => j.user_id === null && j.nome === 'Zé da Esquina' && j.convidado === true), JSON.stringify(post));
    t('...sem mandar presenças (já estão marcadas) e sem sorteio', !motor.chamadas.some((c) => c.caminho.endsWith('/presencas') || c.caminho.endsWith('/sortear')));
    t('depois de salvar, o jogo recarrega com os times, some a pergunta e aparece "Trocar os times"', (await page.locator('[data-como-saem-os-times]').count()) === 0 && (await page.locator('[data-montar-a-mao]').count()) === 0 && /Time Ouro/.test(await texto(page)) && /Times salvos\./.test(await texto(page)));
    t('times à mão não têm cerimônia: nenhum "Ver sorteio"', !/Ver sorteio/.test(await texto(page)));
    await ctx.close();
  }

  // ── Cancelar a composição volta aos dois cartões, sem gravar nada ───────────────────────────────────────────────────────────────────────
  {
    const motor = criarMotor({ confirmados: 3 });
    const { ctx, page } = await abrir(navegador, base, { motor, caminho: '/time/varzea-fc/jogo/G1' });
    await page.locator('[data-escolha="a-mao"]').click();
    await page.locator('[data-montar-a-mao]').waitFor({ timeout: 25000 });
    await page.locator('[data-cancelar-montar]').click();
    t('"Cancelar" na composição volta aos dois cartões e não grava nada', (await page.locator('[data-escolha]').count()) === 2 && motor.chamadas.length === 0, JSON.stringify(motor.chamadas));
    await ctx.close();
  }

  // ── COM times (sorteio, com seed): o "Ver sorteio" é o destaque e embaixo vai o "Trocar os times", com confirmação ──────────────────────
  {
    const motor = criarMotor({ confirmados: 10, comTimes: true, comSeed: true });
    const { ctx, page } = await abrir(navegador, base, { motor, caminho: '/time/varzea-fc/jogo/G1' });
    await page.locator('[data-trocar-os-times]').waitFor({ timeout: 25000 });
    await fontesProntas(page);
    const corpo = await texto(page);
    t('com times: nada de "Como vão sair os times?" nem os dois cartões; o "Ver sorteio" segue o destaque', !/Como vão sair os times\?/.test(corpo) && (await page.locator('[data-escolha]').count()) === 0 && /Ver sorteio/.test(corpo));
    t('...e embaixo, discreto: "Trocar os times: Sortear de novo · Montar à mão"', /Trocar os times:\s*Sortear de novo\s*·\s*Montar à mão/.test((await page.locator('[data-trocar-os-times]').innerText()).replace(/\s+/g, ' ')));
    const alvos = await page.locator('[data-trocar-os-times] button').evaluateAll((bs) => bs.map((b) => b.getBoundingClientRect().height));
    t('os dois links têm 44 px de toque', alvos.length === 2 && alvos.every((h) => h >= 44), JSON.stringify(alvos));
    t('o texto antigo em português de Portugal sumiu ("Sortear novamente", "Substituir sorteio", "perde-se")', !/Sortear novamente|Substituir sorteio|perde-se|Isto substitui/.test(corpo));

    await page.locator('[data-trocar="sortear"]').click();
    const conf1 = page.locator('[data-confirmar-trocar-times="re-sorteio"]');
    await conf1.waitFor({ timeout: 5000 });
    t('"Sortear de novo" pede confirmação: título "Sortear de novo?", "Os times de agora saem. O replay do sorteio também." e os botões "Sortear de novo" / "Manter"', /^Sortear de novo\?/.test(await conf1.innerText()) && /Os times de agora saem\. O replay do sorteio também\./.test(await conf1.innerText()) && (await conf1.getByRole('button', { name: 'Sortear de novo', exact: true }).count()) === 1 && (await conf1.getByRole('button', { name: 'Manter', exact: true }).count()) === 1);
    t('...e nada foi sorteado ainda', !motor.chamadas.some((c) => c.caminho.endsWith('/sortear')));
    await conf1.getByRole('button', { name: 'Manter', exact: true }).click();
    t('"Manter" fecha a pergunta e deixa os times como estão', (await page.locator('[data-confirmar-trocar-times]').count()) === 0 && !mexeuNosTimes(motor), JSON.stringify(motor.chamadas));

    await page.locator('[data-trocar="a-mao"]').click();
    const conf2 = page.locator('[data-confirmar-trocar-times="refazer-a-mao"]');
    await conf2.waitFor({ timeout: 5000 });
    t('"Montar à mão" também pede confirmação: título "Montar os times à mão?", a mesma linha e os botões "Montar à mão" / "Manter"', /^Montar os times à mão\?/.test(await conf2.innerText()) && /Os times de agora saem\. O replay do sorteio também\./.test(await conf2.innerText()) && (await conf2.getByRole('button', { name: 'Montar à mão', exact: true }).count()) === 1 && (await conf2.getByRole('button', { name: 'Manter', exact: true }).count()) === 1);
    await imagem(page, 'jogo-com-times-confirmar');
    await conf2.getByRole('button', { name: 'Montar à mão', exact: true }).click();
    await page.locator('[data-montar-a-mao]').waitFor({ timeout: 5000 });
    t('confirmar "Montar à mão" abre a composição, e os times de agora só saem quando "Salvar times" gravar (nenhum POST de times até lá)', !mexeuNosTimes(motor), JSON.stringify(motor.chamadas));
    await page.locator('[data-cancelar-montar]').click();
    await page.locator('[data-trocar-os-times]').waitFor({ timeout: 5000 });

    await page.locator('[data-trocar="sortear"]').click();
    await page.locator('[data-confirmar-trocar-times="re-sorteio"]').getByRole('button', { name: 'Sortear de novo', exact: true }).click();
    await page.locator('[data-sorteio-aberto]').waitFor({ timeout: 8000 });
    t('confirmar "Sortear de novo" faz o mesmo sorteio de sempre (POST /sortear) e abre a cerimônia', motor.chamadas.some((c) => c.caminho === '/api/games/G1/sortear'));
    await ctx.close();
  }

  // ── COM times à mão (sem seed): a frase não fala de replay, que não existe ──────────────────────────────────────────────────────────────
  {
    const motor = criarMotor({ confirmados: 4, comTimes: true, comSeed: false });
    const { ctx, page } = await abrir(navegador, base, { motor, caminho: '/time/varzea-fc/jogo/G1' });
    await page.locator('[data-trocar-os-times]').waitFor({ timeout: 25000 });
    await page.locator('[data-trocar="sortear"]').click();
    const frase = (await page.locator('[data-confirmar-trocar-times]').innerText()).replace(/\s+/g, ' ');
    t('times à mão não têm replay: a confirmação diz só "Os times de agora saem."', /Os times de agora saem\./.test(frase) && !/replay/.test(frase), frase);
    await ctx.close();
  }

  // ── quem não é admin não vê nada disso ──────────────────────────────────────────────────────────────────────────────────────────────────
  {
    const motor = criarMotor({ papel: 'member', confirmados: 3 });
    const { ctx, page } = await abrir(navegador, base, { motor, caminho: '/time/varzea-fc/jogo/G1' });
    await page.getByText('O sorteio ainda não foi realizado.').waitFor({ timeout: 25000 });
    t('quem não é admin continua vendo só "O sorteio ainda não foi realizado." (sem cartões, sem Montar à mão)', (await page.locator('[data-escolha], [data-trocar-os-times], [data-montar-a-mao]').count()) === 0);
    await ctx.close();
  }
}
