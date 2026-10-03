// Futty v2.0 — O dono escolhe o uniforme das figurinhas do time (Pagamentos P2, 26-set).
//
// O pacote comprado na loja chega sem uniforme quando o time ainda não tinha um — e sem uniforme
// ninguém do time gera. Esta tela abre logo depois da compra (Planos), pelo recado do Início e
// pelo botão da Figurinha (/planos?uniforme=<time>). Grava em PUT /api/teams/:slug/brilhante-kit:
// só o dono, só com o pacote ativo, e trocar só enquanto ninguém gerou (o motor diz o porquê).
// Mesma grade dos fundos e uniformes da Figurinha (.fig-seletor-grade, regra de 15-set).
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Check } from 'lucide-react';
import { apiFetch } from '../lib/api';
import { KIT_IMG, KITS_FIGURINHA } from '../utils/kitsFigurinha';
import FaixaRolavel from './FaixaRolavel';

export default function EscolherUniformeTime({ time, aoFechar, aoEscolher }) {
  const [kit, setKit] = useState(time?.brilhante_kit || null);
  const [gravando, setGravando] = useState(false);
  const [erro, setErro] = useState('');

  async function confirmar() {
    if (!kit || gravando) return;
    setGravando(true);
    setErro('');
    try {
      await apiFetch(`/api/teams/${encodeURIComponent(time.slug)}/brilhante-kit`, { method: 'PUT', body: JSON.stringify({ kitId: kit }) });
      aoEscolher?.(kit);
    } catch (e) {
      setErro(e?.message || 'Não deu para gravar o uniforme. Tente de novo.');
    } finally {
      setGravando(false);
    }
  }

  return createPortal(
    <div className="modal-overlay" role="presentation" onClick={() => !gravando && aoFechar?.()}>
      <div className="modal-card" role="dialog" aria-modal="true" aria-labelledby="uniforme-do-time-titulo" style={{ maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-card__inner" style={{ textAlign: 'center', display: 'grid', gap: 12, padding: '18px 14px 16px' }}>
          <h2 id="uniforme-do-time-titulo" style={{ fontFamily: "'Rajdhani', sans-serif", fontWeight: 800, fontSize: 18, margin: 0 }}>
            Uniforme do {time?.nome || 'time'}
          </h2>
          <p style={{ fontSize: 13, color: 'var(--text-dim)', margin: 0, lineHeight: 1.5 }}>
            Todos os jogadores geram a figurinha nesse uniforme. Dá para trocar enquanto ninguém tiver gerado.
          </p>
          <FaixaRolavel className="fig-seletor-grade" data-grade="uniforme-do-time" style={{ width: '100%' }} rotuloMais="Ver mais uniformes" rotuloAnteriores="Ver uniformes anteriores">
            {KITS_FIGURINHA.filter((k) => k.estado !== 'breve').map((k) => {
              const escolhido = k.id === kit;
              return (
                <button
                  key={k.id}
                  type="button"
                  className="fig-seletor-tile"
                  onClick={() => setKit(k.id)}
                  aria-label={k.nome}
                  aria-pressed={escolhido}
                  disabled={gravando}
                >
                  <div className="hud-corners-s" style={{ position: 'relative', width: '100%', aspectRatio: '1 / 1', overflow: 'hidden', background: '#0d0d12', border: escolhido ? '2px solid #d4a017' : '1px solid var(--border-subtle)', filter: escolhido ? 'none' : 'saturate(0.7) brightness(0.85)' }}>
                    {/* Mesmo enquadramento da grade da Figurinha: gola e manga à vista. */}
                    <img
                      src={KIT_IMG[k.id]}
                      alt=""
                      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: '50% 10%', transform: 'scale(0.82) translateY(7%)', transformOrigin: '50% 0%' }}
                    />
                    {escolhido ? (
                      <span style={{ position: 'absolute', top: 3, right: 3, width: 15, height: 15, borderRadius: '50%', background: '#d4a017', color: '#0d0d12', display: 'grid', placeItems: 'center' }}>
                        <Check size={10} strokeWidth={3} />
                      </span>
                    ) : null}
                  </div>
                  <span style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 10, fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {k.nome}
                  </span>
                </button>
              );
            })}
          </FaixaRolavel>
          {erro ? (
            <div role="alert" className="hud-corners-s" style={{ padding: '9px 11px', fontSize: 12.5, lineHeight: 1.4, color: '#f8b4b4', background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.45)' }}>
              {erro}
            </div>
          ) : null}
          <div style={{ display: 'grid', gap: 8, marginTop: 2 }}>
            <span className="cta-gold-glow" style={{ display: 'flex' }}>
              <button type="button" className="btn hud-corners cta-gold" style={{ flex: 1 }} disabled={!kit || gravando} onClick={confirmar}>
                {gravando ? 'Gravando…' : 'Usar este uniforme'}
              </button>
            </span>
            <button type="button" className="btn btn--ghost btn--sm" style={{ width: '100%' }} disabled={gravando} onClick={() => aoFechar?.()}>
              Agora não
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
