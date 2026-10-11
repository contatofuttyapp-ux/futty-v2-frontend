/* eslint-disable react-refresh/only-export-components -- página-bancada das provas no navegador, não faz parte do app */
// Bancada da prova da Rodada 30L (o campeonato nasce do sorteio do jogo, scripts/provas/rodada-30l.prova.mjs). As telas DE VERDADE — a página dos
// campeonatos (a escolha "Criar campeonato" e o manual), o Painel → Jogos, a Página do Jogo com o resultado do sorteio e a página do campeonato —,
// com o mesmo CSS e as mesmas fontes do app, num roteador de memória que abre no caminho que a prova põe em window.__caminho. O motor é de mentira
// (a prova responde /api/** com page.route) — nada sai para a rede.
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { AuthProvider } from '../../src/context/AuthContext';
import { PerfilProvider } from '../../src/context/PerfilContext';
import { SessaoProvider } from '../../src/context/SessaoContext';
import { I18nProvider } from '../../src/context/I18nContext';
import Campeonato from '../../src/pages/Campeonato';
import Jogo from '../../src/pages/Jogo';
import { JogosDoAdmin } from '../../src/pages/AdminPanel';
import '../../src/index.css';
import '../../src/styles/app.css';

const TIME = { slug: 'domingueira-fc', nome: 'Domingueira FC', fuso: 'America/Sao_Paulo', cidade: 'São Paulo' };

// Painel → Jogos DE VERDADE (o botão "Criar campeonato" e a escolha que ele abre).
function CenaPainel() {
  const navigate = useNavigate();
  return (
    <div style={{ maxWidth: 390, padding: 16 }}>
      <JogosDoAdmin slug="domingueira-fc" team={TIME} showToast={(mensagem, tipo = 'success') => { (window.__toasts ||= []).push([mensagem, tipo]); }} navigate={navigate} />
    </div>
  );
}

createRoot(document.getElementById('raiz')).render(
  <I18nProvider>
    <AuthProvider>
      <PerfilProvider>
        <MemoryRouter initialEntries={[window.__caminho || '/time/domingueira-fc/campeonato']}>
          <SessaoProvider>
            <Routes>
              <Route path="/painel-jogos" element={<CenaPainel />} />
              <Route path="/time/:slug/campeonato" element={<Campeonato />} />
              <Route path="/time/:slug/campeonato/:id" element={<Campeonato />} />
              <Route path="/time/:slug/jogo/novo" element={<div data-novo-jogo>NOVO JOGO</div>} />
              <Route path="/time/:slug/jogo/:id" element={<Jogo />} />
              <Route path="*" element={<div data-casa>BANCADA</div>} />
            </Routes>
          </SessaoProvider>
        </MemoryRouter>
      </PerfilProvider>
    </AuthProvider>
  </I18nProvider>,
);
