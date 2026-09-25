// Futty v2.0 — Onde o app está rodando. Único ponto que responde "é o app da loja?".
// No app da loja (iOS/Android) nenhuma tela mostra valor nem convida a pagar (Apple 3.1.1 / Google Payments).
import { Capacitor } from '@capacitor/core';

/** true dentro do app da loja (iOS/Android); false no site. */
export function ehNativo() {
  return Capacitor.isNativePlatform();
}
