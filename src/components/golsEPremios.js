// Futty v2.0 — Rodada 29O: os títulos, as frases e as regras de "Gols de cada um" e dos prêmios do dia. Uma fonte só: o passo 2 do
// Criar time e os Ajustes do time leem daqui, para dizerem a mesma coisa e funcionarem igual.
export const GOLS = { titulo: 'Gols de cada um', apoio: 'Registra quantos gols cada jogador marcou.' };
export const ARTILHEIRO = { titulo: 'Artilheiro do dia', apoio: 'Quem fez mais gols no jogo ganha o troféu.' };
export const DESTAQUE = { titulo: 'Destaque do dia', apoio: 'O jogador que fez a diferença em campo, escolhido por você.' };

// Desligar os gols leva o artilheiro junto (o troféu faz parte dos gols). Ligar os gols não liga o artilheiro de volta.
export function alternarGols(artilheiro, ligar) {
  return { mostrarGols: ligar, mostrarArtilheiro: ligar ? artilheiro : false };
}

// Ligar o artilheiro liga os gols junto. Desligá-lo não mexe nos gols.
export function alternarArtilheiro(gols, ligar) {
  return { mostrarGols: ligar ? true : gols, mostrarArtilheiro: ligar };
}
