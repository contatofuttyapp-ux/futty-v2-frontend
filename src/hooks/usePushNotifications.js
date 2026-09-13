// Futty v2.0 — Hook de notificações push (Web Push API).
// estado: 'idle' | 'nao_suportado' | 'suportado' | 'subscrito' | 'negado'
import { useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { apiFetch } from '../lib/api';

// A chave VAPID vem em base64url; pushManager.subscribe exige um Uint8Array.
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) arr[i] = raw.charCodeAt(i);
  return arr;
}

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

export function usePushNotifications() {
  const [estado, setEstado] = useState(estadoInicial);

  async function subscrever() {
    try {
      const { publicKey } = await apiFetch('/api/push/vapid-public-key');
      if (!publicKey) return false;
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
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
