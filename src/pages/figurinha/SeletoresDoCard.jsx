// Futty v2.0 — Figurinha: as abas do card com figurinha (fundo, uniforme…) e os seletores de cada uma.
import { geracoesPorExtenso } from '../../utils/totalDeGeracoes';
import FaixaRolavel from '../../components/FaixaRolavel';
import { FUNDOS, FUNDO_BG, TABS } from './constantes';

export default function SeletoresDoCard({ activeTab, avatarEhIA, epicoTile, escolherFundo, fundo, gerandoIA, goldenTile, gradeDeUniformes, kitDoCard, refazerAtual, royalTile, setActiveTab, setKitParaPintar, temFoto, totalGeracoes }) {
  return (
    <>
          {avatarEhIA ? (
          <>
          <div style={{ display: 'flex', gap: 6 }}>
            {TABS.map((t) => {
              const on = activeTab === t.k;
              return (
                <button
                  key={t.k}
                  type="button"
                  className="hud-corners-s"
                  onClick={() => setActiveTab(t.k)}
                  aria-pressed={on}
                  style={{
                    flex: 1,
                    height: 36,
                    border: on ? '1px solid var(--border-accent)' : '1px solid transparent',
                    background: on ? 'rgba(139,92,246,0.2)' : 'transparent',
                    color: on ? '#8b5cf6' : 'var(--label-color)',
                    fontFamily: "'Rajdhani', sans-serif",
                    fontWeight: 700,
                    fontSize: 13,
                    letterSpacing: '0.5px',
                    textTransform: 'uppercase',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {t.label}
                </button>
              );
            })}
          </div>

          {/* Painel da tab activa */}
          {activeTab === 'fundo' ? (
            // UMA linha só, scroll horizontal (nunca 2 linhas — ordem do dono). Tiles com largura FIXA (não fração
            // do container) para não encolher/quebrar; scroll-snap para o gesto de arrastar assentar num tile de
            // cada vez. Grade partilhada com a tab Uniforme (.fig-seletor-grade / .fig-seletor-tile em app.css) —
            // ver a nota ali.
            <FaixaRolavel className="fig-seletor-grade" envoltorioClassName="faixa-rolavel--grade" data-grade="fundos" rotuloMais="Ver mais fundos" rotuloAnteriores="Ver fundos anteriores">
              {FUNDOS.map((f) => {
                const sel = fundo === f.k;
                // Nenhum cadeado aqui: os 6 fundos são de quem tem Brilhante (§4), e este seletor só existe com
                // Brilhante.
                return (
                  <button
                    key={f.k}
                    type="button"
                    className="fig-seletor-tile"
                    onClick={() => escolherFundo(f.k)}
                    aria-pressed={sel}
                    style={{
                      opacity: sel ? 1 : 0.55, // não-seleccionado mais discreto
                      // glow da selecção no PAI (drop-shadow segue o recorte a 45°;
                      // um box-shadow no thumb seria cortado pelo clip-path).
                      filter: sel ? 'drop-shadow(0 0 7px rgba(212,160,23,0.55))' : 'none',
                    }}
                  >
                    {/* Thumbnail quadrado (cantos 45° — identidade HUD) */}
                    <div className="hud-corners-s" style={{
                      position: 'relative',
                      width: '100%',
                      aspectRatio: '1 / 1',
                      // Épico, Golden e Royal mostram o FUNDO REAL renderizado (fallback = gradiente base).
                      background: f.k === 'golden' && goldenTile
                        ? `url(${goldenTile})`
                        : f.k === 'royal' && royalTile
                          ? `url(${royalTile})`
                          : f.k === 'gradiente' && epicoTile ? `url(${epicoTile})` : FUNDO_BG[f.k],
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      border: sel ? '2px solid #d4a017' : '1px solid var(--border-subtle)',
                      filter: sel ? 'none' : 'saturate(0.7) brightness(0.85)',
                    }}>
                    </div>
                    {/* Nome */}
                    <span style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 10, fontWeight: 700, color: sel ? '#fff' : 'var(--label-color)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {f.label}
                    </span>
                  </button>
                );
              })}
            </FaixaRolavel>
          ) : (
            // Grade partilhada com a tab Fundo (.fig-seletor-grade / .fig-seletor-tile em app.css). A MESMA grade
            // nos três casos (grátis, pacote do time, Minha Figurinha) — o que não se pode pintar aparece com
            // cadeado (leva à Minha Figurinha) em vez de sumir. No pacote não há cartão de texto à parte: o
            // uniforme do time é o tile aberto, e o "Refazer" é uma ação pequena embaixo da grade.
            <>
              {gradeDeUniformes()}
              {refazerAtual ? (
                <button
                  type="button"
                  data-acao="refazer"
                  className="btn btn--ghost btn--sm"
                  style={{ justifySelf: 'center', fontSize: 12, padding: '4px 12px', opacity: 0.85 }}
                  disabled={gerandoIA}
                  onClick={() => setKitParaPintar(kitDoCard)}
                >
                  Refazer {kitDoCard.nome} · {geracoesPorExtenso(totalGeracoes)}
                </button>
              ) : null}
            </>
          )}
          </>
          ) : temFoto ? (
            // Card com a FOTO: sem seletor de fundos (o fundo é o da própria foto) e, no lugar
            // do "Pedir a minha", os uniformes — o 1º liberado, os outros com cadeado (ver gradeDeUniformes).
            <div style={{ display: 'grid', gap: 8 }}>
              <span style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--label-color)' }}>
                Uniforme da figurinha
              </span>
              {gradeDeUniformes()}
            </div>
          ) : null}
    </>
  );
}
