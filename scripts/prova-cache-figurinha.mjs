#!/usr/bin/env node
// Futty v2.0 — PROVA: a Figurinha fica presa no cache do aparelho? (22-set)
//
// Relato do dono: depois de trocar a foto, o Início mostrava a nova e a
// Figurinha continuava com a antiga — no PC dele. A suspeita não é o aparelho:
// é que esta página semeia o espelho local `me` com o PRIMEIRO perfil que
// chega, e o PerfilContext entrega primeiro o CACHE LOCAL e só depois o
// /api/me fresco.
//
// Isto mede sem opinião. Entra na conta demo, rouba o cache que o app acabou
// de gravar, TROCA nele o avatar_url por um marcador impossível de confundir
// (/api/media/CACHE-VELHO-...), abre /figurinha com esse cache já no sítio, e
// olha para duas coisas:
//
//   1. que imagem a página foi buscar — a do marcador (ficou no cache) ou a
//      real (ouviu o fresco);
//   2. se o controlo "TAMANHO" aparece. Ele só existe quando `avatarEhIA` é
//      verdadeiro, e é o mesmo booleano que decide o que entra no cromo.
//
// Uso (a partir de FUTTY-V2/frontend):
//   node scripts/prova-cache-figurinha.mjs --url http://localhost:5174 --etiqueta depois
//
// Não escreve nada no banco: só GETs e a leitura do localStorage.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const RAIZ = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const opcao = (n, o) => { const i = args.indexOf(`--${n}`); return i >= 0 && args[i + 1] ? args[i + 1] : o; };

const BASE = opcao('url', 'http://localhost:5174').replace(/\/+$/, '');
const EMAIL = opcao('email', 'demo-loja@futtymock.com');
const ETIQUETA = opcao('etiqueta', 'atual');
const ESPERA_MS = Number(opcao('espera', '9000'));
const MARCADOR = `CACHE-VELHO-${Date.now()}`;
const PASTA = path.join(RAIZ, 'scripts', 'capturas');

function lerSenha() {
  const bruto = readFileSync(path.join(RAIZ, '..', '..', 'LOJA', 'demo-senha.txt'), 'utf8');
  const linha = bruto.split(/\r?\n/).map((l) => l.trim()).filter(Boolean).pop() || '';
  return linha.includes(':') ? linha.split(':').pop().trim() : linha;
}

const navegador = await chromium.launch();

// ── 1. Entrar e apanhar sessão + o cache que o app gravou sozinho ──
// serviceWorkers: 'block' — com o SW ligado o route() não intercepta e o
// armazenamento não é o que se pensa que é (achado de rodadas anteriores).
const ctxLogin = await navegador.newContext({ viewport: { width: 1280, height: 900 }, serviceWorkers: 'block' });
const pLogin = await ctxLogin.newPage();
await pLogin.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
await pLogin.waitForSelector('input[type="email"]', { timeout: 30000 });
await pLogin.fill('input[type="email"]', EMAIL);
await pLogin.fill('input[type="password"]', lerSenha());
await pLogin.click('button[type="submit"]');
await pLogin.waitForURL('**/home', { timeout: 45000 });
await pLogin.waitForTimeout(3500); // deixa o /api/me responder e gravar o cache

const colhido = await pLogin.evaluate(() => {
  const sessao = Object.keys(localStorage)
    .filter((k) => /^sb-.+-auth-token$/.test(k))
    .map((name) => ({ name, value: localStorage.getItem(name) }));
  const chaveMe = Object.keys(localStorage).find((k) => /^futty_cache_v1:.+:me$/.test(k));
  return { sessao, chaveMe, cacheMe: chaveMe ? localStorage.getItem(chaveMe) : null };
});
await ctxLogin.close();
if (!colhido.sessao.length) throw new Error('entrou, mas não achou a sessão do Supabase');
if (!colhido.cacheMe) throw new Error('o app não gravou cache de `me` — sem isso não há o que provar');

const pacote = JSON.parse(colhido.cacheMe);
const avatarReal = pacote.dados?.user?.avatar_url || null;
const fotoReal = pacote.dados?.user?.foto_url || null;
if (!avatarReal || avatarReal === fotoReal) {
  throw new Error('a conta precisa de ter figurinha IA gerada (avatar_url ≠ foto_url) para esta prova valer');
}

// ── 2. O cache adulterado: tudo igual, menos o avatar_url ──
const avatarDoCache = `/api/media/${MARCADOR}`;
const cacheVelho = { ...pacote, dados: { ...pacote.dados, user: { ...pacote.dados.user, avatar_url: avatarDoCache } } };

const ctx = await navegador.newContext({
  viewport: { width: 1280, height: 900 },
  serviceWorkers: 'block',
  storageState: {
    cookies: [],
    origins: [{
      origin: BASE,
      localStorage: [
        ...colhido.sessao,
        { name: colhido.chaveMe, value: JSON.stringify(cacheVelho) },
        // A estreia já vista: sem isto a página abre no flow de 1ª visita.
        { name: 'futty_figurinha_estreia', value: '1' },
      ],
    }],
  },
});
// O /api/me de um backend LOCAL responde em ~250 ms — depressa demais para o
// cache chegar a mandar na tela, e por isso a primeira versão desta prova dava
// "sem bug" mesmo no código sem correção. Em produção o motor está em São Paulo
// e o celular numa rede qualquer: é aí que o cache pinta primeiro e o fresco
// chega depois. `--atraso` reproduz essa corrida, que é a condição do defeito.
const ATRASO_MS = Number(opcao('atraso', '2500'));
if (ATRASO_MS > 0) {
  await ctx.route('**/api/me', async (route) => {
    await new Promise((r) => setTimeout(r, ATRASO_MS));
    return route.continue();
  });
}
const pagina = await ctx.newPage();

const pedidos = [];
pagina.on('request', (r) => {
  const u = r.url();
  if (u.includes('/api/media/') || u.includes('/api/me')) pedidos.push({ ms: Date.now(), url: u });
});
// Sem isto a prova diz "inconclusivo" e não diz porquê: o /api/me pode ter
// falhado, ou o cache plantado pode nem ter sido lido.
const respostas = [];
pagina.on('response', async (r) => {
  if (!r.url().endsWith('/api/me')) return;
  const corpo = await r.json().catch(() => null);
  respostas.push({ status: r.status(), user: corpo?.user ? { foto_url: corpo.user.foto_url, avatar_url: corpo.user.avatar_url } : null });
});
const consola = [];
pagina.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') consola.push(m.text().slice(0, 160)); });
pagina.on('pageerror', (e) => consola.push(`pageerror: ${String(e).slice(0, 160)}`));

const t0 = Date.now();
await pagina.goto(`${BASE}/figurinha`, { waitUntil: 'domcontentloaded' });
await pagina.waitForTimeout(ESPERA_MS);

// ── 3. O que a página fez ──
const pediuDoCache = pedidos.some((p) => p.url.includes(MARCADOR));
const pediuOReal = pedidos.some((p) => p.url.includes(avatarReal.split('/').pop().split('?')[0]));
// "TAMANHO" só é pintado quando avatarEhIA é verdadeiro — o mesmo booleano que
// decide se o cromo leva a figurinha ou o avatar genérico da casa.
const temZoom = await pagina.locator('text=TAMANHO').first().isVisible().catch(() => false)
  || (await pagina.locator('[aria-label="Aumentar tamanho do avatar"]').count()) > 0;
// O que a página tem em mão no fim: o cache plantado sobreviveu, e o botão de
// foto diz "Trocar" (tem avatar) ou "Adicionar" (não tem).
const estadoFinal = await pagina.evaluate((chave) => {
  const bruto = localStorage.getItem(chave);
  let doCache = null;
  try { doCache = JSON.parse(bruto)?.dados?.user?.avatar_url ?? null; } catch { /* nada */ }
  const botao = [...document.querySelectorAll('button')].find((b) => /foto/i.test(b.textContent || ''));
  return { avatarNoCacheAgora: doCache, textoBotaoFoto: botao ? botao.textContent.trim() : '(não achei)' };
}, colhido.chaveMe);

mkdirSync(PASTA, { recursive: true });
await pagina.screenshot({ path: path.join(PASTA, `cache-figurinha-${ETIQUETA}.png`), fullPage: false });

const relatorio = {
  etiqueta: ETIQUETA,
  url: BASE,
  avatar_real: avatarReal.slice(-28),
  avatar_no_cache: avatarDoCache,
  pediu_a_imagem_do_cache: pediuDoCache,
  pediu_a_imagem_real: pediuOReal,
  controlo_tamanho_visivel: temZoom,
  pedidos: pedidos.map((p) => ({ aos_ms: p.ms - t0, url: p.url.replace(BASE, '').slice(0, 110) })),
};
writeFileSync(path.join(PASTA, `cache-figurinha-${ETIQUETA}.json`), JSON.stringify(relatorio, null, 2));

console.log(`\n${'='.repeat(74)}`);
console.log(`PROVA "${ETIQUETA}" · ${BASE}`);
console.log(`${'='.repeat(74)}`);
console.log(`avatar real (fim do URL) : …${relatorio.avatar_real}`);
console.log(`avatar plantado no cache : ${avatarDoCache}`);
console.log('');
console.log(`pediu a imagem DO CACHE  : ${pediuDoCache ? 'SIM  ← preso no cache' : 'não'}`);
console.log(`pediu a imagem REAL      : ${pediuOReal ? 'SIM  ← ouviu o /api/me fresco' : 'não'}`);
console.log(`controlo "TAMANHO"       : ${temZoom ? 'visível' : 'ausente'}`);
console.log(`botão da foto            : ${estadoFinal.textoBotaoFoto}`);
console.log(`avatar no cache no fim   : ${estadoFinal.avatarNoCacheAgora}`);
console.log(`/api/me respondeu        : ${JSON.stringify(respostas)}`);
if (consola.length) console.log(`console                  : ${consola.slice(0, 4).join(' | ')}`);
console.log('');
for (const p of relatorio.pedidos) console.log(`  ${String(p.aos_ms).padStart(5)}ms  ${p.url}`);
console.log(`${'='.repeat(74)}`);
console.log(pediuDoCache && !pediuOReal
  ? 'VEREDICTO: a página ficou com a figurinha do cache. Bug reproduzido.'
  : pediuOReal
    ? 'VEREDICTO: a página trocou para a figurinha real. Corrigido.'
    : 'VEREDICTO: inconclusivo — não pediu nenhuma das duas (ver pedidos acima).');
console.log(`captura e JSON em scripts/capturas/cache-figurinha-${ETIQUETA}.*\n`);

await ctx.close();
await navegador.close();
