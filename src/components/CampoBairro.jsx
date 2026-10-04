// Futty v2.0 — Rodada 29H (item 12): o campo "Bairro" do time (Criar time e painel do time). Opcional. Em Portugal a cidade escolhida
// é um concelho e o campo sugere as freguesias dele (a lista vem do site SÓ quando a pessoa toca no campo — lib/freguesiasDados.js);
// fora de Portugal é texto livre, que o motor geocodifica uma vez ("bairro, cidade"). Escolher uma freguesia manda a coordenada da
// lista e dispensa a chamada. Sem cidade o campo fica desligado: o bairro só existe dentro de uma cidade.
// `aoMudar(texto, escolha)`: `escolha` é null enquanto a pessoa digita. O texto de apoio ("Só o bairro e a cidade, nunca o
// endereço.") é de quem usa o campo (cada tela o põe na sua diagramação).
import { useEffect, useId, useRef, useState } from 'react';
import { carregarFreguesias } from '../lib/freguesiasDados';
import { buscarFreguesias, escolhaDaFreguesia } from '../utils/freguesias';

export default function CampoBairro({ valor, aoMudar, concelho = null, desabilitado = false, placeholder = 'Onde vocês jogam', maxLength = 80, className = 'input input--hud', style, ...resto }) {
  const idLista = useId();
  const raiz = useRef(null);
  const [indice, setIndice] = useState(null);
  const [aberto, setAberto] = useState(false);
  const [ativa, setAtiva] = useState(-1);
  // Só sugere o que a pessoa DIGITOU (ou, vazio, as primeiras do concelho): logo depois de escolher, a lista fecha.
  const [escolhido, setEscolhido] = useState(false);

  function carregar() {
    if (concelho) carregarFreguesias().then(setIndice).catch(() => {});
  }

  const sugestoes = aberto && !escolhido && indice && concelho ? buscarFreguesias(indice, concelho, valor) : [];

  useEffect(() => { setAtiva(-1); }, [valor]); // eslint-disable-line react-hooks/set-state-in-effect -- a seleção do teclado recomeça a cada letra

  useEffect(() => {
    if (!aberto) return undefined;
    const fora = (e) => { if (raiz.current && !raiz.current.contains(e.target)) setAberto(false); };
    document.addEventListener('pointerdown', fora, true);
    return () => document.removeEventListener('pointerdown', fora, true);
  }, [aberto]);

  function escolher(linha) {
    setEscolhido(true);
    setAberto(false);
    aoMudar(linha[0], escolhaDaFreguesia(linha));
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
        data-campo-bairro
        className={className}
        value={valor}
        maxLength={maxLength}
        placeholder={desabilitado ? 'Escolha a cidade primeiro' : placeholder}
        disabled={desabilitado}
        autoComplete="off"
        autoCorrect="off"
        role={concelho ? 'combobox' : undefined}
        aria-expanded={sugestoes.length > 0}
        aria-controls={idLista}
        aria-autocomplete={concelho ? 'list' : undefined}
        style={{ width: '100%', fontFamily: "'Rajdhani', sans-serif", fontSize: 16, ...style }}
        onFocus={() => { carregar(); setAberto(true); }}
        onBlur={(e) => { const p = e.relatedTarget; if (p && raiz.current && !raiz.current.contains(p)) setAberto(false); }}
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
