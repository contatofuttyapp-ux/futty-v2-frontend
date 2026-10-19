// Futty v2.0 — A aba Dinheiro do Gabinete.

import { contar } from '../../utils/plural';
import { bigNum, botoesDaTabela, btn, btnGold, CARD, CORES, fmtEUR, fmtUSD, hojeISO, inp, muted, sectionH2, td, th, uid, xDeApagar } from './estilos';
import { Semaforo } from './pecas';

// Normaliza um custo fixo a um valor mensal (para o Burn & margem): anual
// divide por 12; uso/único não entra num "burn" fixo recorrente. "pago" NÃO
// entra nessa conta — marca só se a parcela deste ciclo já foi paga, não se
// o custo deixou de existir.
function valorMensal(c) {
  const v = Number(c.valor) || 0;
  if (c.periodicidade === 'ano') return v / 12;
  if (c.periodicidade === 'uso' || c.periodicidade === 'único') return 0;
  return v;
}

// ─── ABA 3: DINHEIRO ─────────────────────────────────────────────────────────
function AbaDinheiro({ dados, custos, setCustos, onSalvarCustos, cambio, setCambio, onSalvarCambio }) {
  const ia = dados.dinheiro.ia_mes;

  function editarCusto(i, campo, valor) {
    setCustos(custos.map((c, k) => (k === i ? { ...c, [campo]: valor } : c)));
  }
  function addCusto() {
    setCustos([...custos, { id: uid(), nome: '', valor: 0, moeda: 'BRL', periodicidade: 'mês', proxima_data: '', pago: true, nota: '' }]);
  }
  function delCusto(i) { setCustos(custos.filter((_, k) => k !== i)); }

  const hoje = hojeISO();
  const custosVencidos = custos.filter((c) => !c.pago && c.proxima_data && c.proxima_data < hoje).length;
  const burn = custos.reduce((s, c) => s + valorMensal(c), 0); // fmtEUR já mostra 2 casas
  // Pagamentos P2 — a receita das LOJAS no mês (/resumo, bloco dinheiro, P1): a soma do que o RevenueCat
  // converteu para US$ nas compras creditadas em PRODUÇÃO. É BRUTA (a loja ainda fica com 15–30%). null =
  // a migração 064 não correu: aí a tela diz isso em vez de mostrar 0. Anúncios ainda não têm fonte.
  const d = dados.dinheiro;
  const receitaUsd = d.receita_mes ?? null;
  const receita = receitaUsd == null ? 0 : receitaUsd * cambio;
  const porProduto = d.por_produto || { minha: 0, pacote: 0, manto: 0 };

  return (
    <div>
      <h2 style={sectionH2}>Custos fixos</h2>
      {custosVencidos > 0 ? <p style={{ color: '#fda4af', fontSize: 12, margin: '0 0 8px' }}>⚠ {contar(custosVencidos, 'custo', 'custos')} com data vencida.</p> : null}
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
                  <td style={{ ...td, width: 30 }}><span style={xDeApagar} onClick={() => delCusto(i)}>✕</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div style={botoesDaTabela}>
          <button type="button" style={btn} onClick={addCusto}>+ Adicionar custo</button>
          <button type="button" style={btnGold} onClick={onSalvarCustos}>Salvar</button>
        </div>
      </div>

      <h2 style={sectionH2}>Gerações do mês</h2>
      <div style={{ ...CARD, padding: 16, display: 'flex', gap: 28, flexWrap: 'wrap' }}>
        <div>
          <div style={bigNum}>{fmtUSD(ia.gasto_usd)}</div>
          <span style={muted}>gasto no mês · ≈ {fmtEUR(ia.gasto_usd * cambio)}</span>
        </div>
        <div><div style={bigNum}>{fmtUSD(ia.gasto_hoje_usd)}</div><span style={muted}>gasto hoje</span></div>
        <div><div style={bigNum}>{fmtUSD(ia.teto_diario_usd)}</div><span style={muted}>teto diário configurado</span></div>
        <div><Semaforo cor={ia.freeze ? 'vermelho' : 'verde'}>{ia.freeze ? 'Freeze ligado' : 'Normal'}</Semaforo><div style={{ ...muted, marginTop: 4 }}>estado das gerações</div></div>
      </div>
      <div style={{ ...CARD, padding: 12, marginTop: 10, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 13, color: '#ddd' }}>1 US$ = €</span>
        <input
          style={{ ...inp, width: 80 }}
          type="number" step="0.01" min="0.5" max="2"
          value={cambio}
          onChange={(e) => setCambio(Number(e.target.value))}
        />
        <span style={muted}>(editar quando o câmbio mudar)</span>
        <button type="button" style={btn} onClick={onSalvarCambio}>Salvar câmbio</button>
      </div>

      <h2 style={sectionH2}>Receita das lojas (mês)</h2>
      {receitaUsd == null ? (
        <div style={{ ...CARD, padding: 16 }}>
          <span style={muted}>Ainda sem dados de compras: a migração 064 não foi aplicada no Supabase.</span>
        </div>
      ) : (
        <div style={{ ...CARD, padding: 16, display: 'flex', gap: 28, flexWrap: 'wrap' }}>
          <div>
            <div style={bigNum}>{fmtUSD(receitaUsd)}</div>
            <span style={muted}>receita bruta · ≈ {fmtEUR(receita)}</span>
          </div>
          <div><div style={bigNum}>{d.compras_mes ?? 0}</div><span style={muted}>compras (produção)</span></div>
          <div>
            <div style={{ ...bigNum, fontSize: 18 }}>{porProduto.minha} · {porProduto.pacote} · {porProduto.manto}</div>
            <span style={muted}>Minha · Time · Manto</span>
          </div>
          {d.reembolsadas_mes ? <div><div style={{ ...bigNum, color: '#fda4af' }}>{d.reembolsadas_mes}</div><span style={muted}>reembolsadas</span></div> : null}
          {d.concessoes_mes ? <div><div style={bigNum}>{d.concessoes_mes}</div><span style={muted}>cortesias do Gabinete (R$0)</span></div> : null}
          {/* Sandbox é teste (conta de teste da Apple/Google): fica à parte, em cinza, fora da receita. */}
          <div style={{ color: CORES.cinza }}><div style={{ ...bigNum, color: CORES.cinza }}>{d.sandbox_mes ?? 0}</div><span style={{ ...muted, color: CORES.cinza }}>sandbox (teste, fora da receita)</span></div>
        </div>
      )}
      <p style={{ ...muted, marginTop: 8 }}>Bruta: a loja fica com 15–30% antes de pagar. Detalhe compra a compra na aba Figurinhas.</p>

      <h2 style={sectionH2}>Burn & margem</h2>
      <div style={{ ...CARD, padding: 16 }}>
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div><div style={{ ...bigNum, color: '#fda4af' }}>{fmtEUR(burn)}</div><span style={muted}>custos fixos / mês</span></div>
          <div><div style={bigNum}>{fmtEUR(receita)}</div><span style={muted}>receita bruta das lojas (anúncios ainda sem fonte)</span></div>
          <div><div style={{ ...bigNum, color: receita >= burn ? '#7bd88f' : '#fda4af' }}>{receita >= burn ? '' : '-'}{fmtEUR(Math.abs(receita - burn))}</div><span style={muted}>margem (receita bruta − custos)</span></div>
        </div>
        <p style={{ ...muted, marginTop: 10 }}>Tudo em euros; a receita das lojas vem em US$ do RevenueCat e é convertida pelo câmbio acima.</p>
      </div>
    </div>
  );
}

export { AbaDinheiro };
