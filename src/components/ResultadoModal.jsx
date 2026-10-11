// Futty v2.0 — Ajustes → Jogos → "Lançar resultado" / "Editar resultado": a janela que abre o MESMO editor da tela do jogo
// (components/ResultadoEditor.jsx), para lançar ou corrigir. Aqui só vive a janela: carrega o jogo (GET /api/games/:id) e entrega ao editor o
// que ele precisa — o jogo salvo, os gols, os times, quem pode ser artilheiro ou destaque.
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { apiFetch } from '../lib/api';
import { formatDateTime } from '../utils/format';
import { jogadoresDosTimes, nomesDosTimes } from '../utils/resultadoDoJogo';
import LoadingFutty from './LoadingFutty';
import ResultadoEditor from './ResultadoEditor';

/**
 * @param {object} props
 * @param {{ id: string, data: string }} props.jogo o jogo (a janela carrega o resto)
 * @param {{ gols: boolean, artilheiro: boolean, destaque: boolean }} [props.premios] o que o time deixou ligado
 * @param {() => void} props.onClose
 * @param {(gameId: string) => void} props.onSaved
 * @param {(mensagem: string, tipo?: string) => void} props.showToast
 */
export default function ResultadoModal({ jogo, fuso, cidade = null, premios = { gols: true, artilheiro: true, destaque: true }, onClose, onSaved, showToast }) {
  const [detail, setDetail] = useState(null);

  useEffect(() => {
    let ativo = true;
    apiFetch(`/api/games/${jogo.id}`)
      .then((d) => { if (ativo) setDetail(d); })
      .catch((e) => ativo && showToast(e.message, 'error'));
    return () => {
      ativo = false;
    };
  }, [jogo?.id, showToast]);

  const game = detail?.game;
  const nomes = nomesDosTimes(game?.times_resultado);
  const times = (game?.times_resultado?.times || []).map((t, i) => ({ nome: nomes[i], jogadores: t.jogadores || [] }));

  return createPortal(
    <div className="modal-overlay" role="presentation" onClick={onClose}>
      <div className="modal-card" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 460 }}>
        <div className="modal-card__inner" style={{ textAlign: 'left', display: 'grid', gap: 16, maxHeight: '82vh', overflowY: 'auto' }}>
          <h2 style={{ fontSize: 16, fontWeight: 800, textAlign: 'center', margin: 0 }}>Resultado: {formatDateTime(jogo.data, fuso, { cidade })}</h2>

          {!detail ? (
            <LoadingFutty />
          ) : (
            <ResultadoEditor
              gameId={jogo.id}
              game={game}
              gols={detail.gols || []}
              times={times}
              jogadores={jogadoresDosTimes(game.times_resultado)}
              confirmados={(detail.players || []).filter((p) => p.confirmado)}
              flags={premios}
              // O AdminPanel avisa "Resultado salvo. Aparece na Resenha." ao fechar a janela: aqui só os erros.
              showToast={(mensagem, tipo) => { if (tipo === 'error') showToast(mensagem, 'error'); }}
              onSaved={() => onSaved(jogo.id)}
            />
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
