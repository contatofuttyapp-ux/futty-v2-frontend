// Futty v2.0 — Rodada 29T (bloco B, achado 157): os bairros da cidade que a pessoa escolheu, para o Criar time e os Ajustes do time.
// O campo Bairro só aparece quando a cidade TEM bairros na lista (IBGE no Brasil, freguesias em Portugal); este hook diz em que pé está:
//   'sem-cidade'  nenhuma cidade da lista (vazia, ou digitada à mão fora do Brasil e de Portugal): sem campo
//   'carregando'  buscando a lista (alguns décimos de segundo): sem campo ainda
//   'sem-lista'   a cidade não tem bairros na lista (ou a lista não veio): sem campo
//   'lista'       tem: `itens` ({ linha: [bairro, lat, lng], chave }[]) para o campo sugerir
import { useEffect, useState } from 'react';
import { carregarBairrosDaCidade } from '../lib/bairrosDados';
import { alvoDeBairros } from '../utils/bairros';
import { normalizarCidade } from '../utils/cidades';

const SEM_CIDADE = { chave: '', estado: 'sem-cidade', itens: [] };
const CARREGANDO = { chave: '', estado: 'carregando', itens: [] };

/** @param {string} textoDaCidade o que está no campo Cidade @param {object|null} escolha a escolha da lista ({ cidade, uf, pais, … }), null enquanto digita */
export function useBairrosDaCidade(textoDaCidade, escolha = null) {
  const alvo = alvoDeBairros(textoDaCidade, escolha);
  const chave = alvo ? `${alvo.pais}|${alvo.uf || alvo.distrito || ''}|${normalizarCidade(alvo.nome)}` : '';
  const [lido, setLido] = useState({ chave: '', estado: 'sem-lista', itens: [] });

  useEffect(() => {
    const doTexto = alvoDeBairros(textoDaCidade, escolha);
    if (!doTexto) return undefined;
    let vivo = true;
    carregarBairrosDaCidade(doTexto)
      .then((itens) => { if (vivo) setLido({ chave, estado: itens.length ? 'lista' : 'sem-lista', itens }); })
      .catch(() => { if (vivo) setLido({ chave, estado: 'sem-lista', itens: [] }); });
    return () => { vivo = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `chave` é o resumo do texto + da escolha: a lista só muda quando a cidade muda
  }, [chave]);

  if (!alvo) return SEM_CIDADE;
  return lido.chave === chave ? lido : CARREGANDO;
}
