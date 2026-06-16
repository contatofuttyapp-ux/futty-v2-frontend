// Futty v2.0 — Tabela de classificação de um campeonato (2 times: J|V|E|D|Pts).
const th = { padding: '6px 8px', color: 'var(--label-color)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', textAlign: 'center' };
const td = { padding: '8px', textAlign: 'center', color: '#fff', borderTop: '1px solid var(--border-subtle)' };

export default function CampeonatoStandings({ campeonato }) {
  const c = campeonato;
  const venc = c.estado === 'terminado' ? c.campeao : null;

  const linha = (lado) => {
    const p =
      lado === 'A'
        ? { nome: c.time_a_nome, v: c.time_a_vitorias, e: c.time_a_empates, d: c.time_a_derrotas, pts: c.time_a_pontos }
        : { nome: c.time_b_nome, v: c.time_b_vitorias, e: c.time_b_empates, d: c.time_b_derrotas, pts: c.time_b_pontos };
    const venceu = venc === lado;
    return (
      <tr style={{ background: venceu ? 'rgba(212,160,23,0.12)' : 'transparent' }}>
        <td style={{ ...td, textAlign: 'left', fontWeight: 800, color: venceu ? '#d4a017' : '#fff' }}>{venceu ? '🏆 ' : ''}{p.nome}</td>
        <td style={td}>{c.jornadas_jogadas}</td>
        <td style={td}>{p.v}</td>
        <td style={td}>{p.e}</td>
        <td style={td}>{p.d}</td>
        <td style={{ ...td, fontWeight: 800, color: '#d4a017' }}>{p.pts}</td>
      </tr>
    );
  };

  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
      <thead>
        <tr>
          <th style={{ ...th, textAlign: 'left' }}>Time</th>
          <th style={th}>J</th>
          <th style={th}>V</th>
          <th style={th}>E</th>
          <th style={th}>D</th>
          <th style={th}>Pts</th>
        </tr>
      </thead>
      <tbody>
        {linha('A')}
        {linha('B')}
      </tbody>
    </table>
  );
}
