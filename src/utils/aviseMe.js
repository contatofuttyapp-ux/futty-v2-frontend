// Futty v2.0 — Rodada 29B (F): o que a tela "Avise-me" decide sozinha (puro, sem React nem rede). O motor valida de novo
// (backend/utils/aviseMe.js): aqui só se poupa a ida quando o erro é óbvio e se diz de onde a pessoa veio.

/** Parece um e-mail? Só o óbvio (algo@dominio.tld, sem espaço) — quem decide é o motor. */
export function emailParecePronto(valor) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(valor ?? '').trim());
}

/**
 * De onde a pessoa veio, para a lista: utm_source[:utm_campaign] (o que as redes põem no link), senão `ref`, senão o
 * padrão da tela. O motor limpa e limita o texto; aqui só se junta.
 */
export function origemDaUrl(search, padrao = 'site') {
  const p = new URLSearchParams(search || '');
  const fonte = (p.get('utm_source') || '').trim();
  const campanha = (p.get('utm_campaign') || '').trim();
  if (fonte) return campanha ? `${fonte}:${campanha}` : fonte;
  return (p.get('ref') || '').trim() || padrao;
}

export const TEXTOS_AVISE_ME = {
  titulo: 'Quero ser avisado quando o Futty chegar nas lojas',
  botao: 'Quero ser avisado',
  consentimento: 'Ao enviar, você autoriza o Futty a usar seu e-mail só para avisar do lançamento.',
  sair: 'Você pode sair da lista quando quiser.',
  emailInvalido: 'Esse e-mail não parece certo. Confira e tente de novo.',
  feito: 'Anotado! A gente avisa você por e-mail quando o Futty chegar nas lojas.',
};
