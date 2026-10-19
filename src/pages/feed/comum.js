// Futty v2.0 — O que os cartões da Resenha dividem e não é componente: as cores dos prêmios, o recorte e o vidro do cartão,
// as datas do cabeçalho, o time campeão e os estilos dos botões pequenos.

import { formatarData, formatarHora } from '../../utils/dataHora';

// Cores de acento (theme.js): neon, purple, warning (#f59e0b).
const COR_ARTILHEIRO = '#7c3aed';
const COR_DESTAQUE = '#f59e0b';
// Material da casa = VIDRO: véu branco 3% sobre base TRANSPARENTE (a aurora atravessa,
// como Planos/Perfil) + cantos a 45° à escala de card (corte cheio 8px). Estreia do
// vidro na Resenha. As divisórias internas passam de #222 a branco baixo-alpha.
const CLIP_CARD =
  'polygon(8px 0, calc(100% - 8px) 0, 100% 8px, 100% calc(100% - 8px), calc(100% - 8px) 100%, 8px 100%, 0 calc(100% - 8px), 0 8px)';
const BORDA_VIDRO = '1px solid rgba(255, 255, 255, 0.07)';
const CARD = {
  background: 'rgba(255, 255, 255, 0.03)',
  border: '1px solid rgba(255, 255, 255, 0.08)',
  overflow: 'hidden',
  clipPath: CLIP_CARD,
};

// ─── Helpers de data ──────────────────────────────────────────────────────────
// A data e a hora do jogo são as do CAMPO (`fuso` do time, que o motor manda em cada jogo).
const dataExtensa = (iso, fuso) => formatarData(iso, fuso);
const horaDe = (iso, fuso) => formatarHora(iso, fuso);

// Jogadores do time campeão (a partir de times_resultado + campeao_time_index).
function timeCampeao(j) {
  const times = j?.times_resultado?.times;
  if (!Array.isArray(times)) return null;
  const idx = j?.campeao_time_index;
  if (idx == null || idx < 0 || idx >= times.length) return null;
  return times[idx];
}

// Estilos partilhados de botões pequenos.
const iconBtn = {
  width: 34,
  height: 34,
  clipPath: 'polygon(5px 0, calc(100% - 5px) 0, 100% 5px, 100% calc(100% - 5px), calc(100% - 5px) 100%, 5px 100%, 0 calc(100% - 5px), 0 5px)',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  background: 'rgba(255, 255, 255, 0.04)',
  color: 'var(--text)',
  cursor: 'pointer',
  display: 'grid',
  placeItems: 'center',
  fontSize: 15,
  lineHeight: 1,
};
const linkBtn = {
  border: 'none',
  background: 'transparent',
  padding: '4px 0',
  color: 'var(--text-dim)',
  fontWeight: 700,
  fontSize: 12,
  cursor: 'pointer',
};

// Os estilos que se repetem iguais em mais de um cartão.
// O rodapé do cartão (reações e comentários), separado pelo vidro.
const rodapeDoCartao = { padding: '12px 14px', borderTop: BORDA_VIDRO };
// Um rótulo com o ícone colado à esquerda.
const rotuloComIcone = { display: 'flex', alignItems: 'center', gap: 6 };
// O "há 5 h" e os gols, apagados mas em negrito.
const apoioForte = { color: 'var(--text-dim)', fontWeight: 700 };

export { apoioForte, BORDA_VIDRO, CARD, CLIP_CARD, COR_ARTILHEIRO, COR_DESTAQUE, dataExtensa, horaDe, iconBtn, linkBtn, rodapeDoCartao, rotuloComIcone, timeCampeao };
