// Futty v2.0 — Figurinha: "Minhas figurinhas" — carregar o histórico e vestir uma figurinha de antes.
// As ações nascem a cada render da página, com o estado daquele render.
import { apiFetch } from '../../lib/api';

// "Minhas figurinhas": até 6, mais recente primeiro. Recarrega
// toda vez que o modal "Sua foto" abre (pode ter mudado desde a última).
function carregarHistorico() {
  return apiFetch('/api/me/avatar/historico')
    .then((data) => data?.items || [])
    .catch(() => []); // galeria some sozinha — não é motivo pra tela de erro
}
export { carregarHistorico };

export function useAcoesDoHistorico({ recarregarPerfilGlobal, setErro, setFotoLocal, setMe, setToast, setUsandoHistoricoId, usandoHistoricoId }) {
  async function usarDoHistorico(item) {
    if (usandoHistoricoId) return;
    setUsandoHistoricoId(item.id);
    setErro('');
    try {
      const data = await apiFetch(`/api/me/avatar/historico/${item.id}`, { method: 'PUT' });
      setMe((m) => (m ? { ...m, user: { ...m.user, avatar_url: data.avatar_url, kit_ativo: data.kit, figurinha_ativa: data.figurinha_ativa } } : m));
      setFotoLocal(null); // mostra o avatar_url novo (não o preview local de upload)
      recarregarPerfilGlobal();
      setToast({ tipo: 'success', mensagem: 'Figurinha aplicada.' });
    } catch (err) {
      setErro(err?.message || 'Não deu para usar essa figurinha. Tente de novo.');
    } finally {
      setUsandoHistoricoId(null);
    }
  }

  return { usarDoHistorico };
}
