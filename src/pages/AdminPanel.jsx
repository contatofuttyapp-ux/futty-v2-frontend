// Futty v2.0 — O que o admin faz no time. O dono pediu: ADMIN NÃO É UM LUGAR, é um conjunto de botões a mais
// nas telas que já existem. Cada coisa do admin vive na tela a que pertence:
//   · Dashboard            → card "Seu time" no Início (pendências + Novo jogo · Sortear · Convidar · Ajustes)
//   · Jogos + Resultados + Campeonato → aba JOGOS da página do time (JogosDoAdmin)
//   · Membros + Convites   → aba ELENCO (ElencoDoAdmin; as ações de cada membro abrem com um toque no nome, sem o "⋯")
//   · Time + Comunicação + Denúncias + Zona de perigo → aba AJUSTES (AjustesDoTime; a única ação da zona de
//     perigo é o cartão "Nova temporada de notas")
//   · Estatísticas         → Ranking do time (EstatisticasDoTime), para o admin
// /admin/<slug>?tab=… (link antigo, favorito) continua valendo: leva à aba nova (lib/rotasAntigas.js#caminhoDoAdminAntigo).
// A página do time carrega este arquivo só para quem é admin (lazy): o jogador não paga por ele.
import { useEffect, useState } from 'react';
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom';
import { Star } from 'lucide-react';
import { apiFetch } from '../lib/api';
import { arredondarMedia, formatarMedia, plural } from '../utils/plural';
import { nomeExibicao } from '../utils/nomeExibicao';
import PlayerAvatar from '../components/PlayerAvatar';
import ModeracaoFila from '../components/ModeracaoFila';
import { TEXTO_ADMIN_E_POSICAO } from '../components/EscolhaLinhaGol';
import { caminhoDoAdminAntigo } from '../lib/rotasAntigas';
import '../styles/app.css';
import { CARD } from './adminPanel/comum';
import { AvisarOTime, ConfirmModal, Interruptor, MetricCard, Secao } from './adminPanel/pecas';
import { FormRecorrentes, TabJogos } from './adminPanel/TabJogos';
import { TabCampeonato } from './adminPanel/TabCampeonato';
import { TabMembros } from './adminPanel/TabMembros';
import { TabConvites } from './adminPanel/TabConvites';
import { TabEquipa } from './adminPanel/TabEquipa';
import { TabDenuncias } from './adminPanel/TabDenuncias';
import { TabEstatisticas } from './adminPanel/TabEstatisticas';

// ─── AJUSTES → NOTIFICAÇÕES DO ADMIN ─────────────────────────────────────
// O admin recebe push quando chega pedido de entrada (o dono pediu) e pode desligar aqui. As outras ficam em Perfil →
// Notificações (é a mesma escolha, guardada na conta).
function NotificacoesDoAdmin({ showToast }) {
  const [prefs, setPrefs] = useState(null);
  useEffect(() => {
    let ativo = true;
    apiFetch('/api/push/preferencias')
      .then((d) => ativo && setPrefs(d))
      .catch(() => ativo && setPrefs({ preferencias: { pedidos: true }, salvavel: false }));
    return () => {
      ativo = false;
    };
  }, []);
  async function trocarPedidos(v) {
    const antes = prefs;
    setPrefs((p) => ({ ...p, preferencias: { ...p.preferencias, pedidos: v } }));
    try {
      await apiFetch('/api/push/preferencias', { method: 'PATCH', body: JSON.stringify({ pedidos: v }) });
    } catch (e) {
      setPrefs(antes);
      showToast(e.message, 'error');
    }
  }
  if (!prefs) return null;
  return (
    <div style={{ ...CARD, padding: 14, display: 'grid', gap: 8 }}>
      <Interruptor ligado={prefs.preferencias?.pedidos !== false} aoTrocar={trocarPedidos} rotulo="Pedidos de entrada" apoio="Um aviso no celular quando alguém pede para entrar no time." />
      <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>As outras notificações ficam em Perfil → Notificações.</span>
    </div>
  );
}

// ─── AJUSTES → NOVA TEMPORADA DE NOTAS ──────────────────────────────────────────
// "Nova temporada de notas": cartão próprio, botão dourado da casa — em vermelho, dentro de "Ações definitivas",
// parecia "excluir a conta". O perigo (zera as notas, sem volta) fica dito só na
// confirmação, que segue vermelha. O motor: POST pedir-revotacao com zerar: true. O nome do componente e o
// data-attribute são os de "Pedir para votar de novo" e ficam assim: as provas apontam para eles.
function PedirVotarDeNovo({ slug, showToast }) {
  const [confirmar, setConfirmar] = useState(false);
  const [busy, setBusy] = useState(false);
  async function pedir() {
    setConfirmar(false);
    setBusy(true);
    try {
      await apiFetch(`/api/teams/${slug}/pedir-revotacao`, { method: 'POST', body: JSON.stringify({ zerar: true }) });
      showToast('Nova temporada aberta. O time foi avisado para dar as notas.');
    } catch (e) {
      showToast(e.message, 'error');
    } finally {
      setBusy(false);
    }
  }
  return (
    <div style={{ ...CARD, padding: 14, display: 'grid', gap: 10 }}>
      <button type="button" disabled={busy} onClick={() => setConfirmar(true)} data-pedir-votar-de-novo className="btn hud-corners-s cta-gold" style={{ width: '100%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: "'Rajdhani', sans-serif", letterSpacing: '0.08em', textTransform: 'uppercase' }}>
        <Star size={18} aria-hidden="true" />
        {busy ? 'Abrindo…' : 'Nova temporada de notas'}
      </button>
      <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>Apaga as notas e o time avalia todo mundo de novo.</span>
      {confirmar ? (
        <ConfirmModal
          texto="Começar uma nova temporada? As notas de todo mundo são apagadas. Não dá para desfazer."
          perigo
          confirmarLabel="Zerar e começar"
          onConfirm={pedir}
          onCancel={() => setConfirmar(false)}
        />
      ) : null}
    </div>
  );
}

// ─── As abas da página do time ─────────────────────────────────────────

/** Aba JOGOS do admin: "Novo jogo" é a ação principal (o dourado); recorrentes e campeonato, secundários no topo; depois a lista. */
export function JogosDoAdmin({ slug, team, showToast, navigate, abrirPresencaDe = null, aoUsarAbrirPresenca = null }) {
  const [painel, setPainel] = useState(null); // 'recorrentes' | 'campeonato'
  const [versao, setVersao] = useState(0); // remonta a lista depois de criar os recorrentes
  const alternar = (k) => setPainel((p) => (p === k ? null : k));
  return (
    <div style={{ display: 'grid', gap: 12 }} data-jogos-admin>
      <Link to={`/time/${slug}/jogo/novo`} className="btn hud-corners-s cta-gold" style={{ width: '100%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Rajdhani', sans-serif", letterSpacing: '0.08em', textTransform: 'uppercase', textDecoration: 'none' }}>
        + Novo jogo
      </Link>
      {/* Cada botão tem a largura do próprio texto (e divide a sobra), nunca parte o rótulo; se a tela for estreita demais para os
          dois, o segundo desce inteiro para a linha de baixo. Em 50%/50%, "Criar jogos recorrentes" quebraria em duas linhas
          ao lado de "Criar campeonato" em uma. */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        <button type="button" className="btn btn--outline btn--sm hud-corners-s" aria-pressed={painel === 'recorrentes'} style={{ flex: '1 1 auto', whiteSpace: 'nowrap' }} onClick={() => alternar('recorrentes')}>Criar jogos recorrentes</button>
        <button type="button" className="btn btn--outline btn--sm hud-corners-s" aria-pressed={painel === 'campeonato'} style={{ flex: '1 1 auto', whiteSpace: 'nowrap' }} onClick={() => alternar('campeonato')}>Criar campeonato</button>
      </div>
      {painel === 'recorrentes' ? (
        <FormRecorrentes slug={slug} fuso={team?.fuso} cidade={team?.cidade} showToast={showToast} onClose={() => setPainel(null)} onCriado={async () => setVersao((v) => v + 1)} />
      ) : null}
      {painel === 'campeonato' ? <TabCampeonato slug={slug} team={team} navigate={navigate} showToast={showToast} /> : null}
      <TabJogos key={versao} slug={slug} team={team} showToast={showToast} navigate={navigate} abrirPresencaDe={abrirPresencaDe} aoUsarAbrirPresenca={aoUsarAbrirPresenca} />
    </div>
  );
}

/** Aba ELENCO do admin: 3 números do time no topo (o resto das estatísticas está no Ranking), os membros e os links de convite ativos. */
export function ElencoDoAdmin({ slug, nomeTime = null, meId, showToast, versaoConvites = 0 }) {
  const [stats, setStats] = useState(null);
  useEffect(() => {
    let ativo = true;
    apiFetch(`/api/teams/${slug}/stats`).then((d) => ativo && setStats(d.stats || {})).catch(() => ativo && setStats({}));
    return () => {
      ativo = false;
    };
  }, [slug]);
  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }} data-tres-numeros>
        {/* O rótulo concorda com o número ("1 jogo", "1 membro") e a média sem casa decimal quando é inteira ("0", não "0.0"). */}
        <MetricCard valor={stats ? stats.total_jogos ?? 0 : '–'} label={plural(stats?.total_jogos, 'jogo', 'jogos')} />
        <MetricCard valor={stats ? stats.total_membros ?? 0 : '–'} label={plural(stats?.total_membros, 'membro', 'membros')} />
        {/* É a média de CONFIRMADOS por jogo (stats.media_confirmacoes), não de gols. */}
        <MetricCard valor={stats ? formatarMedia(stats.media_confirmacoes ?? 0) : '–'} label={plural(arredondarMedia(stats?.media_confirmacoes), 'confirmado por jogo', 'confirmados por jogo')} />
      </div>
      <TabMembros slug={slug} meId={meId} showToast={showToast} />
      <Secao titulo="Links de convite ativos">
        <TabConvites key={versaoConvites} slug={slug} nomeTime={nomeTime} showToast={showToast} semBotao />
      </Secao>
    </div>
  );
}

/** Aba AJUSTES (só admin): o time, admins, notificações do admin, avisar o time, denúncias e, no fim, a Nova temporada de notas. */
export function AjustesDoTime({ slug, team, members = [], showToast, onMudou }) {
  const admins = members.filter((m) => m.role === 'admin');
  return (
    <div style={{ display: 'grid', gap: 18 }} data-ajustes-do-time>
      <Secao titulo="O time">
        <TabEquipa slug={slug} team={team} showToast={showToast} onMudou={onMudou} />
      </Secao>
      <Secao titulo={`Admins · ${admins.length}`}>
        <div style={{ ...CARD, padding: '4px 12px' }}>
          {admins.map((m, i) => (
            <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderTop: i === 0 ? 'none' : '1px solid rgba(255,255,255,0.06)' }}>
              <PlayerAvatar nome={nomeExibicao(m)} avatarUrl={m.avatar_url} userId={m.id} avatarGenerico={m.avatar_generico} sm />
              <span style={{ fontWeight: 700, color: '#fff' }}>{nomeExibicao(m)}</span>
            </div>
          ))}
        </div>
        <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>Para tornar alguém admin, toque no nome dele no Elenco. {TEXTO_ADMIN_E_POSICAO}</span>
      </Secao>
      <Secao titulo="Notificações do admin">
        <NotificacoesDoAdmin showToast={showToast} />
      </Secao>
      <Secao titulo="Avisar o time">
        <AvisarOTime slug={slug} showToast={showToast} />
      </Secao>
      <Secao titulo="Denúncias" id="denuncias">
        <ModeracaoFila slug={slug} />
        <TabDenuncias showToast={showToast} />
      </Secao>
      {/* Cartão próprio: a seção "Ações definitivas" não existe porque só tinha esta ação, e sem ela ficaria vazia. */}
      <Secao titulo="Notas do time">
        <PedirVotarDeNovo slug={slug} showToast={showToast} />
      </Secao>
    </div>
  );
}

/** As estatísticas do time, no Ranking (eram a aba Estatísticas do painel). Só o admin vê. */
export function EstatisticasDoTime({ slug, membrosBasicos = [], showToast }) {
  return <TabEstatisticas slug={slug} membrosBasicos={membrosBasicos} showToast={showToast} />;
}

/** /admin/<slug>?tab=… — o endereço antigo (favorito, link no grupo) continua valendo: leva à aba nova da página do time. */
export default function AdminRedireciona() {
  const { slug } = useParams();
  const [searchParams] = useSearchParams();
  return <Navigate to={caminhoDoAdminAntigo(slug, searchParams.get('tab'))} replace />;
}
