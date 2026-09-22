#!/usr/bin/env node
// Futty v2.0 — PROVA DO FLUXO REAL: trocar a foto e ver o cromo (22-set).
//
// O relato do dono: "no Início já deu certo, na Figurinha ainda está a foto
// antiga". A prova sintética (plantar um cache velho) NÃO reproduziu — o
// /api/me de um backend local responde rápido demais para o cache chegar a
// mandar. Então faz-se o que ele fez, na ordem em que ele fez, num navegador
// de verdade, e olha-se para cada passo.
//
//   1. abre /figurinha e regista a figurinha que está lá
//   2. troca a foto pela rota real (o mesmo input de ficheiro da tela)
//   3. regista o que a tela passa a mostrar ANTES de gerar
//   4. toca em Gerar e espera
//   5. regista a figurinha nova
//   6. vai ao Início, volta à Figurinha (navegação normal, sem F5)
//   7. regista o que cada tela mostra no fim
//
// Cada figurinha é um caminho diferente no bucket, por isso o token do proxy
// de mídia identifica-a sem ambiguidade: é o que se compara.
//
// Uso (a partir de FUTTY-V2/frontend):
//   node scripts/prova-troca-foto.mjs --url http://localhost:5174 --etiqueta ANTES
//
// CUSTA UMA GERAÇÃO (~US$0,05) — passa mesmo pela fal.
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
const FOTO_NOVA = opcao('foto', path.join(RAIZ, '..', '..', 'BANCADA-FOTOS', 'Gui.jpeg'));
const PASTA = path.join(RAIZ, 'scripts', 'capturas');

function lerSenha() {
  const bruto = readFileSync(path.join(RAIZ, '..', '..', 'LOJA', 'demo-senha.txt'), 'utf8');
  const linha = bruto.split(/\r?\n/).map((l) => l.trim()).filter(Boolean).pop() || '';
  return linha.includes(':') ? linha.split(':').pop().trim() : linha;
}

// O caminho do objeto vive DENTRO do token do proxy (base64url do {b,p,e,v}).
// Lê-se de lá: é o que distingue uma figurinha da seguinte sem depender de
// pixels. Só interessam os ficheiros DESTA conta — a tela busca também os
// avatares dos companheiros de time, e na primeira versão isto confundia o
// avatar de outra pessoa com a figurinha do dono.
const DONO = opcao('id', '37e2c87d-571f-4476-9dd9-4292dfc945d3');
function objetoDoToken(url) {
  const m = String(url || '').match(/\/api\/media\/([A-Za-z0-9_-]+)/);
  if (!m) return null;
  try {
    const corpo = JSON.parse(Buffer.from(m[1].split('.')[0], 'base64url').toString());
    const nome = (corpo.p || '').split('/').pop();
    return nome.startsWith(DONO) ? nome : null;
  } catch { return null; }
}

const navegador = await chromium.launch();
const ctx = await navegador.newContext({ viewport: { width: 1280, height: 900 }, serviceWorkers: 'block' });
const pagina = await ctx.newPage();

// Toda imagem que a app for buscar fica registada, com o momento.
const t0 = Date.now();
const imagens = [];
pagina.on('request', (r) => {
  const obj = objetoDoToken(r.url());
  if (obj) imagens.push({ aos_ms: Date.now() - t0, obj });
});
const passos = [];
// A figurinha é o ficheiro "-ai-<kit>-"; a foto é o outro. Interessa a
// figurinha, que é o que o cromo desenha.
const ultimaFigurinha = () => [...imagens].reverse().find((i) => i.obj.includes('-ai-'))?.obj || null;
const registar = async (rotulo) => {
  const ultima = ultimaFigurinha();
  const texto = await pagina.locator('body').innerText().catch(() => '');
  const passo = {
    passo: rotulo,
    ultima_imagem_buscada: ultima,
    mostra_gere_seu_avatar: /gere seu avatar/i.test(texto),
    botao_foto: /Trocar foto/.test(texto) ? 'Trocar foto' : (/Adicionar foto/.test(texto) ? 'Adicionar foto' : '—'),
  };
  passos.push(passo);
  console.log(`  [${rotulo}] imagem: ${ultima || '(nenhuma)'} · ${passo.botao_foto}${passo.mostra_gere_seu_avatar ? ' · "gere seu avatar"' : ''}`);
  await pagina.screenshot({ path: path.join(PASTA, `troca-foto-${ETIQUETA}-${rotulo}.png`) });
  return passo;
};

mkdirSync(PASTA, { recursive: true });
console.log(`\nPROVA DO FLUXO REAL "${ETIQUETA}" · ${BASE}\n${'='.repeat(74)}`);

// ── entrar ──
await pagina.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
await pagina.waitForSelector('input[type="email"]', { timeout: 30000 });
await pagina.fill('input[type="email"]', EMAIL);
await pagina.fill('input[type="password"]', lerSenha());
await pagina.click('button[type="submit"]');
await pagina.waitForURL('**/home', { timeout: 45000 });
await pagina.waitForTimeout(3000);
await pagina.evaluate(() => { try { localStorage.setItem('futty_figurinha_estreia', '1'); } catch { /* nada */ } });

// ── 1. a Figurinha como estava ──
await pagina.goto(`${BASE}/figurinha`, { waitUntil: 'domcontentloaded' });
await pagina.waitForTimeout(6000);
const antes = await registar('1-figurinha-inicial');

// ── 2. trocar a foto pelo caminho da tela ──
await pagina.locator('button', { hasText: /Trocar foto|Adicionar foto/ }).first().click();
await pagina.waitForTimeout(1200);
const entradas = pagina.locator('input[type="file"]');
await entradas.first().setInputFiles(FOTO_NOVA);
// O recorte, se aparecer, confirma-se.
await pagina.waitForTimeout(2500);
const confirmar = pagina.locator('button', { hasText: /Confirmar|Usar esta|Pronto|Salvar/i }).first();
if (await confirmar.count() && await confirmar.isVisible().catch(() => false)) {
  await confirmar.click();
}
await pagina.waitForTimeout(9000); // upload + resposta

// ── 3. o que a tela mostra ANTES de gerar ──
const semGerar = await registar('2-foto-trocada-sem-gerar');

// ── 4. gerar ──
const botaoGerar = pagina.locator('button', { hasText: /Gerar/i }).first();
let gerou = false;
if (await botaoGerar.count() && await botaoGerar.isEnabled().catch(() => false)) {
  await botaoGerar.click();
  console.log('  [gerar] clicado — a esperar a fal (até 3 min)...');
  await pagina.waitForFunction(() => !/Gerando/i.test(document.body.innerText), null, { timeout: 190000 }).catch(() => {});
  await pagina.waitForTimeout(6000);
  gerou = true;
}
const depoisGerar = await registar('3-depois-de-gerar');

// ── 5. Início e volta (navegação normal, sem recarregar) ──
await pagina.locator('nav a, nav button, a[href="/home"]').filter({ hasText: /INÍCIO/i }).first().click().catch(async () => {
  await pagina.goto(`${BASE}/home`, { waitUntil: 'domcontentloaded' });
});
await pagina.waitForTimeout(7000);
const noInicio = await registar('4-inicio');

await pagina.locator('nav a, nav button, a[href="/figurinha"]').filter({ hasText: /FIGURINHA/i }).first().click().catch(async () => {
  await pagina.goto(`${BASE}/figurinha`, { waitUntil: 'domcontentloaded' });
});
await pagina.waitForTimeout(7000);
const devolta = await registar('5-figurinha-de-volta');

// ── veredicto ──
const relatorio = { etiqueta: ETIQUETA, url: BASE, gerou, passos, imagens };
writeFileSync(path.join(PASTA, `troca-foto-${ETIQUETA}.json`), JSON.stringify(relatorio, null, 2));

console.log(`${'='.repeat(74)}`);
const figInicial = antes.ultima_imagem_buscada;
const figFinal = devolta.ultima_imagem_buscada;
console.log(`figurinha no início : ${figInicial}`);
console.log(`figurinha no fim    : ${figFinal}`);
console.log(`no Início mostrou   : ${noInicio.ultima_imagem_buscada}`);
console.log('');
if (!gerou) {
  console.log('VEREDICTO: não deu para tocar em Gerar — ver as capturas.');
} else if (figFinal && figInicial && figFinal === figInicial) {
  console.log('VEREDICTO: a Figurinha continua com a figurinha ANTIGA. Bug reproduzido.');
} else if (figFinal && figFinal !== figInicial) {
  console.log('VEREDICTO: a Figurinha mostra a figurinha NOVA. Sem bug neste fluxo.');
} else {
  console.log('VEREDICTO: inconclusivo — ver o JSON.');
}
console.log(`capturas em scripts/capturas/troca-foto-${ETIQUETA}-*.png\n`);

await ctx.close();
await navegador.close();
