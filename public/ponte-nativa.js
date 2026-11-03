// Ponte do site do sorteio com o app nativo (app Futty 2.0).
//
// O app 2.0 é o site do sorteio dentro da casca do Capacitor, e o site não importa nada do Capacitor. Este arquivo entra
// como <script> no index.html do dist (scripts/empacotar-sorteio.mjs), roda antes do site e faz, por fora dele, o que muda
// no aparelho: folha nativa para a imagem e para o link, vibração, botão Voltar do Android, links /s/ que abrem no app, o
// servidor do site chamado pelo HTTP nativo (o WebView não é a mesma origem do site) e a tela de abertura.
//
// Fala direto com a ponte do Capacitor (nativePromise/addListener), que o próprio aparelho injeta antes de qualquer script.
// No navegador comum não faz nada. A lista do que deve migrar para src/nativo.js do site está em FUT\SORTEIO\RELATORIO-T5.md.
(function () {
  'use strict';

  var cap = window.Capacitor;
  if (!cap || !cap.isNativePlatform || !cap.isNativePlatform() || !cap.nativePromise) return;

  // Onde o link público vive. É o que a pessoa cola no grupo.
  var ORIGEM = 'https://futtyapp.com.br';
  // Quem atende /api/*. Só a prova troca este valor, e só no dist dela (empacotar-sorteio.mjs --api).
  var API = 'https://futtyapp.com.br';

  var nativo = function (plugin, metodo, opcoes) { return cap.nativePromise(plugin, metodo, opcoes || {}); };
  var semErro = function (promessa) { return promessa.catch(function () { /* nada a fazer */ }); };

  // ── Link público ──
  // O site monta o link com location.origin quando não está em futtyapp.com.br, e no app o endereço é o do WebView.
  // No texto copiado o site tira o https://, então o endereço local também chega sem ele; o link sai na mesma forma.
  var LINK_LOCAL = /((?:https?|capacitor|ionic):\/\/)?localhost(?::\d+)?(?=\/s\/)/g;
  function linkDeVerdade(texto) {
    return String(texto == null ? '' : texto).replace(LINK_LOCAL, function (_, protocolo) { return protocolo ? ORIGEM : ORIGEM.replace(/^https:\/\//, ''); });
  }

  // ── Servidor do site ──
  // Pelo HTTP nativo: o site não libera CORS para o WebView, e o app não precisa disso para falar com ele.
  var AVISO_SEM_INTERNET = { pt: 'Sem internet pra criar o link', en: 'No internet to create the link', es: 'Sin internet para crear el enlace' };
  var linkFalhouSemRede = false;

  function caminhoDaApi(endereco) {
    try {
      var u = new URL(String(endereco), location.href);
      return u.origin === location.origin && u.pathname.indexOf('/api/') === 0 ? u.pathname + u.search : null;
    } catch (_) { return null; }
  }

  // Base64 SEM o prefixo "data:...;base64,", que é o que o Filesystem e o HTTP nativo esperam para binário.
  function paraBase64(blob) {
    return new Promise(function (resolve, reject) {
      var leitor = new FileReader();
      leitor.onload = function () { resolve(String(leitor.result).split(',')[1] || ''); };
      leitor.onerror = function () { reject(leitor.error || new Error('imagem')); };
      leitor.readAsDataURL(blob);
    });
  }

  function deBase64(texto, tipo) {
    var bin = atob(texto);
    var bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
    return new Blob([bytes], { type: tipo || 'application/octet-stream' });
  }

  function cabecalhoDe(cabecalhos, nome) {
    var achado = Object.keys(cabecalhos || {}).filter(function (k) { return k.toLowerCase() === nome; })[0];
    return achado ? cabecalhos[achado] : '';
  }

  function pedirAoSite(caminho, opcoes) {
    opcoes = opcoes || {};
    var cabecalhos = {};
    new Headers(opcoes.headers || {}).forEach(function (valor, nome) { cabecalhos[nome] = valor; });
    var corpo = opcoes.body;
    var pronto = Promise.resolve({});
    if (corpo instanceof Blob) {
      if (corpo.type && !cabecalhos['content-type']) cabecalhos['content-type'] = corpo.type;
      pronto = paraBase64(corpo).then(function (dados) { return { data: dados, dataType: 'file' }; });
    } else if (typeof corpo === 'string') {
      pronto = Promise.resolve({ data: corpo, dataType: 'text' });
    }
    var ehImagem = caminho.indexOf('/api/img/') === 0;
    return pronto.then(function (envio) {
      return nativo('CapacitorHttp', 'request', {
        url: API + caminho,
        method: (opcoes.method || 'GET').toUpperCase(),
        headers: cabecalhos,
        data: envio.data,
        dataType: envio.dataType,
        responseType: ehImagem ? 'blob' : 'text',
        // Rede ruim avisa em vez de deixar o botão em "criando link" para sempre.
        connectTimeout: 10000,
        readTimeout: 15000,
      });
    }).then(function (r) {
      var tipo = cabecalhoDe(r.headers, 'content-type');
      var dados = r.data;
      if (ehImagem && r.status === 200) dados = deBase64(dados, tipo);
      else if (dados !== null && typeof dados === 'object') dados = JSON.stringify(dados);
      var semCorpo = r.status === 204 || r.status === 304;
      return new Response(semCorpo ? null : dados, { status: r.status, headers: { 'content-type': tipo || 'text/plain' } });
    }, function () {
      if (caminho === '/api/links') linkFalhouSemRede = true;
      throw new TypeError('Failed to fetch');
    });
  }

  var fetchDoWebView = window.fetch.bind(window);
  window.fetch = function (entrada, opcoes) {
    var caminho = caminhoDaApi(typeof entrada === 'string' ? entrada : (entrada && entrada.url) || entrada);
    return caminho ? pedirAoSite(caminho, opcoes) : fetchDoWebView(entrada, opcoes);
  };

  // O beacon sairia para o próprio WebView. Devolver false faz o site cair no fetch de cima.
  var beaconDoWebView = navigator.sendBeacon ? navigator.sendBeacon.bind(navigator) : null;
  navigator.sendBeacon = function (endereco, dados) {
    if (caminhoDaApi(endereco)) return false;
    return beaconDoWebView ? beaconDoWebView(endereco, dados) : false;
  };

  // O escudo de um link aberto no app é <img src="/api/img/...">. Vira blob: da mesma origem, então também entra no canvas
  // da imagem sem contaminá-lo.
  var imagens = {};
  function imagemDoSite(caminho) {
    if (!imagens[caminho]) {
      imagens[caminho] = pedirAoSite(caminho).then(function (r) {
        if (!r.ok) throw new Error('imagem ' + r.status);
        return r.blob();
      }).then(function (blob) { return URL.createObjectURL(blob); });
      imagens[caminho].catch(function () { delete imagens[caminho]; });
    }
    return imagens[caminho];
  }
  var srcDaImagem = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'src');
  function trocarSrc(img, valor) {
    var caminho = caminhoDaApi(valor);
    if (!caminho) return false;
    imagemDoSite(caminho).then(function (url) { srcDaImagem.set.call(img, url); }, function () { srcDaImagem.set.call(img, 'data:,'); });
    return true;
  }
  Object.defineProperty(HTMLImageElement.prototype, 'src', {
    configurable: true,
    enumerable: srcDaImagem.enumerable,
    get: srcDaImagem.get,
    set: function (valor) { if (!trocarSrc(this, valor)) srcDaImagem.set.call(this, valor); },
  });
  var setAttributeOriginal = Element.prototype.setAttribute;
  Element.prototype.setAttribute = function (nome, valor) {
    if (this instanceof HTMLImageElement && String(nome).toLowerCase() === 'src' && trocarSrc(this, valor)) return undefined;
    return setAttributeOriginal.call(this, nome, valor);
  };

  // ── Folha nativa (imagem e link) ──
  // Mesmo caminho de src/utils/salvarImagem.js: grava o PNG na cache do app e abre a folha, que traz "Salvar imagem",
  // WhatsApp etc. Quem cancela a folha volta como AbortError, que é o que o site já trata.

  // Sem acento, sem barra, sem espaço: um "/" no nome de um time viraria pasta e a gravação falhava.
  function nomeSeguro(nome) {
    var base = String(nome || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9._-]+/g, '-').replace(/^[-.]+|-+$/g, '');
    if (!base) return 'futty.png';
    return /\.(png|jpe?g|webp)$/i.test(base) ? base : base + '.png';
  }

  function erroDaFolha(erro) {
    if (/cancel/i.test(String((erro && erro.message) || erro || ''))) return new DOMException('Share canceled', 'AbortError');
    return erro;
  }

  function abrirFolha(dados) {
    return nativo('Share', 'share', dados).then(function () { return undefined; }, function (erro) { throw erroDaFolha(erro); });
  }

  function compartilhar(dados) {
    dados = dados || {};
    var arquivo = dados.files && dados.files[0];
    if (arquivo) {
      return paraBase64(arquivo).then(function (base64) {
        return nativo('Filesystem', 'writeFile', { path: nomeSeguro(arquivo.name), data: base64, directory: 'CACHE' });
      }).then(function (gravado) {
        return abrirFolha({ title: dados.title, files: [gravado.uri] });
      });
    }
    var folha = { title: dados.title };
    if (dados.url) folha.url = linkDeVerdade(dados.url);
    if (dados.text) folha.text = linkDeVerdade(dados.text);
    return abrirFolha(folha);
  }

  Object.defineProperty(navigator, 'share', { configurable: true, writable: true, value: compartilhar });
  Object.defineProperty(navigator, 'canShare', { configurable: true, writable: true, value: function () { return true; } });

  // ── Copiar ──
  // Só para o texto copiado levar o link de verdade. Quem cuida de copiar continua sendo src/copiar.js do site.
  if (navigator.clipboard && navigator.clipboard.writeText) {
    var escreverNaArea = navigator.clipboard.writeText.bind(navigator.clipboard);
    navigator.clipboard.writeText = function (texto) { return escreverNaArea(linkDeVerdade(texto)); };
    navigator.clipboard.write = function (itens) {
      return itens[0].getType('text/plain').then(function (b) { return b.text(); }).then(function (texto) { return escreverNaArea(linkDeVerdade(texto)); });
    };
  }
  var execCommandOriginal = document.execCommand.bind(document);
  document.execCommand = function (comando, a, b) {
    var campo = document.activeElement;
    if (comando === 'copy' && campo && typeof campo.value === 'string') {
      var trocado = linkDeVerdade(campo.value);
      if (trocado !== campo.value) { campo.value = trocado; campo.select(); }
    }
    return execCommandOriginal(comando, a, b);
  };

  // ── Vibração ──
  // Curta quando a camisa para (.rev acende a cada jogador, o mesmo instante do clac) e no jackpot (.premio na máquina).
  function vigiarCerimonia(raiz) {
    new MutationObserver(function (mudancas) {
      // Várias trocas de classe no mesmo quadro chegam juntas e todas veem o estado final: cada elemento vibra uma vez só.
      var vibrados = [];
      mudancas.forEach(function (m) {
        var alvo = m.target;
        if (vibrados.indexOf(alvo) >= 0) return;
        var antes = ' ' + String(m.oldValue || '') + ' ';
        var ganhou = function (classe) { return alvo.classList.contains(classe) && antes.indexOf(' ' + classe + ' ') < 0; };
        if (alvo.classList.contains('rev') && ganhou('on')) {
          vibrados.push(alvo);
          semErro(nativo('Haptics', 'impact', { style: 'LIGHT' }));
        } else if (ganhou('premio')) {
          vibrados.push(alvo);
          semErro(nativo('Haptics', 'notification', { type: 'SUCCESS' }));
        }
      });
    }).observe(raiz, { subtree: true, attributes: true, attributeFilter: ['class'], attributeOldValue: true });
  }

  // ── Voltar do Android ──
  function irPara(caminho, trocar) {
    if (trocar) history.replaceState(null, '', caminho);
    else history.pushState(null, '', caminho);
    window.scrollTo(0, 0);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }

  function telaInicial() { return /^\/(en|es)?\/?$/.test(location.pathname); }
  function inicioDoIdioma() { var m = /^\/(en|es)\b/.exec(location.pathname); return m ? '/' + m[1] : '/'; }

  // A máquina girando tem o "pular" aceso. Parada, os times ficam na mesma tela e o Voltar sai dela como de qualquer outra.
  function cerimoniaRodando() { return !!document.querySelector('[data-pagina="cerimonia"] .saltar.on'); }

  semErro(Promise.resolve(cap.addListener('App', 'backButton', function (evento) {
    // A folha fecha com Esc (componentes/Folha.jsx). O campo aberto de renomear também.
    var ativo = document.activeElement;
    if (document.querySelector('[role="dialog"]') || (ativo && /^(INPUT|TEXTAREA)$/.test(ativo.tagName) && !telaInicial())) {
      (ativo && ativo !== document.body ? ativo : document).dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      return;
    }
    if (cerimoniaRodando()) return;
    if (!telaInicial()) {
      if (evento && evento.canGoBack) history.back();
      else irPara(inicioDoIdioma(), true);
      return;
    }
    semErro(nativo('App', 'exitApp'));
  })));

  // ── Links /s/ que abrem no app ──
  function abrirLink(endereco) {
    try {
      var caminho = new URL(endereco).pathname;
      if (/^\/s\/[A-Za-z0-9]{1,12}\/?$/.test(caminho) && caminho !== location.pathname) irPara(caminho);
    } catch (_) { /* endereço que não é link do sorteio */ }
  }
  semErro(Promise.resolve(cap.addListener('App', 'appUrlOpen', function (evento) { if (evento && evento.url) abrirLink(evento.url); })));
  semErro(nativo('App', 'getLaunchUrl').then(function (r) { if (r && r.url) abrirLink(r.url); }));

  // ── Aviso de sem internet e abertura ──
  function vigiarAviso(raiz) {
    new MutationObserver(function () {
      if (!linkFalhouSemRede) return;
      var aviso = raiz.querySelector('[data-toast]');
      if (!aviso) return;
      linkFalhouSemRede = false;
      var idioma = String(document.documentElement.lang || 'pt').slice(0, 2);
      aviso.textContent = AVISO_SEM_INTERNET[idioma] || AVISO_SEM_INTERNET.pt;
    }).observe(raiz, { subtree: true, childList: true });
  }

  var abriu = false;
  function abrir() {
    if (abriu) return;
    abriu = true;
    // Dois quadros: o primeiro agenda a pintura, o segundo garante que ela aconteceu antes de a tela de abertura sair.
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        semErro(nativo('SplashScreen', 'hide', { fadeOutDuration: 200 }));
        // Sem esta chamada o Capgo acha que a versão travou e desfaz a atualização.
        semErro(nativo('CapacitorUpdater', 'notifyAppReady'));
      });
    });
  }

  function comecar() {
    var raiz = document.getElementById('root');
    vigiarCerimonia(raiz);
    vigiarAviso(raiz);
    var pintou = function () { return raiz.firstElementChild && !raiz.querySelector('.abertura'); };
    if (pintou()) { abrir(); return; }
    var vigia = new MutationObserver(function () { if (pintou()) { vigia.disconnect(); abrir(); } });
    vigia.observe(raiz, { childList: true });
    // O site travou antes de pintar: a tela de abertura sai mesmo assim, para o erro não virar um F eterno.
    setTimeout(abrir, 6000);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', comecar);
  else comecar();
})();
