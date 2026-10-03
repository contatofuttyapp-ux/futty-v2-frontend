/* eslint-disable react-refresh/only-export-components -- página-bancada das provas no navegador, não faz parte do app */
// Bancada da prova "Página do time" (scripts/provas/time-admin.prova.mjs, Rodada 29I, bloco 3): a página do time DE VERDADE (com as abas
// Jogos · Elenco · Ajustes e as partes do admin em lazy) num BrowserRouter, com um "Início" de mentira antes dela (para o Voltar ter para
// onde voltar); os seis padrões do escudo nos três tamanhos das bancadas do dono; e o card "Seu time" do Início. O motor é de mentira
// (a prova responde /api/** com page.route) — nada sai para a rede.
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { AuthProvider } from '../../src/context/AuthContext';
import { PerfilProvider } from '../../src/context/PerfilContext';
import Equipa from '../../src/pages/Equipa';
import EscudoEquipa from '../../src/components/EscudoEquipa';
import CardSeuTime from '../../src/components/CardSeuTime';
import { PADROES } from '../../src/utils/escudo';
import '../../src/index.css';
import '../../src/styles/app.css';

function Casa() {
  return <div><h1 data-casa>INICIO-DE-MENTIRA</h1><Link data-ir to="/time/varzea-fc">ir ao time</Link></div>;
}
function Outra() { return <div data-outra>OUTRA-TELA</div>; }

function Escudos() {
  return (
    <div data-escudos style={{ display: 'grid', gap: 14, padding: 16 }}>
      {PADROES.map((p) => (
        <div key={p.chave} data-padrao={p.chave} style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
          {[84, 36, 20].map((s) => (
            <span key={s} data-tamanho={s}>
              <EscudoEquipa team={{ nome: 'Várzea FC', cor: 'verde', escudo_cor2: 'ouro', escudo_padrao: p.chave }} size={s} />
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}

const TIMES = [{ id: 'T1', slug: 'varzea-fc', nome: 'Várzea FC', cor: 'vinho', escudo_cor2: 'ouro', escudo_padrao: 'faixa' }];
function SeuTime() {
  return (
    <div style={{ padding: 16 }}>
      <div data-com-pendencias>
        <CardSeuTime
          seuTime={[{ team_id: 'T1', slug: 'varzea-fc', nome: 'Várzea FC', fuso: 'America/Sao_Paulo', pendencias: { pedidos: 2, presenca: { game_id: 'g2', data: '2026-10-08T23:00:00Z' }, resultado: { game_id: 'g1', data: '2026-10-01T23:00:00Z' }, denuncias: 1, total: 5 } }]}
          teams={TIMES}
          games={[{ id: 'g2', team_id: 'T1', status: 'scheduled', date: '2026-10-08T23:00:00Z' }]}
        />
      </div>
      <div data-sem-pendencias>
        <CardSeuTime seuTime={[{ team_id: 'T1', slug: 'varzea-fc', nome: 'Várzea FC', pendencias: { pedidos: 0, presenca: null, resultado: null, denuncias: 0, total: 0 } }]} teams={TIMES} games={[]} />
      </div>
    </div>
  );
}

createRoot(document.getElementById('raiz')).render(
  <AuthProvider>
    <PerfilProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/scripts/provas/time-admin.html" element={<Casa />} />
          <Route path="/home" element={<Outra />} />
          <Route path="/escudos" element={<Escudos />} />
          <Route path="/seu-time" element={<SeuTime />} />
          <Route path="/time/:slug" element={<Equipa />} />
          <Route path="/time/:slug/*" element={<Outra />} />
        </Routes>
      </BrowserRouter>
    </PerfilProvider>
  </AuthProvider>
);
