// Futty v2.0 — Os estilos do Perfil: o cartão, o rótulo e os campos.

// Cards da página. O borderRadius: 12 saiu: quem manda nos cantos agora é o
// .hud-corners (clip-path a 45°), que anula qualquer radius — deixá-lo aqui só
// mentia a quem viesse ler. Todo o div que espalha o CARD leva a classe.
// A borda passa de 1px a 1.2px para bater certo com os cards dos Planos
// (Planos.jsx:166), a página de referência. Véu e cor já eram os mesmos; a largura
// era a única coisa que divergia. 0.2px não se vê — mas o cânone é os valores
// baterem certo, não o olho não dar por eles.
const CARD = { background: 'rgba(255,255,255,0.03)', border: '1.2px solid rgba(255,255,255,0.06)' };

// Labels dos campos administrativos: Rajdhani 600, recuados. O nome de jogador
// tem o seu (dourado, 700) inline — é o único que não é administrativo.
const labelStyle = {
  fontFamily: "'Rajdhani', sans-serif",
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: 'rgba(255,255,255,0.35)',
};

// O borderRadius: 8 saiu — quem manda é o .hud-corners-s no JSX.
// O fontFamily EXPLÍCITO não é decoração: o index.css dá `font-family: inherit` ao
// <button> mas NÃO ao <input>, por isso um input sem família cai no tipo de letra do
// browser e não no do app. Estes campos são leitura (o que se escreve), logo --sans.
const inputStyle = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '10px 14px',
  border: '1px solid rgba(255,255,255,0.08)',
  background: 'rgba(255,255,255,0.04)',
  color: '#ffffff',
  fontFamily: 'var(--sans)',
  fontSize: 16, // abaixo de 16 o iPhone dá zoom ao focar (ver index.css)
};

// O HERO. O que se escreve aqui vai desenhado na placa do cromo, por isso o input
// mostra-o já com o peso e o dourado com que vai aparecer lá.
// DOURADO SÓLIDO e não o gradiente do nome do card — medido, não por gosto: o
// gradiente pinta-se sobre a CAIXA, não sobre as letras. "Chavo" mede 46px numa
// caixa de 741px → o texto só amostra 6.2% do gradiente, ou seja o arranque branco.
// Nem um nome de 18 caracteres (o máximo) chega ao stop dourado dos 40%: pára nos
// 35%. E a fatia muda com o comprimento do nome e com a largura do ecrã, portanto a
// cor do nome variava de pessoa para pessoa. No Início o gradiente resulta porque
// ali vive num elemento justo ao texto; num input largo, não.
const inputNomeStyle = {
  ...inputStyle,
  fontFamily: "'Rajdhani', sans-serif",
  fontSize: 23,
  fontWeight: 700,
  letterSpacing: '0.06em',
  color: '#f0c94a',
  background: 'rgba(0,0,0,0.25)',
  border: '1px solid rgba(212,160,23,0.3)',
};

export { CARD, inputNomeStyle, inputStyle, labelStyle };
