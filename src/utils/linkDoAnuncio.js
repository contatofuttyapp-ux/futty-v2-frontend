// Futty v2.0 — para onde o toque num anúncio pode levar. A campanha é gravada no Gabinete com um campo "Link" de texto livre; o app abre o que
// estiver lá com window.open. Um `javascript:` ou `data:` ali rodaria código com a chave do app (a sessão mora no localStorage), então só abre
// o que for http(s) — o resto o toque ignora, como se a campanha não tivesse link.
//
// Um caminho do próprio app ("/planos") continua valendo: resolve contra o site de verdade (nunca contra a origem da página, que no app da loja
// é capacitor://localhost e em teste é localhost).
import { ORIGEM_DO_SITE } from '../lib/linkDoSite';

/** O endereço (href inteiro) que o toque pode abrir, ou null quando não é http(s) ou nem é um endereço. Nunca lança. */
export function linkDoAnuncio(link, origem = ORIGEM_DO_SITE) {
  if (typeof link !== 'string') return null;
  const texto = link.trim();
  if (!texto) return null;
  try {
    const url = new URL(texto, origem);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : null;
  } catch {
    return null;
  }
}
