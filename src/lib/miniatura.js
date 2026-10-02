// Futty v2.0 — Rodada 29H-B (item 55, dono 2-out): o ENQUADRAMENTO ÚNICO. A pessoa enquadra a foto UMA vez, ao escolher ou trocar
// (CropModal com `miniatura`): a moldura 2:3 do card com um quadrado tracejado dourado dentro, marcando o que vira a foto da
// miniatura do Início, do ranking e do sorteio. Arrastar/aproximar ajusta os dois de uma vez. Depois de a foto subir, este módulo
// grava esse quadrado em users.avatar_recorte (migração 070, PUT /api/me/avatar/enquadro) — o motor passa a cortar TODAS as
// miniaturas desse arquivo exatamente nele (as dela e as que os outros veem). O editor da miniatura à parte ("Enquadrar", 29B) saiu.
//
// O quadrado é SEMPRE o do topo do 2:3, da largura do card (lib/enquadroAvatar.js#recorteDaMolduraUnica): é o mesmo que o motor
// corta sem recorte nenhum (`sq=1`) para a figurinha — gravá-lo explicitamente é o que faz a FOTO crua (que sem recorte o app
// mostrava em 50%/35%) seguir o que a pessoa viu no tracejado.
//
// Best-effort de propósito: sem a migração 070 o motor responde 503, sem rede falha — a foto já subiu, e a miniatura segue na regra
// de sempre até dar. Nunca lança; devolve o avatar_url novo (já com `?rc=`) ou null.
import { apiFetch } from './api';

export async function gravarMiniatura(recorte) {
  if (!recorte) return null;
  try {
    const r = await apiFetch('/api/me/avatar/enquadro', { method: 'PUT', body: JSON.stringify(recorte) });
    return r?.avatar_url || null;
  } catch {
    return null;
  }
}
