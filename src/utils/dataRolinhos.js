// Futty v2.0 — as contas puras dos rolinhos da data de nascimento (components/RolinhosData.jsx). Sem React.
import { nascimentoMaximo } from './idade';

export const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
export const ANO_MINIMO = 1900;

/** Quantos dias tem o mês (1–12) do ano (fevereiro de ano bissexto: 29). */
export function diasDoMes(mes, ano) {
  return new Date(Date.UTC(ano, mes, 0)).getUTCDate();
}

/** O último ano que o rolo oferece: ano atual − IDADE_MINIMA (nenhum ano futuro, nenhum menor de 18). */
export function anoMaximo(hoje = new Date()) {
  return Number(nascimentoMaximo(hoje).slice(0, 4));
}

/** 'AAAA-MM-DD' dos três rolos; o dia que não existe no mês (31 de fevereiro) cai no último dia dele. */
export function comporData({ dia, mes, ano }) {
  const d = Math.min(dia, diasDoMes(mes, ano));
  return `${ano}-${String(mes).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}
