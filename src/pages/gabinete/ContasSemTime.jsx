// Futty v2.0 — Gabinete, aba "Contas sem time": quem criou conta e não está em time nenhum — em geral, o convite que se perdeu no caminho
// (abriu o link num lugar, cadastrou em outro). "Pôr no time…" escolhe o time e põe a conta como membro, igual a aceitar o convite; a
// pessoa recebe o push "Você entrou no time …", que abre o time com as boas-vindas. Acabou o SQL à mão para isso.
//
// LEI DO DONO: a Super age sobre a PLATAFORMA (contas, times), nunca sobre o conteúdo — aqui só nome, apelido, e-mail e quando entrou.
import { useMemo, useState } from 'react';
import { apiFetch } from '../../lib/api';
import { useApi } from '../../hooks/useApi';
import { contar } from '../../utils/plural';
import EstadoErroRede from '../../components/EstadoErroRede';

const CARD = { background: '#111111', border: '1px solid #222222', borderRadius: 12 };
const btn = { padding: '6px 10px', borderRadius: 8, border: '1px solid #2a2a2a', background: '#0c0c0c', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' };
const th = { textAlign: 'left', padding: '8px 10px', fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid #222' };
const td = { padding: '8px 10px', fontSize: 13, borderBottom: '1px solid #1a1a1a', verticalAlign: 'middle' };
// fontSize 16: abaixo disso o iPhone dá zoom ao focar (ver index.css).
const seletor = { padding: '6px 10px', borderRadius: 8, border: '1px solid #2a2a2a', background: '#0c0c0c', color: '#fff', fontSize: 16, maxWidth: 220 };

// Data de SISTEMA (quando a conta nasceu), lida pelo dono no Gabinete — vale o relógio de quem está olhando, não o fuso de time nenhum.
// É de propósito: o fuso do time é só para a hora de JOGO (src/utils/dataHora.js).
function quando(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
}

const ehTeste = (email) => /@futtymock\.com$/i.test(String(email || ''));

export default function ContasSemTime({ showMsg }) {
  const { data, loading, error, reload } = useApi('/api/super/contas-sem-time');
  const [aberta, setAberta] = useState(null); // id da conta com o seletor aberto
  const [escolhido, setEscolhido] = useState('');
  const [gravando, setGravando] = useState(false);
  const [mostrarTeste, setMostrarTeste] = useState(false);

  const contas = useMemo(() => (data?.contas || []).filter((c) => mostrarTeste || !ehTeste(c.email)), [data, mostrarTeste]);
  const deTeste = (data?.contas || []).filter((c) => ehTeste(c.email)).length;
  const times = data?.times || [];

  function abrir(c) {
    setAberta(c.id);
    setEscolhido('');
  }

  async function porNoTime(c) {
    const time = times.find((t) => t.id === escolhido);
    if (!time || gravando) return;
    setGravando(true);
    try {
      await apiFetch(`/api/super/contas-sem-time/${c.id}/time`, { method: 'POST', body: JSON.stringify({ team_id: time.id }) });
      showMsg?.(`${c.nome_jogador || c.nome || c.email} entrou no ${time.nome}.`);
      setAberta(null);
      reload();
    } catch (e) {
      showMsg?.(e.message || 'Não deu para pôr no time.', true);
    } finally {
      setGravando(false);
    }
  }

  if (error) return <EstadoErroRede onRepetir={reload} mensagem={error} />;
  if (loading || !data) return <div style={{ padding: 16, color: 'var(--text-dim)', fontSize: 13 }}>Carregando…</div>;

  return (
    <section style={{ display: 'grid', gap: 12 }} data-contas-sem-time>
      <div style={{ ...CARD, padding: 16 }}>
        <h2 style={{ fontFamily: "'Rajdhani',sans-serif", fontWeight: 800, fontSize: 18, margin: 0 }}>Contas sem time</h2>
        <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 4 }}>
          Quem criou conta e não está em nenhum time. Em geral é o convite que se perdeu: confira quem é e ponha no time certo.
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginTop: 10 }}>
          <span style={{ fontSize: 13, color: '#fff' }} data-contas-sem-time-total>{contar(contas.length, 'conta', 'contas')}</span>
          {deTeste ? (
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-dim)', cursor: 'pointer' }}>
              <input type="checkbox" checked={mostrarTeste} onChange={(e) => setMostrarTeste(e.target.checked)} />
              Mostrar as {deTeste} de teste (@futtymock)
            </label>
          ) : null}
        </div>
      </div>

      <div style={{ ...CARD, overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 620 }}>
          <thead>
            <tr>
              <th style={th}>Apelido</th>
              <th style={th}>Nome</th>
              <th style={th}>E-mail</th>
              <th style={th}>Criou a conta</th>
              <th style={th}>Ação</th>
            </tr>
          </thead>
          <tbody>
            {contas.map((c) => (
              <tr key={c.id} data-conta-sem-time={c.id} style={c.suspenso ? { opacity: 0.6 } : undefined}>
                <td style={td}>{c.nome_jogador || '-'}</td>
                <td style={td}>{c.nome || '-'}{c.suspenso ? <span style={{ color: 'var(--danger)', marginLeft: 6, fontSize: 11 }}>suspensa</span> : null}</td>
                <td style={{ ...td, overflowWrap: 'anywhere' }}>{c.email || '-'}</td>
                <td style={{ ...td, whiteSpace: 'nowrap' }}>{quando(c.created_at)}</td>
                <td style={td}>
                  {aberta === c.id ? (
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                      <select aria-label="Time" data-escolher-time value={escolhido} onChange={(e) => setEscolhido(e.target.value)} style={seletor}>
                        <option value="">Escolha o time…</option>
                        {times.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
                      </select>
                      <button type="button" data-por-no-time-confirmar style={{ ...btn, borderColor: '#d4a017', color: '#f0c94a' }} disabled={!escolhido || gravando} onClick={() => porNoTime(c)}>
                        {gravando ? 'Pondo…' : 'Pôr'}
                      </button>
                      <button type="button" style={btn} disabled={gravando} onClick={() => setAberta(null)}>Cancelar</button>
                    </div>
                  ) : (
                    <button type="button" data-por-no-time={c.id} style={btn} onClick={() => abrir(c)}>Pôr no time…</button>
                  )}
                </td>
              </tr>
            ))}
            {!contas.length && (
              <tr><td style={td} colSpan={5}>Ninguém sem time. Todo mundo que entrou está em algum time.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
