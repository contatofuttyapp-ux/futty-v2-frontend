// Futty v2.0 — O selo do sorteio: o que a tela diz sobre COMO os times foram feitos.
//
// O sorteio feito na frente de todo mundo tem de ser verdade na tela. O motor anota em `times_resultado.registro`
// quem sorteou, quem montou à mão e quem fez cada ajuste (backend utils/registroDoSorteio.js); aqui isso vira:
//   · sorteado              — saiu da roleta e ninguém mexeu (selo ouro)
//   · sorteado e ajustado   — saiu da roleta e alguém trocou gente de lugar depois (selo roxo, com o nome); a
//                             roleta mostra o ORIGINAL, depois vêm as trocas e os times finais
//   · montado à mão         — sem roleta nenhuma (selo prata, com o nome); "Ver times" no lugar de "Ver sorteio"
// Puro (sem React, sem rede): o selo, a cerimônia, a apresentação, os cartões e o link público leem daqui.
import { nomeDoTimeNaTela } from './nomeDoTime';

/** As cores de cada selo (o mesmo da tela e do cartão desenhado em canvas): chapa de `de` → `ate`, letra `texto`. */
export const CORES_DO_SELO = {
  sorteado: { de: '#c8940f', ate: '#f0c94a', texto: '#1a1206', detalhe: '#c9a24a' },
  ajustado: { de: '#6d3fe0', ate: '#a78bfa', texto: '#ffffff', detalhe: '#c9b6ff' },
  manual: { de: '#9aa3b5', ate: '#d7dce6', texto: '#1c1f26', detalhe: '#b9c0cf' },
};

/** A chave de um jogador para comparar listas: o id de quem tem conta, o nome de quem é convidado sem app. */
export function chaveDoJogador(j) {
  if (!j) return null;
  return j.user_id ? `u:${j.user_id}` : `c:${String(j.nome || '').trim().toLowerCase()}`;
}

/** O registro de um resultado; o antigo (sem registro): com seed foi sorteio, sem seed foi montado à mão — sem nome. */
export function registroDe(tr) {
  if (tr?.registro && typeof tr.registro === 'object') return tr.registro;
  return { origem: tr?.seed != null ? 'sorteio' : 'manual', por: null, ajustes: [] };
}

/** "Chavo" · "Chavo e Zé" · "Chavo, Zé e Beto". */
export function nomesJuntos(nomes) {
  if (nomes.length <= 1) return nomes[0] || '';
  return `${nomes.slice(0, -1).join(', ')} e ${nomes[nomes.length - 1]}`;
}

const distintos = (nomes) => [...new Set(nomes.map((n) => String(n || '').trim()).filter(Boolean))];

/** "Ouro", "Roxo"… (o nome de cor sem o "Time"); time com nome próprio fica com o nome dele. */
function nomeCurto(t, i) {
  return nomeDoTimeNaTela(t?.nome, i).replace(/^Time\s+/i, '');
}

function ondeEsta(times, reservas) {
  const onde = new Map();
  (times || []).forEach((t, i) => (t?.jogadores || []).forEach((j) => onde.set(chaveDoJogador(j), { i, j })));
  (reservas || []).forEach((j) => onde.set(chaveDoJogador(j), { i: 'reserva', j }));
  return onde;
}

/**
 * As trocas entre o que a roleta deu e os times de agora, uma por jogador que mudou de lugar, na ordem dos times
 * finais (e por último quem saiu de vez). Cada uma vem em duas partes — o nome em destaque, o resto da frase:
 *   { chave, nome, resto: 'saiu do Ouro para o Roxo' }
 */
export function trocasDoAjuste(original, final) {
  const antes = ondeEsta(original?.times, original?.reservas);
  const depois = ondeEsta(final?.times, final?.reservas);
  const nomeDoLugar = (times, i) => (i === 'reserva' ? null : nomeCurto(times?.[i], i));
  const trocas = [];
  for (const [chave, { i: para, j }] of depois) {
    const a = antes.get(chave);
    if (a && a.i === para) continue;
    const destino = para === 'reserva' ? 'a reserva' : `o ${nomeDoLugar(final.times, para)}`;
    let resto;
    if (!a) resto = para === 'reserva' ? 'entrou na reserva' : `entrou no ${nomeDoLugar(final.times, para)}`;
    else if (a.i === 'reserva') resto = `saiu da reserva para ${destino}`;
    else resto = `saiu do ${nomeDoLugar(original.times, a.i)} para ${destino}`;
    trocas.push({ chave, nome: j?.nome || 'Jogador', resto });
  }
  for (const [chave, { i, j }] of antes) {
    if (depois.has(chave)) continue;
    trocas.push({ chave, nome: j?.nome || 'Jogador', resto: i === 'reserva' ? 'saiu da reserva' : `saiu do ${nomeDoLugar(original.times, i)}` });
  }
  return trocas;
}

/**
 * Tudo o que as telas precisam para contar como os times foram feitos.
 * @returns {null | {
 *   tipo: 'sorteado'|'ajustado'|'manual',
 *   selo: { tipo, texto, detalhe },   // texto em caixa normal (a tela põe em maiúsculas); detalhe = "2º sorteio deste jogo" ou null
 *   daRoleta: object|null,            // o resultado que a máquina gira (no ajustado, o ORIGINAL); null no montado à mão
 *   final: { times, reservas },
 *   ajuste: null | { titulo, trocas, movidos: Set<string> },
 * }}
 */
export function visaoDoSorteio(tr) {
  if (!tr?.times?.length) return null;
  const reg = registroDe(tr);
  const final = { times: tr.times, reservas: tr.reservas || [] };
  const ajustadores = distintos((reg.ajustes || []).map((a) => a?.por?.nome));

  if (reg.origem === 'manual') {
    const nomes = distintos([reg.por?.nome, ...ajustadores]);
    const texto = nomes.length ? `Montado à mão por ${nomesJuntos(nomes)}` : 'Montado à mão';
    return { tipo: 'manual', selo: { tipo: 'manual', texto, detalhe: null }, daRoleta: null, final, ajuste: null };
  }

  // "Sortear de novo" apagava o sorteio de antes sem rastro: do 2º em diante o selo diz qual é (o motor conta).
  const numero = Number.isInteger(reg.sorteio_numero) ? reg.sorteio_numero : null;
  const detalhe = numero && numero >= 2 ? `${numero}º sorteio deste jogo` : null;
  // Ajustado só se alguém de fato mudou de lugar desde a roleta (mexer e voltar ao que era continua "sorteado").
  const trocas = reg.original ? trocasDoAjuste(reg.original, final) : [];
  if (trocas.length) {
    const quem = nomesJuntos(ajustadores);
    return {
      tipo: 'ajustado',
      selo: { tipo: 'ajustado', texto: quem ? `Sorteado e ajustado por ${quem}` : 'Sorteado e ajustado', detalhe },
      daRoleta: { ...tr, times: reg.original.times || [], reservas: reg.original.reservas || [] },
      final,
      ajuste: { titulo: quem ? `Ajuste de ${quem}` : 'Ajuste', trocas, movidos: new Set(trocas.map((t) => t.chave)) },
    };
  }
  return { tipo: 'sorteado', selo: { tipo: 'sorteado', texto: 'Sorteado', detalhe }, daRoleta: tr, final, ajuste: null };
}

/** Os times foram montados à mão (sem roleta)? É o "Ver times" no lugar do "Ver sorteio". */
export function montadoAMao(tr) {
  return registroDe(tr).origem === 'manual';
}
