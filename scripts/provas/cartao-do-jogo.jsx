/* eslint-disable react-refresh/only-export-components -- página-bancada das provas no navegador, não faz parte do app */
// Bancada da prova do card de jogo do Início (scripts/provas/cartao-do-jogo.prova.mjs): o GameCard de verdade, em três estados (agendado,
// sorteado, encerrado), com as ações registradas em window.__chamadas e a rota atual escrita na tela.
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { GameCard } from '../../src/pages/Inicio';
import '../../src/index.css';
import '../../src/styles/app.css';

window.__chamadas = [];
const jogo = (extra) => ({ id: 'j1', name: 'Quadra do Zé', date: new Date(Date.now() + 3 * 864e5).toISOString(), fuso: 'America/Sao_Paulo', confirmed_count: 11, status: 'scheduled', user_status: null, eu_jogo: true, team_slug: 'missa', team_name: 'Missa de Quinta', ...extra });
function Mostra() { const l = useLocation(); return <div data-onde>{l.pathname}</div>; }
function Tela() {
  return (
    <div style={{ maxWidth: 390, padding: 16 }}>
      <Mostra />
      <div data-c="agendado"><GameCard game={jogo({})} busy={false} isNext onPresence={(id, vou) => window.__chamadas.push(['presenca', id, vou])} onVerSorteio={(g) => window.__chamadas.push(['sorteio', g.id])} /></div>
      <div data-c="sorteado"><GameCard game={jogo({ id: 'j2', status: 'drawn', name: 'Campo do Bairro' })} busy={false} isNext={false} onPresence={() => {}} onVerSorteio={(g) => window.__chamadas.push(['sorteio', g.id])} /></div>
      <div data-c="abrindo"><GameCard game={jogo({ id: 'j4', status: 'drawn', name: 'Quadra Nova' })} busy={false} isNext={false} abrindo onPresence={() => {}} onVerSorteio={() => {}} /></div>
      <div data-c="encerrado"><GameCard game={jogo({ id: 'j3', status: 'finished', name: 'Arena Velha' })} busy={false} isNext={false} onPresence={() => {}} onVerSorteio={() => {}} /></div>
    </div>
  );
}
createRoot(document.getElementById('raiz')).render(<BrowserRouter><Routes><Route path="*" element={<Tela />} /></Routes></BrowserRouter>);
