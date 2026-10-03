// Futty v2.0 — Rodada 29I (achado 103): as rotas em português de Portugal viraram PT-BR (/equipa → /time, /criar-equipa → /criar-time,
// ?tab=equipa → ?tab=time), e as antigas continuam valendo: link que já foi para o grupo do WhatsApp, favorito, notificação já enviada.
// Puro (sem React), para testar no Node; App.jsx e AdminPanel.jsx usam estas contas.

/** O caminho novo de um endereço antigo de time: /equipa/missa/jogo/9 → /time/missa/jogo/9. O que não é /equipa fica como está. */
export function caminhoNovoDeEquipa(pathname) {
  return String(pathname ?? '').replace(/^\/equipa(?=\/|$)/, '/time').replace(/^\/criar-equipa(?=\/|$)/, '/criar-time');
}

/** A aba do painel do admin: ?tab=equipa (o nome antigo) é a mesma aba que ?tab=time. Sem aba, o dashboard. */
export function abaDoAdmin(parametro) {
  const aba = parametro || 'dashboard';
  return aba === 'equipa' ? 'time' : aba;
}
