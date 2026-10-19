// Futty v2.0 — Figurinha: Baixar e Compartilhar o cromo.
import { Download, Share2 } from 'lucide-react';

export default function BotoesDoCromo({ baixar, busy, partilhar }) {
  return (
          <div style={{ display: 'flex', gap: 12 }}>
            {/* Baixar RECUA: borda roxa mais fraca + texto a 85% → secundário mas presente. */}
            <button
              type="button"
              className="btn btn--purple-outline hud-corners"
              data-acao="baixar"
              style={{ flex: 1, height: 46, borderWidth: '1.5px', borderColor: 'rgba(139,92,246,0.5)', color: 'rgba(255,255,255,0.85)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
              disabled={busy}
              onClick={baixar}
            >
              <Download size={16} /> {busy ? 'Gerando…' : 'Baixar'}
            </button>
            {/* CTA dourado partilhado com o "Assinar Pro" dos Planos: gradiente, texto, altura, glow e shine vivem
                em .cta-gold/.cta-gold-glow (app.css). O glow fica no wrapper SEM clip porque o clip-path do botão
                cortaria a sombra. */}
            <div className="cta-gold-glow" style={{ flex: 1, display: 'flex' }}>
              <button
                type="button"
                className="btn hud-corners cta-gold"
                style={{ flex: 1 }}
                disabled={busy}
                onClick={partilhar}
              >
                <Share2 size={16} /> {busy ? 'Gerando…' : 'Compartilhar'}
              </button>
            </div>
          </div>
  );
}
