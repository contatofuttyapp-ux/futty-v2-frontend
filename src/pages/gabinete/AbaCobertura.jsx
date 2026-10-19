// Futty v2.0 — A aba Cobertura de venda do Gabinete.

import { useState } from 'react';
import { btn, btnGold, CARD, chip, inp, muted, sectionH2, xDeApagar } from './estilos';

// ─── ABA "COBERTURA" ──────────────────────────────────────────────────────────
// Onde vendemos e onde não. Fonte é manual (gabineteStore.cobertura) — não há
// lista de países vinda de código nenhum (grep confirmado: sem IAP das lojas
// ligado, não existe fonte automática) — editável igual aos Registros.
function ColunaCobertura({ titulo, lista, cor, borda, onAdd, onDel }) {
  const [novo, setNovo] = useState('');
  function add() {
    if (!novo.trim()) return;
    onAdd(novo.trim());
    setNovo('');
  }
  return (
    <div style={{ ...CARD, padding: 16 }}>
      <h3 style={{ margin: '0 0 10px', fontSize: 12, color: '#9a8fc0', textTransform: 'uppercase' }}>{titulo}</h3>
      <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
        {lista.map((x, i) => (
          <span key={i} style={{ ...chip, color: cor, borderColor: borda, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            {x}
            <span style={xDeApagar} onClick={() => onDel(i)}>✕</span>
          </span>
        ))}
        {!lista.length ? <span style={muted}>Vazio.</span> : null}
      </div>
      <div style={{ display: 'flex', gap: 7, marginTop: 12, paddingTop: 12, borderTop: '1px dashed rgba(255,255,255,.12)' }}>
        <input style={{ ...inp, flex: 1 }} placeholder="Ex.: 🇧🇷 Brasil ou BRL" value={novo} onChange={(e) => setNovo(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} />
        <button type="button" style={btn} onClick={add}>+ Adicionar</button>
      </div>
    </div>
  );
}

function AbaCobertura({ cobertura, setCobertura, onSalvar }) {
  const vende = cobertura.vende || [];
  const bloqueado = cobertura.bloqueado || [];
  return (
    <div>
      <h2 style={sectionH2}>Cobertura de venda</h2>
      <p style={muted}>Onde o mundo nos compra hoje, e onde ainda não. Lista editável à mão: sem IAP das lojas ligado, ainda não há fonte automática.</p>
      <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', marginTop: 10 }}>
        <ColunaCobertura
          titulo="Onde vende"
          lista={vende}
          cor="#7bd88f"
          borda="rgba(123,216,143,.35)"
          onAdd={(x) => setCobertura({ ...cobertura, vende: [...vende, x] })}
          onDel={(i) => setCobertura({ ...cobertura, vende: vende.filter((_, k) => k !== i) })}
        />
        <ColunaCobertura
          titulo="Onde ainda não"
          lista={bloqueado}
          cor="#7a7a86"
          borda="rgba(255,255,255,.1)"
          onAdd={(x) => setCobertura({ ...cobertura, bloqueado: [...bloqueado, x] })}
          onDel={(i) => setCobertura({ ...cobertura, bloqueado: bloqueado.filter((_, k) => k !== i) })}
        />
      </div>
      <div style={{ marginTop: 12 }}><button type="button" style={btnGold} onClick={onSalvar}>Salvar</button></div>
    </div>
  );
}

export { AbaCobertura };
