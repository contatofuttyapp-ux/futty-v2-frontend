// Futty v2.0 — Figurinha: o cromo pronto — compartilhar (na estreia e no studio) e baixar.
// As ações nascem a cada render da página, com o estado daquele render.
import { nomeJogador } from '../../utils/avatar';
import { gerarFigurinhaCanvas } from '../../utils/figurinhaCanvas';
import { ehNativo } from '../../lib/plataforma';
import { salvarOuCompartilhar } from '../../utils/salvarImagem';

// Nome de ficheiro seguro a partir do nome do jogador.
function ficheiroNome(nome, sufixo = '') {
  const base = String(nome || 'jogador')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/gi, '-')
    .toLowerCase()
    .replace(/(^-|-$)/g, '');
  return `futty-${base || 'jogador'}${sufixo}.png`;
}

export function useAcoesDoCromo({ busy, concluirEstreia, jogador, opts, setBusy, setErro }) {
  // Partilha do cromo no momento da estreia (imagem do card + texto viral). No app vai direto à folha de
  // compartilhar do sistema: o navigator.share do WebView não é garantido, e o <a download> é ignorado.
  async function partilharCromo() {
    try {
      const blob = await gerarFigurinhaCanvas(opts);
      const nome = ficheiroNome(nomeJogador(jogador));
      const file = blob ? new File([blob], nome, { type: 'image/png' }) : null;
      const payload = { title: 'Meu card Futty', text: 'Veja meu cartão de jogador no Futty ⚽' };
      if (ehNativo()) {
        await salvarOuCompartilhar(blob, nome, { titulo: payload.title });
      } else if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ ...payload, files: [file] });
      } else if (navigator.share) {
        await navigator.share(payload);
      } else if (blob) {
        await salvarOuCompartilhar(blob, nome);
      }
    } catch (e) {
      if (e?.name !== 'AbortError') setErro(e?.message || 'Não deu para compartilhar. Tente de novo.');
    } finally {
      concluirEstreia();
    }
  }

  async function baixar() {
    if (busy) return;
    setBusy(true);
    setErro('');
    try {
      const blob = await gerarFigurinhaCanvas(opts);
      if (!blob) {
        setErro('Não deu para gerar a imagem. Tente de novo.');
        return;
      }
      // Web: baixa. App: folha de compartilhar (tem "Salvar imagem"); fechar a
      // folha sem escolher nada não é erro.
      await salvarOuCompartilhar(blob, ficheiroNome(nomeJogador(jogador)), { titulo: 'Minha figurinha Futty' });
    } catch (e) {
      setErro(e?.message || 'Não deu para gerar agora. Tente de novo.');
    } finally {
      setBusy(false);
    }
  }

  async function partilhar() {
    if (busy) return;
    setBusy(true);
    setErro('');
    try {
      const blob = await gerarFigurinhaCanvas(opts);
      if (!blob) {
        setErro('Não deu para gerar a imagem. Tente de novo.');
        return;
      }
      const file = new File([blob], ficheiroNome(nomeJogador(jogador)), { type: 'image/png' });
      if (!ehNativo() && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: 'Minha figurinha Futty' });
      } else {
        await salvarOuCompartilhar(blob, file.name, { titulo: 'Minha figurinha Futty' });
      }
    } catch (e) {
      if (e?.name !== 'AbortError') setErro(e?.message || 'Não deu para compartilhar. Tente de novo.');
    } finally {
      setBusy(false);
    }
  }

  return { partilharCromo, baixar, partilhar };
}
