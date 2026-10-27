// Futty v2.0 — A mensalidade do time e o "Traga seu histórico": as contas puras das telas (o teste roda no Node).
//
// "Como pagar" é texto livre do admin. Só vira o botão "Pagar" quando COMEÇA com http:// ou https:// e é um endereço de verdade: o
// botão abre fora do app e mostra o domínio antes ("abre picpay.me"), para ninguém tocar num link disfarçado. Qualquer outro esquema
// (javascript:, intent:, data:, um "pix://"…) é texto e ganha o "Copiar" — nunca vira link (a sessão mora no localStorage).
import { ORIGEM_DO_SITE } from '../lib/linkDoSite.js';

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

export const STATUS = {
  pago: 'Pago',
  avisou: 'Avisou que pagou',
  aberto: 'Em aberto',
};

/**
 * O jeito de pagar escrito pelo admin → { link: { href, dominio } | null, texto: string | null }. Com link, `texto` é o que vem depois
 * do endereço (ex.: "https://picpay.me/ze  mande o print no grupo" → link + "mande o print no grupo"). Vazio → null.
 */
export function jeitoDePagar(como) {
  const t = String(como ?? '').trim();
  if (!t) return null;
  if (/^https?:\/\//i.test(t)) {
    const [primeiro, ...resto] = t.split(/\s+/);
    try {
      const url = new URL(primeiro);
      if ((url.protocol === 'https:' || url.protocol === 'http:') && url.hostname) {
        return { link: { href: url.href, dominio: url.hostname.replace(/^www\./i, '') }, texto: resto.join(' ').trim() || null };
      }
    } catch {
      /* não é endereço: vale como texto */
    }
  }
  return { link: null, texto: t };
}

/** "2026-10" → "Outubro de 2026". */
export function nomeDoMes(mes) {
  const m = /^(\d{4})-(\d{2})$/.exec(String(mes || ''));
  if (!m) return '';
  const nome = MESES[Number(m[2]) - 1] || '';
  return `${nome.charAt(0).toUpperCase()}${nome.slice(1)} de ${m[1]}`;
}

/** O mês antes/depois ("2026-01", -1 → "2025-12"). */
export function outroMes(mes, delta) {
  const [a, m] = String(mes).split('-').map(Number);
  const total = a * 12 + (m - 1) + delta;
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, '0')}`;
}

/** "2026-10-10" → "10/10". A data é do relógio do time (o motor já fez a conta): só se reescreve, sem fuso nenhum. */
export function diaDoVencimento(vencimento) {
  const m = /^\d{4}-(\d{2})-(\d{2})$/.exec(String(vencimento || ''));
  return m ? `${m[2]}/${m[1]}` : null;
}

/** "8 de 15 pagaram" (com "1 de 15 pagou"). */
export function textoDoContador({ pagos, total }) {
  return `${pagos} de ${total} ${pagos === 1 ? 'pagou' : 'pagaram'}`;
}

// ─── "Traga seu histórico" ───────────────────────────────────────────────────────────────────────────────────────────────────

export const EMAIL_DO_HISTORICO = 'contato@futtyapp.com';
const CHAVE_FECHADO = (teamId) => `futty_historico_fechado:${teamId}`;
const fechadosNaSessao = new Set();

/** O admin já fechou o card deste time (neste aparelho)? Sem armazenamento, vale a memória da sessão. */
export function historicoFechado(teamId) {
  if (!teamId) return true;
  if (fechadosNaSessao.has(teamId)) return true;
  try {
    return localStorage.getItem(CHAVE_FECHADO(teamId)) === '1';
  } catch {
    return false;
  }
}

export function fecharHistorico(teamId) {
  fechadosNaSessao.add(teamId);
  try {
    localStorage.setItem(CHAVE_FECHADO(teamId), '1');
  } catch {
    /* sem armazenamento: fica só a memória da sessão */
  }
}

/** O mailto: com o assunto e o corpo-modelo (o link do time e o que mandar). */
export function emailDoHistorico({ nome, slug }, origem = ORIGEM_DO_SITE) {
  const assunto = `Histórico do time ${nome}`;
  const corpo = [
    'Oi, Futty!',
    '',
    `Quero trazer o histórico do time ${nome} para o app.`,
    '',
    `Link do time: ${origem}/time/${slug}`,
    '',
    'Anexei a planilha ou os prints com: nomes, jogos, gols, vitórias e campeões.',
  ].join('\n');
  return `mailto:${EMAIL_DO_HISTORICO}?subject=${encodeURIComponent(assunto)}&body=${encodeURIComponent(corpo)}`;
}
