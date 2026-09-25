// Gancho de resolução (ver registrar.mjs): import relativo sem extensão → tenta .js e .jsx.
//
// RODADA 28 — duas coisas a mais, só para os testes (nunca para o app):
//   · `import.meta.env` nos módulos de src/: o Vite troca-o no build por um objeto; no Node ele não
//     existe e o módulo rebentava ao carregar (ex.: lib/api.js lê VITE_API_URL no topo). Aqui ele
//     vira `globalThis.__FUTTY_ENV__` (o teste põe o que precisar; sem nada, é {});
//   · o cliente Supabase (src/lib/supabase.js) vira scripts/unidade/falsos/supabase.mjs, que
//     devolve o que o teste pôs em `globalThis.__FUTTY_SUPABASE__` — sem rede, sem chave.
import { fileURLToPath } from 'node:url';

const SUPABASE_FALSO = new URL('./falsos/supabase.mjs', import.meta.url).href;

export async function resolve(especificador, contexto, seguinte) {
  if (especificador === './supabase' && contexto.parentURL?.endsWith('/src/lib/supabaseAsync.js')) {
    return { url: SUPABASE_FALSO, shortCircuit: true };
  }
  try {
    return await seguinte(especificador, contexto);
  } catch (erro) {
    const relativo = especificador.startsWith('./') || especificador.startsWith('../');
    if (!relativo || erro?.code !== 'ERR_MODULE_NOT_FOUND' || /\.[a-z]+$/i.test(especificador)) throw erro;
    for (const ext of ['.js', '.jsx']) {
      try {
        return await seguinte(`${especificador}${ext}`, contexto);
      } catch { /* tenta a próxima */ }
    }
    throw erro;
  }
}

export async function load(url, contexto, seguinte) {
  const resultado = await seguinte(url, contexto);
  if (!url.startsWith('file:') || !fileURLToPath(url).replace(/\\/g, '/').includes('/src/')) return resultado;
  const bruto = resultado.source ?? '';
  const fonte = typeof bruto === 'string' ? bruto : Buffer.from(bruto).toString('utf8');
  if (!fonte.includes('import.meta.env')) return resultado;
  return { ...resultado, source: fonte.replaceAll('import.meta.env', '(globalThis.__FUTTY_ENV__ ?? {})') };
}
