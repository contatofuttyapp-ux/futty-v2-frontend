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
//
// HOTFIX (23-set) — terceiro bug da MESMA família, tela preta após login com
// Google no Chrome: a página nascia com document.hidden=true (aba em 2º plano
// durante o redirect do OAuth), e a pausa geral de animações (index.css,
// `html[data-oculto]`, VELOCIDADE 8) prendia a entrada de [data-page]
// (`.page-transition`) em opacity 0 — nascida já pausada, nunca correu um só
// quadro. Um `page.goto()` normal não reproduz isto (a aba do teste nasce
// sempre visível); os dois cenários novos (ver `medirRecuperacaoDeOculto`)
// forçam document.hidden/data-oculto ANTES de a app correr.
//
// Este ficheiro testa os TRÊS: visibilidade da página, centragem do loader, e
// recuperação de um arranque escondido.
//
// Sobe o preview do dist sozinho, abre as rotas públicas (sem login, é
// justamente o visitante sem sessão que apanhava os bugs — com sessão o
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

// HOTFIX (23-set) — os dois cenários que reproduzem a tela preta do Chrome.
// Nos dois o critério é o mesmo: opacidade EFETIVA de [data-page] chega a 1
// em até 300 ms, sem gesto nenhum além do próprio evento de visibilidade (ou
// nem isso, no segundo caso) — não pode depender de a pessoa mexer na aba
// outra vez para "destravar".
const CENARIOS_OCULTO = ['hidden-no-arranque', 'nasce-com-data-oculto'];

/**
 * 'hidden-no-arranque' — document.hidden é forçado a true ANTES de qualquer
 * script da app correr (mesmo instante em que lib/ritmo.js lê document.hidden
 * pela 1ª vez, em pararAnimacoesForaDeVista) — a app corre o arranque inteiro
 * a pensar que está em 2º plano, tal como no redirect do OAuth. Só depois "a
 * pessoa volta à aba": document.hidden volta a false e dispara-se
 * visibilitychange, o mesmo evento que o browser dispararia a valer.
 *
 * 'nasce-com-data-oculto' — o atributo que a pausa geral de index.css usa é
 * posto direto no <html>, e fica lá a medição inteira (nunca se simula
 * "voltar a ficar visível"). Testa a EXCLUSÃO de seletores em index.css
 * isoladamente: mesmo preso em "oculto" para sempre, o conteúdo tem de
 * aparecer sozinho, porque a animação de entrada nunca devia ter sido
 * pausada. Se este cenário só passasse com o primeiro, a rede de segurança
 * de lib/ritmo.js estaria a disfarçar uma exclusão que não funciona.
 */
async function medirRecuperacaoDeOculto(browser, rota, cenario) {
  const ctx = await browser.newContext();
  await ctx.addInitScript((cenarioNoBrowser) => {
    if (cenarioNoBrowser === 'hidden-no-arranque') {
      Object.defineProperty(document, 'hidden', { value: true, configurable: true });
      Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
    } else {
      document.addEventListener(
        'DOMContentLoaded',
        () => document.documentElement.setAttribute('data-oculto', ''),
        { once: true }
      );
    }
  }, cenario);

  const pagina = await ctx.newPage();
  const erros = [];
  pagina.on('pageerror', (e) => erros.push(e.message));
  await pagina.goto(BASE + rota.path, { waitUntil: 'load' });

  // [data-page] só nasce quando o chunk lazy da rota resolve — está DENTRO do
  // Suspense (App.jsx), não no fallback. O tempo de rede/chunk não é o que se
  // quer medir aqui (varia por rota — apanhado no /login, cujo chunk é maior
  // que o da LandingPage); os 300 ms do teto começam a contar só a partir de
  // a página já estar montada, achando ou não achando o elemento.
  await pagina.waitForSelector('[data-page]', { timeout: 5000 }).catch(() => null);

  if (cenario === 'hidden-no-arranque') {
    // Tempo de sobra para a animação ficar presa, como em produção, antes de
    // "a pessoa voltar à aba".
    await pagina.waitForTimeout(400);
    await pagina.evaluate(() => {
      Object.defineProperty(document, 'hidden', { value: false, configurable: true });
      Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });
  }
  // 'nasce-com-data-oculto': data-oculto fica no <html> a medição toda —
  // de propósito, não se dispara visibilitychange nenhum aqui.

  const t0 = Date.now();
  let efetiva = 0;
  for (;;) {
    efetiva = await pagina.evaluate(() => {
      const el = document.querySelector('[data-page]');
      if (!el) return 0;
      let e = 1;
      for (let n = el; n && n !== document.documentElement; n = n.parentElement) {
        e *= Number(getComputedStyle(n).opacity);
      }
      return e;
    });
    if (efetiva >= 0.99 || Date.now() - t0 >= 300) break;
    await pagina.waitForTimeout(20);
  }
  const ms = Date.now() - t0;
  await ctx.close();
  return { efetiva, ms, erros };
}

// HOTFIX (24-set, Rodada 21) — quarto bug da MESMA família: os cards
// `.anim-slide-in` da Resenha (/feed) e do card do jogo no Início (/home)
// nasciam presos em opacity 0 pela MESMA pausa geral (VELOCIDADE 8) — a
// classe tinha ficado de fora da exclusão de index.css/lib/ritmo.js quando o
// HOTFIX de 23-set corrigiu só [data-page]. Achado ao varrer o resto do app
// pela mesma classe de defeito (opacity:0 + backwards/both).
//
// Ao contrário do HOTFIX de 23-set, estas duas rotas exigem sessão — sem
// backend de verdade: a sessão nasce pronta no localStorage (a MESMA "sessão
// otimista", síncrona, que context/AuthContext.jsx lê antes de qualquer rede
// — ver a nota `sessaoGuardada()` lá) e as respostas da API são
// interceptadas com o mínimo de dados para cada tela montar UM card
// `.anim-slide-in` (um post-anúncio na Resenha, um jogo no Início) — não um
// backend de mentira completo, só o que basta para não confiar em produção
// alguma durante o build.
const SUPABASE_REF = 'ynzmjcvqdljffgbeqglh'; // o mesmo VITE_SUPABASE_URL do .env — ver AuthContext.jsx
const FAKE_USER_ID = '99999999-9999-4999-8999-999999999999';

function sessaoFalsa() {
  const agora = Math.floor(Date.now() / 1000);
  return {
    access_token: 'token-de-teste-visibilidade',
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: agora + 3600, // longe o bastante do supabase-js nunca tentar um refresh de verdade
    refresh_token: 'refresh-de-teste-visibilidade',
    user: {
      id: FAKE_USER_ID,
      aud: 'authenticated',
      role: 'authenticated',
      email: 'teste-visibilidade@futty.local',
      email_confirmed_at: new Date().toISOString(),
      app_metadata: { provider: 'email' },
      user_metadata: {},
      created_at: new Date().toISOString(),
    },
  };
}

const TIME_FALSO = { id: 'time-teste-vis', nome: 'Time Teste', slug: 'time-teste-vis', logo_url: null, pedidos_pendentes: 0, role: 'membro' };
const ME_FALSO = { id: FAKE_USER_ID, nome_jogador: 'Jogador Teste', avatar_url: null, foto_url: null, birthdate: '1990-01-01', kit_ativo: null, tem_figurinha: false };
const ME_ENVELOPE = { user: ME_FALSO, stats: {}, slots: [] };

const INICIO_FALSO = {
  me: { user: ME_FALSO, stats: {} },
  teams: { teams: [TIME_FALSO] },
  convites: {
    games: [
      {
        id: 'jogo-teste-vis',
        name: 'Pelada de teste',
        team_name: TIME_FALSO.nome,
        team_id: TIME_FALSO.id,
        date: new Date(Date.now() + 86400000).toISOString(),
        status: 'open',
        user_status: null,
        confirmed_count: 3,
      },
    ],
  },
  pedidos: [],
  votacoes_pendentes: [],
  denuncias_desfechos: [],
  votacao_status: null,
  campeonato: null,
  rsvp: null,
  ad: { ad: null },
  ads: null,
  brilhante: { fonte: null, team_id: null, kit_id: null, creditos: 0, restantes: 0 },
  pedidos_brilhante: [],
};

const FEED_FALSO = {
  items: [
    {
      kind: 'post',
      tipo: 'anuncio', // AnuncioCard: o post .anim-slide-in mais simples de montar (sem imagem, sem reações)
      id: 'post-teste-vis',
      team_id: TIME_FALSO.id,
      conteudo: { titulo: 'Teste de visibilidade', mensagem: 'Card de teste do script de visibilidade.' },
      criado_em: new Date().toISOString(),
    },
  ],
};

/**
 * Mede a opacidade efetiva de um card `.anim-slide-in` numa rota AUTENTICADA,
 * montada com `data-oculto` no <html> desde o DOMContentLoaded — persistente
 * pela medição inteira, como 'nasce-com-data-oculto' em
 * medirRecuperacaoDeOculto: prova a EXCLUSÃO em index.css sozinha, sem
 * depender de um visibilitychange disparar.
 */
async function medirCardEscondidoAutenticado(browser, path, seletorCard, respostasApi) {
  const ctx = await browser.newContext();
  const erros = [];

  await ctx.addInitScript(
    ({ ref, sessao }) => {
      localStorage.setItem(`sb-${ref}-auth-token`, JSON.stringify(sessao));
      document.addEventListener('DOMContentLoaded', () => document.documentElement.setAttribute('data-oculto', ''), { once: true });
    },
    { ref: SUPABASE_REF, sessao: sessaoFalsa() }
  );

  // Nunca deixa a réplica real do Supabase Auth responder — a sessão já
  // nasceu pronta acima; qualquer pedido até lá fica pendurado (nunca
  // resolve), o que é inofensivo: nada no app espera por ele dentro da
  // janela de 1 s desta medição.
  await ctx.route(`https://${SUPABASE_REF}.supabase.co/**`, () => new Promise(() => {}));
  for (const [padrao, corpo] of Object.entries(respostasApi)) {
    await ctx.route(`**${padrao}`, (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(corpo) }));
  }

  const pagina = await ctx.newPage();
  pagina.on('pageerror', (e) => erros.push(e.message));
  await pagina.goto(BASE + path, { waitUntil: 'load' });
  await pagina.waitForSelector(seletorCard, { timeout: 5000 }).catch(() => null);

  const t0 = Date.now();
  let achou = false;
  let efetiva = 0;
  for (;;) {
    const r = await pagina.evaluate((sel) => {
      const el = document.querySelector(sel);
      if (!el) return { achou: false, efetiva: 0 };
      let e = 1;
      for (let n = el; n && n !== document.documentElement; n = n.parentElement) {
        e *= Number(getComputedStyle(n).opacity);
      }
      return { achou: true, efetiva: e };
    }, seletorCard);
    achou = r.achou;
    efetiva = r.efetiva;
    if ((achou && efetiva >= 0.99) || Date.now() - t0 >= 1000) break;
    await pagina.waitForTimeout(20);
  }
  const ms = Date.now() - t0;
  await ctx.close();
  return { achou, efetiva, ms, erros };
}

// /api/teams (SessaoContext, ver a nota lá): fonte de `useTeams()` em
// QUALQUER rota — em /home o InicioContext hidrata-o mais cedo a partir de
// /api/inicio, mas o pedido próprio existe sempre; sem interceção, Feed.jsx
// lia `teams: []` do 404 do preview e caía no estado "sem time" (achado ao
// rodar este teste pela 1ª vez: o card nem chegava a montar).
const TEAMS_FALSO = { teams: [TIME_FALSO] };

const CENARIOS_AUTENTICADOS = [
  { etiqueta: '/feed · card da Resenha', path: '/feed', seletor: '.anim-slide-in', respostas: { '/api/me': ME_ENVELOPE, '/api/teams': TEAMS_FALSO, '/api/feed': FEED_FALSO } },
  { etiqueta: '/home · card do jogo', path: '/home', seletor: '.anim-slide-in', respostas: { '/api/me': ME_ENVELOPE, '/api/teams': TEAMS_FALSO, '/api/inicio': INICIO_FALSO } },
];

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

    // HOTFIX (23-set) — os dois cenários de arranque escondido. Não dependem
    // do tamanho da tela (é sobre animation-play-state, não layout), por isso
    // correm uma vez por rota, fora do loop de TAMANHOS.
    for (const cenario of CENARIOS_OCULTO) {
      const etiquetaOculto = `${rota.path} · ${cenario}`;
      const o = await medirRecuperacaoDeOculto(browser, rota, cenario);
      if (o.efetiva < 0.99) {
        falhas.push(
          `${etiquetaOculto}: NÃO recuperou — opacidade efetiva ${o.efetiva.toFixed(3)} depois de ${o.ms}ms (teto 300ms).`
        );
      } else {
        console.log(`[visibilidade] ok  ${etiquetaOculto} — opacidade efetiva 1 em ${o.ms}ms.`);
      }
      if (o.erros.length) falhas.push(`${etiquetaOculto}: erro de JS — ${o.erros.join(' | ')}`);
    }
  }

  // HOTFIX (24-set, Rodada 21) — /feed e /home, autenticados, data-oculto
  // desde o arranque. Uma vez só (não depende de tamanho de tela nem de
  // rota pública — ver a nota grande em medirCardEscondidoAutenticado).
  for (const cen of CENARIOS_AUTENTICADOS) {
    const a = await medirCardEscondidoAutenticado(browser, cen.path, cen.seletor, cen.respostas);
    if (!a.achou) {
      falhas.push(`${cen.etiqueta}: ${cen.seletor} nunca apareceu no DOM — a tela não montou (ver erros de JS abaixo, se houver).`);
    } else if (a.efetiva < 0.99) {
      falhas.push(`${cen.etiqueta}: NÃO recuperou — opacidade efetiva ${a.efetiva.toFixed(3)} depois de ${a.ms}ms (teto 1000ms).`);
    } else {
      console.log(`[visibilidade] ok  ${cen.etiqueta} — opacidade efetiva 1 em ${a.ms}ms.`);
    }
    if (a.erros.length) falhas.push(`${cen.etiqueta}: erro de JS — ${a.erros.join(' | ')}`);
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
