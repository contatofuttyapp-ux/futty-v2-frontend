// Futty v2.0 — Rodada 29I (achado 83): UM lugar só para escrever data e hora de jogo.
//
// A hora de um jogo é a hora do CAMPO, sempre: quem viaja continua vendo "quinta, 20h". O jogo chega do motor como instante
// (ISO, UTC) e o time diz em que relógio ele se lê (`fuso`, nome IANA: America/Sao_Paulo, Europe/Lisbon…). Tudo aqui usa
// Intl.DateTimeFormat com timeZone EXPLÍCITO e locale pt-BR — nunca o relógio do aparelho. Sem `fuso` (resposta antiga, time
// sem a migração 076) vale TZ_PADRAO.
//
// Onde o relógio do aparelho vale de propósito (e este arquivo NÃO se usa): o Gabinete (o dono olhando datas do sistema, no
// relógio dele), o "há 5 h" (tempo decorrido, não data de calendário) e o Diagnóstico.

export const TZ_PADRAO = 'America/Sao_Paulo';

const instanteValido = (iso) => {
  if (iso == null || iso === '') return null;
  const d = iso instanceof Date ? iso : new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
};

const fusosConhecidos = new Map(); // fuso → ele mesmo, se o navegador o conhece; senão TZ_PADRAO

/** O fuso que veio, se o navegador o conhece; senão TZ_PADRAO. Nunca lança. */
export function fusoOuPadrao(fuso) {
  if (typeof fuso !== 'string' || !fuso.trim()) return TZ_PADRAO;
  let valido = fusosConhecidos.get(fuso);
  if (valido === undefined) {
    try {
      new Intl.DateTimeFormat('pt-BR', { timeZone: fuso });
      valido = fuso;
    } catch {
      valido = TZ_PADRAO;
    }
    fusosConhecidos.set(fuso, valido);
  }
  return valido;
}

const formatadores = new Map();
function formatador(fuso, opcoes) {
  const chave = `${fuso}|${JSON.stringify(opcoes)}`;
  let f = formatadores.get(chave);
  if (!f) {
    f = new Intl.DateTimeFormat('pt-BR', { timeZone: fuso, ...opcoes });
    formatadores.set(chave, f);
  }
  return f;
}
const formatar = (iso, fuso, opcoes) => {
  const d = instanteValido(iso);
  return d ? formatador(fusoOuPadrao(fuso), opcoes).format(d) : '';
};
const partesDe = (iso, fuso, opcoes) => {
  const d = instanteValido(iso);
  return d ? Object.fromEntries(formatador(fusoOuPadrao(fuso), opcoes).formatToParts(d).map((p) => [p.type, p.value])) : null;
};

const ESTILOS_DE_DATA = {
  curta: { weekday: 'short', day: 'numeric', month: 'short' }, // "qui., 8 de out."
  longa: { weekday: 'long', day: '2-digit', month: '2-digit' }, // "quinta-feira, 08/10"
  numerica: { day: '2-digit', month: '2-digit', year: 'numeric' }, // "08/10/2026"
  diaMes: { day: '2-digit', month: '2-digit' }, // "08/10"
  comAno: { day: 'numeric', month: 'short', year: 'numeric' }, // "8 de out. de 2026"
};

/**
 * A data do jogo no relógio do campo. `estilo`: 'curta' (padrão, "qui., 8 de out."), 'longa' ("quinta-feira, 08/10"),
 * 'numerica' ("08/10/2026"), 'diaMes' ("08/10") ou 'comAno' ("8 de out. de 2026").
 */
export function formatarData(iso, fuso, estilo = 'curta') {
  return formatar(iso, fuso, ESTILOS_DE_DATA[estilo] || ESTILOS_DE_DATA.curta);
}

/** A hora do jogo no relógio do campo: "20:00". Sempre HH:MM, em 24 h. */
export function formatarHora(iso, fuso) {
  return formatar(iso, fuso, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
}

/** Data e hora do jogo no relógio do campo: "qui., 8 de out. · 20:00". Uma forma só, em toda tela. */
export function formatarDataHora(iso, fuso) {
  const data = formatarData(iso, fuso);
  if (!data) return '';
  return `${data} · ${formatarHora(iso, fuso)}`;
}

/** O dia da semana do jogo no relógio do campo, por extenso e sem "-feira": "quinta", "sábado", "domingo". */
export function diaDaSemana(iso, fuso) {
  return formatar(iso, fuso, { weekday: 'long' }).replace(/-feira$/i, '');
}

/** O dia do mês (número, sem zero na frente) no relógio do campo. */
export function diaDoMes(iso, fuso) {
  const p = partesDe(iso, fuso, { day: 'numeric' });
  return p ? Number(p.day) : null;
}

/** O mês curto no relógio do campo, sem ponto: "out". */
export function mesCurto(iso, fuso) {
  return formatar(iso, fuso, { month: 'short' }).replace('.', '');
}

/** O dia de calendário ("AAAA-MM-DD") em que o instante cai, no relógio do fuso. */
export function diaDeCalendario(iso, fuso) {
  const p = partesDe(iso, fuso, { year: 'numeric', month: '2-digit', day: '2-digit' });
  return p ? `${p.year}-${p.month}-${p.day}` : '';
}

/** O instante `agora` cai no mesmo dia do jogo? ("hoje" é o do campo, não o do aparelho.) `agora` só existe para o teste. */
export function ehHoje(iso, fuso, agora = new Date()) {
  const dia = diaDeCalendario(iso, fuso);
  return !!dia && dia === diaDeCalendario(agora, fuso);
}

// ─── Escrever hora no relógio do campo (formulários do admin) ──────────────────────────────────────────────────────────
// O admin digita "20:00" no formulário: isso é 20:00 no CAMPO, mesmo que ele esteja em Lisboa — o mesmo que o motor faz em
// utils/fuso.js. As duas funções abaixo são o par: partes do instante → campos do formulário, e campos → instante.

/** O instante (ISO, UTC) em que o relógio do campo marca `data` ("AAAA-MM-DD") e `hora` ("HH:MM"). Inválido → null. */
export function instanteNoCampo(data, hora, fuso) {
  const md = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(data ?? '').slice(0, 10));
  const mh = /^(\d{1,2}):(\d{2})$/.exec(String(hora ?? ''));
  if (!md || !mh) return null;
  const [ano, mes, dia, h, min] = [Number(md[1]), Number(md[2]), Number(md[3]), Number(mh[1]), Number(mh[2])];
  if (mes < 1 || mes > 12 || dia < 1 || dia > 31 || h > 23 || min > 59) return null;
  const f = fusoOuPadrao(fuso);
  const comoUtc = Date.UTC(ano, mes - 1, dia, h, min);
  const deslocamento = (instanteMs) => {
    const p = partesDe(new Date(instanteMs), f, { year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric', hourCycle: 'h23' });
    return Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day), Number(p.hour), Number(p.minute), Number(p.second)) - Math.floor(instanteMs / 1000) * 1000;
  };
  // Corrige pelo deslocamento do fuso, duas vezes: a segunda cobre o dia em que o horário de verão vira.
  let t = comoUtc - deslocamento(comoUtc);
  t = comoUtc - deslocamento(t);
  const instante = new Date(t);
  if (diaDeCalendario(instante, f) !== `${md[1]}-${md[2]}-${md[3]}`) return null; // "31 de fevereiro" não existe
  return instante.toISOString();
}

/** Do instante aos campos do formulário, no relógio do campo: { data: 'AAAA-MM-DD', hora: 'HH:MM' }. */
export function camposNoCampo(iso, fuso) {
  const d = instanteValido(iso);
  if (!d) return { data: '', hora: '' };
  return { data: diaDeCalendario(d, fuso), hora: formatarHora(d, fuso) };
}
