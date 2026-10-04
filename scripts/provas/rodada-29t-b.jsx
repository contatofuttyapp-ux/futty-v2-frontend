/* eslint-disable react-refresh/only-export-components -- página-bancada das provas no navegador, não faz parte do app */
// Bancada da prova da Rodada 29T, bloco B (scripts/provas/rodada-29t-b.prova.mjs): o Início, o Radar de peladas, o Criar time e a página do time (com a aba
// Ajustes) DE VERDADE, dentro do Layout, com as mesmas fontes e o mesmo CSS do app. O motor é de mentira (a prova responde /api/** com page.route) e a sessão é
// de mentira (a prova planta a chave do Supabase no localStorage) — nada sai para a rede. As listas de cidades e de bairros descem do próprio Vite
// (public/dados/), as de verdade.
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '../../src/context/AuthContext';
import { PerfilProvider } from '../../src/context/PerfilContext';
import { SessaoProvider } from '../../src/context/SessaoContext';
import { I18nProvider } from '../../src/context/I18nContext';
import Layout from '../../src/components/Layout';
import Inicio from '../../src/pages/Inicio';
import Explorar from '../../src/pages/Explorar';
import CriarEquipa from '../../src/pages/CriarEquipa';
import Equipa from '../../src/pages/Equipa';
import '../../src/index.css';
import '../../src/styles/app.css';

function Casa() { return <div data-casa>BANCADA</div>; }

createRoot(document.getElementById('raiz')).render(
  <I18nProvider>
    <AuthProvider>
      <PerfilProvider>
        <BrowserRouter>
          <SessaoProvider>
            <Layout>
              <Routes>
                <Route path="/scripts/provas/rodada-29t-b.html" element={<Casa />} />
                <Route path="/home" element={<Inicio />} />
                <Route path="/explorar" element={<Explorar />} />
                <Route path="/criar-time" element={<CriarEquipa />} />
                <Route path="/time/:slug" element={<Equipa />} />
                <Route path="*" element={<Casa />} />
              </Routes>
            </Layout>
          </SessaoProvider>
        </BrowserRouter>
      </PerfilProvider>
    </AuthProvider>
  </I18nProvider>,
);
