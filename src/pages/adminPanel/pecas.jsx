// Futty v2.0 — As peças que as abas do admin dividem: o rabicho da hora, o interruptor, o rótulo de seção, o modal de confirmação,
// o cartão de número e o aviso ao time.

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { apiFetch } from '../../lib/api';
import { rabichoDoFuso } from '../../utils/dataHora';
import { plural } from '../../utils/plural';
import { inputStyle, lbl } from '../../components/camposDoAdmin';
import { CARD, rotuloECampo, textoDeApoio } from './comum';

// O rabicho embaixo de um campo de hora: "horário de São Paulo" só para quem está noutro relógio que o do time; vazio
// para quem está no mesmo (quase todo mundo). O rótulo do campo é sempre "Hora do jogo" ou "Hora" — nunca "fuso".
function RabichoDaHora({ fuso, cidade }) {
  const r = rabichoDoFuso(new Date(), fuso, { cidade });
  return r ? <span data-rabicho-hora style={{ fontSize: 11, color: 'var(--text-dim)' }}>{r}</span> : null;
}

// O interruptor da casa (o mesmo desenho de "Mostrar gols").
function Interruptor({ ligado, aoTrocar, rotulo, apoio = null }) {
  return (
    <button type="button" role="switch" aria-checked={ligado} aria-label={rotulo} onClick={() => aoTrocar(!ligado)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '10px 12px', borderRadius: 8, cursor: 'pointer', border: `1px solid ${ligado ? 'var(--neon)' : '#1a1a1a'}`, background: ligado ? 'rgba(139,92,246,0.08)' : '#080808', color: '#fff', textAlign: 'left' }}>
      <span style={{ fontSize: 13, fontWeight: 700 }}>
        {rotulo}
        {apoio ? <span style={{ display: 'block', fontSize: 12, fontWeight: 400, color: 'var(--text-dim)', marginTop: 2 }}>{apoio}</span> : null}
      </span>
      <span style={{ width: 40, height: 22, borderRadius: 999, background: ligado ? 'var(--neon)' : '#333', position: 'relative', flexShrink: 0, transition: 'background 0.15s' }}>
        <span style={{ position: 'absolute', top: 2, left: ligado ? 20 : 2, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'left 0.15s' }} />
      </span>
    </button>
  );
}

// Rótulo de seção da aba (a régua dos SecLabel da página do time).
function Secao({ titulo, id, children, perigo = false }) {
  return (
    <section id={id} style={{ display: 'grid', gap: 10 }}>
      <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 12, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: perigo ? '#fda4af' : 'rgba(255,255,255,0.5)', marginTop: 8 }}>
        {titulo}
      </div>
      {children}
    </section>
  );
}

// Pequeno modal de confirmação reutilizável. Os três modais desta página vão por
// PORTAL para o body: fixed dentro do [data-page] animado ancora na
// página, não na tela — ver a nota em LoadingFutty.jsx.
function ConfirmModal({ texto, confirmarLabel = 'Confirmar', perigo = false, confirmarDesabilitado = false, onConfirm, onCancel, children = null }) {
  return createPortal(
    <div className="modal-overlay" role="presentation" onClick={onCancel}>
      <div className="modal-card" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <div className="modal-card__inner">
          <p style={{ fontSize: 15, marginBottom: children ? 12 : 16 }}>{texto}</p>
          {children ? <div style={{ marginBottom: 16 }}>{children}</div> : null}
          <button
            type="button"
            className="btn btn--primary"
            style={{ width: '100%', ...(perigo ? { background: 'var(--danger)', color: '#fff' } : {}) }}
            disabled={confirmarDesabilitado}
            onClick={onConfirm}
          >
            {confirmarLabel}
          </button>
          <button type="button" className="btn btn--ghost btn--sm" style={{ width: '100%', marginTop: 10 }} onClick={onCancel}>
            Cancelar
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ─── TAB: DASHBOARD ──────────────────────────────────────────────────────────
function MetricCard({ valor, label, alerta = false }) {
  return (
    <div style={{ ...CARD, padding: 14, textAlign: 'center' }}>
      <div style={{ fontSize: 28, fontWeight: 900, color: alerta ? 'var(--danger)' : '#fff' }}>{valor}</div>
      <div style={{ fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 2 }}>{label}</div>
    </div>
  );
}

// ─── AJUSTES → AVISAR O TIME ─────────────────────────────────────────────────
// "Avisar o time" = push + anúncio na Resenha, num formulário só (pedido do dono). As duas saídas vêm ligadas; dá
// para mandar só uma. O push é o aviso que não se desliga no Perfil (é o admin falando).
function AvisarOTime({ slug, showToast }) {
  const [titulo, setTitulo] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [noCelular, setNoCelular] = useState(true);
  const [naResenha, setNaResenha] = useState(true);
  const [busy, setBusy] = useState(false);
  // O celular mostra até 60 + 200 caracteres; só na Resenha cabe mais.
  const maxTitulo = noCelular ? 60 : 80;
  const maxMensagem = noCelular ? 200 : 500;

  async function enviar() {
    if (busy || !titulo.trim() || !mensagem.trim() || (!noCelular && !naResenha)) return;
    setBusy(true);
    const corpo = JSON.stringify({ titulo: titulo.trim().slice(0, maxTitulo), mensagem: mensagem.trim().slice(0, maxMensagem) });
    const feitos = [];
    try {
      if (naResenha) {
        await apiFetch(`/api/feed/equipas/${slug}/anuncio`, { method: 'POST', body: corpo });
        feitos.push('Anúncio publicado na Resenha');
      }
      if (noCelular) {
        const r = await apiFetch(`/api/push/equipas/${slug}/broadcast`, { method: 'POST', body: corpo });
        feitos.push(`Aviso enviado para ${r.enviadas} ${plural(r.enviadas, 'celular', 'celulares')}`);
      }
      setTitulo('');
      setMensagem('');
      showToast(`${feitos.join('. ')}.`);
    } catch (e) {
      showToast(feitos.length ? `${feitos.join('. ')}, mas: ${e.message}` : e.message, 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ ...CARD, padding: 14, display: 'grid', gap: 12 }} data-avisar-o-time>
      <label style={rotuloECampo}>
        <span style={lbl}>Título <span style={{ color: 'var(--text-dim)' }}>({titulo.length}/{maxTitulo})</span></span>
        <input value={titulo} onChange={(e) => setTitulo(e.target.value.slice(0, maxTitulo))} placeholder="Ex.: Jogo confirmado" style={inputStyle} />
      </label>
      <label style={rotuloECampo}>
        <span style={lbl}>Mensagem <span style={{ color: 'var(--text-dim)' }}>({mensagem.length}/{maxMensagem})</span></span>
        <textarea value={mensagem} onChange={(e) => setMensagem(e.target.value.slice(0, maxMensagem))} rows={3} placeholder="Escreva o aviso para o time…" style={{ ...inputStyle, resize: 'vertical' }} />
      </label>
      <Interruptor ligado={noCelular} aoTrocar={setNoCelular} rotulo="Notificar no celular" />
      <Interruptor ligado={naResenha} aoTrocar={setNaResenha} rotulo="Publicar na Resenha" />
      <span style={textoDeApoio}>Na Resenha o aviso fica fixado como post oficial do time.</span>
      <button type="button" className="btn btn--purple btn--sm" disabled={busy || !titulo.trim() || !mensagem.trim() || (!noCelular && !naResenha)} onClick={enviar}>
        {busy ? 'Enviando…' : 'Avisar o time'}
      </button>
    </div>
  );
}

export { AvisarOTime, ConfirmModal, Interruptor, MetricCard, RabichoDaHora, Secao };
