// Futty v2.0 — Criar o campeonato a partir do sorteio de um jogo: a escolha do formato e o "Criar campeonato".
// Uma peça só para os dois lugares onde isso acontece: o resultado do sorteio (Página do Jogo) e a escolha "Pelo sorteio de um jogo" de
// quem cria o campeonato fora do jogo. Os times e os jogadores vêm prontos do sorteio; o admin só escolhe o formato.
import { useState } from 'react';
import { apiFetch } from '../lib/api';
import SeletorDeFormato from './SeletorDeFormato';

const RAJ = "'Rajdhani', sans-serif";

/**
 * @param {object} p
 * @param {string} p.slug
 * @param {string} p.gameId
 * @param {number} p.nTimes        quantos times o sorteio tem (os formatos que não cabem não aparecem)
 * @param {(campeonato: object) => void} p.aoCriar
 * @param {(mensagem: string) => void} [p.aoErrar]
 * @param {() => void} p.aoCancelar
 */
export default function CampeonatoDoSorteio({ slug, gameId, nTimes, aoCriar, aoErrar = null, aoCancelar }) {
  const [formato, setFormato] = useState('pontos');
  const [criando, setCriando] = useState(false);

  async function criar() {
    setCriando(true);
    try {
      const data = await apiFetch(`/api/equipas/${slug}/campeonatos/de-sorteio`, { method: 'POST', body: JSON.stringify({ game_id: gameId, formato }) });
      aoCriar(data.campeonato);
    } catch (err) {
      setCriando(false);
      if (aoErrar) aoErrar(err.message);
    }
  }

  return (
    <div data-campeonato-do-sorteio>
      <SeletorDeFormato valor={formato} onChange={setFormato} nTimes={nTimes} />
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button type="button" data-criar-campeonato className="btn btn--sm hud-corners-s cta-gold" style={{ fontFamily: RAJ, letterSpacing: '0.06em', textTransform: 'uppercase' }} onClick={criar} disabled={criando}>
          {criando ? 'Criando…' : 'Criar campeonato'}
        </button>
        <button type="button" className="btn btn--sm btn--outline hud-corners-s" onClick={aoCancelar} disabled={criando}>
          Cancelar
        </button>
      </div>
    </div>
  );
}
