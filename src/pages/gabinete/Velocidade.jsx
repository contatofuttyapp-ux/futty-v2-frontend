// Futty v2.0 — Gabinete, aba "Velocidade" (Rodada 28, bloco E).
//
// O que os aparelhos de todo mundo mediram, sem ninguém dentro: a telemetria anônima (lib/telemetria.js)
// manda, uma vez por tela por sessão, quanto a tela levou para ficar útil e quanto cada chamada ao motor
// custou. Aqui só chegam AGREGADOS (p50/p95 calculados no banco, migração 061) — nenhum evento
// individual, de propósito. p50 é a tela de sempre; p95 é a pior de cada 20.
import { Link } from 'react-router-dom';
import { useApi } from '../../hooks/useApi';
import EstadoErroRede from '../../components/EstadoErroRede';

const CARD = { background: '#111111', border: '1px solid #222222', borderRadius: 12 };
const th = { textAlign: 'left', padding: '8px 10px', fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid #222' };
const td = { padding: '8px 10px', fontSize: 13, borderBottom: '1px solid #1a1a1a', verticalAlign: 'middle' };
const num = { ...td, textAlign: 'right', fontVariantNumeric: 'tabular-nums' };

// Mesma régua de cor para as duas tabelas: até 1 s verde, até 2,5 s amarelo, acima vermelho.
function corDoTempo(ms) {
  if (ms == null) return 'var(--text-dim)';
  if (ms <= 1000) return '#7bd88f';
  if (ms <= 2500) return '#f0c94a';
  return '#fda4af';
}
function fmtMs(ms) {
  if (ms == null) return '-';
  return ms >= 1000 ? `${(ms / 1000).toFixed(1).replace('.', ',')} s` : `${ms} ms`;
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

export default function Velocidade() {
  const { data, loading, error, reload } = useApi('/api/super/gabinete/velocidade');

  if (error) return <EstadoErroRede onRepetir={reload} mensagem={error} />;
  if (loading || !data) return <div style={{ padding: 16, color: 'var(--text-dim)', fontSize: 13 }}>Carregando…</div>;

  const porTela = data.por_tela || [];
  const rotas = data.rotas_lentas || [];

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <Secao
        titulo="Velocidade no aparelho de quem usa"
        sub={`Últimos ${data.dias || 7} dias · ${data.medicoes || 0} medições anônimas (sem usuário, e-mail, IP nem aparelho). Útil = a tela desenhada sem o F de carregamento.`}
      >
        {data.indisponivel ? (
          <div style={{ fontSize: 13, color: '#f0c94a' }}>{data.motivo}</div>
        ) : null}
        <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>
          Para ver este aparelho em detalhe: <Link to="/diagnostico" style={{ color: '#f0c94a' }}>Diagnóstico deste aparelho →</Link>
        </div>
      </Secao>

      <Secao titulo="Por tela e versão" sub="p50 = a tela de sempre · p95 = a pior de cada 20">
        {porTela.length ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={th}>Tela</th>
                  <th style={th}>Plataforma</th>
                  <th style={th}>Versão</th>
                  <th style={{ ...th, textAlign: 'right' }}>Medições</th>
                  <th style={{ ...th, textAlign: 'right' }}>p50</th>
                  <th style={{ ...th, textAlign: 'right' }}>p95</th>
                </tr>
              </thead>
              <tbody>
                {porTela.map((l) => (
                  <tr key={`${l.tela}|${l.plataforma}|${l.versao_app}`}>
                    <td style={{ ...td, fontFamily: 'monospace', fontSize: 12 }}>{l.tela}</td>
                    <td style={td}>{l.plataforma}</td>
                    <td style={{ ...td, fontSize: 12 }}>{l.versao_app}</td>
                    <td style={num}>{l.n}</td>
                    <td style={{ ...num, color: corDoTempo(l.p50) }}>{fmtMs(l.p50)}</td>
                    <td style={{ ...num, color: corDoTempo(l.p95) }}>{fmtMs(l.p95)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ fontSize: 13, color: 'var(--text-dim)' }}>Ainda sem medições nestes dias.</div>
        )}
      </Secao>

      <Secao titulo="As 5 rotas mais lentas" sub="Chamadas ao motor, pelo p95 (só rotas com 3 medições ou mais) · o tempo inclui a rede de quem usa">
        {rotas.length ? (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={th}>Rota</th>
                <th style={{ ...th, textAlign: 'right' }}>Medições</th>
                <th style={{ ...th, textAlign: 'right' }}>p50</th>
                <th style={{ ...th, textAlign: 'right' }}>p95</th>
              </tr>
            </thead>
            <tbody>
              {rotas.map((r) => (
                <tr key={r.rota}>
                  <td style={{ ...td, fontFamily: 'monospace', fontSize: 12 }}>{r.rota}</td>
                  <td style={num}>{r.n}</td>
                  <td style={{ ...num, color: corDoTempo(r.p50) }}>{fmtMs(r.p50)}</td>
                  <td style={{ ...num, color: corDoTempo(r.p95) }}>{fmtMs(r.p95)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div style={{ fontSize: 13, color: 'var(--text-dim)' }}>Poucas medições por rota ainda.</div>
        )}
      </Secao>
    </div>
  );
}
