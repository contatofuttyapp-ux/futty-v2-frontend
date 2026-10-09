/* eslint-disable react-refresh/only-export-components -- página-bancada das provas no navegador, não faz parte do app */
// Bancada da prova do item 3 da 30F (scripts/provas/montar-a-mao-troca.prova.mjs): a tela do jogo NÃO remonta a lista
// dos times quando o resultado muda (salvar "Montar à mão" só recarrega o jogo). Aqui o DrawnTeams e a lista de gols do
// ResultadoEditor recebem um resultado sorteado com 2 convidados e, ao toque, o resultado montado à mão só com gente
// com conta — como na tela do jogo.
import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import DrawnTeams from '../../src/components/DrawnTeams';
import ResultadoEditor from '../../src/components/ResultadoEditor';
import '../../src/index.css';
import '../../src/styles/app.css';

const j = (n) => ({ user_id: `u${n}`, nome: `Jogador ${n}`, avatar_url: null, rating: 3 });
const g = (nome) => ({ user_id: null, convidado: true, nome, avatar_url: null, rating: 3 });
const SORTEADO = {
  seed: 9, num_times: 2,
  times: [{ nome: 'Time A', jogadores: [1, 2, 3, 4, 5, 6].map(j) }, { nome: 'Time B', jogadores: [j(7), j(8), j(9), j(10), g('Convidado Teste'), g('Convidado Dois')] }],
  reservas: [j(11), j(12)],
  registro: { origem: 'sorteio', por: { nome: 'Chavo' }, sorteio_numero: 2, sorteios: 2, ajustes: [] },
};
const A_MAO = {
  manual: true, num_times: 2,
  times: [{ nome: 'Time Ouro', jogadores: [1, 2, 3, 4, 5, 6].map(j) }, { nome: 'Time Roxo', jogadores: [7, 8, 9, 10, 11, 12].map(j) }],
  reservas: [],
  registro: { origem: 'manual', por: { nome: 'Chavo' }, sorteios: 2, ajustes: [] },
};
const jogadoresDoResultado = (tr) => [
  ...(tr.times[0]?.jogadores || []).map((x) => ({ ...x, time: 'A' })),
  ...(tr.times[1]?.jogadores || []).map((x) => ({ ...x, time: 'B' })),
];

function Tela() {
  const [tr, setTr] = useState(SORTEADO);
  return (
    <div style={{ maxWidth: 390, padding: 16 }}>
      <button type="button" data-salvar-a-mao onClick={() => setTr(A_MAO)}>salvar à mão</button>
      <div data-lista><DrawnTeams resultado={tr} /></div>
      <div data-gols>
        <ResultadoEditor gameId="g1" game={{ resultado_nivel: 3, data: '2026-10-01T23:00:00Z' }} gols={[]} jogadores={jogadoresDoResultado(tr)} nomeA="Time Ouro" nomeB="Time Roxo" onSaved={() => {}} showToast={() => {}} />
      </div>
    </div>
  );
}
createRoot(document.getElementById('raiz')).render(<Tela />);
