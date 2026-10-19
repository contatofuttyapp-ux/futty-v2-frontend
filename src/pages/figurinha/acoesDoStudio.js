// Futty v2.0 — Figurinha: as escolhas do studio — uniforme (vestir ou pintar), modo do card, fundo, avatar genérico, outra foto e
// o reenvio do e-mail de confirmação. As ações nascem a cada render da página, com o estado daquele render.
import { apiFetch } from '../../lib/api';
import { supabase } from '../../lib/supabase';

export function useAcoesDoStudio({ aplicarNoPerfilGlobal, avatarEhIA, fileRef, fundo, gerandoIA, gerarAvatarIA, kitAtivo, kitParaPintar, me, navigate, reenviarBusy, setAvatarGenericoEscolha, setErro, setErroIA, setErroIAmsg, setFotoRecusada, setFundo, setKitParaPintar, setMe, setReenviarBusy, setReenviarFeito, setToast, setTrocandoModo, slotsKits, temDireitoDeGerar, trocandoModo }) {
  // Reenvia o e-mail de confirmação (gate anti-abuso) — supabase.auth.resend usa a MESMA sessão activa,
  // não precisa senha nem novo login.
  async function reenviarEmailConfirmacao() {
    if (reenviarBusy || !me?.user?.email) return;
    setReenviarBusy(true);
    try {
      const { error } = await supabase.auth.resend({ type: 'signup', email: me.user.email });
      if (error) throw error;
      setReenviarFeito(true);
    } catch (e) {
      setErro(e?.message || 'Não deu para reenviar o e-mail. Tente de novo.');
    } finally {
      setReenviarBusy(false);
    }
  }

  // A2 — toque num kit da grelha. Três caminhos: já gerado (slot) → VESTE via
  // PUT (não gasta direito); sem slot e sem direito → /planos; sem slot e com
  // direito → confirma e gera.
  async function escolherKit(kit) {
    // "Já vestido" só vale com a figurinha no card — no card com a FOTO nenhum uniforme está vestido
    // (kit_ativo nasce 'dark-gold' pelo default da coluna), e tocar nele tem de pintar/vestir.
    if (kit.estado === 'breve' || (avatarEhIA && kit.id === kitAtivo) || gerandoIA) return;
    // O cadeado é por DIREITO (§5), não por PLANO. Vestir um uniforme que já se gerou é sempre livre (slot,
    // custo zero); gerar um novo precisa de crédito ou do pacote do time — e é isso que /planos resolve.
    // Por plano, um membro do pacote veria o PRÓPRIO uniforme do time trancado.
    if (slotsKits.includes(kit.id)) {
      try {
        const data = await apiFetch('/api/me/kit', { method: 'PUT', body: JSON.stringify({ kit: kit.id }) });
        setMe((m) => (m ? { ...m, user: { ...m.user, avatar_url: data.avatar_url, kit_ativo: data.kit, figurinha_ativa: data.figurinha_ativa } } : m));
        aplicarNoPerfilGlobal({ avatar_url: data.avatar_url, kit_ativo: data.kit, figurinha_ativa: data.figurinha_ativa });
      } catch {
        setErroIA(true);
      }
      return;
    }
    // Sem slot: só dá para gerar com direito. Sem ele, a resposta é /planos —
    // nunca um diálogo que ia terminar em 403 SEM_DIREITO. "Minha Brilhante"
    // é o destaque certo: é o único produto que deixa escolher o uniforme (o
    // pacote do time fixa um só, do dono).
    if (!temDireitoDeGerar) return navigate('/planos?destaque=minha');
    // Gastar 1 geração é irreversível: pede confirmação no diálogo próprio
    // (ver kitParaPintar, perto do fim do componente) — nunca sem avisar.
    setKitParaPintar(kit);
  }

  async function confirmarPintura() {
    const kit = kitParaPintar;
    setKitParaPintar(null);
    if (kit) await gerarAvatarIA(kit.id);
  }

  // Interruptor "Mostrar minha foto" / "Mostrar minha figurinha" (modal "Sua foto"): troca o que o card
  // mostra sem apagar nada — a figurinha continua no slot, sempre. avatarEhIA já diz qual dos dois está
  // ativo agora, então um toque no modo já ativo não faz nada.
  async function trocarModo(modo) {
    if (trocandoModo || (modo === 'figurinha') === avatarEhIA) return;
    setTrocandoModo(true);
    try {
      const data = await apiFetch('/api/me/avatar/modo', { method: 'PUT', body: JSON.stringify({ modo }) });
      setMe((m) => (m ? { ...m, user: { ...m.user, avatar_url: data.avatar_url, figurinha_ativa: data.figurinha_ativa } } : m));
      aplicarNoPerfilGlobal({ avatar_url: data.avatar_url, figurinha_ativa: data.figurinha_ativa });
    } catch (e) {
      setErro(e?.message || 'Não deu para trocar o card. Tente de novo.');
    } finally {
      setTrocandoModo(false);
    }
  }

  // O fundo é uma PREFERÊNCIA PERSISTIDA, e faltava-lhe metade do laço: a coluna
  // users.fundo_figurinha existe (migração 018), o GET /api/me devolve-a e esta
  // página já a LIA no arranque — mas ninguém a escrevia, por isso a escolha
  // morria ao sair. Agora o Início mostra este mesmo cromo e precisa de saber qual
  // é o fundo, o que torna a escrita obrigatória: é a fonte de verdade dos dois.
  // Optimista — o studio responde já e o PATCH segue atrás; se falhar, a escolha
  // vale para esta sessão e não se estraga o ecrã por causa de uma preferência.
  async function escolherFundo(k) {
    if (k === fundo) return;
    // SPEC-FIGURINHA-3 §4/§9: os 6 fundos vêm COM a Brilhante — são composição do card, custo zero. Não há
    // gate por plano (Pro/Elite; os planos saíram das telas): um membro do pacote do time veria o Aura
    // trancado no card que o time acabou de pagar, com "Os 6 fundos liberados" escrito na compra. Sem
    // Brilhante não há seletor nenhum, portanto chegar aqui já significa ter direito ao fundo.
    // Guarda o anterior para reverter se o PATCH falhar (caso real: constraint do Royal sem a migração
    // aplicada dava 500 — o tile ficava marcado no fundo novo com o banco silenciosamente no antigo).
    const anterior = fundo;
    setFundo(k);
    try {
      await apiFetch('/api/me', { method: 'PATCH', body: JSON.stringify({ fundo_figurinha: k }) });
      setMe((m) => (m ? { ...m, user: { ...m.user, fundo_figurinha: k } } : m));
      aplicarNoPerfilGlobal({ fundo_figurinha: k });
    } catch (e) {
      setFundo(anterior); // nunca fica com o tile marcado e o banco diferente
      setToast({ tipo: 'error', mensagem: e?.message || 'Não deu para trocar o fundo agora. Tente de novo.' });
    }
  }

  // Escolha do avatar genérico — mesmo padrão optimista do fundo.
  async function escolherAvatarGenerico(k) {
    setAvatarGenericoEscolha(k);
    try {
      await apiFetch('/api/me', { method: 'PATCH', body: JSON.stringify({ avatar_generico: k }) });
      setMe((m) => (m ? { ...m, user: { ...m.user, avatar_generico: k } } : m));
      aplicarNoPerfilGlobal({ avatar_generico: k });
    } catch { /* preferência: não vale um erro no ecrã */ }
  }

  // Foto recusada → o botão do recado leva direto ao seletor de foto (o mesmo de "Trocar foto"). Nada
  // gasta.
  function escolherOutraFoto() {
    setFotoRecusada(false);
    setErroIA(false);
    setErroIAmsg('');
    fileRef.current?.click();
  }

  return { reenviarEmailConfirmacao, escolherKit, confirmarPintura, trocarModo, escolherFundo, escolherAvatarGenerico, escolherOutraFoto };
}
