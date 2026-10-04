/* eslint-disable react-refresh/only-export-components -- página-bancada das provas no navegador, não faz parte do app */
// Bancada da prova da Rodada 29T, bloco A (scripts/provas/rodada-29t.prova.mjs): o Início DE VERDADE (a página inteira, com o Layout, o contexto do
// Início e a barra de baixo) e os pedaços soltos (o aviso do jogo, "Seus times", o nome do cromo, o escudo), com as mesmas fontes e o mesmo CSS do
// app. O motor é de mentira (a prova responde /api/** com page.route) e a sessão é de mentira (a prova planta a chave do Supabase no
// localStorage) — nada sai para a rede.
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '../../src/context/AuthContext';
import { PerfilProvider } from '../../src/context/PerfilContext';
import { SessaoProvider } from '../../src/context/SessaoContext';
import { I18nProvider } from '../../src/context/I18nContext';
import Layout from '../../src/components/Layout';
import AvisoDeJogo from '../../src/components/AvisoDeJogo';
import CardSeuTime from '../../src/components/CardSeuTime';
import EscudoEquipa from '../../src/components/EscudoEquipa';
import Inicio, { NomeCromo } from '../../src/pages/Inicio';
import Explorar from '../../src/pages/Explorar';
import '../../src/index.css';
import '../../src/styles/app.css';

function Casa() { return <div data-casa>BANCADA</div>; }

const TIMES = [
  { id: 'T1', slug: 'missa', nome: 'Missa de Quinta', cidade: 'Brasília - DF', fuso: 'America/Sao_Paulo', cor: 'vinho', escudo_cor2: 'ouro', escudo_padrao: 'faixa' },
  { id: 'T2', slug: 'varzea-fc', nome: 'Várzea FC', cidade: 'São Paulo', fuso: 'America/Sao_Paulo', cor: 'azul', escudo_cor2: 'ouro', escudo_padrao: 'solido' },
  { id: 'T3', slug: 'quinta-raiz', nome: 'Quinta Raiz', cor: 'verde', escudo_cor2: 'ouro', escudo_padrao: 'aro' },
  { id: 'T4', slug: 'racha-do-guara', nome: 'Racha do Guará', cor: 'laranja', escudo_cor2: 'preto', escudo_padrao: 'barra' },
];
const SEM = { pedidos: 0, presenca: null, resultado: null, denuncias: 0, total: 0 };
const seu = (i) => ({ team_id: TIMES[i].id, slug: TIMES[i].slug, nome: TIMES[i].nome, fuso: 'America/Sao_Paulo', pendencias: SEM });
const AMANHA = new Date(Date.now() + 86400000 * 2).toISOString();

window.__chamadas = []; // o que o aviso solto devolveu ao tocar (a prova lê daqui)

// ── os pedaços soltos ───────────────────────────────────────────────────────────────────────────────────────────────────────────────
function Pecas() {
  return (
    <div style={{ padding: 16, width: 358 }}>
      <div data-aviso-solto>
        <AvisoDeJogo
          game={{ id: 'g1', date: AMANHA, fuso: 'America/Sao_Paulo', team_name: 'Missa de Quinta', team_id: 'T1' }}
          team={TIMES[0]}
          mais={2}
          onPresence={(id, vou) => window.__chamadas.push([id, vou])}
        />
      </div>
      <div data-aviso-sem-mais>
        <AvisoDeJogo game={{ id: 'g2', date: AMANHA, fuso: 'America/Sao_Paulo', team_name: 'Várzea FC', team_id: 'T2' }} team={TIMES[1]} onPresence={() => {}} />
      </div>
      {[1, 2, 3, 4].map((n) => (
        <div key={n} data-cartao={n}><CardSeuTime seuTime={TIMES.slice(0, n).map((_, i) => seu(i))} teams={TIMES} games={[]} /></div>
      ))}
      {[['358', 358], ['288', 288], ['240', 240]].map(([k, w]) => (
        <div key={k} data-nome-largo={k} style={{ width: w }}>
          <div data-nome="curto"><NomeCromo nome="Tonhão" /></div>
          <div data-nome="medio"><NomeCromo nome="Chavo, el matador" /></div>
          <div data-nome="longo"><NomeCromo nome="Chavo, el matador del Pelé de Brasília" /></div>
          <div data-nome="enorme"><NomeCromo nome="Francisco Antônio de Albuquerque Montenegro Neto" /></div>
        </div>
      ))}
      <div data-escudos style={{ display: 'flex', gap: 12, marginTop: 12 }}>
        <span data-escudo-quebrado><EscudoEquipa team={{ nome: 'Racha do Guará', cor: 'azul', logo_url: '/imagens-prova/quebrado.png' }} size={44} /></span>
        <span data-escudo-bom><EscudoEquipa team={{ nome: 'Os Pica', cor: 'azul', logo_url: '/imagens-prova/bom.png' }} size={44} /></span>
        <span data-escudo-sem-logo><EscudoEquipa team={{ nome: 'Pelada do Bandeirante', cor: 'verde' }} size={44} /></span>
      </div>
    </div>
  );
}

createRoot(document.getElementById('raiz')).render(
  <I18nProvider>
    <AuthProvider>
      <PerfilProvider>
        <BrowserRouter>
          <SessaoProvider>
            <Layout>
              <Routes>
                <Route path="/scripts/provas/rodada-29t.html" element={<Casa />} />
                <Route path="/pecas" element={<Pecas />} />
                <Route path="/home" element={<Inicio />} />
                <Route path="/explorar" element={<Explorar />} />
                <Route path="*" element={<Casa />} />
              </Routes>
            </Layout>
          </SessaoProvider>
        </BrowserRouter>
      </PerfilProvider>
    </AuthProvider>
  </I18nProvider>,
);
