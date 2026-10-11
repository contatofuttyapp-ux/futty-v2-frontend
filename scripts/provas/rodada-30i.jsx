/* eslint-disable react-refresh/only-export-components -- página-bancada das provas no navegador, não faz parte do app */
// Bancada da prova da Rodada 30I ("Quem ganhou?", scripts/provas/rodada-30i.prova.mjs). Cada parte da rodada é uma "cena" escolhida pelo
// hash da URL (#empate, #editor, #inicio…): a tela de verdade, com o mesmo CSS e as mesmas fontes do app. O motor é de mentira
// (a prova responde /api/** com page.route) — nada sai para a rede.
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../../src/context/AuthContext';
import { PerfilProvider } from '../../src/context/PerfilContext';
import { SessaoProvider } from '../../src/context/SessaoContext';
import { I18nProvider } from '../../src/context/I18nContext';
import { JogoCard } from '../../src/pages/Feed';
import '../../src/index.css';
import '../../src/styles/app.css';

const TIMES = [
  { nome: 'Time A', jogadores: [{ user_id: 'u1', nome: 'Magrão', avatar_url: null }, { user_id: 'u2', nome: 'Zé', avatar_url: null }] },
  { nome: 'Time B', jogadores: [{ user_id: 'u3', nome: 'Cacá', avatar_url: null }, { user_id: 'u4', nome: 'Duda', avatar_url: null }] },
];
const jogo = (extra) => ({
  kind: 'jogo', id: 'g1', created_at: new Date().toISOString(), date: new Date(Date.now() - 86400000).toISOString(), time: '20:00', fuso: 'America/Sao_Paulo',
  location: 'Quadra do Zé', team_id: 't1', team_name: 'Missa de Quinta', team_slug: 'missa', times_resultado: { times: TIMES },
  campeao_time_index: null, time_vencedor: null, placar_a: null, placar_b: null, campeao_foto_url: null,
  artilheiro_user_id: null, destaque_user_id: null, contagem_reacoes: {}, minha_reacao: null, comentarios_total: 0, comentarios_recentes: [], ...extra,
});

// A Resenha: o jogo empatado com placar, o empatado sem placar e, para comparar, o que teve campeão.
function CenaEmpate() {
  return (
    <div style={{ maxWidth: 390, padding: 16, display: 'grid', gap: 16 }}>
      <div data-c="com-placar"><JogoCard j={jogo({ id: 'g1', time_vencedor: 'empate', placar_a: 2, placar_b: 2 })} isAdmin teamSlug="missa" onOpenImage={() => {}} /></div>
      <div data-c="sem-placar"><JogoCard j={jogo({ id: 'g2', time_vencedor: 'empate' })} isAdmin teamSlug="missa" onOpenImage={() => {}} /></div>
      <div data-c="campeao"><JogoCard j={jogo({ id: 'g3', campeao_time_index: 1, time_vencedor: 'B', placar_a: 1, placar_b: 3 })} isAdmin teamSlug="missa" onOpenImage={() => {}} /></div>
    </div>
  );
}

const CENAS = { empate: CenaEmpate };
const Cena = CENAS[window.location.hash.slice(1)] || (() => <div data-casa>BANCADA</div>);
createRoot(document.getElementById('raiz')).render(
  <I18nProvider>
    <AuthProvider>
      <PerfilProvider>
        <BrowserRouter>
          <SessaoProvider>
            <Cena />
          </SessaoProvider>
        </BrowserRouter>
      </PerfilProvider>
    </AuthProvider>
  </I18nProvider>,
);
