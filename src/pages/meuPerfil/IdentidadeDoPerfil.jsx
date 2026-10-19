// Futty v2.0 — Perfil: o cabeçalho de identidade (avatar, nome, e-mail) e o atalho para a vitrine.
import { Link } from 'react-router-dom';
import { SEM_NOTA, formatRating } from '../../utils/format';
import { plural } from '../../utils/plural';
import PlayerAvatar from '../../components/PlayerAvatar';
import Icon from '../../components/Icon';
import { CARD } from './estilos';

export default function IdentidadeDoPerfil({ nomeMostrar, stats, u, vitrineSlug }) {
  return (
    <>
        {/* 1. HEADER DE IDENTIDADE (avatar + nome + email + Ver planos)
            O avatar FICA — é identidade: mostra quem tu és. O que se foi foi o
            handler: já não tem role="button", tabIndex, onClick nem onKeyDown, e não
            abre nada. Sem foto, o PlayerAvatar cai nas iniciais sobre fundo escuro
            com anel dourado (verificado a correr: renderiza "C", bg rgb(16,16,18),
            glow dourado) — o formato que já existia, mantido.
            O que saiu foi a secção DE BAIXO, a de trocar/personalizar (ver abaixo). */}
        <div className="hud-corners" style={{ ...CARD, padding: 16, display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ lineHeight: 0, flexShrink: 0 }}>
            <PlayerAvatar nome={nomeMostrar} avatarUrl={u.avatar_url} userId={u.id} avatarGenerico={u.avatar_generico} gold size={64} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
              {/* O nome é estrutura → Rajdhani 700. Estava em Inter 800: o MESMO nome
                  aparecia em duas fontes na mesma página (aqui e no campo hero). E o
                  800 nem existe no Rajdhani carregado (400/600/700) — com
                  font-synthesis: none, era um peso a pedir o que não há.
                  Fica abaixo do hero de propósito: 18px branco contra 23px dourado
                  com moldura e glow. Diz quem tu és; não disputa o campo. */}
              <span style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 18, fontWeight: 700, letterSpacing: '0.04em', color: '#fff', lineHeight: 1.2, overflowWrap: 'anywhere' }}>{nomeMostrar}</span>
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.email || ''}</div>
            <Link to="/planos" style={{ display: 'inline-block', marginTop: 6, fontSize: 12, fontWeight: 700, color: 'var(--neon)' }}>
              Ver Figurinhas →
            </Link>
          </div>
        </div>

        {/* Stats por baixo do header */}
        <div style={{ marginTop: 10, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', fontSize: 13, color: 'var(--text-dim)' }}>
          <span style={{ color: 'var(--neon)', fontWeight: 800 }}>{stats.nota != null ? formatRating(stats.nota) : SEM_NOTA}</span>
          <span>·</span>
          <span><b style={{ color: '#fff' }}>{stats.jogos ?? 0}</b> {plural(stats.jogos ?? 0, 'jogo', 'jogos')}</span>
          <span>·</span>
          <span><b style={{ color: '#fff' }}>{stats.gols ?? 0}</b> {plural(stats.gols ?? 0, 'gol', 'gols')}</span>
        </div>

        {/* A vitrine de jogador, a um toque.
            Estas três estatísticas aqui em cima são o resumo do que a vitrine
            mostra inteiro (radar, conquistas, histórico, evolução). Pelo avatar de
            outra pessoa no Ranking só se chega à vitrine dela — a própria
            vitrine, que é a que interessa mostrar aos amigos, precisa de porta.
            Só com time: a vitrine vive dentro de um (/time/:slug/jogador/:id). */}
        {vitrineSlug ? (
          <div className="cta-gold-glow" style={{ display: 'flex', marginTop: 12 }}>
            <Link to={`/time/${vitrineSlug}/jogador/${u.id}`} className="btn hud-corners cta-gold" style={{ flex: 1, textDecoration: 'none' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <Icon name="estrela" size={16} />
                Ver minha vitrine de jogador
              </span>
            </Link>
          </div>
        ) : null}

        {/* A SECÇÃO DE PERSONALIZAR O AVATAR SAIU — o disclosure "Toca no avatar (ou
            aqui) para personalizar →", o teaser de IA, o "Enviar foto" e a galeria
            dos 18 genéricos. A página vai do cabeçalho directa aos Dados.
            Não foi só limpeza. O avatar geria-se em DOIS sítios; passa a gerir-se num
            — a Figurinha, que já faz upload, geração por IA e kits. E a galeria era o
            único escritor que metia no avatar_url uma terceira espécie: o app codifica
            "isto é avatar de IA" como a DESIGUALDADE foto_url !== avatar_url (não há
            booleano), por isso quem escolhesse um genérico DEPOIS de ter enviado foto
            ficava com o genérico a passar por avatar de IA no cromo — e com o upload
            seguinte preso, a dizer "Avatar atualizado!" sem nada mudar. Cortar a UI
            fecha a única porta para esse estado.
            Intactos: a BD, os endpoints, os PNGs e o backend/routes/avatares.js. Quem
            já tem um genérico gravado continua a vê-lo até pôr foto na Figurinha. */}
    </>
  );
}
