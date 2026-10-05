// Futty v2.0 — Marcar jogo (/time/:slug/jogo/novo, só admin).
// Rodada 29S, bloco A (achados 151 a 156): a página abre DIRETO no "Marcar jogo" — um jogo que vai acontecer. Saíram os três chips (Sortear /
// Times à mão / Já aconteceu): COMO os times se formam (sorteio ou à mão) é uma decisão do JOGO, depois das confirmações (Jogo.jsx).
// No topo, o "ingresso" do jogo se preenche enquanto a pessoa digita; a hora nasce em 20:00 (ou na hora do último jogo do time, se já está em
// cache); "Só neste jogo" aparece em ROXO. "Jogo passado →" é uma linha discreta embaixo do botão.
// Bloco B: o "Jogo passado →" leva ao passo a passo (/time/:slug/jogo/passado, pages/JogoPassado.jsx) — o destino mora em utils/novoJogo.js
// (caminhoDoJogoPassado), um ponto só. O modo antigo "Já aconteceu" (?passado=1) e a fase de montar saíram daqui: um link antigo para esta
// página abre o Marcar jogo.
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Calendar, Clock, MapPin } from 'lucide-react';
import { apiFetch } from '../lib/api';
import { lerCache } from '../lib/cacheLocal';
import { useAuth } from '../hooks/useAuth';
import { useTeam } from '../hooks/useTeam';
import { instanteNoCampo } from '../utils/dataHora';
import { caminhoDoJogoPassado, horaSugerida } from '../utils/novoJogo';
import Topbar from '../components/Topbar';
import NumberStepper from '../components/NumberStepper';
import IngressoDoJogo from '../components/IngressoDoJogo';
import '../styles/app.css';

const RAJ = "'Rajdhani', sans-serif";
// O roxo do "Só neste jogo" (achado 156): o que vale só para este jogo se distingue do padrão do time.
const ROXO = '#8b5cf6';
const ROXO_CLARO = '#c9b6ff';
const CAMPO_GRANDE = { fontFamily: RAJ, fontSize: 18, fontWeight: 600 };
const ROTULO_COM_ICONE = { display: 'flex', alignItems: 'center', gap: 6 };
const CLIP = 'polygon(8px 0, calc(100% - 8px) 0, 100% 8px, 100% calc(100% - 8px), calc(100% - 8px) 100%, 8px 100%, 0 calc(100% - 8px), 0 8px)';

export default function NovoJogo() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { session } = useAuth();
  const { team } = useTeam(slug);

  const [data, setData] = useState('');
  // A hora nasce em 20:00 (achado 155) — ou na hora do último jogo do time no fuso do time, se os jogos do time já estão em cache (o do Início):
  // nenhum pedido novo só para isso. `null` = a pessoa ainda não mexeu; a sugestão vale até ela digitar.
  const [horaDigitada, setHoraDigitada] = useState(null);
  const [jogosEmCache] = useState(() => lerCache(session?.user?.id, 'inicio')?.convites?.games || null);
  const hora = horaDigitada ?? horaSugerida(jogosEmCache, { slug, fuso: team?.fuso });
  const [local, setLocal] = useState('');
  // Item 68 (Rodada 29): jogadores por time é UM padrão do time (Ajustes) — o jogo já nasce com ele, dobrado em "Padrão do time: 5 ·
  // mudar só neste jogo". `porTime` null = o padrão (o motor usa o do time); com número, vale só para este jogo (ROXO, achado 156).
  const [porTime, setPorTime] = useState(null);
  const padraoDoTime = team?.jogadores_por_time || 5;
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!data) { setError('Informe a data do jogo.'); return; }
    if (!hora) { setError('Informe a hora do jogo.'); return; }
    if (porTime != null && (!porTime || Number(porTime) < 2)) { setError('Informe quantos jogadores por time (mínimo 2).'); return; }
    setError('');
    setLoading(true);
    try {
      // 29I (achado 83): a data e a hora digitadas são as do CAMPO (fuso do time), não as do aparelho de quem cria o jogo — o admin
      // em Lisboa que marca "quinta 20:00" para um time de São Paulo está marcando 20:00 de São Paulo.
      const iso = instanteNoCampo(data, hora, team?.fuso);
      if (!iso) { setError('Confira a data e a hora do jogo.'); setLoading(false); return; }
      const { game } = await apiFetch('/api/games', {
        method: 'POST',
        body: JSON.stringify({
          team_slug: slug,
          data: iso,
          local: local.trim() || null,
          ...(porTime != null ? { jogadores_por_time: Number(porTime) } : {}), // sem número: o padrão do time
          historico: false,
        }),
      });
      // replace: o "Voltar" do jogo leva para onde a pessoa estava antes do formulário, não de volta a ele.
      navigate(`/time/${slug}/jogo/${game.id}`, { replace: true });
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }

  return (
    <div className="app-shell">
      <Topbar hud="NOVO JOGO" back="voltar" backFallback={`/time/${slug}?aba=jogos`} />
      <main className="app-main page-reveal" style={{ maxWidth: 480 }}>
        <IngressoDoJogo team={team} data={data} hora={hora} local={local} porTime={porTime} />

        {/* Rodada 29Z (item 3e): a coluna do cartão é `minmax(0, 1fr)`, não a implícita `auto` — a `auto` cresce até o conteúdo mínimo (dois
            campos de data e hora lado a lado, 327 px) e, num celular de 360 px (caixa de 310), o recorte de 45° do cartão cortava 17 px à
            direita: sumia o fim de "Hora do jogo", a borda do campo Local e a do botão "Criar jogo". Data e hora ficam lado a lado só se
            cada uma tem 146 px (o "12/10/2026" em Rajdhani 18 px precisa disso; medido: a 133 px a primeira letra some); senão, uma por linha. */}
        <form onSubmit={handleSubmit} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.10)', clipPath: CLIP, padding: '16px 16px 18px', display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 14 }}>
          {error && <div className="alert alert--error">{error}</div>}

          <div data-data-e-hora style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(146px, 1fr))', gap: '0 12px' }}>
            <div className="field" style={{ minWidth: 0 }}>
              <label htmlFor="data" style={ROTULO_COM_ICONE}><Calendar size={15} aria-hidden="true" /> Data</label>
              <input id="data" type="date" className="input input--hud" style={CAMPO_GRANDE} value={data} onChange={(e) => setData(e.target.value)} />
            </div>
            <div className="field" style={{ minWidth: 0 }}>
              {/* 29I, bloco 3 (dono): "Hora do jogo" — nunca "fuso". O rabicho (a cidade do time, só para quem está noutro relógio) mora no ingresso, ao lado da hora. */}
              <label htmlFor="hora" style={ROTULO_COM_ICONE}><Clock size={15} aria-hidden="true" /> Hora do jogo</label>
              <input id="hora" type="time" className="input input--hud" style={CAMPO_GRANDE} value={hora} onChange={(e) => setHoraDigitada(e.target.value)} />
            </div>
          </div>

          <div className="field">
            <label htmlFor="local" style={ROTULO_COM_ICONE}><MapPin size={15} aria-hidden="true" /> Local</label>
            <input id="local" className="input input--hud" style={CAMPO_GRANDE} placeholder="Ex.: Campo Municipal" value={local} onChange={(e) => setLocal(e.target.value)} maxLength={120} />
          </div>

          <div className="field" data-jogadores-por-time style={porTime != null ? { padding: '10px 12px', border: '1px solid rgba(139,92,246,0.55)', background: 'rgba(139,92,246,0.08)' } : undefined}>
            <label style={{ ...ROTULO_COM_ICONE, justifyContent: 'space-between' }}>
              Jogadores por time
              {porTime != null ? (
                <span data-selo-so-neste style={{ fontFamily: RAJ, fontWeight: 800, fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: ROXO_CLARO, border: `1px solid ${ROXO}`, background: 'rgba(139,92,246,0.22)', padding: '2px 8px', borderRadius: 2 }}>Só neste jogo</span>
              ) : null}
            </label>
            {porTime == null ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', fontSize: 14 }}>
                <span>Padrão do time: <b>{padraoDoTime}</b></span>
                <button type="button" className="btn btn--ghost btn--sm" data-mudar-so-neste onClick={() => setPorTime(padraoDoTime)}>mudar só neste jogo</button>
              </div>
            ) : (
              <>
                <NumberStepper value={porTime} onChange={setPorTime} min={2} max={11} cor={ROXO_CLARO} />
                <button type="button" className="btn btn--ghost btn--sm" data-voltar-ao-padrao style={{ justifySelf: 'start', marginTop: 6, color: ROXO_CLARO, borderColor: 'rgba(139,92,246,0.5)' }} onClick={() => setPorTime(null)}>voltar ao padrão ({padraoDoTime})</button>
              </>
            )}
            <span className="muted" style={{ fontSize: 12, marginTop: 4 }}>O número de times sai no sorteio, conforme os confirmados. O padrão muda em Ajustes do time.</span>
          </div>

          <button type="submit" className="btn hud-corners-s cta-gold" style={{ width: '100%', marginTop: 8, fontFamily: RAJ, letterSpacing: '0.08em', textTransform: 'uppercase' }} disabled={loading}>
            {loading ? 'Criando…' : 'Criar jogo'}
          </button>
        </form>

        {/* A porta do outro caminho. Importância menor (dono, 4-out): uma linha discreta, nunca um cartão do mesmo peso do botão. */}
        <p data-jogo-passado style={{ textAlign: 'center', margin: '8px 0 0', fontSize: 13, color: 'var(--text-dim)' }}>
          Esse jogo já aconteceu?{' '}
          <Link to={caminhoDoJogoPassado(slug)} style={{ color: ROXO_CLARO, textDecoration: 'underline', textUnderlineOffset: 3, display: 'inline-block', padding: '12px 2px' }}>Jogo passado →</Link>
        </p>
      </main>
    </div>
  );
}
