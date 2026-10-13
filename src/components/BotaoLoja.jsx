// Futty v2.0 — o botão "Loja" do topo da Figurinha. Sempre à vista, para todo mundo, em qualquer estado da
// pessoa: a compra não pode depender de ter figurinha, de ser dono de time ou de achar um link no Perfil.
// Leva à tela de Planos, que com a loja ligada é onde se compra e sem ela é onde se pede.
import { Link } from 'react-router-dom';
import { ShoppingBag } from 'lucide-react';

export default function BotaoLoja() {
  return (
    <Link
      to="/planos"
      data-botao-loja
      aria-label="Loja de figurinhas"
      className="hud-corners-s"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        height: 30,
        padding: '0 11px 0 9px',
        textDecoration: 'none',
        fontFamily: "'Rajdhani', sans-serif",
        fontWeight: 700,
        fontSize: 13,
        letterSpacing: '0.06em',
        color: '#f0c94a',
        background: 'rgba(212,160,23,0.1)',
        border: '1px solid rgba(212,160,23,0.5)',
        whiteSpace: 'nowrap',
      }}
    >
      <ShoppingBag size={15} aria-hidden="true" />
      Loja
    </Link>
  );
}
