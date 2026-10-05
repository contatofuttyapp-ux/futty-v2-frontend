// Futty v2.0 — Rodada 29S, bloco A (achados 155 e 156): o "ingresso" do jogo no topo do Marcar jogo. Preenche-se enquanto a pessoa digita:
// escudo e nome do time, o dia por extenso, a hora e o local. Visual da casa (vidro, chanfro de 45°, Rajdhani), sem imagem nova.
// Dia e hora SÓ pela dataHora.js (lei da hora do jogo): o rabicho com a cidade do time só aparece quando o relógio do time é outro.
import { MapPin } from 'lucide-react';
import EscudoEquipa from './EscudoEquipa';
import { dadosDoIngresso } from '../utils/novoJogo';

const RAJ = "'Rajdhani', sans-serif";
const CLIP = 'polygon(8px 0, calc(100% - 8px) 0, 100% 8px, 100% calc(100% - 8px), calc(100% - 8px) 100%, 8px 100%, 0 calc(100% - 8px), 0 8px)';
const ROXO = '#c9b6ff';

/**
 * @param {object} props
 * @param {object} [props.team]       o time (escudo, nome, fuso e cidade)
 * @param {string} props.data         'AAAA-MM-DD' digitada (ou '')
 * @param {string} props.hora         'HH:MM' digitada (ou '')
 * @param {string} props.local        o local digitado (ou '')
 * @param {number|null} [props.porTime] jogadores por time SÓ neste jogo (null = o padrão do time)
 */
export default function IngressoDoJogo({ team = null, data, hora, local, porTime = null }) {
  // Dia e hora passam pelo mesmo caminho da hora de qualquer jogo: digitados no relógio do time, lidos no relógio do time.
  const { dia, hora: horaNaTela, rabicho } = dadosDoIngresso({ data, hora, fuso: team?.fuso, cidade: team?.cidade });
  const nomeLocal = String(local ?? '').trim();

  return (
    <div
      data-ingresso
      className="hud-corners"
      style={{ display: 'grid', gap: 10, padding: '12px 14px', marginBottom: 14, clipPath: CLIP, background: 'linear-gradient(135deg, rgba(212,160,23,0.10), rgba(255,255,255,0.03) 60%)', border: '1px solid rgba(212,160,23,0.4)' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <EscudoEquipa team={team || { nome: '' }} size={44} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div data-ingresso-time style={{ fontFamily: RAJ, fontWeight: 800, fontSize: 18, lineHeight: 1.15, color: '#fff', overflowWrap: 'anywhere' }}>{team?.nome || 'Seu time'}</div>
          <div data-ingresso-dia style={{ fontFamily: RAJ, fontWeight: 700, fontSize: 15, color: dia ? '#f0c94a' : 'var(--text-dim)', marginTop: 2 }}>{dia || 'Escolha o dia'}</div>
        </div>
        {/* o "canhoto": a hora em destaque, separada por uma linha pontilhada, como num ingresso */}
        <div style={{ flexShrink: 0, alignSelf: 'stretch', display: 'grid', alignContent: 'center', justifyItems: 'end', paddingLeft: 12, borderLeft: '2px dashed rgba(212,160,23,0.4)', minWidth: 74 }}>
          <div data-ingresso-hora style={{ fontFamily: RAJ, fontWeight: 800, fontSize: 28, lineHeight: 1, color: horaNaTela ? '#fff' : 'var(--text-dim)' }}>{horaNaTela || '--:--'}</div>
          {rabicho ? <div data-ingresso-rabicho style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 3, textAlign: 'right' }}>{rabicho}</div> : null}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0, fontSize: 13, color: nomeLocal ? '#fff' : 'var(--text-dim)' }}>
        <MapPin size={14} aria-hidden="true" style={{ flexShrink: 0, color: '#d4a017' }} />
        <span data-ingresso-local style={{ minWidth: 0, overflowWrap: 'anywhere' }}>{nomeLocal || 'Onde vai ser o jogo'}</span>
      </div>
      {porTime != null ? (
        <span data-ingresso-so-neste style={{ justifySelf: 'start', fontFamily: RAJ, fontWeight: 800, fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: ROXO, border: '1px solid rgba(139,92,246,0.7)', background: 'rgba(139,92,246,0.16)', padding: '2px 8px', borderRadius: 2 }}>{porTime} por time · só neste jogo</span>
      ) : null}
    </div>
  );
}
