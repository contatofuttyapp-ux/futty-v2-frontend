// Futty v2.0 — O que as abas do admin dividem e não é componente: as opções de visibilidade do time, o estilo do cartão e as contas de tempo.

import { Lock, LockOpen, Globe } from 'lucide-react';

// Opções de visibilidade. O escudo é UM controle (EditorEscudo): não há "cor de fundo do avatar".
const VIS_OPCOES = [
  { k: 'privado', icon: Lock, label: 'Privado' },
  { k: 'publico_aprovacao', icon: LockOpen, label: 'Com aprovação' },
  { k: 'publico_aberto', icon: Globe, label: 'Aberto' },
];
// Textos de entrada aprovados pelo dono, os mesmos do Criar time; o nome do Explorar é "Radar de peladas".
const VIS_DESC = {
  privado: 'Só entra quem receber o seu link de convite. Não aparece no "Radar de peladas".',
  publico_aprovacao: 'Quem achar o time no "Radar de peladas" pede para entrar. Você aceita ou não.',
  publico_aberto: 'Qualquer um que achar o time no "Radar de peladas" entra na hora.',
};

const CARD = { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.10)', borderRadius: 12 };
// "há 5 h": tempo decorrido, não data de calendário — não tem fuso; vale o relógio de quem olha.
function haQuantoTempo(iso) {
  const ts = new Date(iso).getTime();
  if (!Number.isFinite(ts)) return '';
  const diff = Date.now() - ts;
  const min = Math.floor(diff / 60000);
  if (min < 60) return `há ${Math.max(1, min)} min`;
  const h = Math.floor(diff / 3600000);
  if (h < 48) return `há ${h} h`;
  return `há ${Math.floor(diff / 86400000)} dias`;
}
function diasAte(iso) {
  const ms = new Date(iso).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / 86400000));
}

export { CARD, VIS_DESC, VIS_OPCOES, diasAte, haQuantoTempo };
