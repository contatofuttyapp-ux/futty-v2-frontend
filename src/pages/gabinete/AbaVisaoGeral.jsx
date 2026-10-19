// Futty v2.0 — A aba Visão geral do Gabinete.

import { Card6 } from './pecas';
import { CARD, fmtUSD, fmtUptime } from './estilos';

// ─── ABA 1: VISÃO GERAL ──────────────────────────────────────────────────────
function AbaVisaoGeral({ dados }) {
  const v = dados.visao_geral;
  const precisa = dados.precisa_de_voce || [];
  return (
    <div>
      <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))' }}>
        <Card6 n={`${v.usuarios_novos_hoje} · ${v.usuarios_novos_7d}`} legenda="Pessoas novas (hoje · 7 dias)" />
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
          legenda="Estado das gerações"
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

export { AbaVisaoGeral };
