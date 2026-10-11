/* eslint-disable react-refresh/only-export-components -- página-bancada das provas no navegador, não faz parte do app */
// Bancada da prova da Rodada 30J ("Em andamento" x "Terminado" + "Painel do time", scripts/provas/rodada-30j.prova.mjs). Cada parte é uma "cena" escolhida pelo
// hash da URL (#inicio, #ajustes, #lista, #jogo): a tela de verdade, com o mesmo CSS e as mesmas fontes do app. O motor é de mentira (a prova responde
// /api/** com page.route) — nada sai para a rede.
import { createRoot } from 'react-dom/client';
import { BrowserRouter, MemoryRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { AuthProvider } from '../../src/context/AuthContext';
import { PerfilProvider } from '../../src/context/PerfilContext';
import { SessaoProvider } from '../../src/context/SessaoContext';
import { I18nProvider } from '../../src/context/I18nContext';
import Inicio from '../../src/pages/Inicio';
import Jogo from '../../src/pages/Jogo';
import Layout from '../../src/components/Layout';
import ListaDeJogos from '../../src/components/ListaDeJogos';
import { JogosDoAdmin } from '../../src/pages/AdminPanel';
import '../../src/index.css';
import '../../src/styles/app.css';

// O Início DE VERDADE (a página inteira, com o Layout e o contexto do Início): a prova navega para /home e responde /api/inicio com o motor de mentira.
function CenaInicio() {
  return (
    <Layout>
      <Routes>
        <Route path="/home" element={<Inicio />} />
        <Route path="*" element={<div data-casa>BANCADA</div>} />
      </Routes>
    </Layout>
  );
}

// Ajustes → Jogos DE VERDADE (a lista de cima e a de baixo), com o time no fuso de São Paulo.
const TIME = { slug: 'missa', nome: 'Missa de Quinta', fuso: 'America/Sao_Paulo', cidade: 'Brasília - DF' };
function CenaAjustes() {
  const navigate = useNavigate();
  return (
    <div style={{ maxWidth: 390, padding: 16 }}>
      <JogosDoAdmin slug="missa" team={TIME} showToast={(mensagem, tipo = 'success') => { (window.__toasts ||= []).push([mensagem, tipo]); }} navigate={navigate} />
    </div>
  );
}

// A lista de jogos do time (a aba Jogos de quem não é admin e a página /time/:slug/jogos).
function CenaLista() {
  const games = window.__games || [];
  return (
    <div style={{ maxWidth: 390, padding: 16 }}>
      <ListaDeJogos slug="missa" team={TIME} games={games} />
    </div>
  );
}

// A tela do jogo DE VERDADE (Jogo.jsx), num roteador de memória.
function CenaJogo() {
  return (
    <MemoryRouter initialEntries={['/time/missa/jogo/g1']}>
      <SessaoProvider>
        <Routes><Route path="/time/:slug/jogo/:id" element={<Jogo />} /></Routes>
      </SessaoProvider>
    </MemoryRouter>
  );
}
const CENAS_COM_ROTEADOR_PROPRIO = new Set(['jogo']);

const CENAS = { inicio: CenaInicio, ajustes: CenaAjustes, lista: CenaLista, jogo: CenaJogo };
const Cena = CENAS[window.location.hash.slice(1)] || (() => <div data-casa>BANCADA</div>);
const comRoteador = !CENAS_COM_ROTEADOR_PROPRIO.has(window.location.hash.slice(1));
createRoot(document.getElementById('raiz')).render(
  <I18nProvider>
    <AuthProvider>
      <PerfilProvider>
        {comRoteador ? (
          <BrowserRouter>
            <SessaoProvider>
              <Cena />
            </SessaoProvider>
          </BrowserRouter>
        ) : (
          <Cena />
        )}
      </PerfilProvider>
    </AuthProvider>
  </I18nProvider>,
);
