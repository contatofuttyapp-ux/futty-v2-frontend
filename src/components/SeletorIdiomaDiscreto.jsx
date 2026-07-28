// Futty v2.0 — Seletor de língua discreto para páginas PÚBLICAS (/p/, campeonato
// público): a deteção já acerta a língua do dispositivo na maioria dos casos; isto
// é só a saída de emergência para quem quiser trocar. 6 bandeiras, sem legenda longa.
import { useState } from 'react';
import { useI18n } from '../context/I18nContext';

export default function SeletorIdiomaDiscreto({ style }) {
  const { idioma, setIdioma, idiomas } = useI18n();
  const [aberto, setAberto] = useState(false);
  const atual = idiomas.find((i) => i.id === idioma) || idiomas[0];

  return (
    <div style={{ position: 'relative', display: 'inline-block', ...style }}>
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        aria-label="Trocar idioma"
        style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 999, padding: '4px 10px', fontSize: 13, color: '#fff', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5 }}
      >
        <span aria-hidden="true">{atual.bandeira}</span>
      </button>
      {aberto ? (
        <div style={{ position: 'absolute', right: 0, top: '100%', marginTop: 4, background: 'rgba(10,10,14,0.98)', border: '1px solid rgba(255,255,255,0.14)', borderRadius: 10, padding: 6, display: 'grid', gap: 2, zIndex: 20, minWidth: 150 }}>
          {idiomas.map((i) => (
            <button
              key={i.id}
              type="button"
              onClick={() => { setIdioma(i.id); setAberto(false); }}
              style={{ display: 'flex', alignItems: 'center', gap: 8, background: i.id === idioma ? 'rgba(212,160,23,0.14)' : 'transparent', border: 'none', color: '#fff', fontSize: 13, padding: '6px 8px', borderRadius: 6, cursor: 'pointer', textAlign: 'left' }}
            >
              <span aria-hidden="true">{i.bandeira}</span> {i.nome}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
