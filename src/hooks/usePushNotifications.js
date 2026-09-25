// Futty v2.0 — Hook de notificações push (Web Push API).
// estado: 'idle' | 'nao_suportado' | 'suportado' | 'subscrito' | 'negado'
import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { apiFetch } from '../lib/api';
import { sincronizarSubscricao, urlBase64ParaBytes } from '../lib/chavePush';
import { quandoParado } from '../lib/ritmo';

// Estado inicial derivado do browser (sem useEffect → evita set-state-in-effect).
function estadoInicial() {
  if (typeof window === 'undefined') return 'idle';
  // 14-set (Android): Web Push não existe dentro do WebView do Capacitor — o banner
  // "Ativar notificações" (Inicio.jsx) e o toggle (MeuPerfil.jsx) já escondem sozinhos
  // com 'nao_suportado', então basta a origem do estado saber que está no nativo.
  // Entra depois via FCM (@capacitor/push-notifications), quando existir.
  if (Capacitor.isNativePlatform()) return 'nao_suportado';
  if (!('Notification' in window) || !('serviceWorker' in navigator)) return 'nao_suportado';
  if (Notification.permission === 'granted') return 'subscrito';
  if (Notification.permission === 'denied') return 'negado';
  return 'suportado';
}

// COFRE 25-set — o par VAPID do motor foi trocado, e uma subscrição de push nasce amarrada à chave com que foi
// feita: as antigas passam a ser recusadas (403) sem a pessoa ver nada. Uma vez por abertura do app, quem já
// autorizou as notificações e tem subscrição confere a chave que o motor serve hoje e, se mudou, se inscreve de novo
// — em silêncio: a permissão já foi concedida, então nem pergunta nada nem mostra aviso. Ver lib/chavePush.js.
// Corre com o aparelho PARADO (lib/ritmo: 1ª pintura feita + 3 s sem toque, no máximo 15 s): são dois pedidos e uma
// ida ao push service que não podem competir com o /api/inicio nem com o primeiro toque da pessoa.
// Falhou (sem rede, push service fora)? Tenta de novo da próxima vez que uma tela que usa o hook montar.
let jaSincronizou = false;

async function sincronizarChaveVapid() {
  if (jaSincronizou) return;
  jaSincronizou = true;
  try {
    if (estadoInicial() !== 'subscrito') return; // sem permissão (ou sem suporte / no nativo): nada a refazer
    const reg = await navigator.serviceWorker.ready;
    await sincronizarSubscricao({
      subscricaoAtual: () => reg.pushManager.getSubscription(),
      chaveDoMotor: async () => (await apiFetch('/api/push/vapid-public-key', { segundoPlano: true }))?.publicKey || null,
      inscrever: (chave) => reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: chave }),
      avisarMotor: (sub) => apiFetch('/api/push/subscribe', { method: 'POST', body: JSON.stringify(sub), segundoPlano: true }),
    });
  } catch {
    jaSincronizou = false;
  }
}

export function usePushNotifications() {
  const [estado, setEstado] = useState(estadoInicial);

  useEffect(() => quandoParado(sincronizarChaveVapid, { esperaMaximaMs: 15000 }), []);

  async function subscrever() {
    try {
      const { publicKey } = await apiFetch('/api/push/vapid-public-key');
      if (!publicKey) return false;
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ParaBytes(publicKey),
      });
      await apiFetch('/api/push/subscribe', { method: 'POST', body: JSON.stringify(sub) });
      setEstado('subscrito');
      return true;
    } catch {
      // Permissão negada pelo utilizador ou falha de rede.
      if (typeof Notification !== 'undefined' && Notification.permission === 'denied') setEstado('negado');
      return false;
    }
  }

  async function dessubscrever() {
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await apiFetch('/api/push/subscribe', { method: 'DELETE', body: JSON.stringify({ endpoint: sub.endpoint }) });
        await sub.unsubscribe();
      }
      setEstado('suportado');
      return true;
    } catch {
      return false;
    }
  }

  return { estado, subscrever, dessubscrever };
}
