// Futty v2.0 — Rodada 29B (bloco 3, C): os links https do SITE que abrem no app (universal links / app links).
//
// Tocar em https://futtyapp.com.br/convite/<token> (ou no link curto /c/<código>, 29H)  no WhatsApp abre o app em vez do Safari/Chrome — se o app estiver instalado.
// O sistema decide isso lendo, no site, public/.well-known/apple-app-site-association (iOS) e assetlinks.json (Android), e o
// app declara o mesmo no entitlement `applinks:` (ios/App/App/App.entitlements) e no intent-filter do AndroidManifest.xml.
// Os QUATRO lugares têm de falar dos mesmos domínio e caminhos: scripts/unidade/link-do-site.test.mjs lê os arquivos e confere
// com estas duas constantes. Sem o app, o link abre o site como sempre.
//
// Chega ao app pelo evento nativo `appUrlOpen` (components/DeepLinkListener.jsx) com a URL inteira; aqui se decide se é uma que
// o app sabe abrir e qual caminho do roteador ela é. Só https, só o domínio do site, só os prefixos abaixo — qualquer outra coisa
// (outro domínio, outro caminho, `..`, esquema estranho) é null e o app não navega.
export const HOST_DO_SITE = 'futtyapp.com.br';
// A origem dos links que a pessoa COPIA e manda para o grupo (convite, jogo, sorteio, campeonato) — Rodada 29I, achados 87 e 105.
// Sempre o site de verdade, nunca `window.location.origin`: no app nativo a origem é `capacitor://localhost` (iPhone) ou
// `https://localhost` (Android), e em teste é `http://localhost:5173` — links que só funcionam no aparelho de quem mandou.
// (Os de AUTENTICAÇÃO — Login, Register, ForgotPassword, LandingPage — usam a origem de onde a pessoa está, de propósito:
// o retorno do Google/e-mail tem de voltar para o lugar dela.)
export const ORIGEM_DO_SITE = `https://${HOST_DO_SITE}`;
// 29H: entrou o link curto do convite (/c/<código>) e saiu /jogo/ — o app não tem a rota /jogo/<id> (o jogo mora em
// /time/<slug>/jogo/<id>, já coberto por /time/), então um link /jogo/… abria o app numa página inexistente.
// 29I (achado 103): o time passou de /equipa para /time (o link que a pessoa copia para o grupo). O antigo /equipa/ continua na lista:
// link já enviado no WhatsApp abre o app e a rota antiga redireciona para a nova (App.jsx). Android: o intent-filter novo (/time) só vale
// depois de um build novo do app; até lá o link /time abre no navegador, que funciona.
export const PREFIXOS_DE_LINK = ['/convite/', '/c/', '/time/', '/equipa/'];

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
