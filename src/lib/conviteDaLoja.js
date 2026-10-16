// Futty v2.0 — o convite que a Play Store traz até o app (Android). A página do convite, aberta no navegador de um Android sem o app, manda
// à Play Store com o código no `referrer` (utils/lojaDoApp.js#linkDaLojaComConvite); a Play guarda esse referrer e o entrega ao app
// instalado (Play Install Referrer — plugin nativo mínimo nosso, android/.../ConviteDaLojaPlugin.java). É o caminho oficial do Google e
// não depende de rede: por isso vale ANTES do convite pendente pela rede (lib/conviteNoMotor.js), que vale antes do link copiado.
//
// Quem pergunta é quem decide o time da pessoa sem time: o cadastro (Onboarding: o convite vira o bilhete e abre nas boas-vindas do time)
// e o Início (ConviteDoMotor entra sozinho; quem já tem time vai à página do convite). O referrer é lido UMA vez por instalação — a
// Play devolve o mesmo para sempre; a marca fica no aparelho — e entregue a um só leitor. Nada roda no iPhone nem no site. O app da loja
// antigo (sem o plugin) responde "não implementado": marca e segue. A Play fora do ar ou lenta: não marca, tenta na próxima abertura.
import { Capacitor, registerPlugin } from '@capacitor/core';
import { conviteDoReferrer } from '../utils/lojaDoApp';
import { comPrazo } from '../utils/validarConvite';

export const CHAVE_REFERRER_LIDO = 'futty_referrer_lido';

/**
 * O leitor, com o aparelho por fora (os testes de unidade passam um falso). `plataforma`: 'android' | 'ios' | 'web';
 * `lerReferrer()`: a chamada ao plugin ({ referrer }); `armazenamento`: o localStorage.
 */
export function criarLeitorDaLoja({ plataforma, lerReferrer, armazenamento, prazoMs = 3000 }) {
  let leitura = null; // uma leitura por abertura, mesmo com o StrictMode montando duas vezes
  let entregue = false;

  const jaLeu = () => { try { return armazenamento?.getItem(CHAVE_REFERRER_LIDO) === '1'; } catch { return false; } };
  const marcar = () => { try { armazenamento?.setItem(CHAVE_REFERRER_LIDO, '1'); } catch { /* sem armazenamento: lê de novo na próxima */ } };

  async function lerUmaVez() {
    if (plataforma !== 'android' || jaLeu()) return null;
    let resposta;
    try {
      resposta = await comPrazo(Promise.resolve().then(lerReferrer), prazoMs);
    } catch (e) {
      if (e?.code === 'UNIMPLEMENTED') marcar(); // app da loja de antes do plugin: nunca vai ter
      return null;
    }
    marcar();
    return conviteDoReferrer(resposta?.referrer);
  }

  /** O código do convite que veio da Play Store, para UM leitor só; todos os outros (e as aberturas seguintes) recebem null. */
  return async function tomarConviteDaLoja() {
    leitura ||= lerUmaVez();
    const convite = await leitura;
    if (!convite || entregue) return null;
    entregue = true;
    return convite;
  };
}

const plugin = registerPlugin('ConviteDaLoja');

export const tomarConviteDaLoja = criarLeitorDaLoja({
  plataforma: Capacitor.isNativePlatform() ? Capacitor.getPlatform() : 'web',
  lerReferrer: () => plugin.lerReferrer(),
  armazenamento: typeof localStorage === 'undefined' ? null : localStorage,
});
