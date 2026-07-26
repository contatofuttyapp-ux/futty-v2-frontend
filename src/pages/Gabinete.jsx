// Futty v2.0 — Gabinete do Dono (/gabinete). Rota super-admin (guard no servidor E no
// cliente). Linha do tempo scrollável no cânone (vidro/aurora/45°/Rajdhani) — transplante
// do gabinete-mockup.html. Lei: o dono é CEGO ao conteúdo (só números). Receita/Publicidade
// = "em breve" digno enquanto a fonte real (Stripe / medição de ads) não existir.
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../lib/api';
import LoadingFutty from '../components/LoadingFutty';
import Toast from '../components/Toast';

const OURO = '#d4a017'; const OURO2 = '#f0c94a'; const ROXO = '#8b5cf6'; const PRATA = '#aab4c8'; const VERDE = '#7bd88f';

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
  const [erro, setErro] = useState('');
  const [toast, setToast] = useState(null);
  const [novoCusto, setNovoCusto] = useState({ nome: '', valor: '', ciclo: 'mês', renova: '' });
  const [novoReg, setNovoReg] = useState({ nome: '', tipo: '', renova: '' });

  useEffect(() => {
    let vivo = true;
    Promise.all([
      apiFetch('/api/super/gabinete'),
      apiFetch('/api/super/gabinete/operacao'),
      apiFetch('/api/denuncias/agregados').catch(() => null),
    ]).then(([g, o, s]) => { if (!vivo) return; setDados(g); setOp(o); setSeg(s); })
      .catch((e) => vivo && setErro(e.message));
    return () => { vivo = false; };
  }, []);

  async function guardarOp(next) {
    const anterior = op; setOp(next);
    try { const salvo = await apiFetch('/api/super/gabinete/operacao', { method: 'PUT', body: JSON.stringify(next) }); setOp(salvo); setToast({ tipo: 'success', mensagem: 'Guardado.' }); }
    catch (e) { setOp(anterior); setToast({ tipo: 'error', mensagem: e.message }); }
  }
  const addCusto = () => { if (!novoCusto.nome.trim()) return; guardarOp({ ...op, custos: [...(op.custos || []), { nome: novoCusto.nome.trim(), desc: '', valor: Number(novoCusto.valor) || 0, ciclo: novoCusto.ciclo, renova: novoCusto.renova.trim(), estado: (Number(novoCusto.valor) || 0) === 0 ? 'free' : 'ativo' }] }); setNovoCusto({ nome: '', valor: '', ciclo: 'mês', renova: '' }); };
  const delCusto = (i) => guardarOp({ ...op, custos: op.custos.filter((_, k) => k !== i) });
  const addReg = () => { if (!novoReg.nome.trim()) return; guardarOp({ ...op, registos: [...(op.registos || []), { nome: novoReg.nome.trim(), tipo: novoReg.tipo.trim(), renova: novoReg.renova.trim(), dias: null }] }); setNovoReg({ nome: '', tipo: '', renova: '' }); };
  const delReg = (i) => guardarOp({ ...op, registos: op.registos.filter((_, k) => k !== i) });

  if (erro) return <div className="app-shell"><main className="app-main" style={{ padding: 24 }}><p className="muted">{erro}</p><Link to="/home" className="muted">← Início</Link></main></div>;
  if (!dados || !op) return <LoadingFutty legenda="A carregar o Gabinete…" />;

  const p = dados.pulso;
  const c = dados.crescimento;
  const v = dados.vida;
  const estCls = { ativo: 'gab-ok', free: 'gab-free', uso: 'gab-uso' };
  const estLbl = { ativo: 'ativo', free: 'grátis', uso: 'por uso' };
  const perMes = (x) => (x.estado === 'free' ? 0 : x.ciclo === 'ano' ? x.valor / 12 : x.valor);
  const burn = Math.round((op.custos || []).reduce((s, x) => s + perMes(x), 0));

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
            <Kpi v={p.users_hoje} l="users hoje" cls="up" />
            <Kpi v={p.jogos_hoje} l="jogos hoje" />
            <Kpi v={p.denuncias_abertas} l="denúncias abertas" />
            <Kpi v={p.mrr ?? '—'} l="MRR" />
          </div>
        </div>

        {/* CRESCIMENTO */}
        <Hud h2="Crescimento" n="por semana · últimas 8" />
        <div className="gab-cards c3">
          <div className="gab-card"><h3>Utilizadores</h3><div className="gab-big">{c.users.at(-1)}</div>{SVG(lineChart(c.users, OURO2, 260, 92))}</div>
          <div className="gab-card"><h3>Equipas</h3><div className="gab-big">{c.equipas.at(-1)}</div>{SVG(barChart(c.equipas, OURO, 260, 92))}</div>
          <div className="gab-card"><h3>Campeonatos</h3><div className="gab-big">{c.camp.at(-1)}</div>{SVG(lineChart(c.camp, ROXO, 260, 92))}</div>
        </div>

        {/* RECEITA — em breve (Stripe por ligar) */}
        <Hud h2="Receita" breve="Stripe por ligar" />
        <Vazio>A receita acende quando ligares o <b>Stripe</b>. Até lá, MRR, assinantes e entradas ficam <b>em breve</b> — sem números inventados.</Vazio>

        {/* PUBLICIDADE — em breve (medição de ads por construir) */}
        <Hud h2="Publicidade" breve="motor por ligar" />
        <Vazio>Sem campanhas ativas. O slot existe nas páginas (interruptores <b>OFF</b>); a medição (impressão/clique) e a 1ª campanha nascem aqui quando o motor de ads entrar.</Vazio>

        {/* OPERAÇÃO — a secção que administra (editável) */}
        <Hud h2="Operação" n="finanças & infra · a secção que administra" />
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
              <div><div className="gab-big">—</div><span className="gab-muted">MRR (Stripe)</span></div>
              <div><div className="gab-big">—</div><span className="gab-muted">margem líquida</span></div>
            </div>
            <div className="gab-burnbar"><i style={{ width: '100%', background: '#fda4af' }} /></div>
            <p className="gab-muted" style={{ marginTop: 10 }}>Liga o <b>Stripe</b> para a margem e o "paga-se?". Por agora, só o <b>burn</b> (€{burn}/mês).</p>
          </div>
        </div>
        <div className="gab-cards c2" style={{ marginTop: 12 }}>
          <div className="gab-card">
            <h3>Registos & prazos</h3>
            {(op.registos || []).map((r, i) => (
              <div key={i} className="gab-oprow gab-regs">
                <div><div className="gab-nm">{r.nome}</div><div className="gab-osub">{r.tipo}</div></div>
                <div className="gab-osub">{r.renova ? `renova ${r.renova}` : 'sem data'}</div>
                {r.dias != null ? <span className={`gab-chip ${r.dias < 30 ? 'gab-warn' : 'gab-ok'}`}>{r.dias}d{r.dias < 30 ? ' ⚠' : ''}</span> : <span className="gab-osub">sem prazo</span>}
                <div className="gab-del" title="remover" onClick={() => delReg(i)}>✕</div>
              </div>
            ))}
            <div className="gab-form">
              <input placeholder="Registo (marca, licença…)" style={{ flex: '1.4 1 110px' }} value={novoReg.nome} onChange={(e) => setNovoReg({ ...novoReg, nome: e.target.value })} />
              <input placeholder="tipo / entidade" style={{ flex: '1 1 90px' }} value={novoReg.tipo} onChange={(e) => setNovoReg({ ...novoReg, tipo: e.target.value })} />
              <input placeholder="data de renovação" style={{ flex: '1 1 90px' }} value={novoReg.renova} onChange={(e) => setNovoReg({ ...novoReg, renova: e.target.value })} />
              <button type="button" className="gab-add" onClick={addReg}>+ Adicionar registo</button>
            </div>
          </div>
          <div className="gab-card">
            <h3>Cobertura de venda</h3>
            <div className="gab-muted">Onde o mundo nos compra</div>
            <div className="gab-cov">{(op.cobertura?.vende || []).map((x, i) => <span key={i} className="on">{x}</span>)}</div>
            <div className="gab-muted" style={{ marginTop: 10 }}>Onde ainda não</div>
            <div className="gab-cov">{(op.cobertura?.bloqueado || []).map((x, i) => <span key={i} className="off">{x}</span>)}</div>
            <p className="gab-muted" style={{ marginTop: 10 }}>Informativo — à mão + o que o Stripe expõe.</p>
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
        ) : <Vazio>O 1º marco chega com o 1º campeão. Vais querer ver isto.</Vazio>}
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
