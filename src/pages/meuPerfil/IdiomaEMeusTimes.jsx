// Futty v2.0 — Perfil: a seção Idioma, a seção Meus times e o botão de criar time.
import { Link } from 'react-router-dom';
import { nomeIdioma, MOSTRAR_IDIOMA } from '../../lib/i18n';
import Icon from '../../components/Icon';
import { CARD } from './estilos';
import { LinhaMeuTime, SecLabel } from './pecas';

export default function IdiomaEMeusTimes({ idiomaActual, perfil, setSheetIdioma, showToast, teams }) {
  return (
    <>
        {/* 5. SECÇÃO CONTA
            INTOCÁVEL por decisão do utilizador: os ícones custom, o vermelho do
            "Terminar sessão" e o padrão/toggle das notificações ficam exactamente
            como estão. Aqui só se corta o canto do card — a tipografia e as cores
            das linhas não se padronizam. */}
        {/* 5. SECÇÃO IDIOMA — antes da Conta.
            Era um card com dois botões lado a lado (🇧🇷 Português BR / 🇵🇹 Português
            PT). Dois cabiam; seis não — e uma grelha de seis botões dentro do Perfil
            roubava a página ao nome de jogador. Passa a UMA linha, no padrão das
            linhas da Conta, com o valor actual por baixo; a escolha vive num bottom
            sheet. */}
        {MOSTRAR_IDIOMA ? (
          <>
            <SecLabel>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <Icon name="idioma" size={20} color="#d4a017" />
                Idioma / Language
              </span>
            </SecLabel>
            <div className="hud-corners" style={{ ...CARD, overflow: 'hidden' }}>
              <button
                type="button"
                onClick={() => setSheetIdioma(true)}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, width: '100%', textAlign: 'left', padding: '14px 16px', border: 'none', background: 'transparent', cursor: 'pointer' }}
              >
                <span style={{ display: 'grid', gap: 2, minWidth: 0 }}>
                  <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)' }}>Idioma</span>
                  <span style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 13, fontWeight: 600, letterSpacing: '0.04em', color: '#d4a017' }}>
                    {nomeIdioma(idiomaActual)}
                  </span>
                </span>
                <span aria-hidden="true" style={{ color: 'rgba(255,255,255,0.35)', fontSize: 18, lineHeight: 1 }}>›</span>
              </button>
            </div>
          </>
        ) : null}

        {/* SECÇÃO MEUS TIMES: a escolha linha/gol de cada time, à vista, e não escondida num chip dentro da
            página do time. Vale para os sorteios de cada time. */}
        <SecLabel>Meus times</SecLabel>
        {teams.length ? (
          <>
            <div className="hud-corners" style={{ ...CARD, overflow: 'hidden' }}>
              {teams.map((t, i) => (
                <LinhaMeuTime key={t.id || t.slug} time={t} meuId={perfil.user.id} semBorda={i === teams.length - 1} aoErro={(m) => showToast(m, 'error')} />
              ))}
            </div>
            <p className="texto-apoio">Vale para os sorteios de cada time. Dá para mudar em cada jogo.</p>
          </>
        ) : null}
        {/* Criar o próprio time sempre à mão, com ou sem time (a seção aparece mesmo vazia). */}
        <Link to="/criar-time" className="btn btn--purple-outline hud-corners" data-criar-time style={{ marginTop: teams.length ? 10 : 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          ＋ Criar time
        </Link>
    </>
  );
}
