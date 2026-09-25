// Futty v2.0 — Gabinete 2.0, aba "Brilhantes" (SPEC-FIGURINHA-3 §7, bloco 2).
//
// Enquanto a compra na loja não existe, esta aba É a caixa registradora: o
// pedido que a pessoa criou em Planos/Figurinha chega aqui e o dono resolve à
// mão — ativa o pacote do time (escolhendo o uniforme dos 5), dá créditos, ou
// recusa com um motivo que volta para a tela de quem pediu.
//
// Ativar NÃO gera nada em lote: cada membro gera quando abre o app (§5). Por
// isso a coluna "geradas" de um time recém-ativado começa em 0 e sobe sozinha.
//
// O manto próprio é fase 2 (§8): o pedido aparece na fila com etiqueta e sem
// botão de ativar. Nada que finja funcionar — regra da casa.
import { useState } from 'react';
import { apiFetch } from '../../lib/api';
import { useApi } from '../../hooks/useApi';
import EstadoErroRede from '../../components/EstadoErroRede';

const CARD = { background: '#111111', border: '1px solid #222222', borderRadius: 12 };
const btn = {
  padding: '6px 10px', borderRadius: 8, border: '1px solid #2a2a2a', background: '#0c0c0c',
  color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer',
};
const btnGold = { ...btn, background: 'linear-gradient(180deg,#f5e070,#d4a017)', color: '#0d0d12', border: 'none' };
const th = { textAlign: 'left', padding: '8px 10px', fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid #222' };
const td = { padding: '8px 10px', fontSize: 13, borderBottom: '1px solid #1a1a1a', verticalAlign: 'middle' };
// fontSize 16: abaixo disso o iPhone dá zoom ao focar (Rodada 8A).
const inp = { fontSize: 16, color: '#e8e8ef', background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.14)', padding: '6px 8px', borderRadius: 6 };

function fmtData(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
/** "2026-09" → "set/2026". */
function fmtMes(aaaaMm) {
  const [a, m] = String(aaaaMm || '').split('-').map(Number);
  return a && m ? `${MESES[m - 1]}/${a}` : aaaaMm;
}
/** "dark-gold" → "Dark Gold". O catálogo é do motor (KITS_IA); o nome bonito sai daqui. */
function nomeKit(id) {
  return String(id || '').split('-').map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
}

function Secao({ titulo, sub, children }) {
  return (
    <section style={{ ...CARD, padding: 16, display: 'grid', gap: 10 }}>
      <div>
        <h2 style={{ fontFamily: "'Rajdhani',sans-serif", fontWeight: 800, fontSize: 18, margin: 0 }}>{titulo}</h2>
        {sub ? <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>{sub}</div> : null}
      </div>
      {children}
    </section>
  );
}

export default function Brilhantes({ showMsg }) {
  const { data, loading, error, reload } = useApi('/api/super/gabinete/brilhantes');
  const [emCurso, setEmCurso] = useState(null); // id da linha com ação em voo
  // Ativação do pacote: o uniforme é escolhido aqui, time a time.
  const [kitPorTime, setKitPorTime] = useState({});
  const [creditoPorPessoa, setCreditoPorPessoa] = useState({});
  // RODADA 21 — "Dar crédito a um e-mail": quem ainda não tem pedido nem
  // crédito nenhum não aparece em nenhuma das duas listas abaixo.
  const [emailCredito, setEmailCredito] = useState('');
  const [quantidadeEmail, setQuantidadeEmail] = useState(10);

  const kits = data?.kits || [];

  async function agir(chave, path, corpo, ok) {
    setEmCurso(chave);
    try {
      await apiFetch(path, { method: 'POST', body: JSON.stringify(corpo) });
      showMsg(ok);
      await reload();
    } catch (e) {
      showMsg(e.message, true);
    } finally {
      setEmCurso(null);
    }
  }

  function ativarPacote(teamId, nome) {
    const kitId = kitPorTime[teamId] || kits[0];
    if (!kitId) { showMsg('Sem uniformes disponíveis no motor.', true); return; }
    if (!window.confirm(`Ativar as figurinhas do ${nome} no uniforme ${nomeKit(kitId)}?\n\nTodos os jogadores geram nesse uniforme. Ninguém é gerado agora — cada um gera quando abrir o app.`)) return;
    agir(`pacote-${teamId}`, '/api/super/gabinete/brilhantes/ativar-pacote', { teamId, kitId }, 'Pacote ativado e time avisado.');
  }

  function darCreditos(userId, email) {
    const quantidade = Number(creditoPorPessoa[userId] ?? 10);
    if (!Number.isInteger(quantidade) || quantidade < 1) { showMsg('Quantidade inválida.', true); return; }
    if (!window.confirm(`Dar ${quantidade} crédito(s) de figurinha a ${email}?`)) return;
    agir(`credito-${userId}`, '/api/super/gabinete/brilhantes/creditos', { userId, quantidade }, 'Créditos dados e pessoa avisada.');
  }

  // RODADA 21 — mesma rota, mas SEM userId em mãos: quem ainda não pediu nada
  // (0 créditos, nenhum pedido) não está em nenhuma das listas que o Gabinete
  // já lê; o servidor resolve o e-mail para userId (routes/gabinete.js).
  function darCreditosPorEmail() {
    const email = emailCredito.trim();
    const quantidade = Number(quantidadeEmail);
    if (!email) { showMsg('Escreva o e-mail.', true); return; }
    if (!Number.isInteger(quantidade) || quantidade < 1) { showMsg('Quantidade inválida.', true); return; }
    if (!window.confirm(`Dar ${quantidade} crédito(s) de figurinha a ${email}?`)) return;
    agir(`credito-email-${email}`, '/api/super/gabinete/brilhantes/creditos', { email, quantidade }, 'Créditos dados e pessoa avisada.');
  }

  async function recusar(pedidoId) {
    const motivo = window.prompt('Motivo da recusa (quem pediu vai ler isto):');
    if (motivo === null) return;
    if (!motivo.trim()) { showMsg('Escreva o motivo.', true); return; }
    setEmCurso(`recusar-${pedidoId}`);
    try {
      const r = await apiFetch('/api/super/gabinete/brilhantes/recusar', { method: 'POST', body: JSON.stringify({ pedidoId, motivo }) });
      // A 055 pode não estar corrida: o pedido fecha na mesma, mas o texto
      // não ficou guardado — o dono tem de saber disso.
      showMsg(r?.motivo_guardado === false ? 'Pedido recusado — mas o motivo NÃO ficou guardado (migração 055 em falta).' : 'Pedido recusado.', r?.motivo_guardado === false);
      await reload();
    } catch (e) {
      showMsg(e.message, true);
    } finally {
      setEmCurso(null);
    }
  }

  if (error) return <EstadoErroRede onRepetir={reload} />;
  if (loading || !data) return <div style={{ padding: 20, color: 'var(--text-dim)', fontSize: 13 }}>Carregando Figurinhas…</div>;

  if (data.indisponivel) {
    return (
      <Secao titulo="Figurinhas" sub="Ativação de pacotes, créditos e pedidos">
        <div style={{ fontSize: 13, color: '#f0c94a', lineHeight: 1.5 }}>
          {data.motivo || 'Ainda não dá para ler os pedidos.'}
          <div style={{ color: 'var(--text-dim)', marginTop: 6 }}>
            Corra <code>db/migrations/054_brilhante.sql</code> no SQL Editor do Supabase e recarregue.
          </div>
        </div>
      </Secao>
    );
  }

  const pedidos = data.pedidos || [];
  const times = data.times || [];
  const pessoas = data.pessoas || [];

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      {/* ── 1. PEDIDOS PENDENTES: a fila, o mais velho primeiro ── */}
      <Secao titulo={`Pedidos pendentes (${pedidos.length})`} sub="Quem tocou em “Pedir ativação” e ainda espera resposta">
        {pedidos.length === 0 ? (
          <div style={{ fontSize: 13, color: 'var(--text-dim)' }}>Nenhum pedido esperando.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={th}>Pessoa</th><th style={th}>Time</th><th style={th}>Produto</th>
                  <th style={th}>Pedido em</th><th style={th}>Resolver</th>
                </tr>
              </thead>
              <tbody>
                {pedidos.map((p) => (
                  <tr key={p.id}>
                    <td style={td}>
                      <div style={{ fontWeight: 700 }}>{p.nome || '—'}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>{p.email || '—'}</div>
                    </td>
                    <td style={td}>{p.time || <span style={{ color: 'var(--text-dim)' }}>—</span>}</td>
                    <td style={td}>
                      {p.produto_label}
                      {p.fase2 ? (
                        <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 800, color: '#f0c94a', border: '1px solid rgba(212,160,23,0.5)', borderRadius: 4, padding: '2px 5px', whiteSpace: 'nowrap' }}>FASE 2</span>
                      ) : null}
                    </td>
                    <td style={td}>{fmtData(p.criado_em)}</td>
                    <td style={td}>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                        {/* Manto próprio (fase 2) não tem botão de ativar: o
                            desenho do uniforme do time ainda não existe. */}
                        {p.produto === 'pacote' && p.team_id ? (
                          <>
                            <select
                              style={{ ...inp, padding: '5px 6px' }}
                              value={kitPorTime[p.team_id] || kits[0] || ''}
                              onChange={(e) => setKitPorTime((k) => ({ ...k, [p.team_id]: e.target.value }))}
                            >
                              {kits.map((k) => <option key={k} value={k}>{nomeKit(k)}</option>)}
                            </select>
                            <button type="button" style={btnGold} disabled={emCurso === `pacote-${p.team_id}`} onClick={() => ativarPacote(p.team_id, p.time || 'time')}>
                              {emCurso === `pacote-${p.team_id}` ? '…' : 'Ativar pacote'}
                            </button>
                          </>
                        ) : null}
                        {p.produto === 'minha' ? (
                          <button type="button" style={btnGold} disabled={emCurso === `credito-${p.user_id}`} onClick={() => darCreditos(p.user_id, p.email || 'esta pessoa')}>
                            {emCurso === `credito-${p.user_id}` ? '…' : 'Dar 10 créditos'}
                          </button>
                        ) : null}
                        {p.fase2 ? <span style={{ fontSize: 11.5, color: 'var(--text-dim)' }}>Sem ativação ainda</span> : null}
                        <button type="button" style={btn} disabled={emCurso === `recusar-${p.id}`} onClick={() => recusar(p.id)}>
                          {emCurso === `recusar-${p.id}` ? '…' : 'Recusar'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Secao>

      {/* ── 2. TIMES: quem tem pacote, quanto usou e quanto custou de verdade ── */}
      <Secao titulo={`Times (${times.length})`} sub="Com pacote ativo ou com pedido em cima da mesa. Custo real da fal, somado geração a geração, por time e por mês (horário de Brasília).">
        {times.length === 0 ? (
          <div style={{ fontSize: 13, color: 'var(--text-dim)' }}>Nenhum time com pacote ou pedido.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={th}>Time</th><th style={th}>Pacote</th><th style={th}>Uniforme</th>
                  <th style={th}>Jogadores</th><th style={th}>Gerações</th><th style={th}>Custo real</th><th style={th}>Ação</th>
                </tr>
              </thead>
              <tbody>
                {times.map((t) => (
                  <tr key={t.id}>
                    <td style={td}>
                      <div style={{ fontWeight: 700 }}>{t.nome}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>{t.membros} membro(s){t.manto_proprio ? ' · manto próprio' : ''}</div>
                    </td>
                    <td style={td}>
                      {t.brilhante_ativo
                        ? <span style={{ color: '#7bd88f' }}>ativo{t.brilhante_ativado_em ? ` · ${fmtData(t.brilhante_ativado_em)}` : ''}</span>
                        : <span style={{ color: 'var(--text-dim)' }}>só pedido</span>}
                    </td>
                    <td style={td}>{t.brilhante_kit ? nomeKit(t.brilhante_kit) : <span style={{ color: 'var(--text-dim)' }}>—</span>}</td>
                    {/* Rodada 28: jogadores (vagas do pacote usadas, de 25) e gerações (cada um pode
                        refazer até 5) são coisas diferentes — antes "geradas" contava pessoas. */}
                    <td style={td}>{t.jogadores ?? 0}/{t.limite}</td>
                    <td style={td}>
                      {t.geradas}
                      {t.geradas_sem_custo ? <span style={{ fontSize: 11, color: 'var(--text-dim)' }}> · {t.geradas_sem_custo} jogador(es) sem custo gravado</span> : null}
                    </td>
                    <td style={td}>
                      <div>US${t.custo_usd.toFixed(2)}</div>
                      {Array.isArray(t.custo_por_mes) && t.custo_por_mes.length ? (
                        <div style={{ display: 'grid', gap: 2, marginTop: 4, fontSize: 11, color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>
                          {t.custo_por_mes.map((m) => (
                            <span key={m.mes}>
                              {fmtMes(m.mes)}: US${m.custo_usd.toFixed(2)} · {m.geracoes} {m.geracoes === 1 ? 'geração' : 'gerações'}{m.sem_custo ? ` (${m.sem_custo} sem custo)` : ''}
                            </span>
                          ))}
                        </div>
                      ) : t.custo_por_mes === null ? (
                        <div style={{ marginTop: 4, fontSize: 11, color: 'var(--text-dim)' }}>por mês: falta a migração 063</div>
                      ) : null}
                    </td>
                    <td style={td}>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                        <select
                          style={{ ...inp, padding: '5px 6px' }}
                          value={kitPorTime[t.id] || t.brilhante_kit || kits[0] || ''}
                          onChange={(e) => setKitPorTime((k) => ({ ...k, [t.id]: e.target.value }))}
                        >
                          {kits.map((k) => <option key={k} value={k}>{nomeKit(k)}</option>)}
                        </select>
                        <button type="button" style={t.brilhante_ativo ? btn : btnGold} disabled={emCurso === `pacote-${t.id}`} onClick={() => ativarPacote(t.id, t.nome)}>
                          {emCurso === `pacote-${t.id}` ? '…' : t.brilhante_ativo ? 'Trocar uniforme' : 'Ativar pacote'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Secao>

      {/* ── 3. DAR CRÉDITO A UM E-MAIL — RODADA 21: quem ainda não pediu nada
          (0 créditos, nenhum pedido) não aparece em nenhuma lista acima nem
          abaixo; este é o único jeito de ativar essa pessoa. ── */}
      <Secao titulo="Dar crédito a um e-mail" sub="Para quem ainda não pediu nada e não tem crédito — não está em nenhuma lista acima">
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            type="email"
            placeholder="email@pessoa.com"
            style={{ ...inp, flex: '1 1 220px', minWidth: 180 }}
            value={emailCredito}
            onChange={(e) => setEmailCredito(e.target.value)}
          />
          <input
            type="number" min="1" max="25" style={{ ...inp, width: 64 }}
            value={quantidadeEmail}
            onChange={(e) => setQuantidadeEmail(e.target.value)}
          />
          <button type="button" style={btnGold} disabled={emCurso === `credito-email-${emailCredito.trim()}`} onClick={darCreditosPorEmail}>
            {emCurso === `credito-email-${emailCredito.trim()}` ? '…' : 'Dar créditos'}
          </button>
        </div>
      </Secao>

      {/* ── 4. PESSOAS COM CRÉDITO ── */}
      <Secao titulo={`Pessoas com crédito (${pessoas.length})`} sub="Cada crédito é uma figurinha por gerar, no uniforme que a pessoa escolher">
        {pessoas.length === 0 ? (
          <div style={{ fontSize: 13, color: 'var(--text-dim)' }}>Ninguém com crédito agora.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={th}>Pessoa</th><th style={th}>Créditos</th><th style={th}>Presente do criador</th><th style={th}>Dar mais</th>
                </tr>
              </thead>
              <tbody>
                {pessoas.map((u) => (
                  <tr key={u.id}>
                    <td style={td}>
                      <div style={{ fontWeight: 700 }}>{u.nome || '—'}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>{u.email}</div>
                    </td>
                    <td style={td}>{u.creditos}</td>
                    <td style={td}>{u.presente_criador_em ? fmtData(u.presente_criador_em) : <span style={{ color: 'var(--text-dim)' }}>ainda não</span>}</td>
                    <td style={td}>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <input
                          type="number" min="1" max="25" style={{ ...inp, width: 64 }}
                          value={creditoPorPessoa[u.id] ?? 10}
                          onChange={(e) => setCreditoPorPessoa((c) => ({ ...c, [u.id]: e.target.value }))}
                        />
                        <button type="button" style={btn} disabled={emCurso === `credito-${u.id}`} onClick={() => darCreditos(u.id, u.email)}>
                          {emCurso === `credito-${u.id}` ? '…' : 'Dar'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Secao>
    </div>
  );
}
