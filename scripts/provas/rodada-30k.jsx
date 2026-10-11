// Bancada da prova da Rodada 30K (campeonato "Todos contra todos + final", scripts/provas/rodada-30k.prova.mjs). As telas DE VERDADE (a lista e o
// criar do campeonato, a página do campeonato, a página pública e a Página do Jogo, onde o admin escolhe o formato a partir do sorteio), com o
// mesmo CSS e as mesmas fontes do app, num roteador de memória que abre no caminho que a prova põe em window.__caminho. O motor é de mentira (a
// prova responde /api/** com page.route) — nada sai para a rede.
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '../../src/context/AuthContext';
import { PerfilProvider } from '../../src/context/PerfilContext';
import { SessaoProvider } from '../../src/context/SessaoContext';
import { I18nProvider } from '../../src/context/I18nContext';
import Campeonato from '../../src/pages/Campeonato';
import CampeonatoPublico from '../../src/pages/CampeonatoPublico';
import Jogo from '../../src/pages/Jogo';
import '../../src/index.css';
import '../../src/styles/app.css';

createRoot(document.getElementById('raiz')).render(
  <I18nProvider>
    <AuthProvider>
      <PerfilProvider>
        <MemoryRouter initialEntries={[window.__caminho || '/time/domingueira-fc/campeonato']}>
          <SessaoProvider>
            <Routes>
              <Route path="/time/:slug/campeonato" element={<Campeonato />} />
              <Route path="/time/:slug/campeonato/:id" element={<Campeonato />} />
              <Route path="/p/campeonato/:slug/:id" element={<CampeonatoPublico />} />
              <Route path="/time/:slug/jogo/:id" element={<Jogo />} />
              <Route path="*" element={<div data-casa>BANCADA</div>} />
            </Routes>
          </SessaoProvider>
        </MemoryRouter>
      </PerfilProvider>
    </AuthProvider>
  </I18nProvider>,
);
