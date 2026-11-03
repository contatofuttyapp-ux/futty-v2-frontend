// O DevTools do WebView do app, direto pelo socket. O connectOverCDP do Playwright recusa o WebView (não há gestão de contextos nele)
// e o _android dele trava à espera do socket quando o emulador está lento; aqui cada espera tem prazo.
import { execFileSync } from 'node:child_process';

const espera = (ms) => new Promise((r) => setTimeout(r, ms));
const PORTA = 9333;

export async function conectar(pacote, pedidos, prazo = 60000) {
  const limite = Date.now() + prazo;
  let alvo = null;
  while (!alvo && Date.now() < limite) {
    // O pidof sai com erro enquanto o processo do app ainda não subiu.
    let pid = '';
    try { pid = execFileSync('adb', ['shell', 'pidof', pacote], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim().split(/\s+/)[0]; } catch { /* ainda não */ }
    if (pid) {
      try {
        execFileSync('adb', ['forward', `tcp:${PORTA}`, `localabstract:webview_devtools_remote_${pid}`]);
        const lista = await (await fetch(`http://127.0.0.1:${PORTA}/json/list`, { signal: AbortSignal.timeout(3000) })).json();
        alvo = lista.find((t) => t.type === 'page');
      } catch { /* o WebView ainda não abriu o socket */ }
    }
    if (!alvo) await espera(500);
  }
  if (!alvo) throw new Error(`o WebView de ${pacote} não apareceu em ${prazo} ms`);

  const ws = new WebSocket(alvo.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = () => rej(new Error('websocket do WebView')); });
  let proximo = 0;
  const pendentes = new Map();
  ws.onmessage = (m) => {
    const d = JSON.parse(m.data);
    if (d.id && pendentes.has(d.id)) {
      const { resolve, reject } = pendentes.get(d.id);
      pendentes.delete(d.id);
      if (d.error) reject(new Error(d.error.message)); else resolve(d.result);
    } else if (d.method === 'Network.requestWillBeSent') {
      pedidos.push({ url: d.params.request.url, metodo: d.params.request.method });
    }
  };
  const cdp = (method, params = {}) => new Promise((resolve, reject) => {
    proximo += 1;
    const id = proximo;
    pendentes.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
    setTimeout(() => { if (pendentes.delete(id)) reject(new Error(`${method}: sem resposta`)); }, 30000);
  });
  await cdp('Network.enable');
  await cdp('Runtime.enable');

  const page = {
    async evaluate(f, arg) {
      const expression = typeof f === 'string' ? f : `(${f})(${arg === undefined ? '' : JSON.stringify(arg)})`;
      const r = await cdp('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
      if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
      return r.result.value;
    },
    async waitForFunction(f, arg, ms = 30000) {
      const fim = Date.now() + ms;
      for (;;) {
        const v = await page.evaluate(f, arg).catch(() => false);
        if (v) return v;
        if (Date.now() > fim) throw new Error(`prazo de ${ms} ms: ${String(f).slice(0, 80)}`);
        await espera(150);
      }
    },
    waitForSelector(sel, ms = 30000) {
      return page.waitForFunction((s) => { const n = document.querySelector(s); return !!n && n.getClientRects().length > 0; }, sel, ms);
    },
    // Toque de verdade para o navegador: é o que destrava o som e conta como gesto da pessoa.
    async click(sel, ms = 30000) {
      await page.waitForSelector(sel, ms);
      const c = await page.evaluate((s) => {
        const n = document.querySelector(s);
        n.scrollIntoView({ block: 'center' });
        const r = n.getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      }, sel);
      await espera(120);
      const base = { x: c.x, y: c.y, button: 'left', clickCount: 1 };
      await cdp('Input.dispatchMouseEvent', { type: 'mousePressed', ...base });
      await cdp('Input.dispatchMouseEvent', { type: 'mouseReleased', ...base });
    },
    // Como o site recebe uma colagem: o valor muda e sai o evento de input que o React escuta.
    fill(sel, valor) {
      return page.evaluate(([s, v]) => {
        const n = document.querySelector(s);
        n.focus();
        Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(n, v);
        n.dispatchEvent(new Event('input', { bubbles: true }));
      }, [sel, valor]);
    },
    fechar() { ws.close(); },
  };
  return page;
}
