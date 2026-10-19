// Futty v2.0 — Início: o desfecho de um pedido de entrada (aceito ou recusado).
import { Link } from 'react-router-dom';
import { plural } from '../../utils/plural';
import { subDoAviso, textoDoAviso } from './estilos';

export default function AvisoDesfecho({ aviso, dispensarDesfecho }) {
  return (
    <>
        {(aviso?.tipo === 'desfecho' ? [aviso.item] : []).map((p) => (
          <div key={p.id} data-aviso="desfecho" className="hud-corners" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', marginBottom: 12, background: p.status === 'approved' ? 'rgba(123,216,143,0.08)' : 'rgba(255,255,255,0.03)', border: p.status === 'approved' ? '1px solid rgba(123,216,143,0.5)' : '1px solid rgba(255,255,255,0.14)' }}>
            <span style={textoDoAviso}>
              <span style={{ display: 'block', fontFamily: "'Rajdhani', sans-serif", fontWeight: 800, fontSize: 14, color: p.status === 'approved' ? '#7bd88f' : '#c9c2d6' }}>
                {p.status === 'approved' ? `Você entrou no time ${p.team?.nome}!` : `O pedido para ${p.team?.nome} não seguiu`}
              </span>
              <span style={subDoAviso}>
                {p.status === 'approved' ? 'O admin aceitou seu pedido, bem-vindo.' : 'Sem drama: há mais times no "Radar de peladas".'}
              </span>
            </span>
            {/* Quem foi aceito entra no time como primeira entrada (abre as boas-vindas do time). */}
            {p.status === 'approved' && p.team?.slug ? (
              <Link to={`/time/${p.team.slug}`} state={{ primeiraEntrada: true }} className="btn btn--sm hud-corners-s cta-gold" style={{ fontFamily: "'Rajdhani', sans-serif", letterSpacing: '0.06em', textDecoration: 'none', flexShrink: 0 }} onClick={() => dispensarDesfecho(p.id)}>
                Ir ao time
              </Link>
            ) : null}
            {aviso.mais > 0 ? (
              <span data-aviso-mais aria-label={`Mais ${aviso.mais} ${plural(aviso.mais, 'aviso de pedido', 'avisos de pedidos')}`} style={{ flexShrink: 0, fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, fontSize: 12, letterSpacing: '0.04em', color: 'var(--text-dim)', border: '1px solid rgba(255,255,255,0.18)', padding: '1px 7px', borderRadius: 2 }}>+{aviso.mais}</span>
            ) : null}
            <button type="button" aria-label="Dispensar" onClick={() => dispensarDesfecho(p.id)} style={{ border: 'none', background: 'transparent', color: 'var(--text-dim)', cursor: 'pointer', fontSize: 16, lineHeight: 1, flexShrink: 0 }}>✕</button>
          </div>
        ))}
    </>
  );
}
