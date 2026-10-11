// Futty v2.0 — O card do campeonato NOVO no Início de todo o time (não só do admin). Toque abre o campeonato.
// Em andamento: nome + a fase e quantos jogos já foram lançados + os 2 primeiros; com a final definida: a final; terminado: o campeão
// (e "Você é campeão!" para quem é do time campeão) por 7 dias. O card do campeonato antigo, de 2 times, é outro e continua onde estava.
import { Link } from 'react-router-dom';
import { Trophy } from 'lucide-react';
import { textosDoCardDoCampeonato } from '../utils/campeonatoInicio';

export default function CardCampeonatoInicio({ campeonato, slug }) {
  const t = textosDoCardDoCampeonato(campeonato);
  const campeao = t.tipo === 'campeao' || t.tipo === 'voce-campeao';
  return (
    <Link
      to={`/time/${slug}/campeonato/${campeonato.id}`}
      className={`inicio-camp hud-corners${t.tipo === 'voce-campeao' ? ' inicio-camp--voce' : ''}`}
      data-card-campeonato={t.tipo}
    >
      {t.destaque ? (
        <div className="inicio-camp__destaque" data-voce-e-campeao>
          <Trophy size={16} aria-hidden="true" />
          <span>{t.destaque}</span>
        </div>
      ) : null}
      <div className="inicio-camp__nome">{campeonato.nome}</div>
      <div className="inicio-camp__linha" data-linha-do-campeonato style={campeao ? { color: '#f0c94a' } : undefined}>
        {campeao && !t.destaque ? <Trophy size={14} aria-hidden="true" style={{ marginRight: 6, verticalAlign: '-2px' }} /> : null}
        {t.linha}
      </div>
      {t.primeiros.length ? (
        <div className="inicio-camp__primeiros" data-primeiros-do-campeonato>
          {t.primeiros.map((p) => (
            <span key={p.pos} className="inicio-camp__primeiro">
              <span className="inicio-camp__pos">{p.pos}º</span>
              <span className="camp-tab__dot" style={{ background: p.cor }} />
              <span className="inicio-camp__time">{p.nome}</span>
              <span className="inicio-camp__pts">{p.pontos}</span>
            </span>
          ))}
        </div>
      ) : null}
      {t.proximo ? (
        <div className="inicio-camp__proximo" data-proximo-jogo>
          <span className="inicio-camp__proximo-k">Próximo jogo:</span>
          <span className="inicio-camp__time-do-jogo"><span className="camp-tab__dot" style={{ background: t.proximo.a.cor }} />{t.proximo.a.nome}</span>
          <span className="inicio-camp__proximo-x">×</span>
          <span className="inicio-camp__time-do-jogo"><span className="camp-tab__dot" style={{ background: t.proximo.b.cor }} />{t.proximo.b.nome}</span>
        </div>
      ) : null}
      <div className="inicio-camp__ver">Toque para ver</div>
    </Link>
  );
}
