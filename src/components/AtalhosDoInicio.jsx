// Futty v2.0 — Rodada 29Q: os dois atalhos do Início, "Radar de peladas" e "Criar time", em dois cartões lado a lado logo embaixo do
// card "Seus times" (para quem não administra time, embaixo do avatar, do nome e da nota). Antes eram os dois últimos chips da fila de
// filtro dos jogos, onde ninguém chegava ("definitivamente no lugar errado", dono, 4-out). O cartão inteiro é o link (área de toque cheia).
// Visual da casa: vidro, chanfro de 45° (.hud-corners), Rajdhani. O Radar veste o roxo da casa; o Criar time, o dourado (decisão do dono).
import { Link } from 'react-router-dom';
import { CirclePlus, Radar } from 'lucide-react';

const RAJ = "'Rajdhani', sans-serif";

function Cartao({ para, Icone, cor, borda, rotulo, chamada, id }) {
  return (
    <Link
      to={para}
      className="hud-corners"
      data-atalho-do-inicio={id}
      style={{ display: 'grid', alignContent: 'start', gap: 4, minWidth: 0, padding: '10px 10px', textDecoration: 'none', color: 'inherit', background: 'rgba(255,255,255,0.03)', border: `1px solid ${borda}` }}
    >
      {/* O rótulo cabe numa linha até nos 360 px dos Androids menores (medido na prova); se um dia não couber, quebra em vez de cortar. */}
      <span style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
        <Icone size={16} strokeWidth={2} color={cor} aria-hidden="true" style={{ flexShrink: 0 }} />
        <span style={{ fontFamily: RAJ, fontWeight: 800, fontSize: 15, lineHeight: 1.15, color: '#fff' }}>{rotulo}</span>
      </span>
      <span style={{ fontSize: 12, lineHeight: 1.35, color: 'var(--text-dim)' }}>{chamada}</span>
    </Link>
  );
}

export default function AtalhosDoInicio() {
  return (
    <div data-atalhos-do-inicio style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
      <Cartao id="radar" para="/explorar" Icone={Radar} cor="#8b5cf6" borda="rgba(139,92,246,0.45)" rotulo="Radar de peladas" chamada="Encontre uma pelada perto de você" />
      <Cartao id="criar-time" para="/criar-time" Icone={CirclePlus} cor="#d4a017" borda="rgba(212,160,23,0.45)" rotulo="Criar time" chamada="Organize o jogo da sua galera" />
    </div>
  );
}
