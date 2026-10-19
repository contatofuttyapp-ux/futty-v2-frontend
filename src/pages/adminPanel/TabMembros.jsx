// Futty v2.0 — Os membros do time e a mensagem a um deles, na aba ELENCO do admin.

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { MessageSquare, UserX, UserCheck, ChevronRight, ShieldCheck, ShieldOff, RotateCcw, UserMinus } from 'lucide-react';
import { apiFetch } from '../../lib/api';
import { SEM_NOTA } from '../../utils/format';
import { LABEL_LINHA } from '../../utils/posicoes';
import { formatarNota } from '../../utils/numero';
import { nomeExibicao } from '../../utils/nomeExibicao';
import LoadingFutty from '../../components/LoadingFutty';
import PlayerAvatar from '../../components/PlayerAvatar';
import { inputStyle, lbl } from '../../components/camposDoAdmin';
import { CARD, rotuloECampo } from './comum';
import { ConfirmModal } from './pecas';

// ─── TAB: MEMBROS ────────────────────────────────────────────────────────────
// Form inline de mensagem push directa a um jogador específico.
function FormMensagem({ slug, membro, showToast, onClose }) {
  const [titulo, setTitulo] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [busy, setBusy] = useState(false);
  const nome = membro.nome_jogador || membro.nome || 'jogador';

  async function enviar() {
    if (busy) return;
    if (!titulo.trim() || !mensagem.trim()) {
      showToast('Preencha o título e a mensagem.', 'error');
      return;
    }
    setBusy(true);
    try {
      await apiFetch(`/api/push/equipas/${slug}/membros/${membro.user_id}/mensagem`, {
        method: 'POST',
        body: JSON.stringify({ titulo: titulo.trim(), mensagem: mensagem.trim() }),
      });
      showToast(`Mensagem enviada a ${nome}.`);
      onClose();
    } catch (e) {
      if (e.status === 404) showToast('Jogador sem notificações ativas.', 'error');
      else showToast(e.message, 'error');
      setBusy(false);
    }
  }

  return (
    <div style={{ marginTop: 10, padding: 12, borderRadius: 10, border: '1px solid #222222', background: '#0c0c0c', display: 'grid', gap: 10 }}>
      <div style={{ fontSize: 12, fontWeight: 800, color: '#fff' }}>
        Enviar mensagem a <span style={{ color: 'var(--neon)' }}>{nome}</span>
      </div>
      <label style={rotuloECampo}>
        <span style={lbl}>Título <span style={{ color: 'var(--text-dim)' }}>({titulo.length}/60)</span></span>
        <input value={titulo} onChange={(e) => setTitulo(e.target.value.slice(0, 60))} placeholder="Ex.: Confirme sua presença" style={inputStyle} />
      </label>
      <label style={rotuloECampo}>
        <span style={lbl}>Mensagem <span style={{ color: 'var(--text-dim)' }}>({mensagem.length}/200)</span></span>
        <textarea value={mensagem} onChange={(e) => setMensagem(e.target.value.slice(0, 200))} rows={3} placeholder="Escreva a mensagem…" style={{ ...inputStyle, resize: 'vertical' }} />
      </label>
      <div style={{ display: 'flex', gap: 8 }}>
        <button type="button" className="btn btn--purple btn--sm" disabled={busy || !titulo.trim() || !mensagem.trim()} onClick={enviar}>
          {busy ? 'Enviando…' : 'Enviar'}
        </button>
        <button type="button" className="btn btn--ghost btn--sm" disabled={busy} onClick={onClose}>
          Cancelar
        </button>
      </div>
    </div>
  );
}

function TabMembros({ slug, meId, showToast }) {
  const [membros, setMembros] = useState(null);
  const [abertoId, setAbertoId] = useState(null); // o membro cujo painel está aberto (um toque no nome)
  const [mensagemAberta, setMensagemAberta] = useState(false);
  const [confirmacao, setConfirmacao] = useState(null);

  useEffect(() => {
    let ativo = true;
    apiFetch(`/api/teams/${slug}/membros`)
      .then((d) => ativo && setMembros(d.membros || []))
      .catch((e) => ativo && (setMembros([]), showToast(e.message, 'error')));
    return () => {
      ativo = false;
    };
  }, [slug, showToast]);

  async function togglePostar(m) {
    const novo = !m.pode_postar;
    setMembros((cur) => cur.map((x) => (x.user_id === m.user_id ? { ...x, pode_postar: novo } : x)));
    try {
      await apiFetch(`/api/teams/${slug}/membros/${m.user_id}`, { method: 'PATCH', body: JSON.stringify({ pode_postar: novo }) });
    } catch (e) {
      setMembros((cur) => cur.map((x) => (x.user_id === m.user_id ? { ...x, pode_postar: !novo } : x)));
      showToast(e.message, 'error');
    }
  }

  async function mudarRole(m, role) {
    try {
      await apiFetch(`/api/teams/${slug}/membros/${m.user_id}`, { method: 'PATCH', body: JSON.stringify({ role }) });
      setMembros((cur) => cur.map((x) => (x.user_id === m.user_id ? { ...x, role } : x)));
      showToast(role === 'admin' ? 'Agora é admin.' : 'Não é mais admin.');
    } catch (e) {
      showToast(e.message, 'error');
    }
  }

  async function remover(m) {
    try {
      await apiFetch(`/api/teams/${slug}/membros/${m.user_id}`, { method: 'DELETE' });
      setMembros((cur) => cur.filter((x) => x.user_id !== m.user_id));
      showToast('Membro removido.');
    } catch (e) {
      showToast(e.message, 'error');
    }
  }

  // Marca/reativa um jogador (optimista). Inactivo = fora do sorteio/ranking.
  async function setAtivo(m, ativo) {
    setMembros((cur) => cur.map((x) => (x.user_id === m.user_id ? { ...x, ativo } : x)));
    try {
      await apiFetch(`/api/teams/${slug}/membros/${m.user_id}/ativo`, { method: 'PATCH', body: JSON.stringify({ ativo }) });
      showToast(ativo ? `${m.nome_jogador || m.nome} reativado.` : `${m.nome_jogador || m.nome} marcado como inativo.`);
    } catch (e) {
      setMembros((cur) => cur.map((x) => (x.user_id === m.user_id ? { ...x, ativo: !ativo } : x)));
      showToast(e.message, 'error');
    }
  }

  async function zerarVotos(m) {
    try {
      const r = await apiFetch(`/api/teams/${slug}/votos/${m.user_id}`, { method: 'DELETE' });
      showToast(`Votos de ${m.nome_jogador || m.nome} zerados${r?.count != null ? ` (${r.count})` : ''}.`);
    } catch (e) {
      showToast(e.message, 'error');
    }
  }

  // Alterna a visibilidade no ranking (optimista).
  async function toggleRanking(m) {
    const visivel = m.visivel_ranking !== false;
    const novo = !visivel;
    setMembros((cur) => cur.map((x) => (x.user_id === m.user_id ? { ...x, visivel_ranking: novo } : x)));
    try {
      await apiFetch(`/api/teams/${slug}/membros/${m.user_id}`, { method: 'PATCH', body: JSON.stringify({ visivel_ranking: novo }) });
    } catch (e) {
      setMembros((cur) => cur.map((x) => (x.user_id === m.user_id ? { ...x, visivel_ranking: visivel } : x)));
      showToast(e.message, 'error');
    }
  }

  // Liga/desliga o goleiro de um membro (optimista) via endpoint dedicado.
  // `goleiro` é o campo único (grava categoria) — este botão e o
  // chip do próprio jogador (Equipa.jsx) nunca podem discordar.
  async function setGoleiro(m, ligado) {
    if (!!m.goleiro === ligado) return;
    const anterior = !!m.goleiro;
    setMembros((cur) => cur.map((x) => (x.user_id === m.user_id ? { ...x, goleiro: ligado } : x)));
    try {
      await apiFetch(`/api/equipas/${slug}/membros/posicao`, { method: 'PATCH', body: JSON.stringify({ goleiro: ligado, user_id: m.user_id }) });
    } catch (e) {
      setMembros((cur) => cur.map((x) => (x.user_id === m.user_id ? { ...x, goleiro: anterior } : x)));
      showToast(e.message, 'error');
    }
  }

  // Edita a nota interna localmente; grava ao sair do input.
  function setNotaLocal(m, value) {
    setMembros((cur) => cur.map((x) => (x.user_id === m.user_id ? { ...x, nota_interna: value } : x)));
  }
  async function saveNota(m) {
    try {
      await apiFetch(`/api/teams/${slug}/membros/${m.user_id}`, { method: 'PATCH', body: JSON.stringify({ nota_interna: m.nota_interna || null }) });
    } catch (e) {
      showToast(e.message, 'error');
    }
  }

  if (membros === null) return <LoadingFutty />;

  // Activos primeiro, inactivos no fundo (mantém a ordem do servidor dentro de cada grupo).
  const membrosOrdenados = [...membros].sort((a, b) => (a.ativo === false ? 1 : 0) - (b.ativo === false ? 1 : 0));
  // O membro aberto vem SEMPRE da lista viva (os toques no painel mudam a lista, otimista).
  const aberto = abertoId ? membros.find((x) => x.user_id === abertoId) || null : null;
  const pilula = (on, cor = 'var(--neon)') => ({ padding: '7px 12px', borderRadius: 999, fontSize: 12, fontWeight: 800, cursor: 'pointer', border: `1px solid ${on ? cor : '#333'}`, background: on ? 'rgba(139,92,246,0.12)' : 'transparent', color: on ? cor : 'var(--text-dim)' });
  const acao = (perigo = false) => ({ display: 'flex', alignItems: 'center', gap: 10, width: '100%', textAlign: 'left', padding: '12px 4px', border: 'none', borderTop: '1px solid rgba(255,255,255,0.06)', background: 'transparent', color: perigo ? '#fda4af' : '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer' });

  return (
    <div style={{ display: 'grid', gap: 8 }} data-elenco-admin>
      {membrosOrdenados.map((m) => {
        const inativo = m.ativo === false;
        return (
          <button
            key={m.user_id}
            type="button"
            data-membro={m.user_id}
            onClick={() => { setAbertoId(m.user_id); setMensagemAberta(false); }}
            style={{ ...CARD, padding: 12, opacity: inativo ? 0.45 : 1, display: 'flex', gap: 10, alignItems: 'center', width: '100%', textAlign: 'left', cursor: 'pointer', color: '#fff' }}
          >
            <PlayerAvatar nome={nomeExibicao(m)} avatarUrl={m.avatar_url} userId={m.user_id} avatarGenerico={m.avatar_generico} />
            <span style={{ flex: 1, minWidth: 0, display: 'grid', gap: 4 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <span style={{ fontWeight: 700 }}>{nomeExibicao(m)}</span>
                {m.role === 'admin' ? <span style={{ fontSize: 10, fontWeight: 800, color: '#b69cff', border: '1px solid var(--purple)', borderRadius: 999, padding: '2px 6px' }}>ADMIN</span> : null}
                {m.goleiro ? <span style={{ fontSize: 10, fontWeight: 800, color: '#d4a017', border: '1px solid rgba(212,160,23,0.6)', borderRadius: 999, padding: '2px 6px' }}>GOL</span> : null}
                {m.ausente_proximo ? <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--danger)', border: '1px solid var(--danger)', background: 'rgba(248,113,113,0.12)', borderRadius: 999, padding: '2px 6px' }}>Ausente</span> : null}
                {inativo ? <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-dim)', border: '1px solid #444', borderRadius: 999, padding: '2px 6px' }}>Inativo</span> : null}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: 'var(--text-dim)' }}>
                <span style={{ fontWeight: 800, color: m.nota_media == null ? 'var(--text-dim)' : m.nota_media >= 7 ? '#d4a017' : '#fff' }}>{m.nota_media == null ? SEM_NOTA : `nota ${formatarNota(m.nota_media)}`}</span>
                <span style={{ display: 'inline-flex', gap: 4 }} aria-hidden>
                  {Array.from({ length: 5 }).map((_, idx) => {
                    const p = (m.presencas_recentes || [])[idx];
                    return <span key={idx} style={{ width: 8, height: 8, borderRadius: '50%', background: !p ? 'transparent' : p.presente ? '#10b981' : '#ef4444', border: p ? 'none' : '1px solid #444', boxSizing: 'border-box' }} />;
                  })}
                </span>
                {m.taxa_presenca ? <span style={{ fontWeight: 700 }}>{m.taxa_presenca}</span> : null}
              </span>
            </span>
            <ChevronRight size={16} style={{ color: 'var(--text-dim)', flexShrink: 0 }} />
          </button>
        );
      })}

      {/* O painel do membro (folha de baixo): tudo o que o admin faz com ele, num toque. Portal para o body: fixed dentro do
          [data-page] animado não confia no viewport no WebKit do iPhone (ver LoadingFutty.jsx).
          overflow hidden + overscroll-behavior contain no véu (sem isso, um arrasto nele encadeia para o body por
          trás, no WebKit — ao fechar a folha, o body fica rolado numa posição que não bate com o conteúdo, "dois terços no topo em
          preto"); o mesmo contain na folha, que já rola por si (overflowY: auto). */}
      {aberto
        ? createPortal(
            <div role="presentation" onClick={() => setAbertoId(null)} style={{ position: 'fixed', inset: 0, zIndex: 120, background: 'rgba(0,0,0,0.72)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', overflow: 'hidden', overscrollBehavior: 'contain' }}>
              <div role="dialog" aria-modal="true" aria-label={nomeExibicao(aberto)} data-painel-membro onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: 560, background: '#0a0a0a', borderTopLeftRadius: 18, borderTopRightRadius: 18, borderTop: '1px solid #1a1a1a', padding: '10px 16px calc(16px + env(safe-area-inset-bottom))', maxHeight: '86vh', overflowY: 'auto', overscrollBehavior: 'contain', boxSizing: 'border-box' }}>
                <div style={{ width: 40, height: 4, borderRadius: 999, background: '#333', margin: '6px auto 12px' }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <PlayerAvatar nome={nomeExibicao(aberto)} avatarUrl={aberto.avatar_url} userId={aberto.user_id} avatarGenerico={aberto.avatar_generico} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 800, color: '#fff' }}>{nomeExibicao(aberto)}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{aberto.email}</div>
                  </div>
                </div>

                {/* Goleiro ou linha, mais nada — o MESMO campo do card do próprio jogador. */}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 14 }}>
                  <button type="button" aria-pressed={!!aberto.goleiro} onClick={() => setGoleiro(aberto, !aberto.goleiro)} style={pilula(!!aberto.goleiro, '#d4a017')}>Goleiro</button>
                  {aberto.goleiro ? null : <span style={{ fontSize: 11, color: 'var(--text-dim)', alignSelf: 'center' }}>{LABEL_LINHA}</span>}
                  <button type="button" aria-pressed={!!aberto.pode_postar} onClick={() => togglePostar(aberto)} style={pilula(!!aberto.pode_postar)}>Pode postar</button>
                  <button type="button" aria-pressed={aberto.visivel_ranking !== false} onClick={() => toggleRanking(aberto)} style={pilula(aberto.visivel_ranking !== false)}>No ranking</button>
                </div>
                {aberto.user_id !== meId && aberto.visivel_ranking === false ? (
                  <input
                    type="text"
                    value={aberto.nota_interna || ''}
                    onChange={(e) => setNotaLocal(aberto, e.target.value.slice(0, 200))}
                    onBlur={() => saveNota(aberto)}
                    placeholder="Razão (só você vê)…"
                    style={{ marginTop: 10, width: '100%', boxSizing: 'border-box', padding: '8px 10px', borderRadius: 8, border: '1px solid #1a1a1a', background: '#0c0c0c', color: '#fff', fontSize: 16 }}
                  />
                ) : null}

                {aberto.user_id !== meId ? (
                  <div style={{ marginTop: 12 }}>
                    <button type="button" style={acao()} onClick={() => setMensagemAberta((v) => !v)}><MessageSquare size={16} /> Mandar mensagem</button>
                    {mensagemAberta ? <FormMensagem slug={slug} membro={aberto} showToast={showToast} onClose={() => setMensagemAberta(false)} /> : null}
                    <button type="button" style={acao()} onClick={() => (aberto.ativo === false ? setAtivo(aberto, true) : setConfirmacao({ tipo: 'inativar', membro: aberto }))}>
                      {aberto.ativo === false ? <><UserCheck size={16} /> Reativar</> : <><UserX size={16} /> Marcar como inativo</>}
                    </button>
                    <button type="button" style={acao()} onClick={() => setConfirmacao({ tipo: aberto.role === 'member' ? 'promover' : 'despromover', membro: aberto })}>
                      {aberto.role === 'member' ? <><ShieldCheck size={16} /> Tornar admin</> : <><ShieldOff size={16} /> Tirar de admin</>}
                    </button>
                    <button type="button" style={acao(true)} onClick={() => setConfirmacao({ tipo: 'zerar-votos', membro: aberto })}><RotateCcw size={16} /> Apagar as notas dele</button>
                    <button type="button" style={acao(true)} onClick={() => setConfirmacao({ tipo: 'remover', membro: aberto })}><UserMinus size={16} /> Remover do time</button>
                  </div>
                ) : null}
              </div>
            </div>,
            document.body
          )
        : null}

      {confirmacao ? (
        <ConfirmModal
          texto={
            confirmacao.tipo === 'remover'
              ? `Remover ${confirmacao.membro.nome_jogador || confirmacao.membro.nome} do time?`
              : confirmacao.tipo === 'promover'
                ? `Tornar ${confirmacao.membro.nome_jogador || confirmacao.membro.nome} admin? Admin organiza o time; a posição em campo não muda.`
                : confirmacao.tipo === 'zerar-votos'
                  ? `Apagar as notas que ${confirmacao.membro.nome_jogador || confirmacao.membro.nome} recebeu? Fica sem nota até receber votos de novo.`
                  : confirmacao.tipo === 'inativar'
                    ? `Marcar ${confirmacao.membro.nome_jogador || confirmacao.membro.nome} como inativo? Sai do sorteio e do ranking, mas o histórico fica.`
                    : `Tirar ${confirmacao.membro.nome_jogador || confirmacao.membro.nome} de admin?`
          }
          perigo={confirmacao.tipo === 'remover' || confirmacao.tipo === 'zerar-votos'}
          confirmarLabel={confirmacao.tipo === 'remover' ? 'Remover' : confirmacao.tipo === 'zerar-votos' ? 'Apagar' : confirmacao.tipo === 'inativar' ? 'Marcar inativo' : 'Confirmar'}
          onConfirm={() => {
            const { tipo, membro } = confirmacao;
            setConfirmacao(null);
            if (tipo === 'remover') { setAbertoId(null); remover(membro); } else if (tipo === 'zerar-votos') zerarVotos(membro);
            else if (tipo === 'inativar') setAtivo(membro, false);
            else mudarRole(membro, tipo === 'promover' ? 'admin' : 'member');
          }}
          onCancel={() => setConfirmacao(null)}
        />
      ) : null}
    </div>
  );
}

export { TabMembros };
