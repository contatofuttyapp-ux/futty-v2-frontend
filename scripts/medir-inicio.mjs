// Futty v2.0 — Mede a abertura do Início num Chrome de verdade (VELOCIDADE 4).
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
// Conta também quantos pedidos cada tela dispara, separando OPTIONS (preflight)
// do resto.
//
// Uso (com o backend a correr em :3001 e `npm run build` feito):
//   node scripts/medir-inicio.mjs
//   node scripts/medir-inicio.mjs --url http://localhost:4173
import { readFileSync } from 'node:fs';
import { chromium } from 'playwright';

const args = process.argv.slice(2);
const opcao = (nome, omissao) => {
  const i = args.indexOf(`--${nome}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : omissao;
};

const BASE = opcao('url', 'http://localhost:4173');
const EMAIL = opcao('email', 'demo-loja@futtymock.com');
const FICHEIRO_SENHA = opcao('senha', 'C:/Users/phfer/Desktop/FUT/LOJA/demo-senha.txt');

function lerSenha() {
  const bruto = readFileSync(FICHEIRO_SENHA, 'utf8');
  // O ficheiro pode ter uma linha "senha: xxx" ou só a senha.
  const linha = bruto.split(/\r?\n/).map((l) => l.trim()).filter(Boolean).pop() || '';
  return linha.includes(':') ? linha.split(':').pop().trim() : linha;
}

const espera = (ms) => new Promise((r) => setTimeout(r, ms));

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

  // ─── Pedidos por tela (as outras abas) ───
  const porTela = [];
  for (const [nome, chave] of [['Resenha', 'feed'], ['Ranking', 'ranking'], ['Figurinha', 'figurinha'], ['Perfil', 'perfil']]) {
    zerar();
    const t0 = Date.now();
    await pagina.click(aba(chave));
    await pagina.waitForSelector('.app-main', { timeout: 20000 });
    await espera(1500);
    porTela.push({ tela: nome, ms: Date.now() - t0, pedidos: contar() });
  }

  await navegador.close();
  return { frio, resultados, porTela };
}

medir()
  .then(({ frio, resultados, porTela }) => {
    console.log('\n=== INÍCIO: tela na frente vs figurinha desenhada ===');
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

    console.log('\n=== PEDIDOS POR TELA ===');
    for (const t of porTela) {
      console.log(`${t.tela.padEnd(10)} ${String(t.ms).padStart(5)}ms | pedidos ${t.pedidos.total} (api ${t.pedidos.api}, preflight ${t.pedidos.preflight})`);
    }
    console.log('');
  })
  .catch((e) => {
    console.error('Falhou:', e.message);
    process.exit(1);
  });
