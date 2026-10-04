// Futty v2.0 — O resultado de um jogo pelo lado do que o time CONTA: campeão, artilheiro, destaque e rodada de cerveja.
// Rodada 29S, bloco B: saiu de dentro do AdminPanel.jsx (era o ResultadoModal de Ajustes → Jogos, que continua igual para quem o usa) para ser
// reaproveitado no passo "Como terminou?" do Jogo passado. Dois modos:
//   · `salvar` (omissão): o modal de sempre — carrega o jogo, pré-preenche, e "Salvar resultado" grava em PATCH /api/feed/games/:id/resultado.
//   · `devolver`: sem janela, sem pedido, sem foto e sem rodada de cerveja (ficam para Ajustes → Jogos). As seções aparecem no lugar, com os
//     títulos do time ("Artilheiro do dia", "Destaque do dia") e, a cada toque, devolvem o que foi preenchido (`aoMudar`). Quem usa grava depois.
// O corpo do PATCH e o "há prêmio?" são de utils/resultadoDoJogo.js: um só, para os dois modos.
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { apiFetch } from '../lib/api';
import { formatDateTime } from '../utils/format';
import { celebrarCerveja } from '../hooks/useConfetti';
import { corpoDosPremios, PREMIOS_VAZIOS } from '../utils/resultadoDoJogo';
import { inputStyle, lbl, secLbl } from './camposDoAdmin';
import { ARTILHEIRO, DESTAQUE } from './golsEPremios';
import LoadingFutty from './LoadingFutty';
import UploadComCrop from './UploadComCrop';

function Seccao({ titulo, ligado, onToggle, children }) {
  return (
    <div style={{ display: 'grid', gap: 8, borderTop: '1px solid #222', paddingTop: 12 }}>
      <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
        <span style={secLbl}>{titulo}</span>
        <input type="checkbox" checked={ligado} onChange={(e) => onToggle(e.target.checked)} style={{ width: 18, height: 18, accentColor: '#8b5cf6' }} />
      </label>
      {ligado ? children : null}
    </div>
  );
}

function SelectJogador({ value, onChange, confirmados }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} style={inputStyle}>
      <option value="">Escolher jogador</option>
      {confirmados.map((p) => (
        <option key={p.user_id} value={p.user_id}>{p.nome}</option>
      ))}
    </select>
  );
}

/**
 * As seções (campeão, artilheiro, destaque, rodada), controladas: `valor` é o objeto de PREMIOS_VAZIOS e `onChange(novo)` o devolve inteiro.
 * `devolver` troca os títulos para os do dia, esconde fotos e rodada de cerveja e deixa tocar de novo no campeão para desfazer.
 */
function SeccoesDoResultado({ valor, onChange, times, confirmados, premios, devolver, comCampeao }) {
  const set = (parcial) => onChange({ ...valor, ...parcial });
  return (
    <>
      {/* 1. CAMPEÃO */}
      {comCampeao ? (
        <div style={{ display: 'grid', gap: 8 }} data-campeao>
          {devolver ? <div className="section-title" style={{ margin: '4px 0 0' }}>Quem foi o campeão?</div> : <span style={secLbl}>Campeão</span>}
          {times.length === 0 ? (
            <p className="muted" style={{ fontSize: 12 }}>Este jogo não tem times sorteados.</p>
          ) : (
            times.map((t, i) => (
              <button
                key={i}
                type="button"
                data-campeao-time={i}
                aria-pressed={valor.campeaoIdx === i}
                onClick={() => set({ campeaoIdx: devolver && valor.campeaoIdx === i ? null : i })}
                style={{ textAlign: 'left', padding: 10, borderRadius: 10, cursor: 'pointer', border: `1px solid ${valor.campeaoIdx === i ? 'var(--neon)' : '#222'}`, background: valor.campeaoIdx === i ? 'rgba(139,92,246,0.1)' : 'transparent', color: '#fff' }}
              >
                <div style={{ fontWeight: 700 }}>{t.nome || `Time ${i + 1}`}</div>
                <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>{(t.jogadores || []).map((p) => p.nome).join(' · ')}</div>
              </button>
            ))
          )}
          {!devolver ? <UploadComCrop onUpload={(url) => set({ campeaoFoto: url })} accept="image/*" aspect={4 / 3} label={valor.campeaoFoto ? '✓ Foto do campeão' : 'Foto do campeão'} /> : null}
        </div>
      ) : null}

      {/* 2. ARTILHEIRO */}
      {premios.artilheiro || valor.temArt ? (
        <Seccao titulo={devolver ? ARTILHEIRO.titulo : 'Artilheiro'} ligado={valor.temArt} onToggle={(v) => set({ temArt: v })}>
          <SelectJogador value={valor.artId} onChange={(v) => set({ artId: v })} confirmados={confirmados} />
          <label style={{ display: 'grid', gap: 6 }}><span style={lbl}>Nº de gols</span><input type="number" min={1} value={valor.artGols} onChange={(e) => set({ artGols: e.target.value })} style={inputStyle} /></label>
        </Seccao>
      ) : null}

      {/* 3. DESTAQUE */}
      {premios.destaque || valor.temDest ? (
        <Seccao titulo={devolver ? DESTAQUE.titulo : 'Destaque'} ligado={valor.temDest} onToggle={(v) => set({ temDest: v })}>
          <SelectJogador value={valor.destId} onChange={(v) => set({ destId: v })} confirmados={confirmados} />
          <label style={{ display: 'grid', gap: 6 }}><span style={lbl}>Título</span><input value={valor.destTitulo} onChange={(e) => set({ destTitulo: e.target.value.slice(0, 60) })} placeholder="Ex.: Melhor em campo" style={inputStyle} /></label>
        </Seccao>
      ) : null}

      {/* 4. RODADA DE CERVEJA (com foto: fica em Ajustes → Jogos, fora do Jogo passado) */}
      {!devolver ? (
        <Seccao titulo="Rodada de cerveja" ligado={valor.temRodada} onToggle={(v) => set({ temRodada: v })}>
          <SelectJogador value={valor.rodadaId} onChange={(v) => set({ rodadaId: v })} confirmados={confirmados} />
          <UploadComCrop onUpload={(url) => set({ rodadaFoto: url })} accept="image/*" aspect={1} label={valor.rodadaFoto ? '✓ Foto da rodada' : 'Foto da rodada'} />
        </Seccao>
      ) : null}
    </>
  );
}

/**
 * @param {object} props
 * @param {'salvar'|'devolver'} [props.modo]
 * @param {{ id: string, data: string }} [props.jogo] só `salvar`: o jogo (o modal carrega o resto)
 * @param {{ artilheiro: boolean, destaque: boolean }} [props.premios] o que o time deixou ligado
 * @param {Array<{ nome: string, jogadores?: Array<{ nome: string }> }>} [props.times] só `devolver`: os times do jogo que vai ser gravado
 * @param {Array<{ user_id: string, nome: string }>} [props.confirmados] só `devolver`: quem jogou (e pode ser artilheiro ou destaque)
 * @param {boolean} [props.comCampeao] só `devolver`: mostrar "Quem foi o campeão?" (3 ou 4 times; com 2 times a pergunta é "Quem ganhou?")
 * @param {object} [props.valor] só `devolver`: o que já foi preenchido (PREMIOS_VAZIOS)
 * @param {(valor: object) => void} [props.aoMudar] só `devolver`
 */
export default function ResultadoModal({ modo = 'salvar', jogo, fuso, cidade = null, premios = { artilheiro: true, destaque: true }, onClose, onSaved, showToast, times: timesDoPasso = [], confirmados: confirmadosDoPasso = [], comCampeao = true, valor: valorDoPasso = null, aoMudar = null }) {
  const devolver = modo === 'devolver';
  const [detail, setDetail] = useState(null);
  const [valorProprio, setValorProprio] = useState(PREMIOS_VAZIOS);
  const [saving, setSaving] = useState(false);
  const valor = devolver ? (valorDoPasso || PREMIOS_VAZIOS) : valorProprio;
  const mudar = devolver ? (novo) => aoMudar?.(novo) : setValorProprio;

  // Carrega o detalhe do jogo e pré-preenche (edição de resultado existente). Só `salvar`: no `devolver` o jogo ainda não existe.
  useEffect(() => {
    if (devolver) return undefined;
    let ativo = true;
    apiFetch(`/api/games/${jogo.id}`)
      .then((d) => {
        if (!ativo) return;
        setDetail(d);
        const g = d.game || {};
        const preenchido = { ...PREMIOS_VAZIOS };
        if (g.campeao_time_index !== null && g.campeao_time_index !== undefined) preenchido.campeaoIdx = g.campeao_time_index;
        if (g.campeao_foto_url) preenchido.campeaoFoto = g.campeao_foto_url;
        if (g.artilheiro_user_id) {
          preenchido.temArt = true;
          preenchido.artId = g.artilheiro_user_id;
          preenchido.artGols = g.artilheiro_gols || 1;
        }
        if (g.destaque_user_id) {
          preenchido.temDest = true;
          preenchido.destId = g.destaque_user_id;
          preenchido.destTitulo = g.destaque_titulo || '';
        }
        if (g.rodada_user_id) {
          preenchido.temRodada = true;
          preenchido.rodadaId = g.rodada_user_id;
          if (g.rodada_foto_url) preenchido.rodadaFoto = g.rodada_foto_url;
        }
        setValorProprio(preenchido);
      })
      .catch((e) => ativo && showToast(e.message, 'error'));
    return () => {
      ativo = false;
    };
  }, [devolver, jogo?.id, showToast]);

  const times = devolver ? timesDoPasso : detail?.game?.times_resultado?.times || [];
  const confirmados = devolver ? confirmadosDoPasso : (detail?.players || []).filter((p) => p.confirmado);

  async function guardar() {
    if (saving || valor.campeaoIdx === null) return;
    setSaving(true);
    try {
      const res = await apiFetch(`/api/feed/games/${jogo.id}/resultado`, { method: 'PATCH', body: JSON.stringify(corpoDosPremios(valor)) });
      if (res?.game?.rodada_user_id) celebrarCerveja();
      onSaved(jogo.id);
    } catch (e) {
      showToast(e.message, 'error');
      setSaving(false);
    }
  }

  if (devolver) {
    return (
      <div style={{ display: 'grid', gap: 16 }} data-resultado-modal="devolver">
        <SeccoesDoResultado valor={valor} onChange={mudar} times={times} confirmados={confirmados} premios={premios} devolver comCampeao={comCampeao} />
      </div>
    );
  }

  return createPortal(
    <div className="modal-overlay" role="presentation" onClick={() => !saving && onClose()}>
      <div className="modal-card" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 460 }}>
        <div className="modal-card__inner" style={{ textAlign: 'left', display: 'grid', gap: 16, maxHeight: '82vh', overflowY: 'auto' }}>
          <h2 style={{ fontSize: 16, fontWeight: 800, textAlign: 'center', margin: 0 }}>Resultado: {formatDateTime(jogo.data, fuso, { cidade })}</h2>

          {!detail ? (
            <LoadingFutty />
          ) : (
            <>
              <SeccoesDoResultado valor={valor} onChange={mudar} times={times} confirmados={confirmados} premios={premios} devolver={false} comCampeao />

              <button type="button" className="btn btn--primary" style={{ width: '100%' }} disabled={saving || valor.campeaoIdx === null} onClick={guardar}>
                {saving ? 'Salvando…' : 'Salvar resultado'}
              </button>
              {valor.campeaoIdx === null ? <div style={{ fontSize: 11, color: 'var(--text-dim)', textAlign: 'center' }}>Escolha o time campeão para salvar.</div> : null}
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
