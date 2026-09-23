// Futty v2.0 — Anúncio de uma página (Velocidade 6B, 15-set).
//
// O AdCard buscava o anúncio ele próprio, e na Resenha ele só é montado entre o
// 3º e o 4º item do feed — ou seja, o pedido do anúncio só COMEÇAVA depois do
// /api/feed inteiro ter chegado e a lista ter sido pintada. Duas idas a São
// Paulo em fila por uma faixa de 100 px.
//
// VELOCIDADE 9 (23-set): deixou de haver pedido POR TELA. Os slots das cinco
// páginas vêm todos juntos — dentro do /api/inicio, ou de um `/api/ads/sessao`
// para quem não entrou pelo Início — e ficam em lib/ads.js por alguns minutos.
// Este hook só lê de lá; quando já há resposta em mãos (o caso normal a partir
// da segunda tela), devolve o anúncio no primeiro render, sem rede nenhuma.
import { useEffect, useState } from 'react';
import { adsProntos, assinarAds, garantirAds, lerAd } from '../lib/ads';

export function useAd(pagina = 'inicio', { ativo = true } = {}) {
  const [versao, setVersao] = useState(0);

  useEffect(() => {
    if (!ativo) return undefined;
    const largar = assinarAds(() => setVersao((n) => n + 1));
    garantirAds();
    return largar;
  }, [ativo, pagina]);

  // `versao` entra na conta para o React voltar a ler quando a loja mudar.
  void versao;
  return { ad: ativo ? lerAd(pagina) : null, pronto: !ativo || adsProntos() };
}
