// Futty v2.0 — o cartão discreto do Início para o DONO de time: "Figurinhas pro time todo". Uma linha, um botão para o
// Pacote do time nos Planos (com a loja ligada é onde se compra; sem ela, onde se pede) e um X que o esconde por 7 dias
// naquele aparelho (utils/lembretes.js, com try/catch). Jogador comum nunca vê: o pacote é comprado pelo dono.
import { Link } from 'react-router-dom';
import { X } from 'lucide-react';
import { linhaDoPacote } from '../utils/pacoteNoInicio';

export default function CartaoPacoteInicio({ timesDoDono, onFechar }) {
  return (
    <div
      data-cartao-pacote-inicio
      className="hud-corners"
      // Sem ícone e com o X rente à borda: a 360 px o título "Figurinhas pro time todo" cabe numa linha só (nome de cartão não quebra em duas).
      style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 4px 10px 14px', margin: '12px 0', background: 'rgba(212,160,23,0.06)', border: '1px solid rgba(212,160,23,0.3)' }}
    >
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'block', fontFamily: "'Rajdhani', sans-serif", fontWeight: 800, fontSize: 14.5, whiteSpace: 'nowrap', color: '#f0c94a' }}>Figurinhas pro time todo</span>
        <span style={{ display: 'block', fontSize: 11.5, lineHeight: 1.35, color: 'var(--text-dim)', marginTop: 2 }}>{linhaDoPacote(timesDoDono)}</span>
      </span>
      <Link
        to="/planos?destaque=pacote"
        className="btn btn--sm hud-corners-s cta-gold"
        style={{ flexShrink: 0, padding: '0 12px', fontFamily: "'Rajdhani', sans-serif", letterSpacing: '0.06em', textDecoration: 'none' }}
      >
        Ver pacote
      </Link>
      <button
        type="button"
        // Nome próprio de propósito: o aviso de notificações do Início já tem um botão "Fechar", e dois com o mesmo nome confundem leitor de tela.
        aria-label="Esconder o convite do pacote"
        data-fechar-pacote
        onClick={onFechar}
        style={{ flexShrink: 0, width: 32, height: 32, display: 'grid', placeItems: 'center', border: 'none', background: 'transparent', color: 'var(--text-dim)', cursor: 'pointer' }}
      >
        <X size={16} aria-hidden="true" />
      </button>
    </div>
  );
}
