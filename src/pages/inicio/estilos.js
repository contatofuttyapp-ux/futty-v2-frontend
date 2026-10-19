// Futty v2.0 — Início: os estilos que se repetem iguais nos avisos do topo, com nome.

// A coluna de texto de cada aviso (encolhe sem empurrar o botão).
const textoDoAviso = { flex: 1, minWidth: 0 };
// A linha de baixo, menor, de cada aviso.
const subDoAviso = { display: 'block', fontSize: 11, color: 'var(--text-dim)', marginTop: 2 };
// A frase única dos avisos de uma linha.
const fraseDoAviso = { flex: 1, fontSize: 13, color: '#fff' };
// A miniatura da figurinha dentro do aviso.
const fotoQueCobre = { width: '100%', height: '100%', objectFit: 'cover' };

export { fotoQueCobre, fraseDoAviso, subDoAviso, textoDoAviso };
