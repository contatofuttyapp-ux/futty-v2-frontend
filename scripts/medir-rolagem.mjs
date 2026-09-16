// Futty v2.0 — Rolagem da Resenha e 1ª visita ao Ranking, no WebKit (FLUIDEZ 2).
//
// O relatório do build 20 (iPhone 15 Pro Max) diz:
//   · rolagem: 61 travadas, as piores de 1338, 1096 e 1066 ms, na Resenha;
//   · Ranking na 1ª visita: 40 travadas, pior 1785 ms (nas visitas seguintes
//     84-125 ms — ou seja, é o PRIMEIRO desenho que custa, não os dados).
//
// "Travada" aqui é o que a pessoa sente: um quadro que demorou mais do que devia.
// Mede-se com o mesmo relógio de quadros que o app usa no aparelho
// (lib/diagnostico.js), e não com marcas de fase — no WebKit o desenho é adiado
// e uma fase pode marcar 1 ms com a conta a cair na seguinte.
//
// Corre no WEBKIT de propósito: é o motor do iPhone e do WebView da loja.
// Precisa do backend local (`LIGAR-FUTTY.bat`) e de um build servido:
//   npm run build && npx vite preview --port 4179
//   node scripts/medir-rolagem.mjs --etiqueta antes --json antes.json
import { readFileSync, writeFileSync } from 'node:fs';
import { webkit } from 'playwright';

const args = process.argv.slice(2);
const opcao = (nome, omissao) => {
  const i = args.indexOf(`--${nome}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : omissao;
};

const BASE = opcao('url', 'http://localhost:4179');
const EMAIL = opcao('email', 'demo-loja@futtymock.com');
const FICHEIRO_SENHA = opcao('senha', 'C:/Users/phfer/Desktop/FUT/LOJA/demo-senha.txt');
const SAIDA_JSON = opcao('json', null);
const ETIQUETA = opcao('etiqueta', 'medição');

function lerSenha() {
  const bruto = readFileSync(FICHEIRO_SENHA, 'utf8');
  const linha = bruto.split(/\r?\n/).map((l) => l.trim()).filter(Boolean).pop() || '';
  return linha.includes(':') ? linha.split(':').pop().trim() : linha;
}

// ─── Relógio de quadros, dentro da página ────────────────────────────────────
const LIGAR_RELOGIO = () => {
  window.__quadros = { maior: 0, acima50: 0, acima100: 0, lista: [] };
  let anterior = performance.now();
  const laco = (agora) => {
    const gap = agora - anterior;
    anterior = agora;
    const q = window.__quadros;
    if (q.ligado === false) return;
    if (gap > 50) {
      q.acima50 += 1;
      if (gap > 100) q.acima100 += 1;
      if (gap > q.maior) q.maior = gap;
      q.lista.push(Math.round(gap));
    }
    requestAnimationFrame(laco);
  };
  requestAnimationFrame(laco);
};

const ZERAR = () => {
  window.__quadros.maior = 0;
  window.__quadros.acima50 = 0;
  window.__quadros.acima100 = 0;
  window.__quadros.lista = [];
};

const COLHER = () => {
  const q = window.__quadros;
  return {
    maior: Math.round(q.maior),
    acima50: q.acima50,
    acima100: q.acima100,
    piores: [...q.lista].sort((a, b) => b - a).slice(0, 5),
  };
};

// Rolagem PROGRAMÁTICA, medindo o CUSTO DE LAYOUT de cada passo.
//
// Contar quadros aqui não serve: no WebKit sem ecrã o requestAnimationFrame
// corre a ~3 por segundo, e então TUDO parece uma travada de 330 ms — inclusive
// uma página vazia. Já o custo de layout mede-se sem depender do relógio de
// quadros: rola-se, força-se o recálculo (`offsetHeight` é um ponto de
// sincronização) e cronometra-se. É exactamente o trabalho que o
// `content-visibility` e o `contain` cortam, por isso é o número certo para
// decidir se valem a pena.
const ROLAR = async ({ passo }) => {
  const alvo = document.scrollingElement || document.documentElement;
  const alturaTotal = Math.round(alvo.scrollHeight);
  const visivel = window.innerHeight;
  const custos = [];
  const medirUmPasso = () => {
    const t0 = performance.now();
    // Ler uma medida geométrica obriga o motor a acertar estilo e layout antes
    // de responder — é o que põe a conta em cima deste cronómetro.
    void alvo.offsetHeight;
    void document.body.getBoundingClientRect().height;
    custos.push(performance.now() - t0);
  };
  // Só até ao fim da página: rolar para além disso não mede nada.
  for (let y = 0; y + visivel < alturaTotal; y += passo) {
    alvo.scrollTop = y;
    medirUmPasso();
    await new Promise((r) => setTimeout(r, 0));
  }
  for (let y = alturaTotal - visivel; y > 0; y -= passo) {
    alvo.scrollTop = y;
    medirUmPasso();
    await new Promise((r) => setTimeout(r, 0));
  }
  custos.sort((a, b) => a - b);
  const soma = custos.reduce((a, b) => a + b, 0);
  return {
    altura: alturaTotal,
    passos: custos.length,
    layoutTotalMs: Math.round(soma),
    layoutMedioMs: Math.round((soma / (custos.length || 1)) * 100) / 100,
    layoutPiorMs: Math.round((custos[custos.length - 1] || 0) * 100) / 100,
    // Quantos elementos a página tem — o que o content-visibility deve reduzir
    // não é a contagem, é quantos deles entram no cálculo.
    elementos: document.querySelectorAll('.app-main *').length,
  };
};

// A conta da demo tem poucos posts (1632 px de feed), e com tão pouco não há
// rolagem que meça nada: o custo de layout dá 0,67 ms e qualquer conserto
// pareceria inútil. O aparelho do Pedro tem um feed de verdade — foi lá que
// saíram as 61 travadas, a pior de 1338 ms.
//
// Então clona-se o que existe até haver cartões que cheguem. É a MESMA árvore de
// DOM repetida, com os mesmos estilos e as mesmas imagens: o que se mede é o
// custo de layout de N cartões, que é exactamente a pergunta. Fica dito que é
// sintético — não se apresenta isto como "o feed do Pedro".
const CLONAR = ({ alvo }) => {
  const lista = [...document.querySelectorAll('[id^="feed-item-"]')];
  if (!lista.length) return 0;
  const pai = lista[0].parentElement;
  let n = lista.length;
  let i = 0;
  while (n < alvo) {
    const copia = lista[i % lista.length].cloneNode(true);
    copia.id = `feed-item-clone-${n}`;
    pai.appendChild(copia);
    n += 1;
    i += 1;
  }
  return n;
};

const espera = (ms) => new Promise((r) => setTimeout(r, ms));

// O custo de PINTURA, que o medidor de layout não vê.
//
// `content-visibility` e `contain: paint` poupam sobretudo desenho, não layout —
// e o ROLAR() acima força um layout síncrono a cada passo, o que mede o custo da
// contenção sem medir o proveito dela. Uma captura de ecrã obriga o motor a
// rasterizar de verdade o que está na tela; cronometrar N capturas ao longo da
// rolagem é o mais perto de "quanto custa desenhar isto" que há sem um aparelho.
async function medirPintura(pagina, passos = 8) {
  const altura = await pagina.evaluate(() => (document.scrollingElement || document.documentElement).scrollHeight);
  const visivel = await pagina.evaluate(() => window.innerHeight);
  const salto = Math.max(1, Math.floor((altura - visivel) / passos));
  const tempos = [];
  for (let i = 0; i < passos; i += 1) {
    await pagina.evaluate((y) => { (document.scrollingElement || document.documentElement).scrollTop = y; }, i * salto);
    await espera(120); // deixa o content-visibility revelar o que entrou na tela
    const t0 = Date.now();
    await pagina.screenshot({ type: 'jpeg', quality: 40 });
    tempos.push(Date.now() - t0);
  }
  tempos.sort((a, b) => a - b);
  return {
    pinturaMediaMs: Math.round(tempos.reduce((a, b) => a + b, 0) / tempos.length),
    pinturaPiorMs: tempos[tempos.length - 1],
  };
}

// As três variantes da contenção dos cartões, medidas ALTERNADAMENTE na mesma
// sessão. Medir com builds separados não dá: com o servidor de desenvolvimento,
// o preview e o backend a correr nesta máquina, o mesmo código deu 244, 1530 e
// 404 ms em três voltas. Alternando as regras dentro da mesma página, as
// medidas apanham a mesma carga, e é a DIFERENÇA que interessa.
//
// Mede-se LAYOUT (reprodutível) e PINTURA (a que a contenção devia ajudar mais,
// mas que aqui vem com ruído de centenas de ms — fica registada como indício,
// não como prova).
const VARIANTES = {
  nada: '.feed-item{contain:none;content-visibility:visible}',
  contain: '.feed-item{contain:layout paint;content-visibility:visible}',
  'contain+cv': '.feed-item{contain:layout paint;content-visibility:auto;contain-intrinsic-size:auto 420px}',
};

async function compararContencao(pagina, voltas = 3) {
  const aplicar = (css) => pagina.evaluate((texto) => {
    let regra = document.getElementById('ab-contencao');
    if (!regra) {
      regra = document.createElement('style');
      regra.id = 'ab-contencao';
      document.head.appendChild(regra);
    }
    // Desligar tem de ser explícito: a folha do app já traz a regra ligada.
    regra.textContent = texto;
  }, css);

  const colhido = Object.fromEntries(Object.keys(VARIANTES).map((k) => [k, { layout: [], pintura: [] }]));
  for (let i = 0; i < voltas; i += 1) {
    for (const [nome, css] of Object.entries(VARIANTES)) {
      await aplicar(css);
      await espera(400);
      colhido[nome].layout.push((await pagina.evaluate(ROLAR, { passo: 120 })).layoutTotalMs);
      colhido[nome].pintura.push((await medirPintura(pagina, 5)).pinturaMediaMs);
    }
  }
  const mediana = (a) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)];
  return Object.fromEntries(Object.entries(colhido).map(([k, v]) => [k, {
    layoutMs: mediana(v.layout),
    pinturaMs: mediana(v.pintura),
    layoutVoltas: v.layout,
    pinturaVoltas: v.pintura,
  }]));
}

async function medir() {
  const navegador = await webkit.launch({ headless: true });
  const contexto = await navegador.newContext({
    viewport: { width: 430, height: 932 },
    deviceScaleFactor: 3,
    // Memória da casa: com o service worker vivo o Playwright não intercepta e
    // escrita vaza para produção. Aqui não se escreve nada de propósito, mas o
    // bloqueio fica na mesma.
    serviceWorkers: 'block',
  });
  const pagina = await contexto.newPage();

  await pagina.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
  await pagina.fill('input[type="email"]', EMAIL);
  await pagina.fill('input[type="password"]', lerSenha());
  await pagina.click('button[type="submit"]');
  await pagina.waitForURL('**/home', { timeout: 30000 });
  await espera(5000); // deixa o arranque e o cromo assentarem

  await pagina.addInitScript(LIGAR_RELOGIO);
  await pagina.evaluate(LIGAR_RELOGIO);

  const aba = (k) => `.bottom-nav__tab--${k}`;

  // ─── RANKING ───
  // O caro é o PRIMEIRO desenho: 23 linhas com moldura, pódio e botões. Nas
  // visitas seguintes o chunk já está compilado e o cache cheio — o relatório do
  // aparelho diz 1785 ms na 1ª e 84-125 ms nas outras.
  //
  // Mede-se até a 1ª LINHA existir (é quando a pessoa vê o ranking) e até a
  // lista estar COMPLETA (a lista progressiva entrega 10 e depois lotes de 5).
  // Uma espera fixa mediria sobretudo a espera.
  const visitarRanking = async () => {
    await pagina.evaluate(ZERAR);
    const t0 = Date.now();
    await pagina.click(aba('ranking'));
    await pagina.waitForSelector('.rank-row', { timeout: 30000 });
    const primeiraLinhaMs = Date.now() - t0;
    const linhas = await pagina.evaluate(async () => {
      // Espera a lista parar de crescer: duas leituras iguais seguidas.
      let anterior = -1;
      for (let i = 0; i < 100; i += 1) {
        const n = document.querySelectorAll('.rank-row').length;
        if (n === anterior && n > 0) return n;
        anterior = n;
        await new Promise((r) => setTimeout(r, 80));
      }
      return document.querySelectorAll('.rank-row').length;
    });
    return { ms: primeiraLinhaMs, completaMs: Date.now() - t0, linhas, ...(await pagina.evaluate(COLHER)) };
  };

  const rankingFrio = await visitarRanking();

  await pagina.click(aba('home'));
  await pagina.waitForSelector('.app-main', { timeout: 20000 });
  await espera(1200);
  const rankingQuente = await visitarRanking();

  // ─── RESENHA: entrada + rolagem ───
  await pagina.click(aba('home'));
  await pagina.waitForSelector('.app-main', { timeout: 20000 });
  await espera(1200);
  await pagina.evaluate(ZERAR);
  const tFeed = Date.now();
  await pagina.click(aba('feed'));
  await pagina.waitForSelector('.app-main', { timeout: 30000 });
  await espera(3500);
  const feedEntrada = { ms: Date.now() - tFeed, ...(await pagina.evaluate(COLHER)) };

  const feedRolagem = await pagina.evaluate(ROLAR, { passo: 120 });

  // Feed sintético: 30 cartões, para haver rolagem que meça alguma coisa.
  const cartoes = await pagina.evaluate(CLONAR, { alvo: 30 });
  await espera(1500);
  const feedLongo = {
    cartoes,
    ...(await pagina.evaluate(ROLAR, { passo: 120 })),
    ...(await medirPintura(pagina)),
  };

  // A contenção vale a pena? A/B na MESMA sessão.
  //
  // Medir com dois builds, um de cada vez, não dá: esta máquina tem o servidor
  // de desenvolvimento, o preview, o backend e mais coisas a correr, e o mesmo
  // código mediu 244, 1530 e 404 ms em três voltas. Alternando a regra de CSS
  // dentro da mesma página, as duas medidas apanham a mesma carga — e é a
  // DIFERENÇA entre elas que interessa, não o valor absoluto.
  const contencao = await compararContencao(pagina);

  // E o mesmo no Ranking, que também é uma lista comprida.
  await pagina.click(aba('ranking'));
  await pagina.waitForSelector('.app-main', { timeout: 20000 });
  await espera(2000);
  const rankingRolagem = await pagina.evaluate(ROLAR, { passo: 120 });

  await navegador.close();
  return { rankingFrio, rankingQuente, feedEntrada, feedRolagem, feedLongo, rankingRolagem, contencao };
}

const linhaPintura = (nome, r) =>
  `${nome.padEnd(22)} ${String(r.ms).padStart(6)} ${String(r.completaMs ?? "—").padStart(9)} ${String(r.linhas ?? "—").padStart(7)}  ${String(r.maior).padStart(6)}  ` +
  `${String(r.acima100).padStart(6)}  ${String(r.acima50).padStart(6)}`;

const linhaRolagem = (nome, r) =>
  `${nome.padEnd(22)} ${String(r.altura).padStart(6)}  ${String(r.passos).padStart(6)}  ` +
  `${String(r.elementos).padStart(9)}  ${String(r.layoutTotalMs).padStart(8)}  ` +
  `${String(r.layoutMedioMs).padStart(7)}  ${String(r.layoutPiorMs).padStart(7)}`;

medir()
  .then((r) => {
    console.log(`\n=== ROLAGEM E 1ª VISITA no WEBKIT (${ETIQUETA}) ===`);
    console.log('(iPhone 15 Pro Max: 430×932 @ 3x, backend local)\n');
    console.log('ENTRADA NA TELA (o relógio de quadros em headless é grosseiro — ver ms)');
    console.log('                          ms  completa  linhas   maior   >100ms   >50ms');
    console.log(linhaPintura('Ranking 1ª visita', r.rankingFrio));
    console.log(linhaPintura('Ranking 2ª visita', r.rankingQuente));
    console.log(linhaPintura('Resenha entrada', r.feedEntrada));
    console.log('\nCUSTO DE LAYOUT AO ROLAR (o número que decide content-visibility/contain)');
    console.log('                      altura  passos  elementos  total ms  médio ms  pior ms');
    console.log(linhaRolagem('Resenha (demo)', r.feedRolagem));
    console.log(linhaRolagem(`Resenha (${r.feedLongo.cartoes} cartões)`, r.feedLongo));
    console.log(linhaRolagem('Ranking', r.rankingRolagem));
    console.log(`\nPINTURA no feed de ${r.feedLongo.cartoes} cartões (captura de ecrã = raster de verdade):`);
    console.log(`  média ${r.feedLongo.pinturaMediaMs} ms · pior ${r.feedLongo.pinturaPiorMs} ms`);
    console.log('\nCONTENÇÃO DOS CARTÕES — as 3 variantes, alternadas na mesma sessão:');
    console.log('variante      layout ms   pintura ms   (voltas de layout)');
    for (const [nome, v] of Object.entries(r.contencao)) {
      console.log(
        `${nome.padEnd(13)} ${String(v.layoutMs).padStart(9)} ${String(v.pinturaMs).padStart(12)}   ${v.layoutVoltas.join(', ')}`
      );
    }
    console.log('\n(o feed longo é SINTÉTICO: os cartões da demo clonados, para haver');
    console.log(' rolagem que meça. A conta da demo tem poucos posts.)\n');
    if (SAIDA_JSON) {
      writeFileSync(SAIDA_JSON, JSON.stringify({ etiqueta: ETIQUETA, ...r }, null, 2));
      console.log(`(gravado em ${SAIDA_JSON})\n`);
    }
  })
  .catch((e) => {
    console.error('Falhou:', e.message);
    process.exit(1);
  });
