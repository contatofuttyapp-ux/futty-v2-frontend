// Futty v2.0 — o link do sorteio que vai para o grupo.
//
// Quando o motor dá um código (POST /api/games/:id/link-curto, migração 078), o link é
// futtyapp.com.br/s/<código de 8>, no mesmo molde do /c/<código> do convite. O longo,
// futtyapp.com.br/p/<slug do time>/<uuid de 36 caracteres>, é comprido e feio no WhatsApp: fica para quando
// não há código (migração por aplicar, motor fora) e continua valendo.
import { apiFetch } from '../lib/api';

/** O link para mandar no grupo: o curto quando há código, o longo quando não há. Puro. */
export function linkDoSorteio({ origem, slug, gameId, codigo }) {
  return codigo ? `${origem}/s/${codigo}` : `${origem}/p/${slug}/${gameId}`;
}

/** O código do link curto do jogo (criado na primeira vez), ou null. Nunca lança: sem código, vale o link longo. */
export async function codigoDoSorteio(gameId) {
  try {
    const { codigo } = await apiFetch(`/api/games/${gameId}/link-curto`, { method: 'POST' });
    return codigo || null;
  } catch {
    return null;
  }
}
