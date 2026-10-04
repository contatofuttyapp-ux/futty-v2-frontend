// Futty v2.0 — Rodada 29T-C: o "Agora não" dos lembretes sem prazo do Início. Esconde o lembrete por 7 dias NAQUELE aparelho (localStorage) e a fila anda;
// passados os 7 dias ele volta sozinho. Puro: o armazém e o relógio entram por parâmetro, o teste roda no Node. Tudo com try/catch — o localStorage some em
// janela privada, com dados bloqueados e em pré-visualização; sem ele o lembrete só fica escondido enquanto a tela está aberta (o Início guarda o mesmo em estado).
export const DIAS_DO_AGORA_NAO = 7;
const DURACAO_MS = DIAS_DO_AGORA_NAO * 24 * 60 * 60 * 1000;
const PREFIXO = 'futty_agora_nao_';

function armazemDoAparelho() {
  try { return globalThis.localStorage || null; } catch { return null; }
}

/** O "Agora não" deste lembrete ainda vale? Valeu há menos de 7 dias; relógio que andou para trás (marca no futuro) não esconde nada. */
export function lembreteEscondido(id, agora = Date.now(), armazem = armazemDoAparelho()) {
  try {
    const quando = Number(armazem?.getItem(`${PREFIXO}${id}`));
    return Number.isFinite(quando) && quando > 0 && quando <= agora && agora - quando < DURACAO_MS;
  } catch {
    return false;
  }
}

/** Grava o "Agora não" de agora. Devolve false quando o aparelho não deixou guardar (o lembrete some só desta vez). */
export function esconderLembrete(id, agora = Date.now(), armazem = armazemDoAparelho()) {
  try {
    armazem.setItem(`${PREFIXO}${id}`, String(agora));
    return true;
  } catch {
    return false;
  }
}

/** Dos ids dados, o conjunto dos que estão escondidos agora. */
export function lembretesEscondidos(ids, agora = Date.now(), armazem = armazemDoAparelho()) {
  return new Set(ids.filter((id) => lembreteEscondido(id, agora, armazem)));
}
