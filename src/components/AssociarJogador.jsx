// Futty v2.0 — "Associar jogador": o convidado sem app de um jogo vira a conta de um membro do time (só o admin vê). Aqui vivem as duas peças da tela do
// jogo: a janela que escolhe o membro e confirma (AssociarJogador), e o aviso que fica depois, com o Desfazer por 24 h (AssociacoesRecentes). A regra e
// as gravações são do motor (POST /api/games/:id/associar-jogador); o Jogo.jsx só abre a janela e recarrega o jogo.
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { apiFetch } from '../lib/api';
import FuttyLoader from './FuttyLoader';
import PlayerAvatar from './PlayerAvatar';
import {
  LIMITE_DA_LISTA_MS, MSG_LISTA_DEMOROU, MSG_LISTA_FALHOU, SEM_MEMBROS, TEXTO_DESFAZER, TEXTO_SO_NESTE, TITULO_ASSOCIAR, associacoesDesfaziveis,
  fraseDaAssociacao, fraseDaConfirmacao, fraseDoDesfazer, outrosJogosDoConvidado, perguntaEmTodos, textoBotaoEmTodos,
} from '../utils/associarJogador';

const RAJ = "'Rajdhani', sans-serif";
const CLIP_S = 'polygon(5px 0, calc(100% - 5px) 0, 100% 5px, 100% calc(100% - 5px), calc(100% - 5px) 100%, 5px 100%, 0 calc(100% - 5px), 0 5px)';

/**
 * @param {object} props
 * @param {string} props.gameId
 * @param {{ nome: string }} props.convidado  o convidado sem app que a pessoa tocou
 * @param {() => void} props.onClose
 * @param {(feito: { convidadoNome: string, apelido: string }) => void} props.onFeito  chamado depois de gravar (o Jogo recarrega e avisa)
 */
export default function AssociarJogador({ gameId, convidado, onClose, onFeito }) {
  const [dados, setDados] = useState(null);
  const [erro, setErro] = useState('');
  const [escolhido, setEscolhido] = useState(null); // o membro tocado, à espera da confirmação
  const [salvando, setSalvando] = useState(false);
  const [tentativa, setTentativa] = useState(0); // "Tentar de novo" pede a lista outra vez

  // A janela fica por cima da tela inteira: o LoadingFutty de página (atrás dela) nunca aparece aqui dentro, por isso a espera tem o próprio F
  // na lista. Sem resposta em LIMITE_DA_LISTA_MS, ou com resposta sem a lista, a janela diz o que houve e oferece "Tentar de novo" — nunca fica
  // muda, com o título e nada para escolher.
  useEffect(() => {
    let ativo = true;
    const demorou = setTimeout(() => { if (ativo) setErro(MSG_LISTA_DEMOROU); }, LIMITE_DA_LISTA_MS);
    apiFetch(`/api/games/${gameId}/associar-jogador`)
      .then((d) => {
        if (!ativo) return;
        clearTimeout(demorou);
        if (!Array.isArray(d?.membros)) { setErro(MSG_LISTA_FALHOU); return; }
        setErro('');
        setDados(d);
      })
      .catch((e) => { if (ativo) { clearTimeout(demorou); setErro(e.message || MSG_LISTA_FALHOU); } });
    return () => { ativo = false; clearTimeout(demorou); };
  }, [gameId, tentativa]);

  // `emTodos`: o mesmo nome em cada outro jogo do time (o motor associa um por um, cada um com o seu Desfazer).
  async function confirmar(emTodos = false) {
    if (!escolhido || salvando) return;
    setErro('');
    setSalvando(emTodos ? 'todos' : 'um');
    try {
      const r = await apiFetch(`/api/games/${gameId}/associar-jogador`, {
        method: 'POST',
        body: JSON.stringify({ convidado_nome: convidado.nome, user_id: escolhido.user_id, ...(emTodos ? { em_todos: true } : {}) }),
      });
      onFeito({ convidadoNome: convidado.nome, apelido: escolhido.nome, emTodos: emTodos ? r?.em_todos || { associados: 0, pulados: [] } : null });
    } catch (e) {
      setErro(e.message);
      setSalvando(false);
    }
  }

  const fechar = () => { if (!salvando) onClose(); };
  const membros = dados?.membros || [];
  const outros = outrosJogosDoConvidado(dados, convidado.nome);

  return createPortal(
    <div className="modal-overlay" role="presentation" onClick={fechar}>
      <div className="modal-card modal-card--hud" role="dialog" aria-modal="true" aria-label={TITULO_ASSOCIAR} data-associar-janela onClick={(e) => e.stopPropagation()}>
        <div className="modal-card__inner" style={{ textAlign: 'left', display: 'grid', gap: 14 }}>
          <div>
            <h2 style={{ fontFamily: RAJ, fontWeight: 800, fontSize: 20, lineHeight: 1.15, margin: 0, color: '#fff' }}>{TITULO_ASSOCIAR}</h2>
            <p className="muted" style={{ margin: '4px 0 0', fontSize: 13, overflowWrap: 'anywhere' }}>
              {escolhido ? 'Confirme para ligar as duas contas.' : <>Quem é o <strong data-convidado-nome style={{ color: '#fff' }}>{convidado.nome}</strong> deste jogo?</>}
            </p>
          </div>

          {erro ? <div className="alert alert--error" role="alert" data-erro-associar>{erro}</div> : null}

          {escolhido ? (
            <div data-confirmar-associacao style={{ display: 'grid', gap: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <PlayerAvatar sm avatarUrl={escolhido.avatar_url} userId={escolhido.user_id} avatarGenerico={escolhido.avatar_generico} nome={escolhido.nome} />
                <strong style={{ fontFamily: RAJ, fontSize: 18, overflowWrap: 'anywhere' }}>{escolhido.nome}</strong>
              </div>
              <p data-frase-da-confirmacao style={{ margin: 0, fontSize: 14, lineHeight: 1.45, overflowWrap: 'anywhere' }}>{fraseDaConfirmacao(convidado.nome, escolhido.nome)}</p>
              {outros > 0 ? (
                <p data-pergunta-em-todos style={{ margin: 0, fontSize: 14, lineHeight: 1.45, fontWeight: 700, overflowWrap: 'anywhere' }}>{perguntaEmTodos(outros)}</p>
              ) : null}
              <div style={{ display: 'grid', gap: 9 }}>
                {outros > 0 ? (
                  <>
                    <button type="button" data-em-todos className="btn hud-corners cta-gold" disabled={!!salvando} onClick={() => confirmar(true)}>{salvando === 'todos' ? 'Associando…' : textoBotaoEmTodos(outros)}</button>
                    <button type="button" data-so-neste className="btn btn--outline btn--sm" disabled={!!salvando} onClick={() => confirmar(false)}>{salvando === 'um' ? 'Associando…' : TEXTO_SO_NESTE}</button>
                  </>
                ) : (
                  <button type="button" data-confirmar className="btn hud-corners cta-gold" disabled={!!salvando} onClick={() => confirmar(false)}>{salvando ? 'Associando…' : 'Associar'}</button>
                )}
                <button type="button" data-voltar className="btn btn--ghost btn--sm" disabled={!!salvando} onClick={() => { setEscolhido(null); setErro(''); }}>Voltar</button>
              </div>
            </div>
          ) : !dados && !erro ? (
            <div data-carregando-membros role="status" style={{ display: 'grid', justifyItems: 'center', gap: 8, padding: '14px 0' }}>
              <FuttyLoader size={48} label={null} />
              <span className="muted" style={{ fontSize: 13 }}>Carregando os membros do time…</span>
            </div>
          ) : !dados ? (
            <button type="button" data-tentar-de-novo className="btn btn--outline btn--sm" onClick={() => { setErro(''); setTentativa((n) => n + 1); }}>Tentar de novo</button>
          ) : (
            <div data-lista-de-membros role="list" style={{ display: 'grid', gap: 6, maxHeight: '52dvh', overflowY: 'auto', overscrollBehavior: 'contain' }}>
              {membros.length === 0 && dados ? <p className="muted" style={{ margin: 0 }}>{SEM_MEMBROS}</p> : null}
              {membros.map((m) => (
                <button
                  key={m.user_id}
                  type="button"
                  role="listitem"
                  data-membro={m.user_id}
                  data-disponivel={m.disponivel ? 'sim' : 'nao'}
                  disabled={!m.disponivel}
                  onClick={() => { setEscolhido(m); setErro(''); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12, width: '100%', minHeight: 52, padding: '8px 12px', textAlign: 'left', color: '#fff', font: 'inherit',
                    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.10)', clipPath: CLIP_S,
                    cursor: m.disponivel ? 'pointer' : 'not-allowed', opacity: m.disponivel ? 1 : 0.5,
                  }}
                >
                  <PlayerAvatar sm avatarUrl={m.avatar_url} userId={m.user_id} avatarGenerico={m.avatar_generico} nome={m.nome} />
                  <span style={{ minWidth: 0, display: 'grid' }}>
                    <span style={{ fontFamily: RAJ, fontWeight: 700, fontSize: 16, overflowWrap: 'anywhere' }}>{m.nome}</span>
                    {m.motivo ? <span data-motivo className="muted" style={{ fontSize: 12 }}>{m.motivo}</span> : null}
                  </span>
                </button>
              ))}
            </div>
          )}

          {!escolhido ? <button type="button" data-fechar className="btn btn--ghost btn--sm" onClick={fechar}>Cancelar</button> : null}
        </div>
      </div>
    </div>,
    document.body,
  );
}

/**
 * O aviso que fica embaixo dos times, só para o admin, enquanto o Desfazer vale (24 h): "Betão ocupa a vaga do Beto neste jogo." + Desfazer.
 * Lê o que o jogo já traz (`times_resultado.registro.associacoes`); desfazer pede uma confirmação ali mesmo.
 * @param {object} props
 * @param {string} props.gameId
 * @param {object} props.timesResultado
 * @param {() => Promise<void> | void} props.onDesfeito  o Jogo recarrega e avisa
 * @param {(mensagem: string) => void} props.onErro
 */
export function AssociacoesRecentes({ gameId, timesResultado, onDesfeito, onErro }) {
  const [confirmando, setConfirmando] = useState(null); // user_id
  const [ocupado, setOcupado] = useState(false);
  const lista = associacoesDesfaziveis(timesResultado);
  if (!lista.length) return null;

  async function desfazer(a) {
    setOcupado(true);
    try {
      await apiFetch(`/api/games/${gameId}/associar-jogador/desfazer`, { method: 'POST', body: JSON.stringify({ user_id: a.user_id }) });
      setConfirmando(null);
      await onDesfeito(a);
    } catch (e) {
      onErro(e.message);
    } finally {
      setOcupado(false);
    }
  }

  return (
    <div data-associacoes-recentes style={{ display: 'grid', gap: 8, marginTop: 12 }}>
      {lista.map((a) => (
        <div key={a.user_id} data-associacao={a.user_id} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.10)', clipPath: CLIP_S, padding: '10px 12px', display: 'grid', gap: 8 }}>
          <span style={{ fontSize: 13, overflowWrap: 'anywhere' }}>{fraseDaAssociacao(a)}</span>
          {confirmando === a.user_id ? (
            <div style={{ display: 'grid', gap: 8 }}>
              <span className="muted" data-frase-do-desfazer style={{ fontSize: 12, overflowWrap: 'anywhere' }}>{fraseDoDesfazer(a)}</span>
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 8 }}>
                <button type="button" data-desfazer-confirmar className="btn btn--outline btn--sm" disabled={ocupado} onClick={() => desfazer(a)}>{ocupado ? 'Desfazendo…' : TEXTO_DESFAZER}</button>
                <button type="button" data-desfazer-manter className="btn btn--ghost btn--sm" disabled={ocupado} onClick={() => setConfirmando(null)}>Manter</button>
              </div>
            </div>
          ) : (
            <button type="button" data-desfazer className="btn btn--ghost btn--sm" style={{ justifySelf: 'start' }} onClick={() => setConfirmando(a.user_id)}>{TEXTO_DESFAZER}</button>
          )}
        </div>
      ))}
    </div>
  );
}
