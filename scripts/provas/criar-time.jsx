/* eslint-disable react-refresh/only-export-components -- página-bancada das provas no navegador, não faz parte do app */
// Bancada da prova do wizard "Criar time" (scripts/provas/criar-time.prova.mjs): o CriarEquipa de verdade num BrowserRouter, com um "Início"
// de mentira antes dele (para haver para onde voltar) e um "time" de mentira depois (para onde "Ir para o time" leva).
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import CriarEquipa from '../../src/pages/CriarEquipa';
import '../../src/index.css';

function Casa() {
  return <div><h1 data-casa>INICIO-DE-MENTIRA</h1><Link data-ir to="/criar-time">criar</Link></div>;
}
function Time() { return <div data-time>TIME-DE-MENTIRA</div>; }

createRoot(document.getElementById('raiz')).render(
  <BrowserRouter>
    <Routes>
      <Route path="/scripts/provas/criar-time.html" element={<Casa />} />
      <Route path="/home" element={<Casa />} />
      <Route path="/criar-time" element={<CriarEquipa />} />
      <Route path="/time/:slug" element={<Time />} />
    </Routes>
  </BrowserRouter>
);
