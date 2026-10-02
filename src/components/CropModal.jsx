// Futty v2.0 — Modal de recorte de imagem (react-easy-crop).
// Zoom + arrastar + escolha de proporção; "Confirmar" gera um blob recortado.
//
// RODADA 29H-B (item 55, dono 2-out) — o ENQUADRAMENTO ÚNICO (`miniatura`): dentro da moldura 2:3 do card aparece um quadrado
// tracejado dourado, do topo e da largura do card, marcando o que vira a foto da miniatura (Início, ranking, sorteio); ao lado do
// zoom, a miniatura ao vivo na moldura real do app (.pavatar) com "É assim que você aparece no app". Arrastar e aproximar ajustam os
// dois de uma vez — não há segundo editor. "Confirmar" devolve o blob E o recorte dessa janela (onConfirm(blob, { recorte })), que
// quem chama grava em users.avatar_recorte depois de a foto subir (lib/miniatura.js). O quadrado é sempre o do topo: a conta é a
// mesma do motor (lib/enquadroAvatar.js#recorteDaMolduraUnica ↔ backend/utils/recorteAvatar.js).
//
// NUNCA ESPELHA (item 54, regra do dono): a foto aparece como foi tirada — o cropper mostra os pixels como estão (o EXIF já foi
// resolvido em utils/normalizarFoto.js) e o canvas do recorte só desloca e escala.
import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Cropper from 'react-easy-crop';
import { recorteDaMolduraUnica } from '../lib/enquadroAvatar';

const ASPECTS = [
  { k: '1:1', v: 1 },
  { k: '4:3', v: 4 / 3 },
  { k: '16:9', v: 16 / 9 },
];

// Carrega a imagem a partir de um URL (devolve uma <img> pronta).
function createImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.addEventListener('load', () => resolve(img));
    img.addEventListener('error', (e) => reject(e));
    img.src = url;
  });
}

// Recorta a área (em pixels) para um blob JPEG via canvas, com tecto de dimensão:
// o lado maior nunca ultrapassa MAX_LADO (poupa storage/banda sem perder qualidade
// visível). Saída sempre JPEG 0.9.
const MAX_LADO = 1600;
async function gerarBlobRecortado(src, area) {
  const img = await createImage(src);
  const escala = Math.min(1, MAX_LADO / Math.max(area.width, area.height));
  const w = Math.max(1, Math.round(area.width * escala));
  const h = Math.max(1, Math.round(area.height * escala));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, area.x, area.y, area.width, area.height, 0, 0, w, h);
  const blob = await new Promise((resolve) => canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.9));
  return { blob, w, h };
}

/**
 * A miniatura ao vivo: a janela quadrada do TOPO da área recortada (lado = largura da área), na moldura real do app (.pavatar).
 * `area` é a área em pixels da imagem natural (react-easy-crop, onCropAreaChange); `natural` as medidas da imagem.
 */
function MiniaturaAoVivo({ src, area, natural, lado }) {
  const pronta = !!(src && area && natural && area.width > 0);
  const side = pronta ? area.width : 1;
  return (
    <div className="pavatar" data-miniatura-ao-vivo style={{ width: lado, height: lado, position: 'relative', overflow: 'hidden', flexShrink: 0 }} aria-hidden="true">
      {pronta ? (
        <img
          src={src}
          alt=""
          draggable={false}
          style={{
            position: 'absolute', maxWidth: 'none', objectFit: 'fill', pointerEvents: 'none',
            width: `${(natural.w / side) * 100}%`, height: `${(natural.h / side) * 100}%`,
            left: `${(-area.x / side) * 100}%`, top: `${(-area.y / side) * 100}%`,
          }}
        />
      ) : null}
    </div>
  );
}

export default function CropModal({ file, aspect = 1, aspectos = ASPECTS, miniatura = false, onConfirm, onCancel }) {
  const [src, setSrc] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [aspectAtual, setAspectAtual] = useState(aspect);
  const [areaPx, setAreaPx] = useState(null);
  const [areaAoVivo, setAreaAoVivo] = useState(null); // a cada movimento (a miniatura acompanha o dedo)
  const [natural, setNatural] = useState(null); // { w, h } da imagem carregada no cropper
  const [busy, setBusy] = useState(false);

  // Cria o object URL DENTRO do efeito, emparelhado com o revoke. Sob React
  // StrictMode (dev) os efeitos são duplo-invocados (setup→cleanup→setup): um URL
  // criado em useState seria revogado pelo cleanup do meio e ficaria morto apesar
  // do componente continuar montado (imagem invisível no cropper). Criando-o aqui,
  // o último setup produz sempre um URL válido.
  useEffect(() => {
    const url = URL.createObjectURL(file);
    // Sync legítimo com um sistema externo (ciclo de vida de um object URL, tal como
    // a doc do React documenta); o setState é intencional e corre uma vez por file.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSrc(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const onCropComplete = useCallback((_area, areaPixels) => setAreaPx(areaPixels), []);
  const onCropAreaChange = useCallback((_area, areaPixels) => setAreaAoVivo(areaPixels), []);
  const onMediaLoaded = useCallback((m) => setNatural({ w: m.naturalWidth, h: m.naturalHeight }), []);

  async function confirmar() {
    if (!areaPx || !src) return;
    setBusy(true);
    try {
      const { blob, w, h } = await gerarBlobRecortado(src, areaPx);
      // O recorte da miniatura é o quadrado do topo do arquivo que SAI daqui (a mesma conta do motor).
      onConfirm(blob, { recorte: miniatura ? recorteDaMolduraUnica(w, h) : null });
    } finally {
      setBusy(false);
    }
  }

  // Portal para o body: escapa a ancestrais com clip-path/transform (o sheet do
  // Novo post usa .hud-corners-topo → recortaria este overlay fixed a uma faixa).
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={miniatura ? 'Enquadrar a foto' : 'Recortar imagem'}
      data-crop-modal={miniatura ? 'miniatura' : 'simples'}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 200,
        background: '#000',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Área do cropper */}
      <div style={{ position: 'relative', flex: 1, minHeight: 0 }}>
        {src ? (
          <Cropper
            image={src}
            crop={crop}
            zoom={zoom}
            aspect={aspectAtual || undefined}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
            onCropAreaChange={onCropAreaChange}
            onMediaLoaded={onMediaLoaded}
            showGrid={!miniatura}
            classes={{ cropAreaClassName: miniatura ? 'crop-area--miniatura' : undefined }}
          />
        ) : null}
      </div>

      {/* Controlos — fixed inset:0 escapa à casca do Layout (createPortal), por
          isso o inset de baixo é resolvido aqui (14-set, VELOCIDADE 5): sem
          isto, "Confirmar"/"Cancelar" nasciam debaixo da barra de gesto. */}
      <div style={{ padding: '16px 16px max(16px, env(safe-area-inset-bottom, 0px))', background: '#0c0c0c', display: 'grid', gap: 14 }}>
        {/* A miniatura ao vivo (29H-B): a moldura real do app, com a janela do quadrado tracejado. */}
        {miniatura ? (
          <div data-miniatura-legenda style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <MiniaturaAoVivo src={src} area={areaAoVivo} natural={natural} lado={52} />
            <div style={{ display: 'grid', gap: 3, minWidth: 0 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.9)', lineHeight: 1.3 }}>É assim que você aparece no app</span>
              <span className="texto-apoio" style={{ marginTop: 0, fontSize: 12 }}>O quadrado tracejado é a sua foto no Início, no ranking e no sorteio. Arraste e aproxime: o card e a miniatura mudam juntos.</span>
            </div>
          </div>
        ) : null}

        {/* Proporções (só quando há escolha) */}
        {aspectos.length > 1 ? (
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
            {aspectos.map(({ k, v }) => {
              const on = Math.abs(aspectAtual - v) < 0.001;
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => setAspectAtual(v)}
                  style={{
                    padding: '7px 14px',
                    borderRadius: 999,
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: 'pointer',
                    border: `1px solid ${on ? 'var(--neon)' : 'var(--border)'}`,
                    background: on ? 'rgba(139,92,246,0.12)' : '#222',
                    color: on ? 'var(--neon)' : 'var(--text-dim)',
                  }}
                >
                  {k}
                </button>
              );
            })}
          </div>
        ) : null}

        {/* Slider de zoom */}
        <label style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 13, color: 'var(--text-dim)' }}>Zoom</span>
          <input
            type="range"
            min={1}
            max={3}
            step={0.01}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            style={{ flex: 1, accentColor: '#8b5cf6' }}
          />
        </label>

        {/* Ações */}
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            type="button"
            className="btn btn--ghost"
            style={{ flex: 1 }}
            disabled={busy}
            onClick={onCancel}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="btn btn--primary"
            style={{ flex: 1 }}
            disabled={busy || !areaPx}
            onClick={confirmar}
          >
            {busy ? 'Recortando…' : 'Confirmar'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
