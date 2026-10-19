// Futty v2.0 — O texto de uma página grande que foi dividida: src/pages/<Nome>.jsx seguido dos módulos da pasta dela
// (src/pages/<nome>/*.js|jsx, em ordem alfabética). Os testes que leem o código da página leem daqui.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PAGINAS = fileURLToPath(new URL('../../src/pages/', import.meta.url));

export function lerPagina(nome) {
  const partes = [fs.readFileSync(path.join(PAGINAS, `${nome}.jsx`), 'utf8')];
  const pasta = path.join(PAGINAS, nome.charAt(0).toLowerCase() + nome.slice(1));
  if (fs.existsSync(pasta)) {
    for (const f of fs.readdirSync(pasta).filter((n) => /\.(jsx?|mjs)$/.test(n)).sort()) partes.push(fs.readFileSync(path.join(pasta, f), 'utf8'));
  }
  return partes.join('\n');
}
