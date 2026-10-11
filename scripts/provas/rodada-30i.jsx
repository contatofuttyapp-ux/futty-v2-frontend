/* eslint-disable react-refresh/only-export-components -- página-bancada das provas no navegador, não faz parte do app */
// Bancada da prova da Rodada 30I ("Quem ganhou?", scripts/provas/rodada-30i.prova.mjs). Cada parte da rodada é uma "cena" escolhida pelo
// hash da URL (#empate, #editor, #inicio…): a tela de verdade, com o mesmo CSS e as mesmas fontes do app. O motor é de mentira
// (a prova responde /api/** com page.route) — nada sai para a rede.
import { createRoot } from 'react-dom/client';
import { BrowserRouter, MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '../../src/context/AuthContext';
import { PerfilProvider } from '../../src/context/PerfilContext';
import { SessaoProvider } from '../../src/context/SessaoContext';
import { I18nProvider } from '../../src/context/I18nContext';
import { JogoCard } from '../../src/pages/Feed';
import ResultadoEditor from '../../src/components/ResultadoEditor';
import Jogo from '../../src/pages/Jogo';
import { jogadoresDosTimes, nomesDosTimes } from '../../src/utils/resultadoDoJogo';
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

// O editor do resultado de verdade (modo "salvar"), com 2, 3 ou 4 times; cada cena muda só o que a prova precisa. O que o editor manda ao motor
// a prova lê dos pedidos (page.route); o toast e o "salvou" ficam em window.__toasts e window.__salvou.
const TIMES_DO_EDITOR = {
  times: [
    { nome: 'Time A', jogadores: [{ user_id: 'u1', nome: 'Magrão', avatar_url: null }, { user_id: null, convidado: true, nome: 'Beto', avatar_url: null }] },
    { nome: 'Time B', jogadores: [{ user_id: 'u3', nome: 'Zé', avatar_url: null }, { user_id: 'u4', nome: 'Cacá', avatar_url: null }] },
    { nome: 'Time C', jogadores: [{ user_id: 'u5', nome: 'Duda', avatar_url: null }] },
    { nome: 'Time D', jogadores: [{ user_id: 'u6', nome: 'Edu', avatar_url: null }] },
  ],
};
const CONFIRMADOS = [{ user_id: 'u1', nome: 'Magrão' }, { user_id: 'u3', nome: 'Zé' }, { user_id: 'u4', nome: 'Cacá' }, { user_id: 'u5', nome: 'Duda' }, { user_id: 'u6', nome: 'Edu' }];
const JOGO_DO_EDITOR = { id: 'g1', data: '2026-10-01T23:00:00Z', historico: false, campeao_time_index: null, time_vencedor: null, placar_a: null, placar_b: null, resultado_nivel: 0 };

function CenaEditor({ nTimes = 2, flags = { gols: true, artilheiro: true, destaque: true }, game = JOGO_DO_EDITOR, gols = [] }) {
  const timesResultado = { times: TIMES_DO_EDITOR.times.slice(0, nTimes) };
  const nomes = nomesDosTimes(timesResultado);
  const times = timesResultado.times.map((t, i) => ({ nome: nomes[i], jogadores: t.jogadores }));
  return (
    <div style={{ maxWidth: 390, padding: 16 }}>
      <ResultadoEditor
        gameId="g1" game={game} gols={gols} times={times} jogadores={jogadoresDosTimes(timesResultado)} confirmados={CONFIRMADOS} flags={flags}
        onSaved={() => { window.__salvou = (window.__salvou || 0) + 1; }}
        showToast={(mensagem, tipo = 'success') => { (window.__toasts ||= []).push([mensagem, tipo]); }}
      />
    </div>
  );
}

// A tela do jogo DE VERDADE (Jogo.jsx), num roteador de memória: o motor de mentira da prova serve o jogo e guarda o que o editor grava.
function CenaJogo() {
  return (
    <MemoryRouter initialEntries={['/time/missa/jogo/g1']}>
      <SessaoProvider>
        <Routes><Route path="/time/:slug/jogo/:id" element={<Jogo />} /></Routes>
      </SessaoProvider>
    </MemoryRouter>
  );
}
const CENAS_COM_ROTEADOR_PROPRIO = new Set(['jogo']);

const CENAS = {
  jogo: CenaJogo,
  empate: CenaEmpate,
  'editor-2': () => <CenaEditor nTimes={2} />,
  'editor-3': () => <CenaEditor nTimes={3} />,
  'editor-4': () => <CenaEditor nTimes={4} />,
  'editor-sem-gols': () => <CenaEditor nTimes={2} flags={{ gols: false, artilheiro: false, destaque: true }} />,
  // Um jogo já gravado (Roxo 1 × 2, pelos gols; Zé artilheiro): "corrigir" parte dele.
  'editor-corrigir': () => (
    <CenaEditor
      nTimes={2}
      game={{ ...JOGO_DO_EDITOR, campeao_time_index: 1, time_vencedor: 'B', placar_a: 1, placar_b: 2, resultado_nivel: 3, artilheiro_user_id: 'u3', artilheiro_gols: 2 }}
      gols={[{ user_id: 'u1', nome: 'Magrão', gols: 1 }, { user_id: 'u3', nome: 'Zé', gols: 2 }]}
    />
  ),
};
const Cena = CENAS[window.location.hash.slice(1)] || (() => <div data-casa>BANCADA</div>);
const comRoteador = !CENAS_COM_ROTEADOR_PROPRIO.has(window.location.hash.slice(1));
createRoot(document.getElementById('raiz')).render(
  <I18nProvider>
    <AuthProvider>
      <PerfilProvider>
        {comRoteador ? (
          <BrowserRouter>
            <SessaoProvider>
              <Cena />
            </SessaoProvider>
          </BrowserRouter>
        ) : (
          <Cena />
        )}
      </PerfilProvider>
    </AuthProvider>
  </I18nProvider>,
);
