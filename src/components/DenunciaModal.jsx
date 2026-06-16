// Futty v2.0 — Modal de denúncia (comentário ou post). POST /api/feed/denuncias.
import { useState } from 'react';
import { apiFetch } from '../lib/api';

const MOTIVOS = [
  { v: 'linguagem_inapropriada', l: 'Linguagem inapropriada' },
  { v: 'spam', l: 'Spam' },
  { v: 'conteudo_ofensivo', l: 'Conteúdo ofensivo' },
  { v: 'outro', l: 'Outro' },
];

export default function DenunciaModal({ targetType, targetId, onClose, onResult }) {
  const [motivo, setMotivo] = useState('linguagem_inapropriada');
  const [descricao, setDescricao] = useState('');
  const [busy, setBusy] = useState(false);

  async function enviar() {
    if (busy) return;
    setBusy(true);
    try {
      await apiFetch('/api/feed/denuncias', {
        method: 'POST',
        body: JSON.stringify({
          target_type: targetType,
          target_id: targetId,
          motivo,
          descricao: motivo === 'outro' ? descricao.trim().slice(0, 500) : undefined,
        }),
      });
      onResult?.({ tipo: 'success', mensagem: 'Denúncia enviada. Obrigado.' });
    } catch (err) {
      // O backend atual é idempotente (200); este ramo cobre erros reais
      // (e um eventual 409 caso o backend passe a distinguir duplicados).
      const dup = /409|já denunci|duplic/i.test(err?.message || '');
      onResult?.({ tipo: dup ? 'info' : 'error', mensagem: dup ? 'Já denunciaste este conteúdo.' : err?.message || 'Erro ao denunciar.' });
    } finally {
      setBusy(false);
      onClose?.();
    }
  }

  const titulo = targetType === 'post' ? 'Denunciar post' : 'Denunciar comentário';

  return (
    <div className="modal-overlay" role="presentation" onClick={() => !busy && onClose?.()}>
      <div className="modal-card" role="dialog" aria-modal="true" style={{ maxWidth: 380 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-card__inner" style={{ textAlign: 'left' }}>
          <h2 style={{ fontSize: 16, fontWeight: 800, marginBottom: 14, textAlign: 'center' }}>{titulo}</h2>
          <div style={{ display: 'grid', gap: 10 }}>
            {MOTIVOS.map((m) => (
              <label key={m.v} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, cursor: 'pointer' }}>
                <input type="radio" name="motivo-denuncia" value={m.v} checked={motivo === m.v} onChange={() => setMotivo(m.v)} style={{ accentColor: '#7c3aed' }} />
                {m.l}
              </label>
            ))}
          </div>
          {motivo === 'outro' ? (
            <textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value.slice(0, 500))}
              placeholder="Descreve (opcional)…"
              rows={3}
              style={{ width: '100%', boxSizing: 'border-box', marginTop: 10, padding: 10, borderRadius: 10, border: '1px solid #222222', background: '#0c0c0c', color: '#fff', fontSize: 13, resize: 'vertical' }}
            />
          ) : null}
          <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
            <button type="button" className="btn btn--ghost" style={{ flex: 1 }} disabled={busy} onClick={onClose}>
              Cancelar
            </button>
            <button type="button" className="btn btn--purple" style={{ flex: 1 }} disabled={busy} onClick={enviar}>
              {busy ? 'Enviando…' : 'Enviar denúncia'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
