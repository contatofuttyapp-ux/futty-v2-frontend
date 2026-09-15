// Futty v2.0 — Salvar/compartilhar uma imagem gerada no app (Rodada 8A, 15-set).
//
// "Baixar figurinha" não fazia nada no iPhone: o <a download> é ignorado pelo
// WKWebView (e pelo WebView do Android) — num app não há "Transferências". No
// nativo o caminho é o do sistema: grava o PNG na pasta de cache do app
// (Filesystem) e abre a folha de compartilhar (Share), que já traz "Salvar
// imagem", WhatsApp, Instagram etc. Na web continua o <a download> de sempre.
//
// iOS: o "Salvar imagem" dessa folha grava nas Fotos dentro do processo do app,
// e por isso o Info.plist precisa de NSPhotoLibraryAddUsageDescription — sem
// esse texto o iOS fecha o app no toque.
import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

/** true dentro do app da loja (iOS/Android); false no navegador. */
export function ehAppNativo() {
  return Capacitor.isNativePlatform();
}

// Nome que serve de caminho no disco do aparelho: sem acento, sem barra, sem
// espaço (um "/" no nome de um time viraria pasta e a gravação falhava).
function nomeSeguro(nome) {
  const base = String(nome || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9._-]+/g, '-')
    .replace(/^[-.]+|-+$/g, '');
  if (!base) return 'futty.png';
  return /\.png$/i.test(base) ? base : `${base}.png`;
}

function baixarNaWeb(blob, nome) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nome;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Revogar no mesmo instante do clique cancelava o download em alguns navegadores.
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

// Base64 SEM o prefixo "data:image/png;base64," — é o que o Filesystem espera
// para gravar binário (sem `encoding`).
function paraBase64(blob) {
  return new Promise((resolve, reject) => {
    const leitor = new FileReader();
    leitor.onload = () => resolve(String(leitor.result).split(',')[1] || '');
    leitor.onerror = () => reject(leitor.error || new Error('Não foi possível ler a imagem.'));
    leitor.readAsDataURL(blob);
  });
}

// Fechar a folha sem escolher nada volta como erro ("Share canceled", no iOS e
// no Android). Não é erro de ninguém: não se mostra nada.
function foiCancelado(erro) {
  return /cancel/i.test(String(erro?.message || erro || ''));
}

/**
 * No app: grava `blob` na cache e abre a folha de compartilhar do sistema.
 * Na web: baixa o arquivo.
 *
 * @param {Blob} blob - a imagem (PNG).
 * @param {string} nome - nome do arquivo (ex.: "futty-bruninho.png").
 * @param {{ titulo?: string }} [opts] - assunto do e-mail / título da folha.
 * @returns {Promise<'baixou'|'compartilhou'|'cancelou'>} Outros erros sobem.
 */
export async function salvarOuCompartilhar(blob, nome, { titulo = 'Futty' } = {}) {
  if (!blob) throw new Error('Não foi possível gerar a imagem.');
  const arquivo = nomeSeguro(nome);

  if (!Capacitor.isNativePlatform()) {
    baixarNaWeb(blob, arquivo);
    return 'baixou';
  }

  const { uri } = await Filesystem.writeFile({
    path: arquivo,
    data: await paraBase64(blob),
    directory: Directory.Cache,
  });
  try {
    await Share.share({ title: titulo, files: [uri] });
    return 'compartilhou';
  } catch (erro) {
    if (foiCancelado(erro)) return 'cancelou';
    throw erro;
  }
}
