// Futty v2.0 — Início: o conteúdo de baixo — o erro de rede, ou os times, os próximos jogos, os cartões e o estado vazio.
import { Link } from 'react-router-dom';
import CartaoConviteColado from '../../components/CartaoConviteColado';
import ConviteDoMotor from '../../components/ConviteDoMotor';
import AtalhosDoInicio from '../../components/AtalhosDoInicio';
import { nomeCampeao } from '../../utils/campeonato';
import CardCampeonatoInicio from '../../components/CardCampeonatoInicio';
import { plural } from '../../utils/plural';
import RSVPCard from '../../components/RSVPCard';
import CartaoPacoteInicio from '../../components/CartaoPacoteInicio';
import TeamAvatar from '../../components/TeamAvatar';
import Icon from '../../components/Icon';
import LoadingFutty from '../../components/LoadingFutty';
import AdCard from '../../components/AdCard';
import EstadoErroRede from '../../components/EstadoErroRede';
import { EmptyState, GameCard } from './GameCard';

export default function ConteudoDoInicio({ abrindoSorteioId, ausenciaBusy, busyId, campSlug, campSlugDoNovo, campeonato, campeonatoNovo, chipsEscondidosDir, chipsEscondidosEsq, definirAusencia, encerradaNoProximo, fecharPacote, inicio, items, loadingGames, minhaResposta, montarFaixaDeChips, nextId, noTeams, onPresence, onboardingCompleto, pacoteFechado, proximoJogo, proximoSoOrganizo, proximosJogos, rsvpAbertoNoProximo, rsvpInfo, selectedTeam, semDadosPorErro, setConfirmarAusencia, setMinhaResposta, setSelectedTeam, teams, timeDoJogo, timesDoDono, ultimosJogos, verSorteio }) {
  return (
    <>
        {semDadosPorErro ? (
          <EstadoErroRede compacto mensagem="Não deu para carregar o Início agora. Tente de novo." onRepetir={() => inicio.reload()} />
        ) : noTeams ? (
          <>
            {/* Quem instalou o app pela loja depois de tocar num convite chega aqui sem o convite (ele ficou no navegador). Primeiro o
                motor: o convite aberto neste celular (mesma rede, nas últimas 2 h) põe a pessoa no time sozinho. Se não achar, o link
                copiado na página do convite volta pelo cartão. No Android, antes do motor, o convite que a Play Store trouxe. Só com o
                cadastro concluído: a conta nova passa por aqui um instante a caminho do cadastro, que abre nas boas-vindas do time. */}
            {onboardingCompleto === true && <ConviteDoMotor />}
            <CartaoConviteColado />
            <EmptyState />
          </>
        ) : (
          <>
            {/* O Radar de peladas e o Criar time à vista, logo embaixo do "Seus times" (ou do avatar, quem não
                administra time): no fim da fila de chips ninguém chegava. */}
            <AtalhosDoInicio />

            {timesDoDono.length > 0 && !pacoteFechado ? <CartaoPacoteInicio timesDoDono={timesDoDono} onFechar={fecharPacote} /> : null}

            {/* Chips de equipas. O 45° entra pelo USE SITE e não pela classe .chip:
                ela é partilhada com o Feed e o AdminPanel, que ainda não passaram
                pelo cânone — varrer a classe mudava-lhes o desenho sem os rever.
                A .chip--active traz uma "serpente" dourada a percorrer o contorno;
                sob o recorte ela abre-se nas 4 diagonais, o que ecoa o travessão
                que o frame do cromo abre exactamente nos mesmos cantos. */}
            <div className="chips-row" ref={montarFaixaDeChips} data-mais-esq={chipsEscondidosEsq ? '1' : undefined} data-mais-dir={chipsEscondidosDir ? '1' : undefined}>
              <button
                type="button"
                className={`chip hud-corners-s ${selectedTeam === 'all' ? 'chip--active tab-shine' : ''}`}
                onClick={() => setSelectedTeam('all')}
              >
                Todas
              </button>
              {teams.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className={`chip hud-corners-s ${selectedTeam === t.id ? 'chip--active tab-shine' : ''}`}
                  onClick={() => setSelectedTeam(t.id)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                >
                  <TeamAvatar team={t} size="sm" />
                  {t.nome}
                  {/* P2-6: pedidos de entrada por resolver (só admin) — badge dourado. */}
                  {t.pedidos_pendentes > 0 ? (
                    <span className="chip-badge" aria-label={`${t.pedidos_pendentes} ${plural(t.pedidos_pendentes, 'pedido', 'pedidos')} para resolver`}>
                      {t.pedidos_pendentes}
                    </span>
                  ) : null}
                </button>
              ))}
              {/* A fila é só o filtro dos jogos por time. "Criar time" e "Radar de peladas" moram nos dois cartões
                  acima (<AtalhosDoInicio />). */}
            </div>

            {/* O campeonato NOVO do time (em andamento, ou o campeão da última semana): todo membro vê, não só o admin. */}
            {campeonatoNovo && campSlugDoNovo ? <CardCampeonatoInicio campeonato={campeonatoNovo} slug={campSlugDoNovo} /> : null}

            {/* Jogos */}
            <div>
              <div className="games-label">Próximos Jogos</div>
            {rsvpAbertoNoProximo || encerradaNoProximo ? (
              <RSVPCard key={`${nextId}:${rsvpInfo.minha_posicao_espera ?? ''}`} gameId={nextId} prazo={rsvpInfo.rsvp_prazo} fuso={rsvpInfo.fuso || proximoJogo?.fuso} cidade={timeDoJogo(proximoJogo?.team_id)?.cidade} respostaActual={minhaResposta} onResposta={setMinhaResposta} cheio={rsvpInfo.cheio} minhaPosicaoEspera={rsvpInfo.minha_posicao_espera} encerrada={encerradaNoProximo} />
            ) : null}
            {/* Aviso de ausência. Com o RSVP aberto (ou encerrado) para ESTE jogo, some — o card acima já cobre a
                resposta (ou diz por que não dá mais para responder). */}
            {proximoJogo && proximoJogo.team_slug && !rsvpAbertoNoProximo && !encerradaNoProximo && !proximoSoOrganizo ? (
              proximoJogo.ausente_proximo ? (
                <div className="hud-corners-s" style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '8px 0 4px', padding: '8px 12px', background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.45)' }}>
                  <Icon name="ausente" size={16} color="grey" />
                  <span style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 700, color: '#f8b4b4' }}>Você avisou que não vai</span>
                  <button type="button" onClick={() => definirAusencia(false)} disabled={ausenciaBusy} style={{ border: 'none', background: 'transparent', color: 'var(--neon)', fontWeight: 700, fontSize: 13, textDecoration: 'underline', textUnderlineOffset: 3, cursor: ausenciaBusy ? 'default' : 'pointer', padding: '4px 0', flexShrink: 0, opacity: ausenciaBusy ? 0.6 : 1 }}>
                    {ausenciaBusy ? 'Salvando…' : 'Desfazer'}
                  </button>
                </div>
              ) : (
                <button type="button" className="hud-corners-s" onClick={() => setConfirmarAusencia(true)} disabled={ausenciaBusy} style={{ margin: '8px 0 4px', border: '1px solid var(--border-subtle)', background: 'var(--surface-1)', color: 'var(--text-dim)', fontWeight: 700, fontSize: 13, cursor: ausenciaBusy ? 'default' : 'pointer', padding: '6px 12px', opacity: ausenciaBusy ? 0.6 : 1 }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <Icon name="ausente" size={16} color="grey" />
                    {ausenciaBusy ? 'Salvando…' : 'Avisar que não vou'}
                  </span>
                </button>
              )
            ) : null}
            {loadingGames ? (
              <LoadingFutty />
            ) : (
              <>
                {proximosJogos.length === 0 && <p className="muted">Sem jogos para mostrar.</p>}
                {items.map((item, i) =>
                  item.type === 'ad' ? (
                    <AdCard key={item.key} />
                  ) : (
                    <GameCard
                      key={item.game.id}
                      game={item.game}
                      busy={busyId === item.game.id}
                      isNext={item.game.id === nextId}
                      onPresence={onPresence}
                      onVerSorteio={verSorteio}
                      abrindo={abrindoSorteioId === item.game.id}
                      index={i}
                      cidade={timeDoJogo(item.game.team_id)?.cidade}
                    />
                  )
                )}
              </>
            )}
            </div>

            {/* Jogos já encerrados saem do "Próximos Jogos" e ficam aqui, no máximo 3, mais recente primeiro. */}
            {!loadingGames && ultimosJogos.length > 0 ? (
              <div style={{ marginTop: 16 }}>
                <div className="games-label">Últimos Jogos</div>
                {ultimosJogos.map((g) => (
                  <GameCard key={g.id} game={g} busy={false} isNext={false} onPresence={onPresence} onVerSorteio={verSorteio} abrindo={abrindoSorteioId === g.id} cidade={timeDoJogo(g.team_id)?.cidade} />
                ))}
              </div>
            ) : null}

            {/* Card do campeonato (equipa principal) */}
            {campeonato && campSlug ? (
              <Link to={`/time/${campSlug}/campeonato`} className="hud-corners" style={{ textDecoration: 'none', display: 'block', marginTop: 14, background: 'var(--surface-1)', border: '1px solid var(--border-subtle)', padding: 'var(--space-md)' }}>
                {campeonato.estado === 'terminado' ? (
                  <>
                    <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 16, fontWeight: 800, color: '#d4a017' }}>{campeonato.nome} · Campeão: {nomeCampeao(campeonato)}</div>
                    <div style={{ fontSize: 13, color: 'var(--text-dim)', marginTop: 4 }}>{campeonato.time_a_nome} {campeonato.time_a_pontos} × {campeonato.time_b_pontos} {campeonato.time_b_nome}</div>
                  </>
                ) : (
                  <>
                    <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 16, fontWeight: 800, color: '#fff' }}>{campeonato.nome}</div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 8, color: '#fff', fontWeight: 700 }}>
                      <span>{campeonato.time_a_nome}</span>
                      <span style={{ color: '#d4a017', fontSize: 18 }}>{campeonato.time_a_pontos}</span>
                      <span style={{ color: 'var(--text-dim)' }}>vs</span>
                      <span style={{ color: '#d4a017', fontSize: 18 }}>{campeonato.time_b_pontos}</span>
                      <span>{campeonato.time_b_nome}</span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-dim)', textAlign: 'center', marginTop: 6 }}>Jornada {campeonato.jornadas_jogadas} de {campeonato.num_jornadas} · toque para ver</div>
                  </>
                )}
              </Link>
            ) : null}
          </>
        )}
    </>
  );
}
