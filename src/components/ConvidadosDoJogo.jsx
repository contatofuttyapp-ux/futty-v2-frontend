// Futty v2.0 — "Alguém sem o app vai jogar?" na tela do jogo (só o admin): a lista de convidados sem app, guardada no jogo pelo motor.
// Cada convidado tem as mesmas marcas de quem tem conta — GOL (goleiro) e C (cabeça de chave) —, dá para corrigir o nome e tirar. Quem
// grava é a página (PUT /api/games/:id/convidados); aqui só a lista e o que a pessoa toca.
import { useState } from 'react';
import { Pencil, X } from 'lucide-react';
import SilhuetaJogador from './SilhuetaJogador';
import { CONVIDADO_BOTAO, CONVIDADO_CAMPO, CONVIDADO_LINHA, CONVIDADO_TITULO } from '../utils/convidadoSemApp';
import { MAX_NOME_CONVIDADO, nomeJaNaLista, novoConvidado } from '../utils/convidadosDoJogo';

const RAJ = "'Rajdhani', sans-serif";
const VIDRO = { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' };
const CLIP = 'polygon(8px 0, calc(100% - 8px) 0, 100% 8px, 100% calc(100% - 8px), calc(100% - 8px) 100%, 8px 100%, 0 calc(100% - 8px), 0 8px)';
// O ícone (lápis, X) com área de toque de 36 px, sem moldura: a ação principal da linha são as marcas.
const BOTAO_ICONE = { display: 'inline-grid', placeItems: 'center', width: 36, height: 36, flexShrink: 0, border: 'none', background: 'transparent', color: 'var(--text-dim)', cursor: 'pointer', padding: 0 };

function Silhueta() {
  return (
    <span className="avatar-frame" style={{ width: 32, height: 32, flexShrink: 0 }}>
      <span className="avatar-frame__fill" style={{ fontSize: 11 }}><SilhuetaJogador size="74%" /></span>
      <span className="avatar-frame__veil" />
      <span className="avatar-frame__lc avatar-frame__lc--tl" />
      <span className="avatar-frame__lc avatar-frame__lc--tr" />
      <span className="avatar-frame__lc avatar-frame__lc--br" />
      <span className="avatar-frame__lc avatar-frame__lc--bl" />
    </span>
  );
}

/**
 * @param {{ convidados: Array<{nome:string, goleiro:boolean, cabeca_chave:boolean}>, busy?: boolean, onMudar: (lista) => void }} props
 *   `onMudar` recebe a lista inteira nova (é ela que o motor grava).
 */
export default function ConvidadosDoJogo({ convidados, busy = false, onMudar }) {
  const [novo, setNovo] = useState('');
  const [editando, setEditando] = useState(-1);
  const [nomeEditado, setNomeEditado] = useState('');
  const [aviso, setAviso] = useState('');

  function adicionar() {
    const nome = novo.trim();
    if (!nome) return;
    const repetido = nomeJaNaLista(convidados, nome);
    if (repetido) { setAviso(repetido); return; }
    setAviso('');
    setNovo('');
    onMudar([...convidados, novoConvidado(nome)]);
  }

  function salvarNome(i) {
    const nome = nomeEditado.trim();
    if (!nome) return;
    const repetido = nomeJaNaLista(convidados, nome, i);
    if (repetido) { setAviso(repetido); return; }
    setAviso('');
    setEditando(-1);
    if (nome !== convidados[i].nome) onMudar(convidados.map((c, x) => (x === i ? { ...c, nome: novoConvidado(nome).nome } : c)));
  }

  const marcar = (i, patch) => onMudar(convidados.map((c, x) => (x === i ? { ...c, ...patch } : c)));
  const tirar = (i) => { setEditando(-1); onMudar(convidados.filter((_, x) => x !== i)); };

  return (
    <div data-convidados-do-jogo style={{ ...VIDRO, clipPath: CLIP, padding: '10px 12px', marginBottom: 10 }}>
      {/* Os textos vêm de utils/convidadoSemApp.js, os mesmos do Novo jogo e do Campeonato. */}
      <div data-convidado-titulo style={{ fontFamily: RAJ, fontSize: 15, fontWeight: 700, color: '#fff' }}>{CONVIDADO_TITULO}</div>
      <p className="texto-apoio" data-convidado-linha style={{ margin: '2px 0 8px' }}>{CONVIDADO_LINHA}</p>
      {convidados.length ? (
        <>
          <p className="texto-apoio" data-convidado-marcas style={{ margin: '0 0 4px' }}>GOL = goleiro, C = cabeça de chave: o sorteio põe um de cada em cada time.</p>
          <div style={{ marginBottom: 8 }}>
            {convidados.map((c, i) => (
              <div key={`${i}:${c.nome}`} data-convidado={c.nome} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderTop: i === 0 ? 'none' : '1px solid rgba(255,255,255,0.06)' }}>
                <Silhueta />
                {editando === i ? (
                  <>
                    <input
                      className="input input--hud"
                      value={nomeEditado}
                      maxLength={MAX_NOME_CONVIDADO}
                      aria-label={`Novo nome de ${c.nome}`}
                      autoFocus
                      onChange={(e) => setNomeEditado(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') salvarNome(i); if (e.key === 'Escape') setEditando(-1); }}
                      style={{ flex: 1, minWidth: 0, fontFamily: RAJ }}
                    />
                    <button type="button" className="btn btn--sm btn--outline hud-corners-s" data-salvar-nome disabled={busy || !nomeEditado.trim()} onClick={() => salvarNome(i)}>Salvar</button>
                    <button type="button" style={BOTAO_ICONE} aria-label="Cancelar" onClick={() => { setEditando(-1); setAviso(''); }}><X size={16} aria-hidden="true" /></button>
                  </>
                ) : (
                  <>
                    <div style={{ flex: 1, minWidth: 0, fontFamily: RAJ, fontWeight: 700, fontSize: 14, overflowWrap: 'anywhere' }}>{c.nome}</div>
                    <button type="button" className="mark-toggle mark-toggle--gk" data-marca="gol" aria-pressed={!!c.goleiro} aria-label={`${c.nome} é goleiro`} disabled={busy} onClick={() => marcar(i, { goleiro: !c.goleiro })}>GOL</button>
                    <button type="button" className="mark-toggle" data-marca="c" aria-pressed={!!c.cabeca_chave} aria-label={`${c.nome} é cabeça de chave`} disabled={busy} onClick={() => marcar(i, { cabeca_chave: !c.cabeca_chave })}>C</button>
                    <button type="button" style={BOTAO_ICONE} data-editar aria-label={`Editar o nome de ${c.nome}`} disabled={busy} onClick={() => { setEditando(i); setNomeEditado(c.nome); setAviso(''); }}><Pencil size={15} aria-hidden="true" /></button>
                    <button type="button" style={BOTAO_ICONE} data-tirar aria-label={`Tirar ${c.nome}`} disabled={busy} onClick={() => tirar(i)}><X size={16} aria-hidden="true" /></button>
                  </>
                )}
              </div>
            ))}
          </div>
        </>
      ) : null}
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          className="input input--hud"
          value={novo}
          maxLength={MAX_NOME_CONVIDADO}
          placeholder={CONVIDADO_CAMPO}
          aria-label={CONVIDADO_CAMPO}
          onChange={(e) => { setNovo(e.target.value); if (aviso) setAviso(''); }}
          onKeyDown={(e) => { if (e.key === 'Enter') adicionar(); }}
          style={{ flex: 1, minWidth: 0, fontFamily: RAJ }}
        />
        <button type="button" className="btn btn--sm btn--outline hud-corners-s" data-adicionar-convidado disabled={busy || !novo.trim()} onClick={adicionar}>
          {CONVIDADO_BOTAO}
        </button>
      </div>
      {aviso ? <p role="alert" data-aviso-convidado style={{ margin: '8px 0 0', fontSize: 13, color: '#fda4af' }}>{aviso}</p> : null}
    </div>
  );
}
