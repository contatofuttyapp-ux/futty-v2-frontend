// Futty v2.0 — Rodada 29A (G) / 29H (item 8): a escolha entre jogar na linha ou no gol. Vivia num chip no meio da página do
// time e o dono não a achou; na 29A virou um botão "Você joga na linha · trocar" no card do próprio jogador e no Perfil.
// 29H: dois chips LADO A LADO — "Jogo na linha" | "No gol" —, um aceso (dourado), padrão linha: é a mesma escolha das
// boas-vindas do time, e a pessoa vê as duas opções sem adivinhar o que o toque faz. Quem grava é quem usa
// (PATCH /api/equipas/:slug/membros/posicao, que já existia): `aoTrocar(true)` = no gol, `aoTrocar(false)` = na linha.
export const TEXTO_APOIO_LINHA_GOL = 'Vale para os sorteios deste time. Dá para mudar em cada jogo.';

// Item 69 (Rodada 29, no bloco 3 da 29I): "admin" e "posição em campo" são coisas separadas — gente achava que virar admin mudava
// onde jogava, ou que o goleiro tinha de ser o admin.
export const TEXTO_ADMIN_E_POSICAO = 'Admin é quem organiza o time. Não tem nada a ver com a posição em campo: linha ou gol, cada um escolhe no próprio card.';

// Rodada 29B (E): o papel de quem administra o time. "Só organizo" administra tudo (jogos, sorteio, resultados, Resenha)
// mas fica fora da lista de presença, do sorteio, do ranking e do pacote de figurinhas. Mora aqui (e não num arquivo novo)
// porque o Criar time e o painel do time o usam, e um módulo compartilhado a mais pesaria no arranque do app.
// 29H (item 43): o texto acompanha a opção marcada (antes ficava sempre o de "só organizo", mesmo com "Eu jogo" aceso).
export const TEXTO_APOIO_PAPEL = 'Você cuida de tudo, mas não entra na lista de presença, no sorteio nem no ranking, e não ocupa vaga no pacote de figurinhas. Dá para mudar depois.';
export const TEXTO_APOIO_JOGA = 'Você joga e também cuida de tudo: entra na lista de presença, no sorteio e no ranking. Dá para mudar depois.';

/** Os dois chips "Eu jogo" / "Só organizo o time" e o texto que explica. */
export function EscolhaPapel({ joga, ocupado = false, aoTrocar }) {
  return (
    <div data-escolha-papel>
      <div role="group" aria-label="Seu papel no time" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button type="button" className={`chip ${joga ? 'chip--active' : ''}`} aria-pressed={joga} disabled={ocupado} onClick={() => aoTrocar(true)}>
          Eu jogo
        </button>
        <button type="button" className={`chip ${!joga ? 'chip--active' : ''}`} aria-pressed={!joga} disabled={ocupado} onClick={() => aoTrocar(false)}>
          Só organizo o time
        </button>
      </div>
      <p className="texto-apoio" data-texto-papel={joga ? 'joga' : 'organiza'} style={{ marginTop: 8 }}>{joga ? TEXTO_APOIO_JOGA : TEXTO_APOIO_PAPEL}</p>
    </div>
  );
}

export default function EscolhaLinhaGol({ goleiro, ocupado = false, aoTrocar }) {
  return (
    <div data-escolha-linha-gol role="group" aria-label="Como você joga" style={{ display: 'flex', gap: 8, flexWrap: 'nowrap' }}>
      <button type="button" className={`chip ${!goleiro ? 'chip--active' : ''}`} aria-pressed={!goleiro} disabled={ocupado} onClick={() => { if (goleiro) aoTrocar(false); }}>
        Jogo na linha
      </button>
      <button type="button" className={`chip ${goleiro ? 'chip--active' : ''}`} aria-pressed={!!goleiro} disabled={ocupado} onClick={() => { if (!goleiro) aoTrocar(true); }}>
        No gol
      </button>
    </div>
  );
}
