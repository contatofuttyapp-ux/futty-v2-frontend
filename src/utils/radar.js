// Futty v2.0 — Rodada 29T (bloco A, achados 159 e 161): o que o Radar de peladas diz depois de entrar num time e o título da lista.
// Título (161): "Perto de você" só com a localização ligada; com uma cidade escolhida, "Em <cidade>"; sem nenhuma das duas a lista é de TODOS os
// times abertos, e o título conta isso. Antes dizia "Times perto de você" para quem não tinha dado posição nenhuma (e a lista trazia Lisboa).

export const TITULO_SEM_LOCAL = 'Peladas abertas a novos jogadores';

/**
 * @param {{ origem?: 'localizacao'|'cidade'|null, cidade?: string }} [opcoes]
 *   origem  de onde veio a posição da pessoa: o botão "Usar minha localização" ou a cidade que ela escolheu (null = nenhuma)
 *   cidade  o nome da cidade escolhida, como a pessoa a viu
 */
export function tituloDoRadar({ origem = null, cidade = '' } = {}) {
  if (origem === 'localizacao') return 'Perto de você';
  const nome = String(cidade ?? '').trim();
  if (origem === 'cidade' && nome) return `Em ${nome}`;
  return TITULO_SEM_LOCAL;
}

/**
 * A lista do Radar depois de "Entrar" / "Pedir entrada" num time (achado 159). Entrou (time aberto): o card comemora — `entrou_agora`
 * troca o "Você já é membro" por "Você entrou!" + "Ver o time" — e a contagem sobe 1 (a lista foi lida antes de a pessoa entrar).
 * "Você já é membro" fica só para quem já era membro quando abriu a tela. Pediu (time com aprovação): fica o pedido pendente.
 */
export function depoisDePedirEntrada(equipas, slug, entrou) {
  return equipas.map((t) => (t.slug === slug
    ? {
      ...t,
      ja_membro: entrou || t.ja_membro,
      pedido_pendente: !entrou,
      entrou_agora: entrou || t.entrou_agora,
      membro_count: entrou ? (t.membro_count || 0) + 1 : t.membro_count,
    }
    : t));
}
