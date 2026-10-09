// Bancada da prova do nome do Início (scripts/provas/nome-do-inicio.prova.mjs): o NomeCromo de verdade, com a Rajdhani
// carregada, nas larguras em que o nome do dono ("Chavo, el matador") cortava por menos de 1 px.
import { createRoot } from 'react-dom/client';
import { NomeCromo } from '../../src/pages/Inicio';
import '../../src/index.css';
import '../../src/styles/app.css';

const LARGURAS = [360, 358, 340, 320, 288];
const NOMES = { curto: 'Tonhão', dono: 'Chavo, el matador', limite: 'Chavo el matadorzz', um: 'Z' };

createRoot(document.getElementById('raiz')).render(
  <div style={{ padding: 0 }}>
    {LARGURAS.map((w) => (
      <div key={w} data-largura={w} style={{ width: w }}>
        {Object.entries(NOMES).map(([k, n]) => <div key={k} data-nome={k}><NomeCromo nome={n} /></div>)}
      </div>
    ))}
  </div>,
);
