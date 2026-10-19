// Futty v2.0 — Início: o aviso de votação aberta (leva ao Ranking).
import { Link } from 'react-router-dom';
import { plural } from '../../utils/plural';
import Icon from '../../components/Icon';
import { subDoAviso, textoDoAviso } from './estilos';

export default function AvisoVotacao({ aviso, fecharVotacao, votacaoTop }) {
  return (
    <>
        {aviso?.tipo === 'votacao' ? (
          <div data-aviso="votacao" className="hud-corners" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', marginBottom: 12, background: 'rgba(212,160,23,0.07)', border: '1px solid rgba(212,160,23,0.45)' }}>
            <span style={{ flexShrink: 0, display: 'grid', placeItems: 'center' }}>
              <Icon name="estrela" size={20} color="#f0c94a" />
            </span>
            <span style={textoDoAviso}>
              <span style={{ display: 'block', fontFamily: "'Rajdhani', sans-serif", fontWeight: 800, fontSize: 14, color: '#f0c94a' }}>
                {votacaoTop.pedido_revotacao ? `Nova temporada de notas no ${votacaoTop.nome}` : 'Você tem colegas para avaliar'}
              </span>
              <span style={subDoAviso}>
                {votacaoTop.pedido_revotacao
                  ? 'Dê sua nota aos companheiros.'
                  : `${plural(votacaoTop.faltam, 'Falta', 'Faltam')} ${votacaoTop.faltam} na ${votacaoTop.nome}: sua nota conta para o ranking.`}
              </span>
            </span>
            <Link to={`/time/${votacaoTop.slug}/ranking`} className="btn btn--sm hud-corners-s cta-gold" style={{ fontFamily: "'Rajdhani', sans-serif", letterSpacing: '0.06em', textDecoration: 'none', flexShrink: 0 }} onClick={fecharVotacao}>
              Avaliar
            </Link>
            <button type="button" aria-label="Dispensar" onClick={fecharVotacao} style={{ border: 'none', background: 'transparent', color: 'var(--text-dim)', cursor: 'pointer', fontSize: 16, lineHeight: 1, flexShrink: 0 }}>✕</button>
          </div>
        ) : null}
    </>
  );
}
