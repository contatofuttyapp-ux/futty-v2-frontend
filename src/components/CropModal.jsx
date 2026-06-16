// Futty v2.0 — Modal de recorte de imagem (react-easy-crop).
// Zoom + arrastar + escolha de proporção; "Confirmar" gera um blob recortado.
import { useCallback, useEffect, useState } from 'react';
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

// Recorta a área (em pixels) para um blob JPEG via canvas.
async function gerarBlobRecortado(src, area) {
  const img = await createImage(src);
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(area.width);
  canvas.height = Math.round(area.height);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, area.x, area.y, area.width, area.height, 0, 0, area.width, area.height);
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.9));
}

export default function CropModal({ file, aspect = 1, onConfirm, onCancel }) {
  // Object URL criado uma única vez (inicializador lazy — sem setState em efeito).
  const [src] = useState(() => URL.createObjectURL(file));
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [aspectAtual, setAspectAtual] = useState(aspect);
  const [areaPx, setAreaPx] = useState(null);
  const [busy, setBusy] = useState(false);

  // Revoga o object URL ao desmontar.
  useEffect(() => () => URL.revokeObjectURL(src), [src]);

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

  return (
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
            aspect={aspectAtual}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
          />
        ) : null}
      </div>

      {/* Controlos */}
      <div style={{ padding: '16px', background: '#0c0c0c', display: 'grid', gap: 14 }}>
        {/* Proporções */}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
          {ASPECTS.map(({ k, v }) => {
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
    </div>
  );
}
