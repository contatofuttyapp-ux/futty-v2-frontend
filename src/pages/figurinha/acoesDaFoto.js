// Futty v2.0 — Figurinha: trocar a foto (escolher, recortar, subir, tentar de novo) e ajustar o enquadramento.
// As ações nascem a cada render da página, com o estado daquele render — como quando moravam dentro dela.
import { apiUpload, apiUploadCampos } from '../../lib/api';
import { urlAsset, urlImagem } from '../../utils/avatar';
import { mensagemUploadFoto } from '../../utils/uploadErro';
import { normalizarFoto } from '../../utils/normalizarFoto';
import { gravarMiniatura } from '../../lib/miniatura';

export function useAcoesDaFoto({ aplicarNoPerfilGlobal, cropModo, estreiaFase, fotoOriginal, gerarAvatarIAEstreia, jogador, me, origParaEnviar, setAjustandoEnquadramento, setCropFile, setCropModo, setErro, setEstreiaFase, setFotoLocal, setFotoRecusada, setFotoTrocadaSemGerar, setFotoZoom, setMe, setModalFoto, setToast, setUploadErro, setUploadFoto, temDireitoDeGerar, ultimoFicheiro, ultimoRecorte, ultimoRecorteMini }) {
  // Trocar foto: upload para o servidor e, CONFIRMADO o 200, preview local imediato. O preview (e a
  // linha "Foto trocada") só nascem depois do 200: com o upload falhando a tela não pode dizer que a
  // foto já mudou; com erro, só o erro.
  // Na estreia, dispara automaticamente a geração da Brilhante — só quando já há direito (crédito ou
  // pacote do time); sem ele, a comum já está pronta.
  // Núcleo do upload, reutilizado pelo "tentar de novo". `emEstreia` decide se dispara a geração IA
  // automática a seguir. `file` já é o RECORTE (saído do CropModal); `original` (opcional) é a foto de
  // antes do recorte, mandada junto para "Ajustar enquadramento" mais tarde.
  // `recorteMini` é o quadrado tracejado da miniatura (enquadramento único), gravado em
  // users.avatar_recorte depois do 200 — só quando o card passa a mostrar a FOTO (com figurinha ativa,
  // o arquivo do avatar continua sendo a figurinha; o recorte dela fica).
  async function subirFoto(file, emEstreia, original, recorteMini = null) {
    setFotoLocal(null); // some a confirmação de uma troca anterior enquanto esta corre
    setFotoRecusada(false); // foto nova: some o recado da foto anterior
    if (emEstreia) setEstreiaFase('gerando');
    setUploadFoto(true);
    setErro('');
    setUploadErro(null);
    try {
      const data = original
        ? await apiUploadCampos('/api/me/avatar', { avatar: file, original })
        : await apiUpload('/api/me/avatar', file, 'avatar');
      // foto_url = a nova foto (fonte da próxima geração). avatar_url = o que o card
      // mostra: o backend PRESERVA a figurinha se houver uma (arquivo -ai- nosso) e
      // senão espelha a foto nova, por isso o card comum muda na hora e o com figurinha
      // mantém a figurinha até a pessoa gerar de novo.
      setMe((m) => (m ? {
        ...m,
        user: {
          ...m.user,
          foto_url: data.foto_url ?? data.avatar_url,
          avatar_url: data.avatar_url,
          foto_original_url: data.foto_original_url ?? m.user.foto_original_url ?? null,
          figurinha_ativa: data.figurinha_ativa,
        },
      } : m));
      // O contexto do perfil também aprende a foto nova, sem rede: sem isto, sair da
      // tela e voltar (ou abrir o Início) semeava o card com o perfil de ANTES da troca.
      aplicarNoPerfilGlobal({
        foto_url: data.foto_url ?? data.avatar_url,
        avatar_url: data.avatar_url,
        foto_original_url: data.foto_original_url ?? me?.user?.foto_original_url ?? null,
        figurinha_ativa: data.figurinha_ativa,
      });
      setFotoZoom(1); // foto nova: o zoom volta a "cobre a moldura"
      setFotoLocal(URL.createObjectURL(file)); // 200 confirmado: agora sim o preview e a linha "Foto trocada"
      setUploadFoto(false);
      ultimoFicheiro.current = null;
      origParaEnviar.current = null;
      if (recorteMini && !data.figurinha_ativa) gravarMiniaturaDaFoto(recorteMini);
      if (emEstreia) {
        // SPEC-FIGURINHA-3: a estreia só tenta gerar a Brilhante com direito confirmado (crédito ou pacote do
        // time) — sem isso o POST dava 403 SEM_DIREITO e a tela mostrava o card de "limite" (que nem existe
        // mais). Sem direito, a comum já está pronta (o upload acima gravou foto_url): só falta revelar o
        // cromo, sem tentar nem errar.
        if (temDireitoDeGerar) await gerarAvatarIAEstreia();
        else setEstreiaFase('pronto');
      } else setFotoTrocadaSemGerar(true); // fora da estreia, quem decide gerar é o próprio usuário
    } catch (err) {
      // P1-5 — mensagem accionável (rede/tamanho/formato) + retry inline, não um erro cru.
      setUploadErro(mensagemUploadFoto(err));
      setUploadFoto(false);
      if (emEstreia) setEstreiaFase('foto'); // volta ao estado A
    }
  }

  // Grava o quadrado tracejado como a miniatura de verdade (best-effort, sem segurar a tela); com o 200,
  // o avatar_url novo já traz o `?rc=` e as miniaturas de todo lado passam a cortar nele.
  function gravarMiniaturaDaFoto(recorteMini) {
    gravarMiniatura(recorteMini).then((url) => {
      if (!url) return;
      setMe((m) => (m ? { ...m, user: { ...m.user, avatar_url: url } } : m));
      aplicarNoPerfilGlobal({ avatar_url: url });
    });
  }

  // "Ajustar enquadramento": regrava só o recorte (PUT), sem
  // mandar original nenhuma (a que já está guardada não muda).
  async function enviarRecorte(blob, recorteMini = null) {
    const file = new File([blob], 'recorte.jpg', { type: 'image/jpeg' });
    ultimoRecorte.current = blob; // o "Tentar de novo" de um erro aqui repete ESTE recorte
    setFotoLocal(null);
    setUploadFoto(true);
    setErro('');
    setUploadErro(null);
    try {
      const data = await apiUploadCampos('/api/me/avatar/recorte', { recorte: file }, { method: 'PUT' });
      setMe((m) => (m ? { ...m, user: { ...m.user, foto_url: data.foto_url, avatar_url: data.avatar_url, figurinha_ativa: data.figurinha_ativa } } : m));
      aplicarNoPerfilGlobal({ foto_url: data.foto_url, avatar_url: data.avatar_url, figurinha_ativa: data.figurinha_ativa });
      setFotoZoom(1); // enquadramento novo: é ele que manda, o zoom volta ao piso
      setFotoLocal(URL.createObjectURL(file)); // só depois do 200, como em subirFoto
      setUploadFoto(false);
      ultimoRecorte.current = null;
      if (recorteMini && !data.figurinha_ativa) gravarMiniaturaDaFoto(recorteMini);
      setToast({ tipo: 'success', mensagem: 'Enquadramento atualizado.' });
    } catch (err) {
      setUploadErro(mensagemUploadFoto(err));
      setUploadFoto(false);
    }
  }

  // Escolhe o ficheiro (galeria/câmera) e abre o CropModal 2:3 — igual ao
  // Onboarding. A normalizada segue guardada em origParaEnviar: se o recorte
  // for confirmado, ela vai junto como a "original" (foto_original_url).
  async function onPickFile(e) {
    const file = e.target.files?.[0];
    e.target.value = ''; // permite re-seleccionar o mesmo ficheiro
    if (!file) return;
    setModalFoto(false); // fecha o modal "Sua foto" ao escolher — revela o CropModal
    const normalizada = await normalizarFoto(file);
    origParaEnviar.current = normalizada;
    setCropModo('nova');
    setCropFile(normalizada);
  }

  // "Ajustar enquadramento": reabre o CropModal sobre a foto ORIGINAL guardada (foto_original_url).
  // Fail-safe (fotos de antes de a original ser guardada, ou sem a migração 057): sem original, reabre
  // sobre o RECORTE atual — dá para aproximar, não para recuperar área perdida no primeiro recorte.
  async function abrirAjustarEnquadramento() {
    const fonte = jogador.foto_original_url || fotoOriginal;
    if (!fonte) return;
    setAjustandoEnquadramento(true);
    setErro('');
    try {
      const resp = await fetch(urlImagem(urlAsset(fonte), 1600));
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const blob = await resp.blob();
      origParaEnviar.current = null; // não é upload de foto nova — não manda "original"
      setCropModo('ajustar');
      setModalFoto(false);
      setCropFile(new File([blob], 'ajustar.jpg', { type: blob.type || 'image/jpeg' }));
    } catch (e) {
      console.error('[figurinha] abrir ajustar enquadramento falhou:', e.message);
      setErro('Não foi possível abrir sua foto para ajustar. Tente de novo.');
    } finally {
      setAjustandoEnquadramento(false);
    }
  }

  // Confirmar do CropModal — um só ponto, os dois fluxos ("Escolher outra
  // foto" e "Ajustar enquadramento") só diferem no que fazem com o recorte.
  async function aoConfirmarCrop(blob, extra) {
    setCropFile(null);
    const recorteMini = extra?.recorte || null; // o quadrado tracejado da miniatura
    ultimoRecorteMini.current = recorteMini;
    if (cropModo === 'ajustar') {
      await enviarRecorte(blob, recorteMini);
      return;
    }
    const original = origParaEnviar.current;
    ultimoFicheiro.current = blob;
    ultimoRecorte.current = null;
    await subirFoto(blob, estreiaFase === 'foto', original, recorteMini);
  }

  function aoCancelarCrop() {
    setCropFile(null);
    origParaEnviar.current = null;
  }

  // "Tentar de novo" (P1-5): repete o upload com o MESMO recorte (+ original,
  // se havia), sem passar pelo CropModal de novo. Um erro do "Ajustar
  // enquadramento" repete o PUT do recorte (antes o botão não fazia nada: só
  // olhava para o arquivo do upload de foto nova).
  function repetirUpload() {
    if (ultimoRecorte.current) enviarRecorte(ultimoRecorte.current, ultimoRecorteMini.current);
    else if (ultimoFicheiro.current) subirFoto(ultimoFicheiro.current, estreiaFase === 'foto', origParaEnviar.current, ultimoRecorteMini.current);
  }

  return { onPickFile, abrirAjustarEnquadramento, aoConfirmarCrop, aoCancelarCrop, repetirUpload };
}
