// Futty v2.0 — Os times em cartões, time a time: a moldura na cor do time (Ouro, Roxo, Prata, Bronze — os metais da
// cerimônia), cada jogador num cartão 3:4 com o nome embaixo, a reserva em cinza-aço (nunca cor de time).
// Usado pelo passo do ajuste da cerimônia (os times finais, com quem trocou de lugar em destaque) e pela
// apresentação dos times montados à mão (os cartões entram um a um, como anúncio de escalação).
//
// A entrada em sequência é só CSS (.entra-em-sequencia, styles/app.css): o estado natural é o cartão visível — se a
// animação não rodar (movimento reduzido, CSS que não chegou), tudo já está na tela.
import { useState } from 'react';
import SilhuetaJogador from './SilhuetaJogador';
import { urlAsset, urlImagem } from '../utils/avatar';
import { avatarGenericoUrl } from '../utils/avatarGenerico';
import { nomeDoTimeNaTela } from '../utils/nomeDoTime';
import { chaveDoJogador } from '../utils/seloDoSorteio';
import { atrasoCss } from '../utils/tempoDosCartoes';
import { nomeComPonto, temConvidado, TEXTO_SEM_O_APP } from '../utils/marcaConvidado';

const RAJ = "'Rajdhani', sans-serif";
const CORES = ['#d4a017', '#8b5cf6', '#aab4c8', '#c2652e'];
const COR_RESERVA = '#8a90a0';
const CLIP_CARTAO = 'polygon(8% 0, 92% 0, 100% 6%, 100% 94%, 92% 100%, 8% 100%, 0 94%, 0 6%)';
const CLIP_CAIXA = 'polygon(8px 0, calc(100% - 8px) 0, 100% 8px, 100% calc(100% - 8px), calc(100% - 8px) 100%, 8px 100%, 0 calc(100% - 8px), 0 8px)';

// O rosto como na cerimônia: a foto; sem foto, o avatar genérico da casa (o convidado sem app ganha o palpite pelo
// nome); se nem ele carregar, a silhueta da casa.
function Rosto({ j, cor }) {
  const [falhou, setFalhou] = useState(false);
  const generico = !j.avatar_url;
  const src = generico ? avatarGenericoUrl(j.user_id || null, j.avatar_generico || null, j.nome || '') : urlImagem(urlAsset(j.avatar_url), 128);
  if (falhou || !src) return <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', color: cor }}><SilhuetaJogador size="70%" /></div>;
  return (
    <img
      src={src}
      alt=""
      decoding="async"
      loading="lazy"
      onError={() => setFalhou(true)}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: '50% 0%', transform: generico ? 'scale(1.2)' : 'none', transformOrigin: '50% 0%' }}
    />
  );
}

function Cartao({ j, cor, destaque, atraso }) {
  return (
    <div className="entra-em-sequencia" data-cartao-jogador={destaque ? 'trocou' : 'ficou'} style={{ '--d': atrasoCss(atraso), minWidth: 0 }}>
      <div style={{ position: 'relative', aspectRatio: '3 / 4', clipPath: CLIP_CARTAO, background: '#0b0b11', outline: 'none', boxShadow: `inset 0 0 0 2px ${destaque ? '#f0c94a' : `${cor}99`}` }}>
        <Rosto j={j} cor={cor} />
      </div>
      <div style={{ marginTop: 4, fontFamily: RAJ, fontWeight: 700, fontSize: 12, lineHeight: 1.15, textAlign: 'center', color: destaque ? '#f0c94a' : '#fff', overflowWrap: 'anywhere' }}>
        {nomeComPonto(j, 'Jogador')}
      </div>
    </div>
  );
}

function Caixa({ titulo, cor, jogadores, destacar, atrasoDe, chaveBase }) {
  return (
    <div style={{ padding: '10px 10px 12px', clipPath: CLIP_CAIXA, background: 'rgba(255,255,255,0.03)', boxShadow: `inset 0 0 0 1px ${cor}aa` }}>
      <div className="entra-em-sequencia" style={{ '--d': atrasoCss(atrasoDe(0)), fontFamily: RAJ, fontWeight: 800, fontSize: 14, letterSpacing: '0.14em', textTransform: 'uppercase', color: cor, marginBottom: 8 }}>{titulo}</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(64px, 1fr))', gap: 8 }}>
        {jogadores.map((j, k) => (
          <Cartao key={`${chaveBase}-${chaveDoJogador(j)}-${k}`} j={j} cor={cor} destaque={destacar?.has(chaveDoJogador(j))} atraso={atrasoDe(k + 1)} />
        ))}
      </div>
      {/* O ponto antes do nome (acima) só se explica uma vez, no fim da caixa que o tem. */}
      {temConvidado(jogadores) && (
        <div className="entra-em-sequencia" style={{ '--d': atrasoCss(atrasoDe(jogadores.length)), marginTop: 8, fontFamily: RAJ, fontWeight: 600, fontSize: 11, letterSpacing: '0.04em', color: 'rgba(255,255,255,0.4)' }}>
          {TEXTO_SEM_O_APP}
        </div>
      )}
    </div>
  );
}

/**
 * `atraso0` (s) quando o primeiro time começa; `passo` (s) entre um cartão e o seguinte; `pausaEntreTimes` (s) a mais
 * a cada time novo — a apresentação usa passos largos (anúncio de escalação), o passo do ajuste usa curtos.
 */
export default function TimesEmCartoes({ times = [], reservas = [], destacar = null, atraso0 = 0, passo = 0.08, pausaEntreTimes = 0.2 }) {
  // Cada time começa quando o anterior terminou de entrar (o título + um passo por cartão + a pausa).
  const inicios = times.reduce((acc, time) => [...acc, acc[acc.length - 1] + ((time.jogadores || []).length + 1) * passo + pausaEntreTimes], [atraso0]);
  const blocos = times.map((time, i) => ({ time, i, inicio: inicios[i] }));
  const inicioReserva = inicios[times.length];
  return (
    <div data-times-em-cartoes style={{ display: 'grid', gap: 10 }}>
      {blocos.map(({ time, i, inicio }) => (
        <Caixa
          key={i}
          titulo={nomeDoTimeNaTela(time.nome, i)}
          cor={CORES[i % CORES.length]}
          jogadores={time.jogadores || []}
          destacar={destacar}
          atrasoDe={(k) => inicio + k * passo}
          chaveBase={`t${i}`}
        />
      ))}
      {reservas.length ? (
        <Caixa titulo="Reserva" cor={COR_RESERVA} jogadores={reservas} destacar={destacar} atrasoDe={(k) => inicioReserva + k * passo} chaveBase="r" />
      ) : null}
    </div>
  );
}
