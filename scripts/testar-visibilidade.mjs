#!/usr/bin/env node
// Futty v2.0 — O app ABRE VISÍVEL? (build 11) + o F DE CARREGAMENTO CENTRA? (build 14)
//
// Existe por causa de um bug que passou builds despercebido e chegou ao iPhone:
// a página inteira montava no DOM, sem um único erro no console, mas o wrapper
// da rota ficava preso em opacity 0 — só se via o fundo e o aviso de cookies.
// Nenhum teste de unidade apanha isto: o HTML está lá, o React não falhou, o que
// falhou foi a animação de entrada nunca ter terminado (ver PageTransition.jsx).
// Só medindo a opacidade COMPUTADA num browser de verdade é que se vê.
//
// BUILD 14 — segundo bug da MESMA família: o <LoadingFutty/> (fixed, inset:0)
// aparecia encolhido no TOPO da tela no iPhone, ao abrir o Gabinete e na 1ª
// abertura. Causa: @keyframes pageEntra anima `transform` no [data-page]; o
// WebKit trata um ancestral com animação de transform como containing block de
// `position:fixed` enquanto animation-fill-mode:both segura o estado — mesmo com
// o valor final em `none` — e o F passa a centrar-se na ÁREA da página, não no
// viewport. Corrigido renderizando LoadingFutty (e os outros fixed/modais) via
// portal directo em document.body (ver a nota em components/LoadingFutty.jsx).
// Este ficheiro testa os DOIS: visibilidade da página E centragem do loader.
//
// Sobe o preview do dist sozinho, abre as rotas públicas (sem login, é
// justamente o visitante sem sessão que apanhava os dois bugs — com sessão o
// "/" salta para /home e não passa por aqui) em vários tamanhos de tela.
// Corre no `npm run build`, portanto também no CI do iPhone.
//
// Uso: node scripts/testar-visibilidade.mjs   (precisa de dist/ já construído)
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const RAIZ = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORTA = 4178; // fora do 4173 de omissão, para não chocar com um preview aberto à mão
const BASE = `http://localhost:${PORTA}`;
const ESPERA_MS = 1500;
const TOLERANCIA_CENTRO_PX = 8;

// Só rotas públicas: o teste não faz login (Gabinete e Início exigem sessão, e
// autenticar aqui chamaria a API de verdade — frágil num teste de build). Cada
// rota mapeia para o componente lazy que o Suspense de App.jsx (fallback
// LoadingFutty, uma instância só para o app inteiro) carrega — é o chunk que a
// interceção de rede atrasa no teste de centragem, o mesmo mecanismo que
// suspendia o Gabinete/Início no bug original.
const ROTAS = [
  { path: '/', chunk: 'LandingPage' },
  { path: '/login', chunk: 'Login' },
];
const TAMANHOS = [
  { nome: 'celular', width: 390, height: 844 },
  { nome: 'SE', width: 375, height: 667 },
  { nome: 'android médio', width: 360, height: 800 },
  { nome: 'android grande', width: 412, height: 915 },
  { nome: 'desktop', width: 1280, height: 800 },
];

// Espera a porta responder em vez de ler o stdout do vite: no Windows o stdout
// vem por um shell e a linha do "Local:" nem sempre chega a este processo.
async function subirServidor() {
  // Chama o vite pelo próprio node (sem npx/shell): no Windows o npx é um .cmd
  // e precisaria de shell, que traz aviso de depreciação e problemas de escape.
  const p = spawn(
    process.execPath,
    [path.join(RAIZ, 'node_modules', 'vite', 'bin', 'vite.js'), 'preview', '--port', String(PORTA), '--strictPort'],
    { cwd: RAIZ, stdio: 'ignore' }
  );
  p.on('error', (e) => {
    console.error(`[visibilidade] não deu para subir o preview: ${e.message}`);
  });
  for (let i = 0; i < 60; i++) {
    await new Promise((r) => setTimeout(r, 500));
    try {
      const resposta = await fetch(BASE + '/', { signal: AbortSignal.timeout(2000) });
      if (resposta.ok) return p;
    } catch {
      /* ainda não subiu — tenta de novo */
    }
  }
  p.kill();
  throw new Error(`o preview não respondeu em ${BASE} ao fim de 30 s.`);
}

async function medir(browser, rota, tamanho) {
  const ctx = await browser.newContext({ viewport: { width: tamanho.width, height: tamanho.height } });
  const pagina = await ctx.newPage();
  const erros = [];
  pagina.on('pageerror', (e) => erros.push(e.message));
  await pagina.goto(BASE + rota.path, { waitUntil: 'load' });
  await pagina.waitForTimeout(ESPERA_MS);

  const r = await pagina.evaluate(() => {
    const el = document.querySelector('[data-page]');
    if (!el) return { achou: false };
    const cs = getComputedStyle(el);
    // Opacidade EFETIVA: um pai transparente esconde na mesma, então multiplica-se
    // a cadeia toda até ao body. É o que o olho vê, não o que o elemento declara.
    let efetiva = 1;
    for (let n = el; n && n !== document.documentElement; n = n.parentElement) {
      efetiva *= Number(getComputedStyle(n).opacity);
    }
    // ACIMA de [data-page] (nunca o próprio): o .page-transition TEM transform
    // "sujo" por construção — a animação pageEntra fica associada ao elemento por
    // animation-fill-mode:both mesmo depois de terminar, e o computed style
    // resolve para uma matriz (não o keyword `none`), o que por spec o torna
    // containing block de `position:fixed` — CONFIRMADO neste teste, no Chromium,
    // não é só um capricho do WebKit do iPhone como o comentário original supunha.
    // É exatamente por isso que LoadingFutty/Toast/CropModal/modais fixed têm de
    // ESCAPAR via portal (ver nota em LoadingFutty.jsx) em vez de só ajustar o
    // keyframe: um ancestral MAIS ACIMA com transform ≠ none seria um bug novo.
    const transformados = [];
    for (let n = el.parentElement; n && n !== document.documentElement; n = n.parentElement) {
      const t = getComputedStyle(n).transform;
      if (t && t !== 'none') transformados.push(`${n.tagName.toLowerCase()}.${n.className || ''}`);
    }
    return {
      achou: true,
      opacity: cs.opacity,
      efetiva,
      visibility: cs.visibility,
      display: cs.display,
      texto: (el.innerText || '').replace(/\s+/g, ' ').trim().length,
      transformados,
    };
  });
  await ctx.close();
  return { ...r, erros };
}

// BUILD 14 — atrasa o chunk lazy da rota (route interception) para segurar o
// Suspense no ar, e mede se o [data-loading-futty] (o LoadingFutty do fallback)
// fica com o CENTRO do seu próprio bounding box a ±8px do centro do viewport.
// Um ancestral que virasse containing block de `position:fixed` encolheria/
// deslocaria este rect para a área da página em vez do ecrã inteiro — é
// exactamente essa diferença que o teste apanha.
async function medirLoadingCentrado(browser, rota, tamanho) {
  const ctx = await browser.newContext({ viewport: { width: tamanho.width, height: tamanho.height } });
  const erros = [];

  // context.route(), não page.route(): registado ANTES da 1ª página nascer, evita
  // a corrida em que o burst inicial de chunks (13+ pedidos quase simultâneos)
  // passa ao lado de um handler ligado depois — medido: com page.route() a
  // interceção falhava ~3 em 4 vezes; com context.route(), 0 em muitas.
  const padraoChunk = new RegExp(`/${rota.chunk}-[\\w-]+\\.js(\\?|$)`);
  await ctx.route('**/*.js', async (route) => {
    if (padraoChunk.test(new URL(route.request().url()).pathname)) {
      await new Promise((r) => setTimeout(r, 1200));
    }
    await route.continue();
  });

  const pagina = await ctx.newPage();
  pagina.on('pageerror', (e) => erros.push(e.message));

  await pagina.goto(BASE + rota.path, { waitUntil: 'domcontentloaded' });
  await pagina.waitForSelector('[data-loading-futty]', { timeout: 5000 }).catch(() => null);

  const r = await pagina.evaluate(() => {
    const el = document.querySelector('[data-loading-futty]');
    if (!el) return { achou: false };
    const rect = el.getBoundingClientRect();
    // Estrutural: nunca dentro de [data-page] — é essa aninhagem que o expõe ao
    // transform "sujo" do .page-transition (ver nota em medir() acima).
    const dentroDaPagina = !!document.querySelector('[data-page]')?.contains(el);
    return {
      achou: true,
      dentroDaPagina,
      centroX: rect.left + rect.width / 2,
      centroY: rect.top + rect.height / 2,
      rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
    };
  });
  await ctx.close();
  return { ...r, erros };
}

const servidor = await subirServidor();
let browser;
try {
  browser = await chromium.launch();
} catch (e) {
  servidor.kill();
  if (/executable doesn't exist/i.test(e.message)) {
    console.error(
      '[visibilidade] ❌ o Chromium do Playwright não está instalado. Rode `npx playwright install chromium` e tente de novo.'
    );
    process.exit(1);
  }
  throw e;
}
const falhas = [];
try {
  for (const rota of ROTAS) {
    for (const tamanho of TAMANHOS) {
      const etiqueta = `${rota.path} @ ${tamanho.nome} (${tamanho.width}x${tamanho.height})`;

      const r = await medir(browser, rota, tamanho);
      if (!r.achou) {
        falhas.push(`${etiqueta}: não há [data-page] no DOM — o wrapper da página não montou.`);
      } else {
        const invisivel =
          r.efetiva < 0.99 || r.visibility === 'hidden' || r.display === 'none' || r.texto === 0;
        if (invisivel) {
          falhas.push(
            `${etiqueta}: página INVISÍVEL — opacity=${r.opacity} (efetiva ${r.efetiva.toFixed(3)}), ` +
              `visibility=${r.visibility}, display=${r.display}, ${r.texto} caracteres de texto.`
          );
        } else {
          console.log(`[visibilidade] ok  ${etiqueta} — opacity ${r.opacity}, ${r.texto} caracteres.`);
        }
        if (r.transformados.length) {
          falhas.push(
            `${etiqueta}: ancestral de [data-page] com transform ≠ none depois de ${ESPERA_MS}ms — ` +
              `${r.transformados.join(', ')} (containing block indevido para position:fixed).`
          );
        }
        if (r.erros.length) falhas.push(`${etiqueta}: erro de JS — ${r.erros.join(' | ')}`);
      }

      const c = await medirLoadingCentrado(browser, rota, tamanho);
      if (!c.achou) {
        falhas.push(`${etiqueta}: rota suspensa mas [data-loading-futty] nunca apareceu no DOM.`);
      } else {
        if (c.dentroDaPagina) {
          falhas.push(`${etiqueta}: [data-loading-futty] está DENTRO de [data-page] — não escapou por portal.`);
        }
        const centroViewportX = tamanho.width / 2;
        const centroViewportY = tamanho.height / 2;
        const dx = Math.abs(c.centroX - centroViewportX);
        const dy = Math.abs(c.centroY - centroViewportY);
        if (dx > TOLERANCIA_CENTRO_PX || dy > TOLERANCIA_CENTRO_PX) {
          falhas.push(
            `${etiqueta}: LoadingFutty DESCENTRADO — centro em (${c.centroX.toFixed(1)}, ${c.centroY.toFixed(1)}), ` +
              `viewport (${centroViewportX}, ${centroViewportY}), desvio (${dx.toFixed(1)}, ${dy.toFixed(1)})px, ` +
              `rect ${JSON.stringify(c.rect)}.`
          );
        } else {
          console.log(`[visibilidade] ok  ${etiqueta} — LoadingFutty centrado (desvio ${dx.toFixed(1)}, ${dy.toFixed(1)}px).`);
        }
        if (c.erros.length) falhas.push(`${etiqueta}: erro de JS durante a suspensão — ${c.erros.join(' | ')}`);
      }
    }
  }
} finally {
  await browser.close();
  servidor.kill();
}

if (falhas.length) {
  console.error(`\n[visibilidade] ❌ ${falhas.length} falha(s):`);
  for (const f of falhas) console.error(`   ${f}`);
  console.error('\nO app abriria com a página montada mas sem se ver — não publique assim.');
  process.exit(1);
}
console.log('[visibilidade] ✅ todas as rotas abrem visíveis.');
