// Futty v2.0 — Gabinete, aba "Avise-me": quem deixou o e-mail no site para ser avisado quando o Futty
// chegar nas lojas. A contagem, de onde veio cada um (utm) e os mais recentes; "Baixar CSV" leva TODOS
// (para o dia do lançamento). O ENVIO do "chegou nas lojas" não existe ainda — é no dia do lançamento,
// e esta aba é a fonte da lista. A lista vive em `avisos_lancamento` (migração 068); sem ela a aba diz
// que falta aplicar.
import { useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { useApi } from '../../hooks/useApi';
import { obterSupabase } from '../../lib/supabaseAsync';
import EstadoErroRede from '../../components/EstadoErroRede';

const CARD = { background: '#111111', border: '1px solid #222222', borderRadius: 12 };
const th = { textAlign: 'left', padding: '8px 10px', fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid #222' };
const td = { padding: '8px 10px', fontSize: 13, borderBottom: '1px solid #1a1a1a', verticalAlign: 'middle' };

// Data de SISTEMA (quando algo aconteceu na conta/no time), lida pelo dono no Gabinete — vale o
// relógio de quem está olhando, não o fuso de time nenhum. É de propósito: o fuso do time é só para a
// hora de JOGO (src/utils/dataHora.js).
const dataCurta = (iso) => {
  try { return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }); } catch { return '-'; }
};

// O mesmo destino do /api que o app usa (lib/api.js): o site, mesma origem (a Cloudflare reencaminha); em dev, o motor do .env.
const MOTOR = String(import.meta.env.VITE_API_URL || '').trim().replace(/\/+$/, '');
const BASE_API = !Capacitor.isNativePlatform() && import.meta.env.PROD ? '' : MOTOR;

export default function AviseMeLista({ showMsg }) {
  const { data, loading, error, reload } = useApi('/api/super/gabinete/avise-me');
  const [baixando, setBaixando] = useState(false);

  // O CSV é texto, não JSON (o apiFetch lê JSON): fetch direto, com a sessão do super-admin.
  async function baixarCsv() {
    if (baixando) return;
    setBaixando(true);
    try {
      const supabase = await obterSupabase();
      const { data: { session } } = await supabase.auth.getSession();
      const r = await fetch(`${BASE_API}/api/super/gabinete/avise-me?formato=csv`, { headers: { Authorization: `Bearer ${session?.access_token || ''}` } });
      if (!r.ok) {
        let motivo = `Erro ${r.status}`;
        try { motivo = (await r.json()).error || motivo; } catch { /* sem corpo */ }
        throw new Error(motivo);
      }
      const url = URL.createObjectURL(await r.blob());
      const a = document.createElement('a');
      a.href = url;
      a.download = `avise-me-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      showMsg?.('CSV baixado.');
    } catch (e) {
      showMsg?.(e.message || 'Não deu para baixar o CSV.', true);
    } finally {
      setBaixando(false);
    }
  }

  if (error) return <EstadoErroRede onRepetir={reload} mensagem={error} />;
  if (loading || !data) return <div style={{ padding: 16, color: 'var(--text-dim)', fontSize: 13 }}>Carregando…</div>;

  if (data.indisponivel) {
    return (
      <section style={{ ...CARD, padding: 16 }} data-avise-me-gabinete="indisponivel">
        <h2 style={{ fontFamily: "'Rajdhani',sans-serif", fontWeight: 800, fontSize: 18, margin: 0 }}>Avise-me</h2>
        <p style={{ fontSize: 13, color: 'var(--text-dim)', margin: '8px 0 0' }}>{data.motivo || 'A migração 068 ainda não foi aplicada no Supabase.'}</p>
      </section>
    );
  }

  return (
    <div style={{ display: 'grid', gap: 16 }} data-avise-me-gabinete="lista">
      <section style={{ ...CARD, padding: 16, display: 'grid', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <h2 style={{ fontFamily: "'Rajdhani',sans-serif", fontWeight: 800, fontSize: 18, margin: 0 }}>Quem quer ser avisado</h2>
            <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>E-mails deixados no site (página inicial e /avise-me). O envio do aviso é no dia do lançamento.</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div data-total style={{ fontFamily: "'Rajdhani',sans-serif", fontWeight: 800, fontSize: 40, lineHeight: 1, color: '#f0c94a' }}>{data.total}</div>
            <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>{data.total === 1 ? 'e-mail' : 'e-mails'}</div>
          </div>
        </div>
        <button type="button" className="btn btn--outline" style={{ justifySelf: 'start' }} disabled={baixando || data.total === 0} onClick={baixarCsv}>
          {baixando ? 'Baixando…' : 'Baixar CSV (todos)'}
        </button>
      </section>

      {data.total > 0 ? (
        <>
          <section style={{ ...CARD, padding: 16, display: 'grid', gap: 8 }}>
            <h3 style={{ fontFamily: "'Rajdhani',sans-serif", fontWeight: 800, fontSize: 15, margin: 0 }}>De onde vieram</h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 280 }}>
                <thead><tr><th style={th}>Origem</th><th style={{ ...th, textAlign: 'right' }}>E-mails</th></tr></thead>
                <tbody>
                  {(data.por_origem || []).map((o) => (
                    <tr key={o.origem}><td style={td}>{o.origem}</td><td style={{ ...td, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{o.total}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section style={{ ...CARD, padding: 16, display: 'grid', gap: 8 }}>
            <h3 style={{ fontFamily: "'Rajdhani',sans-serif", fontWeight: 800, fontSize: 15, margin: 0 }}>Os mais recentes</h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 460 }}>
                <thead><tr><th style={th}>E-mail</th><th style={th}>Origem</th><th style={th}>Quando</th></tr></thead>
                <tbody>
                  {(data.recentes || []).map((l) => (
                    <tr key={l.id}><td style={td}>{l.email}</td><td style={td}>{l.origem}</td><td style={td}>{dataCurta(l.criado_em)}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : (
        <div style={{ ...CARD, padding: 16, fontSize: 13, color: 'var(--text-dim)' }}>Ainda ninguém deixou o e-mail.</div>
      )}
    </div>
  );
}
