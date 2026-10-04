/* eslint-disable react-refresh/only-export-components -- página-bancada das provas no navegador, não faz parte do app */
// Bancada da prova da Rodada 29S, bloco B (scripts/provas/rodada-29s-b.prova.mjs): o Jogo passado (JogoPassado) DE VERDADE, com o Layout, as mesmas
// fontes e o mesmo CSS do app. O motor é de mentira (a prova responde /api/** com page.route) e a sessão também (a prova planta a chave do Supabase
// no localStorage) — nada sai para a rede. O jogo salvo é só um marcador: a página do Jogo tem prova própria (rodada-29s-a).
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider } from '../../src/context/AuthContext';
import { PerfilProvider } from '../../src/context/PerfilContext';
import { SessaoProvider } from '../../src/context/SessaoContext';
import { I18nProvider } from '../../src/context/I18nContext';
import Layout from '../../src/components/Layout';
import JogoPassado from '../../src/pages/JogoPassado';
import '../../src/index.css';
import '../../src/styles/app.css';

function Casa() { return <div data-casa>BANCADA</div>; }
// O jogo salvo: só marca que a navegação chegou (e se foi por "replace", o que a prova confere pelo histórico).
function JogoSalvo() {
  const { pathname } = useLocation();
  return <div data-jogo-salvo data-caminho={pathname}>JOGO SALVO</div>;
}

createRoot(document.getElementById('raiz')).render(
  <I18nProvider>
    <AuthProvider>
      <PerfilProvider>
        <BrowserRouter>
          <SessaoProvider>
            <Layout>
              <Routes>
                <Route path="/scripts/provas/rodada-29s-b.html" element={<Casa />} />
                <Route path="/time/:slug/jogo/passado" element={<JogoPassado />} />
                <Route path="/time/:slug/jogo/:id" element={<JogoSalvo />} />
                <Route path="*" element={<Casa />} />
              </Routes>
            </Layout>
          </SessaoProvider>
        </BrowserRouter>
      </PerfilProvider>
    </AuthProvider>
  </I18nProvider>,
);
