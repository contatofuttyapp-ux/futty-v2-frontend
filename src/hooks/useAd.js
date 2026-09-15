// Futty v2.0 — Anúncio de uma página (Velocidade 6B, 15-set).
//
// O AdCard buscava o anúncio ele próprio, e na Resenha ele só é montado entre o
// 3º e o 4º item do feed — ou seja, o pedido do anúncio só COMEÇAVA depois do
// /api/feed inteiro ter chegado e a lista ter sido pintada. Duas idas a São
// Paulo em fila por uma faixa de 100 px.
//
// Com este hook a tela pede o anúncio no seu próprio topo, em paralelo com o
// resto, e passa-o ao AdCard por prop. Onde o anúncio já vem no payload
// agregado (o Início traz `ad` dentro do /api/inicio), não se pede nada.
import { useEffect, useState } from 'react';
import { apiFetch } from '../lib/api';

export function useAd(pagina = 'inicio', { ativo = true } = {}) {
  const [ad, setAd] = useState(null);
  const [pronto, setPronto] = useState(false);

  useEffect(() => {
    if (!ativo) return undefined;
    let vivo = true;
    apiFetch(`/api/ads?pagina=${encodeURIComponent(pagina)}`)
      .then((r) => { if (vivo) { setAd(r?.ad || null); setPronto(true); } })
      .catch(() => { if (vivo) setPronto(true); });
    return () => { vivo = false; };
  }, [pagina, ativo]);

  return { ad, pronto };
}
