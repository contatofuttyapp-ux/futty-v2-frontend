/* eslint-disable react-refresh/only-export-components -- página-bancada das provas no navegador, não faz parte do app */
// Bancada de telas pequenas (scripts/provas/telas-simples.prova.mjs): a tela "Algo deu errado" (ErrorBoundary) com um erro de chunk e a landing.
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import ErrorBoundary from '../../src/components/ErrorBoundary';
import LandingPage from '../../src/pages/LandingPage';
import '../../src/index.css';
import '../../src/styles/app.css';

function Explode() {
  throw new Error('Failed to fetch dynamically imported module: http://localhost:5173/assets/LandingPage-CrVMuwKN.js');
}
function Mostra() { const l = useLocation(); return <div data-onde>{l.pathname}</div>; }

createRoot(document.getElementById('raiz')).render(
  <BrowserRouter>
    <Routes>
      <Route path="/scripts/provas/telas-simples.html" element={<ErrorBoundary><Explode /></ErrorBoundary>} />
      <Route path="/landing" element={<LandingPage />} />
      <Route path="/termos" element={<div><Mostra />TERMOS-DE-MENTIRA</div>} />
      <Route path="/privacidade" element={<div><Mostra />PRIVACIDADE-DE-MENTIRA</div>} />
    </Routes>
  </BrowserRouter>
);
