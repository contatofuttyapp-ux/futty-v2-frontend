// Rotas antigas em português de Portugal → as de PT-BR (/equipa → /time, /criar-equipa → /criar-time,
// ?tab=equipa → ?tab=time). As antigas continuam valendo: link que já foi para o grupo do WhatsApp, favorito,
// notificação já enviada. Puro (sem React), para testar no Node; App.jsx e AdminPanel.jsx usam estas contas.

/** O caminho novo de um endereço antigo de time: /equipa/missa/jogo/9 → /time/missa/jogo/9. O que não é /equipa fica como está. */
export function caminhoNovoDeEquipa(pathname) {
  return String(pathname ?? '').replace(/^\/equipa(?=\/|$)/, '/time').replace(/^\/criar-equipa(?=\/|$)/, '/criar-time');
}

/** A aba do painel do admin: ?tab=equipa (o nome antigo) é a mesma aba que ?tab=time. Sem aba, o dashboard. */
export function abaDoAdmin(parametro) {
  const aba = parametro || 'dashboard';
  return aba === 'equipa' ? 'time' : aba;
}

// ─── "Admin não é um lugar" ───────────────────────────────────────────────────────────────────────────
// O endereço antigo /admin/<slug>?tab=… continua valendo e leva para a casa nova da mesma seção: uma aba da
// página do time (/time/<slug>?aba=jogos|elenco|ajustes) ou o Ranking.
export const ABAS_DO_TIME = ['jogos', 'elenco', 'ajustes'];
const CASA_NOVA = {
  dashboard: '', // virou o card "Seu time" do Início; a página do time é o lugar natural de quem chega pelo link
  time: '?aba=ajustes',
  comunicacao: '?aba=ajustes',
  denuncias: '?aba=ajustes#denuncias',
  membros: '?aba=elenco',
  convites: '?aba=elenco',
  jogos: '?aba=jogos',
  resultados: '?aba=jogos',
  campeonato: '?aba=jogos',
  estatisticas: '/ranking',
};

/** Para onde vai /admin/<slug>?tab=<tab>: /admin/missa?tab=membros → /time/missa?aba=elenco. Aba desconhecida: a página do time. */
export function caminhoDoAdminAntigo(slug, tab) {
  const base = `/time/${slug}`;
  return base + (CASA_NOVA[abaDoAdmin(tab)] ?? '');
}

/** A aba da página do time a partir de ?aba=: Ajustes só existe para o admin; sem aba (ou aba que a pessoa não tem), Jogos. */
export function abaDoTime(parametro, ehAdmin) {
  const aba = ABAS_DO_TIME.includes(parametro) ? parametro : 'jogos';
  return aba === 'ajustes' && !ehAdmin ? 'jogos' : aba;
}
