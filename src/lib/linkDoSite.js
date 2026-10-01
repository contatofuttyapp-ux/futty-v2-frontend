// Futty v2.0 — Rodada 29B (bloco 3, C): os links https do SITE que abrem no app (universal links / app links).
//
// Tocar em https://futtyapp.com.br/convite/<token> no WhatsApp abre o app em vez do Safari/Chrome — se o app estiver instalado.
// O sistema decide isso lendo, no site, public/.well-known/apple-app-site-association (iOS) e assetlinks.json (Android), e o
// app declara o mesmo no entitlement `applinks:` (ios/App/App/App.entitlements) e no intent-filter do AndroidManifest.xml.
// Os QUATRO lugares têm de falar dos mesmos domínio e caminhos: scripts/unidade/link-do-site.test.mjs lê os arquivos e confere
// com estas duas constantes. Sem o app, o link abre o site como sempre.
//
// Chega ao app pelo evento nativo `appUrlOpen` (components/DeepLinkListener.jsx) com a URL inteira; aqui se decide se é uma que
// o app sabe abrir e qual caminho do roteador ela é. Só https, só o domínio do site, só os prefixos abaixo — qualquer outra coisa
// (outro domínio, outro caminho, `..`, esquema estranho) é null e o app não navega.
export const HOST_DO_SITE = 'futtyapp.com.br';
export const PREFIXOS_DE_LINK = ['/convite/', '/equipa/', '/jogo/'];

/** O caminho (com a query) do roteador para uma URL do site que o app abre, ou null. Nunca lança. */
export function caminhoDoLinkDoSite(url) {
  try {
    const u = new URL(url);
    if (u.protocol !== 'https:' || u.hostname !== HOST_DO_SITE) return null;
    return PREFIXOS_DE_LINK.some((p) => u.pathname.startsWith(p)) ? u.pathname + u.search : null;
  } catch {
    return null;
  }
}
