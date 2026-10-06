// Futty v2.0 — o que a página do convite escreve. Puro (sem React, sem rede), para testar no Node.
import { plural } from './plural';
import { TZ_PADRAO } from './dataHora';

const UM_DIA = 86400000;

/**
 * Data curta do próximo jogo, no relógio do CAMPO (fuso do time): "hoje", "amanhã" ou "sáb, 4 out".
 * "Hoje" e "amanhã" também são os do campo: o jogo de amanhã às 20h em São Paulo é "amanhã" para quem abre
 * o convite de Lisboa. `fuso` é o do time (o motor manda em `info.fuso`); sem ele vale TZ_PADRAO, nunca o
 * relógio do aparelho. `agora` só existe para o teste ser determinístico.
 */
export function dataCurta(iso, { agora = new Date(), fuso = TZ_PADRAO } = {}) {
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
  const quando = info?.proximoJogo ? dataCurta(info.proximoJogo, { fuso: info.fuso, ...opcoes }) : null;
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

/**
 * O link do convite que vai para o grupo: o curto, futtyapp.com.br/c/<código>, quando o motor deu um
 * código (migração 072); senão o longo, /convite/<uuid>, que continua valendo. `origem` é a do SITE
 * (ORIGEM_DO_SITE em lib/linkDoSite.js), nunca a de quem está olhando.
 */
export function linkDoConvite({ origem, token, codigo }) {
  return codigo ? `${origem}/c/${codigo}` : `${origem}/convite/${token}`;
}

/**
 * A frase do WhatsApp (do dono): "Bora jogar? Você foi chamado para o <time> no Futty. Entre pelo link:
 * <link>"
 */
export function textoDoConvite({ nomeTime, link }) {
  const nome = String(nomeTime ?? '').trim() || 'time';
  return `Bora jogar? Você foi chamado para o ${nome} no Futty. Entre pelo link: ${link}`;
}

/** O endereço do WhatsApp com a frase pronta (abre a escolha do grupo; o app ou o WhatsApp Web). */
export function enderecoDoWhatsapp({ nomeTime, link }) {
  return `https://wa.me/?text=${encodeURIComponent(textoDoConvite({ nomeTime, link }))}`;
}
