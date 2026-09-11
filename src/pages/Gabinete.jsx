// Futty v2.0 — Gabinete do Dono (/gabinete). Gabinete 2.0 (11-set,
// PAINEL-E-CUSTOS.md secção 6): substitui as duas páginas antigas (/gabinete
// com 16 secções + /super) por UMA página com 5 abas, desktop primeiro (menu
// lateral de abas à esquerda, conteúdo largo à direita, tabelas sem esconder
// colunas). No celular as abas viram scroll horizontal no topo.
//
// Um pedido só (GET /resumo) alimenta Visão geral/Dinheiro/Segurança/
// Registros; Pessoas & times usa os endpoints próprios (paginação e ações).
// O que saiu da tela (MRR, Cobertura de venda, DPAs por operador,
// Interruptores por página, Burn & margem, Documentos & canal do titular)
// continua no código, atrás da flag MOSTRAR_AVANCADO (src/config/flags.js).
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { apiFetch } from '../lib/api';
import LoadingFutty from '../components/LoadingFutty';
import Toast from '../components/Toast';
import PessoasTimes from './gabinete/PessoasTimes';
import { MOSTRAR_AVANCADO } from '../config/flags';

const CARD = { background: '#111111', border: '1px solid #222222', borderRadius: 12 };
const btn = {
  padding: '6px 10px', borderRadius: 8, border: '1px solid #2a2a2a', background: '#0c0c0c',
  color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer',
};
const btnGold = { ...btn, background: 'linear-gradient(180deg,#f5e070,#d4a017)', color: '#0d0d12', border: 'none', padding: '8px 16px' };
const th = { textAlign: 'left', padding: '8px 10px', fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid #222' };
const td = { padding: '6px 8px', fontSize: 13, borderBottom: '1px solid #1a1a1a', verticalAlign: 'middle' };
const inp = { fontSize: 12, color: '#e8e8ef', background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.14)', padding: '6px 8px', borderRadius: 6, width: '100%', boxSizing: 'border-box' };

const CORES = { verde: '#7bd88f', amarelo: '#f0c94a', vermelho: '#fda4af', cinza: '#8a8a98' };
function Semaforo({ cor, children }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
      <span style={{ width: 9, height: 9, borderRadius: '50%', background: CORES[cor] || CORES.cinza, flexShrink: 0 }} />
      <span style={{ fontSize: 13, color: '#ddd' }}>{children}</span>
    </span>
  );
}

function hojeISO() { return new Date().toISOString().slice(0, 10); }
function fmtUptime(s) {
  if (!s && s !== 0) return '-';
  const d = Math.floor(s / 86400); const h = Math.floor((s % 86400) / 3600); const m = Math.floor((s % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}min`;
  return `${m}min`;
}
function fmtUSD(n) { return `US$${Number(n || 0).toFixed(2)}`; }
function diasAte(dataISO) {
  if (!dataISO) return null;
  const ms = new Date(`${dataISO}T00:00:00Z`) - new Date(`${hojeISO()}T00:00:00Z`);
  return Math.round(ms / 86400000);
}
const uid = () => (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID().slice(0, 8) : `c${Date.now()}`);

function Card6({ n, legenda, sub }) {
  return (
    <div style={{ ...CARD, padding: 16 }}>
      <div style={{ fontSize: 26, fontWeight: 800, color: '#fff', fontFamily: "'Rajdhani',sans-serif" }}>{n}</div>
      {sub ? <div style={{ fontSize: 12, color: '#f0c94a', marginTop: 2 }}>{sub}</div> : null}
      <div style={{ fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '.06em', marginTop: 6 }}>{legenda}</div>
    </div>
  );
}

const ABAS = [
  { k: 'visao', label: 'Visão geral' },
  { k: 'pessoas', label: 'Pessoas & times' },
  { k: 'dinheiro', label: 'Dinheiro' },
  { k: 'seguranca', label: 'Segurança' },
  { k: 'registros', label: 'Registros & prazos' },
];

export default function Gabinete() {
  const [searchParams, setSearchParams] = useSearchParams();
  const aba = ABAS.some((a) => a.k === searchParams.get('aba')) ? searchParams.get('aba') : 'visao';

  const [dados, setDados] = useState(null); // /resumo
  const [op, setOp] = useState(null); // /operacao (objeto completo, para PUT seguro)
  const [pub, setPub] = useState(null); // /publicidade (campanhas + métricas)
  const [erro, setErro] = useState('');
  const [toast, setToast] = useState(null);

  // Cópias editáveis locais (só vão ao servidor no "Salvar" de cada bloco).
  const [custos, setCustos] = useState(null);
  const [registros, setRegistros] = useState(null);
  const [segManual, setSegManual] = useState(null);

  function carregar() {
    return Promise.all([
      apiFetch('/api/super/gabinete/resumo'),
      apiFetch('/api/super/gabinete/operacao'),
      apiFetch('/api/super/gabinete/publicidade').catch(() => null),
    ]).then(([r, o, p]) => {
      setDados(r); setOp(o); setPub(p);
      setCustos(o.custos_fixos || []);
      setRegistros(o.registros || []);
      setSegManual(o.seguranca_manual || { testes_permissao: {}, npm_audit: {}, ultima_auditoria: {} });
    });
  }

  useEffect(() => {
    let vivo = true;
    carregar().catch((e) => vivo && setErro(e.message));
    return () => { vivo = false; };
  }, []);

  function irAba(k) {
    setSearchParams((prev) => { const p = new URLSearchParams(prev); p.set('aba', k); return p; });
  }
  function showMsg(mensagem, erroToast = false) {
    setToast({ tipo: erroToast ? 'error' : 'success', mensagem });
  }

  // PUT seguro: sempre manda o objeto `op` completo com só o campo alterado
  // trocado — omitir os outros no PUT apagava campanhas/toggles/proteção de
  // dados (gravar() no backend não tem memória do que já existia).
  async function salvarParcial(campo, valor) {
    const proximo = { ...op, [campo]: valor };
    try {
      const salvo = await apiFetch('/api/super/gabinete/operacao', { method: 'PUT', body: JSON.stringify(proximo) });
      setOp(salvo);
      showMsg('Salvo.');
      return salvo;
    } catch (e) {
      showMsg(e.message, true);
      return null;
    }
  }

  if (erro) return <div className="app-shell"><main className="app-main" style={{ padding: 24 }}><p className="muted">{erro}</p><Link to="/home" className="muted">← Início</Link></main></div>;
  if (!dados || !op || !custos || !registros || !segManual) return <LoadingFutty legenda="Carregando o Gabinete…" />;

  return (
    <div className="app-shell">
      <GabCSS />
      <main className="app-main gab2-main" style={{ maxWidth: 1320, padding: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, padding: '20px 20px 0' }}>
          <h1 style={{ fontFamily: "'Rajdhani',sans-serif", fontWeight: 800, fontSize: 26, margin: 0 }}>Gabinete <span style={{ color: '#f0c94a' }}>do Dono</span></h1>
          <Link to="/home" style={{ fontSize: 12, color: 'var(--text-dim)', textDecoration: 'none' }}>← Início</Link>
        </div>

        <div className="gab2">
          <nav className="gab2-side">
            {ABAS.map((a) => (
              <button key={a.k} type="button" className={`gab2-tab ${aba === a.k ? 'ativa' : ''}`} onClick={() => irAba(a.k)}>
                {a.label}
              </button>
            ))}
          </nav>

          <div className="gab2-content">
            {aba === 'visao' && <AbaVisaoGeral dados={dados} />}
            {aba === 'pessoas' && <PessoasTimes showMsg={showMsg} />}
            {aba === 'dinheiro' && (
              <AbaDinheiro
                dados={dados} op={op} pub={pub}
                custos={custos} setCustos={setCustos}
                onSalvarCustos={() => salvarParcial('custos_fixos', custos)}
                onSalvarOp={async (campo, valor) => { await salvarParcial(campo, valor); const p = await apiFetch('/api/super/gabinete/publicidade').catch(() => null); if (p) setPub(p); }}
              />
            )}
            {aba === 'seguranca' && (
              <AbaSeguranca
                dados={dados} segManual={segManual} setSegManual={setSegManual}
                onSalvar={() => salvarParcial('seguranca_manual', segManual)}
                op={op} onSalvarOp={salvarParcial}
              />
            )}
            {aba === 'registros' && (
              <AbaRegistros registros={registros} setRegistros={setRegistros} onSalvar={() => salvarParcial('registros', registros)} />
            )}
          </div>
        </div>
      </main>
      {toast ? <Toast mensagem={toast.mensagem} tipo={toast.tipo} onClose={() => setToast(null)} /> : null}
    </div>
  );
}

// ─── ABA 1: VISÃO GERAL ──────────────────────────────────────────────────────
function AbaVisaoGeral({ dados }) {
  const v = dados.visao_geral;
  const precisa = dados.precisa_de_voce || [];
  return (
    <div>
      <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))' }}>
        <Card6 n={`${v.usuarios_novos_hoje} · ${v.usuarios_novos_7d}`} legenda="Usuários novos (hoje · 7 dias)" />
        <Card6 n={v.jogos_criados_7d} legenda="Jogos criados (7 dias)" />
        <Card6
          n={`${v.figurinhas_hoje.qtd} · ${v.figurinhas_mes.qtd}`}
          sub={`${fmtUSD(v.figurinhas_hoje.custo_usd)} hoje · ${fmtUSD(v.figurinhas_mes.custo_usd)} mês`}
          legenda="Figurinhas geradas (hoje · mês)"
        />
        <Card6 n={v.denuncias_abertas} legenda="Denúncias abertas" />
        <Card6
          n={v.ia.freeze ? 'FREEZE' : 'Normal'}
          sub={v.ia.freeze ? v.ia.motivo : null}
          legenda="Estado da IA"
        />
        <Card6 n={`v${v.servidor.versao}`} sub={`uptime ${fmtUptime(v.servidor.uptime_s)}`} legenda="Servidor" />
      </div>

      <h2 style={{ fontFamily: "'Rajdhani',sans-serif", fontWeight: 800, fontSize: 15, letterSpacing: '.05em', color: '#f0c94a', textTransform: 'uppercase', margin: '26px 0 10px' }}>Precisa de você hoje</h2>
      {precisa.length ? (
        <div style={{ ...CARD, padding: 4 }}>
          {precisa.map((p, i) => (
            <div key={i} style={{ padding: '10px 14px', borderTop: i ? '1px solid #1a1a1a' : 'none', fontSize: 13, color: '#ddd' }}>
              ⚠ {p.texto}
            </div>
          ))}
        </div>
      ) : (
        <div style={{ ...CARD, padding: 16, color: 'var(--text-dim)', fontSize: 13 }}>Nada pendente. Casa tranquila.</div>
      )}
    </div>
  );
}

// ─── ABA 3: DINHEIRO ─────────────────────────────────────────────────────────
function AbaDinheiro({ dados, op, pub, custos, setCustos, onSalvarCustos, onSalvarOp }) {
  const ia = dados.dinheiro.ia_mes;
  const [novaCamp, setNovaCamp] = useState({ nome: '', anunciante: '', texto: '', link: '', cls: 'livre', fim: '', paginas: { inicio: true, sorteio: false, p: false } });

  function editarCusto(i, campo, valor) {
    setCustos(custos.map((c, k) => (k === i ? { ...c, [campo]: valor } : c)));
  }
  function addCusto() {
    setCustos([...custos, { id: uid(), nome: '', valor: 0, moeda: 'BRL', periodicidade: 'mês', proxima_data: '', pago: true, nota: '' }]);
  }
  function delCusto(i) { setCustos(custos.filter((_, k) => k !== i)); }

  function addCampanha() {
    if (!novaCamp.nome.trim()) return;
    const paginas = Object.entries(novaCamp.paginas).filter(([, v2]) => v2).map(([k]) => k);
    const c = { id: uid(), nome: novaCamp.nome.trim(), anunciante: novaCamp.anunciante.trim(), texto: novaCamp.texto.trim() || novaCamp.nome.trim(), sub: novaCamp.anunciante.trim(), cta: 'Ver', link: novaCamp.link.trim(), cls: novaCamp.cls, inicio: '', fim: novaCamp.fim.trim(), paginas, estado: 'ativa' };
    onSalvarOp('campanhas', [...(op.campanhas || []), c]);
    setNovaCamp({ nome: '', anunciante: '', texto: '', link: '', cls: 'livre', fim: '', paginas: { inicio: true, sorteio: false, p: false } });
  }
  const setEstadoCamp = (id, estado) => onSalvarOp('campanhas', op.campanhas.map((c) => (c.id === id ? { ...c, estado } : c)));
  const delCamp = (id) => onSalvarOp('campanhas', op.campanhas.filter((c) => c.id !== id));

  const hoje = hojeISO();
  const custosVencidos = custos.filter((c) => !c.pago && c.proxima_data && c.proxima_data < hoje).length;
  const burn = MOSTRAR_AVANCADO ? Math.round(custos.reduce((s, c) => s + (c.pago === false ? 0 : Number(c.valor) || 0), 0)) : 0;

  return (
    <div>
      <h2 style={sectionH2}>Custos fixos</h2>
      {custosVencidos > 0 ? <p style={{ color: '#fda4af', fontSize: 12, margin: '0 0 8px' }}>⚠ {custosVencidos} custo(s) com data vencida.</p> : null}
      <div style={{ ...CARD, overflowX: 'auto', padding: 10 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 760 }}>
          <thead><tr><th style={th}>Nome</th><th style={th}>Valor</th><th style={th}>Moeda</th><th style={th}>Periodicidade</th><th style={th}>Próxima data</th><th style={th}>Pago</th><th style={th}>Nota</th><th style={th} /></tr></thead>
          <tbody>
            {custos.map((c, i) => {
              const vencido = !c.pago && c.proxima_data && c.proxima_data < hoje;
              return (
                <tr key={c.id || i} style={vencido ? { background: 'rgba(253,164,175,.06)' } : undefined}>
                  <td style={td}><input style={inp} value={c.nome} onChange={(e) => editarCusto(i, 'nome', e.target.value)} /></td>
                  <td style={{ ...td, width: 90 }}><input style={inp} type="number" step="0.01" value={c.valor} onChange={(e) => editarCusto(i, 'valor', Number(e.target.value))} /></td>
                  <td style={{ ...td, width: 70 }}><input style={inp} value={c.moeda} onChange={(e) => editarCusto(i, 'moeda', e.target.value)} /></td>
                  <td style={{ ...td, width: 110 }}>
                    <select style={inp} value={c.periodicidade} onChange={(e) => editarCusto(i, 'periodicidade', e.target.value)}>
                      <option value="mês">mês</option><option value="ano">ano</option><option value="uso">uso</option><option value="único">único</option>
                    </select>
                  </td>
                  <td style={{ ...td, width: 140 }}><input style={inp} type="date" value={c.proxima_data || ''} onChange={(e) => editarCusto(i, 'proxima_data', e.target.value)} /></td>
                  <td style={{ ...td, width: 60, textAlign: 'center' }}><input type="checkbox" checked={!!c.pago} onChange={(e) => editarCusto(i, 'pago', e.target.checked)} style={{ width: 18, height: 18 }} /></td>
                  <td style={td}><input style={inp} value={c.nota || ''} onChange={(e) => editarCusto(i, 'nota', e.target.value)} /></td>
                  <td style={{ ...td, width: 30 }}><span style={{ cursor: 'pointer', color: '#6a6a76' }} onClick={() => delCusto(i)}>✕</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
          <button type="button" style={btn} onClick={addCusto}>+ Adicionar custo</button>
          <button type="button" style={btnGold} onClick={onSalvarCustos}>Salvar</button>
        </div>
      </div>

      <h2 style={sectionH2}>IA do mês</h2>
      <div style={{ ...CARD, padding: 16, display: 'flex', gap: 28, flexWrap: 'wrap' }}>
        <div><div style={bigNum}>{fmtUSD(ia.gasto_usd)}</div><span style={muted}>gasto no mês</span></div>
        <div><div style={bigNum}>{fmtUSD(ia.gasto_hoje_usd)}</div><span style={muted}>gasto hoje</span></div>
        <div><div style={bigNum}>{fmtUSD(ia.teto_diario_usd)}</div><span style={muted}>teto diário configurado</span></div>
        <div><Semaforo cor={ia.freeze ? 'vermelho' : 'verde'}>{ia.freeze ? 'Freeze ligado' : 'Normal'}</Semaforo><div style={{ ...muted, marginTop: 4 }}>estado da IA</div></div>
      </div>

      <h2 style={sectionH2}>Anúncios</h2>
      {(pub?.alertas || []).length ? (
        <div style={{ ...CARD, padding: 10, marginBottom: 10, borderColor: 'rgba(253,164,175,.35)' }}>
          {pub.alertas.map((a, i) => <div key={i} style={{ color: '#fda4af', fontSize: 12, padding: '2px 0' }}>⚠ {a}</div>)}
        </div>
      ) : null}
      <div style={{ ...CARD, padding: 14 }}>
        {(pub?.campanhas || []).length === 0 ? <div style={{ fontSize: 13, color: 'var(--text-dim)', padding: '8px 0' }}>Sem campanhas. Crie a 1ª abaixo.</div>
          : pub.campanhas.map((c) => {
            const ctr = c.imp ? (c.cli / c.imp * 100).toFixed(1) : '0.0';
            return (
              <div key={c.id} style={{ display: 'grid', gridTemplateColumns: '1.4fr .9fr auto auto', alignItems: 'center', gap: 8, padding: '9px 0', borderTop: '1px solid #1a1a1a', fontSize: 12.5 }}>
                <div><div style={{ fontWeight: 700, fontSize: 13.5 }}>{c.nome}</div><div style={muted}>{c.anunciante || '-'} · {(c.paginas || []).join(', ') || 'sem página'} · <span style={{ color: c.cls === 'livre' ? '#7bd88f' : '#fda4af' }}>{c.cls === 'livre' ? 'livre' : '18+'}</span></div></div>
                <div style={muted}>{c.imp} imp · {c.cli} cli · CTR {ctr}%{c.dias_restantes != null ? ` · ${c.dias_restantes}d` : ''}</div>
                <span style={{ ...chip, borderColor: c.estado === 'ativa' ? '#7bd88f' : '#f0c94a', color: c.estado === 'ativa' ? '#7bd88f' : '#f0c94a', cursor: 'pointer' }} onClick={() => setEstadoCamp(c.id, c.estado === 'ativa' ? 'pausada' : 'ativa')}>{c.estado === 'ativa' ? 'ativa' : c.estado === 'pausada' ? 'pausada ▸' : 'terminada'}</span>
                <span style={{ color: '#6a6a76', cursor: 'pointer' }} onClick={() => delCamp(c.id)}>✕</span>
              </div>
            );
          })}
        <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginTop: 12, paddingTop: 12, borderTop: '1px dashed rgba(255,255,255,.12)' }}>
          <input placeholder="Nome da campanha" style={{ ...inp, flex: '1.3 1 110px' }} value={novaCamp.nome} onChange={(e) => setNovaCamp({ ...novaCamp, nome: e.target.value })} />
          <input placeholder="Anunciante" style={{ ...inp, flex: '1 1 90px' }} value={novaCamp.anunciante} onChange={(e) => setNovaCamp({ ...novaCamp, anunciante: e.target.value })} />
          <input placeholder="Texto do banner" style={{ ...inp, flex: '1.3 1 110px' }} value={novaCamp.texto} onChange={(e) => setNovaCamp({ ...novaCamp, texto: e.target.value })} />
          <input placeholder="Link" style={{ ...inp, flex: '1 1 90px' }} value={novaCamp.link} onChange={(e) => setNovaCamp({ ...novaCamp, link: e.target.value })} />
          <select style={{ ...inp, width: 90 }} value={novaCamp.cls} onChange={(e) => setNovaCamp({ ...novaCamp, cls: e.target.value })}><option value="livre">livre</option><option value="18+">18+</option></select>
          <input placeholder="fim (AAAA-MM-DD)" style={{ ...inp, width: 140 }} value={novaCamp.fim} onChange={(e) => setNovaCamp({ ...novaCamp, fim: e.target.value })} />
          {['inicio', 'sorteio', 'p'].map((pg) => (
            <label key={pg} style={{ fontSize: 11, color: '#c9c2d6', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <input type="checkbox" checked={!!novaCamp.paginas[pg]} onChange={(e) => setNovaCamp({ ...novaCamp, paginas: { ...novaCamp.paginas, [pg]: e.target.checked } })} />{pg}
            </label>
          ))}
          <button type="button" style={btnGold} onClick={addCampanha}>+ Criar campanha</button>
        </div>
      </div>

      {MOSTRAR_AVANCADO ? (
        <>
          <h2 style={sectionH2}>Burn & margem</h2>
          <div style={{ ...CARD, padding: 16 }}>
            <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div><div style={{ ...bigNum, color: '#fda4af' }}>R${burn}</div><span style={muted}>custos / mês</span></div>
              <div><div style={bigNum}>-</div><span style={muted}>MRR (IAP)</span></div>
              <div><div style={bigNum}>-</div><span style={muted}>margem líquida</span></div>
            </div>
          </div>
          <h2 style={sectionH2}>Cobertura de venda</h2>
          <div style={{ ...CARD, padding: 16 }}>
            <div style={muted}>Onde o mundo nos compra</div>
            <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginTop: 8 }}>{(op.cobertura?.vende || []).map((x, i) => <span key={i} style={{ ...chip, color: '#7bd88f', borderColor: 'rgba(123,216,143,.35)' }}>{x}</span>)}</div>
            <div style={{ ...muted, marginTop: 10 }}>Onde ainda não</div>
            <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginTop: 8 }}>{(op.cobertura?.bloqueado || []).map((x, i) => <span key={i} style={{ ...chip, color: '#7a7a86', borderColor: 'rgba(255,255,255,.1)' }}>{x}</span>)}</div>
          </div>
          <h2 style={sectionH2}>Interruptores por página <span style={{ fontWeight: 400, color: '#8a8a98', textTransform: 'none' }}>(default OFF)</span></h2>
          <div style={{ ...CARD, padding: 14 }}>
            {['inicio', 'sorteio', 'p'].map((pg) => (
              <div key={pg} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', borderTop: '1px solid #1a1a1a' }}>
                <span style={{ flex: 1, fontSize: 13, color: '#c9c2d6' }}>{pg === 'inicio' ? 'Início' : pg === 'sorteio' ? 'Sorteio in-app' : 'Pública /p/'}</span>
                <input type="checkbox" checked={!!op.toggles?.[pg]} onChange={(e) => onSalvarOp('toggles', { ...(op.toggles || {}), [pg]: e.target.checked })} style={{ width: 20, height: 20 }} />
              </div>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}

// ─── ABA 4: SEGURANÇA ────────────────────────────────────────────────────────
function AbaSeguranca({ dados, segManual, setSegManual, onSalvar, op, onSalvarOp }) {
  const s = dados.seguranca;
  const bt = s.banco_trancado;
  const corBanco = bt.estado === 'verde' ? 'verde' : bt.estado === 'vermelho' ? 'vermelho' : 'amarelo';
  const txtBanco = bt.estado === 'verde' ? 'trancado (RLS ok, zero policies em users)'
    : bt.estado === 'vermelho' ? `problema: ${(bt.tabelas_sem_rls || []).length} tabela(s) sem RLS, ${bt.policies_users} policy(ies) em users`
      : 'a confirmar — migração 050 ainda não foi corrida no Supabase';

  const diasBackup = s.ultimo_backup ? diasAte(s.ultimo_backup.data) : null;
  const corBackup = !s.ultimo_backup ? 'amarelo' : diasBackup != null && diasBackup >= -8 ? 'verde' : 'vermelho';
  const txtBackup = !s.ultimo_backup ? 'nunca corrido'
    : `${s.ultimo_backup.data} · ${s.ultimo_backup.tabelas} tabelas · ${s.ultimo_backup.linhas} linhas`;

  const pd = op.protecao_dados || {};
  const ESTADOS_PUBLICADOS = ['publicada', 'publicada (revisão jurídica pendente)'];

  function setManual(campo, sub, valor) {
    setSegManual({ ...segManual, [campo]: { ...(segManual[campo] || {}), [sub]: valor } });
  }

  return (
    <div>
      <h2 style={sectionH2}>Checklist</h2>
      <div style={{ ...CARD, padding: 4 }}>
        <LinhaChecklist rotulo="Banco trancado" cor={corBanco}>{txtBanco}</LinhaChecklist>
        <LinhaChecklist rotulo="Último backup" cor={corBackup}>{txtBackup} · próximo previsto {s.proximo_backup}</LinhaChecklist>
        <LinhaChecklist rotulo="Kill-switch de IA" cor={s.kill_switch_ia.freeze ? 'vermelho' : 'verde'}>
          {s.kill_switch_ia.freeze ? `ligado desde ${(s.kill_switch_ia.desde || '').slice(0, 10)} — ${s.kill_switch_ia.motivo}` : 'normal, não travado'}
        </LinhaChecklist>
        <LinhaChecklist rotulo="Rate limit ativo" cor="verde">
          {s.rate_limit.length} regra(s) configurada(s)
        </LinhaChecklist>
        <LinhaChecklist rotulo="Testes de permissão" cor={segManual.testes_permissao?.data ? 'verde' : 'cinza'}>
          <CampoManual v={segManual.testes_permissao?.data} onData={(v) => setManual('testes_permissao', 'data', v)} vTexto={segManual.testes_permissao?.resultado} onTexto={(v) => setManual('testes_permissao', 'resultado', v)} placeholderTexto="resultado (ex.: 4 pass, 0 fail)" />
        </LinhaChecklist>
        <LinhaChecklist rotulo="npm audit" cor={segManual.npm_audit?.data ? 'verde' : 'cinza'}>
          <CampoManual v={segManual.npm_audit?.data} onData={(v) => setManual('npm_audit', 'data', v)} vTexto={segManual.npm_audit?.falhas ?? ''} onTexto={(v) => setManual('npm_audit', 'falhas', v)} placeholderTexto="nº de falhas restantes" />
        </LinhaChecklist>
        <LinhaChecklist rotulo="Última auditoria" cor={segManual.ultima_auditoria?.data ? 'verde' : 'cinza'}>
          <CampoManual v={segManual.ultima_auditoria?.data} onData={(v) => setManual('ultima_auditoria', 'data', v)} vTexto={segManual.ultima_auditoria?.link} onTexto={(v) => setManual('ultima_auditoria', 'link', v)} placeholderTexto="link do ficheiro" />
        </LinhaChecklist>
      </div>
      <div style={{ marginTop: 10 }}><button type="button" style={btnGold} onClick={onSalvar}>Salvar checklist manual</button></div>

      <details style={{ marginTop: 10 }}>
        <summary style={{ cursor: 'pointer', fontSize: 12, color: 'var(--text-dim)' }}>Detalhe do rate limit</summary>
        <div style={{ ...CARD, marginTop: 8, overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 460 }}>
            <thead><tr><th style={th}>Rota</th><th style={th}>Limite</th></tr></thead>
            <tbody>{s.rate_limit.map((r, i) => <tr key={i}><td style={td}>{r.rota}</td><td style={td}>{r.limite}</td></tr>)}</tbody>
          </table>
        </div>
      </details>

      {MOSTRAR_AVANCADO ? (
        <>
          <h2 style={sectionH2}>Proteção de dados (LGPD)</h2>
          {!ESTADOS_PUBLICADOS.includes(pd.politica_privacidade?.estado) ? (
            <div style={{ ...CARD, padding: 10, marginBottom: 10, borderColor: 'rgba(253,164,175,.4)' }}>
              <span style={{ color: '#fda4af', fontSize: 12 }}>⚠ Política de privacidade ainda não publicada.</span>
            </div>
          ) : null}
          <div style={{ ...CARD, padding: 14 }}>
            <h3 style={{ margin: '0 0 8px', fontSize: 12, color: '#9a8fc0', textTransform: 'uppercase' }}>DPAs por operador</h3>
            {(pd.dpas || []).map((d, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '.8fr auto 1.1fr', gap: 8, padding: '7px 0', borderTop: i ? '1px solid #1a1a1a' : 'none', alignItems: 'center' }}>
                <div style={{ fontWeight: 700, fontSize: 13 }}>{d.nome}</div>
                <select value={d.estado} onChange={(e) => onSalvarOp('protecao_dados', { ...pd, dpas: pd.dpas.map((x, k) => (k === i ? { ...x, estado: e.target.value } : x)) })} style={{ ...inp, width: 110 }}>
                  <option>por tratar</option><option>aceite</option><option>n.a.</option>
                </select>
                <input placeholder="link do DPA" defaultValue={d.link} onBlur={(e) => onSalvarOp('protecao_dados', { ...pd, dpas: pd.dpas.map((x, k) => (k === i ? { ...x, link: e.target.value } : x)) })} style={inp} />
              </div>
            ))}
            <h3 style={{ margin: '16px 0 8px', fontSize: 12, color: '#9a8fc0', textTransform: 'uppercase' }}>Documentos & canal do titular</h3>
            {[['politica_privacidade', 'Política de privacidade'], ['termos_uso', 'Termos de uso']].map(([k, label]) => (
              <div key={k} style={{ display: 'grid', gridTemplateColumns: '1fr auto 1.1fr', gap: 8, padding: '7px 0', borderTop: '1px solid #1a1a1a', alignItems: 'center' }}>
                <div style={{ fontSize: 12 }}>{label}</div>
                <select value={pd[k]?.estado || 'por publicar'} onChange={(e) => onSalvarOp('protecao_dados', { ...pd, [k]: { ...(pd[k] || {}), estado: e.target.value } })} style={{ ...inp, width: 200 }}>
                  <option>por publicar</option><option>publicada</option><option>publicada (revisão jurídica pendente)</option>
                </select>
                <input placeholder="URL" defaultValue={pd[k]?.url} onBlur={(e) => onSalvarOp('protecao_dados', { ...pd, [k]: { ...(pd[k] || {}), url: e.target.value } })} style={inp} />
              </div>
            ))}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1.1fr', gap: 8, padding: '7px 0', borderTop: '1px solid #1a1a1a', alignItems: 'center' }}>
              <div style={{ fontSize: 12 }}>Canal do titular</div>
              <select value={pd.canal_titular?.estado || 'por definir'} onChange={(e) => onSalvarOp('protecao_dados', { ...pd, canal_titular: { ...(pd.canal_titular || {}), estado: e.target.value } })} style={{ ...inp, width: 200 }}>
                <option>por definir</option><option>ativo</option>
              </select>
              <input placeholder="email / formulário" defaultValue={pd.canal_titular?.destino} onBlur={(e) => onSalvarOp('protecao_dados', { ...pd, canal_titular: { ...(pd.canal_titular || {}), destino: e.target.value } })} style={inp} />
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

function LinhaChecklist({ rotulo, cor, children }) {
  return (
    <div style={{ padding: '10px 14px', borderTop: '1px solid #1a1a1a', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '4px 14px' }}>
      <span style={{ width: 160, fontSize: 13, fontWeight: 700, flexShrink: 0 }}>{rotulo}</span>
      <Semaforo cor={cor}>{typeof children === 'string' ? children : null}</Semaforo>
      {typeof children !== 'string' ? children : null}
    </div>
  );
}
function CampoManual({ v, onData, vTexto, onTexto, placeholderTexto }) {
  return (
    <span style={{ display: 'inline-flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
      <input type="date" value={v || ''} onChange={(e) => onData(e.target.value)} style={{ ...inp, width: 140 }} />
      <input placeholder={placeholderTexto} value={vTexto ?? ''} onChange={(e) => onTexto(e.target.value)} style={{ ...inp, width: 220 }} />
    </span>
  );
}

// ─── ABA 5: REGISTROS & PRAZOS ───────────────────────────────────────────────
function AbaRegistros({ registros, setRegistros, onSalvar }) {
  function editar(i, campo, valor) { setRegistros(registros.map((r, k) => (k === i ? { ...r, [campo]: valor } : r))); }
  function add() { setRegistros([...registros, { id: uid(), nome: '', numero: '', estado: '', data: '', nota: '' }]); }
  function del(i) { setRegistros(registros.filter((_, k) => k !== i)); }

  return (
    <div>
      <h2 style={sectionH2}>Registros & prazos</h2>
      <div style={{ ...CARD, overflowX: 'auto', padding: 10 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 780 }}>
          <thead><tr><th style={th}>Nome</th><th style={th}>Número</th><th style={th}>Estado</th><th style={th}>Data</th><th style={th}>Nota</th><th style={th} /></tr></thead>
          <tbody>
            {registros.map((r, i) => {
              const dias = diasAte(r.data);
              const proximo = dias != null && dias < 30;
              return (
                <tr key={r.id || i} style={proximo ? { background: 'rgba(240,201,74,.06)' } : undefined}>
                  <td style={td}><input style={inp} value={r.nome} onChange={(e) => editar(i, 'nome', e.target.value)} /></td>
                  <td style={{ ...td, width: 110 }}><input style={inp} value={r.numero || ''} onChange={(e) => editar(i, 'numero', e.target.value)} /></td>
                  <td style={{ ...td, width: 180 }}><input style={inp} value={r.estado || ''} onChange={(e) => editar(i, 'estado', e.target.value)} /></td>
                  <td style={{ ...td, width: 150 }}>
                    <input style={inp} type="date" value={r.data || ''} onChange={(e) => editar(i, 'data', e.target.value)} />
                    {proximo ? <div style={{ fontSize: 10.5, color: '#f0c94a', marginTop: 2 }}>{dias < 0 ? `${-dias}d atrás` : `em ${dias}d`} ⚠</div> : null}
                  </td>
                  <td style={td}><input style={inp} value={r.nota || ''} onChange={(e) => editar(i, 'nota', e.target.value)} /></td>
                  <td style={{ ...td, width: 30 }}><span style={{ cursor: 'pointer', color: '#6a6a76' }} onClick={() => del(i)}>✕</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
          <button type="button" style={btn} onClick={add}>+ Adicionar registro</button>
          <button type="button" style={btnGold} onClick={onSalvar}>Salvar</button>
        </div>
      </div>
    </div>
  );
}

const sectionH2 = { fontFamily: "'Rajdhani',sans-serif", fontWeight: 800, fontSize: 15, letterSpacing: '.05em', color: '#f0c94a', textTransform: 'uppercase', margin: '26px 0 10px' };
const bigNum = { fontFamily: "'Rajdhani',sans-serif", fontWeight: 800, fontSize: 26, color: '#f0c94a' };
const muted = { fontSize: 11.5, color: 'var(--text-dim)' };
const chip = { fontFamily: "'Rajdhani',sans-serif", fontWeight: 700, fontSize: 10, letterSpacing: '.04em', padding: '2px 8px', borderRadius: 20, border: '1px solid', whiteSpace: 'nowrap' };

function GabCSS() {
  return (
    <style>{`
    .gab2 { display: flex; align-items: flex-start; gap: 0; padding: 16px 20px 60px; }
    .gab2-side { flex: 0 0 190px; position: sticky; top: 12px; display: flex; flex-direction: column; gap: 4px; padding-right: 14px; border-right: 1px solid rgba(255,255,255,.08); }
    .gab2-tab { text-align: left; padding: 10px 12px; border-radius: 8px; border: 1px solid transparent; background: transparent; color: var(--text-dim); font-size: 13px; font-weight: 700; cursor: pointer; }
    .gab2-tab.ativa { background: rgba(212,160,23,.1); border-color: rgba(212,160,23,.4); color: #f0c94a; }
    .gab2-content { flex: 1; min-width: 0; padding-left: 20px; }
    @media (max-width: 820px) {
      .gab2 { flex-direction: column; padding: 12px 14px 50px; }
      .gab2-side { flex-direction: row; overflow-x: auto; border-right: none; border-bottom: 1px solid rgba(255,255,255,.08); padding: 0 0 10px; position: static; width: 100%; box-sizing: border-box; }
      .gab2-tab { flex: 0 0 auto; white-space: nowrap; }
      .gab2-content { padding-left: 0; padding-top: 14px; width: 100%; }
    }
    `}</style>
  );
}
