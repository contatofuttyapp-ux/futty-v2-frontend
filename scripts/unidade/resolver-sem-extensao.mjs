// Gancho de resolução (ver registrar.mjs): import relativo sem extensão → tenta .js e .jsx.
export async function resolve(especificador, contexto, seguinte) {
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
