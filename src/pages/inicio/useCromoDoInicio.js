// Futty v2.0 — Início: o cromo — o estado dele, o elemento medido e a pintura (cache de sessão, cache do aparelho e o canvas de verdade).
import { useEffect, useRef, useState } from 'react';
import { lerCromo } from '../../lib/cromoCache';
import { registarFalha, aposPrimeiraPintura, tarefaEmCurso } from '../../lib/diagnostico';
import { avatarGenericoUrl } from '../../utils/avatarGenerico';
import { urlImagem } from '../../utils/avatar';
import { cromoCache, gerarCromoDataURL } from './gerarCromo';

export function useCromoDoInicio({ avatarGenericoEscolha, cromoAvatarEhIA, cromoFundo, modoDoCromo, nome, user }) {
  // O cromo é gerado AQUI (não dentro do CromoInicio) porque o Início é quem
  // sabe o avatar, o fundo e o nome. Não segura a página —
  // começa a null, a tela aparece na mesma, e ele entra quando estiver pronto
  // (do IndexedDB na hora, ou do canvas um segundo depois).
  const [cromo, setCromo] = useState(null);

  // O elemento do cromo — para medir a que largura ele é realmente mostrado e
  // gerar o canvas nesse tamanho, em vez dos 600×600 fixos de antes.
  const refCromo = useRef(null);

  // Gera o cromo assim que o user existe. corFrame/zoom são os defaults FIXOS da
  // Figurinha — divergir dava dois cromos diferentes para o mesmo utilizador.
  //
  // A ordem é: memória → IndexedDB → canvas. Só se
  // chega ao canvas (o passo de um a três segundos no celular) quando não há
  // nada guardado, ou quando a composição mudou. Nada disto segura a tela.
  useEffect(() => {
    if (!user) return undefined;
    let vivo = true;
    // Com Brilhante, o cromo de sempre. Sem Brilhante mas com FOTO, a figurinha
    // COMUM (SPEC-FIGURINHA-3 §3): a mesma foto, a mesma moldura, o mesmo
    // álbum. Sem foto nenhuma, o genérico da casa continua a ser o convite.
    const jogadorCard = cromoAvatarEhIA
      ? { ...user, avatar_url: urlImagem(user.avatar_url, 512) }
      : user?.foto_url
        ? { ...user, foto_url: urlImagem(user.foto_url, 512) }
        : { ...user, avatar_url: avatarGenericoUrl(user.id, avatarGenericoEscolha, nome) };
    const modoCromo = modoDoCromo;
    // fundoGlints:'discreto' — o cromo do Início é um OBJECTO estático (nunca em
    // camadas/animado, ver nota acima); o GOLDEN não pode copiar nem o pico do
    // download nem a montra do tile do seletor — densidade de repouso própria.
    const opts = { jogador: jogadorCard, fundo: cromoFundo, corFrame: 'dourado', avatarZoom: 1.1, formato: 'quadrado', fundoGlints: 'discreto', modo: modoCromo };
    // O modo entra na chave: a mesma pessoa com a mesma foto desenha DUAS coisas diferentes antes e depois
    // de ter Brilhante, e servir o cromo errado do cache seria um bug. Quem muda o desenho da aura (hoje o
    // dobro do tamanho, −25% de opacidade) muda a chave dela, senão o IndexedDB serve o cromo antigo.
    const chave = `q${cromoFundo === 'aura' ? '2' : ''}|${modoCromo}|${jogadorCard.avatar_url || jogadorCard.foto_url || '-'}|${cromoFundo}|${nome}`;

    const naMemoria = cromoCache.get(chave);
    if (naMemoria) {
      // Já desenhado nesta sessão (voltar do feed, por exemplo). Adiado ao
      // microtask: setState síncrono no corpo do efeito dispara renders em
      // cascata — mesmo padrão do PerfilContext e do useApiComCache.
      Promise.resolve().then(() => { if (vivo) setCromo(naMemoria); });
      return () => { vivo = false; };
    }

    // O cromo não pode depender de ninguém para sempre. O lerCromo() do IndexedDB não pode ficar sem prazo:
    // com o WebKit a travar a base (outra aba a segurar o upgrade, modo privado, disco a responder mal), a
    // promessa nunca assenta — e, se o desenhar() estiver DENTRO do .then(), o canvas também nunca corre:
    // uma otimização de cache a segurar a coisa que ela devia acelerar (já apanhámos no iPhone da loja o
    // placeholder desfocado eternamente). Quem manda é o relógio: passados 400 ms sem resposta do cache,
    // desenha-se na mesma. Perde-se o atalho, nunca a figurinha.
    //
    // O canvas também não espera o aparelho PARAR: atrás do `quandoParado` (3 s sem tocar na tela) o cromo
    // compunha no pior momento possível — um relatório mostra a travada de 6402 ms aos 82 s, com a pessoa
    // já desistida de esperar. Compor custa ~100 ms e é fatiado (ver figurinhaCanvas), por isso o certo é
    // começar CEDO, dois quadros depois da primeira pintura. Dois quadros porque o primeiro ainda cai antes
    // do desenho e o segundo já corre com a tela na frente — o mesmo critério da marcação da pintura em
    // lib/diagnostico.js. Os atalhos (memória e IndexedDB) continuam imediatos: é deles que vem o cromo
    // instantâneo de quem já abriu o app.
    let desenhou = false;
    let quadro1 = null;
    let quadro2 = null;
    let comecouEm = null;
    function desenhar() {
      if (!vivo || desenhou) return;
      desenhou = true;
      aposPrimeiraPintura(() => {
        if (!vivo) return;
        quadro1 = requestAnimationFrame(() => {
          quadro2 = requestAnimationFrame(() => {
            if (!vivo) return;
            comecouEm = Date.now();
            compor();
          });
        });
      });
    }
    function compor() {
      // A largura a que o cromo é MOSTRADO manda no tamanho do canvas: gerar
      // 600×600 para uma tela que mostra 99 px é rasterizar e codificar seis
      // vezes mais pixéis do que se vê (ver ladoDoCromo).
      const larguraExibida = refCromo.current?.getBoundingClientRect().width || null;
      // Enquanto o canvas compõe, qualquer quadro perdido fica anotado com esta tarefa.
      const fimDaTarefa = tarefaEmCurso('cromo:compor');
      gerarCromoDataURL({ ...opts, larguraExibida }, chave, user.id)
        .then((url) => {
          if (!vivo) return;
          if (url) setCromo(url);
          else registarFalha('cromo', 'blob-nulo');
        })
        .catch((e) => {
          console.error('[cromo]', e);
          registarFalha('cromo', 'erro', e?.message);
        })
        .finally(fimDaTarefa);
    }

    // Guardado da última abertura: se a composição é a mesma, os pixéis seriam
    // idênticos — mostra-se e não se redesenha nada.
    const prazoCache = new Promise((resolve) => setTimeout(() => resolve('prazo'), 400));
    Promise.race([lerCromo(user.id).catch(() => null), prazoCache])
      .then((guardado) => {
        if (!vivo) return;
        if (guardado === 'prazo') {
          registarFalha('cromo', 'timeout-indexeddb');
          desenhar();
          return;
        }
        if (guardado?.chave === chave) {
          cromoCache.set(chave, guardado.dataURL);
          setCromo(guardado.dataURL);
          return;
        }
        desenhar();
      })
      .catch(desenhar);

    // Rede de segurança: se ao fim de 4 s A DESENHAR ainda não há cromo no ecrã,
    // foi o próprio canvas que não chegou ao fim (decodificar avatar e fundo é o
    // passo caro). Fica registado para se ver no Gabinete — é a diferença
    // entre "o cromo demora" e "o cromo não vem".
    //
    // A vigia conta a partir do INÍCIO do desenho, não da montagem
    // — o canvas espera o aparelho parar, e contar da montagem daria um
    // alarme falso sempre que a pessoa estivesse a mexer na tela.
    const vigia = setInterval(() => {
      if (!vivo || cromoCache.get(chave)) return;
      if (comecouEm && Date.now() - comecouEm > 4000) {
        registarFalha('cromo', 'sem-cromo-4s');
        clearInterval(vigia);
      }
    }, 1000);

    return () => {
      vivo = false;
      clearInterval(vigia);
      if (quadro1 != null) cancelAnimationFrame(quadro1);
      if (quadro2 != null) cancelAnimationFrame(quadro2);
    };
  }, [user, cromoAvatarEhIA, cromoFundo, avatarGenericoEscolha, nome, modoDoCromo]);

  return { cromo, refCromo };
}
