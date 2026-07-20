// Futty v2.0 — Vistas do campeonato (Vaga 11B), partilhadas pela página do
// membro e pela vista pública: tabela (pontos), bracket (mata), lista de jogos
// com lançamento de resultado (admin) e celebração do campeão.
import { useState } from 'react';
import { gerarCartaoCampeao, gerarCartaoPodio } from '../utils/campeonatoCartao';
import { podioDe } from '../utils/campeonatoPodio';
import { urlAsset } from '../utils/avatar';

const RAJ = "'Rajdhani', sans-serif";
const Crown = ({ size = 14, color = '#f0c94a' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color} aria-hidden="true"><path d="M3 8l4 4 5-7 5 7 4-4-2 11H5L3 8z" /></svg>
);
const LinkGlifo = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>
);
// Troféu no traço da casa — geometria angulosa (miter), currentColor.
const TrofeuCasa = ({ size = 72 }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="miter" strokeLinecap="butt" aria-hidden="true">
    <path d="M13 9 L35 9 L31 25 L17 25 Z" />
    <path d="M13.5 11 L8 11 L8 17 L15 20" />
    <path d="M34.5 11 L40 11 L40 17 L33 20" />
    <path d="M24 25 L24 32" />
    <path d="M17 40 L31 40 L28 32 L20 32 Z" />
  </svg>
);

function timesMap(campeonato) {
  const m = {};
  (campeonato.times || []).forEach((t) => { m[t.id] = t; });
  return m;
}

// Chuva de confete da celebração (70/30 ouro/roxo), determinística pelo id do
// campeonato. Tiras pequenas que caem, rodam e balançam. Fora do componente para
// não reatribuir variáveis durante o render.
function confetesDe(id) {
  const s = id || 'x';
  let h = 0;
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  const rnd = () => { h = (h * 1103515245 + 12345) & 0x7fffffff; return h / 0x7fffffff; };
  // st = posição estática (só p/ reduced-motion). No modo animado todas partem de
  // cima (top:-8% via CSS) e caem — a chuva enche pelos delays/durações variados.
  // v5: distribuição UNIFORME — cada peça tem a sua célula horizontal (equiespaçada)
  // com jitter dentro dela → sem aglomerado no centro (atrás do troféu). DOBRO da
  // quantidade (36+36), peças pequenas, ritmo homogéneo (dur 6-8s). Duas camadas
  // (trás desfocada = profundidade aprovada).
  const N = 36;
  const mk = (layer, i, wr, hr, dr) => {
    const roxa = rnd() < 0.3;
    const cell = 100 / N;
    return {
      layer,
      left: (i * cell + cell * (0.15 + rnd() * 0.7)).toFixed(1), // equiespaçado + jitter na célula
      st: (rnd() * 90).toFixed(1),
      w: (wr[0] + rnd() * wr[1]).toFixed(1),
      h: (hr[0] + rnd() * hr[1]).toFixed(1),
      cor: roxa ? '#8b5cf6' : '#f0c94a',
      dur: (dr[0] + rnd() * dr[1]).toFixed(2),
      delay: (rnd() * 7).toFixed(2),
    };
  };
  const tras = Array.from({ length: N }, (_, i) => mk('tras', i, [3.5, 2], [8, 4], [6.4, 1.6]));
  const frente = Array.from({ length: N }, (_, i) => mk('frente', i, [3, 1.8], [7, 4], [6, 1.6]));
  return [...tras, ...frente];
}

// ---- Tabela (pontos) ----
export function CampeonatoTabela({ campeonato }) {
  const linhas = campeonato.classificacao || [];
  return (
    <div className="camp-tab">
      <div className="camp-tab__hd">
        <span></span><span style={{ textAlign: 'left', paddingLeft: 2 }}>TIME</span>
        <span>P</span><span>J</span><span>V</span><span>E</span><span>GP:GC</span><span>SG</span><span>D</span>
      </div>
      {linhas.map((t, i) => (
        <div key={t.id} className={`camp-tab__r ${i === 0 ? 'camp-tab__r--lider' : ''}`}>
          <span className="pos">{i + 1}</span>
          <span className="nm">
            <span className="camp-tab__dot" style={{ background: t.cor }} />
            <span>{t.nome}</span>
            {i === 0 ? <span style={{ display: 'inline-flex' }}><Crown /></span> : null}
          </span>
          <span className="p">{t.PTS}</span>
          <span className="c">{t.J}</span>
          <span className="c">{t.V}</span>
          <span className="c">{t.E}</span>
          <span className="gpgc">{t.GP}:{t.GC}</span>
          <span className="c" style={{ color: t.SG > 0 ? '#7bd88f' : t.SG < 0 ? '#f8a4a4' : '#c9c2d6' }}>{t.SG > 0 ? '+' : ''}{t.SG}</span>
          <span className="c">{t.D}</span>
        </div>
      ))}
    </div>
  );
}

// Editor de resultado (admin) — dois placares + guardar.
function ResultadoEditor({ confronto, onResultado }) {
  const [a, setA] = useState('');
  const [b, setB] = useState('');
  const [busy, setBusy] = useState(false);
  async function salvar() {
    if (a === '' || b === '') return;
    setBusy(true);
    try { await onResultado(confronto.id, Number(a), Number(b)); } finally { setBusy(false); }
  }
  return (
    <div className="camp-res">
      <input inputMode="numeric" value={a} onChange={(e) => setA(e.target.value.replace(/\D/g, '').slice(0, 2))} placeholder="0" />
      <span className="x">×</span>
      <input inputMode="numeric" value={b} onChange={(e) => setB(e.target.value.replace(/\D/g, '').slice(0, 2))} placeholder="0" />
      <button type="button" className="btn btn--sm hud-corners-s cta-gold" style={{ fontFamily: RAJ, letterSpacing: '.06em' }} disabled={busy || a === '' || b === ''} onClick={salvar}>
        {busy ? '…' : 'Guardar'}
      </button>
    </div>
  );
}

// ---- Jogos (pontos): resultados + próximos, admin lança ----
export function CampeonatoJogos({ campeonato, admin, onResultado }) {
  const tm = timesMap(campeonato);
  const confs = [...(campeonato.confrontos || [])].sort((x, y) => x.ronda - y.ronda || x.ordem - y.ordem);
  const nome = (id) => tm[id]?.nome || '—';
  const cor = (id) => tm[id]?.cor || '#888';
  return (
    <div style={{ display: 'grid', gap: 8 }}>
      {confs.map((c) => (
        <div key={c.id} className="hud-corners" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.10)', padding: '10px 12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: RAJ, fontWeight: 700, fontSize: 13 }}>
            <span className="camp-tab__dot" style={{ background: cor(c.time_a_id) }} />
            <span style={{ flex: 1 }}>{nome(c.time_a_id)}</span>
            {c.jogado ? <span style={{ color: '#f0c94a', fontWeight: 800 }}>{c.placar_a} × {c.placar_b}</span> : <span className="muted" style={{ fontSize: 11 }}>vs</span>}
            <span style={{ flex: 1, textAlign: 'right' }}>{nome(c.time_b_id)}</span>
            <span className="camp-tab__dot" style={{ background: cor(c.time_b_id) }} />
          </div>
          <div style={{ fontSize: 10, color: '#6f6a80', marginTop: 4 }}>Jornada {c.ronda}</div>
          {admin && !c.jogado ? <ResultadoEditor confronto={c} onResultado={onResultado} /> : null}
        </div>
      ))}
    </div>
  );
}

// ---- Bracket (mata) ----
export function CampeonatoBracket({ campeonato, admin, onResultado }) {
  const tm = timesMap(campeonato);
  const rondas = {};
  (campeonato.confrontos || []).forEach((c) => { (rondas[c.ronda] = rondas[c.ronda] || []).push(c); });
  const nums = Object.keys(rondas).map(Number).sort((a, b) => a - b);
  const nomeRonda = (size) => ({ 2: 'Final', 4: 'Semis', 8: 'Quartas', 16: 'Oitavas' }[size] || 'Ronda');
  const linhaTime = (id, placar, isWin, isBye, isTbd) => {
    const t = tm[id];
    const cls = isBye ? 'bye' : isTbd ? 'tbd' : isWin ? 'win' : '';
    return (
      <div className={`camp-bt ${cls}`}>
        <span className="bdot" style={{ background: t ? t.cor : '#2a2a38' }} />
        <span className="bn">{t ? t.nome : isBye ? '(bye)' : 'a definir'}</span>
        <span className="bg">{placar == null ? '' : placar}</span>
      </div>
    );
  };
  const campeao = campeonato.campeao;
  return (
    <div className="camp-bkt">
      {nums.map((r) => {
        const confs = rondas[r].sort((a, b) => a.ordem - b.ordem);
        const size = confs.length * 2;
        return (
          <div key={r} className="camp-br">
            <div className="camp-br__t">{nomeRonda(size)}</div>
            {confs.map((c) => {
              const aWin = c.jogado && c.vencedor_id && c.vencedor_id === c.time_a_id;
              const bWin = c.jogado && c.vencedor_id && c.vencedor_id === c.time_b_id;
              const jogavel = admin && !c.jogado && c.time_a_id && c.time_b_id;
              return (
                <div key={c.id}>
                  <div className="camp-conf">
                    {linhaTime(c.time_a_id, c.placar_a, aWin, c.bye && !c.time_a_id, !c.time_a_id && !c.bye)}
                    {linhaTime(c.time_b_id, c.placar_b, bWin, c.bye && !c.time_b_id, !c.time_b_id && !c.bye)}
                  </div>
                  {jogavel ? <ResultadoEditor confronto={c} onResultado={onResultado} /> : null}
                </div>
              );
            })}
          </div>
        );
      })}
      {campeao ? (
        <div className="camp-br">
          <div className="camp-br__t">Campeão</div>
          <div className="camp-champcol"><div className="camp-champbox"><div className="nm"><span style={{ color: campeao.cor, display: 'inline-flex' }}><Crown /></span>{campeao.nome}</div></div></div>
        </div>
      ) : null}
    </div>
  );
}

// ---- Pódio (1º ouro / 2º prata / 3º bronze) ----
export function CampeonatoPodio({ campeonato }) {
  const podio = podioDe(campeonato).filter((t) => t.times.length);
  if (campeonato.times.length < 3 || podio.length < 3) return null;
  const byPos = Object.fromEntries(podio.map((t) => [t.pos, t]));
  const ordem = [byPos[2], byPos[1], byPos[3]].filter(Boolean); // 2 · 1 · 3
  return (
    <div className="camp-podio">
      {ordem.map((t) => (
        <div key={t.pos} className="camp-podio__col">
          <div className="camp-podio__crest" style={{ borderColor: `${t.cor}88` }}>
            {t.pos === 1 ? <span style={{ color: '#f0c94a', display: 'inline-flex' }}><Crown size={13} /></span> : null}
            {t.times.map((tt, i) => (
              <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: t.pos === 1 ? 12 : 11 }}>
                <span className="camp-tab__dot" style={{ background: tt.cor, width: 8, height: 8 }} />{tt.nome}
              </span>
            ))}
          </div>
          <div className={`camp-podio__step camp-podio__step--${t.pos}`} style={{ '--pc': t.cor }}>{t.pos}º</div>
        </div>
      ))}
    </div>
  );
}

// ---- Plantéis dos times (toque expande) ----
function RetratoMini({ j }) {
  if (j.avatar_url) return <img src={urlAsset(j.avatar_url)} alt="" style={{ width: 26, height: 26, borderRadius: '50%', objectFit: 'cover', objectPosition: 'top' }} />;
  return <span style={{ width: 26, height: 26, borderRadius: '50%', display: 'grid', placeItems: 'center', background: 'rgba(139,92,246,0.22)', color: '#c9b6ff', fontFamily: RAJ, fontWeight: 800, fontSize: 12 }}>{(j.nome || '?').slice(0, 1).toUpperCase()}</span>;
}

export function CampeonatoPlanteis({ campeonato }) {
  const [aberto, setAberto] = useState(null);
  const temPlantel = (campeonato.times || []).some((t) => (t.jogadores || []).length);
  if (!temPlantel) return null;
  return (
    <div style={{ display: 'grid', gap: 8 }}>
      {campeonato.times.map((t) => {
        const n = (t.jogadores || []).length;
        const open = aberto === t.id;
        return (
          <div key={t.id} className="hud-corners" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.10)', overflow: 'hidden' }}>
            <button type="button" onClick={() => setAberto(open ? null : t.id)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', background: 'transparent', border: 'none', color: '#fff', cursor: n ? 'pointer' : 'default', textAlign: 'left' }}>
              <span className="camp-tab__dot" style={{ background: t.cor }} />
              <span style={{ flex: 1, fontFamily: RAJ, fontWeight: 700, fontSize: 14 }}>{t.nome}</span>
              <span className="muted" style={{ fontSize: 11 }}>{n ? `${n} jogador${n > 1 ? 'es' : ''}` : 'só nome'}</span>
              {n ? <span style={{ color: '#8a8a98', transform: open ? 'rotate(90deg)' : 'none', transition: 'transform .15s' }}>›</span> : null}
            </button>
            {open && n ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, padding: '0 12px 12px' }}>
                {t.jogadores.map((j, i) => (
                  <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontFamily: RAJ, fontWeight: 600 }}>
                    <RetratoMini j={j} />{j.nome}{j.convidado ? <span style={{ color: '#8b5cf6', fontSize: 9 }}>conv.</span> : ''}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

// ---- Celebração do campeão ----
export function CampeonatoCelebracao({ campeonato, slug }) {
  const camp = campeonato.campeao;
  const [copiado, setCopiado] = useState(false);
  if (!camp) return null;
  const confetes = confetesDe(campeonato.id).map((c, i) => (
    <i key={i} className={`camp-conf--${c.layer}`} style={{ left: `${c.left}%`, '--st': `${c.st}%`, width: `${c.w}px`, height: `${c.h}px`, background: c.cor, animationDuration: `${c.dur}s`, animationDelay: `${c.delay}s` }} />
  ));
  function copiarLink() {
    const url = `${window.location.origin}/p/campeonato/${slug}/${campeonato.id}`;
    const done = () => { setCopiado(true); setTimeout(() => setCopiado(false), 1800); };
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(url).then(done).catch(() => fallback(url, done));
    else fallback(url, done);
  }
  function fallback(url, done) {
    const ta = document.createElement('textarea'); ta.value = url; document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); done(); } catch { /* noop */ } finally { document.body.removeChild(ta); }
  }
  return (
    <div className="camp-cel">
      <div className="camp-cel__confete">{confetes}</div>
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div className="camp-cel__k">Campeão</div>
        <div className="camp-cel__heroi">
          <div style={{ color: '#f0c94a', display: 'grid', placeItems: 'center', filter: 'drop-shadow(0 0 16px rgba(212,160,23,0.65))' }}><TrofeuCasa size={78} /></div>
          <div className="camp-cel__n">{camp.nome}</div>
        </div>
        <div className="camp-cel__s">{campeonato.nome} · levantou a taça</div>
        {(camp.jogadores || []).length ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center', margin: '0 0 14px' }}>
            {camp.jogadores.map((j, i) => (
              <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontFamily: RAJ, fontWeight: 600, color: '#e4d9ff', background: 'rgba(255,255,255,0.05)', padding: '3px 8px 3px 3px', borderRadius: 999 }}>
                <RetratoMini j={j} />{j.nome}
              </span>
            ))}
          </div>
        ) : null}

        <CampeonatoPodio campeonato={campeonato} />

        <div className="camp-cel__row" style={{ marginTop: 12 }}>
          <button type="button" onClick={copiarLink} style={{ flex: 1, cursor: 'pointer', fontFamily: RAJ, fontWeight: 800, fontSize: 12, letterSpacing: '.06em', color: '#fff', background: 'rgba(139,92,246,.16)', border: '1.5px solid #8b5cf6', padding: '11px 6px', clipPath: 'polygon(8px 0,calc(100% - 8px) 0,100% 8px,100% calc(100% - 8px),calc(100% - 8px) 100%,8px 100%,0 calc(100% - 8px),0 8px)' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>{copiado ? 'Copiado!' : <><LinkGlifo /> Link</>}</span>
          </button>
          <button type="button" className="btn hud-corners cta-gold" onClick={() => gerarCartaoCampeao(campeonato)} style={{ flex: 1, fontFamily: RAJ, fontWeight: 800, fontSize: 12, letterSpacing: '.06em' }}>
            9:16 campeão
          </button>
          <button type="button" className="btn hud-corners cta-gold" onClick={() => gerarCartaoPodio(campeonato)} style={{ flex: 1, fontFamily: RAJ, fontWeight: 800, fontSize: 12, letterSpacing: '.06em' }}>
            9:16 pódio
          </button>
        </div>
      </div>
    </div>
  );
}
