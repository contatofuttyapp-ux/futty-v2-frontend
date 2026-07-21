// Copiar texto com fallback — navigator.clipboard falha em http/permissões
// nalguns Androids; nesses casos cai para select()+execCommand('copy').
// Devolve true/false para o chamador dar feedback explícito (nunca silêncio).
export async function copiarTexto(texto) {
  if (!texto) return false;
  // Caminho moderno (contexto seguro).
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(texto);
      return true;
    }
  } catch {
    // cai para o fallback
  }
  // Fallback legacy: textarea fora do ecrã + execCommand.
  try {
    const ta = document.createElement('textarea');
    ta.value = texto;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.top = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    ta.setSelectionRange(0, ta.value.length);
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}
