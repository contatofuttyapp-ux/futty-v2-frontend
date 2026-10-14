// Futty v2.0 — o link único de download: futtyapp.com.br/download (/baixar e /app levam para cá).
//
// No navegador de um celular vai direto para a loja do aparelho (utils/lojaDoApp.js): iPhone e iPad → App Store, Android → Play Store.
// `replace`: o Voltar da loja não cai de novo aqui (que mandaria de volta para a loja). No computador, num aparelho desconhecido ou dentro
// do próprio app: a página simples — o ícone, o slogan e as duas lojas. Sem login.
// Fica FORA da lista de links que abrem o app (lib/linkDoSite.js, o AASA do iOS e o manifesto do Android), de propósito: com o app
// instalado, o link de baixar continua sendo o de baixar, e a página nunca cai dentro do app.
import { useEffect, useRef, useState } from 'react';
import FuttyLogo from '../components/FuttyLogo';
import { ehNativo } from '../lib/plataforma';
import { LINK_APP_STORE, LINK_PLAY_STORE, linkDaLoja, lojaDoNavegador } from '../utils/lojaDoApp';
import '../styles/app.css';
import '../styles/convite.css';

export default function Download() {
  const [loja] = useState(() => (ehNativo() ? null : lojaDoNavegador(globalThis.navigator)));
  // Uma ida só à loja: um efeito que roda de novo (o StrictMode do desenvolvimento roda duas vezes) cortaria a primeira navegação.
  const foiParaALoja = useRef(false);

  useEffect(() => {
    if (!loja || foiParaALoja.current) return;
    foiParaALoja.current = true;
    window.location.replace(linkDaLoja(loja));
  }, [loja]);

  return (
    <main className="convite" data-download={loja || 'pagina'}>
      <div className="convite__col">
        <div className="convite__marca" aria-label="Futty">
          <FuttyLogo variant="icone" size={64} />
          <span className="convite__marca-nome" aria-hidden="true">FUTTY</span>
        </div>
        <h1 className="download__slogan">
          O seu time. <b>A sua figurinha.</b>
        </h1>
        <div className="convite__acoes">
          <a href={LINK_APP_STORE} className="btn cta-gold convite__cta">
            App Store
          </a>
          <a href={LINK_PLAY_STORE} className="btn cta-gold convite__cta">
            Google Play
          </a>
        </div>
      </div>
    </main>
  );
}
