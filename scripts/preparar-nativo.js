// Tira de dist/ a mídia que o app nativo busca da web, logo antes do cap sync.
// Roda dentro do `npm run build:native`; o `npm run build` normal não o chama,
// então o site continua completo.
//
// A regra de quem sai está em src/utils/avatar.js (PASTAS_REMOTAS) — as duas
// listas têm de bater. Se divergirem, o app pede um arquivo que não existe em
// lado nenhum: no pacote porque foi removido aqui, e na web porque o urlAsset
// não o mandou para lá.
//
// O que FICA de propósito: /fonts (texto não pode depender de rede), /icons,
// e os fundos da figurinha na raiz (stadium_bg, futty-logo-flat, as chapas) —
// esses entram em canvas com crossOrigin desligado e, vindos de outra origem,
// contaminariam o canvas: o toBlob() passaria a lançar e o download da
// figurinha morria.
import { existsSync, rmSync, statSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const DIST = new URL('../dist/', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const REMOVER = ['avatares', 'sorteio-assets', 'sons'];

function tamanho(dir) {
  let total = 0;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    total += e.isDirectory() ? tamanho(p) : statSync(p).size;
  }
  return total;
}

const mb = (b) => (b / 1048576).toFixed(2) + ' MB';

if (!existsSync(DIST)) {
  console.error('[nativo] dist/ não existe — rode o build antes.');
  process.exit(1);
}

console.log('[nativo] dist antes: ' + mb(tamanho(DIST)));
for (const pasta of REMOVER) {
  const alvo = join(DIST, pasta);
  if (!existsSync(alvo)) { console.log('[nativo] (já não existia) ' + pasta); continue; }
  const t = tamanho(alvo);
  rmSync(alvo, { recursive: true, force: true });
  console.log('[nativo] fora: ' + pasta.padEnd(16) + mb(t));
}
console.log('[nativo] dist depois: ' + mb(tamanho(DIST)));
