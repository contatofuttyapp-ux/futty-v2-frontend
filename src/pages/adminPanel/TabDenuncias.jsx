// Futty v2.0 — As denúncias do time, na aba AJUSTES do admin.

import { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/api';
import LoadingFutty from '../../components/LoadingFutty';
import { CARD, haQuantoTempo, textoDeApoio } from './comum';
import { ConfirmModal } from './pecas';

// ─── TAB: DENÚNCIAS ──────────────────────────────────────────────────────────
function TabDenuncias({ showToast }) {
  const [denuncias, setDenuncias] = useState(null);
  const [confirmar, setConfirmar] = useState(null);

  useEffect(() => {
    let ativo = true;
    apiFetch('/api/feed/denuncias')
      .then((d) => ativo && setDenuncias(d.denuncias || []))
      .catch((e) => ativo && (setDenuncias([]), showToast(e.message, 'error')));
    return () => {
      ativo = false;
    };
  }, [showToast]);

  async function resolver(d, apagar) {
    try {
      await apiFetch(`/api/feed/denuncias/${d.id}/resolver`, { method: 'PATCH', body: JSON.stringify({ apagar_conteudo: apagar }) });
      setDenuncias((cur) => cur.filter((x) => x.id !== d.id));
      showToast(apagar ? 'Conteúdo excluído.' : 'Denúncia resolvida.');
    } catch (e) {
      showToast(e.message, 'error');
    }
  }

  if (denuncias === null) return <LoadingFutty />;
  // Vazia, some: a fila da moderação, logo acima, já diz "Tudo tranquilo por aqui." (dois "vazios" seguidos eram ruído).
  if (denuncias.length === 0) return null;

  const MOTIVO_LABEL = { linguagem_inapropriada: 'Linguagem inapropriada', spam: 'Spam', conteudo_ofensivo: 'Conteúdo ofensivo', outro: 'Outro' };

  return (
    <div style={{ display: 'grid', gap: 10 }}>
      {denuncias.map((d) => (
        <div key={d.id} style={{ ...CARD, padding: 12, display: 'grid', gap: 8 }}>
          <div style={textoDeApoio}>
            {d.target_type === 'post' ? 'Post' : 'Comentário'} · <span style={{ color: '#fda4af', fontWeight: 700 }}>{MOTIVO_LABEL[d.motivo] || d.motivo}</span>
          </div>
          {d.conteudo ? (
            <div style={{ fontSize: 13, color: '#fff', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden', background: '#0c0c0c', borderRadius: 8, padding: 8 }}>{d.conteudo}</div>
          ) : <div style={{ fontSize: 12, color: 'var(--text-dim)', fontStyle: 'italic' }}>(conteúdo indisponível)</div>}
          <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>Denunciado por {d.reporter_nome || 'alguém'} · {haQuantoTempo(d.created_at)}</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => resolver(d, false)}>Ignorar</button>
            <button type="button" className="btn btn--ghost btn--sm" style={{ borderColor: 'var(--danger)', color: '#fda4af' }} onClick={() => setConfirmar(d)}>Excluir conteúdo</button>
          </div>
        </div>
      ))}

      {confirmar ? (
        <ConfirmModal
          texto="Excluir o conteúdo denunciado?"
          perigo
          confirmarLabel="Excluir"
          onConfirm={() => { const d = confirmar; setConfirmar(null); resolver(d, true); }}
          onCancel={() => setConfirmar(null)}
        />
      ) : null}
    </div>
  );
}

export { TabDenuncias };
