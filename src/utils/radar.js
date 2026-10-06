// Futty v2.0 — o que o Radar de peladas diz depois de entrar num time e o título da lista. Título: "Perto
// de você" só com a localização ligada; com uma cidade escolhida, "Em <cidade>"; sem nenhuma das duas a
// lista é de TODOS os times abertos, e o título conta isso. Não dizer "Times perto de você" para quem não
// deu posição nenhuma (a lista trazia Lisboa).

export const TITULO_SEM_LOCAL = 'Peladas abertas a novos jogadores';

// O time se apresenta no Radar. Dentro do card, embaixo do nome: "Bairro · Cidade" e o "Sobre o time" em
// até 2 linhas; tocar no card abre um pop-up com tudo (escudo, nome, local, membros, aberto ou com
// aprovação, o "Sobre o time" inteiro e o botão de entrar).

/** "Guará · Brasília, DF": o bairro junto da cidade; só a cidade quando não há bairro (cidade sem bairros na lista, ou time antigo); sem cidade, a localização que o time escreveu. */
export function localDoTime({ bairro, cidade, localizacao } = {}) {
  const lugar = String(cidade || localizacao || '').trim();
  return [String(bairro ?? '').trim(), lugar].filter(Boolean).join(' · ');
}

/** Como o time recebe gente: "aberto" (entra na hora) ou "com aprovação" (o admin decide). */
export function rotuloDoModo(modo) {
  return modo === 'publico_aberto' ? 'aberto' : 'com aprovação';
}

/** O que o pop-up diz de um time antigo que ainda não escreveu o "Sobre o time". */
export const SEM_SOBRE_NO_POPUP = 'Este time ainda não contou como ele é.';

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
 * A lista do Radar depois de "Entrar" / "Pedir entrada" num time. Entrou (time aberto): o card comemora —
 * `entrou_agora` troca o "Você já é membro" por "Você entrou!" + "Ver o time" — e a contagem sobe 1 (a
 * lista foi lida antes de a pessoa entrar). "Você já é membro" fica só para quem já era membro quando abriu
 * a tela. Pediu (time com aprovação): fica o pedido pendente.
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
