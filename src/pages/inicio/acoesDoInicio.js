// Futty v2.0 — Início: as ações da página — responder presença ("Vou / Não vou" do cartão do jogo), sair da lista de espera, guardar a
// data de nascimento e escolher o avatar genérico. Nascem a cada render da página, com o estado daquele render — como quando moravam
// dentro dela.
import { apiFetch } from '../../lib/api';
import { responderComOtimismo } from '../../lib/rsvp';

export function useAcoesDoInicio({ avatarGenericoEscolha, dobBusy, dobInput, games, hidratarPerfil, inicio, me, recarregarPerfil, setAvatarGenericoOverride, setBusyId, setDobBusy, setDobFeito, setError, setGames, setToast }) {
  async function guardarDob() {
    if (dobBusy || !dobInput) return;
    setDobBusy(true);
    try {
      await apiFetch('/api/me', { method: 'PATCH', body: JSON.stringify({ birthdate: dobInput }) });
      // A data entra no perfil na hora: se for de menor de 18, o AuthGuard troca o app pela tela de exclusão.
      if (me?.user) hidratarPerfil({ ...me, user: { ...me.user, birthdate: dobInput } });
      setDobFeito(true);
      setToast({ msg: 'Data salva. Obrigado.', tipo: 'success' });
    } catch (e) {
      setToast({ msg: e.message || 'Não deu para salvar agora. Tente de novo.', tipo: 'error' });
    } finally {
      setDobBusy(false);
    }
  }

  // A resposta no jogo, com o estado OTIMISTA no próprio jogo: o cartão trava na hora ("Você está confirmado") e o contador mexe; se
  // o pedido falhar, volta ao que era e diz por quê (a frase do motor: "A lista deste jogo já fechou." não manda tentar de novo).
  // Uma porta só (POST /rsvp/responder): vale para o sorteio na hora. Devolve true (valeu), false (falhou) ou 'espera' (jogo cheio).
  async function onPresence(gameId, going) {
    setError('');
    setBusyId(gameId);
    const antes = (games || []).find((g) => g.id === gameId);
    // Põe na tela uma resposta ('confirmado' | 'recusado'); null = volta ao jogo como estava antes do toque.
    const aplicar = (status) => setGames((prev) => (prev || []).map((g) => {
      if (g.id !== gameId) return g;
      if (status == null) return { ...g, user_status: antes?.user_status ?? null, confirmed_count: antes?.confirmed_count ?? g.confirmed_count };
      const userStatus = status === 'confirmado' ? 'going' : 'not_going';
      let count = g.confirmed_count;
      if (userStatus === 'going' && g.user_status !== 'going') count += 1;
      if (userStatus !== 'going' && g.user_status === 'going') count -= 1;
      return { ...g, user_status: userStatus, confirmed_count: Math.max(0, count) };
    }));
    // A volta (erro, ou jogo cheio) é sempre ao jogo de antes, então o "anterior" é null (= como estava).
    const r = await responderComOtimismo({ gameId, status: going ? 'confirmado' : 'recusado', anterior: null, aplicar });
    setBusyId(null);
    if (!r.ok) {
      setToast({ msg: r.erro, tipo: 'error' });
      inicio.reload(); // a lista pode ter fechado: o cartão relê o que vale
      return false;
    }
    if (r.espera != null) {
      setGames((prev) => (prev || []).map((g) => (g.id === gameId ? { ...g, espera_posicao: r.espera } : g)));
      setToast({ msg: 'O jogo está cheio. Você entrou na lista de espera.', tipo: 'success' });
      inicio.reload();
      return 'espera';
    }
    // Disse "Não vou" estando na fila: saiu dela.
    if (!going) setGames((prev) => (prev || []).map((g) => (g.id === gameId ? { ...g, espera_posicao: null } : g)));
    // Relê por trás: o Início guardado no aparelho (o que abre na próxima visita, antes da rede) passa a ter a resposta — sem isso, reabrir
    // o app mostrava o "Vou / Não vou" destravado por um instante.
    inicio.reload();
    return true;
  }

  async function onSairEspera(gameId) {
    setBusyId(gameId);
    try {
      await apiFetch(`/api/jogos/${gameId}/rsvp/sair-espera`, { method: 'POST' });
      setGames((prev) => (prev || []).map((g) => (g.id === gameId ? { ...g, espera_posicao: null } : g)));
      setToast({ msg: 'Você saiu da lista de espera.', tipo: 'success' });
      inicio.reload();
    } catch (e) {
      setToast({ msg: e.message || 'Não deu agora. Tente de novo.', tipo: 'error' });
    } finally {
      setBusyId(null);
    }
  }

  async function escolherAvatarGenerico(key) {
    const anterior = avatarGenericoEscolha;
    setAvatarGenericoOverride(key);
    try {
      await apiFetch('/api/me', { method: 'PATCH', body: JSON.stringify({ avatar_generico: key }) });
      // O PerfilContext partilhado aprende a escolha — outras páginas (Perfil, Figurinha, Ranking) que leem o
      // avatar genérico sem override próprio ficam frescas. Sem reler o /api/me inteiro (a escolha é o que o
      // PATCH acabou de gravar); o hidratar também alinha os caches do Ranking e do Feed com o genérico novo
      // (lib/cacheCard.js).
      if (me?.user) hidratarPerfil({ ...me, user: { ...me.user, avatar_generico: key } });
      else recarregarPerfil();
    } catch (e) {
      setAvatarGenericoOverride(anterior);
      setToast({ msg: e.message || 'Não deu para salvar agora. Tente de novo.', tipo: 'error' });
    }
  }

  return { guardarDob, onPresence, onSairEspera, escolherAvatarGenerico };
}
