// Bancada da prova da Rodada 30L, parte 2 (acabamentos, pênaltis, o campeonato no Início e o post do campeão na Resenha; scripts/provas/rodada-30l2.prova.mjs).
// As telas DE VERDADE — o Início e a Resenha, a Página do Jogo, o campeonato (do time e o público) —, dentro do Layout como no app, com o mesmo CSS e as
// mesmas fontes. Abre numa página em branco (data-casa); a prova navega por history.pushState para o caminho que quer ver. O motor é de mentira (a prova
// responde /api/** com page.route) — nada sai para a rede.
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '../../src/context/AuthContext';
import { PerfilProvider } from '../../src/context/PerfilContext';
import { SessaoProvider } from '../../src/context/SessaoContext';
import { I18nProvider } from '../../src/context/I18nContext';
import Inicio from '../../src/pages/Inicio';
import Feed from '../../src/pages/Feed';
import Jogo from '../../src/pages/Jogo';
import Campeonato from '../../src/pages/Campeonato';
import CampeonatoPublico from '../../src/pages/CampeonatoPublico';
import Layout from '../../src/components/Layout';
import '../../src/index.css';
import '../../src/styles/app.css';

createRoot(document.getElementById('raiz')).render(
  <I18nProvider>
    <AuthProvider>
      <PerfilProvider>
        <BrowserRouter>
          <SessaoProvider>
            <Layout>
              <Routes>
                <Route path="/home" element={<Inicio />} />
                <Route path="/feed" element={<Feed />} />
                <Route path="/time/:slug/jogo/:id" element={<Jogo />} />
                <Route path="/time/:slug/campeonato" element={<Campeonato />} />
                <Route path="/time/:slug/campeonato/:id" element={<Campeonato />} />
                <Route path="/p/campeonato/:slug/:id" element={<CampeonatoPublico />} />
                <Route path="*" element={<div data-casa>BANCADA</div>} />
              </Routes>
            </Layout>
          </SessaoProvider>
        </BrowserRouter>
      </PerfilProvider>
    </AuthProvider>
  </I18nProvider>,
);
