// Futty v2.0 — O post do campeão do campeonato na Resenha.

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Trophy } from 'lucide-react';
import { haQuantoTempo } from '../../utils/haQuantoTempo';
import { linhaDaFinalDoPost } from '../../utils/campeonatoPlacar';
import { tituloDoPostDoCampeao } from '../../utils/campeonatoInicio';
import Reacoes from '../../components/Reacoes';
import Comentarios from '../../components/Comentarios';
import { apoioForte, BORDA_VIDRO, CARD, rodapeDoCartao, rotuloComIcone } from './comum';
import { ComentariosResumo, FeedAvatar } from './pecas';

// ─── Card do CAMPEÃO DO CAMPEONATO ─────────────────────────────────────────────────
// Um post por campeonato novo (N times), criado pelo motor quando ele termina (backend/utils/postDoCampeao.js): o time campeão com os
// jogadores, o pódio e a final (com "(pên.: X)" se foi nos pênaltis). Aceita reações e comentários como os outros posts; tocar no corpo
// abre o campeonato. O time campeão respira como o cromo (a regra da Resenha: só o campeão e os prêmios, posts comuns nunca).
export function PostDoCampeao({ p, isAdmin, teamSlug, index = 0 }) {
  const [comentariosAbertos, setComentariosAbertos] = useState(false);
  const [contagem, setContagem] = useState(null);
  const c = p.conteudo || {};
  const campeao = c.campeao || { nome: '—', jogadores: [] };
  const jogadores = campeao.jogadores || [];
  const final = c.final ? linhaDaFinalDoPost(c.final) : '';
  const titulo = tituloDoPostDoCampeao(campeao.nome, c.campeonato_nome);
  const corpo = (
    <>
      <div style={{ padding: 14 }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--neon)', letterSpacing: '0.04em' }}>
          <span style={apoioForte}>{haQuantoTempo(p.created_at)}</span>
        </div>
        <div style={{ marginTop: 6, fontSize: 13, color: 'var(--text-dim)', fontWeight: 600 }}>{p.team_name || 'Time'}</div>
      </div>
      <div className="feed-cromo-bob">
        <div className="feed-cromo-sway">
          <div data-campeao-do-campeonato style={{ padding: 14, borderTop: BORDA_VIDRO, background: 'linear-gradient(135deg, rgba(212,160,23,0.12), rgba(139,92,246,0.08))' }}>
            <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.14em', color: '#f0c94a', textTransform: 'uppercase' }}>
              <span style={rotuloComIcone}><Trophy size={14} aria-hidden="true" />Campeão</span>
            </div>
            <div data-titulo-do-post-campeao style={{ marginTop: 8, fontSize: 16, fontWeight: 800, color: '#fff', lineHeight: 1.35 }}>
              {titulo.time}<span style={{ color: '#c9b6ff', fontWeight: 700 }}> · {titulo.campeonato}</span>
            </div>
            {jogadores.length ? (
              <div style={{ marginTop: 12, display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
                {jogadores.map((j) => (
                  <div key={j.user_id || j.nome} style={{ flexShrink: 0, textAlign: 'center' }}>
                    <FeedAvatar nome={j.nome} avatarUrl={j.avatar_url} size={48} />
                    <div style={{ marginTop: 3, maxWidth: 56, fontFamily: "'Rajdhani', sans-serif", fontSize: 11, fontWeight: 700, color: '#e4d9ff', overflowWrap: 'anywhere', lineHeight: 1.1 }}>{j.nome}</div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </div>
      {Array.isArray(c.podio) && c.podio.length ? (
        <div data-podio-do-post style={{ padding: '12px 14px', borderTop: BORDA_VIDRO, display: 'flex', flexWrap: 'wrap', gap: '6px 14px' }}>
          {c.podio.map((x, i) => (
            <span key={`${x.pos}-${i}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, fontSize: 13, color: '#fff' }}>
              <span style={{ color: '#8a8a98' }}>{x.pos}º</span>
              <span className="camp-tab__dot" style={{ background: x.cor }} />
              {x.nome}
            </span>
          ))}
        </div>
      ) : null}
      {final ? (
        <div data-final-do-post style={{ padding: '0 14px 12px', fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, fontSize: 14, color: '#f0c94a' }}>Final: {final}</div>
      ) : null}
    </>
  );
  return (
    <div className="anim-slide-in feed-card" data-post-do-campeao style={{ ...CARD, animationDelay: `${index * 0.06}s` }}>
      {teamSlug && c.campeonato_id ? <Link to={`/time/${teamSlug}/campeonato/${c.campeonato_id}`} style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}>{corpo}</Link> : corpo}
      <div style={rodapeDoCartao}>
        <Reacoes targetType="post" targetId={p.id} contagemInicial={p.contagem_reacoes} minhaReacaoInicial={p.minha_reacao} compacto />
      </div>
      <ComentariosResumo
        recentes={p.comentarios_recentes}
        total={contagem != null ? contagem : p.comentarios_total}
        aberto={comentariosAbertos}
        onToggle={() => setComentariosAbertos((v) => !v)}
      >
        <Comentarios parentType="post" parentId={p.id} visivel={comentariosAbertos} isAdmin={isAdmin} teamSlug={teamSlug} onCount={setContagem} />
      </ComentariosResumo>
    </div>
  );
}
