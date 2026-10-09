/* eslint-disable react-refresh/only-export-components -- página-bancada das provas no navegador, não faz parte do app */
// Bancada da prova dos selos do sorteio (scripts/provas/selo-do-sorteio.prova.mjs). `?caso=`:
//   ajustado  a CerimoniaSorteio de verdade girando o ORIGINAL, com o passo do ajuste no fim
//   sorteado  a CerimoniaSorteio de um sorteio que ninguém mexeu (selo ouro, "2º sorteio deste jogo")
//   mao       a ApresentacaoTimes dos times montados à mão (sem roleta)
//   cartao    os cartões compartilháveis (cartaz do ajustado, 9:16 do montado à mão) em window.__cartoes
//   lista     o DrawnTeams (tela do jogo e link público) nos três casos
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import CerimoniaSorteio from '../../src/components/CerimoniaSorteio';
import DrawnTeams from '../../src/components/DrawnTeams';
import ApresentacaoTimes from '../../src/components/ApresentacaoTimes';
import { visaoDoSorteio } from '../../src/utils/seloDoSorteio';
import { gerarCartao916, gerarCartazEscalacao } from '../../src/utils/sorteioCartao';
import '../../src/index.css';
import '../../src/styles/app.css';

const jog = (id, nome) => ({ user_id: id, nome, avatar_url: null, rating: 3 });
const ORIGINAL = {
  times: [
    { nome: 'Time A', jogadores: [jog('a1', 'Magrão'), jog('a2', 'Gonçalo'), jog('a3', 'Tiago')] },
    { nome: 'Time B', jogadores: [jog('b1', 'Canhotinha'), jog('b2', 'Zé'), jog('b3', 'Roberto')] },
  ],
  reservas: [jog('r1', 'Rafa')],
};
const ajustado = {
  seed: 3303,
  num_times: 2,
  times: [
    { nome: 'Time A', jogadores: [jog('a1', 'Magrão'), jog('a3', 'Tiago'), jog('r1', 'Rafa')] },
    { nome: 'Time B', jogadores: [jog('b1', 'Canhotinha'), jog('b2', 'Zé'), jog('b3', 'Roberto'), jog('a2', 'Gonçalo')] },
  ],
  reservas: [],
  registro: { origem: 'sorteio', por: { nome: 'Chavo, el matador' }, sorteio_numero: 1, sorteios: 1, original: ORIGINAL, ajustes: [{ por: { nome: 'Chavo, el matador' } }] },
};
const sorteado = { seed: 77, num_times: 2, ...ORIGINAL, registro: { origem: 'sorteio', por: { nome: 'Chavo' }, sorteio_numero: 2, sorteios: 2, ajustes: [] } };
// Montado à mão de verdade não tem nota nenhuma (o motor não grava rating para quem foi ESCOLHIDO): nem
// rating_medio no time, nem rating em cada jogador — a mesma forma que POST /times-manuais grava.
const jogSemNota = (id, nome) => ({ user_id: id, nome, avatar_url: null });
const aMao = {
  manual: true,
  num_times: 2,
  times: [
    { nome: 'Time A', jogadores: [jogSemNota('a1', 'Magrão'), jogSemNota('a2', 'Gonçalo'), jogSemNota('a3', 'Tiago')] },
    { nome: 'Time B', jogadores: [jogSemNota('b1', 'Canhotinha'), jogSemNota('b2', 'Zé'), jogSemNota('b3', 'Roberto')] },
  ],
  reservas: [jogSemNota('r1', 'Rafa')],
  registro: { origem: 'manual', por: { nome: 'Chavo' }, sorteios: 0, ajustes: [] },
};

window.__terminou = 0;
if ((new URLSearchParams(window.location.search).get('caso')) === 'cartao') {
  const comoUrl = (blob) => new Promise((r) => { const f = new FileReader(); f.onload = () => r(f.result); f.readAsDataURL(blob); });
  (async () => {
    const va = visaoDoSorteio(ajustado);
    const cartaz = await gerarCartazEscalacao({ ...ajustado, ...va.final }, { equipa: 'Missa de Quinta', data: '8 out 2026', selo: va.selo, baixar: false });
    const vm = visaoDoSorteio(aMao);
    const { blob } = await gerarCartao916(aMao, 0, 'Missa de Quinta', { selo: vm.selo });
    window.__cartoes = { cartaz: cartaz.url, mao916: await comoUrl(blob) };
  })().catch((e) => { window.__cartoes = { erro: String(e) }; });
}
const caso = new URLSearchParams(window.location.search).get('caso') || 'ajustado';

function Cerimonia({ tr }) {
  const v = visaoDoSorteio(tr);
  return (
    <CerimoniaSorteio
      resultado={v.daRoleta}
      selo={v.selo}
      ajuste={v.ajuste}
      final={v.ajuste ? v.final : null}
      equipa="Missa de Quinta"
      data="8 out 2026"
      aoTerminar={() => { window.__terminou += 1; }}
      bannerInterno={false}
    />
  );
}

createRoot(document.getElementById('raiz')).render(
  <BrowserRouter>
    <div style={{ maxWidth: 480, margin: '0 auto' }}>
      {caso === 'cartao' ? (
        <div data-gerando-cartoes />
      ) : caso === 'mao' ? (
        <div style={{ padding: 16 }}><ApresentacaoTimes resultado={aMao} selo={visaoDoSorteio(aMao).selo} equipa="Missa de Quinta" data="8 out 2026" aoSair={() => { window.__saiu = true; }} /></div>
      ) : caso === 'lista' ? (
        <div style={{ padding: 16, display: 'grid', gap: 28 }}>
          <div data-lista="sorteado"><DrawnTeams resultado={sorteado} /></div>
          <div data-lista="ajustado"><DrawnTeams resultado={ajustado} /></div>
          <div data-lista="manual"><DrawnTeams resultado={aMao} /></div>
        </div>
      ) : <Cerimonia tr={caso === 'sorteado' ? sorteado : ajustado} />}
    </div>
  </BrowserRouter>,
);
