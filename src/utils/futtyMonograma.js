// Futty v2.0 — Geometria do monograma F, fonte única.
// Vem de public/favicon.svg (lá é um <polygon>; aqui vai como <path> para poder levar
// pathLength). Usado pelo FuttyLoader (que o pinta com uma escova) e pelo FuttyLockup
// da landing (que o preenche com o gradiente metálico). Duplicar isto seria pedir para
// os dois divergirem à primeira alteração do logo.

// Contorno do F — o letterform completo.
export const F_CONTORNO =
  'M392.28 576.53 L648.8 576.5 L659.27 541.52 L398.39 541.46 L472.99 285.11 L828.3 195.25 ' +
  'L839.06 152.39 L440.51 257.5 L210.76 1049.58 L110.36 1049.52 L360.67 177.16 L983.79 16.94 ' +
  'L913.11 270.83 L548.68 369.73 L532.74 441.62 L798.55 441.67 L732.82 676.38 L462.77 676.38 ' +
  'L354.76 1049.56 L249.78 1049.53 Z';

// Espinha do F: extremidade inferior esquerda → haste → barra de topo (gancho) →
// barra do meio (gancho) → extremidade inferior direita. Só o FuttyLoader a usa.
export const F_ESQUELETO =
  'M141.16 1116.85 L400.59 217.33 L911.43 84.67 L870.71 233.04 L510.84 327.42 ' +
  'L465.57 491.54 L728.91 491.60 L690.81 626.44 L427.53 626.46 L282.40 1116.65';
