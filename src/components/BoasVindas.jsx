// Futty v2.0 — Rodada 29C: as boas-vindas para todo mundo — UMA página, as duas máquinas da prova aprovada pelo dono
// (FUT/DESIGN/prova-boas-vindas-v2.html): a DEITADA (A), para time sem logo, com o nome como letreiro na janela; e a
// QUADRADA (B), com dois anéis contínuos de lâmpadas, para logo do time, foto da pessoa ou o F real. Três variantes na
// mesma tela: `convidado` (1ª vez no time depois de aceitar o convite), `criador` ("Ir para o time" no fim do Criar time)
// e `semTime` (1ª vez no Início com 0 times, uma vez por aparelho). Lâmpadas de CSS, 0 KB de mídia, sem som (não há
// gesto); prefers-reduced-motion: tudo parado e sem "tchan". Quem mostra e quem marca "visto" é a página (Equipa/Inicio).
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { apiFetch } from '../lib/api';
import { urlAsset, urlImagem } from '../utils/avatar';
import { anelDeLuzes, reguaDeLuzes } from '../utils/luzesSlot';
import '../styles/boas-vindas.css';

const FRASES = {
  convidado: 'Aqui a gente confirma presença, sorteia os times, guarda o ranking e faz sua figurinha.',
  criador: 'Seu time está no ar. Chame a galera pelo link, confirme presença, sorteie e faça a figurinha de cada um.',
  semTime: 'Bem-vindo ao Futty. Aqui a gente confirma presença, sorteia os times, guarda o ranking e faz sua figurinha.',
};

// O F real (lei da casa: nunca gerado por IA). public/email não sai do pacote nativo (preparar-nativo.js), por isso o
// caminho relativo serve na web e no app.
const F_REAL = '/email/icone-app-144.png';

// Geometria da prova: deitada com réguas de 22 (em cima) e 24 (na base); quadrada de 248 px com anéis em 8 e 19 px, passo 11.
const LADO = 248;
const PASSO = 11;
const REGUAS = (() => {
  let i = 0;
  const regua = (n) => { const fila = reguaDeLuzes({ n, inicio: i }); i += n; return fila; };
  return { cima: regua(22), cimaRoxa: regua(22), base: regua(24), baseRoxa: regua(24) };
})();
const ANEIS = { dourado: anelDeLuzes({ lado: LADO, inset: 8, passo: PASSO }), roxo: anelDeLuzes({ lado: LADO, inset: 19, passo: PASSO }) };

// Tempos do "tchan" (prova): 0,6 s depois de abrir e a cada 7 s, .premio por 1,6 s.
const TCHAN_PRIMEIRO_MS = 600;
const TCHAN_CADA_MS = 7000;
const TCHAN_DURA_MS = 1600;

function movimentoReduzido() {
  return typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

function useTchan() {
  const [premio, setPremio] = useState(false);
  useEffect(() => {
    if (movimentoReduzido()) return undefined;
    let fim = null;
    const tchan = () => {
      setPremio(true);
      clearTimeout(fim);
      fim = setTimeout(() => setPremio(false), TCHAN_DURA_MS);
    };
    const primeiro = setTimeout(tchan, TCHAN_PRIMEIRO_MS);
    const cada = setInterval(tchan, TCHAN_CADA_MS);
    return () => { clearTimeout(primeiro); clearInterval(cada); clearTimeout(fim); };
  }, []);
  return premio;
}

// O letreiro encolhe de `maximo` até caber numa linha (mínimo `minimo`), como o nome na figurinha: nunca corta. Se nem
// no mínimo couber, deixa quebrar a linha (.quebra). Mede antes da 1ª pintura e de novo quando a Rajdhani chega.
function useLetreiro(nome, maximo, minimo) {
  const ref = useRef(null);
  const [quebra, setQuebra] = useState(false);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    let vivo = true;
    const ajustar = () => {
      if (!vivo) return;
      el.style.whiteSpace = 'nowrap';
      let fs = maximo;
      el.style.fontSize = `${fs}px`;
      while (el.scrollWidth > el.clientWidth && fs > minimo) { fs -= 1; el.style.fontSize = `${fs}px`; }
      const cabe = el.scrollWidth <= el.clientWidth;
      el.style.whiteSpace = '';
      setQuebra(!cabe);
    };
    ajustar();
    document.fonts?.ready?.then(ajustar);
    window.addEventListener('resize', ajustar);
    return () => { vivo = false; window.removeEventListener('resize', ajustar); };
  }, [nome, maximo, minimo]);
  return { ref, quebra };
}

function primeiroNome(user) {
  const nome = user?.nome_jogador || user?.nome || user?.email?.split('@')[0] || 'Jogador';
  return String(nome).trim().split(/\s+/)[0];
}

function Lampada({ luz }) {
  return <i className="luz" style={{ left: luz.x, top: luz.y, '--i': luz.i }} />;
}

/**
 * @param {object}  p
 * @param {'convidado'|'criador'|'semTime'} p.variante
 * @param {object}  [p.team]           o time ({ nome, logo_url }) — convidado e criador
 * @param {object}  [p.me]             o perfil ({ user: { nome, nome_jogador, avatar_url } }) — sem time
 * @param {string}  [p.slug]           para o PATCH de posição (convidado)
 * @param {boolean} [p.goleiroInicial] como a pessoa já está no time (padrão: linha)
 * @param {(r: { mudou?: boolean, erro?: string|null, destino?: string }) => void} p.onClose
 *        convidado/criador: no "Vamos lá"; sem time: com o `destino` do botão tocado
 */
export default function BoasVindas({ variante, team = null, me = null, slug = '', goleiroInicial = false, onClose }) {
  const [goleiro, setGoleiro] = useState(!!goleiroInicial);
  const [ocupado, setOcupado] = useState(false);
  const premio = useTchan();

  const semTime = variante === 'semTime';
  const user = me?.user;
  const nome = semTime ? primeiroNome(user) : team?.nome || '';
  // A foto é a miniatura de sempre (quadrado do topo + o enquadro guardado); o logo nunca é cortado ao quadrado (utils/avatar.js).
  const foto = semTime && user?.avatar_url ? urlImagem(urlAsset(user.avatar_url), 256, { quadrado: true }) : null;
  const logo = !semTime && team?.logo_url ? urlImagem(urlAsset(team.logo_url), 256) : null;
  const imagem = semTime ? { src: foto || F_REAL, foto: !!foto } : logo ? { src: logo, foto: false } : null;
  const quadrada = !!imagem;
  const { ref: refNome, quebra } = useLetreiro(nome, quadrada ? 30 : 34, quadrada ? 18 : 20);

  async function vamosLa() {
    if (ocupado) return;
    setOcupado(true);
    let erro = null;
    const mudou = variante === 'convidado' && goleiro !== !!goleiroInicial;
    if (mudou) {
      try {
        await apiFetch(`/api/equipas/${slug}/membros/posicao`, { method: 'PATCH', body: JSON.stringify({ goleiro }) });
      } catch (e) {
        erro = e?.message || 'Não deu para salvar agora. Dá para mudar no card do time.';
      }
    }
    onClose({ mudou: mudou && !erro, erro });
  }

  const letreiro = (classe) => (
    <h2 id="bv-nome" ref={refNome} className={`letreiro ${classe}${quebra ? ' quebra' : ''}`}>{nome}</h2>
  );

  // Portal para o body: `fixed` dentro do [data-page] animado ancora na página, não na tela (nota em LoadingFutty.jsx).
  return createPortal(
    <div className="modal-overlay" role="presentation">
      <div className="bv" role="dialog" aria-modal="true" aria-labelledby="bv-nome" data-variante={variante}>
        {quadrada ? (
          <>
            <div className={`maq quadrada${premio ? ' premio' : ''}`} aria-hidden="true">
              <div className="anel dourado">{ANEIS.dourado.map((l) => <Lampada key={l.i} luz={l} />)}</div>
              <div className="anel roxo">{ANEIS.roxo.map((l) => <Lampada key={l.i} luz={l} />)}</div>
              <div className="janela">
                <div className="logo-wrap">
                  <span className="aura">
                    <img src={imagem.src} alt="" className={imagem.foto ? 'foto' : undefined} decoding="async" />
                  </span>
                </div>
              </div>
            </div>
            {letreiro('abaixo')}
          </>
        ) : (
          <div className={`maq${premio ? ' premio' : ''}`}>
            <div className="luzes" aria-hidden="true">{REGUAS.cima.map((l) => <Lampada key={l.i} luz={l} />)}</div>
            <div className="luzes roxa" aria-hidden="true">{REGUAS.cimaRoxa.map((l) => <Lampada key={l.i} luz={l} />)}</div>
            <div className="janela">{letreiro('na-janela')}</div>
            <div className="baseluz" aria-hidden="true">
              <div className="fila">{REGUAS.base.map((l) => <Lampada key={l.i} luz={l} />)}</div>
              <div className="fila roxa">{REGUAS.baseRoxa.map((l) => <Lampada key={l.i} luz={l} />)}</div>
            </div>
          </div>
        )}
        <p className="bv-frase">{FRASES[variante]}</p>
        {variante === 'convidado' ? (
          <div className="bv-posicao" role="group" aria-label="Como você joga">
            <button type="button" className={`chip ${!goleiro ? 'chip--active' : ''}`} aria-pressed={!goleiro} disabled={ocupado} onClick={() => setGoleiro(false)}>
              Jogo na linha
            </button>
            <button type="button" className={`chip ${goleiro ? 'chip--active' : ''}`} aria-pressed={goleiro} disabled={ocupado} onClick={() => setGoleiro(true)}>
              No gol
            </button>
          </div>
        ) : null}
        {semTime ? (
          <>
            <button type="button" className="btn cta-gold bv-cta" onClick={() => onClose({ destino: '/criar-equipa' })}>
              Criar meu time
            </button>
            <button type="button" className="btn btn--purple-outline bv-cta" onClick={() => onClose({ destino: '/explorar' })}>
              Explorar peladas
            </button>
            <p className="bv-convite">Recebeu um convite? Abra o link que mandaram no grupo.</p>
          </>
        ) : (
          <button type="button" className="btn cta-gold bv-cta" disabled={ocupado} onClick={vamosLa}>
            {ocupado ? 'Entrando…' : 'Vamos lá'}
          </button>
        )}
      </div>
    </div>,
    document.body
  );
}
