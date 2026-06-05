// Futty v2.0 — Comentários (Parte 4A: texto, anexos imagem/GIF, reações).
// Menções, respostas aninhadas e denúncias ficam para a Parte 4B.
import { useEffect, useState } from 'react';
import { apiFetch, assetUrl } from '../lib/api';
import { useAuth } from '../hooks/useAuth';
import { iniciaisNome } from '../utils/avatar';
import Reacoes from './Reacoes';
import UploadComCrop from './UploadComCrop';

// Conta comentários não removidos.
function contar(lista) {
  return lista.filter((c) => !c.deleted).length;
}

// Tempo relativo curto.
function haQuantoTempo(iso) {
  const ts = new Date(iso).getTime();
  if (!Number.isFinite(ts)) return '';
  const diff = Date.now() - ts;
  const min = Math.floor(diff / 60000);
  if (min < 60) return `há ${Math.max(1, min)} min`;
  const h = Math.floor(diff / 3600000);
  if (h < 48) return `há ${h} h`;
  const dias = Math.floor(diff / 86400000);
  if (dias < 14) return `há ${dias} dias`;
  const sem = Math.floor(dias / 7);
  if (sem < 8) return `há ${sem} semanas`;
  return `há ${Math.floor(dias / 30)} meses`;
}

// Avatar circular simples (tamanho exacto + fallback a iniciais).
function Avatar({ nome, avatarUrl, size = 40 }) {
  const [falhou, setFalhou] = useState(false);
  const src = avatarUrl ? assetUrl(avatarUrl) : null;
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        overflow: 'hidden',
        flexShrink: 0,
        display: 'grid',
        placeItems: 'center',
        background: 'var(--bg-elev)',
        color: 'var(--text)',
        fontWeight: 800,
        fontSize: Math.round(size * 0.34),
        border: '1px solid var(--border)',
      }}
    >
      {src && !falhou ? (
        <img src={src} alt="" onError={() => setFalhou(true)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        iniciaisNome(nome)
      )}
    </div>
  );
}

// Grelha/carrossel de anexos clicáveis.
function Anexos({ anexos, onOpenImage }) {
  if (!anexos?.length) return null;
  const carrossel = anexos.length > 2;
  return (
    <div
      style={
        carrossel
          ? { display: 'flex', gap: 6, overflowX: 'auto', marginTop: 8, paddingBottom: 4 }
          : { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginTop: 8 }
      }
    >
      {anexos.map((a, ix) => {
        const url = assetUrl(a.url);
        return (
          <button
            key={`${a.url}-${ix}`}
            type="button"
            onClick={() => onOpenImage(url)}
            style={{
              padding: 0,
              border: 'none',
              background: '#000',
              borderRadius: 10,
              overflow: 'hidden',
              cursor: 'zoom-in',
              flexShrink: 0,
            }}
          >
            <img
              src={url}
              alt=""
              style={
                carrossel
                  ? { width: 140, height: 140, objectFit: 'cover', display: 'block' }
                  : { width: '100%', height: 120, objectFit: 'cover', display: 'block' }
              }
            />
          </button>
        );
      })}
    </div>
  );
}

export default function Comentarios({ parentType, parentId, visivel = false, isAdmin = false, onCount }) {
  const { user } = useAuth();
  const meId = user?.id || null;
  const meuNome = user?.user_metadata?.nome || user?.user_metadata?.full_name || user?.email || '';
  const meuAvatar = user?.user_metadata?.avatar_url || null;

  const [comentarios, setComentarios] = useState(null); // null = ainda não carregado
  const [erro, setErro] = useState('');

  const [texto, setTexto] = useState('');
  const [anexos, setAnexos] = useState([]); // { url, media_type }
  const [enviando, setEnviando] = useState(false);

  const [apagarId, setApagarId] = useState(null); // id em confirmação de apagar
  const [imgFull, setImgFull] = useState(null);

  // Lazy-load: carrega uma vez, quando fica visível pela primeira vez.
  useEffect(() => {
    if (!visivel || comentarios !== null) return undefined;
    let ativo = true;
    apiFetch(`/api/feed/comentarios/${parentType}/${parentId}`)
      .then((d) => {
        if (!ativo) return;
        // Servidor devolve ASC; mostramos mais-recente-primeiro.
        const lista = Array.isArray(d.comentarios) ? [...d.comentarios].reverse() : [];
        setComentarios(lista);
        onCount?.(contar(lista));
      })
      .catch((err) => ativo && setErro(err.message));
    return () => {
      ativo = false;
    };
  }, [visivel, comentarios, parentType, parentId, onCount]);

  if (!visivel) return null;

  const loading = comentarios === null && !erro;
  const lista = comentarios || [];

  function addAnexo(url, mediaType) {
    setAnexos((a) => (a.length >= 4 ? a : [...a, { url, media_type: mediaType }]));
  }
  function removeAnexo(i) {
    setAnexos((a) => a.filter((_, ix) => ix !== i));
  }

  async function enviar() {
    if (enviando) return;
    const body = texto.trim();
    if (!body && anexos.length === 0) return;
    setEnviando(true);
    setErro('');
    try {
      const res = await apiFetch('/api/feed/comentarios', {
        method: 'POST',
        body: JSON.stringify({
          parent_type: parentType,
          parent_id: parentId,
          body,
          anexos: anexos.map((a) => ({ url: a.url, media_type: a.media_type })),
        }),
      });
      const novo = res.comentario;
      setComentarios((cur) => {
        const proximo = [novo, ...(cur || [])];
        onCount?.(contar(proximo));
        return proximo;
      });
      setTexto('');
      setAnexos([]);
    } catch (err) {
      setErro(err.message);
    } finally {
      setEnviando(false);
    }
  }

  async function confirmarApagar() {
    const id = apagarId;
    if (!id) return;
    setApagarId(null);
    setErro('');
    try {
      await apiFetch(`/api/feed/comentarios/${id}`, { method: 'DELETE' });
      setComentarios((cur) => {
        const proximo = (cur || []).filter((c) => c.id !== id);
        onCount?.(contar(proximo));
        return proximo;
      });
    } catch (err) {
      setErro(err.message);
    }
  }

  const podeEnviar = (texto.trim() || anexos.length > 0) && !enviando;

  return (
    <div style={{ borderTop: '1px solid #222222', marginTop: 10, paddingTop: 10 }}>
      {erro ? <div style={{ fontSize: 12, color: 'var(--danger)', marginBottom: 8 }}>{erro}</div> : null}

      {loading ? (
        <div style={{ fontSize: 13, color: 'var(--text-dim)', padding: '6px 0' }}>A carregar comentários…</div>
      ) : lista.length === 0 ? (
        <div style={{ fontSize: 13, color: 'var(--text-dim)', padding: '6px 0' }}>Ainda não há comentários. Sê o primeiro!</div>
      ) : (
        <div style={{ display: 'grid', gap: 14 }}>
          {lista.map((c) => {
            if (c.deleted) {
              return (
                <div key={c.id} style={{ fontSize: 13, color: 'var(--text-dim)', fontStyle: 'italic' }}>
                  Comentário removido.
                </div>
              );
            }
            const podeApagar = c.author_id === meId || isAdmin;
            return (
              <div key={c.id} style={{ display: 'flex', gap: 10 }}>
                <Avatar nome={c.author_nome} avatarUrl={c.author_avatar_url} size={40} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
                    <span style={{ fontWeight: 800, color: '#fff', fontSize: 13 }}>{c.author_nome || 'Membro'}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                      <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>{haQuantoTempo(c.created_at)}</span>
                      {podeApagar ? (
                        <button
                          type="button"
                          aria-label="Apagar comentário"
                          onClick={() => setApagarId(c.id)}
                          style={{ border: 'none', background: 'transparent', padding: 0, cursor: 'pointer', color: 'var(--text-dim)', fontSize: 14, lineHeight: 1 }}
                        >
                          🗑️
                        </button>
                      ) : null}
                    </span>
                  </div>
                  {c.body ? (
                    <div style={{ marginTop: 4, fontSize: 13, color: '#fff', whiteSpace: 'pre-wrap', lineHeight: 1.45 }}>{c.body}</div>
                  ) : null}
                  <Anexos anexos={c.anexos} onOpenImage={setImgFull} />
                  <div style={{ marginTop: 8 }}>
                    <Reacoes targetType="comentario" targetId={c.id} contagemInicial={c.contagem_reacoes} minhaReacaoInicial={c.minha_reacao} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* FORMULÁRIO DE NOVO COMENTÁRIO */}
      <div style={{ display: 'flex', gap: 8, marginTop: 14, alignItems: 'flex-start' }}>
        <Avatar nome={meuNome} avatarUrl={meuAvatar} size={32} />
        <div style={{ flex: 1, minWidth: 0, display: 'grid', gap: 8 }}>
          <div style={{ position: 'relative' }}>
            <textarea
              value={texto}
              onChange={(e) => setTexto(e.target.value.slice(0, 500))}
              placeholder="Escreve um comentário…"
              rows={2}
              style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 12, border: '1px solid #222222', background: '#0c0c0c', color: '#fff', fontSize: 13, resize: 'vertical' }}
            />
            <span style={{ position: 'absolute', right: 10, bottom: 8, fontSize: 10, color: 'var(--text-dim)' }}>{texto.length}/500</span>
          </div>

          {/* Preview dos anexos seleccionados */}
          {anexos.length ? (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {anexos.map((a, ix) => (
                <div key={`${a.url}-${ix}`} style={{ position: 'relative', width: 64, height: 64, borderRadius: 10, overflow: 'hidden', border: '1px solid #222222' }}>
                  <img src={assetUrl(a.url)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <button
                    type="button"
                    aria-label="Remover anexo"
                    onClick={() => removeAnexo(ix)}
                    style={{ position: 'absolute', top: 2, right: 2, width: 20, height: 20, borderRadius: '50%', border: 'none', background: 'rgba(0,0,0,0.7)', color: '#fff', cursor: 'pointer', fontSize: 11, lineHeight: 1 }}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          ) : null}

          <div style={{ display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'space-between' }}>
            {anexos.length < 4 ? (
              <UploadComCrop onUpload={addAnexo} accept="image/*" aspect={1} label="📎 Anexo" />
            ) : (
              <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>Máximo 4 anexos</span>
            )}
            <button
              type="button"
              className="btn btn--primary btn--sm"
              disabled={!podeEnviar}
              onClick={enviar}
            >
              {enviando ? 'A enviar…' : 'Enviar'}
            </button>
          </div>
        </div>
      </div>

      {/* Modal de confirmação de apagar */}
      {apagarId ? (
        <div className="modal-overlay" role="presentation" onClick={() => setApagarId(null)}>
          <div className="modal-card" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <div className="modal-card__inner">
              <p style={{ fontSize: 15, marginBottom: 16 }}>Tens a certeza que queres apagar?</p>
              <button type="button" className="btn btn--primary" style={{ width: '100%', background: 'var(--danger)', color: '#fff' }} onClick={confirmarApagar}>
                Apagar
              </button>
              <button type="button" className="btn btn--ghost btn--sm" style={{ width: '100%', marginTop: 10 }} onClick={() => setApagarId(null)}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Fullscreen de anexo */}
      {imgFull ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Imagem"
          onClick={() => setImgFull(null)}
          style={{ position: 'fixed', inset: 0, zIndex: 200, background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
        >
          <img src={imgFull} alt="" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
        </div>
      ) : null}
    </div>
  );
}
