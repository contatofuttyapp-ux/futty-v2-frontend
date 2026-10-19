// Futty v2.0 — A aba Anúncios do Gabinete.

import { useState } from 'react';
import { formatarDecimal } from '../../utils/numero';
import { CARD, btnGold, chip, fmtUSD, inp, muted, sectionH2, uid } from './estilos';

// As telas com espaço de publicidade, cada uma com o seu slot (a Resenha não pega o anúncio do Início
// emprestado: senão não daria para ligar uma sem a outra).
// A ordem aqui é a ordem em que aparecem na tela do dono.
const NOMES_PAGINA = {
  inicio: 'Início',
  resenha: 'Resenha',
  ranking: 'Ranking',
  figurinha: 'Figurinha',
  sorteio: 'Sorteio in-app',
  p: 'Pública /p/',
};
// Uma campanha nova nasce marcada só no Início — o dono liga as outras à mão.
const PAGINAS_NOVA_CAMPANHA = Object.fromEntries(Object.keys(NOMES_PAGINA).map((pg) => [pg, pg === 'inicio']));

// ─── ABA "ANÚNCIOS" ──────────────────────────────────────────────────────────
function AbaAnuncios({ op, pub, onSalvarOp }) {
  const [novaCamp, setNovaCamp] = useState({ nome: '', anunciante: '', texto: '', link: '', cls: 'livre', fim: '', paginas: { ...PAGINAS_NOVA_CAMPANHA } });
  const ativoGeral = op.ads_ativo !== false;

  async function addCampanha() {
    if (!novaCamp.nome.trim()) return;
    const paginas = Object.entries(novaCamp.paginas).filter(([, v2]) => v2).map(([k]) => k);
    const c = { id: uid(), nome: novaCamp.nome.trim(), anunciante: novaCamp.anunciante.trim(), texto: novaCamp.texto.trim() || novaCamp.nome.trim(), sub: novaCamp.anunciante.trim(), cta: 'Ver', link: novaCamp.link.trim(), cls: novaCamp.cls, inicio: '', fim: novaCamp.fim.trim(), paginas, estado: 'ativa' };
    // O motor recusa um link que não é http(s) (ex.: "javascript:…"): nesse caso a campanha não entra, o aviso da recusa já saiu na tela
    // e o formulário fica como está, para o dono corrigir o link em vez de digitar tudo de novo.
    const salvo = await onSalvarOp('campanhas', [...(op.campanhas || []), c]);
    if (salvo) setNovaCamp({ nome: '', anunciante: '', texto: '', link: '', cls: 'livre', fim: '', paginas: { ...PAGINAS_NOVA_CAMPANHA } });
  }
  const setEstadoCamp = (id, estado) => onSalvarOp('campanhas', op.campanhas.map((c) => (c.id === id ? { ...c, estado } : c)));
  const delCamp = (id) => onSalvarOp('campanhas', op.campanhas.filter((c) => c.id !== id));

  const receitaAnuncios = null; // sem fonte de receita por anúncio ainda (só imp/cli)

  return (
    <div>
      {/* Regra do dono: publicidade vale para todos os planos — Pro/Elite veem metade das oportunidades
          elegíveis, nunca zero. Ninguém tem `plan` pago hoje (Free/Pro/Elite saíram das telas sem nunca terem
          cobrado nada), então na prática todo mundo vê. A régua de metade (services/inicio.js#metadeDasVezes)
          fica no código, dormente, para quando existirem planos pagos de anúncios. */}
      <p style={{ ...muted, marginBottom: 14 }}>
        Todos veem anúncios; a regra de metade fica para quando houver planos pagos de anúncios.
      </p>

      <h2 style={sectionH2}>Interruptor geral</h2>
      <div style={{ ...CARD, padding: 16, display: 'flex', alignItems: 'center', gap: 14 }}>
        <input
          type="checkbox"
          checked={ativoGeral}
          onChange={(e) => onSalvarOp('ads_ativo', e.target.checked)}
          style={{ width: 22, height: 22 }}
        />
        <div>
          <div style={{ fontSize: 14, fontWeight: 700 }}>Anúncios no app: {ativoGeral ? 'ligado' : 'desligado'}</div>
          <div style={muted}>Desligado corta anúncio em toda tela, mesmo nas que estiverem marcadas abaixo.</div>
        </div>
      </div>

      <h2 style={sectionH2}>Interruptores por página <span style={{ fontWeight: 400, color: '#8a8a98', textTransform: 'none' }}>(default desligado)</span></h2>
      <div style={{ ...CARD, padding: 14, opacity: ativoGeral ? 1 : 0.5 }}>
        {!ativoGeral ? <p style={{ ...muted, marginBottom: 8 }}>Interruptor geral desligado. Estes interruptores não têm efeito agora.</p> : null}
        {Object.keys(NOMES_PAGINA).map((pg) => (
          <div key={pg} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', borderTop: '1px solid #1a1a1a' }}>
            <span style={{ flex: 1, fontSize: 13, color: '#c9c2d6' }}>{NOMES_PAGINA[pg]}</span>
            <input type="checkbox" checked={!!op.toggles?.[pg]} onChange={(e) => onSalvarOp('toggles', { ...(op.toggles || {}), [pg]: e.target.checked })} style={{ width: 20, height: 20 }} />
          </div>
        ))}
      </div>

      <h2 style={sectionH2}>Campanhas</h2>
      {(pub?.alertas || []).length ? (
        <div style={{ ...CARD, padding: 10, marginBottom: 10, borderColor: 'rgba(253,164,175,.35)' }}>
          {pub.alertas.map((a, i) => <div key={i} style={{ color: '#fda4af', fontSize: 12, padding: '2px 0' }}>⚠ {a}</div>)}
        </div>
      ) : null}
      <div style={{ ...CARD, padding: 14 }}>
        {(pub?.campanhas || []).length === 0 ? <div style={{ fontSize: 13, color: 'var(--text-dim)', padding: '8px 0' }}>Sem campanhas. Crie a 1ª abaixo.</div>
          : pub.campanhas.map((c) => {
            const ctr = formatarDecimal(c.imp ? (c.cli / c.imp) * 100 : 0, 1);
            return (
              <div key={c.id} style={{ display: 'grid', gridTemplateColumns: '1.4fr .9fr auto auto', alignItems: 'center', gap: 8, padding: '9px 0', borderTop: '1px solid #1a1a1a', fontSize: 12.5 }}>
                <div><div style={{ fontWeight: 700, fontSize: 13.5 }}>{c.nome}</div><div style={muted}>{c.anunciante || '-'} · {(c.paginas || []).map((pg) => NOMES_PAGINA[pg] || pg).join(', ') || 'sem página'} · <span style={{ color: c.cls === 'livre' ? '#7bd88f' : '#fda4af' }}>{c.cls === 'livre' ? 'livre' : '18+'}</span></div></div>
                <div style={muted}>{c.imp} imp · {c.cli} cli · CTR {ctr}%{c.dias_restantes != null ? ` · ${c.dias_restantes}d` : ''}</div>
                <span style={{ ...chip, borderColor: c.estado === 'ativa' ? '#7bd88f' : '#f0c94a', color: c.estado === 'ativa' ? '#7bd88f' : '#f0c94a', cursor: 'pointer' }} onClick={() => setEstadoCamp(c.id, c.estado === 'ativa' ? 'pausada' : 'ativa')}>{c.estado === 'ativa' ? 'ativa' : c.estado === 'pausada' ? 'pausada ▸' : 'terminada'}</span>
                <span style={{ color: '#6a6a76', cursor: 'pointer' }} onClick={() => delCamp(c.id)}>✕</span>
              </div>
            );
          })}
        <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginTop: 12, paddingTop: 12, borderTop: '1px dashed rgba(255,255,255,.12)' }}>
          <input placeholder="Nome da campanha" style={{ ...inp, flex: '1.3 1 110px' }} value={novaCamp.nome} onChange={(e) => setNovaCamp({ ...novaCamp, nome: e.target.value })} />
          <input placeholder="Anunciante" style={{ ...inp, flex: '1 1 90px' }} value={novaCamp.anunciante} onChange={(e) => setNovaCamp({ ...novaCamp, anunciante: e.target.value })} />
          <input placeholder="Texto do banner" style={{ ...inp, flex: '1.3 1 110px' }} value={novaCamp.texto} onChange={(e) => setNovaCamp({ ...novaCamp, texto: e.target.value })} />
          <input placeholder="Link (https://…)" style={{ ...inp, flex: '1 1 90px' }} value={novaCamp.link} onChange={(e) => setNovaCamp({ ...novaCamp, link: e.target.value })} />
          <select style={{ ...inp, width: 90 }} value={novaCamp.cls} onChange={(e) => setNovaCamp({ ...novaCamp, cls: e.target.value })}><option value="livre">livre</option><option value="18+">18+</option></select>
          <input placeholder="fim (AAAA-MM-DD)" style={{ ...inp, width: 140 }} value={novaCamp.fim} onChange={(e) => setNovaCamp({ ...novaCamp, fim: e.target.value })} />
          {Object.keys(NOMES_PAGINA).map((pg) => (
            <label key={pg} style={{ fontSize: 11, color: '#c9c2d6', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <input type="checkbox" checked={!!novaCamp.paginas[pg]} onChange={(e) => setNovaCamp({ ...novaCamp, paginas: { ...novaCamp.paginas, [pg]: e.target.checked } })} />{NOMES_PAGINA[pg]}
            </label>
          ))}
          <button type="button" style={btnGold} onClick={addCampanha}>+ Criar campanha</button>
        </div>
      </div>

      <h2 style={sectionH2}>Receita de anúncios</h2>
      <div style={{ ...CARD, padding: 16, color: 'var(--text-dim)', fontSize: 13 }}>
        {receitaAnuncios == null ? 'Sem receita de anúncios ainda.' : fmtUSD(receitaAnuncios)}
      </div>
    </div>
  );
}

export { AbaAnuncios };
