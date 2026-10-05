// Futty v2.0 — Rodada 29Z (item 3e): a VARREDURA do celular estreito. Anda pelas telas principais com a conta de demonstração, numa janela
// de 360 × 780 (Galaxy A, Moto G — a largura de muito Android comum; a régua da casa é 390), e mede, DENTRO do navegador, o que a pessoa
// perderia:
//   · rolagem para o lado (a página inteira mais larga que a janela);
//   · campo, botão ou nome CORTADO por um contêiner (o filho passa da borda do pai com overflow escondido) — o defeito do Novo jogo;
//   · texto com reticências (text-overflow: ellipsis com o texto maior que a caixa) — o defeito do Radar;
//   · elemento que passa da borda da janela sem estar numa faixa que rola de propósito;
//   · número com PONTO decimal no texto da tela (o achado do Ranking, "77.9") — vale a lei da 29Z.
//
// Servidor LOCAL e nada gravado (as mesmas duas regras de scripts/loja/capturar-telas.mjs): a base tem de ser localhost, qualquer pedido a
// produção é abortado e reprova, e toda escrita em /api é respondida aqui mesmo.
//
// Uso (a partir de frontend/, com o motor em :3001 e o Vite em :5173/:5174):
//   node scripts/varrer-estreito.mjs --base=http://localhost:5174                 (360 × 780)
//   node scripts/varrer-estreito.mjs --base=http://localhost:5174 --largura=390 --altura=844
//   opções: --so=ranking,novo-jogo   --capturas=<pasta>  (grava um print de cada tela)
// Sai com código 1 se achar qualquer defeito. A demo não é super-admin: Gabinete e Diagnóstico ficam de fora (a prova do navegador cobre o texto deles).
import { readFileSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const AQUI = dirname(fileURLToPath(import.meta.url));
const LOJA = resolve(AQUI, '..', '..', '..', 'LOJA');
const opcao = (nome) => (process.argv.find((a) => a.startsWith(`--${nome}=`)) || '').slice(nome.length + 3);
const BASE = (opcao('base') || 'http://localhost:5173').replace(/\/+$/, '');
const LARGURA = Number(opcao('largura') || 360);
const ALTURA = Number(opcao('altura') || 780);
const so = opcao('so').split(',').filter(Boolean);
const PASTA_CAPTURAS = opcao('capturas') ? resolve(opcao('capturas')) : null;

const fatal = (msg) => { console.error(`\nERRO: ${msg}`); process.exit(2); };
if (!['localhost', '127.0.0.1', '[::1]'].includes(new URL(BASE).hostname)) fatal(`--base=${BASE} não é local: a varredura roda contra o servidor LOCAL, nunca contra produção.`);
const PRODUCAO = /(^|\.)run\.app$|(^|\.)futtyapp\.com\.br$|(^|\.)futty\.pages\.dev$/i;

const estado = JSON.parse(readFileSync(join(LOJA, 'demo-estado.json'), 'utf8'));
const senha = readFileSync(join(LOJA, 'demo-senha.txt'), 'utf8').match(/senha: (.+)/)[1].trim(); // nunca impressa

const SEM_AVISOS = () => {
  localStorage.setItem('futty_cookies', 'aceite');
  localStorage.setItem('futty_tour_done', '1');
  localStorage.setItem('futty_figurinha_estreia', '1');
  localStorage.setItem('futty_agora_nao_nascimento', String(Date.now()));
  localStorage.removeItem('futty_cta_figurinha');
  sessionStorage.setItem('futty_push_dismiss', '1');
  sessionStorage.setItem('futty_votacao_dismiss', '1');
  sessionStorage.setItem('futty_denuncia_desfecho', '1');
};

const slug = estado.teamSlug;
const ROTAS = [
  { id: 'inicio', caminho: '/home', espera: '.app-main' },
  { id: 'time', caminho: `/time/${slug}`, espera: '.app-main' },
  { id: 'jogos', caminho: `/time/${slug}/jogos`, espera: '.app-main' },
  { id: 'novo-jogo', caminho: `/time/${slug}/jogo/novo`, espera: '[data-ingresso]', antes: async (page) => { await page.locator('#local').fill('Society do Guará II'); await page.locator('#hora').fill('20:00'); } },
  { id: 'jogo-passado', caminho: `/time/${slug}/jogo/passado`, espera: '.app-main' },
  { id: 'ranking', caminho: `/time/${slug}/ranking`, espera: '.rank-list .rank-row' },
  { id: 'jogador', caminho: `/time/${slug}/jogador/${estado.ids.Tiãozinho}`, espera: '.app-main' },
  { id: 'meu-jogador', caminho: `/time/${slug}/jogador/${estado.userId}`, espera: '.app-main' },
  { id: 'resenha', caminho: '/feed', espera: '.app-main' },
  { id: 'figurinha', caminho: '/figurinha', espera: '.app-main' },
  { id: 'perfil', caminho: '/perfil', espera: '.app-main' },
  { id: 'planos', caminho: '/planos', espera: '.app-main' },
  { id: 'radar', caminho: '/explorar', espera: '[data-card-do-time]' },
  { id: 'criar-time', caminho: '/criar-time', espera: '.app-main' },
  { id: 'admin', caminho: `/admin/${slug}`, espera: '.app-main' },
  { id: 'alterar-senha', caminho: '/alterar-password', espera: '.app-main' },
  { id: 'termos', caminho: '/termos', espera: 'body' },
  { id: 'privacidade', caminho: '/privacidade', espera: 'body' },
];

import { medir } from './medir-estreito.mjs';

// ── a janela ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
const escritas = [];
const producao = [];
const navegador = await chromium.launch();
const ctx = await navegador.newContext({
  viewport: { width: LARGURA, height: ALTURA }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'pt-BR', timezoneId: 'America/Sao_Paulo', colorScheme: 'dark',
  userAgent: 'Mozilla/5.0 (Linux; Android 14; SM-A146B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36',
  serviceWorkers: 'block', reducedMotion: 'reduce', permissions: ['geolocation'], geolocation: { latitude: -15.815, longitude: -47.905 },
});
await ctx.addInitScript(SEM_AVISOS);
await ctx.route((url) => PRODUCAO.test(url.hostname), (route) => { producao.push(route.request().url()); return route.abort(); });
await ctx.route('**/api/**', (route) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(route.request().method())) return route.continue();
  escritas.push(`${route.request().method()} ${new URL(route.request().url()).pathname}`);
  return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) });
});
const page = await ctx.newPage();
await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
await page.fill('#email', estado.email);
await page.fill('#password', senha);
await page.getByRole('button', { name: 'Entrar', exact: true }).click();
await page.waitForURL('**/home', { timeout: 60000 });

async function assentar() {
  for (let i = 0; i < 30; i += 1) {
    await page.waitForTimeout(400);
    const pronto = await page.evaluate(async () => {
      await document.fonts.ready;
      if (document.querySelector('[role="status"]')) return false;
      if (document.body.innerText.includes('Bola parada')) return false;
      return [...document.images].filter((i) => i.src && !i.hidden).every((i) => i.complete);
    });
    if (pronto && i >= 3) return;
  }
}

let defeitos = 0;
if (PASTA_CAPTURAS) mkdirSync(PASTA_CAPTURAS, { recursive: true });
console.log(`Varredura em ${LARGURA} × ${ALTURA} contra ${BASE} (conta demo, nada gravado)\n`);
for (const rota of ROTAS) {
  if (so.length && !so.includes(rota.id)) continue;
  try {
    await page.goto(`${BASE}${rota.caminho}`, { waitUntil: 'domcontentloaded' });
    await page.locator(rota.espera).first().waitFor({ timeout: 45000 });
    await assentar();
    if (rota.antes) await rota.antes(page);
    await page.evaluate(() => document.activeElement?.blur?.());
    await page.waitForTimeout(500);
    const achados = await page.evaluate(medir, LARGURA);
    if (PASTA_CAPTURAS) await page.screenshot({ path: join(PASTA_CAPTURAS, `${rota.id}-${LARGURA}.png`), animations: 'disabled', caret: 'hide', fullPage: process.argv.includes('--completa') });
    if (!achados.length) { console.log(`  ✔ ${rota.id}`); continue; }
    defeitos += achados.length;
    console.log(`  ✖ ${rota.id}`);
    const vistos = new Set();
    for (const a of achados) { const linha = `${a.tipo}: ${a.detalhe}`; if (!vistos.has(linha)) { vistos.add(linha); console.log(`      · ${linha}`); } }
  } catch (e) {
    defeitos += 1;
    console.log(`  ✖ ${rota.id}\n      · não abriu: ${e.message.split('\n')[0]}`);
  }
}
await navegador.close();

if (escritas.length) console.log(`\n· ${escritas.length} escrita(s) respondida(s) sem chegar ao banco: ${[...new Set(escritas)].join(', ')}`);
if (producao.length) { console.error(`\nREPROVADO: ${producao.length} pedido(s) a produção foram abortados:\n${[...new Set(producao)].slice(0, 10).join('\n')}`); process.exit(1); }
console.log(defeitos ? `\n${defeitos} defeito(s) em ${LARGURA} × ${ALTURA}.` : `\nNenhum defeito em ${LARGURA} × ${ALTURA}.`);
process.exit(defeitos ? 1 : 0);
