/* eslint-disable react-refresh/only-export-components -- página-bancada das provas no navegador, não faz parte do app */
// Bancada da prova da Rodada 29S, bloco A (scripts/provas/rodada-29s-a.prova.mjs): o Marcar jogo (NovoJogo) e o Jogo DE VERDADE, com o Layout, as mesmas
// fontes e o mesmo CSS do app. O motor é de mentira (a prova responde /api/** com page.route) e a sessão também (a prova planta a chave do Supabase
// no localStorage, para o cache do Início existir) — nada sai para a rede.
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider } from '../../src/context/AuthContext';
import { PerfilProvider } from '../../src/context/PerfilContext';
import { SessaoProvider } from '../../src/context/SessaoContext';
import { I18nProvider } from '../../src/context/I18nContext';
import Layout from '../../src/components/Layout';
import NovoJogo from '../../src/pages/NovoJogo';
import Jogo from '../../src/pages/Jogo';
import '../../src/index.css';
import '../../src/styles/app.css';

function Casa() { return <div data-casa>BANCADA</div>; }
// A cerimônia do sorteio é de outra tela: aqui só marca que a navegação chegou.
function SorteioAberto() {
  const { pathname, state } = useLocation();
  return <div data-sorteio-aberto data-caminho={pathname} data-eu-sorteei={state?.euSorteei ? '1' : '0'}>SORTEIO</div>;
}

createRoot(document.getElementById('raiz')).render(
  <I18nProvider>
    <AuthProvider>
      <PerfilProvider>
        <BrowserRouter>
          <SessaoProvider>
            <Layout>
              <Routes>
                <Route path="/scripts/provas/rodada-29s-a.html" element={<Casa />} />
                <Route path="/time/:slug/jogo/novo" element={<NovoJogo />} />
                <Route path="/time/:slug/jogo/:id/sorteio" element={<SorteioAberto />} />
                <Route path="/time/:slug/jogo/:id" element={<Jogo />} />
                <Route path="*" element={<Casa />} />
              </Routes>
            </Layout>
          </SessaoProvider>
        </BrowserRouter>
      </PerfilProvider>
    </AuthProvider>
  </I18nProvider>,
);
