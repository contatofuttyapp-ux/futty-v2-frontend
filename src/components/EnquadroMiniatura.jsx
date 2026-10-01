// Futty v2.0 — Rodada 29B (bloco 3, E): "Como você aparece no app" — o editor da MINIATURA do avatar.
//
// A miniatura (Início, ranking, sorteio, Resenha…) mostra uma JANELA QUADRADA da foto ou da figurinha, que é 2:3.
// Antes ela era cortada por uma regra fixa e quem enquadrava o card não via como ficava. Aqui a pessoa arrasta a
// imagem e aproxima (−/+) e vê, ao vivo, a miniatura exatamente como o app a mostra (a mesma moldura `.pavatar`,
// em dois tamanhos). Ao salvar, o recorte vai para o motor (PUT /api/me/avatar/enquadro) e passa a valer em TODAS as
// miniaturas desse arquivo — as dela e as que as outras pessoas veem. A conta da janela é a mesma do motor
// (lib/enquadroAvatar.js ↔ backend/utils/recorteAvatar.js, provadas na mesma tabela): o que se vê aqui é o que sai de lá.
//
// Vive no chunk lazy da Figurinha — nada disto pesa no arranque.
import { useRef, useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import { apiFetch } from '../lib/api';
import { urlAsset, urlImagem } from '../utils/avatar';
import {
  ESCALA_MAX_RECORTE, estiloDaJanela, janelaDoRecorte, normalizarRecorte, recorteDaUrl, recortePadrao, urlSemRecorte,
} from '../lib/enquadroAvatar';

const LADO_EDITOR = 148; // px da caixa onde se arrasta
const PASSO_ESCALA = 0.25;
const PASSO_TECLA = 0.03; // fração da janela por toque de seta

const rotulo = { fontFamily: "'Rajdhani', sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--label-color)' };
const igual = (a, b) => !!a && !!b && a.x === b.x && a.y === b.y && a.escala === b.escala;

/** Uma miniatura na moldura do app (.pavatar), com a janela do recorte. */
function Previa({ fonte, dims, recorte, lado }) {
  const estilo = dims && recorte ? estiloDaJanela(dims.w, dims.h, recorte) : null;
  return (
    <div className="pavatar" style={{ width: lado, height: lado, position: 'relative' }} aria-hidden="true">
      {estilo ? <img src={fonte} alt="" decoding="async" draggable={false} style={{ ...estilo, objectFit: 'fill' }} /> : null}
    </div>
  );
}

/**
 * @param {string}   avatarUrl  o avatar atual (URL do proxy; pode já trazer `?rc=` se há recorte salvo)
 * @param {Function} onSalvo    (avatarUrlNovo, restaurou) — depois de salvar ou voltar ao padrão
 */
export default function EnquadroMiniatura({ avatarUrl, onSalvo }) {
  const [aberto, setAberto] = useState(false);
  const [dims, setDims] = useState(null); // { w, h } da imagem inteira que o editor carregou
  const [recorte, setRecorte] = useState(null);
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState('');
  const [pegando, setPegando] = useState(false);
  const arrasto = useRef(null);

  const salvo = recorteDaUrl(avatarUrl);
  // O editor pede a imagem INTEIRA (2:3), sem o `rc` — com ele o motor devolveria a janela já cortada.
  const fonte = urlImagem(urlAsset(urlSemRecorte(avatarUrl)), 512);
  const atual = recorte || (dims ? salvo || recortePadrao(dims.w, dims.h) : null);
  const referencia = dims ? salvo || recortePadrao(dims.w, dims.h) : null;
  const mudou = !!atual && !!referencia && !igual(atual, referencia);

  // Avatar novo (outro arquivo, ou o recorte salvo mudou): recomeça do que está salvo. Ajuste de estado no render
  // (o padrão do Toast.jsx), não em efeito: sem quadro com o estado velho.
  const [avatarVisto, setAvatarVisto] = useState(avatarUrl);
  if (avatarVisto !== avatarUrl) {
    setAvatarVisto(avatarUrl);
    setRecorte(null);
    setErro('');
  }
  // A imagem inteira mudou (outro arquivo): as medidas valem só para a que carregou — o onLoad traz as novas.
  const [fonteVista, setFonteVista] = useState(fonte);
  if (fonteVista !== fonte) {
    setFonteVista(fonte);
    setDims(null);
  }

  function mover(dx, dy, base = atual) {
    if (!dims || !base) return;
    const j = janelaDoRecorte(dims.w, dims.h, base);
    if (!j) return;
    // Arrastar a imagem para a direita leva a JANELA para a esquerda.
    setRecorte(normalizarRecorte(dims.w, dims.h, { x: base.x - dx / dims.w, y: base.y - dy / dims.h, escala: base.escala }));
  }

  function aoApertar(e) {
    if (!atual) return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    arrasto.current = { px: e.clientX, py: e.clientY, base: atual };
    setPegando(true);
  }
  function aoArrastar(e) {
    const a = arrasto.current;
    if (!a || !dims) return;
    const j = janelaDoRecorte(dims.w, dims.h, a.base);
    if (!j) return;
    const pxPorPixelDaImagem = e.currentTarget.clientWidth / j.lado; // a caixa mostra `lado` pixels da imagem
    mover((e.clientX - a.px) / pxPorPixelDaImagem, (e.clientY - a.py) / pxPorPixelDaImagem, a.base);
  }
  function aoSoltar() {
    arrasto.current = null;
    setPegando(false);
  }
  function aoTeclar(e) {
    if (!dims || !atual) return;
    const j = janelaDoRecorte(dims.w, dims.h, atual);
    const passo = j.lado * PASSO_TECLA * 3;
    const setas = { ArrowLeft: [passo, 0], ArrowRight: [-passo, 0], ArrowUp: [0, passo], ArrowDown: [0, -passo] };
    if (setas[e.key]) { e.preventDefault(); mover(...setas[e.key]); }
    else if (e.key === '+' || e.key === '=') { e.preventDefault(); mudarEscala(PASSO_ESCALA); }
    else if (e.key === '-') { e.preventDefault(); mudarEscala(-PASSO_ESCALA); }
  }
  function mudarEscala(delta) {
    if (!dims || !atual) return;
    const escala = Math.min(ESCALA_MAX_RECORTE, Math.max(1, Math.round((atual.escala + delta) * 100) / 100));
    setRecorte(normalizarRecorte(dims.w, dims.h, { ...atual, escala }));
  }

  async function enviar(metodo) {
    setOcupado(true);
    setErro('');
    try {
      const data = await apiFetch('/api/me/avatar/enquadro', { method: metodo, ...(metodo === 'PUT' ? { body: JSON.stringify(atual) } : {}) });
      setAberto(false);
      onSalvo?.(data?.avatar_url ?? avatarUrl, metodo === 'DELETE');
    } catch (e) {
      setErro(e?.message || 'Não deu para salvar agora. Tente de novo.');
    } finally {
      setOcupado(false);
    }
  }

  const noMinimo = !atual || atual.escala <= 1;
  const noMaximo = !atual || atual.escala >= ESCALA_MAX_RECORTE;
  const estiloEditor = dims && atual ? estiloDaJanela(dims.w, dims.h, atual) : null;

  // ─── fechado: a miniatura como o app a mostra (a do motor, já com o recorte salvo) + o convite a enquadrar ───
  if (!aberto) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 2px' }}>
        <div className="pavatar" style={{ width: 52, height: 52 }}>
          <img src={urlImagem(urlAsset(avatarUrl), 128, { quadrado: true })} alt="" decoding="async" style={{ objectFit: 'cover', objectPosition: 'top center' }} />
        </div>
        <div style={{ display: 'grid', gap: 2, minWidth: 0, flex: 1 }}>
          <span style={rotulo}>Sua miniatura no app</span>
          <span style={{ fontSize: 12, color: 'var(--label-color)', lineHeight: 1.35 }}>
            {salvo ? 'Enquadrada do seu jeito. É assim que aparece no Início, no ranking e no sorteio.' : 'Ajuste o enquadramento para o seu rosto aparecer certinho.'}
          </span>
        </div>
        <button type="button" className="btn btn--purple-outline hud-corners fig-io-btn" style={{ flex: '0 0 auto', paddingLeft: 12, paddingRight: 12 }} onClick={() => setAberto(true)}>
          Enquadrar
        </button>
      </div>
    );
  }

  // ─── aberto: o editor ao vivo ───
  return (
    <div className="hud-corners" role="group" aria-label="Enquadrar a miniatura" style={{ display: 'grid', gap: 12, padding: 14, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(212,160,23,0.25)' }}>
      <span style={rotulo}>Como você aparece no app</span>
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
        <div
          className="pavatar"
          role="img"
          aria-label="Área da miniatura. Arraste para enquadrar; as setas movem e + e - aproximam."
          tabIndex={0}
          onPointerDown={aoApertar}
          onPointerMove={aoArrastar}
          onPointerUp={aoSoltar}
          onPointerCancel={aoSoltar}
          onKeyDown={aoTeclar}
          style={{ width: LADO_EDITOR, height: LADO_EDITOR, position: 'relative', touchAction: 'none', cursor: pegando ? 'grabbing' : 'grab', flexShrink: 0 }}
        >
          <img
            src={fonte}
            alt=""
            decoding="async"
            draggable={false}
            onLoad={(e) => setDims({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
            style={estiloEditor
              ? { ...estiloEditor, objectFit: 'fill', userSelect: 'none', pointerEvents: 'none' }
              : { position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top', opacity: 0.35, pointerEvents: 'none' }}
          />
        </div>
        <div style={{ display: 'grid', gap: 10, minWidth: 0 }}>
          <span style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.85)', lineHeight: 1.4 }}>É assim que você aparece no app</span>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12 }}>
            <Previa fonte={fonte} dims={dims} recorte={atual} lado={52} />
            <Previa fonte={fonte} dims={dims} recorte={atual} lado={36} />
          </div>
          <span style={{ fontSize: 11, color: 'var(--label-color)', lineHeight: 1.4 }}>Arraste a foto para enquadrar. Use − e + para aproximar.</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button type="button" aria-label="Afastar" className="fig-zoom-btn hud-corners-s" onClick={() => mudarEscala(-PASSO_ESCALA)} disabled={noMinimo || ocupado}>
              <Minus size={14} />
            </button>
            <button type="button" aria-label="Aproximar" className="fig-zoom-btn hud-corners-s" onClick={() => mudarEscala(PASSO_ESCALA)} disabled={noMaximo || ocupado}>
              <Plus size={14} />
            </button>
          </div>
        </div>
      </div>
      {erro ? <div role="alert" style={{ fontSize: 12, color: 'var(--danger)' }}>{erro}</div> : null}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button type="button" className="btn btn--purple fig-io-btn hud-corners" style={{ flex: 1, minWidth: 130 }} disabled={ocupado || !mudou} onClick={() => enviar('PUT')}>
          {ocupado ? 'Salvando…' : 'Salvar miniatura'}
        </button>
        {salvo ? (
          <button type="button" className="btn btn--purple-outline fig-io-btn hud-corners" style={{ flex: '0 0 auto' }} disabled={ocupado} onClick={() => enviar('DELETE')}>
            Voltar ao padrão
          </button>
        ) : null}
        <button type="button" className="btn btn--purple-outline fig-io-btn hud-corners" style={{ flex: '0 0 auto' }} disabled={ocupado} onClick={() => { setAberto(false); setRecorte(null); setErro(''); }}>
          Fechar
        </button>
      </div>
    </div>
  );
}
