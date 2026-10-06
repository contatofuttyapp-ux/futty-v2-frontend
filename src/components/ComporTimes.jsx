// Futty v2.0 — ComporTimes: composição manual de times (props-driven).
// EXTRAÍDO do passo-4 "Montar à mão" do Campeonato.jsx SEM mudança de comportamento —
// a mesma peça é reusada pelo JOGO MANUAL/RETROATIVO (SPEC-JOGO-MANUAL/RETROATIVO).
// Toca num jogador para o pôr no time selecionado; toca no chip do time para o marcar.
// Estado da seleção (timeSel) é interno; o plantel (atrib) é do pai, via onChangeAtrib.
import { useState } from 'react';
import { urlAsset, urlImagem } from '../utils/avatar';
import { avatarQuadrado, enquadroAvatar } from '../lib/enquadroAvatar';
import SilhuetaJogador from './SilhuetaJogador';

const RAJ = "'Rajdhani', sans-serif";
// Paleta SELADA da casa (OURO/ROXO/PRATA/BRONZE + extras) — idêntica à do wizard.
const CORES_PADRAO = ['#d4a017', '#8b5cf6', '#aab4c8', '#c2652e', '#35b6a8', '#d1689e', '#6fae52', '#e08a2e'];

// Avatar pequeno (foto ou silhueta-casa) para chips de jogador.
function MiniAvatar({ p, size = 20 }) {
  if (p.avatar_url) return <img src={urlImagem(urlAsset(p.avatar_url), 128, { quadrado: avatarQuadrado(p.avatar_url) })} alt="" width={size} height={size} decoding="async" loading="lazy" style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', objectPosition: enquadroAvatar(p.avatar_url) }} />;
  // LEI DA SILHUETA: pessoa sem foto = silhueta-casa angulosa (nunca círculo com inicial).
  return <span style={{ width: size, height: size, display: 'grid', placeItems: 'center', color: 'rgba(201,182,255,0.9)' }}><SilhuetaJogador size="92%" interrogacao={false} /></span>;
}

// O texto de ajuda vem de QUEM USA (`ajuda`) — o Campeonato tem o dele ("Quem sobra não joga…", "ex.: 5º A
// vs 5º B"), o Jogo e o Jogo passado têm o seu. `opcional` (omissão: sim, como no Campeonato) escreve o
// "(opcional)" do título; no Jogo montar os times não é opcional. `semJogadores` troca a frase de quando
// não há ninguém para pôr nos times (a de omissão manda "voltar atrás", que só existe nos passos).
// `titulo` (omissão: "Monte os times") — o Jogo passado escreve o seu NO PASSADO, porque tudo ali já
// aconteceu; `titulo={null}` o esconde.
export default function ComporTimes({ nomes, pool, atrib, onChangeAtrib, cores, ajuda = null, opcional = true, titulo = 'Monte os times', semJogadores = 'Sem jogadores. Volte atrás para juntar convidados, ou crie só com os nomes.' }) {
  const CORES = cores || CORES_PADRAO;
  const [timeSelRaw, setTimeSel] = useState(0);
  const timeSel = Math.max(0, Math.min(timeSelRaw, nomes.length - 1)); // clamp (times podem encolher)

  const poolByKey = Object.fromEntries(pool.map((p) => [p.key, p]));
  const atribSafe = nomes.map((_, i) => atrib[i] || []);
  const atribuidos = new Set(atribSafe.flat());
  const livres = pool.filter((p) => !atribuidos.has(p.key));

  function porNoTime(key) { onChangeAtrib(atribSafe.map((arr, i) => (i === timeSel ? [...arr, key] : arr))); }
  function tiraDoTime(key) { onChangeAtrib(atribSafe.map((arr) => arr.filter((k) => k !== key))); }

  return (
    <>
      {titulo ? <div className="section-title" data-titulo-dos-times style={{ marginTop: 2 }}>{titulo}{opcional ? <> <span className="muted" style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, fontSize: 11 }}>(opcional)</span></> : null}</div> : null}
      {ajuda ? <p className="muted" data-ajuda-dos-times style={{ fontSize: 11, margin: '0 0 10px', lineHeight: 1.5 }}>{ajuda}</p> : null}

      {/* separador de times (toca para selecionar) */}
      <div className="row" style={{ marginBottom: 10 }}>
        {nomes.map((n, i) => (
          <button key={i} type="button" onClick={() => setTimeSel(i)} className={`camp-chip ${i === timeSel ? 'camp-chip--gold' : ''}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer', borderColor: i === timeSel ? undefined : CORES[i] }}>
            <span className="camp-tab__dot" style={{ background: CORES[i], boxShadow: 'none', width: 9, height: 9 }} />
            {n.trim() || `Time ${i + 1}`} · {atribSafe[i].length}
          </button>
        ))}
      </div>

      {/* plantel do time selecionado */}
      <div className="hud-corners" style={{ background: 'rgba(212,160,23,0.05)', border: `1px solid ${CORES[timeSel]}55`, padding: '8px 10px', marginBottom: 12, minHeight: 44 }}>
        <div style={{ fontFamily: RAJ, fontWeight: 700, fontSize: 11, letterSpacing: '.06em', color: CORES[timeSel], textTransform: 'uppercase', marginBottom: 6 }}>{nomes[timeSel]?.trim() || `Time ${timeSel + 1}`}</div>
        {atribSafe[timeSel].length ? (
          <div className="row">
            {atribSafe[timeSel].map((k) => { const p = poolByKey[k]; if (!p) return null; return (
              <button key={k} type="button" onClick={() => tiraDoTime(k)} className="camp-chip" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer', paddingLeft: 4 }}>
                <MiniAvatar p={p} /> {p.nome} <span style={{ color: '#6f6a80' }}>✕</span>
              </button>
            ); })}
          </div>
        ) : <span className="muted" style={{ fontSize: 12 }}>Vazio. Toque nos jogadores abaixo.</span>}
      </div>

      {/* pool disponível */}
      <div style={{ fontFamily: RAJ, fontWeight: 700, fontSize: 11, letterSpacing: '.1em', color: 'rgba(255,255,255,.5)', textTransform: 'uppercase', margin: '0 0 6px' }}>Disponíveis · {livres.length}</div>
      {pool.length === 0 ? (
        <p className="muted" style={{ fontSize: 12 }}>{semJogadores}</p>
      ) : livres.length === 0 ? (
        <p className="muted" style={{ fontSize: 12 }}>Todos colocados.</p>
      ) : (
        <div className="row">
          {livres.map((p) => (
            <button key={p.key} type="button" onClick={() => porNoTime(p.key)} className="camp-chip" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer', paddingLeft: 4, borderColor: p.convidado ? 'rgba(139,92,246,.4)' : undefined }}>
              <MiniAvatar p={p} /> {p.nome}{p.convidado ? <span style={{ color: '#8b5cf6', fontSize: 9 }}>conv.</span> : ''} <span style={{ color: CORES[timeSel] }}>＋</span>
            </button>
          ))}
        </div>
      )}
    </>
  );
}
