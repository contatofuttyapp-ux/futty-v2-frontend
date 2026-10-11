// Futty v2.0 — "Criar campeonato" fora do jogo: a escolha de onde vêm os times.
//   · Pelo sorteio de um jogo → lista os jogos sorteados que ainda não viraram campeonato (recentes, não cancelados); escolhido o jogo, a
//     escolha do formato e o "Criar campeonato" (os times saem do sorteio). Sem nenhum jogo assim, explica o caminho em uma linha e
//     oferece "Novo jogo".
//   · Montar os times à mão → o passo a passo manual (quem usa a peça decide para onde vai: `aoMontarAMao`).
// O "sortear direto" saiu: ele sorteava TODOS os membros do time, inclusive quem não vai, sem olhar as notas.
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../lib/api';
import { quandoOndeDoJogo } from '../utils/quandoOndeDoJogo';
import { A_MAO, ESCOLHA_O_JOGO, linhaDoSorteio, PELO_SORTEIO, SEM_JOGO_SORTEADO, TITULO_DA_ESCOLHA } from '../utils/campeonatoDoSorteio';
import CampeonatoDoSorteio from './CampeonatoDoSorteio';
import LoadingFutty from './LoadingFutty';

const RAJ = "'Rajdhani', sans-serif";

/**
 * @param {object} p
 * @param {string} p.slug
 * @param {{ fuso?: string, cidade?: string }|null} p.team   o time (a hora do jogo se lê no relógio do campo)
 * @param {(campeonato: object) => void} p.aoCriado
 * @param {() => void} p.aoMontarAMao
 * @param {(() => void)|null} [p.aoCancelar]
 */
export default function CriarCampeonato({ slug, team, aoCriado, aoMontarAMao, aoCancelar = null }) {
  const navigate = useNavigate();
  const [etapa, setEtapa] = useState('escolha'); // 'escolha' | 'jogos' | 'formato'
  const [jogos, setJogos] = useState(null); // null = carregando
  const [jogo, setJogo] = useState(null);
  const [erro, setErro] = useState('');

  // A lista é pedida cada vez que se abre "Pelo sorteio de um jogo": um sorteio feito agora há pouco tem de aparecer.
  useEffect(() => {
    if (etapa !== 'jogos') return undefined;
    let ativo = true;
    apiFetch(`/api/equipas/${slug}/campeonatos/jogos-sorteados`)
      .then((d) => ativo && setJogos(d.jogos || []))
      .catch((e) => { if (ativo) { setErro(e.message); setJogos([]); } });
    return () => { ativo = false; };
  }, [etapa, slug]);

  // Abrir a lista (ou voltar a ela) começa do zero: carregando, sem erro velho.
  function abrirJogos() {
    setJogos(null);
    setErro('');
    setEtapa('jogos');
  }

  return (
    <div data-criar-campeonato-escolha data-etapa={etapa}>
      {etapa === 'escolha' ? (
        <>
          <div className="section-title" style={{ marginTop: 2 }}>{TITULO_DA_ESCOLHA}</div>
          <div className="camp-fopt" data-caminho="sorteio" role="button" tabIndex={0} onClick={abrirJogos} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); abrirJogos(); } }}>
            <div><div className="camp-fopt__t">{PELO_SORTEIO.titulo}</div><div className="camp-fopt__d">{PELO_SORTEIO.descricao}</div></div>
          </div>
          <div className="camp-fopt" data-caminho="a-mao" role="button" tabIndex={0} onClick={aoMontarAMao} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); aoMontarAMao(); } }}>
            <div><div className="camp-fopt__t">{A_MAO.titulo}</div><div className="camp-fopt__d">{A_MAO.descricao}</div></div>
          </div>
          {aoCancelar ? <button type="button" className="btn btn--ghost btn--sm" style={{ marginTop: 6 }} onClick={aoCancelar}>Cancelar</button> : null}
        </>
      ) : null}

      {etapa === 'jogos' ? (
        <>
          <div className="section-title" style={{ marginTop: 2 }}>{PELO_SORTEIO.titulo}</div>
          {jogos === null ? <LoadingFutty /> : null}
          {erro ? <div className="alert alert--error" role="alert">{erro}</div> : null}
          {jogos && jogos.length ? (
            <>
              <p className="texto-apoio" style={{ margin: '2px 0 8px' }}>{ESCOLHA_O_JOGO}</p>
              {jogos.map((j) => (
                <div key={j.id} className="camp-fopt" data-jogo-sorteado={j.id} role="button" tabIndex={0} onClick={() => { setJogo(j); setEtapa('formato'); }} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setJogo(j); setEtapa('formato'); } }}>
                  <div>
                    <div className="camp-fopt__t">{quandoOndeDoJogo({ data: j.data, local: null }, team) || 'Jogo'}</div>
                    <div className="camp-fopt__d">{[j.local, linhaDoSorteio(j)].filter(Boolean).join(' · ')}</div>
                  </div>
                </div>
              ))}
            </>
          ) : null}
          {jogos && !jogos.length && !erro ? (
            <div className="camp-card" data-sem-jogo-sorteado style={{ padding: '14px' }}>
              <p className="texto-apoio" style={{ margin: '0 0 12px' }}>{SEM_JOGO_SORTEADO}</p>
              <div className="cta-gold-glow" style={{ display: 'flex' }}>
                <button type="button" className="btn hud-corners cta-gold" style={{ flex: 1, fontFamily: RAJ }} onClick={() => navigate(`/time/${slug}/jogo/novo`)}>Novo jogo</button>
              </div>
            </div>
          ) : null}
          <button type="button" className="btn btn--ghost btn--sm" style={{ marginTop: 6 }} onClick={() => setEtapa('escolha')}>Voltar</button>
        </>
      ) : null}

      {etapa === 'formato' && jogo ? (
        <>
          <div className="section-title" style={{ marginTop: 2 }}>Escolha o formato</div>
          <p className="texto-apoio" data-jogo-escolhido style={{ margin: '2px 0 8px' }}>
            {[quandoOndeDoJogo({ data: jogo.data, local: jogo.local }, team), linhaDoSorteio(jogo)].filter(Boolean).join(' · ')}. Os times e os jogadores entram já preenchidos.
          </p>
          {erro ? <div className="alert alert--error" role="alert" style={{ marginBottom: 8 }}>{erro}</div> : null}
          <CampeonatoDoSorteio slug={slug} gameId={jogo.id} nTimes={jogo.n_times} aoCriar={aoCriado} aoErrar={setErro} aoCancelar={abrirJogos} />
        </>
      ) : null}
    </div>
  );
}
