// Futty v2.0 — Mede a abertura do app num Chrome de verdade (VELOCIDADE 4;
// contagem de imagens e bytes por aba na VELOCIDADE 6B, 15-set).
//
// A pergunta que este script responde com número: entre chegar ao Início e ver
// a tela, quanto tempo passa — e quanto passaria com a regra ANTIGA, que só
// revelava a tela depois da figurinha estar desenhada.
//
// As duas medidas saem da MESMA corrida, o que as torna comparáveis sem margem
// para discussão:
//   conteudoMs — quando o nome/estatísticas aparecem (a regra de hoje)
//   cromoMs    — quando a figurinha aparece (era exactamente o que a regra
//                antiga esperava: `pageReady = cromoTentado`)
//
// VELOCIDADE 6B acrescenta, POR ABA e em volta FRIA e QUENTE: quantos pedidos
// /api, quantos /api/media (avatares), quantos bytes vieram DA REDE, e quanto
// tempo até a ÚLTIMA imagem aparecer. Os números saem do PerformanceObserver da
// própria página (`performance.getEntriesByType('resource')`) e não dos eventos
// do Playwright, de propósito: uma imagem servida do cache do browser continua a
// aparecer nas entradas de performance, com `transferSize` 0. É assim que se vê
// a diferença entre "não pediu" e "pediu e veio do cache".
//
// Uso (com o backend a correr em :3001 e `npm run build` feito):
//   npx vite preview --port 4173
//   node scripts/medir-inicio.mjs
//   node scripts/medir-inicio.mjs --url http://localhost:4173 --json antes.json
import { readFileSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright';

const args = process.argv.slice(2);
const opcao = (nome, omissao) => {
  const i = args.indexOf(`--${nome}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : omissao;
};

const BASE = opcao('url', 'http://localhost:4173');
const EMAIL = opcao('email', 'demo-loja@futtymock.com');
const FICHEIRO_SENHA = opcao('senha', 'C:/Users/phfer/Desktop/FUT/LOJA/demo-senha.txt');
const SAIDA_JSON = opcao('json', null);
const ETIQUETA = opcao('etiqueta', 'medição');

function lerSenha() {
  const bruto = readFileSync(FICHEIRO_SENHA, 'utf8');
  // O ficheiro pode ter uma linha "senha: xxx" ou só a senha.
  const linha = bruto.split(/\r?\n/).map((l) => l.trim()).filter(Boolean).pop() || '';
  return linha.includes(':') ? linha.split(':').pop().trim() : linha;
}

const espera = (ms) => new Promise((r) => setTimeout(r, ms));

// ─── Contagem por aba, lida de dentro da página ──────────────────────────────
// Marca o instante zero e devolve tudo o que a rede fez desde então.
const MARCAR = () => performance.now();
const COLHER = (t0) => {
  const rec = performance.getEntriesByType('resource').filter((e) => e.startTime >= t0);
  const api = rec.filter((e) => e.name.includes('/api/') && !e.name.includes('/api/media/'));
  const img = rec.filter((e) => e.name.includes('/api/media/'));
  const bytes = (lista) => lista.reduce((s, e) => s + (e.transferSize || 0), 0);
  const doCache = img.filter((e) => e.transferSize === 0).length;
  const ultimaImagem = img.length ? Math.round(Math.max(...img.map((e) => e.responseEnd)) - t0) : 0;
  return {
    api: api.length,
    imagens: img.length,
    imagensDoCache: doCache,
    bytes: Math.round(bytes(rec)),
    bytesImagens: Math.round(bytes(img)),
    ultimaImagemMs: ultimaImagem,
  };
};

async function medir() {
  const navegador = await chromium.launch({ channel: 'chrome', headless: true });
  const contexto = await navegador.newContext({ viewport: { width: 420, height: 900 } });
  const pagina = await contexto.newPage();

  // Contador de pedidos, reiniciado a cada tela.
  let pedidos = [];
  pagina.on('request', (r) => pedidos.push({ metodo: r.method(), url: r.url() }));
  const zerar = () => { pedidos = []; };
  const contar = () => ({
    total: pedidos.length,
    preflight: pedidos.filter((p) => p.metodo === 'OPTIONS').length,
    api: pedidos.filter((p) => p.url.includes('/api/') && p.metodo !== 'OPTIONS').length,
  });

  // ─── Entrar ───
  await pagina.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
  await pagina.fill('input[type="email"]', EMAIL);
  await pagina.fill('input[type="password"]', lerSenha());
  await pagina.click('button[type="submit"]');
  await pagina.waitForURL('**/home', { timeout: 30000 });
  // Deixa a primeira carga assentar (cache local a ser escrito, cromo a desenhar).
  await espera(4000);

  // A barra de baixo é o caminho real (e o href do Ranking muda conforme a
  // pessoa tem time ou não — por classe é sempre o mesmo botão).
  const aba = (k) => `.bottom-nav__tab--${k}`;

  // Desktop com backend local não se parece nada com um telemóvel em Lisboa.
  // Estrangula o CPU e põe 250 ms de latência para o número significar algo:
  // é a distância a São Paulo e um aparelho de gama média.
  const cdp = await contexto.newCDPSession(pagina);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await cdp.send('Network.emulateNetworkConditions', {
    offline: false,
    latency: 250,
    downloadThroughput: (4 * 1024 * 1024) / 8,
    uploadThroughput: (1024 * 1024) / 8,
  });

  // ─── FRIO: o app a abrir do zero, sem cromo guardado — como acontecia SEMPRE
  // antes da Velocidade 4 (a regra antiga não tinha cache nenhum, redesenhava o
  // canvas a cada abertura). Tem de ser um RELOAD: apagar o IndexedDB não chega,
  // porque o cache em memória do módulo sobrevive à navegação dentro da SPA.
  await pagina.evaluate(() => new Promise((r) => {
    const p = indexedDB.deleteDatabase('futty');
    p.onsuccess = r; p.onerror = r; p.onblocked = r;
  }));
  zerar();
  const tFrio = Date.now();
  await pagina.reload({ waitUntil: 'commit' });
  await pagina.waitForSelector('.inicio-stats', { state: 'visible', timeout: 60000 });
  const frioConteudo = Date.now() - tFrio;
  await pagina.waitForSelector('.cromo-inicio img[alt^="Figurinha"]', { timeout: 90000 });
  const frioCromo = Date.now() - tFrio;
  const frio = { conteudoMs: frioConteudo, cromoMs: frioCromo, pedidos: contar() };
  await espera(1000);

  const resultados = [];

  // ─── QUENTE: com cromo guardado (a partir da 2ª abertura) ───
  for (let volta = 1; volta <= 3; volta += 1) {
    await pagina.click(aba('perfil'));
    await pagina.waitForSelector('.app-main', { timeout: 15000 });
    await espera(800);

    zerar();
    const t0 = Date.now();
    await pagina.click(aba('home'));

    // A tela de hoje: nome e estatísticas na frente.
    await pagina.waitForSelector('.inicio-stats', { state: 'visible', timeout: 30000 });
    const conteudoMs = Date.now() - t0;

    // O que a regra ANTIGA esperava: a figurinha desenhada.
    await pagina.waitForSelector('.cromo-inicio img[alt^="Figurinha"]', { timeout: 60000 });
    const cromoMs = Date.now() - t0;

    await espera(500);
    resultados.push({ volta, conteudoMs, cromoMs, pedidos: contar() });
  }

  // ─── VELOCIDADE 6B: pedidos, imagens e bytes POR ABA ───
  // Duas passagens pelas mesmas 5 abas. A 1ª é FRIA (nunca lá esteve nesta
  // sessão); a 2ª é QUENTE (cache local + cache HTTP já cheios). O que tem de
  // cair para perto de zero na volta quente é a contagem e os bytes.
  const ABAS = [['Início', 'home'], ['Resenha', 'feed'], ['Ranking', 'ranking'], ['Figurinha', 'figurinha'], ['Perfil', 'perfil']];
  const porTela = { fria: [], quente: [] };

  for (const passagem of ['fria', 'quente']) {
    for (const [nome, chave] of ABAS) {
      // Sai para outra aba primeiro, para o clique ser mesmo uma troca de tela.
      const outra = chave === 'perfil' ? 'home' : 'perfil';
      await pagina.click(aba(outra));
      await pagina.waitForSelector('.app-main', { timeout: 20000 });
      await espera(600);

      zerar();
      const t0Pagina = await pagina.evaluate(MARCAR);
      const t0 = Date.now();
      await pagina.click(aba(chave));
      await pagina.waitForSelector('.app-main', { timeout: 20000 });
      await espera(2500); // dá tempo às imagens de chegarem
      const rede = await pagina.evaluate(COLHER, t0Pagina);
      porTela[passagem].push({ tela: nome, ms: Date.now() - t0, pedidos: contar(), ...rede });
    }
  }

  await navegador.close();
  return { frio, resultados, porTela };
}

const kb = (b) => `${(b / 1024).toFixed(1)} KB`;

medir()
  .then(({ frio, resultados, porTela }) => {
    console.log(`\n=== INÍCIO: tela na frente vs figurinha desenhada (${ETIQUETA}) ===`);
    console.log('(CPU 4x mais lento + 250ms de latência = celular em Lisboa)');
    console.log('(cromoMs é o que a regra ANTIGA esperava antes de revelar a tela)\n');
    console.log(
      `FRIO — app a abrir do zero (era ASSIM sempre, antes): conteudo ${frio.conteudoMs}ms | cromo ${frio.cromoMs}ms | ` +
      `pedidos ${frio.pedidos.total} (api ${frio.pedidos.api}, preflight ${frio.pedidos.preflight})`
    );
    console.log('');
    for (const r of resultados) {
      console.log(
        `volta ${r.volta}: conteudo ${String(r.conteudoMs).padStart(5)}ms | cromo ${String(r.cromoMs).padStart(5)}ms | ` +
        `pedidos ${r.pedidos.total} (api ${r.pedidos.api}, preflight ${r.pedidos.preflight})`
      );
    }
    const med = (c) => Math.round(resultados.reduce((a, r) => a + r[c], 0) / resultados.length);
    console.log(`\nmédia: conteudo ${med('conteudoMs')}ms | cromo ${med('cromoMs')}ms`);

    for (const passagem of ['fria', 'quente']) {
      console.log(`\n=== POR ABA — volta ${passagem.toUpperCase()} (${ETIQUETA}) ===`);
      console.log('aba         ms  /api  imgs  (cache)   bytes rede   até última img');
      for (const t of porTela[passagem]) {
        console.log(
          `${t.tela.padEnd(10)} ${String(t.ms).padStart(5)} ${String(t.api).padStart(5)} ` +
          `${String(t.imagens).padStart(5)} ${String(t.imagensDoCache).padStart(8)} ` +
          `${kb(t.bytes).padStart(12)} ${String(t.ultimaImagemMs).padStart(12)}ms`
        );
      }
      const soma = (c) => porTela[passagem].reduce((a, t) => a + t[c], 0);
      console.log(
        `${'TOTAL'.padEnd(10)} ${''.padStart(5)} ${String(soma('api')).padStart(5)} ` +
        `${String(soma('imagens')).padStart(5)} ${String(soma('imagensDoCache')).padStart(8)} ${kb(soma('bytes')).padStart(12)}`
      );
    }
    console.log('');

    if (SAIDA_JSON) {
      writeFileSync(SAIDA_JSON, JSON.stringify({ etiqueta: ETIQUETA, frio, resultados, porTela }, null, 2));
      console.log(`(gravado em ${SAIDA_JSON})\n`);
    }
  })
  .catch((e) => {
    console.error('Falhou:', e.message);
    process.exit(1);
  });
