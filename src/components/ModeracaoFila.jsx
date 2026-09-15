// Futty v2.0 — Fila de moderação do admin da equipa (Tijolo 3). Só casos AMBÍGUOS
// (a IA já resolveu os óbvios). Preview BORRADO por defeito (toque revela). Menor no
// topo com marca vermelha. Ações: remover / manter / avisar. GET/POST /api/denuncias.
import { useEffect, useState } from 'react';
import { apiFetch } from '../lib/api';
import { urlAsset, urlImagem } from '../utils/avatar';

const RAJ = "'Rajdhani', sans-serif";
const CLIP_S = 'polygon(5px 0, calc(100% - 5px) 0, 100% 5px, 100% calc(100% - 5px), calc(100% - 5px) 100%, 5px 100%, 0 calc(100% - 5px), 0 5px)';
const LABEL = { nudez: 'Nudez / sexual', violencia: 'Violência / ódio', assedio: 'Assédio / bullying', spam: 'Spam / golpe', menor: '⚠ Perigo a menor', outro: 'Outro' };

function CasoCard({ slug, caso, onResolvido }) {
  const [revelado, setRevelado] = useState(false);
  const [busy, setBusy] = useState(false);
  const menor = caso.prioritaria;

  async function decidir(acao) {
    if (busy) return;
    setBusy(true);
    try {
      await apiFetch(`/api/denuncias/${caso.id}/decidir`, { method: 'POST', body: JSON.stringify({ slug, acao }) });
      onResolvido(caso.id);
    } catch { setBusy(false); }
  }

  return (
    <div className="hud-corners" style={{ padding: '12px 13px', marginBottom: 11, background: menor ? 'rgba(253,164,175,0.05)' : 'rgba(255,255,255,0.03)', border: `1px solid ${menor ? 'rgba(253,164,175,0.55)' : 'rgba(255,255,255,0.08)'}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 9 }}>
        <span style={{ fontFamily: RAJ, fontWeight: 700, fontSize: 10.5, letterSpacing: '0.04em', textTransform: 'uppercase', padding: '3px 9px', clipPath: CLIP_S, color: menor ? '#fecdd3' : '#c9c2d6', border: `1px solid ${menor ? 'rgba(253,164,175,0.55)' : 'rgba(255,255,255,0.2)'}`, background: menor ? 'rgba(253,164,175,0.1)' : 'rgba(255,255,255,0.04)' }}>
          {LABEL[caso.categoria] || caso.categoria}
        </span>
        <span style={{ marginLeft: 'auto', fontFamily: RAJ, fontSize: 10.5, color: '#9a8fc0', padding: '3px 9px', clipPath: CLIP_S, border: '1px solid rgba(139,92,246,0.4)' }}>
          {menor ? 'prioritário' : caso.target_type}
        </span>
      </div>

      {/* Preview borrado por defeito — o admin decide ver. */}
      <button
        type="button"
        onClick={() => setRevelado((v) => !v)}
        style={{ position: 'relative', width: '100%', height: 118, marginBottom: 10, overflow: 'hidden', clipPath: CLIP_S, border: 'none', cursor: 'pointer', padding: 0, background: '#111' }}
      >
        {caso.preview_media ? (
          <img src={urlImagem(urlAsset(caso.preview_media), 256)} alt="" width={390} height={118} decoding="async" loading="lazy" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', filter: revelado ? 'none' : 'blur(18px) brightness(.8)', transform: revelado ? 'none' : 'scale(1.1)' }} />
        ) : (
          <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', padding: 12, filter: revelado ? 'none' : 'blur(6px)', color: '#c9c2d6', fontSize: 12.5, lineHeight: 1.4, textAlign: 'center' }}>
            {caso.preview_texto || '(sem pré-visualização)'}
          </div>
        )}
        {!revelado ? (
          <span style={{ position: 'absolute', inset: 0, display: 'grid', placeContent: 'center', gap: 4, color: '#e6e6ee', zIndex: 2, textAlign: 'center' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" style={{ margin: '0 auto' }}><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z" /><circle cx="12" cy="12" r="3" /></svg>
            <span style={{ fontFamily: RAJ, fontSize: 11, letterSpacing: '0.06em' }}>tocar para revelar</span>
          </span>
        ) : null}
      </button>

      <div style={{ display: 'flex', gap: 7 }}>
        <button type="button" disabled={busy} className="hud-corners-s" onClick={() => decidir('remover')} style={{ flex: 1, padding: '9px 6px', fontFamily: RAJ, fontWeight: 800, fontSize: 12, letterSpacing: '0.04em', textTransform: 'uppercase', cursor: 'pointer', color: '#fda4af', border: '1px solid rgba(253,164,175,0.5)', background: 'rgba(253,164,175,0.06)' }}>Remover</button>
        <button type="button" disabled={busy} className="hud-corners-s" onClick={() => decidir('manter')} style={{ flex: 1, padding: '9px 6px', fontFamily: RAJ, fontWeight: 800, fontSize: 12, letterSpacing: '0.04em', textTransform: 'uppercase', cursor: 'pointer', color: '#c9c2d6', border: '1px solid rgba(255,255,255,0.22)', background: 'rgba(255,255,255,0.03)' }}>Manter</button>
        <button type="button" disabled={busy} className="hud-corners-s" onClick={() => decidir('avisar')} style={{ flex: 1, padding: '9px 6px', fontFamily: RAJ, fontWeight: 800, fontSize: 12, letterSpacing: '0.04em', textTransform: 'uppercase', cursor: 'pointer', color: '#f0c94a', border: '1px solid rgba(212,160,23,0.5)', background: 'rgba(212,160,23,0.06)' }}>Avisar</button>
      </div>
    </div>
  );
}

export default function ModeracaoFila({ slug }) {
  const [fila, setFila] = useState(null);

  useEffect(() => {
    let ativo = true;
    apiFetch(`/api/denuncias/fila?slug=${encodeURIComponent(slug)}`)
      .then((d) => ativo && setFila(d.fila || []))
      .catch(() => ativo && setFila([]));
    return () => { ativo = false; };
  }, [slug]);

  if (fila === null) return null; // silencioso enquanto carrega
  if (!fila.length) {
    return (
      <div style={{ marginTop: 8, textAlign: 'center', color: '#7f7a8e', fontSize: 12.5, padding: '18px 10px', lineHeight: 1.6 }}>
        <b style={{ color: '#9fd8a8' }}>Tudo tranquilo por aqui.</b><br />A IA já resolveu os óbvios: só chega o que precisa do seu olho.
      </div>
    );
  }
  return (
    <div style={{ marginTop: 8 }}>
      {fila.map((c) => (
        <CasoCard key={c.id} slug={slug} caso={c} onResolvido={(id) => setFila((f) => f.filter((x) => x.id !== id))} />
      ))}
    </div>
  );
}

// Badge de contagem (para o cabeçalho do hub). Faz o próprio fetch, leve.
export function ModeracaoBadge({ slug }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    let ativo = true;
    apiFetch(`/api/denuncias/fila?slug=${encodeURIComponent(slug)}`)
      .then((d) => ativo && setN(d.total || 0))
      .catch(() => {});
    return () => { ativo = false; };
  }, [slug]);
  if (!n) return null;
  return <span className="chip-badge" aria-label={`${n} por moderar`}>{n}</span>;
}
