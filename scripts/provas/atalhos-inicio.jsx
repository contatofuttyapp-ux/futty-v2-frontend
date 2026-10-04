/* eslint-disable react-refresh/only-export-components -- página-bancada das provas no navegador, não faz parte do app */
// Bancada dos dois cartões do Início (scripts/provas/atalhos-inicio.prova.mjs): o componente de verdade, com duas rotas de mentira
// no lugar de /explorar e /criar-time, para provar para onde cada toque leva.
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import AtalhosDoInicio from '../../src/components/AtalhosDoInicio';
import '../../src/index.css';
import '../../src/styles/app.css';

function Onde({ nome }) { const l = useLocation(); return <div data-onde={l.pathname}>{nome}</div>; }

createRoot(document.getElementById('raiz')).render(
  <BrowserRouter>
    <Routes>
      <Route path="/scripts/provas/atalhos-inicio.html" element={<div style={{ padding: 16 }}><AtalhosDoInicio /></div>} />
      <Route path="/explorar" element={<Onde nome="RADAR-DE-MENTIRA" />} />
      <Route path="/criar-time" element={<Onde nome="CRIAR-TIME-DE-MENTIRA" />} />
    </Routes>
  </BrowserRouter>
);
