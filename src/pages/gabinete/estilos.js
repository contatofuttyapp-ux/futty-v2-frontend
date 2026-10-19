// Futty v2.0 — O que as abas do Gabinete dividem e não é componente: os estilos (cartão, botões, tabela, campo, títulos),
// as cores do semáforo e os formatos de data, tempo e dinheiro.

import { formatarEUR, formatarUSD } from '../../utils/numero';

const CARD = { background: '#111111', border: '1px solid #222222', borderRadius: 12 };
const btn = {
  padding: '6px 10px', borderRadius: 8, border: '1px solid #2a2a2a', background: '#0c0c0c',
  color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer',
};
const btnGold = { ...btn, background: 'linear-gradient(180deg,#f5e070,#d4a017)', color: '#0d0d12', border: 'none', padding: '8px 16px' };
const th = { textAlign: 'left', padding: '8px 10px', fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid #222' };
const td = { padding: '6px 8px', fontSize: 13, borderBottom: '1px solid #1a1a1a', verticalAlign: 'middle' };
// fontSize 16: abaixo disso o iPhone dá zoom ao focar (ver index.css).
const inp = { fontSize: 16, color: '#e8e8ef', background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.14)', padding: '6px 8px', borderRadius: 6, width: '100%', boxSizing: 'border-box' };

const CORES = { verde: '#7bd88f', amarelo: '#f0c94a', vermelho: '#fda4af', cinza: '#8a8a98' };

function hojeISO() { return new Date().toISOString().slice(0, 10); }
function fmtUptime(s) {
  if (!s && s !== 0) return '-';
  const d = Math.floor(s / 86400); const h = Math.floor((s % 86400) / 3600); const m = Math.floor((s % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}min`;
  return `${m}min`;
}
// Dinheiro do sistema em PT-BR ("US$12,34", "€7,24"), pelo helper único de src/utils/numero.js.
const fmtUSD = formatarUSD;
const fmtEUR = formatarEUR;
function diasAte(dataISO) {
  if (!dataISO) return null;
  const ms = new Date(`${dataISO}T00:00:00Z`) - new Date(`${hojeISO()}T00:00:00Z`);
  return Math.round(ms / 86400000);
}
const uid = () => (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID().slice(0, 8) : `c${Date.now()}`);

const sectionH2 = { fontFamily: "'Rajdhani',sans-serif", fontWeight: 800, fontSize: 15, letterSpacing: '.05em', color: '#f0c94a', textTransform: 'uppercase', margin: '26px 0 10px' };
const bigNum = { fontFamily: "'Rajdhani',sans-serif", fontWeight: 800, fontSize: 26, color: '#f0c94a' };
const muted = { fontSize: 11.5, color: 'var(--text-dim)' };
const chip = { fontFamily: "'Rajdhani',sans-serif", fontWeight: 700, fontSize: 10, letterSpacing: '.04em', padding: '2px 8px', borderRadius: 20, border: '1px solid', whiteSpace: 'nowrap' };

export { CARD, CORES, bigNum, btn, btnGold, chip, diasAte, fmtEUR, fmtUSD, fmtUptime, hojeISO, inp, muted, sectionH2, td, th, uid };
