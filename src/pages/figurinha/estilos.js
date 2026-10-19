// Futty v2.0 — Figurinha: os estilos que se repetem iguais em mais de um lugar da tela, com nome.

// O losango dourado no canto de cima dos cartões.
const losangoDoCanto = { position: 'absolute', top: 8, right: 10, width: 7, height: 7, borderRadius: 1, transform: 'rotate(45deg)', background: 'linear-gradient(135deg, #f5e070, #d4a017)' };
// Os botões de compra do cartão da loja.
const botaoDaLoja = { flex: 1, fontSize: 12.5, lineHeight: 1.3 };
// O miolo dos avisos por cima do card (sem gerações, foto recusada, erro).
const avisoCentrado = { display: 'grid', justifyItems: 'center', gap: 12, padding: 16, textAlign: 'center' };
// O F apagado no topo desses avisos.
const logoApagado = { opacity: 0.55, lineHeight: 0 };
// O botão desses avisos.
const botaoDoAviso = { height: 38, paddingLeft: 16, paddingRight: 16, fontSize: 13 };

export { avisoCentrado, botaoDaLoja, botaoDoAviso, logoApagado, losangoDoCanto };
