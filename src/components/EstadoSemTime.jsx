// Futty v2.0 — Estado REUTILIZÁVEL de "sem time": Ranking e Resenha nascem do
// time, então sem um a mostrar não é "vazio genérico" — é o convite a criar ou
// entrar, com identidade própria por página (ícone + texto). Os CTAs são os
// mesmos do EmptyState do Início (mesma receita dourada): a única ação real
// da tela é a mesma em toda a casa, só muda o porquê.
import { Link } from 'react-router-dom';
import Icon from './Icon';

export default function EstadoSemTime({ icone, mensagem }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, textAlign: 'center', padding: '48px 24px' }}>
      <Icon name={icone} size={48} color="#d4a017" style={{ opacity: 0.9 }} />
      <p className="muted" style={{ margin: 0, fontSize: 14, lineHeight: 1.5, maxWidth: 280 }}>{mensagem}</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%', maxWidth: 320, marginTop: 8 }}>
        {/* Glow no wrapper, recorte no botão — clip-path corta sombras (ver .cta-gold). */}
        <div className="cta-gold-glow" style={{ display: 'flex' }}>
          <Link to="/criar-equipa" className="btn hud-corners cta-gold" style={{ flex: 1 }}>
            ＋ Criar meu time
          </Link>
        </div>
        <Link to="/explorar" className="btn btn--purple hud-corners">
          Explorar peladas
        </Link>
      </div>
    </div>
  );
}
