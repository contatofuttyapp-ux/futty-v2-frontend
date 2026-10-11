// Futty v2.0 — Criar o campeonato a partir do sorteio de um jogo: o nome, a escolha do formato e o "Criar campeonato".
// Uma peça só para os dois lugares onde isso acontece: o resultado do sorteio (Página do Jogo) e a escolha "Pelo sorteio de um jogo" de
// quem cria o campeonato fora do jogo. Os times e os jogadores vêm prontos do sorteio; o admin dá o nome (já vem preenchido com
// "Campeonato <time>") e escolhe o formato. A data do jogo não entra no nome: aparece depois como subtítulo do campeonato.
import { useState } from 'react';
import { apiFetch } from '../lib/api';
import SeletorDeFormato from './SeletorDeFormato';
import { MAX_NOME_DO_CAMPEONATO, nomePadraoDoCampeonato } from '../utils/campeonatoDoSorteio';

const RAJ = "'Rajdhani', sans-serif";

/**
 * @param {object} p
 * @param {string} p.slug
 * @param {string} p.gameId
 * @param {string} [p.nomeDoTime]    para o nome padrão: "Campeonato <time>"
 * @param {number} p.nTimes          quantos times o sorteio tem (os formatos que não cabem não aparecem)
 * @param {(campeonato: object) => void} p.aoCriar
 * @param {(mensagem: string) => void} [p.aoErrar]
 * @param {() => void} p.aoCancelar
 */
export default function CampeonatoDoSorteio({ slug, gameId, nomeDoTime = '', nTimes, aoCriar, aoErrar = null, aoCancelar }) {
  const [nome, setNome] = useState(() => nomePadraoDoCampeonato(nomeDoTime));
  const [formato, setFormato] = useState('pontos');
  const [criando, setCriando] = useState(false);

  async function criar() {
    setCriando(true);
    try {
      const data = await apiFetch(`/api/equipas/${slug}/campeonatos/de-sorteio`, { method: 'POST', body: JSON.stringify({ game_id: gameId, formato, nome: nome.trim() }) });
      aoCriar(data.campeonato);
    } catch (err) {
      setCriando(false);
      if (aoErrar) aoErrar(err.message);
    }
  }

  return (
    <div data-campeonato-do-sorteio>
      <label className="lbl-hud" htmlFor="nome-do-campeonato" style={{ fontFamily: RAJ, fontSize: 11, fontWeight: 700, letterSpacing: '.12em', color: 'rgba(255,255,255,.5)', textTransform: 'uppercase', display: 'block', margin: '0 0 6px' }}>Nome do campeonato</label>
      <input
        id="nome-do-campeonato"
        data-nome-do-campeonato
        className="input input--hud"
        value={nome}
        maxLength={MAX_NOME_DO_CAMPEONATO}
        onChange={(e) => setNome(e.target.value)}
        style={{ width: '100%', fontFamily: RAJ, fontSize: 16, fontWeight: 700, marginBottom: 12 }}
      />
      <SeletorDeFormato valor={formato} onChange={setFormato} nTimes={nTimes} />
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button type="button" data-criar-campeonato className="btn btn--sm hud-corners-s cta-gold" style={{ fontFamily: RAJ, letterSpacing: '0.06em', textTransform: 'uppercase' }} onClick={criar} disabled={criando || !nome.trim()}>
          {criando ? 'Criando…' : 'Criar campeonato'}
        </button>
        <button type="button" className="btn btn--sm btn--outline hud-corners-s" onClick={aoCancelar} disabled={criando}>
          Cancelar
        </button>
      </div>
    </div>
  );
}
