// Futty v2.0 — Figurinha: os selos de honra, com o olhinho que mostra/oculta cada um no cromo (máx. 2).
import SeloHonra from '../../components/SeloHonra';

export default function SelosDaFigurinha({ selos, selosOcultos, selosVisiveis, toggleSelo }) {
  return (
    <>
          {selos.length ? (
              <div style={{ marginTop: 22 }}>
                <div style={{ fontFamily: "'Rajdhani', sans-serif", fontWeight: 800, fontSize: 13, letterSpacing: '.06em', color: '#f0c94a', textTransform: 'uppercase', marginBottom: 4 }}>Selos de honra</div>
                <p className="texto-apoio" style={{ marginTop: 0, marginBottom: 12 }}>Toque no olho para mostrar ou ocultar no card (máx. 2). A honra fica sempre na sua vitrine.</p>
                <div style={{ display: 'grid', gap: 10 }}>
                  {selos.map((s) => {
                    const oculto = selosOcultos.has(s.id);
                    const visivel = selosVisiveis.some((v) => v.id === s.id);
                    return (
                      <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 10px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.10)', opacity: oculto ? 0.5 : 1, clipPath: 'polygon(4px 0,calc(100% - 4px) 0,100% 4px,100% calc(100% - 4px),calc(100% - 4px) 100%,4px 100%,0 calc(100% - 4px),0 4px)' }}>
                        <SeloHonra tier={s.tier} label={s.label} size={54} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, fontSize: 14, color: '#fff' }}>{s.label}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>{s.sub}{s.fonte === 'ranking' ? ' · vivo' : s.historico ? ' · histórico' : s.ativa ? ` · ${s.dias_restantes}d no card` : ''}</div>
                        </div>
                        {!visivel && !oculto ? <span style={{ fontSize: 10, color: '#6f6a80' }}>só vitrine</span> : null}
                        <button type="button" aria-label={oculto ? 'Mostrar' : 'Ocultar'} onClick={() => toggleSelo(s.id)} style={{ border: '1px solid rgba(255,255,255,0.18)', background: 'transparent', color: oculto ? '#6f6a80' : '#f0c94a', cursor: 'pointer', borderRadius: 6, padding: '6px 8px', display: 'grid', placeItems: 'center' }}>
                          {oculto
                            ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 10 8 10 8a13.16 13.16 0 0 1-1.67 2.68M6.61 6.61A13.526 13.526 0 0 0 2 12s3 8 10 8a9.74 9.74 0 0 0 5.39-1.61M2 2l20 20M9.88 9.88a3 3 0 1 0 4.24 4.24" /></svg>
                            : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-8 10-8 10 8 10 8-3 8-10 8-10-8-10-8Z" /><circle cx="12" cy="12" r="3" /></svg>}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
          ) : null}
    </>
  );
}
