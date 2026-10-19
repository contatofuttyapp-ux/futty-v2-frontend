// Futty v2.0 — Figurinha: a grade de uniformes (a mesma .fig-seletor-grade dos fundos), com o estado de cada tile.
import { Lock, Check } from 'lucide-react';
import { KIT_IMG } from '../../utils/kitsFigurinha';
import FaixaRolavel from '../../components/FaixaRolavel';
import { EstrelaIA } from './constantes';

export default function GradeDeUniformes({ estadoDoKit, gerandoIA, kitsDaGrade, textoDoConvite, tocarUniforme }) {
  return (
      <FaixaRolavel className="fig-seletor-grade" envoltorioClassName="faixa-rolavel--grade" data-grade="uniformes" rotuloMais="Ver mais uniformes" rotuloAnteriores="Ver uniformes anteriores">
        {kitsDaGrade.map((kit) => {
          const estado = estadoDoKit(kit);
          const trancado = estado === 'trancado';
          return (
            <button
              key={kit.id}
              type="button"
              className="fig-seletor-tile"
              onClick={() => tocarUniforme(kit)}
              // P2: o tile trancado diz o que o toque faz, com o mesmo texto do convite (Comprar · preço / Pedir).
              aria-label={trancado ? `${kit.nome} (bloqueado) · ${textoDoConvite('minha')}` : estado === 'geravel' ? `${kit.nome} · gerar figurinha` : kit.nome}
              aria-pressed={estado === 'vestido'}
              data-estado={estado}
              disabled={gerandoIA}
            >
              {/* Thumbnail quadrado */}
              <div className="hud-corners-s" style={{ position: 'relative', width: '100%', aspectRatio: '1 / 1', overflow: 'hidden', background: KIT_IMG[kit.id] ? '#0d0d12' : `linear-gradient(135deg, ${kit.base} 55%, ${kit.acento} 55%)`, border: estado === 'vestido' ? '2px solid #d4a017' : estado === 'geravel' ? '1px solid rgba(212,160,23,0.55)' : '1px solid var(--border-subtle)', filter: estado === 'vestido' ? 'none' : 'saturate(0.7) brightness(0.85)' }}>
                {KIT_IMG[kit.id] ? (
                  // Enquadramento (reparo do look): o cover cortava a camisa a meio.
                  // Ancora ao topo + desce + reduz a escala → vê-se o corte da gola e
                  // o padrão da manga de relance, com a maior parte da camisa visível.
                  <img
                    src={KIT_IMG[kit.id]}
                    alt=""
                    style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: '50% 10%', transform: 'scale(0.82) translateY(7%)', transformOrigin: '50% 0%' }}
                  />
                ) : null}
                {estado === 'vestido' ? (
                  <span style={{ position: 'absolute', top: 3, right: 3, width: 15, height: 15, borderRadius: '50%', background: '#d4a017', color: '#0d0d12', display: 'grid', placeItems: 'center' }}>
                    <Check size={10} strokeWidth={3} />
                  </span>
                ) : null}
                {/* Gerável (com direito, sem slot): só a estrelinha de IA, sem texto. O que custa (1 geração) e o saldo são ditos ao tocar, na
                    confirmação; o tempo (~45 s) só na mensagem de "gerando". */}
                {estado === 'geravel' ? (
                  <span data-ia-estrela aria-hidden="true" style={{ position: 'absolute', bottom: 3, right: 3, width: 14, height: 14, display: 'grid', placeItems: 'center', borderRadius: 4, background: 'rgba(0,0,0,0.7)' }}>
                    <EstrelaIA size={9} color="#d4a017" />
                  </span>
                ) : null}
                {trancado ? (
                  <span aria-hidden="true" style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', background: 'rgba(5,8,16,0.55)', color: '#f0c94a' }}>
                    <Lock size={16} />
                  </span>
                ) : null}
              </div>
              {/* Nome */}
              <span style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 10, fontWeight: 700, color: trancado ? 'var(--label-color)' : '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {kit.nome}
              </span>
            </button>
          );
        })}
      </FaixaRolavel>
  );
}
