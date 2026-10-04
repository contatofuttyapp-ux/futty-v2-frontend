// Prova no navegador da Rodada 29L (a varredura visual em 390 px): o que só um Chromium de verdade confirma, medido com as MESMAS fontes e o
// MESMO CSS do app.
//   · faixas que rolam (130/138): esmaece a borda por onde há mais, a seta rola e tem 44 px de toque, e some quando não há mais nada;
//   · o card "Seu time" com 1 time (igual a antes) e "Seus times" com 2 ou mais (127): fechado cabe, toque abre os atalhos, um por vez;
//   · o contraste (137) medido no DOM, composto sobre o fundo de verdade: ≥ 4,5:1;
//   · a faixa de cookies exatamente acima da barra de navegação (125) e o 404 sem sessão (126);
//   · as abas do time em 320, 360, 375 e 390 px (129);
//   · o par "Trocar foto / Gerar minha figurinha" numa linha cada (132) e os botões − e + com 44 px (131);
//   · a foto que falha vira uma linha curta e o toque tenta de novo (141);
//   · "Excluir" só no jogo cancelado, e o par "Criar jogos recorrentes / Criar campeonato" sem quebrar (139, 140).
export const nome = 'Rodada 29L (faixas, "Seus times", contraste, cookies e 404, abas, Figurinha, foto que falha, Excluir)';

const PNG_1X1 = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
const DIA = 86400000;

// O motor de mentira: /api/** responde com o que o teste pediu; a foto do post (/imagens-prova/) responde como o teste mandar.
function criarRoteador(base, { responder = () => ({}), foto = { ok: false }, pedidos = [] } = {}) {
  const origem = new URL(base).host;
  return (route) => {
    const req = route.request();
    const u = new URL(req.url());
    pedidos.push(`${req.method()} ${u.pathname}${u.search}`);
    if (u.pathname.startsWith('/api/')) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(responder(u.pathname, req.method())) });
    if (u.pathname.startsWith('/imagens-prova/')) {
      return foto.ok ? route.fulfill({ status: 200, contentType: 'image/png', body: PNG_1X1 }) : route.fulfill({ status: 404, contentType: 'text/plain', body: 'nao' });
    }
    if (u.host === origem) return route.continue();
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  };
}

async function abrir(navegador, base, { largura = 390, altura = 844, cookiesAceitos = true, responder, foto, pedidos } = {}) {
  const ctx = await navegador.newContext({ viewport: { width: largura, height: altura }, deviceScaleFactor: 1, isMobile: true, hasTouch: true, locale: 'pt-BR', timezoneId: 'America/Sao_Paulo' });
  if (cookiesAceitos) await ctx.addInitScript(() => { try { localStorage.setItem('futty_cookies', 'aceite'); } catch { /* sem storage */ } });
  const page = await ctx.newPage();
  const erros = [];
  page.on('pageerror', (e) => erros.push(e.message));
  await page.route('**/*', criarRoteador(base, { responder, foto, pedidos }));
  await page.goto(`${base}/scripts/provas/rodada-29l.html`, { waitUntil: 'domcontentloaded' });
  await page.locator('[data-casa]').waitFor({ timeout: 20000 });
  return { ctx, page, erros };
}
const irPara = (page, caminho) => page.evaluate((c) => { window.history.pushState({}, '', c); window.dispatchEvent(new PopStateEvent('popstate')); }, caminho);
const fontesProntas = (page) => page.evaluate(() => document.fonts.ready.then(() => true));

// O motor da página do time (a mesma da prova "Página do time"), com jogos para o "Excluir".
function motorDoTime(jogos) {
  const team = { id: 'T1', slug: 'varzea-fc', nome: 'Várzea FC', cor: 'vinho', escudo_cor2: 'ouro', escudo_padrao: 'faixa', role: 'admin', joga: true, fuso: 'America/Sao_Paulo', cidade: 'São Paulo', jogadores_por_time: 6, mostrar_gols: true, modo_visibilidade: 'privado', logo_url: null };
  const members = [{ id: 'U1', nome: 'Tonhão', role: 'admin', joga: true, goleiro: false }];
  const respostas = {
    '/api/teams/varzea-fc': { team, members },
    '/api/teams/varzea-fc/games': { team, games: jogos },
    '/api/teams/varzea-fc/pedidos': { pedidos: [] },
    '/api/teams/varzea-fc/stats': { stats: { total_jogos: 1, total_membros: 1, media_confirmacoes: 0 } },
    '/api/teams/varzea-fc/membros': { membros: [] },
    '/api/teams/varzea-fc/convites': { convites: [] },
    '/api/push/preferencias': { preferencias: { jogos: true, pedidos: true, figurinha: true, resenha: true }, admin: true, salvavel: true },
    '/api/feed/denuncias': { denuncias: [] },
    '/api/denuncias/fila': { fila: [] },
  };
  return (pathname, metodo) => {
    // Como o servidor de verdade: cancelar muda o jogo, e a lista que o app recarrega já o traz cancelado.
    const cancelando = metodo === 'POST' && pathname.match(/^\/api\/games\/([^/]+)\/cancelar$/);
    if (cancelando) {
      const jogo = jogos.find((j) => j.id === cancelando[1]);
      if (jogo) Object.assign(jogo, { status: 'cancelado', cancelado: true, motivo_cancelamento: null });
      return { ok: true };
    }
    return pathname.startsWith('/api/jogos/') && pathname.endsWith('/rsvp')
      ? { rsvp_aberto: false, rsvp_fechado: false, confirmados: [], recusados: [], pendentes: [], fuso: 'America/Sao_Paulo' }
      : (respostas[pathname] ?? {});
  };
}

export async function rodar({ navegador, base, t }) {
  // ── achados 130 e 138 · faixas que rolam e avisam ────────────────────────────────────────────────────────────────────────────────
  {
    const { ctx, page, erros } = await abrir(navegador, base);
    await irPara(page, '/faixas');
    await page.locator('[data-fundos] .fig-seletor-grade').waitFor({ timeout: 15000 });
    await fontesProntas(page);
    await page.waitForTimeout(400);
    const trilho = page.locator('[data-fundos] .fig-seletor-grade');
    const atributo = (loc, a) => loc.getAttribute(a);

    t('fundos: no começo só há mais à direita (borda direita esmaece, esquerda não)', (await atributo(trilho, 'data-mais-dir')) === '1' && (await atributo(trilho, 'data-mais-esq')) === null);
    t('fundos: a máscara de esmaecer está mesmo aplicada ao trilho', /gradient/.test(await trilho.evaluate((el) => getComputedStyle(el).maskImage || getComputedStyle(el).webkitMaskImage || '')));
    const caixa = await page.evaluate(() => {
      const env = document.querySelector('[data-fundos] .faixa-rolavel').getBoundingClientRect();
      const tr = document.querySelector('[data-fundos] .fig-seletor-grade').getBoundingClientRect();
      return { env: env.width, trilho: tr.width, pai: document.querySelector('[data-fundos]').getBoundingClientRect().width };
    });
    t('fundos: a caixa (85%, centrada) ficou no envoltório e o trilho a preenche — nada mudou de lugar', Math.abs(caixa.env / caixa.pai - 0.85) < 0.01 && Math.abs(caixa.trilho - caixa.env) < 1, JSON.stringify(caixa));
    const seta = page.locator('[data-fundos] [data-seta="dir"]');
    t('fundos: a seta da direita aparece e diz "Ver mais fundos"', (await seta.count()) === 1 && (await seta.getAttribute('aria-label')) === 'Ver mais fundos');
    t('fundos: a seta da esquerda ainda não existe', (await page.locator('[data-fundos] [data-seta="esq"]').count()) === 0);
    const alvo = await seta.evaluate((el) => {
      const r = el.getBoundingClientRect();
      // 6 px para fora do desenho de 30 px, e ainda é o botão: a área de toque é de 44.
      const fora = document.elementFromPoint(r.right + 6, r.top + r.height / 2);
      return { w: Math.round(r.width), h: Math.round(r.height), toqueFora: fora === el };
    });
    t('fundos: a seta desenha 30 px e aceita toque até 44 px', alvo.w === 30 && alvo.h === 30 && alvo.toqueFora, JSON.stringify(alvo));

    await seta.click();
    await page.waitForFunction(() => document.querySelector('[data-fundos] .fig-seletor-grade').scrollLeft > 40, null, { timeout: 5000 });
    t('fundos: tocar na seta rola a faixa e a borda esquerda passa a esmaecer também', (await atributo(trilho, 'data-mais-esq')) === '1' && (await page.locator('[data-fundos] [data-seta="esq"]').count()) === 1);

    await trilho.evaluate((el) => { el.scrollLeft = el.scrollWidth; });
    await page.waitForFunction(() => !document.querySelector('[data-fundos] [data-seta="dir"]'), null, { timeout: 5000 });
    const fim = await page.evaluate(() => {
      const tr = document.querySelector('[data-fundos] .fig-seletor-grade');
      const ultimo = tr.querySelector('[data-tile="Royal"]').getBoundingClientRect();
      return { dir: tr.getAttribute('data-mais-dir'), esq: tr.getAttribute('data-mais-esq'), ultimoDentro: ultimo.right <= tr.getBoundingClientRect().right + 1 };
    });
    t('fundos: no fim some a seta da direita, o Royal aparece inteiro e só a borda esquerda esmaece', fim.dir === null && fim.esq === '1' && fim.ultimoDentro, JSON.stringify(fim));

    const cabe = page.locator('[data-cabe] .fig-seletor-grade');
    t('faixa que cabe inteira (2 tiles) não esmaece e não tem seta', (await atributo(cabe, 'data-mais-dir')) === null && (await atributo(cabe, 'data-mais-esq')) === null && (await page.locator('[data-cabe] [data-seta]').count()) === 0);

    const chips = page.locator('[data-chips]');
    t('chips de time do Início: a faixa esmaece à direita onde há mais ("Várzea FC" deixa de parecer cortado por engano)', (await atributo(chips, 'data-mais-dir')) === '1' && (await atributo(chips, 'data-mais-esq')) === null);
    await chips.evaluate((el) => { el.scrollLeft = el.scrollWidth; });
    await page.waitForFunction(() => document.querySelector('[data-chips]').getAttribute('data-mais-dir') === null, null, { timeout: 5000 });
    t('chips de time: no fim esmaece só à esquerda', (await atributo(chips, 'data-mais-esq')) === '1');
    t('faixas rodam sem exceção', erros.length === 0, erros.slice(0, 2).join(' | '));
    await ctx.close();
  }

  // ── achado 127 · o card "Seu time" / "Seus times" ────────────────────────────────────────────────────────────────────────────────
  {
    const { ctx, page, erros } = await abrir(navegador, base);
    await irPara(page, '/cards');
    await page.locator('[data-um] [data-seu-time]').waitFor({ timeout: 15000 });
    await fontesProntas(page);

    const um = await page.evaluate(() => ({
      card: document.querySelectorAll('[data-um] [data-seu-time]').length,
      rotulo: [...document.querySelectorAll('[data-um] [data-seu-time] span')].map((s) => s.innerText.trim()).find((s) => /^seu time$/i.test(s)) || null,
      atalhos: [...document.querySelectorAll('[data-um] [data-atalho]')].map((a) => a.getAttribute('data-atalho')),
      lista: document.querySelectorAll('[data-um] [data-seus-times]').length,
      pendencia: document.querySelector('[data-um] [data-pendencia="presenca"]')?.innerText.trim(),
    }));
    t('com UM time o card é o de sempre: "Seu time", pendência e os 4 atalhos já à vista (nada de lista)',
      um.card === 1 && um.lista === 0 && /^seu time$/i.test(um.rotulo) && um.atalhos.join(' · ') === 'Novo jogo · Sortear · Convidar · Ajustes' && /^Sexta, 9 de out\.: presença ainda não aberta$/.test(um.pendencia), JSON.stringify(um));

    const dois = page.locator('[data-dois]');
    const estadoFechado = await page.evaluate(() => {
      const raiz = document.querySelector('[data-dois]');
      const card = raiz.querySelector('[data-seus-times]');
      return {
        cards: raiz.querySelectorAll('[data-seus-times]').length,
        cardsDeUm: raiz.querySelectorAll('[data-seu-time]').length,
        rotulo: card.querySelector('span').innerText,
        linhas: [...card.querySelectorAll('[data-time-linha]')].map((l) => l.getAttribute('data-time-linha')),
        resumos: [...card.querySelectorAll('[data-time-linha]')].map((l) => l.querySelector('[data-resumo-do-time]')?.innerText.trim() ?? null),
        atalhos: card.querySelectorAll('[data-atalho]').length,
        altura: Math.round(card.getBoundingClientRect().height),
        alturaDeUm: Math.round(document.querySelector('[data-um] [data-seu-time]').getBoundingClientRect().height),
      };
    });
    t('com DOIS times é UM card só, "Seus times", uma linha por time (escudo · nome · pendência)',
      estadoFechado.cards === 1 && estadoFechado.cardsDeUm === 0 && /^seus times$/i.test(estadoFechado.rotulo) && estadoFechado.linhas.join(',') === 'missa,varzea-fc', JSON.stringify(estadoFechado));
    t('na linha: a pendência de quem tem ("Sexta, 9 de out.: presença ainda não aberta") e nada para quem não tem',
      estadoFechado.resumos[0] === 'Sexta, 9 de out.: presença ainda não aberta' && estadoFechado.resumos[1] === null, JSON.stringify(estadoFechado.resumos));
    t('fechado, nenhum atalho aparece e o card cabe em menos de 190 px (dois cards de um time passavam de 330)', estadoFechado.atalhos === 0 && estadoFechado.altura < 190, `${estadoFechado.altura}px; um time só: ${estadoFechado.alturaDeUm}px`);

    const linha1 = dois.locator('[data-time-linha="missa"] > button');
    const linha2 = dois.locator('[data-time-linha="varzea-fc"] > button');
    t('as linhas são botões com aria-expanded=false', (await linha1.getAttribute('aria-expanded')) === 'false' && (await linha2.getAttribute('aria-expanded')) === 'false');
    t('cada linha tem 44 px ou mais de altura (toque)', (await linha1.evaluate((el) => el.getBoundingClientRect().height)) >= 44 && (await linha2.evaluate((el) => el.getBoundingClientRect().height)) >= 44);

    await linha1.click();
    const painel1 = dois.locator('[data-time-atalhos="missa"]');
    await painel1.waitFor({ timeout: 5000 });
    const aberto = await painel1.evaluate((el) => ({
      atalhos: [...el.querySelectorAll('[data-atalho]')].map((a) => [a.getAttribute('data-atalho'), a.getAttribute('href')]),
      pendencia: el.querySelector('[data-pendencia="presenca"]')?.getAttribute('href'),
      abrir: el.querySelector('[data-abrir-o-time]')?.getAttribute('href'),
    }));
    t('tocar na linha abre os quatro atalhos, na ordem de sempre, com os mesmos destinos',
      aberto.atalhos.map((a) => a[0]).join(' · ') === 'Novo jogo · Sortear · Convidar · Ajustes'
      && aberto.atalhos[0][1] === '/time/missa/jogo/novo' && aberto.atalhos[1][1] === '/time/missa/jogo/g2'
      && aberto.atalhos[2][1] === '/time/missa?aba=elenco&convidar=1' && aberto.atalhos[3][1] === '/time/missa?aba=ajustes', JSON.stringify(aberto));
    // 29R (achado 147): a linha de presença deixou de levar só à aba Jogos; leva ao jogo (g2) e já abre o "Abrir presença" dele.
    t('aberta, a linha mostra a pendência como link para o jogo (?abrir-presenca=g2) e um "Abrir o time" (o time continua a um toque)', aberto.pendencia === '/time/missa?aba=jogos&abrir-presenca=g2' && aberto.abrir === '/time/missa', JSON.stringify(aberto));
    t('aria-expanded vira true na linha aberta', (await linha1.getAttribute('aria-expanded')) === 'true');

    await linha2.click();
    await dois.locator('[data-time-atalhos="varzea-fc"]').waitFor({ timeout: 5000 });
    t('abrir a outra linha fecha a primeira (um por vez: o card não cresce sem parar)',
      (await dois.locator('[data-time-atalhos="missa"]').count()) === 0 && (await linha1.getAttribute('aria-expanded')) === 'false' && (await linha2.getAttribute('aria-expanded')) === 'true');
    t('time sem pendência, aberto: "Tudo tranquilo por aqui." e os quatro atalhos', (await dois.locator('[data-time-atalhos="varzea-fc"] [data-tudo-tranquilo]').count()) === 1 && (await dois.locator('[data-time-atalhos="varzea-fc"] [data-atalho]').count()) === 4);
    await linha2.click();
    t('tocar de novo fecha', (await dois.locator('[data-time-atalhos]').count()) === 0);

    // 29T (achado 168): "Seus times" mostra até 2 linhas; a terceira está atrás de "Ver todos (3)".
    t('com 3 times: só 2 linhas à mostra e o botão "Ver todos (3)" (29T)', (await page.locator('[data-tres] [data-time-linha]').count()) === 2 && (await page.locator('[data-tres] [data-ver-todos]').innerText()).trim() === 'Ver todos (3)');
    await page.locator('[data-tres] [data-ver-todos]').click();
    const tres = await page.evaluate(() => [...document.querySelectorAll('[data-tres] [data-time-linha]')].map((l) => l.querySelector('[data-resumo-do-time]')?.innerText.trim() ?? null));
    // 29T-B: os times com pendência vêm primeiro (depois, a ordem de sempre): o de 3 pendências, o da denúncia, e por último o que não pede nada.
    t('com 3 times: mais de uma pendência vira "N pendências", uma só mostra o texto, nenhuma mostra nada — e quem tem pendência vem primeiro', tres[0] === '3 pendências' && tres[1] === '1 denúncia para ver' && tres[2] === null, JSON.stringify(tres));
    t('o card roda sem exceção', erros.length === 0, erros.slice(0, 2).join(' | '));
    await ctx.close();
  }

  // ── achado 137 · contraste do Início, medido no DOM ──────────────────────────────────────────────────────────────────────────────
  {
    const { ctx, page, erros } = await abrir(navegador, base);
    await irPara(page, '/contraste');
    await page.locator('[data-jogo-agendado] .gcard').waitFor({ timeout: 15000 });
    await fontesProntas(page);
    await page.waitForTimeout(900);
    const textos = await page.evaluate(() => {
      const analisar = (c) => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(',').map((x) => parseFloat(x)); return { r: p[0], g: p[1], b: p[2], a: p[3] ?? 1 }; };
      const por = (cima, baixo) => ({ r: cima.r * cima.a + baixo.r * (1 - cima.a), g: cima.g * cima.a + baixo.g * (1 - cima.a), b: cima.b * cima.a + baixo.b * (1 - cima.a), a: 1 });
      const lum = (c) => { const f = (v) => { const x = v / 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
      const fundoDe = (el) => {
        const cadeia = [];
        for (let n = el; n; n = n.parentElement) cadeia.unshift(n);
        let base = { r: 5, g: 8, b: 16, a: 1 }; // #050810, o fundo do app
        for (const n of cadeia) {
          const c = analisar(getComputedStyle(n).backgroundColor);
          if (c && c.a > 0) base = por(c, base);
          if (n.classList && n.classList.contains('gcard')) base = { r: 13, g: 13, b: 18, a: 1 }; // o fim do gradiente do .gcard (#0d0d12)
        }
        return base;
      };
      const saida = [];
      for (const raiz of document.querySelectorAll('[data-jogo-agendado], [data-jogo-sorteado], [data-rsvp]')) {
        const andador = document.createTreeWalker(raiz, NodeFilter.SHOW_TEXT);
        for (let no = andador.nextNode(); no; no = andador.nextNode()) {
          const texto = no.textContent.replace(/\s+/g, ' ').trim();
          if (!texto || /^[·]$/.test(texto)) continue;
          const el = no.parentElement;
          const cs = getComputedStyle(el);
          const fundo = fundoDe(el);
          const frente = por(analisar(cs.color), fundo);
          const [a, b] = [lum(frente), lum(fundo)].sort((x, y) => y - x);
          saida.push({ texto, ratio: Number(((a + 0.05) / (b + 0.05)).toFixed(2)), cor: cs.color, tamanho: cs.fontSize, bloco: raiz.getAttribute('data-jogo-agendado') !== null ? 'agendado' : raiz.getAttribute('data-jogo-sorteado') !== null ? 'sorteado' : 'rsvp' });
        }
      }
      return saida;
    });
    const achar = (re, bloco) => textos.find((x) => re.test(x.texto) && (!bloco || x.bloco === bloco));
    const confirmados = achar(/confirmados/, 'agendado');
    const confirmados2 = achar(/confirmados/, 'sorteado');
    const semResposta = achar(/^Sem resposta$/);
    const mudar = achar(/^Mudar resposta$/);
    const ate = achar(/^até/);
    const doNome = (x) => (x ? `${x.texto}: ${x.ratio}:1 (${x.cor})` : 'não achei');
    t('"12 confirmados" passa de 4,5:1', !!confirmados && confirmados.ratio >= 4.5, doNome(confirmados));
    t('"17 confirmados" (jogo sorteado) passa de 4,5:1', !!confirmados2 && confirmados2.ratio >= 4.5, doNome(confirmados2));
    t('"Sem resposta" passa de 4,5:1', !!semResposta && semResposta.ratio >= 4.5, doNome(semResposta));
    t('"Mudar resposta" passa de 4,5:1', !!mudar && mudar.ratio >= 4.5, doNome(mudar));
    t('"até qui., …" do cartão de presença passa de 4,5:1', !!ate && ate.ratio >= 4.5, doNome(ate));
    const fracos = textos.filter((x) => x.ratio < 4.5);
    t('nenhum texto desses três cartões (jogo agendado, jogo sorteado, presença) fica abaixo de 4,5:1', fracos.length === 0, fracos.map((x) => `${x.texto} ${x.ratio}:1 ${x.bloco}`).join(' | '));
    t('o contraste roda sem exceção', erros.length === 0, erros.slice(0, 2).join(' | '));
    await ctx.close();
  }

  // ── achados 125 e 126 · a faixa de cookies sobre a barra e o 404 sem sessão ──────────────────────────────────────────────────────
  {
    const { ctx, page, erros } = await abrir(navegador, base, { cookiesAceitos: false });
    await irPara(page, '/rota-que-nao-existe');
    await page.locator('[aria-label="Aviso de cookies"]').waitFor({ timeout: 15000 });
    await page.locator('.bottom-nav').waitFor({ timeout: 15000 });
    await fontesProntas(page);
    await page.waitForTimeout(300);
    const m = await page.evaluate(() => {
      const faixa = document.querySelector('[aria-label="Aviso de cookies"]').getBoundingClientRect();
      const barra = document.querySelector('.bottom-nav').getBoundingClientRect();
      const botao = document.querySelector('[aria-label="Aviso de cookies"] button');
      const b = botao.getBoundingClientRect();
      const alvo = document.elementFromPoint(b.left + b.width / 2, b.bottom - 2);
      const medida = document.getElementById('medida-da-barra').getBoundingClientRect().height;
      const perfil = document.querySelector('.bottom-nav__tab--perfil').getBoundingClientRect();
      return {
        baseDaFaixa: Math.round(faixa.bottom * 10) / 10, topoDaBarra: Math.round(barra.top * 10) / 10, alturaDaBarra: Math.round(barra.height * 10) / 10,
        variavel: Math.round(medida * 10) / 10, botaoBase: Math.round(b.bottom * 10) / 10,
        toqueNoBotao: alvo === botao || botao.contains(alvo), botaoToPerfil: Math.round((perfil.top - b.bottom) * 10) / 10,
      };
    });
    t('a faixa de cookies termina exatamente onde a barra de navegação começa (nenhum pixel por baixo)', Math.abs(m.baseDaFaixa - m.topoDaBarra) <= 0.6, JSON.stringify(m));
    t('--altura-barra-nav vale exatamente a altura real da barra', Math.abs(m.variavel - m.alturaDaBarra) <= 0.6, JSON.stringify(m));
    t('o botão "Aceitar" fica inteiro acima da barra e o toque no pé dele é dele, não do "Perfil"', m.botaoBase <= m.topoDaBarra + 0.1 && m.toqueNoBotao && m.botaoToPerfil >= 0, JSON.stringify(m));

    const nf = await page.evaluate(() => ({
      titulo: document.querySelector('h1')?.innerText,
      primario: [...document.querySelectorAll('button')].find((b) => /Voltar ao início/.test(b.innerText))?.innerText,
      porta: document.querySelector('[data-porta-alternativa]')?.getAttribute('data-porta-alternativa'),
      portaTexto: document.querySelector('[data-porta-alternativa]')?.innerText,
      portaHref: document.querySelector('[data-porta-alternativa]')?.getAttribute('href'),
      explorar: /descubra times/i.test(document.body.innerText),
    }));
    t('404 sem sessão: o segundo caminho é "Ou crie sua conta" (/register), não o Explorar, que exige conta', nf.porta === 'criar-conta' && nf.portaTexto === 'Ou crie sua conta' && nf.portaHref === '/register' && !nf.explorar, JSON.stringify(nf));
    t('404 sem sessão: o título e o botão de sempre', nf.titulo === 'Página não encontrada' && nf.primario === 'Voltar ao início', JSON.stringify(nf));
    await page.getByRole('button', { name: 'Aceitar' }).click();
    t('"Aceitar" fecha a faixa', (await page.locator('[aria-label="Aviso de cookies"]').count()) === 0);
    t('a faixa e o 404 rodam sem exceção', erros.length === 0, erros.slice(0, 2).join(' | '));
    await ctx.close();
  }

  // ── achado 129 · as abas do time em telas estreitas ──────────────────────────────────────────────────────────────────────────────
  {
    const jogos = [{ id: 'g-futuro', data: new Date(Date.now() + 3 * DIA).toISOString(), local: 'Campo da Vila', status: 'agendado', confirmados: 4, sorteio_realizado: false }];
    for (const largura of [320, 360, 375, 390]) {
      const { ctx, page, erros } = await abrir(navegador, base, { largura, responder: motorDoTime(jogos) });
      await irPara(page, '/time/varzea-fc?aba=jogos');
      await page.locator('[role="tab"]').first().waitFor({ timeout: 15000 });
      await fontesProntas(page);
      await page.waitForTimeout(300);
      const r = await page.evaluate(() => {
        const itens = [...document.querySelectorAll('[role="tab"], [data-botao-ranking]')];
        const linha = document.querySelector('[role="tablist"]').parentElement.getBoundingClientRect();
        const selo = document.querySelector('[data-selo-admin]').getBoundingClientRect();
        return {
          abas: itens.map((a) => {
            const b = a.getBoundingClientRect();
            return { texto: a.innerText.replace(/\s+/g, ' ').trim(), esq: Math.round(b.left * 10) / 10, dir: Math.round(b.right * 10) / 10, estoura: a.scrollWidth > a.clientWidth + 1 };
          }),
          linha: [Math.round(linha.left * 10) / 10, Math.round(linha.right * 10) / 10],
          documento: document.documentElement.scrollWidth,
          selo: Math.round(selo.width),
        };
      });
      const dentro = r.abas.every((a) => a.dir <= r.linha[1] + 0.5 && a.esq >= r.linha[0] - 0.5);
      const semSobrepor = r.abas.every((a, i) => i === 0 || a.esq >= r.abas[i - 1].dir - 0.5);
      const semEstourar = r.abas.every((a) => !a.estoura);
      t(`${largura} px: as quatro (Jogos · Elenco · Ajustes · Ranking) cabem na linha, sem sobrepor e sem o texto estourar`, r.abas.length === 4 && dentro && semSobrepor && semEstourar, JSON.stringify(r));
      t(`${largura} px: nada vaza para o lado`, r.documento <= largura, `documento ${r.documento}px`);
      const seloEsperado = largura <= 380 ? r.selo <= 8 : r.selo >= 28;
      t(`${largura} px: o selo ADMIN é ${largura <= 380 ? 'um ponto dourado' : 'o selo de sempre'}`, seloEsperado, `${r.selo}px de largura`);
      if (largura === 390) {
        const folga = r.linha[1] - r.abas[3].dir;
        t('390 px: o "Ranking" não encosta mais na borda da linha (as quatro dividem a sobra, não "partes iguais")', folga >= 0 && folga <= 1, `folga ${folga}px`);
      }
      t(`${largura} px: a página do time roda sem exceção`, erros.length === 0, erros.slice(0, 2).join(' | '));
      await ctx.close();
    }
  }

  // ── achados 139 e 140 · "Excluir" só no jogo cancelado; o par de botões sem quebrar ────────────────────────────────────────────────
  {
    const futuro = (dias) => new Date(Date.now() + dias * DIA).toISOString();
    const jogos = [
      { id: 'g-ativo-0', data: futuro(2), local: 'Campo A', status: 'agendado', confirmados: 0, sorteio_realizado: false },
      { id: 'g-ativo-4', data: futuro(3), local: 'Campo B', status: 'agendado', confirmados: 4, sorteio_realizado: false },
      { id: 'g-canc-0', data: futuro(4), local: 'Campo C', status: 'cancelado', cancelado: true, motivo_cancelamento: 'Chuva', confirmados: 0, sorteio_realizado: false },
      { id: 'g-canc-3', data: futuro(5), local: 'Campo D', status: 'cancelado', cancelado: true, motivo_cancelamento: 'Chuva', confirmados: 3, sorteio_realizado: false },
    ];
    const pedidos = [];
    const { ctx, page, erros } = await abrir(navegador, base, { responder: motorDoTime(jogos), pedidos });
    await irPara(page, '/time/varzea-fc?aba=jogos');
    await page.locator('[data-jogos-admin] [data-jogo="g-ativo-0"]').waitFor({ timeout: 15000 });
    await fontesProntas(page);
    const botoes = (id) => page.locator(`[data-jogo="${id}"]`).evaluate((el) => [...el.querySelectorAll('button')].map((b) => b.innerText.trim()).filter((x) => /^(Editar|Cancelar jogo|Excluir)$/.test(x)));

    t('jogo ativo (com 0 ou 4 confirmados): só "Editar" e "Cancelar jogo", nenhum "Excluir"', (await botoes('g-ativo-0')).join('|') === 'Editar|Cancelar jogo' && (await botoes('g-ativo-4')).join('|') === 'Editar|Cancelar jogo', `${await botoes('g-ativo-0')} / ${await botoes('g-ativo-4')}`);
    t('jogo já cancelado e sem confirmados: aparece "Excluir"', (await botoes('g-canc-0')).join('|') === 'Excluir', (await botoes('g-canc-0')).join('|'));
    t('jogo cancelado COM confirmados: não aparece "Excluir" (o motor recusaria com 409)', (await botoes('g-canc-3')).length === 0, (await botoes('g-canc-3')).join('|'));
    t('a página do admin não oferece nenhum "Excluir" fora de um jogo cancelado', (await page.getByRole('button', { name: 'Excluir', exact: true }).count()) === 1);

    // A escada: cancelar o jogo ativo de 0 confirmados faz o "Excluir" aparecer nele.
    await page.locator('[data-jogo="g-ativo-0"]').getByRole('button', { name: 'Cancelar jogo' }).click();
    await page.locator('.modal-card').waitFor({ timeout: 5000 });
    await page.locator('.modal-card').getByRole('button', { name: 'Cancelar jogo' }).click();
    await page.locator('[data-jogo="g-ativo-0"][data-jogo-cancelado]').waitFor({ timeout: 5000 });
    t('cancelar o jogo manda o POST /cancelar e é só então que o "Excluir" aparece nele', pedidos.includes('POST /api/games/g-ativo-0/cancelar') && (await botoes('g-ativo-0')).join('|') === 'Excluir', (await botoes('g-ativo-0')).join('|'));

    // Excluir pede confirmação antes de apagar.
    await page.locator('[data-jogo="g-ativo-0"]').getByRole('button', { name: 'Excluir' }).click();
    await page.locator('.modal-card').waitFor({ timeout: 5000 });
    t('"Excluir" abre a confirmação "Esta ação é irreversível" antes de apagar', /irreversível/.test(await page.locator('.modal-card').innerText()) && !pedidos.some((p) => p.startsWith('DELETE ')));
    await page.locator('.modal-card').getByRole('button', { name: 'Cancelar' }).click();
    await page.locator('.modal-card').waitFor({ state: 'detached', timeout: 5000 });

    // O par de botões do topo (achado 140), em 390 e em 320.
    const par = await page.evaluate(() => {
      const a = [...document.querySelectorAll('[data-jogos-admin] button')].find((b) => /Criar jogos recorrentes/.test(b.innerText));
      const b = [...document.querySelectorAll('[data-jogos-admin] button')].find((x) => /Criar campeonato/.test(x.innerText));
      const linhas = (el) => { const r = document.createRange(); r.selectNodeContents(el); return new Set([...r.getClientRects()].filter((x) => x.width > 0).map((x) => Math.round(x.top))).size; };
      const ra = a.getBoundingClientRect(); const rb = b.getBoundingClientRect();
      return { linhas: [linhas(a), linhas(b)], alturas: [Math.round(ra.height), Math.round(rb.height)], topos: [Math.round(ra.top), Math.round(rb.top)], dir: Math.round(rb.right), larguraDoDocumento: document.documentElement.scrollWidth };
    });
    t('390 px: "Criar jogos recorrentes" e "Criar campeonato" lado a lado, cada um numa linha só e com a mesma altura', par.linhas.join() === '1,1' && par.alturas[0] === par.alturas[1] && par.topos[0] === par.topos[1], JSON.stringify(par));
    t('a página do admin roda sem exceção', erros.length === 0, erros.slice(0, 2).join(' | '));
    await ctx.close();

    const pequeno = await abrir(navegador, base, { largura: 320, responder: motorDoTime(jogos) });
    await irPara(pequeno.page, '/time/varzea-fc?aba=jogos');
    await pequeno.page.locator('[data-jogos-admin] [data-jogo="g-ativo-0"]').waitFor({ timeout: 15000 });
    await fontesProntas(pequeno.page);
    const par320 = await pequeno.page.evaluate(() => {
      const bs = [...document.querySelectorAll('[data-jogos-admin] button')].filter((b) => /Criar jogos recorrentes|Criar campeonato/.test(b.innerText));
      const linhas = (el) => { const r = document.createRange(); r.selectNodeContents(el); return new Set([...r.getClientRects()].filter((x) => x.width > 0).map((x) => Math.round(x.top))).size; };
      return { linhas: bs.map(linhas), direitas: bs.map((b) => Math.round(b.getBoundingClientRect().right)), documento: document.documentElement.scrollWidth };
    });
    t('320 px: sem largura para os dois, o segundo desce inteiro para a linha de baixo — nenhum rótulo parte ao meio', par320.linhas.join() === '1,1' && par320.documento <= 320, JSON.stringify(par320));
    await pequeno.ctx.close();
  }

  // ── achados 131 e 132 · a linha da Figurinha ─────────────────────────────────────────────────────────────────────────────────────
  {
    for (const largura of [390, 375, 360, 320]) {
      const { ctx, page, erros } = await abrir(navegador, base, { largura });
      await irPara(page, '/figurinha-linha');
      await page.locator('[data-gerar]').waitFor({ timeout: 15000 });
      await fontesProntas(page);
      await page.waitForTimeout(300);
      const r = await page.evaluate(() => {
        // Linhas de TEXTO (o ícone do botão tem outra altura e não conta): quantos "topos" distintos têm os pedaços de texto.
        const linhas = (el) => {
          const topos = new Set();
          const andador = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
          for (let no = andador.nextNode(); no; no = andador.nextNode()) {
            if (!no.textContent.trim() || getComputedStyle(no.parentElement).display === 'none') continue;
            const rg = document.createRange(); rg.selectNodeContents(no);
            for (const x of rg.getClientRects()) if (x.width > 0) topos.add(Math.round(x.top));
          }
          return topos.size;
        };
        const trocar = document.querySelector('[data-trocar]');
        const gerar = document.querySelector('[data-gerar]');
        const rotulo = [...gerar.querySelectorAll('.rotulo-gerar-longo, .rotulo-gerar-curto')].find((s) => getComputedStyle(s).display !== 'none');
        const tr = trocar.getBoundingClientRect(); const gr = gerar.getBoundingClientRect(); const rr = rotulo.getBoundingClientRect();
        const linha = document.querySelector('[data-linha-io]').getBoundingClientRect();
        return {
          linhasGerar: linhas(gerar), linhasTrocar: linhas(trocar), mesmaLinha: Math.abs(tr.top - gr.top) < 1, alturas: [Math.round(tr.height), Math.round(gr.height)],
          rotulo: rotulo.textContent, cabeNoBotao: rr.right <= gr.right - 11 && rr.left >= gr.left + 11, direita: Math.round(gr.right), documento: document.documentElement.scrollWidth,
          gerarOcupaALinha: gr.width >= linha.width - 2,
        };
      });
      const esperado = largura <= 410 ? 'Gerar figurinha' : 'Gerar minha figurinha';
      if (largura > 320) {
        t(`${largura} px: "Trocar foto" e "${esperado}" lado a lado, cada um numa linha só, alturas iguais`, r.linhasGerar === 1 && r.linhasTrocar === 1 && r.mesmaLinha && r.alturas[0] === r.alturas[1] && r.rotulo === esperado, JSON.stringify(r));
      } else {
        t(`${largura} px: sem largura para os dois lado a lado, o "${esperado}" desce inteiro (cada botão numa linha só, nada estoura a tela)`, r.linhasGerar === 1 && r.linhasTrocar === 1 && !r.mesmaLinha && r.gerarOcupaALinha && r.rotulo === esperado, JSON.stringify(r));
      }
      t(`${largura} px: o texto do botão cabe dentro dele, sem estourar a borda nem a tela`, r.cabeNoBotao && r.documento <= largura, JSON.stringify(r));
      if (largura === 390) {
        const z = await page.evaluate(() => {
          const linha = document.querySelector('[data-linha-tamanho]');
          const cs = getComputedStyle(linha);
          const medidas = [...document.querySelectorAll('[data-zoom]')].map((b) => { const r = b.getBoundingClientRect(); const canto = document.elementFromPoint(r.left + 3, r.top + 3); return { w: Math.round(r.width), h: Math.round(r.height), cantoEhOBotao: canto === b }; });
          return { medidas, ocupa: linha.offsetHeight + parseFloat(cs.marginTop) + parseFloat(cs.marginBottom) };
        });
        t('390 px: os botões − e + têm 44×44 px de toque (até o cantinho)', z.medidas.length === 2 && z.medidas.every((m) => m.w === 44 && m.h === 44 && m.cantoEhOBotao), JSON.stringify(z));
        t('a linha de tamanho ocupa os mesmos 16 px de antes (44 − 13 − 15): o card e os botões de baixo não se mexem', z.ocupa === 16, `${z.ocupa}px`);
      }
      t(`${largura} px: a linha da Figurinha roda sem exceção`, erros.length === 0, erros.slice(0, 2).join(' | '));
      await ctx.close();
    }
  }

  // ── achado 141 · a foto que falha ────────────────────────────────────────────────────────────────────────────────────────────────
  {
    const foto = { ok: false };
    const pedidos = [];
    const { ctx, page, erros } = await abrir(navegador, base, { foto, pedidos });
    await irPara(page, '/foto');
    await page.locator('[data-imagem-falhou]').waitFor({ timeout: 15000 });
    await fontesProntas(page);
    const falha = await page.evaluate(() => ({
      altura: Math.round(document.querySelector('[data-foto]').getBoundingClientRect().height),
      texto: document.querySelector('[data-imagem-falhou]').innerText.trim(),
      imgs: document.querySelectorAll('[data-foto] img').length,
      botaoH: Math.round(document.querySelector('[data-imagem-falhou]').getBoundingClientRect().height),
    }));
    t('foto que falha: a área encolhe para uma linha curta (nada de ~400 px de buraco com imagem quebrada)', falha.altura < 130 && falha.botaoH <= 80 && falha.imgs === 0, JSON.stringify(falha));
    t('a linha diz o que houve e o que fazer, na voz da casa', falha.texto === 'Não deu para carregar a foto. Toque para tentar de novo.', falha.texto);

    foto.ok = true;
    await page.locator('[data-imagem-falhou]').click();
    await page.waitForFunction(() => { const i = document.querySelector('[data-foto] img'); return i && i.complete && i.naturalWidth > 0; }, null, { timeout: 8000 });
    t('tocar tenta de novo: a foto aparece e a linha de erro some', (await page.locator('[data-imagem-falhou]').count()) === 0 && (await page.locator('[data-foto] img').count()) === 1);
    t('a nova tentativa pede o endereço com ?w=512&r=1 (o navegador não reaproveita o erro)', pedidos.some((p) => p === 'GET /imagens-prova/post.png?w=512&r=1'), pedidos.filter((p) => p.includes('imagens-prova')).join(' | '));
    await page.locator('[data-foto] img').click();
    t('a foto boa continua abrindo em tela cheia (o toque chega no onAbrir)', (await page.locator('[data-abriu]').innerText()) === '1');
    t('a foto roda sem exceção', erros.length === 0, erros.slice(0, 2).join(' | '));
    await ctx.close();
  }
}
