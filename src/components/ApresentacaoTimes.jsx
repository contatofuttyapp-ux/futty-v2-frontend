// Futty v2.0 — A APRESENTAÇÃO dos times montados à mão: sem roleta, porque não houve sorteio. Fingir uma roleta
// para times escolhidos por alguém seria mentir na frente de todo mundo. No lugar, um anúncio de escalação: os times
// entram um a um, cada jogador no seu cartão, e no fim o selo prata MONTADO À MÃO POR <nome>.
// "Ver de novo" repete a apresentação (remonta os cartões). Compartilhar é o mesmo da cerimônia: o cartaz com
// todos os times e o 9:16 de cada um.
// A entrada é só CSS (.entra-em-sequencia): o estado natural é visível; movimento reduzido mostra tudo parado.
import { useState } from 'react';
import { Share2, X } from 'lucide-react';
import SeloDoSorteio from './SeloDoSorteio';
import TimesEmCartoes from './TimesEmCartoes';
import { atrasoCss, duracaoDosCartoes } from '../utils/tempoDosCartoes';
import { gerarCartao916, gerarCartazEscalacao } from '../utils/sorteioCartao';
import { salvarOuCompartilhar } from '../utils/salvarImagem';
import { nomeDoTimeNaTela } from '../utils/nomeDoTime';

const RAJ = "'Rajdhani', sans-serif";
const CORES = ['#d4a017', '#8b5cf6', '#aab4c8', '#c2652e'];
// Anúncio de escalação: um cartão a cada 0,18 s e uma pausa entre um time e o outro — dá para ler cada nome.
const RITMO = { atraso0: 0.5, passo: 0.18, pausaEntreTimes: 0.5 };

export default function ApresentacaoTimes({ resultado, selo, equipa = '', data = '', aoSair = null }) {
  const [vez, setVez] = useState(0); // "Ver de novo": a chave nova remonta os cartões e a sequência recomeça
  const [gerando, setGerando] = useState(null); // 'todos' | índice do time
  const [aviso, setAviso] = useState('');
  const times = resultado?.times || [];
  const reservas = resultado?.reservas || [];
  if (!times.length) return null;
  const cartoes = { times, reservas, ...RITMO };
  const fim = duracaoDosCartoes(cartoes);

  async function compartilharTodos() {
    if (gerando != null) return;
    setGerando('todos'); setAviso('');
    try {
      const { entrega } = await gerarCartazEscalacao(resultado, { equipa, data, selo });
      if (entrega === 'baixou') setAviso('Imagem dos times salva no seu aparelho.');
      else if (entrega === 'compartilhou') setAviso('Imagem dos times compartilhada.');
    } catch (e) {
      setAviso(e?.message || 'Não deu para gerar a imagem. Tente de novo.');
    } finally { setGerando(null); }
  }
  async function compartilharTime(ti) {
    if (gerando != null) return;
    setGerando(ti); setAviso('');
    const nomeDoTime = nomeDoTimeNaTela(times[ti]?.nome, ti);
    try {
      const { blob, nome } = await gerarCartao916(resultado, ti, equipa, { selo });
      const entrega = await salvarOuCompartilhar(blob, nome, { titulo: 'Cartão dos times' });
      if (entrega === 'baixou') setAviso(`Cartão do ${nomeDoTime} salvo no seu aparelho.`);
      else if (entrega === 'compartilhou') setAviso(`Cartão do ${nomeDoTime} compartilhado.`);
    } catch (e) {
      setAviso(e?.message || 'Não deu para gerar o cartão. Tente de novo.');
    } finally { setGerando(null); }
  }

  return (
    <div data-apresentacao-dos-times style={{ position: 'relative', display: 'grid', gap: 14, paddingTop: 8 }}>
      {aoSair ? (
        <button type="button" onClick={aoSair} aria-label="Sair para a página do jogo" title="Sair para a página do jogo" style={{ position: 'absolute', top: 0, right: 0, zIndex: 2, width: 40, height: 40, display: 'grid', placeItems: 'center', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.18)', color: '#c9c2d6', cursor: 'pointer', clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)' }}>
          <X size={18} />
        </button>
      ) : null}
      <header key={`cab-${vez}`} className="entra-em-sequencia" style={{ textAlign: 'center', padding: '0 44px' }}>
        <div style={{ fontFamily: RAJ, fontWeight: 800, fontSize: 34, letterSpacing: '0.06em', lineHeight: 1.05, background: 'linear-gradient(180deg, #fff7d8, #f5d060 55%, #c8940f)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>
          ESCALAÇÃO
        </div>
        {[data, equipa].filter(Boolean).length ? (
          <div style={{ marginTop: 4, fontFamily: RAJ, fontWeight: 600, fontSize: 13, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#a99fc0' }}>{[data, equipa].filter(Boolean).join(' · ')}</div>
        ) : null}
      </header>

      <TimesEmCartoes key={`times-${vez}`} {...cartoes} />

      <div key={`selo-${vez}`} className="entra-em-sequencia" style={{ '--d': atrasoCss(fim) }}>
        <SeloDoSorteio selo={selo} largo />
      </div>

      <div key={`acoes-${vez}`} className="entra-em-sequencia" style={{ '--d': atrasoCss(fim + 0.3), display: 'grid', gap: 8 }}>
        <div className="cta-gold-glow" style={{ display: 'flex' }}>
          <button type="button" className="btn hud-corners cta-gold" style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 9, fontFamily: RAJ, letterSpacing: '0.08em', textTransform: 'uppercase' }} disabled={gerando != null} onClick={compartilharTodos}>
            <Share2 size={17} /> {gerando === 'todos' ? 'Gerando…' : 'Compartilhar os times'}
          </button>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {times.map((t, ti) => (
            <button key={ti} type="button" className="btn btn--sm btn--outline hud-corners-s" style={{ flex: 1, minWidth: 0, color: CORES[ti % CORES.length], borderColor: CORES[ti % CORES.length], fontFamily: RAJ, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', overflowWrap: 'anywhere' }} disabled={gerando != null} onClick={() => compartilharTime(ti)}>
              {gerando === ti ? 'Gerando…' : `9:16 · ${nomeDoTimeNaTela(t.nome, ti)}`}
            </button>
          ))}
        </div>
        <p role="status" aria-live="polite" data-aviso-cartao style={{ margin: aviso ? '4px 0 0' : 0, fontSize: 12, lineHeight: 1.4, textAlign: 'center', color: '#6ee7a0' }}>{aviso}</p>
        <button type="button" className="btn btn--ghost btn--sm" onClick={() => setVez((v) => v + 1)}>Ver de novo</button>
      </div>
    </div>
  );
}
