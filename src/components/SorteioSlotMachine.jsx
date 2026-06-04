// Futty v2.0 — Slot machine do sorteio.
// Mostra "ruído" (avatares temáticos + confirmados) a rolar e revela o resultado.
// Avatares resolvidos SEMPRE por avatarParaCor() (fonte única).
import { useEffect, useMemo, useRef, useState } from 'react';
import { avatarParaCor, nomeJogador, iniciaisNome } from '../utils/avatar.js';
import { gerarImagemSorteio } from '../utils/sorteioCanvas.js';

// ─── 1. CONSTANTES ────────────────────────────────────────────────────────────
const COR_NEON = '#00e5a0';
const COR_ROXO = '#7c3aed';
const COR_FUNDO = '#050810';
const SOM_ROLAGEM = '/sons/slot-machine.mp3';
const SOM_RESULTADO = '/sons/sorteio-finalizado.mp3';

// Avatares genéricos temáticos (ruído durante a rolagem).
const AVATARES_TEMATICOS = [
  'Astronauta', 'ET', 'Gladiador', 'Jacaré', 'Leão', 'Lesma',
  'Ninja', 'Onça', 'Peixe boi', 'Petisco', 'Preguiça',
  'Robot Junk', 'Robot New', 'Tatu', 'Tigre', 'Tucano',
  'bola', 'carta_fut', 'chuteira',
];

// Fundo colorido por cor do time (quando não há foto — nunca animal).
const COR_FILL = { verde: '#0c5', azul: '#3b82f6', vermelho: '#ef4444', preto: '#1c1c20' };

// ─── 2. FUNÇÕES UTILITÁRIAS PURAS ───────────────────────────────────────────────

// ≤2 palavras → nome completo; ≥3 → primeira + última.
function nomeParaSlot(nomeCompleto) {
  const n = String(nomeCompleto ?? '').trim();
  if (!n) return '';
  const parts = n.split(/\s+/).filter(Boolean);
  return parts.length <= 2 ? n : `${parts[0]} ${parts[parts.length - 1]}`;
}

// Embaralha (Fisher-Yates).
function embaralhar(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Gera o pool de ruído: temáticos + avatares dos jogadores confirmados neste jogo.
// Nunca inclui jogadores de outras equipas. Sem o mesmo avatar >2x consecutivos.
function gerarPoolRuido(jogadoresConfirmados) {
  const tematicos = AVATARES_TEMATICOS.map((n) => `/avatares/genericos/${n}.png`);
  const dosJogadores = (jogadoresConfirmados || [])
    .map((p) => avatarParaCor(p, p.cor_time || 'verde'))
    .filter(Boolean);
  let pool = embaralhar([...tematicos, ...dosJogadores]);
  if (pool.length < 6) pool = pool.concat(tematicos); // garante variedade mínima
  // Evita 3 iguais seguidos.
  const out = [];
  for (const url of pool) {
    if (out.length >= 2 && out[out.length - 1] === url && out[out.length - 2] === url) {
      const alt = tematicos[Math.floor(Math.random() * tematicos.length)];
      out.push(alt);
    } else {
      out.push(url);
    }
  }
  return out;
}

// Durações por coluna: uma é sempre 6000ms; as outras entre 2000-5700ms.
function gerarDuracoesMs(n) {
  const dur = [];
  for (let i = 0; i < n; i += 1) dur.push(2000 + Math.floor(Math.random() * 3700));
  if (n > 0) dur[Math.floor(Math.random() * n)] = 6000;
  return dur;
}

// Toca um som com try/catch (nunca quebra se o ficheiro não existir).
function tocarSom(audio) {
  try {
    if (audio) audio.play().catch(() => {});
  } catch {
    /* sem som */
  }
}

// ─── 3. SlotCell (carta individual, proporção 2:3) ──────────────────────────────
function SlotCell({ corTime, winner, noiseUrls, durationMs, skipAll, onStopped }) {
  const [cur, setCur] = useState(noiseUrls[0] || null);
  const [done, setDone] = useState(false);
  const [imgErro, setImgErro] = useState(false);
  const paradoRef = useRef(false);

  useEffect(() => {
    let timer;
    let cancelado = false;
    const parar = () => {
      if (paradoRef.current) return;
      paradoRef.current = true;
      setDone(true);
      onStopped();
    };

    if (skipAll) {
      parar();
      return () => {};
    }

    const inicio = performance.now();
    const step = () => {
      if (cancelado) return;
      const t = Math.min(1, (performance.now() - inicio) / durationMs);
      setCur(noiseUrls[Math.floor(Math.random() * noiseUrls.length)]);
      if (t >= 1) {
        parar();
        return;
      }
      // Ease-out: o intervalo cresce (abranda visualmente perto do fim).
      timer = window.setTimeout(step, 40 + 360 * t * t);
    };
    step();
    return () => {
      cancelado = true;
      window.clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skipAll]);

  const cellStyle = {
    position: 'relative',
    flex: '1 1 0',
    minWidth: 0,
    maxWidth: 96,
    aspectRatio: '2 / 3',
    borderRadius: 10,
    overflow: 'hidden',
    background: '#0c0f18',
    border: '1px solid #222',
  };

  // Avatar final: foto real ou cor sólida + iniciais (nunca animal).
  const urlFinal = winner ? avatarParaCor(winner, corTime) : '';
  const ehFoto = urlFinal && !urlFinal.includes('/avatares/genericos/');
  const goleiro = winner?.goleiro === true || winner?.is_goalkeeper === true;
  const cabeca = winner?.cabeca_chave === true || winner?.is_key_player === true;

  return (
    <div style={cellStyle}>
      {!done ? (
        cur ? (
          <img
            src={cur}
            alt=""
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            onError={(e) => {
              e.currentTarget.style.visibility = 'hidden';
            }}
          />
        ) : null
      ) : (
        <>
          {ehFoto && !imgErro ? (
            <img
              src={urlFinal}
              alt={nomeJogador(winner)}
              style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top center' }}
              onError={() => setImgErro(true)}
            />
          ) : (
            <div
              style={{
                width: '100%',
                height: '100%',
                background: COR_FILL[corTime] || '#1c1c20',
                display: 'grid',
                placeItems: 'center',
                fontWeight: 800,
                fontSize: 22,
                color: '#fff',
              }}
            >
              {iniciaisNome(nomeJogador(winner))}
            </div>
          )}

          {/* Badges */}
          <div style={{ position: 'absolute', top: 4, left: 4, display: 'flex', gap: 3 }}>
            {goleiro && (
              <span style={{ fontSize: 9, fontWeight: 800, padding: '1px 5px', borderRadius: 5, background: COR_NEON, color: '#04140d' }}>
                GR
              </span>
            )}
            {cabeca && (
              <span style={{ fontSize: 9, fontWeight: 800, padding: '1px 5px', borderRadius: 5, background: COR_ROXO, color: '#fff' }}>
                C
              </span>
            )}
          </div>

          {/* Nome com gradiente escuro */}
          <div
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 0,
              padding: '12px 4px 4px',
              fontSize: 10,
              fontWeight: 700,
              color: '#fff',
              textAlign: 'center',
              background: 'linear-gradient(to top, rgba(0,0,0,0.85), transparent)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {nomeParaSlot(nomeJogador(winner))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── 4. COMPONENTE PRINCIPAL ────────────────────────────────────────────────────
export default function SorteioSlotMachine({ sorteio, meta = {}, reducedMotion = false, onClose }) {
  const times = useMemo(() => (Array.isArray(sorteio?.times) ? sorteio.times : []), [sorteio]);
  const reservas = useMemo(() => (Array.isArray(sorteio?.reservas) ? sorteio.reservas : []), [sorteio]);

  // Todos os jogadores (para o pool de ruído — só os deste jogo).
  const todos = useMemo(() => {
    const arr = [];
    times.forEach((t) => (t.jogadores || []).forEach((p) => arr.push({ ...p, cor_time: t.cor_time })));
    reservas.forEach((p) => arr.push({ ...p, cor_time: 'preto' }));
    return arr;
  }, [times, reservas]);

  // Pool de ruído gerado UMA vez.
  const noiseUrls = useMemo(() => gerarPoolRuido(todos), [todos]);

  // Total de cartas e durações por carta (mapa estável por user_id).
  const totalCartas = todos.length;
  const duracoes = useMemo(() => gerarDuracoesMs(totalCartas), [totalCartas]);
  const duracaoPorId = useMemo(() => {
    const m = new Map();
    todos.forEach((p, i) => m.set(p.user_id, duracoes[i] ?? 3000));
    return m;
  }, [todos, duracoes]);

  const [skipAll, setSkipAll] = useState(reducedMotion);
  const [finalizado, setFinalizado] = useState(false);
  const [aGerar, setAGerar] = useState(false);
  const audioRollRef = useRef(null);
  const paradasRef = useRef(0);
  const finalizadoRef = useRef(false);

  // Sons: rolagem no mount, pausa no unmount.
  useEffect(() => {
    try {
      audioRollRef.current = new Audio(SOM_ROLAGEM);
      audioRollRef.current.loop = true;
      audioRollRef.current.volume = 0.5;
      if (!reducedMotion) tocarSom(audioRollRef.current);
    } catch {
      /* sem som */
    }
    return () => {
      try {
        if (audioRollRef.current) audioRollRef.current.pause();
      } catch {
        /* ignore */
      }
    };
  }, [reducedMotion]);

  // Quando todas as cartas pararem → som final + botões de ação.
  // (Usa refs em vez de um effect, para evitar setState dentro de effect.)
  const aoParar = () => {
    paradasRef.current += 1;
    if (paradasRef.current >= totalCartas && !finalizadoRef.current) {
      finalizadoRef.current = true;
      try {
        if (audioRollRef.current) audioRollRef.current.pause();
      } catch {
        /* ignore */
      }
      try {
        tocarSom(new Audio(SOM_RESULTADO));
      } catch {
        /* ignore */
      }
      setFinalizado(true);
    }
  };

  // ─── 5. Download e partilha ───
  async function handleBaixar() {
    setAGerar(true);
    try {
      const canvas = await gerarImagemSorteio(sorteio, meta);
      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'sorteio-futty.png';
        a.click();
        URL.revokeObjectURL(url);
      }, 'image/png');
    } catch {
      /* ignore */
    } finally {
      setAGerar(false);
    }
  }

  async function handlePartilhar() {
    setAGerar(true);
    try {
      const canvas = await gerarImagemSorteio(sorteio, meta);
      const blob = await new Promise((r) => canvas.toBlob(r, 'image/png'));
      if (!blob) return;
      const file = new File([blob], 'sorteio-futty.png', { type: 'image/png' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: 'Sorteio Futty' });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'sorteio-futty.png';
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch {
      /* cancelado ou sem suporte */
    } finally {
      setAGerar(false);
    }
  }

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: COR_FUNDO,
        color: '#fff',
        display: 'flex',
        flexDirection: 'column',
        overflowY: 'auto',
      }}
    >
      {/* Cabeçalho */}
      <div style={{ padding: '16px 16px 8px', textAlign: 'center', flexShrink: 0 }}>
        <div style={{ fontWeight: 900, fontSize: 20, color: COR_NEON, letterSpacing: '0.16em' }}>FUT</div>
        <div style={{ fontWeight: 800, marginTop: 4 }}>{meta.titulo || 'Sorteio'}</div>
        {meta.dataLabel && <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)' }}>{meta.dataLabel}</div>}
      </div>

      {/* Times */}
      <div style={{ flex: 1, padding: '8px 16px 16px' }}>
        {times.map((t, i) => (
          <div key={i} style={{ marginBottom: 18 }}>
            <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 8, color: COR_FILL[t.cor_time] || COR_NEON }}>
              {t.nome} <span style={{ color: 'rgba(255,255,255,0.5)' }}>★ {t.rating_medio}</span>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {(t.jogadores || []).map((p) => (
                <SlotCell
                  key={p.user_id}
                  corTime={t.cor_time}
                  winner={p}
                  noiseUrls={noiseUrls}
                  durationMs={duracaoPorId.get(p.user_id) ?? 3000}
                  skipAll={skipAll}
                  onStopped={aoParar}
                />
              ))}
            </div>
          </div>
        ))}

        {reservas.length > 0 && (
          <div style={{ marginBottom: 18 }}>
            <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 8, color: 'rgba(255,255,255,0.55)' }}>
              {sorteio?.nome_grupo_reservas || 'RESERVAS'}
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {reservas.map((p) => (
                <SlotCell
                  key={p.user_id}
                  corTime="preto"
                  winner={p}
                  noiseUrls={noiseUrls}
                  durationMs={duracaoPorId.get(p.user_id) ?? 3000}
                  skipAll={skipAll}
                  onStopped={aoParar}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Ações */}
      <div style={{ padding: 16, display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap', flexShrink: 0 }}>
        {!finalizado ? (
          <button type="button" className="btn btn--ghost" onClick={() => setSkipAll(true)}>
            Saltar animação
          </button>
        ) : (
          <>
            <button type="button" className="btn btn--primary" disabled={aGerar} onClick={handleBaixar}>
              {aGerar ? 'A gerar…' : 'Baixar escalação'}
            </button>
            <button type="button" className="btn btn--purple" disabled={aGerar} onClick={handlePartilhar}>
              Partilhar
            </button>
            <button type="button" className="btn btn--ghost" onClick={onClose}>
              Fechar
            </button>
          </>
        )}
      </div>
    </div>
  );
}
