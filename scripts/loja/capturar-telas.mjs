// Capturas cruas para as lojas — as 8 telas de outubro (LOJA-PRINTS-OUT.md), logado como a conta de
// demonstração criada por backend/scripts/demo-loja.js.
//
// Correr a partir de frontend/:
//   node scripts/loja/capturar-telas.mjs                                              Google Play: 1170×2532 → LOJA/outubro/cruas/
//   node scripts/loja/capturar-telas.mjs --tamanho=1290x2796 --cruas=outubro/apple/cruas   App Store (iPhone 6,7")
//   opções: --base=http://localhost:5173  --so=radar,inicio  --cruas=<pasta dentro de LOJA>  --aparelho=android|iphone
//
// A captura do Android passou de 360×780 (as peças de setembro) para 390×844 a 3×, que é a RÉGUA DA CASA — a
// largura em que as telas são desenhadas e medidas (provas e capturas de telas-390). Motivo achado nesta rodada:
// em 360 px o cartão de campos do Novo jogo tem 327 px de conteúdo numa caixa de 310 e CORTA 17 px à direita
// (o fim de "Hora do jogo", a borda do campo de hora e a do botão "Criar jogo"). Em 390 px nada corta. O defeito
// dos 360 px é de verdade e vale para quem usa Android estreito — está anotado para a LISTA-CURTA, não é da peça.
//
// ── AS DUAS REGRAS DA CASA (CLAUDE.md) ────────────────────────────────────────────────────────────────
// 1. NUNCA contra produção. A base tem de ser localhost (o script aborta se não for) e qualquer pedido a
//    run.app / futtyapp.com.br / futty.pages.dev é abortado e REPROVA a execução inteira.
// 2. NADA é gravado no banco (que é o de produção, partilhado): toda escrita em /api é respondida aqui
//    mesmo, sem sair da máquina. O que precisa de gravação para existir na tela (a festa do Criar time)
//    sai de resposta simulada, como nas capturas de telas-390.
//
// Duas telas mostram o app com uma resposta SIMULADA do motor, porque o banco não pode ser tocado:
//   · inicio  — a conta demo não tem jogo futuro (os três estão "finished"); a resposta de /api/inicio sai
//               com o último jogo remarcado para o próximo domingo e sem resposta minha, que é o que faz o
//               aviso "Você vai?" subir ao topo. Nenhuma linha do banco muda.
//   · radar   — tira as seis peladas radar-teste-* (são de demonstração, com jogadores fictícios) e põe o
//               bairro nos três times públicos da demo, que nasceram antes da coluna `bairro` (migração 073), e o
//               LOGO de cada um (LOJA/demo-logos/<time>.png, desenhados pela Freaky), servido por esta própria
//               captura no endereço /__demo-logos/<time>.png — nada novo em public/, nada no banco.
//   · sorteio e ranking — os jogadores da demo ganham ROSTO: o `avatar_url` deles (hoje a silhueta genérica do
//               bucket `kits`) é trocado, na resposta, pelos avatares que já existem em public/onboarding/ (modelos
//               gerados, não são pessoas do Futty). Ver ROSTOS_DA_DEMO. O Bruninho continua com a figurinha dele.
//   · sorteio — (ajuste 2 do dono, 5-out) os 4 lugares que sobravam com a silhueta ganham FIGURINHA, no enquadramento da do Bruninho:
//               LOJA/demo-avatares/<arquivo>-avatar.png, servidos por esta captura em /__demo-avatares/ (tabela e nomes em
//               figurinhas-do-sorteio.mjs). "Índio" e "Nego Di" saem da peça: viram o Paredão e o dono.
//   · ranking — (ajuste 2) Paulinho Gaúcho em 3º e Dudu em 6º: a linha inteira troca entre os dois (pontos, nota e o resto da
//               linha), cada um com o seu nome e o seu rosto. Ver comPaulinhoEmTerceiro.
//
// Saída: LOJA/<--cruas>/<tela>.png — 8 arquivos, consumidos por scripts/loja/gerar-imagens.mjs.
import { readFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { FIGURINHAS_DO_SORTEIO } from './figurinhas-do-sorteio.mjs';

const AQUI = dirname(fileURLToPath(import.meta.url));
const LOJA = resolve(AQUI, '..', '..', '..', '..', 'LOJA');
const opcao = (nome) => (process.argv.find((a) => a.startsWith(`--${nome}=`)) || '').slice(nome.length + 3);
const CRUAS = join(LOJA, opcao('cruas') || join('outubro', 'cruas'));
const BASE = (opcao('base') || 'http://localhost:5173').replace(/\/+$/, '');
const [LARGURA_PX, ALTURA_PX] = (opcao('tamanho') || '1170x2532').split('x').map(Number);
if (!LARGURA_PX || !ALTURA_PX || LARGURA_PX % 3 || ALTURA_PX % 3) throw new Error('--tamanho=LARGURAxALTURA, em pixels e múltiplos de 3 (ex.: 1290x2796)');
const APARELHO = opcao('aparelho') || (LARGURA_PX >= 1290 ? 'iphone' : 'android');

const fatal = (msg) => { console.error(`\nERRO: ${msg}`); process.exit(2); };
// Regra da casa: bancada e capturas nunca contra produção (incidente de 25-set).
if (!['localhost', '127.0.0.1', '[::1]'].includes(new URL(BASE).hostname)) {
  fatal(`--base=${BASE} não é local. As capturas das lojas rodam contra o servidor LOCAL (LIGAR-FUTTY.bat), nunca contra produção.`);
}
const PRODUCAO = /(^|\.)run\.app$|(^|\.)futtyapp\.com\.br$|(^|\.)futty\.pages\.dev$/i;

const UA_ANDROID = 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36';
const UA_IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.7 Mobile/15E148 Safari/604.1';

const estado = JSON.parse(readFileSync(join(LOJA, 'demo-estado.json'), 'utf8'));
// A senha NUNCA é impressa nem passada em argumento: sai daqui direto para o campo do formulário.
const senha = readFileSync(join(LOJA, 'demo-senha.txt'), 'utf8').match(/senha: (.+)/)[1].trim();
const so = opcao('so').split(',').filter(Boolean);
const quer = (tela) => !so.length || so.includes(tela);

// Posição fictícia em Brasília (Asa Sul), só para o Radar mostrar distâncias.
// O app calcula a distância no aparelho; nada disto vai ao servidor.
const CONTEXTO = {
  viewport: { width: LARGURA_PX / 3, height: ALTURA_PX / 3 },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
  userAgent: APARELHO === 'iphone' ? UA_IPHONE : UA_ANDROID,
  locale: 'pt-BR',
  timezoneId: 'America/Sao_Paulo',
  colorScheme: 'dark',
  serviceWorkers: 'block',
  permissions: ['geolocation'],
  geolocation: { latitude: -15.815, longitude: -47.905 },
};

// Faixas e avisos que apareceriam por cima das telas numa conta nova.
const SEM_AVISOS = () => {
  localStorage.setItem('futty_cookies', 'aceite');
  localStorage.setItem('futty_tour_done', '1');
  localStorage.setItem('futty_figurinha_estreia', '1');
  localStorage.setItem('futty_agora_nao_nascimento', String(Date.now())); // 29T-C: o "Agora não" da data de nascimento (7 dias)
  localStorage.removeItem('futty_cta_figurinha');
  sessionStorage.setItem('futty_push_dismiss', '1');
  sessionStorage.setItem('futty_votacao_dismiss', '1');
  sessionStorage.setItem('futty_denuncia_desfecho', '1');
};

const espera = (ms) => new Promise((r) => setTimeout(r, ms));
const escritasBloqueadas = [];
const tentativasProducao = [];

/** Responde um GET com o corpo transformado, preservando os cabeçalhos do motor (inclusive os de CORS). */
async function responderComJson(route, transformar) {
  const resposta = await route.fetch();
  const corpo = await resposta.json();
  const cabecalhos = { ...resposta.headers() };
  delete cabecalhos['content-encoding']; // o corpo vai em claro; manter o gzip no cabeçalho quebraria o navegador
  delete cabecalhos['content-length'];
  cabecalhos['content-type'] = 'application/json; charset=utf-8';
  await route.fulfill({ status: resposta.status(), headers: cabecalhos, body: JSON.stringify(transformar(corpo)) });
}

async function novoContexto(navegador, extra = {}) {
  const ctx = await navegador.newContext({ ...CONTEXTO, ...extra });
  await ctx.addInitScript(SEM_AVISOS);
  // Nada de produção, nada gravado: as duas guardas valem para TODAS as telas.
  await ctx.route((url) => PRODUCAO.test(url.hostname), (route) => {
    tentativasProducao.push(route.request().url());
    return route.abort();
  });
  await ctx.route('**/api/**', (route) => {
    if (['GET', 'HEAD', 'OPTIONS'].includes(route.request().method())) return route.continue();
    escritasBloqueadas.push(`${route.request().method()} ${new URL(route.request().url()).pathname}`);
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) });
  });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
  await page.fill('#email', estado.email);
  await page.fill('#password', senha);
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await page.waitForURL('**/home', { timeout: 60000 });
  return { ctx, page };
}

// Espera o app assentar: sem loader (role=status), fontes prontas, imagens
// carregadas, sem a legenda "Bola parada", e a tela de abertura (1,6 s) já fora.
async function assentar(page, { minimo = 1800 } = {}) {
  const inicio = Date.now();
  for (let tentativa = 0; tentativa < 40; tentativa += 1) {
    await page.waitForTimeout(500);
    const pronto = await page.evaluate(async () => {
      await document.fonts.ready;
      if (document.querySelector('[role="status"]')) return false;
      if (document.body.innerText.includes('Bola parada')) return false;
      const imgs = [...document.images].filter((i) => i.src && !i.hidden);
      return imgs.every((i) => i.complete);
    });
    if (pronto && Date.now() - inicio >= minimo) return;
  }
  console.warn('  ! a tela não assentou em 20 s; capturando mesmo assim');
}

// Nada de preço, venda ou "em breve" numa peça de loja (lei do produto: a tela diz a verdade).
const PROIBIDO = /R\$|€|brilhante|pre[çc]o|comprar|pagar|em breve/i;
// 77.9, 9.10 — fora horas (20:00), datas, versões e IPs (a mesma régua de scripts/medir-estreito.mjs).
const NUMERO_COM_PONTO = /(^|[^\d.:/])\d+\.\d+(?![\d.:/]|\s*(?:km|MB|KB))/;

async function capturar(page, nome, { rolarAte = null } = {}) {
  // Tira o foco e desfaz o "zoom" do celular: tocar num campo (a hora do Novo jogo) faz o Chromium aproximar a
  // tela como um telefone de verdade, e o screenshot sairia ampliado e cortado à direita.
  await page.evaluate(() => document.activeElement?.blur?.());
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setPageScaleFactor', { pageScaleFactor: 1 }).catch(() => {});
  await cdp.detach().catch(() => {});
  if (rolarAte) {
    // Enquadra a peça: deixa este elemento encostado no topo da tela (no Radar, a busca — assim a lista de
    // peladas, que é o que a peça vende, cabe inteira embaixo dela).
    await page.locator(rolarAte).first().evaluate((el) => window.scrollBy(0, Math.round(el.getBoundingClientRect().top) - 8));
  } else {
    await page.evaluate(() => window.scrollTo(0, 0));
  }
  await page.waitForTimeout(400);
  const textoDaTela = await page.evaluate(() => document.body.innerText);
  const achado = textoDaTela.match(PROIBIDO);
  if (achado) throw new Error(`${nome}: a tela mostra "${achado[0]}" e não vai para a loja`);
  // Rodada 29Z: brasileiro escreve 77,9 e 9,1 — peça de loja com "77.9" ou "9.10" não sai (os prints de 5-out saíram assim).
  const comPonto = textoDaTela.match(NUMERO_COM_PONTO);
  if (comPonto) throw new Error(`${nome}: a tela mostra o número "${comPonto[0].trim()}" com ponto decimal; no app de verdade é vírgula (src/utils/numero.js)`);
  const decimais = [...textoDaTela.matchAll(/\d+,\d+/g)].map((m) => m[0]);
  if (decimais.length) console.log(`      números com casa decimal na peça: ${[...new Set(decimais)].join(' · ')}`);
  await page.screenshot({ path: join(CRUAS, `${nome}.png`), type: 'png', animations: 'disabled', caret: 'hide' });
  console.log('✓', `${nome}.png`);
}

// ── As respostas simuladas (nenhuma escrita no banco) ─────────────────────────────────────────────────

/** O próximo domingo às 12:00 UTC (09:00 em Brasília) — o horário dos jogos da demo. */
function proximoDomingo() {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + ((7 - d.getUTCDay()) % 7 || 7));
  d.setUTCHours(12, 0, 0, 0);
  return d.toISOString();
}

/** O último jogo da demo remarcado para o próximo domingo e sem a minha resposta: é o que acende o aviso "Você vai?". */
function comJogoPedindoResposta(corpo) {
  const jogos = corpo?.convites?.games || [];
  if (!jogos.length) throw new Error('a conta demo não tem jogo nenhum em /api/inicio (rode backend/scripts/demo-loja.js)');
  const ultimo = [...jogos].sort((a, b) => Date.parse(a.date) - Date.parse(b.date)).pop();
  const remarcado = { ...ultimo, date: proximoDomingo(), status: 'scheduled', cancelado: false, user_status: null, eu_jogo: true, ausente_proximo: false };
  return {
    ...corpo,
    convites: { ...corpo.convites, games: [...jogos.filter((g) => g.id !== ultimo.id), remarcado] },
  };
}

// Os três times públicos da demo nasceram antes da coluna `bairro` (migração 073): o bairro entra aqui, na resposta.
const BAIRROS_DA_DEMO = {
  'pelada-do-guara-demo': 'Guará',
  'racha-da-asa-norte-demo': 'Asa Norte',
  'society-lago-sul-demo': 'Lago Sul',
};

/** O Radar só com os times da demo: as seis peladas radar-teste-* (de demonstração, jogadores fictícios) saem da lista; cada time da demo ganha bairro e logo. */
function radarSoDaDemo(corpo) {
  const times = (corpo?.teams || [])
    .filter((t) => !String(t.slug || '').startsWith('radar-teste-'))
    .map((t) => (BAIRROS_DA_DEMO[t.slug] ? { ...t, bairro: BAIRROS_DA_DEMO[t.slug], logo_url: `${BASE}${ROTA_DOS_LOGOS}${t.slug.replace(/-demo$/, '')}.png` } : t));
  if (!times.length) throw new Error('o Radar ficou sem nenhum time depois de tirar as peladas de teste');
  return { ...corpo, teams: times };
}

// Os logos dos três times da demo (desenhados pela Freaky em LOJA/demo-logos). Sem arquivo, a captura para: peça de loja sem o logo
// que o dono pediu não sai em silêncio.
const PASTA_LOGOS = join(LOJA, 'demo-logos');
const logoDoTime = (slug) => join(PASTA_LOGOS, `${String(slug).replace(/-demo$/, '')}.png`);
const ROTA_DOS_LOGOS = '/__demo-logos/';

// Os rostos da demo: avatares que JÁ existem em public/onboarding/ (nada novo no repositório). O nome casa → o mesmo rosto (Dudu → dudu,
// Tiãozinho → tiagao); o Cabeção fica com o goncalo (ordem do dono, 5-out). Os rostos que sobram (caio, nando, pedrao, rafa) vão, na ordem
// do Ranking, para quem aparece logo depois no alto da lista. Os que não aparecem aqui ficam com a silhueta da casa (a mistura de foto e
// figurinha é de propósito). O Bruninho não entra: continua com a figurinha dele. Nenhum rosto serve a dois jogadores — a tabela é conferida
// abaixo, e por isso nenhum rosto repete numa mesma tela.
const PASTA_ROSTOS = join(AQUI, '..', '..', 'public', 'onboarding');
const ROSTOS_DA_DEMO = {
  Dudu: 'dudu',
  'Tiãozinho': 'tiagao',
  'Cabeção': 'goncalo',
  Fabinho: 'caio',
  'Paulinho Gaúcho': 'nando',
  Marquinhos: 'pedrao',
  Renatinho: 'rafa',
};
const rostoUnico = new Set(Object.values(ROSTOS_DA_DEMO));
if (rostoUnico.size !== Object.keys(ROSTOS_DA_DEMO).length) throw new Error('ROSTOS_DA_DEMO repete um rosto: nenhum rosto serve a dois jogadores');
if ('Bruninho' in ROSTOS_DA_DEMO) throw new Error('o Bruninho continua com a figurinha dele: não entra em ROSTOS_DA_DEMO');
const rostosUsados = new Map(); // nome → rosto, o que de fato foi trocado (para o relatório)

/** Troca o avatar dos jogadores da demo pelo rosto da tabela, em qualquer lugar da resposta onde apareça um jogador (user_id + nome). */
function comRostos(corpo) {
  const andar = (no) => {
    if (Array.isArray(no)) return no.map(andar);
    if (!no || typeof no !== 'object') return no;
    const saida = Object.fromEntries(Object.entries(no).map(([k, v]) => [k, andar(v)]));
    const nome = saida.nome_jogador || saida.nome;
    if (saida.user_id && 'avatar_url' in saida && ROSTOS_DA_DEMO[nome]) {
      rostosUsados.set(nome, ROSTOS_DA_DEMO[nome]);
      return { ...saida, avatar_url: `/onboarding/${ROSTOS_DA_DEMO[nome]}.webp` };
    }
    return saida;
  };
  return andar(corpo);
}

// Ajuste 2 do dono: as 4 figurinhas novas do Sorteio (figurinhas-do-sorteio.mjs). Sem o arquivo, a captura para — peça sem o rosto
// pedido não sai em silêncio. Servidas aqui mesmo em /__demo-avatares/ (nada novo em public/, nada no banco).
const PASTA_AVATARES = join(LOJA, 'demo-avatares');
const ROTA_DOS_AVATARES = '/__demo-avatares/';
const avatarDaPeca = (arquivo) => join(PASTA_AVATARES, `${arquivo}-avatar.png`);
const FIGURINHA_POR_NOME = Object.fromEntries(FIGURINHAS_DO_SORTEIO.map((f) => [f.noBanco, f]));

/** Os 4 lugares do Sorteio: avatar novo e, para o Índio e o Nego Di, o nome novo — em qualquer lugar da resposta onde o jogador apareça. */
function comFigurinhasDoSorteio(corpo) {
  const andar = (no) => {
    if (Array.isArray(no)) return no.map(andar);
    if (!no || typeof no !== 'object') return no;
    const saida = Object.fromEntries(Object.entries(no).map(([k, v]) => [k, andar(v)]));
    const f = FIGURINHA_POR_NOME[saida.nome_jogador || saida.nome];
    if (!saida.user_id || !('avatar_url' in saida) || !f) return saida;
    return {
      ...saida,
      ...('nome' in saida ? { nome: f.nome } : {}),
      ...('nome_jogador' in saida ? { nome_jogador: f.nome } : {}),
      avatar_url: `${BASE}${ROTA_DOS_AVATARES}${f.arquivo}-avatar.png`,
    };
  };
  return andar(corpo);
}

// Ajuste 2 do dono: Paulinho Gaúcho em 3º e Dudu em 6º. Troca a LINHA INTEIRA entre os dois — pontos, nota, vitórias, gols, destaques,
// presença, a categoria (o selo) e o meu voto —, e cada um leva só o que é dele: nome, foto e rosto. Assim a ordem continua sendo a
// dos pontos, como a própria tela diz ("A ordem é por eles").
const QUEM_E = new Set(['user_id', 'sou_eu', 'nome', 'nome_jogador', 'foto_url', 'avatar_url', 'avatar_generico', 'cor_frame']);
function comPaulinhoEmTerceiro(corpo) {
  const lista = [...(corpo?.ranking || [])];
  const p = lista.findIndex((j) => j.nome_jogador === 'Paulinho Gaúcho');
  const d = lista.findIndex((j) => j.nome_jogador === 'Dudu');
  if (p < 0 || d < 0) throw new Error('o Ranking da demo não tem o Paulinho Gaúcho e o Dudu');
  const trocar = (linha, pessoa) => Object.fromEntries(Object.keys(linha).map((c) => [c, QUEM_E.has(c) ? pessoa[c] : linha[c]]));
  [lista[d], lista[p]] = [trocar(lista[d], lista[p]), trocar(lista[p], lista[d])];
  return { ...corpo, ranking: lista };
}

// ── As 8 telas ────────────────────────────────────────────────────────────────────────────────────────
for (const r of rostoUnico) if (!existsSync(join(PASTA_ROSTOS, `${r}.webp`))) throw new Error(`falta o avatar public/onboarding/${r}.webp`);
mkdirSync(CRUAS, { recursive: true });
const navegador = await chromium.launch();
const { ctx, page } = await novoContexto(navegador, { reducedMotion: 'reduce' });

// 3 · Início com o aviso "Você vai?" no topo (resposta simulada: nada muda no banco).
if (quer('inicio')) {
  await page.route('**/api/inicio', (route) => (route.request().method() === 'GET'
    ? responderComJson(route, comJogoPedindoResposta)
    : route.fallback()));
  await page.goto(`${BASE}/home`);
  await page.locator('[data-aviso="jogo"]').waitFor({ timeout: 60000 });
  await assentar(page);
  const texto = await page.locator('[data-aviso="jogo"]').innerText();
  if (!texto.includes('Você vai?')) throw new Error(`o aviso do topo não diz "Você vai?": "${texto.replace(/\s+/g, ' ')}"`);
  if (!(await page.locator('[data-aviso-vou]').count())) throw new Error('o aviso do jogo não tem o botão "Vou"');
  await capturar(page, 'inicio');
  await page.unroute('**/api/inicio');
}

// 2 · Figurinha
if (quer('figurinha')) {
  await page.goto(`${BASE}/figurinha`);
  await page.waitForSelector('img.fig-aura[src]', { timeout: 60000 });
  await assentar(page);
  await capturar(page, 'figurinha');
}

// 5 · Ranking
if (quer('ranking')) {
  await page.route(`**/api/teams/${estado.teamSlug}/ranking`, (route) => (route.request().method() === 'GET'
    ? responderComJson(route, (corpo) => comRostos(comPaulinhoEmTerceiro(corpo)))
    : route.fallback()));
  await page.goto(`${BASE}/time/${estado.teamSlug}/ranking`);
  await page.waitForSelector('.rank-list .rank-row', { timeout: 60000 });
  await assentar(page);
  // Confete do pódio (canvas-confetti): o canvas some quando a animação acaba.
  await page.waitForFunction(() => !document.querySelector('canvas'), null, { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(500);
  // Os rostos de verdade: cada avatar de /onboarding/ carregou, e nenhum rosto aparece duas vezes na tela.
  const rostos = await page.evaluate(() => [...document.querySelectorAll('.rank-row img')].filter((i) => i.src.includes('/onboarding/')).map((i) => ({ src: i.src.split('/').pop(), ok: i.complete && i.naturalWidth > 0 })));
  if (!rostos.length) throw new Error('o Ranking não mostra nenhum rosto de /onboarding/');
  if (rostos.some((r) => !r.ok)) throw new Error(`rosto que não carregou no Ranking: ${rostos.filter((r) => !r.ok).map((r) => r.src).join(', ')}`);
  if (new Set(rostos.map((r) => r.src)).size !== rostos.length) throw new Error(`rosto repetido no Ranking: ${rostos.map((r) => r.src).join(', ')}`);
  console.log(`      Ranking: ${rostos.length} rosto(s), nenhum repetido — ${rostos.map((r) => r.src.replace('.webp', '')).join(', ')}`);
  // Ajuste 2: o 3º é o Paulinho Gaúcho e o 6º é o Dudu, com os pontos em ordem.
  const linhas = await page.locator('.rank-list .rank-row').evaluateAll((els) => els.map((el) => el.innerText.replace(/\s+/g, ' ')));
  if (!linhas[2]?.includes('Paulinho Gaúcho') || !linhas[5]?.includes('Dudu')) throw new Error(`o Ranking não ficou com o Paulinho Gaúcho em 3º e o Dudu em 6º: ${linhas.slice(0, 6).map((l, i) => `${i + 1}. ${l.slice(0, 40)}`).join(' | ')}`);
  const pontos = linhas.map((l) => Number((l.match(/(\d+,\d+)\s*pontos/) || [])[1]?.replace(',', '.'))).filter((n) => !Number.isNaN(n));
  if (pontos.some((n, i) => i && n > pontos[i - 1])) throw new Error(`os pontos do Ranking saíram fora de ordem: ${pontos.join(' · ')}`);
  console.log(`      Ranking: 3º ${linhas[2].slice(0, 36)} · 6º ${linhas[5].slice(0, 36)}`);
  await capturar(page, 'ranking');
  await page.unroute(`**/api/teams/${estado.teamSlug}/ranking`);
}

// 6 · Resenha
if (quer('resenha')) {
  await page.goto(`${BASE}/feed`);
  await page.getByText('Sorteio domingo às 8h45').first().waitFor({ timeout: 60000 });
  await assentar(page);
  await capturar(page, 'resenha');
}

// 7 · Radar de peladas (só os times da demo, com bairro, logo próprio e "Sobre o time")
if (quer('radar')) {
  // Os logos saem de LOJA/demo-logos, servidos aqui mesmo no endereço que a resposta simulada põe em `logo_url` (nada novo em public/).
  for (const slug of Object.keys(BAIRROS_DA_DEMO)) if (!existsSync(logoDoTime(slug))) throw new Error(`falta o logo ${logoDoTime(slug)} (desenhado pela Freaky)`);
  await page.route(`**${ROTA_DOS_LOGOS}*.png`, (route) => {
    const nomeDoLogo = new URL(route.request().url()).pathname.slice(ROTA_DOS_LOGOS.length).replace(/.png$/, '');
    if (!/^[a-z-]+$/.test(nomeDoLogo) || !existsSync(logoDoTime(nomeDoLogo))) return route.fulfill({ status: 404, body: '' });
    return route.fulfill({ status: 200, contentType: 'image/png', body: readFileSync(logoDoTime(nomeDoLogo)) });
  });
  await page.route('**/api/teams/explorar*', (route) => (route.request().method() === 'GET'
    ? responderComJson(route, radarSoDaDemo)
    : route.fallback()));
  await page.goto(`${BASE}/explorar`);
  await page.locator('[data-card-do-time]').first().waitFor({ timeout: 60000 });
  await page.getByText('Usar minha localização').first().click();
  await page.getByText('Localização ativa').first().waitFor({ timeout: 15000 });
  await assentar(page, { minimo: 4500 }); // o aviso "só neste celular" some
  const cartoes = await page.locator('[data-card-do-time]').evaluateAll((els) => els.map((el) => el.getAttribute('data-card-do-time')));
  const teste = cartoes.filter((s) => String(s).startsWith('radar-teste-'));
  if (teste.length) throw new Error(`o Radar ainda mostra pelada(s) de teste: ${teste.join(', ')}`);
  const comBairro = await page.locator('[data-local-do-time]').evaluateAll((els) => els.filter((el) => el.textContent.includes(' · ')).length);
  if (comBairro < cartoes.length) throw new Error(`${cartoes.length - comBairro} card(s) do Radar sem "Bairro · Cidade"`);
  if (!(await page.locator('[data-sobre-do-time]').count())) throw new Error('nenhum card do Radar mostra o "Sobre o time"');
  console.log(`      Radar: ${cartoes.length} time(s) da demo, todos com bairro — ${cartoes.join(', ')}`);
  const logos = await page.locator('[data-card-do-time] [data-escudo="logo"] img').evaluateAll((els) => els.map((el) => ({ src: el.src.split('/').pop(), ok: el.complete && el.naturalWidth > 0 })));
  if (logos.length !== cartoes.length) throw new Error(`${cartoes.length - logos.length} card(s) do Radar sem o logo próprio (iniciais no lugar)`);
  if (logos.some((l) => !l.ok)) throw new Error(`logo que não carregou no Radar: ${logos.filter((l) => !l.ok).map((l) => l.src).join(', ')}`);
  console.log(`      Radar: ${logos.length} logo(s) próprio(s) carregado(s) — ${logos.map((l) => l.src).join(', ')}`);
  await capturar(page, 'radar', { rolarAte: 'input[placeholder^="Cidade ou nome"]' });
  await page.unroute('**/api/teams/explorar*');
  await page.unroute(`**${ROTA_DOS_LOGOS}*.png`);
}

// 4 · Novo jogo com o ingresso preenchido (nada é gravado: o "Criar jogo" não é tocado)
if (quer('novo-jogo')) {
  await page.goto(`${BASE}/time/${estado.teamSlug}/jogo/novo`);
  await page.locator('[data-ingresso]').waitFor({ timeout: 60000 });
  const dia = new Date(Date.now() + 6 * 86400000).toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });
  await page.locator('#data').fill(dia);
  await page.locator('#local').fill('Society do Guará II');
  await page.locator('#hora').fill('20:00');
  await espera(500);
  await assentar(page, { minimo: 800 });
  const ingresso = await page.evaluate(() => ({
    dia: document.querySelector('[data-ingresso-dia]').innerText.trim(),
    hora: document.querySelector('[data-ingresso-hora]').innerText.trim(),
    local: document.querySelector('[data-ingresso-local]').innerText.trim(),
  }));
  if (ingresso.hora !== '20:00' || ingresso.local !== 'Society do Guará II' || !/\d/.test(ingresso.dia)) {
    throw new Error(`o ingresso não acompanhou o que foi digitado: ${JSON.stringify(ingresso)}`);
  }
  console.log(`      ingresso: ${ingresso.dia} · ${ingresso.hora} · ${ingresso.local}`);
  await capturar(page, 'novo-jogo');
}

// 8 · Criar time: a festa "Seu time está no ar!" (o POST do time e o do convite são respondidos AQUI)
if (quer('criar-time')) {
  await page.route('**/api/teams', (route) => (route.request().method() === 'POST'
    ? route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({
        team: { id: 'loja', slug: 'domingueira-fc', nome: 'Domingueira FC', bairro: 'Guará', cidade: 'Brasília' },
        geo: { encontrada: true, nomeOficial: 'Brasília, DF' },
        bairro: { encontrado: true, nomeOficial: 'Guará' },
        joga: true,
      }),
    })
    : route.fallback()));
  await page.route('**/api/teams/*/convite', (route) => (route.request().method() === 'POST'
    ? route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ token: 'loja', codigo: 'FUTTY' }) })
    : route.fallback()));

  await page.goto(`${BASE}/criar-time`);
  const nome = page.getByPlaceholder('Ex.: Domingueira FC');
  await nome.waitFor({ timeout: 60000 });
  await nome.fill('Domingueira FC');
  const cidade = page.getByPlaceholder('Ex.: Brasília');
  await cidade.click();
  await cidade.fill('Brasíl');
  await page.locator('[data-sugestoes-cidade]').getByText('Brasília, DF').first().click({ timeout: 15000 });
  await espera(600);
  await page.getByRole('button', { name: 'Continuar' }).click();
  await page.getByText('Você também joga?').first().waitFor({ timeout: 15000 });
  await page.getByRole('button', { name: 'Continuar' }).click();
  await page.getByText('Aceita novos membros?').first().waitFor({ timeout: 15000 });
  await page.getByRole('button', { name: /^Aberto/ }).click();
  await page.locator('#sobre-o-time').waitFor({ timeout: 10000 });
  await page.locator('#sobre-o-time').fill('Domingo de manhã no Guará. Tem colete, traz só a chuteira.');
  await page.getByRole('button', { name: 'Criar o time' }).click();
  await page.getByText('Seu time está no ar!').first().waitFor({ timeout: 20000 });
  await page.locator('input[readonly]').waitFor({ timeout: 15000 }).catch(() => { throw new Error('a festa abriu sem o link do convite pronto'); });
  await assentar(page, { minimo: 1500 });
  await capturar(page, 'criar-time');
}
await ctx.close();

// 1 · Sorteio: a máquina acesa com os times travados nas molduras.
// O jogo é o último SORTEADO do time (o `proximoJogoId` do demo-estado.json é o jogo novo, que ainda não tem sorteio).
// Roda com movimento (a cerimônia só existe assim) e usa o "» concluir já" da própria tela para chegar ao fim.
if (quer('sorteio')) {
  const { ctx: c2, page: p2 } = await novoContexto(navegador, { reducedMotion: 'no-preference' });
  let jogos = [];
  p2.on('response', async (r) => {
    try {
      if (r.request().method() === 'GET' && new URL(r.url()).pathname === `/api/teams/${estado.teamSlug}/games`) jogos = (await r.json())?.games || [];
    } catch { /* resposta sem corpo */ }
  });
  await p2.goto(`${BASE}/time/${estado.teamSlug}/jogos`);
  await p2.waitForFunction(() => true);
  for (let i = 0; i < 40 && !jogos.length; i += 1) await espera(500);
  const sorteado = jogos.find((g) => g.sorteio_realizado);
  if (!sorteado) throw new Error('o time da demo não tem nenhum jogo sorteado (rode backend/scripts/demo-loja.js --sortear)');

  // Os rostos da demo entram na resposta do jogo (o sorteio guardado), como no Ranking, e as 4 figurinhas do ajuste 2 nos lugares que
  // sobravam com a silhueta. Só o GET do jogo; o resto passa direto.
  for (const f of FIGURINHAS_DO_SORTEIO) if (!existsSync(avatarDaPeca(f.arquivo))) throw new Error(`falta ${avatarDaPeca(f.arquivo)} (rode backend/scripts/_bench/gerar-modelos-ficticios.js --loja)`);
  await p2.route(`**${ROTA_DOS_AVATARES}*.png`, (route) => {
    const arquivo = new URL(route.request().url()).pathname.slice(ROTA_DOS_AVATARES.length).replace(/-avatar\.png$/, '');
    if (!FIGURINHAS_DO_SORTEIO.some((f) => f.arquivo === arquivo)) return route.fulfill({ status: 404, body: '' });
    return route.fulfill({ status: 200, contentType: 'image/png', body: readFileSync(avatarDaPeca(arquivo)) });
  });
  await p2.route('**/api/games/*', (route) => (route.request().method() === 'GET' && new URL(route.request().url()).pathname === `/api/games/${sorteado.id}`
    ? responderComJson(route, (corpo) => comFigurinhasDoSorteio(comRostos(corpo)))
    : route.fallback()));
  await p2.goto(`${BASE}/time/${estado.teamSlug}/jogo/${sorteado.id}/sorteio`);
  await p2.waitForSelector('.smaq .saltar.on', { timeout: 60000 });
  const saltar = p2.locator('.smaq .saltar button');
  if (await saltar.count()) await saltar.click({ force: true }).catch(() => {});
  await p2.waitForFunction(() => { const s = document.querySelector('.smaq .saltar'); return !!s && !s.classList.contains('on'); }, null, { timeout: 30000 });
  await p2.getByText('Compartilhar os times', { exact: false }).first().waitFor({ timeout: 15000 });
  await assentar(p2, { minimo: 1500 });
  // Ajuste 2: nenhuma silhueta sobra, as 4 figurinhas carregaram, nenhum rosto repete, e "Índio"/"Nego Di" não aparecem mais.
  const molduras = await p2.locator('.smaq .grupo .mmold').evaluateAll((els) => els.map((el) => {
    const img = el.querySelector('img');
    const nm = el.querySelector('.nm');
    return {
      src: img?.src || '', ok: !!img && img.complete && img.naturalWidth > 0, nome: nm?.textContent || '',
      linhas: nm ? Math.round((nm.getBoundingClientRect().height - 11) / 9) : 0, cabe: nm ? nm.scrollWidth <= nm.clientWidth : true,
    };
  }));
  if (!molduras.length) throw new Error('o Sorteio terminou sem nenhuma moldura de jogador');
  const semRosto = molduras.filter((m) => m.src.startsWith('data:') || m.src.includes('avatar-generico'));
  if (semRosto.length) throw new Error(`lugar do Sorteio ainda com a silhueta: ${semRosto.map((m) => m.nome).join(', ')}`);
  if (molduras.some((m) => !m.ok)) throw new Error(`avatar que não carregou no Sorteio: ${molduras.filter((m) => !m.ok).map((m) => m.nome).join(', ')}`);
  if (new Set(molduras.map((m) => m.src)).size !== molduras.length) throw new Error('rosto repetido no Sorteio');
  for (const f of FIGURINHAS_DO_SORTEIO) {
    const m = molduras.find((x) => x.src.endsWith(`${ROTA_DOS_AVATARES}${f.arquivo}-avatar.png`));
    if (!m || m.nome !== f.nome) throw new Error(`a figurinha ${f.arquivo} não está no lugar do ${f.noBanco} com o nome "${f.nome}"`);
  }
  if (molduras.some((m) => !m.cabe)) throw new Error(`nome cortado no Sorteio: ${molduras.filter((m) => !m.cabe).map((m) => m.nome).join(', ')}`);
  const sorteioTexto = await p2.evaluate(() => document.body.innerText);
  if (/Índio|Nego Di/.test(sorteioTexto)) throw new Error('o Sorteio ainda mostra "Índio" ou "Nego Di"');
  console.log(`      Sorteio: ${molduras.length} moldura(s), todas com rosto, nenhum repetido — ${FIGURINHAS_DO_SORTEIO.map((f) => f.nome).join(', ')} com a figurinha nova`);
  const emDuas = molduras.filter((m) => m.linhas > 1);
  if (emDuas.length) console.log(`      Sorteio: nome em ${emDuas.map((m) => `${m.linhas} linhas (${m.nome})`).join(', ')}`);
  await capturar(p2, 'sorteio');
  await c2.close();
}

await navegador.close();

if (escritasBloqueadas.length) console.log(`\n· ${escritasBloqueadas.length} escrita(s) respondida(s) sem chegar ao banco: ${[...new Set(escritasBloqueadas)].join(', ')}`);
if (tentativasProducao.length) {
  console.error(`\nREPROVADO: ${tentativasProducao.length} pedido(s) a produção foram abortados:\n${[...new Set(tentativasProducao)].slice(0, 10).join('\n')}`);
  process.exit(1);
}
console.log(`\nCapturas em ${CRUAS}`);
