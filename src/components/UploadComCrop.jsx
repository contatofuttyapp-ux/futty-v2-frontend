// Futty v2.0 — Selector de ficheiro com recorte opcional e upload.
// Imagem (não-GIF) → CropModal → upload. GIF/vídeo → upload direto.
// Devolve (url, mediaType) ao pai via onUpload. O pai gere a lista/preview.
import { useRef, useState } from 'react';
import { uploadFile } from '../lib/api';
import CropModal from './CropModal';

// uploadFn opcional: substitui o upload por defeito (uploadFile → /api/feed/upload).
// Deve receber o ficheiro e devolver { url, media_type }. Usado p.ex. no avatar.
export default function UploadComCrop({ onUpload, uploadFn = null, accept = 'image/*,video/mp4', aspect = 1, disabled = false, label = '＋ Adicionar média' }) {
  const inputRef = useRef(null);
  const [cropFile, setCropFile] = useState(null); // ficheiro a recortar (imagem)
  const [busy, setBusy] = useState(false);
  const [erro, setErro] = useState('');

  function escolher() {
    if (busy || disabled) return;
    inputRef.current?.click();
  }

  function onFileChange(e) {
    const file = e.target.files?.[0];
    e.target.value = ''; // permite reescolher o mesmo ficheiro
    if (!file) return;
    setErro('');

    const tipo = file.type || '';
    const ehImagem = tipo.startsWith('image/');
    const ehGif = tipo === 'image/gif';

    // Imagem (não-GIF) → recorta primeiro; GIF/vídeo → upload direto.
    if (ehImagem && !ehGif) {
      setCropFile(file);
    } else {
      void enviar(file);
    }
  }

  async function enviar(file) {
    setBusy(true);
    setErro('');
    try {
      const res = uploadFn ? await uploadFn(file) : await uploadFile(file);
      onUpload(res.url, res.media_type);
    } catch (err) {
      setErro(err?.message || 'Erro no upload.');
    } finally {
      setBusy(false);
    }
  }

  async function aoConfirmarCrop(blob) {
    const file = new File([blob], `crop-${Date.now()}.jpg`, { type: 'image/jpeg' });
    setCropFile(null);
    await enviar(file);
  }

  return (
    <>
      <input ref={inputRef} type="file" accept={accept} hidden onChange={onFileChange} />
      <button
        type="button"
        onClick={escolher}
        disabled={busy || disabled}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          padding: '10px 14px',
          borderRadius: 12,
          border: '1px dashed var(--border)',
          background: 'rgba(255,255,255,0.03)',
          color: busy ? 'var(--text-dim)' : 'var(--neon)',
          fontWeight: 700,
          fontSize: 13,
          cursor: busy || disabled ? 'wait' : 'pointer',
        }}
      >
        {busy ? 'A enviar…' : label}
      </button>
      {erro ? <div style={{ marginTop: 6, fontSize: 12, color: 'var(--danger)' }}>{erro}</div> : null}

      {cropFile ? (
        <CropModal
          file={cropFile}
          aspect={aspect}
          onConfirm={aoConfirmarCrop}
          onCancel={() => setCropFile(null)}
        />
      ) : null}
    </>
  );
}
