// Futty v2.0 — O texto de uma página grande que foi dividida, MONTADO como era: src/pages/<Nome>.jsx com cada <Componente … /> da
// pasta da página (src/pages/<nome>/) trocado pelo JSX que ele devolve, no mesmo lugar — a ordem dos elementos na página fica a de
// sempre —, seguido do texto inteiro dos módulos da pasta (as ações, os hooks, as constantes). Os testes que leem o código da página
// leem daqui.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PAGINAS = fileURLToPath(new URL('../../src/pages/', import.meta.url));

/** O JSX que um componente `export default function Nome({…}) { return ( … ); }` devolve. */
function jsxDevolvido(texto) {
  const m = texto.replace(/\r\n/g, '\n').match(/export default function \w+\([^)]*\) \{\n {2}return \(\n([\s\S]*?)\n {2}\);\n\}/);
  return m ? m[1] : null;
}

/** A página (dividida ou não) importa cada um destes nomes de um módulo cujo caminho termina em `modulo`? (em qualquer arquivo dela) */
export function importaDe(texto, nomes, modulo) {
  const imports = [...texto.matchAll(/import ([^;]+?) from '([^']+)';/g)].filter((m) => m[2].endsWith(modulo)).map((m) => m[1]);
  return nomes.every((n) => imports.some((lista) => new RegExp(`(^|[\\s{,])${n}($|[\\s},])`).test(lista)));
}

/** O texto de um arquivo; se for uma página dividida (src/pages/X.jsx com a pasta x/), a página montada. */
export function lerArquivoOuPagina(raiz, rel) {
  const m = rel.match(/^src\/pages\/([A-Z]\w*)\.jsx$/);
  if (m && fs.existsSync(path.join(PAGINAS, m[1].charAt(0).toLowerCase() + m[1].slice(1)))) return lerPagina(m[1]);
  return fs.readFileSync(path.join(raiz, rel), 'utf8');
}

export function lerPagina(nome) {
  const pasta = path.join(PAGINAS, nome.charAt(0).toLowerCase() + nome.slice(1));
  let principal = fs.readFileSync(path.join(PAGINAS, `${nome}.jsx`), 'utf8');
  const modulos = fs.existsSync(pasta) ? fs.readdirSync(pasta).filter((n) => /\.(jsx?|mjs)$/.test(n)).sort() : [];
  const textos = Object.fromEntries(modulos.map((f) => [f, fs.readFileSync(path.join(pasta, f), 'utf8')]));
  const montados = new Set();
  // Monta: troca cada uso de componente da pasta pelo JSX dele (de novo, até não sobrar nenhum — um filho pode usar outro).
  for (let volta = 0; volta < 5; volta += 1) {
    let trocou = false;
    for (const f of modulos.filter((n) => n.endsWith('.jsx'))) {
      const comp = path.basename(f, '.jsx');
      const jsx = jsxDevolvido(textos[f]);
      if (!jsx) continue;
      const uso = new RegExp(`<${comp}(?: [A-Za-z_$][\\w$]*=\\{[A-Za-z_$][\\w$]*\\})* />`, 'g');
      principal = principal.replace(uso, () => { trocou = true; montados.add(f); return jsx.trim(); });
      for (const g of modulos) if (g !== f) textos[g] = textos[g].replace(uso, () => { trocou = true; montados.add(f); return jsx.trim(); });
    }
    if (!trocou) break;
  }
  // No fim, os módulos que não viraram JSX montado (as ações, os hooks, as constantes) — os montados já estão no lugar deles.
  // Dos montados, só os imports (o JSX já está no lugar): é por eles que se sabe o que a página importa.
  const importsDosMontados = modulos.filter((f) => montados.has(f)).flatMap((f) => textos[f].match(/^import [^;]+;$/gm) || []);
  return [principal, ...modulos.filter((f) => !montados.has(f)).map((f) => textos[f]), ...importsDosMontados].join('\n');
}
