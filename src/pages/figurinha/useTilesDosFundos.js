// Futty v2.0 — Figurinha: os tiles do Épico, do Golden e do Royal são o render REAL do fundo em miniatura (uma vez por montagem).
import { useEffect, useState } from 'react';
import { desenharFundoEpico, desenharFundoGolden, desenharFundoRoyal } from '../../utils/figurinhaCanvas';

export function useTilesDosFundos() {
  // Tile do Épico = render REAL do fundo em miniatura (não uma imitação CSS/SVG).
  const [epicoTile, setEpicoTile] = useState(null);

  const [goldenTile, setGoldenTile] = useState(null); // render real do fundo Golden p/ o tile

  const [royalTile, setRoyalTile] = useState(null); // render real do fundo Royal p/ o tile

  // Render ÚNICO do tile do Épico (deps [] → uma vez por montagem). 120px = ~2× o
  // tamanho do tile, para ficar nítido em retina. dataURL → usado como background.
  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        const cv = document.createElement('canvas');
        cv.width = 120;
        cv.height = 120;
        // Intensidade 3.0: a 120×120 as arestas a alpha do card (0.065) desapareciam. Mesma geometria, alpha
        // subido só para a miniatura se ler.
        await desenharFundoEpico(cv.getContext('2d'), 120, 120, { intensidade: 3.0 });
        if (vivo) setEpicoTile(cv.toDataURL('image/png'));
      } catch { /* fallback: fica o gradiente base do FUNDO_BG */ }
    })();
    return () => { vivo = false; };
  }, []);

  // Render ÚNICO do tile do Golden (chapa foil + glints no pico), como o Épico.
  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        const cv = document.createElement('canvas');
        cv.width = 120;
        cv.height = 120;
        // 'vitrine': montra a propósito (ordem do dono) — mais rica que o card real.
        await desenharFundoGolden(cv.getContext('2d'), 120, 120, { glints: 'vitrine' });
        if (vivo) setGoldenTile(cv.toDataURL('image/png'));
      } catch { /* fallback: fica o gradiente foil do FUNDO_BG */ }
    })();
    return () => { vivo = false; };
  }, []);

  // Render ÚNICO do tile do Royal (chapa roxa + glints no pico), MESMO pipeline do Golden.
  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        const cv = document.createElement('canvas');
        cv.width = 120;
        cv.height = 120;
        // 'vitrine': montra a propósito (ordem do dono) — mais rica que o card real.
        await desenharFundoRoyal(cv.getContext('2d'), 120, 120, { glints: 'vitrine' });
        if (vivo) setRoyalTile(cv.toDataURL('image/png'));
      } catch { /* fallback: fica o gradiente foil do FUNDO_BG */ }
    })();
    return () => { vivo = false; };
  }, []);

  return { epicoTile, goldenTile, royalTile };
}
