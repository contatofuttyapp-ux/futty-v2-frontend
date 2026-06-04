// Futty v2.0 — Helpers de transformação do sorteio para a UI.
import { urlAsset, corDoTime } from './avatar.js';

// Transforma o objeto jogo (resposta da API) no formato que a slot machine espera.
// Esta é a ÚNICA função que lê times_resultado — nenhum outro componente deve
// ler times_resultado diretamente.
export function jogoParaSorteioSlot(jogo) {
  const tr = jogo?.times_resultado;
  return {
    // Lista de times com jogadores (garante cor_time por índice)
    times: Array.isArray(tr?.times)
      ? tr.times.map((t, i) => ({ ...t, cor_time: t.cor_time || corDoTime(i) }))
      : [],
    // Lista de reservas
    reservas: Array.isArray(tr?.reservas) ? tr.reservas : [],
    // Nome do grupo de reservas
    nome_grupo_reservas: String(tr?.nome_grupo_reservas ?? '').trim() || 'RESERVAS',
  };
}

// Formata a data/hora do jogo para exibição.
// V2 guarda um timestamp único em `data`; V1 usava `date`/`data_jogo` + `time`/`hora`.
export function formatarDataJogo(jogo) {
  const d = new Date(jogo?.date || jogo?.data_jogo || jogo?.data);
  if (Number.isNaN(d.getTime())) return '';
  const data = d.toLocaleDateString('pt-PT', { weekday: 'short', day: 'numeric', month: 'short' });
  // Hora: dos campos V1 se existirem, senão da própria timestamp.
  const horaV1 = String(jogo?.time || jogo?.hora || '').trim();
  const hora = horaV1 || d.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
  return hora ? `${data} · ${hora}` : data;
}

// Conta o total de jogadores num resultado de sorteio (times + reservas).
export function contarJogadoresSorteio(sorteio) {
  const times = Array.isArray(sorteio?.times) ? sorteio.times : [];
  let total = times.reduce((acc, t) => acc + (Array.isArray(t?.jogadores) ? t.jogadores.length : 0), 0);
  total += Array.isArray(sorteio?.reservas) ? sorteio.reservas.length : 0;
  return total;
}

export { urlAsset };
