// Prova no navegador da Rodada 29U (acabamentos depois do publica de 4-out): a linha "Bairro · Cidade" do Radar fica inteira no card, em 2 linhas
// quando não cabe, com o "Pedido enviado ✓" ao lado, em 360 e 390 px, sem rolagem lateral. O texto do Ranking e o assetlinks.json são de unidade
// (scripts/unidade/rodada-29u.test.mjs). Usa o mesmo abrir da 29T-B: a sessão é de mentira e nada sai para a rede.
import { abrir } from './rodada-29t-b.prova.mjs';

export const nome = 'Rodada 29U (a linha do lugar no Radar quebra em vez de cortar, com "Pedido enviado ✓" no card)';

const LUGAR = 'Núcleo Bandeirante · Brasília, DF';
const DESTINO = process.env.FUTTY_PROVA_PRINTS;

export async function rodar({ navegador, base, t }) {
  const so = process.env.FUTTY_PROVA_PARTE || '';
  if (so && so !== 'radar-linha') return;
  const explorar = [
    { id: 'E5', slug: 'pelada-do-bandeirante', nome: 'Pelada do Bandeirante', cidade: 'Brasília, DF', bairro: 'Núcleo Bandeirante', descricao: 'Sábado à tarde, no Núcleo Bandeirante.', membro_count: 15, modo_visibilidade: 'publico_aprovacao', ja_membro: false, pedido_pendente: true },
  ];
  for (const largura of [360, 390]) {
    const { ctx, page, erros } = await abrir(navegador, base, { caminho: '/explorar', explorar, largura });
    const card = page.locator('[data-card-do-time="pelada-do-bandeirante"]');
    const linha = card.locator('[data-local-do-time]');
    await linha.waitFor({ timeout: 25000 });
    await page.waitForTimeout(400);
    const medida = await linha.evaluate((el) => ({
      texto: el.innerText.replace(/\s+/g, ' ').trim(),
      cortado: el.scrollWidth > el.clientWidth + 1,
      linhas: new Set([...(() => { const r = document.createRange(); r.selectNodeContents(el); return r.getClientRects(); })()].map((q) => Math.round(q.top))).size,
    }));
    t(`${largura} px: "${LUGAR}" aparece inteiro, sem corte`, medida.texto === LUGAR && !medida.cortado, JSON.stringify(medida));
    t(`${largura} px: o lugar quebra em ${medida.linhas} linha(s) ao lado do botão`, medida.linhas >= (largura === 360 ? 2 : 1), JSON.stringify(medida));
    t(`${largura} px: "Pedido enviado ✓" continua no card, junto do lugar`, (await card.getByText('Pedido enviado ✓').count()) === 1);
    t(`${largura} px: a página não ganha rolagem lateral`, await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
    if (DESTINO) await page.screenshot({ path: `${DESTINO}/radar-linha-${largura}.png` });
    t(`${largura} px: o Radar roda sem exceção`, erros.length === 0, erros.slice(0, 2).join(' | '));
    await ctx.close();
  }
}
