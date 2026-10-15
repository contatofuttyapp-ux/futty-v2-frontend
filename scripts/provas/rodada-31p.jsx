/* eslint-disable react-refresh/only-export-components -- página-bancada das provas no navegador, não faz parte do app */
// Bancada da prova da Rodada 31P (confete e rodada de cerveja, scripts/provas/rodada-31p.prova.mjs). Cada cena é escolhida pelo hash da URL:
// #inicio (o Início de verdade, com o Layout), #editor (o editor do resultado de um jogo que tem rodada gravada) e #resenha (o cartão do jogo
// da Resenha com rodada gravada). O motor é de mentira (a prova responde /api/** com page.route) — nada sai para a rede.
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '../../src/context/AuthContext';
import { PerfilProvider } from '../../src/context/PerfilContext';
import { SessaoProvider } from '../../src/context/SessaoContext';
import { I18nProvider } from '../../src/context/I18nContext';
import { JogoCard } from '../../src/pages/Feed';
import ResultadoEditor from '../../src/components/ResultadoEditor';
import Inicio from '../../src/pages/Inicio';
import Layout from '../../src/components/Layout';
import { jogadoresDosTimes, nomesDosTimes } from '../../src/utils/resultadoDoJogo';
import '../../src/index.css';
import '../../src/styles/app.css';

const TIMES = [
  { nome: 'Time A', jogadores: [{ user_id: 'u1', nome: 'Magrão', avatar_url: null }, { user_id: 'u2', nome: 'Zé', avatar_url: null }] },
  { nome: 'Time B', jogadores: [{ user_id: 'u3', nome: 'Cacá', avatar_url: null }, { user_id: 'u4', nome: 'Duda', avatar_url: null }] },
];
// A rodada gravada num jogo antigo: o motor ainda manda as colunas, o app não mostra nada.
const RODADA_GRAVADA = { rodada_user_id: 'u2', rodada_foto_url: '/imagens-prova/rodada.png', rodada_nome: 'Zé', rodada_avatar_url: null };

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

function CenaEditor() {
  const timesResultado = { times: TIMES };
  const nomes = nomesDosTimes(timesResultado);
  const times = TIMES.map((t, i) => ({ nome: nomes[i], jogadores: t.jogadores }));
  const game = { id: 'g1', data: '2026-10-01T23:00:00Z', historico: false, campeao_time_index: 1, time_vencedor: 'B', placar_a: null, placar_b: null, resultado_nivel: 1, ...RODADA_GRAVADA };
  return (
    <div style={{ maxWidth: 390, padding: 16 }}>
      <ResultadoEditor
        gameId="g1" game={game} gols={[]} times={times} jogadores={jogadoresDosTimes(timesResultado)}
        confirmados={TIMES.flatMap((t) => t.jogadores).map((j) => ({ user_id: j.user_id, nome: j.nome }))}
        onSaved={() => { window.__salvou = (window.__salvou || 0) + 1; }}
        showToast={() => {}}
      />
    </div>
  );
}

// O jogo de ontem (fora do componente: a hora sai uma vez, na carga da bancada).
const JOGO_DA_RESENHA = {
  kind: 'jogo', id: 'g1', created_at: new Date().toISOString(), date: new Date(Date.now() - 86400000).toISOString(), time: '20:00', fuso: 'America/Sao_Paulo',
  location: 'Quadra do Zé', team_id: 't1', team_name: 'Missa de Quinta', team_slug: 'missa', times_resultado: { times: TIMES },
  campeao_time_index: 1, time_vencedor: 'B', placar_a: 1, placar_b: 3, campeao_foto_url: null,
  artilheiro_user_id: 'u3', artilheiro_nome: 'Cacá', artilheiro_gols: 2, destaque_user_id: null,
  contagem_reacoes: {}, minha_reacao: null, comentarios_total: 0, comentarios_recentes: [], ...RODADA_GRAVADA,
};

function CenaResenha() {
  const j = JOGO_DA_RESENHA;
  return (
    <div style={{ maxWidth: 390, padding: 16 }}>
      <div data-c="jogo"><JogoCard j={j} isAdmin teamSlug="missa" onOpenImage={() => {}} /></div>
    </div>
  );
}

const CENAS = { inicio: CenaInicio, editor: CenaEditor, resenha: CenaResenha };
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
