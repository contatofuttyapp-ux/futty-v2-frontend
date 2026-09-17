// Futty v2.0 — Fonte única dos limites de avatares IA por plano.
// manter igual ao backend (routes/auth.js → LIMITES_IA)
// 17-set: 50/100 vinham de quando se acreditava que a figurinha custava US$0,015.
// O custo REAL medido na fal é US$0,112 — 50 gerações no Pro davam US$5,60 de
// custo contra R$9,90 de receita. Novos: Pro ~US$1,12, Elite ~US$2,24 por mês.
export const LIMITES_IA = { free: 2, pro: 10, elite: 20 };
