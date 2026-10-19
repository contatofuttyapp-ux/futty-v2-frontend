// Futty v2.0 — Início: o "Agora não" dos lembretes sem prazo.

// O "Agora não" dos lembretes sem prazo — esconde o lembrete por 7 dias neste aparelho e a fila anda (a
// conta está em utils/lembretes.js).
function AgoraNao({ onClick }) {
  return (
    <button type="button" data-agora-nao onClick={onClick} style={{ border: 'none', background: 'transparent', color: 'var(--text-dim)', cursor: 'pointer', fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, fontSize: 12, letterSpacing: '0.04em', padding: '4px 2px', flexShrink: 0 }}>
      Agora não
    </button>
  );
}

export { AgoraNao };
