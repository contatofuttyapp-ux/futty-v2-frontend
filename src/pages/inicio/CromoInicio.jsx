// Futty v2.0 — Início: o cromo clicável e a prévia em DOM que o segura enquanto o canvas pinta.

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { enquadrarAvatar, enquadrarFotoComum } from '../../utils/figurinhaCanvas';
import SilhuetaJogador from '../../components/SilhuetaJogador';

// Presentacional: recebe o cromo JÁ gerado (dataURL) do Início.
//
// A tela aparece primeiro e o cromo chega quando fica pronto, então há um instante sem ele. Esse
// instante é preenchido com a própria foto da pessoa (`previa`), no mesmo sítio e no mesmo tamanho —
// sem isso a tela nasce com um buraco quadrado no meio, que é pior do que esperar. Sem avatar IA o
// canvas já vem com o genérico da casa desenhado (ver `jogadorCard` em Inicio()) — não há overlay de
// convite: o card em si é o convite.
// O fundo do cromo, em CSS, para a prévia. Os que têm asset usam o MESMO ficheiro que o canvas desenha
// (e com o mesmo enquadramento: `cover` ancorado a 22% do topo é o biasTopo do retrato quadrado). Os
// desenhados ficam pela base — o honeycomb do Épico é alpha 0.065 e não se distingue num placeholder.
function fundoDaPrevia(fundo) {
  if (fundo === 'estadio') return { backgroundImage: 'url(/stadium_bg.webp)' };
  if (fundo === 'golden') return { backgroundImage: 'url(/golden-plate.jpg)', backgroundPosition: '50% 50%' };
  if (fundo === 'royal') return { backgroundImage: 'url(/royal-plate.webp)', backgroundPosition: '50% 50%' };
  if (fundo === 'aura') {
    return { background: 'radial-gradient(ellipse 50% 48% at 50% 42%, rgba(212,160,23,0.5), rgba(212,160,23,0.12) 64%, transparent 92%), linear-gradient(#0a0a12, #070812 55%, #050609)' };
  }
  // 'preto' (Neutro) e 'gradiente' (Épico) partilham a base escura da casa.
  return { background: 'linear-gradient(#16161c, #1d1d24 50%, #101014)' };
}

// A PRÉVIA — o cromo inteiro composto em DOM, pronto na primeira pintura.
// O avatar é medido e posicionado com a conta do canvas (enquadrarAvatar), em percentagens: assim os
// dois põem o jogador no mesmo sítio e a troca da prévia pelo cromo desenhado não salta.
//
// A composição entra INTEIRA, num quadro só: a moldura dourada pintada antes do avatar é, no aparelho,
// uma moldura vazia à espera de uma cara. Por isso nada da composição vai à tela antes de a imagem estar
// DECODIFICADA — decode(), não onLoad: o onLoad garante os bytes, não os pixéis prontos a desenhar, e é
// entre um e outro que o WebKit segura o quadro. Até lá fica só a área reservada com o fundo escolhido:
// o mesmo lugar, o mesmo tamanho, sem forma pela metade.
//
// Se a foto não chegar em PRAZO_AVATAR_MS, a composição aparece na mesma com a silhueta da casa (SVG,
// não espera rede nenhuma) e a foto entra quando chegar. Uma espera sem fim não é transição, é defeito.
const PRAZO_AVATAR_MS = 1500;

// O anel dourado da prévia: o conteúdo mora `inset: 1.75%` dentro dele (app.css,
// .cromo-previa__dentro), que é o corpo grosso do frame do canvas (7*k, k = lado/400).
const INSET_DO_ANEL = 1.75;

function PreviaCromo({ previa, fundo, modo = 'brilhante' }) {
  const [avatar, setAvatar] = useState(null);
  const [semEspera, setSemEspera] = useState(!previa);
  // Prévia nova (a pessoa trocou o avatar genérico, ou a foto): volta à área reservada.
  // Ajuste DURANTE o render — o padrão oficial do React para estado derivado de
  // props, o mesmo que o useListaProgressiva usa. Num efeito corria tarde de
  // mais e a composição antiga chegava a pintar com a foto errada.
  const chaveDaPrevia = `${modo}|${previa}`;
  const [vista, setVista] = useState(chaveDaPrevia);
  if (vista !== chaveDaPrevia) {
    setVista(chaveDaPrevia);
    setAvatar(null);
    setSemEspera(!previa);
  }

  useEffect(() => {
    if (!previa) return undefined;
    let vivo = true;
    const prazo = setTimeout(() => { if (vivo) setSemEspera(true); }, PRAZO_AVATAR_MS);
    const img = new Image();
    img.decoding = 'async';
    img.src = previa;
    // decode() rejeita em imagem quebrada; aí vale a silhueta, como no prazo.
    img.decode()
      .then(() => {
        if (!vivo || !img.naturalWidth) return;
        if (modo === 'comum') {
          // A figurinha COMUM é a foto como ela é, a cobrir o cromo todo (cover, do topo) — a MESMA
          // conta do canvas (enquadrarFotoComum). Antes a prévia usava a da Brilhante (o avatar
          // recortado, pequeno, com os olhos a 34 %) e a foto aparecia 129×194 numa caixa de 184: a
          // troca pelo cromo desenhado saltava (47,9 px medidos). O canvas põe a foto por baixo da
          // moldura, a prévia dentro do anel — daí a conversão das coordenadas do cromo para as do anel.
          const { dx, dy, dw, dh } = enquadrarFotoComum({ W: 100, H: 100, nw: img.naturalWidth, nh: img.naturalHeight });
          const k = 100 / (100 - 2 * INSET_DO_ANEL);
          setAvatar({
            left: `${(dx - INSET_DO_ANEL) * k}%`,
            top: `${(dy - INSET_DO_ANEL) * k}%`,
            width: `${dw * k}%`,
            height: `${dh * k}%`,
          });
          return;
        }
        // W=H=100 → o resultado já vem em percentagem do lado do cromo.
        const { dx, dy, dw, dh } = enquadrarAvatar({
          W: 100, H: 100, nw: img.naturalWidth, nh: img.naturalHeight, avatarZoom: 1.1, ehQuadrado: true,
        });
        setAvatar({ left: `${dx}%`, top: `${dy}%`, width: `${dw}%`, height: `${dh}%` });
      })
      .catch(() => { if (vivo) setSemEspera(true); });
    return () => { vivo = false; clearTimeout(prazo); };
  }, [previa, modo]);

  if (!avatar && !semEspera) {
    return <div className="cromo-previa__reserva" style={fundoDaPrevia(fundo)} aria-hidden="true" />;
  }

  return (
    <div className="cromo-previa" aria-hidden="true">
      <div className="cromo-previa__dentro">
        <div className="cromo-previa__fundo" style={fundoDaPrevia(fundo)} />
        {avatar ? (
          // decoding="sync": os pixéis já estão decodificados acima, então este
          // <img> pinta no mesmo quadro em que a moldura aparece.
          <img src={previa} alt="" decoding="sync" className={`cromo-previa__avatar${modo === 'comum' ? ' cromo-previa__avatar--comum' : ''}`} style={avatar} />
        ) : (
          <div className="cromo-previa__silhueta">
            <SilhuetaJogador size="58%" color="rgba(240,201,74,0.5)" interrogacao={false} />
          </div>
        )}
        <div className="cromo-previa__pe" />
      </div>
    </div>
  );
}

function CromoInicio({ cromo, previa, modoPrevia, fundo, nome, refCromo, destino = '/figurinha', destinoLabel = 'Ver e personalizar minha figurinha' }) {
  return (
    <Link to={destino} ref={refCromo} className="cromo-inicio" aria-label={destinoLabel}>
      {/* Sombra no chão — contra-fase com o bob: encolhe quando o cromo sobe. */}
      <div
        className="fig-shadow"
        aria-hidden="true"
        style={{ position: 'absolute', left: '15%', bottom: -10, width: '70%', height: 10, background: 'radial-gradient(ellipse, rgba(212,160,23,0.35), rgba(0,0,0,0.5) 60%, transparent)', filter: 'blur(6px)', pointerEvents: 'none' }}
      />
      <div className="fig-bob" style={{ position: 'relative', width: '100%', height: '100%' }}>
        <div className="fig-sway" style={{ position: 'relative', width: '100%', height: '100%' }}>
          {cromo ? (
            <img src={cromo} alt={`Figurinha de ${nome}`} className="fig-aura" decoding="async" fetchPriority="high" loading="eager" style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />
          ) : (
            <PreviaCromo previa={previa} fundo={fundo} modo={modoPrevia} />
          )}
        </div>
      </div>
    </Link>
  );
}

export { CromoInicio };
