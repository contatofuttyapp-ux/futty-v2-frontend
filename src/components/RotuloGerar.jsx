// Futty v2.0 — Rodada 29L (achado 132): o texto do botão "Gerar minha figurinha". Quebrava em duas linhas ao lado de "Trocar foto" em uma, e o par
// ficava torto. Agora é uma linha só (.fig-gerar, app.css: sem quebra e com o mesmo respiro lateral do "Trocar foto"); em tela de 410 px ou
// menos (o 390 do iPhone padrão inclusive: o longo precisa de ~221 px e sobram 216), o rótulo encurta para "Gerar figurinha" (a frase da
// VOZ-FUTTY §4) em vez de quebrar. O curto é escondido por CSS (.rotulo-gerar-*), então só um dos dois existe para o leitor de tela.
export default function RotuloGerar() {
  return (
    <>
      <span className="rotulo-gerar-longo">Gerar minha figurinha</span>
      <span className="rotulo-gerar-curto">Gerar figurinha</span>
    </>
  );
}
