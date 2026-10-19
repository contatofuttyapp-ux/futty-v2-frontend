// Futty v2.0 — A aba Registros do Gabinete (com os acessos).

import { botoesDaTabela, btn, btnGold, CARD, diasAte, inp, muted, sectionH2, td, th, uid, xDeApagar } from './estilos';

// ─── ABA 5: REGISTROS & PRAZOS ───────────────────────────────────────────────
function AbaRegistros({ registros, setRegistros, onSalvarRegistros, acessos, setAcessos, onSalvarAcessos, showMsg }) {
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
                  <td style={{ ...td, width: 30 }}><span style={xDeApagar} onClick={() => del(i)}>✕</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div style={botoesDaTabela}>
          <button type="button" style={btn} onClick={add}>+ Adicionar registro</button>
          <button type="button" style={btnGold} onClick={onSalvarRegistros}>Salvar</button>
        </div>
      </div>

      <BlocoAcessos acessos={acessos} setAcessos={setAcessos} onSalvar={onSalvarAcessos} showMsg={showMsg} />
    </div>
  );
}

// Acessos & contas (12-set): onde cada peça da operação mora — SÓ caminho e
// conta, NUNCA senha. Mesma regra do backend (gravar() em gabineteStore.js,
// que é a fonte de verdade e recusa a gravação inteira) — aqui é só feedback
// imediato ao digitar/colar, sem esperar o "Salvar".
function pareceSegredo(texto) {
  if (!texto) return false;
  if (/^(re_|sk_|eyJ)/.test(texto)) return true;
  if (/\S{41,}/.test(texto)) return true;
  return false;
}

function BlocoAcessos({ acessos, setAcessos, onSalvar, showMsg }) {
  function editar(i, campo, valor) {
    // P2: o custo (texto livre, ex.: "€7,24 (US$99/ano)") passa pela mesma trava que a observação.
    if ((campo === 'obs' || campo === 'custo_eur') && pareceSegredo(valor)) {
      showMsg('Senhas não entram aqui. Guarde no Gerenciador de Senhas do Google.', true);
      return;
    }
    setAcessos(acessos.map((a, k) => (k === i ? { ...a, [campo]: valor } : a)));
  }
  function add() { setAcessos([...acessos, { id: uid(), servico: '', para_que: '', site: '', entra_com: '', custo_eur: '', obs: '' }]); }
  function del(i) { setAcessos(acessos.filter((_, k) => k !== i)); }

  return (
    <div style={{ marginTop: 30 }}>
      <h2 style={sectionH2}>Acessos & contas</h2>
      <p style={{ ...muted, margin: '0 0 10px' }}>Só o caminho e a conta. Senhas ficam no Gerenciador de Senhas do Google (conta contatofuttyapp).</p>
      <div style={{ ...CARD, overflowX: 'auto', padding: 10 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1040 }}>
          <thead>
            <tr>
              <th style={th}>Serviço</th>
              <th style={th}>Pra que serve</th>
              <th style={th}>Site</th>
              <th style={th}>Entra com</th>
              <th style={th}>Custo €/mês</th>
              <th style={th}>Observação</th>
              <th style={th} />
            </tr>
          </thead>
          <tbody>
            {acessos.map((a, i) => (
              <tr key={a.id || i}>
                <td style={{ ...td, width: 150 }}><input style={inp} value={a.servico} onChange={(e) => editar(i, 'servico', e.target.value)} /></td>
                <td style={td}><input style={inp} value={a.para_que || ''} onChange={(e) => editar(i, 'para_que', e.target.value)} /></td>
                <td style={{ ...td, width: 190 }}>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <input style={{ ...inp, flex: 1 }} value={a.site || ''} onChange={(e) => editar(i, 'site', e.target.value)} placeholder="https://" />
                    {a.site ? (
                      <a href={a.site} target="_blank" rel="noopener noreferrer" title="Abrir em nova aba" style={{ color: '#f0c94a', fontSize: 15, flexShrink: 0, textDecoration: 'none' }}>
                        ↗
                      </a>
                    ) : null}
                  </div>
                </td>
                <td style={{ ...td, width: 170 }}><input style={inp} value={a.entra_com || ''} onChange={(e) => editar(i, 'entra_com', e.target.value)} /></td>
                <td style={{ ...td, width: 130 }}><input style={inp} value={a.custo_eur || ''} onChange={(e) => editar(i, 'custo_eur', e.target.value)} placeholder="vazio = sem custo" /></td>
                <td style={td}><input style={inp} value={a.obs || ''} onChange={(e) => editar(i, 'obs', e.target.value)} /></td>
                <td style={{ ...td, width: 30 }}><span style={xDeApagar} onClick={() => del(i)}>✕</span></td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={botoesDaTabela}>
          <button type="button" style={btn} onClick={add}>+ Adicionar acesso</button>
          <button type="button" style={btnGold} onClick={onSalvar}>Salvar</button>
        </div>
      </div>
    </div>
  );
}

export { AbaRegistros };
