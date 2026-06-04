// Futty v2.0 — Slot machine do sorteio.
// Mostra "ruído" (avatares genéricos + iniciais dos confirmados) a rolar e, no
// fim, revela os times com avatar colorido na cor do time, nome e badges GR/C.
import { useEffect, useRef, useState } from 'react';
import { apiFetch } from '../lib/api';
import { COLORS } from '../styles/theme';
import { initials } from '../utils/teamColors';

// Sons. Existem em frontend/public/sons/. O try/catch garante que, se faltarem,
// o componente continua a funcionar.
// (Pedro: caso faltem, copiar de C:\Users\phfer\Desktop\FUT\FUTTY\frontend\public\sons\)
const SOUND_ROLL = '/sons/slot-machine.mp3';
const SOUND_DONE = '/sons/sorteio-finalizado.mp3';

// Cor de cada time por índice (verde, azul, vermelho, preto e repete).
const CORES_TIME = ['verde', 'azul', 'vermelho', 'preto'];
const corTime = (i) => CORES_TIME[i % CORES_TIME.length];
const corHex = { verde: COLORS.neon, azul: '#3b82f6', vermelho: COLORS.error, preto: '#1c1c20' };

const ROLL_MS = 2600; // duração da rolagem
const TICK_MS = 90; // intervalo de troca dos avatares

// Escolhe o próximo avatar do pool evitando repetir o mesmo >2x seguidas.
function escolher(pool, ultimos) {
  if (!pool.length) return null;
  let cand = pool[Math.floor(Math.random() * pool.length)];
  if (ultimos.length >= 2 && ultimos[0] === ultimos[1]) {
    let tentativas = 0;
    while (cand === ultimos[0] && tentativas < 8) {
      cand = pool[Math.floor(Math.random() * pool.length)];
      tentativas += 1;
    }
  }
  return cand;
}

export default function SorteioSlotMachine({ resultado, confirmados = [], onClose }) {
  const [phase, setPhase] = useState('rolling'); // 'rolling' | 'done'
  const [cells, setCells] = useState(['', '', '', '', '']);
  const poolRef = useRef([]);
  const histRef = useRef([[], [], [], [], []]);
  const audioRollRef = useRef(null);
  const audioDoneRef = useRef(null);

  // Carrega o pool de ruído: avatares genéricos + iniciais dos confirmados.
  useEffect(() => {
    let active = true;
    apiFetch('/api/avatares/genericos/disponiveis')
      .then((d) => {
        if (!active) return;
        const genericos = (d.items || []).map((n) => ({
          type: 'img',
          url: `/avatares/genericos/${encodeURIComponent(n)}`,
        }));
        const jogadores = confirmados.map((p) => ({ type: 'ini', nome: p.nome }));
        poolRef.current = [...genericos, ...jogadores];
      })
      .catch(() => {
        poolRef.current = confirmados.map((p) => ({ type: 'ini', nome: p.nome }));
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sons + temporizadores da rolagem.
  useEffect(() => {
    try {
      audioRollRef.current = new Audio(SOUND_ROLL);
      audioRollRef.current.loop = true;
      audioRollRef.current.volume = 0.5;
      audioRollRef.current.play().catch(() => {});
    } catch {
      /* sem som */
    }

    const tick = setInterval(() => {
      const pool = poolRef.current;
      if (!pool.length) return;
      setCells((prev) =>
        prev.map((_, i) => {
          const hist = histRef.current[i];
          const escolhido = escolher(pool, hist);
          hist.unshift(escolhido);
          if (hist.length > 3) hist.pop();
          return escolhido;
        })
      );
    }, TICK_MS);

    const fim = setTimeout(() => {
      clearInterval(tick);
      try {
        if (audioRollRef.current) audioRollRef.current.pause();
        audioDoneRef.current = new Audio(SOUND_DONE);
        audioDoneRef.current.volume = 0.6;
        audioDoneRef.current.play().catch(() => {});
      } catch {
        /* sem som */
      }
      setPhase('done');
    }, ROLL_MS);

    return () => {
      clearInterval(tick);
      clearTimeout(fim);
      try {
        if (audioRollRef.current) audioRollRef.current.pause();
      } catch {
        /* ignore */
      }
    };
  }, []);

  const times = resultado?.times || [];
  const reservas = resultado?.reservas || [];

  // Renderiza um avatar de ruído (imagem genérica ou iniciais).
  function renderRuido(cell, i) {
    return (
      <div className="slot-cell" key={i}>
        {cell?.type === 'img' ? (
          <img src={cell.url} alt="" onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }} />
        ) : (
          <span className="slot-cell__ini">{initials(cell?.nome) || '?'}</span>
        )}
      </div>
    );
  }

  // Renderiza a carta final de um jogador (cor do time, nome, badges).
  function renderJogador(p, cor) {
    return (
      <div className="slot-pcard" key={p.user_id} style={{ background: corHex[cor] }}>
        <span className="slot-pcard__ini">{initials(p.nome) || '?'}</span>
        <div className="slot-pcard__badges">
          {p.goleiro && <span className="slot-badge slot-badge--gr">GR</span>}
          {p.cabeca_chave && <span className="slot-badge slot-badge--c">C</span>}
        </div>
        <div className="slot-pcard__name">{p.nome}</div>
      </div>
    );
  }

  return (
    <div className="slot-overlay" role="dialog" aria-modal="true">
      <div className="slot-modal">
        {phase === 'rolling' ? (
          <>
            <div className="slot-title">A sortear os times…</div>
            <div className="slot-reels">{cells.map((c, i) => renderRuido(c, i))}</div>
          </>
        ) : (
          <>
            <div className="slot-title">Times sorteados!</div>
            <div className="slot-result">
              {times.map((t, i) => {
                const cor = corTime(i);
                return (
                  <div className="slot-team" key={i}>
                    <div className="slot-team__head" style={{ color: corHex[cor] }}>
                      {t.nome} <span className="muted">★ {t.rating_medio}</span>
                    </div>
                    <div className="slot-team__cards">
                      {t.jogadores.map((p) => renderJogador(p, cor))}
                    </div>
                  </div>
                );
              })}
              {reservas.length > 0 && (
                <div className="slot-team">
                  <div className="slot-team__head muted">Reservas</div>
                  <div className="slot-team__cards">
                    {reservas.map((p, idx) => (
                      <div className="slot-pcard slot-pcard--reserva" key={p.user_id}>
                        <span className="slot-pcard__ini">{initials(p.nome) || '?'}</span>
                        <div className="slot-pcard__name">
                          {p.nome}
                          <span className="muted"> · R{idx + 1}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <button type="button" className="btn btn--primary" style={{ marginTop: 16 }} onClick={onClose}>
              Concluir
            </button>
          </>
        )}
      </div>
    </div>
  );
}
