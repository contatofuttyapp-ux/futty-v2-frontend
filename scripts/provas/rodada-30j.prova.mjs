// Prova no navegador da Rodada 30J ("Em andamento" x "Terminado" + "Painel"): o que só um Chromium de verdade confirma, com as MESMAS fontes e o
// MESMO CSS do app, a 390 e a 360 px.
//   · Início: o jogo em andamento fica em "Próximos Jogos" com o selo "Em andamento" (sem "PRÓXIMO", sem Vou/Não vou) e o terminado vai para "Últimos Jogos"
//     com "Terminado"; o "Sortear" do card "Seu time" leva ao jogo que ainda não começou;
//   · card "Seu time" (um time e "Seus times"): Painel · Novo jogo · Sortear · Convidar — o rótulo cabe sem cortar, os quatro botões têm a mesma altura;
//   · Ajustes → Jogos: o jogo em andamento na lista de cima com o selo (e "Lançar resultado"), só desce para "Passados" quando termina;
//   · lista de jogos e Página do Jogo: o mesmo selo.
// O motor é de mentira (/api/** respondido por page.route): nada sai para a rede.
import { readFileSync } from 'node:fs';
import { motor as motorDaPaginaDoTime, rotear as roteadorDaPaginaDoTime } from './time-admin.prova.mjs';

// A sessão também é de mentira: a chave do Supabase no localStorage (o mesmo truque das outras provas).
const REF = new URL((readFileSync(new URL('../../.env', import.meta.url), 'utf8').match(/^VITE_SUPABASE_URL=(.+)$/m)?.[1] || 'https://prova.supabase.co').trim()).hostname.split('.')[0];
const SESSAO = JSON.stringify({
  access_token: 'prova', refresh_token: 'prova', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 86400 * 30,
  user: { id: 'U1', aud: 'authenticated', email: 'prova@futty.test', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' },
});

export const nome = 'Rodada 30J ("Em andamento" x "Terminado" nas telas; "Painel" no card "Seu time")';

const captura = (arquivo) => new URL(`../capturas/${arquivo}`, import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const PNG_1X1 = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
const SP = 'America/Sao_Paulo';
const MIN = 60000;
const agoraMais = (minutos) => new Date(Date.now() + minutos * MIN).toISOString();

async function abrirCena(navegador, base, cena, { largura = 390, altura = 1400, motor = null, caminho = null, jogos = null } = {}) {
  const ctx = await navegador.newContext({ viewport: { width: largura, height: altura }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'pt-BR', timezoneId: SP });
  await ctx.addInitScript(({ chave, sessao, games }) => {
    try { localStorage.setItem('futty_cookies', 'aceite'); localStorage.setItem(chave, sessao); } catch { /* sem storage */ }
    if (games) window.__games = games;
  }, { chave: `sb-${REF}-auth-token`, sessao: SESSAO, games: jogos });
  const page = await ctx.newPage();
  const erros = [];
  page.on('pageerror', (e) => erros.push(e.message));
  const origem = new URL(base).host;
  await page.route('**/*', (route) => {
    const req = route.request();
    const u = new URL(req.url());
    if (u.host === origem && !u.pathname.startsWith('/api/')) return route.continue();
    if (motor && u.pathname.startsWith('/api/')) {
      const bruto = req.postData();
      const resposta = motor.resposta(u.pathname, req.method(), bruto ? JSON.parse(bruto) : null);
      if (resposta) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(resposta) });
    }
    if (u.pathname.startsWith('/imagens-prova/')) return route.fulfill({ status: 200, contentType: 'image/png', body: PNG_1X1 });
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });
  await page.goto(`${base}/scripts/provas/rodada-30j.html#${cena}`, { waitUntil: 'domcontentloaded' });
  if (caminho) {
    await page.locator('[data-casa]').waitFor({ timeout: 20000 });
    await page.evaluate((c) => { window.history.pushState({}, '', c); window.dispatchEvent(new PopStateEvent('popstate')); }, caminho);
  }
  return { page, ctx, erros };
}

const semErrosReais = (erros) => erros.filter((e) => !/favicon|Failed to load resource/.test(e));

// ── o Início de mentira ─────────────────────────────────────────────────────────────────────────────────────────────────
const TIME_MISSA = { id: 'T1', slug: 'missa', nome: 'Missa de Quinta', cidade: 'Brasília - DF', fuso: SP, cor: 'vinho', escudo_cor2: 'ouro', escudo_padrao: 'faixa' };
const TIME_VARZEA = { id: 'T2', slug: 'varzea-fc', nome: 'Várzea FC', cidade: 'Brasília - DF', fuso: SP, cor: 'azul', escudo_cor2: 'ouro', escudo_padrao: 'faixa' };
const SEM_PENDENCIA = { pedidos: 0, presenca: null, resultado: null, denuncias: 0, total: 0 };

// A lista que o motor manda ao Início: dois terminados, um em andamento (começou há 40 min: `status` finished, `estado` em_curso) e o próximo.
function jogosDoInicio() {
  const base = { location: 'Quadra do Zé', confirmed_count: 9, cancelado: false, user_status: 'going', team_id: 'T1', team_name: 'Missa de Quinta', team_slug: 'missa', fuso: SP, ausente_proximo: false, eu_jogo: true, montado_a_mao: false };
  return [
    { ...base, id: 'g-velho', name: 'Arena Velha', date: agoraMais(-60 * 24 * 6), status: 'finished', estado: 'terminado' },
    { ...base, id: 'g-ontem', name: 'Quadra do Bairro', date: agoraMais(-60 * 24), status: 'finished', estado: 'terminado' },
    { ...base, id: 'g-rolando', name: 'Society Madalena', date: agoraMais(-40), status: 'finished', estado: 'em_curso' },
    { ...base, id: 'g-prox', name: 'Campo do Zé', date: agoraMais(60 * 24 * 2), status: 'drawn', estado: 'agendado' },
  ];
}

/**
 * O /api/inicio de mentira. `doisTimes`: a conta administra Missa e Várzea ("Seus times"). `quemGanhou`: o card que o motor manda em seu_time[0].quem_ganhou
 * (o jogo `gq`); os pedidos do resultado ficam em `chamadas`, e depois de gravado o card some, como no motor de verdade.
 */
function motorDoInicio({ doisTimes = false, quemGanhou = null } = {}) {
  const times = doisTimes ? [TIME_MISSA, TIME_VARZEA] : [TIME_MISSA];
  const chamadas = [];
  let card = quemGanhou;
  const payload = () => ({
    me: { user: { id: 'U1', nome: 'Chavo', nome_jogador: 'Chavo', onboarding_completo: true, birthdate: '1990-01-01', foto_url: '/imagens-prova/bom.png', avatar_url: null, plano: 'free', fundo_figurinha: 'estadio' }, stats: { nota: 0, jogos: 0, gols: 0 } },
    teams: { teams: times.map((t) => ({ ...t, role: 'admin', joga: true, logo_url: null })) },
    convites: { games: jogosDoInicio() },
    pedidos: { pedidos: [] },
    votacoes_pendentes: { pendentes: [] },
    denuncias_desfechos: { total: 0 },
    votacao_status: null, campeonato: null, rsvp: null,
    seu_time: times.map((t, i) => ({ team_id: t.id, slug: t.slug, nome: t.nome, fuso: SP, pendencias: { ...SEM_PENDENCIA, resultado: i === 0 && card ? { game_id: card.game_id, data: card.data } : null, total: i === 0 && card ? 1 : 0 }, quem_ganhou: i === 0 ? card : null })),
    ad: { ad: null }, ads: null,
    brilhante: { fonte: null, team_id: null, kit_id: null, creditos: 0, restantes: 0, loja_pronta: false },
    pedidos_brilhante: [],
  });
  return {
    chamadas,
    resposta(pathname, metodo, corpo) {
      if (metodo === 'GET' && pathname === '/api/inicio') return payload();
      if (metodo === 'GET' && pathname === '/api/me') return payload().me;
      if (metodo === 'PATCH' && /^\/api\/games\/[^/]+\/resultado$/.test(pathname)) {
        chamadas.push({ caminho: pathname, corpo });
        card = null;
        return { game: { ok: true } };
      }
      return undefined;
    },
  };
}

const cardDoMotor = (nTimes = 2) => ({ game_id: 'gq', data: agoraMais(-10), local: 'Quadra do Zé', times: ['Time A', 'Time B', 'Time C', 'Time D'].slice(0, nTimes).map((nome) => ({ nome })) });

/** Junta motores: o primeiro que souber responder. */
const juntar = (...motores) => ({ resposta: (p, m, c) => motores.map((x) => x.resposta(p, m, c)).find((r) => r !== undefined) });

// ── Ajustes → Jogos e a lista de jogos: o que o motor manda em GET /api/teams/:slug/games (`status` já é o estado) ─────────
function jogosDoTime() {
  const base = { local: 'Quadra do Zé', num_times: 2, jogadores_por_time: 5, sorteio_realizado: true, resultado_nivel: 0, campeao_time_index: null, time_vencedor: null, cancelado: false, motivo_cancelamento: null, max_jogadores: null, rsvp_aberto: false, rsvp_fechado: false, confirmados: 10 };
  return [
    { ...base, id: 'a-prox', local: 'Campo do Zé', data: agoraMais(60 * 24 * 2), status: 'agendado', sorteio_realizado: false },
    { ...base, id: 'b-rolando', local: 'Society Madalena', data: agoraMais(-40), status: 'em_curso' },
    { ...base, id: 'c-campeao', local: 'Quadra do Bairro', data: agoraMais(-60 * 24), status: 'terminado', resultado_nivel: 1, campeao_time_index: 0, time_vencedor: 'A' },
    { ...base, id: 'd-sem-resultado', local: 'Arena Velha', data: agoraMais(-60 * 24 * 3), status: 'terminado' },
    { ...base, id: 'e-cancelado', local: 'Campo Alagado', data: agoraMais(-60 * 24 * 5), status: 'cancelado', cancelado: true },
  ];
}
const motorDoTime = {
  resposta(pathname, metodo) {
    if (metodo !== 'GET') return undefined;
    if (pathname === '/api/teams/missa/games') return { team: { ...TIME_MISSA, role: 'admin' }, games: jogosDoTime() };
    if (/^\/api\/jogos\/[^/]+\/rsvp$/.test(pathname)) return { rsvp_aberto: false, rsvp_fechado: false, confirmados: [], recusados: [], pendentes: [], fuso: SP };
    return undefined;
  },
};

// ── a Página do Jogo de mentira ────────────────────────────────────────────────────────────────────────────────────────
function motorDoJogo({ status, minutosAtras, id = 'g1', nTimes = 2 }) {
  const times = [
    { nome: 'Time A', jogadores: [{ user_id: 'u1', nome: 'Magrão', avatar_url: null, rating: 3 }, { user_id: 'u2', nome: 'Zé', avatar_url: null, rating: 3 }] },
    { nome: 'Time B', jogadores: [{ user_id: 'u3', nome: 'Cacá', avatar_url: null, rating: 3 }, { user_id: 'u4', nome: 'Duda', avatar_url: null, rating: 3 }] },
    { nome: 'Time C', jogadores: [{ user_id: 'u5', nome: 'Edu', avatar_url: null, rating: 3 }] },
    { nome: 'Time D', jogadores: [{ user_id: 'u6', nome: 'Fê', avatar_url: null, rating: 3 }] },
  ].slice(0, nTimes);
  const jogo = {
    id, data: agoraMais(-minutosAtras), local: 'Quadra do Zé', status, num_times: nTimes, jogadores_por_time: 2, max_jogadores: null, sorteio_realizado: true,
    times_resultado: { seed: 7, num_times: nTimes, times, reservas: [] }, historico: false, cancelado: false,
    resultado_nivel: 0, time_vencedor: null, placar_a: null, placar_b: null, campeao_time_index: null, campeao_foto_url: null,
    artilheiro_user_id: null, artilheiro_gols: null, destaque_user_id: null, destaque_titulo: null, rodada_user_id: null, rodada_foto_url: null,
  };
  return {
    resposta(pathname, metodo) {
      if (metodo === 'GET' && pathname === `/api/games/${id}`) {
        return {
          team: { id: 't1', slug: 'missa', nome: 'Missa de Quinta', cor: 'verde', fuso: SP, cidade: null, role: 'admin' },
          game: { ...jogo },
          players: times.flatMap((t) => t.jogadores).map((j) => ({ ...j, confirmado: true, goleiro: false, cabeca_chave: false })),
          gols: [], meuEstado: { confirmado: true, goleiro: false, cabeca_chave: false }, jaVotei: false,
        };
      }
      if (metodo === 'GET' && pathname === '/api/teams/missa') return { team: { slug: 'missa', nome: 'Missa de Quinta', mostrar_gols: true, mostrar_artilheiro: true, mostrar_destaque: true }, members: [] };
      return undefined;
    },
  };
}

// O que a pessoa vê no card "Seu time" (ou no painel aberto de um time em "Seus times"): os rótulos, a altura de cada botão e se o texto cabe.
const medirAtalhos = (page, raiz) => page.locator(raiz).evaluate((card) => {
  const linhas = (el) => {
    const r = document.createRange();
    r.selectNodeContents(el);
    return new Set([...r.getClientRects()].map((rc) => Math.round(rc.top))).size;
  };
  return [...card.querySelectorAll('[data-atalho]')].map((a) => {
    const rotulo = a.querySelector('span');
    return {
      nome: a.getAttribute('data-atalho'), href: a.getAttribute('href'), altura: Math.round(a.getBoundingClientRect().height * 10) / 10,
      largura: Math.round(a.getBoundingClientRect().width * 10) / 10, corta: rotulo.scrollWidth > rotulo.clientWidth + 0.5, linhas: linhas(rotulo),
      foraDoBotao: rotulo.getBoundingClientRect().right > a.getBoundingClientRect().right + 0.5 || rotulo.getBoundingClientRect().left < a.getBoundingClientRect().left - 0.5,
    };
  });
});

export async function rodar({ navegador, base, t }) {
  // ─── Início: um time ──────────────────────────────────────────────────────────────────────────────────────────────────
  for (const largura of [390, 360]) {
    const { page, ctx, erros } = await abrirCena(navegador, base, 'inicio', { largura, altura: 844, motor: motorDoInicio(), caminho: '/home' });
    await page.locator('[data-seu-time]').waitFor({ timeout: 25000 });
    await page.locator('.gcard').first().waitFor({ timeout: 25000 });
    await page.waitForTimeout(900);
    // O que cada card diz e em que lista está (a lista é o rótulo "Próximos Jogos"/"Últimos Jogos" mais próximo acima dele).
    const cards = await page.evaluate(() => {
      const rotulos = [...document.querySelectorAll('.games-label')];
      return [...document.querySelectorAll('.gcard')].map((c) => {
        const acima = rotulos.filter((r) => r.compareDocumentPosition(c) & Node.DOCUMENT_POSITION_FOLLOWING).pop();
        return {
          lista: acima?.textContent.trim(), titulo: c.querySelector('.gcard__title')?.textContent.trim(),
          selo: c.querySelector('.badge')?.textContent.trim() || null, proximo: !!c.querySelector('.gcard__next-badge'),
          botoes: c.querySelectorAll('button').length, esmaecido: c.classList.contains('gcard--past'),
        };
      });
    });
    const por = (titulo) => cards.find((c) => c.titulo === titulo);
    t(`${largura}px · Início: "Próximos Jogos" tem o jogo em andamento e o próximo, nessa ordem; "Últimos Jogos" tem os dois terminados`,
      JSON.stringify(cards.map((c) => [c.lista, c.titulo])) === JSON.stringify([['Próximos Jogos', 'Society Madalena'], ['Próximos Jogos', 'Campo do Zé'], ['Últimos Jogos', 'Quadra do Bairro'], ['Últimos Jogos', 'Arena Velha']]), JSON.stringify(cards));
    t(`${largura}px · Início: o jogo em andamento leva o selo "Em andamento" (não esmaecido, sem "PRÓXIMO" e sem botão de presença)`,
      /^em andamento$/i.test(por('Society Madalena')?.selo || '') && !por('Society Madalena').proximo && por('Society Madalena').botoes === 0 && !por('Society Madalena').esmaecido, JSON.stringify(por('Society Madalena')));
    t(`${largura}px · Início: o "PRÓXIMO" fica no jogo que ainda não começou`, por('Campo do Zé')?.proximo === true && cards.filter((c) => c.proximo).length === 1);
    t(`${largura}px · Início: os terminados dizem "Terminado" (esmaecidos)`, ['Quadra do Bairro', 'Arena Velha'].every((n) => /^terminado$/i.test(por(n)?.selo || '') && por(n).esmaecido), JSON.stringify(cards));
    t(`${largura}px · Início: "Em andamento" não aparece em "Últimos Jogos" e "Encerrado" não existe mais`, !/encerrado/i.test(await page.locator('body').innerText()));

    // O card "Seu time": a ordem, os destinos e o rótulo cabendo.
    const atalhos = await medirAtalhos(page, '[data-seu-time]');
    t(`${largura}px · Seu time: Painel · Novo jogo · Sortear · Convidar, nessa ordem`, atalhos.map((a) => a.nome).join(' · ') === 'Painel · Novo jogo · Sortear · Convidar', JSON.stringify(atalhos));
    t(`${largura}px · Seu time: "Painel" abre a aba Ajustes; "Sortear" leva ao jogo que ainda não começou (não ao que está rolando)`,
      atalhos[0].href === '/time/missa?aba=ajustes' && atalhos[1].href === '/time/missa/jogo/novo' && atalhos[2].href === '/time/missa/jogo/g-prox' && atalhos[3].href === '/time/missa?aba=elenco&convidar=1', JSON.stringify(atalhos));
    t(`${largura}px · Seu time: nenhum rótulo é cortado nem vaza do botão`, atalhos.every((a) => !a.corta && !a.foraDoBotao), JSON.stringify(atalhos));
    t(`${largura}px · Seu time: os quatro botões têm a mesma altura (${atalhos.map((a) => a.altura).join(' / ')} px) e a mesma largura`, new Set(atalhos.map((a) => a.altura)).size === 1 && new Set(atalhos.map((a) => a.largura)).size === 1, JSON.stringify(atalhos));
    t(`${largura}px · Seu time: "Painel" cabe numa linha, como os outros três — os botões voltam à altura de antes (${atalhos[0].altura} px, uma linha de rótulo)`, atalhos.every((a) => a.linhas === 1) && atalhos[0].altura <= 58, JSON.stringify(atalhos));
    console.log(`    · ${largura}px · linhas por rótulo:${atalhos.map((a) => `${a.nome}=${a.linhas}`).join(', ')}`);
    const folga = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    t(`${largura}px · Início: nada rola para o lado`, folga <= 0, `sobra ${folga}px`);
    t(`${largura}px · Início: console sem erros`, semErrosReais(erros).length === 0, erros.slice(0, 2).join(' | '));
    await page.screenshot({ path: captura(`30j-inicio-${largura}.png`) });
    await page.locator('[data-seu-time]').screenshot({ path: captura(`30j-seu-time-${largura}.png`) });
    await page.locator('.gcard').first().scrollIntoViewIfNeeded();
    await page.screenshot({ path: captura(`30j-inicio-jogos-${largura}.png`), fullPage: true });
    await ctx.close();
  }

  // ─── Início: "Seus times" (2+ times) ─────────────────────────────────────────────────────────────────────────────────────
  for (const largura of [390, 360]) {
    const { page, ctx, erros } = await abrirCena(navegador, base, 'inicio', { largura, altura: 844, motor: motorDoInicio({ doisTimes: true }), caminho: '/home' });
    await page.locator('[data-seus-times]').waitFor({ timeout: 25000 });
    await page.locator('[data-time-linha="missa"] button').first().click();
    await page.locator('[data-time-atalhos="missa"]').waitFor({ timeout: 8000 });
    await page.waitForTimeout(500);
    const atalhos = await medirAtalhos(page, '[data-time-atalhos="missa"]');
    t(`${largura}px · Seus times: os atalhos do time aberto são Painel · Novo jogo · Sortear · Convidar`, atalhos.map((a) => a.nome).join(' · ') === 'Painel · Novo jogo · Sortear · Convidar', JSON.stringify(atalhos));
    t(`${largura}px · Seus times: "Painel" abre a aba Ajustes; "Sortear" vai ao jogo que não começou`, atalhos[0].href === '/time/missa?aba=ajustes' && atalhos[2].href === '/time/missa/jogo/g-prox', JSON.stringify(atalhos));
    t(`${largura}px · Seus times: rótulos sem corte e botões da mesma altura (${atalhos.map((a) => a.altura).join(' / ')} px)`, atalhos.every((a) => !a.corta && !a.foraDoBotao) && new Set(atalhos.map((a) => a.altura)).size === 1, JSON.stringify(atalhos));
    const folga = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    t(`${largura}px · Seus times: nada rola para o lado`, folga <= 0, `sobra ${folga}px`);
    t(`${largura}px · Seus times: console sem erros`, semErrosReais(erros).length === 0, erros.slice(0, 2).join(' | '));
    await page.locator('[data-seus-times]').screenshot({ path: captura(`30j-seus-times-${largura}.png`) });
    await ctx.close();
  }

  // ─── Ajustes → Jogos ────────────────────────────────────────────────────────────────────────────────────────────────────
  for (const largura of [390, 360]) {
    const { page, ctx, erros } = await abrirCena(navegador, base, 'ajustes', { largura, altura: 1500, motor: motorDoTime });
    await page.locator('[data-jogos-admin]').waitFor({ timeout: 25000 });
    await page.locator('[data-jogo]').first().waitFor({ timeout: 25000 });
    await page.waitForTimeout(600);
    const secoes = await page.evaluate(() => {
      const rotulos = [...document.querySelectorAll('.games-label')];
      const dentro = (el) => rotulos.filter((r) => r.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING).pop()?.textContent.trim();
      const ordem = [...document.querySelectorAll('[data-jogo], [data-jogo-cancelado]')].map((el) => ({ id: el.getAttribute('data-jogo'), secao: dentro(el), andamento: el.hasAttribute('data-jogo-em-andamento') }));
      const linhas = [...document.querySelectorAll('div')].filter((d) => d.parentElement?.style.display === 'grid' && /Lançar resultado|Editar resultado|\bVer\b/.test(d.innerText || '') && d.querySelector('button')).length;
      return { ordem, linhas };
    });
    const emAndamento = page.locator('[data-jogo-em-andamento]');
    t(`${largura}px · Ajustes → Jogos: o jogo em andamento está em "Próximos", antes do jogo que ainda não começou`, secoes.ordem[0]?.andamento === true && secoes.ordem[0]?.secao === 'Próximos' && secoes.ordem[1]?.id === 'a-prox' && secoes.ordem[1]?.secao === 'Próximos', JSON.stringify(secoes.ordem));
    t(`${largura}px · Ajustes → Jogos: a linha do jogo em andamento leva o selo "Em andamento"`, /em andamento/i.test(await emAndamento.innerText()) && (await emAndamento.count()) === 1);
    t(`${largura}px · Ajustes → Jogos: nele, "Lançar resultado" (foi sorteado e não tem resultado) — nada de Editar/Cancelar/presença de jogo que ainda não começou`,
      (await emAndamento.locator('[data-lancar-resultado]').count()) === 1 && !/Cancelar jogo|Editar\b|Abrir presença/.test(await emAndamento.innerText()), await emAndamento.innerText());
    const passados = await page.evaluate(() => {
      const rotulo = [...document.querySelectorAll('.games-label')].find((r) => r.textContent.trim() === 'Passados');
      return [...(rotulo?.parentElement?.querySelectorAll(':scope > div > div') || [])].map((linha) => linha.innerText.replace(/\s+/g, ' ').trim());
    });
    t(`${largura}px · Ajustes → Jogos: em "Passados" só o que terminou (com campeão: "Terminado" + Editar resultado; sem resultado: "Lançar resultado"; cancelado)`,
      passados.length === 3 && /Quadra do Bairro.*TERMINADO.*Editar resultado/i.test(passados[0]) && /Arena Velha.*Lançar resultado/i.test(passados[1]) && /Campo Alagado.*CANCELADO/i.test(passados[2]) && !passados.some((p) => /Society Madalena/.test(p)), JSON.stringify(passados));
    const folga = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    t(`${largura}px · Ajustes → Jogos: nada rola para o lado`, folga <= 0, `sobra ${folga}px`);
    t(`${largura}px · Ajustes → Jogos: console sem erros`, semErrosReais(erros).length === 0, erros.slice(0, 2).join(' | '));
    await page.screenshot({ path: captura(`30j-ajustes-jogos-${largura}.png`), fullPage: true });
    await ctx.close();
  }

  // ─── a lista de jogos do time ─────────────────────────────────────────────────────────────────────────────────────────
  {
    const { page, ctx, erros } = await abrirCena(navegador, base, 'lista', { largura: 390, altura: 900, jogos: jogosDoTime() });
    await page.locator('a[href*="/jogo/"]').first().waitFor({ timeout: 25000 });
    const selos = await page.evaluate(() => [...document.querySelectorAll('a[href*="/jogo/"]')].map((a) => [a.textContent.includes('Society') ? 'rolando' : a.textContent.includes('Campo do Zé') ? 'prox' : a.textContent.includes('Bairro') ? 'campeao' : a.textContent.includes('Velha') ? 'sem' : 'cancelado', a.lastElementChild.textContent.trim()]));
    t('lista de jogos: Agendado · Em andamento · Terminado · Terminado · Cancelado', JSON.stringify(selos.map((s) => s[1])) === JSON.stringify(['Agendado', 'Em andamento', 'Terminado', 'Terminado', 'Cancelado']), JSON.stringify(selos));
    t('lista de jogos: console sem erros', semErrosReais(erros).length === 0, erros.slice(0, 2).join(' | '));
    await page.screenshot({ path: captura('30j-lista-390.png'), fullPage: true });
    await ctx.close();
  }

  // ─── a Página do Jogo ───────────────────────────────────────────────────────────────────────────────────────────────────
  for (const [rotulo, status, minutosAtras, esperado] of [['em andamento', 'em_curso', 40, 'Em andamento'], ['terminado', 'terminado', 200, 'Terminado'], ['agendado', 'agendado', -120, 'Agendado']]) {
    const { page, ctx, erros } = await abrirCena(navegador, base, 'jogo', { largura: 390, altura: 900, motor: motorDoJogo({ status, minutosAtras }) });
    await page.getByText(esperado, { exact: true }).first().waitFor({ timeout: 25000 });
    await page.waitForTimeout(400);
    t(`Página do Jogo (${rotulo}): o selo diz "${esperado}"`, (await page.getByText(esperado, { exact: true }).count()) >= 1);
    t(`Página do Jogo (${rotulo}): console sem erros`, semErrosReais(erros).length === 0, erros.slice(0, 2).join(' | '));
    if (status === 'em_curso') await page.screenshot({ path: captura('30j-jogo-em-andamento-390.png') });
    await ctx.close();
  }

  // ─── Painel → Jogos: as linhas a 360 e 390 (selo e botões descem juntos, título e data inteiros) ───────────────────────────────
  for (const largura of [360, 390]) {
    const { page, ctx } = await abrirCena(navegador, base, 'ajustes', { largura, altura: 1500, motor: motorDoTime });
    await page.locator('[data-linha-de-jogo]').first().waitFor({ timeout: 25000 });
    await page.waitForTimeout(600);
    const linhas = await page.evaluate(() => {
      const nLinhas = (el) => {
        const r = document.createRange();
        r.selectNodeContents(el);
        return new Set([...r.getClientRects()].map((rc) => Math.round(rc.top))).size;
      };
      return [...document.querySelectorAll('[data-linha-de-jogo]')].map((l) => {
        const [bloco, acoes] = l.children;
        const [titulo, data] = bloco.children;
        const b = bloco.getBoundingClientRect();
        const a = acoes.getBoundingClientRect();
        const c = l.getBoundingClientRect();
        return {
          titulo: titulo.textContent.trim(), linhasDoTitulo: nLinhas(titulo), linhasDaData: nLinhas(data), larguraDoBloco: Math.round(b.width),
          abaixo: a.top >= b.bottom - 1, // selo + botões na segunda linha, abaixo do título
          dentro: a.right <= c.right + 0.5 && a.left >= c.left - 0.5 && b.right <= c.right + 0.5,
          botoesSobrepostos: [...acoes.children].some((x, i, todos) => i > 0 && x.getBoundingClientRect().left < todos[i - 1].getBoundingClientRect().right - 0.5 && x.getBoundingClientRect().top === todos[i - 1].getBoundingClientRect().top),
        };
      });
    });
    const por = (nome) => linhas.find((l) => l.titulo === nome);
    t(`${largura}px · Painel → Jogos: nenhuma linha esmaga o título nem a data (1 linha cada, bloco de pelo menos 150 px)`, linhas.length === 4 && linhas.every((l) => l.linhasDoTitulo === 1 && l.linhasDaData === 1 && l.larguraDoBloco >= 150), JSON.stringify(linhas));
    t(`${largura}px · Painel → Jogos: "Terminado" + Editar resultado + Ver não cabem ao lado do título — descem juntos para a 2ª linha`, por('Quadra do Bairro')?.abaixo === true, JSON.stringify(por('Quadra do Bairro')));
    t(`${largura}px · Painel → Jogos: "Em andamento" + Lançar resultado também descem juntos (mais de uma linha), sem cortar`, por('Society Madalena')?.abaixo === true && por('Society Madalena').dentro, JSON.stringify(por('Society Madalena')));
    t(`${largura}px · Painel → Jogos: tudo dentro do cartão e nada sobreposto`, linhas.every((l) => l.dentro && !l.botoesSobrepostos), JSON.stringify(linhas));
    console.log(`    · ${largura}px · quem desce para a 2ª linha: ${linhas.map((l) => `${l.titulo}=${l.abaixo ? 'desce' : 'ao lado'}`).join(', ')}`);
    await page.locator('[data-linha-de-jogo]').first().scrollIntoViewIfNeeded();
    const primeira = await page.locator('[data-linha-de-jogo]').first().boundingBox();
    const ultima = await page.locator('[data-linha-de-jogo]').last().boundingBox();
    await page.screenshot({ path: captura(`30j-painel-jogos-linhas-${largura}.png`), clip: { x: 0, y: Math.max(0, primeira.y - 40), width: largura, height: ultima.y + ultima.height - primeira.y + 60 } });
    await ctx.close();
  }

  // ─── a pergunta do Início: "Quem ganhou o jogo?" ───────────────────────────────────────────────────────────────────────────────
  const abrirPergunta = async (largura, nTimes = 2) => {
    const inicio = motorDoInicio({ quemGanhou: cardDoMotor(nTimes) });
    const cena = await abrirCena(navegador, base, 'inicio', { largura, altura: 844, motor: juntar(inicio, motorDoJogo({ status: 'em_curso', minutosAtras: 10, id: 'gq', nTimes })), caminho: '/home' });
    await cena.page.locator('[data-aviso="quem-ganhou"]').waitFor({ timeout: 25000 });
    await cena.page.waitForTimeout(400);
    return { ...cena, inicio };
  };
  const abrirModal = async (page) => {
    await page.locator('[data-aviso="quem-ganhou"]').click();
    await page.locator('[data-quem-ganhou-titulo]').waitFor({ timeout: 8000 });
    await page.waitForTimeout(250);
  };
  const marcado = (page, seletor) => page.locator(seletor).getAttribute('aria-pressed').then((v) => v === 'true');
  const finalizar = (page) => page.locator('[data-quem-ganhou-finalizar]');

  for (const largura of [390, 360]) {
    // sem escolha
    {
      const { page, ctx, erros, inicio } = await abrirPergunta(largura);
      const titulo = page.locator('[data-quem-ganhou-pergunta]');
      t(`${largura}px · card: o título é "Quem ganhou o jogo?", numa linha só`, (await titulo.innerText()).trim() === 'Quem ganhou o jogo?' && (await titulo.evaluate((el) => el.getBoundingClientRect().height)) < 40);
      await page.locator('[data-aviso="quem-ganhou"]').screenshot({ path: captura(`30j-pergunta-card-${largura}.png`) });
      await abrirModal(page);
      const x = await page.locator('[data-quem-ganhou-fechar]').boundingBox();
      t(`${largura}px · pergunta sem escolha: título "Quem ganhou o jogo?", os dois times e Empate, nenhum marcado`,
        (await page.locator('[data-quem-ganhou-titulo]').innerText()).trim() === 'Quem ganhou o jogo?' && (await page.locator('[data-quem-ganhou-time]').count()) === 2 && (await page.locator('[data-quem-ganhou-empate]').count()) === 1
        && !(await marcado(page, '[data-quem-ganhou-time="0"]')) && !(await marcado(page, '[data-quem-ganhou-time="1"]')) && !(await marcado(page, '[data-quem-ganhou-empate]')) && (await page.locator('[data-quem-ganhou-marca]').count()) === 0);
      t(`${largura}px · pergunta sem escolha: "Finalizar" apagado (desabilitado) e clicar nele não manda nada`, (await finalizar(page).isDisabled()) && (await finalizar(page).evaluate((el) => Number(getComputedStyle(el).opacity))) < 0.6 && inicio.chamadas.length === 0);
      t(`${largura}px · pergunta: "Agora não" saiu; o X do canto existe (alvo de toque de 44 px)`, !/Agora não/.test(await page.locator('.modal-card').innerText()) && x && x.width >= 44 && x.height >= 44 && x.x + x.width <= largura + 0.5, JSON.stringify(x));
      const caixa = await page.locator('.modal-card').boundingBox();
      t(`${largura}px · a janela cabe na tela (largura e altura)`, caixa.x >= 0 && caixa.x + caixa.width <= largura + 0.5 && caixa.y >= 0 && caixa.y + caixa.height <= 844, JSON.stringify(caixa));
      await page.locator('.modal-card').screenshot({ path: captura(`30j-pergunta-sem-escolha-${largura}.png`) });
      t(`${largura}px · pergunta: console sem erros`, semErrosReais(erros).length === 0, erros.slice(0, 2).join(' | '));
      await ctx.close();
    }
    // time escolhido, e depois Empate (a escolha é uma só)
    {
      const { page, ctx, inicio } = await abrirPergunta(largura);
      await abrirModal(page);
      await page.locator('[data-quem-ganhou-time="1"]').click();
      await page.waitForTimeout(200);
      const roxo = await page.locator('[data-quem-ganhou-time="1"]').evaluate((el) => ({ sombra: getComputedStyle(el).boxShadow, fundo: getComputedStyle(el).backgroundColor }));
      t(`${largura}px · tocar no Time Roxo só SELECIONA: ele fica marcado (destaque na cor dele, com o visto), o outro e o Empate não, e nada foi salvo`,
        (await marcado(page, '[data-quem-ganhou-time="1"]')) && !(await marcado(page, '[data-quem-ganhou-time="0"]')) && !(await marcado(page, '[data-quem-ganhou-empate]')) && (await page.locator('[data-quem-ganhou-marca]').count()) === 1
        && /139, 92, 246/.test(roxo.sombra) && inicio.chamadas.length === 0, JSON.stringify(roxo));
      t(`${largura}px · com um time escolhido o "Finalizar" acende (dourado, glow) e a janela continua aberta`, (await finalizar(page).isEnabled()) && (await page.locator('.cta-gold-glow [data-quem-ganhou-finalizar]').count()) === 1 && (await page.locator('[data-quem-ganhou-titulo]').count()) === 1);
      await page.locator('.modal-card').screenshot({ path: captura(`30j-pergunta-time-escolhido-${largura}.png`) });
      await page.locator('[data-quem-ganhou-empate]').click();
      await page.waitForTimeout(200);
      t(`${largura}px · tocar em Empate troca a escolha: só o Empate fica marcado (branco, com o visto), nada salvo`,
        (await marcado(page, '[data-quem-ganhou-empate]')) && !(await marcado(page, '[data-quem-ganhou-time="1"]')) && !(await marcado(page, '[data-quem-ganhou-time="0"]')) && (await page.locator('[data-quem-ganhou-marca]').count()) === 1 && (await finalizar(page).isEnabled()) && inicio.chamadas.length === 0);
      await page.locator('.modal-card').screenshot({ path: captura(`30j-pergunta-empate-${largura}.png`) });
      await ctx.close();
    }
    // Finalizar salva e fecha (time, e depois o empate)
    {
      const { page, ctx, inicio } = await abrirPergunta(largura);
      await abrirModal(page);
      await page.locator('[data-quem-ganhou-time="1"]').click();
      await finalizar(page).click();
      await page.locator('[data-aviso="quem-ganhou"]').waitFor({ state: 'detached', timeout: 8000 });
      t(`${largura}px · "Finalizar" com o Time Roxo manda UM pedido (campeão índice 1), fecha a janela e o card some`, JSON.stringify(inicio.chamadas) === JSON.stringify([{ caminho: '/api/games/gq/resultado', corpo: { campeao_time_index: 1, empate: false } }]) && (await page.locator('[data-quem-ganhou-titulo]').count()) === 0, JSON.stringify(inicio.chamadas));
      await ctx.close();
    }
    {
      const { page, ctx, inicio } = await abrirPergunta(largura);
      await abrirModal(page);
      await page.locator('[data-quem-ganhou-empate]').click();
      await finalizar(page).click();
      await page.locator('[data-aviso="quem-ganhou"]').waitFor({ state: 'detached', timeout: 8000 });
      t(`${largura}px · "Finalizar" com Empate manda o empate explícito (sem campeão) e o card some`, JSON.stringify(inicio.chamadas.map((c) => c.corpo)) === JSON.stringify([{ campeao_time_index: null, empate: true }]), JSON.stringify(inicio.chamadas));
      await ctx.close();
    }
    // fechar sem responder: o X e o toque fora; o card continua no topo e a escolha não vale nada
    {
      const { page, ctx, inicio } = await abrirPergunta(largura);
      await abrirModal(page);
      await page.locator('[data-quem-ganhou-time="0"]').click();
      await page.locator('[data-quem-ganhou-fechar]').click();
      t(`${largura}px · o X fecha a janela sem salvar: o card continua no topo`, (await page.locator('[data-quem-ganhou-titulo]').count()) === 0 && (await page.locator('[data-aviso="quem-ganhou"]').count()) === 1 && inicio.chamadas.length === 0);
      await abrirModal(page);
      t(`${largura}px · reabrindo, a pergunta recomeça sem escolha (Finalizar apagado)`, (await finalizar(page).isDisabled()) && !(await marcado(page, '[data-quem-ganhou-time="0"]')));
      await page.mouse.click(4, 4);
      await page.waitForTimeout(250);
      t(`${largura}px · tocar fora também fecha, sem salvar`, (await page.locator('[data-quem-ganhou-titulo]').count()) === 0 && (await page.locator('[data-aviso="quem-ganhou"]').count()) === 1 && inicio.chamadas.length === 0);
      await ctx.close();
    }
    // 3 e 4 times: "Quem foi o campeão?", sem Empate
    for (const n of [3, 4]) {
      const { page, ctx, inicio } = await abrirPergunta(largura, n);
      await abrirModal(page);
      t(`${largura}px · ${n} times: "Quem foi o campeão?", ${n} botões e nenhum Empate; sem escolha o "Finalizar" está apagado`,
        (await page.locator('[data-quem-ganhou-titulo]').innerText()).trim() === 'Quem foi o campeão?' && (await page.locator('[data-quem-ganhou-time]').count()) === n && (await page.locator('[data-quem-ganhou-empate]').count()) === 0 && (await finalizar(page).isDisabled()));
      await page.locator(`[data-quem-ganhou-time="${n - 1}"]`).click();
      await page.waitForTimeout(200);
      const caixa = await page.locator('.modal-card').boundingBox();
      t(`${largura}px · ${n} times: o último time escolhido fica marcado e a janela cabe na tela`, (await marcado(page, `[data-quem-ganhou-time="${n - 1}"]`)) && (await finalizar(page).isEnabled()) && caixa.y >= 0 && caixa.y + caixa.height <= 844 && caixa.x + caixa.width <= largura + 0.5, JSON.stringify(caixa));
      await page.locator('.modal-card').screenshot({ path: captura(`30j-pergunta-${n}-times-${largura}.png`) });
      await finalizar(page).click();
      await page.locator('[data-aviso="quem-ganhou"]').waitFor({ state: 'detached', timeout: 8000 });
      t(`${largura}px · ${n} times: "Finalizar" manda o campeão (índice ${n - 1}) e nada de empate`, JSON.stringify(inicio.chamadas.map((c) => c.corpo)) === JSON.stringify([{ campeao_time_index: n - 1, empate: false }]), JSON.stringify(inicio.chamadas));
      await ctx.close();
    }
  }

  // "Lançar gols e prêmios": a escolha vai junto para o editor do jogo e não se perde (nada é salvo ao passar por lá)
  for (const [rotulo, nTimes, escolher, esperado] of [
    ['Time Roxo', 2, '[data-quem-ganhou-time="1"]', '[data-vencedor="B"]'],
    ['Empate', 2, '[data-quem-ganhou-empate]', '[data-vencedor="empate"]'],
    ['o 3º time (rodízio)', 3, '[data-quem-ganhou-time="2"]', '[data-campeao-time="2"]'],
    ['nenhuma escolha', 2, null, null],
  ]) {
    const { page, ctx, inicio } = await abrirPergunta(390, nTimes);
    await abrirModal(page);
    if (escolher) await page.locator(escolher).click();
    await page.locator('[data-quem-ganhou-detalhes]').click();
    await page.locator('[data-resultado-editor="salvar"]').waitFor({ timeout: 25000 });
    await page.waitForTimeout(300);
    const marcados = await page.locator('[data-resultado-editor] [aria-pressed="true"][data-vencedor], [data-resultado-editor] [aria-pressed="true"][data-campeao-time]').count();
    t(`Lançar gols e prêmios (${rotulo}): vai para a tela do jogo e o editor ${esperado ? 'já vem com a escolha marcada' : 'vem sem ninguém marcado'}; nada foi salvo no caminho`,
      page.url().endsWith('/time/missa/jogo/gq') && (esperado ? (await marcado(page, `[data-resultado-editor] ${esperado}`)) && marcados === 1 : marcados === 0) && inicio.chamadas.length === 0, `${page.url()} · marcados ${marcados}`);
    await ctx.close();
  }

  // ─── a aba do topo da página do time: "Painel" (a 360, 375 e 390) ────────────────────────────────────────────────────────────────
  for (const largura of [360, 375, 390]) {
    const ctx = await navegador.newContext({ viewport: { width: largura, height: 800 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'pt-BR', timezoneId: SP });
    const page = await ctx.newPage();
    const erros = [];
    page.on('pageerror', (e) => erros.push(e.message));
    await page.route('**/*', roteadorDaPaginaDoTime(motorDaPaginaDoTime('admin'), base));
    await page.goto(`${base}/scripts/provas/time-admin.html`, { waitUntil: 'domcontentloaded' });
    await page.locator('[data-ir]').click();
    await page.locator('[role="tab"]').first().waitFor({ timeout: 15000 });
    await page.waitForTimeout(500);
    const r = await page.evaluate(() => {
      const linha = document.querySelector('[role="tablist"]').parentElement.getBoundingClientRect();
      const itens = [...document.querySelectorAll('[role="tab"], [data-botao-ranking]')].map((a) => {
        const b = a.getBoundingClientRect();
        return { texto: a.innerText.replace(/\s+/g, ' ').trim(), chave: a.getAttribute('data-aba'), esq: Math.round(b.left * 10) / 10, dir: Math.round(b.right * 10) / 10, estoura: a.scrollWidth > a.clientWidth + 1 };
      });
      return { itens, linha: [Math.round(linha.left * 10) / 10, Math.round(linha.right * 10) / 10], documento: document.documentElement.scrollWidth, selo: Math.round(document.querySelector('[data-selo-admin]').getBoundingClientRect().width) };
    });
    const abas = r.itens.filter((a) => a.chave);
    t(`${largura}px · aba: Jogos · Elenco · Painel (a chave da terceira segue sendo "ajustes"), com o Ranking ao lado`, abas.map((a) => a.texto.split(' ')[0]).join(' · ').toLowerCase() === 'jogos · elenco · painel' && abas[2].chave === 'ajustes' && r.itens.length === 4, JSON.stringify(r.itens));
    t(`${largura}px · aba: "Painel" não se chama mais Ajustes em lugar nenhum da barra`, !r.itens.some((a) => /ajustes/i.test(a.texto)));
    t(`${largura}px · aba: as quatro cabem na linha, sem sobrepor e sem estourar o texto`, r.itens.every((a, i) => a.dir <= r.linha[1] + 0.5 && a.esq >= r.linha[0] - 0.5 && !a.estoura && (i === 0 || a.esq >= r.itens[i - 1].dir - 0.5)), JSON.stringify(r));
    t(`${largura}px · aba: ${largura <= 380 ? 'o selo ADMIN vira um ponto dourado' : 'o selo ADMIN é o de sempre'} (${r.selo}px) e nada rola para o lado`, (largura <= 380 ? r.selo <= 8 : r.selo >= 28) && r.documento <= largura, JSON.stringify({ selo: r.selo, documento: r.documento }));
    const topo = await page.locator('[role="tablist"]').evaluate((el) => { const b = el.parentElement.getBoundingClientRect(); return { y: b.top, h: b.height }; });
    await page.screenshot({ path: captura(`30j-aba-painel-${largura}.png`), clip: { x: 0, y: 0, width: largura, height: Math.round(topo.y + topo.h + 24) } });
    await page.locator('[data-aba="ajustes"]').click();
    await page.locator('[data-ajustes-do-time]').waitFor({ timeout: 15000 });
    t(`${largura}px · aba: tocar em Painel abre o que era a aba Ajustes (endereço ?aba=ajustes) e a aba fica marcada`, page.url().includes('aba=ajustes') && (await page.locator('[data-aba="ajustes"]').getAttribute('aria-selected')) === 'true');
    t(`${largura}px · aba: a página do time roda sem exceção`, semErrosReais(erros).length === 0, erros.slice(0, 2).join(' | '));
    await ctx.close();
  }
}
