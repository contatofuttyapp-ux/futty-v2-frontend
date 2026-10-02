#!/usr/bin/env node
// Futty v2.0 — Rodada 29H (item 4): mede o quanto a PÁGINA 1 DO ONBOARDING demora para ficar pronta, antes e depois do aquecimento
// (lib/preaquecerOnboarding.js: o Register/Login pedem o chunk do Onboarding e as 8 figurinhas em tempo ocioso; e o plugin
// preloadDoOnboardingNoFrio do vite.config.js, que no caminho frio — link do e-mail, volta do Google — pede o chunk, o CSS e as 8 imagens
// no mesmo instante em que o index.js começa a baixar).
//
// Dois fluxos, os dois de verdade, cada um com cache frio:
//   cadastro  /register (sem sessão): a pessoa "digita" por alguns segundos, preenche e toca em "Criar conta"; o signUp responde com uma
//             sessão (a das contas de prova do backend), o app navega e a trava do onboarding leva a /onboarding. Medido do TOQUE.
//   frio      o site abre direto em /onboarding com a sessão já guardada — é a volta do link do e-mail de confirmação (depois da troca do
//             código) ou do Google. Medido do início da navegação.
// Até: (a) a máquina do mini sorteio aparecer (.msq .maq) e (b) as 8 figurinhas estarem carregadas (todos os <img> da tira com
// naturalWidth > 0) — o que a pessoa percebe como "a página 1 abriu".
//
// A rede é emulada por pedido (route): cada pedido de ARQUIVO do site espera --estatico ms (a ida e volta até a borda da Cloudflare) e cada
// pedido à /api espera --api ms (Lisboa → São Paulo, ~350 ms de ida e volta). O route desliga o cache HTTP do WebKit, o que aqui é
// o que se quer (cache frio nas duas versões); o aquecimento vale pelo cache em memória do próprio documento e pelos <link rel=preload>.
//
// As duas versões vêm de dois `vite preview` (builds diferentes: o commit de antes e o de depois), cada um com o /api apontado para um
// motor LOCAL (VITE_PREVIEW_API) — NUNCA a produção. Contas: backend/scripts/_bench/prova-rodada29b.js (usa a `novato`).
//
// Uso (de FUTTY-V2/frontend):
//   node scripts/medir-onboarding-p1.mjs --antes http://localhost:4233 --depois http://localhost:4234 [--n 5] [--estatico 80] [--api 350] [--digitando 2500]
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { webkit } from 'playwright';

const RAIZ = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const opcao = (nome, omissao) => { const i = args.indexOf(`--${nome}`); return i >= 0 && args[i + 1] ? args[i + 1] : omissao; };
const ANTES = opcao('antes', 'http://localhost:4233').replace(/\/+$/, '');
const DEPOIS = opcao('depois', 'http://localhost:4234').replace(/\/+$/, '');
const N = Number(opcao('n', '5'));
const ESTATICO_MS = Number(opcao('estatico', '80'));
const API_MS = Number(opcao('api', '350'));
const DIGITANDO_MS = Number(opcao('digitando', '2500'));
const MOTOR = opcao('motor', 'http://localhost:3133').replace(/\/+$/, ''); // o motor LOCAL que os dois previews usam (VITE_PREVIEW_API)
for (const base of [ANTES, DEPOIS, MOTOR]) {
  if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(base)) throw new Error(`só servidor LOCAL (CLAUDE.md, 25-set); recebi ${base}`);
}
const espera = (ms) => new Promise((r) => { setTimeout(r, ms); });
const fx = JSON.parse(readFileSync(path.join(RAIZ, 'scripts', 'capturas', 'sessao-rodada29b.json'), 'utf8'));
const SESSAO_TEXTO = fx.novato[0].value;
const SESSAO_NOME = fx.novato[0].name;
const SESSAO = JSON.parse(SESSAO_TEXTO);
// O /api/me real, lido UMA vez (o motor local leva 100–400 ms por chamada e essa variação é maior do que o que se quer medir): cada
// corrida o devolve da memória, depois da espera de rede emulada. Assim a conta continua sendo a de prova (foto, nome) e a medida só
// enxerga o que muda entre as duas versões: os arquivos do site.
const ME_BRUTO = await (await fetch(`${MOTOR}/api/me`, { headers: { Authorization: `Bearer ${SESSAO.access_token}` } })).text();
const ME_JSON = JSON.parse(ME_BRUTO);
const IPHONE = {
  viewport: { width: 430, height: 932 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, locale: 'pt-BR',
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.7 Mobile/15E148 Safari/604.1',
};
const mediana = (v) => { const o = [...v].sort((a, b) => a - b); const m = Math.floor(o.length / 2); return o.length % 2 ? o[m] : Math.round((o[m - 1] + o[m]) / 2); };

// Roda DENTRO da página: marca (em ms desde `window.__zero`) quando a máquina aparece e quando as 8 figurinhas estão carregadas. O zero é o
// instante do envio do formulário (cadastro: o evento "submit", e não o clique — o Playwright gasta ~2 s rolando e esperando o botão ficar
// estável, o que não é do app) ou o início da navegação (frio: 0).
function vigia() {
  window.__marca = {};
  (function ler() {
    const zero = window.__zero;
    if (zero != null) {
      const maq = document.querySelector('.msq .maq');
      if (maq && window.__marca.maquina == null && maq.getBoundingClientRect().height > 0) window.__marca.maquina = Math.round(performance.now() - zero);
      const imgs = [...document.querySelectorAll('.msq .scel img')];
      if (imgs.length >= 8 && window.__marca.imagens == null && imgs.every((i) => i.complete && i.naturalWidth > 0)) window.__marca.imagens = Math.round(performance.now() - zero);
    }
    if (window.__marca.maquina == null || window.__marca.imagens == null) requestAnimationFrame(ler);
  }());
}

/** O contexto com a rede emulada (cada pedido do site espera um pouco). O /api/me diz que a conta não terminou o onboarding (como a conta nova). */
async function contextoComRede(navegador, base, { comSessao = false } = {}) {
  const contexto = await navegador.newContext({
    ...IPHONE, serviceWorkers: 'block', timezoneId: 'America/Sao_Paulo',
    storageState: comSessao ? { cookies: [], origins: [{ origin: base, localStorage: [{ name: SESSAO_NOME, value: SESSAO_TEXTO }] }] } : undefined,
  });
  const pedidos = [];
  contexto.on('request', (r) => { const u = new URL(r.url()); pedidos.push(u.pathname + u.search); });
  await contexto.route('**/*', async (route) => {
    const u = new URL(route.request().url());
    if (u.origin === base) await espera(u.pathname.startsWith('/api/') ? API_MS : ESTATICO_MS);
    return route.continue();
  });
  // A conta de prova já terminou o onboarding; para a trava mandá-la a /onboarding como a conta nova de verdade, o /api/me diz que não.
  await contexto.route('**/api/me', async (route) => {
    if (route.request().method() !== 'GET') return route.fallback();
    await espera(API_MS);
    return route.fulfill({ status: 200, contentType: 'application/json', json: { ...ME_JSON, user: { ...ME_JSON.user, onboarding_completo: false } } });
  });
  // O Início traz o mesmo `me` dentro do /api/inicio (a tela e a trava leem o perfil das duas fontes).
  await contexto.route('**/api/inicio*', async (route) => {
    if (route.request().method() !== 'GET') return route.fallback();
    await espera(API_MS);
    const resposta = await route.fetch();
    const json = await resposta.json().catch(() => null);
    if (!json?.me?.user) return route.fulfill({ response: resposta });
    json.me.user.onboarding_completo = false;
    return route.fulfill({ response: resposta, json });
  });
  return { contexto, pedidos };
}

const aquecido = (pedidos) => ({
  chunk: pedidos.filter((p) => /Onboarding/.test(p)).length,
  imagens: new Set(pedidos.filter((p) => /\/onboarding\/[a-z]+\.webp/.test(p))).size,
});

async function esperarPronta(pagina, base) {
  await pagina.waitForFunction(() => window.__marca && window.__marca.maquina != null && window.__marca.imagens != null, null, { timeout: 40000 }).catch(async (e) => {
    const t = (await pagina.locator('body').innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 300);
    throw new Error(`página 1 não ficou pronta em ${base}: url ${pagina.url().replace(base, '')} · marca ${JSON.stringify(await pagina.evaluate(() => window.__marca).catch(() => null))} · texto "${t}" · ${e.message.split('\n')[0]}`);
  });
}

async function corridaCadastro(navegador, base) {
  const { contexto, pedidos } = await contextoComRede(navegador, base);
  const pagina = await contexto.newPage();
  await contexto.route('**/auth/v1/signup**', async (route) => {
    const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' };
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
    return route.fulfill({ status: 200, contentType: 'application/json', headers: cors, body: JSON.stringify(SESSAO) });
  });
  await pagina.goto(`${base}/register`, { waitUntil: 'load' });
  await pagina.locator('button', { hasText: /^Aceitar$/ }).click({ timeout: 2500 }).catch(() => {});
  await pagina.waitForSelector('#email', { timeout: 30000 });
  await espera(DIGITANDO_MS); // a pessoa digita: é a janela em que o aquecimento trabalha
  await pagina.fill('#email', `medir-${Date.now()}@futtymock.com`);
  await pagina.fill('#password', 'Medir!Onboarding1');
  await pagina.fill('#confirm', 'Medir!Onboarding1');
  const ehInput = await pagina.evaluate(() => document.querySelector('#birthdate')?.tagName === 'INPUT');
  if (ehInput) {
    await pagina.fill('#birthdate', '1990-03-15'); // o seletor antigo (build de antes)
  } else {
    for (const [nome, valor] of [['ano', 1990], ['mes', 3], ['dia', 15]]) { // os rolinhos (build de depois)
      await pagina.locator(`#birthdate [data-rolo="${nome}"]`).evaluate((el, v) => { el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); el.scrollTop = [...el.querySelectorAll('[data-valor]')].findIndex((i) => i.dataset.valor === String(v)) * 40; }, valor);
      await pagina.waitForFunction(({ n, v }) => document.querySelector(`#birthdate [data-rolo="${n}"]`)?.dataset.escolhido === String(v), { n: nome, v: valor }, { timeout: 5000 });
    }
  }
  await pagina.locator('input[type="checkbox"]').check();
  await pagina.evaluate(() => { window.__zero = null; document.addEventListener('submit', () => { window.__zero = performance.now(); }, { capture: true, once: true }); });
  await pagina.evaluate(vigia);
  await pagina.locator('button[type="submit"]').click();
  await esperarPronta(pagina, base);
  const marca = await pagina.evaluate(() => window.__marca);
  const r = { ...marca, aquecido: aquecido(pedidos) };
  await contexto.close();
  return r;
}

async function corridaFria(navegador, base) {
  const { contexto, pedidos } = await contextoComRede(navegador, base, { comSessao: true });
  const pagina = await contexto.newPage();
  await pagina.addInitScript(`window.__zero = 0; (${vigia.toString()})()`);
  await pagina.goto(`${base}/onboarding`, { waitUntil: 'commit' });
  await esperarPronta(pagina, base);
  const marca = await pagina.evaluate(() => window.__marca);
  const r = { ...marca, aquecido: aquecido(pedidos) };
  await contexto.close();
  return r;
}

const navegador = await webkit.launch();
const FLUXOS = [['cadastro', corridaCadastro], ['frio', corridaFria]];
const resultados = Object.fromEntries(FLUXOS.map(([f]) => [f, { antes: [], depois: [] }]));
try {
  console.log(`[p1] WebKit ${navegador.version()} · ${N} corridas por versão e fluxo · rede: arquivo +${ESTATICO_MS} ms, /api +${API_MS} ms, "digitando" ${DIGITANDO_MS} ms`);
  for (let i = 0; i < N; i += 1) {
    for (const [fluxo, correr] of FLUXOS) {
      for (const [rotulo, base] of [['antes', ANTES], ['depois', DEPOIS]]) {
        const r = await correr(navegador, base);
        resultados[fluxo][rotulo].push(r);
        console.log(`[p1] ${i + 1}/${N} ${fluxo.padEnd(8)} ${rotulo.padEnd(6)} máquina ${String(r.maquina).padStart(5)} ms · 8 figurinhas ${String(r.imagens).padStart(5)} ms · pedidos: chunk ${r.aquecido.chunk}, imagens ${r.aquecido.imagens}`);
      }
    }
  }
} finally {
  await navegador.close();
}
const resumo = {};
console.log('\n| fluxo | métrica (mediana, ms; mín–máx) | antes | depois | ganho |\n|---|---|---|---|---|');
for (const [fluxo] of FLUXOS) {
  resumo[fluxo] = {};
  for (const [campo, rotulo] of [['maquina', 'máquina na tela'], ['imagens', '8 figurinhas carregadas']]) {
    const a = resultados[fluxo].antes.map((r) => r[campo]);
    const d = resultados[fluxo].depois.map((r) => r[campo]);
    const ma = mediana(a);
    const md = mediana(d);
    resumo[fluxo][campo] = { antes: { mediana: ma, min: Math.min(...a), max: Math.max(...a) }, depois: { mediana: md, min: Math.min(...d), max: Math.max(...d) } };
    console.log(`| ${fluxo} | ${rotulo} | ${ma} (${Math.min(...a)}–${Math.max(...a)}) | ${md} (${Math.min(...d)}–${Math.max(...d)}) | ${ma - md} ms (${Math.round((1 - md / ma) * 100)}%) |`);
  }
}
writeFileSync(path.join(RAIZ, 'scripts', 'capturas', 'p1-onboarding.json'), JSON.stringify({ config: { N, ESTATICO_MS, API_MS, DIGITANDO_MS }, resultados, resumo }, null, 2));
