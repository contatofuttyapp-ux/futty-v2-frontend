// Futty v2.0 — Figurinha: o modal "Sua foto" (a foto atual, o estado da figurinha, trocar e ajustar a foto, e "Minhas figurinhas"),
// num portal no body.
import { createPortal } from 'react-dom';
import { Camera, X, RefreshCw } from 'lucide-react';
import { urlAsset, urlImagem } from '../../utils/avatar';
import { EstrelaIA } from './constantes';

export default function ModalDaFoto({ abrirAjustarEnquadramento, ajustandoEnquadramento, avatarEhIA, fileRef, fotoLocal, fotoOriginal, gerandoIA, historico, me, modalFoto, setModalFoto, temFigurinhaAlguma, temFoto, trocandoModo, trocarModo, uploadFoto, usandoHistoricoId, usarDoHistorico }) {
  return (
    <>
      {modalFoto
        ? createPortal(
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Sua foto"
          onClick={() => setModalFoto(false)}
          /* Velocidade 8: a 0,85 de preto por cima, o blur de 4px não se via —
             pagava-se uma camada de composição de ecrã inteiro para nada.
             Achado 124 (29K): overflow hidden + overscroll-behavior contain — sem isso, um arrasto no véu encadeia
             a rolagem para o body por trás (WebKit), e ao fechar a página fica numa posição que não bate. */
          style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, overflow: 'hidden', overscrollBehavior: 'contain' }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="hud-corners"
            style={{ position: 'relative', width: '100%', maxWidth: 360, background: 'linear-gradient(180deg, #14121c, #0b0a12)', border: '1px solid rgba(212,160,23,0.35)', padding: '22px 20px 20px' }}
          >
            <button
              type="button"
              aria-label="Fechar"
              onClick={() => setModalFoto(false)}
              style={{ position: 'absolute', top: 12, right: 12, width: 32, height: 32, borderRadius: 10, border: '1px solid #333', background: 'rgba(255,255,255,0.06)', color: '#fff', display: 'grid', placeItems: 'center', cursor: 'pointer', zIndex: 1 }}
            >
              <X size={16} />
            </button>

            {/* (i) Losango decorativo no canto sup. direito, com o twinkle existente. */}
            <span
              className="fig-dot-twinkle"
              aria-hidden="true"
              style={{ position: 'absolute', top: 18, right: 52, width: 8, height: 8, borderRadius: 1, transform: 'rotate(45deg)', background: 'linear-gradient(135deg, #f5e070, #d4a017)', pointerEvents: 'none' }}
            />
            <h3 style={{ margin: '0 0 6px', fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, fontSize: 20, letterSpacing: '0.04em', color: '#fff', textAlign: 'center' }}>Sua foto</h3>
            {/* (h) Linha HUD dourada com degrau — mesma linguagem do header, escala menor. */}
            <svg width="100%" height="6" viewBox="0 0 200 6" preserveAspectRatio="none" aria-hidden="true" style={{ display: 'block', marginBottom: 14 }}>
              <defs>
                <linearGradient id="modalhudline" x1="0" x2="1">
                  <stop offset="0" stopColor="#d4a017" stopOpacity="0.9" />
                  <stop offset="0.6" stopColor="#d4a017" stopOpacity="0.4" />
                  <stop offset="1" stopColor="#d4a017" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d="M0 5 H70 L75 1 H200" stroke="url(#modalhudline)" strokeWidth="1" fill="none" />
            </svg>

            {/* Interruptor "Mostrar minha foto" / "Mostrar minha figurinha": só aparece pra quem já tem uma
                figurinha gerada (mesmo que o card esteja mostrando a foto agora). Um toque troca avatar_url na hora
                — a prévia abaixo segue junto. */}
            {temFigurinhaAlguma ? (
              <div role="radiogroup" aria-label="O que o card mostra" style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                <button
                  type="button"
                  role="radio"
                  aria-checked={!avatarEhIA}
                  disabled={trocandoModo}
                  onClick={() => trocarModo('foto')}
                  className="hud-corners-s"
                  style={{
                    flex: 1, padding: '9px 6px', fontSize: 12, fontWeight: 700, cursor: trocandoModo ? 'default' : 'pointer',
                    background: !avatarEhIA ? 'rgba(212,160,23,0.14)' : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${!avatarEhIA ? 'rgba(212,160,23,0.6)' : 'rgba(255,255,255,0.14)'}`,
                    color: !avatarEhIA ? '#f0c94a' : 'rgba(255,255,255,0.75)',
                    opacity: trocandoModo ? 0.6 : 1,
                  }}
                >
                  Mostrar minha foto
                </button>
                <button
                  type="button"
                  role="radio"
                  aria-checked={avatarEhIA}
                  disabled={trocandoModo}
                  onClick={() => trocarModo('figurinha')}
                  className="hud-corners-s"
                  style={{
                    flex: 1, padding: '9px 6px', fontSize: 12, fontWeight: 700, cursor: trocandoModo ? 'default' : 'pointer',
                    background: avatarEhIA ? 'rgba(212,160,23,0.14)' : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${avatarEhIA ? 'rgba(212,160,23,0.6)' : 'rgba(255,255,255,0.14)'}`,
                    color: avatarEhIA ? '#f0c94a' : 'rgba(255,255,255,0.75)',
                    opacity: trocandoModo ? 0.6 : 1,
                  }}
                >
                  Mostrar minha figurinha
                </button>
              </div>
            ) : null}

            {/* Preview da foto actual (cantos 45° coerentes com o sistema visual) */}
            {fotoOriginal ? (
              // contain + fundo escuro sólido → mostra a pessoa INTEIRA, sem cortar topo/base.
              /*
               * Moldura ADAPTATIVA: sem height fixa, o container cresce com a foto (o maxHeight trava as muito
               * altas). As barras que sobrem em #0d0d12 lêem como moldura intencional, não como corte.
               */
              <div className="hud-corners" style={{ width: '100%', background: '#0d0d12' }}>
                <img
                  // Logo depois de trocar a foto/o enquadramento o preview é o LOCAL (o recorte que o servidor acabou de
                  // confirmar). Trocar só o src deixava a foto ANTIGA na tela até o derivado novo chegar pelo proxy.
                  src={fotoLocal || urlImagem(urlAsset(fotoOriginal), 512)}
                  alt="Sua foto"
                  style={{ width: 'auto', height: 'auto', maxWidth: '100%', maxHeight: '46vh', objectFit: 'contain', display: 'block', margin: '0 auto' }}
                />
              </div>
            ) : (
              <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--label-color)', fontSize: 13 }}>Você ainda não tem foto.</div>
            )}

            {/* Estado do card — prévia ao vivo do que os outros veem (muda na hora com o interruptor acima, sem
                esperar reload). */}
            <div style={{ marginTop: 14 }}>
              {avatarEhIA ? (
                /* (j) Badge com glow dourado suave — mesma família dos dots. */
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 10, background: 'linear-gradient(90deg, rgba(139,92,246,0.18), rgba(212,160,23,0.12))', border: '1px solid rgba(139,92,246,0.4)', boxShadow: '0 0 12px rgba(212,160,23,0.22)' }}>
                  <img
                    src={urlImagem(urlAsset(me?.user?.avatar_url), 128, { quadrado: true })}
                    alt="Figurinha"
                    width={48}
                    height={48}
                    decoding="async"
                    loading="lazy"
                    style={{ width: 48, height: 48, borderRadius: 8, objectFit: 'contain', border: '1px solid rgba(212,160,23,0.5)', flex: 'none', background: '#0d0d12' }}
                  />
                  <div style={{ display: 'grid', gap: 3 }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: '#d4a017' }}>
                      <EstrelaIA size={14} color="#d4a017" /> Figurinha ativa
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--label-color)' }}>Gerado a partir desta foto</span>
                  </div>
                </div>
              ) : temFigurinhaAlguma ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.14)' }}>
                  <img
                    src={urlImagem(urlAsset(me?.user?.avatar_url), 128, { quadrado: true })}
                    alt="Sua foto"
                    width={48}
                    height={48}
                    decoding="async"
                    loading="lazy"
                    style={{ width: 48, height: 48, borderRadius: 8, objectFit: 'contain', border: '1px solid rgba(255,255,255,0.2)', flex: 'none', background: '#0d0d12' }}
                  />
                  <div style={{ display: 'grid', gap: 3 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>Mostrando sua foto</span>
                    <span style={{ fontSize: 11, color: 'var(--label-color)' }}>Sua figurinha continua guardada</span>
                  </div>
                </div>
              ) : (
                <p style={{ margin: 0, textAlign: 'center', fontSize: 12, color: 'var(--label-color)' }}>Você ainda não gerou sua figurinha.</p>
              )}
            </div>

            {/* "Minhas figurinhas": até 6, miniaturas + "Usar esta"
                (sem custo — troca avatar_url/kit_ativo, respeita card_modo).
                Some sozinha sem histórico (conta nova, ou 057 por aplicar). */}
            {historico.length ? (
              <div style={{ marginTop: 16 }}>
                <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--label-color)' }}>
                  Minhas figurinhas
                </p>
                <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 2 }}>
                  {historico.map((item) => {
                    const emUso = item.avatar_url === me?.user?.avatar_url;
                    const carregando = usandoHistoricoId === item.id;
                    return (
                      <div key={item.id} style={{ flex: '0 0 auto', width: 72, display: 'grid', gap: 4, justifyItems: 'center' }}>
                        <img
                          src={urlImagem(urlAsset(item.avatar_url), 128, { quadrado: true })}
                          alt="Figurinha antiga"
                          width={64}
                          height={64}
                          style={{ width: 64, height: 64, borderRadius: 8, objectFit: 'cover', border: `1px solid ${emUso ? 'rgba(212,160,23,0.7)' : 'rgba(255,255,255,0.16)'}`, background: '#0d0d12' }}
                        />
                        <button
                          type="button"
                          className="btn btn--sm hud-corners-s"
                          style={{ width: '100%', fontSize: 10, padding: '4px 2px', opacity: emUso ? 0.6 : 1 }}
                          disabled={emUso || carregando || !!usandoHistoricoId}
                          onClick={() => usarDoHistorico(item)}
                        >
                          {emUso ? 'Em uso' : carregando ? '…' : 'Usar esta'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {/* Duas ações (ordem do dono): "Escolher outra foto" leva ao CropModal 2:3; "Ajustar enquadramento"
                reabre o MESMO CropModal sobre a foto original guardada, sem upload novo. A 2ª só existe havendo
                foto (nada para ajustar sem ela). */}
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button
                type="button"
                className="btn btn--purple"
                style={{ flex: 1, height: 46, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 13 }}
                disabled={uploadFoto || gerandoIA}
                onClick={() => fileRef.current?.click()}
              >
                <Camera size={16} /> Escolher outra foto
              </button>
              {temFoto ? (
                <button
                  type="button"
                  className="btn btn--purple-outline"
                  style={{ flex: 1, height: 46, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 13 }}
                  disabled={uploadFoto || gerandoIA || ajustandoEnquadramento}
                  onClick={abrirAjustarEnquadramento}
                >
                  <RefreshCw size={16} /> {ajustandoEnquadramento ? 'Abrindo…' : 'Ajustar enquadramento'}
                </button>
              ) : null}
            </div>
          </div>
        </div>,
        document.body
          )
        : null}
    </>
  );
}
