// Futty v2.0 — Figurinha: gerar a figurinha (na estreia e no studio), acompanhar a pintura em segundo plano e tratar o desfecho.
// As ações nascem a cada render da página (useAcoesDaPintura), com o estado daquele render — como quando moravam dentro dela.
import { apiFetch } from '../../lib/api';
import { estadoBrilhantes } from '../../lib/brilhantes';
import { gravarPinturaGuardada, limparPinturaGuardada } from '../../utils/progressoPintura';

export function useAcoesDaPintura({ aplicarBrilhante, gerandoIA, kitAtivo, recarregarPerfilGlobal, setAgora, setEmailNaoConfirmado, setErro, setErroIA, setErroIAmsg, setEstreiaFase, setFotoLocal, setFotoRecusada, setFotoTrocadaSemGerar, setGerandoIA, setLimiteIA, setMe, setPintura, setSemGeracoes, setToast, userId }) {
  // Geração IA durante a estreia: ao concluir (ou falhar), revela o cromo.
  // Declarada antes de subirFoto porque este chama-a no auto-trigger da estreia.
  async function gerarAvatarIAEstreia() {
    // Mesmo marcador do Onboarding (dispararFigurinhaIA): o Início
    // lê isto no PRÓPRIO useState inicial (uma vez, ao montar), por isso tem
    // de estar gravado ANTES do POST — se a pessoa for para lá enquanto isto
    // ainda corre, o Início já nasce sabendo que há uma geração em voo, em vez
    // de mostrar o CTA normal por um instante até o status 'gerando' chegar.
    try {
      sessionStorage.setItem('futty_figurinha_gerando', '1');
    } catch {
      /* priv */
    }
    setGerandoIA(true);
    setErro('');
    setLimiteIA(false);
    let emSegundoPlano = false;
    let falhou = null; // a falha desta geração: a fase que volta (foto ou cromo) depende dela
    try {
      // O POST devolve `{ jobId }` na hora; quem conclui é acompanharPintura (aplicarPinturaPronta /
      // aplicarPinturaFalhou). Sem jobId (resposta imediata) o fluxo é o de sempre.
      const data = await apiFetch('/api/me/avatar/ai', { method: 'POST', body: JSON.stringify({ kit: 'dark-gold', assincrono: true }) });
      if (data.jobId) {
        iniciarPintura(data, { kit: 'dark-gold', estreia: true });
        emSegundoPlano = true;
        return;
      }
      setMe((m) => (m ? { ...m, user: { ...m.user, avatar_url: data.avatar_url, figurinha_ativa: data.figurinha_ativa } } : m));
      setFotoLocal(null);
      recarregarPerfilGlobal();
    } catch (err) {
      falhou = err;
      tratarFalhaDaEstreia(err);
    } finally {
      if (!emSegundoPlano) {
        setGerandoIA(false);
        setEstreiaFase(falhou ? faseAposFalhaDaEstreia(falhou) : 'pronto'); // mostra o cromo (com Brilhante ou a foto)
      }
    }
  }

  // SEM_DIREITO não é o "limite" morto — mostrar o card de quota (que mandaria "Ver Brilhantes" para um
  // 403 que já significa isso) seria só ruído; o card comum já está pronto, é só revelar. `subirFoto` só
  // chama a geração da estreia quando já há direito confirmado, mas o direito pode ter acabado entre a
  // checagem e a resposta (corrida rara) — cai aqui na mesma, sem erro na tela. Serve ao POST e ao
  // desfecho 'falhou' do job.
  function tratarFalhaDaEstreia(err) {
    if (err?.code === 'SEM_DIREITO') estadoBrilhantes().then(aplicarBrilhante);
    else if (err?.code === 'FOTO_RECUSADA') setFotoRecusada(true); // o recado vai na fase 'foto' (ver faseAposFalhaDaEstreia)
    else if (err?.status === 403) setLimiteIA(true); // 403 sem código conhecido (defensivo)
    else setErro(err?.message || 'Não deu para gerar sua figurinha. Tente de novo.');
  }

  // FOTO_RECUSADA na estreia volta a "Adicione uma foto" com o recado (a pessoa escolhe outra); as
  // outras falhas seguem ao cromo.
  function faseAposFalhaDaEstreia(err) {
    return err?.code === 'FOTO_RECUSADA' ? 'foto' : 'pronto';
  }

  // Gerar avatar com IA a partir da foto atual (endpoint usa users.avatar_url).
  // `kitId` opcional: quando vem de um onClick recebe o evento → cai no kit vestido.
  async function gerarAvatarIA(kitId) {
    if (gerandoIA) return;
    const kit = typeof kitId === 'string' ? kitId : kitAtivo;
    // Mesmo marcador de gerarAvatarIAEstreia/dispararFigurinhaIA
    // (Onboarding): cobre a TROCA de foto/uniforme, não só o cadastro. Antes
    // do POST — é o que o Início lê ao montar, se a pessoa sair desta tela
    // enquanto a geração ainda corre.
    try {
      sessionStorage.setItem('futty_figurinha_gerando', '1');
    } catch {
      /* priv */
    }
    setGerandoIA(true);
    setErro('');
    setLimiteIA(false);
    setErroIA(false);
    setErroIAmsg('');
    setSemGeracoes(false);
    setFotoRecusada(false);
    setEmailNaoConfirmado(false);
    let emSegundoPlano = false;
    try {
      // O POST devolve `{ jobId }` na hora e a pintura segue em segundo plano (ver acompanharPintura).
      // Uniforme já pintado da mesma foto responde na hora com a figurinha, sem job.
      const data = await apiFetch('/api/me/avatar/ai', { method: 'POST', body: JSON.stringify({ kit, assincrono: true }) });
      if (data.jobId) {
        iniciarPintura(data, { kit });
        emSegundoPlano = true;
        return;
      }
      // Guarda o avatar, o kit vestido e regista o slot novo (sem duplicar).
      setMe((m) => (m ? {
        ...m,
        user: { ...m.user, avatar_url: data.avatar_url, kit_ativo: data.kit, figurinha_ativa: data.figurinha_ativa },
        slots: [...new Set([...(m.slots || []), data.kit])],
      } : m));
      setFotoLocal(null); // limpa o preview local → mostra o avatar IA (avatar_url)
      recarregarPerfilGlobal();
      // O direito acabou de ser gasto (crédito a menos, ou a linha do pacote):
      // relê, para o contador e o botão dourado contarem a verdade.
      estadoBrilhantes().then(aplicarBrilhante);
      setFotoTrocadaSemGerar(false); // gerou (ou reutilizou de propósito) — some o pulso
      // reutilizado:true (motor) — o slot deste kit já valia para a
      // foto atual e não gerou de novo. Sem aviso, parecia que o toque no
      // botão não fez nada.
      if (data.reutilizado) setToast({ tipo: 'info', mensagem: 'Sua figurinha já estava pronta' });
    } catch (err) {
      tratarFalhaDaGeracao(err);
    } finally {
      if (!emSegundoPlano) setGerandoIA(false);
    }
  }

  // O que a tela faz com cada falha da geração — serve ao POST (as validações seguem síncronas no motor) e ao
  // desfecho 'falhou' da pintura em segundo plano: os códigos e as mensagens são os mesmos de antes do job.
  function tratarFalhaDaGeracao(err) {
    // EMAIL_NAO_CONFIRMADO: gate anti-abuso — mesmo status 403 do limite de quota, por isso tem de ser
    // verificado PRIMEIRO (código distingue os dois).
    if (err?.code === 'EMAIL_NAO_CONFIRMADO') setEmailNaoConfirmado(true);
    // SEM_DIREITO (SPEC-FIGURINHA-3) — também 403, mas não é limite nenhum: é o direito que acabou (ou o
    // pacote do time que não existe). Recarrega o estado para o bloco "Vire Brilhante" aparecer sozinho; o
    // card de quota do plano NÃO serve aqui, e mostrá-lo seria mentir.
    else if (err?.code === 'SEM_DIREITO') {
      estadoBrilhantes().then(aplicarBrilhante);
      setErroIAmsg(err.message);
      // P2: com a loja ligada o overlay troca o "Tentar novamente" (que daria o mesmo 403) por
      // "Suas gerações acabaram. Comprar mais?" → Planos, com a Minha Figurinha em destaque.
      setSemGeracoes(true);
      setErroIA(true);
    } else if (err?.code === 'FOTO_RECUSADA') {
      // FOTO_RECUSADA: a cabeça cortou nas duas tentativas com esta foto — o motor já não a pinta. O overlay
      // mostra o recado e leva a escolher outra foto (sem "tentar de novo", que daria o mesmo).
      setFotoRecusada(true);
      setErroIA(true);
    } else if (err?.status === 403) setLimiteIA(true); // gate antigo de plano (morto, fica de rede)
    else {
      // FOTO_INVALIDA / TETO_DIARIO_ATINGIDO / IA_INDISPONIVEL / FOTO_DESATUALIZADA / FIGURINHA_DEFEITUOSA:
      // causas acionáveis com mensagem digna própria, em vez do genérico "não deu desta vez".
      // IA_INDISPONIVEL (fal recusou por chave/crédito, falha do MOTOR) usa a mensagem que já vem do
      // backend — nunca sugere "tente outra foto", porque o problema não é a foto. FOTO_DESATUALIZADA é a
      // trava de hash do motor: a foto que ele baixou ainda não era a que acabou de subir, e ele recusou
      // gerar em vez de fazer a figurinha da foto errada. Nada a corrigir do lado de cá — é esperar uns
      // segundos e tocar de novo, e o botão de repetir do overlay já está lá. Resto (fal fora do ar, etc.)
      // mantém o genérico com retry, que já cobre bem o transitório.
      if (['FOTO_INVALIDA', 'TETO_DIARIO_ATINGIDO', 'IA_INDISPONIVEL', 'FOTO_DESATUALIZADA', 'SEM_DIREITO', 'FIGURINHA_DEFEITUOSA', 'GERACAO_INTERROMPIDA'].includes(err?.code) || err?.mostrar) setErroIAmsg(err.message);
      setErroIA(true); // qualquer falha → estado de erro com retry no overlay
    }
  }

  // ── A PINTURA EM SEGUNDO PLANO ──────────────────────────────────────────────────────────────────
  // O POST respondeu `{ jobId, estimativaSegundos }`: a barra começa e o app passa a consultar o motor.
  function iniciarPintura(data, { kit, estreia = false }) {
    const nova = {
      jobId: data.jobId,
      kit,
      estreia,
      estimativaSegundos: data.estimativaSegundos || 45,
      etapa: 'preparando',
      decorridoMs: 0,
      baseEm: Date.now(),
    };
    gravarPinturaGuardada(userId, nova);
    setAgora(Date.now());
    setPintura(nova);
  }

  // A figurinha existe: o card troca (a animação de sempre), o direito já foi debitado pelo motor — relê.
  function aplicarPinturaPronta(d, estreia) {
    limparPinturaGuardada();
    setMe((m) => (m ? {
      ...m,
      user: { ...m.user, avatar_url: d.avatar_url, kit_ativo: d.kit, figurinha_ativa: d.figurinha_ativa },
      slots: [...new Set([...(m.slots || []), d.kit])],
    } : m));
    setFotoLocal(null); // limpa o preview local → mostra o avatar IA (avatar_url)
    recarregarPerfilGlobal();
    estadoBrilhantes().then(aplicarBrilhante);
    setFotoTrocadaSemGerar(false);
    setPintura(null);
    setGerandoIA(false);
    if (estreia) setEstreiaFase((f) => (f === 'gerando' || f === 'foto' ? 'pronto' : f)); // mostra o cromo
  }

  // A pintura falhou (o motor não cobrou nada): os mesmos erros de sempre — cabeça cortada pede outra foto.
  function aplicarPinturaFalhou(d, estreia) {
    limparPinturaGuardada();
    setPintura(null);
    setGerandoIA(false);
    const err = { code: d.code || null, status: d.status || 500, message: d.erro || '', mostrar: !!d.mostrar };
    if (estreia) {
      tratarFalhaDaEstreia(err);
      setEstreiaFase((f) => (f === 'gerando' || f === 'foto' ? faseAposFalhaDaEstreia(err) : f));
    } else {
      tratarFalhaDaGeracao(err);
    }
    // A pintura pode ter gastado um 'gerando' que o motor já marcou 'falhou': relê o perfil para o Início acompanhar.
    recarregarPerfilGlobal();
  }

  return { gerarAvatarIAEstreia, gerarAvatarIA, aplicarPinturaPronta, aplicarPinturaFalhou };
}
