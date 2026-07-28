// Futty v2.0 — Gabinete do Dono (/gabinete). Rota super-admin (guard no servidor E no
// cliente). Linha do tempo scrollável no cânone (vidro/aurora/45°/Rajdhani) — transplante
// do gabinete-mockup.html. Lei: o dono é CEGO ao conteúdo (só números). Receita/Publicidade
// = "em breve" digno enquanto a fonte real (IAP das lojas / medição de ads) não existir.
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../lib/api';
import LoadingFutty from '../components/LoadingFutty';
import Toast from '../components/Toast';

const OURO = '#d4a017'; const OURO2 = '#f0c94a'; const ROXO = '#8b5cf6'; const PRATA = '#aab4c8'; const VERDE = '#7bd88f';
// Política/termos: "publicada" simples OU publicada-mas-em-revisão contam como publicados.
const ESTADOS_PUBLICADOS = ['publicada', 'publicada (revisão jurídica pendente)'];

// ── mini-gráficos SVG (cânone: dourado sobre vidro) — portados do mockup ──
function lineChart(vals, cor, w, h) {
  const pad = 6; const max = Math.max(...vals, 1);
  const n = Math.max(vals.length, 2);
  const X = (i) => pad + (i * (w - pad * 2)) / (n - 1);
  const Y = (v) => h - pad - (v * (h - pad * 2)) / max;
  const pts = vals.map((v, i) => `${X(i)},${Y(v)}`).join(' ');
  return `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" style="height:${h}px;width:100%">`
    + `<polyline points="${pts}" fill="none" stroke="${cor}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>`
    + `<circle cx="${X(vals.length - 1)}" cy="${Y(vals[vals.length - 1] || 0)}" r="3" fill="${cor}"/></svg>`;
}
function barChart(vals, cor, w, h) {
  const pad = 6; const max = Math.max(...vals, 1); const bw = (w - pad * 2) / Math.max(vals.length, 1) * 0.62;
  let out = `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" style="height:${h}px;width:100%">`;
  vals.forEach((v, i) => { const x = pad + (i + 0.19) * (w - pad * 2) / vals.length; const bh = (v * (h - pad * 2)) / max; out += `<rect x="${x}" y="${h - pad - bh}" width="${bw}" height="${bh}" rx="2" fill="${cor}"/>`; });
  return out + '</svg>';
}
function stacked(v, w, h) {
  const pad = 6; const n = v.posts.length || 1;
  const tot = v.posts.map((_, i) => v.posts[i] + v.sorteios[i] + v.jogos[i]); const max = Math.max(...tot, 1);
  const bw = (w - pad * 2) / n * 0.6;
  let out = `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" style="height:${h}px;width:100%">`;
  for (let i = 0; i < n; i += 1) {
    const x = pad + (i + 0.2) * (w - pad * 2) / n; let y = h - pad;
    for (const [k, c] of [['jogos', ROXO], ['sorteios', PRATA], ['posts', OURO]]) {
      const bh = ((v[k][i] || 0) * (h - pad * 2)) / max; y -= bh;
      out += `<rect x="${x}" y="${y}" width="${bw}" height="${bh}" fill="${c}"/>`;
    }
  }
  return out + '</svg>';
}
const SVG = (html) => <div dangerouslySetInnerHTML={{ __html: html }} />;

function Hud({ h2, n, breve }) {
  return (
    <div className="gab-hud">
      <h2>{h2}</h2>
      {breve ? <span className="gab-breve">{breve}</span> : n ? <span className="gab-n">{n}</span> : null}
    </div>
  );
}
const Vazio = ({ children }) => <div className="gab-card gab-vazio">{children}</div>;

export default function Gabinete() {
  const [dados, setDados] = useState(null);
  const [op, setOp] = useState(null);
  const [seg, setSeg] = useState(null);
  const [pub, setPub] = useState(null);
  const [erro, setErro] = useState('');
  const [toast, setToast] = useState(null);
  const [novoCusto, setNovoCusto] = useState({ nome: '', valor: '', ciclo: 'mês', renova: '' });
  const [novoReg, setNovoReg] = useState({ nome: '', tipo: '', renova: '' });
  const [novaCamp, setNovaCamp] = useState({ nome: '', anunciante: '', texto: '', link: '', cls: 'livre', fim: '', paginas: { inicio: true, sorteio: false, p: false } });

  async function recarregarPub() { try { setPub(await apiFetch('/api/super/gabinete/publicidade')); } catch { /* */ } }
  useEffect(() => {
    let vivo = true;
    Promise.all([
      apiFetch('/api/super/gabinete'),
      apiFetch('/api/super/gabinete/operacao'),
      apiFetch('/api/denuncias/agregados').catch(() => null),
      apiFetch('/api/super/gabinete/publicidade').catch(() => null),
    ]).then(([g, o, s, pb]) => { if (!vivo) return; setDados(g); setOp(o); setSeg(s); setPub(pb); })
      .catch((e) => vivo && setErro(e.message));
    return () => { vivo = false; };
  }, []);

  async function guardarOp(next) {
    const anterior = op; setOp(next);
    try { const salvo = await apiFetch('/api/super/gabinete/operacao', { method: 'PUT', body: JSON.stringify(next) }); setOp(salvo); setToast({ tipo: 'success', mensagem: 'Salvo.' }); recarregarPub(); }
    catch (e) { setOp(anterior); setToast({ tipo: 'error', mensagem: e.message }); }
  }
  const uid = () => (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `c${Date.now()}`);
  function addCampanha() {
    if (!novaCamp.nome.trim()) return;
    const paginas = Object.entries(novaCamp.paginas).filter(([, v]) => v).map(([k]) => k);
    const c = { id: uid(), nome: novaCamp.nome.trim(), anunciante: novaCamp.anunciante.trim(), texto: novaCamp.texto.trim() || novaCamp.nome.trim(), sub: novaCamp.anunciante.trim(), cta: 'Ver', link: novaCamp.link.trim(), cls: novaCamp.cls, inicio: '', fim: novaCamp.fim.trim(), paginas, estado: 'ativa' };
    guardarOp({ ...op, campanhas: [...(op.campanhas || []), c] });
    setNovaCamp({ nome: '', anunciante: '', texto: '', link: '', cls: 'livre', fim: '', paginas: { inicio: true, sorteio: false, p: false } });
  }
  const setEstadoCamp = (id, estado) => guardarOp({ ...op, campanhas: op.campanhas.map((c) => (c.id === id ? { ...c, estado } : c)) });
  const delCamp = (id) => guardarOp({ ...op, campanhas: op.campanhas.filter((c) => c.id !== id) });
  const setToggle = (pag, on) => guardarOp({ ...op, toggles: { ...(op.toggles || {}), [pag]: on } });
  const addCusto = () => { if (!novoCusto.nome.trim()) return; guardarOp({ ...op, custos: [...(op.custos || []), { nome: novoCusto.nome.trim(), desc: '', valor: Number(novoCusto.valor) || 0, ciclo: novoCusto.ciclo, renova: novoCusto.renova.trim(), estado: (Number(novoCusto.valor) || 0) === 0 ? 'free' : 'ativo' }] }); setNovoCusto({ nome: '', valor: '', ciclo: 'mês', renova: '' }); };
  const delCusto = (i) => guardarOp({ ...op, custos: op.custos.filter((_, k) => k !== i) });
  const addReg = () => { if (!novoReg.nome.trim()) return; guardarOp({ ...op, registos: [...(op.registos || []), { nome: novoReg.nome.trim(), tipo: novoReg.tipo.trim(), renova: novoReg.renova.trim(), dias: null }] }); setNovoReg({ nome: '', tipo: '', renova: '' }); };
  const delReg = (i) => guardarOp({ ...op, registos: op.registos.filter((_, k) => k !== i) });

  if (erro) return <div className="app-shell"><main className="app-main" style={{ padding: 24 }}><p className="muted">{erro}</p><Link to="/home" className="muted">← Início</Link></main></div>;
  if (!dados || !op) return <LoadingFutty legenda="Carregando o Gabinete…" />;

  const p = dados.pulso;
  const c = dados.crescimento;
  const v = dados.vida;
  const estCls = { ativo: 'gab-ok', free: 'gab-free', uso: 'gab-uso' };
  const estLbl = { ativo: 'ativo', free: 'grátis', uso: 'por uso' };
  const perMes = (x) => (x.estado === 'free' ? 0 : x.ciclo === 'ano' ? x.valor / 12 : x.valor);
  const burn = Math.round((op.custos || []).reduce((s, x) => s + perMes(x), 0));
  // Proteção de dados (LGPD) — do store; helpers para o bloco editável.
  const pd = op.protecao_dados || { dpas: [], politica_privacidade: {}, termos_uso: {}, canal_titular: {} };
  const hoje = () => new Date().toISOString().slice(0, 10);
  const selBase = { fontSize: 11, fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, padding: '4px 8px', borderRadius: 20, cursor: 'pointer', background: 'transparent' };
  const selDpa = (estado) => (estado === 'aceite' ? { ...selBase, color: '#7bd88f', border: '1px solid rgba(123,216,143,.4)' } : estado === 'n.a.' ? { ...selBase, color: '#8ab4ff', border: '1px solid rgba(138,180,255,.4)' } : { ...selBase, color: '#fda4af', border: '1px solid rgba(253,164,175,.5)' });

  return (
    <div className="app-shell gab">
      <GabCSS />
      <main className="app-main page-reveal" style={{ maxWidth: 1180, padding: '20px 16px 60px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
          <h1 className="gab-h1">Gabinete <span style={{ color: OURO2 }}>do Dono</span></h1>
          <Link to="/home" className="gab-n" style={{ textDecoration: 'none' }}>← Início</Link>
        </div>
        <p className="gab-sub">Rota super-admin. A história do produto de relance — o dono é <b>cego ao conteúdo</b>, só números.</p>

        {/* PULSO DO DIA */}
        <div className="gab-card gab-head">
          <div className="gab-g">Pulso do dia</div>
          <div className="gab-pulse">
            <Kpi v={p.users_hoje} l="usuários hoje" cls="up" />
            <Kpi v={p.jogos_hoje} l="jogos hoje" />
            <Kpi v={p.denuncias_abertas} l="denúncias abertas" />
            <Kpi v={p.mrr ?? '—'} l="MRR" />
          </div>
        </div>

        {/* CRESCIMENTO */}
        <Hud h2="Crescimento" n="por semana · últimas 8" />
        <div className="gab-cards c3">
          <div className="gab-card"><h3>Usuários</h3><div className="gab-big">{c.users.at(-1)}</div>{SVG(lineChart(c.users, OURO2, 260, 92))}</div>
          <div className="gab-card"><h3>Times</h3><div className="gab-big">{c.equipas.at(-1)}</div>{SVG(barChart(c.equipas, OURO, 260, 92))}</div>
          <div className="gab-card"><h3>Campeonatos</h3><div className="gab-big">{c.camp.at(-1)}</div>{SVG(lineChart(c.camp, ROXO, 260, 92))}</div>
        </div>

        {/* RECEITA — em breve (IAP das lojas por ligar; Stripe pausado — SPEC-INFRA) */}
        <Hud h2="Receita" breve="Falta ligar o IAP das lojas" />
        <Vazio>A receita acende quando a vaga <b>App nas lojas</b> ligar o <b>IAP</b> (Apple/Google). Até lá, MRR, assinantes e entradas ficam <b>em breve</b> — sem números inventados.</Vazio>

        {/* PUBLICIDADE — a valer: campanhas + medição + toggles por página */}
        <Hud h2="Publicidade" n="campanhas · medição nossa (impressão/clique) · lei de menores no motor" />
        {(pub?.alertas || []).length ? (
          <div className="gab-card" style={{ marginBottom: 12, borderColor: 'rgba(253,164,175,.35)' }}>
            {pub.alertas.map((a, i) => <div key={i} className="gab-osub" style={{ color: '#fda4af', padding: '2px 0' }}>⚠ {a}</div>)}
          </div>
        ) : null}
        <div className="gab-cards c2">
          <div className="gab-card">
            <h3>Campanhas</h3>
            {(pub?.campanhas || []).length === 0 ? <div className="gab-osub" style={{ padding: '8px 0' }}>Sem campanhas. Crie a 1ª abaixo.</div>
              : pub.campanhas.map((c) => {
                const ctr = c.imp ? (c.cli / c.imp * 100).toFixed(1) : '0.0';
                return (
                  <div key={c.id} className="gab-oprow" style={{ gridTemplateColumns: '1.4fr .9fr auto auto' }}>
                    <div><div className="gab-nm">{c.nome}</div><div className="gab-osub">{c.anunciante || '—'} · {(c.paginas || []).join(', ') || 'sem página'} · <span style={{ color: c.cls === 'livre' ? '#7bd88f' : '#fda4af' }}>{c.cls === 'livre' ? 'livre' : '18+'}</span></div></div>
                    <div className="gab-osub">{c.imp} imp · {c.cli} cli · CTR {ctr}%{c.dias_restantes != null ? ` · ${c.dias_restantes}d` : ''}</div>
                    <span className={`gab-chip ${c.estado === 'ativa' ? 'gab-ok' : c.estado === 'pausada' ? 'gab-uso' : 'gab-warn'}`} style={{ cursor: 'pointer' }} onClick={() => setEstadoCamp(c.id, c.estado === 'ativa' ? 'pausada' : 'ativa')}>{c.estado === 'ativa' ? 'ativa' : c.estado === 'pausada' ? 'pausada ▸' : 'terminada'}</span>
                    <div className="gab-del" title="remover" onClick={() => delCamp(c.id)}>✕</div>
                  </div>
                );
              })}
            <div className="gab-form">
              <input placeholder="Nome da campanha" style={{ flex: '1.3 1 110px' }} value={novaCamp.nome} onChange={(e) => setNovaCamp({ ...novaCamp, nome: e.target.value })} />
              <input placeholder="Anunciante" style={{ flex: '1 1 90px' }} value={novaCamp.anunciante} onChange={(e) => setNovaCamp({ ...novaCamp, anunciante: e.target.value })} />
              <input placeholder="Texto do banner" style={{ flex: '1.3 1 110px' }} value={novaCamp.texto} onChange={(e) => setNovaCamp({ ...novaCamp, texto: e.target.value })} />
              <input placeholder="Link" style={{ flex: '1 1 90px' }} value={novaCamp.link} onChange={(e) => setNovaCamp({ ...novaCamp, link: e.target.value })} />
              <select value={novaCamp.cls} onChange={(e) => setNovaCamp({ ...novaCamp, cls: e.target.value })}><option value="livre">livre</option><option value="18+">18+</option></select>
              <input placeholder="fim (YYYY-MM-DD)" style={{ width: 120 }} value={novaCamp.fim} onChange={(e) => setNovaCamp({ ...novaCamp, fim: e.target.value })} />
              {['inicio', 'sorteio', 'p'].map((pg) => (
                <label key={pg} style={{ fontSize: 11, color: '#c9c2d6', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <input type="checkbox" checked={!!novaCamp.paginas[pg]} onChange={(e) => setNovaCamp({ ...novaCamp, paginas: { ...novaCamp.paginas, [pg]: e.target.checked } })} />{pg}
                </label>
              ))}
              <button type="button" className="gab-add" onClick={addCampanha}>+ Criar campanha</button>
              <span style={{ flexBasis: '100%', fontSize: 10.5, color: '#7a7a86' }}>classificação por campanha (livre/18+ · sem cls = 18+ fail-closed); menor/anônimo só recebe "livre".</span>
            </div>
          </div>
          <div className="gab-card">
            <h3>Interruptores por página <span style={{ fontWeight: 400, color: '#8a8a98', textTransform: 'none' }}>(default OFF)</span></h3>
            {['inicio', 'sorteio', 'p'].map((pg) => (
              <div key={pg} className="gab-planrow">
                <span style={{ flex: 1, fontSize: 13, color: '#c9c2d6' }}>{pg === 'inicio' ? 'Início' : pg === 'sorteio' ? 'Sorteio in-app' : 'Pública /p/'}</span>
                <input type="checkbox" checked={!!op.toggles?.[pg]} onChange={(e) => setToggle(pg, e.target.checked)} style={{ width: 20, height: 20, accentColor: '#8b5cf6' }} />
                <span className={`gab-chip ${op.toggles?.[pg] ? 'gab-ok' : 'gab-warn'}`}>{op.toggles?.[pg] ? 'ON' : 'OFF'}</span>
              </div>
            ))}
            <p className="gab-muted" style={{ marginTop: 12 }}>Página desligada → nenhum anúncio aí, mesmo com campanha. A lei de menores roda no servidor a cada pedido.</p>
          </div>
        </div>

        {/* OPERAÇÃO — a secção que administra (editável) */}
        <Hud h2="Operação" n="finanças & infra · a seção que administra" />
        <div className="gab-cards c2">
          <div className="gab-card">
            <h3>Custos fixos da casa</h3>
            {(op.custos || []).map((x, i) => (
              <div key={i} className="gab-oprow gab-custos">
                <div><div className="gab-nm">{x.nome}</div><div className="gab-osub">{x.desc}</div></div>
                <div className="gab-val">€{x.valor}</div>
                <div className="gab-osub">/{x.ciclo}{x.renova ? ` · renova ${x.renova}` : ''}</div>
                <span className={`gab-chip ${estCls[x.estado] || 'gab-ok'}`}>{estLbl[x.estado] || x.estado}</span>
                <div className="gab-del" title="remover" onClick={() => delCusto(i)}>✕</div>
              </div>
            ))}
            <div className="gab-form">
              <input placeholder="Serviço" style={{ flex: '1.3 1 90px' }} value={novoCusto.nome} onChange={(e) => setNovoCusto({ ...novoCusto, nome: e.target.value })} />
              <input placeholder="€" style={{ width: 52 }} value={novoCusto.valor} onChange={(e) => setNovoCusto({ ...novoCusto, valor: e.target.value })} />
              <select value={novoCusto.ciclo} onChange={(e) => setNovoCusto({ ...novoCusto, ciclo: e.target.value })}><option>mês</option><option>ano</option><option>uso</option></select>
              <input placeholder="próxima renovação" style={{ flex: '1 1 90px' }} value={novoCusto.renova} onChange={(e) => setNovoCusto({ ...novoCusto, renova: e.target.value })} />
              <button type="button" className="gab-add" onClick={addCusto}>+ Adicionar custo</button>
            </div>
          </div>
          <div className="gab-card">
            <h3>Burn & margem</h3>
            <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div><div className="gab-big" style={{ color: '#fda4af' }}>€{burn}</div><span className="gab-muted">custos / mês</span></div>
              <div><div className="gab-big">—</div><span className="gab-muted">MRR (IAP)</span></div>
              <div><div className="gab-big">—</div><span className="gab-muted">margem líquida</span></div>
            </div>
            <div className="gab-burnbar"><i style={{ width: '100%', background: '#fda4af' }} /></div>
            <p className="gab-muted" style={{ marginTop: 10 }}>Ligue o <b>IAP das lojas</b> para a margem e o "paga-se?" (comissão da loja incluída). Por agora, só o <b>burn</b> (€{burn}/mês).</p>
          </div>
        </div>
        <div className="gab-cards c2" style={{ marginTop: 12 }}>
          <div className="gab-card">
            <h3>Registros & prazos</h3>
            {(op.registos || []).map((r, i) => (
              <div key={i} className="gab-oprow gab-regs">
                <div><div className="gab-nm">{r.nome}</div><div className="gab-osub">{r.tipo}</div></div>
                <div className="gab-osub">{r.renova ? `renova ${r.renova}` : 'sem data'}</div>
                {r.dias != null ? <span className={`gab-chip ${r.dias < 30 ? 'gab-warn' : 'gab-ok'}`}>{r.dias}d{r.dias < 30 ? ' ⚠' : ''}</span> : <span className="gab-osub">sem prazo</span>}
                <div className="gab-del" title="remover" onClick={() => delReg(i)}>✕</div>
              </div>
            ))}
            <div className="gab-form">
              <input placeholder="Registro (marca, licença…)" style={{ flex: '1.4 1 110px' }} value={novoReg.nome} onChange={(e) => setNovoReg({ ...novoReg, nome: e.target.value })} />
              <input placeholder="tipo / entidade" style={{ flex: '1 1 90px' }} value={novoReg.tipo} onChange={(e) => setNovoReg({ ...novoReg, tipo: e.target.value })} />
              <input placeholder="data de renovação" style={{ flex: '1 1 90px' }} value={novoReg.renova} onChange={(e) => setNovoReg({ ...novoReg, renova: e.target.value })} />
              <button type="button" className="gab-add" onClick={addReg}>+ Adicionar registro</button>
            </div>
          </div>
          <div className="gab-card">
            <h3>Cobertura de venda</h3>
            <div className="gab-muted">Onde o mundo nos compra</div>
            <div className="gab-cov">{(op.cobertura?.vende || []).map((x, i) => <span key={i} className="on">{x}</span>)}</div>
            <div className="gab-muted" style={{ marginTop: 10 }}>Onde ainda não</div>
            <div className="gab-cov">{(op.cobertura?.bloqueado || []).map((x, i) => <span key={i} className="off">{x}</span>)}</div>
            <p className="gab-muted" style={{ marginTop: 10 }}>Informativo — à mão + o que a loja expõe (IAP).</p>
          </div>
        </div>

        {/* PROTEÇÃO DE DADOS (LGPD) — mesma família "papéis da casa" que Registos & Prazos */}
        <Hud h2="Proteção de dados" n="LGPD · DPAs, política, termos, canal do titular (editável à mão)" />
        {!ESTADOS_PUBLICADOS.includes(pd.politica_privacidade?.estado) ? (
          <div className="gab-card" style={{ marginBottom: 12, borderColor: 'rgba(253,164,175,.4)' }}>
            <span className="gab-osub" style={{ color: '#fda4af' }}>⚠ Política de privacidade <b>ainda não publicada</b> — bloqueia o envio às lojas (App Store / Play Store) e o compliance LGPD.</span>
          </div>
        ) : pd.politica_privacidade?.estado === 'publicada (revisão jurídica pendente)' ? (
          <div className="gab-card" style={{ marginBottom: 12, borderColor: 'rgba(240,201,74,.35)' }}>
            <span className="gab-osub" style={{ color: '#f0c94a' }}>ℹ Política e termos <b>publicados</b> (<Link to="/privacidade" style={{ color: '#f0c94a' }}>/privacidade</Link> · <Link to="/termos" style={{ color: '#f0c94a' }}>/termos</Link>) — ainda em <b>revisão jurídica</b> antes do envio às lojas.</span>
          </div>
        ) : null}
        <div className="gab-cards c2">
          <div className="gab-card">
            <h3>DPAs por operador</h3>
            {(pd.dpas || []).map((d, i) => (
              <div key={i} className="gab-oprow" style={{ gridTemplateColumns: '0.8fr auto 1.1fr' }}>
                <div className="gab-nm">{d.nome}</div>
                <select value={d.estado} onChange={(e) => guardarOp({ ...op, protecao_dados: { ...pd, dpas: pd.dpas.map((x, k) => (k === i ? { ...x, estado: e.target.value } : x)) } })} style={selDpa(d.estado)}>
                  <option>por tratar</option><option>aceite</option><option>n.a.</option>
                </select>
                <input placeholder="link do DPA" defaultValue={d.link} onBlur={(e) => guardarOp({ ...op, protecao_dados: { ...pd, dpas: pd.dpas.map((x, k) => (k === i ? { ...x, link: e.target.value, data: e.target.value && !x.data ? hoje() : x.data } : x)) } })} style={{ fontSize: 11, color: '#e8e8ef', background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.14)', padding: '5px 7px', borderRadius: 6, minWidth: 0 }} />
              </div>
            ))}
          </div>
          <div className="gab-card">
            <h3>Documentos & canal do titular</h3>
            {[['politica_privacidade', 'Política de privacidade'], ['termos_uso', 'Termos de uso']].map(([k, label]) => (
              <div key={k} className="gab-oprow" style={{ gridTemplateColumns: '1fr auto 1.1fr' }}>
                <div className="gab-nm" style={{ fontSize: 12 }}>{label}</div>
                <select value={pd[k]?.estado || 'por publicar'} onChange={(e) => guardarOp({ ...op, protecao_dados: { ...pd, [k]: { ...(pd[k] || {}), estado: e.target.value, data: ESTADOS_PUBLICADOS.includes(e.target.value) && !pd[k]?.data ? hoje() : pd[k]?.data } } })} style={selDpa(ESTADOS_PUBLICADOS.includes(pd[k]?.estado) ? 'aceite' : 'por tratar')}>
                  <option>por publicar</option><option>publicada</option><option>publicada (revisão jurídica pendente)</option>
                </select>
                <input placeholder="URL" defaultValue={pd[k]?.url} onBlur={(e) => guardarOp({ ...op, protecao_dados: { ...pd, [k]: { ...(pd[k] || {}), url: e.target.value } } })} style={{ fontSize: 11, color: '#e8e8ef', background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.14)', padding: '5px 7px', borderRadius: 6, minWidth: 0 }} />
              </div>
            ))}
            <div className="gab-oprow" style={{ gridTemplateColumns: '1fr auto 1.1fr' }}>
              <div className="gab-nm" style={{ fontSize: 12 }}>Canal do titular <span className="gab-osub">(direitos LGPD)</span></div>
              <select value={pd.canal_titular?.estado || 'por definir'} onChange={(e) => guardarOp({ ...op, protecao_dados: { ...pd, canal_titular: { ...(pd.canal_titular || {}), estado: e.target.value } } })} style={selDpa(pd.canal_titular?.estado === 'ativo' ? 'aceite' : 'por tratar')}>
                <option>por definir</option><option>ativo</option>
              </select>
              <input placeholder="email / formulário" defaultValue={pd.canal_titular?.destino} onBlur={(e) => guardarOp({ ...op, protecao_dados: { ...pd, canal_titular: { ...(pd.canal_titular || {}), destino: e.target.value } } })} style={{ fontSize: 11, color: '#e8e8ef', background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.14)', padding: '5px 7px', borderRadius: 6, minWidth: 0 }} />
            </div>
          </div>
        </div>

        {/* VIDA */}
        <Hud h2="Vida" n="atividade · últimos 7 dias" />
        <div className="gab-card"><h3>Posts · sorteios · jogos</h3>{SVG(stacked(v, 900, 140))}
          <div className="gab-legenda"><span><i style={{ background: OURO }} />posts</span><span><i style={{ background: PRATA }} />sorteios</span><span><i style={{ background: ROXO }} />jogos</span></div>
        </div>

        {/* SEGURANÇA (agregada) */}
        <Hud h2="Segurança" n="agregada · zero conteúdo" />
        {seg && seg.total > 0 ? (
          <div className="gab-cards c2">
            <div className="gab-card"><h3>Denúncias por categoria</h3>
              {Object.entries(seg.por_categoria || {}).sort((a, b) => b[1] - a[1]).map(([k, n]) => {
                const max = Math.max(...Object.values(seg.por_categoria), 1);
                return <div key={k} className="gab-planrow"><span style={{ width: 78, fontSize: 12, color: k === 'menor' ? '#fecdd3' : '#c9c2d6', textTransform: 'capitalize' }}>{k}</span><span className="gab-bar"><i style={{ width: `${(n / max * 100).toFixed(0)}%`, background: k === 'menor' ? '#fda4af' : OURO }} /></span><b style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: 13, minWidth: 24, textAlign: 'right' }}>{n}</b></div>;
              })}
            </div>
            <div className="gab-card">
              <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap' }}>
                <div><div className="gab-big" style={{ color: VERDE }}>{seg.pct_auto_resolvida}%</div><span className="gab-muted">auto-resolvida pela IA</span></div>
                <div><div className="gab-big">{seg.tempo_medio_ms != null ? `${Math.round(seg.tempo_medio_ms / 60000)}min` : '—'}</div><span className="gab-muted">tempo médio</span></div>
                <div><div className="gab-big">{seg.total}</div><span className="gab-muted">total (histórico)</span></div>
              </div>
              <p className="gab-muted" style={{ marginTop: 12 }}>Lei do dono cego: <b>zero conteúdo, zero identidade</b> — só contagens.</p>
            </div>
          </div>
        ) : <Vazio>Zero denúncias. Casa tranquila.</Vazio>}

        {/* MARCOS */}
        <Hud h2="Marcos" n="o que vale a pena celebrar" />
        {(dados.marcos || []).length ? (
          <div className="gab-card">{dados.marcos.map((m, i) => (
            <div key={i} className="gab-marco"><span className="gab-dot">{m.ic}</span><div><div className="gab-mt">{m.t}</div><div className="gab-md">{m.d}</div></div></div>
          ))}</div>
        ) : <Vazio>O 1º marco chega com o 1º campeão. Você vai querer ver isso.</Vazio>}
      </main>
      {toast ? <Toast mensagem={toast.mensagem} tipo={toast.tipo} onClose={() => setToast(null)} /> : null}
    </div>
  );
}

function Kpi({ v, l, cls }) {
  return <div className="gab-kpi"><div className={`gab-v ${cls === 'up' ? 'gab-up' : ''}`}>{v}</div><div className="gab-l">{l}</div></div>;
}

// Cânone do Gabinete (transplante do gabinete-mockup.html), scoped a .gab.
function GabCSS() {
  return (
    <style>{`
    .gab .gab-h1{font-family:'Rajdhani',sans-serif;font-weight:800;letter-spacing:.03em;margin:0;font-size:28px}
    .gab .gab-sub{color:#9a9aa8;font-size:13px;margin:2px 0 16px;line-height:1.5}
    .gab .gab-hud{display:flex;align-items:baseline;gap:10px;margin:26px 0 12px}
    .gab .gab-hud h2{font-family:'Rajdhani',sans-serif;font-weight:800;letter-spacing:.06em;font-size:16px;margin:0;color:#f0c94a;text-transform:uppercase}
    .gab .gab-n{font-size:11px;color:#8a8a98}
    .gab .gab-breve{display:inline-block;font-family:'Rajdhani',sans-serif;font-weight:800;font-size:10.5px;letter-spacing:.06em;color:#8ab4ff;border:1px solid rgba(138,180,255,.4);background:rgba(138,180,255,.08);padding:2px 8px}
    .gab .gab-card{background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);padding:14px;clip-path:polygon(8px 0,calc(100% - 8px) 0,100% 8px,100% calc(100% - 8px),calc(100% - 8px) 100%,8px 100%,0 calc(100% - 8px),0 8px)}
    .gab .gab-card h3{font-family:'Rajdhani',sans-serif;font-weight:700;font-size:12px;letter-spacing:.05em;color:#9a8fc0;text-transform:uppercase;margin:0 0 10px}
    .gab .gab-cards{display:grid;gap:12px}
    @media(min-width:820px){.gab .gab-cards.c3{grid-template-columns:repeat(3,1fr)}.gab .gab-cards.c2{grid-template-columns:repeat(2,1fr)}}
    .gab .gab-big{font-family:'Rajdhani',sans-serif;font-weight:800;font-size:28px;color:#f0c94a}
    .gab .gab-muted{color:#8a8a98;font-size:12px}
    .gab .gab-head{padding:16px}
    .gab .gab-g{font-family:'Rajdhani',sans-serif;font-weight:800;font-size:20px;letter-spacing:.03em}
    .gab .gab-pulse{display:grid;gap:10px;margin-top:12px;grid-template-columns:repeat(2,1fr)}
    @media(min-width:640px){.gab .gab-pulse{grid-template-columns:repeat(4,1fr)}}
    .gab .gab-kpi{padding:12px 13px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);clip-path:polygon(6px 0,calc(100% - 6px) 0,100% 6px,100% calc(100% - 6px),calc(100% - 6px) 100%,6px 100%,0 calc(100% - 6px),0 6px)}
    .gab .gab-v{font-family:'Rajdhani',sans-serif;font-weight:800;font-size:24px;color:#fff;line-height:1}
    .gab .gab-v.gab-up{color:#7bd88f}
    .gab .gab-l{font-size:10.5px;color:#8a8a98;text-transform:uppercase;letter-spacing:.06em;margin-top:5px}
    .gab .gab-vazio{color:#8a8a98;font-size:13px;line-height:1.6;text-align:center;padding:20px 16px}
    .gab .gab-planrow{display:flex;align-items:center;gap:10px;padding:7px 0;border-top:1px solid rgba(255,255,255,.06)}
    .gab .gab-planrow:first-child{border-top:none}
    .gab .gab-bar{height:9px;border-radius:5px;background:rgba(255,255,255,.06);overflow:hidden;flex:1}
    .gab .gab-bar>i{display:block;height:100%}
    .gab .gab-legenda{display:flex;gap:14px;flex-wrap:wrap;font-size:11px;color:#9a9aa8;margin-top:8px}
    .gab .gab-legenda i{width:9px;height:9px;display:inline-block;margin-right:5px;border-radius:2px;vertical-align:middle}
    .gab .gab-marco{display:flex;gap:11px;padding:11px 0;border-top:1px solid rgba(255,255,255,.06)}
    .gab .gab-marco:first-child{border-top:none}
    .gab .gab-dot{width:30px;height:30px;flex-shrink:0;display:grid;place-items:center;background:rgba(212,160,23,.12);border:1px solid rgba(212,160,23,.4);font-size:14px;clip-path:polygon(5px 0,calc(100% - 5px) 0,100% 5px,100% calc(100% - 5px),calc(100% - 5px) 100%,5px 100%,0 calc(100% - 5px),0 5px)}
    .gab .gab-mt{font-family:'Rajdhani',sans-serif;font-weight:700;font-size:14px}
    .gab .gab-md{font-size:11px;color:#8a8a98}
    .gab .gab-oprow{display:grid;align-items:center;gap:8px;padding:9px 0;border-top:1px solid rgba(255,255,255,.06);font-size:12.5px}
    .gab .gab-oprow:first-of-type{border-top:none}
    .gab .gab-custos{grid-template-columns:1.3fr .5fr 1fr auto auto}
    .gab .gab-regs{grid-template-columns:1.5fr 1fr auto auto}
    .gab .gab-nm{font-family:'Rajdhani',sans-serif;font-weight:700;font-size:13.5px;color:#eee}
    .gab .gab-osub{font-size:11px;color:#8a8a98}
    .gab .gab-val{font-family:'Rajdhani',sans-serif;font-weight:800;color:#f0c94a}
    .gab .gab-del{color:#6a6a76;cursor:pointer;font-size:14px;text-align:center}
    .gab .gab-chip{font-family:'Rajdhani',sans-serif;font-weight:700;font-size:10px;letter-spacing:.04em;padding:2px 7px;border-radius:20px;white-space:nowrap}
    .gab .gab-ok{color:#7bd88f;border:1px solid rgba(123,216,143,.4);background:rgba(123,216,143,.08)}
    .gab .gab-free{color:#8ab4ff;border:1px solid rgba(138,180,255,.4);background:rgba(138,180,255,.08)}
    .gab .gab-uso{color:#f0c94a;border:1px solid rgba(212,160,23,.4);background:rgba(212,160,23,.08)}
    .gab .gab-warn{color:#fda4af;border:1px solid rgba(253,164,175,.5);background:rgba(253,164,175,.1)}
    .gab .gab-form{display:flex;gap:7px;flex-wrap:wrap;align-items:center;margin-top:12px;padding-top:12px;border-top:1px dashed rgba(255,255,255,.12)}
    .gab .gab-form input,.gab .gab-form select{font-family:'Inter',sans-serif;font-size:12px;color:#e8e8ef;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.14);padding:6px 8px;border-radius:6px;min-width:0}
    .gab .gab-add{font-family:'Rajdhani',sans-serif;font-weight:800;font-size:12px;letter-spacing:.04em;color:#0d0d12;background:linear-gradient(180deg,#f5e070,#d4a017);border:none;padding:7px 13px;border-radius:6px;cursor:pointer}
    .gab .gab-burnbar{height:12px;border-radius:6px;background:rgba(255,255,255,.06);overflow:hidden;display:flex;margin-top:6px}
    .gab .gab-burnbar>i{display:block;height:100%}
    .gab .gab-cov{display:flex;gap:7px;flex-wrap:wrap;margin-top:8px}
    .gab .gab-cov span{font-size:11.5px;padding:3px 9px;border-radius:20px}
    .gab .gab-cov .on{color:#7bd88f;border:1px solid rgba(123,216,143,.35);background:rgba(123,216,143,.06)}
    .gab .gab-cov .off{color:#7a7a86;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.02)}
    `}</style>
  );
}
