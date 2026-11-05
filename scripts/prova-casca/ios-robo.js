// Só no dist da prova do simulador (empacotar-sorteio.mjs --robo). O simulador não tem DevTools por linha de comando, então a página
// pergunta ao maestro (ios-maestro.mjs, na mesma máquina) o que fazer e devolve o resultado, pelo HTTP nativo do Capacitor.
(function () {
  var cap = window.Capacitor;
  if (!cap || !cap.nativePromise) return;
  var MAESTRO = 'http://localhost:8799';
  var Assincrona = Object.getPrototypeOf(async function () {}).constructor;

  // O Mac do CI não tem GPU: com as luzes da moldura acesas no fim da cerimônia, o simulador inteiro para de responder, foto incluída.
  // Só as decorativas, as mesmas que o site apaga no movimento reduzido, e tudo o que anima depois do fim. Quem liga é o maestro.
  var SEM_LUZES = '.vida,.letreiro,.luzes-maq__fase,.sortear-wrap::before,.sortear__traco,.sortear__pulso,.sortear__bola,.sortear__janela,.sortear__copia,.sortear__reflexo,.botao-imagem::after,.vida__luz,.faisca,.jogadores--vivos .cj__camisa,.jogadores--vivos .cj__brilho::after,.smaq .luz,.smaq .mq,.smaq .lampadas i,.smaq .luzes .fase,.smaq .baseluz .fase,.smaq .lampadas .fase,.smaq.acabou *,.smaq.acabou *::before,.smaq.acabou *::after{animation:none!important}.faisca{display:none!important}';
  window.__semLuzes = function () {
    var estilo = document.createElement('style');
    estilo.textContent = SEM_LUZES;
    document.head.appendChild(estilo);
  };
  try { if (localStorage.getItem('futty_prova_sem_luzes')) window.__semLuzes(); } catch (_) { /* sem storage */ }

  function pedir(metodo, caminho, corpo) {
    return cap.nativePromise('CapacitorHttp', 'request', {
      url: MAESTRO + caminho,
      method: metodo,
      headers: { 'content-type': 'application/json' },
      data: corpo ? JSON.stringify(corpo) : undefined,
      dataType: corpo ? 'text' : undefined,
      responseType: 'json',
      connectTimeout: 5000,
      readTimeout: 5000,
    });
  }

  async function laco() {
    for (;;) {
      try {
        var r = await pedir('GET', '/robo/comando');
        var c = r.data;
        if (c && c.id) {
          var saida;
          try { saida = { ok: true, valor: await new Assincrona(c.codigo)() }; } catch (e) { saida = { ok: false, erro: String(e) }; }
          await pedir('POST', '/robo/resposta', Object.assign({ id: c.id }, saida));
          continue;
        }
      } catch (_) { /* maestro ainda subindo */ }
      await new Promise(function (res) { setTimeout(res, 200); });
    }
  }
  laco();
})();
