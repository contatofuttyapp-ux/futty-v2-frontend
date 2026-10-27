// Futty v2.0 — O relógio da contagem regressiva do sorteio: anda de 30 em 30 s enquanto a tela está aberta (e só se há contagem a mostrar).
// Quando a hora do sorteio passa com a tela aberta, a lista fecha ali também, sem esperar a próxima leitura do motor.
import { useEffect, useState } from 'react';

export function useAgora(ligado) {
  const [agora, setAgora] = useState(() => Date.now());
  useEffect(() => {
    if (!ligado) return undefined;
    const id = setInterval(() => setAgora(Date.now()), 30000);
    return () => clearInterval(id);
  }, [ligado]);
  return agora;
}
