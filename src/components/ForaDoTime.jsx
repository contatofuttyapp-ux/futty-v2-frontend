// Futty v2.0 — O aviso de quem abriu o jogo, o ranking ou o elenco de um time do qual não faz parte (utils/foraDoTime.js). Sem
// "Tentar de novo": repetir não muda nada. O caminho é voltar ao Início.
import { Lock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { APOIO_FORA_DO_TIME, FRASE_FORA_DO_TIME } from '../utils/foraDoTime';
import '../styles/app.css';

export default function ForaDoTime({ compacto = false }) {
  return (
    <div
      role="alert"
      data-fora-do-time
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, textAlign: 'center', padding: compacto ? '24px 18px' : '48px 24px' }}
    >
      <Lock size={38} strokeWidth={1.6} color="#d4a017" style={{ opacity: 0.8 }} aria-hidden="true" />
      <p style={{ margin: 0, fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, fontSize: 17, color: '#fff', maxWidth: 300 }}>{FRASE_FORA_DO_TIME}</p>
      <p className="texto-apoio" style={{ margin: 0, maxWidth: 300 }}>{APOIO_FORA_DO_TIME}</p>
      <Link to="/home" className="btn btn--purple-outline hud-corners" style={{ height: 40, padding: '0 20px', fontSize: 13, display: 'inline-flex', alignItems: 'center', textDecoration: 'none' }}>
        Ir para o Início
      </Link>
    </div>
  );
}
