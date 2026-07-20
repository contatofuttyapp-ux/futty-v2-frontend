// Futty v2.0 — Vitrine do Jogador (/equipa/:slug/jogador/:id) no cânone.
// Herói = recorte puro (avatar IA) com aura + respiração; fallback foto-com-fade.
// Stats-espectáculo: nota count-up + anel, radar FIFA, sparkline animada, tiles em
// cascata (reduced-motion → estático). Conquistas (sem rodada). Actividade gated por
// membership no endpoint (quem não partilha equipa não chega aqui → estado digno).
import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import SeloHonra from '../components/SeloHonra';
import { urlAsset } from '../utils/avatar';
import Topbar from '../components/Topbar';
import LoadingFutty from '../components/LoadingFutty';
import EscudoEquipa from '../components/EscudoEquipa';
import SilhuetaJogador from '../components/SilhuetaJogador';
import Icon from '../components/Icon';
import '../styles/app.css';

const GOLD = '#d4a017';
const CLIP_S = 'polygon(5px 0, calc(100% - 5px) 0, 100% 5px, 100% calc(100% - 5px), calc(100% - 5px) 100%, 5px 100%, 0 calc(100% - 5px), 0 5px)';
const CLIP = 'polygon(8px 0, calc(100% - 8px) 0, 100% 8px, 100% calc(100% - 8px), calc(100% - 8px) 100%, 8px 100%, 0 calc(100% - 8px), 0 8px)';
const VIDRO = { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' };

const CONQUISTAS = [
  { key: 'campeao', icon: 'medalha', label: 'Campeão' },
  { key: 'artilheiro', icon: 'bola', label: 'Artilheiro' },
  { key: 'destaque', icon: 'estrela', label: 'Destaque' },
];
const RES = {
  vitoria: { txt: 'V', cor: '#4ade80', bd: 'rgba(74,222,128,0.4)' },
  derrota: { txt: 'D', cor: '#f87171', bd: 'rgba(248,113,113,0.4)' },
  empate: { txt: 'E', cor: 'rgba(255,255,255,0.6)', bd: 'rgba(255,255,255,0.2)' },
};
const prefersReduce = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

function fmtLongo(iso) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('pt-PT', { weekday: 'short', day: 'numeric', month: 'short' });
}
function SecLabel({ children, extra }) {
  return (
    <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 12, fontWeight: 700, letterSpacing: '0.14em', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', margin: '24px 0 10px', display: 'flex', alignItems: 'baseline', gap: 8 }}>
      {children}{extra}
    </div>
  );
}

// Geometria do radar ADAPTATIVO: N eixos → N vértices (passo 360/N). 5=pentágono,
// 4=losango, 3=triângulo.
function radarPts(vals, cx, cy, R) {
  const N = vals.length || 1;
  return vals.map((v, i) => {
    const a = (-90 + i * (360 / N)) * (Math.PI / 180);
    const r = (R * Math.max(0, Math.min(100, v))) / 100;
    return [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
  });
}

// Radar adaptativo: nasce dos EIXOS ACTIVOS ([{label,value}]). Linha SEMPRE roxa; a
// vida é o glow a preencher/pulsar + fill a respirar (CSS .perfil-radarshape) e os
// vértices a cintilar — não um traço a viajar.
function Radar({ eixos, cor }) {
  const cx = 100, cy = 100, R = 78;
  const full = eixos.map(() => 100);
  const vals = eixos.map((e) => e.value || 0);
  const grade = [0.4, 0.7, 1].map((f) => radarPts(full, cx, cy, R * f).map((p) => p.join(',')).join(' '));
  const axisEnds = radarPts(full, cx, cy, R);
  const shape = radarPts(vals, cx, cy, R).map((p) => p.join(',')).join(' ');
  const dots = radarPts(vals, cx, cy, R);
  return (
    <svg viewBox="0 0 200 200" style={{ width: 150, height: 150, flexShrink: 0 }}>
      {grade.map((pts, i) => <polygon key={i} points={pts} fill="none" stroke="rgba(255,255,255,0.10)" strokeWidth="1" />)}
      {axisEnds.map(([x, y], i) => <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="rgba(255,255,255,0.08)" strokeWidth="1" />)}
      <g className="perfil-radarbreath">
        <polygon className="perfil-radarshape" points={shape} fill={cor} stroke={cor} strokeWidth="2" />
        {dots.map(([x, y], i) => <circle key={i} className="perfil-radardot" style={{ animationDelay: `${1 + i * 0.3}s` }} cx={x} cy={y} r="3" fill={cor} />)}
      </g>
    </svg>
  );
}

// Count-up 0 → end (reduced-motion: valor directo). O shimmer é CSS (.perfil-num).
function CountUp({ end, decimals = 0, prefix = '', className, style }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (prefersReduce || end == null) return undefined;
    let raf; const t0 = performance.now(); const dur = 1200;
    const step = (t) => {
      const k = Math.min(1, (t - t0) / dur);
      setN(end * (1 - Math.pow(1 - k, 3)));
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [end]);
  const val = prefersReduce || end == null ? end : n;
  return <span className={className} style={style}>{end == null ? '—' : `${prefix}${val.toFixed(decimals)}`}</span>;
}

export default function JogadorPerfil() {
  const { slug, userId } = useParams();
  const [searchParams] = useSearchParams();
  const { data, loading, error } = useApi(`/api/teams/${slug}/jogador/${userId}`);
  const { data: selosData } = useApi(`/api/equipas/${slug}/jogador/${userId}/selos`);
  const selos = selosData?.selos || [];
  // Nome dourado — 2 variantes p/ o look (?nome=b). A: ouro-heavy c/ bordas quentes;
  // B: ouro quase pleno com pico claro no centro.
  const nomeGrad = searchParams.get('nome') === 'b'
    ? 'linear-gradient(90deg, #d4a017 0%, #f0c94a 40%, #fff6d0 50%, #f0c94a 60%, #d4a017 100%)'
    : 'linear-gradient(90deg, #fff2cc 0%, #f0c94a 38%, #d4a017 50%, #f0c94a 62%, #fff2cc 100%)';

  // Mistura final: ROXO = ambiente (anel, radar, estrutura), DOURADO = destaque
  // (aura, nota, valores das stats, conquistas activas, escudos/nomes).
  const OURO = GOLD;
  const ROXO = '#8b5cf6';

  const jogador = data?.jogador;
  const radar = data?.radar;
  const conquistas = data?.conquistas || {};
  const historico = data?.historico || [];
  const evolucao = data?.evolucao || [];
  const equipas = data?.equipas_partilhadas || [];
  const mostrarGols = data?.team?.mostrar_gols !== false; // flag do admin (default TRUE)

  // Count-up da nota.
  const notaAlvo = jogador?.nota ?? null;
  const [notaAnim, setNotaAnim] = useState(0);
  useEffect(() => {
    if (notaAlvo == null || prefersReduce) return undefined;
    let raf; const t0 = performance.now(); const dur = 1400;
    const step = (t) => {
      const k = Math.min(1, (t - t0) / dur);
      setNotaAnim(notaAlvo * (1 - Math.pow(1 - k, 3)));
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [notaAlvo]);
  // reduced-motion (ou antes do rAF correr) → valor final directo, sem count-up.
  const notaShow = prefersReduce ? (notaAlvo ?? 0) : notaAnim;

  const nomeShow = jogador?.nome_jogador || jogador?.nome || 'Jogador';
  const ehRecorte = !!(jogador?.avatar_url && jogador?.foto_url && jogador.avatar_url !== jogador.foto_url);
  const imgSrc = jogador?.avatar_url ? urlAsset(jogador.avatar_url) : null;

  // Anel: fracção = nota/10 (nota exibida 6-10). Sem nota → anel vazio.
  const ringOff = notaAlvo != null ? Math.round(326 * (1 - notaAlvo / 10)) : 326;

  // Sparkline a partir da evolução (nota 6-10 → y invertido).
  const sparkPts = (() => {
    if (evolucao.length < 2) return null;
    const W = 320, H = 76, pad = 8;
    const notas = evolucao.map((p) => p.nota);
    const min = Math.min(...notas, 6), max = Math.max(...notas, 10);
    const span = max - min || 1;
    return evolucao.map((p, i) => {
      const x = (i / (evolucao.length - 1)) * W;
      const y = H - pad - ((p.nota - min) / span) * (H - pad * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
  })();

  const tiles = [
    { n: conquistas.jogos_total ?? 0, l: 'Jogos' },
    { n: conquistas.vitorias_total ?? 0, l: 'Vitórias' },
    ...(mostrarGols ? [{ n: conquistas.gols_total ?? 0, l: 'Gols' }] : []),
    { n: jogador?.posicao ?? null, l: 'Ranking', prefix: '#' },
  ];

  const atividade = data?.atividade || [];

  // Radar adaptativo: eixos ACTIVOS (value presente). Hoje o endpoint dá os 5; se um
  // dia o flag mostrar_gols cair, gols+artilharia saem daqui → o polígono vira losango
  // ou triângulo sozinho (radarPts divide por N).
  const eixosRadar = radar ? [
    { label: 'Presença', value: radar.presenca },
    { label: 'Gols', value: radar.gols },
    { label: 'Artilharia', value: radar.artilharia },
    { label: 'Vitórias', value: radar.vitorias },
    { label: 'Notas', value: radar.notas },
  ].filter((e) => e.value != null) : [];

  return (
    <div className="app-shell page-reveal" style={{ '--vitrine': ROXO }}>
      <Topbar hud="PERFIL" back={`/equipa/${slug}/ranking`} />

      <main className="app-main" style={{ paddingLeft: 16, paddingRight: 16 }}>
        {error ? (
          <div className="glass" style={{ ...VIDRO, clipPath: CLIP, padding: '22px 16px', textAlign: 'center', marginTop: 16, color: 'rgba(255,255,255,0.6)', fontSize: 14, lineHeight: 1.6 }}>
            <div style={{ fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, color: '#fff' }}>Perfil só entre companheiros</div>
            Não partilham nenhuma equipa — este perfil não está acessível.
          </div>
        ) : loading ? (
          <LoadingFutty />
        ) : !jogador ? (
          <p className="muted">Jogador não encontrado.</p>
        ) : (
          <>
            {/* 1. HERÓI — TRANSPLANTE DIRETO do harness glow-organico.html, VARIANTE A.
                Estrutura/valores byte a byte da bancada: palco 330×470 → glow 300×344
                (respiraA no PRÓPRIO glow) → cutout 250×284 (máscara 86%, zero drop-shadow)
                → nome absoluto (bottom:34px). Só o src do cutout é o real do jogador.
                Meta + escudos fluem ABAIXO do palco (conteúdo do app, não do palco). */}
            <div style={{ position: 'relative', textAlign: 'center' }}>
              <div className="perfil-palco">
                <div className="perfil-glow" />
                {imgSrc ? (
                  <img className={ehRecorte ? 'perfil-cutout' : 'perfil-faded'} src={imgSrc} alt="" />
                ) : (
                  <span style={{ position: 'absolute', left: '50%', bottom: 96, transform: 'translateX(-50%)', zIndex: 1, display: 'grid', placeItems: 'center', width: 180, height: 180, clipPath: CLIP, background: 'rgba(212,160,23,0.1)', border: `1px solid ${OURO}` }}>
                    <SilhuetaJogador size="64%" color="rgba(212,160,23,0.75)" />
                  </span>
                )}
                <div className="perfil-nome-wrap">
                  <span style={{ display: 'inline-block', fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, fontSize: 42, lineHeight: 1, background: nomeGrad, WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{nomeShow}</span>
                </div>
              </div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginTop: 8, fontFamily: "'Rajdhani', sans-serif", fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>
                {jogador.posicao != null ? <span>{jogador.posicao}º de {jogador.total_com_nota}</span> : <span>Sem nota ainda</span>}
                {jogador.categoria === 'GR' ? <><span style={{ opacity: 0.4 }}>·</span><span style={{ fontSize: 10, fontWeight: 700, color: '#b69cff', border: '1px solid var(--purple)', padding: '1px 6px' }}>GR</span></> : null}
              </div>
              {equipas.length ? (
                <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap', marginTop: 13 }}>
                  {equipas.map((e) => (
                    <Link key={e.id} to={`/equipa/${e.slug}/ranking`} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 11px', clipPath: CLIP_S, ...VIDRO, textDecoration: 'none', color: '#e8c65a', fontFamily: "'Rajdhani', sans-serif", fontSize: 12, fontWeight: 700 }}>
                      <EscudoEquipa team={e} size={20} /> {e.nome}
                    </Link>
                  ))}
                </div>
              ) : null}
            </div>

            {/* 2. CONQUISTAS (sem rodada) */}
            <SecLabel>Conquistas</SecLabel>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {CONQUISTAS.filter((c) => mostrarGols || c.key !== 'artilheiro').map((c) => {
                const n = conquistas[c.key] ?? 0;
                const on = n > 0;
                return (
                  <span key={c.key} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 12px', clipPath: CLIP_S, fontFamily: "'Rajdhani', sans-serif", fontSize: 12, fontWeight: 700, color: on ? '#f0c94a' : '#7a7a86', border: `1px solid ${on ? 'rgba(212,160,23,0.5)' : 'rgba(255,255,255,0.10)'}`, background: on ? 'rgba(212,160,23,0.09)' : 'rgba(255,255,255,0.02)' }}>
                    <Icon name={c.icon} size={14} color={on ? '#d4a017' : 'grey'} /> {c.label} · {n}
                  </span>
                );
              })}
            </div>

            {/* 2b. SELOS DE HONRA (Vaga 11C) — todas as honras (ativas + históricas). */}
            {selos.length ? (
              <>
                <SecLabel>Selos de honra</SecLabel>
                <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                  {selos.map((s) => (
                    <div key={s.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, width: 76 }}>
                      <SeloHonra tier={s.tier} label={s.label} size={64} />
                      <span style={{ fontSize: 10, color: 'var(--text-dim)', textAlign: 'center', lineHeight: 1.3 }}>{s.sub}</span>
                      <span style={{ fontSize: 9, fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, letterSpacing: '.04em', color: s.fonte === 'ranking' ? '#7bd88f' : s.ativa ? '#f0c94a' : '#7a7a86' }}>
                        {s.fonte === 'ranking' ? 'VIVO' : s.ativa ? 'ATIVO' : 'HISTÓRICO'}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            ) : null}

            {/* 3. DESEMPENHO — anel + radar + sparkline + tiles */}
            <SecLabel>Desempenho</SecLabel>
            <div style={{ display: 'flex', alignItems: 'center', gap: 18, padding: 16, clipPath: CLIP, ...VIDRO }}>
              <div style={{ position: 'relative', width: 118, height: 118, flexShrink: 0 }}>
                <svg viewBox="0 0 118 118" style={{ transform: 'rotate(-90deg)' }}>
                  <circle cx="59" cy="59" r="52" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="9" />
                  {notaAlvo != null ? <circle className="perfil-ringval" cx="59" cy="59" r="52" style={{ '--ring-off': ringOff }} /> : null}
                  {notaAlvo != null ? (
                    <g className="perfil-ringorbit">
                      <circle cx="59" cy="7" r="3.5" fill="#ffe487" style={{ filter: 'drop-shadow(0 0 4px #f5c531)' }} />
                    </g>
                  ) : null}
                </svg>
                <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', textAlign: 'center' }}>
                  <div>
                    <div className="perfil-num" style={{ fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, fontSize: 34, color: OURO, lineHeight: 1, animationDelay: '0.6s' }}>{notaAlvo != null ? notaShow.toFixed(1) : '--'}</div>
                    <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 11, letterSpacing: '0.14em', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>Nota</div>
                  </div>
                </div>
              </div>
              <div style={{ fontFamily: "'Rajdhani', sans-serif" }}>
                <div style={{ fontSize: 22, fontWeight: 700 }}>{jogador.posicao != null ? <>Top <CountUp end={jogador.posicao} className="perfil-num" style={{ display: 'inline-block' }} /></> : '—'}</div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)' }}>de {jogador.total_com_nota} com nota</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: OURO, marginTop: 8 }}>{notaAlvo != null ? `${notaAlvo.toFixed(1)} / 10` : '--'}</div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)' }}>média recebida</div>
              </div>
            </div>

            {eixosRadar.length >= 3 ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: 14, marginTop: 9, clipPath: CLIP, ...VIDRO }}>
                <Radar eixos={eixosRadar} cor={ROXO} />
                <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 14, lineHeight: 1.8, color: 'rgba(255,255,255,0.72)', flex: 1 }}>
                  {eixosRadar.map((e, i) => (
                    <div key={e.label} style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                      <span>{e.label}</span>
                      <CountUp end={e.value || 0} className="perfil-num" style={{ color: OURO, fontWeight: 700, fontSize: 16, display: 'inline-block', animationDelay: `${2.2 + i * 1.3}s` }} />
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {sparkPts ? (
              <div style={{ padding: 14, marginTop: 9, clipPath: CLIP, ...VIDRO }}>
                <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 12, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', marginBottom: 8 }}>Evolução da nota</div>
                <svg viewBox="0 0 320 76" preserveAspectRatio="none" style={{ width: '100%', height: 76 }}>
                  <polyline className="perfil-spark" points={sparkPts} />
                </svg>
              </div>
            ) : null}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9, marginTop: 9 }}>
              {tiles.map((t, i) => (
                <div key={t.l} className="perfil-tile" style={{ animationDelay: `${0.05 + i * 0.1}s`, padding: 13, textAlign: 'center', clipPath: CLIP, ...VIDRO }}>
                  <CountUp end={t.n} prefix={t.prefix || ''} className="perfil-num" style={{ display: 'inline-block', fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, fontSize: 24, color: OURO, animationDelay: `${1.4 + i * 1.7}s` }} />
                  <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 11, letterSpacing: '0.06em', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', marginTop: 3 }}>{t.l}</div>
                </div>
              ))}
            </div>

            {/* 4. ACTIVIDADE (equipas partilhadas — gated por membership no endpoint) */}
            <SecLabel>Actividade</SecLabel>
            {atividade.map((p) => (
              <div key={p.id} style={{ padding: '12px 13px', marginBottom: 7, clipPath: CLIP, ...VIDRO }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: "'Rajdhani', sans-serif", fontSize: 11, fontWeight: 700, color: 'rgba(212,160,23,0.7)', marginBottom: p.body ? 6 : 0 }}>
                  {p.team_nome ? <span>{p.team_nome}</span> : null}<span style={{ opacity: 0.5 }}>·</span><span style={{ color: 'rgba(212,160,23,0.5)', fontWeight: 400 }}>{fmtLongo(p.created_at)}</span>
                </div>
                {p.body ? <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.78)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{p.body}</div> : null}
                {p.media?.length ? (
                  <div style={{ display: 'flex', gap: 6, marginTop: 8, overflowX: 'auto' }}>
                    {p.media.map((m, i) => (m.media_type === 'video'
                      ? <video key={i} src={urlAsset(m.url)} style={{ width: 96, height: 96, objectFit: 'cover', clipPath: CLIP_S, background: '#000', flexShrink: 0 }} />
                      : <img key={i} src={urlAsset(m.url)} alt="" style={{ width: 96, height: 96, objectFit: 'cover', clipPath: CLIP_S, flexShrink: 0 }} />))}
                  </div>
                ) : null}
                {p.comentarios_total ? (
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 8, fontFamily: "'Rajdhani', sans-serif", fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>
                    <Icon name="resenha" size={13} color="grey" /> {p.comentarios_total} comentário{p.comentarios_total > 1 ? 's' : ''}
                  </div>
                ) : null}
              </div>
            ))}

            {atividade.length && historico.length ? <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', margin: '14px 0 8px' }}>Jogos</div> : null}
            {historico.length === 0 && atividade.length === 0 ? (
              <p className="muted" style={{ fontSize: 13 }}>Ainda sem actividade.</p>
            ) : historico.length === 0 ? null : (
              historico.map((j) => {
                const r = RES[j.resultado] || RES.empate;
                return (
                  <div key={j.game_id} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '11px 13px', marginBottom: 7, clipPath: CLIP, ...VIDRO }}>
                    <span style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 13, flex: 1, color: 'rgba(255,255,255,0.78)' }}>
                      {fmtLongo(j.data)}
                      <span style={{ display: 'block', fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>
                        {j.foi_artilheiro ? 'artilheiro ' : ''}{j.foi_destaque ? 'destaque' : ''}{!j.foi_artilheiro && !j.foi_destaque ? '—' : ''}
                      </span>
                    </span>
                    <span style={{ fontFamily: "'Rajdhani', sans-serif", fontWeight: 800, fontSize: 12, padding: '2px 8px', clipPath: CLIP_S, color: r.cor, border: `1px solid ${r.bd}` }}>{r.txt}</span>
                  </div>
                );
              })
            )}
          </>
        )}
      </main>
    </div>
  );
}
