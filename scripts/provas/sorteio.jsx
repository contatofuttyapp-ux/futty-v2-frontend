// Bancada da prova da cerimônia do sorteio (scripts/provas/sorteio.prova.mjs): a CerimoniaSorteio de verdade, com dois times de 5 e uma reserva.
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import CerimoniaSorteio from '../../src/components/CerimoniaSorteio';
import '../../src/index.css';
import '../../src/styles/app.css';

const jog = (n, i) => ({ user_id: `u${n}${i}`, nome: `Jogador ${n}${i}`, avatar_url: null, rating: 3 });
const resultado = {
  num_times: 2,
  seed: 3303,
  total_jogadores: 11,
  times: [
    { nome: 'Time A', jogadores: [1, 2, 3, 4, 5].map((i) => jog('a', i)) },
    { nome: 'Time B', jogadores: [1, 2, 3, 4, 5].map((i) => jog('b', i)) },
  ],
  reservas: [jog('r', 1)],
};
window.__terminou = 0;
createRoot(document.getElementById('raiz')).render(
  <BrowserRouter>
    <div style={{ maxWidth: 480, margin: '0 auto' }}>
      <CerimoniaSorteio resultado={resultado} equipa="Missa de Quinta" data="8 out 2026" aoTerminar={() => { window.__terminou += 1; }} bannerInterno={false} euSorteei={false} />
    </div>
  </BrowserRouter>
);
