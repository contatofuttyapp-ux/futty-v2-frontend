// Prova de segurança no navegador: texto HOSTIL nas telas de verdade — nome de pessoa, de time, de campeonato, local do jogo,
// convidado, post da Resenha, comentário, anúncio, denúncia, diagnóstico — e NADA pode executar, virar elemento nem pedir endereço de fora.
//
// Como: o motor de VERDADE (todas as rotas) sobe num processo à parte por cima de banco, Storage e Auth de mentira, em memória
// (scripts/provas/_motor-hostil.cjs → backend/tests/_appFalsa.js; o .env do backend aponta para o único banco, o de produção, e aqui nunca é lido).
// Os textos hostis entram pelas rotas de escrita de verdade e voltam pelas de leitura; o app é o de verdade (index.html → src/main.jsx, as mesmas rotas),
// num Chromium com a sessão de cada pessoa. Todo pedido do navegador passa por aqui: /api/** vai ao motor de mentira, o servidor das telas passa, e
// QUALQUER outro endereço (inclusive o Supabase de produção e o evil.test dos textos) é respondido vazio sem sair da máquina — e anotado.
//
// O canário: cada texto hostil chama P(n) se virar código; P grava em window.__pwn (e alert/confirm/prompt também). Depois de cada tela a prova confere
//   · o texto hostil APARECE na tela, como texto (sem isto a prova seria vazia: o dado tem de chegar ao olho);
//   · window.__pwn está vazio e nenhum diálogo abriu; a página não saiu do lugar;
//   · não existe no DOM elemento que só um HTML interpretado criaria (on*="P(…)", <script>, <iframe>, <style> do texto, javascript:, <meta refresh>…);
//   · nenhum pedido foi feito ao evil.test.
// E um CONTROLE: o mesmo canário injetado de propósito (insertAdjacentHTML) TEM de ser pego — senão "nada executou" não prova nada.
//
// Uso: npm run provar:navegador -- xss        (~3 min: o app inteiro, ~45 telas)
//      XSS_SO=texto    roda só as telas cujo rótulo contém o texto
//      XSS_FOTOS=pasta salva a foto e o texto de cada tela (para ver o que a prova viu)
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const nome = 'Segurança · XSS: texto hostil nas telas de verdade (motor de verdade, banco falso, nada sai da máquina)';

const RAIZ = fileURLToPath(new URL('../../', import.meta.url));
const MOTOR = path.join(RAIZ, 'scripts', 'provas', '_motor-hostil.cjs');
const BACKEND_AO_LADO = path.resolve(RAIZ, '..', 'backend', 'tests', '_appFalsa.js');
// A chave em que o supabase-js guarda a sessão: sb-<ref>-auth-token, com o ref no subdomínio do projeto (a mesma conta do AuthContext).
const REF = new URL((readFileSync(new URL('../../.env', import.meta.url), 'utf8').match(/^VITE_SUPABASE_URL=(.+)$/m)?.[1] || 'https://prova.supabase.co').trim()).hostname.split('.')[0];
const DIRETORIO_DE_FOTOS = process.env.XSS_FOTOS || '';

// ─── O motor hostil, num processo à parte ───────────────────────────────────────────────────────────────────────────────────────────────────
function subirMotor() {
  return new Promise((resolve, reject) => {
    const filho = spawn(process.execPath, [MOTOR], { stdio: ['pipe', 'pipe', 'pipe'], cwd: RAIZ });
    let saida = '';
    let erro = '';
    const prazo = setTimeout(() => { filho.kill(); reject(new Error(`o motor hostil não ficou pronto em 120 s\n${erro.slice(-700)}`)); }, 120000);
    filho.stderr.on('data', (d) => { erro += d; });
    filho.stdout.on('data', (d) => {
      saida += d;
      const linha = saida.split('\n').find((l) => l.startsWith('{"pronto"'));
      if (linha) { clearTimeout(prazo); resolve({ filho, dados: JSON.parse(linha), errosDoMotor: () => erro }); }
    });
    filho.once('exit', (codigo) => { clearTimeout(prazo); reject(new Error(`o motor hostil saiu com ${codigo}\n${erro.slice(-900)}`)); });
  });
}

/** Pede o relatório de rede ao motor ("fim") e o encerra. Devolve o que ele tentou fazer fora de 127.0.0.1. */
function encerrarMotor(filho) {
  return new Promise((resolve) => {
    let saida = '';
    const acabou = (rede) => { clearTimeout(prazo); try { filho.kill(); } catch { /* já saiu */ } resolve(rede); };
    const prazo = setTimeout(() => acabou(null), 8000);
    filho.stdout.on('data', (d) => {
      saida += d;
      const linha = saida.split('\n').find((l) => l.startsWith('{"rede"'));
      if (linha) acabou(JSON.parse(linha).rede);
    });
    filho.once('exit', () => acabou(null));
    try { filho.stdin.write('fim\n'); } catch { acabou(null); }
  });
}

// ─── O canário e o detetor (rodam dentro da página) ─────────────────────────────────────────────────────────────────────────────────────────
// Roda em TODO quadro antes de qualquer script do app: P(n) é o que os textos hostis chamam; alert/confirm/prompt só anotam; window.open não abre nada.
function canario() {
  window.__pwn = [];
  window.__abriu = [];
  window.P = (n) => { window.__pwn.push(String(n)); };
  for (const nomeDoDialogo of ['alert', 'confirm', 'prompt']) {
    window[nomeDoDialogo] = (...a) => { window.__pwn.push(`${nomeDoDialogo}:${a[0]}`); return nomeDoDialogo === 'confirm' ? false : null; };
  }
  window.open = (...a) => { window.__abriu.push(String(a[0])); return null; };
}

// O que existiria no DOM se um texto virasse HTML (e que o app, por si, não cria nestas telas).
function detetor() {
  const achados = [];
  const marca = (el, porque) => achados.push(`${porque} → ${el.outerHTML.slice(0, 110).replace(/\s+/g, ' ')}`);
  const PERIGOSO = /P\(\d|evil\.test|javascript:/i;
  // Num atributo de endereço só importa para onde ele leva: um texto com P(n) dentro de um caminho do app (/time/%3Csvg…) é só um caminho.
  // (data:image/… é o que o próprio app usa na silhueta e no cromo; data:text/html e companhia não.)
  const ENDERECO_PERIGOSO = /^\s*(javascript|vbscript):|^\s*data:(?!image\/)|evil\.test/i;
  for (const el of document.querySelectorAll('*')) {
    const tag = el.tagName.toLowerCase();
    for (const a of el.attributes) {
      if (/^on/i.test(a.name) && PERIGOSO.test(a.value)) marca(el, `atributo ${a.name}`);
      if (/^(href|src|action|formaction|data|poster|background|xlink:href)$/i.test(a.name) && ENDERECO_PERIGOSO.test(a.value)) marca(el, `${a.name} com endereço perigoso`);
      if (a.name.toLowerCase() === 'srcdoc') marca(el, 'srcdoc');
    }
    if (tag === 'script' && !el.src && /P\(\d/.test(el.textContent)) marca(el, 'script do texto');
    if (tag === 'style' && /XSS\d/.test(el.textContent)) marca(el, 'style do texto');
    if (tag === 'iframe' || tag === 'object' || tag === 'embed' || tag === 'base' || tag === 'math' || tag === 'mglyph' || tag === 'mtext') marca(el, `<${tag}> que o texto não deveria criar`);
    if (tag === 'meta' && el.httpEquiv && el.httpEquiv.toLowerCase() === 'refresh') marca(el, 'meta refresh');
    if (tag === 'img' && el.getAttribute('src') === 'x') marca(el, 'img src=x do texto');
    if (tag === 'svg' && el.hasAttribute('onload')) marca(el, 'svg onload');
  }
  return achados;
}

// ─── Sessão e contexto ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
const sessaoDe = (dados, quem) => JSON.stringify({
  access_token: dados.tokens[quem], refresh_token: 'prova', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 86400 * 30,
  user: { id: dados.pessoas[quem].id, aud: 'authenticated', email: 'prova@futty.test', app_metadata: {}, user_metadata: { onboarding_completo: true }, created_at: '2026-01-01T00:00:00Z' },
});

const CABECALHOS_QUE_NAO_VOLTAM = new Set(['content-encoding', 'content-length', 'transfer-encoding', 'connection', 'keep-alive']);
const CABECALHOS_QUE_NAO_VAO = ['host', 'origin', 'referer', 'if-none-match', 'if-modified-since', 'content-length', 'accept-encoding', 'connection'];

async function aoMotor(route, base) {
  const req = route.request();
  const url = new URL(req.url());
  const origem = req.headers().origin || '*';
  const cors = { 'access-control-allow-origin': origem, 'access-control-allow-credentials': 'true', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' };
  if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
  const cabecalhos = { ...req.headers() };
  for (const h of CABECALHOS_QUE_NAO_VAO) delete cabecalhos[h];
  const corpo = req.postDataBuffer();
  const r = await fetch(`${base}${url.pathname}${url.search}`, { method: req.method(), headers: cabecalhos, body: corpo && !['GET', 'HEAD'].includes(req.method()) ? corpo : undefined, redirect: 'manual' });
  const cabecalhosDaResposta = { ...cors };
  r.headers.forEach((v, k) => { if (!CABECALHOS_QUE_NAO_VOLTAM.has(k) && !k.startsWith('access-control-')) cabecalhosDaResposta[k] = v; });
  return route.fulfill({ status: r.status, headers: cabecalhosDaResposta, body: Buffer.from(await r.arrayBuffer()) });
}

async function abrirContexto(navegador, base, dados, quem, { reduzir = false, largura = 390, ...extras } = {}) {
  const ctx = await navegador.newContext({
    viewport: { width: largura, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true, locale: 'pt-BR', timezoneId: 'America/Sao_Paulo',
    serviceWorkers: 'block', reducedMotion: reduzir ? 'reduce' : 'no-preference', ...extras,
  });
  const estado = { externos: [], dialogos: [], erros: [], pedidosAoMotor: 0 };
  await ctx.addInitScript(canario);
  await ctx.addInitScript(({ chave, sessao }) => {
    try { localStorage.setItem('futty_cookies', 'aceite'); if (sessao) localStorage.setItem(chave, sessao); } catch { /* sem armazenamento */ }
  }, { chave: `sb-${REF}-auth-token`, sessao: quem ? sessaoDe(dados, quem) : null });
  const origemDoVite = new URL(base).host;
  await ctx.route('**/*', async (route) => {
    const url = new URL(route.request().url());
    try {
      if (url.pathname.startsWith('/api/')) { estado.pedidosAoMotor += 1; return await aoMotor(route, dados.base); }
      if (url.host === origemDoVite) return await route.continue();
      // Qualquer outro endereço (Supabase de produção, evil.test, fontes, miniaturas…) NÃO sai da máquina: anota e responde vazio.
      estado.externos.push(`${route.request().method()} ${url.host}${url.pathname}`.slice(0, 120));
      return await route.fulfill({ status: 200, contentType: url.pathname.endsWith('.js') ? 'text/javascript' : 'application/json', body: url.pathname.endsWith('.js') ? '' : '{}' });
    } catch (e) {
      return route.abort().catch(() => {});
    }
  });
  // Nada de WebSocket para fora (o Realtime do Supabase é o único que existiria).
  await ctx.routeWebSocket((url) => url.host !== origemDoVite, (ws) => ws.close());
  return { ctx, estado };
}

async function novaPagina({ ctx, estado }) {
  const page = await ctx.newPage();
  page.on('dialog', (d) => { estado.dialogos.push(d.message()); d.dismiss().catch(() => {}); });
  page.on('pageerror', (e) => estado.erros.push(e.message));
  estado.consoles = [];
  estado.falhas = [];
  page.on('console', (m) => { if (estado.consoles.length < 12) estado.consoles.push(`${m.type()}: ${m.text().slice(0, 160)}`); });
  page.on('requestfailed', (r) => { if (estado.falhas.length < 12) estado.falhas.push(`${r.url().slice(0, 110)} (${r.failure()?.errorText})`); });
  return page;
}

// ─── Uma tela: ir, esperar o texto hostil aparecer, deixar passar o que for assíncrono, conferir ────────────────────────────────────────────
const resumo = (lista, n = 3) => lista.slice(0, n).join(' | ') + (lista.length > n ? ` … +${lista.length - n}` : '');

async function conferirTela(t, rotulo, page, estado, { vistosEsperados, antes = null, depois = null, literais = [], esperaMs = 20000 }) {
  const numeros = vistosEsperados.map(([, n]) => n);
  if (antes) await antes(page);
  if (numeros.length) {
    await page.waitForFunction((ns) => ns.every((n) => (document.body.innerText + ' ' + [...document.querySelectorAll('input,textarea')].map((c) => c.value).join(' ')).includes(`P(${n})`)), numeros, { timeout: esperaMs }).catch(() => {});
  } else {
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);
  }
  if (depois) await depois(page);
  await page.waitForTimeout(900); // o que um HTML interpretado dispararia (onerror de imagem, onload de svg, timers) já teria acontecido
  const lido = await page.evaluate(() => ({ texto: document.body.innerText + ' ' + [...document.querySelectorAll('input,textarea')].map((c) => c.value).join(' '), pwn: window.__pwn || [], abriu: window.__abriu || [], url: location.pathname + location.search }));
  lido.suspeitos = await page.evaluate(detetor);
  const faltam = [...vistosEsperados.filter(([, n]) => !lido.texto.includes(`P(${n})`)).map(([campo]) => campo), ...literais.filter((l) => !lido.texto.includes(l))];
  t(`${rotulo} · o texto hostil aparece na tela, como texto (${[...vistosEsperados.map(([c]) => c), ...literais].join(', ') || 'sem campo esperado'})`, faltam.length === 0,
    `não apareceu: ${faltam.join(', ')} · a tela tinha: «${lido.texto.replace(/\s+/g, ' ').slice(0, 260)}»`);
  const evil = estado.externos.filter((e) => /evil\.test/.test(e));
  const executou = lido.pwn.length > 0 || estado.dialogos.length > 0;
  const injetou = lido.suspeitos.length > 0;
  const abriu = lido.abriu.filter((u) => /^\s*javascript:/i.test(u));
  t(`${rotulo} · nada executa, nada vira elemento, nada pede endereço de fora`,
    !executou && !injetou && evil.length === 0 && abriu.length === 0,
    `${executou ? `EXECUTOU P(${lido.pwn.join(',')}) ${estado.dialogos.join('/')} · ` : ''}${injetou ? `elementos criados: ${resumo(lido.suspeitos)} · ` : ''}${evil.length ? `pediu ${resumo(evil)} · ` : ''}${abriu.length ? `window.open(${abriu[0]}) · ` : ''}`);
  if (DIRETORIO_DE_FOTOS) {
    const arquivo = rotulo.replace(/[^\w]+/g, '-').slice(0, 60);
    writeFileSync(path.join(DIRETORIO_DE_FOTOS, `${arquivo}.txt`), lido.texto);
    await page.screenshot({ path: path.join(DIRETORIO_DE_FOTOS, `${arquivo}.png`), fullPage: true }).catch(() => {});
  }
  return lido;
}

export async function rodar({ navegador, base, t }) {
  try { readFileSync(BACKEND_AO_LADO); } catch {
    t('o backend não está ao lado (FUTTY-V2/backend): a prova de XSS foi pulada', true);
    return;
  }
  const { filho, dados, errosDoMotor } = await subirMotor();
  const R = dados.registro;
  const num = (campo) => R[campo].numeros[0];
  const campos = (...lista) => lista.map((c) => [c, num(c)]);
  const slug = dados.time.slug;
  const filtro = process.env.XSS_SO || '';
  const querRodar = (rotulo) => !filtro || rotulo.toLowerCase().includes(filtro.toLowerCase());
  const externosVistos = new Map();

  try {
    // ─── O CONTROLE: o canário TEM de pegar o que for injetado de propósito ───────────────────────────────────────────────────────────────
    {
      const cena = await abrirContexto(navegador, base, dados, null);
      const page = await novaPagina(cena);
      await page.goto(`${base}/login`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1200);
      await page.evaluate(() => {
        document.body.insertAdjacentHTML('beforeend', '<img src=x onerror=P(0)><img src="https://evil.test/controle.gif"><svg onload=P(0)></svg>');
      });
      await page.waitForTimeout(700);
      const lido = { pwn: await page.evaluate(() => window.__pwn), suspeitos: await page.evaluate(detetor) };
      t('controle · o canário pega o que é injetado de propósito (P(0) executou)', lido.pwn.includes('0'), `window.__pwn = ${JSON.stringify(lido.pwn)}`);
      t('controle · o detetor de DOM acusa o elemento injetado', lido.suspeitos.length >= 2, `suspeitos = ${lido.suspeitos.length}`);
      t('controle · o pedido ao evil.test é visto (e respondido vazio, sem sair da máquina)', cena.estado.externos.some((e) => /evil\.test/.test(e)), `externos = ${resumo(cena.estado.externos)}`);
      await cena.ctx.close();
    }

    // ─── A trava do motor: o link da campanha que não é http(s) nem chega a ser gravado ──────────────────────────────────────────────────────
    t('controle do motor · a campanha com link javascript: é RECUSADA na gravação (400), e a de https é que fica no ar', dados.linkPerigosoRecusado === true, 'o motor gravou (ou não respondeu 400 a) um link javascript: de campanha');

    // ─── As telas, cada uma com a pessoa que a vê ──────────────────────────────────────────────────────────────────────────────────────
    const idDoCamp = dados.campeonato?.id;
    const refletidos = {
      img: (n) => encodeURIComponent(`<img src=x onerror=P(${n})>`),
      svg: (n) => encodeURIComponent(`<svg/onload=P(${n})>`),
    };
    const concluirJa = async (page) => { await page.getByRole('button', { name: /concluir já/ }).click({ timeout: 25000 }).catch(() => {}); };
    const abaDoGabinete = (aba) => `/gabinete?aba=${aba}`;
    const clicar = (nomeDoBotao) => async (page) => { await page.getByRole('button', { name: nomeDoBotao, exact: true }).first().click({ timeout: 25000 }).catch(() => {}); };
    const TELAS = [
      // ── O que cada pessoa vê, com o texto hostil de verdade ──
      { rotulo: 'Início (admin do time)', quem: 'adm', caminho: '/home', campos: campos('time.nome') },
      { rotulo: 'Resenha · post, anúncio, comentários, campeão e jogo', quem: 'm1', caminho: '/feed', campos: campos('post.corpo', 'anuncio.titulo', 'comentario.corpo', 'resposta.corpo', 'campeonato.nome', 'destaque.titulo') },
      { rotulo: 'Início com anúncio hostil · e o toque no anúncio', quem: 'm1', caminho: '/home', campos: campos('ad.texto'),
        depois: async (page) => { await page.getByText(`P(${num('ad.texto')})`).first().click({ timeout: 8000 }).catch(() => {}); } },
      { rotulo: 'Página do time', quem: 'm1', caminho: `/time/${slug}`, campos: campos('time.nome') },
      { rotulo: 'Página do time · elenco e pedidos de entrada (admin)', quem: 'adm', caminho: `/time/${slug}?aba=elenco`, campos: campos('ext.apelido', 'm1.apelido') },
      { rotulo: 'Página do time · ajustes e denúncias (admin)', quem: 'adm', caminho: `/time/${slug}?aba=ajustes`, campos: campos('time.nome', 'time.descricao', 'post.corpo') },
      { rotulo: 'Painel antigo do admin (redireciona)', quem: 'adm', caminho: `/admin/${slug}`, campos: campos('time.nome') },
      { rotulo: 'Jogos do time', quem: 'm1', caminho: `/time/${slug}/jogos`, campos: campos('jogo.local') },
      { rotulo: 'Ranking', quem: 'm1', caminho: `/time/${slug}/ranking`, campos: campos('m2.apelido') },
      { rotulo: 'Perfil de outro jogador', quem: 'm1', caminho: `/time/${slug}/jogador/${dados.pessoas.m2.id}`, campos: campos('m2.apelido') },
      { rotulo: 'Jogo sorteado (convidados, gols, destaque)', quem: 'm1', caminho: `/time/${slug}/jogo/${dados.jogo.id}`, campos: campos('jogo.local', 'convidado1') },
      { rotulo: 'Jogo aberto', quem: 'm1', caminho: `/time/${slug}/jogo/${dados.jogoAberto.id}`, campos: [] },
      { rotulo: 'Cerimônia do sorteio (innerHTML)', quem: 'm1', caminho: `/time/${slug}/jogo/${dados.jogo.id}/sorteio`, campos: campos('convidado1', 'convidado2', 'm1.apelido'), opcoes: { reduzir: true }, antes: concluirJa },
      { rotulo: 'Cerimônia do sorteio (rolos inteiros, sem pular)', quem: 'm1', caminho: `/time/${slug}/jogo/${dados.jogo.id}/sorteio`, campos: campos('convidado1'), esperaMs: 90000 },
      { rotulo: 'Campeonato (do time)', quem: 'm1', caminho: `/time/${slug}/campeonato/${idDoCamp}`, campos: campos('campeonato.nome', 'campeonato.time1') },
      { rotulo: 'Campeonato público (sem login)', quem: null, caminho: `/p/campeonato/${slug}/${idDoCamp}`, campos: campos('campeonato.nome', 'campeonato.time1') },
      { rotulo: 'Sorteio público (sem login)', quem: null, caminho: `/p/${slug}/${dados.jogo.id}`, campos: campos('time.nome', 'convidado1') },
      { rotulo: 'Sorteio pelo link curto (sem login)', quem: null, caminho: `/s/${dados.jogo.codigo}`, campos: campos('time.nome', 'convidado1') },
      { rotulo: 'Meu perfil', quem: 'adm', caminho: '/perfil', campos: campos('adm.apelido') },
      { rotulo: 'Figurinha (sem foto ainda)', quem: 'adm', caminho: '/figurinha', campos: [] },
      { rotulo: 'Convite (sem login)', quem: null, caminho: `/convite/${dados.convite.token}`, campos: campos('time.nome') },
      { rotulo: 'Explorar times (radar com localização)', quem: 'ext', caminho: '/explorar', campos: campos('time.nome'), opcoes: { geolocation: { latitude: -15.7942, longitude: -47.8822 }, permissions: ['geolocation'] },
        antes: async (page) => { await page.getByRole('button', { name: /usar minha localização/i }).click({ timeout: 25000 }).catch(() => {}); } },
      // ── O super-admin lê o que qualquer um escreve ──
      { rotulo: 'Gabinete · pessoas', quem: 'sup', caminho: abaDoGabinete('pessoas'), campos: campos('adm.nome', 'm3.nome') },
      { rotulo: 'Gabinete · times', quem: 'sup', caminho: abaDoGabinete('pessoas'), campos: campos('time.nome', 'rival.nome'), antes: clicar('Times') },
      { rotulo: 'Gabinete · denúncias', quem: 'sup', caminho: abaDoGabinete('pessoas'), campos: [], antes: clicar('Denúncias') },
      { rotulo: 'Gabinete · avise-me (a origem já chega limpa do motor)', quem: 'sup', caminho: abaDoGabinete('avise'), campos: [], literais: ['bola@exemplo.com'] },
      { rotulo: 'Gabinete · visão geral', quem: 'sup', caminho: abaDoGabinete('visao'), campos: [] },
      { rotulo: 'Gabinete · anúncios', quem: 'sup', caminho: abaDoGabinete('anuncios'), campos: campos('ad.anunciante') },
      { rotulo: 'Gabinete · segurança e relatórios de diagnóstico', quem: 'sup', caminho: abaDoGabinete('seguranca'), campos: campos('diagnostico.plataforma', 'diagnostico.versao'),
        depois: async (page) => { await page.getByRole('button', { name: 'Ver', exact: true }).first().click({ timeout: 8000 }).catch(() => {}); await page.waitForTimeout(600); } },
      { rotulo: 'Gabinete · figurinhas', quem: 'sup', caminho: abaDoGabinete('brilhantes'), campos: [] },
      { rotulo: 'Diagnóstico deste aparelho', quem: 'sup', caminho: '/diagnostico', campos: [] },
      // ── O que vem escrito no ENDEREÇO (caminho, busca, âncora) e a tela poderia devolver ──
      { rotulo: 'Endereço hostil · página que não existe (sem login)', quem: null, caminho: `/${refletidos.img(900)}`, campos: [] },
      { rotulo: 'Endereço hostil · página que não existe (logado)', quem: 'm1', caminho: `/${refletidos.svg(901)}/${refletidos.img(902)}`, campos: [] },
      { rotulo: 'Endereço hostil · time que não existe', quem: 'm1', caminho: `/time/${refletidos.svg(903)}`, campos: [] },
      { rotulo: 'Endereço hostil · jogo, jogador e campeonato que não existem', quem: 'm1', caminho: `/time/${slug}/jogo/${refletidos.svg(904)}`, campos: [] },
      { rotulo: 'Endereço hostil · jogador que não existe', quem: 'm1', caminho: `/time/${slug}/jogador/${refletidos.svg(905)}?nome=${refletidos.img(906)}`, campos: [] },
      { rotulo: 'Endereço hostil · campeonato que não existe', quem: 'm1', caminho: `/time/${slug}/campeonato/${refletidos.svg(907)}`, campos: [] },
      { rotulo: 'Endereço hostil · campeonato público que não existe', quem: null, caminho: `/p/campeonato/${refletidos.svg(908)}/${refletidos.img(909)}`, campos: [] },
      { rotulo: 'Endereço hostil · sorteio público que não existe', quem: null, caminho: `/p/${refletidos.svg(910)}/${refletidos.img(911)}`, campos: [] },
      { rotulo: 'Endereço hostil · convite e link curto que não existem', quem: null, caminho: `/convite/${refletidos.svg(912)}`, campos: [] },
      { rotulo: 'Endereço hostil · link curto que não existe', quem: null, caminho: `/s/${refletidos.img(913)}`, campos: [] },
      { rotulo: 'Endereço hostil · busca e âncora na entrada', quem: null, caminho: `/login?utm_source=${refletidos.img(914)}&utm_campaign=${refletidos.svg(915)}&ref=${refletidos.img(916)}&next=${encodeURIComponent('javascript:P(917)')}&redirect=${encodeURIComponent('//evil.test/x')}#${refletidos.svg(918)}`, campos: [] },
      { rotulo: 'Endereço hostil · busca e âncora na página inicial', quem: null, caminho: `/?utm_source=${refletidos.img(919)}&ref=${refletidos.svg(920)}#${refletidos.img(921)}`, campos: [] },
      { rotulo: 'Endereço hostil · planos e gabinete', quem: 'sup', caminho: `/planos?destaque=${refletidos.svg(922)}&uniforme=${refletidos.img(923)}`, campos: [] },
      { rotulo: 'Endereço hostil · aba do gabinete', quem: 'sup', caminho: `/gabinete?aba=${refletidos.img(924)}`, campos: [] },
    ];
    // Um contexto por pessoa (e por opção, como a localização do aparelho), reaproveitado entre as telas: o navegador guarda os módulos do Vite e a prova
    // anda várias vezes mais rápido. Cada tela abre a sua página (o canário e o contador de pedidos recomeçam) e a fecha no fim.
    const contextos = new Map();
    const contextoDe = async (quem, opcoes) => {
      const chave = `${quem}|${JSON.stringify(opcoes || {})}`;
      if (!contextos.has(chave)) contextos.set(chave, await abrirContexto(navegador, base, dados, quem, opcoes));
      return contextos.get(chave);
    };
    for (const tela of TELAS) {
      if (!querRodar(tela.rotulo)) continue;
      const cena = await contextoDe(tela.quem, tela.opcoes);
      cena.estado.externos.length = 0;
      cena.estado.dialogos.length = 0;
      cena.estado.erros.length = 0;
      const page = await novaPagina(cena);
      await page.goto(`${base}${tela.caminho}`, { waitUntil: 'domcontentloaded' });
      await conferirTela(t, tela.rotulo, page, cena.estado, { vistosEsperados: tela.campos, antes: tela.antes, depois: tela.depois, literais: tela.literais, esperaMs: tela.esperaMs });
      for (const e of cena.estado.externos) externosVistos.set(e, (externosVistos.get(e) || 0) + 1);
      await page.close();
    }
    for (const cena of contextos.values()) await cena.ctx.close();

    // ─── Os cartões 9:16 (canvas): texto hostil entra no desenho como texto, sai 1080×1920 e nada executa ──────────────────────────────────────
    if (querRodar('cartões 9:16')) {
      const cena = await abrirContexto(navegador, base, dados, 'm1');
      await cena.ctx.addInitScript(() => {
        window.__desenhado = [];
        for (const metodo of ['fillText', 'strokeText']) {
          const original = CanvasRenderingContext2D.prototype[metodo];
          CanvasRenderingContext2D.prototype[metodo] = function registrar(texto, ...resto) { window.__desenhado.push(String(texto)); return original.call(this, texto, ...resto); };
        }
      });
      const page = await novaPagina(cena);
      await page.goto(`${base}/scripts/provas/xss-cartoes.html`, { waitUntil: 'domcontentloaded' });
      await page.locator('#raiz[data-pronto]').waitFor({ state: 'attached', timeout: 60000 }).catch(() => { throw new Error(`a bancada dos cartões não ficou pronta · erros da página: ${cena.estado.erros.join(' | ').slice(0, 500)} · console: ${cena.estado.consoles.join(' | ').slice(0, 700)} · falhas: ${cena.estado.falhas.join(' | ').slice(0, 500)} · pedidos de fora: ${resumo(cena.estado.externos)}`); });
      const doMotor = async (rota) => (await fetch(`${dados.base}${rota}`, { headers: { authorization: `Bearer ${dados.tokens.m1}` } })).json();
      const campeonato = (await doMotor(`/api/equipas/${slug}/campeonatos/${idDoCamp}`)).campeonato;
      const jogo = (await doMotor(`/api/games/${dados.jogo.id}`)).game;
      const saida = await page.evaluate(async ({ camp, resultado, nomeEquipa }) => {
        const tamanhos = {};
        const tentar = async (rotulo, fazer) => {
          try { tamanhos[rotulo] = await fazer(); } catch (e) { tamanhos[rotulo] = `erro: ${e.message}`; }
        };
        await tentar('campeão', () => { const cv = window.__cartoes.canvasCartaoCampeao(camp); return `${cv.width}x${cv.height}`; });
        await tentar('pódio', () => { const cv = window.__cartoes.canvasCartaoPodio(camp); return `${cv.width}x${cv.height}`; });
        await tentar('time sorteado', async () => { const { blob } = await window.__cartoes.gerarCartao916(resultado, 0, nomeEquipa); const img = await createImageBitmap(blob); return `${img.width}x${img.height}`; });
        return { tamanhos, desenhado: window.__desenhado, pwn: window.__pwn };
      }, { camp: campeonato, resultado: jogo.times_resultado, nomeEquipa: R['time.nome'].valor });
      for (const [cartao, tamanho] of Object.entries(saida.tamanhos)) t(`cartão 9:16 · ${cartao} sai 1080×1920 com os nomes hostis`, tamanho === '1080x1920', String(tamanho));
      const literais = saida.desenhado.filter((s) => /P\(\d+\)/i.test(s));
      t('cartões 9:16 · o texto hostil vai LITERAL para o desenho (fillText), em nome de time, de jogador, de convidado e do campeonato', literais.length >= 6, `textos hostis desenhados: ${literais.length}`);
      const evil = cena.estado.externos.filter((e) => /evil\.test/.test(e));
      t('cartões 9:16 · nada executa, nenhum diálogo, nenhum pedido ao evil.test', saida.pwn.length === 0 && cena.estado.dialogos.length === 0 && evil.length === 0,
        `pwn=${JSON.stringify(saida.pwn)} diálogos=${cena.estado.dialogos.length} evil=${evil.length}`);
      for (const e of cena.estado.externos) externosVistos.set(e, (externosVistos.get(e) || 0) + 1);
      await cena.ctx.close();
    }
  } finally {
    const rede = await encerrarMotor(filho);
    t('o motor hostil não tentou falar com a rede de fora (só 127.0.0.1)', Array.isArray(rede) && rede.length === 0, rede ? `tentou: ${resumo(rede)}` : `sem relatório do motor: ${errosDoMotor().slice(-300)}`);
    const fora = [...externosVistos.keys()].filter((e) => !/evil\.test/.test(e));
    if (fora.length) console.log(`  ℹ o navegador pediu ${fora.length} endereço(s) de fora (respondidos vazios, nada saiu): ${resumo(fora, 6)}`);
  }
}
