// Futty v2.0 — A aba Segurança do Gabinete (com o diagnóstico e a lista de conferência).

import { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/api';
import { MOSTRAR_AVANCADO } from '../../config/flags';
import { contar, plural } from '../../utils/plural';
import { CARD, btn, btnGold, diasAte, inp, sectionH2, td, th } from './estilos';
import { Semaforo } from './pecas';

// ─── ABA 4: SEGURANÇA ────────────────────────────────────────────────────────
// Relatórios enviados do próprio aparelho pela tela de Diagnóstico
// (/diagnostico, só super-admin). Cada linha já traz as médias; o JSON inteiro só é
// buscado quando se abre um, porque é o que tem as 50 chamadas.
//
// A leitura que interessa: MOTOR alto é problema nosso, no servidor; REDE alta é
// a distância a São Paulo, e essa não se resolve com código. "Na frente" é o
// tempo entre tocar numa aba e a tela real aparecer.
function SecaoDiagnostico() {
  const [lista, setLista] = useState(null);
  const [erro, setErro] = useState('');
  const [aberto, setAberto] = useState(null); // { chave, json } | { chave, erro }

  useEffect(() => {
    let vivo = true;
    apiFetch('/api/super/diagnostico')
      .then((d) => vivo && setLista(d.relatorios || []))
      .catch((e) => vivo && setErro(e.message));
    return () => { vivo = false; };
  }, []);

  async function verJson(r) {
    const chave = `${r.userId}/${r.ficheiro}`;
    if (aberto?.chave === chave) { setAberto(null); return; }
    setAberto({ chave, json: null });
    try {
      const d = await apiFetch(`/api/super/diagnostico/${r.userId}/${r.ficheiro}`);
      setAberto({ chave, json: d.relatorio });
    } catch (e) {
      setAberto({ chave, erro: e.message });
    }
  }

  const media = (r, campo) => (r.resumo?.[campo]?.media != null ? `${r.resumo[campo].media}ms` : '—');

  return (
    <>
      <h2 style={sectionH2}>Diagnóstico do app</h2>
      {erro ? <div style={{ ...CARD, padding: 10, color: '#fda4af', fontSize: 12 }}>{erro}</div> : null}
      {lista === null && !erro ? <div style={{ ...CARD, padding: 10, fontSize: 12, color: 'var(--text-dim)' }}>Carregando…</div> : null}
      {lista && lista.length === 0 ? (
        <div style={{ ...CARD, padding: 10, fontSize: 12, color: 'var(--text-dim)' }}>
          Nenhum relatório ainda. Eles chegam quando alguém toca em “Enviar relatório” no Perfil → Diagnóstico.
        </div>
      ) : null}
      {lista && lista.length > 0 ? (
        <div style={{ ...CARD, overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 620 }}>
            <thead>
              <tr>
                <th style={th}>Quando</th>
                <th style={th}>Aparelho</th>
                <th style={th}>Motor</th>
                <th style={th}>Rede</th>
                <th style={th}>Na frente</th>
                <th style={th}>JSON</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((r) => {
                const chave = `${r.userId}/${r.ficheiro}`;
                const estaAberto = aberto?.chave === chave;
                return (
                  <tr key={chave}>
                    <td style={td}>{String(r.em).replace('T', ' ').slice(0, 16)}</td>
                    <td style={td}>
                      {r.plataforma || '?'}
                      {r.appVersao ? ` ${r.appVersao} (${r.appBuild})` : ''}
                    </td>
                    <td style={{ ...td, color: '#f0c94a' }}>{media(r, 'motor')}</td>
                    <td style={{ ...td, color: '#b69cff' }}>{media(r, 'rede')}</td>
                    <td style={td}>{media(r, 'pintura')}</td>
                    <td style={td}>
                      <button type="button" style={btn} onClick={() => verJson(r)}>
                        {estaAberto ? 'Fechar' : 'Ver'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {aberto ? (
            <div style={{ borderTop: '1px solid #222', padding: 10 }}>
              {aberto.erro ? (
                <span style={{ color: '#fda4af', fontSize: 12 }}>{aberto.erro}</span>
              ) : aberto.json ? (
                <pre style={{ margin: 0, maxHeight: 360, overflow: 'auto', fontSize: 11, lineHeight: 1.5, color: '#c9c2d6', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  {JSON.stringify(aberto.json, null, 2)}
                </pre>
              ) : (
                <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>Abrindo…</span>
              )}
            </div>
          ) : null}
        </div>
      ) : null}
    </>
  );
}

function AbaSeguranca({ dados, segManual, setSegManual, onSalvar, op, onSalvarOp }) {
  const s = dados.seguranca;
  const bt = s.banco_trancado;
  const corBanco = bt.estado === 'verde' ? 'verde' : bt.estado === 'vermelho' ? 'vermelho' : 'amarelo';
  const txtBanco = bt.estado === 'verde' ? 'trancado (RLS ok, zero policies em users)'
    : bt.estado === 'vermelho' ? `problema: ${contar((bt.tabelas_sem_rls || []).length, 'tabela', 'tabelas')} sem RLS, ${contar(bt.policies_users, 'policy', 'policies')} em users`
      : 'a confirmar: a migração 050 ainda não foi aplicada no Supabase';

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
        <LinhaChecklist rotulo="Freio das gerações" cor={s.kill_switch_ia.freeze ? 'vermelho' : 'verde'}>
          {s.kill_switch_ia.freeze ? `ligado desde ${(s.kill_switch_ia.desde || '').slice(0, 10)}: ${s.kill_switch_ia.motivo}` : 'normal, não travado'}
        </LinhaChecklist>
        <LinhaChecklist rotulo="Rate limit ativo" cor="verde">
          {contar(s.rate_limit.length, 'regra', 'regras')} {plural(s.rate_limit.length, 'configurada', 'configuradas')}
        </LinhaChecklist>
        <LinhaChecklist rotulo="Testes de permissão" cor={segManual.testes_permissao?.data ? 'verde' : 'cinza'}>
          <CampoManual v={segManual.testes_permissao?.data} onData={(v) => setManual('testes_permissao', 'data', v)} vTexto={segManual.testes_permissao?.resultado} onTexto={(v) => setManual('testes_permissao', 'resultado', v)} placeholderTexto="resultado (ex.: 4 pass, 0 fail)" />
        </LinhaChecklist>
        <LinhaChecklist rotulo="npm audit" cor={segManual.npm_audit?.data ? 'verde' : 'cinza'}>
          <CampoManual v={segManual.npm_audit?.data} onData={(v) => setManual('npm_audit', 'data', v)} vTexto={segManual.npm_audit?.falhas ?? ''} onTexto={(v) => setManual('npm_audit', 'falhas', v)} placeholderTexto="nº de falhas restantes" />
        </LinhaChecklist>
        <LinhaChecklist rotulo="Última auditoria" cor={segManual.ultima_auditoria?.data ? 'verde' : 'cinza'}>
          <CampoManual v={segManual.ultima_auditoria?.data} onData={(v) => setManual('ultima_auditoria', 'data', v)} vTexto={segManual.ultima_auditoria?.link} onTexto={(v) => setManual('ultima_auditoria', 'link', v)} placeholderTexto="link do arquivo" />
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

      <SecaoDiagnostico />

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

export { AbaSeguranca };
