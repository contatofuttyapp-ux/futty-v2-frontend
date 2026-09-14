#!/usr/bin/env node
// Futty v2.0 — O app ABRE VISÍVEL? (build 11)
//
// Existe por causa de um bug que passou builds despercebido e chegou ao iPhone:
// a página inteira montava no DOM, sem um único erro no console, mas o wrapper
// da rota ficava preso em opacity 0 — só se via o fundo e o aviso de cookies.
// Nenhum teste de unidade apanha isto: o HTML está lá, o React não falhou, o que
// falhou foi a animação de entrada nunca ter terminado (ver PageTransition.jsx).
// Só medindo a opacidade COMPUTADA num browser de verdade é que se vê.
//
// Sobe o preview do dist sozinho, abre as rotas públicas (sem login) em dois
// tamanhos e exige que o wrapper [data-page] esteja em opacity 1 até 1,5 s
// depois do load. Corre no `npm run build`, portanto também no CI do iPhone.
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

// Só rotas públicas: o teste não faz login, e é justamente o visitante sem
// sessão que apanhava o bug (com sessão o "/" salta para /home e não passa lá).
const ROTAS = ['/', '/login'];
const TAMANHOS = [
  { nome: 'celular', width: 390, height: 844 },
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
  await pagina.goto(BASE + rota, { waitUntil: 'load' });
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
    return {
      achou: true,
      opacity: cs.opacity,
      efetiva,
      visibility: cs.visibility,
      display: cs.display,
      texto: (el.innerText || '').replace(/\s+/g, ' ').trim().length,
    };
  });
  await ctx.close();
  return { ...r, erros };
}

const servidor = await subirServidor();
const browser = await chromium.launch();
const falhas = [];
try {
  for (const rota of ROTAS) {
    for (const tamanho of TAMANHOS) {
      const r = await medir(browser, rota, tamanho);
      const etiqueta = `${rota} @ ${tamanho.nome} (${tamanho.width}x${tamanho.height})`;
      if (!r.achou) {
        falhas.push(`${etiqueta}: não há [data-page] no DOM — o wrapper da página não montou.`);
        continue;
      }
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
      if (r.erros.length) falhas.push(`${etiqueta}: erro de JS — ${r.erros.join(' | ')}`);
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
