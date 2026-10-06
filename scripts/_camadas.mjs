// Futty v2.0 — as camadas do "ouro vivo" no tamanho cheio, renderizadas pela receita da bancada
// (backend/scripts/_bench/testar-icone.js: o F real de futtyMonograma.js em ouro com degradê, reflexo e
// brilho, sobre a vinheta SEM aro).
//
// A receita vive no backend e o sharp do backend é OUTRA cópia do libvips (a do frontend é a 0.32, a do
// backend a 0.35): as duas no mesmo processo derrubam o Node (segfault). Por isso a renderização roda num
// processo filho do backend (scripts/_bench/renderizar-camadas.js), que grava PNG numa pasta temporária;
// aqui eles voltam como Buffer, para o gerar-icones.mjs e o gerar-splash.mjs comporem, redimensionarem e
// gravarem com o sharp do frontend.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const BACKEND = path.resolve(RAIZ, '..', 'backend');
const RENDERIZADOR = path.join(BACKEND, 'scripts', '_bench', 'renderizar-camadas.js');

/**
 * Renderiza as camadas e devolve { fundo, frente, splashF }:
 *   fundo   — a vinheta #1a1826 → #0b0a12 sem aro, 1024×1024, sem alfa (a camada de fundo do ícone adaptativo);
 *   frente  — o F ouro vivo com o brilho, transparente, 1024×1024, na zona segura (66/108) (a camada da frente);
 *   splashF — (só se pedir `splashAltura`) o F ouro vivo com o brilho, transparente, com `splashAltura` px de altura, num quadrado de ~altura/0,74.
 */
export function renderizarCamadas({ splashAltura } = {}) {
  if (!existsSync(RENDERIZADOR)) {
    throw new Error(`não achei ${RENDERIZADOR}: a receita do ícone mora no repositório backend (FUTTY-V2/backend, ramo dev), ao lado deste, com o npm install feito`);
  }
  const pasta = mkdtempSync(path.join(tmpdir(), 'futty-camadas-'));
  try {
    const args = [RENDERIZADOR, `--saida=${pasta}`];
    if (splashAltura) args.push(`--splash-altura=${splashAltura}`);
    execFileSync(process.execPath, args, { cwd: BACKEND, stdio: ['ignore', 'pipe', 'inherit'] });
    return {
      fundo: readFileSync(path.join(pasta, 'adaptativo-fundo-1024.png')),
      frente: readFileSync(path.join(pasta, 'adaptativo-frente-1024.png')),
      splashF: splashAltura ? readFileSync(path.join(pasta, `splash-f-${splashAltura}.png`)) : undefined,
    };
  } finally {
    rmSync(pasta, { recursive: true, force: true });
  }
}
