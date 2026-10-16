// Futty v2.0 — de qual loja é o celular que abriu o SITE: o convite aberto no navegador do celular manda baixar o app.
//
// Só o navegador decide aqui (quem chama confere antes se não é o app da loja — lib/plataforma.js#ehNativo). Pelo user agent:
// Android → Play Store; iPhone, iPad e iPod → App Store. O iPad com iPadOS 13+ se apresenta como Mac ("Macintosh"); o que o
// separa do Mac de verdade é a tela de toque. Qualquer outra coisa (computador, aparelho desconhecido) é null e a tela fica como sempre.
// Puro (sem React, sem Capacitor): os testes de unidade rodam no Node.

/** A página do Futty na App Store (sem o país no endereço: a Apple abre a loja do país de quem toca). */
export const LINK_APP_STORE = 'https://apps.apple.com/app/id6811681849';
/** A página do Futty na Play Store (no Android o endereço abre o app da Play Store). */
export const LINK_PLAY_STORE = 'https://play.google.com/store/apps/details?id=com.futty.app';

/**
 * 'ios' | 'android' | null — de qual loja é o aparelho deste navegador. `navegador` é o `navigator` (ou um falso nos testes):
 * só `userAgent` e `maxTouchPoints` importam. Nunca lança.
 */
export function lojaDoNavegador(navegador) {
  const ua = String(navegador?.userAgent || '');
  if (/android/i.test(ua)) return 'android';
  if (/iphone|ipad|ipod/i.test(ua)) return 'ios';
  if (/macintosh/i.test(ua) && Number(navegador?.maxTouchPoints) > 1) return 'ios';
  return null;
}

/** O endereço da loja ('ios' → App Store, 'android' → Play Store), ou null. */
export function linkDaLoja(loja) {
  if (loja === 'ios') return LINK_APP_STORE;
  if (loja === 'android') return LINK_PLAY_STORE;
  return null;
}

/**
 * O endereço da loja para quem abriu um convite. No Android o código do convite viaja no `referrer` da Play Store: o app instalado o lê
 * na 1ª abertura (lib/conviteDaLoja.js) e entra no time sem depender da rede — é o caminho oficial do Google e o único 100% certo. A App
 * Store não tem nada parecido: no iPhone o endereço é o de sempre.
 */
export function linkDaLojaComConvite(loja, convite) {
  const base = linkDaLoja(loja);
  if (loja !== 'android' || !base || !convite) return base;
  return `${base}&referrer=${encodeURIComponent(`convite=${convite}`)}`;
}

// O código curto (6 a 8 letras ou números) ou o token longo (uuid): as duas formas que o motor aceita em /api/convite/:token.
const FORMA_DO_CONVITE = /^(?:[a-z0-9]{6,8}|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i;

/**
 * O convite que veio no referrer da Play Store ("convite=<código>"), ou null. Referrer sem convite (o "utm_source=google-play&
 * utm_medium=organic" de quem instalou pela busca), vazio ou com cara estranha = null, em silêncio. Aceita também o referrer que chega
 * ainda codificado ("convite%3D<código>").
 */
export function conviteDoReferrer(referrer) {
  if (typeof referrer !== 'string' || !referrer.trim()) return null;
  const ler = (texto) => {
    try { return (new URLSearchParams(texto).get('convite') || '').trim(); } catch { return ''; }
  };
  let convite = ler(referrer.trim());
  if (!convite && /%3d/i.test(referrer)) {
    try { convite = ler(decodeURIComponent(referrer.trim())); } catch { convite = ''; }
  }
  return FORMA_DO_CONVITE.test(convite) ? convite.toLowerCase() : null;
}
