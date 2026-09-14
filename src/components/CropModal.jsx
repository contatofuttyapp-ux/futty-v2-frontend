// Futty v2.0 — Modal de recorte de imagem (react-easy-crop).
// Zoom + arrastar + escolha de proporção; "Confirmar" gera um blob recortado.
import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Cropper from 'react-easy-crop';

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
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.9));
}

export default function CropModal({ file, aspect = 1, aspectos = ASPECTS, onConfirm, onCancel }) {
  const [src, setSrc] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [aspectAtual, setAspectAtual] = useState(aspect);
  const [areaPx, setAreaPx] = useState(null);
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

  async function confirmar() {
    if (!areaPx || !src) return;
    setBusy(true);
    try {
      const blob = await gerarBlobRecortado(src, areaPx);
      onConfirm(blob);
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
      aria-label="Recortar imagem"
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
          />
        ) : null}
      </div>

      {/* Controlos — fixed inset:0 escapa à casca do Layout (createPortal), por
          isso o inset de baixo é resolvido aqui (14-set, VELOCIDADE 5): sem
          isto, "Confirmar"/"Cancelar" nasciam debaixo da barra de gesto. */}
      <div style={{ padding: '16px 16px max(16px, env(safe-area-inset-bottom, 0px))', background: '#0c0c0c', display: 'grid', gap: 14 }}>
        {/* Proporções */}
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
