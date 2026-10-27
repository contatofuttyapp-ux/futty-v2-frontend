// Futty v2.0 — Início: o card de um jogo (próximos jogos) e o estado vazio de quem ainda não tem time.

import { Link } from 'react-router-dom';
import { Trophy, Users } from 'lucide-react';
import { STATUS_LABELS, formatDateTime } from '../../utils/format';
import { ehHoje } from '../../utils/dataHora';
import { plural } from '../../utils/plural';
import { jogoEmAndamento } from '../../utils/estadoDoJogo';
import { contagemDoSorteio, respostaDoJogo, textoDaListaFechada, textoDoSorteio } from '../../utils/chamada';
import Icon from '../../components/Icon';
import RespostaDoJogo from '../../components/RespostaDoJogo';
import { useAgora } from '../../hooks/useAgora';

// ----- Card de jogo -----
// UM cartão por jogo (regra do dono): local · data · hora · confirmados, a hora do sorteio com a contagem (ou "Lista fechada · N
// confirmados") e o "Vou / Não vou" travado (components/RespostaDoJogo.jsx). Não existe mais o cartão "Confirme presença" à parte.
export function GameCard({ game, busy, isNext, onPresence, onSairEspera = null, onVerSorteio, abrindo = false, index = 0, cidade = null }) {
  const today = ehHoje(game.date, game.fuso); // "hoje" é o dia do campo (fuso do time), não o do aparelho
  // O motor diz o estado (utils/estadoDoJogo.js): o jogo que já começou e ainda não terminou está "em andamento" e não aceita mais presença,
  // como o que terminou — por isso `status === 'finished'` vale para os dois e só o rótulo muda.
  const emAndamento = jogoEmAndamento(game);
  const isPast = game.status === 'finished' && !emAndamento;
  const isDrawn = game.status === 'drawn';
  const going = game.user_status === 'going';
  const notGoing = game.user_status === 'not_going';
  const soOrganizo = game.eu_jogo === false; // só organiza este time — não responde presença
  // A chamada (o motor diz): a lista fecha na hora do sorteio, ou antes se o admin já sorteou. Sem os campos (motor antigo), aberta.
  const aceitaResposta = !isPast && !emAndamento && !isDrawn;
  const listaAberta = game.lista_aberta !== false;
  const agora = useAgora(aceitaResposta && listaAberta && !!game.sorteio_em);
  const contagem = aceitaResposta && listaAberta && game.sorteio_em ? contagemDoSorteio(game.sorteio_em, agora) : null;
  // O relógio passou da hora do sorteio com a tela aberta: fecha aqui também, sem esperar a próxima leitura.
  const aberta = listaAberta && (!game.sorteio_em || contagem != null);

  return (
    // Wrapper e card separados porque o card passou a levar cantos a 45°: a ordem
    // de composição do CSS é filter → clip-path, por isso QUALQUER sombra exterior
    // posta no elemento recortado (box-shadow ou drop-shadow) é cortada com ele.
    // No wrapper, o drop-shadow lê a silhueta já recortada e a sombra ganha também
    // os 45°. É o mesmo par do .cta-gold-glow/.cta-gold. O tilt e a entrada mudam-se
    // para cá com ele; a lógica do jogo não muda uma linha.
    <div
      className={`gcard-lift anim-slide-in ${isNext ? 'gcard-lift--next' : ''}`}
      style={{ animationDelay: `${index * 0.08}s` }}
      onMouseMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const dx = (e.clientX - (rect.left + rect.width / 2)) / (rect.width / 2);
        const dy = (e.clientY - (rect.top + rect.height / 2)) / (rect.height / 2);
        e.currentTarget.style.transform = `perspective(800px) translateY(-4px) scale(1.01) rotateX(${-dy * 3}deg) rotateY(${dx * 3}deg)`;
        e.currentTarget.style.transition = 'none';
        // Blur de drop-shadow ≈ metade do de box-shadow: 32px → 16px, 20px → 10px.
        e.currentTarget.style.filter = 'drop-shadow(0 12px 16px rgba(0,0,0,0.5)) drop-shadow(0 0 10px rgba(212,160,23,0.08))';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = '';
        e.currentTarget.style.transition = '';
        e.currentTarget.style.filter = '';
      }}
    >
      <div className={`gcard hud-corners ${isPast ? 'gcard--past' : ''} ${isNext ? 'gcard--next' : ''}`}>
        {isNext ? <div className="gcard__next-badge hud-corners-s">PRÓXIMO</div> : null}
        <div className="gcard__top">
          {/* O card inteiro abre a tela do jogo. Link de verdade (abre em nova aba, dá para copiar o endereço): o
              <a> está no título e a camada que cobre o card é o ::after dele (.gcard__link, app.css) — os botões
              "Vou / Não vou" e "Ver sorteio" ficam por cima (z-index) e continuam funcionando sem abrir o jogo.
              Sem botão dentro de <a>. */}
          <span className="gcard__title">
            {game.team_slug
              ? <Link className="gcard__link" to={`/time/${game.team_slug}/jogo/${game.id}`} aria-label={`Abrir o jogo ${game.name}`}>{game.name}</Link>
              : game.name}
          </span>
          {game.team_name && <span className="gcard__team">{game.team_name}</span>}
        </div>

        <div className="gcard__meta">
          <span className={`gcard__date ${today ? 'gcard__date--today' : ''}`}>
            {game.date ? formatDateTime(game.date, game.fuso, { cidade }) : 'Data a definir'}
          </span>
          {` · ${game.confirmed_count} ${plural(game.confirmed_count, 'confirmado', 'confirmados')}`}
        </div>

        {/* A hora do sorteio (a lista fecha nela) e a contagem; depois, "Lista fechada · N confirmados". */}
        {aceitaResposta && game.sorteio_em ? (
          <div className="gcard__sorteio" data-sorteio style={{ display: 'flex', flexWrap: 'wrap', gap: '2px 8px', marginTop: 4, fontSize: 13, color: 'var(--text-dim)' }}>
            {aberta ? (
              <>
                <span data-hora-do-sorteio>{textoDoSorteio(game.sorteio_em, game.date, game.fuso)}</span>
                {contagem ? <span data-contagem style={{ color: '#f0c94a', fontWeight: 700 }}>{contagem}</span> : null}
              </>
            ) : (
              <span data-lista-fechada style={{ fontWeight: 700 }}>{textoDaListaFechada(game.confirmed_count)}</span>
            )}
          </div>
        ) : null}

        {emAndamento ? (
          <div className="gcard__drawn" data-em-andamento>
            <span className="badge badge--em-andamento hud-corners-s">{STATUS_LABELS.em_curso}</span>
          </div>
        ) : isPast ? (
          <div className="gcard__drawn">
            <span className="badge badge--encerrado hud-corners-s">{STATUS_LABELS.terminado}</span>
            {going && <span className="muted" style={{ fontSize: 13 }}>Você esteve presente</span>}
          </div>
        ) : isDrawn ? (
          <>
            <div className="gcard__drawn">
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {/* Times montados à mão (o motor manda `montado_a_mao`) não foram sorteados: o card não diz que foram. */}
                <span className="badge badge--sorteado hud-corners-s">{game.montado_a_mao ? 'Montado' : 'Sorteado'}</span>
                <span className="muted" style={{ fontSize: 13 }}>
                  {soOrganizo ? 'Você organiza' : going ? 'Vai jogar' : notGoing ? 'Não vai' : 'Sem resposta'}
                </span>
              </span>
            </div>
            {/* Ver o sorteio é A ação do card: dourado forte,
                largura total, nada mais no card compete (chips e bordas ficam
                nos tons apagados). Mesmo par de sempre para o clip a 45°: o
                glow no wrapper (drop-shadow atravessa o recorte), o
                .pulse-active no botão (a metade dele que anima a borda
                sobrevive ao clip-path). */}
            <span className="cta-gold-glow pulse-glow" style={{ display: 'flex', marginTop: 12 }}>
              {/* O botão responde NA HORA ("Abrindo…", apagado, sem tocar duas vezes) e a tela abre pelo roteador,
                  sem recarregar o app inteiro: tocar e não ver nada por vários segundos parecia botão quebrado. */}
              <button type="button" className="btn hud-corners cta-gold pulse-active" style={{ flex: 1 }} disabled={abrindo} aria-busy={abrindo} onClick={() => onVerSorteio(game)}>
                {abrindo ? 'Abrindo…' : game.montado_a_mao ? <><Users size={16} /> Ver times</> : <><Trophy size={16} /> Ver sorteio</>}
              </button>
            </span>
          </>
        ) : soOrganizo ? (
          <div className="gcard__presence">
            <span className="texto-apoio" data-so-organizo style={{ margin: 0 }}>Você só organiza este time.</span>
          </div>
        ) : game.chamado === false ? (
          <div className="gcard__presence">
            <span className="texto-apoio" data-nao-chamado style={{ margin: 0 }}>Você não foi chamado para este jogo.</span>
          </div>
        ) : (
          <RespostaDoJogo
            resposta={respostaDoJogo(game)}
            aberta={aberta}
            espera={game.espera_posicao ?? null}
            ocupado={busy}
            onResponder={(status) => onPresence(game.id, status === 'confirmado')}
            onSairEspera={onSairEspera ? () => onSairEspera(game.id) : null}
          />
        )}
      </div>
    </div>
  );
}

// ----- Estado vazio (sem equipas) -----
// O único sítio do Início onde o dourado entra. A regra do cânone é "dourado só se
// houver acção principal de PÁGINA": no Início cheio não há (é um hub — o cromo, o
// feed, os chips, e as acções vivem dentro de cada card), mas aqui há uma e só uma
// — criar o time. Sem ela a página não existe. As outras duas recuam para roxo.
function EmptyState() {
  return (
    <div className="home-empty">
      <h2 style={{ fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, fontSize: 22, letterSpacing: '0.02em' }}>Bem-vindo ao Futty.</h2>
      <p className="muted" style={{ marginTop: 6 }}>Comece por aqui.</p>
      <div className="home-empty__actions">
        {/* Glow no wrapper, recorte no botão — clip-path corta sombras (ver .cta-gold). */}
        <div className="cta-gold-glow" style={{ display: 'flex' }}>
          <Link to="/criar-time" className="btn hud-corners cta-gold" style={{ flex: 1 }}>
            ＋ Criar meu time
          </Link>
        </div>
        <Link to="/explorar" className="btn btn--purple hud-corners">
          Radar de peladas
        </Link>
        <Link to="/figurinha" className="btn btn--purple-outline hud-corners">
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Icon name="estrela" size={16} />
            Criar minha figurinha
          </span>
        </Link>
      </div>
    </div>
  );
}

export { EmptyState };
