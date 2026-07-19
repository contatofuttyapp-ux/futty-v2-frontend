// Futty v2.0 — A CERIMÓNIA DO SORTEIO (slot v8 aprovado, com dados REAIS).
// SPEC-SORTEIO é a lei: rolos com os símbolos do utilizador intercalados entre
// MEMBROS DA EQUIPA (§12; trava SEMPRE num jogador), kits da CASA por ordem
// OURO/ROXO/PRATA/BRONZE, travagens quase simultâneas + voos ágeis (v7), grelhas
// inteligentes 3→11 por time (v4), reservas com avatar + nº de ordem, jackpot ROXO
// em cinema (backdrop-blur) com moedas 70/30 e letreiro por segmentos (v8).
// REPLAY EXACTO (§10): toda a aleatoriedade visual sai de mulberry32(seed) — a
// mesma seed (persistida no resultado) reproduz a MESMA cerimónia em qualquer conta.
// Convidados sem app (§11) e quem não tem foto usam a Silhueta v4.
import { useEffect, useRef, useState } from 'react';
import { urlAsset } from '../utils/avatar';
import SilhuetaJogador from './SilhuetaJogador';
import '../styles/app.css';

const RAJ = "'Rajdhani', sans-serif";
const SIMBOLOS = ['/sorteio-assets/bola-ficha.png', '/sorteio-assets/carta-fut.png', '/sorteio-assets/chuteira.png'];
// Kits da casa por ordem de time (§12) — o azul/verde da V1 nunca volta.
// eslint-disable-next-line react-refresh/only-export-components -- constante partilhada com as páginas do sorteio
export const KITS = [
  { n: 'OURO', c: '#d4a017' },
  { n: 'ROXO', c: '#8b5cf6' },
  { n: 'PRATA', c: '#aab4c8' },
  { n: 'BRONZE', c: '#c2652e' },
];
// Grelhas inteligentes (v4): linhas por tamanho — nunca fila única.
const LINHAS = { 1: [1], 2: [2], 3: [3], 4: [2, 2], 5: [3, 2], 6: [3, 3], 7: [4, 3], 8: [4, 4], 9: [3, 3, 3], 10: [4, 3, 3], 11: [4, 4, 3] };
const CEL = 100; // altura da célula do rolo

// O MESMO RNG do backend (utils/sorteio.js) — a seed partilhada é o contrato.
function mulberry32(seed) {
  let a = seed >>> 0;
  return function rng() {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rgba = (hex, a) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`;
};
const kitVars = (k) => ({ '--tc': k.c, '--tcg45': rgba(k.c, 0.45), '--tcg60': rgba(k.c, 0.6) });

// Retrato de um jogador (foto real, ou Silhueta v4 para convidados/sem foto).
function Retrato({ j, corSil }) {
  if (j?.avatar_url) {
    return <img src={urlAsset(j.avatar_url)} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top center' }} />;
  }
  return (
    <span style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}>
      <SilhuetaJogador size="70%" color={corSil || 'rgba(255,255,255,0.55)'} />
    </span>
  );
}

function PlacaNome({ nome, convidado, fs = 9 }) {
  return (
    <span style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(transparent, rgba(0,0,0,0.88))', padding: '9px 2px 3px', textAlign: 'center', fontFamily: RAJ, fontWeight: 800, fontSize: fs, color: '#fff', zIndex: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
      {convidado ? '· ' : ''}{nome}
    </span>
  );
}

// Quadro FRAME B (v5/v8): anel metálico do F + chase no aro + miolo VIDRO.
function QuadroB({ j, kit, w, delayBob = 0 }) {
  return (
    <div className="cer-float" style={{ ...kitVars(kit), width: w, animationDelay: `${delayBob}s`, position: 'relative', aspectRatio: '3/4', clipPath: 'polygon(9% 0,91% 0,100% 6.5%,100% 93.5%,91% 100%,9% 100%,0 93.5%,0 6.5%)', filter: 'drop-shadow(0 0 10px var(--tcg45))' }}>
      <div className="cer-chasebox"><div className="cer-chase" /></div>
      <div className="cer-metal" />
      <div style={{ position: 'absolute', inset: 6, background: 'rgba(255,255,255,0.03)', overflow: 'hidden', clipPath: 'polygon(9% 0,91% 0,100% 6.5%,100% 93.5%,91% 100%,9% 100%,0 93.5%,0 6.5%)' }}>
        <Retrato j={j} corSil={kit.c} />
        <PlacaNome nome={j.nome} convidado={j.convidado} />
      </div>
    </div>
  );
}

export default function CerimoniaSorteio({ resultado, autoStart = true, aoTerminar }) {
  const times = resultado?.times || [];
  const reservas = resultado?.reservas || [];
  const seed = Number.isInteger(resultado?.seed) ? resultado.seed : 1;
  const porTime = times[0]?.jogadores?.length || 0;
  const nRolos = Math.min(porTime || 1, 11);

  // Pool de ruído dos rolos = SÓ participantes desta equipa (§12).
  const pool = times.flatMap((t) => t.jogadores).concat(reservas);

  const [fase, setFase] = useState('pronto'); // pronto | girar | fim
  const [timeAtual, setTimeAtual] = useState(0);
  const [grelha, setGrelha] = useState(() => times.map(() => []));
  const [reservasVis, setReservasVis] = useState(false);
  const [jack, setJack] = useState(false);
  const lockRef = useRef(false); // lock por ref: sobrevive limpo ao double-mount do StrictMode
  const rolosRef = useRef(null);
  const vivo = useRef(true);
  // StrictMode monta→desmonta→monta preservando refs: repor `vivo` no corpo,
  // senão o cleanup do 1º mount mata a cerimónia do 2º.
  useEffect(() => {
    vivo.current = true;
    return () => { vivo.current = false; };
  }, []);

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  // Strips determinísticas: mulberry32(seed + rolo) escolhe o ruído — replay EXACTO.
  function stripDe(rngLocal) {
    const seq = [];
    for (let i = 0; i < 7; i += 1) {
      const j = pool[Math.floor(rngLocal() * pool.length)] || { nome: '?' };
      seq.push({ tipo: 'j', j });
      seq.push({ tipo: 's', src: SIMBOLOS[Math.floor(rngLocal() * SIMBOLOS.length)] });
    }
    return seq;
  }

  async function correr() {
    if (lockRef.current || !times.length) return;
    lockRef.current = true;
    try {
    setGrelha(times.map(() => []));
    setReservasVis(false);
    setJack(false);
    setFase('girar');
    const rng = mulberry32(seed);

    for (let t = 0; t < times.length; t += 1) {
      if (!vivo.current) return;
      setTimeAtual(t);
      const jogs = times[t].jogadores;
      // por "vagas" — blocos de nRolos (porTime>11 nunca acontece com o stepper)
      for (let base = 0; base < jogs.length; base += nRolos) {
        const lote = jogs.slice(base, base + nRolos);
        // prepara strips + alvos — o React monta a janela DEPOIS do setFase('girar'),
        // por isso esperamos o ref (até ~1s) em vez de abortar em silêncio.
        let el = rolosRef.current;
        for (let tent = 0; !el && tent < 20; tent += 1) {
          await sleep(50);
          el = rolosRef.current;
        }
        if (!el || !vivo.current) return;
        el.innerHTML = '';
        el.style.gridTemplateColumns = `repeat(${lote.length},1fr)`;
        const strips = lote.map((alvo, r) => {
          const rngRolo = mulberry32(seed + t * 1000 + base + r + 1);
          const seq = stripDe(rngRolo);
          seq[8] = { tipo: 'j', j: alvo }; // o rolo trava SEMPRE num jogador (§12)
          return seq;
        });
        // render dos rolos
        strips.forEach((seq) => {
          const rolo = document.createElement('div');
          rolo.className = 'cer-rolo';
          rolo.innerHTML = `<div class="cer-strip">${seq.concat(seq).map((c) =>
            c.tipo === 'j'
              ? `<div class="cer-cel">${c.j.avatar_url ? `<img src="${urlAsset(c.j.avatar_url)}">` : '<span class="cer-sil"></span>'}<span class="cer-n">${c.j.nome || ''}</span></div>`
              : `<div class="cer-cel cer-cel--simb"><img src="${c.src}"></div>`
          ).join('')}</div><div class="cer-masc"></div><div class="cer-flash"></div>`;
          el.appendChild(rolo);
        });
        // silhuetas nas células sem foto (React fora do innerHTML → SVG simples inline)
        el.querySelectorAll('.cer-sil').forEach((s) => {
          s.innerHTML = `<svg viewBox="0 0 96 96" fill="none" style="width:64%;height:64%;color:${KITS[t % 4].c}"><g stroke="currentColor" stroke-width="3" stroke-linejoin="miter" stroke-opacity="0.7" fill="currentColor" fill-opacity="0.13"><polygon points="40,12 56,12 64,20 64,36 56,44 40,44 32,36 32,20"/><path d="M14 88 L14 70 L24 58 L40 52 L56 52 L72 58 L82 70 L82 88 Z"/></g></svg>`;
        });
        await sleep(30);
        // arranque simultâneo, travagens quase simultâneas (stagger ~160ms)
        const rolos = [...el.children];
        const travas = rolos.map(async (rolo, r) => {
          const st = rolo.querySelector('.cer-strip');
          rolo.classList.add('gira');
          rolo.style.setProperty('--tc', KITS[t % 4].c);
          rolo.style.setProperty('--tcg60', rgba(KITS[t % 4].c, 0.6));
          st.style.transition = 'none';
          st.style.transform = 'translateY(0)';
          void st.offsetHeight;
          const dur = 750 + r * 160 + Math.floor(rng() * 120);
          st.style.transition = `transform ${dur}ms cubic-bezier(.15,.6,.35,1)`;
          st.style.transform = `translateY(${-(8 * CEL) - 14 * CEL}px)`;
          await sleep(dur);
          rolo.classList.remove('gira');
          rolo.classList.add('clunk', 'won');
          await sleep(240);
          rolo.classList.remove('clunk');
        });
        await Promise.all(travas);
        if (!vivo.current) return;
        // voos ágeis: os quadros entram na grelha do time (staggered)
        for (let r = 0; r < lote.length; r += 1) {
          setGrelha((cur) => cur.map((g, gi) => (gi === t ? [...g, lote[r]] : g)));
          await sleep(90);
        }
        await sleep(200);
      }
    }

    if (reservas.length) {
      setReservasVis(true);
      await sleep(400);
    }
    // JACKPOT ROXO em cinema (v8): letreiro por segmentos + moedas 70/30.
    setJack(true);
    await sleep(2600);
    if (!vivo.current) return;
    setJack(false);
    setFase('fim');
    aoTerminar?.();
    } finally {
      lockRef.current = false;
    }
  }

  useEffect(() => {
    if (autoStart && times.length) correr();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- cerimónia arranca 1x ao montar
  }, []);

  // largura dos quadros pela linha mais cheia (v4)
  const linhas = LINHAS[Math.min(porTime, 11)] || [4];
  const maxCols = Math.max(...linhas);
  const qw = Math.min(80, Math.floor((330 - (maxCols - 1) * 8) / maxCols));

  return (
    <div style={{ position: 'relative' }}>
      {/* a máquina: janela dos rolos (só durante o giro) */}
      {fase === 'girar' ? (
        <div className="cer-maq">
          <div className="cer-luzes">{Array.from({ length: 15 }, (_, i) => <span key={i} className="cer-luz" style={{ animationDelay: `${(i * 0.09).toFixed(2)}s` }} />)}</div>
          <div style={{ fontFamily: RAJ, fontWeight: 800, fontSize: 12, letterSpacing: '0.14em', textTransform: 'uppercase', textAlign: 'center', color: KITS[timeAtual % 4].c, marginBottom: 8 }}>
            a sortear · {times[timeAtual]?.nome || `Time ${timeAtual + 1}`}
          </div>
          <div className="cer-janela">
            <div ref={rolosRef} className="cer-rolos" />
            <div className="cer-payline" />
          </div>
        </div>
      ) : null}

      {/* grelhas dos times (enchem ao vivo) */}
      <div style={{ padding: '4px 2px 0' }}>
        {times.map((t, ti) => {
          const kit = KITS[ti % 4];
          const cheios = grelha[ti] || [];
          let i = 0;
          return (
            <div key={ti} style={kitVars(kit)}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '10px 2px 6px', fontFamily: RAJ, fontWeight: 800, letterSpacing: '0.1em', fontSize: 13, color: kit.c, textTransform: 'uppercase', textShadow: `0 0 12px ${rgba(kit.c, 0.45)}` }}>
                {t.nome} <span style={{ fontSize: 10, color: 'var(--text-dim)', letterSpacing: '0.04em' }}>· kit {kit.n.toLowerCase()}</span>
                <span style={{ flex: 1, height: 1, background: `linear-gradient(90deg, ${rgba(kit.c, 0.45)}, transparent)` }} />
              </div>
              {linhas.map((c, li) => {
                const slots = t.jogadores.slice(i, i + c);
                i += c;
                return (
                  <div key={li} style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 8 }}>
                    {slots.map((j, si) => {
                      const idx = linhas.slice(0, li).reduce((s, x) => s + x, 0) + si;
                      const cheio = idx < cheios.length;
                      return cheio ? (
                        <QuadroB key={si} j={j} kit={kit} w={qw} delayBob={ti * 0.8 + idx * 0.3} />
                      ) : (
                        <div key={si} style={{ width: qw, aspectRatio: '3/4', border: '1.5px dashed rgba(255,255,255,0.18)', clipPath: 'polygon(9% 0,91% 0,100% 6.5%,100% 93.5%,91% 100%,9% 100%,0 93.5%,0 6.5%)' }} />
                      );
                    })}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* reservas com CARA + nº de ordem (v8) */}
      {reservas.length ? (
        <div style={{ margin: '12px 2px 0', border: '1px solid rgba(255,255,255,0.10)', background: 'rgba(255,255,255,0.03)', padding: '10px 12px', clipPath: 'polygon(4% 0,96% 0,100% 10%,100% 90%,96% 100%,4% 100%,0 90%,0 10%)', opacity: reservasVis || fase === 'fim' ? 1 : 0.25, transition: 'opacity .4s' }}>
          <div style={{ fontFamily: RAJ, fontWeight: 800, letterSpacing: '0.1em', fontSize: 11, color: '#d4a017', textTransform: 'uppercase', marginBottom: 8 }}>
            Reservas · ordem do banco
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, flexWrap: 'wrap' }}>
            {reservas.map((j, i) => (
              <div key={i} style={{ position: 'relative', width: 56, aspectRatio: '3/4' }}>
                <span style={{ position: 'absolute', top: -6, left: -6, zIndex: 3, width: 16, height: 16, display: 'grid', placeItems: 'center', fontFamily: RAJ, fontWeight: 800, fontSize: 10, color: '#1a1408', background: 'linear-gradient(180deg,#f0c94a,#d4a017)', clipPath: 'polygon(25% 0,75% 0,100% 25%,100% 75%,75% 100%,25% 100%,0 75%,0 25%)' }}>{j.posicao || i + 1}</span>
                <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: 'rgba(255,255,255,0.03)', border: '1.5px solid rgba(212,160,23,0.55)', clipPath: 'polygon(12% 0,88% 0,100% 8%,100% 92%,88% 100%,12% 100%,0 92%,0 8%)' }}>
                  <Retrato j={j} />
                  <PlacaNome nome={j.nome} convidado={j.convidado} fs={8} />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {fase === 'fim' ? (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 14 }}>
          <button type="button" className="btn btn--sm hud-corners-s cta-gold" style={{ fontFamily: RAJ, letterSpacing: '0.08em', textTransform: 'uppercase' }} onClick={correr}>
            Repetir a cerimónia
          </button>
        </div>
      ) : null}

      {/* JACKPOT — roxo da casa, cinema, moedas 70/30, letreiro por segmentos */}
      <div className={`cer-jack ${jack ? 'on' : ''}`}>
        <div className="cer-jack__t">
          {'SORTEIO'.split('').map((ch, i) => <span key={i} className="cer-seg" style={{ '--sd': `${(i * 0.09).toFixed(2)}s` }}>{ch}</span>)}
          <br />
          {'COMPLETO'.split('').map((ch, i) => <span key={i} className="cer-seg" style={{ '--sd': `${((i + 7) * 0.09).toFixed(2)}s` }}>{ch}</span>)}
        </div>
        {Array.from({ length: 52 }, (_, i) => (
          <span
            key={i}
            className={`cer-coin ${i % 10 < 3 ? 'cer-coin--roxa' : ''}`}
            style={{ '--cs': `${8 + ((i * 7) % 14)}px`, '--cx': `${(i % 2 ? 1 : -1) * (14 + ((i * 23) % 168))}px`, '--cyu': `${-(100 + ((i * 29) % 220))}px`, '--cr': `${(i % 2 ? 1 : -1) * (140 + ((i * 53) % 320))}deg`, '--cd': `${(1.0 + ((i * 11) % 7) * 0.18).toFixed(2)}s`, '--cdl': `${(((i * 5) % 12) * 0.09).toFixed(2)}s` }}
          />
        ))}
      </div>
    </div>
  );
}
