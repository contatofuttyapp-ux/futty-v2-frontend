// Futty v2.0 — o convite que atravessa a instalação, do lado das telas. O bilhete do convite (lib/convitePendente.js) vive no
// armazenamento de onde a página abriu; o app instalado pela loja tem o seu, vazio. Por isso:
//   · a página do convite, aberta no navegador de um celular, AVISA o motor (avisarConviteAberto): ele guarda o convite com a rede e a
//     plataforma por 2 h (backend/utils/convitePendente.js — o IP nunca é guardado, só um hash da rede);
//   · quem termina o cadastro sem time PERGUNTA (convitesNoMotor): os convites abertos na mesma rede e plataforma voltam. Um só = entra
//     no time sozinho; mais de um = a pessoa escolhe (components/EscolhaDoConvite.jsx).
// O link copiado e o cartão "Recebeu um convite?" continuam valendo: se a rede mudou (abriu no 4G, cadastrou no Wi-Fi), é por eles.
// Módulo pequeno, só para os chunks do Convite, do Onboarding e do Início.
import { Capacitor } from '@capacitor/core';
import { apiFetch } from './api';
import { ehNativo } from './plataforma';
import { lojaDoNavegador } from '../utils/lojaDoApp';
import { comPrazo } from '../utils/validarConvite';

/** 'ios' | 'android' do aparelho (no app, a do app; no site, a do navegador do celular), ou null (computador). */
export function plataformaDoAparelho() {
  if (ehNativo()) {
    const p = Capacitor.getPlatform();
    return p === 'ios' || p === 'android' ? p : null;
  }
  return lojaDoNavegador(globalThis.navigator);
}

/** A página do convite abriu no celular: o motor guarda. Sem esperar, sem erro na tela (é um bônus). */
export function avisarConviteAberto(token, plataforma = plataformaDoAparelho()) {
  if (!token || !plataforma) return;
  apiFetch(`/api/convite/${encodeURIComponent(token)}/pendente`, { method: 'POST', body: JSON.stringify({ plataforma }), segundoPlano: true }).catch(() => {});
}

/**
 * Os convites abertos neste celular (mesma rede e plataforma) nas últimas 2 h: [{ token, team, convidadoPor }]. Qualquer falha ou
 * demora (mais que `prazoMs`) = [] — a pessoa segue como cadastro comum e os outros caminhos continuam valendo.
 */
export async function convitesNoMotor({ prazoMs = 4000 } = {}) {
  const plataforma = plataformaDoAparelho();
  if (!plataforma) return [];
  try {
    const r = await comPrazo(apiFetch(`/api/convite-pendente?plataforma=${plataforma}`), prazoMs);
    return Array.isArray(r?.convites) ? r.convites.filter((c) => c?.token && c.team?.slug) : [];
  } catch {
    return [];
  }
}
