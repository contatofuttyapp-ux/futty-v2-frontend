// Futty v2.0 — Rodada 29B (D): o campo "Cidade" com sugestão (Explorar, criar time, painel do time).
//
// Busca a lista (Brasil e Portugal) SÓ no foco, sugere a partir de 2 letras sem acento nem maiúscula e mostra
// "Cidade, UF" / "Concelho, Portugal". Escolher manda { cidade, uf, pais, lat, lng, origem: 'lista' } — o motor guarda a
// coordenada da própria lista, sem chamada externa. Quem digita uma cidade que não está na lista segue com texto livre
// (o motor tenta o Nominatim e avisa o que achou). `aoMudar(texto, escolha)`: escolha é null enquanto a pessoa digita.
// Carregado em lazy (ver CampoCidadeLazy.jsx): o JSON e o código só descem quando o campo aparece.
import { useEffect, useId, useRef, useState } from 'react';
import { carregarCidades } from '../lib/cidadesDados';
import { buscarCidades, escolhaDaLinha, rotuloDaCidade } from '../utils/cidades';

export default function CampoCidade({ valor, aoMudar, placeholder = 'Ex: Brasília', maxLength = 100, className = 'input input--hud', style, ...resto }) {
  const idLista = useId();
  const raiz = useRef(null);
  const [indice, setIndice] = useState(null);
  const [aberto, setAberto] = useState(false);
  const [ativa, setAtiva] = useState(-1);
  // Só sugere o que a pessoa DIGITOU: logo depois de escolher, o texto é o da escolha e a lista fecha.
  const [escolhido, setEscolhido] = useState(false);

  function carregar() {
    carregarCidades().then(setIndice).catch(() => {});
  }

  const sugestoes = aberto && !escolhido && indice ? buscarCidades(indice, valor) : [];

  useEffect(() => { setAtiva(-1); }, [valor]); // eslint-disable-line react-hooks/set-state-in-effect -- a seleção do teclado recomeça a cada letra

  // A lista fecha com um toque FORA do campo (e ao escolher, e no Esc) — não no blur. No iPhone o blur do campo chega
  // antes do clique na sugestão: a lista sumia debaixo do dedo e a escolha nunca acontecia (achado da cena).
  useEffect(() => {
    if (!aberto) return undefined;
    const fora = (e) => { if (raiz.current && !raiz.current.contains(e.target)) setAberto(false); };
    document.addEventListener('pointerdown', fora, true);
    return () => document.removeEventListener('pointerdown', fora, true);
  }, [aberto]);

  function escolher(linha) {
    setEscolhido(true);
    setAberto(false);
    aoMudar(rotuloDaCidade(linha), escolhaDaLinha(linha));
  }

  function aoTeclar(e) {
    if (!sugestoes.length) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setAtiva((i) => Math.min(sugestoes.length - 1, i + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setAtiva((i) => Math.max(0, i - 1)); }
    else if (e.key === 'Enter' && ativa >= 0) { e.preventDefault(); escolher(sugestoes[ativa]); }
    else if (e.key === 'Escape') setAberto(false);
  }

  return (
    <div ref={raiz} style={{ position: 'relative' }}>
      <input
        {...resto}
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
        onFocus={() => { carregar(); setAberto(true); }}
        // Tab para outro campo: fecha. Sem relatedTarget (o toque num botão não dá foco no Safari) não fecha — o toque
        // fora é quem fecha.
        onBlur={(e) => { const p = e.relatedTarget; if (p && raiz.current && !raiz.current.contains(p)) setAberto(false); }}
        onKeyDown={aoTeclar}
        onChange={(e) => { setEscolhido(false); setAberto(true); aoMudar(e.target.value, null); }}
      />
      {sugestoes.length > 0 ? (
        <ul
          id={idLista}
          role="listbox"
          data-sugestoes-cidade
          style={{ position: 'absolute', left: 0, right: 0, top: 'calc(100% + 4px)', zIndex: 30, margin: 0, padding: 4, listStyle: 'none', maxHeight: 264, overflowY: 'auto', background: '#14121c', border: '1px solid rgba(139,92,246,0.45)', boxShadow: '0 12px 30px -10px rgba(0,0,0,0.85)' }}
        >
          {sugestoes.map((linha, i) => (
            <li key={`${linha[0]}|${linha[1]}|${linha[2]}`} role="option" aria-selected={i === ativa}>
              <button
                type="button"
                onClick={() => escolher(linha)}
                style={{ display: 'flex', alignItems: 'center', width: '100%', minHeight: 44, padding: '8px 12px', border: 'none', background: i === ativa ? 'rgba(139,92,246,0.22)' : 'transparent', color: '#fff', textAlign: 'left', fontFamily: "'Rajdhani', sans-serif", fontSize: 16, fontWeight: 600, cursor: 'pointer' }}
              >
                {rotuloDaCidade(linha)}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
