// Futty v2.0 — Pódio do campeonato (Vaga 11C). Puro (sem React) para ser
// partilhado pela vista (CampeonatoVistas) e pelo cartão 9:16 (campeonatoCartao).
// pontos: top-3 da tabela final. mata: campeão / vice (perdedor da final) /
// semifinalistas eliminados (3º partilhado quando há 2 semis).
export function podioDe(campeonato) {
  if (campeonato.formato === 'pontos') {
    const cl = campeonato.classificacao || [];
    return [
      { pos: 1, cor: '#d4a017', times: cl[0] ? [cl[0]] : [] },
      { pos: 2, cor: '#aab4c8', times: cl[1] ? [cl[1]] : [] },
      { pos: 3, cor: '#c2652e', times: cl[2] ? [cl[2]] : [] },
    ];
  }
  const tm = {};
  (campeonato.times || []).forEach((t) => { tm[t.id] = t; });
  const confs = campeonato.confrontos || [];
  if (!confs.length) return [];
  const maxR = Math.max(...confs.map((c) => c.ronda));
  const final = confs.find((c) => c.ronda === maxR);
  const champ = campeonato.campeao;
  const viceId = final ? (final.time_a_id === champ?.id ? final.time_b_id : final.time_a_id) : null;
  const vice = viceId ? tm[viceId] : null;
  // 3º = UM SÓ: o semifinalista derrotado com melhor campanha no torneio
  // (SG; desempate GP; último critério determinístico pela ordem/seed dos times).
  const semis = confs.filter((c) => c.ronda === maxR - 1 && c.jogado && c.time_a_id && c.time_b_id);
  const perdedores = semis.map((c) => (c.vencedor_id === c.time_a_id ? c.time_b_id : c.time_a_id));
  const stat = {};
  const add = (id, gp, gc) => { if (!id) return; stat[id] = stat[id] || { gp: 0, gc: 0 }; stat[id].gp += gp; stat[id].gc += gc; };
  confs.forEach((c) => { if (c.jogado && c.placar_a != null && c.placar_b != null) { add(c.time_a_id, c.placar_a, c.placar_b); add(c.time_b_id, c.placar_b, c.placar_a); } });
  const idxOf = (id) => (campeonato.times || []).findIndex((t) => t.id === id);
  const sg = (id) => { const s = stat[id] || { gp: 0, gc: 0 }; return s.gp - s.gc; };
  const gp = (id) => (stat[id] || { gp: 0 }).gp;
  const melhor = perdedores.slice().sort((x, y) => (sg(y) - sg(x)) || (gp(y) - gp(x)) || (idxOf(x) - idxOf(y)))[0];
  const terceiro = melhor ? tm[melhor] : null;
  return [
    { pos: 1, cor: '#d4a017', times: champ ? [champ] : [] },
    { pos: 2, cor: '#aab4c8', times: vice ? [vice] : [] },
    { pos: 3, cor: '#c2652e', times: terceiro ? [terceiro] : [] },
  ];
}
