// Futty v2.0 — Comentários (4A: texto, anexos, reações · 4B: menções,
// respostas aninhadas, denúncias).
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch, assetUrl } from '../lib/api';
import { useAuth } from '../hooks/useAuth';
import { iniciaisNome } from '../utils/avatar';
import Reacoes from './Reacoes';
import UploadComCrop from './UploadComCrop';
import DenunciaModal from './DenunciaModal';
import Toast from './Toast';

// Token de menção no corpo (armazenado como @<uuid>; exibido como @Nome).
const UUID_TOKEN = /(@[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/gi;
const UUID_ONLY = /^@([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i;
// Menção a ser escrita (parcial) no fim do texto: @palavra.
const MENCAO_PARCIAL = /(^|\s)@([^\s@]{1,30})$/;

function contar(lista) {
  return lista.filter((c) => !c.deleted).length;
}

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
            style={{ padding: 0, border: 'none', background: '#000', borderRadius: 10, overflow: 'hidden', cursor: 'zoom-in', flexShrink: 0 }}
          >
            <img
              src={url}
              alt=""
              style={carrossel ? { width: 140, height: 140, objectFit: 'cover', display: 'block' } : { width: '100%', height: 120, objectFit: 'cover', display: 'block' }}
            />
          </button>
        );
      })}
    </div>
  );
}

// ─── Formulário reutilizável (comentário principal e respostas) ────────────────
// Trata texto, contador, anexos e o autocomplete de menções. Converte @Nome em
// @<uuid> no envio (o backend extrai mentioned_user_ids do corpo por uuid).
function ComentarioForm({ membros, placeholder = 'Escreve um comentário…', avatarNode = null, onSubmit, onCancel }) {
  const [texto, setTexto] = useState('');
  const [anexos, setAnexos] = useState([]); // { url, media_type }
  const [mentions, setMentions] = useState([]); // { id, nome }
  const [drop, setDrop] = useState({ open: false, query: '' });
  const [busy, setBusy] = useState(false);
  const [erro, setErro] = useState('');

  const sugestoes = useMemo(() => {
    if (!drop.open) return [];
    const q = drop.query.toLowerCase();
    return (membros || []).filter((m) => String(m.nome || m.email || '').toLowerCase().includes(q)).slice(0, 5);
  }, [drop, membros]);

  function onChangeTexto(v) {
    const val = v.slice(0, 500);
    setTexto(val);
    const m = MENCAO_PARCIAL.exec(val);
    setDrop(m ? { open: true, query: m[2] } : { open: false, query: '' });
  }

  function aplicarMencao(mb) {
    const nome = mb.nome || mb.email || 'membro';
    setTexto((prev) => prev.replace(MENCAO_PARCIAL, (_mt, pre) => `${pre}@${nome} `));
    setMentions((prev) => (prev.some((x) => x.id === mb.id) ? prev : [...prev, { id: mb.id, nome }]));
    setDrop({ open: false, query: '' });
  }

  function addAnexo(url, mediaType) {
    setAnexos((a) => (a.length >= 4 ? a : [...a, { url, media_type: mediaType }]));
  }
  function removeAnexo(i) {
    setAnexos((a) => a.filter((_, ix) => ix !== i));
  }

  async function submeter() {
    if (busy) return;
    // Converte @Nome → @<uuid> para cada menção seleccionada.
    let finalBody = texto.trim();
    for (const men of mentions) finalBody = finalBody.split(`@${men.nome}`).join(`@${men.id}`);
    if (!finalBody && anexos.length === 0) return;
    setBusy(true);
    setErro('');
    try {
      await onSubmit(finalBody, anexos);
      setTexto('');
      setAnexos([]);
      setMentions([]);
      setDrop({ open: false, query: '' });
    } catch (e) {
      setErro(e.message);
    } finally {
      setBusy(false);
    }
  }

  const podeEnviar = (texto.trim() || anexos.length > 0) && !busy;

  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
      {avatarNode}
      <div style={{ flex: 1, minWidth: 0, display: 'grid', gap: 8 }}>
        <div style={{ position: 'relative' }}>
          <textarea
            value={texto}
            onChange={(e) => onChangeTexto(e.target.value)}
            onKeyDown={(e) => e.key === 'Escape' && setDrop({ open: false, query: '' })}
            onBlur={() => setTimeout(() => setDrop((d) => ({ ...d, open: false })), 150)}
            placeholder={placeholder}
            rows={2}
            style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 12, border: '1px solid #222222', background: '#0c0c0c', color: '#fff', fontSize: 13, resize: 'vertical' }}
          />
          <span style={{ position: 'absolute', right: 10, bottom: 8, fontSize: 10, color: 'var(--text-dim)' }}>{texto.length}/500</span>

          {/* Dropdown de menções */}
          {drop.open && sugestoes.length ? (
            <div style={{ position: 'absolute', left: 0, right: 0, top: '100%', marginTop: 4, zIndex: 20, background: '#0b0b0b', border: '1px solid #222222', borderRadius: 12, overflow: 'hidden' }}>
              {sugestoes.map((mb) => (
                <button
                  key={mb.id}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault(); // aplica antes do blur
                    aplicarMencao(mb);
                  }}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', textAlign: 'left', padding: '8px 10px', border: 'none', background: 'transparent', color: '#fff', cursor: 'pointer' }}
                >
                  <Avatar nome={mb.nome} avatarUrl={mb.avatar_url} size={28} />
                  <span style={{ fontSize: 13, fontWeight: 700 }}>{mb.nome || mb.email}</span>
                </button>
              ))}
            </div>
          ) : null}
        </div>

        {erro ? <div style={{ fontSize: 12, color: 'var(--danger)' }}>{erro}</div> : null}

        {/* Preview de anexos */}
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
          <div style={{ display: 'flex', gap: 8 }}>
            {onCancel ? (
              <button type="button" className="btn btn--ghost btn--sm" onClick={onCancel}>
                Cancelar
              </button>
            ) : null}
            <button type="button" className="btn btn--primary btn--sm" disabled={!podeEnviar} onClick={submeter}>
              {busy ? 'Enviando…' : 'Enviar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Comentarios({ parentType, parentId, visivel = false, isAdmin = false, teamSlug = null, onCount }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const meId = user?.id || null;
  const meuNome = user?.user_metadata?.nome || user?.user_metadata?.full_name || user?.email || '';
  const meuAvatar = user?.user_metadata?.avatar_url || null;

  const [comentarios, setComentarios] = useState(null); // null = não carregado
  const [erro, setErro] = useState('');
  const [membros, setMembros] = useState([]);

  const [apagarId, setApagarId] = useState(null);
  const [imgFull, setImgFull] = useState(null);
  const [replyOpenId, setReplyOpenId] = useState(null);
  const [menuOpenId, setMenuOpenId] = useState(null);
  const [denunciaTarget, setDenunciaTarget] = useState(null); // { targetType, targetId }
  const [toast, setToast] = useState(null); // { tipo, mensagem }

  // Lazy-load dos comentários (uma vez, ao ficar visível).
  useEffect(() => {
    if (!visivel || comentarios !== null) return undefined;
    let ativo = true;
    apiFetch(`/api/feed/comentarios/${parentType}/${parentId}`)
      .then((d) => {
        if (!ativo) return;
        const lista = Array.isArray(d.comentarios) ? [...d.comentarios].reverse() : [];
        setComentarios(lista);
        onCount?.(contar(lista));
      })
      .catch((err) => ativo && setErro(err.message));
    return () => {
      ativo = false;
    };
  }, [visivel, comentarios, parentType, parentId, onCount]);

  // Membros da equipa (para autocomplete de menções).
  useEffect(() => {
    if (!visivel || !teamSlug) return undefined;
    let ativo = true;
    apiFetch(`/api/teams/${teamSlug}`)
      .then((d) => ativo && setMembros(Array.isArray(d.members) ? d.members : []))
      .catch(() => {});
    return () => {
      ativo = false;
    };
  }, [visivel, teamSlug]);

  // Fecha o menu ··· ao clicar fora.
  useEffect(() => {
    if (menuOpenId == null) return undefined;
    function onDown(e) {
      if (e.target?.closest?.('[data-com-menu]')) return;
      setMenuOpenId(null);
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [menuOpenId]);

  const membrosById = useMemo(() => {
    const map = {};
    for (const m of membros) map[m.id] = m;
    return map;
  }, [membros]);

  if (!visivel) return null;

  const loading = comentarios === null && !erro;
  const lista = comentarios || [];

  // Threading: top-level + respostas agrupadas pela raiz (1 nível de recuo).
  const porId = {};
  for (const c of lista) porId[c.id] = c;
  function raizDe(c) {
    let atual = c;
    let guarda = 0;
    while (atual && atual.reply_to != null && porId[atual.reply_to] && guarda < 50) {
      atual = porId[atual.reply_to];
      guarda += 1;
    }
    return atual;
  }
  const topLevel = lista.filter((c) => c.reply_to == null);
  const respostasPorRaiz = {};
  for (const c of lista) {
    if (c.reply_to == null) continue;
    const raiz = raizDe(c);
    if (!raiz || raiz.id === c.id) continue;
    (respostasPorRaiz[raiz.id] ||= []).push(c);
  }
  for (const k of Object.keys(respostasPorRaiz)) {
    respostasPorRaiz[k].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  }

  function irParaPerfil(userId) {
    if (teamSlug) navigate(`/equipa/${teamSlug}/jogador/${userId}`);
  }

  // Renderiza o corpo, transformando @<uuid> em @Nome clicável.
  function renderCorpo(body) {
    const partes = String(body).split(UUID_TOKEN);
    return partes.map((p, i) => {
      const m = UUID_ONLY.exec(p);
      if (m) {
        const id = m[1];
        const membro = membrosById[id];
        const nome = membro ? membro.nome || membro.email : 'membro';
        return (
          <button
            key={i}
            type="button"
            onClick={() => irParaPerfil(id)}
            style={{ border: 'none', background: 'transparent', padding: 0, color: 'var(--purple)', fontWeight: 800, cursor: 'pointer' }}
          >
            @{nome}
          </button>
        );
      }
      return <span key={i}>{p}</span>;
    });
  }

  async function postComentario({ body, anexos, replyTo }) {
    const res = await apiFetch('/api/feed/comentarios', {
      method: 'POST',
      body: JSON.stringify({
        parent_type: parentType,
        parent_id: parentId,
        body,
        reply_to: replyTo ?? null,
        anexos: anexos.map((a) => ({ url: a.url, media_type: a.media_type })),
      }),
    });
    setComentarios((cur) => {
      const proximo = [res.comentario, ...(cur || [])];
      onCount?.(contar(proximo));
      return proximo;
    });
    return res.comentario;
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

  // Renderiza um comentário (top-level ou resposta). Função pura (sem hooks).
  function renderRow(c) {
    if (c.deleted) {
      return (
        <div style={{ fontSize: 13, color: 'var(--text-dim)', fontStyle: 'italic' }}>Comentário removido.</div>
      );
    }
    const ehMeu = c.author_id === meId;
    const podeApagar = ehMeu || isAdmin;
    const podeDenunciar = !ehMeu;

    return (
      <>
        <div style={{ display: 'flex', gap: 10 }}>
          <Avatar nome={c.author_nome} avatarUrl={c.author_avatar_url} size={40} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
              <span style={{ fontWeight: 800, color: '#fff', fontSize: 13 }}>{c.author_nome || 'Membro'}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, position: 'relative' }}>
                <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>{haQuantoTempo(c.created_at)}</span>
                {podeApagar || podeDenunciar ? (
                  <span data-com-menu style={{ position: 'relative' }}>
                    <button
                      type="button"
                      aria-label="Opções"
                      onClick={() => setMenuOpenId((cur) => (cur === c.id ? null : c.id))}
                      style={{ border: 'none', background: 'transparent', padding: 0, cursor: 'pointer', color: 'var(--text-dim)', fontSize: 16, lineHeight: 1, fontWeight: 900 }}
                    >
                      ⋯
                    </button>
                    {menuOpenId === c.id ? (
                      <div style={{ position: 'absolute', right: 0, top: '100%', marginTop: 4, minWidth: 150, background: '#0c0c0c', border: '1px solid #222222', borderRadius: 10, overflow: 'hidden', zIndex: 10 }}>
                        {podeDenunciar ? (
                          <button
                            type="button"
                            onClick={() => {
                              setMenuOpenId(null);
                              setDenunciaTarget({ targetType: 'comentario', targetId: c.id });
                            }}
                            style={menuItemStyle}
                          >
                            Denunciar
                          </button>
                        ) : null}
                        {podeApagar ? (
                          <button
                            type="button"
                            onClick={() => {
                              setMenuOpenId(null);
                              setApagarId(c.id);
                            }}
                            style={{ ...menuItemStyle, color: '#fda4af' }}
                          >
                            Excluir
                          </button>
                        ) : null}
                      </div>
                    ) : null}
                  </span>
                ) : null}
              </span>
            </div>
            {c.body ? (
              <div style={{ marginTop: 4, fontSize: 13, color: '#fff', whiteSpace: 'pre-wrap', lineHeight: 1.45 }}>{renderCorpo(c.body)}</div>
            ) : null}
            <Anexos anexos={c.anexos} onOpenImage={setImgFull} />
            <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <Reacoes targetType="comentario" targetId={c.id} contagemInicial={c.contagem_reacoes} minhaReacaoInicial={c.minha_reacao} />
              <button
                type="button"
                onClick={() => setReplyOpenId((cur) => (cur === c.id ? null : c.id))}
                style={{ border: 'none', background: 'transparent', padding: 0, color: 'var(--text-dim)', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}
              >
                Responder
              </button>
            </div>
          </div>
        </div>

        {/* Formulário de resposta inline */}
        {replyOpenId === c.id ? (
          <div style={{ marginTop: 10, marginLeft: 50 }}>
            <ComentarioForm
              membros={membros}
              placeholder={`A responder a @${c.author_nome || 'membro'}…`}
              onSubmit={async (body, anexos) => {
                await postComentario({ body, anexos, replyTo: c.id });
                setReplyOpenId(null);
              }}
              onCancel={() => setReplyOpenId(null)}
            />
          </div>
        ) : null}
      </>
    );
  }

  return (
    <div style={{ borderTop: '1px solid #222222', marginTop: 10, paddingTop: 10 }}>
      {erro ? <div style={{ fontSize: 12, color: 'var(--danger)', marginBottom: 8 }}>{erro}</div> : null}

      {loading ? (
        <div style={{ fontSize: 13, color: 'var(--text-dim)', padding: '6px 0' }}>Carregando comentários…</div>
      ) : lista.length === 0 ? (
        <div style={{ fontSize: 13, color: 'var(--text-dim)', padding: '6px 0' }}>Ainda não há comentários. Sê o primeiro!</div>
      ) : (
        <div style={{ display: 'grid', gap: 14 }}>
          {topLevel.map((c) => (
            <div key={c.id}>
              {renderRow(c)}
              {(respostasPorRaiz[c.id] || []).map((r) => (
                <div key={r.id} style={{ marginLeft: 16, paddingLeft: 12, borderLeft: '2px solid rgba(124,58,237,0.55)', marginTop: 14 }}>
                  {renderRow(r)}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Formulário principal (sempre visível no fundo) */}
      <div style={{ marginTop: 14 }}>
        <ComentarioForm
          membros={membros}
          placeholder="Escreve um comentário…"
          avatarNode={<Avatar nome={meuNome} avatarUrl={meuAvatar} size={32} />}
          onSubmit={async (body, anexos) => {
            await postComentario({ body, anexos });
          }}
        />
      </div>

      {/* Modal de confirmação de apagar */}
      {apagarId ? (
        <div className="modal-overlay" role="presentation" onClick={() => setApagarId(null)}>
          <div className="modal-card" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <div className="modal-card__inner">
              <p style={{ fontSize: 15, marginBottom: 16 }}>Tens a certeza que queres excluir?</p>
              <button type="button" className="btn btn--primary" style={{ width: '100%', background: 'var(--danger)', color: '#fff' }} onClick={confirmarApagar}>
                Excluir
              </button>
              <button type="button" className="btn btn--ghost btn--sm" style={{ width: '100%', marginTop: 10 }} onClick={() => setApagarId(null)}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Modal de denúncia */}
      {denunciaTarget ? (
        <DenunciaModal
          targetType={denunciaTarget.targetType}
          targetId={denunciaTarget.targetId}
          onClose={() => setDenunciaTarget(null)}
          onResult={(r) => setToast({ tipo: r.tipo, mensagem: r.mensagem })}
        />
      ) : null}

      {/* Toast */}
      {toast ? <Toast mensagem={toast.mensagem} tipo={toast.tipo} onClose={() => setToast(null)} /> : null}

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

const menuItemStyle = {
  display: 'block',
  width: '100%',
  textAlign: 'left',
  padding: '10px 12px',
  border: 'none',
  background: 'transparent',
  color: '#fff',
  fontWeight: 700,
  fontSize: 13,
  cursor: 'pointer',
};
