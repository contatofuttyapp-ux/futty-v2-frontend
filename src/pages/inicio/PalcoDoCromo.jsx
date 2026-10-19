// Futty v2.0 — Início: o palco do cromo (o cromo, o nome e o que fica em volta dele).
import { RefreshCw } from 'lucide-react';
import { SEM_NOTA, formatRating } from '../../utils/format';
import { plural } from '../../utils/plural';
import { CromoInicio } from './CromoInicio';
import { NomeCromo } from './NomeCromo';

export default function PalcoDoCromo({ cromo, cromoAvatarEhIA, cromoFundo, dadosInicio, destinoCromo, modoDoCromo, nome, previaCromo, refCromo, setSheetAvatarAberto, stats, teams, user }) {
  return (
        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, margin: '8px 0 18px', paddingTop: 'var(--space-lg)' }}>
          <div className="inicio-vline" aria-hidden="true" />
          <div style={{ position: 'relative', display: 'inline-block' }}>
            {/* O cromo abre a VITRINE, não a oficina.
                O cromo é o retrato da pessoa como jogadora; o destino natural
                de tocar nele é a página que mostra o que ela fez (nota, gols,
                conquistas), a mesma que se abre pelo avatar no Ranking. Editar
                a figurinha continua a um toque, na aba Figurinha da barra de
                baixo. Sem time não há vitrine (ela vive dentro de um time): aí
                o destino é a Figurinha, e sem conta nenhuma, criar o time. */}
            <CromoInicio cromo={cromo} previa={previaCromo} modoPrevia={modoDoCromo} fundo={cromoFundo} nome={nome} refCromo={refCromo} destino={destinoCromo.to} destinoLabel={destinoCromo.label} />
            {/* Trocar visual — só quando o card veste o GENÉRICO (sem Brilhante
                e sem foto). Com foto, o card é a figurinha comum e não há
                visual alternativo para trocar: quem manda é a foto. */}
            {!cromoAvatarEhIA && !user?.foto_url ? (
              <button
                type="button"
                className="hud-corners-s"
                aria-label="Trocar visual do card"
                onClick={() => setSheetAvatarAberto(true)}
                style={{ position: 'absolute', top: 6, right: 6, zIndex: 2, display: 'flex', alignItems: 'center', gap: 5, padding: '5px 9px 5px 7px', border: '1px solid rgba(212,160,23,0.5)', background: 'rgba(13,13,18,0.82)', color: '#d4a017', cursor: 'pointer', fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, fontSize: 10.5, letterSpacing: '0.02em', whiteSpace: 'nowrap' }}
              >
                <RefreshCw size={13} />
                Trocar avatar
              </button>
            ) : null}
          </div>
          <NomeCromo nome={nome} />
          {/* Com o card "Seus times" logo abaixo, o nome do time sai daqui: o card já diz o time. */}
          {teams[0] && !(dadosInicio?.seu_time || []).length ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: 'var(--text-dim)' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--neon)' }} />
              {teams[0].nome}
            </div>
          ) : null}
          <div className="inicio-stats">
            <span className="nota">{stats ? formatRating(stats.nota) : SEM_NOTA}</span>
            <span>·</span>
            <span>
              <b>{stats?.jogos ?? 0}</b> {plural(stats?.jogos ?? 0, 'jogo', 'jogos')}
            </span>
            <span>·</span>
            <span>
              <b>{stats?.gols ?? 0}</b> {plural(stats?.gols ?? 0, 'gol', 'gols')}
            </span>
          </div>
        </div>
  );
}
