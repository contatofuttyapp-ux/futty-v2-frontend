// Futty v2.0 — o convite que a pessoa COLA no Início ("Recebeu um convite?"). Quem toca no link do convite sem o app instalado vai à loja,
// instala e abre o app: o convite que o navegador guardou não está no app (cada um tem o seu armazenamento). A página do convite deixa o link
// copiado ao mandar para a loja; aqui se lê o que foi colado.
//
// Aceita o link curto (futtyapp.com.br/c/<nome>-<código> ou /c/<código>), o longo (/convite/<uuid>), com ou sem https e www, sozinho ou no meio
// da mensagem do grupo ("Entra no time: https://…"), e o código sozinho. Devolve o token que o motor aceita (o código ou o uuid), ou null.
// Puro e sem rede: quem decide se o convite existe é o motor.
import { codigoDoLinkCurto } from './linkCurtoDoConvite';
import { HOST_DO_SITE } from '../lib/linkDoSite';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CODIGO = /^[a-z0-9]{6,8}$/i;
const host = HOST_DO_SITE.replace(/\./g, '\\.');
// O endereço do site no meio de qualquer texto: (https://)(www.)futtyapp.com.br/c/… ou /convite/…, até o primeiro espaço ou fim.
const LINK_NO_TEXTO = new RegExp(`(?:https?://)?(?:www\\.)?${host}(/(?:c|convite)/[^\\s?#]+)`, 'i');

/** O token do convite que está no texto colado, ou null. */
export function conviteDoTextoColado(texto) {
  const t = String(texto ?? '').trim();
  if (!t) return null;
  const achado = t.match(LINK_NO_TEXTO);
  if (achado) {
    const [, caminho] = achado;
    const pedaco = decodeURIComponent(caminho.split('/')[2] || '').replace(/[.,;:!)\]]+$/, '');
    if (!pedaco) return null;
    if (caminho.toLowerCase().startsWith('/convite/')) return UUID.test(pedaco) ? pedaco.toLowerCase() : null;
    const codigo = codigoDoLinkCurto(pedaco);
    return CODIGO.test(codigo) ? codigo : null;
  }
  // Sem o endereço: o código sozinho (alguém mandou só "cqyvax9y") ou o uuid sozinho.
  if (CODIGO.test(t)) return t.toLowerCase();
  if (UUID.test(t)) return t.toLowerCase();
  return null;
}

/** O texto colado é um link de convite do Futty? (Para preencher o campo sozinho só quando é.) */
export function pareceConvite(texto) {
  return conviteDoTextoColado(texto) !== null;
}
