// Futty v2.0 — Normaliza a orientação EXIF de uma foto ANTES do CropModal
// (build 9, achado real: selfie no iPhone aparecia girada 180°). Causa: a
// câmera do iPhone grava o pixel "deitado" e só a tag EXIF Orientation diz
// como desenhar em pé; nem todo canvas/lib respeita essa tag por igual
// (o CropModal usa react-easy-crop sobre uma <img>, que segue o EXIF no
// próprio browser — mas o buffer que SOBE para o servidor, se for lido cru
// depois, pode perder essa informação num passo intermédio). Resolve-se uma
// vez, aqui, redesenhando em pixels JÁ orientados: createImageBitmap com
// imageOrientation:'from-image' lê a tag e devolve o bitmap corrigido; o
// canvas grava sem tag nenhuma (reencode = sem EXIF), então NINGUÉM
// downstream (CropModal, upload, backend) precisa de voltar a interpretar
// orientação — já está certa nos pixels.
export async function normalizarFoto(file) {
  if (!file || !file.type?.startsWith('image/')) return file;
  if (typeof createImageBitmap !== 'function') return file; // fallback — API ausente
  let bitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.92));
    if (!blob) return file;
    return new File([blob], file.name || 'foto.jpg', { type: 'image/jpeg' });
  } catch {
    return file; // qualquer falha (decode, canvas, etc.) — segue com o original
  } finally {
    bitmap?.close?.();
  }
}
