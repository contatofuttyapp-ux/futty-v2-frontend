// Futty v2.0 — A foto de um post que não carrega. No campo de várzea, com sinal ruim, vai acontecer muito.
// Uma <img> quebrada ficaria com a altura reservada (width/height na tag): ~400 px de buraco com o ícone
// de imagem quebrada. Por isso a foto que falha vira UMA linha curta, na voz da casa, e um toque tenta de
// novo (o endereço ganha ?r=N, para o navegador não reaproveitar o erro). A foto boa é um botão que abre a
// imagem em tela cheia. Os dois nunca se aninham (botão dentro de botão).
import { useState } from 'react';
import { ImageOff } from 'lucide-react';
import { comTentativa } from '../utils/comTentativa';

/**
 * `src`: a miniatura; `onAbrir`: o toque na foto boa; `estiloBotao`: o botão que envolve a foto; `largura`/`altura`: só reservam a
 * proporção enquanto carrega; `estiloImg`: o CSS da foto; `larguraMinFalha`: o mínimo da linha de erro numa faixa que rola de lado.
 */
export default function ImagemDoPost({ src, onAbrir, estiloBotao, largura, altura, estiloImg, larguraMinFalha = 0, estiloFalha }) {
  const [tentativa, setTentativa] = useState(0);
  const [falhou, setFalhou] = useState(false);

  if (falhou) {
    return (
      <button
        type="button"
        data-imagem-falhou
        onClick={() => { setFalhou(false); setTentativa((n) => n + 1); }}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', minWidth: larguraMinFalha || undefined, minHeight: 56, boxSizing: 'border-box',
          padding: '10px 14px', borderRadius: 10, border: '1px dashed rgba(255,255,255,0.22)', background: 'rgba(255,255,255,0.04)',
          color: 'var(--text-dim)', fontSize: 13, lineHeight: 1.35, textAlign: 'left', cursor: 'pointer', ...estiloFalha,
        }}
      >
        <ImageOff size={18} style={{ flexShrink: 0 }} aria-hidden="true" />
        <span>Não deu para carregar a foto. Toque para tentar de novo.</span>
      </button>
    );
  }

  return (
    <button type="button" onClick={onAbrir} style={estiloBotao}>
      <img
        key={tentativa}
        src={comTentativa(src, tentativa)}
        alt=""
        width={largura}
        height={altura}
        loading="lazy"
        decoding="async"
        onError={() => setFalhou(true)}
        style={estiloImg}
      />
    </button>
  );
}
