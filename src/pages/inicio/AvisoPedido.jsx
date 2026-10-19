// Futty v2.0 — Início: o aviso de pedido de entrada na fila.
import { plural } from '../../utils/plural';
import Icon from '../../components/Icon';
import { subDoAviso, textoDoAviso } from './estilos';

export default function AvisoPedido({ aviso, cancelarPedidoPendente }) {
  return (
    <>
        {aviso?.tipo === 'pedido' ? (
          <div data-aviso="pedido" className="hud-corners" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', marginBottom: 12, background: 'rgba(139,92,246,0.06)', border: '1px solid rgba(139,92,246,0.28)' }}>
            <span style={{ flexShrink: 0, display: 'grid', placeItems: 'center' }}>
              <Icon name="espera" size={18} color="#b69cff" />
            </span>
            <span style={textoDoAviso}>
              <span style={{ display: 'block', fontFamily: "'Rajdhani', sans-serif", fontWeight: 800, fontSize: 14, color: '#c9c2d6' }}>
                Pedido pendente na {aviso.item.team?.nome}
              </span>
              <span style={subDoAviso}>
                Esperando a aprovação do admin. Avisamos você aqui quando decidir.
              </span>
            </span>
            {aviso.mais > 0 ? (
              <span data-aviso-mais aria-label={`Mais ${aviso.mais} ${plural(aviso.mais, 'pedido pendente', 'pedidos pendentes')}`} style={{ flexShrink: 0, fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, fontSize: 12, letterSpacing: '0.04em', color: 'var(--text-dim)', border: '1px solid rgba(255,255,255,0.18)', padding: '1px 7px', borderRadius: 2 }}>+{aviso.mais}</span>
            ) : null}
            <button type="button" onClick={() => cancelarPedidoPendente(aviso.item)} style={{ border: '1px solid rgba(255,255,255,0.18)', background: 'transparent', color: 'var(--text-dim)', cursor: 'pointer', fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, fontSize: 12, letterSpacing: '0.04em', textTransform: 'uppercase', padding: '6px 12px', flexShrink: 0, borderRadius: 2 }}>
              Cancelar
            </button>
          </div>
        ) : null}
    </>
  );
}
