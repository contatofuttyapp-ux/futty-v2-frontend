/* eslint-disable react-refresh/only-export-components -- página-bancada das provas no navegador, não faz parte do app */
// Bancada da prova da Rodada 29Z (scripts/provas/rodada-29z.prova.mjs): as telas principais DE VERDADE (com o Layout, os contextos e a barra de
// baixo), com as mesmas fontes e o mesmo CSS do app, para medir em 360 e 390 px (a) se alguma rola para o lado ou corta campo, botão ou nome, e
// (b) se algum número aparece com ponto decimal no texto. O motor é de mentira (a prova responde /api/** com page.route) e a sessão também (a
// prova planta a chave do Supabase no localStorage): nada sai para a rede.
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '../../src/context/AuthContext';
import { PerfilProvider } from '../../src/context/PerfilContext';
import { SessaoProvider } from '../../src/context/SessaoContext';
import { I18nProvider } from '../../src/context/I18nContext';
import Layout from '../../src/components/Layout';
import Inicio from '../../src/pages/Inicio';
import Explorar from '../../src/pages/Explorar';
import Ranking from '../../src/pages/Ranking';
import JogadorPerfil from '../../src/pages/JogadorPerfil';
import NovoJogo from '../../src/pages/NovoJogo';
import MeuPerfil from '../../src/pages/MeuPerfil';
import Gabinete from '../../src/pages/Gabinete';
import { ElencoDoAdmin } from '../../src/pages/AdminPanel';
import '../../src/index.css';
import '../../src/styles/app.css';

function Casa() { return <div data-casa>BANCADA</div>; }
function Elenco() { return <div className="app-shell"><main className="app-main"><ElencoDoAdmin slug="missa" meId="U1" showToast={() => {}} /></main></div>; }

createRoot(document.getElementById('raiz')).render(
  <I18nProvider>
    <AuthProvider>
      <PerfilProvider>
        <BrowserRouter>
          <SessaoProvider>
            <Layout>
              <Routes>
                <Route path="/scripts/provas/rodada-29z.html" element={<Casa />} />
                <Route path="/home" element={<Inicio />} />
                <Route path="/explorar" element={<Explorar />} />
                <Route path="/time/:slug/ranking" element={<Ranking />} />
                <Route path="/time/:slug/jogador/:userId" element={<JogadorPerfil />} />
                <Route path="/time/:slug/jogo/novo" element={<NovoJogo />} />
                <Route path="/perfil" element={<MeuPerfil />} />
                <Route path="/gabinete" element={<Gabinete />} />
                <Route path="/elenco" element={<Elenco />} />
                <Route path="*" element={<Casa />} />
              </Routes>
            </Layout>
          </SessaoProvider>
        </BrowserRouter>
      </PerfilProvider>
    </AuthProvider>
  </I18nProvider>,
);
