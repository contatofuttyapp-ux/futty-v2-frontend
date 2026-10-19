// Futty v2.0 — Início: as ações da página — responder presença (o card e o RSVP), avisar ausência, guardar a data de nascimento e
// escolher o avatar genérico. Nascem a cada render da página, com o estado daquele render — como quando moravam dentro dela.
import { apiFetch } from '../../lib/api';
import { MSG_FALHA_RSVP, responderComOtimismo } from '../../lib/rsvp';

export function useAcoesDoInicio({ ausenciaBusy, avatarGenericoEscolha, dobBusy, dobInput, games, hidratarPerfil, inicio, me, minhaResposta, proximoJogo, recarregarPerfil, rsvpValeParaOJogo, setAusenciaBusy, setAvatarGenericoOverride, setBusyId, setConfirmarAusencia, setDobBusy, setDobFeito, setError, setGames, setMinhaResposta, setToast }) {
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

  // Presença com estado otimista + chamada à API: o botão escolhido acende e o contador de confirmados
  // mexe NA HORA; se o pedido falhar, volta ao estado de antes e diz o que fazer.
  // Devolve como acabou: true (valeu), false (falhou e a tela voltou ao que era) ou 'espera' (o jogo
  // estava cheio). O aviso do topo usa isto para dizer "Presença confirmada" só quando valeu.
  async function onPresence(gameId, going) {
    // Com o RSVP aberto para o jogo do RSVP a resposta que vale é a do RSVP: o "Vou / Não vou" do card do jogo, o do aviso do topo e o do
    // cartão "Confirme presença" são o MESMO — um destino só, um número só.
    if (rsvpValeParaOJogo(gameId)) return responderRsvp(gameId, going ? 'confirmado' : 'recusado');
    setError('');
    setBusyId(gameId);
    const antes = (games || []).find((g) => g.id === gameId);
    setGames((prev) =>
      (prev || []).map((g) => {
        if (g.id !== gameId) return g;
        let count = g.confirmed_count;
        if (going && g.user_status !== 'going') count += 1;
        if (!going && g.user_status === 'going') count -= 1;
        return { ...g, user_status: going ? 'going' : 'not_going', confirmed_count: Math.max(0, count) };
      })
    );
    try {
      await apiFetch(`/api/games/${gameId}/confirmar`, {
        method: 'POST',
        body: JSON.stringify({ confirmado: going }),
      });
      return true;
    } catch {
      // Volta ao estado de antes (o do jogo que a tela mostrava) e avisa — sem deixar o botão aceso por um pedido que não valeu.
      if (antes) setGames((prev) => (prev || []).map((g) => (g.id === gameId ? { ...g, user_status: antes.user_status, confirmed_count: antes.confirmed_count } : g)));
      setToast({ msg: MSG_FALHA_RSVP, tipo: 'error' });
      return false;
    } finally {
      setBusyId(null);
    }
  }

  // A resposta no RSVP do próximo jogo (o "Vou / Não vou" do card do jogo quando o RSVP está aberto). O cartão "Confirme presença"
  // faz o mesmo por conta própria (components/RSVPCard.jsx) e avisa a tela por `onResposta`.
  async function responderRsvp(gameId, status) {
    setBusyId(gameId);
    const r = await responderComOtimismo({ gameId, status, anterior: minhaResposta, aplicar: setMinhaResposta });
    let fim = true;
    if (!r.ok) {
      setToast({ msg: r.erro, tipo: 'error' });
      fim = false;
    } else if (r.espera != null) {
      // O jogo está cheio: não confirmou, entrou na fila. Recarrega para o cartão mostrar a posição.
      setToast({ msg: 'O jogo está cheio. Você entrou na lista de espera.', tipo: 'success' });
      await inicio.reload();
      fim = 'espera';
    }
    setBusyId(null);
    return fim;
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

  // Aviso de ausência ao próximo jogo (declaração proactiva, sem RSVP). O botão diz o que faz ("Avisar
  // que não vou") em vez de ler como ESTADO ("Não vou ao próximo jogo / Afinal vou"), pergunta antes, e
  // depois fica a faixa "Você avisou que não vai · Desfazer". O servidor faz o resto: quando o admin abre
  // o RSVP, quem avisou entra como "Não vou" (routes/rsvp.js), e a marca zera quando o resultado do jogo
  // é lançado.
  async function definirAusencia(novo) {
    if (!proximoJogo?.team_slug || ausenciaBusy) return;
    const teamId = proximoJogo.team_id;
    setConfirmarAusencia(false);
    setAusenciaBusy(true);
    // Optimista: a flag é por equipa → atualiza todos os jogos dessa equipa.
    setGames((prev) => (prev || []).map((g) => (g.team_id === teamId ? { ...g, ausente_proximo: novo } : g)));
    try {
      await apiFetch(`/api/teams/${proximoJogo.team_slug}/membros/ausencia`, {
        method: 'PATCH',
        body: JSON.stringify({ ausente: novo }),
      });
      setToast({ msg: novo ? 'Pronto: o time já sabe que você não vai.' : 'Aviso desfeito.', tipo: 'success' });
    } catch (err) {
      setGames((prev) => (prev || []).map((g) => (g.team_id === teamId ? { ...g, ausente_proximo: !novo } : g)));
      setToast({ msg: err.message || (novo ? 'Não deu para avisar agora. Tente de novo.' : 'Não deu para desfazer agora. Tente de novo.'), tipo: 'error' });
    } finally {
      setAusenciaBusy(false);
    }
  }

  return { guardarDob, onPresence, escolherAvatarGenerico, definirAusencia };
}
