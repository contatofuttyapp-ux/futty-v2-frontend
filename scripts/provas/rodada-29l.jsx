/* eslint-disable react-refresh/only-export-components -- página-bancada das provas no navegador, não faz parte do app */
// Bancada da prova da Rodada 29L (scripts/provas/rodada-29l.prova.mjs): os pedaços de tela da varredura em 390 px, montados com os componentes
// DE VERDADE (FaixaRolavel, CardSeuTime, GameCard, RSVPCard, ImagemDoPost, RotuloGerar, a página do time, a faixa de cookies com a barra de
// navegação) e com as mesmas fontes e o mesmo CSS do app. O motor é de mentira (a prova responde /api/** com page.route) — nada sai para a rede.
import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Camera, Minus, Plus } from 'lucide-react';
import { AuthProvider } from '../../src/context/AuthContext';
import { PerfilProvider } from '../../src/context/PerfilContext';
import { SessaoProvider } from '../../src/context/SessaoContext';
import { I18nProvider } from '../../src/context/I18nContext';
import Layout from '../../src/components/Layout';
import CookieBanner from '../../src/components/CookieBanner';
import ErrorPage from '../../src/components/ErrorPage';
import FaixaRolavel from '../../src/components/FaixaRolavel';
import CardSeuTime from '../../src/components/CardSeuTime';
import ImagemDoPost from '../../src/components/ImagemDoPost';
import RSVPCard from '../../src/components/RSVPCard';
import RotuloGerar from '../../src/components/RotuloGerar';
import Equipa from '../../src/pages/Equipa';
import { GameCard } from '../../src/pages/Inicio';
import { useIndicadorDeRolagem } from '../../src/hooks/useIndicadorDeRolagem';
import '../../src/index.css';
import '../../src/styles/app.css';

function Casa() { return <div data-casa>BANCADA</div>; }

// ── faixas que rolam ────────────────────────────────────────────────────────────────────────────────────────────────────────────────
const tile = (k) => (
  <button key={k} type="button" className="fig-seletor-tile" data-tile={k}>
    <div style={{ width: '100%', aspectRatio: '1 / 1', background: '#222' }} />
    <span>{k}</span>
  </button>
);
function Faixas() {
  const { aoMontar, esquerda, direita } = useIndicadorDeRolagem();
  return (
    // minmax(0, 1fr): sem isto os filhos do grid esticam até a largura do conteúdo das faixas (534 px) e a página inteira passa de 390.
    <div style={{ padding: 16, display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 24 }}>
      <div data-fundos>
        <FaixaRolavel className="fig-seletor-grade" envoltorioClassName="faixa-rolavel--grade" data-grade="fundos" rotuloMais="Ver mais fundos">
          {['Neutro', 'Épico', 'Estádio', 'Aura', 'Golden', 'Royal'].map(tile)}
        </FaixaRolavel>
      </div>
      <div data-cabe>
        <FaixaRolavel className="fig-seletor-grade" envoltorioClassName="faixa-rolavel--grade" data-grade="uniformes">
          {['A', 'B'].map(tile)}
        </FaixaRolavel>
      </div>
      <div className="chips-row" data-chips ref={aoMontar} data-mais-esq={esquerda ? '1' : undefined} data-mais-dir={direita ? '1' : undefined}>
        {['Todas', 'Missa de Quinta', 'Várzea FC', '＋ Criar time', '＋ Explorar'].map((t) => <button key={t} type="button" className="chip hud-corners-s">{t}</button>)}
      </div>
    </div>
  );
}

// ── o card "Seu time" / "Seus times" ─────────────────────────────────────────────────────────────────────────────────────────────────
const TIMES = [
  { id: 'T1', slug: 'missa', nome: 'Missa de Quinta', cor: 'vinho', escudo_cor2: 'ouro', escudo_padrao: 'faixa' },
  { id: 'T2', slug: 'varzea-fc', nome: 'Várzea FC', cor: 'azul', escudo_cor2: 'ouro', escudo_padrao: 'solido' },
  { id: 'T3', slug: 'quinta-raiz', nome: 'Quinta Raiz', cor: 'verde', escudo_cor2: 'ouro', escudo_padrao: 'aro' },
];
const SEM = { pedidos: 0, presenca: null, resultado: null, denuncias: 0, total: 0 };
const seu = (i, pendencias) => ({ team_id: TIMES[i].id, slug: TIMES[i].slug, nome: TIMES[i].nome, fuso: 'America/Sao_Paulo', pendencias: { ...SEM, ...pendencias } });
const PRESENCA = { game_id: 'g2', data: '2026-10-09T23:00:00Z' };
const JOGOS = [{ id: 'g2', team_id: 'T1', status: 'scheduled', date: '2026-10-09T23:00:00Z' }];
function Cards() {
  return (
    <div style={{ padding: 16 }}>
      <div data-um><CardSeuTime seuTime={[seu(0, { presenca: PRESENCA, total: 1 })]} teams={TIMES} games={JOGOS} /></div>
      <div data-dois><CardSeuTime seuTime={[seu(0, { presenca: PRESENCA, total: 1 }), seu(1, {})]} teams={TIMES} games={JOGOS} /></div>
      <div data-tres><CardSeuTime seuTime={[seu(0, { pedidos: 2, presenca: PRESENCA, denuncias: 1, total: 4 }), seu(1, {}), seu(2, { denuncias: 1, total: 1 })]} teams={TIMES} games={JOGOS} /></div>
      <div data-proximos style={{ marginTop: 8 }}>PROXIMOS-JOGOS</div>
    </div>
  );
}

// ── contraste do Início ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
const fuso = 'America/Sao_Paulo';
const AMANHA = new Date(Date.now() + 86400000).toISOString();
function Contraste() {
  return (
    <div style={{ padding: 16, display: 'grid', gap: 12 }}>
      <div data-jogo-agendado>
        <GameCard game={{ id: 'a', name: 'Society Madalena', team_name: 'Várzea FC', team_slug: 'varzea-fc', status: 'scheduled', date: AMANHA, fuso, confirmed_count: 12, user_status: null }} busy={false} isNext onPresence={() => {}} onVerSorteio={() => {}} />
      </div>
      <div data-jogo-sorteado>
        <GameCard game={{ id: 'b', name: 'Arena Várzea', team_name: 'Várzea FC', team_slug: 'varzea-fc', status: 'drawn', date: AMANHA, fuso, confirmed_count: 17, user_status: null, eu_jogo: true }} busy={false} isNext={false} onPresence={() => {}} onVerSorteio={() => {}} />
      </div>
      <div data-rsvp>
        <RSVPCard gameId="c" prazo={AMANHA} fuso={fuso} respostaActual="confirmado" onResposta={() => {}} />
      </div>
    </div>
  );
}

// ── Figurinha: o par Trocar foto / Gerar e o − + do tamanho ──────────────────────────────────────────────────────────────────────────
function LinhaDaFigurinha() {
  return (
    <div style={{ padding: 16 }}>
      <div style={{ maxWidth: 460, margin: '0 auto', display: 'grid', gap: 14 }}>
        <div data-linha-tamanho style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 0, height: 44, marginTop: -13, marginBottom: -15 }}>
          <span>Tamanho</span>
          <button type="button" className="fig-zoom-btn" data-zoom="menos" aria-label="Reduzir"><Minus size={14} /></button>
          <button type="button" className="fig-zoom-btn" data-zoom="mais" aria-label="Aumentar"><Plus size={14} /></button>
        </div>
        <div data-linha-io style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <button type="button" data-trocar className="btn btn--purple-outline fig-io-btn hud-corners" style={{ flex: '0 0 auto', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, paddingLeft: 12, paddingRight: 12 }}>
            <Camera size={16} /> Trocar foto
          </button>
          <span className="cta-gold-glow pulse-glow" style={{ flex: 1, display: 'flex' }}>
            <button type="button" data-gerar className="btn hud-corners fig-io-btn fig-gerar cta-gold pulse-active" style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <span aria-hidden="true" style={{ display: 'inline-block', width: 16, height: 16, background: '#f0c94a' }} /> <RotuloGerar />
            </button>
          </span>
        </div>
        <div data-depois>DEPOIS</div>
      </div>
    </div>
  );
}

// ── foto de post que falha ───────────────────────────────────────────────────────────────────────────────────────────────────────────
function Foto() {
  const [abriu, setAbriu] = useState(0);
  return (
    <div style={{ padding: 16 }} data-foto>
      <ImagemDoPost
        src="/imagens-prova/post.png?w=512"
        onAbrir={() => setAbriu((n) => n + 1)}
        estiloBotao={{ padding: 0, border: 'none', background: 'transparent', cursor: 'zoom-in', display: 'block', width: '100%' }}
        largura={362}
        altura={460}
        estiloImg={{ width: '100%', maxWidth: '100%', height: 'auto', maxHeight: 460, objectFit: 'cover', borderRadius: 10, display: 'block' }}
      />
      <div data-abriu>{abriu}</div>
      <div data-fim-da-foto>FIM</div>
    </div>
  );
}

// ── a faixa de cookies com a barra de navegação (a montagem do App) ──────────────────────────────────────────────────────────────────
function Cookies() {
  return (
    <>
      <ErrorPage titulo="Página não encontrada" mensagem="Esta página não existe." semSessao />
      <div id="medida-da-barra" style={{ position: 'fixed', left: -9999, top: 0, height: 'var(--altura-barra-nav)', width: 10 }} />
    </>
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
                <Route path="/scripts/provas/rodada-29l.html" element={<Casa />} />
                <Route path="/faixas" element={<Faixas />} />
                <Route path="/cards" element={<Cards />} />
                <Route path="/contraste" element={<Contraste />} />
                <Route path="/figurinha-linha" element={<LinhaDaFigurinha />} />
                <Route path="/foto" element={<Foto />} />
                <Route path="/time/:slug" element={<Equipa />} />
                <Route path="*" element={<Cookies />} />
              </Routes>
            </Layout>
            <CookieBanner />
          </SessaoProvider>
        </BrowserRouter>
      </PerfilProvider>
    </AuthProvider>
  </I18nProvider>,
);
