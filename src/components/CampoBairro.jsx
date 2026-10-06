// Futty v2.0 — O campo "Bairro" do time (Criar time e Ajustes do time). Opcional.
// O bairro é de LISTA, como a cidade (dono: "só aceita o que tiver lá"): no Brasil os bairros do IBGE
// (Censo 2022), em Portugal as freguesias — `itens` é a lista da cidade escolhida
// (hooks/useBairrosDaCidade.js: { linha: [bairro, lat, lng], chave }[]). Sem texto livre: o que a pessoa
// digita só busca; vale o que ela ESCOLHE. Texto que a lista não tem volta ao que valia antes (o bairro já
// escolhido, ou o que o time já tinha salvo — o bairro antigo escrito à mão continua até alguém editar).
// Quem usa o campo só o desenha quando a cidade TEM lista (cidade sem bairros na lista = sem campo) e põe
// `key` com a cidade, para a escolha de uma cidade nunca vazar para a outra.
// `aoMudar(texto, escolha)`: `escolha` é { bairro, bairro_origem: 'lista', bairro_lat, bairro_lng } quando
// veio da lista, null enquanto digita.
// O texto de apoio ("Só o bairro e a cidade, nunca o endereço.") é de quem usa o campo (cada tela o põe na
// sua diagramação).
import { useEffect, useId, useRef, useState } from 'react';
import { buscarBairros, escolhaDoBairro, linhaDaLista } from '../utils/bairros';

export default function CampoBairro({ valor, aoMudar, itens, placeholder = 'Onde vocês jogam', maxLength = 80, className = 'input input--hud', style, ...resto }) {
  const idLista = useId();
  const raiz = useRef(null);
  const [aberto, setAberto] = useState(false);
  const [ativa, setAtiva] = useState(-1);
  // Só sugere o que a pessoa DIGITOU (ou, vazio, os primeiros da lista): logo depois de escolher, a lista fecha.
  const [escolhido, setEscolhido] = useState(false);
  // O que vale agora: o texto da última escolha (ou o que o campo trouxe ao nascer) e a escolha que o acompanha.
  const valendo = useRef({ texto: valor, escolha: null });
  // Os valores de agora para os ouvintes de fora do campo (que nascem uma vez, quando a lista abre).
  const agora = useRef({ valor, itens, aoMudar });
  useEffect(() => { agora.current = { valor, itens, aoMudar }; });

  const sugestoes = aberto && !escolhido ? buscarBairros(itens, valor) : [];

  useEffect(() => { setAtiva(-1); }, [valor]); // eslint-disable-line react-hooks/set-state-in-effect -- a seleção do teclado recomeça a cada letra

  /** Fecha a lista e confere o texto: vazio vale (sem bairro); o que a lista escreve por inteiro vira escolha; o resto volta ao que valia. */
  function encerrar() {
    setAberto(false);
    const { valor: escrito, itens: lista, aoMudar: mudar } = agora.current;
    const texto = escrito.trim();
    if (!texto) {
      valendo.current = { texto: '', escolha: null };
      if (escrito) mudar('', null);
      return;
    }
    if (texto === valendo.current.texto) return;
    const exata = linhaDaLista(lista, texto);
    if (exata) {
      valendo.current = { texto: exata[0], escolha: escolhaDoBairro(exata) };
      setEscolhido(true);
      mudar(exata[0], valendo.current.escolha);
      return;
    }
    mudar(valendo.current.texto, valendo.current.escolha);
  }

  useEffect(() => {
    if (!aberto) return undefined;
    const fora = (e) => { if (raiz.current && !raiz.current.contains(e.target)) encerrar(); };
    document.addEventListener('pointerdown', fora, true);
    return () => document.removeEventListener('pointerdown', fora, true);
  }, [aberto]);

  function escolher(linha) {
    valendo.current = { texto: linha[0], escolha: escolhaDoBairro(linha) };
    setEscolhido(true);
    setAberto(false);
    aoMudar(linha[0], valendo.current.escolha);
  }

  function aoTeclar(e) {
    if (e.key === 'Escape') { encerrar(); return; }
    if (e.key === 'Enter') {
      const exata = linhaDaLista(itens, valor);
      if (ativa >= 0 && sugestoes[ativa]) { e.preventDefault(); escolher(sugestoes[ativa]); } else if (exata) { e.preventDefault(); escolher(exata); }
      return;
    }
    if (!sugestoes.length) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setAtiva((i) => Math.min(sugestoes.length - 1, i + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setAtiva((i) => Math.max(0, i - 1)); }
  }

  return (
    <div ref={raiz} style={{ position: 'relative' }}>
      <input
        {...resto}
        data-campo-bairro
        className={className}
        value={valor}
        maxLength={maxLength}
        placeholder={placeholder}
        autoComplete="off"
        autoCorrect="off"
        role="combobox"
        aria-expanded={sugestoes.length > 0}
        aria-controls={idLista}
        aria-autocomplete="list"
        style={{ width: '100%', fontFamily: "'Rajdhani', sans-serif", fontSize: 16, ...style }}
        onFocus={() => setAberto(true)}
        // Tab para outro campo: confere e fecha. Sem relatedTarget (o toque num botão não dá foco no Safari) não fecha aqui — o toque fora é quem fecha.
        onBlur={(e) => { const p = e.relatedTarget; if (p && raiz.current && !raiz.current.contains(p)) encerrar(); }}
        onKeyDown={aoTeclar}
        onChange={(e) => { setEscolhido(false); setAberto(true); aoMudar(e.target.value, null); }}
      />
      {sugestoes.length > 0 ? (
        <ul
          id={idLista}
          role="listbox"
          data-sugestoes-bairro
          style={{ position: 'absolute', left: 0, right: 0, top: 'calc(100% + 4px)', zIndex: 30, margin: 0, padding: 4, listStyle: 'none', maxHeight: 264, overflowY: 'auto', background: '#14121c', border: '1px solid rgba(139,92,246,0.45)', boxShadow: '0 12px 30px -10px rgba(0,0,0,0.85)' }}
        >
          {sugestoes.map((linha, i) => (
            <li key={linha[0]} role="option" aria-selected={i === ativa}>
              <button
                type="button"
                onClick={() => escolher(linha)}
                style={{ display: 'flex', alignItems: 'center', width: '100%', minHeight: 44, padding: '8px 12px', border: 'none', background: i === ativa ? 'rgba(139,92,246,0.22)' : 'transparent', color: '#fff', textAlign: 'left', fontFamily: "'Rajdhani', sans-serif", fontSize: 16, fontWeight: 600, cursor: 'pointer' }}
              >
                {linha[0]}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
