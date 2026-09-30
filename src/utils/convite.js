// Futty v2.0 — Rodada 29B (A): o que a página do convite escreve. Puro (sem React, sem rede), para testar no Node.
import { plural } from './plural';

const UM_DIA = 86400000;

/**
 * Data curta do próximo jogo, no fuso de quem olha: "hoje", "amanhã" ou "sáb, 4 out".
 * `agora` e `fuso` só existem para o teste ser determinístico; o app usa os do aparelho.
 */
export function dataCurta(iso, { agora = new Date(), fuso } = {}) {
  const d = new Date(iso);
  if (!iso || Number.isNaN(d.getTime())) return null;
  const fmt = (opcoes) => new Intl.DateTimeFormat('pt-BR', { timeZone: fuso, ...opcoes });
  const dia = (x) => fmt({ year: 'numeric', month: 'numeric', day: 'numeric' }).format(x);
  if (dia(d) === dia(agora)) return 'hoje';
  if (dia(d) === dia(new Date(agora.getTime() + UM_DIA))) return 'amanhã';
  const partes = Object.fromEntries(fmt({ weekday: 'short', day: 'numeric', month: 'short' }).formatToParts(d).map((p) => [p.type, p.value]));
  const limpa = (s) => String(s || '').replace(/\./g, '');
  return `${limpa(partes.weekday)}, ${partes.day} ${limpa(partes.month)}`;
}

/**
 * Os 2–3 fatos que dão vontade de entrar: quantos jogam, quando é o próximo jogo, de que cidade.
 * Só entra o que existe — time sem jogo marcado e sem cidade mostra um fato só, sem buraco.
 */
export function fatosDoConvite(info, opcoes) {
  const fatos = [];
  const n = Number(info?.membros);
  if (Number.isFinite(n) && n > 0) fatos.push({ chave: 'membros', texto: `${n} ${plural(n, 'jogador', 'jogadores')}` });
  const quando = info?.proximoJogo ? dataCurta(info.proximoJogo, opcoes) : null;
  if (quando) fatos.push({ chave: 'jogo', texto: `Próximo jogo ${quando}` });
  const cidade = String(info?.cidade ?? '').trim();
  if (cidade) fatos.push({ chave: 'cidade', texto: cidade });
  return fatos;
}

/** "Tonhão te convidou para o Várzea FC" — sem saber quem convidou, "Você foi convidado para o Várzea FC". */
export function fraseDoConvite({ convidadoPor, nomeTime }) {
  const nome = String(nomeTime ?? '').trim() || 'time';
  const quem = String(convidadoPor ?? '').trim();
  return quem ? `${quem} te convidou para o ${nome}` : `Você foi convidado para o ${nome}`;
}
