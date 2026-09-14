// Futty v2.0 — Último erro fatal (ErrorBoundary), guardado para o Pedro ler
// depois em Perfil → Diagnóstico (build 10, achado real: o app não abria
// depois de um deploy e ninguém tinha o console do Chrome remoto no bolso
// para ver porquê). localStorage, não a caixa-preta em memória de
// lib/diagnostico.js: o crash costuma vir seguido de um reload (ver
// lazyComRetry.js), que apagaria qualquer coisa guardada só em memória.
const CHAVE = 'futty_ultimo_erro';

export function gravarUltimoErro(erro, rota) {
  try {
    const registo = {
      mensagem: String(erro?.message || erro || '').slice(0, 300),
      stackCurto: String(erro?.stack || '').split('\n').slice(0, 4).join('\n').slice(0, 500),
      rota: rota || (typeof window !== 'undefined' ? window.location.pathname : ''),
      data: new Date().toISOString(),
    };
    localStorage.setItem(CHAVE, JSON.stringify(registo));
  } catch {
    /* storage bloqueado/cheio — não é o crash que importa agora */
  }
}

export function lerUltimoErro() {
  try {
    const bruto = localStorage.getItem(CHAVE);
    return bruto ? JSON.parse(bruto) : null;
  } catch {
    return null;
  }
}

export function limparUltimoErro() {
  try {
    localStorage.removeItem(CHAVE);
  } catch {
    /* ignora */
  }
}
