// Futty v2.0 — "Traga seu histórico" (fase 1, atendimento à mão): o admin de um time novo que já tem histórico em planilha ou outro app
// manda por e-mail e a equipe coloca no time. Aparece na festa do "Criar time" e nos vazios do Ranking e da Resenha, só para o admin.
// O X fecha para aquele time e ele não volta (neste aparelho). Cada toque em "Enviar por e-mail" é contado no motor (de onde veio), para
// saber se vale fazer a fase 2 — mas a contagem nunca segura o e-mail: o pedido sai sem esperar resposta.
import { useState } from 'react';
import { Mail, X } from 'lucide-react';
import { apiFetch } from '../lib/api';
import { emailDoHistorico, fecharHistorico, historicoFechado } from '../utils/mensalidade';

export default function TragaSeuHistorico({ team, origem, style = null }) {
  const [fechado, setFechado] = useState(() => historicoFechado(team?.id));
  if (!team?.id || !team?.slug || fechado) return null;

  function enviar() {
    apiFetch(`/api/teams/${team.slug}/historico/interesse`, { method: 'POST', body: JSON.stringify({ origem }) }).catch(() => {});
    window.location.href = emailDoHistorico(team);
  }

  return (
    <div data-traga-historico={origem} className="hud-corners" style={{ position: 'relative', padding: '14px 40px 14px 14px', display: 'grid', gap: 10, textAlign: 'left', background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.35)', ...style }}>
      <button type="button" data-fechar-historico aria-label="Fechar" onClick={() => { fecharHistorico(team.id); setFechado(true); }}
        style={{ position: 'absolute', top: 6, right: 6, width: 32, height: 32, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer' }}>
        <X size={16} aria-hidden="true" />
      </button>
      <span style={{ fontSize: 14, lineHeight: 1.45, color: '#e9e4f5' }}>
        Já tem histórico em planilha ou outro app? Manda pra gente que a gente coloca no seu time.
      </span>
      <button type="button" data-enviar-historico className="btn btn--sm btn--outline hud-corners-s" onClick={enviar}
        style={{ justifySelf: 'start', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
        <Mail size={15} aria-hidden="true" /> Enviar por e-mail
      </button>
    </div>
  );
}
