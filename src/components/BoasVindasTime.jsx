// Futty v2.0 — Rodada 29B (C): as boas-vindas de quem entra num time — UMA página, UM botão. Substitui o modal de 3 passos
// (OnboardingModal) e o tour de 3 balões do Início (ProductTour): logo/nome do time, uma frase, a escolha "Jogo na
// linha / No gol" (padrão linha; grava com o PATCH de posição que já existe) e o botão "Vamos lá".
// A animação é uma faixa de luzes de slot machine em volta de um mini card: pontos de CSS, 0 KB de mídia, sem som
// (não há gesto), parada com prefers-reduced-motion.
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { apiFetch } from '../lib/api';
import EscudoEquipa from './EscudoEquipa';
import { posicoesDasLuzes } from '../utils/luzesSlot';
import '../styles/boas-vindas.css';

const FRASE_BOAS_VINDAS ='Aqui a gente confirma presença, sorteia os times, guarda o ranking e faz sua figurinha.';
const LUZES = posicoesDasLuzes({ largura: 152, altura: 196 });

/**
 * @param {object}   p
 * @param {object}   p.team          o time ({ nome, cor, logo_url })
 * @param {string}   p.slug          para o PATCH de posição
 * @param {boolean}  [p.goleiroInicial]  como a pessoa já está no time (padrão: linha)
 * @param {(r: { mudou: boolean, erro: string|null }) => void} p.onClose  chamado no "Vamos lá"
 */
export default function BoasVindasTime({ team, slug, goleiroInicial = false, onClose }) {
  const [goleiro, setGoleiro] = useState(!!goleiroInicial);
  const [ocupado, setOcupado] = useState(false);

  async function vamosLa() {
    if (ocupado) return;
    setOcupado(true);
    let erro = null;
    const mudou = goleiro !== !!goleiroInicial;
    if (mudou) {
      try {
        await apiFetch(`/api/equipas/${slug}/membros/posicao`, { method: 'PATCH', body: JSON.stringify({ goleiro }) });
      } catch (e) {
        erro = e?.message || 'Não deu para salvar agora. Dá para mudar no card do time.';
      }
    }
    onClose({ mudou: mudou && !erro, erro });
  }

  // Portal para o body: `fixed` dentro do [data-page] animado ancora na página, não na tela (nota em LoadingFutty.jsx).
  return createPortal(
    <div className="modal-overlay" role="presentation">
      <div className="bv" role="dialog" aria-modal="true" aria-labelledby="bv-nome">
        <div className="bv-luzes" aria-hidden="true">
          {LUZES.map((p, i) => (
            <i key={i} className="bv-luz" style={{ left: p.x, top: p.y, '--i': i }} />
          ))}
          <div className="bv-card">
            <EscudoEquipa team={team} size={84} />
          </div>
        </div>
        <h2 id="bv-nome" className="bv-nome">{team?.nome}</h2>
        <p className="bv-frase">{FRASE_BOAS_VINDAS}</p>
        <div className="bv-posicao" role="group" aria-label="Como você joga">
          <button type="button" className={`chip ${!goleiro ? 'chip--active' : ''}`} aria-pressed={!goleiro} disabled={ocupado} onClick={() => setGoleiro(false)}>
            Jogo na linha
          </button>
          <button type="button" className={`chip ${goleiro ? 'chip--active' : ''}`} aria-pressed={goleiro} disabled={ocupado} onClick={() => setGoleiro(true)}>
            No gol
          </button>
        </div>
        <button type="button" className="btn cta-gold bv-cta" disabled={ocupado} onClick={vamosLa}>
          {ocupado ? 'Entrando…' : 'Vamos lá'}
        </button>
      </div>
    </div>,
    document.body
  );
}
